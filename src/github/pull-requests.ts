import z from "zod";
import { Result } from "../errors.js";
import { getGithub } from "./api.js";

export const prSchema = z.object({
    title: z.string(),
    body: z.string().nullable(),
    html_url: z.string(),
    state: z.string(),
    draft: z.boolean(),
    merged: z.boolean(),
    created_at: z.string(),
    updated_at: z.string(),
    user: z.object({
        login: z.string(),
    }),
    head: z.object({
        ref: z.string(),
    }),
    base: z.object({
        ref: z.string(),
    }),
    requested_reviewers: z.array(
        z.object({
            login: z.string(),
        }),
    ),
    assignees: z.array(
        z.object({
            login: z.string(),
        }),
    ),
    requested_teams: z.array(
        z.object({
            name: z.string(),
            slug: z.string(),
        }),
    ),
    comments_url: z.string(),
    review_comments_url: z.string(),
    // changed_files: z.number(),
    // additions: z.number(),
    // deletions: z.number(),
});

export type PRDetails = z.infer<typeof prSchema>;

export async function getPRDetails(
    token: string,
    owner: string,
    repo: string,
    number: number,
): Promise<Result<PRDetails>> {
    return await getGithub(token, `https://api.github.com/repos/${owner}/${repo}/pulls/${number}`, prSchema);
}

export const prReviewSchema = z.object({
    id: z.number(),
    user: z.object({ login: z.string() }),
    state: z.enum(["APPROVED", "CHANGES_REQUESTED", "COMMENTED", "DISMISSED", "PENDING"]),
    submitted_at: z.string().nullable(),
    body: z.string(),
});

export const prReviewsSchema = z.array(prReviewSchema);
export type PRReview = z.infer<typeof prReviewSchema>;

export async function getPRReviews(
    token: string,
    owner: string,
    repo: string,
    number: number,
): Promise<Result<PRReview[]>> {
    return await getGithub(
        token,
        `https://api.github.com/repos/${owner}/${repo}/pulls/${number}/reviews`,
        prReviewsSchema,
    );
}
