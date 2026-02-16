import z from "zod";
import { env } from "../config.js"
import { authError, err, ok, Result } from "../errors.js";
import { logger } from "../logger.js";

const callBackURL = "http://localhost:3000/callback";

function buildAuthUrl(state: string): string {
    const authUrl = new URL(`https://github.com/login/oauth/authorize?${new URLSearchParams({
        client_id: env.GITHUB_CLIENT_ID,
        redirect_uri: callBackURL,
        scope: "notifications repo",
        state
    })}`)
    return authUrl.toString()
}

type Token = string
const tknSchema = z.object({ access_token: z.string() })

async function exchangeCodeForToken(code: string): Promise<Result<Token>> {

    const githubRes = await fetch("https://github.com/login/oauth/access_token", {
        method: "POST",
        headers: { "Accept": "application/json", "Content-Type": "application/json", },
        body: JSON.stringify({
            client_id: env.GITHUB_CLIENT_ID,
            client_secret: env.GITHUB_CLIENT_SECRET,
            code,
            redirect_uri: callBackURL
        }),
    })

    if (!githubRes.ok) {
        logger.error({ status: githubRes.status }, "GitHub token exchange HTTP error")
        return err(authError(githubRes.statusText))
    } else {
        const json = await githubRes.json();

        if (json.error) {
            logger.error({ error: json.error, description: json.error_description }, "GitHub token exchange rejected")
            return err(authError(json.error_description ?? json.error))
        } else {
            const data = tknSchema.safeParse(json);
            if (!data.success) {
                logger.error({ err: data.error }, "GitHub token exchange unexpected response")
                return err(authError(data.error.message))
            } else {
                return ok(data.data.access_token)
            }
        }
    }
}