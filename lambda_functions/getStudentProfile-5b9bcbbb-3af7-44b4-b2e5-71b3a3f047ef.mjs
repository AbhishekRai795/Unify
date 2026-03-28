import {
  DynamoDBClient,
  QueryCommand
} from "@aws-sdk/client-dynamodb";

const dynamo = new DynamoDBClient({ region: "ap-south-1" });
const CHAPTER_STUDENTS_TABLE = "chapter-students";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type,Authorization",
  "Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS"
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
    const claims = event.requestContext?.authorizer?.claims;
    
    if (!claims) {
      return {
        statusCode: 401,
        headers: corsHeaders,
        body: JSON.stringify({ error: "No authorization claims found" })
      };
    }

    // Flexible email extraction
    const userEmail = claims.email || 
                      claims['cognito:username'] || 
                      claims.username || 
                      claims.sub;

    const userName = claims.name || 
                     claims.given_name || 
                     claims['cognito:username'] || 
                     'Unknown User';

    if (!userEmail) {
      return {
        statusCode: 401,
        headers: corsHeaders,
        body: JSON.stringify({ 
          error: "No email found in token",
          availableClaims: Object.keys(claims)
        })
      };
    }

    // Get student's chapter registrations
    const params = {
      TableName: CHAPTER_STUDENTS_TABLE,
      KeyConditionExpression: "email = :email",
      ExpressionAttributeValues: {
        ":email": { S: userEmail }
      }
    };

    const result = await dynamo.send(new QueryCommand(params));
    const items = result.Items || [];

    const profile = {
      email: userEmail,
      name: items.length > 0 ? items[0].name?.S || userName : userName,
      registeredChapters: items.map(item => ({
        name: item.chapter?.S || 'Unknown Chapter',
        registeredAt: item.registeredAt?.S || new Date().toISOString()
      })),
      totalChapters: items.length,
      memberSince: items.length > 0 ? 
        items.sort((a, b) => (a.registeredAt?.S || '').localeCompare(b.registeredAt?.S || ''))[0].registeredAt?.S ||
        new Date().toISOString() :
        new Date().toISOString()
    };

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify(profile)
    };

  } catch (error) {
    console.error("Error fetching student profile:", error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ 
        error: "Failed to fetch profile",
        details: error.message 
      })
    };
  }
};
