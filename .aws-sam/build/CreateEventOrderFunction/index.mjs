// createEventOrder-payment.mjs
// Lambda function to create a Razorpay order for a paid event
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";
import Razorpay from "razorpay";
import crypto from "crypto";

const dynamoClient = new DynamoDBClient({ region: "ap-south-1" });
const docClient = DynamoDBDocumentClient.from(dynamoClient);
const smClient = new SecretsManagerClient({ region: "ap-south-1" });

const EVENT_PAYMENTS_TABLE = process.env.EVENT_PAYMENTS_TABLE || "EventPayments";
const EVENTS_TABLE = process.env.EVENTS_TABLE || "ChapterEvents";
const RAZORPAY_SECRET_NAME = process.env.RAZORPAY_SECRET_NAME || "unify/razorpay/credentials";

const corsHeaders = {
  "Access-Control-Allow-Origin": process.env.ALLOWED_ORIGIN || "*",
  "Access-Control-Allow-Headers": "Content-Type,Authorization",
  "Access-Control-Allow-Methods": "POST,OPTIONS"
};

async function getRazorpayCredentials() {
  console.log("Fetching Razorpay credentials from Secrets Manager:", RAZORPAY_SECRET_NAME);
  try {
    const response = await smClient.send(new GetSecretValueCommand({ SecretId: RAZORPAY_SECRET_NAME }));
    return JSON.parse(response.SecretString);
  } catch (err) {
    console.error("  Error fetching credentials from Secrets Manager:", err);
    throw new Error(`Failed to retrieve Razorpay credentials: ${err.message}`);
  }
}

export const handler = async (event) => {
  console.log("Create event order request received");
  
  try {
    const body = JSON.parse(event.body || "{}");
    const { eventId, studentName, studentEmail } = body;
    console.log("Request params:", { eventId, studentName, studentEmail });
    
    const authClaims = event.requestContext?.authorizer?.jwt?.claims || {};
    const userId = authClaims.sub || authClaims.email || studentEmail;
    console.log("Derived userId for createEventOrder:", userId);

    if (!eventId || !studentEmail) {
      console.warn("⚠️ Missing required fields:", { eventId, studentEmail });
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: "Missing required fields (eventId or studentEmail)" })
      };
    }

    // Verify event exists and is paid
    console.log("Querying event details from table:", EVENTS_TABLE, "eventId:", eventId);
    const gsiResponse = await docClient.send(new QueryCommand({
      TableName: EVENTS_TABLE,
      IndexName: "EventIdIndex",
      KeyConditionExpression: "eventId = :eid",
      ExpressionAttributeValues: { ":eid": eventId }
    }));
    
    const eventItem = gsiResponse.Items?.[0];
    if (!eventItem) {
      console.warn("⚠️ Event not found for ID:", eventId);
      return {
        statusCode: 404,
        headers: corsHeaders,
        body: JSON.stringify({ error: "Event not found in ChapterEvents table" })
      };
    }

    console.log("Found event:", eventItem.title, "Chapter:", eventItem.chapterName, "Fee:", eventItem.registrationFee);

    if (!eventItem.isPaid) {
      console.warn("⚠️ Event is free, but order requested:", eventId);
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: "This is a free event. Please use the join flow." })
      };
    }

    // Retrieve credentials and init Razorpay
    const { key_id, key_secret } = await getRazorpayCredentials();
    console.log("Initializing Razorpay with key_id:", key_id.substring(0, 8) + "...");
    
    const razorpay = new Razorpay({ key_id, key_secret });

    // Create Razorpay order
    const amount = Math.round(eventItem.registrationFee * 100); // in paise
    const receipt = `RCP-EVT-${eventId.split('#')[1]?.substring(0, 8) || 'GEN'}-${Date.now().toString().slice(-6)}`;
    console.log("Creating Razorpay order for amount:", amount, "Receipt:", receipt);

    const order = await razorpay.orders.create({
      amount,
      currency: "INR",
      receipt
    });
    console.log("   Razorpay order created successfully:", order.id);

    // Store pending transaction
    const transactionId = `TXN-EVT-${crypto.randomUUID().split('-')[0].toUpperCase()}`;
    const pendingRegistration = {
      eventId,
      userId,
      transactionId,
      studentName: studentName || "Unknown",
      studentEmail,
      chapterId: eventItem.chapterId,
      chapterName: eventItem.chapterName,
      title: eventItem.title,
      amount: eventItem.registrationFee,
      razorpayOrderId: order.id,
      paymentStatus: "PENDING",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    console.log("Storing pending registration in table:", EVENT_PAYMENTS_TABLE);
    await docClient.send(new PutCommand({
      TableName: EVENT_PAYMENTS_TABLE,
      Item: pendingRegistration
    }));
    console.log("   Pending registration stored successfully");

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        success: true,
        orderId: order.id,
        amount,
        currency: "INR",
        transactionId,
        key_id, // Client needs key_id to open Checkout
        registration: pendingRegistration // Include registration for frontend state update
      })
    };
  } catch (error) {
    console.error("  Critical Error in createEventOrder handler:", error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ 
        error: "Internal server error",
        message: error.message,
        details: error.name
      })
    };
  }
};
