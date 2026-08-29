import type { Pool, PoolClient } from "pg";

export interface MessageRecord {
  id: string;
  tenantId: string;
  toNumber: string;
  body: string;
  status: "queued" | "sent" | "failed";
  providerMessageId: string | null;
  idempotencyKey: string;
}

interface MessageRow {
  id: string;
  tenant_id: string;
  to_number: string;
  body: string;
  status: "queued" | "sent" | "failed";
  provider_message_id: string | null;
  idempotency_key: string;
}

function mapMessage(row: MessageRow): MessageRecord {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    toNumber: row.to_number,
    body: row.body,
    status: row.status,
    providerMessageId: row.provider_message_id,
    idempotencyKey: row.idempotency_key
  };
}

export class MessagingRepository {
  constructor(private readonly pool: Pool) {}

  async createPending(input: {
    tenantId: string;
    to: string;
    message: string;
    idempotencyKey: string;
    source: "portal" | "agent";
    agentConfigurationId?: string;
  }): Promise<{ record: MessageRecord; created: boolean }> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const inserted = await client.query<MessageRow>(
        `INSERT INTO messages
          (tenant_id, to_number, body, status, idempotency_key, source, agent_configuration_id)
         VALUES ($1, $2, $3, 'queued', $4, $5, $6)
         ON CONFLICT (tenant_id, idempotency_key) DO NOTHING
         RETURNING id, tenant_id, to_number, body, status, provider_message_id, idempotency_key`,
        [
          input.tenantId,
          input.to,
          input.message,
          input.idempotencyKey,
          input.source,
          input.agentConfigurationId ?? null
        ]
      );

      if (inserted.rows[0]) {
        await client.query("COMMIT");
        return { record: mapMessage(inserted.rows[0]), created: true };
      }

      const existing = await this.findByIdempotencyKey(client, input.tenantId, input.idempotencyKey);
      await client.query("COMMIT");
      if (!existing) throw new Error("Unable to retrieve idempotent message");
      return { record: existing, created: false };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  private async findByIdempotencyKey(
    client: PoolClient,
    tenantId: string,
    idempotencyKey: string
  ): Promise<MessageRecord | null> {
    const result = await client.query<MessageRow>(
      `SELECT id, tenant_id, to_number, body, status, provider_message_id, idempotency_key
         FROM messages
        WHERE tenant_id = $1 AND idempotency_key = $2`,
      [tenantId, idempotencyKey]
    );
    return result.rows[0] ? mapMessage(result.rows[0]) : null;
  }

  async markSent(messageId: string, providerMessageId: string, status: "queued" | "sent") {
    await this.pool.query(
      `UPDATE messages
          SET provider_message_id = $2, status = $3, updated_at = NOW()
        WHERE id = $1`,
      [messageId, providerMessageId, status]
    );
  }

  async markFailed(messageId: string, reason: string) {
    await this.pool.query(
      `UPDATE messages
          SET status = 'failed', failure_reason = $2, updated_at = NOW()
        WHERE id = $1`,
      [messageId, reason.slice(0, 500)]
    );
  }

  async createAuditEvent(input: {
    tenantId: string;
    action: string;
    actorType: "user" | "agent";
    actorId: string;
    resourceId: string;
  }) {
    await this.pool.query(
      `INSERT INTO audit_events
        (tenant_id, action, actor_type, actor_id, resource_type, resource_id)
       VALUES ($1, $2, $3, $4, 'message', $5)`,
      [input.tenantId, input.action, input.actorType, input.actorId, input.resourceId]
    );
  }
}
