import { Mastra } from "@mastra/core";
import { Agent } from "@mastra/core/agent";
import { AgentStepOptions, createStep, createWorkflow } from "@mastra/core/workflows";
import z from "zod";
import { env, langfuseConf } from "../config.js";
import { agentError, err, ok, Result } from "../errors.js";
import { FilterRule } from "../filters/rules.js";
import { defaultSince, EnrichedNotification, enrichedNotificationsSchema } from "../github/notifications.js";
import { fetchNotificationsTool, getIssueDetailsTool, getPRDetailsTool, getPRReviewsTool } from "./tools.js";
import { formatForSlack, sendSlackMessage } from "../slack/index.js";

const decisionAgentOut = z.array(
    z.object({
        decisions: z.enum(["ignore", "inform", "urgent"]),
        id: z.string().describe("notification id"),
        summary: z.string().describe("Why you took the decision."),
    }),
);

const slackExportIn = z.array(
    decisionAgentOut.element.extend({
        repo: z.string().optional(),
        title: z.string().optional(),
        reason: z.string().optional(),
        url: z.string().optional(),
    }),
);

const decisionAgentInstructions = `
You are an agent deciding which GitHub notifications need attention for yannick-cw.

Each notification has been pre-enriched with context. For each notification:

1. reason is "review_requested":
   - requested_reviewers and requested_teams are already embedded in the notification
   - "yannick-cw" is in requested_reviewers → INFORM (direct request) STATE in summary that yannick-cw's review was requested
   - Only teams listed, not yannick-cw directly → IGNORE

2. reason is "comment" on a PullRequest:
   - pr_participants contains logins of everyone who commented (inline + discussion)
   - "yannick-cw" NOT in pr_participants → IGNORE (team subscription noise, not personally involved)
   - "yannick-cw" in pr_participants → use latest_comment content to decide urgency

3. All other reasons (mention, author, subscribed):
   - latest_comment is already embedded if available - use it to make the decision
   - If latest_comment is missing, call getPRDetailsTool or getIssueDetailsTool as fallback
   - For PullRequest notifications where reason is "author": call getPRReviewsTool to see what changed (new reviews, approvals, change requests)
   - all new input on PRs since the notifications since given in prompt are new
   - when reason is author, never ignore, at most INFORM
   - CHANGES_REQUESTED → URGENT (action required on your PR)
   - COMMENTED with new comments → URGENT
   - APPROVED → INFORM
   - URGENT if someone is waiting for your input, asking you a question, or your review is blocking progress
   - INFORM if it is a relevant update worth knowing about
   - if a notification has already been read, this has no significance for the decision, as it can be because of an email sent or so

Return output matching the schema.
`;

type Decisions = z.infer<typeof decisionAgentOut>;

export async function runNotificationWorkflow(
    tkn: string,
    filters: FilterRule[],
    slackHook: string,
): Promise<Result<Decisions>> {
    const decisionAgent = new Agent({
        id: "decision-agent",
        name: "decision-agent",
        model: "anthropic/claude-sonnet-4-6",
        instructions: decisionAgentInstructions,
        tools: {
            getPRTool: getPRDetailsTool(tkn),
            getIssueDetailsTool: getIssueDetailsTool(tkn),
            getPRReviewsTool: getPRReviewsTool(tkn),
        },
    });

    const fetchNotificationsStep = createStep({
        id: "fetch-and-filter-notifications",
        inputSchema: z.object({}),
        outputSchema: enrichedNotificationsSchema,
        execute: async ({ inputData, requestContext }) => {
            const result = await fetchNotificationsTool(tkn, filters, defaultSince).execute!({}, { requestContext });
            if (result instanceof Error) throw result;
            return result as EnrichedNotification[];
        },
    });

    type EnrichedResults = z.infer<typeof slackExportIn>;
    const exportToSlack = createStep({
        id: "send-notifiactions-to-slack",
        inputSchema: slackExportIn,
        outputSchema: decisionAgentOut,
        execute: async ({ inputData }) => {
            // TODO new method in slack/index.ts
            // it formats all info very nicely, top has urgent, then inform, then ignore sections
            const formattedSlackResult = formatForSlack(inputData);
            const slackRes = await sendSlackMessage(slackHook, formattedSlackResult);
            if (!slackRes.ok) {
                throw Error("Sending to slack failed.");
            }
            return inputData;
        },
    });

    const decisionOpts: AgentStepOptions<Decisions> = { structuredOutput: { schema: decisionAgentOut } };
    const agentDecisionStep = createStep(decisionAgent, decisionOpts);

    const triageWorkflow = createWorkflow({
        id: "triage-workflow",
        inputSchema: z.object({}),
        outputSchema: decisionAgentOut,
    })
        .then(fetchNotificationsStep)
        .map(async (d) => ({ prompt: `notifications since ${defaultSince}: ${JSON.stringify(d.inputData)}` }))
        .then(agentDecisionStep)
        .map(async (d) => {
            const notificationStepRes = d.getStepResult<EnrichedNotification[] | undefined>(fetchNotificationsStep.id);

            if (notificationStepRes) {
                const inputData: EnrichedResults = d.inputData.map((decision) => {
                    const matchingEnrichedData = notificationStepRes.find((res) => res.id === decision.id);

                    return {
                        ...decision,
                        repo: matchingEnrichedData?.repository.full_name,
                        title: matchingEnrichedData?.subject.title,
                        reason: matchingEnrichedData?.reason,
                        url: matchingEnrichedData?.subject.url
                            .replace("api.github.com/repos", "github.com")
                            .replace("/pulls/", "/pull/"),
                    };
                });
                return inputData;
            }
            return d.inputData;
        })
        .then(exportToSlack)
        .commit();

    const mastra = new Mastra({
        agents: { decisionAgent },
        workflows: { triageWorkflow },
        ...(env.LANGFUSE_PUBLIC_KEY && env.LANGFUSE_SECRET_KEY ? langfuseConf : {}),
    });

    const wf = mastra.getWorkflow("triageWorkflow");
    const run = await wf.createRun();
    const result = await run.start({ inputData: {} });

    if (result.status === "failed") {
        return err(agentError(result.error.message));
    }

    if (result.status !== "success") {
        return err(agentError(result.status));
    }

    return ok(result.result);
}
