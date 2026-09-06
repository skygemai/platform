import { Router } from "express";
import type { MembershipsController } from "./memberships.controller.js";

export function createMembershipsRouter(controller: MembershipsController): Router {
  const router = Router();

  router.get("/", controller.list);
  router.post("/", controller.create);
  router.patch("/:membershipId", controller.update);
  router.delete("/:membershipId", controller.delete);

  return router;
}
