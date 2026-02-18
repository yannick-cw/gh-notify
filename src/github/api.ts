import z from "zod";
import { apiError, err, ok, Result } from "../errors.js";
import { logger } from "../logger.js";

export async function getGithub<T>(token: string, url: string, schema: z.ZodType<T>): Promise<Result<T>> {
    const headers = {
        "Authorization": `Bearer ${token}`,
        "Accept": "application/json",
    };

    const githubRes = await fetch(url, { headers });

    const remaining = githubRes.headers.get("x-ratelimit-remaining");
    if (remaining && parseInt(remaining) < 100) {
        logger.warn({ remaining: parseInt(remaining), url }, "GitHub rate limit running low");
    }

    if (!githubRes.ok) {
        logger.error({ status: githubRes.status, url: url }, "Failed to fetch from Github");
        return err(apiError(githubRes.statusText));
    }

    const json = await githubRes.json();
    const parsed = schema.safeParse(json);

    if (!parsed.success) {
        const issues = parsed.error.issues.map(i => `${i.path.join(".")}: ${i.message}`);
        logger.error({ issues, body: json }, "Error parsing Github response.");
        return err(apiError(issues.join("; ")));
    }

    return ok(parsed.data);

}