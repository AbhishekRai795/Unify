import { google } from "googleapis";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, DeleteCommand, ScanCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import { getGoogleCredentials } from "./google-utils.mjs";

const client = new DynamoDBClient({ region: "ap-south-1" });
const docClient = DynamoDBDocumentClient.from(client);

export const handler = async (event) => {
  console.log("=== Delete Chapter Meeting ===");
  
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "DELETE, OPTIONS"
  };

  if (event.requestContext?.http?.method === 'OPTIONS') {
    return { statusCode: 200, headers };
  }

  try {
    const userId = event.requestContext.authorizer?.jwt?.claims?.sub;
    if (!userId) {
      return { statusCode: 401, headers, body: JSON.stringify({ message: "Unauthorized" }) };
    }

    const { chapterId, meetingId } = event.pathParameters || {};
    if (!chapterId || !meetingId) {
      return { statusCode: 400, headers, body: JSON.stringify({ message: "Missing params" }) };
    }

    // 1. Get meeting details
    const result = await docClient.send(new GetCommand({
      TableName: process.env.MEETINGS_TABLE || "ChapterMeetings",
      Key: { chapterId, meetingId }
    }));

    if (!result.Item) {
      return { statusCode: 404, headers, body: JSON.stringify({ message: "Meeting not found" }) };
    }

    const meeting = result.Item;

    // 2. Delete from Google Calendar if possible
    if (meeting.googleEventId) {
      try {
        const tokenResult = await docClient.send(new GetCommand({
          TableName: process.env.TOKENS_TABLE || "GoogleOAuthTokens",
          Key: { userId }
        }));

        if (tokenResult.Item?.refreshToken) {
          const { client_id, client_secret } = await getGoogleCredentials();
          const oauth2Client = new google.auth.OAuth2(client_id, client_secret);
          oauth2Client.setCredentials({ refresh_token: tokenResult.Item.refreshToken });

          const calendar = google.calendar({ version: "v3", auth: oauth2Client });
          await calendar.events.delete({
            calendarId: "primary",
            eventId: meeting.googleEventId,
            sendUpdates: "all" // Notify attendees of cancellation
          });
          console.log("Google Calendar event deleted:", meeting.googleEventId);
        }
      } catch (gError) {
        console.warn("Failed to delete Google event:", gError.message);
      }
    }

    // 3. Notify Students of Cancellation
    try {
      const registrations = await docClient.send(new ScanCommand({
        TableName: "RegistrationRequests",
        FilterExpression: "chapterId = :id OR chapterName = :id",
        ExpressionAttributeValues: { ":id": chapterId }
      }));

      if (registrations.Items) {
        const notifyPromises = registrations.Items
          .filter(reg => (reg.userId || reg.sapId) && (reg.status === 'approved' || reg.status === 'active'))
          .map(reg => {
            const studentId = String(reg.userId || reg.sapId);
            
            // Notification Tray
            const p1 = docClient.send(new PutCommand({
              TableName: "UnifyNotifications",
              Item: {
                userId: studentId,
                notificationId: `cancel-${meetingId}-${Date.now()}`,
                type: "alert",
                title: `Meeting Cancelled: ${meeting.title}`,
                message: `The meeting scheduled for ${new Date(meeting.startDateTime).toLocaleString()} has been cancelled.`,
                isRead: false,
                createdAt: new Date().toISOString()
              }
            }));

            // Activity Log
            const p2 = docClient.send(new PutCommand({
              TableName: "Activities",
              Item: {
                activityId: `act-cancel-${Date.now()}`,
                userId: studentId,
                chapterId: chapterId,
                type: "meeting_cancelled",
                message: `Meeting cancelled: ${meeting.title}`,
                timestamp: new Date().toISOString()
              }
            }));

            return Promise.all([p1, p2]);
          });
        
        await Promise.all(notifyPromises.slice(0, 50));
      }
    } catch (notifErr) {
      console.error("Notification failed during cancellation:", notifErr);
    }

    // 4. Delete from DynamoDB
    await docClient.send(new DeleteCommand({
      TableName: process.env.MEETINGS_TABLE || "ChapterMeetings",
      Key: { chapterId, meetingId }
    }));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ message: "Meeting cancelled successfully" })
    };
  } catch (error) {
    console.error("Cancellation error:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ message: "Failed to cancel meeting", error: error.message })
    };
  }
};
