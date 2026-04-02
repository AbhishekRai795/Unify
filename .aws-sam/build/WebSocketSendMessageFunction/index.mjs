// wsSendMessage/index.mjs
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, QueryCommand, DeleteCommand, GetCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { ApiGatewayManagementApiClient, PostToConnectionCommand } from "@aws-sdk/client-apigatewaymanagementapi";
import { randomUUID } from "crypto";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const WS_CONNECTIONS_TABLE = process.env.WebSocketConnectionsTable || "WebSocketConnections";
const CHAT_MESSAGES_TABLE = process.env.CHAT_MESSAGES_TABLE || "ChatMessages1To1";
const CHAT_THREADS_TABLE = process.env.CHAT_THREADS_TABLE || "ChatThreads1To1";
const CHAPTERS_TABLE = process.env.CHAPTERS_TABLE || "Chapters";
const canonicalPairId = (a, b) => [a, b].filter(Boolean).sort().join("#");

export const handler = async (event) => {
  console.log("Send message event:", JSON.stringify(event, null, 2));

  const connectionId = event.requestContext.connectionId;
  const domainName = event.requestContext.domainName;
  const stage = event.requestContext.stage;
  const endpoint = `https://${domainName}/${stage}`;

  try {
    const body = JSON.parse(event.body);
    const { chapterId, recipientId, userId: senderId, senderName, message, type = 'text', senderEmail: bodySenderEmail = "" } = body;

    if (!chapterId || !message || !recipientId || !senderId) {
      return { statusCode: 400, body: "Missing chapterId, recipientId, senderId, or message" };
    }

    // Get sender email from JWT if possible (more secure)
    const claims = event.requestContext?.authorizer?.jwt?.claims;
    const senderEmail = claims?.email || bodySenderEmail;

    const timestamp = new Date().toISOString();
    const messageId = randomUUID();

    // Determine conversation ID (chapter-agnostic canonical pair ID)
    const subParticipants = [senderId, recipientId].sort();
    const primaryConversationId = canonicalPairId(subParticipants[0], subParticipants[1]);
    
    let activeConversationId = primaryConversationId;
    let existingThread = null;

    // 1. Find the active thread (check primary and legacy formats)
    try {
      const resPrimary = await docClient.send(new GetCommand({
        TableName: CHAT_THREADS_TABLE,
        Key: { conversationId: primaryConversationId }
      }));
      
      if (resPrimary.Item) {
        existingThread = resPrimary.Item;
      } else if (senderEmail) {
        // Look for legacy formats if primary fails
        const legacyCandidates = [
          `${chapterId}#${primaryConversationId}`,
          canonicalPairId(senderEmail, recipientId),
          `${chapterId}#${canonicalPairId(senderEmail, recipientId)}`
        ].filter(Boolean);

        for (const lid of legacyCandidates) {
          const resLegacy = await docClient.send(new GetCommand({
            TableName: CHAT_THREADS_TABLE,
            Key: { conversationId: lid }
          }));
          if (resLegacy.Item) {
            existingThread = resLegacy.Item;
            activeConversationId = lid;
            break;
          }
        }
      }

      // 2. Manage Thread Table Record
      if (existingThread) {
        // Update existing (REPAIR: ensure chapterId and sub attributes are set)
        await docClient.send(new UpdateCommand({
          TableName: CHAT_THREADS_TABLE,
          Key: { conversationId: activeConversationId },
          UpdateExpression: "SET chapterId = :chapterId, participantA = :pA, participantB = :pB, messageCount = (if_not_exists(messageCount, :zero)) + :one, lastMessageAt = :now, lastMessagePreview = :msg, lastMessageSenderId = :sender",
          ExpressionAttributeValues: {
            ":chapterId": chapterId,
            ":pA": subParticipants[0],
            ":pB": subParticipants[1],
            ":one": 1,
            ":zero": 0,
            ":now": timestamp,
            ":msg": message.substring(0, 100),
            ":sender": senderId
          }
        }));
      } else {
        // Create new thread
        await docClient.send(new PutCommand({
          TableName: CHAT_THREADS_TABLE,
          Item: {
            conversationId: activeConversationId,
            chapterId,
            participantA: subParticipants[0],
            participantB: subParticipants[1],
            lastMessageAt: timestamp,
            lastMessagePreview: message.substring(0, 100),
            lastMessageSenderId: senderId,
            messageCount: 1,
            isActive: true,
            createdAt: timestamp
          }
        }));
      }
    } catch (e) {
      console.warn("[WARN] Thread management failed, proceeding with message save:", e.message);
    }

    // 2. Save message to DynamoDB
    const chatMessage = {
      conversationId: activeConversationId,
      timestamp,
      messageId,
      senderId,
      senderEmail,
      senderName,
      recipientId,
      chapterId,
      messageType: type,
      message: message.trim(),
      isRead: false,
      updatedAt: timestamp
    };

    await docClient.send(new PutCommand({
      TableName: CHAT_MESSAGES_TABLE,
      Item: chatMessage
    }));

    // 3. Broadcast over WebSocket
    const getUserConnections = async (uid) => {
      const response = await docClient.send(new QueryCommand({
        TableName: WS_CONNECTIONS_TABLE,
        IndexName: "UserIndex",
        KeyConditionExpression: "userId = :uid",
        ExpressionAttributeValues: { ":uid": String(uid) }
      }));
      return response.Items || [];
    };

    const recipientConnections = await getUserConnections(recipientId);
    const senderConnections = await getUserConnections(senderId);

    const allConnectionsMap = new Map();
    [...recipientConnections, ...senderConnections].forEach(conn => {
      allConnectionsMap.set(conn.connectionId, conn);
    });
    
    const allConnections = Array.from(allConnectionsMap.values());

    const apiGatewayClient = new ApiGatewayManagementApiClient({ endpoint });

    const postToConnections = allConnections.map(async (conn) => {
      try {
        await apiGatewayClient.send(new PostToConnectionCommand({
          ConnectionId: conn.connectionId,
          Data: JSON.stringify({
            action: "receiveMessage",
            message: chatMessage
          })
        }));
      } catch (e) {
        if (e.name === "GoneException") {
          console.log(`Connection ${conn.connectionId} is gone, removing...`);
          await docClient.send(new DeleteCommand({
            TableName: WS_CONNECTIONS_TABLE,
            Key: { connectionId: conn.connectionId }
          }));
        }
      }
    });

    await Promise.all(postToConnections);

    return { statusCode: 200, body: "Message sent" };
  } catch (error) {
    console.error("Error in sendMessage handler:", error);
    return { statusCode: 500, body: "Failed to send message" };
  }
};
