// listChapterEvents-payment.mjs
// Lambda function to list all events for a specific chapter (for Chapter Heads)
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";

const dynamoClient = new DynamoDBClient({ region: "ap-south-1" });
const docClient = DynamoDBDocumentClient.from(dynamoClient);

const EVENTS_TABLE = process.env.EVENTS_TABLE || "ChapterEvents";

const corsHeaders = {
  "Access-Control-Allow-Origin": process.env.ALLOWED_ORIGIN || "*",
  "Access-Control-Allow-Headers": "Content-Type,Authorization",
  "Access-Control-Allow-Methods": "GET,OPTIONS"
};

export const handler = async (event) => {
  console.log("List chapter events request received:", JSON.stringify(event.pathParameters));

  try {
    const { chapterId } = event.pathParameters;
    
    if (!chapterId) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: "Missing chapterId in path" })
      };
    }

    // Query events table for all events in this chapter
    const response = await docClient.send(new QueryCommand({
      TableName: EVENTS_TABLE,
      KeyConditionExpression: "chapterId = :c",
      ExpressionAttributeValues: {
        ":c": chapterId
      }
    }));

    // Map property eventId to id for frontend compatibility
    // Keep eventId for older components (like EventPaymentModal)
    const events = (response.Items || []).map(item => ({
      ...item,
      id: item.eventId,   // Standardized id
      eventId: item.eventId // Keep eventId for compatibility
    }));

    // Sort by createdAt (descending)
    events.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

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
    console.error("  Error listing chapter events:", error);
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
