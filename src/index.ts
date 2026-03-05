import { Command } from "commander";
import { runNotificationWorkflow } from "./agent/index.js";
import { readTkn } from "./auth/token-store.js";
import { defaultSince, env, parseLastRunFromConfig } from "./config/config.js";
import { parseRulesFromConfig } from "./config/index.js";
import { logger } from "./logger.js";

async function main() {
    const program = new Command();

    program.option("--dry-run", "Log output, but do not send to Slack and do not update last run date.").parse();
    const opts = program.opts();

    logger.info(env, "booting up...");

    const tkn = await readTkn();
    const notificationRules = await parseRulesFromConfig();
    const lastRunDate = await parseLastRunFromConfig();

    if (!notificationRules.ok) {
        return logger.error(notificationRules.error.message);
    }

    if (!lastRunDate.ok) {
        return logger.error(lastRunDate.error.message);
    }

    if (!tkn.ok) {
        return logger.error(tkn.error.message);
    }

    const res = await runNotificationWorkflow(
        tkn.value,
        notificationRules.value,
        env.SLACK_WEBHOOK_URL ?? "",
        lastRunDate.value || defaultSince,
        opts.dryRun,
    );

    if (!res.ok) {
        return logger.error(res.error.message);
    }

    logger.info(res.value, "Workflow Output");
}

main().catch(console.error);
