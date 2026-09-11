import assert from "node:assert/strict";
import test from "node:test";
import { callPermissionsFor } from "../src/modules/calls/calls.permissions.js";

test("owner and admin can view sensitive call detail", () => {
  for (const role of ["owner", "admin"] as const) {
    assert.deepEqual(callPermissionsFor(role), {
      canBrowseCalls: true,
      canViewSummary: true,
      canViewTranscript: true,
      canViewPhoneNumbers: true
    });
  }
});

test("member cannot view transcript or phone numbers", () => {
  assert.deepEqual(callPermissionsFor("member"), {
    canBrowseCalls: true,
    canViewSummary: true,
    canViewTranscript: false,
    canViewPhoneNumbers: false
  });
});

test("viewer is aggregate-only", () => {
  assert.deepEqual(callPermissionsFor("viewer"), {
    canBrowseCalls: false,
    canViewSummary: false,
    canViewTranscript: false,
    canViewPhoneNumbers: false
  });
});
