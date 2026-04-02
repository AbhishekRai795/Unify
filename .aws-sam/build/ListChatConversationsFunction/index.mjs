// listChatConversations-payment.mjs
// Lambda function to list all chat conversations for a user in a chapter
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand, GetCommand, ScanCommand, BatchGetCommand } from "@aws-sdk/lib-dynamodb";

const dynamoClient = new DynamoDBClient({ region: "ap-south-1" });
const docClient = DynamoDBDocumentClient.from(dynamoClient);

const CHAT_THREADS_TABLE = process.env.CHAT_THREADS_TABLE || "ChatThreads1To1";
const CHAPTERS_TABLE = process.env.CHAPTERS_TABLE || "Chapters";
const USERS_TABLE = process.env.USERS_TABLE || "Unify-Users";

const corsHeaders = {
  "Access-Control-Allow-Origin": process.env.ALLOWED_ORIGIN || "*",
  "Access-Control-Allow-Headers": "Content-Type,Authorization",
  "Access-Control-Allow-Methods": "GET,OPTIONS"
};

const getThreadId = (thread) => thread?.conversationId || thread?.threadId || "";
const normalize = (value) => (typeof value === "string" ? value.trim().toLowerCase() : "");

const identityMatches = (value, identities) => {
  if (!value) return false;
  const normalizedValue = normalize(value);
  return identities.some((id) => normalize(id) === normalizedValue);
};

const threadIncludesIdentity = (thread, identities) => {
  const threadId = normalize(getThreadId(thread));
  if (!threadId) return false;
  return identities.some((id) => {
    const normalizedId = normalize(id);
    return normalizedId && threadId.includes(normalizedId);
  });
};

const pickOtherParticipant = (thread, identities) => {
  const participantA = thread?.participantA;
  const participantB = thread?.participantB;

  if (participantA && !identityMatches(participantA, identities)) return participantA;
  if (participantB && !identityMatches(participantB, identities)) return participantB;

  const threadId = getThreadId(thread);
  const parts = threadId.split("#").filter(Boolean);
  if (parts.length >= 3) {
    const candidates = parts.slice(1);
    const other = candidates.find((id) => !identityMatches(id, identities));
    if (other) return other;
  }
  return participantA || participantB || "unknown-user";
};

const collectConversations = (threads, identities, limit) => {
  const filteredThreads = (threads || []).filter((thread) => {
    const isParticipantA = identityMatches(thread.participantA, identities);
    const isParticipantB = identityMatches(thread.participantB, identities);
    const inConversationId = threadIncludesIdentity(thread, identities);
    return isParticipantA || isParticipantB || inConversationId;
  });

  const conversations = filteredThreads
    .sort((a, b) => new Date(b.lastMessageAt || 0).getTime() - new Date(a.lastMessageAt || 0).getTime())
    .slice(0, limit)
    .map((thread) => {
      const threadId = getThreadId(thread);
      const otherParticipantId = pickOtherParticipant(thread, identities);

      return {
        threadId,
        conversationId: threadId,
        chapterId: thread.chapterId,
        otherParticipantId,
        lastMessage: thread.lastMessagePreview || "",
        lastMessagePreview: thread.lastMessagePreview || "",
        lastMessageAt: thread.lastMessageAt,
        messageCount: thread.messageCount || 0,
        lastMessageSenderId: thread.lastMessageSenderId,
        createdAt: thread.createdAt
      };
    });

  return { conversations, filteredCount: filteredThreads.length };
};

