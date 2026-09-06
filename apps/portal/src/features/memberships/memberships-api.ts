import { controlPlaneRequest } from "../../api/client";

export const membershipRoles = ["owner", "admin", "member", "viewer"] as const;
export type MembershipRole = (typeof membershipRoles)[number];

export interface Membership {
  id: string;
  userId: string;
  tenantId: string;
  role: MembershipRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  userEmail: string;
  userDisplayName: string | null;
  tenantName: string;
  tenantSlug: string;
}

export interface MembershipInput {
  userId: string;
  tenantId: string;
  role: MembershipRole;
  isActive: boolean;
}

export async function listMemberships(): Promise<Membership[]> {
  const result = await controlPlaneRequest<{ memberships: Membership[] }>("/api/memberships");
  return result.memberships;
}

export async function createMembership(input: MembershipInput): Promise<Membership> {
  const result = await controlPlaneRequest<{ membership: Membership }>("/api/memberships", {
    method: "POST",
    body: JSON.stringify(input)
  });
  return result.membership;
}

export async function updateMembership(id: string, input: MembershipInput): Promise<Membership> {
  const result = await controlPlaneRequest<{ membership: Membership }>(`/api/memberships/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input)
  });
  return result.membership;
}

export async function deleteMembership(id: string): Promise<void> {
  await controlPlaneRequest<void>(`/api/memberships/${id}`, { method: "DELETE" });
}
