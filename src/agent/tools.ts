import { createTool } from "@mastra/core/tools";
import z from "zod";
import { fetchNotifications, enrichedNotificationsSchema, EnrichedNotification, GitNotification } from "../github/notifications.js";
import { FilterRule } from "../filters/rules.js";
import { applyFilters } from "../filters/index.js";
import { getPRDetails, getPRReviews, prReviewsSchema, prSchema } from "../github/pull-requests.js";
import { getIssueDetails, issueSchema } from "../github/issues.js";
import { getComment } from "../github/comments.js";
import { getGithub } from "../github/api.js";

const participantSchema = z.array(z.object({ user: z.object({ login: z.string() }) }));

type ReviewRequestEnrichment = Pick<EnrichedNotification, "requested_reviewers" | "requested_teams">;
type ParticipantsEnrichment = Pick<EnrichedNotification, "pr_participants">;
type LatestCommentEnrichment = Pick<EnrichedNotification, "latest_comment">;

async function fetchReviewRequestData(tkn: string, subjectUrl: string): Promise<ReviewRequestEnrichment | null> {
    const result = await getGithub(tkn, subjectUrl, prSchema);
    if (!result.ok) return null;
    return {
        requested_reviewers: result.value.requested_reviewers,
        requested_teams: result.value.requested_teams,
    };
}

async function fetchParticipants(tkn: string, subjectUrl: string): Promise<ParticipantsEnrichment | null> {
    const prResult = await getGithub(tkn, subjectUrl, prSchema);
    if (!prResult.ok) return null;

    const [reviewComments, discussionComments] = await Promise.all([
        getGithub(tkn, prResult.value.review_comments_url, participantSchema),
        getGithub(tkn, prResult.value.comments_url, participantSchema),
    ]);

    const logins = [...new Set([
        ...(reviewComments.ok ? reviewComments.value.map(c => c.user.login) : []),
        ...(discussionComments.ok ? discussionComments.value.map(c => c.user.login) : []),
    ])];

    return { pr_participants: logins.map(login => ({ login })) };
}

async function fetchLatestComment(tkn: string, url: string): Promise<LatestCommentEnrichment | null> {
    const result = await getComment(tkn, url);
    if (!result.ok) return null;
    return {
        latest_comment: {
            body: result.value.body,
            user: result.value.user,
            state: result.value.state,
        },
    };
}

async function enrichNotification(tkn: string, n: GitNotification): Promise<EnrichedNotification> {
    const isPR = n.subject.type === "PullRequest";

    const [reviewRequest, participants, latestComment] = await Promise.all([
        isPR && n.reason === "review_requested" ? fetchReviewRequestData(tkn, n.subject.url) : null,
        isPR && n.reason === "comment" ? fetchParticipants(tkn, n.subject.url) : null,
        n.subject.latest_comment_url ? fetchLatestComment(tkn, n.subject.latest_comment_url) : null,
    ]);

    return { ...n, ...(reviewRequest ?? {}), ...(participants ?? {}), ...(latestComment ?? {}) };
}

export const fetchNotificationsTool = (tkn: string, filters: FilterRule[], since: string) => createTool({
    id: "fetch-github-notifications-tool",
    description: `Fetches all recent notifications from GitHub, filtered by rules.
                    Notifications are pre-enriched:
                    - review_requested on PRs include requested_reviewers and requested_teams
                    - comment on PRs include pr_participants (who commented on the PR)
                    - Notifications with a latest_comment_url include the fetched latest_comment
                    Rules are: ${JSON.stringify(filters)}`,
    inputSchema: z.object({}),
    outputSchema: enrichedNotificationsSchema,
    execute: async () => {
        const result = await fetchNotifications(tkn, since);

        if (!result.ok) {
            return Promise.reject(result.error)
        }

        const filtered = applyFilters(result.value, filters).slice(0, 5);
        return Promise.all(filtered.map(n => enrichNotification(tkn, n)));
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

export const getPRReviewsTool = (tkn: string) => createTool({
    id: "get-github-pr-reviews-tool",
    description: `Fetches reviews submitted on a PR.
                    Returns only new reviews: APPROVED, CHANGES_REQUESTED, COMMENTED, DISMISSED.
                    Use this to understand what changed on a PR you authored or are reviewing.`,
    inputSchema: z.object({
        owner: z.string(),
        repo: z.string(),
        number: z.number().describe("The PR number"),
    }),
    outputSchema: prReviewsSchema,
    execute: async ({ owner, repo, number }) => {
        const result = await getPRReviews(tkn, owner, repo, number);
        if (!result.ok) return Promise.reject(result.error);
        return result.value;
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
