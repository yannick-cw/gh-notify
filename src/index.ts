import { runTriageWorkflow } from "./agent/index.js";
import { readTkn } from "./auth/token-store.js";
import { env } from "./config.js";
import { applyFilters, parseRulesFromConfig } from "./filters/index.js";
import { fetchNotifications } from "./github/notifications.js";
import { logger } from "./logger.js";

async function main() {
    logger.info(env, "booting up...")

    const tkn = await readTkn()
    const notificationRules = await parseRulesFromConfig()

    if (!notificationRules.ok) {
        return logger.error(notificationRules.error.message)
    }

    if (!tkn.ok) {
        return logger.error(tkn.error.message)
    }

    // why: old manual way
    // const notifications = await fetchNotifications(tkn.value)
    // if (!notifications.ok) {
    //     return logger.error(notifications.error.message)
    // }
    // logger.info(notifications.value, "Response from API")
    // const filteredNotifications = applyFilters(notifications.value, notificationRules.value)
    // logger.info(filteredNotifications, "Notifcations have been filtered")

    const res = await runTriageWorkflow(tkn.value, notificationRules.value)

    if (!res.ok) {
        return logger.error(res.error.message)
    }

    logger.info(res.value, "Workflow Output")
}

main().catch(console.error);