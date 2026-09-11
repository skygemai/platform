import type { CallAgentOption, CallDetail, CallsPage } from "@skygem/shared";
import { apiGet } from "../../api/client";

export interface CallFilters {
  agentId?: string;
  from: string;
  to: string;
  limit: number;
  offset: number;
}

export async function listCallAgents(): Promise<CallAgentOption[]> {
  const response = await apiGet<{ agents: CallAgentOption[] }>("/v1/portal/calls/agents");
  return response.agents;
}

export function listCalls(filters: CallFilters): Promise<CallsPage> {
  const query = new URLSearchParams({
    from: filters.from,
    to: filters.to,
    limit: String(filters.limit),
    offset: String(filters.offset)
  });
  if (filters.agentId) query.set("agentId", filters.agentId);
  return apiGet<CallsPage>(`/v1/portal/calls?${query.toString()}`);
}

export async function getCall(callId: string): Promise<CallDetail> {
  const response = await apiGet<{ call: CallDetail }>(
    `/v1/portal/calls/${callId}`
  );

  return response.call;
}
