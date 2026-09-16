import {
  retellCallWebhookSchema,
  retellWebhookHeaderSchema,
  type RetellCallWebhook,
  type RetellWebhookCall
} from "./retell-webhook.schemas.js";

export interface StoredRetellCall {
  eventType: RetellCallWebhook["event"];
  retellAgentId: string;
  externalCallId: string;
  startedAt: Date;
  endedAt: Date | null;
  status: string;
  direction: "inbound" | "outbound";
  fromNumber: string | null;
  toNumber: string | null;
  durationSeconds: number | null;
  summary: string | null;
  transcript: string | null;
  sentiment: string | null;
  callSuccessful: boolean | null;
  disconnectionReason: string | null;
}

export type RetellWebhookResult =
  | { status: "stored" | "duplicate"; externalCallId: string }
  | { status: "ignored"; eventType: string }
  | { status: "unknown_agent"; externalCallId: string; retellAgentId: string };

export interface RetellWebhookStore {
  storeCall(call: StoredRetellCall): Promise<"stored" | "duplicate" | "unknown_agent">;
}

function durationSeconds(call: RetellWebhookCall): number | null {
  if (call.duration_ms != null) return Math.max(0, Math.round(call.duration_ms / 1000));
  if (call.end_timestamp != null) {
    return Math.max(0, Math.round((call.end_timestamp - call.start_timestamp) / 1000));
  }
  return null;
}

export function mapRetellCall(payload: RetellCallWebhook): StoredRetellCall {
  const { call } = payload;
  return {
    eventType: payload.event,
    retellAgentId: call.agent_id,
    externalCallId: call.call_id,
    startedAt: new Date(call.start_timestamp),
    endedAt: call.end_timestamp == null ? null : new Date(call.end_timestamp),
    status: call.call_status,
    // Web calls do not have a telephone direction. The existing SkyGem schema
    // requires one, so inbound is the documented storage convention for them.
    direction: call.direction ?? "inbound",
    fromNumber: call.from_number ?? null,
    toNumber: call.to_number ?? null,
    durationSeconds: durationSeconds(call),
    summary: call.call_analysis?.call_summary ?? null,
    transcript: call.transcript ?? null,
    sentiment: call.call_analysis?.user_sentiment ?? null,
    callSuccessful: call.call_analysis?.call_successful ?? null,
    disconnectionReason: call.disconnection_reason ?? null
  };
}

export class RetellWebhooksService {
  constructor(private readonly store: RetellWebhookStore) {}

  async handle(input: unknown): Promise<RetellWebhookResult> {
    const header = retellWebhookHeaderSchema.parse(input);
    if (header.event !== "call_ended" && header.event !== "call_analyzed") {
      return { status: "ignored", eventType: header.event };
    }

    const payload = retellCallWebhookSchema.parse(input);
    const call = mapRetellCall(payload);
    const status = await this.store.storeCall(call);
    if (status === "unknown_agent") {
      return {
        status,
        externalCallId: call.externalCallId,
        retellAgentId: call.retellAgentId
      };
    }
    return { status, externalCallId: call.externalCallId };
  }
}
