import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, QueryCommand, ScanCommand, UpdateCommand, GetCommand } from "@aws-sdk/lib-dynamodb";

const dynamoClient = new DynamoDBClient({ region: "ap-south-1" });
const docClient = DynamoDBDocumentClient.from(dynamoClient);

const CERTIFICATES_TABLE = "Certificates";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type,Authorization",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS"
};

const cleanItem = (item) => Object.fromEntries(
  Object.entries(item).filter(([, value]) => value !== undefined && value !== null && value !== "")
);

const uniqueByCertificateKey = (items = []) => {
  const map = new Map();
  for (const item of items) {
    if (!item?.eventId || !item?.userId) continue;
    map.set(`${item.eventId}-${item.userId}`, item);
  }
  return Array.from(map.values());
};

const listCertificatesForUserIds = async (userIds) => {
  const ids = Array.from(new Set((userIds || []).filter(Boolean)));
  if (ids.length === 0) return [];

  const items = [];
  for (const userId of ids) {
    try {
      const response = await docClient.send(new QueryCommand({
        TableName: CERTIFICATES_TABLE,
        IndexName: "UserIdIndex",
        KeyConditionExpression: "userId = :uid",
        ExpressionAttributeValues: {
          ":uid": userId
        }
      }));
      items.push(...(response.Items || []));
    } catch (error) {
      if (error?.name !== "ValidationException") throw error;

      console.warn("UserIdIndex unavailable; falling back to scan for certificates:", error.message);
      const response = await docClient.send(new ScanCommand({
        TableName: CERTIFICATES_TABLE,
        FilterExpression: "userId = :uid",
        ExpressionAttributeValues: {
          ":uid": userId
        }
      }));
      items.push(...(response.Items || []));
    }
  }

  return uniqueByCertificateKey(items);
};

export const handler = async (event) => {
  console.log("Certificate event received:", JSON.stringify(event, null, 2));

  // Handle OPTIONS for CORS
  if (event.requestContext.http.method === "OPTIONS") {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: ""
    };
  }

  try {
    const method = event.requestContext.http.method;
    const rawPath = event.rawPath || event.requestContext.http.path;
    console.log(`Method: ${method}, Path: ${rawPath}`);

    // Standardize path by removing stage prefix if present
    const path = rawPath.replace(/^\/dev\//, "/").replace(/^\/prod\//, "/");

    // POST /api/certificates/issue
    if (method === "POST" && path === "/api/certificates/issue") {
      const body = JSON.parse(event.body || "{}");
      const certificates = Array.isArray(body.certificates) ? body.certificates : [body];
      const issuedAt = new Date().toISOString();
      const issued = [];

      for (const certificate of certificates) {
        const { eventId, userId, studentName, studentEmail, certificateType, eventName, chapterName, date } = certificate;

        if (!eventId || !userId || !certificateType) {
          return {
            statusCode: 400,
            headers: corsHeaders,
            body: JSON.stringify({ error: "Missing required fields: eventId, userId, certificateType" })
          };
        }

        const item = cleanItem({
          eventId,
          userId,
          studentName,
          studentEmail,
          certificateType,
          eventName,
          chapterName,
          date,
          issuedAt
        });

        // CHECK IF CERTIFICATE ALREADY EXISTS to avoid duplicate points
        const checkExisting = await docClient.send(new GetCommand({
          TableName: CERTIFICATES_TABLE,
          Key: { eventId, userId }
        }));

        const isNewCertificate = !checkExisting.Item;

        await docClient.send(new PutCommand({
          TableName: CERTIFICATES_TABLE,
          Item: item
        }));

        // If it's a new certificate (not a reissue), credit 20 reward points
        if (isNewCertificate) {
          console.log(`New certificate for user ${userId} in event ${eventId}. Crediting 20 points.`);
          
          // Credit 20 reward points to student's wallet
          await docClient.send(new UpdateCommand({
            TableName: "Wallet",
            Key: { userId },
            UpdateExpression: "SET balance = if_not_exists(balance, :zero) + :inc, lastUpdated = :now",
            ExpressionAttributeValues: {
              ":inc": 20,
              ":zero": 0,
              ":now": new Date().toISOString()
            }
          }));

          // Record transaction in WalletTransactionsTable
          const transactionId = `TX-${Date.now()}-${userId}`;
          await docClient.send(new PutCommand({
            TableName: "WalletTransactions",
            Item: {
              userId,
              transactionId,
              type: "CREDIT",
              amount: 20,
              description: `Reward points for ${eventName || 'certificate'}`,
              timestamp: new Date().toISOString(),
              referenceId: eventId
            }
          }));
        } else {
          console.log(`Certificate already exists for user ${userId} in event ${eventId}. Skipping points credit.`);
        }

        issued.push(item);
      }

      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          success: true,
          certificate: issued[0],
          certificates: issued,
          count: issued.length
        })
      };
    }

    // GET /api/certificates/event?eventId=...
    if (method === "GET" && path === "/api/certificates/event") {
      const eventId = event.queryStringParameters?.eventId;
      if (!eventId) {
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({ error: "eventId is required" })
        };
      }

      const response = await docClient.send(new QueryCommand({
        TableName: CERTIFICATES_TABLE,
        KeyConditionExpression: "eventId = :eid",
        ExpressionAttributeValues: {
          ":eid": eventId
        }
      }));

      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({ certificates: response.Items || [] })
      };
    }

    // GET /api/certificates/my
    if (method === "GET" && path === "/api/certificates/my") {
      const authHeader = event.headers.authorization || event.headers.Authorization;
      if (!authHeader) {
        return {
          statusCode: 401,
          headers: corsHeaders,
          body: JSON.stringify({ error: "Unauthorized" })
        };
      }

      // Extract userId from Cognito JWT claims
      // In HTTP API with Cognito Authorizer, the context has the claims
      const claims = event.requestContext.authorizer?.jwt?.claims || {};
      const userIds = [claims.sub, claims.email, claims.username, claims["cognito:username"]];
      
      if (!userIds.some(Boolean)) {
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({ error: "Could not identify user from token" })
        };
      }

      const certificates = await listCertificatesForUserIds(userIds);

      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({ certificates })
      };
    }

    return {
      statusCode: 404,
      headers: corsHeaders,
      body: JSON.stringify({ error: "Route not found" })
    };

  } catch (error) {
    console.error("Error in certificate handler:", error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: "Internal server error", details: error.message })
    };
  }
};
