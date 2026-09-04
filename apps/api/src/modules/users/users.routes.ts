import { Router } from "express";
import type { UsersController } from "./users.controller.js";

export function createUsersRouter(controller: UsersController): Router {
  const router = Router();

  router.get("/", controller.list);
  router.post("/", controller.create);
  router.patch("/:userId", controller.update);
  router.delete("/:userId", controller.delete);

  return router;
}