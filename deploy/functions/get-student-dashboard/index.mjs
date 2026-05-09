import {
  DynamoDBClient,
  ScanCommand
} from "@aws-sdk/client-dynamodb";

const dynamo = new DynamoDBClient({ region: "ap-south-1" });
const USERS_TABLE = "Unify-Users";
const CHAPTERS_TABLE = "Chapters";
const EVENTS_TABLE = process.env.EVENTS_TABLE || "ChapterEvents";
const VECTORS_TABLE = process.env.VECTORS_TABLE || "UnifyVectors";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type,Authorization",
  "Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS"
};

const STANDARD_INTEREST_TAGS = [
  { tag: "coding", keywords: ["coding", "code", "programming", "software", "developer", "hackathon", "algorithm"] },
  { tag: "gaming", keywords: ["gaming", "game", "games", "esports", "game development", "game jam"] },
  { tag: "martial_arts", keywords: ["martial arts", "karate", "taekwondo", "boxing", "kickboxing", "self defense", "mma", "combat"] },
  { tag: "robotics", keywords: ["robotics", "robot", "drone", "arduino", "electronics", "sensors", "embedded", "automation"] },
  { tag: "fitness", keywords: ["fitness", "gym", "workout", "exercise", "health", "wellness", "strength", "running"] },
  { tag: "music", keywords: ["music", "singing", "song", "guitar", "piano", "band", "instrument", "concert"] },
  { tag: "entrepreneurship", keywords: ["entrepreneurship", "startup", "business", "founder", "pitch", "venture", "innovation", "product"] },
  { tag: "ai", keywords: ["ai", "artificial intelligence", "machine learning", "ml", "deep learning", "generative ai", "data science"] },
  { tag: "cloud_computing", keywords: ["cloud", "cloud computing", "aws", "azure", "gcp", "devops", "serverless", "deployment"] },
  { tag: "sports", keywords: ["sports", "sport", "football", "cricket", "basketball", "volleyball", "tournament", "athletics"] }
];

const INTEREST_BY_TAG = new Map(STANDARD_INTEREST_TAGS.map(interest => [interest.tag, interest]));

const getString = (attr, fallback = "") => attr?.S ?? fallback;
const getNumber = (attr, fallback = 0) => {
  const value = attr?.N ?? attr?.S;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};
const getBool = (attr, fallback = false) => attr?.BOOL ?? fallback;

const getStringList = (attr) => {
  if (!attr) return [];
  if (Array.isArray(attr.SS)) return attr.SS;
  if (Array.isArray(attr.L)) {
    return attr.L
      .map(item => item.S ?? item.M?.tag?.S ?? "")
      .filter(Boolean);
  }
  return [];
};

const getNumberVector = (attr) => {
  if (!attr?.L) return [];
  return attr.L
    .map(item => Number(item.N ?? item.S))
    .filter(Number.isFinite);
};

async function scanAll(params) {
  const items = [];
  let ExclusiveStartKey;

  do {
    const response = await dynamo.send(new ScanCommand({
      ...params,
      ExclusiveStartKey
    }));
    items.push(...(response.Items || []));
    ExclusiveStartKey = response.LastEvaluatedKey;
  } while (ExclusiveStartKey);

  return items;
}

function normalizeTag(value) {
  const normalized = String(value || "").toLowerCase().replace(/[-\s]+/g, "_").trim();
  if (normalized === "artificial_intelligence" || normalized === "machine_learning" || normalized === "ml") return "ai";
  if (normalized === "cloud") return "cloud_computing";
  if (normalized === "martial_arts" || normalized === "martialart") return "martial_arts";
  return normalized;
}

