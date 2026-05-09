import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, ScanCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

const ddbClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(ddbClient);
const secretsClient = new SecretsManagerClient({});
const USERS_TABLE = process.env.USERS_TABLE || 'Unify-Users';

const HEADERS = {
  'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*',
  'Access-Control-Allow-Methods': 'OPTIONS,POST',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  'Content-Type': 'application/json'
};

async function getGeminiApiKey() {
  const secretName = process.env.GEMINI_SECRET_NAME || 'unify/gemini/credentials';
  const response = await secretsClient.send(
    new GetSecretValueCommand({
      SecretId: secretName,
    })
  );

  if (response.SecretString) {
    const secret = JSON.parse(response.SecretString);
    return secret.api_key;
  }
  throw new Error("SecretString not found");
}

async function getAllChapters() {
  const chapters = [];
  let ExclusiveStartKey;

  do {
    const command = new ScanCommand({
      TableName: process.env.CHAPTERS_TABLE || 'Chapters',
      ExclusiveStartKey
    });

    const response = await docClient.send(command);
    chapters.push(...(response.Items || []));
    ExclusiveStartKey = response.LastEvaluatedKey;
  } while (ExclusiveStartKey);

  return chapters;
}

async function getAllVectors() {
  const vectors = [];
  let ExclusiveStartKey;

  do {
    const command = new ScanCommand({
      TableName: process.env.VECTORS_TABLE || 'UnifyVectors',
      ExclusiveStartKey
    });

    const response = await docClient.send(command);
    vectors.push(...(response.Items || []));
    ExclusiveStartKey = response.LastEvaluatedKey;
  } while (ExclusiveStartKey);

  return vectors;
}

// Fast local router — no Gemini call needed for routing
// Checks if the user message mentions any known chapter name (case-insensitive)
function extractTargetParentLocal(userMessage, chaptersContext) {
  const msgLower = userMessage.toLowerCase();
  for (const chapter of chaptersContext) {
    if (chapter.chapterName && msgLower.includes(chapter.chapterName.toLowerCase())) {
      return chapter.chapterId;
    }
  }
  return null;
}


async function embedText(apiKey, text) {
  const model = "models/gemini-embedding-001";
  const url = `https://generativelanguage.googleapis.com/v1beta/${model}:embedContent?key=${apiKey}`;
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: model,
        content: { parts: [{ text }] }
      })
    });
    const data = await response.json();
    return data.embedding?.values || null;
  } catch (err) {
    console.error("Embedding error:", err);
    return null;
  }
}

