export type UserRole = "owner" | "admin" | "member" | "viewer";

export interface PortalUser {
  id: string;
  cognitoSub: string;
  tenantId: string;
  email: string;
  role: UserRole;
}
