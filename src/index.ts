import { readTkn } from "./auth/token-store.js";
import { env } from "./config.js";
import { fetchNotifications } from "./github/notifications.js";
import { logger } from "./logger.js";

async function main() {
    const validenv = env

    logger.info(env, "booting up...")

    const tkn = await readTkn()

    if (!tkn.ok) {
        return logger.error(tkn.error.message)
    }

    const notifications = await fetchNotifications(tkn.value)

    logger.info(notifications, "Response from API")
}

main().catch(console.error);