import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import type { TenantsRepository } from "./tenants.repository.js";
import { PLATFORM_ADMIN_GROUP } from "../../middleware/require-platform-admin.js";

const tenantIdSchema = z.string().uuid();

const tenantInputSchema = z.object({
  name: z.string().trim().min(1).max(160),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9]+(?:_[a-z0-9]+)*$/, "Use lowercase letters, numbers, and underscores"),
  isActive: z.boolean().default(true)
});

const ownerTenantInputSchema = tenantInputSchema
  .pick({ name: true, slug: true })
  .strict();

function postgresErrorCode(error: unknown): string | null {
  if (typeof error !== "object" || error === null || !("code" in error)) return null;
  return typeof error.code === "string" ? error.code : null;
}

export class TenantsController {
  constructor(private readonly repository: TenantsRepository) {}

  list = async (
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

      const tenants = identity.groups.includes(PLATFORM_ADMIN_GROUP)
        ? await this.repository.list()
        : await this.repository.listForOwner(identity.cognitoSub);

      response.json({ tenants });
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
      const input = tenantInputSchema.parse(request.body);
      const tenant = await this.repository.create(input);
      response.status(201).json({ tenant });
    } catch (error) {
      if (postgresErrorCode(error) === "23505") {
        response.status(409).json({ error: "A tenant with that slug already exists." });
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
      const id = tenantIdSchema.parse(request.params.tenantId);
      const identity = request.userAuth;
      if (!identity) {
        response.status(401).json({ error: "Authentication required" });
        return;
      }

      const isPlatformAdmin = identity.groups.includes(PLATFORM_ADMIN_GROUP);

      const tenant = isPlatformAdmin
        ? await this.repository.update(id, tenantInputSchema.parse(request.body))
        : await this.repository.updateForOwner(
            id,
            identity.cognitoSub,
            ownerTenantInputSchema.parse(request.body)
          );

      if (!tenant) {
        response.status(404).json({ error: "Tenant not found or you do not have permission to edit it" });
        return;
      }

      response.json({ tenant });
    } catch (error) {
      if (postgresErrorCode(error) === "23505") {
        response.status(409).json({ error: "A tenant with that slug already exists." });
        return;
      }
      next(error);
    }
  };

  disable = async (
    request: Request,
    response: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const id = tenantIdSchema.parse(request.params.tenantId);
      const disabled = await this.repository.disable(id);

      if (!disabled) {
        response.status(404).json({ error: "Tenant not found" });
        return;
      }

      response.status(204).send();
    } catch (error) {
      next(error);
    }
  };
}
