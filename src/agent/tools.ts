import { createTool } from "@mastra/core/tools";
import z from "zod";
import { fetchNotifications, notificationsSchema } from "../github/notifications.js";
import { FilterRule } from "../filters/rules.js";
import { applyFilters } from "../filters/index.js";
import { getPRDetails, prSchema } from "../github/pull-requests.js";
import { getIssueDetails, issueSchema } from "../github/issues.js";

export const fetchNotificationsTool = (tkn: string, filters: FilterRule[]) => createTool({
    id: "fetch-github-notifications-tool",
    description: `Fetches all recent notifications from GitHub from all kind of places.
                    Use this to get the initial notifications.
                    They are already filtered to a subset of notifications.
                    Only recent notifications are returned. Last three hours.
                    Rules are: ${JSON.stringify(filters)}`,
    inputSchema: z.object({}),
    outputSchema: notificationsSchema,
    execute: async () => {
        const filteredNotifications = await fetchNotifications(tkn);

        if (!filteredNotifications.ok) {
            return Promise.reject(filteredNotifications.error)
        }
        return applyFilters(filteredNotifications.value, filters)
    },
});

export const getPRDetailsTool = (tkn: string) => createTool({
    id: "get-github-pr-details-tool",
    description: `Fetches pull request (PR) details for a given notification.
                    Use this to retrieve detailed PR context (reviewers, state, team mentions, etc.)
                    Input is owner, repo and PR number.
                    Returns PR data with reviewers, status, and relevant metadata.`,
    inputSchema: z.object({
        owner: z.string(),
        repo: z.string(),
        number: z.number().describe("The PR number")
    }),
    outputSchema: prSchema,
    execute: async ({ owner, repo, number }) => {
        const prDetailsResult = await getPRDetails(tkn, owner, repo, number)

        if (!prDetailsResult.ok) {
            return Promise.reject(prDetailsResult.error);
        }
        return prDetailsResult.value;
    },
});

export const getIssueDetailsTool = (tkn: string) => createTool({
    id: "get-github-issue-details-tool",
    description: `Fetches issue details for a given notification.
                    Use this to retrieve detailed issue context (labels, assignees, state, etc.)
                    Input is owner, repo and issue number.
                    Returns issue data with labels, assignees, and relevant metadata.`,
    inputSchema: z.object({
        owner: z.string(),
        repo: z.string(),
        number: z.number().describe("The issue number"),
    }),
    outputSchema: issueSchema,
    execute: async ({ owner, repo, number }) => {
        const issueDetailsResult = await getIssueDetails(tkn, owner, repo, number);

        if (!issueDetailsResult.ok) {
            return Promise.reject(issueDetailsResult.error);
        }
        return issueDetailsResult.value;
    },
});