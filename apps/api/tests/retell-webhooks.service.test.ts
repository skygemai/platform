import assert from "node:assert/strict";
import test from "node:test";
import {
  RetellWebhooksService,
  type RetellWebhookStore,
  type StoredRetellCall
} from "../src/modules/retell-webhooks/retell-webhooks.service.js";

class RecordingStore implements RetellWebhookStore {
  calls: StoredRetellCall[] = [];
  result: "stored" | "duplicate" | "unknown_agent" = "stored";

  async storeCall(call: StoredRetellCall) {
    this.calls.push(call);
    return this.result;
  }
}

const baseCall = {
  call_id: "call_test_123",
  call_type: "web_call",
  agent_id: "agent_test_123",
  call_status: "ended",
  start_timestamp: 1_787_775_486_523,
  end_timestamp: 1_787_775_523_956,
  duration_ms: 37_433,
  transcript: "Agent: Hello\nUser: Hi",
  disconnection_reason: "agent_hangup"
};

test("call_ended maps completed call data and uses the web-call direction convention", async () => {
  const store = new RecordingStore();
  const service = new RetellWebhooksService(store);

  const result = await service.handle({ event: "call_ended", call: baseCall });

  assert.deepEqual(result, { status: "stored", externalCallId: "call_test_123" });
  assert.equal(store.calls.length, 1);
  assert.equal(store.calls[0]!.eventType, "call_ended");
  assert.equal(store.calls[0]!.direction, "inbound");
  assert.equal(store.calls[0]!.durationSeconds, 37);
  assert.equal(store.calls[0]!.transcript, baseCall.transcript);
  assert.equal(store.calls[0]!.summary, null);
});

test("call_analyzed maps analysis fields for enrichment", async () => {
  const store = new RecordingStore();
  const service = new RetellWebhooksService(store);

  await service.handle({
    event: "call_analyzed",
    call: {
      ...baseCall,
      call_analysis: {
        call_summary: "The caller asked about office hours.",
        user_sentiment: "Positive",
        call_successful: true
      }
    }
  });

  assert.equal(store.calls[0]!.summary, "The caller asked about office hours.");
  assert.equal(store.calls[0]!.sentiment, "Positive");
  assert.equal(store.calls[0]!.callSuccessful, true);
});

test("unhandled Retell events are acknowledged without storage", async () => {
  const store = new RecordingStore();
  const service = new RetellWebhooksService(store);

  const result = await service.handle({ event: "call_started", call: baseCall });

  assert.deepEqual(result, { status: "ignored", eventType: "call_started" });
  assert.equal(store.calls.length, 0);
});

test("unknown agents return a safe non-retry result", async () => {
  const store = new RecordingStore();
  store.result = "unknown_agent";
  const service = new RetellWebhooksService(store);

  const result = await service.handle({ event: "call_ended", call: baseCall });

  assert.deepEqual(result, {
    status: "unknown_agent",
    externalCallId: "call_test_123",
    retellAgentId: "agent_test_123"
  });
});
