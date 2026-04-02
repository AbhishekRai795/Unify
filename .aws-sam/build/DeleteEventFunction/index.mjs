// deleteEvent-payment.mjs
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, UpdateCommand, GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";

const dynamoClient = new DynamoDBClient({ region: "ap-south-1" });
const docClient = DynamoDBDocumentClient.from(dynamoClient);

const EVENTS_TABLE = process.env.EVENTS_TABLE || "ChapterEvents";

const corsHeaders = {
  "Access-Control-Allow-Origin": process.env.ALLOWED_ORIGIN || "*",
  "Access-Control-Allow-Headers": "Content-Type,Authorization",
  "Access-Control-Allow-Methods": "DELETE,OPTIONS"
};

export const handler = async (event) => {
  console.log("Delete event received:", JSON.stringify(event, null, 2));

  try {
    const { chapterId, eventId } = event.pathParameters;

    // Check if event exists
    const existing = await docClient.send(new GetCommand({
      TableName: EVENTS_TABLE,
      Key: { chapterId, eventId }
    }));

    if (!existing.Item) {
      return {
        statusCode: 404,
        headers: corsHeaders,
        body: JSON.stringify({ error: "Event not found" })
      };
    }

    // Soft delete by setting isLive = false
    await docClient.send(new UpdateCommand({
      TableName: EVENTS_TABLE,
      Key: { chapterId, eventId },
      UpdateExpression: "SET isLive = :false, updatedAt = :u",
      ExpressionAttributeValues: {
        ":false": false,
        ":u": new Date().toISOString()
      }
    }));
    
    // Create activity record
    const activityId = `activity-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    await docClient.send(new PutCommand({
      TableName: "Activities",
      Item: {
        activityId,
        chapterId,
        type: 'event_deleted',
        message: `Event "${existing.Item.title}" was deleted by chapter head`,
        timestamp: new Date().toISOString(),
        metadata: { eventId, title: existing.Item.title }
      }
    }));

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ success: true, message: "Event deleted successfully" })
    };
  } catch (error) {
    console.error("Error deleting event:", error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: "Internal server error", details: error.message })
    };
  }
};
