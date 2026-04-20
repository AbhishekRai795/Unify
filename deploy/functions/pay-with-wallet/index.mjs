import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, UpdateCommand, PutCommand, QueryCommand, TransactWriteCommand } from "@aws-sdk/lib-dynamodb";
import crypto from "crypto";

const dynamoClient = new DynamoDBClient({ region: "ap-south-1" });
const docClient = DynamoDBDocumentClient.from(dynamoClient);

const WALLET_TABLE = process.env.WALLET_TABLE || "Wallet";
const TRANSACTIONS_TABLE = process.env.TRANSACTIONS_TABLE || "WalletTransactions";
const PAYMENTS_TABLE = process.env.CHAPTER_PAYMENTS_TABLE || "ChapterPayments";
const REGISTRATION_TABLE = process.env.REGISTRATION_TABLE || "RegistrationRequests";
const EVENT_REG_TABLE = process.env.EVENT_REG_TABLE || "EventRegistrationRequests";
const USERS_TABLE = process.env.USERS_TABLE || "Unify-Users";
const CHAPTERS_TABLE = process.env.CHAPTERS_TABLE || "Chapters";
const ACTIVITIES_TABLE = process.env.ACTIVITIES_TABLE || "Activities";
const EVENT_PAYMENTS_TABLE = process.env.EVENT_PAYMENTS_TABLE || "EventPayments";
const EVENTS_TABLE = process.env.EVENTS_TABLE || "ChapterEvents";

const getCorsHeaders = () => ({
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type,Authorization",
  "Access-Control-Allow-Methods": "POST,OPTIONS"
});

const normalizeList = (value) => {
  if (!value) return [];
  if (value instanceof Set) return Array.from(value);
  if (Array.isArray(value)) return value;
  if (typeof value === "string") return [value];
  return [];
};

export const handler = async (event) => {
  console.log("Pay with Wallet event received:", JSON.stringify(event, null, 2));
  const corsHeaders = getCorsHeaders();

  if (event.requestContext?.http?.method === "OPTIONS") {
    return { statusCode: 200, headers: corsHeaders, body: "" };
  }

  try {
    const claims = event.requestContext.authorizer?.jwt?.claims || {};
    const userId = claims.sub || claims.email || claims.username;

    console.log(`Processing wallet payment for userId: ${userId}`);

    if (!userId) {
      return {
        statusCode: 401,
        headers: corsHeaders,
        body: JSON.stringify({ error: "Unauthorized: No userId found" })
      };
    }

    const body = JSON.parse(event.body || "{}");
    const amount = Number(body.amount);
    const { chapterId, eventId } = body;

    console.log(`Request parameters: chapterId=${chapterId}, eventId=${eventId}, amount=${amount}`);

    if ((!chapterId && !eventId) || isNaN(amount) || amount <= 0) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: "Invalid parameters: chaptersId/eventId and a positive amount are required" })
      };
    }

    // 1. Check wallet balance
    console.log(`Checking balance for user: ${userId}`);
    const walletResponse = await docClient.send(new GetCommand({
      TableName: WALLET_TABLE,
      Key: { userId }
    }));

    const currentBalance = Number(walletResponse.Item?.balance || 0);
    console.log(`Current balance: ${currentBalance}`);
    
    if (currentBalance < amount) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: "Insufficient balance", balance: currentBalance, required: amount })
      };
    }

    const now = new Date().toISOString();
    const transactionId = `TRANSACTION#WLT-${Date.now()}#${crypto.randomUUID().split('-')[0].toUpperCase()}`;

    // 2. Perform Transactional update: Deduct balance and Log transaction
    console.log(`Executing transaction ${transactionId} for user ${userId}: -${amount} pts`);
    await docClient.send(new TransactWriteCommand({
      TransactItems: [
        {
          Update: {
            TableName: WALLET_TABLE,
            Key: { userId },
            UpdateExpression: "SET balance = balance - :amt, updatedAt = :now",
            ConditionExpression: "balance >= :amt",
            ExpressionAttributeValues: {
              ":amt": amount,
              ":now": now
            }
          }
        },
        {
          Put: {
            TableName: TRANSACTIONS_TABLE,
            Item: {
              userId,
              transactionId,
              type: "DEBIT",
              amount: amount,
              description: chapterId ? `Chapter registration: ${chapterId}` : `Event registration: ${eventId}`,
              timestamp: now,
              referenceId: chapterId || eventId
            }
          }
        }
      ]
    }));
    console.log("Transactional wallet update successful");

    // 3. Complete Registration Logic
    if (chapterId) {
      console.log("Proceeding with chapter registration");
      return await handleChapterRegistration(userId, chapterId, amount, transactionId, claims, corsHeaders);
    } else {
      console.log("Proceeding with event registration");
      return await handleEventRegistration(userId, eventId, amount, transactionId, claims, corsHeaders);
    }

  } catch (error) {
    console.error("FATAL ERROR in pay-with-wallet handler:", error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ 
        error: "Internal server error", 
        message: error.message,
        details: error.name,
        stack: error.stack
      })
    };
  }
};

