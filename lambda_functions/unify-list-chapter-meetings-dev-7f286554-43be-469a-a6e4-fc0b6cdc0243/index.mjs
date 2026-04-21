import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({ region: "ap-south-1" });
const docClient = DynamoDBDocumentClient.from(client);

export const handler = async (event) => {
  console.log("=== List Chapter Meetings ===");
  
  try {
    const { chapterId } = event.pathParameters || {};
    
    if (!chapterId) {
      return { statusCode: 400, body: JSON.stringify({ message: "Missing chapterId path parameter" }) };
    }

    // Query all meetings for this chapter
    const result = await docClient.send(new QueryCommand({
      TableName: "ChapterMeetings",
      KeyConditionExpression: "chapterId = :chapterId",
      ExpressionAttributeValues: {
        ":chapterId": chapterId
      },
      ScanIndexForward: true // Sort by meetingId (which contains timestamp)
    }));

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
      body: JSON.stringify({
        chapterId,
        meetings: result.Items || []
      }),
    };
  } catch (error) {
    console.error("Error listing chapter meetings:", error);
    return {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
      body: JSON.stringify({ message: "Failed to list meetings", error: error.message }),
    };
  }
};
