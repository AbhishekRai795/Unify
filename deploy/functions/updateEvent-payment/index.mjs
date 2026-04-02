// updateEvent-payment.mjs
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, UpdateCommand, GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";

const dynamoClient = new DynamoDBClient({ region: "ap-south-1" });
const docClient = DynamoDBDocumentClient.from(dynamoClient);

const EVENTS_TABLE = process.env.EVENTS_TABLE || "ChapterEvents";

const corsHeaders = {
  "Access-Control-Allow-Origin": process.env.ALLOWED_ORIGIN || "*",
  "Access-Control-Allow-Headers": "Content-Type,Authorization",
  "Access-Control-Allow-Methods": "PUT,OPTIONS"
};

export const handler = async (event) => {
  console.log("Update event received:", JSON.stringify(event, null, 2));

  try {
    const { chapterId, eventId } = event.pathParameters;
    const body = JSON.parse(event.body || "{}");

    // Check if event exists
    const existing = await docClient.send(new GetCommand({
      TableName: EVENTS_TABLE,
      Key: { chapterId, eventId }
    }));

    if (!existing.Item) {
      return {
        statusCode: 404,
        headers: corsHeaders,
        body: JSON.stringify({ error: "Event not found" })
      };
    }

    const { 
      title, 
      description, 
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
      registrationFee,
      isLive,
      announcement // New field for single announcement update
    } = body;

    const updateExpression = [];
    const expressionAttributeValues = {
      ":u": new Date().toISOString()
    };
    const expressionAttributeNames = {
      "#updatedAt": "updatedAt"
    };

    if (title !== undefined) { updateExpression.push("title = :title"); expressionAttributeValues[":title"] = title; }
    if (description !== undefined) { updateExpression.push("description = :desc"); expressionAttributeValues[":desc"] = description; }
    if (eventType !== undefined) { updateExpression.push("eventType = :type"); expressionAttributeValues[":type"] = eventType; }
    if (startDateTime !== undefined) { updateExpression.push("startDateTime = :start"); expressionAttributeValues[":start"] = startDateTime; }
    if (endDateTime !== undefined) { updateExpression.push("endDateTime = :end"); expressionAttributeValues[":end"] = endDateTime; }
    if (location !== undefined) { updateExpression.push("#loc = :loc"); expressionAttributeValues[":loc"] = location; expressionAttributeNames["#loc"] = "location"; }
    if (isOnline !== undefined) { updateExpression.push("isOnline = :online"); expressionAttributeValues[":online"] = isOnline; }
    if (meetingLink !== undefined) { updateExpression.push("meetingLink = :link"); expressionAttributeValues[":link"] = meetingLink; }
    if (maxAttendees !== undefined && maxAttendees !== null && maxAttendees !== "") { 
      updateExpression.push("maxAttendees = :max"); 
      expressionAttributeValues[":max"] = parseInt(maxAttendees); 
    }
    if (registrationRequired !== undefined) { updateExpression.push("registrationRequired = :req"); expressionAttributeValues[":req"] = !!registrationRequired; }
    if (registrationDeadline !== undefined) { updateExpression.push("registrationDeadline = :deadline"); expressionAttributeValues[":deadline"] = registrationDeadline; }
    if (imageUrl !== undefined) { updateExpression.push("imageUrl = :img"); expressionAttributeValues[":img"] = imageUrl; }
    if (tags !== undefined) { updateExpression.push("tags = :tags"); expressionAttributeValues[":tags"] = Array.isArray(tags) ? tags : []; }
    if (isPaid !== undefined) { updateExpression.push("isPaid = :paid"); expressionAttributeValues[":paid"] = !!isPaid; }
    if (registrationFee !== undefined) { 
      updateExpression.push("registrationFee = :fee"); 
      expressionAttributeValues[":fee"] = parseFloat(registrationFee || 0) || 0; 
    }
    if (isLive !== undefined) { updateExpression.push("isLive = :live"); expressionAttributeValues[":live"] = !!isLive; }

    // Handle single announcement update (Append to array)
    if (announcement !== undefined && announcement !== null && announcement.trim() !== "") {
      const newAnnouncement = {
        message: announcement.trim(),
        timestamp: new Date().toISOString()
      };
      updateExpression.push("announcements = list_append(if_not_exists(announcements, :empty_list), :new_announcement)");
      expressionAttributeValues[":new_announcement"] = [newAnnouncement];
      expressionAttributeValues[":empty_list"] = [];
    }

    if (updateExpression.length === 0) {
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({ message: "No fields to update" })
      };
    }

    await docClient.send(new UpdateCommand({
      TableName: EVENTS_TABLE,
      Key: { chapterId, eventId },
      UpdateExpression: `SET ${updateExpression.join(", ")}, #updatedAt = :u`,
      ExpressionAttributeValues: expressionAttributeValues,
      ExpressionAttributeNames: expressionAttributeNames
    }));
    
    // Create activity record (Non-blocking)
    try {
      const activityId = `activity-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      console.log("Logging update activity to table: Activities");
      await docClient.send(new PutCommand({
        TableName: "Activities",
        Item: {
          activityId,
          chapterId,
          type: 'event_updated',
          message: `Event "${title || existing.Item.title}" was updated by chapter head`,
          timestamp: new Date().toISOString(),
          metadata: { eventId, updatedFields: updateExpression }
        }
      }));
      console.log("✅ Update activity logged successfully");
    } catch (activityError) {
      console.warn("⚠️ Warning: Failed to log update activity, but continuing:", activityError.message);
      // Don't throw error here to keep event update successful
    }

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ success: true, message: "Event updated successfully" })
    };
  } catch (error) {
    console.error("Error updating event:", error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: "Internal server error", details: error.message })
    };
  }
};
