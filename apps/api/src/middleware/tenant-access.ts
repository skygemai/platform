import type { NextFunction, Request, Response } from "express";
import type { Pool } from "pg";
import type { UserRole } from "@skygem/shared";

interface UserTenantRow {
  tenant_id: string;
  role: UserRole;
  email: string;
}

export function createTenantAccessMiddleware(pool: Pool) {
  return async function requireTenantAccess(
    request: Request,
    response: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const cognitoSub = request.userAuth?.cognitoSub;
      if (!cognitoSub) {
        response.status(401).json({ error: "Authentication required" });
        return;
      }

      const result = await pool.query<UserTenantRow>(
        `SELECT tenant_id, role, email
           FROM app_users
          WHERE cognito_sub = $1 AND active = TRUE`,
        [cognitoSub]
      );

      const user = result.rows[0];
      if (!user) {
        response.status(403).json({ error: "No active SkyGem client account was found" });
        return;
      }

      request.userAuth = {
        cognitoSub,
        tenantId: user.tenant_id,
        role: user.role,
        email: user.email
      };
      next();
    } catch (error) {
      next(error);
    }
  };
}
