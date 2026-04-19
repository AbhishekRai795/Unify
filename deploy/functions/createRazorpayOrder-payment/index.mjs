// createRazorpayOrder.mjs
// Lambda function to create a Razorpay order for chapter registration
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, PutCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { createRazorpayOrder, generateReceiptId, getRazorpayCredentials } from "./razorpay-utils.mjs";
import { randomUUID } from "crypto";

const dynamoClient = new DynamoDBClient({ region: "ap-south-1" });
const docClient = DynamoDBDocumentClient.from(dynamoClient);

const PAYMENTS_TABLE = "ChapterPayments";
const CHAPTERS_TABLE = "Chapters";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type,Authorization",
  "Access-Control-Allow-Methods": "POST,OPTIONS"
};

export const handler = async (event) => {
  console.log("Event received:", JSON.stringify(event, null, 2));

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
    const userEmail = claims.email || claims.username;
    const userName = claims.name || "Student";

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

    const { chapterId } = body;

    if (!chapterId) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: "chapterId is required" })
      };
    }

    // Verify chapter exists
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

    const chapter = chapterResponse.Item;

    // Check if chapter is paid — fee is stored directly on the Chapters table
    if (!chapter.isPaid) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ 
          error: "This is a free chapter – no payment required",
          isPaid: false
        })
      };
    }

    const fee = chapter.registrationFee;
    if (!fee || fee <= 0) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: "Invalid fee amount configured for this chapter" })
      };
    }

    // Generate transaction ID and receipt ID
    const transactionId = `TRANSACTION#${Date.now()}#${randomUUID()}`;
    const receiptId = generateReceiptId(chapterId, userId);


    // Create Razorpay order
    let razorpayOrder;
    let razorpayKeyId;
    try {
      const credentials = await getRazorpayCredentials();
      razorpayKeyId = credentials.key_id;
      razorpayOrder = await createRazorpayOrder(
        fee,
        chapterId,
        userId,
        receiptId,
        {
          type: "chapter_registration",
          studentEmail: userEmail,
          studentName: userName
        }
      );
    } catch (error) {
      console.error("Failed to create Razorpay order:", error);
      return {
        statusCode: 500,
        headers: corsHeaders,
        body: JSON.stringify({ 
          error: "Failed to create payment order",
          details: error.message 
        })
      };
    }

    // Store transaction record in DynamoDB
    const transactionRecord = {
      chapterId,
      transactionId,
      recordType: "TRANSACTION",
      userId,
      studentEmail: userEmail,
      studentName: userName,
      amount: fee,
      paymentStatus: "PENDING",
      razorpayOrderId: razorpayOrder.id,
      receiptId,
      retryCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await docClient.send(new PutCommand({
      TableName: PAYMENTS_TABLE,
      Item: transactionRecord
    }));

    console.log("   Order created successfully:", {
      orderId: razorpayOrder.id,
      transactionId,
      amount: fee,
      user: userEmail
    });

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        success: true,
        orderId: razorpayOrder.id,
        amount: fee,
        currency: "INR",
        receiptId,
        transactionId,
        keyId: razorpayKeyId,
        studentEmail: userEmail,
        studentName: userName,
        notes: {
          chapterId,
          chapterName: chapterResponse.Item.chapterName
        }
      })
    };
  } catch (error) {
    console.error("  Error in createRazorpayOrder:", error);
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
