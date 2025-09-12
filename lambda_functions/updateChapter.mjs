// updateChapter.js
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, UpdateCommand, PutCommand, DeleteCommand, GetCommand } from "@aws-sdk/lib-dynamodb";
import { CognitoIdentityProviderClient, AdminAddUserToGroupCommand, AdminRemoveUserFromGroupCommand } from "@aws-sdk/client-cognito-identity-provider";

const client = new DynamoDBClient({ region: "ap-south-1" });
const docClient = DynamoDBDocumentClient.from(client);
const cognitoClient = new CognitoIdentityProviderClient({ region: "ap-south-1" });

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "PUT, OPTIONS"
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

  const { chapterId } = event.pathParameters;
  
  let body;
  try {
    body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
  } catch {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Invalid JSON body' })
    };
  }

  const { chapterName, headEmail, headName } = body;
  const now = new Date().toISOString();

  try {
    // Get current chapter to check if head changed
    const currentChapter = await docClient.send(new GetCommand({
      TableName: "Chapters",
      Key: { chapterId }
    }));

    if (!currentChapter.Item) {
      return {
        statusCode: 404,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Chapter not found' })
      };
    }

    const oldHeadEmail = currentChapter.Item.headEmail;

    // Update chapter
    const updateParams = {
      TableName: "Chapters",
      Key: { chapterId },
      UpdateExpression: "SET updatedAt = :now",
      ExpressionAttributeValues: { ":now": now }
    };

    if (chapterName) {
      updateParams.UpdateExpression += ", chapterName = :name";
      updateParams.ExpressionAttributeValues[":name"] = chapterName;
    }

    if (headEmail !== undefined) {
      updateParams.UpdateExpression += ", headEmail = :email";
      updateParams.ExpressionAttributeValues[":email"] = headEmail;
    }

    if (headName !== undefined) {
      updateParams.UpdateExpression += ", headName = :headName";
      updateParams.ExpressionAttributeValues[":headName"] = headName;
    }

    await docClient.send(new UpdateCommand(updateParams));

    // Handle head changes
    if (headEmail !== undefined && headEmail !== oldHeadEmail) {
      // Remove old head from ChapterHeads table and group
      if (oldHeadEmail) {
        await docClient.send(new DeleteCommand({
          TableName: "ChapterHeads",
          Key: { email: oldHeadEmail }
        }));

        try {
          await cognitoClient.send(new AdminRemoveUserFromGroupCommand({
            UserPoolId: process.env.USER_POOL_ID,
            Username: oldHeadEmail,
            GroupName: 'chapter_head'
          }));
        } catch (cognitoError) {
          console.warn('Failed to remove user from group:', cognitoError.message);
        }
      }

      // Add new head to ChapterHeads table and group
      if (headEmail) {
        await docClient.send(new PutCommand({
          TableName: "ChapterHeads",
          Item: {
            email: headEmail,
            chapterId,
            linkedAt: now
          }
        }));

        try {
          await cognitoClient.send(new AdminAddUserToGroupCommand({
            UserPoolId: process.env.USER_POOL_ID,
            Username: headEmail,
            GroupName: 'chapter_head'
          }));
        } catch (cognitoError) {
          console.warn('Failed to add user to group:', cognitoError.message);
        }
      }
    }

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        message: 'Chapter updated successfully',
        chapterId
      })
    };

  } catch (error) {
    console.error('Error updating chapter:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Failed to update chapter' })
    };
  }
};
