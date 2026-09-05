import { Router } from "express";
import type { TenantsController } from "./tenants.controller.js";

export function createTenantsRouter(controller: TenantsController): Router {
  const router = Router();

  router.get("/", controller.list);
  router.post("/", controller.create);
  router.patch("/:tenantId", controller.update);
  router.delete("/:tenantId", controller.delete);

  return router;
}
