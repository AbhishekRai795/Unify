import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, PutCommand, DeleteCommand, QueryCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import jwt from "jsonwebtoken";

const client = new DynamoDBClient({ region: "ap-south-1" });
const docClient = DynamoDBDocumentClient.from(client);

const JWT_SECRET = process.env.JWT_SECRET || "unify-attendance-secret-2026";

async function findMeeting(meetingId) {
  console.log(`[DEBUG] findMeeting called for meetingId: ${meetingId}`);
  
  // Strip any hash or query params if accidentally passed
  const cleanId = meetingId.split('#')[0].split('?')[0];

  try {
    // We use Scan because meetingId is not the HASH key (chapterId is).
    // Note: We avoid 'Limit: 1' because DynamoDB applies Limit BEFORE filtering.
    const scanResult = await docClient.send(new ScanCommand({
      TableName: process.env.MEETINGS_TABLE,
      FilterExpression: "meetingId = :m",
      ExpressionAttributeValues: { ":m": cleanId }
    }));
    
    if (scanResult.Items && scanResult.Items.length > 0) {
      console.log(`[DEBUG] findMeeting found: ${scanResult.Items[0].title}`);
      return scanResult.Items[0];
    }
  } catch (e) {
    console.log(`[DEBUG] findMeeting scan failed: ${e.message}`);
  }

  console.log(`[DEBUG] findMeeting found nothing for: ${cleanId}`);
  return null;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Amz-Date, X-Api-Key, X-Amz-Security-Token",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
  "Access-Control-Allow-Credentials": "true"
};

