import type { NextFunction, Request, Response } from "express";
import { callIdSchema, listCallsQuerySchema } from "./calls.schemas.js";
import type { CallsService } from "./calls.service.js";

export class CallsController {
  constructor(private readonly service: CallsService) {}

  agents = async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    try {
      response.json({ agents: await this.service.listAgents(request.userAuth!.tenantId!) });
    } catch (error) {
      next(error);
    }
  };

  list = async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    try {
      const query = listCallsQuerySchema.parse(request.query);
      response.json(await this.service.list(request.userAuth!.tenantId!, query));
    } catch (error) {
      next(error);
    }
  };

  get = async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    try {
      const callId = callIdSchema.parse(request.params.callId);
      const call = await this.service.get(
        request.userAuth!.tenantId!,
        callId,
        request.userAuth!.role!
      );
      if (!call) {
        response.status(404).json({ error: "Call not found" });
        return;
      }
      response.json({ call });
    } catch (error) {
      next(error);
    }
  };
}
