import { Router, raw } from "express";
import type { RetellWebhooksController } from "./retell-webhooks.controller.js";

export function createRetellWebhooksRouter(controller: RetellWebhooksController): Router {
  const router = Router();
  router.post("/", raw({ type: "application/json", limit: "2mb" }), controller.handle);
  return router;
}
