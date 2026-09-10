import { Router } from "express";
import type { InvitationsController } from "./invitations.controller.js";

export function createInvitationsRouter(controller: InvitationsController): Router {
  const router = Router();
  router.post("/", controller.create);
  router.post("/:invitationId/resend", controller.resend);
  return router;
}
