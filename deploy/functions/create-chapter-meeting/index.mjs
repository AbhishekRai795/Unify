import { google } from "googleapis";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, PutCommand, QueryCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { getGoogleCredentials } from "./google-utils.mjs";

const client = new DynamoDBClient({ region: "ap-south-1" });
const docClient = DynamoDBDocumentClient.from(client);

export const handler = async (event) => {
  console.log("=== Create Chapter Meeting ===");
  
  try {
    const userId = event.requestContext.authorizer?.jwt?.claims?.sub;
    if (!userId) {
      return { statusCode: 401, body: JSON.stringify({ message: "Unauthorized" }) };
    }

    let body;
    try {
      body = JSON.parse(event.body);
    } catch {
      return { statusCode: 400, body: JSON.stringify({ message: "Invalid JSON body" }) };
    }

    const { chapterId, eventId, title, description, startDateTime, endDateTime, sendInvites } = body;

    if (!chapterId || !title || !startDateTime || !endDateTime) {
      return { statusCode: 400, body: JSON.stringify({ message: "Missing required fields" }) };
    }

    // 1. Get refresh token for the user
    const tokenResult = await docClient.send(new GetCommand({
      TableName: process.env.TOKENS_TABLE || "GoogleOAuthTokens",
      Key: { userId }
    }));

    if (!tokenResult.Item || !tokenResult.Item.refreshToken) {
      return {
        statusCode: 403,
        body: JSON.stringify({ message: "Google account not connected. Please connect your Google account first." }),
      };
    }

    const { client_id, client_secret } = await getGoogleCredentials();
    const oauth2Client = new google.auth.OAuth2(client_id, client_secret);
    oauth2Client.setCredentials({
      refresh_token: tokenResult.Item.refreshToken
    });

    const calendar = google.calendar({ version: "v3", auth: oauth2Client });

    // 2. Prepare Attendee List & System Notifications
    let attendees = [];
    let studentsToNotify = [];

    try {
      console.log(`Audience search: eventId=${eventId || 'none'}, chapterId=${chapterId}`);
      if (eventId) {
        // Fetch all students registered for this EVENT
        const registrations = await docClient.send(new QueryCommand({
          TableName: process.env.EVENT_REG_TABLE || "EventRegistrationRequests",
          IndexName: "EventIdIndex",
          KeyConditionExpression: "eventId = :eventId",
          ExpressionAttributeValues: { ":eventId": eventId }
        }));
        
        if (registrations.Items) {
          studentsToNotify = registrations.Items
            .filter(reg => {
              const status = (reg.status || "").toLowerCase();
              const payment = (reg.paymentStatus || "").toUpperCase();
              return status === 'approved' || payment === 'COMPLETED' || payment === 'FREE' || payment === 'NA';
            })
            .map(reg => ({ 
              userId: String(reg.userId || ""), 
              email: reg.studentEmail || reg.email 
            }));
        }
      } else {
        // Fetch all students registered for this CHAPTER (from ChapterPayments table)
        // ChapterPayments HASH key is chapterId
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
              // In ChapterPayments, we want COMPLETED or FREE
              return payment === 'COMPLETED' || payment === 'FREE' || status === 'active' || status === 'approved';
            })
            .map(reg => ({ 
              userId: String(reg.userId || reg.studentSapId || reg.sapId || ""), 
              email: reg.studentEmail || reg.email 
            }));
        }
      }
      
      attendees = studentsToNotify
        .filter(s => s.email)
        .map(s => ({ email: s.email }));

      console.log(`Audience search complete. Found ${studentsToNotify.length} students. Valid emails for Google Invites: ${attendees.length}`);
    } catch (regError) {
      console.error("Critical error fetching students for audience:", regError);
    }

    // 3. Create Google Calendar Event with Meet
    const eventResource = {
      summary: `${eventId ? '[Event] ' : '[Chapter] '}${title}`,
      description: description || "Scheduled via Unify",
      start: {
        dateTime: startDateTime,
        timeZone: "UTC",
      },
      end: {
        dateTime: endDateTime,
        timeZone: "UTC",
      },
      conferenceData: {
        createRequest: {
          requestId: `unify-${Date.now()}`,
          conferenceSolutionKey: { type: "hangoutsMeet" },
        },
      },
      attendees: sendInvites && attendees.length > 0 ? attendees : undefined,
    };

    const gResponse = await calendar.events.insert({
      calendarId: "primary",
      resource: eventResource,
      conferenceDataVersion: 1,
      sendUpdates: sendInvites ? "all" : "none",
    });

    const gEvent = gResponse.data;
    console.log("Google Event Created:", gEvent.id);
    console.log("Invitations Requested:", sendInvites);
    console.log("Attendees Sent:", JSON.stringify(attendees));
    console.log("Google Event Attendees from Response:", JSON.stringify(gEvent.attendees || []));
    const meetLink = gEvent.conferenceData?.entryPoints?.find(ep => ep.entryPointType === "video")?.uri;

    // 4. Save to ChapterMeetings table
    const meetingId = `meet-${Date.now()}`;
    const meetingItem = {
      chapterId,
      meetingId,
      eventId: eventId || null,
      title,
      description,
      startDateTime,
      endDateTime,
      meetLink: meetLink || gEvent.htmlLink,
      googleEventId: gEvent.id,
      createdBy: userId,
      inviteSent: !!sendInvites,
      createdAt: new Date().toISOString()
    };

    await docClient.send(new PutCommand({
      TableName: process.env.MEETINGS_TABLE || "ChapterMeetings",
      Item: meetingItem
    }));

    // 5. Dispatch System Notifications & Activities
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH"
    };

    if (studentsToNotify.length > 0) {
      const msgSuffix = `for ${new Date(startDateTime).toLocaleString()}.`;
      const notificationPromises = studentsToNotify.map(student => {
        if (!student.userId) return Promise.resolve();
        
        // Save to UnifyNotifications
        const p1 = docClient.send(new PutCommand({
          TableName: process.env.NOTIFICATIONS_TABLE || "UnifyNotifications",
          Item: {
            userId: student.userId,
            notificationId: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            type: "meeting",
            title: `New Meeting: ${title}`,
            message: `A new ${eventId ? 'event' : 'chapter'} meeting has been scheduled ${msgSuffix}`,
            link: meetLink || gEvent.htmlLink,
            isRead: false,
            createdAt: new Date().toISOString()
          }
        }));

        // Save to Activities table
        const p2 = docClient.send(new PutCommand({
          TableName: process.env.ACTIVITIES_TABLE || "Activities",
          Item: {
            activityId: `act-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            userId: student.userId,
            chapterId: chapterId,
            type: "meeting_scheduled",
            message: `Meeting scheduled: ${title} ${msgSuffix}`,
            timestamp: new Date().toISOString(),
            metadata: { meetingId, meetLink: meetLink || gEvent.htmlLink }
          }
        })).catch(err => console.warn(`Failed activity log for ${student.userId}:`, err.message));

        return Promise.all([p1, p2]).catch(err => console.error(`Failed to notify user ${student.userId}:`, err));
      });
      
      await Promise.all(notificationPromises.slice(0, 50)); 
    }

    return {
      statusCode: 201,
      headers: corsHeaders,
      body: JSON.stringify({
        message: "Meeting scheduled successfully",
        meeting: meetingItem,
        notificationsSent: studentsToNotify.length
      }),
    };
  } catch (error) {
    console.error("Error creating Google Meet:", error);
    return {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH"
      },
      body: JSON.stringify({ message: "Failed to create meeting", error: error.message }),
    };
  }
};
