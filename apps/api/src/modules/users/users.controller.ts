import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import type { UsersRepository } from "./users.repository.js";

const userIdSchema = z.string().uuid();

const userInputSchema = z.object({
  email: z.string().trim().email().max(320),
  displayName: z.string().trim().max(120).nullable().optional(),
  isActive: z.boolean().default(true)
});

function isDuplicateKeyError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "23505"
  );
}

export class UsersController {
  constructor(private readonly repository: UsersRepository) {}

  list = async (
    _request: Request,
    response: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      response.json({ users: await this.repository.list() });
    } catch (error) {
      next(error);
    }
  };

  create = async (
    request: Request,
    response: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const input = userInputSchema.parse(request.body);

      const user = await this.repository.create({
        email: input.email,
        displayName: input.displayName || null,
        isActive: input.isActive
      });

      response.status(201).json({ user });
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        response.status(409).json({
          error: "A user with that email address already exists."
        });
        return;
      }

      next(error);
    }
  };

  update = async (
    request: Request,
    response: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const id = userIdSchema.parse(request.params.userId);
      const input = userInputSchema.parse(request.body);

      const user = await this.repository.update(id, {
        email: input.email,
        displayName: input.displayName || null,
        isActive: input.isActive
      });

      if (!user) {
        response.status(404).json({ error: "User not found" });
        return;
      }

      response.json({ user });
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        response.status(409).json({
          error: "A user with that email address already exists."
        });
        return;
      }

      next(error);
    }
  };

  delete = async (
    request: Request,
    response: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const id = userIdSchema.parse(request.params.userId);
      const deleted = await this.repository.delete(id);

      if (!deleted) {
        response.status(404).json({ error: "User not found" });
        return;
      }

      response.status(204).send();
    } catch (error) {
      next(error);
    }
  };
}