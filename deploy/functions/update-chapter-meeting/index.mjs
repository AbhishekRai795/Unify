import { google } from "googleapis";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { getGoogleCredentials } from "./google-utils.mjs";

const client = new DynamoDBClient({ region: "ap-south-1" });
const docClient = DynamoDBDocumentClient.from(client);

export const handler = async (event) => {
  console.log("=== Update Chapter Meeting ===");
  
  try {
    const userId = event.requestContext.authorizer?.jwt?.claims?.sub;
    if (!userId) {
      return { statusCode: 401, body: JSON.stringify({ message: "Unauthorized" }) };
    }

    const { chapterId, meetingId } = event.pathParameters || {};
    if (!chapterId || !meetingId) {
      return { statusCode: 400, body: JSON.stringify({ message: "Missing chapterId or meetingId in path" }) };
    }

    let body;
    try {
      body = JSON.parse(event.body);
    } catch {
      return { statusCode: 400, body: JSON.stringify({ message: "Invalid JSON body" }) };
    }

    const { title, description, startDateTime, endDateTime } = body;

    // 1. Get existing meeting to find googleEventId
    const existingResult = await docClient.send(new GetCommand({
      TableName: process.env.MEETINGS_TABLE || "ChapterMeetings",
      Key: { chapterId, meetingId }
    }));

    if (!existingResult.Item) {
      return { statusCode: 404, body: JSON.stringify({ message: "Meeting not found" }) };
    }

    const meeting = existingResult.Item;

    // 2. Get refresh token for the user
    const tokenResult = await docClient.send(new GetCommand({
      TableName: process.env.TOKENS_TABLE || "GoogleOAuthTokens",
      Key: { userId }
    }));

    if (!tokenResult.Item || !tokenResult.Item.refreshToken) {
      return {
        statusCode: 403,
        body: JSON.stringify({ message: "Google account not connected." }),
      };
    }

    const { client_id, client_secret } = await getGoogleCredentials();
    const oauth2Client = new google.auth.OAuth2(client_id, client_secret);
    oauth2Client.setCredentials({
      refresh_token: tokenResult.Item.refreshToken
    });

    const calendar = google.calendar({ version: "v3", auth: oauth2Client });

    // 3. Update Google Calendar Event
    if (meeting.googleEventId) {
      try {
        await calendar.events.patch({
          calendarId: "primary",
          eventId: meeting.googleEventId,
          resource: {
            summary: title || meeting.title,
            description: description || meeting.description,
            start: {
              dateTime: startDateTime || meeting.startDateTime,
              timeZone: "UTC",
            },
            end: {
              dateTime: endDateTime || meeting.endDateTime,
              timeZone: "UTC",
            },
          },
        });
      } catch (gError) {
        console.warn("Google Calendar event update failed:", gError.message);
        // We continue anyway to update our record, but warn
      }
    }

    // 4. Update DynamoDB record
    const updateExpr = "SET title = :t, description = :d, startDateTime = :s, endDateTime = :e, updatedAt = :u";
    const attrValues = {
      ":t": title || meeting.title,
      ":d": description || meeting.description,
      ":s": startDateTime || meeting.startDateTime,
      ":e": endDateTime || meeting.endDateTime,
      ":u": new Date().toISOString()
    };

    await docClient.send(new UpdateCommand({
      TableName: process.env.MEETINGS_TABLE || "ChapterMeetings",
      Key: { chapterId, meetingId },
      UpdateExpression: updateExpr,
      ExpressionAttributeValues: attrValues,
      ReturnValues: "ALL_NEW"
    }));

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
      body: JSON.stringify({
        message: "Meeting updated successfully",
        meeting: { ...meeting, ...body }
      }),
    };
  } catch (error) {
    console.error("Error updating meeting:", error);
    return {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
      body: JSON.stringify({ message: "Failed to update meeting", error: error.message }),
    };
  }
};
