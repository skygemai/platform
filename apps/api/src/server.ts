import { createApp } from "./app.js";
import { createDatabasePool } from "./config/database.js";
import { loadEnvironment } from "./config/environment.js";
import { ConsoleSmsProvider } from "./integrations/sms/console-sms.client.js";

const environment = loadEnvironment();
const pool = createDatabasePool(environment);
const smsProvider = new ConsoleSmsProvider();
const app = createApp({ environment, pool, smsProvider });

const server = app.listen(environment.PORT, "127.0.0.1", () => {
  console.info(`SkyGem API listening on 127.0.0.1:${environment.PORT}`);
});

async function shutdown(signal: string) {
  console.info(`Received ${signal}; shutting down`);
  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
