// sendChatMessage-payment.mjs
// Lambda function to send chat messages between Chapter Head and Students
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, GetCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { randomUUID } from "crypto";

const dynamoClient = new DynamoDBClient({ region: "ap-south-1" });
const docClient = DynamoDBDocumentClient.from(dynamoClient);

const CHAT_MESSAGES_TABLE = process.env.CHAT_MESSAGES_TABLE || "ChatMessages";
const CHAT_THREADS_TABLE = process.env.CHAT_THREADS_TABLE || "ChatThreads";
const CHAPTERS_TABLE = process.env.CHAPTERS_TABLE || "Chapters";

const corsHeaders = {
  "Access-Control-Allow-Origin": process.env.ALLOWED_ORIGIN || "*",
  "Access-Control-Allow-Headers": "Content-Type,Authorization",
  "Access-Control-Allow-Methods": "POST,OPTIONS"
};

export const handler = async (event) => {
  console.log("Send chat message received:", JSON.stringify(event, null, 2));

  // Handle CORS preflight
  if (event.requestContext?.http?.method === "OPTIONS") {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: ""
    };
  }

  try {
    // Extract user information from JWT
    const claims = event.requestContext?.authorizer?.jwt?.claims;
    if (!claims) {
      return {
        statusCode: 401,
        headers: corsHeaders,
        body: JSON.stringify({ error: "Unauthorized: No authentication claims found" })
      };
    }

    const senderId = claims.sub;
    const senderEmail = claims.email || claims.username;
    const senderName = claims.name || "User";

    // Parse request body
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

    const { chapterId, recipientId, message, messageType } = body;

    if (!chapterId || !recipientId || !message) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: "chapterId, recipientId, and message are required" })
      };
    }

    if (message.trim().length === 0 || message.trim().length > 5000) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: "Message must be between 1 and 5000 characters" })
      };
    }

    // Validate chapter exists
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

    // Create unique thread ID (sorted participant IDs ensure same thread for both directions)
    const participants = [senderId, recipientId].sort();
    const threadId = `${chapterId}#${participants[0]}#${participants[1]}`;

    // Create message ID
    const messageId = randomUUID();
    const timestamp = new Date().toISOString();

    // Get or create thread
    let threadData = {
      threadId,
      chapterId,
      participantA: participants[0],
      participantB: participants[1],
      lastMessageAt: timestamp,
      messageCount: 0,
      isActive: true,
      createdAt: timestamp
    };

    try {
      const threadResponse = await docClient.send(new GetCommand({
        TableName: CHAT_THREADS_TABLE,
        Key: { threadId }
      }));
      
      if (threadResponse.Item) {
        threadData = threadResponse.Item;
        threadData.lastMessageAt = timestamp;
      } else {
        // New thread - create it
        await docClient.send(new PutCommand({
          TableName: CHAT_THREADS_TABLE,
          Item: threadData
        }));
      }
    } catch (threadError) {
      console.warn("⚠️ Warning: Could not manage thread data:", threadError.message);
      // Continue anyway - message can still be stored
    }

    // Store message
    const messageItem = {
      threadId,
      messageId,
      senderId,
      senderEmail,
      senderName,
      recipientId,
      chapterId,
      messageType: messageType || "text", // text, image, document, etc.
      message: message.trim(),
      isRead: false,
      createdAt: timestamp,
      updatedAt: timestamp
    };

    await docClient.send(new PutCommand({
      TableName: CHAT_MESSAGES_TABLE,
      Item: messageItem
    }));

    // Update thread message count
    try {
      await docClient.send(new UpdateCommand({
        TableName: CHAT_THREADS_TABLE,
        Key: { threadId },
        UpdateExpression: "SET messageCount = messageCount + :one, lastMessageAt = :now, lastMessagePreview = :msg, lastMessageSenderId = :sender",
        ExpressionAttributeValues: {
          ":one": 1,
          ":now": timestamp,
          ":msg": message.substring(0, 100), // Store first 100 chars as preview
          ":sender": senderId
        }
      }));
    } catch (updateError) {
      console.warn("⚠️ Warning: Could not update thread metadata:", updateError.message);
    }

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        success: true,
        message: "Message sent successfully",
        messageId,
        threadId,
        createdAt: timestamp
      })
    };
  } catch (error) {
    console.error("❌ Error sending chat message:", error);
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
