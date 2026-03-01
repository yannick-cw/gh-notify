import z from "zod";
import { Result } from "../errors.js";
import { getGithub } from "./api.js";

export const issueSchema = z.object({
    title: z.string(),
    body: z.string().nullable(),
    html_url: z.string(),
    state: z.string(),
    state_reason: z.string().nullable(),
    created_at: z.string(),
    updated_at: z.string(),
    user: z.object({
        login: z.string(),
    }),
    assignees: z.array(
        z.object({
            login: z.string(),
        }),
    ),
    labels: z.array(
        z.object({
            name: z.string(),
        }),
    ),
    comments: z.number(),
});

export type IssueDetails = z.infer<typeof issueSchema>;

export async function getIssueDetails(
    token: string,
    owner: string,
    repo: string,
    number: number,
): Promise<Result<IssueDetails>> {
    return await getGithub(token, `https://api.github.com/repos/${owner}/${repo}/issues/${number}`, issueSchema);
}
