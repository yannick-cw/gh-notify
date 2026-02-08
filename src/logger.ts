import pino from 'pino';
import { Config, env } from './config.js';

const transport = env.NODE_ENV === 'development'
    ? {
        target: 'pino-pretty',
        options: { colorize: true }
    }
    : undefined;

const secretKeys = [
    "GITHUB_CLIENT_SECRET",
    "TOKEN_ENCRYPTION_KEY",
    "OPENAI_API_KEY",
] as const satisfies readonly (keyof Config)[];

export const logger = pino({
    level: env.LOG_LEVEL,
    transport,
    redact: [...secretKeys]
});