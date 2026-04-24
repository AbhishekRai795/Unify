// manage-chapters.js
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, UpdateCommand, GetCommand, DeleteCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { CognitoIdentityProviderClient, AdminAddUserToGroupCommand, AdminRemoveUserFromGroupCommand } from "@aws-sdk/client-cognito-identity-provider";
import { randomUUID } from 'crypto';

const client = new DynamoDBClient({ region: "ap-south-1" });
const docClient = DynamoDBDocumentClient.from(client);
const cognitoClient = new CognitoIdentityProviderClient({ region: "ap-south-1" });

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS"
};

const CHAPTERS_TABLE = "Chapters";
const CHAPTER_HEAD_TABLE = "ChapterHead";
const COGNITO_GROUP = "chapter-head";

/**
 * Robustly parses Cognito groups from JWT claims
 */
function parseGroups(claims) {
  const rawGroups = claims['cognito:groups'];
  if (!rawGroups) return [];
  if (Array.isArray(rawGroups)) return rawGroups;
  
  if (typeof rawGroups === 'string') {
    const trimmed = rawGroups.trim();
    if ((trimmed.startsWith('[') && trimmed.endsWith(']')) || trimmed.includes('"')) {
      try {
        const parsed = JSON.parse(trimmed);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return trimmed.replace(/^\[|\]$/g, '').split(',').map(g => g.trim().replace(/^"|"$/g, '')).filter(Boolean);
      }
    } else {
      return trimmed.split(',').map(g => g.trim()).filter(Boolean);
    }
  }
  return [];
}

export const handler = async (event) => {
  console.log('=== CHAPTER MANAGEMENT LAMBDA ===');
  console.log('Method:', event.requestContext?.http?.method);
  console.log('Path:', event.requestContext?.http?.path);

  if (event.requestContext?.http?.method === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders };
  }

  // 1. Admin Verification
  const claims = event.requestContext?.authorizer?.jwt?.claims || {};
  const groups = parseGroups(claims);
  
  if (!groups.includes('admin')) {
    console.error('Forbidden: User groups:', groups);
    return {
      statusCode: 403,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Forbidden: Admin access required' })
    };
  }

  const method = event.requestContext?.http?.method;
  const path = event.requestContext?.http?.path || "";
  const pathParameters = event.pathParameters || {};
  
  let body = {};
  if (event.body) {
    try {
      body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    } catch (e) {
      return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'Invalid JSON body' }) };
    }
  }

  const chapterId = pathParameters.chapterId || body?.chapterId; // Support both path and body

  try {
    // ROUTING LOGIC
    
    // a. Create Chapter (POST /api/chapters or path contains "create")
    if (method === 'POST' && (path.endsWith('/chapters') || path.includes('/create-chapter'))) {
      return await createChapterAction(body);
    }

    // b. Assign Chapter Head (POST /api/chapters/{id}/head or path contains "assign-head")
    if (method === 'POST' && (path.endsWith('/head') || path.includes('/assign-chapter-head'))) {
      const targetId = chapterId || body.chapterId;
      if (!targetId) throw new Error('chapterId is required');
      return await assignChapterHeadAction(targetId, body);
    }

    // c. Remove Chapter Head (DELETE /api/chapters/{id}/head or path contains "remove-head" or "head-by-email")
    if ((method === 'DELETE' || method === 'POST') && (path.endsWith('/head') || path.includes('/remove-chapter-head') || path.includes('/head-by-email'))) {
      const targetId = chapterId || body.chapterId;
      // If path contains an email (from head-by-email/{email}), we might be removing by email
      if (!targetId && (pathParameters.email || path.includes('/head-by-email/'))) {
        const emailFromPath = pathParameters.email || path.split('/head-by-email/')[1];
        return await removeHeadByEmailAction(emailFromPath);
      }
      if (!targetId) throw new Error('chapterId or email is required');
      return await removeChapterHeadAction(targetId);
    }

    // d. Get Single Chapter (GET /api/chapters/{id})
    if (method === 'GET' && chapterId && !path.endsWith('/heads') && !path.endsWith('/chapters')) {
      return await getChapterAction(chapterId);
    }

    // e. Update Chapter (PUT/PATCH /api/chapters/{id} or path contains "update")
    if ((method === 'PUT' || method === 'PATCH' || (method === 'POST' && path.includes('/update-chapter'))) && (chapterId || body.chapterId)) {
      const targetId = chapterId || body.chapterId;
      return await updateChapterAction(targetId, body);
    }

    // e. Delete Chapter (DELETE /api/chapters/{id} or path contains "delete-chapter")
    if (method === 'DELETE' && chapterId && !path.endsWith('/head')) {
      return await deleteChapterAction(chapterId);
    }

    // f. List Chapters (GET /api/chapters)
    if (method === 'GET' && (path.endsWith('/chapters') || path === '/api/chapters')) {
      return await listChaptersAction(event.queryStringParameters);
    }

    // g. List Chapter Heads (GET /api/chapters/heads)
    if (method === 'GET' && path.endsWith('/heads')) {
      return await listChapterHeadsAction();
    }

    return {
      statusCode: 404,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Endpoint Not Found', method, path })
    };

  } catch (error) {
    console.error('Action Error:', error);
    return {
      statusCode: error.statusCode || 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: error.message || 'Internal Server Error' })
    };
  }
};

