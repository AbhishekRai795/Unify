// verifyEventPayment-payment.mjs
console.log("🚀 Verify Event Payment Lambda Loading...");
// Lambda function to verify Razorpay payment for an event
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, GetCommand, UpdateCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import crypto from "crypto";

const dynamoClient = new DynamoDBClient({ region: "ap-south-1" });
const docClient = DynamoDBDocumentClient.from(dynamoClient);
const smClient = new SecretsManagerClient({ region: "ap-south-1" });
const s3Client = new S3Client({ region: "ap-south-1" });

const EVENT_PAYMENTS_TABLE = process.env.EVENT_PAYMENTS_TABLE || "EventPayments";
const EVENTS_TABLE = process.env.EVENTS_TABLE || "ChapterEvents";
const USERS_TABLE = process.env.USERS_TABLE || "Unify-Users";
const RECEIPTS_BUCKET = process.env.RECEIPTS_BUCKET;
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

function generateEventReceiptHTML({
  receiptId,
  transactionId,
  studentName,
  studentEmail,
  chapterName,
  eventTitle,
  eventId,
  amount,
  paymentId,
  paymentDate
}) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>Unify Event Payment Receipt</title>
  <style>
    body { font-family: Arial, sans-serif; color: #222; padding: 24px; }
    .card { max-width: 720px; margin: 0 auto; border: 1px solid #ddd; border-radius: 8px; overflow: hidden; }
    .header { background: #16a34a; color: #fff; padding: 16px 20px; }
    .content { padding: 20px; }
    .row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f0f0f0; }
    .label { color: #555; font-weight: 600; }
    .value { color: #111; }
    .footer { padding: 16px 20px; background: #fafafa; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h2 style="margin: 0;">Unify Event Receipt</h2>
      <p style="margin: 6px 0 0;">Receipt ID: ${receiptId}</p>
    </div>
    <div class="content">
      <div class="row"><span class="label">Transaction ID</span><span class="value">${transactionId || "-"}</span></div>
      <div class="row"><span class="label">Student</span><span class="value">${studentName || "Unknown"}</span></div>
      <div class="row"><span class="label">Email</span><span class="value">${studentEmail || "-"}</span></div>
      <div class="row"><span class="label">Chapter</span><span class="value">${chapterName || "-"}</span></div>
      <div class="row"><span class="label">Event</span><span class="value">${eventTitle || "-"}</span></div>
      <div class="row"><span class="label">Event ID</span><span class="value">${eventId || "-"}</span></div>
      <div class="row"><span class="label">Amount Paid</span><span class="value">INR ${Number(amount || 0).toFixed(2)}</span></div>
      <div class="row"><span class="label">Razorpay Payment ID</span><span class="value">${paymentId || "-"}</span></div>
      <div class="row"><span class="label">Payment Date</span><span class="value">${paymentDate}</span></div>
    </div>
    <div class="footer">
      This is a system-generated receipt for your event registration payment.
    </div>
  </div>
</body>
</html>
`;
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
      userId: bodyUserId,
      transactionId 
    } = body;
    const claims = event.requestContext?.authorizer?.jwt?.claims || {};
    const userId = claims.sub || bodyUserId || claims.email;

    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature || !eventId) {
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

    // Get pending registration (primary key lookup first, then fallback by order ID)
    let registrationItem = null;
    if (userId) {
      console.log("Looking up pending registration with Key:", { eventId, userId }, "Table:", EVENT_PAYMENTS_TABLE);
      const regResponse = await docClient.send(new GetCommand({
        TableName: EVENT_PAYMENTS_TABLE,
        Key: { eventId, userId }
      }));
      registrationItem = regResponse.Item || null;
    }

    if (!registrationItem) {
      console.warn("⚠️ Direct lookup failed, trying fallback by eventId + razorpayOrderId");
      const fallbackQuery = await docClient.send(new QueryCommand({
        TableName: EVENT_PAYMENTS_TABLE,
        KeyConditionExpression: "eventId = :eventId",
        FilterExpression: "razorpayOrderId = :orderId",
        ExpressionAttributeValues: {
          ":eventId": eventId,
          ":orderId": razorpayOrderId
        },
        Limit: 5
      }));
      registrationItem = fallbackQuery.Items?.[0] || null;
    }

    if (!registrationItem) {
      console.warn("⚠️ No matching pending registration found in DynamoDB for:", { eventId, userId, razorpayOrderId });
      return {
        statusCode: 404,
        headers: corsHeaders,
        body: JSON.stringify({ error: "Pending registration not found. Please ensure you are logged in with the same email used during checkout." })
      };
    }
    const effectiveUserId = registrationItem.userId;

    // Get event details to validate capacity
    const eventResponse = await docClient.send(new GetCommand({
      TableName: EVENTS_TABLE,
      Key: { chapterId: registrationItem.chapterId, eventId }
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
        Key: { eventId, userId: effectiveUserId },
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

    const nowIso = new Date().toISOString();
    let receiptUrl = "";
    let receiptId = registrationItem.receiptId || `RCP-EVT-${Date.now()}`;

    // Generate/upload event receipt (best-effort; registration should still succeed if this fails)
    if (RECEIPTS_BUCKET) {
      try {
        const eventReceiptHtml = generateEventReceiptHTML({
          receiptId,
          transactionId: registrationItem.transactionId || transactionId,
          studentName: registrationItem.studentName,
          studentEmail: registrationItem.studentEmail,
          chapterName: registrationItem.chapterName,
          eventTitle: registrationItem.title,
          eventId,
          amount: registrationItem.amount,
          paymentId: razorpayPaymentId,
          paymentDate: nowIso
        });

        const receiptKey = `receipts/events/${eventId}/${effectiveUserId}/${receiptId}.html`;
        await s3Client.send(new PutObjectCommand({
          Bucket: RECEIPTS_BUCKET,
          Key: receiptKey,
          Body: eventReceiptHtml,
          ContentType: "text/html"
        }));

        const encodedKey = receiptKey
          .split("/")
          .map((segment) => encodeURIComponent(segment))
          .join("/");
        receiptUrl = `https://${RECEIPTS_BUCKET}.s3.ap-south-1.amazonaws.com/${encodedKey}`;
        console.log("✅ Event receipt uploaded:", receiptKey);
        registrationItem.receiptKey = receiptKey;
      } catch (receiptError) {
        console.warn("⚠️ Event receipt generation/upload failed:", receiptError.message);
      }
    }

    // Update registration to COMPLETED
    await docClient.send(new UpdateCommand({
      TableName: EVENT_PAYMENTS_TABLE,
      Key: { eventId, userId: effectiveUserId },
      UpdateExpression: "SET paymentStatus = :completed, razorpayPaymentId = :pid, razorpaySignature = :sig, joinedAt = :joinedAt, completedAt = :completedAt, updatedAt = :now, receiptId = :receiptId, receiptUrl = :receiptUrl, receiptKey = :receiptKey",
      ExpressionAttributeValues: {
        ":completed": "COMPLETED",
        ":pid": razorpayPaymentId,
        ":sig": razorpaySignature,
        ":joinedAt": nowIso,
        ":completedAt": nowIso,
        ":now": nowIso,
        ":receiptId": receiptId,
        ":receiptUrl": receiptUrl,
        ":receiptKey": registrationItem.receiptKey || ""
      }
    }));

    // 5. Increment attendee count with retry and validation
    console.log("Updating attendee count for event:", eventId, "Chapter:", registrationItem.chapterId);
    let attendeeUpdateSuccess = false;
    let retryCount = 0;
    const MAX_RETRIES = 3;
    
    while (!attendeeUpdateSuccess && retryCount < MAX_RETRIES) {
      try {
        await docClient.send(new UpdateCommand({
          TableName: EVENTS_TABLE,
          Key: { chapterId: registrationItem.chapterId, eventId },
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
            Key: { eventId, userId: effectiveUserId },
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
              transactionId: registrationItem.transactionId
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
        chapterId: registrationItem.chapterId,
        type: 'event_joined',
        message: `${registrationItem.studentName || registrationItem.studentEmail} joined event "${registrationItem.title}"`,
        timestamp: new Date().toISOString(),
        userId: effectiveUserId,
        metadata: { 
          eventId,
          title: registrationItem.title,
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

    } catch (activityError) {
      console.warn("⚠️ Warning: Failed to log activity, but continuing registration:", activityError.message);
      // Don't throw error here to keep registration successful
    }

    // Update student's attendedEvents in Unify-Users table (independent of activity logging)
    try {
      console.log(`Updating Unify-Users participated events for: ${effectiveUserId}`);
      const userResponse = await docClient.send(new GetCommand({
        TableName: USERS_TABLE,
        Key: { userId: effectiveUserId }
      }));

      const user = userResponse.Item;
      const updatedAttendedEvents = user?.attendedEvents ? Array.from(user.attendedEvents) : [];
      if (!updatedAttendedEvents.includes(eventId)) {
        updatedAttendedEvents.push(eventId);
      }

      await docClient.send(new UpdateCommand({
        TableName: USERS_TABLE,
        Key: { userId: effectiveUserId },
        UpdateExpression: "SET attendedEvents = :events, updatedAt = :timestamp",
        ExpressionAttributeValues: {
          ":events": updatedAttendedEvents,
          ":timestamp": new Date().toISOString()
        }
      }));
      console.log("✅ User attendedEvents updated successfully");
    } catch (userUpdateError) {
      console.error("⚠️ Warning: Failed to update user attendedEvents:", userUpdateError);
    }

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        success: true,
        message: "Payment verified and registration completed",
        transactionId: registrationItem.transactionId
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
