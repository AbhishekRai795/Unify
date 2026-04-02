// getPaymentDetails.mjs
// Lambda function to fetch payment history and transaction details
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const dynamoClient = new DynamoDBClient({ region: "ap-south-1" });
const docClient = DynamoDBDocumentClient.from(dynamoClient);
const s3Client = new S3Client({ region: "ap-south-1" });

const PAYMENTS_TABLE = "ChapterPayments";
const EVENT_PAYMENTS_TABLE = "EventPayments";
const RECEIPTS_BUCKET = process.env.RECEIPTS_BUCKET;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type,Authorization",
  "Access-Control-Allow-Methods": "GET,OPTIONS"
};

const getS3KeyFromReceiptUrl = (receiptUrl = "") => {
  if (!receiptUrl) return "";

  if (!receiptUrl.startsWith("http")) {
    return receiptUrl.replace(/^\/+/, "");
  }

  try {
    const parsed = new URL(receiptUrl);
    // If old URLs were stored with raw '#' in eventId, URL hash contains part of key.
    const rawPath = parsed.pathname.replace(/^\/+/, "");
    const hashPart = parsed.hash ? parsed.hash.substring(1) : "";
    const fullKey = hashPart ? `${rawPath}#${hashPart}` : rawPath;
    return decodeURIComponent(fullKey);
  } catch {
    return "";
  }
};

const getReceiptKeyFromRecord = (record = {}) => {
  if (record.receiptKey) return record.receiptKey;

  const fromUrl = getS3KeyFromReceiptUrl(record.receiptUrl || "");
  if (fromUrl) return fromUrl;

  // Fallback reconstruction for older event records without receiptKey
  if (record.eventId && record.userId && record.receiptId) {
    return `receipts/events/${record.eventId}/${record.userId}/${record.receiptId}.html`;
  }
  // Fallback reconstruction for chapter records without receiptKey
  if (record.chapterId && record.userId && record.receiptId) {
    return `receipts/${record.chapterId}/${record.userId}/${record.receiptId}.html`;
  }

  return "";
};

const toSignedReceiptUrl = async (record = {}) => {
  if (!RECEIPTS_BUCKET) return record.receiptUrl || "";
  const key = getReceiptKeyFromRecord(record);
  if (!key) return record.receiptUrl || "";

  try {
    return await getSignedUrl(
      s3Client,
      new GetObjectCommand({
        Bucket: RECEIPTS_BUCKET,
        Key: key
      }),
      { expiresIn: 3600 }
    );
  } catch (err) {
    console.warn("⚠️ Failed to sign receipt URL:", err?.message || err);
    return record.receiptUrl || "";
  }
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
      const signedReceiptUrl = await toSignedReceiptUrl(transaction);
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
            receiptUrl: signedReceiptUrl,
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
      // Query chapter payment transactions by userId
      const response = await docClient.send(new QueryCommand({
        TableName: PAYMENTS_TABLE,
        IndexName: "UserIdIndex",
        KeyConditionExpression: "userId = :userId",
        FilterExpression: "recordType = :recordType",
        ExpressionAttributeValues: {
          ":userId": userId,
          ":recordType": "TRANSACTION"
        },
        ScanIndexForward: false, // Most recent first
        Limit: 50
      }));

      const chapterTransactions = await Promise.all((response.Items || []).map(async (tx) => ({
        transactionId: tx.transactionId,
        chapterId: tx.chapterId,
        amount: tx.amount,
        amountInRupees: (tx.amount || 0) / 100,
        displayAmount: `₹${(tx.amount / 100).toFixed(2)}`,
        transactionType: "CHAPTER",
        paymentStatus: tx.paymentStatus,
        razorpayPaymentId: tx.razorpayPaymentId,
        receiptUrl: await toSignedReceiptUrl(tx),
        receiptId: tx.receiptId,
        createdAt: tx.createdAt,
        completedAt: tx.completedAt
      })));

      // Query event payment transactions/registrations by userId
      const eventResponse = await docClient.send(new QueryCommand({
        TableName: EVENT_PAYMENTS_TABLE,
        IndexName: "UserIdIndex",
        KeyConditionExpression: "userId = :userId",
        ExpressionAttributeValues: {
          ":userId": userId
        },
        ScanIndexForward: false,
        Limit: 100
      }));

      const eventTransactions = await Promise.all((eventResponse.Items || [])
        .filter((tx) => tx.paymentStatus === "COMPLETED" || tx.paymentStatus === "NA")
        .map(async (tx, index) => {
          const amountInRupees = tx.paymentStatus === "NA" ? 0 : Number(tx.amount || 0);
          return {
            transactionId: tx.transactionId || `EVT-${tx.eventId}-${index}`,
            chapterId: tx.chapterId,
            eventId: tx.eventId,
            amount: Math.round(amountInRupees * 100),
            amountInRupees,
            displayAmount: `₹${amountInRupees.toFixed(2)}`,
            transactionType: "EVENT",
            paymentStatus: tx.paymentStatus,
            razorpayPaymentId: tx.razorpayPaymentId,
            receiptUrl: await toSignedReceiptUrl(tx),
            receiptId: tx.receiptId || tx.razorpayOrderId || "",
            createdAt: tx.createdAt || tx.joinedAt,
            completedAt: tx.completedAt || tx.joinedAt
          };
        }));

      const transactions = [...chapterTransactions, ...eventTransactions].sort(
        (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
      );

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
