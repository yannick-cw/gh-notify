import { runNotificationWorkflow } from "./agent/index.js";
import { readTkn } from "./auth/token-store.js";
import { env } from "./config.js";
import { parseRulesFromConfig } from "./filters/index.js";
import { getPRDetails } from "./github/pull-requests.js";
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

    // logger.info(await getPRDetails(tkn.value, "commercetools", "sphere-backend", 20051))

    const res = await runNotificationWorkflow(tkn.value, notificationRules.value, env.SLACK_WEBHOOK_URL ?? "")

    if (!res.ok) {
        return logger.error(res.error.message)
    }

    logger.info(res.value, "Workflow Output")
}

main().catch(console.error);