import type { NextFunction, Request, Response } from "express";
import { CognitoJwtVerifier } from "aws-jwt-verify";
import type { Environment } from "../config/environment.js";

type Verifier = ReturnType<typeof CognitoJwtVerifier.create>;

function bearerToken(request: Request): string | null {
  const authorization = request.header("authorization");
  if (!authorization?.startsWith("Bearer ")) return null;
  return authorization.slice("Bearer ".length).trim();
}

function stringGroups(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

export function createUserAuthenticator(environment: Environment) {
  let verifier: Verifier | null = null;

  if (environment.COGNITO_USER_POOL_ID && environment.COGNITO_CLIENT_ID) {
    verifier = CognitoJwtVerifier.create({
      userPoolId: environment.COGNITO_USER_POOL_ID,
      tokenUse: "access",
      clientId: environment.COGNITO_CLIENT_ID
    });
  }

  return async function authenticateUser(
    request: Request,
    response: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      // Local-only bypass. Vite must send these headers only in development mode.
      if (environment.NODE_ENV !== "production") {
        const developmentSub = request.header("x-dev-user-sub");
        if (developmentSub) {
          const groups = (request.header("x-dev-user-groups") ?? "")
            .split(",")
            .map((group) => group.trim())
            .filter(Boolean);

          request.userAuth = {
            cognitoSub: developmentSub,
            groups,
            ...(request.header("x-dev-user-email")
              ? { email: request.header("x-dev-user-email")! }
              : {})
          };
          next();
          return;
        }
      }

      const token = bearerToken(request);
      if (!token || !verifier) {
        response.status(401).json({ error: "Authentication required" });
        return;
      }

      const payload = await verifier.verify(token);
      const email = typeof payload.email === "string"
        ? payload.email
        : typeof payload.username === "string"
          ? payload.username
          : undefined;

      request.userAuth = {
        cognitoSub: payload.sub,
        groups: stringGroups(payload["cognito:groups"]),
        ...(email ? { email } : {})
      };
      next();
    } catch {
      response.status(401).json({ error: "Invalid or expired access token" });
    }
  };
}
