import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, QueryCommand, ScanCommand, BatchGetCommand } from "@aws-sdk/lib-dynamodb";
import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";
import Razorpay from "razorpay";

const dynamoClient = new DynamoDBClient({ region: "ap-south-1" });
const docClient = DynamoDBDocumentClient.from(dynamoClient);
const secretsClient = new SecretsManagerClient({ region: "ap-south-1" });

const CHAPTERS_TABLE = process.env.CHAPTERS_TABLE || "Chapters";
const EVENTS_TABLE = process.env.EVENTS_TABLE || "ChapterEvents";
const EVENT_PAYMENTS_TABLE = process.env.EVENT_PAYMENTS_TABLE || "EventPayments";
const CHAPTER_PAYMENTS_TABLE = "ChapterPayments";
const USERS_TABLE = process.env.USERS_TABLE || "Unify-Users";
const REGISTRATION_TABLE = process.env.REGISTRATION_TABLE || "RegistrationRequests";
const RAZORPAY_SECRET_NAME = process.env.RAZORPAY_SECRET_NAME || "unify/razorpay/credentials";

const corsHeaders = {
  "Access-Control-Allow-Origin": process.env.ALLOWED_ORIGIN || "*",
  "Access-Control-Allow-Headers": "Content-Type,Authorization",
  "Access-Control-Allow-Methods": "GET,OPTIONS"
};

