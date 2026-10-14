import assert from "node:assert/strict";
import test from "node:test";
import { loadEnvironment } from "../src/config/environment.js";
import { resolveEnvironment, type SecretReader } from "../src/config/secrets.js";

test("local development uses direct test credentials", async () => {
  const input = loadEnvironment({
    NODE_ENV: "development",
    DATABASE_URL: "postgresql://postgres:local@localhost:5432/skygem",
    RETELL_API_KEY: "test-retell-key"
  });

  const resolved = await resolveEnvironment(input);
  assert.equal(resolved.DATABASE_URL, input.DATABASE_URL);
  assert.equal(resolved.RETELL_API_KEY, input.RETELL_API_KEY);
});

test("production resolves database and Retell secrets", async () => {
  const values: Record<string, string> = {
    database: JSON.stringify({
      username: "skygemadmin",
      password: "special:/?#[]@!password",
      host: "example.rds.amazonaws.com",
      port: 5432,
      dbname: "skygem"
    }),
    retell: JSON.stringify({ RETELL_API_KEY: "retell-production-key" })
  };
  const reader: SecretReader = {
    async getSecretString(secretId) {
      const value = values[secretId];
      if (!value) throw new Error("Unexpected secret ID");
      return value;
    }
  };
  const input = loadEnvironment({
    NODE_ENV: "production",
    DATABASE_SECRET_ID: "database",
    RETELL_API_KEY_SECRET_ID: "retell",
    RDS_CA_PATH: "/etc/pki/rds/global-bundle.pem"
  });

  const resolved = await resolveEnvironment(input, reader);
  const databaseUrl = new URL(resolved.DATABASE_URL);
  assert.equal(databaseUrl.username, "skygemadmin");
  assert.equal(decodeURIComponent(databaseUrl.password), "special:/?#[]@!password");
  assert.equal(databaseUrl.hostname, "example.rds.amazonaws.com");
  assert.equal(databaseUrl.pathname, "/skygem");
  assert.equal(resolved.RETELL_API_KEY, "retell-production-key");
});

test("production does not fall back to direct credentials", async () => {
  const input = loadEnvironment({
    NODE_ENV: "production",
    DATABASE_URL: "postgresql://should-not-be-used",
    RETELL_API_KEY: "should-not-be-used",
    RDS_CA_PATH: "/etc/pki/rds/global-bundle.pem"
  });

  await assert.rejects(resolveEnvironment(input), /DATABASE_SECRET_ID is required/);
});
