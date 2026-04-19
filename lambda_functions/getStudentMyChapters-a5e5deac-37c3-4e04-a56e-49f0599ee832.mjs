import {
  DynamoDBClient,
  ScanCommand
} from "@aws-sdk/client-dynamodb";

const dynamo = new DynamoDBClient({ region: "ap-south-1" });
const USERS_TABLE = "Unify-Users";
const CHAPTERS_TABLE = "Chapters";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type,Authorization",
  "Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS"
};

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS' || event.requestContext?.http?.method === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders, body: '' };
  }

  try {
    const claims = event.requestContext?.authorizer?.jwt?.claims;
    if (!claims) {
      return { statusCode: 401, headers: corsHeaders, body: JSON.stringify({ error: "No authorization claims found" }) };
    }

    const userEmail = claims.email || claims['cognito:username'] || claims.username || claims.sub;
    if (!userEmail) {
      return { statusCode: 401, headers: corsHeaders, body: JSON.stringify({ error: "No email found in token" }) };
    }

    // Find user by email
    const userResult = await dynamo.send(new ScanCommand({
      TableName: USERS_TABLE,
      FilterExpression: "email = :email",
      ExpressionAttributeValues: { ":email": { S: userEmail } }
    }));

    if (!userResult.Items || userResult.Items.length === 0) {
      return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ chapters: [] }) };
    }

    const user = userResult.Items[0];
    const registeredChapterNames = user.registeredChapters?.SS || user.registeredChapters?.L?.map(item => item.S) || [];

    if (registeredChapterNames.length === 0) {
      return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ chapters: [] }) };
    }

    // Scan all chapters to find the ones the user is registered for
    const allChaptersResult = await dynamo.send(new ScanCommand({ TableName: CHAPTERS_TABLE }));

    // Filter to chapters the user is registered for
    const userChapters = (allChaptersResult.Items || [])
      .filter(chapter => registeredChapterNames.includes(chapter.chapterName?.S))
      .map(chapter => ({
        id: chapter.chapterId?.S || 'unknown',
        name: chapter.chapterName?.S || 'Unknown Chapter',
        registeredAt: user.createdAt?.S || new Date().toISOString(),
        studentName: user.name?.S || 'Unknown',
        chapterHead: chapter.headName?.S || "Not assigned",
        headEmail: chapter.headEmail?.S || "",
        status: chapter.status?.S || "active",
        memberCount: chapter.memberCount?.N || "0",
        isPaid: chapter.isPaid?.BOOL || false,
        registrationFee: chapter.registrationFee?.N ? parseInt(chapter.registrationFee.N, 10) : 0,
        isRegistered: true
      }));

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ chapters: userChapters })
    };

  } catch (error) {
    console.error("Error fetching student chapters:", error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: "Failed to fetch registered chapters", details: error.message })
    };
  }
};
