// removeChapterHead.js
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, DeleteCommand, GetCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { CognitoIdentityProviderClient, AdminRemoveUserFromGroupCommand } from "@aws-sdk/client-cognito-identity-provider";

const client = new DynamoDBClient({ region: "ap-south-1" });
const docClient = DynamoDBDocumentClient.from(client);
const cognitoClient = new CognitoIdentityProviderClient({ region: "ap-south-1" });

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "DELETE, OPTIONS"
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

  const { email } = event.pathParameters;

  try {
    // Get chapter head info first
    const headInfo = await docClient.send(new GetCommand({
      TableName: "ChapterHead",
      Key: { email }
    }));

    if (!headInfo.Item) {
      return {
        statusCode: 404,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Chapter head assignment not found' })
      };
    }

    const { chapterId } = headInfo.Item;

    // Remove from ChapterHead table
    await docClient.send(new DeleteCommand({
      TableName: "ChapterHead",
      Key: { email }
    }));

    // Update chapter to remove head reference
    await docClient.send(new UpdateCommand({
      TableName: "Chapters",
      Key: { chapterId },
      UpdateExpression: "REMOVE headEmail, headName SET updatedAt = :now",
      ExpressionAttributeValues: {
        ":now": new Date().toISOString()
      }
    }));

    // Remove from chapter_head group
    try {
      await cognitoClient.send(new AdminRemoveUserFromGroupCommand({
        UserPoolId: process.env.USER_POOL_ID,
        Username: email,
        GroupName: 'chapter_head'
      }));
    } catch (cognitoError) {
      console.warn('Failed to remove user from group:', cognitoError.message);
    }

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        message: 'Chapter head removed successfully',
        email,
        chapterId
      })
    };

  } catch (error) {
    console.error('Error removing chapter head:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Failed to remove chapter head' })
    };
  }
};
