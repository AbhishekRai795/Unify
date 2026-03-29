// getPaymentDetails.mjs
// Lambda function to fetch payment history and transaction details
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";

const dynamoClient = new DynamoDBClient({ region: "ap-south-1" });
const docClient = DynamoDBDocumentClient.from(dynamoClient);

const PAYMENTS_TABLE = "ChapterPayments";

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
    // Extract user info from JWT
    const claims = event.requestContext?.authorizer?.jwt?.claims;
    if (!claims) {
      return {
        statusCode: 401,
        headers: corsHeaders,
        body: JSON.stringify({ error: "Unauthorized" })
      };
    }

    const userId = claims.sub;
    const queryType = event.queryStringParameters?.type || "user"; // user or transaction
    const chapterId = event.queryStringParameters?.chapterId;
    const transactionId = event.queryStringParameters?.transactionId;

    // Case 1: Get specific transaction details
    if (queryType === "transaction" && chapterId && transactionId) {
      const response = await docClient.send(new GetCommand({
        TableName: PAYMENTS_TABLE,
        Key: {
          chapterId,
          transactionId
        }
      }));

      if (!response.Item) {
        return {
          statusCode: 404,
          headers: corsHeaders,
          body: JSON.stringify({ error: "Transaction not found" })
        };
      }

      // Verify the user owns this transaction
      if (response.Item.userId !== userId && response.Item.recordType === "TRANSACTION") {
        return {
          statusCode: 403,
          headers: corsHeaders,
          body: JSON.stringify({ error: "You don't have permission to view this transaction" })
        };
      }

      const transaction = response.Item;
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          success: true,
          transaction: {
            transactionId: transaction.transactionId,
            chapterId: transaction.chapterId,
            userId: transaction.userId,
            amount: transaction.amount,
            displayAmount: `₹${(transaction.amount / 100).toFixed(2)}`,
            paymentStatus: transaction.paymentStatus,
            razorpayOrderId: transaction.razorpayOrderId,
            razorpayPaymentId: transaction.razorpayPaymentId,
            receiptUrl: transaction.receiptUrl,
            receiptId: transaction.receiptId,
            studentName: transaction.studentName,
            studentEmail: transaction.studentEmail,
            createdAt: transaction.createdAt,
            completedAt: transaction.completedAt,
            notes: transaction.notes
          }
        })
      };
    }

    // Case 2: Get all transactions for a specific user
    if (queryType === "user") {
      // Query by userId using GSI (UserIdIndex)
      const response = await docClient.send(new QueryCommand({
        TableName: PAYMENTS_TABLE,
        IndexName: "UserIdIndex",
        KeyConditionExpression: "userId = :userId AND begins_with(#t, :txType)",
        ExpressionAttributeNames: {
          "#t": "transactionId"
        },
        ExpressionAttributeValues: {
          ":userId": userId,
          ":txType": "TRANSACTION"
        },
        ScanIndexForward: false, // Most recent first
        Limit: 50
      }));

      const transactions = (response.Items || []).map(tx => ({
        transactionId: tx.transactionId,
        chapterId: tx.chapterId,
        amount: tx.amount,
        displayAmount: `₹${(tx.amount / 100).toFixed(2)}`,
        paymentStatus: tx.paymentStatus,
        razorpayPaymentId: tx.razorpayPaymentId,
        receiptUrl: tx.receiptUrl,
        receiptId: tx.receiptId,
        createdAt: tx.createdAt,
        completedAt: tx.completedAt
      }));

      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          success: true,
          count: transactions.length,
          transactions
        })
      };
    }

    // Case 3: Get transactions for a specific chapter
    if (queryType === "chapter" && chapterId) {
      const response = await docClient.send(new QueryCommand({
        TableName: PAYMENTS_TABLE,
        KeyConditionExpression: "chapterId = :chapterId AND begins_with(transactionId, :txType)",
        ExpressionAttributeValues: {
          ":chapterId": chapterId,
          ":txType": "TRANSACTION"
        },
        ScanIndexForward: false, // Most recent first
        Limit: 100
      }));

      const statistics = {
        total: 0,
        completed: 0,
        failed: 0,
        pending: 0,
        totalAmount: 0,
        completedAmount: 0
      };

      const transactions = (response.Items || []).map(tx => {
        statistics.total++;
        if (tx.paymentStatus === "COMPLETED") {
          statistics.completed++;
          statistics.completedAmount += tx.amount || 0;
        } else if (tx.paymentStatus === "FAILED") {
          statistics.failed++;
        } else if (tx.paymentStatus === "PENDING") {
          statistics.pending++;
        }

        return {
          transactionId: tx.transactionId,
          userId: tx.userId,
          studentName: tx.studentName,
          studentEmail: tx.studentEmail,
          amount: tx.amount,
          displayAmount: `₹${(tx.amount / 100).toFixed(2)}`,
          paymentStatus: tx.paymentStatus,
          razorpayPaymentId: tx.razorpayPaymentId,
          createdAt: tx.createdAt,
          completedAt: tx.completedAt
        };
      });

      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          success: true,
          chapterId,
          statistics: {
            ...statistics,
            displayCompletedAmount: `₹${(statistics.completedAmount / 100).toFixed(2)}`,
            successRate: statistics.total > 0 ? ((statistics.completed / statistics.total) * 100).toFixed(2) + "%" : "N/A"
          },
          transactions
        })
      };
    }

    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ 
        error: "Invalid query parameters",
        info: "Use type=user, type=transaction with chapterId+transactionId, or type=chapter with chapterId"
      })
    };

  } catch (error) {
    console.error("❌ Error in getPaymentDetails:", error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ 
        error: "Failed to fetch payment details",
        details: error.message 
      })
    };
  }
};
