import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, UpdateCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({ region: "ap-south-1" });
const docClient = DynamoDBDocumentClient.from(client);

export const handler = async (event) => {
  console.log("=== Mark Notification Read ===");
  
  try {
    const userId = event.requestContext.authorizer?.jwt?.claims?.sub;
    const { notificationId } = event.pathParameters || {};
    
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH"
    };

    if (!userId || !notificationId) {
      return { 
        statusCode: 400, 
        headers: corsHeaders,
        body: JSON.stringify({ message: "Missing userId or notificationId" }) 
      };
    }

    if (notificationId === "all") {
      // Query unread notifications
      const unreadData = await docClient.send(new QueryCommand({
        TableName: "UnifyNotifications",
        KeyConditionExpression: "userId = :userId",
        FilterExpression: "isRead = :isRead",
        ExpressionAttributeValues: {
          ":userId": userId,
          ":isRead": false
        }
      }));

      const unreadItems = unreadData.Items || [];
      console.log(`Found ${unreadItems.length} unread notifications to mark as read`);

      if (unreadItems.length > 0) {
        // Update all unread items
        await Promise.all(unreadItems.map(item => 
          docClient.send(new UpdateCommand({
            TableName: "UnifyNotifications",
            Key: { userId, notificationId: item.notificationId },
            UpdateExpression: "SET isRead = :val",
            ExpressionAttributeValues: {
              ":val": true
            }
          }))
        ));
      }
    } else {
      await docClient.send(new UpdateCommand({
        TableName: "UnifyNotifications",
        Key: { userId, notificationId },
        UpdateExpression: "SET isRead = :val",
        ExpressionAttributeValues: {
          ":val": true
        }
      }));
    }

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ message: "Notification marked as read", count: notificationId === "all" ? "multiple" : 1 }),
    };
  } catch (error) {
    console.error("Error marking notification read:", error);
    return {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH"
      },
      body: JSON.stringify({ message: "Failed to update notification", error: error.message }),
    };
  }
};
