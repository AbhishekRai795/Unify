import {
  DynamoDBClient
} from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand
} from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({ region: process.env.AWS_REGION || "ap-south-1" });
const docClient = DynamoDBDocumentClient.from(client);

const PAYMENTS_TABLE = "ChapterPayments";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type,Authorization",
  "Access-Control-Allow-Methods": "PUT,OPTIONS"
};

export const handler = async (event) => {
  console.log("Event received:", JSON.stringify(event, null, 2));

  if (event.requestContext?.http?.method === "OPTIONS") {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: ""
    };
  }

  try {
    const chapterId = event.pathParameters?.chapterId;
    if (!chapterId) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: "Chapter ID is required" })
      };
    }

    let body;
    try {
      body = JSON.parse(event.body || "{}");
    } catch (e) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: "Invalid JSON in request body" })
      };
    }

    // Must be admin to edit chapter configuration
    const claims = event.requestContext?.authorizer?.jwt?.claims;
    if (!claims) {
      return {
        statusCode: 401,
        headers: corsHeaders,
        body: JSON.stringify({ error: "Unauthorized: Missing claims" })
      };
    }

    const groups = claims["cognito:groups"] || [];
    let isAuthorized = false;

    if (Array.isArray(groups) && groups.includes("admin")) {
      isAuthorized = true;
    } else if (typeof groups === 'string' && groups.includes("admin")) {
      isAuthorized = true;
    }

    if (!isAuthorized) {
      return {
        statusCode: 403,
        headers: corsHeaders,
        body: JSON.stringify({ error: "Forbidden: Admin access required" })
      };
    }

    // Validations
    if (body.isPaid && (typeof body.registrationFee !== 'number' || body.registrationFee <= 0)) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: "Valid registration fee required for paid chapters" })
      };
    }

    const { isPaid, registrationFee } = body;
    const now = new Date().toISOString();

    const configItem = {
      chapterId: chapterId,
      transactionId: `CONFIG#${chapterId}`,
      recordType: "FEE_CONFIG",
      isPaid: Boolean(isPaid),
      registrationFee: isPaid ? Math.round(Number(registrationFee)) : 0,
      updatedAt: now,
      updatedBy: claims.email || "admin"
    };

    console.log("Saving new chapter payment config:", configItem);

    await docClient.send(new PutCommand({
      TableName: PAYMENTS_TABLE,
      Item: configItem
    }));

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        success: true,
        message: "Chapter payment configuration updated",
        config: configItem
      })
    };
  } catch (error) {
    console.error("❌ Error updating chapter payment config:", error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ 
        error: "Failed to update chapter payment configuration",
        details: error.message 
      })
    };
  }
};
