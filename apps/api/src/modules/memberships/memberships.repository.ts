import type { Pool } from "pg";
import type { Membership, MembershipRole } from "./membership.js";

export interface MembershipInput {
  userId: string;
  tenantId: string;
  role: MembershipRole;
  isActive: boolean;
}

interface MembershipRow {
  id: string;
  user_id: string;
  tenant_id: string;
  role: MembershipRole;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  user_email: string;
  user_display_name: string | null;
  tenant_name: string;
  tenant_slug: string;
}

const membershipColumns = `
  membership.id,
  membership.user_id,
  membership.tenant_id,
  membership.role,
  membership.is_active,
  membership.created_at,
  membership.updated_at,
  app_user.email AS user_email,
  app_user.display_name AS user_display_name,
  tenant.name AS tenant_name,
  tenant.slug AS tenant_slug`;

function mapMembership(row: MembershipRow): Membership {
  return {
    id: row.id,
    userId: row.user_id,
    tenantId: row.tenant_id,
    role: row.role,
    isActive: row.is_active,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    userEmail: row.user_email,
    userDisplayName: row.user_display_name,
    tenantName: row.tenant_name,
    tenantSlug: row.tenant_slug
  };
}

export class MembershipsRepository {
  constructor(private readonly pool: Pool) {}

  async list(): Promise<Membership[]> {
    const result = await this.pool.query<MembershipRow>(
      `SELECT ${membershipColumns}
         FROM control_plane.memberships AS membership
         JOIN control_plane.users AS app_user ON app_user.id = membership.user_id
         JOIN control_plane.tenants AS tenant ON tenant.id = membership.tenant_id
        ORDER BY lower(tenant.name), lower(app_user.email)`
    );

    return result.rows.map(mapMembership);
  }

  async create(input: MembershipInput): Promise<Membership> {
    const result = await this.pool.query<MembershipRow>(
      `WITH inserted AS (
         INSERT INTO control_plane.memberships (user_id, tenant_id, role, is_active)
         VALUES ($1, $2, $3, $4)
         RETURNING *
       )
       SELECT ${membershipColumns}
         FROM inserted AS membership
         JOIN control_plane.users AS app_user ON app_user.id = membership.user_id
         JOIN control_plane.tenants AS tenant ON tenant.id = membership.tenant_id`,
      [input.userId, input.tenantId, input.role, input.isActive]
    );

    return mapMembership(result.rows[0]!);
  }

  async update(id: string, input: MembershipInput): Promise<Membership | null> {
    const result = await this.pool.query<MembershipRow>(
      `WITH updated AS (
         UPDATE control_plane.memberships
            SET user_id = $1,
                tenant_id = $2,
                role = $3,
                is_active = $4,
                updated_at = now()
          WHERE id = $5
         RETURNING *
       )
       SELECT ${membershipColumns}
         FROM updated AS membership
         JOIN control_plane.users AS app_user ON app_user.id = membership.user_id
         JOIN control_plane.tenants AS tenant ON tenant.id = membership.tenant_id`,
      [input.userId, input.tenantId, input.role, input.isActive, id]
    );

    return result.rows[0] ? mapMembership(result.rows[0]) : null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.pool.query(
      `DELETE FROM control_plane.memberships WHERE id = $1`,
      [id]
    );

    return result.rowCount === 1;
  }
}
