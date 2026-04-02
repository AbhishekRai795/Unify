// verifyEventPayment-payment.mjs
console.log("🚀 Verify Event Payment Lambda Loading...");
// Lambda function to verify Razorpay payment for an event
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, GetCommand, UpdateCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";
import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";
import crypto from "crypto";

const dynamoClient = new DynamoDBClient({ region: "ap-south-1" });
const docClient = DynamoDBDocumentClient.from(dynamoClient);
const smClient = new SecretsManagerClient({ region: "ap-south-1" });

const EVENT_PAYMENTS_TABLE = process.env.EVENT_PAYMENTS_TABLE || "EventPayments";
const EVENTS_TABLE = process.env.EVENTS_TABLE || "ChapterEvents";
const USERS_TABLE = process.env.USERS_TABLE || "Unify-Users";
const RAZORPAY_SECRET_NAME = process.env.RAZORPAY_SECRET_NAME || "unify/razorpay/credentials";

const corsHeaders = {
  "Access-Control-Allow-Origin": process.env.ALLOWED_ORIGIN || "*",
  "Access-Control-Allow-Headers": "Content-Type,Authorization",
  "Access-Control-Allow-Methods": "POST,OPTIONS"
};

async function getRazorpaySecret() {
  const response = await smClient.send(new GetSecretValueCommand({ SecretId: RAZORPAY_SECRET_NAME }));
  const credentials = JSON.parse(response.SecretString);
  return credentials.key_secret;
}