const normalizeGroups = (claims = {}) => {
  // Check common Cognito group claim keys
  const raw = claims["cognito:groups"] || claims["groups"] || claims["custom:groups"];
  if (Array.isArray(raw)) {
    return raw
      .map((g) => String(g).replace(/[\[\]"]/g, "").trim())
      .filter(Boolean);
  }
  if (typeof raw === "string") {
    // Handle serialized JSON arrays like '["group1","group2"]' or comma-separated lists
    return raw
      .replace(/[\[\]"]/g, "")
      .split(",")
      .map((g) => g.trim())
      .filter(Boolean);
  }
  return [];
};

const isAuthorizedGroup = (groupName = "") => {
  const g = String(groupName || "").trim().toLowerCase();
  
  // 1. Explicit Admin checks
  if (g.includes("admin")) return true;
  
  // 2. Chapter Head checks (Handle variations like chapter-head, chapterhead, ChapterHead, chapter_head, etc.)
  // Use regex for robust "chapter" AND "head" matching
  const hasChapter = g.includes("chapter");
  const hasHead = g.includes("head");
  if (hasChapter && hasHead) return true;
  
  return false;
};

const toAmountRupees = (value) => {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n : 0;
};

const getPaymentPriority = (payment = {}) => {
  const status = String(payment.paymentStatus || "").toUpperCase();
  if (status === "COMPLETED") return 4;
  if (status === "FREE") return 3;
  if (status === "PENDING") return 2;
  if (status.startsWith("FAILED")) return 1;
  return 0;
};

const getPaymentTimestamp = (payment = {}) => {
  return new Date(
    payment.completedAt ||
    payment.updatedAt ||
    payment.createdAt ||
    0
  ).getTime();
};

async function getRazorpayClient() {
  try {
    const response = await secretsClient.send(new GetSecretValueCommand({ SecretId: RAZORPAY_SECRET_NAME }));
    const secret = JSON.parse(response.SecretString || "{}");
    if (!secret.key_id || !secret.key_secret) return null;
    return new Razorpay({ key_id: secret.key_id, key_secret: secret.key_secret });
  } catch (error) {
    console.warn("Unable to initialize Razorpay client:", error.message);
    return null;
  }
}

export const handler = async (event) => {
  // 1. Diagnostic Logging
  console.log("== Event Diagnostic Log ==");
  console.log("Path:", event.rawPath || event.path);
  
  // Log sanitized authorizer info
  const authorizer = event.requestContext?.authorizer || {};
  const claims = authorizer.jwt?.claims || authorizer.claims || {};
  console.log("User Email:", claims.email || "Unknown");
  console.log("User Sub:", claims.sub);
  
  const rawGroups = claims["cognito:groups"] || claims["groups"];
  console.log("Raw Groups Type:", typeof rawGroups);
  console.log("Raw Groups Value:", rawGroups);

  if (event.requestContext?.http?.method === "OPTIONS") {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: ""
    };
  }

  try {
    // 2. Authentication Check
    const groups = normalizeGroups(claims);
    console.log("Normalized Groups for check:", groups);
    
    // Check groups and custom role
    const isAuthorized = groups.some(isAuthorizedGroup) || 
                       isAuthorizedGroup(claims["custom:role"] || "") ||
                       isAuthorizedGroup(claims["role"] || "");
    
    if (!isAuthorized) {
      console.warn("Permission denied for groups/roles:", { groups, customRole: claims["custom:role"] });
      return {
        statusCode: 403,
        headers: corsHeaders,
        body: JSON.stringify({ 
          error: "Forbidden: Admin or Chapter Head access required",
          details: `Your current groups (${groups.join(", ")}) do not have the required permissions.`
        })
      };
    }

    const chapterId = event.queryStringParameters?.chapterId;
    if (!chapterId) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: "chapterId is required" })
      };
    }

    const includeRazorpay = (event.queryStringParameters?.includeRazorpay || "true") !== "false";

    // 3. Load Chapter Data
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

    // 4. Load Metadata (Events & Members)
    console.log(`Loading events and payments for chapterId: ${chapterId}...`);
    const eventsResponse = await docClient.send(new QueryCommand({
      TableName: EVENTS_TABLE,
      KeyConditionExpression: "chapterId = :chapterId",
      ExpressionAttributeValues: {
        ":chapterId": chapterId
      }
    }));
    const events = eventsResponse.Items || [];
    const eventById = new Map(events.map((e) => [e.eventId, e]));

    // 5. Load Payment Records (Events)
    const paymentLists = await Promise.all(events.map(async (evt) => {
      const result = await docClient.send(new QueryCommand({
        TableName: EVENT_PAYMENTS_TABLE,
        KeyConditionExpression: "eventId = :eventId",
        ExpressionAttributeValues: {
          ":eventId": evt.eventId
        }
      })).catch((err) => {
        console.warn(`Failed loading event payments for ${evt.eventId}:`, err.message);
        return { Items: [] };
      });
      return result.Items || [];
    }));

    const paymentRecordsRaw = paymentLists.flat();

    // 6. Load Chapter Registrations
    console.log(`Scanning registrations for chapterId: ${chapterId}...`);
    const approvedRegistrationsResponse = await docClient.send(new ScanCommand({
      TableName: REGISTRATION_TABLE,
      FilterExpression: "chapterId = :chapterId AND #status = :approved",
      ExpressionAttributeNames: {
        "#status": "status"
      },
      ExpressionAttributeValues: {
        ":chapterId": chapterId,
        ":approved": "approved"
      }
    })).catch((err) => {
      console.error("Non-critical error scanning registrations:", err.message);
      return { Items: [] };
    });
    const approvedRegistrations = approvedRegistrationsResponse.Items || [];

    // 6b. Load ChapterPayments records for chapter joining
    console.log(`Querying ChapterPayments for chapterId: ${chapterId}...`);
    const chapterPaymentsResponse = await docClient.send(new QueryCommand({
      TableName: CHAPTER_PAYMENTS_TABLE,
      KeyConditionExpression: "chapterId = :chapterId",
      ExpressionAttributeValues: {
        ":chapterId": chapterId
      }
    })).catch((err) => {
      console.error("Non-critical error querying ChapterPayments:", err.message);
      return { Items: [] };
    });
    
    // Filter out non-transaction metadata and keep the best payment record per user.
    const chapterPaymentRecords = (chapterPaymentsResponse.Items || []).filter((item) =>
      item?.userId &&
      item?.transactionId &&
      !String(item.transactionId).startsWith("CONFIG#")
    );

    const chapterPaymentByUserId = new Map();
    for (const record of chapterPaymentRecords) {
      const existing = chapterPaymentByUserId.get(record.userId);
      if (!existing) {
        chapterPaymentByUserId.set(record.userId, record);
        continue;
      }

      const existingPriority = getPaymentPriority(existing);
      const recordPriority = getPaymentPriority(record);
      if (
        recordPriority > existingPriority ||
        (recordPriority === existingPriority && getPaymentTimestamp(record) > getPaymentTimestamp(existing))
      ) {
        chapterPaymentByUserId.set(record.userId, record);
      }
    }

    // 7. Resolve Detailed User Information
    const userIds = Array.from(new Set([
      ...paymentRecordsRaw.map((r) => r.userId),
      ...approvedRegistrations.map((r) => r.userId),
      ...chapterPaymentRecords.map((r) => r.userId)
    ].filter(Boolean)));

    let usersById = new Map();
    if (userIds.length > 0) {
      console.log(`Fetching user details for ${userIds.length} unique userIds...`);
      const chunkSize = 100;
      let allUsers = [];
      for (let i = 0; i < userIds.length; i += chunkSize) {
        const chunk = userIds.slice(i, i + chunkSize);
        const userKeys = chunk.map((userId) => ({ userId }));
        try {
          const userResp = await docClient.send(new BatchGetCommand({
            RequestItems: {
              [USERS_TABLE]: {
                Keys: userKeys
              }
            }
          }));
          allUsers = allUsers.concat(userResp?.Responses?.[USERS_TABLE] || []);
        } catch (err) {
          console.warn(`Failed to fetch user batch starting at ${i}:`, err.message);
        }
      }
      usersById = new Map(allUsers.map((u) => [u.userId, u]));
    }

    // 8. Format Chapter Members Output — Merging Registrations with actual Payments
    console.log(`Formatting members list. Members: ${approvedRegistrations.length}, Payments found: ${chapterPaymentRecords.length}`);
    const enrolledMembers = approvedRegistrations.map((reg) => {
      const user = usersById.get(reg.userId) || {};
      const payment = chapterPaymentByUserId.get(reg.userId);
      
      if (!payment && chapterPaymentRecords.length > 0) {
        console.log(`[Diagnostic] No payment found for user ${reg.userId} (${reg.studentEmail}). Available payment userIds: ${Array.from(chapterPaymentByUserId.keys()).join(', ')}`);
      }
      
      // Chapter joining value should come directly from ChapterPayments.amount.
      const amountRaw = Number(payment?.amount || 0);
      
      return {
        userId: reg.userId,
        studentName: reg.studentName || user.name || payment?.studentName || "Unknown",
        studentEmail: reg.studentEmail || user.email || payment?.studentEmail || "",
        sapId: reg.sapId || user.sapId || null,
        year: reg.year || user.year || null,
        approvedAt: reg.processedAt || reg.updatedAt || null,
        paymentStatus: payment?.paymentStatus || (reg.status === "approved" ? "FREE" : "UNKNOWN"),
        amountPaid: amountRaw / 100,
        value: amountRaw / 100,
        transactionId: payment?.transactionId || null,
        razorpayPaymentId: payment?.razorpayPaymentId || null,
        notes: payment?.notes || reg.notes || null
      };
    });

    // 9. Format Event Payment Records Output
    const paymentRecords = paymentRecordsRaw.map((tx) => {
      const user = usersById.get(tx.userId) || {};
      const event = eventById.get(tx.eventId) || {};
      const amountInRupees = tx.paymentStatus === "NA" ? 0 : toAmountRupees(tx.amount);
      return {
        chapterId: tx.chapterId || chapterId,
        eventId: tx.eventId,
        eventTitle: tx.title || event.title || "Event",
        userId: tx.userId,
        studentName: tx.studentName || user.name || "Unknown",
        studentEmail: tx.studentEmail || user.email || "",
        sapId: user.sapId || null,
        year: user.year || null,
        paymentStatus: tx.paymentStatus || "UNKNOWN",
        amountInRupees,
        transactionId: tx.transactionId || null,
        razorpayPaymentId: tx.razorpayPaymentId || null,
        createdAt: tx.createdAt || tx.joinedAt || null,
        completedAt: tx.completedAt || null
      };
    }).sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

    // 10. Aggregated Event Performance
    const eventStats = events.map((evt) => {
      const rows = paymentRecords.filter((r) => r.eventId === evt.eventId);
      const revenue = rows
        .filter((r) => r.paymentStatus === "COMPLETED")
        .reduce((sum, r) => sum + (r.amountInRupees || 0), 0);
      return {
        eventId: evt.eventId,
        title: evt.title,
        isPaid: !!evt.isPaid,
        registrationFee: Number(evt.registrationFee || 0),
        enrolledCount: rows.filter((r) => r.paymentStatus === "COMPLETED" || r.paymentStatus === "NA").length,
        completedPaidCount: rows.filter((r) => r.paymentStatus === "COMPLETED").length,
        pendingCount: rows.filter((r) => r.paymentStatus === "PENDING").length,
        failedCount: rows.filter((r) => String(r.paymentStatus || "").startsWith("FAILED")).length,
        revenueInRupees: Number(revenue.toFixed(2))
      };
    }).sort((a, b) => b.revenueInRupees - a.revenueInRupees);

    // 11. Overall Summary
    const uniqueEnrolled = new Set([
      ...paymentRecords.filter(r => r.paymentStatus === "COMPLETED" || r.paymentStatus === "NA").map(r => r.userId),
      ...enrolledMembers.filter(r => r.paymentStatus === "COMPLETED" || r.paymentStatus === "FREE").map(r => r.userId)
    ]);
    
    const chapterRevenue = enrolledMembers
      .filter(r => r.paymentStatus === "COMPLETED")
      .reduce((sum, r) => sum + (r.value || 0), 0);
    
    const eventRevenue = paymentRecords
      .filter(r => r.paymentStatus === "COMPLETED")
      .reduce((sum, r) => sum + (r.amountInRupees || 0), 0);

    const successfulChapterRows = enrolledMembers.filter(
      (r) => r.paymentStatus === "COMPLETED" || r.paymentStatus === "FREE"
    ).length;
    const successfulEventRows = paymentRecords.filter(
      (r) => r.paymentStatus === "COMPLETED" || r.paymentStatus === "NA"
    ).length;
    const totalRegistrationRows = enrolledMembers.length + paymentRecords.length;

    const overallStats = {
      chapterId,
      chapterName: chapter.chapterName,
      chapterMembersCountFromChapterTable: Number(chapter.memberCount || 0),
      chapterEnrolledMembersCountFromRegistrations: enrolledMembers.length,
      uniqueStudentsWithEventRegistrations: uniqueEnrolled.size,
      totalEvents: events.length,
      totalCompletedPayments: successfulChapterRows + successfulEventRows,
      totalEventRegistrationRows: totalRegistrationRows,
      totalRevenueInRupees: Number((chapterRevenue + eventRevenue).toFixed(2))
    };

    // 12. Razorpay Insights
    const razorpayInsights = { available: false, notes: "Razorpay insights skipped." };
    if (includeRazorpay) {
      const razorpay = await getRazorpayClient();
      const pIds = Array.from(new Set(paymentRecords.filter(r => r.razorpayPaymentId).map(r => r.razorpayPaymentId))).slice(0, 20);
      if (razorpay && pIds.length > 0) {
        try {
          const fetched = await Promise.all(pIds.map(id => razorpay.payments.fetch(id).catch(() => null)));
          const methodBreakdown = {};
          const statusBreakdown = {};
          for (const row of fetched.filter(Boolean)) {
            methodBreakdown[row.method || "unknown"] = (methodBreakdown[row.method || "unknown"] || 0) + 1;
            statusBreakdown[row.status || "unknown"] = (statusBreakdown[row.status || "unknown"] || 0) + 1;
          }
          razorpayInsights.available = true;
          razorpayInsights.methodBreakdown = methodBreakdown;
          razorpayInsights.statusBreakdown = statusBreakdown;
          razorpayInsights.notes = "Sampled from recent completed payments.";
        } catch (e) { razorpayInsights.notes = `Razorpay error: ${e.message}`; }
      }
    }

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        success: true,
        chapter: { chapterId, chapterName: chapter.chapterName },
        overallStats,
        eventStats,
        enrolledMembers,
        paymentRecords,
        razorpayInsights
      })
    };
  } catch (error) {
    console.error("CRITICAL ERROR:", error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: "Internal Server Error", details: error.message })
    };
  }
};