/**
 * ACTION: List Chapters (with optional 'active' status filter)
 */
async function listChaptersAction(params) {
  const limit = params?.limit ? parseInt(params.limit) : 100;
  const lastKey = params?.lastEvaluatedKey;
  
  const scanParams = {
    TableName: CHAPTERS_TABLE,
    Limit: limit,
    FilterExpression: "#status = :status",
    ExpressionAttributeNames: { "#status": "status" },
    ExpressionAttributeValues: { ":status": "active" }
  };
  
  if (lastKey) {
    try {
      scanParams.ExclusiveStartKey = JSON.parse(decodeURIComponent(lastKey));
    } catch (e) {
      console.warn('Failed to parse lastEvaluatedKey:', lastKey);
    }
  }
  
  const result = await docClient.send(new ScanCommand(scanParams));
  
  return { 
    statusCode: 200,
    headers: corsHeaders,
    body: JSON.stringify({ 
      chapters: result.Items || [],
      lastEvaluatedKey: result.LastEvaluatedKey 
        ? encodeURIComponent(JSON.stringify(result.LastEvaluatedKey))
        : null
    })
  };
}

/**
 * ACTION: Get Single Chapter
 */
async function getChapterAction(chapterId) {
  const result = await docClient.send(new GetCommand({
    TableName: CHAPTERS_TABLE,
    Key: { chapterId }
  }));
  
  if (!result.Item) {
    return { statusCode: 404, headers: corsHeaders, body: JSON.stringify({ error: 'Chapter not found' }) };
  }
  
  return { statusCode: 200, headers: corsHeaders, body: JSON.stringify(result.Item) };
}

/**
 * ACTION: List All Chapter Heads
 */
async function listChapterHeadsAction() {
  const result = await docClient.send(new ScanCommand({
    TableName: CHAPTER_HEAD_TABLE
  }));
  
  return { 
    statusCode: 200,
    headers: corsHeaders,
    body: JSON.stringify({ heads: result.Items || [] })
  };
}

/**
 * ACTION: Create Chapter
 */
async function createChapterAction(data) {
  const { chapterName, headEmail, headName } = data;
  if (!chapterName) throw new Error('chapterName is required');

  const chapterId = randomUUID();
  const now = new Date().toISOString();

  // Strict Constraint: One Head per User
  if (headEmail) {
    const existing = await findChapterHeadByEmail(headEmail);
    if (existing) {
      const err = new Error(`User ${headEmail} is already assigned as a head for chapter: ${existing.chapterName || existing.chapterId}`);
      err.statusCode = 400;
      throw err;
    }
  }

  const chapterItem = {
    chapterId,
    chapterName,
    headEmail: headEmail ? headEmail.trim().toLowerCase() : null,
    headName: headName || null,
    status: 'active',
    memberCount: 0,
    createdAt: now,
    updatedAt: now
  };

  await docClient.send(new PutCommand({ TableName: CHAPTERS_TABLE, Item: chapterItem }));

  if (headEmail) {
    await syncChapterHead(headEmail.trim().toLowerCase(), chapterId, chapterName, headName, now);
  }

  return {
    statusCode: 201,
    headers: corsHeaders,
    body: JSON.stringify({ message: 'Chapter created successfully', chapterId, chapter: chapterItem })
  };
}

/**
 * ACTION: Update Chapter (Generic)
 */
