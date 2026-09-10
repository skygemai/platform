import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { CognitoInvitationsNotConfiguredError } from "../../integrations/aws/cognito-invitations.client.js";
import { invitationRoles } from "./invitation.js";
import {
  InvitationIdentityConflictError,
  InvitationTenantNotFoundError
} from "./invitations.repository.js";
import { InvitationNotFoundError, type InvitationsService } from "./invitations.service.js";

const invitationIdSchema = z.string().uuid();
const invitationInputSchema = z.object({
  email: z.string().trim().email().max(320),
  displayName: z.string().trim().max(120).nullable().optional(),
  tenantId: z.string().uuid(),
  role: z.enum(invitationRoles)
});

function isAwsServiceError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "$metadata" in error;
}

export class InvitationsController {
  constructor(private readonly service: InvitationsService) {}

  create = async (
    request: Request,
    response: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const identity = request.userAuth;
      if (!identity) {
        response.status(401).json({ error: "Authentication required" });
        return;
      }

      const input = invitationInputSchema.parse(request.body);
      const result = await this.service.invite({
        email: input.email,
        displayName: input.displayName ?? null,
        tenantId: input.tenantId,
        role: input.role,
        invitedByCognitoSub: identity.cognitoSub
      });

      response.status(201).json(result);
    } catch (error) {
      if (error instanceof InvitationIdentityConflictError) {
        response.status(409).json({ error: error.message });
        return;
      }
      if (error instanceof InvitationTenantNotFoundError) {
        response.status(400).json({ error: error.message });
        return;
      }
      if (error instanceof CognitoInvitationsNotConfiguredError) {
        response.status(503).json({ error: "Cognito invitations are not configured" });
        return;
      }
      if (isAwsServiceError(error)) {
        response.status(502).json({ error: "Cognito could not create or send the invitation" });
        return;
      }
      next(error);
    }
  };

  resend = async (
    request: Request,
    response: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const invitationId = invitationIdSchema.parse(request.params.invitationId);
      const invitation = await this.service.resend(invitationId);
      response.json({ invitation });
    } catch (error) {
      if (error instanceof InvitationNotFoundError) {
        response.status(404).json({ error: error.message });
        return;
      }
      if (error instanceof CognitoInvitationsNotConfiguredError) {
        response.status(503).json({ error: "Cognito invitations are not configured" });
        return;
      }
      if (isAwsServiceError(error)) {
        response.status(502).json({ error: "Cognito could not resend the invitation" });
        return;
      }
      next(error);
    }
  };
}
