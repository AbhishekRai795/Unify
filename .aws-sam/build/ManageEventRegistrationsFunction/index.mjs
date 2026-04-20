// manage-event-registrations/index.mjs
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, QueryCommand, UpdateCommand, PutCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({});
const dynamoDB = DynamoDBDocumentClient.from(client);

const EVENT_REG_TABLE = process.env.EVENT_REG_TABLE || 'EventRegistrationRequests';
const USERS_TABLE = process.env.USERS_TABLE || 'Unify-Users';
const CHAPTERS_TABLE = process.env.CHAPTERS_TABLE || 'Chapters';
const EVENTS_TABLE = process.env.EVENTS_TABLE || 'ChapterEvents';
const ACTIVITIES_TABLE = process.env.ACTIVITIES_TABLE || 'Activities';
const CHAPTER_HEAD_TABLE = process.env.CHAPTER_HEAD_TABLE || 'ChapterHead';

// Helper: Extract user email from JWT token
const getUserEmailFromToken = (token) => {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = parts[1];
    const paddedPayload = payload + '='.repeat((4 - payload.length % 4) % 4);
    const decodedPayload = Buffer.from(paddedPayload, 'base64url').toString('utf8');
    const parsed = JSON.parse(decodedPayload);
    return parsed.email || parsed['cognito:username'] || parsed.username;
  } catch (error) {
    console.error('Error decoding token:', error);
    return null;
  }
};

// Helper: Verify user is chapter head and resolve context
const getChapterHeadContext = async (email) => {
  try {
    const result = await dynamoDB.send(new GetCommand({
      TableName: CHAPTER_HEAD_TABLE,
      Key: { email }
    }));
    const head = result.Item;
    if (!head) return null;

    // Resolve chapterId if missing but chapterName exists
    if (!head.chapterId && head.chapterName) {
        const scanRes = await dynamoDB.send(new ScanCommand({
            TableName: CHAPTERS_TABLE,
            FilterExpression: 'chapterName = :n',
            ExpressionAttributeValues: { ':n': head.chapterName }
        }));
        if (scanRes.Items?.length > 0) {
            head.chapterId = scanRes.Items[0].chapterId;
        }
    }
    return head;
  } catch (error) {
    console.error('Error verifying chapter head:', error);
    throw error;
  }
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  'Access-Control-Allow-Methods': 'GET,PUT,OPTIONS'
};

