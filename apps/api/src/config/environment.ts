import { z } from "zod";

const environmentSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(8080),
  ALLOWED_ORIGINS: z.string().default("http://localhost:5173"),
  DATABASE_URL: z.string().min(1),
  RDS_CA_PATH: z.string().optional(),
  AWS_REGION: z.string().default("us-east-1"),
  COGNITO_USER_POOL_ID: z.string().optional(),
  COGNITO_CLIENT_ID: z.string().optional(),
  SMS_PROVIDER: z.enum(["console"]).default("console"),
  SMS_FROM_NUMBER: z.string().optional(),
  RETELL_API_KEY_SECRET_ID: z.string().optional(),
  RETELL_WEBHOOK_SECRET: z.string().optional(),
  RETELL_API_KEY: z.string().min(1)
});

export type Environment = z.infer<typeof environmentSchema>;

export function loadEnvironment(source: NodeJS.ProcessEnv = process.env): Environment {
  return environmentSchema.parse(source);
}

export function parseAllowedOrigins(value: string): string[] {
  return value.split(",").map((origin) => origin.trim()).filter(Boolean);
}
