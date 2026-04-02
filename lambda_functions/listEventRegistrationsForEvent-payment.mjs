// listEventRegistrationsForEvent-payment.mjs
// Lambda to list all student registrations for a given event (for chapter heads)
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";

const dynamoClient = new DynamoDBClient({ region: "ap-south-1" });
const docClient = DynamoDBDocumentClient.from(dynamoClient);

const EVENT_PAYMENTS_TABLE = process.env.EVENT_PAYMENTS_TABLE || "EventPayments";

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

    // Query EventPayments table for all registrations for this event
    const response = await docClient.send(new QueryCommand({
      TableName: EVENT_PAYMENTS_TABLE,
      KeyConditionExpression: "eventId = :eventId",
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
          studentName: reg.studentName,
          studentEmail: reg.studentEmail,
          paymentStatus: reg.paymentStatus,
          joinedAt: reg.joinedAt || reg.createdAt
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
