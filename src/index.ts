import { env } from "./config.js";
import { logger } from "./logger.js";

async function main() {
    const validenv = env

    logger.info(env, "booting up...")
}

main().catch(console.error);