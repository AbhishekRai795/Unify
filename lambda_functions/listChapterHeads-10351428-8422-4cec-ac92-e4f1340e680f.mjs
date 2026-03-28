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

  // FIXED: Extract claims and verify admin role with robust parsing (SAME AS WORKING createChapter.js)
  const claims = event.requestContext?.authorizer?.jwt?.claims || {};
  console.log('=== LAMBDA DEBUG ===');
  console.log('Raw claims:', JSON.stringify(claims, null, 2));
  console.log('Raw groups from claims:', claims['cognito:groups']);

  // EXACT GROUP PARSING LOGIC FROM WORKING createChapter.js
  const cognitoGroups = claims['cognito:groups'];
  let groups = [];

  if (Array.isArray(cognitoGroups)) {
    groups = cognitoGroups;
  } else if (typeof cognitoGroups === 'string') {
    const trimmed = cognitoGroups.trim();
    if ((trimmed.startsWith('[') && trimmed.endsWith(']')) || trimmed.includes('"')) {
      try {
        const parsed = JSON.parse(trimmed);
        groups = Array.isArray(parsed) ? parsed : [];
      } catch {
        // THIS IS THE CRUCIAL FALLBACK THAT WORKS!
        groups = trimmed.replace(/^\[|\]$/g, '').split(',').map(g => g.trim()).filter(Boolean);
      }
    } else {
      groups = trimmed.split(',').map(g => g.trim()).filter(Boolean);
    }
  } else {
    groups = [];
  }

  console.log('Processed groups:', groups);
  console.log('Groups includes admin?', groups.includes('admin'));
  console.log('====================');

  if (!groups.includes('admin')) {
    return {
      statusCode: 403,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Forbidden: Admin access required' })
    };
  }

  try {
    const result = await docClient.send(new ScanCommand({
      TableName: "ChapterHead"
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
