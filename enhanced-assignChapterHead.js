// enhanced-assignChapterHead.js
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, UpdateCommand, QueryCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";
import { CognitoIdentityProviderClient, AdminAddUserToGroupCommand, AdminRemoveUserFromGroupCommand } from "@aws-sdk/client-cognito-identity-provider";

const client = new DynamoDBClient({ region: "ap-south-1" });
const docClient = DynamoDBDocumentClient.from(client);
const cognitoClient = new CognitoIdentityProviderClient({ region: "ap-south-1" });

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "POST, PUT, OPTIONS"
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

  const { email, chapterId, headName } = body;
  if (!email || !chapterId) {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'email and chapterId are required' })
    };
  }

  const now = new Date().toISOString();

  try {
    // Step 1: Get current chapter to find existing head
    let currentChapter = null;
    let previousHeadEmail = null;
    
    try {
      const chapterResult = await docClient.send(new QueryCommand({
        TableName: "Chapters",
        KeyConditionExpression: "chapterId = :chapterId",
        ExpressionAttributeValues: {
          ":chapterId": chapterId
        }
      }));
      
      if (chapterResult.Items && chapterResult.Items.length > 0) {
        currentChapter = chapterResult.Items[0];
        previousHeadEmail = currentChapter.headEmail;
      }
    } catch (error) {
      console.warn('Could not fetch current chapter:', error.message);
    }

    // Step 2: Remove previous head if exists and is different from new head
    if (previousHeadEmail && previousHeadEmail !== email) {
      console.log(`Removing previous head: ${previousHeadEmail}`);
      
      // Remove from ChapterHeads table
      try {
        await docClient.send(new DeleteCommand({
          TableName: "ChapterHeads",
          Key: { email: previousHeadEmail }
        }));
        console.log(`Removed ${previousHeadEmail} from ChapterHeads table`);
      } catch (error) {
        console.warn(`Failed to remove ${previousHeadEmail} from ChapterHeads:`, error.message);
      }

      // Remove from chapter_head Cognito group
      try {
        await cognitoClient.send(new AdminRemoveUserFromGroupCommand({
          UserPoolId: process.env.USER_POOL_ID,
          Username: previousHeadEmail,
          GroupName: 'chapter_head'
        }));
        console.log(`Removed ${previousHeadEmail} from chapter_head group`);
      } catch (error) {
        console.warn(`Failed to remove ${previousHeadEmail} from chapter_head group:`, error.message);
      }
    }

    // Step 3: Assign new chapter head
    await docClient.send(new PutCommand({
      TableName: "ChapterHeads",
      Item: {
        email,
        chapterId,
        linkedAt: now
      }
    }));

    // Step 4: Update chapter with new head info
    await docClient.send(new UpdateCommand({
      TableName: "Chapters",
      Key: { chapterId },
      UpdateExpression: "SET headEmail = :email, headName = :name, updatedAt = :now",
      ExpressionAttributeValues: {
        ":email": email,
        ":name": headName || null,
        ":now": now
      }
    }));

    // Step 5: Add new user to chapter_head group
    try {
      await cognitoClient.send(new AdminAddUserToGroupCommand({
        UserPoolId: process.env.USER_POOL_ID,
        Username: email,
        GroupName: 'chapter_head'
      }));
      console.log(`Added ${email} to chapter_head group`);
    } catch (cognitoError) {
      console.warn('Failed to add user to chapter_head group:', cognitoError.message);
    }

    const responseMessage = previousHeadEmail && previousHeadEmail !== email
      ? `Chapter head changed from ${previousHeadEmail} to ${email}`
      : 'Chapter head assigned successfully';

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        message: responseMessage,
        assignment: { 
          email, 
          chapterId, 
          linkedAt: now,
          previousHead: previousHeadEmail 
        }
      })
    };

  } catch (error) {
    console.error('Error assigning chapter head:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ 
        error: 'Failed to assign chapter head',
        details: error.message 
      })
    };
  }
};
