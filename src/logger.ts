import pino from "pino";

const transport =
    process.env.NODE_ENV === "development"
        ? {
              target: "pino-pretty",
              options: { colorize: true },
          }
        : undefined;

const secretKeys = ["GITHUB_CLIENT_SECRET", "TOKEN_ENCRYPTION_KEY", "ANTHROPIC_API_KEY"];

export const logger = pino({
    level: process.env.LOG_LEVEL,
    transport,
    redact: [...secretKeys],
});