function cosineSimilarity(vecA, vecB) {
  if (!Array.isArray(vecA) || !Array.isArray(vecB) || vecA.length === 0 || vecA.length !== vecB.length) {
    return 0;
  }

  let dotProduct = 0, normA = 0, normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (!normA || !normB) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

function normalizeForMatch(value) {
  return String(value || '').toLowerCase().replace(/[_-]+/g, ' ').trim();
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function hasKeyword(messageLower, keyword) {
  const normalizedKeyword = normalizeForMatch(keyword);
  if (!normalizedKeyword) return false;
  return new RegExp(`(^|[^a-z0-9])${escapeRegExp(normalizedKeyword)}([^a-z0-9]|$)`, 'i').test(messageLower);
}

function normalizeVector(vector) {
  if (!Array.isArray(vector) || vector.length === 0) return null;
  const norm = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
  if (!norm) return null;
  return vector.map(value => value / norm);
}

function averageVectors(vectors) {
  const validVectors = vectors.filter(vector => Array.isArray(vector) && vector.length > 0);
  if (validVectors.length === 0) return null;

  const dimensions = validVectors[0].length;
  const totals = Array(dimensions).fill(0);
  let count = 0;

  for (const vector of validVectors) {
    if (vector.length !== dimensions) continue;
    for (let i = 0; i < dimensions; i++) {
      totals[i] += vector[i];
    }
    count += 1;
  }

  if (count === 0) return null;
  return normalizeVector(totals.map(value => value / count));
}

function blendVectors(existingVector, newVector) {
  if (!Array.isArray(existingVector) || existingVector.length !== newVector.length) {
    return newVector;
  }

  return normalizeVector(existingVector.map((value, index) => (value * 0.7) + (newVector[index] * 0.3))) || newVector;
}

const SECTION_INTENTS = [
  {
    id: 'about',
    label: 'About',
    description: 'general purpose, identity, interests, club overview, what the chapter does, domains, activities'
  },
  {
    id: 'mission',
    label: 'Mission',
    description: 'mission, goals, purpose, aims, what the chapter wants to achieve, impact'
  },
  {
    id: 'vision',
    label: 'Vision',
    description: 'vision, future direction, long term ambition, roadmap, aspirations'
  },
  {
    id: 'highlights',
    label: 'Highlights',
    description: 'highlights, key activities, notable features, opportunities, programs, workshops'
  },
  {
    id: 'achievements',
    label: 'Achievements',
    description: 'achievements, awards, accomplishments, wins, recognition, past success'
  }
];

const STANDARD_INTEREST_TAGS = [
  {
    tag: 'coding',
    label: 'Coding',
    description: 'software development, programming, web apps, app building, algorithms, hackathons, coding competitions, developer tools',
    keywords: ['coding', 'code', 'programming', 'programmer', 'software', 'developer', 'web development', 'app development', 'hackathon', 'algorithm']
  },
  {
    tag: 'gaming',
    label: 'Gaming',
    description: 'video games, esports, game development, game jams, competitive gaming, streaming, gameplay strategy, interactive entertainment',
    keywords: ['gaming', 'game', 'games', 'esports', 'game dev', 'game development', 'game jam', 'gamejam', 'streaming']
  },
  {
    tag: 'martial_arts',
    label: 'Martial Arts',
    description: 'martial arts, self defense, karate, taekwondo, boxing, kickboxing, discipline, combat sports, physical training',
    keywords: ['martial arts', 'martial_arts', 'karate', 'taekwondo', 'judo', 'boxing', 'kickboxing', 'self defense', 'mma', 'combat']
  },
  {
    tag: 'robotics',
    label: 'Robotics',
    description: 'robotics, autonomous systems, hardware building, electronics, sensors, drones, embedded systems, robot competitions',
    keywords: ['robotics', 'robot', 'robots', 'drone', 'drones', 'arduino', 'electronics', 'sensors', 'embedded', 'automation']
  },
  {
    tag: 'fitness',
    label: 'Fitness',
    description: 'fitness, gym, workout, health, strength training, endurance, wellness, exercise routines, active lifestyle',
    keywords: ['fitness', 'gym', 'workout', 'exercise', 'health', 'wellness', 'strength', 'training', 'bodybuilding', 'running']
  },
  {
    tag: 'music',
    label: 'Music',
    description: 'music, singing, instruments, bands, production, performance, songwriting, concerts, audio creativity',
    keywords: ['music', 'singing', 'song', 'songs', 'guitar', 'piano', 'band', 'instrument', 'producer', 'concert']
  },
  {
    tag: 'entrepreneurship',
    label: 'Entrepreneurship',
    description: 'entrepreneurship, startups, business ideas, pitching, product building, leadership, innovation, venture creation',
    keywords: ['entrepreneurship', 'startup', 'startups', 'business', 'founder', 'pitch', 'venture', 'innovation', 'product']
  },
  {
    tag: 'ai',
    label: 'AI',
    description: 'artificial intelligence, machine learning, generative AI, data science, neural networks, automation, intelligent systems',
    keywords: ['ai', 'artificial intelligence', 'machine learning', 'ml', 'deep learning', 'generative ai', 'data science', 'neural']
  },
  {
    tag: 'cloud_computing',
    label: 'Cloud Computing',
    description: 'cloud computing, AWS, Azure, Google Cloud, DevOps, serverless, infrastructure, deployment, scalable systems',
    keywords: ['cloud', 'cloud computing', 'cloud_computing', 'aws', 'azure', 'gcp', 'devops', 'serverless', 'deployment']
  },
  {
    tag: 'sports',
    label: 'Sports',
    description: 'sports, team games, athletic competitions, football, cricket, basketball, tournaments, outdoor activities',
    keywords: ['sports', 'sport', 'football', 'cricket', 'basketball', 'volleyball', 'tournament', 'athletics', 'team game']
  }
];

const INTEREST_CUES = [
  'interested in',
  'interest in',
  'i like',
  'i love',
  'i enjoy',
  'my hobby',
  'my hobbies',
  'passionate about',
  'want to learn',
  'want to join',
  'want to explore',
  'goal is',
  'career in',
  'recommend',
  'suggest',
  'looking for',
  'activities around'
];

let interestTagVectorCache = null;

function chooseRelevantSections(userMessage, userVector) {
  const msgLower = userMessage.toLowerCase();
  const keywordMatches = SECTION_INTENTS
    .filter(section => msgLower.includes(section.id) || msgLower.includes(section.label.toLowerCase()))
    .map(section => ({ ...section, score: 1 }));

  const embeddedMatches = SECTION_INTENTS
    .map(section => ({
      ...section,
      score: cosineSimilarity(userVector, section.vector)
    }))
    .sort((a, b) => b.score - a.score);

  const combined = [...keywordMatches, ...embeddedMatches]
    .filter((section, index, sections) => sections.findIndex(s => s.id === section.id) === index)
    .slice(0, 2);

  return combined.length > 0 ? combined : SECTION_INTENTS.slice(0, 2).map(section => ({ ...section, score: 0 }));
}

function hasInterestSignal(userMessage) {
  const msgLower = normalizeForMatch(userMessage);
  if (INTEREST_CUES.some(cue => msgLower.includes(cue))) return true;
  return STANDARD_INTEREST_TAGS.some(interest =>
    interest.keywords.some(keyword => hasKeyword(msgLower, keyword))
  );
}

async function getInterestTagVectors(apiKey) {
  if (interestTagVectorCache) return interestTagVectorCache;

  const vectors = await Promise.all(
    STANDARD_INTEREST_TAGS.map(interest =>
      embedText(apiKey, `${interest.label}: ${interest.description}`)
    )
  );

  interestTagVectorCache = vectors;
  return interestTagVectorCache;
}

function inferInterestMatches(userMessage, userVector, tagVectors) {
  const msgLower = normalizeForMatch(userMessage);
  const hasCue = INTEREST_CUES.some(cue => msgLower.includes(cue));

  const matches = STANDARD_INTEREST_TAGS.map((interest, index) => {
    const keywordMatches = interest.keywords.filter(keyword => hasKeyword(msgLower, keyword));
    const semanticScore = cosineSimilarity(userVector, tagVectors[index]);
    const keywordBoost = keywordMatches.length > 0 ? 0.35 : 0;
    return {
      ...interest,
      score: Math.min(1, semanticScore + keywordBoost),
      semanticScore,
      keywordMatches
    };
  })
    .filter(match => match.keywordMatches.length > 0 || (hasCue && match.semanticScore >= 0.42))
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);

  return matches;
}

function getExistingInterestTags(user) {
  if (Array.isArray(user?.interestTags)) return user.interestTags;
  if (user?.interestTags instanceof Set) return Array.from(user.interestTags);
  if (Array.isArray(user?.interests)) {
    return user.interests
      .map(interest => typeof interest === 'string' ? interest : interest?.tag)
      .filter(Boolean);
  }
  return [];
}

function buildInterestMetadata(tags) {
  const tagSet = new Set(tags);
  return STANDARD_INTEREST_TAGS
    .filter(interest => tagSet.has(interest.tag))
    .map(({ tag, label, description }) => ({ tag, label, description }));
}

async function updateUserInterestProfile({ apiKey, userMessage, userVector, claims }) {
  const userId = claims?.sub;
  if (!userId || !userVector || !hasInterestSignal(userMessage)) {
    return { updated: false, tags: [] };
  }

  const tagVectors = await getInterestTagVectors(apiKey);
  const matches = inferInterestMatches(userMessage, userVector, tagVectors);
  if (matches.length === 0) {
    return { updated: false, tags: [] };
  }

  const userResponse = await docClient.send(new GetCommand({
    TableName: USERS_TABLE,
    Key: { userId }
  }));

  if (!userResponse.Item) {
    console.warn(`Interest update skipped: user ${userId} not found`);
    return { updated: false, tags: matches.map(match => match.tag) };
  }

  const existingTags = getExistingInterestTags(userResponse.Item);
  const newTags = matches.map(match => match.tag);
  const mergedTags = Array.from(new Set([...existingTags, ...newTags]));
  const matchedTagVectors = matches
    .map(match => tagVectors[STANDARD_INTEREST_TAGS.findIndex(interest => interest.tag === match.tag)])
    .filter(Boolean);
  const newInterestVector = averageVectors([userVector, ...matchedTagVectors]);

  if (!newInterestVector) {
    return { updated: false, tags: newTags };
  }

  const mergedInterestVector = blendVectors(userResponse.Item.interestVector, newInterestVector);
  const interestMetadata = buildInterestMetadata(mergedTags);
  const interestProfileText = interestMetadata
    .map(interest => `${interest.tag}: ${interest.description}`)
    .join('\n');
  const now = new Date().toISOString();

  await docClient.send(new UpdateCommand({
    TableName: USERS_TABLE,
    Key: { userId },
    UpdateExpression: [
      'SET #interestTags = :interestTags',
      '#interests = :interests',
      '#interestVector = :interestVector',
      '#interestProfileText = :interestProfileText',
      '#interestUpdatedAt = :interestUpdatedAt'
    ].join(', '),
    ExpressionAttributeNames: {
      '#interestTags': 'interestTags',
      '#interests': 'interests',
      '#interestVector': 'interestVector',
      '#interestProfileText': 'interestProfileText',
      '#interestUpdatedAt': 'interestUpdatedAt'
    },
    ExpressionAttributeValues: {
      ':interestTags': mergedTags,
      ':interests': interestMetadata,
      ':interestVector': mergedInterestVector,
      ':interestProfileText': interestProfileText,
      ':interestUpdatedAt': now
    }
  }));

  console.log('Updated user interest profile:', { userId, newTags, mergedTags });
  return {
    updated: true,
    tags: newTags,
    allTags: mergedTags
  };
}

function getChapterIdFromVector(vector) {
  if (vector.type === 'chapter_profile') return vector.parentId;
  return vector.chapterId || null;
}

function buildChapterLookup(chapters) {
  return new Map(chapters.map(chapter => [chapter.chapterId, chapter]));
}

function formatInrAmount(amount) {
  return amount.toLocaleString('en-IN', {
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    maximumFractionDigits: 2
  });
}

function getChapterFeeContext(chapter) {
  const feeInPaise = Number(chapter.registrationFee || 0);
  const feeInRupees = feeInPaise / 100;

  return {
    registrationFee: feeInRupees,
    registrationFeeCurrency: 'INR',
    registrationFeeUnit: 'rupees',
    registrationFeeDisplay: feeInPaise > 0 ? `₹${formatInrAmount(feeInRupees)}` : 'Free'
  };
}

function rankChaptersBySectionSimilarity({ userVector, vectors, chapters, sectionIds, targetParentId }) {
  const chapterLookup = buildChapterLookup(chapters);
  const requestedSections = new Set(sectionIds);

  let candidateVectors = vectors.filter(vector => {
    const chapterId = getChapterIdFromVector(vector);
    if (!chapterId || !chapterLookup.has(chapterId)) return false;
    if (vector.type && vector.type !== 'chapter_profile') return false;
    if (targetParentId && chapterId !== targetParentId) return false;
    return requestedSections.has(vector.section || vector.chunkId);
  });

  if (candidateVectors.length === 0) {
    candidateVectors = vectors.filter(vector => {
      const chapterId = getChapterIdFromVector(vector);
      if (!chapterId || !chapterLookup.has(chapterId)) return false;
      if (vector.type && vector.type !== 'chapter_profile') return false;
      return !targetParentId || chapterId === targetParentId;
    });
  }

  const chapterScores = new Map();

  for (const vector of candidateVectors) {
    const chapterId = getChapterIdFromVector(vector);
    const score = cosineSimilarity(userVector, vector.vector);
    if (!chapterScores.has(chapterId)) {
      chapterScores.set(chapterId, {
        chapter: chapterLookup.get(chapterId),
        bestScore: score,
        chunks: [{ ...vector, score }]
      });
      continue;
    }

    const result = chapterScores.get(chapterId);
    result.bestScore = Math.max(result.bestScore, score);
    result.chunks.push({ ...vector, score });
  }

  return [...chapterScores.values()]
    .map(result => ({
      ...result,
      chunks: result.chunks.sort((a, b) => b.score - a.score).slice(0, 3)
    }))
    .sort((a, b) => b.bestScore - a.bestScore)
    .slice(0, 3);
}

async function retrieveRelevantChapterContext(apiKey, userMessage, chapters) {
  const [userVector, sectionVectors, allVectors] = await Promise.all([
    embedText(apiKey, userMessage),
    Promise.all(SECTION_INTENTS.map(section => embedText(apiKey, section.description))),
    getAllVectors()
  ]);

  if (!userVector) {
    return {
      sections: [],
      results: [],
      targetParentId: null,
      userVector: null
    };
  }

  sectionVectors.forEach((vector, index) => {
    SECTION_INTENTS[index].vector = vector;
  });

  const selectedSections = chooseRelevantSections(userMessage, userVector);
  const targetParentId = extractTargetParentLocal(userMessage, chapters);
  const rankedResults = rankChaptersBySectionSimilarity({
    userVector,
    vectors: allVectors,
    chapters,
    sectionIds: selectedSections.map(section => section.id),
    targetParentId
  });

  console.log('RAG selected sections:', selectedSections.map(section => `${section.id}:${section.score.toFixed(3)}`));
  console.log('RAG top chapters:', rankedResults.map(result => ({
    chapterId: result.chapter.chapterId,
    chapterName: result.chapter.chapterName,
    score: result.bestScore
  })));

  return {
    sections: selectedSections,
    results: rankedResults,
    targetParentId,
    userVector
  };
}

async function callGeminiApi(apiKey, userMessage, chaptersContext, ragContext = { sections: [], results: [] }) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${apiKey}`;
  
  const matchedChapterIds = new Set((ragContext.results || []).map(result => result.chapter.chapterId));
  const cleanContext = chaptersContext
    .filter(c => matchedChapterIds.size === 0 || matchedChapterIds.has(c.chapterId))
    .map(c => {
      const feeContext = getChapterFeeContext(c);
      return {
        chapterId: c.chapterId,
        chapterName: c.chapterName,
        type: c.type,
        headName: c.headName,
        isPaid: Boolean(c.isPaid),
        registrationFee: feeContext.registrationFee,
        registrationFeeCurrency: feeContext.registrationFeeCurrency,
        registrationFeeUnit: feeContext.registrationFeeUnit,
        registrationFeeDisplay: feeContext.registrationFeeDisplay,
        registrationOpen: c.registrationOpen ?? c.isRegistrationOpen ?? false,
        tags: c.tags || []
      };
    });

  let specificContext = "";
  if (ragContext.results?.length > 0) {
    const sectionLabels = ragContext.sections.map(section => section.label).join(', ');
    specificContext = `\nRAG retrieval selected these relevant profile sections first: ${sectionLabels || 'all available sections'}.\n`;
    specificContext += `Then it ranked chapters across those sections. Best matches:\n`;
    specificContext += ragContext.results.map((result, index) => {
      const chunks = result.chunks
        .map(chunk => `  - [${chunk.section || chunk.chunkId}, score ${chunk.score.toFixed(3)}] ${chunk.text}`)
        .join('\n');
      return `${index + 1}. ${result.chapter.chapterName} (chapterId: ${result.chapter.chapterId}, score ${result.bestScore.toFixed(3)})\n${chunks}`;
    }).join('\n');
    specificContext += `\n\nBase your recommendation primarily on the highest-ranked chapter and the retrieved section text. Mention close alternatives only if they are meaningfully relevant.\n`;
  }

  const prompt = `
You are a helpful student advisor chatbot for the "Unify" university platform.
A student is asking a question or looking for a chapter/club recommendation.

Here is the current list of chapters/clubs available at the university:
${JSON.stringify(cleanContext, null, 2)}
${specificContext}

Please answer the student's question based ONLY on the chapters and specific information provided above.
If they ask for recommendations based on their skills or interests, use the retrieved RAG context first, then tags and chapter names as secondary signals.
For chapters, registrationFee is already converted from stored paise into INR rupees. Use registrationFeeDisplay when mentioning a paid chapter fee.
Provide a clear, friendly response mentioning the chapter name, the head (if available), whether registration is open, and the fee if paid.
Use Markdown formatting for a good reading experience.

Student's message:
${userMessage}
`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [{
        parts: [{ text: prompt }]
      }]
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Gemini API Error:', errorText);
    throw new Error('Failed to get response from Gemini API');
  }

  const data = await response.json();
  return data.candidates[0].content.parts[0].text;
}

export const handler = async (event) => {
  if (event.requestContext?.http?.method === 'OPTIONS') {
    return { statusCode: 204, headers: HEADERS, body: '' };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const userMessage = body.message;

    if (!userMessage) {
      return {
        statusCode: 400,
        headers: HEADERS,
        body: JSON.stringify({ error: 'Message is required' })
      };
    }

    const [apiKey, chapters] = await Promise.all([
      getGeminiApiKey(),
      getAllChapters()
    ]);

    const ragContext = await retrieveRelevantChapterContext(apiKey, userMessage, chapters);
    const interestUpdatePromise = updateUserInterestProfile({
      apiKey,
      userMessage,
      userVector: ragContext.userVector,
      claims: event.requestContext?.authorizer?.jwt?.claims
    }).catch(error => {
      console.error('Interest profile update failed:', error);
      return { updated: false, tags: [], error: error.message };
    });

    const reply = await callGeminiApi(apiKey, userMessage, chapters, ragContext);
    const interestUpdate = await interestUpdatePromise;

    return {
      statusCode: 200,
      headers: HEADERS,
      body: JSON.stringify({ reply, interestUpdate })
    };
  } catch (error) {
    console.error('Chatbot handler error:', error);
    return {
      statusCode: 500,
      headers: HEADERS,
      body: JSON.stringify({ error: 'Internal Server Error', details: error.message })
    };
  }
};
