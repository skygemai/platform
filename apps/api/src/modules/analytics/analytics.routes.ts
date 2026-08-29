import { Router } from "express";
import type { AnalyticsController } from "./analytics.controller.js";

export function createAnalyticsRouter(controller: AnalyticsController): Router {
  const router = Router();
  router.get("/", controller.summarize);
  return router;
}
