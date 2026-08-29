import type { NextFunction, Request, Response } from "express";
import type { AnalyticsService } from "./analytics.service.js";

export class AnalyticsController {
  constructor(private readonly service: AnalyticsService) {}

  summarize = async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = request.userAuth?.tenantId;
      if (!tenantId) {
        response.status(403).json({ error: "Tenant access required" });
        return;
      }
      response.json(await this.service.summarize(tenantId));
    } catch (error) {
      next(error);
    }
  };
}
