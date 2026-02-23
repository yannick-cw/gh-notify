import { env } from "../config.js";
import { logger } from "../logger.js";
import { startGithubTknServer } from "./github.js";

async function main() {
    logger.info(env, "booting up...")
    logger.info(env, "starting hono server")

    startGithubTknServer()
}

main().catch(console.error);