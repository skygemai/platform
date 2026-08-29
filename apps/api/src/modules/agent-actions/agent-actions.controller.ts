import type { NextFunction, Request, Response } from "express";
import { sendTextRequestSchema } from "@skygem/shared";
import type { MessagingService } from "../messaging/messaging.service.js";

export class AgentActionsController {
  constructor(private readonly messagingService: MessagingService) {}

  sendText = async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    try {
      const agent = request.agentAuth;
      if (!agent) {
        response.status(401).json({ error: "Agent authentication required" });
        return;
      }
      const input = sendTextRequestSchema.parse(request.body);
      const result = await this.messagingService.sendText(input, {
        tenantId: agent.tenantId,
        source: "agent",
        actorType: "agent",
        actorId: agent.retellAgentId,
        agentConfigurationId: agent.agentConfigId
      });
      response.status(result.status === "sent" ? 200 : 202).json(result);
    } catch (error) {
      next(error);
    }
  };
}
