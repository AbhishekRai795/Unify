// eventProfile-payment/index.mjs
// Lambda function to handle event profile retrieval, updates, and image uploads
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, PutCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const dbClient = new DynamoDBClient({ region: "ap-south-1" });
const ddb = DynamoDBDocumentClient.from(dbClient);
const s3Client = new S3Client({ region: "ap-south-1" });

const EVENTS_TABLE = "ChapterEvents";
const EVENT_PROFILES_TABLE = "EventProfiles";
const CHAPTER_HEAD_TABLE = "ChapterHead";
const IMAGES_BUCKET = process.env.IMAGES_BUCKET || ""; // Will be passed via template

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type,Authorization",
  "Access-Control-Allow-Methods": "GET,PUT,POST,OPTIONS",
  "Content-Type": "application/json"
};

const getUserEmailFromToken = (token) => {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = parts[1];
    const padded = payload + '='.repeat((4 - payload.length % 4) % 4);
    const raw = Buffer.from(padded, 'base64url').toString('utf8');
    const data = JSON.parse(raw);
    return data.email || data['cognito:username'] || data.username || null;
  } catch (err) {
    console.error('Token parse error:', err);
    return null;
  }
};

const getChapterHeadRecord = async (email) => {
  if (!email) return null;
  try {
    const resp = await ddb.send(new GetCommand({
      TableName: CHAPTER_HEAD_TABLE,
      Key: { email }
    }));
    return resp.Item || null;
  } catch (err) {
    console.error('Failed to fetch chapter head', err);
    return null;
  }
};

const getEventById = async (eventId) => {
  if (!eventId) return null;
  const resp = await ddb.send(new QueryCommand({
    TableName: EVENTS_TABLE,
    IndexName: "EventIdIndex",
    KeyConditionExpression: "eventId = :eid",
    ExpressionAttributeValues: { ":eid": eventId }
  }));
  return resp.Items?.[0] || null;
};

const getEventProfile = async (eventId) => {
  const resp = await ddb.send(new GetCommand({
    TableName: EVENT_PROFILES_TABLE,
    Key: { eventId }
  }));
  return resp.Item || null;
};

export const handler = async (event) => {
  console.log('eventProfile lambda event:', JSON.stringify(event, null, 2));

  const method = event.httpMethod || event.requestContext?.http?.method;
  const rawPath = event.rawPath || event.path || "";
  const routeKey = event.routeKey || event.resource || "";

  if (method === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders, body: '' };
  }

  const eventId = event.pathParameters?.eventId;
  if (!eventId) {
    return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'eventId path parameter required' }) };
  }

  try {
    const eventData = await getEventById(eventId);
    if (!eventData) {
      return { statusCode: 404, headers: corsHeaders, body: JSON.stringify({ error: 'Event not found' }) };
    }

    // --------------------------------------------------------------------------
    // ROUTE 1: GET Profile (Public)
    // --------------------------------------------------------------------------
    if (method === 'GET' && (rawPath.includes('/profile') || routeKey.includes('/profile'))) {
      const profile = await getEventProfile(eventId);
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          eventId,
          profile: profile || null,
          event: {
            ...eventData,
            title: eventData.title || "",
            chapterName: eventData.chapterName || "",
            eventType: eventData.eventType || ""
          }
        })
      };
    }

    // --------------------------------------------------------------------------
    // AUTH CHECK for Protected Routes
    // --------------------------------------------------------------------------
    const authHeader = event.headers?.Authorization || event.headers?.authorization;
    if (!authHeader) {
      console.warn('Blocked: Missing Authorization header');
      return { statusCode: 401, headers: corsHeaders, body: JSON.stringify({ error: 'Missing Authorization header' }) };
    }
    const token = authHeader.replace(/^Bearer\s+/i, '');
    const email = getUserEmailFromToken(token);
    if (!email) {
      console.warn('Blocked: Invalid token');
      return { statusCode: 401, headers: corsHeaders, body: JSON.stringify({ error: 'Invalid token' }) };
    }

    const chapterHead = await getChapterHeadRecord(email);
    if (!chapterHead || !chapterHead.chapterId || chapterHead.chapterId !== eventData.chapterId) {
      console.warn(`Blocked: Unauthorized for event ${eventId}. Head email: ${email}`);
      return { statusCode: 403, headers: corsHeaders, body: JSON.stringify({ error: 'Forbidden: Unauthorized for this event' }) };
    }

    // --------------------------------------------------------------------------
    // ROUTE 2: POST Upload URL (Protected)
    // --------------------------------------------------------------------------
    if (method === 'POST' && (rawPath.includes('upload-url') || routeKey.includes('upload-url'))) {
      let body;
      try {
        body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
      } catch (err) {
        return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'Invalid JSON body' }) };
      }

      if (!body?.fileName || !body?.contentType) {
        return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'fileName and contentType required' }) };
      }

      const fileExtension = body.fileName.split('.').pop() || 'png';
      const uniqueName = `event-profile-${eventId}-${Date.now()}.${fileExtension}`;
      const s3Key = `events/${eventId}/${uniqueName}`;

      const command = new PutObjectCommand({
        Bucket: IMAGES_BUCKET,
        Key: s3Key,
        ContentType: body.contentType
      });

      console.log(`Generating signed URL for bucket: ${IMAGES_BUCKET}, key: ${s3Key}`);
      const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 });
      const publicUrl = `https://${IMAGES_BUCKET}.s3.ap-south-1.amazonaws.com/${s3Key}`;

      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({ uploadUrl, publicUrl, fileName: uniqueName })
      };
    }

    // --------------------------------------------------------------------------
    // ROUTE 3: PUT Update Profile (Protected)
    // --------------------------------------------------------------------------
    if (method === 'PUT' && (rawPath.includes('/profile') || routeKey.includes('/profile'))) {
      let payload;
      try {
        payload = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
      } catch (err) {
        return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'Invalid JSON body' }) };
      }

      const now = new Date().toISOString();
      const profilePayload = {
        eventId,
        about: payload.about || '',
        mission: payload.mission || '',
        vision: payload.vision || '',
        posterImageUrl: payload.posterImageUrl || '',
        galleryImageUrls: Array.isArray(payload.galleryImageUrls) ? payload.galleryImageUrls : [],
        highlights: Array.isArray(payload.highlights) ? payload.highlights : [],
        achievements: Array.isArray(payload.achievements) ? payload.achievements : [],
        socialLinks: payload.socialLinks || {},
        contact: payload.contact || '',
        eventDetails: payload.eventDetails || '',
        updatedBy: email,
        updatedAt: now
      };

      await ddb.send(new PutCommand({
        TableName: EVENT_PROFILES_TABLE,
        Item: profilePayload
      }));

      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({ message: 'Event profile saved', profile: profilePayload })
      };
    }

    console.warn(`No matching route found for: ${method} ${rawPath} / ${routeKey}`);
    return {
      statusCode: 404,
      headers: corsHeaders,
      body: JSON.stringify({
        error: 'Endpoint not found',
        debug: { method, routeKey, rawPath }
      })
    };
  } catch (error) {
    console.error('Error eventProfile lambda:', error);
    return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: 'Internal server error', details: error.message }) };
  }
};