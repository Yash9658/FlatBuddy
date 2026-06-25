import { env } from "../config/env.js";

export function isGoogleOAuthConfigured() {
  return Boolean(
    env.GOOGLE_CLIENT_ID &&
      env.GOOGLE_CLIENT_SECRET &&
      env.GOOGLE_CALLBACK_URL &&
      env.GOOGLE_CLIENT_ID !== "your-google-client-id" &&
      env.GOOGLE_CLIENT_SECRET !== "your-google-client-secret",
  );
}
