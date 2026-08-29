import { Router } from "express";
import type { AgentActionsController } from "./agent-actions.controller.js";

export function createAgentActionsRouter(controller: AgentActionsController): Router {
  const router = Router();
  router.post("/send-text", controller.sendText);
  return router;
}
