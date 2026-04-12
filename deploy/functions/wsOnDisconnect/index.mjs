// wsOnDisconnect/index.mjs
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, DeleteCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const TABLE_NAME = process.env.WebSocketConnectionsTable || "WebSocketConnections";

export const handler = async (event) => {
  const connectionId = event.requestContext.connectionId;
  try {
    await docClient.send(new DeleteCommand({
      TableName: TABLE_NAME,
      Key: { connectionId }
    }));
    return { statusCode: 200, body: "Disconnected" };
  } catch (error) {
    console.error("Error deleting connection:", error);
    return { statusCode: 500, body: "Failed to disconnect" };
  }
};