export const handler = async (event) => {
  console.log("Verify event payment received:", JSON.stringify(event, null, 2));

  try {
    const body = JSON.parse(event.body || "{}");
    const { 
      razorpayOrderId, 
      razorpayPaymentId, 
      razorpaySignature, 
      eventId, 
      userId,
      transactionId 
    } = body;

    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature || !eventId || !userId) {
      console.warn("⚠️ Missing verification params:", { razorpayOrderId, razorpayPaymentId, eventId, userId });
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: "Missing required fields for verification" })
      };
    }

    const key_secret = await getRazorpaySecret();

    // Verify signature
    const hmac = crypto.createHmac("sha256", key_secret);
    hmac.update(razorpayOrderId + "|" + razorpayPaymentId);
    const generatedSignature = hmac.digest("hex");

    if (generatedSignature !== razorpaySignature) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: "Invalid payment signature" })
      };
    }

    // Get pending registration
    console.log("Looking up pending registration with Key:", { eventId, userId }, "Table:", EVENT_PAYMENTS_TABLE);
    const regResponse = await docClient.send(new GetCommand({
      TableName: EVENT_PAYMENTS_TABLE,
      Key: { eventId, userId }
    }));

    if (!regResponse.Item) {
      console.warn("⚠️ No matching pending registration found in DynamoDB for:", { eventId, userId });
      return {
        statusCode: 404,
        headers: corsHeaders,
        body: JSON.stringify({ error: "Pending registration not found. Please ensure you are logged in with the same email used during checkout." })
      };
    }

    // Get event details to validate capacity
    const eventResponse = await docClient.send(new GetCommand({
      TableName: EVENTS_TABLE,
      Key: { chapterId: regResponse.Item.chapterId, eventId }
    }));

    if (!eventResponse.Item) {
      console.error("❌ Event not found for capacity check:", eventId);
      return {
        statusCode: 404,
        headers: corsHeaders,
        body: JSON.stringify({ error: "Event details not found" })
      };
    }

    // Validate event capacity
    const currentAttendees = eventResponse.Item.currentAttendees || 0;
    const maxAttendees = eventResponse.Item.maxAttendees || 999999;
    
    console.log(`Event capacity check: ${currentAttendees}/${maxAttendees} attendees`);
    if (currentAttendees >= maxAttendees) {
      console.warn(`⚠️ Event is full. Current: ${currentAttendees}, Max: ${maxAttendees}`);
      // Revert registration to FAILED status
      await docClient.send(new UpdateCommand({
        TableName: EVENT_PAYMENTS_TABLE,
        Key: { eventId, userId },
        UpdateExpression: "SET paymentStatus = :failed, updatedAt = :now",
        ExpressionAttributeValues: {
          ":failed": "FAILED_CAPACITY",
          ":now": new Date().toISOString()
        }
      }));
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ 
          error: "Event is now full. Registration cannot be completed.",
          currentAttendees,
          maxAttendees
        })
      };
    }

    // Update registration to COMPLETED
    await docClient.send(new UpdateCommand({
      TableName: EVENT_PAYMENTS_TABLE,
      Key: { eventId, userId },
      UpdateExpression: "SET paymentStatus = :completed, razorpayPaymentId = :pid, razorpaySignature = :sig, updatedAt = :now",
      ExpressionAttributeValues: {
        ":completed": "COMPLETED",
        ":pid": razorpayPaymentId,
        ":sig": razorpaySignature,
        ":now": new Date().toISOString()
      }
    }));

    // 5. Increment attendee count with retry and validation
    console.log("Updating attendee count for event:", eventId, "Chapter:", regResponse.Item.chapterId);
    let attendeeUpdateSuccess = false;
    let retryCount = 0;
    const MAX_RETRIES = 3;
    
    while (!attendeeUpdateSuccess && retryCount < MAX_RETRIES) {
      try {
        await docClient.send(new UpdateCommand({
          TableName: EVENTS_TABLE,
          Key: { chapterId: regResponse.Item.chapterId, eventId },
          UpdateExpression: "SET currentAttendees = if_not_exists(currentAttendees, :zero) + :one",
          ExpressionAttributeValues: { 
            ":zero": 0, 
            ":one": 1,
            ":maxVal": maxAttendees
          },
          // Add conditional to prevent exceeding capacity
          ConditionExpression: "attribute_not_exists(currentAttendees) OR currentAttendees < :maxVal"
        }));
        attendeeUpdateSuccess = true;
        console.log("✅ Attendee count incremented successfully");
      } catch (attendeeError) {
        retryCount++;
        if (attendeeError.name === "ConditionalCheckFailedException") {
          console.error("❌ Event capacity exceeded during payment verification. Reverting payment.");
          // Revert registration to FAILED status
          await docClient.send(new UpdateCommand({
            TableName: EVENT_PAYMENTS_TABLE,
            Key: { eventId, userId },
            UpdateExpression: "SET paymentStatus = :failed, updatedAt = :now",
            ExpressionAttributeValues: {
              ":failed": "FAILED_CAPACITY_FINAL",
              ":now": new Date().toISOString()
            }
          }));
          return {
            statusCode: 400,
            headers: corsHeaders,
            body: JSON.stringify({ 
              error: "Payment verified but event capacity limit reached. Please contact support for refund.",
              transactionId: regResponse.Item.transactionId
            })
          };
        }
        if (retryCount >= MAX_RETRIES) {
          console.error(`❌ Failed to update attendee count after ${MAX_RETRIES} retries:`, attendeeError.message);
          console.error("⚠️ CRITICAL: Payment verified but attendee count update failed!");
          // Don't fail the verification, but alert monitoring
          break;
        }
        console.log(`⏳ Retry ${retryCount}/${MAX_RETRIES} for attendee count update`);
        await new Promise(resolve => setTimeout(resolve, 100 * retryCount)); // Exponential backoff
      }
    }
    
    // Create activity record (Non-blocking)
    try {
      const activityId = `activity-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const activity = {
        activityId,
        chapterId: regResponse.Item.chapterId,
        type: 'event_joined',
        message: `${regResponse.Item.studentName || regResponse.Item.studentEmail} joined event "${regResponse.Item.title}"`,
        timestamp: new Date().toISOString(),
        userId,
        metadata: { 
          eventId,
          title: regResponse.Item.title,
          paid: true,
          transactionId
        }
      };
      
      console.log("Logging activity to table: Activities");
      await docClient.send(new PutCommand({
        TableName: "Activities",
        Item: activity
      }));
      console.log("✅ Activity logged successfully");

      // Update student's attendedEvents in Unify-Users table
      try {
        console.log(`Updating Unify-Users participated events for: ${userId}`);
        
        const userResponse = await docClient.send(new GetCommand({
          TableName: USERS_TABLE,
          Key: { userId }
        }));
        
        const user = userResponse.Item;
        const updatedAttendedEvents = user?.attendedEvents ? Array.from(user.attendedEvents) : [];
        
        if (!updatedAttendedEvents.includes(eventId)) {
          updatedAttendedEvents.push(eventId);
        }

        await docClient.send(new UpdateCommand({
          TableName: USERS_TABLE,
          Key: { userId },
          UpdateExpression: "SET attendedEvents = :events, updatedAt = :timestamp",
          ExpressionAttributeValues: {
            ":events": updatedAttendedEvents,
            ":timestamp": new Date().toISOString()
          }
        }));
        console.log("✅ User attendedEvents updated successfully via SET array update");
      } catch (userUpdateError) {
        console.error("⚠️ Warning: Failed to update user attendedEvents:", userUpdateError);
        // Non-blocking
      }
    } catch (activityError) {
      console.warn("⚠️ Warning: Failed to log activity, but continuing registration:", activityError.message);
      // Don't throw error here to keep registration successful
    }

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        success: true,
        message: "Payment verified and registration completed",
        transactionId: regResponse.Item.transactionId
      })
    };
  } catch (error) {
    console.error("❌ Error verifying event payment:", error);
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
