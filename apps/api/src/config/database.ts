import { readFileSync } from "node:fs";
import { Pool } from "pg";
import type { Environment } from "./environment.js";
import { SecretsService } from "./secrets.js";

export function createDatabasePool(environment: Environment): Pool {
  const isProduction = environment.NODE_ENV === "production";
  const secrets = new SecretsService(environment.AWS_REGION);
  const initialUrl = new URL(environment.DATABASE_URL);
  const username = decodeURIComponent(initialUrl.username);

  async function getCurrentPassword(): Promise<string> {
    const secretString = await secrets.getSecretString(
      environment.DB_SECRET_ARN
    );
    const secret = JSON.parse(secretString) as {
      username?: unknown;
      password?: unknown;
    } | null;

    if (
      !secret ||
      typeof secret.password !== "string" ||
      secret.password.length === 0
    ) {
      throw new Error("Database secret is missing a valid password");
    }

    if (secret.username !== username) {
      throw new Error(
        "Database secret username changed; API restart required"
      );
    }

    return secret.password;
  }

  const pool = new Pool({
    ...(isProduction
      ? {
          host: environment.DB_HOST,
          port: Number(environment.DB_PORT),
          database: environment.DB_NAME,
          user: username,
          password: getCurrentPassword,
          ssl: {
            ...(environment.RDS_CA_PATH
              ? {
                  ca: readFileSync(environment.RDS_CA_PATH, "utf8")
                }
              : {}),
            rejectUnauthorized: true
          }
        }
      : {
          connectionString: environment.DATABASE_URL
        }),
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000
  });

  pool.on("error", (error) => {
    console.error("Unexpected database pool error", error);
  });

  return pool;
}