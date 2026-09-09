import { getAccessToken } from "../auth/token";
import { getSelectedTenantId } from "../auth/tenant-selection";

const apiBaseUrl = String(import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080");

async function responseBody<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? `API request failed with status ${response.status}`);
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export async function authorizedRequest<T>(path: string, options?: RequestInit): Promise<T> {
  const headers = new Headers(options?.headers);
  headers.set("Authorization", `Bearer ${await getAccessToken()}`);

  if (options?.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const tenantId = getSelectedTenantId();
  if (tenantId) headers.set("X-Tenant-Id", tenantId);

  if (import.meta.env.DEV && import.meta.env.VITE_DEV_USER_SUB) {
    headers.set("X-Dev-User-Sub", String(import.meta.env.VITE_DEV_USER_SUB));
    headers.set("X-Dev-User-Groups", String(import.meta.env.VITE_DEV_USER_GROUPS ?? ""));
    if (import.meta.env.VITE_DEV_USER_EMAIL) {
      headers.set("X-Dev-User-Email", String(import.meta.env.VITE_DEV_USER_EMAIL));
    }
  }

  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...options,
    headers
  });

  return responseBody<T>(response);
}

export async function apiGet<T>(path: string): Promise<T> {
  return authorizedRequest<T>(path);
}

export async function controlPlaneRequest<T>(path: string, options?: RequestInit): Promise<T> {
  return authorizedRequest<T>(path, options);
}
