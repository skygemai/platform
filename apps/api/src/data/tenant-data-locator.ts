import type { Pool } from "pg";

export interface TenantDataLocation {
  storageType: "shared" | "dedicated_schema";
  schemaName: string;
}

const safeIdentifier = /^[a-z][a-z0-9_]{0,62}$/;

export function quoteIdentifier(value: string): string {
  if (!safeIdentifier.test(value)) throw new Error("Invalid tenant schema configuration");
  return `"${value}"`;
}

export class TenantDataLocator {
  constructor(private readonly pool: Pool) {}

  async resolve(tenantId: string): Promise<TenantDataLocation> {
    const result = await this.pool.query<{
      storage_type: TenantDataLocation["storageType"];
      schema_name: string;
    }>(
      `SELECT storage_type, schema_name
         FROM control_plane.tenant_data_locations
        WHERE tenant_id = $1`,
      [tenantId]
    );

    const row = result.rows[0];
    if (!row) throw new Error("Tenant data location is not configured");
    quoteIdentifier(row.schema_name);
    return { storageType: row.storage_type, schemaName: row.schema_name };
  }
}