export const handler = async (event) => {
  const method = event.requestContext.http.method;
  const path = event.rawPath || event.requestContext.http.path;
  const userId = event.requestContext.authorizer?.jwt?.claims?.sub;

  console.log(`[DEBUG] Method: ${method}, Path: ${path}, userId: ${userId}`);
  console.log(`[DEBUG] Proxy parameter: ${event.pathParameters?.proxy}`);

  if (method === "OPTIONS") {
    return { statusCode: 200, headers: corsHeaders };
  }

  if (!userId) {
    return { statusCode: 401, headers: corsHeaders, body: JSON.stringify({ message: "Unauthorized" }) };
  }

  // Fetch chapters for the user (needed for some operations)
  let userChapters = [];
  try {
    const chaptersResult = await docClient.send(new QueryCommand({
      TableName: "ChapterHead",
      KeyConditionExpression: "userId = :u",
      ExpressionAttributeValues: { ":u": userId }
    }));
    userChapters = chaptersResult.Items || [];
  } catch (e) {
    console.log(`[DEBUG] Failed to fetch user chapters: ${e.message}`);
  }

  try {
    // Determine which table to use
    let activeTable = process.env.ATTENDANCE_TABLE;
    let sessionIdKey = "meetingId";
    let sessionIdValue = "";

    if (path.includes("/api/attendance/meeting/")) {
      const parts = path.split("/");
      sessionIdValue = parts[parts.indexOf("meeting") + 1];
    } else if (path.includes("/api/attendance/event/")) {
      activeTable = process.env.EVENT_ATTENDANCE_TABLE;
      sessionIdKey = "eventId";
      const parts = path.split("/");
      sessionIdValue = parts[parts.indexOf("event") + 1];
    }

    // 1. Generate Token (Chapter Head)
    if (method === "POST" && path.includes("/api/attendance/token")) {
      if (!event.body) {
         return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ message: "Missing request body" }) };
      }
      const { meetingId, eventId, location, useLocation } = JSON.parse(event.body);
      const id = meetingId || eventId;
      const isEvent = !!eventId;

      console.log(`[ATTENDANCE] Token request - isEvent: ${isEvent}, id: ${id}`);

      let session = isEvent ? { eventId: id, title: "Event Session" } : await findMeeting(id);

      // Fallback for ad-hoc sessions that might not be in the table yet or were purged
      if (!session && !isEvent && id.startsWith("meet-")) {
        console.log(`[ATTENDANCE] Session not found but starts with meet-, using fallback for ID: ${id}`);
        session = { meetingId: id, title: "Ad-hoc Session", startDateTime: new Date().toISOString() };
      }

      if (!session && !isEvent) {
        console.log(`[ATTENDANCE] Session truly not found for ID: ${id}`);
        return { statusCode: 404, headers: corsHeaders, body: JSON.stringify({ message: `Meeting session not found for ID: ${id}` }) };
      }

      const tokenPayload = {
        sessionId: id,
        type: isEvent ? "event" : "meeting",
        useLocation,
        location,
        exp: Math.floor(Date.now() / 1000) + 3600, // Increased to 1 hour for better UX
        iat: Math.floor(Date.now() / 1000)
      };

      const token = jwt.sign(tokenPayload, JWT_SECRET);
      return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ token }) };
    }

    // 2. Mark Attendance (Student)
    if (method === "POST" && path.includes("/api/attendance/mark")) {
      if (!event.body) {
         return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ message: "Missing request body" }) };
      }
      const { token, location, deviceId } = JSON.parse(event.body);

      let decoded;
      try {
        decoded = jwt.verify(token, JWT_SECRET);
      } catch (e) {
        return { statusCode: 401, headers: corsHeaders, body: JSON.stringify({ message: "Invalid or expired token" }) };
      }

      const { sessionId, type, location: reqLoc, useLocation: reqUseLoc } = decoded;
      
      console.log(`[ATTENDANCE] Marking attendance - type: ${type}, id: ${sessionId}, user: ${userId}`);

      // ELIGIBILITY CHECK
      try {
        // 1. Fetch session/meeting info to get eventId and chapterId
        let session = type === "event" ? { eventId: sessionId, title: "Event Session" } : await findMeeting(sessionId);
        if (!session && type === "meeting" && sessionId.startsWith("meet-")) {
           session = { meetingId: sessionId, title: "Ad-hoc Session", chapterId: "" }; // Ad-hoc fallback
        }

        if (!session) {
          return { statusCode: 404, headers: corsHeaders, body: JSON.stringify({ message: "Session not found" }) };
        }

        // 2. Determine eligibility source
        let isEligible = false;
        const targetEventId = type === "event" ? sessionId : session.eventId;
        
        if (targetEventId && targetEventId !== "null" && targetEventId !== "") {
          console.log(`[DEBUG] Validating against EventPayments for event: ${targetEventId}`);
          const regs = await docClient.send(new QueryCommand({
            TableName: process.env.EVENT_PAYMENTS_TABLE || "EventPayments",
            KeyConditionExpression: "eventId = :e AND userId = :u",
            ExpressionAttributeValues: { ":e": targetEventId, ":u": userId }
          }));
          isEligible = (regs.Items || []).some(r => 
            r.paymentStatus === "COMPLETED" || r.paymentStatus === "SUCCESS" || 
            r.status === "SUCCESS" || r.status === "APPROVED" || r.status === "COMPLETED"
          );
        } else if (session.chapterId) {
          console.log(`[DEBUG] Validating against ChapterPayments for chapter: ${session.chapterId}`);
          const regs = await docClient.send(new QueryCommand({
            TableName: process.env.REGISTRATION_TABLE || "ChapterPayments",
            KeyConditionExpression: "chapterId = :c",
            FilterExpression: "userId = :u",
            ExpressionAttributeValues: { ":c": session.chapterId, ":u": userId }
          }));
          isEligible = (regs.Items || []).some(r => 
            r.status === "SUCCESS" || r.status === "APPROVED" || r.status === "COMPLETED" ||
            r.paymentStatus === "SUCCESS" || r.paymentStatus === "COMPLETED"
          );
        } else {
          // If it's a meeting with no chapterId and no eventId, we can't validate (shouldn't happen with valid sessions)
          console.log(`[DEBUG] No chapterId or eventId found for session validation`);
          isEligible = true; 
        }

        if (!isEligible) {
          console.log(`[ATTENDANCE] Blocking ineligible user: ${userId} for session: ${sessionId}`);
          return { 
            statusCode: 403, 
            headers: corsHeaders, 
            body: JSON.stringify({ message: "Unauthorized: You are not registered for this session/event" }) 
          };
        }
      } catch (err) {
        console.error(`[ATTENDANCE] Eligibility check failed: ${err.message}`);
        // In case of system error during check, we might want to fail-closed or fail-open.
        // Failing closed (blocking) for security.
        return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ message: "Error validating eligibility" }) };
      }

      // Verify location if required
      if (reqUseLoc && reqLoc && location) {
        const dist = Math.sqrt(Math.pow(location.lat - reqLoc.lat, 2) + Math.pow(location.lng - reqLoc.lng, 2)) * 111320; 
        if (dist > 150) {
          return { statusCode: 403, headers: corsHeaders, body: JSON.stringify({ message: "You must be at the location to mark attendance" }) };
        }
      }

      const targetTable = type === "event" ? process.env.EVENT_ATTENDANCE_TABLE : process.env.ATTENDANCE_TABLE;
      const idKey = type === "event" ? "eventId" : "meetingId";

      await docClient.send(new PutCommand({
        TableName: targetTable,
        Item: {
          [idKey]: sessionId,
          userId,
          timestamp: new Date().toISOString(),
          method: "QR",
          deviceId
        }
      }));

      return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ message: "Attendance marked successfully" }) };
    }

    // 3. Session Management (GET/PUT/DELETE)
    if (path.includes("/api/attendance/meeting/") || path.includes("/api/attendance/event/")) {
      const isEvent = path.includes("/api/attendance/event/");
      const targetTable = isEvent ? process.env.EVENT_ATTENDANCE_TABLE : process.env.ATTENDANCE_TABLE;
      const idKey = isEvent ? "eventId" : "meetingId";
      
      const parts = path.split("/");
      const typeKey = isEvent ? "event" : "meeting";
      const idValue = decodeURIComponent(parts[parts.indexOf(typeKey) + 1]);

      // List Attendance (GET)
      if (method === "GET" && !path.includes("/user/")) {
        const attendance = await docClient.send(new QueryCommand({
          TableName: targetTable,
          KeyConditionExpression: `${idKey} = :id`,
          ExpressionAttributeValues: { ":id": idValue }
        }));

        // Enrich with user info
        const enriched = await Promise.all((attendance.Items || []).map(async (record) => {
          try {
            const userResult = await docClient.send(new GetCommand({
              TableName: process.env.USERS_TABLE,
              Key: { userId: record.userId }
            }));
            return { ...record, user: userResult.Item || { name: "Unknown Student", sapId: "N/A" } };
          } catch (e) {
            return { ...record, user: { name: "Unknown Student", sapId: "N/A" } };
          }
        }));

        const session = isEvent ? { eventId: idValue, title: "Event Session" } : await findMeeting(idValue);

        // If it's an event, try to fetch actual event details for the title
        if (isEvent) {
          try {
             // Search in Events table
             const eventRes = await docClient.send(new QueryCommand({
               TableName: process.env.EVENTS_TABLE || "Events",
               IndexName: "EventIdIndex",
               KeyConditionExpression: "eventId = :e",
               ExpressionAttributeValues: { ":e": idValue }
             }));
             if (eventRes.Items && eventRes.Items.length > 0) {
               session.title = eventRes.Items[0].title;
               session.chapterId = eventRes.Items[0].chapterId;
             } else {
               // Fallback: try direct Get if eventId is a simple key (though usually it's composite)
               // or use the title from the URL if possible, but for now we'll stick to a scan if query fails
               const scanRes = await docClient.send(new ScanCommand({
                 TableName: process.env.EVENTS_TABLE || "Events",
                 FilterExpression: "eventId = :e",
                 ExpressionAttributeValues: { ":e": idValue },
                 Limit: 1
               }));
               if (scanRes.Items && scanRes.Items.length > 0) {
                 session.title = scanRes.Items[0].title;
                 session.chapterId = scanRes.Items[0].chapterId;
               }
             }
          } catch (e) {
            console.log(`[DEBUG] Failed to fetch event details: ${e.message}`);
          }
        }

        let eligibleStudents = [];
        if (session) {
          try {
            const targetEventId = isEvent ? idValue : session.eventId;
            
            let foundEventRegs = false;
            if (targetEventId && targetEventId !== "null" && targetEventId !== "") {
              console.log(`[DEBUG] Roster Mode: EVENT (${targetEventId})`);
              const regs = await docClient.send(new QueryCommand({
                TableName: process.env.EVENT_PAYMENTS_TABLE || "EventPayments",
                KeyConditionExpression: "eventId = :e",
                ExpressionAttributeValues: { ":e": targetEventId }
              }));
              
              const paidRegs = (regs.Items || []).filter(r => 
                r.paymentStatus === "COMPLETED" || r.paymentStatus === "SUCCESS" || 
                r.status === "SUCCESS" || r.status === "APPROVED" || r.status === "COMPLETED"
              );

              // If event-linked, we ONLY show event registrations (strict mode as per user request)
              foundEventRegs = true; 
              
              // Enrich with user info from Users table
              eligibleStudents = await Promise.all(paidRegs.map(async (r) => {
                try {
                  const userRes = await docClient.send(new GetCommand({
                    TableName: process.env.USERS_TABLE || "Users",
                    Key: { userId: r.userId }
                  }));
                  const u = userRes.Item || {};
                  return {
                    userId: r.userId,
                    name: u.name || r.studentName || r.name || "Unknown Student",
                    sapId: u.sapId || r.studentSapId || r.sapId || "N/A"
                  };
                } catch (e) {
                  return { userId: r.userId, name: "Unknown Student", sapId: "N/A" };
                }
              }));
            }
            
            // Fallback to chapter members if no event registrations found, OR if not an event-linked meeting
            if (!foundEventRegs && session.chapterId) {
              console.log(`[DEBUG] Roster Mode: CHAPTER (${session.chapterId}) [Fallback: ${!foundEventRegs}]`);
              const regs = await docClient.send(new QueryCommand({
                TableName: process.env.REGISTRATION_TABLE || "ChapterPayments",
                KeyConditionExpression: "chapterId = :c",
                ExpressionAttributeValues: { ":c": session.chapterId }
              }));
              const paidRegs = (regs.Items || []).filter(r => 
                r.status === "SUCCESS" || r.status === "APPROVED" || r.status === "COMPLETED" ||
                r.paymentStatus === "SUCCESS" || r.paymentStatus === "COMPLETED"
              );

              eligibleStudents = await Promise.all(paidRegs.map(async (r) => {
                try {
                  const userRes = await docClient.send(new GetCommand({
                    TableName: process.env.USERS_TABLE || "Users",
                    Key: { userId: r.userId }
                  }));
                  const u = userRes.Item || {};
                  return {
                    userId: r.userId,
                    name: u.name || r.studentName || r.name || "Unknown Student",
                    sapId: u.sapId || r.studentSapId || r.sapId || "N/A"
                  };
                } catch (e) {
                  return { userId: r.userId, name: "Unknown Student", sapId: "N/A" };
                }
              }));
            }
          } catch (e) {
            console.error(`[DEBUG] Error fetching eligible students: ${e.message}`);
          }
        }

        return { 
          statusCode: 200, 
          headers: corsHeaders, 
          body: JSON.stringify({ 
            attendance: enriched,
            meeting: session || null,
            eligibleStudents
          }) 
        };
      }

      // Manual Delete (DELETE)
      if (method === "DELETE" && path.includes("/user/")) {
         const targetUserId = parts.pop();
         await docClient.send(new DeleteCommand({
           TableName: targetTable,
           Key: { [idKey]: idValue, userId: targetUserId }
         }));
         return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ message: "Attendance removed" }) };
      }

      // Manual Add (PUT)
      if (method === "PUT" && path.includes("/user/")) {
          const targetUserId = parts.pop();
          await docClient.send(new PutCommand({
            TableName: targetTable,
            Item: {
              [idKey]: idValue,
              userId: targetUserId,
              timestamp: new Date().toISOString(),
              method: "Manual",
              markedBy: userId
            }
          }));
          return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ message: "Attendance marked manually" }) };
      }
    }

    // 4. Student Stats
    if (method === "GET" && path.includes("/api/attendance/stats")) {
       const attended = await docClient.send(new QueryCommand({
         TableName: process.env.ATTENDANCE_TABLE,
         IndexName: "UserIndex",
         KeyConditionExpression: "userId = :u",
         ExpressionAttributeValues: { ":u": userId }
       }));

       return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ attendedCount: attended.Items?.length || 0, attendance: attended.Items }) };
    }

    // 5. List Meetings (Chapter Head)
    if (method === "GET" && path.includes("/api/attendance/meetings")) {
      const meetings = await docClient.send(new ScanCommand({
        TableName: process.env.MEETINGS_TABLE,
        FilterExpression: "createdBy = :u",
        ExpressionAttributeValues: { ":u": userId }
      }));

      const sorted = (meetings.Items || []).sort((a, b) => 
        new Date(b.startDateTime).getTime() - new Date(a.startDateTime).getTime()
      );

      return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ meetings: sorted.slice(0, 20) }) };
    }

    // 6. Delete Meeting (Chapter Head)
    if (method === "DELETE" && path.includes("/api/attendance/meeting/")) {
      const segments = path.split("/");
      const meetingId = segments[segments.length - 1];
      
      console.log(`[ATTENDANCE] Delete meeting request - ID: ${meetingId} by User: ${userId}`);

      try {
        if (userChapters.length === 0) {
          return { statusCode: 403, headers: corsHeaders, body: JSON.stringify({ message: "Forbidden: You are not a chapter head" }) };
        }

        await docClient.send(new DeleteCommand({
          TableName: process.env.MEETINGS_TABLE,
          Key: { 
            chapterId: userChapters[0].chapterId, 
            meetingId 
          }
        }));

        return {
          statusCode: 200,
          headers: corsHeaders,
          body: JSON.stringify({ message: "Meeting deleted successfully" })
        };
      } catch (err) {
        console.error(`[ATTENDANCE] Delete meeting error: ${err.message}`);
        return {
          statusCode: 500,
          headers: corsHeaders,
          body: JSON.stringify({ message: "Failed to delete meeting" })
        };
      }
    }

    // 7. Quick Start Attendance
    if (method === "POST" && path.includes("/api/attendance/quick-start")) {
      const { title, eventId, chapterId } = JSON.parse(event.body);
      const meetingId = `meet-quick-${Date.now()}`;
      const meetingItem = {
        meetingId,
        chapterId,
        eventId: eventId || null,
        title: title || "Quick Attendance",
        description: "Ad-hoc attendance session",
        startDateTime: new Date().toISOString(),
        endDateTime: new Date(Date.now() + 3600000).toISOString(),
        createdBy: userId,
        createdAt: new Date().toISOString(),
        isQuickStart: true
      };

      await docClient.send(new PutCommand({
        TableName: process.env.MEETINGS_TABLE,
        Item: meetingItem
      }));

      return { statusCode: 201, headers: corsHeaders, body: JSON.stringify({ meeting: meetingItem }) };
    }

    return { statusCode: 404, headers: corsHeaders, body: JSON.stringify({ message: "Not Found" }) };

  } catch (error) {
    console.error("Attendance Handler Error:", error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ message: "Internal Server Error", error: error.message })
    };
  }
};

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function deg2rad(deg) {
  return deg * (Math.PI / 180);
}
