import { randomUUID } from "node:crypto";
import type {
  SendSmsInput,
  SendSmsResult,
  SmsProvider
} from "./sms-provider.interface.js";

function maskPhoneNumber(value: string): string {
  return value.length < 4 ? "****" : `***${value.slice(-4)}`;
}

/**
 * Safe development provider. It does not send a real text and never logs the
 * message body. Replace it with a Twilio or AWS provider before production.
 */
export class ConsoleSmsProvider implements SmsProvider {
  async send(input: SendSmsInput): Promise<SendSmsResult> {
    const providerMessageId = `development-${randomUUID()}`;
    console.info("Development SMS accepted", {
      to: maskPhoneNumber(input.to),
      providerMessageId
    });
    return { providerMessageId, status: "queued" };
  }
}
