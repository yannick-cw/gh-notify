import z from "zod";
import { env } from "../config.js"
import { authError, err, ok, Result } from "../errors.js";
import { logger } from "../logger.js";
import { Hono } from "hono";
import { serve, ServerType } from "@hono/node-server";
import { readTkn, storeTkn } from "./token-store.js";
import { exec } from "node:child_process";

const callBackURL = "http://localhost:3000/callback";

const app = new Hono();
var localState: string;
var closableServer: ServerType;

app.get("/", c => {
    localState = crypto.randomUUID()
    return c.redirect(buildAuthUrl(localState))
})
app.get("/callback", async (c) => {
    const code = c.req.query("code")
    const state = c.req.query("state")
    // if state matches we do exchange now
    if (state == localState && code) {
        const tknResult = await exchangeCodeForToken(code)
        if (tknResult.ok) {
            logger.info("Token exchange successful");
            await storeTkn(tknResult.value)
            setTimeout(() => {
                closableServer.close();
                logger.info("Auth complete, server shut down.");
            }, 500);
            return c.html("<h1>Success!</h1><p>You can close this window.</p>")
        } else {
            logger.error({ error: tknResult.error }, "Token exchange failed");
            return c.html("<h1>Fail!</h1><p>Token exchange failed: " + tknResult.error.message + "</p>");
        }
    } else {
        return c.html("<h1>Fail!</h1><p>Something went wrong</p>")
    }
})

export function startGithubTknServer() {
    closableServer = serve({ fetch: app.fetch, port: 3000 });
    exec("open http://localhost:3000");
    logger.info("Browser opened, waiting for authorization...");
}

function buildAuthUrl(state: string): string {
    const authUrl = new URL(`https://github.com/login/oauth/authorize?${new URLSearchParams({
        client_id: env.GITHUB_CLIENT_ID,
        redirect_uri: callBackURL,
        scope: "notifications repo",
        state
    })}`)
    return authUrl.toString()
}

export type Token = string
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