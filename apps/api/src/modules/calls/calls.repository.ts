import type { CallRecord } from "@skygem/shared";
import type { Pool } from "pg";

interface CallRow {
  id: string;
  external_call_id: string;
  tenant_id: string;
  started_at: Date;
  ended_at: Date | null;
  status: string;
  direction: "inbound" | "outbound";
  from_number: string | null;
  to_number: string | null;
  duration_seconds: number | null;
  summary: string | null;
}

function mapCall(row: CallRow): CallRecord {
  return {
    id: row.id,
    externalCallId: row.external_call_id,
    tenantId: row.tenant_id,
    startedAt: row.started_at.toISOString(),
    endedAt: row.ended_at?.toISOString() ?? null,
    status: row.status,
    direction: row.direction,
    fromNumber: row.from_number,
    toNumber: row.to_number,
    durationSeconds: row.duration_seconds,
    summary: row.summary
  };
}

export class CallsRepository {
  constructor(private readonly pool: Pool) {}

  async listForTenant(tenantId: string, limit: number, offset: number): Promise<CallRecord[]> {
    const result = await this.pool.query<CallRow>(
      `SELECT id, external_call_id, tenant_id, started_at, ended_at, status,
              direction, from_number, to_number, duration_seconds, summary
         FROM calls
        WHERE tenant_id = $1
        ORDER BY started_at DESC
        LIMIT $2 OFFSET $3`,
      [tenantId, limit, offset]
    );
    return result.rows.map(mapCall);
  }

  async findForTenant(tenantId: string, callId: string): Promise<CallRecord | null> {
    const result = await this.pool.query<CallRow>(
      `SELECT id, external_call_id, tenant_id, started_at, ended_at, status,
              direction, from_number, to_number, duration_seconds, summary
         FROM calls
        WHERE tenant_id = $1 AND id = $2`,
      [tenantId, callId]
    );
    return result.rows[0] ? mapCall(result.rows[0]) : null;
  }
}
