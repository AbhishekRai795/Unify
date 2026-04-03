// createEvent-payment.mjs
// Lambda function to create a new event for a chapter
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, GetCommand } from "@aws-sdk/lib-dynamodb";
import crypto from "crypto";

const dynamoClient = new DynamoDBClient({ region: "ap-south-1" });
const docClient = DynamoDBDocumentClient.from(dynamoClient);

const EVENTS_TABLE = process.env.EVENTS_TABLE || "ChapterEvents";
const CHAPTERS_TABLE = process.env.CHAPTERS_TABLE || "Chapters";

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
      console.log("✅ Activity logged successfully");
    } catch (activityError) {
      console.warn("⚠️ Warning: Failed to log activity, but continuing:", activityError.message);
      // Don't throw error here to keep event creation successful
    }

    console.log("✅ Event created and activity logged successfully:", eventId);

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
    console.error("❌ Error in createEvent:", error);
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
