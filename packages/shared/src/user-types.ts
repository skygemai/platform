export type UserRole = "admin" | "manager" | "viewer";

export interface PortalUser {
  id: string;
  cognitoSub: string;
  tenantId: string;
  email: string;
  role: UserRole;
}
