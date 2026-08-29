import type { SendTextRequest, SendTextResponse } from "@skygem/shared";
import type { SmsProvider } from "../../integrations/sms/sms-provider.interface.js";
import type { MessagingRepository } from "./messaging.repository.js";

export interface SendTextContext {
  tenantId: string;
  source: "portal" | "agent";
  actorType: "user" | "agent";
  actorId: string;
  agentConfigurationId?: string;
}

export class MessagingService {
  constructor(
    private readonly repository: MessagingRepository,
    private readonly provider: SmsProvider,
    private readonly fromNumber?: string
  ) {}

  async sendText(request: SendTextRequest, context: SendTextContext): Promise<SendTextResponse> {
    const pending = await this.repository.createPending({
      tenantId: context.tenantId,
      to: request.to,
      message: request.message,
      idempotencyKey: request.idempotencyKey,
      source: context.source,
      ...(context.agentConfigurationId
        ? { agentConfigurationId: context.agentConfigurationId }
        : {})
    });

    if (!pending.created) {
      return {
        messageId: pending.record.id,
        providerMessageId: pending.record.providerMessageId,
        status: pending.record.status
      };
    }

    try {
      const providerResult = await this.provider.send({
        to: request.to,
        message: request.message,
        ...(this.fromNumber ? { from: this.fromNumber } : {})
      });
      await this.repository.markSent(
        pending.record.id,
        providerResult.providerMessageId,
        providerResult.status
      );
      await this.repository.createAuditEvent({
        tenantId: context.tenantId,
        action: "message.send",
        actorType: context.actorType,
        actorId: context.actorId,
        resourceId: pending.record.id
      });
      return {
        messageId: pending.record.id,
        providerMessageId: providerResult.providerMessageId,
        status: providerResult.status
      };
    } catch (error) {
      const reason = error instanceof Error ? error.message : "Unknown SMS provider error";
      await this.repository.markFailed(pending.record.id, reason);
      throw error;
    }
  }
}
