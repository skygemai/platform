import type { NextFunction, Request, Response } from "express";
import { listCallsQuerySchema } from "./calls.schemas.js";
import type { CallsService } from "./calls.service.js";

export class CallsController {
  constructor(private readonly service: CallsService) {}

  list = async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = request.userAuth?.tenantId;
      if (!tenantId) {
        response.status(403).json({ error: "Tenant access required" });
        return;
      }
      const { limit, offset } = listCallsQuerySchema.parse(request.query);
      response.json(await this.service.list(tenantId, limit, offset));
    } catch (error) {
      next(error);
    }
  };

  get = async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = request.userAuth?.tenantId;
      const callId = request.params.callId;
      if (!tenantId || typeof callId !== "string") {
        response.status(400).json({ error: "Tenant and call ID are required" });
        return;
      }
      const call = await this.service.get(tenantId, callId);
      if (!call) {
        response.status(404).json({ error: "Call not found" });
        return;
      }
      response.json(call);
    } catch (error) {
      next(error);
    }
  };
}
