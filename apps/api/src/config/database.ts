import { readFileSync } from "node:fs";
import { Pool } from "pg";
import type { Environment } from "./environment.js";

export function createDatabasePool(environment: Environment): Pool {
  const productionSsl = environment.RDS_CA_PATH
    ? { ca: readFileSync(environment.RDS_CA_PATH, "utf8"), rejectUnauthorized: true }
    : { rejectUnauthorized: true };

  return new Pool({
    connectionString: environment.DATABASE_URL,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
    ...(environment.NODE_ENV === "production" ? { ssl: productionSsl } : {})
  });
}