async function updateChapterAction(chapterId, data) {
  const { chapterName, headEmail, headName, isPaid, registrationFee } = data;
  const now = new Date().toISOString();

  const current = await docClient.send(new GetCommand({ TableName: CHAPTERS_TABLE, Key: { chapterId } }));
  if (!current.Item) {
    const err = new Error('Chapter not found');
    err.statusCode = 404;
    throw err;
  }

  const oldHeadEmail = current.Item.headEmail;
  const newHeadEmail = headEmail ? headEmail.trim().toLowerCase() : headEmail;

  // Build Update
  let updateExp = "SET updatedAt = :now";
  let expValues = { ":now": now };
  
  if (chapterName !== undefined) {
    updateExp += ", chapterName = :name";
    expValues[":name"] = chapterName;
  }
  if (headEmail !== undefined) {
    updateExp += ", headEmail = :email";
    expValues[":email"] = newHeadEmail || null;
  }
  if (headName !== undefined) {
    updateExp += ", headName = :headName";
    expValues[":headName"] = headName || null;
  }
  if (isPaid !== undefined) {
    updateExp += ", isPaid = :isPaid";
    expValues[":isPaid"] = Boolean(isPaid);
  }
  if (registrationFee !== undefined) {
    updateExp += ", registrationFee = :regFee";
    expValues[":regFee"] = Number(registrationFee);
  }

  await docClient.send(new UpdateCommand({
    TableName: CHAPTERS_TABLE,
    Key: { chapterId },
    UpdateExpression: updateExp,
    ExpressionAttributeValues: expValues
  }));

  // Handle Head Changes
  if (headEmail !== undefined && newHeadEmail !== oldHeadEmail) {
    if (oldHeadEmail) await cleanupChapterHead(oldHeadEmail);
    if (newHeadEmail) {
      // Strict Constraint Check (Case-insensitive)
      const existing = await findChapterHeadByEmail(newHeadEmail);
      if (existing && existing.chapterId !== chapterId) {
        const err = new Error(`User ${newHeadEmail} is already assigned as a head for another chapter: ${existing.chapterName || existing.chapterId}`);
        err.statusCode = 400;
        throw err;
      }
      await syncChapterHead(newHeadEmail, chapterId, chapterName || current.Item.chapterName, headName || current.Item.headName, now);
    }
  } else if (newHeadEmail && (chapterName || headName)) {
    // Update mapping if info changed
    await syncChapterHead(newHeadEmail, chapterId, chapterName || current.Item.chapterName, headName || current.Item.headName, now);
  }

  return {
    statusCode: 200,
    headers: corsHeaders,
    body: JSON.stringify({ message: 'Chapter updated successfully', chapterId })
  };
}

/**
 * ACTION: Assign Chapter Head (Specific)
 */
async function assignChapterHeadAction(chapterId, data) {
  const { email, headName } = data;
  if (!email) throw new Error('email is required');

  // Strict Constraint: One Head per Chapter
  const current = await docClient.send(new GetCommand({ TableName: CHAPTERS_TABLE, Key: { chapterId } }));
  if (current.Item?.headEmail && current.Item.headEmail !== email.trim().toLowerCase()) {
    const err = new Error(`Chapter already has a head (${current.Item.headEmail}). Remove them first.`);
    err.statusCode = 400;
    throw err;
  }

  return await updateChapterAction(chapterId, { headEmail: email, headName });
}

/**
 * ACTION: Remove Chapter Head
 */
async function removeChapterHeadAction(chapterId) {
  const current = await docClient.send(new GetCommand({ TableName: CHAPTERS_TABLE, Key: { chapterId } }));
  if (!current.Item) throw new Error('Chapter not found');
  
  const email = current.Item.headEmail;
  if (email) {
    await cleanupChapterHead(email);
    await docClient.send(new UpdateCommand({
      TableName: CHAPTERS_TABLE,
      Key: { chapterId },
      UpdateExpression: "REMOVE headEmail, headName SET updatedAt = :now",
      ExpressionAttributeValues: { ":now": new Date().toISOString() }
    }));
  }

  return {
    statusCode: 200,
    headers: corsHeaders,
    body: JSON.stringify({ message: 'Chapter head removed successfully', chapterId })
  };
}

/**
 * ACTION: Remove Head By Email
 */
