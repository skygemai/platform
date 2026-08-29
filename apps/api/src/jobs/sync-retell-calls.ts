import type { RetellCallResponse, RetellClient } from "../integrations/retell/retell.client.js";

export interface RetellCallStore {
  upsert(input: {
    tenantId: string;
    agentConfigurationId: string;
    call: RetellCallResponse;
  }): Promise<void>;
}

/**
 * Suitable for a future SQS worker or scheduled reconciliation job. Webhooks
 * should remain the primary source of timely updates; this job can repair gaps.
 */
export async function syncRetellCall(
  retell: RetellClient,
  store: RetellCallStore,
  input: { tenantId: string; agentConfigurationId: string; externalCallId: string }
): Promise<void> {
  const call = await retell.getCall(input.externalCallId);
  await store.upsert({
    tenantId: input.tenantId,
    agentConfigurationId: input.agentConfigurationId,
    call
  });
}
