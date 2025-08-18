// AWS Lambda Node.js 22 - CommonJS version for direct copy-paste
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand, ScanCommand, UpdateCommand, PutCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({});
const dynamoDB = DynamoDBDocumentClient.from(client);

// Helper function to get user email from JWT token (no external dependencies)
const getUserEmailFromToken = (token) => {
  try {
    // JWT token has 3 parts: header.payload.signature
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    // Decode the payload (second part)
    const payload = parts[1];
    // Add padding if needed for base64 decoding
    const paddedPayload = payload + '='.repeat((4 - payload.length % 4) % 4);
    const decodedPayload = Buffer.from(paddedPayload, 'base64url').toString('utf8');
    const parsed = JSON.parse(decodedPayload);
    
    return parsed.email || parsed['cognito:username'] || parsed.username;
  } catch (error) {
    console.error('Error decoding token:', error);
    return null;
  }
};

// Helper function to verify user is chapter head
const verifyChapterHead = async (email) => {
  const params = {
    TableName: 'ChapterHead',
    Key: { email }
  };
  try {
    const result = await dynamoDB.send(new GetCommand(params));
    return result.Item;
  } catch (error) {
    console.error('Error verifying chapter head:', error);
    return null;
  }
};

// Resolve chapterId for a chapter head record that might not yet have it stored
const resolveChapterContext = async (chapterHead) => {
  if (!chapterHead) return chapterHead;
  if (chapterHead.chapterId) return chapterHead; // already resolved

  try {
    // 1. If chapterName present, try to find matching chapter
    if (chapterHead.chapterName) {
      const scanByName = await dynamoDB.send(new ScanCommand({
        TableName: 'Chapters',
        FilterExpression: 'chapterName = :n',
        ExpressionAttributeValues: { ':n': chapterHead.chapterName }
      }));
      if (scanByName.Items && scanByName.Items.length > 0) {
        return { ...chapterHead, chapterId: scanByName.Items[0].chapterId };
      }
    }
    // 2. If chapters array (ids or names) exists, attempt to resolve first entry
    if (Array.isArray(chapterHead.chapters) && chapterHead.chapters.length > 0) {
      // First element might be an id or a name.
      const first = chapterHead.chapters[0];
      // Try direct get by id
      const getTry = await dynamoDB.send(new GetCommand({ TableName: 'Chapters', Key: { chapterId: first } }));
      if (getTry.Item) {
        return { ...chapterHead, chapterId: getTry.Item.chapterId, chapterName: getTry.Item.chapterName };
      }
      // Fallback: treat as name
      const scanByFirstName = await dynamoDB.send(new ScanCommand({
        TableName: 'Chapters',
        FilterExpression: 'chapterName = :n',
        ExpressionAttributeValues: { ':n': first }
      }));
      if (scanByFirstName.Items && scanByFirstName.Items.length > 0) {
        return { ...chapterHead, chapterId: scanByFirstName.Items[0].chapterId, chapterName: scanByFirstName.Items[0].chapterName };
      }
    }
  } catch (err) {
    console.log('Error resolving chapter context:', err.message);
  }
  return chapterHead; // unresolved
};

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Content-Type': 'application/json'
  };
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }
  try {
    console.log('Event received:', JSON.stringify(event, null, 2));
    const authHeader = event.headers?.Authorization || event.headers?.authorization;
    if (!authHeader) {
      return { statusCode: 401, headers, body: JSON.stringify({ error: 'No authorization header' }) };
    }
    const token = authHeader.replace('Bearer ', '');
    const userEmail = getUserEmailFromToken(token);
    console.log('Extracted user email:', userEmail);
    if (!userEmail) {
      return { statusCode: 401, headers, body: JSON.stringify({ error: 'Invalid token' }) };
    }
    console.log('Verifying chapter head for email:', userEmail);
    let chapterHead = await verifyChapterHead(userEmail);
    console.log('Chapter head record:', chapterHead);
    if (!chapterHead) {
      return { statusCode: 403, headers, body: JSON.stringify({ error: 'Access denied. User is not a chapter head.' }) };
    }
    chapterHead = await resolveChapterContext(chapterHead);
    if (!chapterHead.chapterId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Chapter context not linked to chapter head',
          details: 'No chapterId found for this chapter head. Add chapterId to ChapterHead table item or include chapterName that matches a Chapters record.'
        })
      };
    }

    const { httpMethod, pathParameters, queryStringParameters } = event;
    const path = event.resource;
    console.log('Processing request:', httpMethod, path);

    switch (true) {
      case httpMethod === 'GET' && path === '/chapterhead/my-chapters':
        return await getMyChapters(chapterHead, headers);
      case httpMethod === 'GET' && path === '/chapterhead/dashboard':
        return await getDashboardStats(chapterHead, headers);
      case httpMethod === 'GET' && path === '/chapterhead/registrations':
        return await getRegistrations(chapterHead, queryStringParameters, headers);
      case httpMethod === 'GET' && path === '/chapterhead/registrations/{chapterId}':
        return await getChapterRegistrations(chapterHead, pathParameters.chapterId, headers);
      case httpMethod === 'PUT' && path === '/chapterhead/toggle-registration':
        return await toggleRegistration(chapterHead, JSON.parse(event.body), headers);
      case httpMethod === 'PUT' && path === '/chapterhead/registration/{registrationId}':
        return await updateRegistrationStatus(chapterHead, pathParameters.registrationId, JSON.parse(event.body), headers);
      case httpMethod === 'GET' && path === '/chapterhead/activities':
        return await getRecentActivities(chapterHead, queryStringParameters, headers);
      default:
        return { statusCode: 404, headers, body: JSON.stringify({ error: 'Endpoint not found' }) };
    }
  } catch (error) {
    console.error('Lambda error:', error);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Internal server error', details: error.message }) };
  }
};

