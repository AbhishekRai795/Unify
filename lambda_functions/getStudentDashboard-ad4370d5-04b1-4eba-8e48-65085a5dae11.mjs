import {
  DynamoDBClient,
  ScanCommand
} from "@aws-sdk/client-dynamodb";

const dynamo = new DynamoDBClient({ region: "ap-south-1" });
const USERS_TABLE = "Unify-Users";
const CHAPTERS_TABLE = "Chapters";

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
    const claims = event.requestContext?.authorizer?.jwt?.claims;
    
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

    console.log('Processing dashboard for user:', userEmail);

    // Find user by email in Unify-Users table
    const userParams = {
      TableName: USERS_TABLE,
      FilterExpression: "email = :email",
      ExpressionAttributeValues: {
        ":email": { S: userEmail }
      }
    };

    const [userResult, allChapters] = await Promise.all([
      dynamo.send(new ScanCommand(userParams)),
      dynamo.send(new ScanCommand({
        TableName: CHAPTERS_TABLE,
        FilterExpression: "attribute_not_exists(#status) OR #status <> :archived",
        ExpressionAttributeNames: { "#status": "status" },
        ExpressionAttributeValues: { ":archived": { S: "archived" } }
      }))
    ]);

    if (!userResult.Items || userResult.Items.length === 0) {
      return {
        statusCode: 404,
        headers: corsHeaders,
        body: JSON.stringify({ error: "User not found" })
      };
    }

    const user = userResult.Items[0];
    // registeredChapters is stored as an array in your schema
    const registeredChapters = user.registeredChapters?.SS || user.registeredChapters?.L?.map(item => item.S) || [];

    const dashboardData = {
      registeredChaptersCount: registeredChapters.length,
      totalAvailableChapters: allChapters.Items?.length || 0,
      registeredChapters: registeredChapters.map(chapter => ({
        name: chapter,
        registeredAt: user.createdAt?.S || new Date().toISOString()
      })),
      recentActivity: `Active in ${registeredChapters.length} chapters`,
      userEmail: userEmail,
      userName: user.name?.S || 'Unknown User'
    };

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify(dashboardData)
    };

  } catch (error) {
    console.error("Error fetching dashboard data:", error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ 
        error: "Failed to fetch dashboard data",
        details: error.message 
      })
    };
  }
};
