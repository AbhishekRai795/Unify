// updateEvent-payment.mjs
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, UpdateCommand, GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";

const dynamoClient = new DynamoDBClient({ region: "ap-south-1" });
const docClient = DynamoDBDocumentClient.from(dynamoClient);
const secretsClient = new SecretsManagerClient({ region: "ap-south-1" });

const EVENTS_TABLE = process.env.EVENTS_TABLE || "ChapterEvents";
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

    const updatedEvent = {
      ...existing.Item,
      title: title !== undefined ? title : existing.Item.title,
      description: description !== undefined ? description : existing.Item.description,
      eventType: eventType !== undefined ? eventType : existing.Item.eventType,
      startDateTime: startDateTime !== undefined ? startDateTime : existing.Item.startDateTime,
      endDateTime: endDateTime !== undefined ? endDateTime : existing.Item.endDateTime,
      location: location !== undefined ? location : existing.Item.location,
      isOnline: isOnline !== undefined ? isOnline : existing.Item.isOnline,
      meetingLink: meetingLink !== undefined ? meetingLink : existing.Item.meetingLink,
      maxAttendees: maxAttendees !== undefined && maxAttendees !== null && maxAttendees !== "" ? parseInt(maxAttendees) : existing.Item.maxAttendees,
      registrationRequired: registrationRequired !== undefined ? !!registrationRequired : existing.Item.registrationRequired,
      registrationDeadline: registrationDeadline !== undefined ? registrationDeadline : existing.Item.registrationDeadline,
      imageUrl: imageUrl !== undefined ? imageUrl : existing.Item.imageUrl,
      tags: tags !== undefined ? (Array.isArray(tags) ? tags : []) : existing.Item.tags,
      isPaid: isPaid !== undefined ? !!isPaid : existing.Item.isPaid,
      registrationFee: registrationFee !== undefined ? parseFloat(registrationFee || 0) || 0 : existing.Item.registrationFee,
      isLive: isLive !== undefined ? !!isLive : existing.Item.isLive,
      updatedAt: expressionAttributeValues[":u"]
    };

    await storeEventSummaryEmbedding(updatedEvent);
    
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
      console.log("   Update activity logged successfully");
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
