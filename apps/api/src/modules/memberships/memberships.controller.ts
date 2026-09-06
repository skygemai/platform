import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { membershipRoles } from "./membership.js";
import type { MembershipsRepository } from "./memberships.repository.js";

const membershipIdSchema = z.string().uuid();

const membershipInputSchema = z.object({
  userId: z.string().uuid(),
  tenantId: z.string().uuid(),
  role: z.enum(membershipRoles),
  isActive: z.boolean().default(true)
});

function postgresErrorCode(error: unknown): string | null {
  if (typeof error !== "object" || error === null || !("code" in error)) return null;
  return typeof error.code === "string" ? error.code : null;
}

export class MembershipsController {
  constructor(private readonly repository: MembershipsRepository) {}

  list = async (
    _request: Request,
    response: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      response.json({ memberships: await this.repository.list() });
    } catch (error) {
      next(error);
    }
  };

  create = async (
    request: Request,
    response: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const input = membershipInputSchema.parse(request.body);
      const membership = await this.repository.create(input);
      response.status(201).json({ membership });
    } catch (error) {
      const code = postgresErrorCode(error);
      if (code === "23505") {
        response.status(409).json({ error: "That user already belongs to this tenant." });
        return;
      }
      if (code === "23503") {
        response.status(400).json({ error: "The selected user or tenant no longer exists." });
        return;
      }
      next(error);
    }
  };

  update = async (
    request: Request,
    response: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const id = membershipIdSchema.parse(request.params.membershipId);
      const input = membershipInputSchema.parse(request.body);
      const membership = await this.repository.update(id, input);

      if (!membership) {
        response.status(404).json({ error: "Membership not found" });
        return;
      }

      response.json({ membership });
    } catch (error) {
      const code = postgresErrorCode(error);
      if (code === "23505") {
        response.status(409).json({ error: "That user already belongs to this tenant." });
        return;
      }
      if (code === "23503") {
        response.status(400).json({ error: "The selected user or tenant no longer exists." });
        return;
      }
      next(error);
    }
  };

  delete = async (
    request: Request,
    response: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const id = membershipIdSchema.parse(request.params.membershipId);
      const deleted = await this.repository.delete(id);

      if (!deleted) {
        response.status(404).json({ error: "Membership not found" });
        return;
      }

      response.status(204).send();
    } catch (error) {
      next(error);
    }
  };
}
