import { Mastra } from "@mastra/core";
import { Agent } from "@mastra/core/agent";
import { AgentStepOptions, createStep, createWorkflow } from "@mastra/core/workflows";
import z from "zod";
import { env, langfuseConf } from "../config.js";
import { agentError, err, ok, Result } from "../errors.js";
import { FilterRule } from "../filters/rules.js";
import { GitNotification, notificationsSchema } from "../github/notifications.js";
import { fetchNotificationsTool, getIssueDetailsTool, getPRDetailsTool } from "./tools.js";

const triageAgentOut = z.array(z.object({ id: z.string(), reason: z.string() }))
const decisionAgentOut = z.array(z.object({
    decisions: z.enum(["ignore", "inform", "urgent"]),
    id: z.string().describe("notification id"), summary: z.string().describe("Why you took the decision.")
}))

const triageAgentInstructions = `
    You are triaging GitHub notifications for a software engineer.
    Given a list of notifications, decide which ones warrant further investigation.
    The user is yannick-cw in Github.
    IGNORE if the notification was read before, treat all as unread. It might be read due to notifications shared via email.

    Consider:
    - Direct @mentions are usually important
    - Review requests should be looked at
    - Notifications in repos the user owns are higher priority
    - add your reason, short sentence, why you kept it

    Return output matching the schema.
`;

const decisionAgentInstructions = `
You are an agent deciding which GitHub notifications are important for a software engineer right now.
You receive a list of notifications (notifications and reason why they are kept).
You MUST resolve more information for the notifications by fetching either the issue or the PR request.
The user is not interested in notifications that request review from a team he is in, but if review is
directly request. Notifications that indicate a new comment on a review the user is part of (a reply to the users comment for example) are
especially important.
The user is yannick-cw in Github.
Decide how important this is:

- IGNORE: Not actionable, just FYI
- INFORM: Worth knowing about, but not urgent
- URGENT: Needs attention soon

Consider: Is the user being asked a question? Is a review blocking someone? Is there a deadline?

Return output matching the schema.
`

type NotificationsToHandle = z.infer<typeof triageAgentOut>;
type Decisions = z.infer<typeof decisionAgentOut>;

export async function runTriageWorkflow(tkn: string, filters: FilterRule[]): Promise<Result<Decisions>> {
    const triageAgent = new Agent({
        id: "triage-agent",
        name: "triage-agent",
        model: "openai/gpt-5-mini",
        instructions: triageAgentInstructions,
    });

    const decisionAgent = new Agent({
        id: "decision-agent",
        name: "decision-agent",
        model: "openai/gpt-5-mini",
        instructions: decisionAgentInstructions,
        tools: { getPRTool: getPRDetailsTool(tkn), getIssueDetailsTool: getIssueDetailsTool(tkn) }
    });


    // TODO: output error schema?
    const fetchNotificationsStep = createStep({
        id: "fetch-and-filter-notifications",
        inputSchema: z.object({}),
        outputSchema: notificationsSchema,
        execute: async ({ inputData, requestContext }) => {
            const result = await fetchNotificationsTool(tkn, filters).execute!({}, { requestContext })
            if (result instanceof Error) throw result;

            // why: safety measure for now - only take top 10
            return (result as GitNotification[]).slice(0, 10);
        },
    });

    const triageOpts: AgentStepOptions<NotificationsToHandle> = { structuredOutput: { schema: triageAgentOut } }
    const decisionOpts: AgentStepOptions<Decisions> = { structuredOutput: { schema: decisionAgentOut } }

    const agentTriageStep = createStep(triageAgent, triageOpts);
    const agentDecisionStep = createStep(decisionAgent, decisionOpts);

    const testWorkflow = createWorkflow({
        id: "triage-workflow",
        inputSchema: z.object({}),
        outputSchema: decisionAgentOut,
    })
        .then(fetchNotificationsStep)
        .map(async (d) => ({ prompt: JSON.stringify(d.inputData) }))
        .then(agentTriageStep)
        .map(async (d) => {
            const gitNotifications = d.getStepResult<GitNotification[] | undefined>("fetch-and-filter-notifications")
            if (gitNotifications === undefined) {
                throw Error("Failed to get notifiactions from step 1")
            }
            const enrichedNotifications = d.inputData.map(({ id, reason }) => {
                const originalN = gitNotifications.find(n => n.id === id)
                return { id, reason, ...originalN }
            })

            return { prompt: JSON.stringify(enrichedNotifications) }
        })
        .then(agentDecisionStep)
        .commit();

    const mastra = new Mastra({
        agents: { triageAgent, decisionAgent },
        workflows: { testWorkflow },
        ...(env.LANGFUSE_PUBLIC_KEY && env.LANGFUSE_SECRET_KEY ? langfuseConf : {}),
    });
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