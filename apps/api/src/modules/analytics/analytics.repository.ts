import type { AnalyticsSummary } from "@skygem/shared";
import type { Pool } from "pg";

interface AnalyticsRow {
  total_calls: string;
  completed_calls: string;
  total_duration_seconds: string;
  average_duration_seconds: string;
}

export class AnalyticsRepository {
  constructor(private readonly pool: Pool) {}

  async summarizeForTenant(tenantId: string): Promise<AnalyticsSummary> {
    const result = await this.pool.query<AnalyticsRow>(
      `SELECT COUNT(*)::text AS total_calls,
              COUNT(*) FILTER (WHERE status = 'ended')::text AS completed_calls,
              COALESCE(SUM(duration_seconds), 0)::text AS total_duration_seconds,
              COALESCE(AVG(duration_seconds), 0)::text AS average_duration_seconds
         FROM calls
        WHERE tenant_id = $1`,
      [tenantId]
    );
    const row = result.rows[0];
    return {
      totalCalls: Number(row?.total_calls ?? 0),
      completedCalls: Number(row?.completed_calls ?? 0),
      totalDurationSeconds: Number(row?.total_duration_seconds ?? 0),
      averageDurationSeconds: Math.round(Number(row?.average_duration_seconds ?? 0))
    };
  }
}
