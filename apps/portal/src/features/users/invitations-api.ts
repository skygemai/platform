import { controlPlaneRequest } from "../../api/client";
import type { User } from "./users-api";

export type InvitationRole = "owner" | "admin" | "member" | "viewer";

export interface InviteUserInput {
  email: string;
  displayName: string | null;
  tenantId: string;
  role: InvitationRole;
}

export interface Invitation {
  id: string;
  userId: string;
  tenantId: string;
  email: string;
  role: InvitationRole;
  status: "pending" | "accepted" | "cancelled" | "failed";
  attemptCount: number;
  lastSentAt: string | null;
  acceptedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface InviteUserResult {
  invitation: Invitation;
  user: User;
  membershipId: string;
  emailSent: boolean;
}

export async function inviteUser(input: InviteUserInput): Promise<InviteUserResult> {
  return controlPlaneRequest<InviteUserResult>("/api/invitations", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export async function resendInvitation(invitationId: string): Promise<Invitation> {
  const result = await controlPlaneRequest<{ invitation: Invitation }>(
    `/api/invitations/${invitationId}/resend`,
    { method: "POST" }
  );
  return result.invitation;
}