async function removeHeadByEmailAction(email) {
  const head = await docClient.send(new GetCommand({
    TableName: CHAPTER_HEAD_TABLE,
    Key: { email: email.toLowerCase() }
  }));
  
  if (head.Item) {
    const chapterId = head.Item.chapterId;
    await cleanupChapterHead(email.toLowerCase());
    await docClient.send(new UpdateCommand({
      TableName: CHAPTERS_TABLE,
      Key: { chapterId },
      UpdateExpression: "REMOVE headEmail, headName SET updatedAt = :now",
      ExpressionAttributeValues: { ":now": new Date().toISOString() }
    }));
  }

  return {
    statusCode: 200,
    headers: corsHeaders,
    body: JSON.stringify({ message: 'Chapter head removed successfully', email })
  };
}

/**
 * ACTION: Full Delete Chapter
 */
async function deleteChapterAction(chapterId) {
  const current = await docClient.send(new GetCommand({ TableName: CHAPTERS_TABLE, Key: { chapterId } }));
  if (!current.Item) throw new Error('Chapter not found');

  console.log(`Deleting chapter: ${chapterId}. Current head from Chapters table: ${current.Item.headEmail}`);

  // 1. Delete from Chapters table
  await docClient.send(new DeleteCommand({
    TableName: CHAPTERS_TABLE,
    Key: { chapterId }
  }));

  // 2. Find and remove head from ChapterHead table (even if out of sync)
  // We scan since there's no GSI on chapterId, but the table is small.
  const scanResult = await docClient.send(new ScanCommand({
    TableName: CHAPTER_HEAD_TABLE,
    FilterExpression: "chapterId = :cid",
    ExpressionAttributeValues: { ":cid": chapterId }
  }));

  if (scanResult.Items && scanResult.Items.length > 0) {
    for (const item of scanResult.Items) {
      console.log(`Found matching ChapterHead record for email: ${item.email}. Cleaning up...`);
      // Use the raw email from the scan to avoid case-sensitivity issues
      await cleanupChapterHead(item.email);
    }
  } else if (current.Item.headEmail) {
    console.log(`No ChapterHead record found by scan, using headEmail from chapter record: ${current.Item.headEmail}`);
    await cleanupChapterHead(current.Item.headEmail);
  }

  return {
    statusCode: 200,
    headers: corsHeaders,
    body: JSON.stringify({ message: 'Chapter deleted successfully', chapterId })
  };
}

/**
 * HELPERS
 */

/**
 * Finds a chapter head by email, case-insensitively.
 * Tries direct lookup first, then fallback to scan if not found (to handle legacy data).
 */
async function findChapterHeadByEmail(email) {
  const normalized = email.trim().toLowerCase();
  
  // 1. Try direct lookup (fast)
  const direct = await docClient.send(new GetCommand({
    TableName: CHAPTER_HEAD_TABLE,
    Key: { email: normalized }
  }));
  
  if (direct.Item) return direct.Item;
  
  // 2. Fallback: Scan for the email case-insensitively (handles legacy mixed-case data)
  // Only 3-100 items expected, so Scan is acceptable for this administrative task.
  const scanResult = await docClient.send(new ScanCommand({
    TableName: CHAPTER_HEAD_TABLE,
    FilterExpression: "contains(email, :e) OR email = :e_raw",
    ExpressionAttributeValues: { 
      ":e": normalized,
      ":e_raw": email // original casing
    }
  }));
  
  // Refine scan results to be exactly equal (case-insensitive)
  if (scanResult.Items && scanResult.Items.length > 0) {
    return scanResult.Items.find(item => item.email.toLowerCase() === normalized);
  }
  
  return null;
}
async function syncChapterHead(email, chapterId, chapterName, headName, now) {
  await docClient.send(new PutCommand({
    TableName: CHAPTER_HEAD_TABLE,
    Item: { email: email.toLowerCase(), chapterId, chapterName, headName: headName || null, linkedAt: now }
  }));

  try {
    await cognitoClient.send(new AdminAddUserToGroupCommand({
      UserPoolId: process.env.USER_POOL_ID,
      Username: email,
      GroupName: COGNITO_GROUP
    }));
  } catch (e) {
    console.warn(`Cognito Add Group Error: ${e.message}`);
  }
}

async function cleanupChapterHead(email) {
  console.log(`Cleaning up ChapterHead for email: ${email}`);
  
  await docClient.send(new DeleteCommand({
    TableName: CHAPTER_HEAD_TABLE,
    Key: { email: email }
  }));

  console.log(`Successfully removed ${email} from ChapterHead table.`);
}

