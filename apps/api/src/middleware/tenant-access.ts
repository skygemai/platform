import type { NextFunction, Request, Response } from "express";
import type { UserRole } from "@skygem/shared";
import type { Pool } from "pg";
import { z } from "zod";
import { PLATFORM_ADMIN_GROUP } from "./require-platform-admin.js";

const tenantIdSchema = z.string().uuid();

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
      const identity = request.userAuth;
      if (!identity) {
        response.status(401).json({ error: "Authentication required" });
        return;
      }
      const cognitoSub = identity.cognitoSub;

      const parsedTenantId = tenantIdSchema.safeParse(request.header("x-tenant-id"));
      if (!parsedTenantId.success) {
        response.status(400).json({ error: "A valid X-Tenant-Id header is required" });
        return;
      }
      const tenantId = parsedTenantId.data;

      if (identity.groups.includes(PLATFORM_ADMIN_GROUP)) {
        const tenantResult = await pool.query<{ id: string }>(
          `SELECT id FROM control_plane.tenants WHERE id = $1 AND is_active = TRUE`,
          [tenantId]
        );

        if (!tenantResult.rows[0]) {
          response.status(404).json({ error: "Active tenant not found" });
          return;
        }

        request.userAuth = { ...identity, tenantId, role: "owner" };
        next();
        return;
      }

      const result = await pool.query<UserTenantRow>(
        `SELECT membership.tenant_id, membership.role, app_user.email
           FROM control_plane.users AS app_user
           JOIN control_plane.memberships AS membership ON membership.user_id = app_user.id
           JOIN control_plane.tenants AS tenant ON tenant.id = membership.tenant_id
          WHERE app_user.cognito_sub = $1
            AND membership.tenant_id = $2
            AND app_user.is_active = TRUE
            AND membership.is_active = TRUE
            AND tenant.is_active = TRUE`,
        [cognitoSub, tenantId]
      );

      const user = result.rows[0];
      if (!user) {
        response.status(403).json({ error: "No active membership was found for this tenant" });
        return;
      }

      request.userAuth = {
        ...identity,
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
