import type { NextFunction, Request, Response } from "express";
import { PLATFORM_ADMIN_GROUP } from "../../middleware/require-platform-admin.js";
import type { SessionRepository } from "./session.repository.js";

export class SessionController {
  constructor(private readonly repository: SessionRepository) {}

  get = async (
    request: Request,
    response: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const identity = request.userAuth;
      if (!identity) {
        response.status(401).json({ error: "Authentication required" });
        return;
      }

      const isPlatformAdmin = identity.groups.includes(PLATFORM_ADMIN_GROUP);
      const databaseUser = await this.repository.findUser(identity.cognitoSub);

      if (!isPlatformAdmin && !databaseUser) {
        response.status(403).json({ error: "No active SkyGem user account was found" });
        return;
      }

      if (databaseUser) {
        await this.repository.acceptPendingInvitations(identity.cognitoSub);
      }

      const tenants = isPlatformAdmin
        ? await this.repository.listForPlatformAdmin()
        : await this.repository.listForUser(identity.cognitoSub);

      response.json({
        user: {
          cognitoSub: identity.cognitoSub,
          email: databaseUser?.email ?? identity.email ?? null,
          displayName: databaseUser?.displayName ?? null,
          isPlatformAdmin
        },
        tenants
      });
    } catch (error) {
      next(error);
    }
  };
}
