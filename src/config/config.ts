import { LangfuseExporter } from "@mastra/langfuse";
import { Observability } from "@mastra/observability";
import "dotenv/config";
import { z } from "zod";
import { configError, err, ok, Result } from "../errors.js";
import { readFile, writeFile } from "fs/promises";
import { logger } from "../logger.js";

const envSchema = z.object({
    GITHUB_CLIENT_ID: z.string().min(1, "GitHub Client ID is required"),
    GITHUB_CLIENT_SECRET: z.string().min(1, "GitHub Client Secret is required"),
    TOKEN_ENCRYPTION_KEY: z.string().length(32, "Encryption key must be 32 characters"),
    ANTHROPIC_API_KEY: z.string().optional(),
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
                        realtime: false,
                    }),
                ],
            },
        },
    }),
};

const lastRunFile = "config/last-run.json";
export type LastRunDate = Date & { readonly __brand: "lastRun" };
function lastRunDate(d: Date): LastRunDate {
    return d as LastRunDate;
}
const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;
export const defaultSince = lastRunDate(new Date(Date.now() - THREE_DAYS_MS));

export async function parseLastRunFromConfig(): Promise<Result<LastRunDate | undefined>> {
    const rulesFile = await readFile(lastRunFile, "utf8");

    if (!rulesFile.trim()) return ok(undefined);

    const parsed = z.coerce.date().optional().safeParse(JSON.parse(rulesFile));

    if (!parsed.success) {
        logger.error({ err: parsed.error }, "Could not read last run.");
        return err(configError(parsed.error.message));
    }
    return ok(parsed.data ? lastRunDate(parsed.data) : undefined);
}

export async function saveLastRunDate(): Promise<Result<void>> {
    return writeFile(lastRunFile, JSON.stringify(Date.now()), "utf8")
        .then(() => ok(undefined))
        .catch((reason) => err(configError(reason.toString())));
}