async function handleChapterRegistration(userId, chapterId, amount, transactionId, claims, corsHeaders) {
  const now = new Date().toISOString();
  
  try {
    // Get chapter details
    console.log(`Fetching chapter details for: ${chapterId}`);
    const chapterRes = await docClient.send(new GetCommand({
      TableName: CHAPTERS_TABLE,
      Key: { chapterId }
    }));
    const chapter = chapterRes.Item;
    if (!chapter) throw new Error("Chapter not found");

    // Get user details
    console.log(`Fetching user details for: ${userId}`);
    const userRes = await docClient.send(new GetCommand({
      TableName: USERS_TABLE,
      Key: { userId }
    }));
    const user = userRes.Item;
    const studentName = claims.name || user?.name || "Student";
    const studentEmail = claims.email || user?.email || "";

    // Create Registration Request
    const registrationId = `REG-WLT-${chapterId}-${userId.substring(0,8)}-${Date.now()}`;
    console.log(`Creating registration request: ${registrationId}`);
    await docClient.send(new PutCommand({
      TableName: REGISTRATION_TABLE,
      Item: {
        registrationId,
        chapterId,
        chapterName: chapter.chapterName,
        userId,
        studentName,
        studentEmail,
        sapId: user?.sapId,
        year: user?.year,
        status: "approved",
        appliedAt: now,
        processedAt: now,
        processedBy: "WALLET_SYSTEM",
        notes: `Points Payment Registration. Transaction ID: ${transactionId}. Amount: ${amount} pts`
      }
    }));

    // Log in ChapterPayments for history/transparency
    console.log("Creating payment record in ChapterPayments:", transactionId);
    await docClient.send(new PutCommand({
      TableName: PAYMENTS_TABLE,
      Item: {
        chapterId,
        transactionId,
        userId,
        studentName,
        studentEmail,
        amount: amount * 100, // Convert to paise for ChapterPayments table
        paymentStatus: "COMPLETED",
        paymentMethod: "WALLET",
        paymentType: "WALLET",
        chapterName: chapter.chapterName,
        recordType: "TRANSACTION",
        registrationId,
        createdAt: now,
        updatedAt: now,
        completedAt: now,
        notes: "Registered using reward points"
      }
    }));

    // Update user's registered chapters
    console.log("Updating user profile registeredChapters");
    const registeredChapters = normalizeList(user?.registeredChapters);
    if (!registeredChapters.includes(chapter.chapterName)) {
      registeredChapters.push(chapter.chapterName);
      await docClient.send(new UpdateCommand({
        TableName: USERS_TABLE,
        Key: { userId },
        UpdateExpression: "SET registeredChapters = :chapters, updatedAt = :now",
        ExpressionAttributeValues: { ":chapters": registeredChapters, ":now": now }
      }));
    }

    // Update chapter member count
    console.log("Updating chapter member count");
    await docClient.send(new UpdateCommand({
      TableName: CHAPTERS_TABLE,
      Key: { chapterId },
      UpdateExpression: "SET memberCount = if_not_exists(memberCount, :zero) + :one, updatedAt = :now",
      ExpressionAttributeValues: { ":zero": 0, ":one": 1, ":now": now }
    }));

    // Create Activity
    console.log("Logging activity");
    await docClient.send(new PutCommand({
      TableName: ACTIVITIES_TABLE,
      Item: {
        activityId: `activity-wlt-${Date.now()}`,
        chapterId,
        message: `Wallet registration from ${studentName}`,
        timestamp: now,
        type: "registration",
        userId
      }
    }));

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        success: true,
        message: "Chapter registration successful using wallet",
        registrationId,
        transactionId
      })
    };
  } catch (error) {
    console.error("Error in handleChapterRegistration:", error);
    throw error;
  }
}

