import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import type { TenantsRepository } from "./tenants.repository.js";

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

function postgresErrorCode(error: unknown): string | null {
  if (typeof error !== "object" || error === null || !("code" in error)) return null;
  return typeof error.code === "string" ? error.code : null;
}

export class TenantsController {
  constructor(private readonly repository: TenantsRepository) {}

  list = async (
    _request: Request,
    response: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      response.json({ tenants: await this.repository.list() });
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
      const input = tenantInputSchema.parse(request.body);
      const tenant = await this.repository.update(id, input);

      if (!tenant) {
        response.status(404).json({ error: "Tenant not found" });
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

  delete = async (
    request: Request,
    response: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const id = tenantIdSchema.parse(request.params.tenantId);
      const result = await this.repository.delete(id);

      if (result === "not_found") {
        response.status(404).json({ error: "Tenant not found" });
        return;
      }

      if (result === "has_dependencies") {
        response.status(409).json({
          error: "This tenant has related records and cannot be deleted. Deactivate it instead."
        });
        return;
      }

      response.status(204).send();
    } catch (error) {
      next(error);
    }
  };
}
