import { controlPlaneRequest } from "../../api/client";

export interface AgentConfiguration {
  id: string;
  tenantId: string;
  retellAgentId: string;
  displayName: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AgentConfigurationInput {
  tenantId: string;
  retellAgentId: string;
  displayName: string;
  active: boolean;
}

export async function listAgentConfigurations(tenantId: string): Promise<AgentConfiguration[]> {
  const query = new URLSearchParams({ tenantId });
  const result = await controlPlaneRequest<{ agentConfigurations: AgentConfiguration[] }>(
    `/api/agent-configurations?${query.toString()}`
  );
  return result.agentConfigurations;
}

export async function createAgentConfiguration(
  input: AgentConfigurationInput
): Promise<{ agentConfiguration: AgentConfiguration; actionKey: string }> {
  return controlPlaneRequest("/api/agent-configurations", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export async function updateAgentConfiguration(
  id: string,
  input: AgentConfigurationInput
): Promise<AgentConfiguration> {
  const result = await controlPlaneRequest<{ agentConfiguration: AgentConfiguration }>(
    `/api/agent-configurations/${id}`,
    { method: "PATCH", body: JSON.stringify(input) }
  );
  return result.agentConfiguration;
}

export async function rotateAgentActionKey(id: string, tenantId: string): Promise<string> {
  const result = await controlPlaneRequest<{ actionKey: string }>(
    `/api/agent-configurations/${id}/rotate-action-key`,
    { method: "POST", body: JSON.stringify({ tenantId }) }
  );
  return result.actionKey;
}
