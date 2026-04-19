import {
  DynamoDBClient,
  ScanCommand,
  UpdateItemCommand
} from "@aws-sdk/client-dynamodb";

const dynamo = new DynamoDBClient({ region: "ap-south-1" });
const USERS_TABLE = "Unify-Users";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type,Authorization",
  "Access-Control-Allow-Methods": "DELETE,OPTIONS"
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

    const chapterName = event.pathParameters?.chapterId; // This should be chapter name

    if (!userEmail || !chapterName) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: "Email and chapter name are required" })
      };
    }

    // Find user by email
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
        body: JSON.stringify({ error: "User not found" })
      };
    }

    const user = userResult.Items[0];
    const userId = user.userId?.S;
    const currentChapters = user.registeredChapters?.SS || user.registeredChapters?.L?.map(item => item.S) || [];

    // Check if user is registered for this chapter
    if (!currentChapters.includes(chapterName)) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: "Student is not registered for this chapter" })
      };
    }

    // Remove chapter from registeredChapters array
    const updatedChapters = currentChapters.filter(chapter => chapter !== chapterName);

    const updateParams = {
      TableName: USERS_TABLE,
      Key: {
        userId: { S: userId }
      },
      UpdateExpression: updatedChapters.length > 0 
        ? "SET registeredChapters = :chapters"
        : "REMOVE registeredChapters",
      ...(updatedChapters.length > 0 && {
        ExpressionAttributeValues: {
          ":chapters": { L: updatedChapters.map(s => ({ S: s })) }
        }
      })
    };

    await dynamo.send(new UpdateItemCommand(updateParams));

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ 
        message: `Successfully left chapter: ${chapterName}` 
      })
    };

  } catch (error) {
    console.error("Error leaving chapter:", error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ 
        error: "Failed to leave chapter",
        details: error.message 
      })
    };
  }
};
