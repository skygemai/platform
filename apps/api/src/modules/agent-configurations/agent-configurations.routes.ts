import { Router } from "express";
import type { AgentConfigurationsController } from "./agent-configurations.controller.js";

export function createAgentConfigurationsRouter(
  controller: AgentConfigurationsController
): Router {
  const router = Router();
  router.get("/", controller.list);
  router.post("/", controller.create);
  router.patch("/:agentConfigurationId", controller.update);
  router.post("/:agentConfigurationId/rotate-action-key", controller.rotateActionKey);
  return router;
}
