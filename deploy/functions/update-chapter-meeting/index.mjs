import { google } from "googleapis";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, UpdateCommand, QueryCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import { getGoogleCredentials } from "./google-utils.mjs";

const client = new DynamoDBClient({ region: "ap-south-1" });
const docClient = DynamoDBDocumentClient.from(client);

export const handler = async (event) => {
  console.log("=== Update Chapter Meeting ===");
  
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH"
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
      return { statusCode: 400, headers, body: JSON.stringify({ message: "Missing chapterId or meetingId in path" }) };
    }

    let body;
    try {
      body = JSON.parse(event.body);
    } catch {
      return { statusCode: 400, headers, body: JSON.stringify({ message: "Invalid JSON body" }) };
    }

    const { title, description, startDateTime, endDateTime, eventId, sendInvites } = body;

    // 1. Get existing meeting to find googleEventId
    const existingResult = await docClient.send(new GetCommand({
      TableName: process.env.MEETINGS_TABLE || "ChapterMeetings",
      Key: { chapterId, meetingId }
    }));

    if (!existingResult.Item) {
      return { statusCode: 404, headers, body: JSON.stringify({ message: "Meeting not found" }) };
    }

    const meeting = existingResult.Item;

    // 2. Prepare Attendee List & Students to Notify
    let attendees = [];
    let studentsToNotify = [];
    const audienceChanged = (eventId !== undefined && eventId !== meeting.eventId);
    const dateChanged = (startDateTime && startDateTime !== meeting.startDateTime) || (endDateTime && endDateTime !== meeting.endDateTime);
    const detailsChanged = dateChanged || (title && title !== meeting.title);

    if (sendInvites || audienceChanged || detailsChanged) {
      const targetEventId = eventId !== undefined ? eventId : meeting.eventId;

      try {
        if (targetEventId) {
          const registrations = await docClient.send(new QueryCommand({
            TableName: process.env.EVENT_REG_TABLE || "EventRegistrationRequests",
            IndexName: "EventIdIndex",
            KeyConditionExpression: "eventId = :eventId",
            ExpressionAttributeValues: { ":eventId": targetEventId }
          }));
          
          if (registrations.Items) {
            studentsToNotify = registrations.Items
              .filter(reg => {
                const status = (reg.status || "").toLowerCase();
                const payment = (reg.paymentStatus || "").toUpperCase();
                return status === 'approved' || payment === 'COMPLETED' || payment === 'FREE' || payment === 'NA';
              })
              .map(reg => ({ userId: String(reg.userId || ""), email: reg.studentEmail || reg.email }));
          }
        } else {
          const registrations = await docClient.send(new QueryCommand({
            TableName: process.env.REGISTRATION_TABLE || "ChapterPayments",
            KeyConditionExpression: "chapterId = :id",
            ExpressionAttributeValues: { ":id": chapterId }
          }));
          
          if (registrations.Items) {
            studentsToNotify = registrations.Items
              .filter(reg => {
                const status = (reg.status || "").toLowerCase();
                const payment = (reg.paymentStatus || "").toUpperCase();
                return payment === 'COMPLETED' || payment === 'FREE' || status === 'active' || status === 'approved';
              })
              .map(reg => ({ userId: String(reg.userId || reg.sapId || ""), email: reg.studentEmail || reg.email }));
          }
        }
        attendees = studentsToNotify.filter(s => s.email).map(s => ({ email: s.email }));
      } catch (err) {
        console.error("Error recalculating audience:", err);
      }
    }

    // 3. Get refresh token for the user
    const tokenResult = await docClient.send(new GetCommand({
      TableName: process.env.TOKENS_TABLE || "GoogleOAuthTokens",
      Key: { userId }
    }));

    if (!tokenResult.Item || !tokenResult.Item.refreshToken) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ message: "Google account not connected." }),
      };
    }

    const { client_id, client_secret } = await getGoogleCredentials();
    const oauth2Client = new google.auth.OAuth2(client_id, client_secret);
    oauth2Client.setCredentials({
      refresh_token: tokenResult.Item.refreshToken
    });

    const calendar = google.calendar({ version: "v3", auth: oauth2Client });

    // 4. Update Google Calendar Event
    let meetLink = meeting.meetLink;
    if (meeting.googleEventId) {
      try {
        const patchResource = {
          summary: title || meeting.title,
          description: description || meeting.description,
          start: {
            dateTime: startDateTime || meeting.startDateTime,
            timeZone: "UTC",
          },
          end: {
            dateTime: endDateTime || meeting.endDateTime,
            timeZone: "UTC",
          }
        };

        if (attendees.length > 0) {
          patchResource.attendees = attendees;
        }

        const gResponse = await calendar.events.patch({
          calendarId: "primary",
          eventId: meeting.googleEventId,
          resource: patchResource,
          sendUpdates: (sendInvites || audienceChanged) ? "all" : "none",
        });
        
        const gEvent = gResponse.data;
        meetLink = gEvent.conferenceData?.entryPoints?.find(ep => ep.entryPointType === "video")?.uri || gEvent.htmlLink || meetLink;
      } catch (gError) {
        console.warn("Google Calendar event update failed:", gError.message);
      }
    }

    // 5. Update DynamoDB record
    const updateExpr = "SET title = :t, description = :d, startDateTime = :s, endDateTime = :e, eventId = :ev, meetLink = :ml, updatedAt = :u";
    const attrValues = {
      ":t": title || meeting.title,
      ":d": description || meeting.description,
      ":s": startDateTime || meeting.startDateTime,
      ":e": endDateTime || meeting.endDateTime,
      ":ev": eventId !== undefined ? eventId : meeting.eventId,
      ":ml": meetLink,
      ":u": new Date().toISOString()
    };

    await docClient.send(new UpdateCommand({
      TableName: process.env.MEETINGS_TABLE || "ChapterMeetings",
      Key: { chapterId, meetingId },
      UpdateExpression: updateExpr,
      ExpressionAttributeValues: attrValues,
      ReturnValues: "ALL_NEW"
    }));

    // 6. Dispatch Notifications if details changed
    if (detailsChanged && studentsToNotify.length > 0) {
      const msgSuffix = `for ${new Date(startDateTime || meeting.startDateTime).toLocaleString('en-GB', { timeZone: 'Asia/Kolkata' })}.`;
      const notificationPromises = studentsToNotify.map(student => {
        if (!student.userId) return Promise.resolve();
        
        // Save to UnifyNotifications
        const p1 = docClient.send(new PutCommand({
          TableName: process.env.NOTIFICATIONS_TABLE || "UnifyNotifications",
          Item: {
            userId: student.userId,
            notificationId: `update-${meetingId}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            type: "meeting",
            title: `Meeting Updated: ${title || meeting.title}`,
            message: `The meeting details have been updated ${msgSuffix}`,
            link: meetLink,
            isRead: false,
            createdAt: new Date().toISOString()
          }
        }));

        // Save to Activities table
        const p2 = docClient.send(new PutCommand({
          TableName: process.env.ACTIVITIES_TABLE || "Activities",
          Item: {
            activityId: `act-update-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            userId: student.userId,
            chapterId: chapterId,
            type: "meeting_updated",
            message: `Meeting updated: ${title || meeting.title} ${msgSuffix}`,
            timestamp: new Date().toISOString(),
            metadata: { meetingId, meetLink }
          }
        })).catch(err => console.warn(`Failed activity log for ${student.userId}:`, err.message));

        return Promise.all([p1, p2]).catch(err => console.error(`Failed to notify user ${student.userId}:`, err));
      });
      
      await Promise.all(notificationPromises.slice(0, 50)); 
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: "Meeting updated successfully",
        meeting: { ...meeting, ...body, meetLink }
      }),
    };
  } catch (error) {
    console.error("Error updating meeting:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ message: "Failed to update meeting", error: error.message }),
    };
  }
};
