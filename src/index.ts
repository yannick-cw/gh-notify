import { readTkn } from "./auth/token-store.js";
import { env } from "./config.js";
import { applyFilters, parseRulesFromConfig } from "./filters/index.js";
import { fetchNotifications } from "./github/notifications.js";
import { logger } from "./logger.js";

async function main() {
    const validenv = env

    logger.info(env, "booting up...")

    const tkn = await readTkn()
    const notificationRules = await parseRulesFromConfig()

    if (!notificationRules.ok) {
        return logger.error(notificationRules.error.message)
    }

    if (!tkn.ok) {
        return logger.error(tkn.error.message)
    }

    const notifications = await fetchNotifications(tkn.value)

    if (!notifications.ok) {
        return logger.error(notifications.error.message)
    }

    logger.info(notifications.value, "Response from API")

    const filteredNotifications = applyFilters(notifications.value, notificationRules.value)

    logger.info(filteredNotifications, "Notifcations have been filtered")
}

main().catch(console.error);