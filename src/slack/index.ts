import { apiError, err, ok, Result } from "../errors.js";
import { logger } from "../logger.js";


export async function sendSlackMessage(webhookUrl: string, message: string): Promise<Result<void>> {
    const payload = { text: message }
    const slackResult = await fetch(webhookUrl, {
        method: "POST",
        headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
    });

    if (!slackResult.ok) {
        logger.error({ status: slackResult.status }, "Posting to slack failed")
        return err(apiError(slackResult.statusText))
    }

    const slackResponseText = await slackResult.text();
    if (slackResponseText !== "ok") {
        logger.error({ status: slackResult.status }, "Posting to slack failed")
        return err(apiError(slackResponseText))
    }

    return ok(undefined)
}