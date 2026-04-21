import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";

const secretsClient = new SecretsManagerClient({ region: "ap-south-1" });

let cachedCredentials = null;
let credentialsCacheTime = 0;
const CACHE_TTL = 300000; // 5 minutes

export const getGoogleCredentials = async () => {
  try {
    if (cachedCredentials && Date.now() - credentialsCacheTime < CACHE_TTL) {
      return cachedCredentials;
    }

    const response = await secretsClient.send(new GetSecretValueCommand({
      SecretId: "unify/google/credentials"
    }));

    if (!response.SecretString) {
      throw new Error("Google secret value not found");
    }

    cachedCredentials = JSON.parse(response.SecretString);
    credentialsCacheTime = Date.now();

    return cachedCredentials;
  } catch (error) {
    console.error("Error retrieving Google credentials:", error);
    throw new Error(`Failed to retrieve Google credentials: ${error.message}`);
  }
};

export const getBaseUrl = (event) => {
  const host = event.headers.host;
  const protocol = event.headers["x-forwarded-proto"] || "https";
  const stage = event.requestContext.stage;
  return `${protocol}://${host}/${stage}`;
};
