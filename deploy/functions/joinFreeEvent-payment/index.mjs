// joinFreeEvent-payment.mjs
// Lambda function to handle student joining a free event
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, GetCommand, UpdateCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";

const dynamoClient = new DynamoDBClient({ region: "ap-south-1" });
const docClient = DynamoDBDocumentClient.from(dynamoClient);

const EVENT_PAYMENTS_TABLE = process.env.EVENT_PAYMENTS_TABLE || "EventPayments";
const EVENT_REG_TABLE = process.env.EVENT_REG_TABLE || "EventRegistrationRequests";
const EVENTS_TABLE = process.env.EVENTS_TABLE || "ChapterEvents";
const USERS_TABLE = process.env.USERS_TABLE || "Unify-Users";

const corsHeaders = {
  "Access-Control-Allow-Origin": process.env.ALLOWED_ORIGIN || "*",
  "Access-Control-Allow-Headers": "Content-Type,Authorization",
  "Access-Control-Allow-Methods": "POST,OPTIONS"
};

export const handler = async (event) => {
  console.log("Join free event received:", JSON.stringify(event, null, 2));

  try {
    const body = JSON.parse(event.body || "{}");
    const { eventId, studentName, studentEmail } = body;
    const userId = event.requestContext?.authorizer?.jwt?.claims?.sub || studentEmail;

    if (!eventId || !studentEmail) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: "Missing required fields" })
      };
    }

    // Verify event exists and is free
    const eventResponse = await docClient.send(new GetCommand({
      TableName: EVENTS_TABLE,
      Key: { chapterId: body.chapterId, eventId } // Assuming chapterId is passed for Hash Key
    }));

    // If chapterId not passed, we might need to query by eventId GSI
    let eventItem = eventResponse.Item;
    if (!eventItem) {
      // Try GSI
      const { QueryCommand } = await import("@aws-sdk/lib-dynamodb");
      const gsiResponse = await docClient.send(new QueryCommand({
        TableName: EVENTS_TABLE,
        IndexName: "EventIdIndex",
        KeyConditionExpression: "eventId = :eid",
        ExpressionAttributeValues: { ":eid": eventId }
      }));
      eventItem = gsiResponse.Items?.[0];
    }

    if (!eventItem) {
      return {
        statusCode: 404,
        headers: corsHeaders,
        body: JSON.stringify({ error: "Event not found" })
      };
    }

    if (eventItem.isPaid) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: "This is a paid event. Please use the payment flow." })
      };
    }

    // Check if already registered
    const regCheck = await docClient.send(new GetCommand({
      TableName: EVENT_PAYMENTS_TABLE,
      Key: { eventId, userId }
    }));

    if (regCheck.Item) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: "You are already registered for this event" })
      };
    }

    // Validate attendee count against maxAttendees
    const currentAttendees = eventItem.currentAttendees || 0;
    const maxAttendees = eventItem.maxAttendees || 999999; // No limit if not set
    
    console.log(`Event capacity check: ${currentAttendees}/${maxAttendees} attendees`);
    if (currentAttendees >= maxAttendees) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ 
          error: "Event is full. Maximum capacity reached.",
          currentAttendees,
          maxAttendees
        })
      };
    }

    // Register user
    const registration = {
      eventId,
      userId,
      studentName: studentName || "Unknown",
      studentEmail,
      chapterId: eventItem.chapterId,
      chapterName: eventItem.chapterName,
      title: eventItem.title,
      paymentStatus: "NA",
      joinedAt: new Date().toISOString(),
      createdAt: new Date().toISOString()
    };

    await docClient.send(new PutCommand({
      TableName: EVENT_PAYMENTS_TABLE,
      Item: registration
    }));

    // Create Registration Request in the new independent table
    const registrationId = `REG-FREE-EVT-${eventId}-${userId.substring(0,8)}-${Date.now()}`;
    const now = new Date().toISOString();
    await docClient.send(new PutCommand({
      TableName: EVENT_REG_TABLE,
      Item: {
        registrationId,
        chapterId: eventItem.chapterId,
        chapterName: eventItem.chapterName,
        userId,
        studentName: studentName || "Unknown",
        studentEmail,
        eventId,
        eventTitle: eventItem.title,
        status: "approved", // Free events are auto-approved in this flow
        appliedAt: now,
        processedAt: now,
        processedBy: "SYSTEM_FREE_JOIN",
        notes: "Free Event Registration"
      }
    }));

    // Update event attendee count with retry logic
    let attendeeUpdateSuccess = false;
    let retryCount = 0;
    const MAX_RETRIES = 3;
    
    while (!attendeeUpdateSuccess && retryCount < MAX_RETRIES) {
      try {
        await docClient.send(new UpdateCommand({
          TableName: EVENTS_TABLE,
          Key: { chapterId: eventItem.chapterId, eventId: eventItem.eventId },
          UpdateExpression: "SET currentAttendees = if_not_exists(currentAttendees, :zero) + :one",
          ConditionExpression: "attribute_not_exists(currentAttendees) OR currentAttendees < :maxVal",
          ExpressionAttributeValues: { 
            ":zero": 0, 
            ":one": 1,
            ":maxVal": eventItem.maxAttendees || 999999
          }
        }));
        attendeeUpdateSuccess = true;
        console.log("   Attendee count incremented successfully");
      } catch (attendeeError) {
        retryCount++;
        if (attendeeError.name === "ConditionalCheckFailedException") {
          console.error("  Event capacity exceeded during update. Rolling back registration.");
          // Rollback - remove the registration we just created
          await docClient.send(new DeleteCommand({
            TableName: EVENT_PAYMENTS_TABLE,
            Key: { eventId, userId }
          }));
          return {
            statusCode: 400,
            headers: corsHeaders,
            body: JSON.stringify({ error: "Event is now full. Registration cancelled." })
          };
        }
        if (retryCount >= MAX_RETRIES) {
          console.error(`  Failed to update attendee count after ${MAX_RETRIES} retries:`, attendeeError.message);
          // For now, succeed the registration even if count fails, but log critical issue
          console.error("⚠️ CRITICAL: Registration successful but attendee count update failed!");
          break;
        }
        console.log(`⏳ Retry ${retryCount}/${MAX_RETRIES} for attendee count update`);
        await new Promise(resolve => setTimeout(resolve, 100 * retryCount)); // Exponential backoff
      }
    }
    
    // Create activity record
    try {
      const activityId = `activity-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const activity = {
        activityId,
        chapterId: eventItem.chapterId,
        type: 'event_joined',
        message: `${studentName || studentEmail} joined event "${eventItem.title}"`,
        timestamp: new Date().toISOString(),
        userId,
        metadata: { 
          eventId,
          title: eventItem.title,
          paid: false
        }
      };
      
      await docClient.send(new PutCommand({
        TableName: "Activities",
        Item: activity
      }));
    } catch (activityError) {
      console.warn("⚠️ Warning: Failed to log activity:", activityError.message);
    }

    // Update student's attendedEvents in Unify-Users table Using the exact Chapter Registration workflow
    try {
      console.log(`Updating Unify-Users participated events for: ${userId}`);
      
      const userResponse = await docClient.send(new GetCommand({
        TableName: USERS_TABLE,
        Key: { userId }
      }));
      
      const user = userResponse.Item;
      const updatedAttendedEvents = user?.attendedEvents ? Array.from(user.attendedEvents) : [];
      
      if (!updatedAttendedEvents.includes(eventId)) {
        updatedAttendedEvents.push(eventId);
      }

      await docClient.send(new UpdateCommand({
        TableName: USERS_TABLE,
        Key: { userId },
        UpdateExpression: "SET attendedEvents = :events, updatedAt = :timestamp",
        ExpressionAttributeValues: {
          ":events": updatedAttendedEvents,
          ":timestamp": new Date().toISOString()
        }
      }));
      console.log("   User attendedEvents updated successfully via SET array update");
    } catch (userUpdateError) {
      console.error("⚠️ Warning: Failed to update user attendedEvents:", userUpdateError);
      // Non-blocking
    }

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        success: true,
        message: "Successfully joined event",
        registration
      })
    };
  } catch (error) {
    console.error("  Error joining free event:", error);
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
