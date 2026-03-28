import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";

const REGION = "ap-south-1";
const TABLE_NAME = "ChapterHead";

const dynamo   = new DynamoDBClient({ region: REGION });
const docClient = DynamoDBDocumentClient.from(dynamo);

// Single place for CORS headers
const cors = {
  "Access-Control-Allow-Origin": "*",          // ← dev; lock down in prod
  "Access-Control-Allow-Headers": "Content-Type"
};

export const handler = async (event) => {
  try {
    // Parse body safely
    let bodyObj;
    try {
      bodyObj = typeof event.body === "string" ? JSON.parse(event.body) : event.body;
    } catch {
      return {
        statusCode: 400,
        headers: cors,
        body: JSON.stringify({ error: "Invalid JSON body." })
      };
    }

    const { email, chapterName } = bodyObj || {};

    if (!email || !chapterName) {
      return {
        statusCode: 400,
        headers: cors,
        body: JSON.stringify({ error: "Missing email or chapterName." })
      };
    }

    await docClient.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: {
          email,                    // Partition key
          chapter: chapterName,
          updatedAt: new Date().toISOString()
        }
      })
    );

    return {
      statusCode: 200,
      headers: cors,
      body: JSON.stringify({ message: "Chapter head profile updated." })
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: cors,
      body: JSON.stringify({ error: err.message })
    };
  }
};
