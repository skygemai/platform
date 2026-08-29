import type { SmsProvider } from "../integrations/sms/sms-provider.interface.js";

export interface QueuedMessage {
  id: string;
  to: string;
  from?: string;
  message: string;
}

export interface MessageQueueStore {
  nextBatch(limit: number): Promise<QueuedMessage[]>;
  markSent(messageId: string, providerMessageId: string): Promise<void>;
  markFailed(messageId: string, reason: string): Promise<void>;
}

/**
 * Starter for moving SMS delivery into a worker when volume grows. The current
 * API sends synchronously; do not run this worker until that behavior is changed.
 */
export async function processMessageBatch(
  store: MessageQueueStore,
  provider: SmsProvider,
  limit = 20
): Promise<number> {
  const messages = await store.nextBatch(limit);
  for (const message of messages) {
    try {
      const result = await provider.send({
        to: message.to,
        message: message.message,
        ...(message.from ? { from: message.from } : {})
      });
      await store.markSent(message.id, result.providerMessageId);
    } catch (error) {
      const reason = error instanceof Error ? error.message : "Unknown SMS provider error";
      await store.markFailed(message.id, reason);
    }
  }
  return messages.length;
}