const attachParticipantNames = async (conversations) => {
  if (!conversations || conversations.length === 0) return conversations;

  const participantIds = Array.from(new Set(
    conversations
      .map((c) => c.otherParticipantId)
      .filter((id) => id && !String(id).includes("@"))
  ));

  if (participantIds.length === 0) return conversations;

  const keys = participantIds.map((userId) => ({ userId }));
  const response = await docClient.send(new BatchGetCommand({
    RequestItems: {
      [USERS_TABLE]: {
        Keys: keys,
        ProjectionExpression: "userId, #name, email",
        ExpressionAttributeNames: {
          "#name": "name"
        }
      }
    }
  })).catch((err) => {
    console.warn("[WARN] Unable to fetch participant names:", err.message);
    return { Responses: {} };
  });

  const users = response?.Responses?.[USERS_TABLE] || [];
  const nameByUserId = new Map(users.map((u) => [u.userId, u.name || u.email || u.userId]));

  return conversations.map((conv) => ({
    ...conv,
    otherParticipantName: nameByUserId.get(conv.otherParticipantId) || conv.otherParticipantName || conv.otherParticipantId
  }));
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
    const userEmail = claims.email;
    const userUsername = claims["cognito:username"] || claims.username;
    const identities = Array.from(new Set([userId, userEmail, userUsername].filter(Boolean)));
    console.log(`[DEBUG] Listing for userId: ${userId}, email: ${userEmail}`);
    
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

    const threadsResponse = await docClient.send(new QueryCommand({
      TableName: CHAT_THREADS_TABLE,
      IndexName: "ChapterThreadsIndex",
      KeyConditionExpression: "chapterId = :chapterId",
      ExpressionAttributeValues: {
        ":chapterId": chapterId
      },
      ScanIndexForward: false, // Newest first
      Limit: limit * 5 // Request more since we'll filter significantly
    }));

    let threads = threadsResponse.Items || [];
    
    // FALLBACK: If no threads found in GSI, try a smarter scan (bridge for legacy data)
    if (threads.length === 0) {
      console.log("[DEBUG] No threads found in GSI, trying smart fallback scan with email support...");
      const scanResponse = await docClient.send(new ScanCommand({
        TableName: CHAT_THREADS_TABLE,
        FilterExpression: "participantA = :userId OR participantB = :userId OR participantA = :userEmail OR participantB = :userEmail OR participantA = :userUsername OR participantB = :userUsername OR contains(conversationId, :userId) OR (attribute_exists(conversationId) AND contains(conversationId, :userEmail)) OR (attribute_exists(conversationId) AND contains(conversationId, :userUsername))",
        ExpressionAttributeValues: {
          ":userId": userId,
          ":userEmail": userEmail || "___NO_EMAIL___",
          ":userUsername": userUsername || "___NO_USERNAME___"
        }
      })).catch(err => {
        console.warn("[WARN] Smart fallback scan failed:", err.message);
        return { Items: [] };
      });
      
      // Filter the scanned items: keep those that match the chapterId OR have NO chapterId (legacy)
      threads = (scanResponse.Items || []).filter(thread =>
        !thread.chapterId || thread.chapterId === chapterId
      );
      console.log(`[DEBUG] Smart scan found ${threads.length} potential legacy/matching threads`);
    }

    let { conversations, filteredCount } = collectConversations(threads, identities, limit);

    // Additional fallback: GSI had rows but none matched identities (legacy/mixed identity data).
    if (filteredCount === 0) {
      console.log("[DEBUG] No user-matching rows after GSI query, running fallback scan...");
      const scanResponse = await docClient.send(new ScanCommand({
        TableName: CHAT_THREADS_TABLE,
        FilterExpression: "participantA = :userId OR participantB = :userId OR participantA = :userEmail OR participantB = :userEmail OR participantA = :userUsername OR participantB = :userUsername OR contains(conversationId, :userId) OR (attribute_exists(conversationId) AND contains(conversationId, :userEmail)) OR (attribute_exists(conversationId) AND contains(conversationId, :userUsername))",
        ExpressionAttributeValues: {
          ":userId": userId,
          ":userEmail": userEmail || "___NO_EMAIL___",
          ":userUsername": userUsername || "___NO_USERNAME___"
        }
      })).catch(err => {
        console.warn("[WARN] Fallback scan failed:", err.message);
        return { Items: [] };
      });

      const fallbackThreads = (scanResponse.Items || []).filter(
        (thread) => !thread.chapterId || thread.chapterId === chapterId
      );
      ({ conversations } = collectConversations(fallbackThreads, identities, limit));
    }

    const conversationsWithNames = await attachParticipantNames(conversations);

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        success: true,
        userId,
        chapterId,
        conversations: conversationsWithNames,
        totalCount: conversationsWithNames.length
      })
    };
  } catch (error) {
    console.error("❌ Error listing chat conversations:", error);
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
