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
const USERS_TABLE = process.env.USERS_TABLE || "Unify-Users";
const REGISTRATION_TABLE = process.env.REGISTRATION_TABLE || "RegistrationRequests";
const RAZORPAY_SECRET_NAME = process.env.RAZORPAY_SECRET_NAME || "unify/razorpay/credentials";

const corsHeaders = {
  "Access-Control-Allow-Origin": process.env.ALLOWED_ORIGIN || "*",
  "Access-Control-Allow-Headers": "Content-Type,Authorization",
  "Access-Control-Allow-Methods": "GET,OPTIONS"
};

const normalizeGroups = (claims = {}) => {
  const raw = claims["cognito:groups"];
  if (Array.isArray(raw)) {
    return raw
      .map((g) => String(g).replace(/[\[\]"]/g, "").trim().toLowerCase())
      .filter(Boolean);
  }
  if (typeof raw === "string") {
    return raw
      .replace(/[\[\]"]/g, "")
      .split(",")
      .map((g) => g.trim().toLowerCase())
      .filter(Boolean);
  }
  return [];
};

const isAdminGroup = (groupName = "") => {
  const g = String(groupName || "").trim().toLowerCase();
  return g === "admin" || g === "admins" || g === "administrator" || g === "administrators" || g.includes("admin");
};

const toAmountRupees = (value) => {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n : 0;
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
  if (event.requestContext?.http?.method === "OPTIONS") {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: ""
    };
  }

  try {
    const claims = event.requestContext?.authorizer?.jwt?.claims || {};
    const groups = normalizeGroups(claims);
    const isAdmin = groups.some(isAdminGroup) || isAdminGroup(claims["custom:role"] || "");
    if (!isAdmin) {
      return {
        statusCode: 403,
        headers: corsHeaders,
        body: JSON.stringify({ error: "Forbidden: Admin access required" })
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

    const eventsResponse = await docClient.send(new QueryCommand({
      TableName: EVENTS_TABLE,
      KeyConditionExpression: "chapterId = :chapterId",
      ExpressionAttributeValues: {
        ":chapterId": chapterId
      }
    }));
    const events = eventsResponse.Items || [];

    const eventById = new Map(events.map((e) => [e.eventId, e]));

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
    }));
    const approvedRegistrations = approvedRegistrationsResponse.Items || [];

    const userIds = Array.from(new Set([
      ...paymentRecordsRaw.map((r) => r.userId),
      ...approvedRegistrations.map((r) => r.userId)
    ].filter(Boolean)));

    let usersById = new Map();
    if (userIds.length > 0) {
      const userKeys = userIds.map((userId) => ({ userId }));
      const userResp = await docClient.send(new BatchGetCommand({
        RequestItems: {
          [USERS_TABLE]: {
            Keys: userKeys
          }
        }
      })).catch((err) => {
        console.warn("Failed to fetch user details for transparency:", err.message);
        return { Responses: {} };
      });
      const users = userResp?.Responses?.[USERS_TABLE] || [];
      usersById = new Map(users.map((u) => [u.userId, u]));
    }

    const enrolledMembers = approvedRegistrations.map((reg) => {
      const user = usersById.get(reg.userId) || {};
      return {
        userId: reg.userId,
        studentName: reg.studentName || user.name || "Unknown",
        studentEmail: reg.studentEmail || user.email || "",
        sapId: reg.sapId || user.sapId || null,
        year: reg.year || user.year || null,
        approvedAt: reg.processedAt || null,
        registeredChaptersCount: Array.isArray(user.registeredChapters) ? user.registeredChapters.length : 0
      };
    });

    const paymentRecords = paymentRecordsRaw.map((tx) => {
      const user = usersById.get(tx.userId) || {};
      const event = eventById.get(tx.eventId) || {};
      const amountInRupees = tx.paymentStatus === "NA" ? 0 : toAmountRupees(tx.amount);
      return {
        chapterId: tx.chapterId || chapterId,
        eventId: tx.eventId,
        eventTitle: tx.title || event.title || "Event",
        isEventPaid: !!event.isPaid,
        userId: tx.userId,
        studentName: tx.studentName || user.name || "Unknown",
        studentEmail: tx.studentEmail || user.email || "",
        sapId: user.sapId || null,
        year: user.year || null,
        paymentStatus: tx.paymentStatus || "UNKNOWN",
        amountInRupees,
        transactionId: tx.transactionId || null,
        razorpayOrderId: tx.razorpayOrderId || null,
        razorpayPaymentId: tx.razorpayPaymentId || null,
        createdAt: tx.createdAt || tx.joinedAt || null,
        completedAt: tx.completedAt || null,
        joinedAt: tx.joinedAt || null
      };
    }).sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

    const eventStats = events.map((evt) => {
      const rows = paymentRecords.filter((r) => r.eventId === evt.eventId);
      const enrolledCount = rows.filter((r) => r.paymentStatus === "COMPLETED" || r.paymentStatus === "NA").length;
      const completedPaidCount = rows.filter((r) => r.paymentStatus === "COMPLETED").length;
      const pendingCount = rows.filter((r) => r.paymentStatus === "PENDING").length;
      const failedCount = rows.filter((r) => String(r.paymentStatus || "").startsWith("FAILED")).length;
      const revenueInRupees = rows
        .filter((r) => r.paymentStatus === "COMPLETED")
        .reduce((sum, r) => sum + toAmountRupees(r.amountInRupees), 0);
      return {
        eventId: evt.eventId,
        title: evt.title,
        isPaid: !!evt.isPaid,
        registrationFee: Number(evt.registrationFee || 0),
        currentAttendees: Number(evt.currentAttendees || 0),
        maxAttendees: evt.maxAttendees ?? null,
        enrolledCount,
        completedPaidCount,
        pendingCount,
        failedCount,
        revenueInRupees: Number(revenueInRupees.toFixed(2))
      };
    }).sort((a, b) => b.revenueInRupees - a.revenueInRupees);

    const uniqueEnrolled = new Set(
      paymentRecords
        .filter((r) => r.paymentStatus === "COMPLETED" || r.paymentStatus === "NA")
        .map((r) => r.userId)
    );

    const overallStats = {
      chapterId,
      chapterName: chapter.chapterName,
      chapterMembersCountFromChapterTable: Number(chapter.memberCount || 0),
      chapterEnrolledMembersCountFromRegistrations: enrolledMembers.length,
      uniqueStudentsWithEventRegistrations: uniqueEnrolled.size,
      totalEvents: events.length,
      totalPaidEvents: events.filter((e) => e.isPaid).length,
      totalEventRegistrationRows: paymentRecords.length,
      totalCompletedPayments: paymentRecords.filter((r) => r.paymentStatus === "COMPLETED").length,
      totalPendingPayments: paymentRecords.filter((r) => r.paymentStatus === "PENDING").length,
      totalFailedPayments: paymentRecords.filter((r) => String(r.paymentStatus || "").startsWith("FAILED")).length,
      totalRevenueInRupees: Number(
        paymentRecords
          .filter((r) => r.paymentStatus === "COMPLETED")
          .reduce((sum, r) => sum + toAmountRupees(r.amountInRupees), 0)
          .toFixed(2)
      )
    };

    const razorpayInsights = {
      attempted: includeRazorpay,
      available: false,
      sampledPayments: 0,
      methodBreakdown: {},
      statusBreakdown: {},
      notes: "Razorpay API enrichment was skipped."
    };

    if (includeRazorpay) {
      const razorpay = await getRazorpayClient();
      const paymentIds = Array.from(new Set(
        paymentRecords
          .filter((r) => r.paymentStatus === "COMPLETED" && r.razorpayPaymentId)
          .map((r) => r.razorpayPaymentId)
      ));
      const sampleIds = paymentIds.slice(0, 25);

      if (razorpay && sampleIds.length > 0) {
        try {
          const fetched = await Promise.all(
            sampleIds.map((paymentId) => razorpay.payments.fetch(paymentId).catch(() => null))
          );
          const methodBreakdown = {};
          const statusBreakdown = {};
          for (const row of fetched.filter(Boolean)) {
            const method = row.method || "unknown";
            const status = row.status || "unknown";
            methodBreakdown[method] = (methodBreakdown[method] || 0) + 1;
            statusBreakdown[status] = (statusBreakdown[status] || 0) + 1;
          }
          razorpayInsights.available = true;
          razorpayInsights.sampledPayments = fetched.filter(Boolean).length;
          razorpayInsights.methodBreakdown = methodBreakdown;
          razorpayInsights.statusBreakdown = statusBreakdown;
          razorpayInsights.notes = "Insights are sampled from up to 25 completed payments.";
        } catch (error) {
          razorpayInsights.notes = `Razorpay enrichment failed: ${error.message}`;
        }
      } else if (!razorpay) {
        razorpayInsights.notes = "Razorpay credentials unavailable or invalid.";
      } else {
        razorpayInsights.notes = "No completed Razorpay payment IDs found for this chapter.";
      }
    }

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        success: true,
        chapter: {
          chapterId,
          chapterName: chapter.chapterName,
          headName: chapter.headName || "",
          headEmail: chapter.headEmail || ""
        },
        overallStats,
        eventStats,
        enrolledMembers,
        paymentRecords,
        razorpayInsights
      })
    };
  } catch (error) {
    console.error("Error in admin payment transparency:", error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        error: "Failed to load admin payment transparency data",
        details: error.message
      })
    };
  }
};
