import type { Pool, PoolClient } from "pg";
import type {
  InvitationRecord,
  InvitationRole,
  InvitationStatus,
  InvitedUserRecord
} from "./invitation.js";

export class InvitationIdentityConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvitationIdentityConflictError";
  }
}

export class InvitationTenantNotFoundError extends Error {
  constructor() {
    super("The selected tenant does not exist or is inactive");
    this.name = "InvitationTenantNotFoundError";
  }
}

interface UserRow {
  id: string;
  email: string;
  display_name: string | null;
  cognito_sub: string | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

interface InvitationRow {
  id: string;
  user_id: string;
  tenant_id: string;
  email: string;
  role: InvitationRole;
  status: InvitationStatus;
  attempt_count: number;
  last_sent_at: Date | null;
  accepted_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface ExistingInvitationUser {
  id: string;
  cognitoSub: string | null;
}

export interface ProvisionInvitationInput {
  email: string;
  displayName: string | null;
  tenantId: string;
  role: InvitationRole;
  cognitoSub: string;
  cognitoUsername: string;
  invitedByCognitoSub: string;
  status: "pending" | "accepted";
  emailSent: boolean;
}

export interface ProvisionedInvitation {
  invitation: InvitationRecord;
  user: InvitedUserRecord;
  membershipId: string;
}

function mapUser(row: UserRow): InvitedUserRecord {
  if (!row.cognito_sub) throw new Error("Provisioned user is missing a Cognito subject");
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    cognitoSub: row.cognito_sub,
    isActive: row.is_active,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString()
  };
}

function mapInvitation(row: InvitationRow): InvitationRecord {
  return {
    id: row.id,
    userId: row.user_id,
    tenantId: row.tenant_id,
    email: row.email,
    role: row.role,
    status: row.status,
    attemptCount: row.attempt_count,
    lastSentAt: row.last_sent_at?.toISOString() ?? null,
    acceptedAt: row.accepted_at?.toISOString() ?? null,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString()
  };
}

async function upsertUser(
  client: PoolClient,
  input: ProvisionInvitationInput
): Promise<UserRow> {
  const existing = await client.query<UserRow>(
    `SELECT id, email, display_name, cognito_sub, is_active, created_at, updated_at
       FROM control_plane.users
      WHERE lower(email) = lower($1)
      FOR UPDATE`,
    [input.email]
  );

  const row = existing.rows[0];
  if (row?.cognito_sub && row.cognito_sub !== input.cognitoSub) {
    throw new InvitationIdentityConflictError(
      "That email address is already linked to a different Cognito identity"
    );
  }

  if (row) {
    const updated = await client.query<UserRow>(
      `UPDATE control_plane.users
          SET display_name = COALESCE($1, display_name),
              cognito_sub = $2,
              is_active = TRUE,
              updated_at = now()
        WHERE id = $3
       RETURNING id, email, display_name, cognito_sub, is_active, created_at, updated_at`,
      [input.displayName, input.cognitoSub, row.id]
    );
    return updated.rows[0]!;
  }

  const inserted = await client.query<UserRow>(
    `INSERT INTO control_plane.users (email, display_name, cognito_sub, is_active)
     VALUES ($1, $2, $3, TRUE)
     RETURNING id, email, display_name, cognito_sub, is_active, created_at, updated_at`,
    [input.email, input.displayName, input.cognitoSub]
  );
  return inserted.rows[0]!;
}

export class InvitationsRepository {
  constructor(private readonly pool: Pool) {}

  async findUserByEmail(email: string): Promise<ExistingInvitationUser | null> {
    const result = await this.pool.query<{ id: string; cognito_sub: string | null }>(
      `SELECT id, cognito_sub
         FROM control_plane.users
        WHERE lower(email) = lower($1)`,
      [email]
    );
    const row = result.rows[0];
    return row ? { id: row.id, cognitoSub: row.cognito_sub } : null;
  }

  async provision(input: ProvisionInvitationInput): Promise<ProvisionedInvitation> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");

      const tenant = await client.query(
        `SELECT id
           FROM control_plane.tenants
          WHERE id = $1 AND is_active = TRUE
          FOR SHARE`,
        [input.tenantId]
      );
      if (!tenant.rows[0]) throw new InvitationTenantNotFoundError();

      const userRow = await upsertUser(client, input);

      const membership = await client.query<{ id: string }>(
        `INSERT INTO control_plane.memberships (user_id, tenant_id, role, is_active)
         VALUES ($1, $2, $3, TRUE)
         ON CONFLICT (user_id, tenant_id)
         DO UPDATE SET role = EXCLUDED.role,
                       is_active = TRUE,
                       updated_at = now()
         RETURNING id`,
        [userRow.id, input.tenantId, input.role]
      );

      if (input.status === "accepted") {
        await client.query(
          `UPDATE control_plane.user_invitations
              SET status = 'accepted', accepted_at = now(), updated_at = now()
            WHERE user_id = $1 AND tenant_id = $2 AND status = 'pending'`,
          [userRow.id, input.tenantId]
        );
      }

      const invitation = await client.query<InvitationRow>(
        `INSERT INTO control_plane.user_invitations AS existing_invitation (
           user_id, tenant_id, email, role, status, cognito_username,
           invited_by_cognito_sub, last_sent_at, accepted_at
         )
         VALUES (
           $1, $2, $3, $4, $5, $6, $7,
           CASE WHEN $8 THEN now() ELSE NULL END,
           CASE WHEN $5 = 'accepted' THEN now() ELSE NULL END
         )
         ON CONFLICT (user_id, tenant_id) WHERE status = 'pending'
         DO UPDATE SET email = EXCLUDED.email,
                       role = EXCLUDED.role,
                       cognito_username = EXCLUDED.cognito_username,
                       invited_by_cognito_sub = EXCLUDED.invited_by_cognito_sub,
                       attempt_count = existing_invitation.attempt_count + 1,
                       last_sent_at = CASE WHEN $8 THEN now() ELSE existing_invitation.last_sent_at END,
                       updated_at = now()
         RETURNING id, user_id, tenant_id, email, role, status, attempt_count,
                   last_sent_at, accepted_at, created_at, updated_at`,
        [
          userRow.id,
          input.tenantId,
          input.email,
          input.role,
          input.status,
          input.cognitoUsername,
          input.invitedByCognitoSub,
          input.emailSent
        ]
      );

      await client.query("COMMIT");
      return {
        invitation: mapInvitation(invitation.rows[0]!),
        user: mapUser(userRow),
        membershipId: membership.rows[0]!.id
      };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async findPendingInvitation(id: string): Promise<{
    id: string;
    cognitoUsername: string;
  } | null> {
    const result = await this.pool.query<{ id: string; cognito_username: string }>(
      `SELECT id, cognito_username
         FROM control_plane.user_invitations
        WHERE id = $1 AND status = 'pending'`,
      [id]
    );
    const row = result.rows[0];
    return row ? { id: row.id, cognitoUsername: row.cognito_username } : null;
  }

  async markResent(id: string): Promise<InvitationRecord> {
    const result = await this.pool.query<InvitationRow>(
      `UPDATE control_plane.user_invitations
          SET attempt_count = attempt_count + 1,
              last_sent_at = now(),
              updated_at = now()
        WHERE id = $1 AND status = 'pending'
       RETURNING id, user_id, tenant_id, email, role, status, attempt_count,
                 last_sent_at, accepted_at, created_at, updated_at`,
      [id]
    );
    if (!result.rows[0]) throw new Error("Pending invitation disappeared during resend");
    return mapInvitation(result.rows[0]);
  }
}
