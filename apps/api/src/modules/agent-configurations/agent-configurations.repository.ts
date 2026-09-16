import type { Pool, PoolClient } from "pg";
import { quoteIdentifier, type TenantDataLocator } from "../../data/tenant-data-locator.js";
import type { AgentConfiguration, AgentConfigurationInput } from "./agent-configuration.js";

interface AgentConfigurationRow {
  id: string;
  tenant_id: string;
  retell_agent_id: string;
  display_name: string;
  active: boolean;
  created_at: Date;
  updated_at: Date;
}

function mapAgent(row: AgentConfigurationRow): AgentConfiguration {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    retellAgentId: row.retell_agent_id,
    displayName: row.display_name,
    active: row.active,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString()
  };
}

export class AgentConfigurationsRepository {
  constructor(
    private readonly pool: Pool,
    private readonly dataLocator: TenantDataLocator
  ) {}

  private async tableFor(tenantId: string): Promise<string> {
    const location = await this.dataLocator.resolve(tenantId);
    return `${quoteIdentifier(location.schemaName)}.agent_configurations`;
  }

  private async insertRoute(
    client: PoolClient,
    agent: AgentConfigurationRow
  ): Promise<void> {
    await client.query(
      `INSERT INTO control_plane.retell_agent_routes (
         retell_agent_id, tenant_id, agent_configuration_id, is_active
       ) VALUES ($1, $2, $3, $4)`,
      [agent.retell_agent_id, agent.tenant_id, agent.id, agent.active]
    );
  }

  async list(tenantId: string): Promise<AgentConfiguration[]> {
    const table = await this.tableFor(tenantId);
    const result = await this.pool.query<AgentConfigurationRow>(
      `SELECT id, tenant_id, retell_agent_id, display_name, active, created_at, updated_at
         FROM ${table}
        WHERE tenant_id = $1
        ORDER BY lower(display_name), id`,
      [tenantId]
    );
    return result.rows.map(mapAgent);
  }

  async create(
    input: AgentConfigurationInput,
    actionKeyHash: string
  ): Promise<AgentConfiguration> {
    const table = await this.tableFor(input.tenantId);
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const result = await client.query<AgentConfigurationRow>(
        `INSERT INTO ${table} (
           tenant_id, retell_agent_id, display_name, action_key_hash, active
         ) VALUES ($1, $2, $3, $4, $5)
         RETURNING id, tenant_id, retell_agent_id, display_name, active, created_at, updated_at`,
        [input.tenantId, input.retellAgentId, input.displayName, actionKeyHash, input.active]
      );
      const row = result.rows[0]!;
      await this.insertRoute(client, row);
      await client.query("COMMIT");
      return mapAgent(row);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async update(
    agentConfigurationId: string,
    input: AgentConfigurationInput
  ): Promise<AgentConfiguration | null> {
    const table = await this.tableFor(input.tenantId);
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const result = await client.query<AgentConfigurationRow>(
        `UPDATE ${table}
            SET retell_agent_id = $1,
                display_name = $2,
                active = $3,
                updated_at = NOW()
          WHERE tenant_id = $4 AND id = $5
         RETURNING id, tenant_id, retell_agent_id, display_name, active, created_at, updated_at`,
        [input.retellAgentId, input.displayName, input.active, input.tenantId, agentConfigurationId]
      );
      const row = result.rows[0];
      if (!row) {
        await client.query("ROLLBACK");
        return null;
      }

      await client.query(
        `DELETE FROM control_plane.retell_agent_routes
          WHERE tenant_id = $1 AND agent_configuration_id = $2`,
        [input.tenantId, agentConfigurationId]
      );
      await this.insertRoute(client, row);
      await client.query("COMMIT");
      return mapAgent(row);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async replaceActionKeyHash(
    tenantId: string,
    agentConfigurationId: string,
    actionKeyHash: string
  ): Promise<boolean> {
    const table = await this.tableFor(tenantId);
    const result = await this.pool.query(
      `UPDATE ${table}
          SET action_key_hash = $1, updated_at = NOW()
        WHERE tenant_id = $2 AND id = $3`,
      [actionKeyHash, tenantId, agentConfigurationId]
    );
    return result.rowCount === 1;
  }
}
