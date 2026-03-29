// completePaymentRegistration.mjs
// Lambda function to auto-complete chapter registration after payment verification
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, UpdateCommand, PutCommand } from "@aws-sdk/lib-dynamodb";

const dynamoClient = new DynamoDBClient({ region: "ap-south-1" });
const docClient = DynamoDBDocumentClient.from(dynamoClient);

const PAYMENTS_TABLE = "ChapterPayments";
const REGISTRATION_TABLE = "RegistrationRequests";
const USERS_TABLE = "Unify-Users";
const CHAPTERS_TABLE = "Chapters";
const ACTIVITIES_TABLE = "Activities";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type,Authorization",
  "Access-Control-Allow-Methods": "POST,OPTIONS"
};

export const handler = async (event) => {
  console.log("Event received:", JSON.stringify(event, null, 2));

  if (event.requestContext?.http?.method === "OPTIONS") {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: ""
    };
  }

  try {
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

    const { transactionId, chapterId, razorpayPaymentId } = body;

    if (!transactionId || !chapterId || !razorpayPaymentId) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ 
          error: "Missing required parameters: transactionId, chapterId, razorpayPaymentId" 
        })
      };
    }

    // Get the completed payment transaction
    const transactionResponse = await docClient.send(new GetCommand({
      TableName: PAYMENTS_TABLE,
      Key: {
        chapterId,
        transactionId
      }
    }));

    if (!transactionResponse.Item) {
      return {
        statusCode: 404,
        headers: corsHeaders,
        body: JSON.stringify({ error: "Transaction not found" })
      };
    }

    const transaction = transactionResponse.Item;

    // Verify payment is completed
    if (transaction.paymentStatus !== "COMPLETED") {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ 
          error: "Payment is not in COMPLETED status",
          currentStatus: transaction.paymentStatus
        })
      };
    }

    const { userId, studentEmail, studentName, chapterId: txChapterId } = transaction;

    // Get chapter details
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

    // Get user details
    const userResponse = await docClient.send(new GetCommand({
      TableName: USERS_TABLE,
      Key: { userId }
    }));

    const user = userResponse.Item;

    // Create registration request record
    const registrationId = `REG-${chapterId}-${userId}-${Date.now()}`;
    const now = new Date().toISOString();

    const registrationRecord = {
      registrationId,
      chapterId,
      chapterName: chapter.chapterName,
      userId,
      studentName,
      studentEmail,
      sapId: user?.sapId,
      year: user?.year,
      status: "approved", // Auto-approved for paid registrations
      appliedAt: now,
      processedAt: now,
      processedBy: "PAYMENT_SYSTEM",
      notes: `Auto-approved payment registration. Payment ID: ${razorpayPaymentId}. Amount: ₹${(transaction.amount / 100).toFixed(2)}`
    };

    // Store registration record
    await docClient.send(new PutCommand({
      TableName: REGISTRATION_TABLE,
      Item: registrationRecord
    }));

    // Update user's registered chapters list (Legacy logic expects chapterName, not chapterId)
    const updatedRegisteredChapters = user?.registeredChapters ? Array.from(user.registeredChapters) : [];
    if (!updatedRegisteredChapters.includes(chapter.chapterName)) {
      updatedRegisteredChapters.push(chapter.chapterName);
    }

    await docClient.send(new UpdateCommand({
      TableName: USERS_TABLE,
      Key: { userId },
      UpdateExpression: "SET registeredChapters = :chapters, updatedAt = :timestamp",
      ExpressionAttributeValues: {
        ":chapters": updatedRegisteredChapters,
        ":timestamp": now
      }
    }));

    // Update chapter member count
    const currentMemberCount = chapter.memberCount || 0;
    await docClient.send(new UpdateCommand({
      TableName: CHAPTERS_TABLE,
      Key: { chapterId },
      UpdateExpression: "SET memberCount = :count, updatedAt = :timestamp",
      ExpressionAttributeValues: {
        ":count": currentMemberCount + 1,
        ":timestamp": now
      }
    }));

    // Mark transaction as processed
    await docClient.send(new UpdateCommand({
      TableName: PAYMENTS_TABLE,
      Key: {
        chapterId,
        transactionId
      },
      UpdateExpression: "SET registrationId = :regId, notes = :notes, updatedAt = :timestamp",
      ExpressionAttributeValues: {
        ":regId": registrationId,
        ":notes": "Registration completed after payment verification",
        ":timestamp": now
      }
    }));

    // Insert into Activities table matching the required JSON schema
    const activityId = `activity-${Date.now()}-${userId.substring(0, 8)}`;
    await docClient.send(new PutCommand({
      TableName: ACTIVITIES_TABLE,
      Item: {
        activityId,
        chapterId,
        message: `New registration request from ${studentName}`,
        metadata: {
          registrationId
        },
        timestamp: now,
        type: "registration",
        userId
      }
    }));

    console.log("✅ Payment registration completed successfully:", {
      registrationId,
      chapterId,
      userId,
      paymentId: razorpayPaymentId,
      studentEmail
    });

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        success: true,
        message: "Registration completed successfully after payment",
        registrationId,
        chapterId,
        chapterName: chapter.chapterName,
        studentName,
        studentEmail,
        status: "approved",
        registrationDate: now
      })
    };
  } catch (error) {
    console.error("❌ Error in completePaymentRegistration:", error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ 
        error: "Failed to complete registration",
        details: error.message 
      })
    };
  }
};
