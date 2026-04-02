// listStudentEventRegistrations.mjs
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";

const dynamoClient = new DynamoDBClient({ region: "ap-south-1" });
const docClient = DynamoDBDocumentClient.from(dynamoClient);

const EVENT_PAYMENTS_TABLE = "EventPayments";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type,Authorization",
  "Access-Control-Allow-Methods": "GET,OPTIONS"
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
    const claims = event.requestContext?.authorizer?.jwt?.claims;
    if (!claims) {
      return {
        statusCode: 401,
        headers: corsHeaders,
        body: JSON.stringify({ error: "Unauthorized" })
      };
    }

    const userId = claims.sub;

    // Query registrations for this user from EventPaymentsTable using UserIdIndex
    const response = await docClient.send(new QueryCommand({
      TableName: EVENT_PAYMENTS_TABLE,
      IndexName: "UserIdIndex",
      KeyConditionExpression: "userId = :userId",
      ExpressionAttributeValues: {
        ":userId": userId
      }
    }));

    const registrations = response.Items || [];

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        success: true,
        registrations: registrations.map(reg => ({
          eventId: reg.eventId,
          paymentStatus: reg.paymentStatus,
          registeredAt: reg.createdAt
        }))
      })
    };

  } catch (error) {
    console.error("❌ Error listing student event registrations:", error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ 
        error: "Failed to fetch registrations",
        details: error.message 
      })
    };
  }
};
