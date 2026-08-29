/**
 * Replace this with your Cognito sign-in library's access-token function.
 * VITE_DEV_ACCESS_TOKEN is accepted only by Vite's development mode.
 */
export async function getAccessToken(): Promise<string> {
  if (import.meta.env.DEV && import.meta.env.VITE_DEV_ACCESS_TOKEN) {
    return String(import.meta.env.VITE_DEV_ACCESS_TOKEN);
  }
  throw new Error("Connect Amazon Cognito before using the production portal");
}
