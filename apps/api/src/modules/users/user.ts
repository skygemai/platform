export interface AppUser {
  id: string;
  tenantId: string;
  cognitoSub: string;
  email: string;
  role: "admin" | "manager" | "viewer";
  active: boolean;
}
