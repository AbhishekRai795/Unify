import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand, GetCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({ region: "ap-south-1" });
const docClient = DynamoDBDocumentClient.from(client);

export const handler = async (event) => {
  console.log("=== List Chapter Meetings ===");
  
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH"
  };

  if (event.requestContext?.http?.method === "OPTIONS") {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: ""
    };
  }

  try {
    const { chapterId } = event.pathParameters || {};
    
    if (!chapterId) {
      return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ message: "Missing chapterId path parameter" }) };
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

    // Extract user info and check for privileged roles
    const claims = event.requestContext?.authorizer?.jwt?.claims || {};
    const userId = claims.sub;
    
    // Robust email extraction
    const email = claims.email || claims['cognito:username'] || claims.sub || claims.username;
    
    // Robust group parsing
    const cognitoGroups = claims['cognito:groups'] || claims['groups'] || [];
    let groups = [];
    if (Array.isArray(cognitoGroups)) {
      groups = cognitoGroups;
    } else if (typeof cognitoGroups === 'string') {
      const trimmed = cognitoGroups.trim();
      if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
        try {
          groups = JSON.parse(trimmed);
        } catch (e) {
          groups = trimmed.split(',').map(g => g.trim().replace(/^"|"$/g, ''));
        }
      } else {
        groups = trimmed.split(',').map(g => g.trim().replace(/^"|"$/g, ''));
      }
    }

    let isPrivileged = groups.some(g => {
      const low = String(g).toLowerCase();
      return low === 'admin' || low === 'chapter-head';
    });

    // Fallback: Check ChapterHead table if not already privileged via groups
    if (!isPrivileged && email) {
      try {
        const chapterHeadResult = await docClient.send(new GetCommand({
          TableName: "ChapterHead",
          Key: { email: String(email).toLowerCase() }
        }));
        
        if (chapterHeadResult.Item && chapterHeadResult.Item.chapterId === chapterId) {
          isPrivileged = true;
        }
      } catch (err) {
        console.warn("Failed to check ChapterHead table for privilege:", err.message);
      }
    }

    // Secondary Fallback: Check Chapters table directly for headEmail
    if (!isPrivileged && email && chapterId) {
      try {
        const chapterRes = await docClient.send(new GetCommand({
          TableName: "Chapters",
          Key: { chapterId }
        }));
        if (chapterRes.Item && chapterRes.Item.headEmail && String(chapterRes.Item.headEmail).toLowerCase() === String(email).toLowerCase()) {
          isPrivileged = true;
        }
      } catch (e) {
        console.warn("Failed to check Chapters table for headEmail:", e.message);
      }
    }

    let meetings = result.Items || [];

    // If student, filter by event registration
    if (!isPrivileged && userId) {
      try {
        const registeredEventsResult = await docClient.send(new QueryCommand({
          TableName: "EventPayments",
          IndexName: "UserIdIndex",
          KeyConditionExpression: "userId = :userId",
          ExpressionAttributeValues: { ":userId": userId }
        }));
        
        const registeredEventIds = new Set(
          (registeredEventsResult.Items || [])
            .filter(r => {
              const pStatus = (r.paymentStatus || "").toUpperCase();
              const status = (r.status || "").toUpperCase();
              return pStatus === 'COMPLETED' || pStatus === 'SUCCESS' || 
                     status === 'SUCCESS' || status === 'APPROVED' || status === 'COMPLETED';
            })
            .map(r => r.eventId)
        );

        meetings = meetings.filter(m => {
          // If the user created the meeting, they should see it regardless of registration
          if (userId && m.createdBy === userId) return true;

          // If no eventId, it's for the whole chapter
          if (!m.eventId || m.eventId === "" || m.eventId === "null" || m.eventId === null) return true;
          
          // Otherwise, only show if student is registered for that event
          return registeredEventIds.has(m.eventId);
        });
      } catch (err) {
        console.error("Error filtering meetings for student:", err);
        // Fallback: show whole-chapter meetings OR any meeting created by this user
        meetings = meetings.filter(m => {
          if (userId && m.createdBy === userId) return true;
          return !m.eventId || m.eventId === "" || m.eventId === "null" || m.eventId === null;
        });
      }
    }

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        chapterId,
        meetings
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
