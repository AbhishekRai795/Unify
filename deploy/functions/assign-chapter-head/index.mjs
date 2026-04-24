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
    // Step 1: Get current chapter to find existing head and check if it already has one
    let currentChapter = null;
    let previousHeadEmail = null;
    let chapterName = "";
    
    try {
      const chapterResult = await docClient.send(new GetCommand({
        TableName: "Chapters",
        Key: { chapterId }
      }));
      
      if (chapterResult.Item) {
        currentChapter = chapterResult.Item;
        previousHeadEmail = currentChapter.headEmail;
        chapterName = currentChapter.chapterName || "";
      } else {
        return {
          statusCode: 404,
          headers: corsHeaders,
          body: JSON.stringify({ error: 'Chapter not found' })
        };
      }
    } catch (error) {
      console.error('Could not fetch chapter:', error.message);
      throw new Error(`Chapter database access failed: ${error.message}`);
    }

    // Step 2: Strict Constraint - Check if the new email is already assigned to ANY chapter
    const existingHeadCheck = await docClient.send(new GetCommand({
      TableName: "ChapterHead",
      Key: { email }
    }));

    if (existingHeadCheck.Item) {
      const assignedChapterId = existingHeadCheck.Item.chapterId;
      // If it's already assigned to ANOTHER chapter, throw error
      if (assignedChapterId !== chapterId) {
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({ 
            error: `User ${email} is already assigned as a head for another chapter (${existingHeadCheck.Item.chapterName || assignedChapterId}).` 
          })
        };
      }
    }

    // Step 3: Strict Constraint - Check if the chapter already has a different head
    if (previousHeadEmail && previousHeadEmail !== email) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ 
          error: `Chapter already has a head (${previousHeadEmail}). Please remove the existing head before assigning a new one.` 
        })
      };
    }

    // Step 4: Assign new chapter head to mapping table with all required fields
    await docClient.send(new PutCommand({
      TableName: "ChapterHead",
      Item: {
        email,
        chapterId,
        chapterName,
        headName: headName || currentChapter.headName || null,
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

