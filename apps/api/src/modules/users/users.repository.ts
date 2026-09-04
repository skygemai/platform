import type { Pool } from "pg";

export interface UserRecord {
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

interface UserRow {
  id: string;
  email: string;
  display_name: string | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

function mapUser(row: UserRow): UserRecord {
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    isActive: row.is_active,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString()
  };
}

export class UsersRepository {
  constructor(private readonly pool: Pool) {}

  async list(): Promise<UserRecord[]> {
    const result = await this.pool.query<UserRow>(
      `SELECT id, email, display_name, is_active, created_at, updated_at
         FROM control_plane.users
        ORDER BY lower(email)`
    );

    return result.rows.map(mapUser);
  }

  async create(input: UserInput): Promise<UserRecord> {
    const result = await this.pool.query<UserRow>(
      `INSERT INTO control_plane.users
         (email, display_name, is_active)
       VALUES ($1, $2, $3)
       RETURNING id, email, display_name, is_active, created_at, updated_at`,
      [input.email.toLowerCase(), input.displayName, input.isActive]
    );

    return mapUser(result.rows[0]!);
  }

  async update(id: string, input: UserInput): Promise<UserRecord | null> {
    const result = await this.pool.query<UserRow>(
      `UPDATE control_plane.users
          SET email = $1,
              display_name = $2,
              is_active = $3,
              updated_at = now()
        WHERE id = $4
       RETURNING id, email, display_name, is_active, created_at, updated_at`,
      [input.email.toLowerCase(), input.displayName, input.isActive, id]
    );

    return result.rows[0] ? mapUser(result.rows[0]) : null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.pool.query(
      `DELETE FROM control_plane.users
        WHERE id = $1`,
      [id]
    );

    return result.rowCount === 1;
  }
}