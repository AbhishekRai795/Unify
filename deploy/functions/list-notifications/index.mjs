import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({ region: "ap-south-1" });
const docClient = DynamoDBDocumentClient.from(client);

export const handler = async (event) => {
  console.log("=== List Notifications ===");
  
  try {
    const userId = event.requestContext.authorizer?.jwt?.claims?.sub;
    
    // Fallback logic for userId if needed (e.g. if SAP ID is used as key)
    // For student role, we might expect SAP ID in some cases, but for consistency we use sub/id.
    if (!userId) {
      return { statusCode: 401, body: JSON.stringify({ message: "Unauthorized" }) };
    }

    const result = await docClient.send(new QueryCommand({
      TableName: "UnifyNotifications",
      KeyConditionExpression: "userId = :userId",
      ExpressionAttributeValues: {
        ":userId": userId
      },
      ScanIndexForward: false // Latest first
    }));

    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH"
    };

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        notifications: result.Items || []
      }),
    };
  } catch (error) {
    console.error("Error listing notifications:", error);
    return {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH"
      },
      body: JSON.stringify({ message: "Failed to list notifications", error: error.message }),
    };
  }
};
