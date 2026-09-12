import assert from "node:assert/strict";
import test from "node:test";
import { createHash } from "node:crypto";
import { generateActionCredential } from "../src/modules/agent-configurations/agent-configurations.service.js";

test("generated action keys match their stored SHA-256 hash", () => {
  const credential = generateActionCredential();
  assert.ok(credential.actionKey.length >= 40);
  assert.equal(credential.actionKeyHash.length, 64);
  assert.equal(
    credential.actionKeyHash,
    createHash("sha256").update(credential.actionKey, "utf8").digest("hex")
  );
});

test("each generated action key is unique", () => {
  assert.notEqual(generateActionCredential().actionKey, generateActionCredential().actionKey);
});
