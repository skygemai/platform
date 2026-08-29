import { getAccessToken } from "../auth/token";

const apiBaseUrl = String(import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080");

export async function apiGet<T>(path: string): Promise<T> {
  const token = await getAccessToken();
  const response = await fetch(`${apiBaseUrl}${path}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!response.ok) {
    throw new Error(`API request failed with status ${response.status}`);
  }
  return response.json() as Promise<T>;
}
