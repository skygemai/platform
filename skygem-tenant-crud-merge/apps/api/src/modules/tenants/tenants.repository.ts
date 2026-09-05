import type { Pool } from "pg";
import type { Tenant } from "./tenant.js";

export interface TenantInput {
  name: string;
  slug: string;
  isActive: boolean;
}

export type TenantDeleteResult = "deleted" | "not_found" | "has_dependencies";

interface TenantRow {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

function mapTenant(row: TenantRow): Tenant {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    isActive: row.is_active,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString()
  };
}

export class TenantsRepository {
  constructor(private readonly pool: Pool) {}

  async list(): Promise<Tenant[]> {
    const result = await this.pool.query<TenantRow>(
      `SELECT id, name, slug, is_active, created_at, updated_at
         FROM control_plane.tenants
        ORDER BY lower(name)`
    );

    return result.rows.map(mapTenant);
  }

  async create(input: TenantInput): Promise<Tenant> {
    const result = await this.pool.query<TenantRow>(
      `INSERT INTO control_plane.tenants (name, slug, is_active)
       VALUES ($1, $2, $3)
       RETURNING id, name, slug, is_active, created_at, updated_at`,
      [input.name, input.slug, input.isActive]
    );

    return mapTenant(result.rows[0]!);
  }

  async update(id: string, input: TenantInput): Promise<Tenant | null> {
    const result = await this.pool.query<TenantRow>(
      `UPDATE control_plane.tenants
          SET name = $1,
              slug = $2,
              is_active = $3,
              updated_at = now()
        WHERE id = $4
       RETURNING id, name, slug, is_active, created_at, updated_at`,
      [input.name, input.slug, input.isActive, id]
    );

    return result.rows[0] ? mapTenant(result.rows[0]) : null;
  }

  async delete(id: string): Promise<TenantDeleteResult> {
    const result = await this.pool.query<{ deleted: boolean; still_exists: boolean }>(
      `WITH deleted_tenant AS (
         DELETE FROM control_plane.tenants AS tenant
          WHERE tenant.id = $1
            AND NOT EXISTS (
              SELECT 1 FROM control_plane.memberships WHERE tenant_id = tenant.id
            )
            AND NOT EXISTS (
              SELECT 1 FROM control_plane.tenant_storage WHERE tenant_id = tenant.id
            )
            AND NOT EXISTS (
              SELECT 1 FROM control_plane.retell_connections WHERE tenant_id = tenant.id
            )
            AND NOT EXISTS (
              SELECT 1 FROM control_plane.agents WHERE tenant_id = tenant.id
            )
         RETURNING id
       )
       SELECT
         EXISTS (SELECT 1 FROM deleted_tenant) AS deleted,
         EXISTS (SELECT 1 FROM control_plane.tenants WHERE id = $1) AS still_exists`,
      [id]
    );

    const outcome = result.rows[0]!;
    if (outcome.deleted) return "deleted";
    return outcome.still_exists ? "has_dependencies" : "not_found";
  }
}
