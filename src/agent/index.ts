import { Mastra } from "@mastra/core";
import { Agent } from "@mastra/core/agent";
import { createStep } from "@mastra/core/workflows";
import z from "zod";
import { logger } from "../logger.js";
import { fetchNotifications, notificationsSchema, GitNotification } from "../github/notifications.js";
import { applyFilters } from "../filters/index.js";
import { FilterRule } from "../filters/rules.js";
import { fetchNotificationsTool } from "./tools.js";

const instructions = `
    You are triaging GitHub notifications for a software engineer.
    Given a list of notifications, decide which ones warrant further investigation.

    Consider:
    - Direct @mentions are usually important
    - Review requests should be looked at
    - Notifications in repos the user owns are higher priority

    Return a JSON array of notification IDs to investigate further, with a brief reason for each.
    MAKE SURE TO ONLY RETURN JSON - nothing wrapped around it.
`;

export function createAgent(tkn: string, filters: FilterRule[]) {
    const agent = new Agent({
        id: "confluence-summary-agent",
        name: "Confluence Summary Agent",
        model: "openai/gpt-4o-mini",
        instructions,
    });
    const step1 = createStep({
        id: "fetch-and-filter-notifications",
        inputSchema: z.object({}),
        outputSchema: notificationsSchema,
        execute: async ({ inputData, requestContext }) => {
            const result = await fetchNotificationsTool(tkn, filters).execute!({}, { requestContext })
            if (result instanceof Error) throw result;
            return result as GitNotification[];
        },
    });


    const mastra = new Mastra({ agents: { agent } });

    return mastra.getAgent("agent");
}


async function main() {
    logger.info("Testing agent")

    const agent = createAgent("", [])

    const res = await agent.generate("Hello?")

    logger.info({ text: res.text }, "Agent Reponse")

}

main().catch(console.error);