// listChatConversations-payment.mjs
// Lambda function to list all chat conversations for a user in a chapter
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand, GetCommand } from "@aws-sdk/lib-dynamodb";

const dynamoClient = new DynamoDBClient({ region: "ap-south-1" });
const docClient = DynamoDBDocumentClient.from(dynamoClient);

const CHAT_THREADS_TABLE = process.env.CHAT_THREADS_TABLE || "ChatThreads";
const CHAPTERS_TABLE = process.env.CHAPTERS_TABLE || "Chapters";

const corsHeaders = {
  "Access-Control-Allow-Origin": process.env.ALLOWED_ORIGIN || "*",
  "Access-Control-Allow-Headers": "Content-Type,Authorization",
  "Access-Control-Allow-Methods": "GET,OPTIONS"
};

export const handler = async (event) => {
  console.log("List chat conversations received:", JSON.stringify(event, null, 2));

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

    const userId = claims.sub;
    
    // Parse query parameters
    const queryParams = event.queryStringParameters || {};
    const chapterId = queryParams.chapterId;
    const limit = parseInt(queryParams.limit || "20", 10);

    if (!chapterId) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: "chapterId is required" })
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

    // Get all threads - we'll filter client-side for user-specific ones
    // Get threads where user is either participantA or participantB in the chapter
    const threadsResponse = await docClient.send(new QueryCommand({
      TableName: CHAT_THREADS_TABLE,
      IndexName: "ChapterThreadsIndex",
      KeyConditionExpression: "chapterId = :chapterId",
      ExpressionAttributeValues: {
        ":chapterId": chapterId
      },
      ScanIndexForward: false, // Newest first
      Limit: limit * 2 // Request more since we'll filter
    }));

    // Filter threads where user is a participant and map to conversation objects
    const conversations = threadsResponse.Items
      .filter(thread => thread.participantA === userId || thread.participantB === userId)
      .slice(0, limit)
      .map(thread => ({
        threadId: thread.threadId,
        chapterId: thread.chapterId,
        otherParticipantId: thread.participantA === userId ? thread.participantB : thread.participantA,
        lastMessage: thread.lastMessagePreview || "",
        lastMessageAt: thread.lastMessageAt,
        messageCount: thread.messageCount || 0,
        lastMessageSenderId: thread.lastMessageSenderId,
        createdAt: thread.createdAt
      }));

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        success: true,
        userId,
        chapterId,
        conversations,
        totalCount: conversations.length
      })
    };
  } catch (error) {
    console.error("  Error listing chat conversations:", error);
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