function normalizeText(value) {
  return String(value || "").toLowerCase().replace(/[_-]+/g, " ");
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function textHasKeyword(text, keyword) {
  const normalizedKeyword = normalizeText(keyword).trim();
  if (!normalizedKeyword) return false;
  return new RegExp(`(^|[^a-z0-9])${escapeRegExp(normalizedKeyword)}([^a-z0-9]|$)`, "i").test(text);
}

function cosineSimilarity(vecA, vecB) {
  if (!Array.isArray(vecA) || !Array.isArray(vecB) || vecA.length === 0 || vecA.length !== vecB.length) {
    return 0;
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  if (!normA || !normB) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

function buildEventSearchText(eventItem) {
  return normalizeText([
    getString(eventItem.title),
    getString(eventItem.description),
    getString(eventItem.chapterName),
    getString(eventItem.eventType),
    getString(eventItem.location),
    getStringList(eventItem.tags).join(" ")
  ].join(" "));
}

function getEventMatchedTags(eventItem, interestTags) {
  const eventTags = new Set(getStringList(eventItem.tags).map(normalizeTag));
  const eventText = buildEventSearchText(eventItem);

  return interestTags.filter(tag => {
    if (eventTags.has(tag)) return true;
    const tagConfig = INTEREST_BY_TAG.get(tag);
    return tagConfig?.keywords.some(keyword => textHasKeyword(eventText, keyword));
  });
}

function eventToRecommendation(eventItem, scoreData) {
  const eventId = getString(eventItem.eventId);
  return {
    id: eventId,
    eventId,
    chapterId: getString(eventItem.chapterId),
    chapterName: getString(eventItem.chapterName, "Community"),
    title: getString(eventItem.title, "Event"),
    description: getString(eventItem.description),
    eventType: getString(eventItem.eventType),
    imageUrl: getString(eventItem.imageUrl, ""),
    location: getString(eventItem.location),
    isOnline: getBool(eventItem.isOnline),
    isPaid: getBool(eventItem.isPaid),
    registrationFee: getNumber(eventItem.registrationFee),
    startDateTime: getString(eventItem.startDateTime),
    endDateTime: getString(eventItem.endDateTime),
    tags: getStringList(eventItem.tags),
    matchedTags: scoreData.matchedTags,
    recommendationScore: Number(scoreData.score.toFixed(4)),
    semanticScore: Number(scoreData.semanticScore.toFixed(4))
  };
}

async function getRecommendedEventsForUser(user) {
  const interestTags = Array.from(new Set([
    ...getStringList(user.interestTags),
    ...getStringList(user.interests)
  ].map(normalizeTag).filter(tag => INTEREST_BY_TAG.has(tag))));
  const interestVector = getNumberVector(user.interestVector);

  if (interestTags.length === 0 && interestVector.length === 0) {
    return [];
  }

  const [eventItems, vectorItems] = await Promise.all([
    scanAll({
      TableName: EVENTS_TABLE,
      FilterExpression: "isLive = :live",
      ExpressionAttributeValues: { ":live": { BOOL: true } }
    }),
    scanAll({
      TableName: VECTORS_TABLE,
      FilterExpression: "#type = :summary OR #type = :profile",
      ExpressionAttributeNames: { "#type": "type" },
      ExpressionAttributeValues: {
        ":summary": { S: "event_summary" },
        ":profile": { S: "event_profile" }
      }
    })
  ]);

  const vectorsByEventId = new Map();
  for (const vectorItem of vectorItems) {
    const eventId = getString(vectorItem.parentId);
    const vector = getNumberVector(vectorItem.vector);
    if (!eventId || vector.length === 0) continue;
    const vectors = vectorsByEventId.get(eventId) || [];
    vectors.push(vector);
    vectorsByEventId.set(eventId, vectors);
  }

  const taggedCandidates = eventItems.map(item => ({
    item,
    matchedTags: getEventMatchedTags(item, interestTags)
  }));

  const firstPass = taggedCandidates.filter(candidate => candidate.matchedTags.length > 0);
  const candidates = firstPass.length >= 6
    ? firstPass
    : [
      ...firstPass,
      ...taggedCandidates.filter(candidate => candidate.matchedTags.length === 0)
    ];

  const now = new Date();
  const validCandidates = candidates.filter(candidate => {
    const endDateTime = getString(candidate.item.endDateTime);
    const startDateTime = getString(candidate.item.startDateTime);
    
    if (endDateTime) {
      return new Date(endDateTime) >= now;
    }
    if (startDateTime) {
      // Fallback: Assume event lasts 4 hours if no end time is provided
      const startDate = new Date(startDateTime);
      const estimatedEndDate = new Date(startDate.getTime() + 4 * 60 * 60 * 1000);
      return estimatedEndDate >= now;
    }
    // If no date info at all, we keep it as it might be a TBD event that is still relevant
    return true; 
  });

  return validCandidates
    .map(candidate => {
      const eventId = getString(candidate.item.eventId);
      const eventVectors = vectorsByEventId.get(eventId) || [];
      const semanticScore = interestVector.length > 0
        ? Math.max(0, ...eventVectors.map(vector => cosineSimilarity(interestVector, vector)))
        : 0;
      const tagScore = interestTags.length > 0
        ? candidate.matchedTags.length / interestTags.length
        : 0;
      const score = semanticScore > 0
        ? (semanticScore * 0.8) + (tagScore * 0.2)
        : tagScore;

      return {
        item: candidate.item,
        matchedTags: candidate.matchedTags,
        semanticScore,
        score
      };
    })
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return new Date(getString(a.item.startDateTime)).getTime() - new Date(getString(b.item.startDateTime)).getTime();
    })
    .slice(0, 6)
    .map(result => eventToRecommendation(result.item, result));
}

export const handler = async (event) => {
  const method = event.httpMethod || event.requestContext?.http?.method;
  if (method === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: ''
    };
  }

  try {
    const claims = event.requestContext?.authorizer?.jwt?.claims;
    
    if (!claims) {
      return {
        statusCode: 401,
        headers: corsHeaders,
        body: JSON.stringify({ error: "No authorization claims found" })
      };
    }

    // Flexible email extraction
    const userEmail = claims.email || 
                      claims['cognito:username'] || 
                      claims.username || 
                      claims.sub;

    if (!userEmail) {
      return {
        statusCode: 401,
        headers: corsHeaders,
        body: JSON.stringify({ 
          error: "No email found in token",
          availableClaims: Object.keys(claims)
        })
      };
    }

    console.log('Processing dashboard for user:', userEmail);

    // Find user by email in Unify-Users table
    const userParams = {
      TableName: USERS_TABLE,
      FilterExpression: "email = :email",
      ExpressionAttributeValues: {
        ":email": { S: userEmail }
      }
    };

    const [userResult, allChapters] = await Promise.all([
      dynamo.send(new ScanCommand(userParams)),
      dynamo.send(new ScanCommand({
        TableName: CHAPTERS_TABLE,
        FilterExpression: "attribute_not_exists(#status) OR #status <> :archived",
        ExpressionAttributeNames: { "#status": "status" },
        ExpressionAttributeValues: { ":archived": { S: "archived" } }
      }))
    ]);

    if (!userResult.Items || userResult.Items.length === 0) {
      return {
        statusCode: 404,
        headers: corsHeaders,
        body: JSON.stringify({ error: "User not found" })
      };
    }

    const user = userResult.Items[0];
    // registeredChapters is stored as an array in your schema
    const registeredChapters = user.registeredChapters?.SS || user.registeredChapters?.L?.map(item => item.S) || [];
    
    // Extract attendedEvents set
    const attendedEvents = user.attendedEvents?.SS || user.attendedEvents?.L?.map(item => item.S) || [];

    // Fetch events attended
    let eventsAttended = 0;
    try {
      const { ScanCommand } = await import("@aws-sdk/client-dynamodb");
      const eventRegs = await dynamo.send(new ScanCommand({
        TableName: "EventPayments",
        FilterExpression: "userId = :userId AND (paymentStatus = :completed OR paymentStatus = :na)",
        ExpressionAttributeValues: {
          ":userId": { S: user.userId.S },
          ":completed": { S: "COMPLETED" },
          ":na": { S: "NA" }
        }
      }));
      eventsAttended = eventRegs.Items ? eventRegs.Items.length : 0;
    } catch (err) {
      console.log('Event payments scan issue:', err.message);
    }

    // Fetch recent activity
    let recentActivities = [];
    try {
      const activitiesResult = await dynamo.send(new ScanCommand({
        TableName: "Activities",
        FilterExpression: "userId = :userId OR (attribute_not_exists(userId) AND chapterId IN (:chapters))",
        ExpressionAttributeValues: {
          ":userId": { S: user.userId.S },
          ":chapters": { L: registeredChapters.map(c => ({ S: c })) }
        }
      }));
      recentActivities = (activitiesResult.Items || [])
        .sort((a, b) => new Date(b.timestamp.S).getTime() - new Date(a.timestamp.S).getTime())
        .slice(0, 5)
        .map(a => ({
          id: a.activityId.S,
          message: a.message.S,
          timestamp: a.timestamp.S,
          type: a.type.S
        }));
    } catch (err) {
      console.log('Activities scan issue:', err.message);
    }

    let recommendedEvents = [];
    try {
      recommendedEvents = await getRecommendedEventsForUser(user);
      console.log(`Recommended events generated: ${recommendedEvents.length}`);
    } catch (err) {
      console.log('Recommendations issue:', err.message);
    }

    const dashboardData = {
      registeredChaptersCount: registeredChapters.length,
      totalAvailableChapters: allChapters.Items?.length || 0,
      eventsAttended,
      attendedEvents,
      registeredChapters: registeredChapters.map(chapterName => {
        const chapterData = allChapters.Items?.find(c => c.chapterName?.S === chapterName);
        return {
          name: chapterName,
          type: chapterData?.type?.S || 'chapter',
          registrationOpen: chapterData?.registrationOpen?.BOOL ?? true,
          registeredAt: user.createdAt?.S || new Date().toISOString()
        };
      }),
      recentActivities,
      recommendedEvents,
      userEmail: userEmail,
      userName: user.name?.S || 'Unknown User'
    };

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify(dashboardData)
    };

  } catch (error) {
    console.error("Error fetching dashboard data:", error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ 
        error: "Failed to fetch dashboard data",
        details: error.message 
      })
    };
  }
};
