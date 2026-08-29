import { z } from "zod";

export const e164PhoneNumberSchema = z
  .string()
  .regex(/^\+[1-9]\d{7,14}$/, "Use E.164 format, such as +19195551212");

export const sendTextRequestSchema = z.object({
  to: e164PhoneNumberSchema,
  message: z.string().trim().min(1).max(1600),
  idempotencyKey: z.string().uuid()
});

export type SendTextRequest = z.infer<typeof sendTextRequestSchema>;

export interface SendTextResponse {
  messageId: string;
  providerMessageId: string | null;
  status: "queued" | "sent" | "failed";
}
