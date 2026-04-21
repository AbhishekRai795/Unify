import { OAuth2Client } from "google-auth-library";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import { getGoogleCredentials, getBaseUrl } from "./google-utils.mjs";

const client = new DynamoDBClient({ region: "ap-south-1" });
const docClient = DynamoDBDocumentClient.from(client);

export const handler = async (event) => {
  console.log("=== Google OAuth Callback ===");
  
  try {
    const { code, state: userId } = event.queryStringParameters || {};
    
    if (!code || !userId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Missing code or state" }),
      };
    }

    const { client_id, client_secret } = await getGoogleCredentials();
    const baseUrl = getBaseUrl(event);
    const redirectUri = `${baseUrl}/api/google/oauth/callback`;

    const oauth2Client = new OAuth2Client(client_id, client_secret, redirectUri);

    // Exchange auth code for tokens
    const { tokens } = await oauth2Client.getToken(code);
    
    if (!tokens.refresh_token) {
      console.warn("No refresh token returned. User may have already authorized. Ensure prompt=consent was used.");
      // If we don't have a refresh token, we might still have an access token, but we need the refresh token for long-term use.
    }

    // Save tokens to DynamoDB
    // Note: In a real production app, refresh tokens should be encrypted.
    const item = {
      userId: userId,
      refreshToken: tokens.refresh_token,
      accessToken: tokens.access_token, // expiry is short, but good for immediate use
      expiryDate: tokens.expiry_date,
      updatedAt: new Date().toISOString()
    };

    // If refresh_token is missing (already authorized), only update other fields if we find the record
    // But since we used prompt=consent, we should get it.
    
    await docClient.send(new PutCommand({
      TableName: "GoogleOAuthTokens",
      Item: item
    }));

    console.log(`Saved Google OAuth tokens for user: ${userId}`);

    // Return success HTML to close the popup
    return {
      statusCode: 200,
      headers: { "Content-Type": "text/html" },
      body: `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Authentication Successful</title>
          <style>
            body { font-family: sans-serif; text-align: center; padding: 50px; background: #0f172a; color: white; }
            .card { background: #1e293b; padding: 20px; border-radius: 12px; display: inline-block; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>Success!</h1>
            <p>Your Google account has been connected to Unify.</p>
            <p>You can close this window now.</p>
          </div>
          <script>
            if (window.opener) {
              window.opener.postMessage("google-oauth-success", "*");
            }
            setTimeout(() => window.close(), 3000);
          </script>
        </body>
        </html>
      `
    };
  } catch (error) {
    console.error("Error in Google OAuth Callback:", error);
    return {
      statusCode: 500,
      headers: { "Content-Type": "text/html" },
      body: `<h1>Authentication Failed</h1><p>${error.message}</p>`
    };
  }
};
