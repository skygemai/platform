import { Router } from "express";
import { requireTenantRole } from "../../middleware/require-tenant-role.js";
import type { CallsController } from "./calls.controller.js";

export function createCallsRouter(controller: CallsController): Router {
  const router = Router();
  router.use(requireTenantRole(["owner", "admin", "member"]));
  router.get("/agents", controller.agents);
  router.get("/", controller.list);
  router.get("/:callId", controller.get);
  return router;
}
