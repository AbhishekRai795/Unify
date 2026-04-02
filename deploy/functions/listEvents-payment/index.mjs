// listEvents-payment.mjs
// Lambda function to list all live events for students
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";

const dynamoClient = new DynamoDBClient({ region: "ap-south-1" });
const docClient = DynamoDBDocumentClient.from(dynamoClient);

const EVENTS_TABLE = process.env.EVENTS_TABLE || "ChapterEvents";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*", // Broad CORS for public listing
  "Access-Control-Allow-Headers": "Content-Type,Authorization",
  "Access-Control-Allow-Methods": "GET,OPTIONS"
};

export const handler = async (event) => {
  console.log("List events request received");

  try {
    // Scan events table for live events
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
    const events = (response.Items || []).map(item => ({
      ...item,
      id: item.eventId,   // Standardized id
      eventId: item.eventId // Keep eventId for compatibility
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
    console.error("❌ Error listing events:", error);
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
