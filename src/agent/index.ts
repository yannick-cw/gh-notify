import { Mastra } from "@mastra/core";
import { Agent } from "@mastra/core/agent";
import { AgentStepOptions, createStep, createWorkflow } from "@mastra/core/workflows";
import z from "zod";
import { logger } from "../logger.js";
import { fetchNotifications, notificationsSchema, GitNotification } from "../github/notifications.js";
import { applyFilters } from "../filters/index.js";
import { FilterRule } from "../filters/rules.js";
import { fetchNotificationsTool } from "./tools.js";
import { agentError, AppError, err, ok, Result } from "../errors.js";

const agentOutSchema = z.array(z.object({ id: z.string(), reason: z.string() }))

const instructions = `
    You are triaging GitHub notifications for a software engineer.
    Given a list of notifications, decide which ones warrant further investigation.

    Consider:
    - Direct @mentions are usually important
    - Review requests should be looked at
    - Notifications in repos the user owns are higher priority
    - add your reason, short sentence, why you kept it

    Return output matching this JSON schema:
    ${JSON.stringify(z.toJSONSchema(agentOutSchema), null, 2)}

    Only include notifications worth acting on. Omit the rest.
`;

type NotificationsToHandle = z.infer<typeof agentOutSchema>;

export async function runTriageWorkflow(tkn: string, filters: FilterRule[]): Promise<Result<NotificationsToHandle>> {
    const triageAgent = new Agent({
        id: "confluence-summary-agent",
        name: "Confluence Summary Agent",
        model: "openai/gpt-4o-mini",
        instructions,
    });

    // TODO: output error schema?
    const fetchNotificationsStep = createStep({
        id: "fetch-and-filter-notifications",
        inputSchema: z.object({}),
        outputSchema: notificationsSchema,
        execute: async ({ inputData, requestContext }) => {
            const result = await fetchNotificationsTool(tkn, filters).execute!({}, { requestContext })
            if (result instanceof Error) throw result;
            return result as GitNotification[];
        },
    });

    const agentOpts: AgentStepOptions<{ id: string, reason: string }[]> = { structuredOutput: { schema: agentOutSchema } }

    const agentTriageStep = createStep(triageAgent, agentOpts);

    const testWorkflow = createWorkflow({
        id: "triage-workflow",
        inputSchema: z.object({}),
        outputSchema: agentOutSchema,
    })
        .then(fetchNotificationsStep)
        .map(async (d) => ({ prompt: JSON.stringify(d.inputData) }))
        .then(agentTriageStep)
        .commit();

    const mastra = new Mastra({ agents: { triageAgent }, workflows: { testWorkflow } });
    const wf = mastra.getWorkflow("testWorkflow");


    const run = await wf.createRun()

    const result = await run.start({ inputData: {} });

    if (result.status === "failed") {
        return err(agentError(result.error.message))
    }

    if (result.status !== "success") {
        return err(agentError(result.status))
    }

    return ok(result.result);
}