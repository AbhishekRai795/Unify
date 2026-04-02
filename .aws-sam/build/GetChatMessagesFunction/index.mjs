// getChatMessages-payment.mjs
// Lambda function to retrieve chat message history between Chapter Head and Students
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, QueryCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";

const dynamoClient = new DynamoDBClient({ region: "ap-south-1" });
const docClient = DynamoDBDocumentClient.from(dynamoClient);

const CHAT_MESSAGES_TABLE = process.env.CHAT_MESSAGES_TABLE || "ChatMessages1To1";
const CHAT_THREADS_TABLE = process.env.CHAT_THREADS_TABLE || "ChatThreads1To1";
const CHAPTERS_TABLE = process.env.CHAPTERS_TABLE || "Chapters";

const corsHeaders = {
  "Access-Control-Allow-Origin": process.env.ALLOWED_ORIGIN || "*",
  "Access-Control-Allow-Headers": "Content-Type,Authorization",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS"
};

const uniq = (arr) => Array.from(new Set(arr.filter(Boolean)));

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
    const userEmail = claims.email;
    const userUsername = claims["cognito:username"] || claims.username;
    const userIdentities = uniq([userId, userEmail, userUsername]);
    console.log(`[DEBUG] userId (sub): ${userId}, email: ${userEmail}`);
    
    // Parse query parameters
    const queryParams = event.queryStringParameters || {};
    const chapterId = queryParams.chapterId;
    const otherUserId = queryParams.otherUserId; // Can be sub, email, or legacy username
    const limit = parseInt(queryParams.limit || "50", 10);
    const startKey = queryParams.startKey ? JSON.parse(decodeURIComponent(queryParams.startKey)) : null;

    console.log(`[DEBUG] chapterId: ${chapterId}, otherUserId: ${otherUserId}`);
    if (!chapterId || !otherUserId) {
      console.warn("[WARN] Missing required parameters");
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: "chapterId and otherUserId are required" })
      };
    }

    const otherVariants = uniq([otherUserId]);
    const formats = [];

    if (otherUserId.includes("#")) {
      formats.push(otherUserId);
    }

    for (const mine of userIdentities) {
      for (const other of otherVariants) {
        const participants = [mine, other].sort();
        formats.push(`${chapterId}#${participants[0]}#${participants[1]}`);
        formats.push(`${participants[0]}#${participants[1]}`);
      }
    }

    const candidateConversationIds = uniq(formats);

    // Find the first conversation ID that actually exists/has messages
    let conversationId = candidateConversationIds[0];
    let messagesResponse = { Items: [] };
    let threadResponse = { Item: null };

    for (const cid of candidateConversationIds) {
      console.log(`[DEBUG] Trying conversationId: ${cid}`);
      
      // Try to get thread metadata first as a quick check
      const tRes = await docClient.send(new GetCommand({
        TableName: CHAT_THREADS_TABLE,
        Key: { conversationId: cid }
      })).catch(() => ({ Item: null }));

      // Query messages
      const mRes = await docClient.send(new QueryCommand({
        TableName: CHAT_MESSAGES_TABLE,
        KeyConditionExpression: "conversationId = :cid",
        ExpressionAttributeValues: { ":cid": cid },
        ScanIndexForward: false,
        Limit: limit
      })).catch(() => ({ Items: [] }));

      if ((mRes.Items && mRes.Items.length > 0) || tRes.Item) {
        conversationId = cid;
        messagesResponse = mRes;
        threadResponse = tRes;
        console.log(`[DEBUG] Found active conversation at: ${cid}`);
        break;
      }
    }

    // Fallback: if lookup by synthetic IDs fails, try finding a thread by chapter and participants.
    if (!threadResponse.Item && (!messagesResponse.Items || messagesResponse.Items.length === 0)) {
      const scanRes = await docClient.send(new QueryCommand({
        TableName: CHAT_THREADS_TABLE,
        IndexName: "ChapterThreadsIndex",
        KeyConditionExpression: "chapterId = :chapterId",
        ExpressionAttributeValues: {
          ":chapterId": chapterId
        },
        ScanIndexForward: false,
        Limit: 100
      })).catch(() => ({ Items: [] }));

      const matchedThread = (scanRes.Items || []).find((thread) => {
        const pA = thread.participantA;
        const pB = thread.participantB;
        const cid = thread.conversationId || "";
        const mineMatch = userIdentities.some((id) => id && (pA === id || pB === id || cid.includes(id)));
        const otherMatch = otherVariants.some((id) => id && (pA === id || pB === id || cid.includes(id)));
        return mineMatch && otherMatch;
      });

      if (matchedThread?.conversationId) {
        conversationId = matchedThread.conversationId;
        threadResponse = { Item: matchedThread };
        messagesResponse = await docClient.send(new QueryCommand({
          TableName: CHAT_MESSAGES_TABLE,
          KeyConditionExpression: "conversationId = :cid",
          ExpressionAttributeValues: { ":cid": conversationId },
          ScanIndexForward: false,
          Limit: limit
        })).catch(() => ({ Items: [] }));
      }
    }

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
                conversationId: msg.conversationId,
                timestamp: msg.timestamp
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
        threadId: conversationId,
        conversationId,
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
