import { controlPlaneRequest } from "../../api/client";

export interface User {
  id: string;
  email: string;
  displayName: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserInput {
  email: string;
  displayName: string | null;
  isActive: boolean;
}

export async function listUsers(): Promise<User[]> {
  const result = await controlPlaneRequest<{ users: User[] }>("/api/users");
  return result.users;
}

export async function createUser(input: UserInput): Promise<User> {
  const result = await controlPlaneRequest<{ user: User }>("/api/users", {
    method: "POST",
    body: JSON.stringify(input)
  });
  return result.user;
}

export async function updateUser(id: string, input: UserInput): Promise<User> {
  const result = await controlPlaneRequest<{ user: User }>(`/api/users/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input)
  });
  return result.user;
}

export async function deleteUser(id: string): Promise<void> {
  await controlPlaneRequest<void>(`/api/users/${id}`, { method: "DELETE" });
}
