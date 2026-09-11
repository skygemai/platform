import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import type { AgentConfigurationsService } from "./agent-configurations.service.js";

const tenantIdSchema = z.string().uuid();
const agentConfigurationIdSchema = z.string().uuid();
const agentInputSchema = z.object({
  tenantId: tenantIdSchema,
  retellAgentId: z.string().trim().min(1).max(255),
  displayName: z.string().trim().min(1).max(200),
  active: z.boolean().default(true)
});

const rotateKeySchema = z.object({ tenantId: tenantIdSchema });

function postgresErrorCode(error: unknown): string | null {
  if (!error || typeof error !== "object" || !("code" in error)) return null;
  return typeof error.code === "string" ? error.code : null;
}

export class AgentConfigurationsController {
  constructor(private readonly service: AgentConfigurationsService) {}

  list = async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = tenantIdSchema.parse(request.query.tenantId);
      response.json({ agentConfigurations: await this.service.list(tenantId) });
    } catch (error) {
      next(error);
    }
  };

  create = async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    try {
      const input = agentInputSchema.parse(request.body);
      response.status(201).json(await this.service.create(input));
    } catch (error) {
      if (postgresErrorCode(error) === "23505") {
        response.status(409).json({ error: "That Retell agent ID is already configured." });
        return;
      }
      if (postgresErrorCode(error) === "23503") {
        response.status(400).json({ error: "The selected tenant does not exist." });
        return;
      }
      next(error);
    }
  };

  update = async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    try {
      const id = agentConfigurationIdSchema.parse(request.params.agentConfigurationId);
      const input = agentInputSchema.parse(request.body);
      const agentConfiguration = await this.service.update(id, input);
      if (!agentConfiguration) {
        response.status(404).json({ error: "Agent configuration not found." });
        return;
      }
      response.json({ agentConfiguration });
    } catch (error) {
      if (postgresErrorCode(error) === "23505") {
        response.status(409).json({ error: "That Retell agent ID is already configured." });
        return;
      }
      next(error);
    }
  };

  rotateActionKey = async (
    request: Request,
    response: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const id = agentConfigurationIdSchema.parse(request.params.agentConfigurationId);
      const { tenantId } = rotateKeySchema.parse(request.body);
      const actionKey = await this.service.rotateActionKey(tenantId, id);
      if (!actionKey) {
        response.status(404).json({ error: "Agent configuration not found." });
        return;
      }
      response.json({ actionKey });
    } catch (error) {
      next(error);
    }
  };
}
