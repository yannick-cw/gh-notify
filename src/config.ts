import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
    GITHUB_CLIENT_ID: z.string().min(1, "GitHub Client ID is required"),
    GITHUB_CLIENT_SECRET: z.string().min(1, "GitHub Client Secret is required"),
    TOKEN_ENCRYPTION_KEY: z.string().length(32, "Encryption key must be 32 characters").optional(),
    OPENAI_API_KEY: z.string().optional(),
    SLACK_WEBHOOK_URL: z.url().optional(),
    LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

export type Config = z.infer<typeof envSchema>;

export const env: Config = envSchema.parse(process.env);
