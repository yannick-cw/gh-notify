import { readTkn } from "./auth/token-store.js";
import { env } from "./config.js";
import { logger } from "./logger.js";

async function main() {
    const validenv = env

    logger.info(env, "booting up...")

    const tkn = await readTkn()

    if (!tkn.ok) {
        return logger.error(tkn.error.message)
    } else {

        const testUrl = new URL("https://api.github.com/user");
        const headers = {
            "Authorization": `Bearer ${tkn.value}`,
            "Accept": "application/json"
        };
        const gitRes = await fetch(testUrl, { headers })
        const jsonRes = await gitRes.json()

        logger.info(jsonRes, "Response from API")
    }
}

main().catch(console.error);