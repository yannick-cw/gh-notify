import { apiError, err, ok, Result } from "../errors.js";
import { logger } from "../logger.js";

interface SlackDecision {
    decisions: "ignore" | "inform" | "urgent";
    id: string;
    summary: string;
    repo?: string;
    title?: string;
    reason?: string;
    url?: string;
}

const sectionConfig = {
    urgent: { emoji: ":rotating_light:", label: "URGENT" },
    inform: { emoji: ":large_blue_circle:", label: "INFORM" },
    ignore: { emoji: ":white_circle:", label: "IGNORE" },
} as const;

const sectionOrder = ["urgent", "inform", "ignore"] as const;

const formatItem = (d: SlackDecision, emoji: string): string => {
    const title = d.url ? `<${d.url}|${d.title ?? d.id}>` : (d.title ?? d.id);
    const repo = d.repo ? `_${d.repo}_` : "";
    const reason = d.reason ? ` \`${d.reason}\`` : "";
    return `${emoji} ${title}\n${repo}${reason}\n${d.summary}`;
};

const formatSection = (level: (typeof sectionOrder)[number], items: SlackDecision[]): string => {
    if (items.length === 0) return "";
    const { emoji, label } = sectionConfig[level];

    if (level === "ignore") {
        const titles = items.map((d) => d.title ?? d.id).join(" | ");
        return `${emoji} _${items.length} ignored:_ ${titles}`;
    }

    return `${emoji} *${label}* (${items.length})\n\n${items.map((d) => formatItem(d, emoji)).join("\n\n")}`;
};

export function formatForSlack(decisions: SlackDecision[]): string {
    const grouped = decisions.reduce<Record<string, SlackDecision[]>>((acc, d) => {
        (acc[d.decisions] ??= []).push(d);
        return acc;
    }, {});

    return sectionOrder
        .map((level) => formatSection(level, grouped[level] ?? []))
        .filter(Boolean)
        .join("\n\n");
}

export async function sendSlackMessage(webhookUrl: string, message: string, dryRun: boolean): Promise<Result<void>> {
    if (message === "") return ok(undefined);
    const payload = { text: message };
    if (!dryRun) {
        const slackResult = await fetch(webhookUrl, {
            method: "POST",
            headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
        });

        const slackResponseText = await slackResult.text();

        if (!slackResult.ok) {
            logger.error({ status: slackResult.status, txt: slackResponseText }, "Posting to slack failed");
            return err(apiError(slackResult.statusText));
        }

        if (slackResponseText !== "ok") {
            logger.error({ status: slackResult.status, txt: slackResponseText }, "Posting to slack failed");
            return err(apiError(slackResponseText));
        }
    } else {
        logger.info(payload, "Dry rund, would have posted to slack.");
    }

    return ok(undefined);
}
