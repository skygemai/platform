import { controlPlaneRequest } from "../../api/client";

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TenantInput {
  name: string;
  slug: string;
  isActive: boolean;
}

export async function listTenants(): Promise<Tenant[]> {
  const result = await controlPlaneRequest<{ tenants: Tenant[] }>("/api/tenants");
  return result.tenants;
}

export async function createTenant(input: TenantInput): Promise<Tenant> {
  const result = await controlPlaneRequest<{ tenant: Tenant }>("/api/tenants", {
    method: "POST",
    body: JSON.stringify(input)
  });
  return result.tenant;
}

export async function updateTenant(id: string, input: TenantInput): Promise<Tenant> {
  const result = await controlPlaneRequest<{ tenant: Tenant }>(`/api/tenants/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input)
  });
  return result.tenant;
}

export async function deleteTenant(id: string): Promise<void> {
  await controlPlaneRequest<void>(`/api/tenants/${id}`, { method: "DELETE" });
}
