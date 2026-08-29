import { Router } from "express";
import type { CallsController } from "./calls.controller.js";

export function createCallsRouter(controller: CallsController): Router {
  const router = Router();
  router.get("/", controller.list);
  router.get("/:callId", controller.get);
  return router;
}
