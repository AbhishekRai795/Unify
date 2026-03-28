import {
  DynamoDBClient,
  ScanCommand,
  UpdateItemCommand
} from "@aws-sdk/client-dynamodb";

const dynamo = new DynamoDBClient({ region: "ap-south-1" });
const USERS_TABLE = "Unify-Users";
const CHAPTERS_TABLE = "Chapters";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type,Authorization",
  "Access-Control-Allow-Methods": "POST,OPTIONS"
};

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: ''
    };
  }

  try {
    const claims = event.requestContext?.authorizer?.jwt?.claims;
    
    if (!claims) {
      return {
        statusCode: 401,
        headers: corsHeaders,
        body: JSON.stringify({ error: "No authorization claims found" })
      };
    }

    const userEmail = claims.email || 
                      claims['cognito:username'] || 
                      claims.username || 
                      claims.sub;

    if (!userEmail) {
      return {
        statusCode: 401,
        headers: corsHeaders,
        body: JSON.stringify({ 
          error: "No email found in token"
        })
      };
    }

    let requestBody;
    try {
      requestBody = JSON.parse(event.body);
    } catch (parseError) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: "Invalid JSON in request body" })
      };
    }

    const { chapterName, studentName, studentEmail } = requestBody;

    if (!chapterName || !studentName || !studentEmail) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ 
          error: "Missing required fields: chapterName, studentName, studentEmail" 
        })
      };
    }

    if (userEmail !== studentEmail) {
      return {
        statusCode: 403,
        headers: corsHeaders,
        body: JSON.stringify({ 
          error: "Cannot register for chapter with different email than authenticated user" 
        })
      };
    }

    const chapterParams = {
      TableName: CHAPTERS_TABLE,
      FilterExpression: "chapterName = :name",
      ExpressionAttributeValues: { ":name": { S: chapterName } }
    };

    const chapterExists = await dynamo.send(new ScanCommand(chapterParams));
    
    if (!chapterExists.Items || chapterExists.Items.length === 0) {
      return {
        statusCode: 404,
        headers: corsHeaders,
        body: JSON.stringify({ error: "Chapter not found" })
      };
    }

    const userParams = {
      TableName: USERS_TABLE,
      FilterExpression: "email = :email",
      ExpressionAttributeValues: {
        ":email": { S: userEmail }
      }
    };

    const userResult = await dynamo.send(new ScanCommand(userParams));

    if (!userResult.Items || userResult.Items.length === 0) {
      return {
        statusCode: 404,
        headers: corsHeaders,
        body: JSON.stringify({ error: "User not found in system" })
      };
    }

    const user = userResult.Items[0];
    const userId = user.userId?.S;
    
    // *** FIX: Add a check for the userId before proceeding ***
    if (!userId) {
      console.error("User found but missing userId attribute:", user);
      return {
        statusCode: 500,
        headers: corsHeaders,
        body: JSON.stringify({ 
          error: "User record is corrupted or incomplete. Missing userId."
        })
      };
    }
    
    const currentChapters = user.registeredChapters?.SS || user.registeredChapters?.L?.map(item => item.S) || [];

    if (currentChapters.includes(chapterName)) {
      return {
        statusCode: 409,
        headers: corsHeaders,
        body: JSON.stringify({ error: "Student is already registered for this chapter" })
      };
    }

    const updatedChapters = [...currentChapters, chapterName];

    const updateParams = {
      TableName: USERS_TABLE,
      Key: {
        userId: { S: userId }
      },
      UpdateExpression: "SET registeredChapters = :chapters",
      ExpressionAttributeValues: {
        ":chapters": { SS: updatedChapters }
      },
      ReturnValues: "UPDATED_NEW"
    };

    await dynamo.send(new UpdateItemCommand(updateParams));

    return {
      statusCode: 201,
      headers: corsHeaders,
      body: JSON.stringify({ 
        message: `Successfully registered ${studentName} for chapter: ${chapterName}`,
        registrationDetails: {
          studentEmail: userEmail,
          studentName: studentName,
          chapterName: chapterName,
          registeredAt: new Date().toISOString(),
          totalChapters: updatedChapters.length
        }
      })
    };

  } catch (error) {
    console.error("Error registering student:", error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ 
        error: "Failed to register student for chapter",
        details: error.message 
      })
    };
  }
};