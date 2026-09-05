import { getAccessToken } from "../auth/token";

const apiBaseUrl = String(import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080");

async function responseBody<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? `API request failed with status ${response.status}`);
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export async function apiGet<T>(path: string): Promise<T> {
  const token = await getAccessToken();
  const response = await fetch(`${apiBaseUrl}${path}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return responseBody<T>(response);
}

/** Local control-plane request. Protect these routes before production deployment. */
export async function controlPlaneRequest<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...options,
    headers: options?.body
      ? { "Content-Type": "application/json", ...options.headers }
      : options?.headers
  });

  return responseBody<T>(response);
}
