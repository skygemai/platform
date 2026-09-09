import { Router } from "express";
import type { SessionController } from "./session.controller.js";

export function createSessionRouter(controller: SessionController): Router {
  const router = Router();
  router.get("/", controller.get);
  return router;
}
