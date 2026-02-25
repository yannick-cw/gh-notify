import z from "zod";
import { Result } from "../errors.js";
import { getGithub } from "./api.js";

export const commentSchema = z.object({
    body: z.string().nullable(),
    user: z.object({ login: z.string() }),
    state: z.string().optional(),
    html_url: z.string().optional(),
});

export type CommentDetails = z.infer<typeof commentSchema>;

export async function getComment(token: string, url: string): Promise<Result<CommentDetails>> {
    return await getGithub(token, url, commentSchema);
}
