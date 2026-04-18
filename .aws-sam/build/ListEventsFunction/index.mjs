// listEvents-payment.mjs
// Lambda function to list live events for the authenticated student's chapters
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";

const dynamoClient = new DynamoDBClient({ region: "ap-south-1" });
const docClient = DynamoDBDocumentClient.from(dynamoClient);

const EVENTS_TABLE = process.env.EVENTS_TABLE || "ChapterEvents";
const USERS_TABLE = process.env.USERS_TABLE || "Unify-Users";

const corsHeaders = {
  "Access-Control-Allow-Origin": process.env.ALLOWED_ORIGIN || "*",
  "Access-Control-Allow-Headers": "Content-Type,Authorization",
  "Access-Control-Allow-Methods": "GET,OPTIONS"
};

export const handler = async (event) => {
  console.log("List events request received");

  try {
    const claims = event.requestContext?.authorizer?.jwt?.claims;

    if (!claims) {
      return {
        statusCode: 401,
        headers: corsHeaders,
        body: JSON.stringify({ error: "Unauthorized" })
      };
    }

    const userEmail =
      claims.email ||
      claims["cognito:username"] ||
      claims.username ||
      claims.sub;

    if (!userEmail) {
      return {
        statusCode: 401,
        headers: corsHeaders,
        body: JSON.stringify({ error: "No user identity found in token" })
      };
    }

    const userResponse = await docClient.send(new ScanCommand({
      TableName: USERS_TABLE,
      FilterExpression: "email = :email",
      ExpressionAttributeValues: {
        ":email": userEmail
      }
    }));

    const user = userResponse.Items?.[0];
    const registeredChapters = Array.isArray(user?.registeredChapters)
      ? user.registeredChapters
      : [];
    const registeredChapterSet = new Set(
      registeredChapters
        .map((chapterName) => String(chapterName || "").trim().toLowerCase())
        .filter(Boolean)
    );

    if (registeredChapterSet.size === 0) {
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          success: true,
          count: 0,
          events: []
        })
      };
    }

    // Scan events table for live events, then keep only the student's registered chapters.
    const scanParams = {
      TableName: EVENTS_TABLE,
      FilterExpression: "isLive = :live",
      ExpressionAttributeValues: {
        ":live": true
      }
    };
    
    console.log("Scanning table:", EVENTS_TABLE, "with params:", JSON.stringify(scanParams));
    
    const response = await docClient.send(new ScanCommand(scanParams));
    console.log("Scan completed, found items:", response.Count);

    // Map property eventId to id for frontend compatibility
    // Keep eventId for older components (like EventPaymentModal)
    const events = (response.Items || [])
      .filter((item) => {
        const chapterName = String(item.chapterName || "").trim().toLowerCase();
        return registeredChapterSet.has(chapterName);
      })
      .map(item => ({
        ...item,
        id: item.eventId,
        eventId: item.eventId
      }));

    // Sort by start date (ascending)
    events.sort((a, b) => new Date(a.startDateTime) - new Date(b.startDateTime));

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        success: true,
        count: events.length,
        events
      })
    };
  } catch (error) {
    console.error("  Error listing events:", error);
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
