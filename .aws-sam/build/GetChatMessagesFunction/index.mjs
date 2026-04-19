// getChatMessages-payment.mjs
// Lambda function to retrieve chat message history between Chapter Head and Students
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, QueryCommand, UpdateCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";

const dynamoClient = new DynamoDBClient({ region: "ap-south-1" });
const docClient = DynamoDBDocumentClient.from(dynamoClient);

const CHAT_MESSAGES_TABLE = process.env.CHAT_MESSAGES_TABLE || "ChatMessages1To1";
const CHAT_THREADS_TABLE = process.env.CHAT_THREADS_TABLE || "ChatThreads1To1";

const corsHeaders = {
  "Access-Control-Allow-Origin": process.env.ALLOWED_ORIGIN || "*",
  "Access-Control-Allow-Headers": "Content-Type,Authorization",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS"
};

const uniq = (arr) => Array.from(new Set(arr.filter(Boolean)));
const canonicalPairId = (a, b) => [a, b].filter(Boolean).sort().join("#");

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

    console.log(`[DEBUG] chapterId: ${chapterId}, otherUserId: ${otherUserId}`);
    if (!otherUserId) {
      console.warn("[WARN] Missing required parameters");
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: "otherUserId is required" })
      };
    }

    const otherVariants = uniq([otherUserId]);
    const formats = [];

    if (otherUserId.includes("#")) {
      formats.push(otherUserId);
    }

    // Preferred canonical pair IDs (chapter-agnostic)
    for (const mine of userIdentities) {
      for (const other of otherVariants) {
        const pair = canonicalPairId(mine, other);
        if (pair) formats.push(pair);
      }
    }

    // Legacy IDs (chapter-scoped) kept for backward compatibility
    for (const mine of userIdentities) {
      for (const other of otherVariants) {
        const participants = [mine, other].sort();
        if (chapterId) {
          formats.push(`${chapterId}#${participants[0]}#${participants[1]}`);
        }
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

    // Compatibility mode: find all participant-matching threads globally
    // and merge their messages into a single timeline.
    const scanAllRes = await docClient.send(new ScanCommand({
      TableName: CHAT_THREADS_TABLE,
      FilterExpression: "participantA = :u OR participantB = :u OR participantA = :o OR participantB = :o OR contains(conversationId, :u) OR contains(conversationId, :o)",
      ExpressionAttributeValues: {
        ":u": userId,
        ":o": otherUserId
      },
      Limit: 200
    })).catch(() => ({ Items: [] }));

    const matchedThreads = (scanAllRes.Items || []).filter((thread) => {
      const pA = thread.participantA;
      const pB = thread.participantB;
      const cid = thread.conversationId || "";
      const mineMatch = userIdentities.some((id) => id && (pA === id || pB === id || cid.includes(id)));
      const otherMatch = otherVariants.some((id) => id && (pA === id || pB === id || cid.includes(id)));
      return mineMatch && otherMatch;
    });

    if ((!threadResponse.Item && (!messagesResponse.Items || messagesResponse.Items.length === 0)) && matchedThreads.length > 0) {
      const matchedThread = matchedThreads.sort((a, b) => new Date(b.lastMessageAt || 0).getTime() - new Date(a.lastMessageAt || 0).getTime())[0];
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

    if (matchedThreads.length > 1) {
      const mergedMessagePages = await Promise.all(
        matchedThreads
          .map((t) => t?.conversationId)
          .filter(Boolean)
          .map((cid) =>
            docClient.send(new QueryCommand({
              TableName: CHAT_MESSAGES_TABLE,
              KeyConditionExpression: "conversationId = :cid",
              ExpressionAttributeValues: { ":cid": cid },
              ScanIndexForward: false,
              Limit: limit
            })).catch(() => ({ Items: [] }))
          )
      );

      const mergedMessages = mergedMessagePages.flatMap((page) => page.Items || []);
      const uniqueMerged = Array.from(
        new Map(
          mergedMessages.map((msg) => [
            `${msg.messageId || ""}#${msg.timestamp || ""}#${msg.senderId || ""}#${msg.message || ""}`,
            msg
          ])
        ).values()
      ).sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime());

      messagesResponse = {
        ...messagesResponse,
        Items: uniqueMerged.slice(0, limit)
      };
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
    console.error("  Error retrieving chat messages:", error);
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
