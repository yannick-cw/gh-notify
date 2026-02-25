import { createTool } from "@mastra/core/tools";
import z from "zod";
import { fetchNotifications, enrichedNotificationsSchema, EnrichedNotification } from "../github/notifications.js";
import { FilterRule } from "../filters/rules.js";
import { applyFilters } from "../filters/index.js";
import { getPRDetails, prSchema } from "../github/pull-requests.js";
import { getIssueDetails, issueSchema } from "../github/issues.js";
import { getComment } from "../github/comments.js";

export const fetchNotificationsTool = (tkn: string, filters: FilterRule[]) => createTool({
    id: "fetch-github-notifications-tool",
    description: `Fetches all recent notifications from GitHub (last 3 days), filtered by rules.
                    Notifications are pre-enriched:
                    - review_requested on PRs include requested_reviewers and requested_teams
                    - Notifications with a latest_comment_url include the fetched latest_comment
                    Rules are: ${JSON.stringify(filters)}`,
    inputSchema: z.object({}),
    outputSchema: enrichedNotificationsSchema,
    execute: async () => {
        const result = await fetchNotifications(tkn);

        if (!result.ok) {
            return Promise.reject(result.error)
        }

        const filtered = applyFilters(result.value, filters).slice(0, 10);

        const enriched: EnrichedNotification[] = await Promise.all(
            filtered.map(async (n): Promise<EnrichedNotification> => {
                const enrichments: Partial<EnrichedNotification> = {};

                const [prResult, commentResult] = await Promise.all([
                    n.reason === "review_requested" && n.subject.type === "PullRequest"
                        ? (() => {
                            const [owner, repo] = n.repository.full_name.split("/");
                            const number = parseInt(n.subject.url.split("/").pop()!, 10);
                            return getPRDetails(tkn, owner, repo, number);
                        })()
                        : null,
                    n.subject.latest_comment_url !== null
                        ? getComment(tkn, n.subject.latest_comment_url)
                        : null,
                ]);

                if (prResult?.ok) {
                    enrichments.requested_reviewers = prResult.value.requested_reviewers;
                    enrichments.requested_teams = prResult.value.requested_teams;
                }

                if (commentResult?.ok) {
                    enrichments.latest_comment = {
                        body: commentResult.value.body,
                        user: commentResult.value.user,
                        state: commentResult.value.state,
                    };
                }

                return { ...n, ...enrichments };
            })
        );

        return enriched;
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
