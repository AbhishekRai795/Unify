import { DynamoDBClient, UpdateItemCommand } from "@aws-sdk/client-dynamodb";

const dynamo = new DynamoDBClient({ region: "your-region" });
const TABLE_NAME = "chapters";

export const handler = async (event) => {
  const { chapterName, newStatus } = JSON.parse(event.body); // newStatus = "open" or "closed"

  const params = {
    TableName: TABLE_NAME,
    Key: {
      name: { S: chapterName }
    },
    UpdateExpression: "SET registrationStatus = :status",
    ExpressionAttributeValues: {
      ":status": { S: newStatus }
    }
  };

  try {
    await dynamo.send(new UpdateItemCommand(params));
    return {
      statusCode: 200,
      body: JSON.stringify({ message: `Chapter ${chapterName} status updated to ${newStatus}` })
    };
  } catch (err) {
    console.error("Error updating status:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Failed to update registration status" })
    };
  }
};
