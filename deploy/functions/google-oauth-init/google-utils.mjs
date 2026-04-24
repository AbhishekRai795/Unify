export const getGoogleCredentials = async () => {
  const client_id = process.env.GOOGLE_CLIENT_ID;
  const client_secret = process.env.GOOGLE_CLIENT_SECRET;

  if (!client_id || !client_secret) {
    throw new Error("Google Client ID or Secret missing in environment variables");
  }

  return {
    client_id,
    client_secret
  };
};

export const getBaseUrl = (event) => {
  const host = event.headers.host;
  const protocol = event.headers["x-forwarded-proto"] || "https";
  const stage = event.requestContext.stage;
  return `${protocol}://${host}/${stage}`;
};
