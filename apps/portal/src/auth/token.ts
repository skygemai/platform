import { fetchAuthSession } from "aws-amplify/auth";

export async function getAccessToken(): Promise<string> {
  if (import.meta.env.DEV && import.meta.env.VITE_DEV_USER_SUB) {
    return "development-bypass";
  }

  if (import.meta.env.DEV && import.meta.env.VITE_DEV_ACCESS_TOKEN) {
    return String(import.meta.env.VITE_DEV_ACCESS_TOKEN);
  }

  const session = await fetchAuthSession();
  const token = session.tokens?.accessToken?.toString();
  if (!token) throw new Error("Authentication required");
  return token;
}
