import type { UserRole } from "@skygem/shared";

export interface AppUser {
  id: string;
  tenantId: string;
  cognitoSub: string;
  email: string;
  role: UserRole;
  active: boolean;
}