async function handleEventRegistration(userId, eventId, amount, transactionId, claims, corsHeaders) {
  const now = new Date().toISOString();

  try {
    // Find event in ChapterEvents (GSI scan since chapterId is unknown)
    console.log(`Searching for event: ${eventId}`);
    const eventQuery = await docClient.send(new QueryCommand({
      TableName: EVENTS_TABLE,
      IndexName: "EventIdIndex",
      KeyConditionExpression: "eventId = :eid",
      ExpressionAttributeValues: { ":eid": eventId }
    }));
    const eventItem = eventQuery.Items?.[0];
    if (!eventItem) throw new Error(`Event not found: ${eventId}`);

    const chapterId = eventItem.chapterId;
    const studentName = claims.name || "Student";
    const studentEmail = claims.email || "";

    // Check capacity
    console.log(`Checking event capacity for: ${eventItem.title}`);
    if ((eventItem.currentAttendees || 0) >= (eventItem.maxAttendees || 999999)) {
      throw new Error("Event capacity reached");
    }

    // Add to EventPayments
    console.log("Creating payment record in EventPayments");
    await docClient.send(new PutCommand({
      TableName: EVENT_PAYMENTS_TABLE,
      Item: {
        eventId,
        userId,
        transactionId,
        studentName,
        studentEmail,
        chapterId,
        chapterName: eventItem.chapterName,
        title: eventItem.title,
        amount,
        paymentStatus: "COMPLETED",
        paymentMethod: "WALLET",
        joinedAt: now,
        completedAt: now,
        createdAt: now,
        updatedAt: now
      }
    }));

    // Create Registration Request for event (Using the new specific table)
    const registrationId = `REG-WLT-EVT-${eventId}-${userId.substring(0,8)}-${Date.now()}`;
    console.log(`Creating registration request in ${EVENT_REG_TABLE}: ${registrationId}`);
    await docClient.send(new PutCommand({
      TableName: EVENT_REG_TABLE,
      Item: {
        registrationId,
        chapterId,
        chapterName: eventItem.chapterName,
        userId,
        studentName,
        studentEmail,
        eventId,
        eventTitle: eventItem.title,
        status: "approved",
        appliedAt: now,
        processedAt: now,
        processedBy: "WALLET_SYSTEM",
        notes: `Points Event Registration. Transaction ID: ${transactionId}. Amount: ${amount} pts`
      }
    }));

    // Increment attendee count
    console.log("Updating event attendee count");
    await docClient.send(new UpdateCommand({
      TableName: EVENTS_TABLE,
      Key: { chapterId, eventId },
      UpdateExpression: "SET currentAttendees = if_not_exists(currentAttendees, :zero) + :one, updatedAt = :now",
      ExpressionAttributeValues: { ":zero": 0, ":one": 1, ":now": now }
    }));

    // Update user's attendedEvents
    console.log(`Updating user profile attendedEvents for: ${userId}`);
    const userRes = await docClient.send(new GetCommand({
      TableName: USERS_TABLE,
      Key: { userId }
    }));
    const user = userRes.Item;
    
    const attendedEvents = normalizeList(user?.attendedEvents);
    if (!attendedEvents.includes(eventId)) {
      attendedEvents.push(eventId);
      console.log(`Final attendedEvents list: ${JSON.stringify(attendedEvents)}`);
      await docClient.send(new UpdateCommand({
        TableName: USERS_TABLE,
        Key: { userId },
        UpdateExpression: "SET attendedEvents = :events, updatedAt = :now",
        ExpressionAttributeValues: { ":events": attendedEvents, ":now": now }
      }));
    }

    // Create Activity
    console.log("Logging activity");
    await docClient.send(new PutCommand({
      TableName: ACTIVITIES_TABLE,
      Item: {
        activityId: `activity-evt-wlt-${Date.now()}`,
        chapterId,
        message: `${studentName} joined event "${eventItem.title}" using wallet`,
        timestamp: now,
        type: "event_joined",
        userId,
        metadata: { eventId, title: eventItem.title, transactionId }
      }
    }));

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        success: true,
        message: "Event registration successful using wallet",
        transactionId
      })
    };
  } catch (error) {
    console.error("Error in handleEventRegistration:", error);
    throw error;
  }
}
