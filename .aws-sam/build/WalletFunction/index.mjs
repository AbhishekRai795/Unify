import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";

const dynamoClient = new DynamoDBClient({ region: "ap-south-1" });
const docClient = DynamoDBDocumentClient.from(dynamoClient);

const WALLET_TABLE = "Wallet";
const TRANSACTIONS_TABLE = "WalletTransactions";

const getCorsHeaders = () => ({
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type,Authorization",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS"
});

export const handler = async (event) => {
  console.log("Wallet event received:", JSON.stringify(event, null, 2));

  if (event.requestContext.http.method === "OPTIONS") {
    return {
      statusCode: 200,
      headers: getCorsHeaders(),
      body: ""
    };
  }

  try {
    const method = event.requestContext.http.method;
    const rawPath = event.rawPath || event.requestContext.http.path;
    const path = rawPath.replace(/^\/dev\//, "/").replace(/^\/prod\//, "/");

    // Extract userId from Cognito claims
    const claims = event.requestContext.authorizer?.jwt?.claims || {};
    const userId = claims.sub || claims.email || claims.username;

    if (!userId) {
      return {
        statusCode: 401,
        headers: getCorsHeaders(),
        body: JSON.stringify({ error: "Unauthorized: No userId found in token" })
      };
    }

    // GET /api/wallet/balance
    if (method === "GET" && path === "/api/wallet/balance") {
      const response = await docClient.send(new GetCommand({
        TableName: WALLET_TABLE,
        Key: { userId }
      }));

      return {
        statusCode: 200,
        headers: getCorsHeaders(),
        body: JSON.stringify({
          userId,
          balance: response.Item?.balance || 0,
          lastUpdated: response.Item?.lastUpdated || null
        })
      };
    }

    // GET /api/wallet/history
    if (method === "GET" && path === "/api/wallet/history") {
      const response = await docClient.send(new QueryCommand({
        TableName: TRANSACTIONS_TABLE,
        KeyConditionExpression: "userId = :uid",
        ExpressionAttributeValues: {
          ":uid": userId
        },
        ScanIndexForward: false // Newest first
      }));

      return {
        statusCode: 200,
        headers: getCorsHeaders(),
        body: JSON.stringify({
          userId,
          transactions: response.Items || []
        })
      };
    }

    return {
      statusCode: 404,
      headers: getCorsHeaders(),
      body: JSON.stringify({ error: "Route not found" })
    };

  } catch (error) {
    console.error("Error in wallet handler:", error);
    return {
      statusCode: 500,
      headers: getCorsHeaders(),
      body: JSON.stringify({ error: "Internal server error", details: error.message })
    };
  }
};
