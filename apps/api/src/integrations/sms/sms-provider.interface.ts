export interface SendSmsInput {
  to: string;
  from?: string;
  message: string;
}

export interface SendSmsResult {
  providerMessageId: string;
  status: "queued" | "sent";
}

export interface SmsProvider {
  send(input: SendSmsInput): Promise<SendSmsResult>;
}
