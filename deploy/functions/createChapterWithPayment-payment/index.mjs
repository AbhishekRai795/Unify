// createChapterWithPayment.mjs
// Enhanced version of createChapter that supports payment configuration
// This is a new function - original createChapter remains unchanged for backwards compatibility
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import { CognitoIdentityProviderClient, AdminAddUserToGroupCommand } from "@aws-sdk/client-cognito-identity-provider";
import { randomUUID } from 'crypto';

function generateUUID() {
  return randomUUID();
}

const client = new DynamoDBClient({ region: "ap-south-1" });
const docClient = DynamoDBDocumentClient.from(client);
const cognitoClient = new CognitoIdentityProviderClient({ region: "ap-south-1" });

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

const CHAPTERS_TABLE = "Chapters";
const CHAPTER_HEAD_TABLE = "ChapterHead";
const PAYMENTS_TABLE = "ChapterPayments";

export const handler = async (event) => {
  console.log('Event received:', JSON.stringify(event, null, 2));

  // Handle preflight CORS
  if (event.requestContext?.http?.method === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders };
  }

  try {
    // Extract claims and verify admin role
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
    }
    
    console.log('Parsed groups:', groups);

    if (!groups.includes('admin')) {
      return {
        statusCode: 403,
        headers: corsHeaders,
        body: JSON.stringify({ 
          error: 'Forbidden: Admin access required'
        })
      };
    }

    // Parse request body
    let body;
    try {
      body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    } catch (parseError) {
      console.error('Body parse error:', parseError);
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Invalid JSON body' })
      };
    }

    const { 
      chapterName, 
      headEmail, 
      headName,
      type,            // NEW: 'chapter' or 'club'
      isPaid,          // NEW: Boolean flag for paid/free chapter
      registrationFee  // NEW: Fee amount in paise (e.g., 50000 = ₹500)
    } = body;

    if (!chapterName) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'chapterName is required' })
      };
    }

    // Validate payment parameters
    if (isPaid) {
      if (!registrationFee || registrationFee <= 0) {
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({ 
            error: 'For paid chapters, registrationFee must be provided and greater than 0' 
          })
        };
      }
      // Validate fee is a valid amount (in paise, so should be in INR * 100)
      if (!Number.isInteger(registrationFee)) {
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({ 
            error: 'registrationFee must be an integer (amount in paise)' 
          })
        };
      }
    }

    // Generate UUID and create chapter
    const chapterId = generateUUID();
    const now = new Date().toISOString();

    const chapterItem = {
      chapterId,
      chapterName,
      type: type || 'chapter',
      headEmail: headEmail || null,
      headName: headName || null,
      status: 'active',
      memberCount: 0,
      isPaid: Boolean(isPaid),
      registrationFee: isPaid ? Math.round(Number(registrationFee)) : 0,
      createdAt: now,
      updatedAt: now
    };

    console.log('Creating chapter:', chapterItem);

    // Create chapter
    await docClient.send(new PutCommand({
      TableName: CHAPTERS_TABLE,
      Item: chapterItem
    }));

    console.log('   Chapter created successfully');

    if (isPaid) {
      console.log('   Payment configuration initialized for paid chapter:', {
        chapterId,
        isPaid: true,
        fee: registrationFee,
        displayFee: `₹${(registrationFee / 100).toFixed(2)}`
      });
    }

    // If head is provided, create mapping and add to group
    if (headEmail && headEmail.trim()) {
      const trimmedEmail = headEmail.trim();
      
      console.log('Creating chapter head mapping for:', trimmedEmail);
      
      const chapterHeadItem = {
        email: trimmedEmail,
        chapterId,
        chapterName: chapterName,
        headName: headName || null,
        linkedAt: now
      };

      await docClient.send(new PutCommand({
        TableName: CHAPTER_HEAD_TABLE,
        Item: chapterHeadItem
      }));

      console.log('   Chapter head mapping created successfully');

      // Add user to chapter-head group
      if (process.env.USER_POOL_ID) {
        try {
          console.log('Adding user to chapter-head group:', trimmedEmail);
          
          await cognitoClient.send(new AdminAddUserToGroupCommand({
            UserPoolId: process.env.USER_POOL_ID,
            Username: trimmedEmail,
            GroupName: 'chapter-head'
          }));
          
          console.log('   User successfully added to chapter-head group');
          
        } catch (cognitoError) {
          console.error('Failed to add user to group:', {
            error: cognitoError,
            message: cognitoError.message,
            code: cognitoError.name
          });
          // Don't fail the entire operation if group assignment fails
        }
      }
    }

    return {
      statusCode: 201,
      headers: corsHeaders,
      body: JSON.stringify({
        message: 'Chapter created successfully',
        chapter: chapterItem,
        paymentConfig: isPaid ? {
          isPaid: true,
          registrationFee,
          displayFee: `₹${(registrationFee / 100).toFixed(2)}`,
          currency: "INR"
        } : {
          isPaid: false,
          displayFee: "Free"
        }
      })
    };

  } catch (error) {
    console.error('  Error creating chapter:', {
      error: error,
      message: error.message,
      stack: error.stack
    });
    
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ 
        error: 'Failed to create chapter',
        details: error.message 
      })
    };
  }
};
