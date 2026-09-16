import type { Pool, PoolClient } from "pg";
import { quoteIdentifier, type TenantDataLocator } from "../../data/tenant-data-locator.js";
import type { RetellWebhookStore, StoredRetellCall } from "./retell-webhooks.service.js";

interface AgentRouteRow {
  tenant_id: string;
  agent_configuration_id: string;
}

export class RetellWebhooksRepository implements RetellWebhookStore {
  constructor(
    private readonly pool: Pool,
    private readonly dataLocator: TenantDataLocator
  ) {}

  private async routeFor(retellAgentId: string): Promise<AgentRouteRow | null> {
    const result = await this.pool.query<AgentRouteRow>(
      `SELECT tenant_id, agent_configuration_id
         FROM control_plane.retell_agent_routes
        WHERE retell_agent_id = $1
          AND is_active = TRUE`,
      [retellAgentId]
    );
    return result.rows[0] ?? null;
  }

  private async claimEvent(
    client: PoolClient,
    call: StoredRetellCall,
    tenantId: string
  ): Promise<boolean> {
    const result = await client.query(
      `INSERT INTO control_plane.retell_webhook_receipts (
         event_type, external_call_id, tenant_id
       ) VALUES ($1, $2, $3)
       ON CONFLICT (event_type, external_call_id) DO NOTHING`,
      [call.eventType, call.externalCallId, tenantId]
    );
    return result.rowCount === 1;
  }

  async storeCall(call: StoredRetellCall): Promise<"stored" | "duplicate" | "unknown_agent"> {
    const route = await this.routeFor(call.retellAgentId);
    if (!route) return "unknown_agent";

    const location = await this.dataLocator.resolve(route.tenant_id);
    const callsTable = `${quoteIdentifier(location.schemaName)}.calls`;
    const client = await this.pool.connect();

    try {
      await client.query("BEGIN");
      if (!(await this.claimEvent(client, call, route.tenant_id))) {
        await client.query("ROLLBACK");
        return "duplicate";
      }

      await client.query(
        `INSERT INTO ${callsTable} AS existing (
           tenant_id,
           agent_configuration_id,
           external_call_id,
           started_at,
           ended_at,
           status,
           direction,
           from_number,
           to_number,
           duration_seconds,
           summary,
           transcript,
           sentiment,
           call_successful,
           disconnection_reason
         ) VALUES (
           $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15
         )
         ON CONFLICT (tenant_id, external_call_id) DO UPDATE
         SET agent_configuration_id = EXCLUDED.agent_configuration_id,
             started_at = EXCLUDED.started_at,
             ended_at = COALESCE(EXCLUDED.ended_at, existing.ended_at),
             status = EXCLUDED.status,
             direction = EXCLUDED.direction,
             from_number = COALESCE(EXCLUDED.from_number, existing.from_number),
             to_number = COALESCE(EXCLUDED.to_number, existing.to_number),
             duration_seconds = COALESCE(EXCLUDED.duration_seconds, existing.duration_seconds),
             summary = COALESCE(EXCLUDED.summary, existing.summary),
             transcript = COALESCE(EXCLUDED.transcript, existing.transcript),
             sentiment = COALESCE(EXCLUDED.sentiment, existing.sentiment),
             call_successful = COALESCE(EXCLUDED.call_successful, existing.call_successful),
             disconnection_reason = COALESCE(
               EXCLUDED.disconnection_reason,
               existing.disconnection_reason
             ),
             updated_at = NOW()`,
        [
          route.tenant_id,
          route.agent_configuration_id,
          call.externalCallId,
          call.startedAt,
          call.endedAt,
          call.status,
          call.direction,
          call.fromNumber,
          call.toNumber,
          call.durationSeconds,
          call.summary,
          call.transcript,
          call.sentiment,
          call.callSuccessful,
          call.disconnectionReason
        ]
      );

      await client.query("COMMIT");
      return "stored";
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
}