// Get chapters managed by the current head
const getMyChapters = async (chapterHead, headers) => {
  try {
    const params = { TableName: 'Chapters', Key: { chapterId: chapterHead.chapterId } };
    const result = await dynamoDB.send(new GetCommand(params));
    const chapter = result.Item;
    if (!chapter) {
      return { statusCode: 404, headers, body: JSON.stringify({ error: 'Chapter not found' }) };
    }
    const responseChapter = {
      chapterId: chapter.chapterId,
      chapterName: chapter.chapterName,
      createdAt: chapter.createdAt || null,
      headEmail: chapter.headEmail,
      headName: chapter.headName,
      memberCount: chapter.memberCount || 0,
      status: chapter.status || 'active',
      updatedAt: chapter.updatedAt || null,
      registrationStatus: chapter.registrationOpen ? 'open' : 'closed'
    };
    return { statusCode: 200, headers, body: JSON.stringify({ chapters: [responseChapter] }) };
  } catch (error) {
    console.error('Error getting chapters:', error);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to fetch chapters', details: error.message }) };
  }
};

// Get dashboard statistics (updated to use RegistrationRequests table)
const getDashboardStats = async (chapterHead, headers) => {
  try {
    const chapterResult = await dynamoDB.send(new GetCommand({ TableName: 'Chapters', Key: { chapterId: chapterHead.chapterId } }));
    const chapter = chapterResult.Item || {};

    let pendingCount = 0;
    try {
      const pendingResult = await dynamoDB.send(new ScanCommand({
        TableName: 'RegistrationRequests',
        FilterExpression: 'chapterId = :c AND #status = :s',
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: { ':c': chapterHead.chapterId, ':s': 'pending' }
      }));
      pendingCount = pendingResult.Items ? pendingResult.Items.length : 0;
    } catch (err) {
      console.log('Pending scan issue:', err.message);
    }

    const recentApprovedResult = await dynamoDB.send(new ScanCommand({
      TableName: 'RegistrationRequests',
      FilterExpression: 'chapterId = :c AND #status = :s',
      ExpressionAttributeNames: { '#status': 'status' },
      ExpressionAttributeValues: { ':c': chapterHead.chapterId, ':s': 'approved' }
    }));

    const recentRegistrations = (recentApprovedResult.Items || []).filter(r => !!r.processedAt).length;

    const stats = {
      totalChapters: 1,
      totalMembers: chapter.memberCount || 0,
      pendingRegistrations: pendingCount,
      activeEvents: 0,
      recentRegistrations
    };
    return { statusCode: 200, headers, body: JSON.stringify({ stats }) };
  } catch (error) {
    console.error('Error getting dashboard stats:', error);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to fetch dashboard statistics', details: error.message }) };
  }
};

// Get registration requests for the chapter head's chapters
const getRegistrations = async (chapterHead, queryParams, headers) => {
  try {
    const result = await dynamoDB.send(new ScanCommand({
      TableName: 'RegistrationRequests',
      FilterExpression: 'chapterId = :c',
      ExpressionAttributeValues: { ':c': chapterHead.chapterId }
    }));
    const registrations = result.Items || [];
    return { statusCode: 200, headers, body: JSON.stringify({ registrations }) };
  } catch (error) {
    console.error('Error getting registrations:', error);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to fetch registrations', details: error.message }) };
  }
};

