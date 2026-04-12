// listChapters.js
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({ region: "ap-south-1" });
const docClient = DynamoDBDocumentClient.from(client);

const corsHeaders = {
  "Access-Control-Allow-Origin": "http://localhost:5173",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "GET, OPTIONS"
};

export const handler = async (event) => {
  // Handle preflight CORS
  if (event.requestContext.http.method === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders };
  }

  // Extract claims from HTTP API v2 JWT authorizer
  const claims = event.requestContext?.authorizer?.jwt?.claims || {};
  
  // DEBUG: Log what we're receiving
  console.log('Claims received:', claims);
  
  // FIXED: Handle cognito:groups parsing for all formats
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
        // Fallback: remove brackets and split
        groups = trimmed.replace(/^\[|\]$/g, '').split(',').map(g => g.trim()).filter(Boolean);
      }
    } else {
      // Simple comma-separated string
      groups = trimmed.split(',').map(g => g.trim()).filter(Boolean);
    }
  } else {
    groups = [];
  }
  
  console.log('Parsed groups:', groups);

  // Check if user has admin access
  if (!groups.includes('admin')) {
    return {
      statusCode: 403,
      headers: corsHeaders,
      body: JSON.stringify({ 
        error: 'Forbidden: Admin access required',
        debug: { receivedGroups: groups, claimsKeys: Object.keys(claims) }
      })
    };
  }

  // Get pagination parameters
  const { limit = "50", lastEvaluatedKey } = event.queryStringParameters || {};

  try {
    const scanParams = {
      TableName: "Chapters",
      Limit: parseInt(limit),
      FilterExpression: "#status = :status",
      ExpressionAttributeNames: { "#status": "status" },
      ExpressionAttributeValues: { ":status": "active" }
    };

    if (lastEvaluatedKey) {
      scanParams.ExclusiveStartKey = JSON.parse(decodeURIComponent(lastEvaluatedKey));
    }

    const result = await docClient.send(new ScanCommand(scanParams));

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        chapters: result.Items || [],
        lastEvaluatedKey: result.LastEvaluatedKey 
          ? encodeURIComponent(JSON.stringify(result.LastEvaluatedKey))
          : null
      })
    };

  } catch (error) {
    console.error('Error listing chapters:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Failed to list chapters' })
    };
  }
};
