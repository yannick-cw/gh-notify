// 1. Implement `applyFilters(notifications: Notification[], rules: FilterRule[]): Notification[]`
// 2. Rules can be include or exclude
// 3. Exclude rules take precedence

import { readFile } from "fs/promises";
import { configError, err, ok, Result } from "../errors.js";
import { GitNotification } from "../github/notifications.js";
import { logger } from "../logger.js";
import { FilterRule, filterRulesSchema } from "./rules.js";

export function applyFilters(notifications: GitNotification[], rules: FilterRule[]): GitNotification[] {
    return notifications
        .filter(
            (notification) =>
                rules.length == 0 ||
                rules.some((rule) => rule.kind === "INCLUDE" && rule.reason === notification.reason),
        )
        .filter(
            (notification) => !rules.some((rule) => rule.kind === "EXCLUDE" && rule.reason === notification.reason),
        );
}

const filterFile = "config/filter-rules.json";
export async function parseRulesFromConfig(): Promise<Result<FilterRule[]>> {
    const rulesFile = await readFile(filterFile, "utf8");
    const parsed = filterRulesSchema.safeParse(JSON.parse(rulesFile));

    if (!parsed.success) {
        logger.error({ err: parsed.error }, "Could not read filter rules.");
        return err(configError(parsed.error.message));
    }

    return ok(parsed.data);
}
