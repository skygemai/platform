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
