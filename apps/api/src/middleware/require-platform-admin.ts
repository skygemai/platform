import type { NextFunction, Request, Response } from "express";

export const PLATFORM_ADMIN_GROUP = "SkyGemAdmins";

export function requirePlatformAdmin(
  request: Request,
  response: Response,
  next: NextFunction
): void {
  if (!request.userAuth?.groups.includes(PLATFORM_ADMIN_GROUP)) {
    response.status(403).json({ error: "SkyGem administrator access required" });
    return;
  }

  next();
}
