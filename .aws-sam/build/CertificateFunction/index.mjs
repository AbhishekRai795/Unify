import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";

const dynamoClient = new DynamoDBClient({ region: "ap-south-1" });
const docClient = DynamoDBDocumentClient.from(dynamoClient);

const CERTIFICATES_TABLE = "Certificates";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type,Authorization",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS"
};

export const handler = async (event) => {
  console.log("Certificate event received:", JSON.stringify(event, null, 2));

  // Handle OPTIONS for CORS
  if (event.requestContext.http.method === "OPTIONS") {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: ""
    };
  }

  try {
    const method = event.requestContext.http.method;
    const rawPath = event.rawPath || event.requestContext.http.path;
    console.log(`Method: ${method}, Path: ${rawPath}`);

    // Standardize path by removing stage prefix if present
    const path = rawPath.replace(/^\/dev\//, "/").replace(/^\/prod\//, "/");

    // POST /api/certificates/issue
    if (method === "POST" && path === "/api/certificates/issue") {
      const body = JSON.parse(event.body || "{}");
      const { eventId, userId, studentName, certificateType, eventName, chapterName, date } = body;

      if (!eventId || !userId || !certificateType) {
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({ error: "Missing required fields: eventId, userId, certificateType" })
        };
      }

      const item = {
        eventId,
        userId,
        studentName,
        certificateType,
        eventName,
        chapterName,
        date,
        issuedAt: new Date().toISOString()
      };

      await docClient.send(new PutCommand({
        TableName: CERTIFICATES_TABLE,
        Item: item
      }));

      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({ success: true, certificate: item })
      };
    }

    // GET /api/certificates/my
    if (method === "GET" && path === "/api/certificates/my") {
      const authHeader = event.headers.authorization || event.headers.Authorization;
      if (!authHeader) {
        return {
          statusCode: 401,
          headers: corsHeaders,
          body: JSON.stringify({ error: "Unauthorized" })
        };
      }

      // Extract userId from Cognito JWT claims
      // In HTTP API with Cognito Authorizer, the context has the claims
      const userId = event.requestContext.authorizer?.jwt?.claims?.sub;
      
      if (!userId) {
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({ error: "Could not identify user from token" })
        };
      }

      const response = await docClient.send(new QueryCommand({
        TableName: CERTIFICATES_TABLE,
        IndexName: "UserIdIndex",
        KeyConditionExpression: "userId = :uid",
        ExpressionAttributeValues: {
          ":uid": userId
        }
      }));

      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({ certificates: response.Items || [] })
      };
    }

    return {
      statusCode: 404,
      headers: corsHeaders,
      body: JSON.stringify({ error: "Route not found" })
    };

  } catch (error) {
    console.error("Error in certificate handler:", error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: "Internal server error", details: error.message })
    };
  }
};
