import { z } from "zod";

const nullableText = z.string().nullable().optional();

const callAnalysisSchema = z.object({
  call_summary: nullableText,
  user_sentiment: nullableText,
  call_successful: z.boolean().nullable().optional()
}).passthrough();

const retellCallSchema = z.object({
  call_id: z.string().min(1),
  call_type: z.string().optional(),
  agent_id: z.string().min(1),
  call_status: z.string().min(1),
  direction: z.enum(["inbound", "outbound"]).optional(),
  start_timestamp: z.number().int().nonnegative(),
  end_timestamp: z.number().int().nonnegative().nullable().optional(),
  duration_ms: z.number().nonnegative().nullable().optional(),
  from_number: nullableText,
  to_number: nullableText,
  transcript: nullableText,
  disconnection_reason: nullableText,
  call_analysis: callAnalysisSchema.nullable().optional()
}).passthrough().superRefine((call, context) => {
  if (!call.direction && call.call_type !== "web_call") {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["direction"],
      message: "direction is required unless call_type is web_call"
    });
  }
});

export const retellWebhookHeaderSchema = z.object({
  event: z.string(),
  call: z.unknown()
}).passthrough();

export const retellCallWebhookSchema = z.object({
  event: z.enum(["call_ended", "call_analyzed"]),
  call: retellCallSchema
}).passthrough();

export type RetellCallWebhook = z.infer<typeof retellCallWebhookSchema>;
export type RetellWebhookCall = RetellCallWebhook["call"];
