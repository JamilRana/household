import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().url("DATABASE_URL must be a valid database connection string"),
  DIRECT_URL: z.string().url().optional(),
  AUTH_SECRET: z.string().min(16, "AUTH_SECRET must be at least 16 characters long"),
  NEXTAUTH_URL: z.string().url().optional().default("http://localhost:3000"),
  ENCRYPTION_KEY: z.string().min(32, "ENCRYPTION_KEY must be at least 32 characters long for AES-256-GCM"),
  CRON_SECRET: z.string().min(16, "CRON_SECRET must be at least 16 characters for background job authentication"),
  AUTH_GOOGLE_ID: z.string().optional(),
  AUTH_GOOGLE_SECRET: z.string().optional(),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(): Env {
  // During build / test without local env file, provide safe fallbacks
  if (process.env.NODE_ENV === "test") {
    return {
      DATABASE_URL: process.env.DATABASE_URL || "postgresql://dummy:dummy@localhost:5432/dummy",
      AUTH_SECRET: process.env.AUTH_SECRET || "test-auth-secret-minimum-16-chars",
      NEXTAUTH_URL: "http://localhost:3000",
      ENCRYPTION_KEY: process.env.ENCRYPTION_KEY || "test-key-32-characters-long-12345678",
      CRON_SECRET: process.env.CRON_SECRET || "test-cron-secret-16-chars-long",
      NODE_ENV: "test",
    };
  }

  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    const errorDetails = parsed.error.issues
      .map((issue) => ` - [${issue.path.join(".")}]: ${issue.message}`)
      .join("\n");

    const message = `\n❌ Invalid or Missing Environment Variables:\n${errorDetails}\n\nPlease check your .env configuration.\n`;

    // In production or development runtime, log clearly
    if (process.env.NODE_ENV === "production") {
      throw new Error(message);
    } else {
      console.warn(message);
    }

    return process.env as unknown as Env;
  }

  return parsed.data;
}

export const env = validateEnv();
