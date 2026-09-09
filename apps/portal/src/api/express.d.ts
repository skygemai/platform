import type { UserRole } from "@skygem/shared";

declare global {
  namespace Express {
    interface Request {
      userAuth?: {
        cognitoSub: string;
        groups: string[];
        email?: string;
        tenantId?: string;
        role?: UserRole;
      };
      agentAuth?: {
        agentConfigId: string;
        retellAgentId: string;
        tenantId: string;
      };
    }
  }
}

export {};
