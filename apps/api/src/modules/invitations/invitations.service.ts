import type { CognitoInvitationsClient } from "../../integrations/aws/cognito-invitations.client.js";
import type { InvitationResult, InvitationRole, InvitationRecord } from "./invitation.js";
import {
  InvitationIdentityConflictError,
  type InvitationsRepository
} from "./invitations.repository.js";

export class InvitationNotFoundError extends Error {
  constructor() {
    super("Pending invitation not found");
    this.name = "InvitationNotFoundError";
  }
}

export interface InviteUserInput {
  email: string;
  displayName: string | null;
  tenantId: string;
  role: InvitationRole;
  invitedByCognitoSub: string;
}

export class InvitationsService {
  constructor(
    private readonly repository: InvitationsRepository,
    private readonly cognito: CognitoInvitationsClient
  ) {}

  async invite(input: InviteUserInput): Promise<InvitationResult> {
    const email = input.email.trim().toLowerCase();
    const databaseUser = await this.repository.findUserByEmail(email);
    let cognitoIdentity = await this.cognito.findByEmail(email);
    let createdCognitoUser = false;
    let emailSent = false;

    if (databaseUser?.cognitoSub && cognitoIdentity?.sub !== databaseUser.cognitoSub) {
      throw new InvitationIdentityConflictError(
        cognitoIdentity
          ? "The database user and Cognito user have different identities"
          : "The database user is linked to a Cognito identity that was not found in this user pool"
      );
    }

    if (!cognitoIdentity) {
      cognitoIdentity = await this.cognito.createAndInvite(email, input.displayName);
      createdCognitoUser = true;
      emailSent = true;
    } else if (cognitoIdentity.status === "FORCE_CHANGE_PASSWORD") {
      await this.cognito.resend(cognitoIdentity.username);
      emailSent = true;
    }

    const status = cognitoIdentity.status === "CONFIRMED" ? "accepted" : "pending";

    try {
      const result = await this.repository.provision({
        email,
        displayName: input.displayName,
        tenantId: input.tenantId,
        role: input.role,
        cognitoSub: cognitoIdentity.sub,
        cognitoUsername: cognitoIdentity.username,
        invitedByCognitoSub: input.invitedByCognitoSub,
        status,
        emailSent
      });
      return { ...result, emailSent };
    } catch (error) {
      if (createdCognitoUser) {
        try {
          await this.cognito.deleteUser(cognitoIdentity.username);
        } catch (cleanupError) {
          console.error("Failed to remove Cognito user after invitation rollback", cleanupError);
        }
      }
      throw error;
    }
  }

  async resend(invitationId: string): Promise<InvitationRecord> {
    const invitation = await this.repository.findPendingInvitation(invitationId);
    if (!invitation) throw new InvitationNotFoundError();

    await this.cognito.resend(invitation.cognitoUsername);
    return this.repository.markResent(invitation.id);
  }
}
