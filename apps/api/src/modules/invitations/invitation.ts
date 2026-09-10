export const invitationRoles = ["owner", "admin", "member", "viewer"] as const;
export type InvitationRole = (typeof invitationRoles)[number];

export type InvitationStatus = "pending" | "accepted" | "cancelled" | "failed";

export interface InvitationRecord {
  id: string;
  userId: string;
  tenantId: string;
  email: string;
  role: InvitationRole;
  status: InvitationStatus;
  attemptCount: number;
  lastSentAt: string | null;
  acceptedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface InvitedUserRecord {
  id: string;
  email: string;
  displayName: string | null;
  cognitoSub: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface InvitationResult {
  invitation: InvitationRecord;
  user: InvitedUserRecord;
  membershipId: string;
  emailSent: boolean;
}