// (Placeholder) getChapterRegistrations reused for specific chapter id (multi-chapter future)
const getChapterRegistrations = async (chapterHead, chapterId, headers) => {
  if (chapterId !== chapterHead.chapterId) {
    return { statusCode: 403, headers, body: JSON.stringify({ error: 'Access denied to requested chapter' }) };
  }
  return getRegistrations(chapterHead, null, headers);
};

const toggleRegistration = async (chapterHead, body, headers) => {
  try {
    const { chapterId, status } = body;
    if (chapterId !== chapterHead.chapterId) {
      return { statusCode: 403, headers, body: JSON.stringify({ error: 'Access denied. Can only modify your own chapter.' }) };
    }
    const result = await dynamoDB.send(new UpdateCommand({
      TableName: 'Chapters',
      Key: { chapterId },
      UpdateExpression: 'SET registrationOpen = :status, updatedAt = :u',
      ExpressionAttributeValues: { ':status': status === 'open', ':u': new Date().toISOString() },
      ReturnValues: 'ALL_NEW'
    }));
    return { statusCode: 200, headers, body: JSON.stringify({ message: `Registration ${status === 'open' ? 'opened' : 'closed'} successfully`, chapter: result.Attributes }) };
  } catch (error) {
    console.error('Error toggling registration:', error);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to update registration status', details: error.message }) };
  }
};

const updateRegistrationStatus = async (chapterHead, registrationId, body, headers) => {
  try {
    const { status, notes } = body;
    const params = {
      TableName: 'RegistrationRequests',
      Key: { registrationId },
      UpdateExpression: 'SET #status = :s, processedAt = :pAt, processedBy = :pBy',
      ExpressionAttributeNames: { '#status': 'status' },
      ExpressionAttributeValues: { ':s': status, ':pAt': new Date().toISOString(), ':pBy': chapterHead.email },
      ReturnValues: 'ALL_NEW'
    };
    if (notes) {
      params.UpdateExpression += ', notes = :n';
      params.ExpressionAttributeValues[':n'] = notes;
    }
    const result = await dynamoDB.send(new UpdateCommand(params));

    // If approved: add chapter to user membership & increment chapter memberCount (idempotent safeguard)
    if (status === 'approved' && result.Attributes && result.Attributes.userId) {
      try {
        // Update user (add chapter name if not present)
        const userUpdate = await dynamoDB.send(new UpdateCommand({
          TableName: 'Unify-Users',
          Key: { userId: result.Attributes.userId },
          UpdateExpression: 'ADD registeredChapters :c SET updatedAt = :u',
          ExpressionAttributeValues: { ':c': new Set([result.Attributes.chapterName]), ':u': new Date().toISOString() },
          ReturnValues: 'NONE'
        })); // eslint-disable-line no-unused-vars
      } catch (e) {
        console.log('User membership update issue (non-fatal):', e.message);
      }
      try {
        await dynamoDB.send(new UpdateCommand({
          TableName: 'Chapters',
          Key: { chapterId: result.Attributes.chapterId },
            // increment only if not already accounted - naive increment; production would need conditional logic or separate membership table
          UpdateExpression: 'SET memberCount = if_not_exists(memberCount, :zero) + :one, updatedAt = :u',
          ExpressionAttributeValues: { ':one': 1, ':zero': 0, ':u': new Date().toISOString() },
          ReturnValues: 'NONE'
        }));
      } catch (e) {
        console.log('Chapter member count increment issue (non-fatal):', e.message);
      }
    }

    return { statusCode: 200, headers, body: JSON.stringify({ message: `Registration ${status} successfully`, registrationId, updatedRegistration: result.Attributes }) };
  } catch (error) {
    console.error('Error updating registration status:', error);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to update registration status', details: error.message }) };
  }
};

const getRecentActivities = async (chapterHead, queryParams, headers) => {
  try {
    const limit = queryParams?.limit ? parseInt(queryParams.limit) : 10;
    const result = await dynamoDB.send(new ScanCommand({
      TableName: 'Activities',
      FilterExpression: 'chapterId = :c',
      ExpressionAttributeValues: { ':c': chapterHead.chapterId }
    }));
    const activities = (result.Items || [])
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit)
      .map(a => ({
        id: a.activityId,
        type: a.type,
        message: a.message,
        timestamp: a.timestamp,
        chapterId: a.chapterId,
        userId: a.userId
      }));
    return { statusCode: 200, headers, body: JSON.stringify({ activities }) };
  } catch (error) {
    console.error('Error getting activities:', error);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to fetch activities', details: error.message }) };
  }
};
