import type { CallAgentOption, CallDetail, CallListItem, CallsPage } from "@skygem/shared";
import type { Pool } from "pg";
import { quoteIdentifier, type TenantDataLocator } from "../../data/tenant-data-locator.js";
import type { CallPermissions } from "./calls.permissions.js";
import type { ListCallsQuery } from "./calls.schemas.js";

interface CallRow {
  id: string;
  external_call_id: string;
  agent_id: string | null;
  agent_name: string | null;
  started_at: Date;
  ended_at: Date | null;
  status: string;
  direction: "inbound" | "outbound";
  duration_seconds: number | null;
  sentiment: string | null;
  call_successful: boolean | null;
  from_number?: string | null;
  to_number?: string | null;
  disconnection_reason?: string | null;
  summary?: string | null;
  transcript?: string | null;
}

function mapListItem(row: CallRow): CallListItem {
  return {
    id: row.id,
    externalCallId: row.external_call_id,
    agentId: row.agent_id,
    agentName: row.agent_name,
    startedAt: row.started_at.toISOString(),
    endedAt: row.ended_at?.toISOString() ?? null,
    status: row.status,
    direction: row.direction,
    durationSeconds: row.duration_seconds,
    sentiment: row.sentiment,
    callSuccessful: row.call_successful
  };
}

export class CallsRepository {
  constructor(
    private readonly pool: Pool,
    private readonly dataLocator: TenantDataLocator
  ) {}

  private async tablesFor(tenantId: string): Promise<{ calls: string; agents: string }> {
    const { schemaName } = await this.dataLocator.resolve(tenantId);
    const schema = quoteIdentifier(schemaName);
    return { calls: `${schema}.calls`, agents: `${schema}.agent_configurations` };
  }

  async listAgents(tenantId: string): Promise<CallAgentOption[]> {
    const { agents } = await this.tablesFor(tenantId);
    const result = await this.pool.query<{ id: string; display_name: string }>(
      `SELECT id, display_name
         FROM ${agents}
        WHERE tenant_id = $1 AND active = TRUE
        ORDER BY lower(display_name)`,
      [tenantId]
    );
    return result.rows.map((row) => ({ id: row.id, displayName: row.display_name }));
  }

  async list(tenantId: string, query: ListCallsQuery): Promise<CallsPage> {
    const { calls, agents } = await this.tablesFor(tenantId);
    const parameters: unknown[] = [tenantId, query.from, query.to];
    let agentFilter = "";
    if (query.agentId) {
      parameters.push(query.agentId);
      agentFilter = ` AND call.agent_configuration_id = $${parameters.length}`;
    }

    const countResult = await this.pool.query<{ total: string }>(
      `SELECT count(*)::text AS total
         FROM ${calls} AS call
        WHERE call.tenant_id = $1
          AND call.started_at >= $2::timestamptz
          AND call.started_at < $3::timestamptz
          ${agentFilter}`,
      parameters
    );

    parameters.push(query.limit, query.offset);
    const result = await this.pool.query<CallRow>(
      `SELECT call.id, call.external_call_id,
              agent.id AS agent_id, agent.display_name AS agent_name,
              call.started_at, call.ended_at, call.status, call.direction,
              call.duration_seconds, call.sentiment, call.call_successful
         FROM ${calls} AS call
         LEFT JOIN ${agents} AS agent
           ON agent.id = call.agent_configuration_id
          AND agent.tenant_id = call.tenant_id
        WHERE call.tenant_id = $1
          AND call.started_at >= $2::timestamptz
          AND call.started_at < $3::timestamptz
          ${agentFilter}
        ORDER BY call.started_at DESC, call.id DESC
        LIMIT $${parameters.length - 1} OFFSET $${parameters.length}`,
      parameters
    );

    return {
      items: result.rows.map(mapListItem),
      total: Number(countResult.rows[0]?.total ?? 0),
      limit: query.limit,
      offset: query.offset
    };
  }

  async find(
    tenantId: string,
    callId: string,
    permissions: CallPermissions
  ): Promise<CallDetail | null> {
    const { calls, agents } = await this.tablesFor(tenantId);
    const result = await this.pool.query<CallRow>(
      `SELECT call.id, call.external_call_id,
              agent.id AS agent_id, agent.display_name AS agent_name,
              call.started_at, call.ended_at, call.status, call.direction,
              call.duration_seconds, call.sentiment, call.call_successful,
              call.disconnection_reason,
              CASE WHEN $3 THEN call.from_number ELSE NULL END AS from_number,
              CASE WHEN $3 THEN call.to_number ELSE NULL END AS to_number,
              CASE WHEN $4 THEN call.summary ELSE NULL END AS summary,
              CASE WHEN $5 THEN call.transcript ELSE NULL END AS transcript
         FROM ${calls} AS call
         LEFT JOIN ${agents} AS agent
           ON agent.id = call.agent_configuration_id
          AND agent.tenant_id = call.tenant_id
        WHERE call.tenant_id = $1 AND call.id = $2`,
      [
        tenantId,
        callId,
        permissions.canViewPhoneNumbers,
        permissions.canViewSummary,
        permissions.canViewTranscript
      ]
    );

    const row = result.rows[0];
    if (!row) return null;
    return {
      ...mapListItem(row),
      fromNumber: row.from_number ?? null,
      toNumber: row.to_number ?? null,
      disconnectionReason: row.disconnection_reason ?? null,
      summary: row.summary ?? null,
      transcript: row.transcript ?? null,
      permissions: {
        canViewSummary: permissions.canViewSummary,
        canViewTranscript: permissions.canViewTranscript,
        canViewPhoneNumbers: permissions.canViewPhoneNumbers
      }
    };
  }
}
