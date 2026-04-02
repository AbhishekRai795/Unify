// getChatMessages-payment.mjs
// Lambda function to retrieve chat message history between Chapter Head and Students
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, QueryCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";

const dynamoClient = new DynamoDBClient({ region: "ap-south-1" });
const docClient = DynamoDBDocumentClient.from(dynamoClient);

const CHAT_MESSAGES_TABLE = process.env.CHAT_MESSAGES_TABLE || "ChatMessages";
const CHAT_THREADS_TABLE = process.env.CHAT_THREADS_TABLE || "ChatThreads";
const CHAPTERS_TABLE = process.env.CHAPTERS_TABLE || "Chapters";

const corsHeaders = {
  "Access-Control-Allow-Origin": process.env.ALLOWED_ORIGIN || "*",
  "Access-Control-Allow-Headers": "Content-Type,Authorization",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS"
};

export const handler = async (event) => {
  console.log("Get chat messages received:", JSON.stringify(event, null, 2));

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
    const otherUserId = queryParams.otherUserId;
    const limit = parseInt(queryParams.limit || "50", 10);
    const startKey = queryParams.startKey ? JSON.parse(decodeURIComponent(queryParams.startKey)) : null;

    if (!chapterId || !otherUserId) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: "chapterId and otherUserId are required" })
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

    // Create thread ID (sorted participant IDs ensure same thread for both directions)
    const participants = [userId, otherUserId].sort();
    const threadId = `${chapterId}#${participants[0]}#${participants[1]}`;

    // Get thread metadata
    const threadResponse = await docClient.send(new GetCommand({
      TableName: CHAT_THREADS_TABLE,
      Key: { threadId }
    }));

    // Query messages for this thread, sorted by creation time (newest first)
    const messagesResponse = await docClient.send(new QueryCommand({
      TableName: CHAT_MESSAGES_TABLE,
      KeyConditionExpression: "threadId = :tid",
      ExpressionAttributeValues: {
        ":tid": threadId
      },
      ScanIndexForward: false, // Newest first
      Limit: Math.min(limit, 100), // Max 100 per request
      ExclusiveStartKey: startKey
    }));

    // Mark messages as read (only unread messages from other user)
    if (messagesResponse.Items && messagesResponse.Items.length > 0) {
      const unreadMessages = messagesResponse.Items.filter(
        msg => msg.senderId !== userId && !msg.isRead
      );
      
      if (unreadMessages.length > 0) {
        // Update all unread messages to read (non-blocking)
        console.log(`Marking ${unreadMessages.length} messages as read`);
        try {
          for (const msg of unreadMessages) {
            // Batch update could be more efficient, but this is simpler
            await docClient.send(new UpdateCommand({
              TableName: CHAT_MESSAGES_TABLE,
              Key: {
                threadId: msg.threadId,
                messageId: msg.messageId
              },
              UpdateExpression: "SET isRead = :true",
              ExpressionAttributeValues: { ":true": true }
            }));
          }
        } catch (readError) {
          console.warn("⚠️ Warning: Could not mark messages as read:", readError.message);
          // Don't fail the response if this fails
        }
      }
    }

    // Reverse the messages to show in chronological order (oldest to newest)
    const messages = messagesResponse.Items ? messagesResponse.Items.reverse() : [];

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        success: true,
        threadId,
        thread: threadResponse.Item || null,
        messages,
        messageCount: messages.length,
        totalCount: threadResponse.Item?.messageCount || 0,
        hasMore: !!messagesResponse.LastEvaluatedKey,
        nextStartKey: messagesResponse.LastEvaluatedKey ? 
          encodeURIComponent(JSON.stringify(messagesResponse.LastEvaluatedKey)) : null
      })
    };
  } catch (error) {
    console.error("❌ Error retrieving chat messages:", error);
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
