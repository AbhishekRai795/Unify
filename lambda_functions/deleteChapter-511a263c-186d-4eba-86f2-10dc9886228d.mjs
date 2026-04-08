// deleteChapter.js
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, UpdateCommand, DeleteCommand, GetCommand } from "@aws-sdk/lib-dynamodb";
import { CognitoIdentityProviderClient, AdminRemoveUserFromGroupCommand } from "@aws-sdk/client-cognito-identity-provider";

const client = new DynamoDBClient({ region: "ap-south-1" });
const docClient = DynamoDBDocumentClient.from(client);
const cognitoClient = new CognitoIdentityProviderClient({ region: "ap-south-1" });

const corsHeaders = {
  "Access-Control-Allow-Origin": "http://localhost:5173",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "DELETE, OPTIONS"
};

export const handler = async (event) => {
  if (event.requestContext.http.method === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders };
  }

  // FIXED: Extract claims and verify admin role with robust parsing
  const claims = event.requestContext?.authorizer?.jwt?.claims || {};
  
  console.log('Claims received:', claims);
  
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
        groups = trimmed.replace(/^\[|\]$/g, '').split(',').map(g => g.trim()).filter(Boolean);
      }
    } else {
      groups = trimmed.split(',').map(g => g.trim()).filter(Boolean);
    }
  } else {
    groups = [];
  }
  
  console.log('Parsed groups:', groups);

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

  const { chapterId } = event.pathParameters;
  console.log('Deleting chapter:', chapterId);

  try {
    // Get chapter details first
    const chapter = await docClient.send(new GetCommand({
      TableName: "Chapters",
      Key: { chapterId }
    }));

    if (!chapter.Item) {
      return {
        statusCode: 404,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Chapter not found' })
      };
    }

    console.log('Chapter found:', chapter.Item);

    // Soft delete - mark as archived
    await docClient.send(new UpdateCommand({
      TableName: "Chapters",
      Key: { chapterId },
      UpdateExpression: "SET #status = :status, updatedAt = :now",
      ExpressionAttributeNames: { "#status": "status" },
      ExpressionAttributeValues: {
        ":status": "archived",
        ":now": new Date().toISOString()
      }
    }));

    console.log('Chapter marked as archived');

    // Remove head assignment if exists
    if (chapter.Item.headEmail) {
      console.log(`Removing chapter head: ${chapter.Item.headEmail}`);
      
      try {
        // FIXED: Correct table name (singular)
        await docClient.send(new DeleteCommand({
          TableName: "ChapterHead",  //    Fixed: "ChapterHead" not "ChapterHeads"
          Key: { email: chapter.Item.headEmail }
        }));
        console.log(`Successfully removed ${chapter.Item.headEmail} from ChapterHead table`);
      } catch (dbError) {
        console.error('Failed to remove from ChapterHead table:', dbError);
        // Continue with Cognito removal even if DB removal fails
      }

      // Remove from chapter-head group
      try {
        if (!process.env.USER_POOL_ID) {
          console.warn('USER_POOL_ID environment variable not set, skipping Cognito group removal');
        } else {
          await cognitoClient.send(new AdminRemoveUserFromGroupCommand({
            UserPoolId: process.env.USER_POOL_ID,
            Username: chapter.Item.headEmail,
            GroupName: 'chapter-head'
          }));
          console.log(`Successfully removed ${chapter.Item.headEmail} from chapter-head group`);
        }
      } catch (cognitoError) {
        console.error('Failed to remove user from Cognito group:', cognitoError);
        // Log the full error for debugging
      }
    } else {
      console.log('No chapter head to remove');
    }

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        message: 'Chapter archived successfully',
        chapterId,
        headRemoved: !!chapter.Item.headEmail
      })
    };

  } catch (error) {
    console.error('Error archiving chapter:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ 
        error: 'Failed to archive chapter',
        details: error.message
      })
    };
  }
};
