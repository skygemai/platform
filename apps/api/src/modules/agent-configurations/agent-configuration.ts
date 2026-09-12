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
