// getChapterFees.mjs
// Lambda function to fetch chapter fee information for display in student portal
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";

const dynamoClient = new DynamoDBClient({ region: "ap-south-1" });
const docClient = DynamoDBDocumentClient.from(dynamoClient);

const PAYMENTS_TABLE = "ChapterPayments";
const CHAPTERS_TABLE = "Chapters";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type,Authorization",
  "Access-Control-Allow-Methods": "GET,OPTIONS"
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
    // Extract chapterId from path parameters or query string
    const chapterId = event.pathParameters?.chapterId || 
                      event.queryStringParameters?.chapterId;

    if (!chapterId) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: "chapterId is required" })
      };
    }

    // Get chapter basic info to verify it exists
    const chapterResponse = await docClient.send(new GetCommand({
      TableName: CHAPTERS_TABLE,
      Key: { chapterId }
    }));

    if (!chapterResponse.Item) {
      return {
        statusCode: 404,
        headers: corsHeaders,
        body: JSON.stringify({ error: "Chapter not found" })
      };
    }

    const chapter = chapterResponse.Item;

    // Get fee configuration for this chapter
    const configKey = `CONFIG#${chapterId}`;
    const feeConfigResponse = await docClient.send(new GetCommand({
      TableName: PAYMENTS_TABLE,
      Key: {
        chapterId,
        transactionId: configKey
      }
    }));

    const feeConfig = feeConfigResponse.Item || {
      chapterId,
      isPaid: false,
      registrationFee: 0,
      currencyCode: "INR"
    };

    // Get payment statistics for this chapter (optional)
    const paymentStatsResponse = await docClient.send(new QueryCommand({
      TableName: PAYMENTS_TABLE,
      KeyConditionExpression: "chapterId = :chapterId AND begins_with(transactionId, :type)",
      ExpressionAttributeValues: {
        ":chapterId": chapterId,
        ":type": "TRANSACTION"
      },
      Select: "COUNT"
    }));

    const totalTransactions = paymentStatsResponse.Count || 0;

    // Get completed payments count
    const completedPaymentsResponse = await docClient.send(new QueryCommand({
      TableName: PAYMENTS_TABLE,
      KeyConditionExpression: "chapterId = :chapterId AND begins_with(transactionId, :type)",
      FilterExpression: "paymentStatus = :status",
      ExpressionAttributeValues: {
        ":chapterId": chapterId,
        ":type": "TRANSACTION",
        ":status": "COMPLETED"
      },
      Select: "COUNT"
    }));

    const completedPayments = completedPaymentsResponse.Count || 0;

    console.log("   Chapter fee information retrieved:", {
      chapterId,
      isPaid: feeConfig.isPaid,
      fee: feeConfig.registrationFee,
      totalTransactions,
      completedPayments
    });

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        success: true,
        chapterInfo: {
          chapterId: chapter.chapterId,
          chapterName: chapter.chapterName,
          status: chapter.status,
          registrationOpen: chapter.registrationOpen
        },
        feeInfo: {
          isPaid: feeConfig.isPaid,
          registrationFee: feeConfig.registrationFee,
          currencyCode: feeConfig.currencyCode,
          displayFee: feeConfig.registrationFee > 0 ? `₹${(feeConfig.registrationFee / 100).toFixed(2)}` : "Free"
        },
        paymentStats: {
          totalTransactions,
          completedPayments,
          successRate: totalTransactions > 0 ? ((completedPayments / totalTransactions) * 100).toFixed(2) + "%" : "N/A"
        }
      })
    };
  } catch (error) {
    console.error("  Error in getChapterFees:", error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ 
        error: "Failed to fetch chapter fee information",
        details: error.message 
      })
    };
  }
};
