import {
  GetSecretValueCommand,
  SecretsManagerClient
} from "@aws-sdk/client-secrets-manager";
import type { Environment, EnvironmentInput } from "./environment.js";

export interface SecretReader {
  getSecretString(secretId: string): Promise<string>;
}

export class SecretsService implements SecretReader {
  readonly #client: SecretsManagerClient;

  constructor(region: string) {
    this.#client = new SecretsManagerClient({ region });
  }

  async getSecretString(secretId: string): Promise<string> {
    const result = await this.#client.send(
      new GetSecretValueCommand({ SecretId: secretId })
    );
    if (!result.SecretString) {
      throw new Error(`Secret ${secretId} does not contain a string value`);
    }
    return result.SecretString;
  }
}

type JsonObject = Record<string, unknown>;

function parseJsonObject(value: string, label: string): JsonObject {
  let parsed: unknown;
  try {
    parsed = JSON.parse(value) as unknown;
  } catch {
    throw new Error(`${label} must contain a JSON object`);
  }

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error(`${label} must contain a JSON object`);
  }
  return parsed as JsonObject;
}

function requiredString(object: JsonObject, key: string, label: string): string {
  const value = object[key];
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`${label} is missing required field ${key}`);
  }
  return value;
}

function createDatabaseUrl(secretString: string): string {
  const secret = parseJsonObject(secretString, "Database secret");
  const username = requiredString(secret, "username", "Database secret");
  const password = requiredString(secret, "password", "Database secret");
  const host = requiredString(secret, "host", "Database secret");
  const databaseValue = secret.dbname ?? secret.database;
  const database = typeof databaseValue === "string" && databaseValue.length > 0
    ? databaseValue
    : "skygem";
  const portValue = secret.port ?? 5432;
  const port = typeof portValue === "number" || typeof portValue === "string"
    ? String(portValue)
    : "5432";

  const url = new URL("postgresql://");
  url.username = username;
  url.password = password;
  url.hostname = host;
  url.port = port;
  url.pathname = `/${database}`;
  return url.toString();
}

function readRetellApiKey(secretString: string): string {
  const trimmed = secretString.trim();
  if (!trimmed) throw new Error("Retell API key secret is empty");

  if (!trimmed.startsWith("{")) return trimmed;

  const secret = parseJsonObject(trimmed, "Retell API key secret");
  const value = secret.RETELL_API_KEY ?? secret.apiKey ?? secret.api_key;
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(
      "Retell API key secret must be a string or contain RETELL_API_KEY, apiKey, or api_key"
    );
  }
  return value;
}

export async function resolveEnvironment(
  input: EnvironmentInput,
  secrets: SecretReader = new SecretsService(input.AWS_REGION)
): Promise<Environment> {
  if (input.NODE_ENV !== "production") {
    if (!input.DATABASE_URL) {
      throw new Error("DATABASE_URL is required outside production");
    }
    if (!input.RETELL_API_KEY) {
      throw new Error("RETELL_API_KEY is required outside production");
    }
    return {
      ...input,
      DATABASE_URL: input.DATABASE_URL,
      RETELL_API_KEY: input.RETELL_API_KEY
    };
  }

  if (!input.DB_SECRET_ARN) {
    throw new Error("DB_SECRET_ARN is required in production");
  }
  if (!input.RETELL_API_KEY_SECRET_ID) {
    throw new Error("RETELL_API_KEY_SECRET_ID is required in production");
  }
  if (!input.RDS_CA_PATH) {
    throw new Error("RDS_CA_PATH is required in production");
  }

  const [databaseSecret, retellSecret] = await Promise.all([
    secrets.getSecretString(input.DB_SECRET_ARN),
    secrets.getSecretString(input.RETELL_API_KEY_SECRET_ID)
  ]);

  return {
    ...input,
    DATABASE_URL: createDatabaseUrl(databaseSecret),
    RETELL_API_KEY: readRetellApiKey(retellSecret)
  };
}
