import type { NextFunction, Request, Response } from "express";
import { sendTextRequestSchema } from "./messaging.schemas.js";
import type { MessagingService } from "./messaging.service.js";

export class MessagingController {
  constructor(private readonly service: MessagingService) {}

  sendFromPortal = async (
    request: Request,
    response: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const tenantId = request.userAuth?.tenantId;
      const actorId = request.userAuth?.cognitoSub;
      if (!tenantId || !actorId) {
        response.status(403).json({ error: "Tenant access required" });
        return;
      }
      const input = sendTextRequestSchema.parse(request.body);
      const result = await this.service.sendText(input, {
        tenantId,
        source: "portal",
        actorType: "user",
        actorId
      });
      response.status(result.status === "sent" ? 200 : 202).json(result);
    } catch (error) {
      next(error);
    }
  };
}
