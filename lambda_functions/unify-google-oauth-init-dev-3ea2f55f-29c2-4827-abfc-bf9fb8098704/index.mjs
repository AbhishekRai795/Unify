import { OAuth2Client } from "google-auth-library";
import { getGoogleCredentials, getBaseUrl } from "./google-utils.mjs";

export const handler = async (event) => {
  console.log("=== Google OAuth Init ===");
  
  try {
    const userId = event.requestContext.authorizer?.jwt?.claims?.sub;
    if (!userId) {
      return {
        statusCode: 401,
        body: JSON.stringify({ message: "Unauthorized: No user ID found in token" }),
      };
    }

    const { client_id, client_secret } = await getGoogleCredentials();
    const baseUrl = getBaseUrl(event);
    const redirectUri = `${baseUrl}/api/google/oauth/callback`;

    const oauth2Client = new OAuth2Client(client_id, client_secret, redirectUri);

    // Access scopes for Calendar and Meet
    const scopes = [
      "https://www.googleapis.com/auth/calendar.events",
      "https://www.googleapis.com/auth/calendar.readonly",
      "openid",
      "email",
      "profile"
    ];

    const authorizeUrl = oauth2Client.generateAuthUrl({
      access_type: "offline",
      scope: scopes,
      include_granted_scopes: true,
      prompt: "consent", // Force consent to ensure refresh token is returned
      state: userId // Pass userId in state to correlate in callback
    });

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "*",
        "Access-Control-Allow-Methods": "GET,OPTIONS",
      },
      body: JSON.stringify({ url: authorizeUrl }),
    };
  } catch (error) {
    console.error("Error initializing Google OAuth:", error);
    return {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "*",
      },
      body: JSON.stringify({ message: "Failed to initialize Google OAuth", error: error.message }),
    };
  }
};
