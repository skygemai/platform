import type { Pool } from "pg";
import type { Tenant } from "./tenant.js";

export interface TenantInput {
  name: string;
  slug: string;
  isActive: boolean;
}

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

  async disable(id: string): Promise<boolean> {
    const result = await this.pool.query(
      `UPDATE control_plane.tenants
          SET is_active = FALSE,
              updated_at = now()
        WHERE id = $1
        RETURNING id`,
      [id]
    );

    return result.rowCount === 1;
  }

  async listForOwner(cognitoSub: string): Promise<Tenant[]> {
  const result = await this.pool.query<TenantRow>(
    `SELECT tenant.id, tenant.name, tenant.slug, tenant.is_active,
            tenant.created_at, tenant.updated_at
       FROM control_plane.tenants AS tenant
      WHERE tenant.is_active = TRUE
        AND EXISTS (
          SELECT 1
            FROM control_plane.memberships AS membership
            JOIN control_plane.users AS app_user
              ON app_user.id = membership.user_id
           WHERE membership.tenant_id = tenant.id
             AND app_user.cognito_sub = $1
             AND app_user.is_active = TRUE
             AND membership.is_active = TRUE
             AND membership.role = 'owner'
        )
      ORDER BY lower(tenant.name)`,
    [cognitoSub]
  );

  return result.rows.map(mapTenant);
}

async updateForOwner(
  id: string,
  cognitoSub: string,
  input: Pick<TenantInput, "name" | "slug">
): Promise<Tenant | null> {
  const result = await this.pool.query<TenantRow>(
    `UPDATE control_plane.tenants AS tenant
        SET name = $1,
            slug = $2,
            updated_at = now()
      WHERE tenant.id = $3
        AND tenant.is_active = TRUE
        AND EXISTS (
          SELECT 1
            FROM control_plane.memberships AS membership
            JOIN control_plane.users AS app_user
              ON app_user.id = membership.user_id
           WHERE membership.tenant_id = tenant.id
             AND app_user.cognito_sub = $4
             AND app_user.is_active = TRUE
             AND membership.is_active = TRUE
             AND membership.role = 'owner'
        )
      RETURNING tenant.id, tenant.name, tenant.slug, tenant.is_active,
                tenant.created_at, tenant.updated_at`,
    [input.name, input.slug, id, cognitoSub]
  );

  return result.rows[0] ? mapTenant(result.rows[0]) : null;
 }
}
