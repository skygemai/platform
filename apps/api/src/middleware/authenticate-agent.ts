import { createHash } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import type { Pool } from "pg";

interface AgentConfigurationRow {
  id: string;
  retell_agent_id: string;
  tenant_id: string;
}

export function hashAgentActionKey(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

export function createAgentAuthenticator(pool: Pool) {
  return async function authenticateAgent(
    request: Request,
    response: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const key = request.header("x-agent-action-key");
      if (!key) {
        response.status(401).json({ error: "Agent action key required" });
        return;
      }

      const result = await pool.query<AgentConfigurationRow>(
        `SELECT id, retell_agent_id, tenant_id
           FROM agent_configurations
          WHERE action_key_hash = $1 AND active = TRUE`,
        [hashAgentActionKey(key)]
      );

      const agent = result.rows[0];
      if (!agent) {
        response.status(401).json({ error: "Invalid agent action key" });
        return;
      }

      request.agentAuth = {
        agentConfigId: agent.id,
        retellAgentId: agent.retell_agent_id,
        tenantId: agent.tenant_id
      };
      next();
    } catch (error) {
      next(error);
    }
  };
}