export const handler = async (event) => {
  console.log('Event received:', JSON.stringify(event, null, 2));

  // Handle CORS
  if (event.requestContext?.http?.method === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders, body: '' };
  }

  try {
    const authHeader = event.headers?.Authorization || event.headers?.authorization;
    if (!authHeader) return { statusCode: 401, headers: corsHeaders, body: JSON.stringify({ error: 'Unauthorized' }) };

    const token = authHeader.replace('Bearer ', '');
    const email = getUserEmailFromToken(token);
    if (!email) return { statusCode: 401, headers: corsHeaders, body: JSON.stringify({ error: 'Invalid token' }) };

    const chapterHead = await getChapterHeadContext(email);
    if (!chapterHead || !chapterHead.chapterId) {
      return { statusCode: 403, headers: corsHeaders, body: JSON.stringify({ error: 'Access denied. You are not a registered chapter head.' }) };
    }

    const httpMethod = event.requestContext?.http?.method;
    const path = event.requestContext?.http?.path;
    const pathParameters = event.pathParameters || {};

    // 1. GET /api/chapterhead/event-registrations
    if (httpMethod === 'GET' && path.includes('/event-registrations')) {
      const result = await dynamoDB.send(new QueryCommand({
        TableName: EVENT_REG_TABLE,
        IndexName: 'ChapterIdIndex',
        KeyConditionExpression: 'chapterId = :cid',
        ExpressionAttributeValues: { ':cid': chapterHead.chapterId }
      }));

      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({ registrations: result.Items || [] })
      };
    }

    // 2. PUT /api/chapterhead/event-registration/{registrationId}
    if (httpMethod === 'PUT' && path.includes('/event-registration/')) {
      const { registrationId } = pathParameters;
      if (!registrationId) return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'Missing registrationId' }) };

      const body = JSON.parse(event.body || '{}');
      const { status, notes } = body;

      if (!['approved', 'rejected', 'removed'].includes(status)) {
        return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'Invalid status' }) };
      }

      // Fetch existing registration to verify ownership and get details
      const regRes = await dynamoDB.send(new GetCommand({
        TableName: EVENT_REG_TABLE,
        Key: { registrationId }
      }));
      const registration = regRes.Item;

      if (!registration) return { statusCode: 404, headers: corsHeaders, body: JSON.stringify({ error: 'Registration not found' }) };
      if (registration.chapterId !== chapterHead.chapterId) {
        return { statusCode: 403, headers: corsHeaders, body: JSON.stringify({ error: 'Unauthorized to manage this registration' }) };
      }

      const now = new Date().toISOString();

      // Update status
      await dynamoDB.send(new UpdateCommand({
        TableName: EVENT_REG_TABLE,
        Key: { registrationId },
        UpdateExpression: 'SET #s = :s, processedAt = :p, processedBy = :pb, notes = :n, updatedAt = :u',
        ExpressionAttributeNames: { '#s': 'status' },
        ExpressionAttributeValues: {
          ':s': status,
          ':p': now,
          ':pb': email,
          ':n': notes || '',
          ':u': now
        }
      }));

      // If status changed to approved, we might need to sync other tables
      // (Though paid ones are currently auto-approved, this handles free ones or manual overrides)
      if (status === 'approved' && registration.status !== 'approved') {
          // Update attendedEvents in Unify-Users
          try {
              const userRes = await dynamoDB.send(new GetCommand({
                  TableName: USERS_TABLE,
                  Key: { userId: registration.userId }
              }));
              const user = userRes.Item;
              if (user) {
                  let attended = user.attendedEvents || [];
                  if (attended instanceof Set) attended = Array.from(attended);
                  if (!attended.includes(registration.eventId)) {
                      attended.push(registration.eventId);
                      await dynamoDB.send(new UpdateCommand({
                          TableName: USERS_TABLE,
                          Key: { userId: registration.userId },
                          UpdateExpression: 'SET attendedEvents = :events, updatedAt = :u',
                          ExpressionAttributeValues: { ':events': attended, ':u': now }
                      }));
                  }
              }
          } catch (e) { console.error('Error syncing user attendedEvents:', e.message); }

          // Update attendee count in ChapterEvents
          try {
              await dynamoDB.send(new UpdateCommand({
                  TableName: EVENTS_TABLE,
                  Key: { chapterId: registration.chapterId, eventId: registration.eventId },
                  UpdateExpression: 'SET currentAttendees = if_not_exists(currentAttendees, :zero) + :one, updatedAt = :u',
                  ExpressionAttributeValues: { ':zero': 0, ':one': 1, ':u': now }
              }));
          } catch (e) { console.error('Error incrementing attendee count:', e.message); }
      }

      // Log activity
      try {
          const activityId = `activity-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          await dynamoDB.send(new PutCommand({
              TableName: ACTIVITIES_TABLE,
              Item: {
                  activityId,
                  chapterId: chapterHead.chapterId,
                  type: status === 'approved' ? 'event_approved' : status === 'rejected' ? 'event_rejected' : 'event_student_removed',
                  message: `${status === 'approved' ? 'Approved' : status === 'rejected' ? 'Rejected' : 'Removed'} ${registration.studentName} for event "${registration.eventTitle || 'Event'}"`,
                  timestamp: now,
                  userId: registration.userId,
                  metadata: { registrationId, eventId: registration.eventId, processedBy: email }
              }
          }));
      } catch (e) { console.error('Error logging activity:', e.message); }

      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({ message: `Registration ${status} successfully` })
      };
    }

    return { statusCode: 404, headers: corsHeaders, body: JSON.stringify({ error: 'Endpoint not found' }) };

  } catch (error) {
    console.error('Error in manage-event-registrations:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Internal server error', details: error.message })
    };
  }
};
