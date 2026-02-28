import { runTriageWorkflow } from "./agent/index.js";
import { readTkn } from "./auth/token-store.js";
import { env } from "./config.js";
import { parseRulesFromConfig } from "./filters/index.js";
import { logger } from "./logger.js";
import { sendSlackMessage } from "./slack/index.js";

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

    // if (env.SLACK_WEBHOOK_URL) {
    //     await sendSlackMessage(env.SLACK_WEBHOOK_URL, JSON.stringify(res.value))
    // }
}

main().catch(console.error);