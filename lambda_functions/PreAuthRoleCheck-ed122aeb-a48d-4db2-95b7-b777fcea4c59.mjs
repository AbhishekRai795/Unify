// Unify Pre-Authentication/Pre-SignUp Lambda Trigger (NO ROLE PARAM)
import { CognitoIdentityProviderClient, AdminListGroupsForUserCommand } from "@aws-sdk/client-cognito-identity-provider";

const region = "ap-south-1";
const cognitoClient = new CognitoIdentityProviderClient({ region });

export const handler = async (event) => {
  console.log("Pre-auth event:", JSON.stringify(event));
  const source = event.triggerSource;
  const username = event.userName;
  const userPoolId = event.userPoolId;

  // Skip any custom validation for admin-created users
  if (source === "PreSignUp_AdminCreateUser") {
    console.log("Admin user creation detected.");
    return event;
  }
  
  // Optionally log the groups for audit, does NOT enforce group at this point
  try {
    const res = await cognitoClient.send(
      new AdminListGroupsForUserCommand({
        Username: username,
        UserPoolId: userPoolId,
      })
    );
    const userGroups = (res.Groups || []).map(g => g.GroupName);
    console.log(`User '${username}' belongs to groups: ${userGroups}`);
  } catch (err) {
    // Not an error for sign-ups; new users won't be in any group yet!
    console.log("Could not list groups (likely new user):", err.message);
  }

  // Just accept
  return event;
};
