import { LangfuseExporter } from "@mastra/langfuse";
import { Observability } from "@mastra/observability";
import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
    GITHUB_CLIENT_ID: z.string().min(1, "GitHub Client ID is required"),
    GITHUB_CLIENT_SECRET: z.string().min(1, "GitHub Client Secret is required"),
    TOKEN_ENCRYPTION_KEY: z.string().length(32, "Encryption key must be 32 characters"),
    OPENAI_API_KEY: z.string().optional(),
    SLACK_WEBHOOK_URL: z.url().optional(),
    LANGFUSE_PUBLIC_KEY: z.string().optional(),
    LANGFUSE_SECRET_KEY: z.string().optional(),
    LANGFUSE_BASE_URL: z.url().optional(),
    LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

export type Config = z.infer<typeof envSchema>;

export const env: Config = envSchema.parse(process.env);

export const langfuseConf = {
    observability: new Observability({
        configs: {
            langfuse: {
                serviceName: "gh-notify",
                exporters: [
                    new LangfuseExporter({
                        publicKey: env.LANGFUSE_PUBLIC_KEY,
                        secretKey: env.LANGFUSE_SECRET_KEY,
                        baseUrl: env.LANGFUSE_BASE_URL,
                        realtime: true,
                    }),
                ],
            },
        },
    }),
};
