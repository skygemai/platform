import type { NextFunction, Request, Response } from "express";
import type { UserRole } from "@skygem/shared";

export function requireTenantRole(allowedRoles: readonly UserRole[]) {
  return function authorizeTenantRole(
    request: Request,
    response: Response,
    next: NextFunction
  ): void {
    const role = request.userAuth?.role;
    if (!role || !allowedRoles.includes(role)) {
      response.status(403).json({ error: "Your tenant role does not allow this action" });
      return;
    }
    next();
  };
}
