import { Router } from "express";
import { requirePlatformAdmin } from "../../middleware/require-platform-admin.js";
import type { TenantsController } from "./tenants.controller.js";

export function createTenantsRouter(controller: TenantsController): Router {
  const router = Router();

  router.get("/", controller.list);
  router.post("/", requirePlatformAdmin, controller.create);
  router.patch("/:tenantId", controller.update);
  router.post("/:tenantId/disable", requirePlatformAdmin, controller.disable);

  return router;
}