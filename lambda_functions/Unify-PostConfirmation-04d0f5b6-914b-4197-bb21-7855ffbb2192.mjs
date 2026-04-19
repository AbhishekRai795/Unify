// Unify Post Confirmation Trigger
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import { CognitoIdentityProviderClient, AdminAddUserToGroupCommand } from "@aws-sdk/client-cognito-identity-provider";

const region = "ap-south-1";
const client = new DynamoDBClient({ region });
const ddbDocClient = DynamoDBDocumentClient.from(client);
const cognitoClient = new CognitoIdentityProviderClient({ region });

export const handler = async (event) => {
  console.log("Event received:", JSON.stringify(event, null, 2));
  
  const { sub, email } = event.request.userAttributes;
  const name = event.request.userAttributes.name || "N/A";
  const sapIdString = event.request.userAttributes["custom:sapId"] || "0";
  const year = event.request.userAttributes["custom:year"] || "N/A";
  const sapId = parseInt(sapIdString, 10) || 0;

  // Save to DynamoDB, always as 'student' at creation
  const params = {
    TableName: "Unify-Users",
    Item: {
      userId: sub,
      email,
      name,
      sapId,
      year,
      userType: "student", // Always "student" on initial registration
      registeredChapters: [],
      createdAt: new Date().toISOString()
    }
  };
  try {
    await ddbDocClient.send(new PutCommand(params));

    // Always add to Cognito "student" group after signup
    await cognitoClient.send(
      new AdminAddUserToGroupCommand({
        UserPoolId: event.userPoolId,
        Username: event.userName,
        GroupName: "student"
      })
    );

    console.log("Added to DynamoDB and student group");
    return event;
  } catch (err) {
    console.error("Error:", err);
    throw new Error(`Failed to save user or assign group: ${err.message}`);
  }
};
