// Helper utility for Razorpay and Secrets Manager operations
import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";

const secretsClient = new SecretsManagerClient({ region: "ap-south-1" });

let cachedCredentials = null;
let credentialsCacheTime = 0;
const CACHE_TTL = 300000; // 5 minutes

export const getRazorpayCredentials = async () => {
  try {
    // Return cached credentials if valid
    if (cachedCredentials && Date.now() - credentialsCacheTime < CACHE_TTL) {
      console.log("Using cached Razorpay credentials");
      return cachedCredentials;
    }

    const response = await secretsClient.send(new GetSecretValueCommand({
      SecretId: "unify/razorpay/credentials"
    }));

    if (!response.SecretString) {
      throw new Error("Secret value not found");
    }

    cachedCredentials = JSON.parse(response.SecretString);
    credentialsCacheTime = Date.now();

    console.log("   Razorpay credentials retrieved from Secrets Manager");
    return cachedCredentials;
  } catch (error) {
    console.error("  Error retrieving Razorpay credentials:", error);
    throw new Error(`Failed to retrieve Razorpay credentials: ${error.message}`);
  }
};

export const createRazorpayOrder = async (amount, chapterId, userId, receiptId, notes = "") => {
  try {
    const credentials = await getRazorpayCredentials();
    const apiKey = credentials.key_id;
    const apiSecret = credentials.key_secret;

    // Create Basic Auth header
    const auth = Buffer.from(`${apiKey}:${apiSecret}`).toString("base64");

    const orderData = {
      amount: amount, // amount in paise
      currency: "INR",
      receipt: receiptId,
      notes: {
        chapterId,
        userId,
        ...notes
      }
    };

    const response = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Authorization": `Basic ${auth}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(orderData)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Razorpay API error: ${error.error.description || error.error.code}`);
    }

    const order = await response.json();
    console.log("   Razorpay order created:", order.id);
    return order;
  } catch (error) {
    console.error("  Error creating Razorpay order:", error);
    throw error;
  }
};

export const verifyPaymentSignature = async (orderId, paymentId, signature) => {
  try {
    const credentials = await getRazorpayCredentials();
    const secret = credentials.key_secret;

    // Import crypto for verification
    const crypto = await import("crypto");

    // Create the expected signature
    const data = `${orderId}|${paymentId}`;
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(data)
      .digest("hex");

    const isSignatureValid = expectedSignature === signature;

    if (isSignatureValid) {
      console.log("   Payment signature verified successfully");
    } else {
      console.error("  Payment signature verification failed");
    }

    return isSignatureValid;
  } catch (error) {
    console.error("  Error verifying payment signature:", error);
    throw error;
  }
};

export const getRazorpayPaymentDetails = async (paymentId) => {
  try {
    const credentials = await getRazorpayCredentials();
    const apiKey = credentials.key_id;
    const apiSecret = credentials.key_secret;

    const auth = Buffer.from(`${apiKey}:${apiSecret}`).toString("base64");

    const response = await fetch(`https://api.razorpay.com/v1/payments/${paymentId}`, {
      method: "GET",
      headers: {
        "Authorization": `Basic ${auth}`,
        "Content-Type": "application/json"
      }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Razorpay API error: ${error.error.description}`);
    }

    const paymentDetails = await response.json();
    console.log("   Payment details retrieved:", paymentId);
    return paymentDetails;
  } catch (error) {
    console.error("  Error fetching payment details:", error);
    throw error;
  }
};

export const generateReceiptId = (chapterId, userId) => {
  const timestamp = Date.now();
  return `RCP-${chapterId}-${userId}-${timestamp}`;
};
