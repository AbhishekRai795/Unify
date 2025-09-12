// listChapterHeads.js
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({ region: "ap-south-1" });
const docClient = DynamoDBDocumentClient.from(client);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "GET, OPTIONS"
};

export const handler = async (event) => {
  if (event.requestContext.http.method === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders };
  }

  // Verify admin role
  const claims = event.requestContext?.authorizer?.jwt?.claims || {};
  const rawGroups = claims['cognito:groups'];
  const groups = Array.isArray(rawGroups) 
    ? rawGroups 
    : typeof rawGroups === 'string' 
      ? rawGroups.split(',').map(s => s.trim()).filter(Boolean)
      : [];

  if (!groups.includes('admin')) {
    return {
      statusCode: 403,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Forbidden: Admin access required' })
    };
  }

  try {
    const result = await docClient.send(new ScanCommand({
      TableName: "ChapterHeads"
    }));

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        chapterHeads: result.Items || []
      })
    };

  } catch (error) {
    console.error('Error listing chapter heads:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Failed to list chapter heads' })
    };
  }
};
