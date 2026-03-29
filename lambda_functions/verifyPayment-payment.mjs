// verifyPayment.mjs
// Lambda function to verify Razorpay payment and update DynamoDB records
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, UpdateCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { verifyPaymentSignature, getRazorpayPaymentDetails } from "./razorpay-utils.mjs";

const dynamoClient = new DynamoDBClient({ region: "ap-south-1" });
const docClient = DynamoDBDocumentClient.from(dynamoClient);
const s3Client = new S3Client({ region: "ap-south-1" });

const PAYMENTS_TABLE = "ChapterPayments";
const REGISTRATION_TABLE = "RegistrationRequests";
const USERS_TABLE = "Unify-Users";
const RECEIPTS_BUCKET = "unify-payment-receipts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type,Authorization",
  "Access-Control-Allow-Methods": "POST,OPTIONS"
};

const generateReceiptPDF = (paymentDetails) => {
  // Generate HTML receipt content
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Payment Receipt</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        .container { max-width: 600px; margin: 0 auto; border: 1px solid #ddd; padding: 30px; }
        .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
        .header h1 { margin: 0; color: #333; }
        .header p { margin: 5px 0; color: #666; font-size: 14px; }
        .details { margin: 20px 0; }
        .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
        .detail-label { font-weight: bold; color: #333; }
        .detail-value { color: #666; }
        .amount { font-size: 24px; color: #27ae60; font-weight: bold; }
        .status { 
          display: inline-block; 
          padding: 8px 16px; 
          border-radius: 4px; 
          background-color: #27ae60; 
          color: white; 
          font-weight: bold;
          margin: 10px 0;
        }
        .footer { text-align: center; margin-top: 40px; color: #999; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Unify</h1>
          <p>Chapter Registration Payment Receipt</p>
        </div>
        
        <div class="details">
          <div class="detail-row">
            <span class="detail-label">Receipt ID:</span>
            <span class="detail-value">${paymentDetails.receiptId}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Chapter Name:</span>
            <span class="detail-value">${paymentDetails.chapterName}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Student Name:</span>
            <span class="detail-value">${paymentDetails.studentName}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Student Email:</span>
            <span class="detail-value">${paymentDetails.studentEmail}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Amount Paid:</span>
            <span class="detail-value amount">₹${(paymentDetails.amount / 100).toFixed(2)}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Payment Method:</span>
            <span class="detail-value">Razorpay</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Payment ID:</span>
            <span class="detail-value">${paymentDetails.razorpayPaymentId}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Order ID:</span>
            <span class="detail-value">${paymentDetails.razorpayOrderId}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Status:</span>
            <span class="status">${paymentDetails.paymentStatus}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Date & Time:</span>
            <span class="detail-value">${new Date(paymentDetails.completedAt).toLocaleString('en-IN')}</span>
          </div>
        </div>
        
        <div class="footer">
          <p>This is an automatically generated receipt. Please keep it for your records.</p>
          <p>For any queries, contact: support@unify.edu</p>
        </div>
      </div>
    </body>
    </html>
  `;
  return html;
};

export const handler = async (event) => {
  console.log("Verification event received:", JSON.stringify(event, null, 2));

  if (event.requestContext?.http?.method === "OPTIONS") {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: ""
    };
  }

  try {
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

    const { razorpayOrderId, razorpayPaymentId, razorpaySignature, transactionId, chapterId } = body;

    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature || !transactionId) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ 
          error: "Missing required payment verification parameters" 
        })
      };
    }

    // Verify Razorpay signature
    const isSignatureValid = await verifyPaymentSignature(
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature
    );

    if (!isSignatureValid) {
      console.error("❌ Payment signature verification failed");
      
      // Update transaction status to FAILED
      await docClient.send(new UpdateCommand({
        TableName: PAYMENTS_TABLE,
        Key: {
          chapterId,
          transactionId
        },
        UpdateExpression: "SET paymentStatus = :status, errorMessage = :error, updatedAt = :timestamp",
        ExpressionAttributeValues: {
          ":status": "FAILED",
          ":error": "Signature verification failed",
          ":timestamp": new Date().toISOString()
        }
      }));

      return {
        statusCode: 401,
        headers: corsHeaders,
        body: JSON.stringify({ 
          error: "Payment verification failed: Invalid signature" 
        })
      };
    }

    // Get payment details from Razorpay
    const paymentDetails = await getRazorpayPaymentDetails(razorpayPaymentId);

    if (paymentDetails.status !== "captured" && paymentDetails.status !== "authorized") {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ 
          error: `Payment not captured. Status: ${paymentDetails.status}` 
        })
      };
    }

    // Get transaction from DynamoDB
    const transactionResponse = await docClient.send(new GetCommand({
      TableName: PAYMENTS_TABLE,
      Key: {
        chapterId,
        transactionId
      }
    }));

    if (!transactionResponse.Item) {
      return {
        statusCode: 404,
        headers: corsHeaders,
        body: JSON.stringify({ error: "Transaction not found" })
      };
    }

    const transaction = transactionResponse.Item;
    const { userId, studentEmail, studentName, receiptId, amount } = transaction;

    // Generate receipt and upload to S3
    const receiptContent = generateReceiptPDF({
      receiptId,
      chapterName: body.chapterName || "Chapter",
      studentName,
      studentEmail,
      amount,
      razorpayPaymentId,
      razorpayOrderId,
      paymentStatus: "COMPLETED",
      completedAt: new Date().toISOString()
    });

    const receiptKey = `receipts/${chapterId}/${userId}/${receiptId}.html`;

    try {
      await s3Client.send(new PutObjectCommand({
        Bucket: RECEIPTS_BUCKET,
        Key: receiptKey,
        Body: receiptContent,
        ContentType: "text/html",
        Metadata: {
          "payment-id": razorpayPaymentId,
          "order-id": razorpayOrderId,
          "receipt-id": receiptId
        }
      }));
      console.log("✅ Receipt uploaded to S3:", receiptKey);
    } catch (s3Error) {
      console.warn("⚠️  Warning: Could not upload receipt to S3", s3Error);
      // Continue even if receipt upload fails
    }

    const receiptUrl = `https://${RECEIPTS_BUCKET}.s3.ap-south-1.amazonaws.com/${receiptKey}`;

    // Update transaction record as COMPLETED
    await docClient.send(new UpdateCommand({
      TableName: PAYMENTS_TABLE,
      Key: {
        chapterId,
        transactionId
      },
      UpdateExpression: `SET 
        paymentStatus = :status,
        razorpayPaymentId = :paymentId,
        razorpaySignature = :signature,
        receiptUrl = :url,
        completedAt = :timestamp,
        updatedAt = :timestamp
      `,
      ExpressionAttributeValues: {
        ":status": "COMPLETED",
        ":paymentId": razorpayPaymentId,
        ":signature": razorpaySignature,
        ":url": receiptUrl,
        ":timestamp": new Date().toISOString()
      }
    }));

    console.log("✅ Payment verified successfully:", {
      paymentId: razorpayPaymentId,
      orderId: razorpayOrderId,
      transactionId,
      amount,
      user: studentEmail
    });

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        success: true,
        message: "Payment verified successfully",
        paymentId: razorpayPaymentId,
        transactionId,
        receiptUrl,
        receiptId,
        status: "COMPLETED"
      })
    };
  } catch (error) {
    console.error("❌ Error in verifyPayment:", error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ 
        error: "Payment verification failed",
        details: error.message 
      })
    };
  }
};
