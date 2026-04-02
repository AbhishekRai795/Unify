// listEventRegistrationsForEvent-payment.mjs
// Lambda to list all student registrations for a given event (for chapter heads)
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";

const dynamoClient = new DynamoDBClient({ region: "ap-south-1" });
const docClient = DynamoDBDocumentClient.from(dynamoClient);

const USERS_TABLE = process.env.USERS_TABLE || "Unify-Users";

const corsHeaders = {
  "Access-Control-Allow-Origin": process.env.ALLOWED_ORIGIN || "*",
  "Access-Control-Allow-Headers": "Content-Type,Authorization",
  "Access-Control-Allow-Methods": "GET,OPTIONS"
};

export const handler = async (event) => {
  if (event.requestContext?.http?.method === "OPTIONS") {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: ""
    };
  }

  try {
    const eventId = event.queryStringParameters?.eventId;
    if (!eventId) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: "eventId is required" })
      };
    }

    // Source registrations from Unify-Users by checking attendedEvents contains eventId
    const response = await docClient.send(new ScanCommand({
      TableName: USERS_TABLE,
      FilterExpression: "contains(attendedEvents, :eventId)",
      ExpressionAttributeValues: { ":eventId": eventId }
    }));

    const registrations = response.Items || [];

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        success: true,
        registrations: registrations.map(reg => ({
          userId: reg.userId,
          studentName: reg.name || "Unknown",
          studentEmail: reg.email || "",
          paymentStatus: "REGISTERED",
          joinedAt: reg.updatedAt || reg.createdAt
        }))
      })
    };
  } catch (error) {
    console.error("❌ Error listing event registrations:", error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: "Failed to fetch registrations", details: error.message })
    };
  }
};
