import type { UserRole } from "@skygem/shared";
import type { Pool } from "pg";

export interface SessionTenant {
  id: string;
  name: string;
  slug: string;
  role: UserRole | null;
}

export interface SessionUser {
  email: string | null;
  displayName: string | null;
}

interface SessionTenantRow {
  id: string;
  name: string;
  slug: string;
  role: UserRole | null;
}

interface SessionUserRow {
  email: string;
  display_name: string | null;
}

export class SessionRepository {
  constructor(private readonly pool: Pool) {}

  async findUser(cognitoSub: string): Promise<SessionUser | null> {
    const result = await this.pool.query<SessionUserRow>(
      `SELECT email, display_name
         FROM control_plane.users
        WHERE cognito_sub = $1 AND is_active = TRUE`,
      [cognitoSub]
    );

    const row = result.rows[0];
    return row ? { email: row.email, displayName: row.display_name } : null;
  }

  async listForUser(cognitoSub: string): Promise<SessionTenant[]> {
    const result = await this.pool.query<SessionTenantRow>(
      `SELECT tenant.id, tenant.name, tenant.slug, membership.role
         FROM control_plane.users AS app_user
         JOIN control_plane.memberships AS membership ON membership.user_id = app_user.id
         JOIN control_plane.tenants AS tenant ON tenant.id = membership.tenant_id
        WHERE app_user.cognito_sub = $1
          AND app_user.is_active = TRUE
          AND membership.is_active = TRUE
          AND tenant.is_active = TRUE
        ORDER BY lower(tenant.name)`,
      [cognitoSub]
    );

    return result.rows;
  }

  async listForPlatformAdmin(): Promise<SessionTenant[]> {
    const result = await this.pool.query<SessionTenantRow>(
      `SELECT id, name, slug, NULL::text AS role
         FROM control_plane.tenants
        WHERE is_active = TRUE
        ORDER BY lower(name)`
    );

    return result.rows;
  }
}
