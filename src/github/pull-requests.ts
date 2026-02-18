import z from "zod";
import { Result } from "../errors.js";
import { getGithub } from "./api.js";

const prSchema = z.object({
    title: z.string(),
    body: z.string().nullable(),
    state: z.string(),
    user: z.object({
        login: z.string(),
    }),
    requested_reviewers: z.array(z.object({
        login: z.string(),
    })),
    requested_teams: z.array(z.object({
        name: z.string(),
        slug: z.string(),
    })),
    changed_files: z.number(),
    additions: z.number(),
    deletions: z.number(),
});

export type PRDetails = z.infer<typeof prSchema>;

export async function getPRDetails(token: string, owner: string, repo: string, number: number): Promise<Result<PRDetails>> {
    return await getGithub(token, `https://api.github.com/repos/${owner}/${repo}/pulls/${number}`, prSchema)
}
