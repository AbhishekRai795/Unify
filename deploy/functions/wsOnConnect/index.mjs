// wsOnConnect/index.mjs
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const TABLE_NAME = process.env.WebSocketConnectionsTable || "WebSocketConnections";

export const handler = async (event) => {
  console.log("Connect event:", JSON.stringify(event, null, 2));
  const connectionId = event.requestContext.connectionId;
  const userId = event.queryStringParameters?.userId;

  if (!userId) {
    return { statusCode: 400, body: "userId query parameter is required" };
  }

  try {
    await docClient.send(new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        connectionId,
        userId,
        connectedAt: new Date().toISOString()
      }
    }));
    return { statusCode: 200, body: "Connected" };
  } catch (error) {
    console.error("Error storing connection:", error);
    return { statusCode: 500, body: "Failed to connect" };
  }
};
