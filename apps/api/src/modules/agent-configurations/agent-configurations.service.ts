import { createHash, randomBytes } from "node:crypto";
import type { AgentConfigurationInput } from "./agent-configuration.js";
import type { AgentConfigurationsRepository } from "./agent-configurations.repository.js";

export interface ActionCredential {
  actionKey: string;
  actionKeyHash: string;
}

export function generateActionCredential(): ActionCredential {
  const actionKey = randomBytes(32).toString("base64url");
  const actionKeyHash = createHash("sha256").update(actionKey, "utf8").digest("hex");
  return { actionKey, actionKeyHash };
}

export class AgentConfigurationsService {
  constructor(private readonly repository: AgentConfigurationsRepository) {}

  list(tenantId: string) {
    return this.repository.list(tenantId);
  }

  async create(input: AgentConfigurationInput) {
    const credential = generateActionCredential();
    const agentConfiguration = await this.repository.create(input, credential.actionKeyHash);
    return { agentConfiguration, actionKey: credential.actionKey };
  }

  update(agentConfigurationId: string, input: AgentConfigurationInput) {
    return this.repository.update(agentConfigurationId, input);
  }

  async rotateActionKey(tenantId: string, agentConfigurationId: string): Promise<string | null> {
    const credential = generateActionCredential();
    const updated = await this.repository.replaceActionKeyHash(
      tenantId,
      agentConfigurationId,
      credential.actionKeyHash
    );
    return updated ? credential.actionKey : null;
  }
}
