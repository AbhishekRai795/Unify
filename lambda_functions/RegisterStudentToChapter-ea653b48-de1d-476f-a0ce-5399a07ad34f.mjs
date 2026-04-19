import {
  DynamoDBClient,
  ScanCommand,
  UpdateItemCommand
} from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";

const dynamo = new DynamoDBClient({ region: "ap-south-1" });
const docClient = DynamoDBDocumentClient.from(dynamo);

const USERS_TABLE = "Unify-Users";
const CHAPTERS_TABLE = "Chapters";
const PAYMENTS_TABLE = "ChapterPayments";
const REGISTRATION_TABLE = "RegistrationRequests";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type,Authorization",
  "Access-Control-Allow-Methods": "POST,OPTIONS"
};

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS' || event.requestContext?.http?.method === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders, body: '' };
  }

  try {
    const claims = event.requestContext?.authorizer?.jwt?.claims;
    if (!claims) {
      return { statusCode: 401, headers: corsHeaders, body: JSON.stringify({ error: "No authorization claims found" }) };
    }

    const userEmail = claims.email || claims['cognito:username'] || claims.username || claims.sub;
    if (!userEmail) {
      return { statusCode: 401, headers: corsHeaders, body: JSON.stringify({ error: "No email found in token" }) };
    }

    let requestBody;
    try {
      requestBody = JSON.parse(event.body);
    } catch {
      return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: "Invalid JSON in request body" }) };
    }

    const { chapterName, studentName, studentEmail } = requestBody;
    if (!chapterName || !studentName || !studentEmail) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: "Missing required fields: chapterName, studentName, studentEmail" })
      };
    }

    if (userEmail !== studentEmail) {
      return {
        statusCode: 403,
        headers: corsHeaders,
        body: JSON.stringify({ error: "Cannot register with a different email than your authenticated account" })
      };
    }

    // Fetch chapter (need chapterId, isPaid, registrationFee)
    const chapterScan = await dynamo.send(new ScanCommand({
      TableName: CHAPTERS_TABLE,
      FilterExpression: "chapterName = :name",
      ExpressionAttributeValues: { ":name": { S: chapterName } }
    }));

    if (!chapterScan.Items || chapterScan.Items.length === 0) {
      return { statusCode: 404, headers: corsHeaders, body: JSON.stringify({ error: "Chapter not found" }) };
    }

    const chapterRaw = chapterScan.Items[0];
    const chapterId = chapterRaw.chapterId?.S;
    const isPaid = chapterRaw.isPaid?.BOOL || false;
    const registrationFee = chapterRaw.registrationFee?.N ? Number(chapterRaw.registrationFee.N) : 0;

    // Block paid chapters — frontend must use the payment flow
    if (isPaid) {
      return {
        statusCode: 402, // Payment Required
        headers: corsHeaders,
        body: JSON.stringify({
          error: "This chapter requires payment. Please use the payment flow to register.",
          isPaid: true,
          registrationFee
        })
      };
    }

    // Fetch user record
    const userScan = await dynamo.send(new ScanCommand({
      TableName: USERS_TABLE,
      FilterExpression: "email = :email",
      ExpressionAttributeValues: { ":email": { S: userEmail } }
    }));

    if (!userScan.Items || userScan.Items.length === 0) {
      return { statusCode: 404, headers: corsHeaders, body: JSON.stringify({ error: "User not found in system" }) };
    }

    const user = userScan.Items[0];
    const userId = user.userId?.S;

    if (!userId) {
      console.error("User found but missing userId:", user);
      return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: "User record is missing userId" }) };
    }

    const currentChapters = user.registeredChapters?.SS || user.registeredChapters?.L?.map(i => i.S) || [];
    if (currentChapters.includes(chapterName)) {
      return { statusCode: 409, headers: corsHeaders, body: JSON.stringify({ error: "Already registered for this chapter" }) };
    }

    const now = new Date().toISOString();
    const updatedChapters = [...currentChapters, chapterName];

    // 1. Update user's registeredChapters
    await dynamo.send(new UpdateItemCommand({
      TableName: USERS_TABLE,
      Key: { userId: { S: userId } },
      UpdateExpression: "SET registeredChapters = :chapters",
      ExpressionAttributeValues: { ":chapters": { L: updatedChapters.map(s => ({ S: s })) } },
      ReturnValues: "UPDATED_NEW"
    }));

    // 2. Write FREE record to ChapterPayments (so it shows in Payment Stats dashboard)
    const transactionId = `FREE#${Date.now()}#${userId.substring(0, 8)}`;
    await docClient.send(new PutCommand({
      TableName: PAYMENTS_TABLE,
      Item: {
        chapterId: chapterId || chapterName, // fallback to name if no id
        transactionId,
        userId,
        studentName,
        studentEmail,
        paymentStatus: "FREE",
        amount: 0,
        registrationFee: 0,
        isPaid: false,
        chapterName,
        createdAt: now,
        updatedAt: now
      }
    }));

    // 3. Write RegistrationRequest record (auto-approved for free chapters)
    const registrationId = `REG-${chapterId || chapterName}-${userId}-${Date.now()}`;
    await docClient.send(new PutCommand({
      TableName: REGISTRATION_TABLE,
      Item: {
        registrationId,
        chapterId: chapterId || chapterName,
        chapterName,
        userId,
        studentName,
        studentEmail,
        status: "approved",
        appliedAt: now,
        processedAt: now,
        processedBy: "FREE_REGISTRATION",
        notes: "Auto-approved: free chapter registration"
      }
    }));

    // 4. Increment member count on Chapters table
    if (chapterId) {
      try {
        await docClient.send(new UpdateCommand({
          TableName: CHAPTERS_TABLE,
          Key: { chapterId },
          UpdateExpression: "SET memberCount = if_not_exists(memberCount, :zero) + :one, updatedAt = :now",
          ExpressionAttributeValues: { ":zero": 0, ":one": 1, ":now": now }
        }));
      } catch (e) {
        console.warn("Failed to increment memberCount:", e.message);
      }
    }

    return {
      statusCode: 201,
      headers: corsHeaders,
      body: JSON.stringify({
        message: `Successfully registered ${studentName} for chapter: ${chapterName}`,
        registrationDetails: {
          studentEmail: userEmail,
          studentName,
          chapterName,
          registeredAt: now,
          totalChapters: updatedChapters.length,
          paymentStatus: "FREE"
        }
      })
    };

  } catch (error) {
    console.error("Error registering student:", error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: "Failed to register student for chapter", details: error.message })
    };
  }
};