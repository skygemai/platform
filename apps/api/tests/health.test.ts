import assert from "node:assert/strict";
import { test } from "node:test";
import type { Pool } from "pg";
import request from "supertest";
import { createApp } from "../src/app.js";
import type { Environment } from "../src/config/environment.js";
import { ConsoleSmsProvider } from "../src/integrations/sms/console-sms.client.js";

const environment: Environment = {
  NODE_ENV: "test",
  PORT: 8080,
  ALLOWED_ORIGINS: "http://localhost:5173",
  DATABASE_URL: "postgresql://unused",
  AWS_REGION: "us-east-1",
  SMS_PROVIDER: "console"
};

test("GET /health reports that the process is running", async () => {
  const app = createApp({
    environment,
    pool: {} as Pool,
    smsProvider: new ConsoleSmsProvider()
  });
  const response = await request(app).get("/health").expect(200);
  assert.deepEqual(response.body, { status: "ok" });
});
