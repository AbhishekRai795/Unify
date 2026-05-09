// createEvent-payment.mjs
// Lambda function to create a new event for a chapter
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, GetCommand } from "@aws-sdk/lib-dynamodb";
import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";
import crypto from "crypto";

const dynamoClient = new DynamoDBClient({ region: "ap-south-1" });
const docClient = DynamoDBDocumentClient.from(dynamoClient);
const secretsClient = new SecretsManagerClient({ region: "ap-south-1" });

const EVENTS_TABLE = process.env.EVENTS_TABLE || "ChapterEvents";
const CHAPTERS_TABLE = process.env.CHAPTERS_TABLE || "Chapters";
const VECTORS_TABLE = process.env.VECTORS_TABLE || "UnifyVectors";

async function getGeminiApiKey() {
  const secretName = process.env.GEMINI_SECRET_NAME || "unify/gemini/credentials";
  const response = await secretsClient.send(new GetSecretValueCommand({ SecretId: secretName }));
  if (response.SecretString) {
    return JSON.parse(response.SecretString).api_key;
  }
  return null;
}

async function embedText(apiKey, text) {
  if (!apiKey || !text) return null;
  const model = "models/gemini-embedding-001";
  const url = `https://generativelanguage.googleapis.com/v1beta/${model}:embedContent?key=${apiKey}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      content: { parts: [{ text }] }
    })
  });
  const data = await response.json();
  return data.embedding?.values || null;
}

function buildEventRecommendationText(eventItem) {
  const tags = Array.isArray(eventItem.tags) ? eventItem.tags.join(", ") : "";
  return [
    `Event: ${eventItem.title}`,
    `Chapter: ${eventItem.chapterName}`,
    `Type: ${eventItem.eventType}`,
    `Description: ${eventItem.description}`,
    tags ? `Tags: ${tags}` : "",
    `Location: ${eventItem.location || "Not specified"}`,
    `Paid: ${eventItem.isPaid ? "yes" : "no"}`
  ].filter(Boolean).join("\n");
}

async function storeEventSummaryEmbedding(eventItem) {
  try {
    const apiKey = await getGeminiApiKey();
    if (!apiKey) return;

    const text = buildEventRecommendationText(eventItem);
    const vector = await embedText(apiKey, text);
    if (!vector) return;

    await docClient.send(new PutCommand({
      TableName: VECTORS_TABLE,
      Item: {
        parentId: eventItem.eventId,
        chunkId: "summary",
        section: "summary",
        text,
        vector,
        type: "event_summary",
        chapterId: eventItem.chapterId,
        updatedAt: new Date().toISOString()
      }
    }));
    console.log("Stored event summary vector:", eventItem.eventId);
  } catch (err) {
    console.warn("Failed to store event summary vector:", err.message);
  }
}

const corsHeaders = {
  "Access-Control-Allow-Origin": process.env.ALLOWED_ORIGIN || "*",
  "Access-Control-Allow-Headers": "Content-Type,Authorization",
  "Access-Control-Allow-Methods": "POST,OPTIONS"
};

export const handler = async (event) => {
  console.log("Create event received:", JSON.stringify(event, null, 2));

  // CORS handled by API Gateway, but we can keep headers for safety
  try {
    let body;
    try {
      body = JSON.parse(event.body || "{}");
    } catch (e) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: "Invalid JSON in request body" })
      };
    }

    const { 
      title, 
      description, 
      chapterId, 
      eventType, 
      startDateTime, 
      endDateTime, 
      location, 
      isOnline, 
      meetingLink, 
      maxAttendees, 
      registrationRequired, 
      registrationDeadline,
      imageUrl,
      tags,
      isPaid,
      registrationFee
    } = body;

    // Basic validation
    if (!title || !description || !chapterId || !eventType || !startDateTime || !endDateTime) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: "Missing required fields" })
      };
    }

    // Verify chapter exists
    const chapterResponse = await docClient.send(new GetCommand({
      TableName: CHAPTERS_TABLE,
      Key: { chapterId }
    }));

    if (!chapterResponse.Item) {
      return {
        statusCode: 404,
        headers: corsHeaders,
        body: JSON.stringify({ error: "Chapter not found" })
      };
    }

    const chapterName = chapterResponse.Item.chapterName || "Unknown Chapter";

    // Generate eventId
    const eventId = `EVENT#${Date.now()}#${crypto.randomUUID().split('-')[0]}`;

    const newEvent = {
      chapterId,
      eventId,
      title,
      description,
      chapterName,
      eventType,
      startDateTime,
      endDateTime,
      location: isOnline ? "Online" : location,
      isOnline,
      meetingLink: isOnline ? meetingLink : null,
      maxAttendees: (maxAttendees !== undefined && maxAttendees !== null && maxAttendees !== "") ? parseInt(maxAttendees) : null,
      currentAttendees: 0,
      registrationRequired: !!registrationRequired,
      registrationDeadline: registrationDeadline || null,
      imageUrl: imageUrl || null,
      tags: Array.isArray(tags) ? tags : (tags ? tags.split(',').map(t => t.trim()) : []),
      isLive: true,
      isPaid: !!isPaid,
      registrationFee: isPaid ? parseFloat(registrationFee || 0) || 0 : 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await docClient.send(new PutCommand({
      TableName: EVENTS_TABLE,
      Item: newEvent
    }));

    await storeEventSummaryEmbedding(newEvent);
    
    // Create activity record (Non-blocking)
    try {
      const activityId = `activity-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const activity = {
        activityId,
        chapterId,
        type: 'event_created',
        message: `A new event "${title}" was created by chapter head`,
        timestamp: new Date().toISOString(),
        metadata: { 
          eventId,
          title,
          isPaid,
          registrationFee
        }
      };
      
      console.log("Logging activity to table: Activities");
      await docClient.send(new PutCommand({
        TableName: "Activities",
        Item: activity
      }));
      console.log("   Activity logged successfully");
    } catch (activityError) {
      console.warn("⚠️ Warning: Failed to log activity, but continuing:", activityError.message);
      // Don't throw error here to keep event creation successful
    }

    console.log("   Event created and activity logged successfully:", eventId);

    return {
      statusCode: 201,
      headers: corsHeaders,
      body: JSON.stringify({
        success: true,
        message: "Event created successfully",
        event: newEvent
      })
    };
  } catch (error) {
    console.error("  Error in createEvent:", error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ 
        error: "Internal server error",
        details: error.message 
      })
    };
  }
};
