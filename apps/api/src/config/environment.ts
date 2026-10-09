import { z } from "zod";

const environmentInputSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(8080),
  ALLOWED_ORIGINS: z.string().default("http://localhost:5173"),
  DB_HOST: z.string().min(1),
  DB_PORT: z.string().min(1),
  DB_NAME: z.string().min(1),
  DB_SECRET_ARN: z.string().min(1),
  RDS_CA_PATH: z.string().min(1).optional(),
  AWS_REGION: z.string().default("us-east-1"),
  COGNITO_USER_POOL_ID: z.string().optional(),
  COGNITO_CLIENT_ID: z.string().optional(),
  SMS_PROVIDER: z.enum(["console"]).default("console"),
  SMS_FROM_NUMBER: z.string().optional(),
  RETELL_API_KEY_SECRET_ID: z.string().min(1).optional(),
  RETELL_WEBHOOK_SECRET: z.string().optional(),
  RETELL_API_KEY: z.string().min(1).optional(),
  DATABASE_URL: z.string().min(1).optional()
});

export type EnvironmentInput = z.infer<typeof environmentInputSchema>;

export type Environment = Omit<EnvironmentInput, "DB_HOST" | "DB_PORT" | "DB_NAME" | "DB_SECRET_ARN" |"RETELL_API_KEY"> & {
  DB_HOST: string;
  DB_PORT: string;
  DB_NAME: string;
  DB_SECRET_ARN: string;
  RETELL_API_KEY: string;
  DATABASE_URL: string;
};

export function loadEnvironment(
  source: NodeJS.ProcessEnv = process.env
): EnvironmentInput {
  return environmentInputSchema.parse(source);
}

export function parseAllowedOrigins(value: string): string[] {
  return value.split(",").map((origin) => origin.trim()).filter(Boolean);
}
