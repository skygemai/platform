import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import type { Pool } from "pg";
import type { SmsProvider } from "./integrations/sms/sms-provider.interface.js";
import type { Environment } from "./config/environment.js";
import { parseAllowedOrigins } from "./config/environment.js";
import { createAgentAuthenticator } from "./middleware/authenticate-agent.js";
import { createUserAuthenticator } from "./middleware/authenticate-user.js";
import { errorHandler } from "./middleware/error-handler.js";
import { requestContext } from "./middleware/request-context.js";
import { createTenantAccessMiddleware } from "./middleware/tenant-access.js";
import { AgentActionsController } from "./modules/agent-actions/agent-actions.controller.js";
import { createAgentActionsRouter } from "./modules/agent-actions/agent-actions.routes.js";
import { AnalyticsController } from "./modules/analytics/analytics.controller.js";
import { AnalyticsRepository } from "./modules/analytics/analytics.repository.js";
import { createAnalyticsRouter } from "./modules/analytics/analytics.routes.js";
import { AnalyticsService } from "./modules/analytics/analytics.service.js";
import { CallsController } from "./modules/calls/calls.controller.js";
import { CallsRepository } from "./modules/calls/calls.repository.js";
import { createCallsRouter } from "./modules/calls/calls.routes.js";
import { CallsService } from "./modules/calls/calls.service.js";
import { MessagingController } from "./modules/messaging/messaging.controller.js";
import { MessagingRepository } from "./modules/messaging/messaging.repository.js";
import { createMessagingRouter } from "./modules/messaging/messaging.routes.js";
import { MessagingService } from "./modules/messaging/messaging.service.js";
import { TenantsController } from "./modules/tenants/tenants.controller.js";
import { TenantsRepository } from "./modules/tenants/tenants.repository.js";
import { createTenantsRouter } from "./modules/tenants/tenants.routes.js";
import { UsersController } from "./modules/users/users.controller.js";
import { UsersRepository } from "./modules/users/users.repository.js";
import { createUsersRouter } from "./modules/users/users.routes.js";
import retellCallsRouter from "./routes/retell-calls.js";

export interface AppDependencies {
  environment: Environment;
  pool: Pool;
  smsProvider: SmsProvider;
}

export function createApp({ environment, pool, smsProvider }: AppDependencies) {
  const app = express();
  const allowedOrigins = new Set(parseAllowedOrigins(environment.ALLOWED_ORIGINS));

  app.disable("x-powered-by");
  app.set("trust proxy", 1);
  app.use(requestContext);
  app.use(helmet());
  app.use(cors({
    credentials: true,
    origin(origin, callback) {
      if (!origin || allowedOrigins.has(origin)) return callback(null, true);
      return callback(new Error("Origin not allowed"));
    }
  }));
  app.use(express.json({ limit: "1mb" }));

  const generalLimiter = rateLimit({ windowMs: 60_000, limit: 120 });
  const agentLimiter = rateLimit({ windowMs: 60_000, limit: 30 });
  app.use(generalLimiter);

  app.get("/health", (_request, response) => {
    response.json({ status: "ok" });
  });
  app.get("/ready", async (_request, response, next) => {
    try {
      await pool.query("SELECT 1");
      response.json({ status: "ready" });
    } catch (error) {
      next(error);
    }
  });

  const usersController = new UsersController(
    new UsersRepository(pool)
  );
  const tenantsController = new TenantsController(
    new TenantsRepository(pool)
  );
  const callsController = new CallsController(new CallsService(new CallsRepository(pool)));
  const analyticsController = new AnalyticsController(
    new AnalyticsService(new AnalyticsRepository(pool))
  );
  const messagingService = new MessagingService(
    new MessagingRepository(pool),
    smsProvider,
    environment.SMS_FROM_NUMBER
  );
  const messagingController = new MessagingController(messagingService);
  const agentActionsController = new AgentActionsController(messagingService);

  const authenticateUser = createUserAuthenticator(environment);
  const requireTenantAccess = createTenantAccessMiddleware(pool);
  app.use("/api/users", createUsersRouter(usersController));
  app.use("/api/tenants", createTenantsRouter(tenantsController));
  app.use("/v1/portal", authenticateUser, requireTenantAccess);
  app.use("/v1/portal/calls", createCallsRouter(callsController));
  app.use("/v1/portal/analytics", createAnalyticsRouter(analyticsController));
  app.use("/v1/portal/messages", createMessagingRouter(messagingController));
  
  app.use(
    "/v1/agent-actions",
    agentLimiter,
    createAgentAuthenticator(pool),
    createAgentActionsRouter(agentActionsController)
  );

  // Retell test route
  app.use("/api/retell/calls", retellCallsRouter);

  app.use((_request, response) => {
    response.status(404).json({ error: "Route not found" });
  });
  app.use(errorHandler);
  return app;
}
