import { Router } from "express";
import type { MessagingController } from "./messaging.controller.js";

export function createMessagingRouter(controller: MessagingController): Router {
  const router = Router();
  router.post("/", controller.sendFromPortal);
  return router;
}
