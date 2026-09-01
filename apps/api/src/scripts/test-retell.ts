import Retell from "retell-sdk";

const apiKey = process.env.RETELL_API_KEY;

if (!apiKey) {
  throw new Error("RETELL_API_KEY is not configured");
}

const retell = new Retell({ apiKey });

const result = await retell.call.list({
  sort_order: "descending",
  limit: 10,
});

const calls = result.items ?? [];

console.log(`Retrieved ${calls.length} calls`);

console.table(
  calls.map((call) => ({
    call_id: call.call_id,
    agent_id: call.agent_id,
    status: call.call_status,
    started: call.start_timestamp
      ? new Date(call.start_timestamp).toISOString()
      : null,
    duration_seconds: call.duration_ms
      ? Math.round(call.duration_ms / 1000)
      : null,
  })),
);

const latestCall = calls[0];

if (latestCall) {
  const details = await retell.call.retrieve(latestCall.call_id);

  console.dir(
    {
      call_id: details.call_id,
      transcript: details.transcript,
      analysis: details.call_analysis,
      recording_url: details.recording_url,
    },
    { depth: null },
  );
}
