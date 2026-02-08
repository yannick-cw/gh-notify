# GitHub Notification Agent Curriculum

> **Goal:** Build an agent that triages GitHub notifications and sends relevant ones to Slack
> **Approach:** One continuous project, incremental exercises building production TypeScript skills
> **End State:** Agent runs, fetches your GitHub notifications, filters out team-mention noise, uses LLM to decide what matters, posts to Slack

---

## Progress Overview

| Phase | Topic | Sessions | Status |
|-------|-------|----------|--------|
| 0 | TypeScript Foundation | 2-3 | |
| 1 | GitHub OAuth2 Flow | 2-3 | |
| 2 | GitHub API Client | 1-2 | |
| 3 | Notification Filtering | 1-2 | |
| 4 | Mastra Agent Workflow | 2-3 | |
| 5 | Slack Output | 1 | |
| 6 | Polish & Scheduling | 1-2 | |

**Total:** ~12-15 sessions (1 hour each)

---

## Learning Goals

**What's NEW (primary focus):**

**Security (OAuth2) - Biggest gap to close:**
- OAuth2 authorization code flow (the most common flow)
- How it differs from API keys, PATs, client credentials, implicit flow
- State parameter and CSRF protection
- Code-to-token exchange (back-channel security)
- Token storage patterns (encryption, keychain, secret managers)
- Scopes and least-privilege

**TypeScript (Production Patterns):**
- Configuration management with Zod validation
- Typed error handling (Result pattern)
- Structured logging with pino
- Modern project setup (ESM, strict tsconfig)

**Agentic (Building on Confluence Agent):**
- Multi-step workflows (NEW - not just single agent.generate)
- State passing between workflow steps
- Conditional tool calls based on agent reasoning
- Structured JSON output for decisions

**What you already know (won't repeat in depth):**
- Mastra agent basics, tool creation, instructions (from Confluence Agent)
- Zod schemas for validation
- General TypeScript patterns

---

## The End-to-End Flow

Before diving into phases, understand what we're building:

```
┌─────────────────────────────────────────────────────────────────────────┐
│  npm run agent                                                          │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ 1. Fetch GitHub notifications (using your OAuth token)                  │
│    Tool: fetchNotifications()                                           │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ 2. TRIAGE (Agent Step 1)                                                │
│    Agent reasons: "Which of these are worth analyzing further?"         │
│    Filters: direct mentions yes, team mentions no, review requests yes  │
│    Output: Shortlist of candidates                                      │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ 3. CONTEXTUALIZE (Agent Step 2)                                         │
│    Tool: getPRDetails(), getIssueContext()                              │
│    Agent reasons: "What's actually being asked? Should I act on this?"  │
│    Output: For each candidate: ignore / inform / urgent                 │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ 4. SUMMARIZE & DELIVER (Agent Step 3)                                   │
│    Agent reasons: "Compose a useful Slack message, group by urgency"    │
│    Tool: sendSlackMessage()                                             │
└─────────────────────────────────────────────────────────────────────────┘
```

**Why this needs agent reasoning (not just code):**

| Step | Why not just code? |
|------|-------------------|
| Triage | "Team mention that's actually relevant to me" requires judgment |
| Contextualize | "This PR needs senior input" can't be a regex |
| Summarize | Composing a useful, grouped Slack message is language work |

---

## Phase 0 - TypeScript Foundation

### Goal
Set up a production-grade TypeScript project with proper configuration, error handling, and logging.

### Concepts
- Modern TypeScript project setup (ESM modules, strict mode)
- Configuration management with Zod validation
- Typed error handling (Result pattern or custom errors)
- Structured logging (not console.log)
- Project structure conventions

### Exercise 0.1: Create Project

Create a new project called `gh-notify`:

```bash
mkdir gh-notify && cd gh-notify
npm init -y
```

Install core dependencies:
- `typescript` (language)
- `tsx` (runner for development)
- `zod` (schema validation)
- `pino` (structured logging)
- `dotenv` (environment variables)

Configure `tsconfig.json` with:
- `"module": "NodeNext"` (ESM)
- `"strict": true`
- `"outDir": "dist"`
- `"rootDir": "src"`

Create the folder structure:
```
gh-notify/
├── src/
│   ├── index.ts
│   ├── config.ts
│   ├── logger.ts
│   └── errors.ts
├── tests/
├── .env.example
├── .gitignore
├── package.json
└── tsconfig.json
```

> Stuck? See [Solution 0.1](#solution-01-create-project) at the bottom.

### Exercise 0.2: Configuration with Validation

Create `src/config.ts` that:
1. Loads environment variables from `.env`
2. Defines a Zod schema for required config (GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, etc.)
3. Validates and exports a typed config object
4. Fails fast with clear error messages if config is invalid

Test by running with missing env vars - you should see helpful errors.

> Stuck? See [Solution 0.2](#solution-02-configuration-with-validation) at the bottom.

### Exercise 0.3: Structured Logging

Create `src/logger.ts` that:
1. Uses pino for structured JSON logging
2. Includes timestamp and level
3. Has a development mode with pretty printing
4. Exports a configured logger instance

Replace any `console.log` in your code with the logger.

> Stuck? See [Solution 0.3](#solution-03-structured-logging) at the bottom.

### Exercise 0.4: Error Handling Pattern

Create `src/errors.ts` with:
1. A base `AppError` class with code, message, and optional cause
2. Specific error types: `ConfigError`, `AuthError`, `ApiError`
3. A `Result<T, E>` type (or use a library like `neverthrow`)

This establishes how errors flow through your application.

> Stuck? See [Solution 0.4](#solution-04-error-handling-pattern) at the bottom.

### Exercise 0.5: Verify Setup

Create `src/index.ts` that:
1. Loads config
2. Logs startup with config values (not secrets!)
3. Demonstrates error handling

Run with `npm run dev` and verify:
- Config loads correctly
- Logger outputs structured JSON
- Missing config shows helpful errors

### Key Takeaway
Production TypeScript needs: validated config, structured logging, and typed errors. These patterns prevent debugging nightmares later.

### Interview Relevance
- "How do you handle configuration in Node.js applications?"
- "What's the benefit of structured logging?"
- "How do you handle errors in TypeScript?"

---

## Phase 1 - GitHub OAuth2 Flow

### Goal
Implement the OAuth2 authorization code flow to get a GitHub access token.

### Concepts
- OAuth2 authorization code flow (the standard for user-authorized apps)
- GitHub OAuth app registration
- Authorization URL construction
- Token exchange (code -> access token)
- Secure token storage
- Token refresh (GitHub doesn't use refresh tokens, but you'll learn the pattern)

### Background: Authentication Patterns Compared

Before implementing, understand WHERE this pattern fits in the authentication landscape:

| Pattern | How it works | When to use | Security |
|---------|-------------|-------------|----------|
| **API Key** | Static secret in header | Server-to-server, your own services | Low (if leaked, full access forever) |
| **Personal Access Token (PAT)** | GitHub-specific API key | Scripts, CI/CD, personal automation | Medium (scoped, but static) |
| **OAuth2 Client Credentials** | App authenticates as itself (no user) | Backend services accessing APIs | High for service accounts |
| **OAuth2 Authorization Code** | User grants app permission via browser | Apps acting on behalf of users | High (user consent, revocable) |
| **OAuth2 Implicit** | Token returned directly in URL | Legacy SPAs (deprecated) | Low (token exposed in URL) |
| **OAuth2 + PKCE** | Authorization Code + proof key | Mobile apps, SPAs (modern) | High (prevents code interception) |

**We're using Authorization Code flow because:**
1. The agent acts on YOUR behalf (reading YOUR notifications)
2. You explicitly consent to which permissions (scopes) the app gets
3. Tokens can be revoked without changing credentials
4. It's what production apps use ("Login with GitHub/Google/etc.")

**What the Atlassian MCP does under the hood:**
When you auth the Atlassian MCP, it runs this same flow - redirect to Atlassian, you consent, callback with code, exchange for token. The MCP stores the token and refreshes it. Now you'll understand exactly what it's doing.

**Key insight:** API keys are "the app has access." OAuth2 is "the user granted the app access." The difference matters for auditing, revocation, and security.

### Exercise 1.1: Register GitHub OAuth App

1. Go to GitHub Settings > Developer Settings > OAuth Apps
2. Create a new OAuth App:
   - Application name: `gh-notify-dev`
   - Homepage URL: `http://localhost:3000`
   - Authorization callback URL: `http://localhost:3000/callback`
3. Note your Client ID and generate a Client Secret
4. Add to your `.env`:
   ```
   GITHUB_CLIENT_ID=your_client_id
   GITHUB_CLIENT_SECRET=your_client_secret
   ```
5. Update your config schema to include these

### Exercise 1.2: Build Authorization URL

Create `src/auth/github.ts` with a function that:
1. Constructs the GitHub authorization URL
2. Includes required parameters: client_id, redirect_uri, scope, state
3. Scopes needed: `notifications`, `repo` (to read PR details)
4. State should be a random string (CSRF protection)

```typescript
function buildAuthUrl(state: string): string {
  // Construct: https://github.com/login/oauth/authorize?...
}
```

> Stuck? See [Solution 1.2](#solution-12-build-authorization-url) at the bottom.

### Exercise 1.3: Local Callback Server

Create a minimal HTTP server that:
1. Serves a page at `/` that redirects to the GitHub auth URL
2. Handles the callback at `/callback`
3. Extracts the `code` and `state` from query params
4. Validates state matches what you sent

Use Node's built-in `http` module or a minimal framework.

**Why the `state` parameter matters (CSRF Protection):**

Without state validation, an attacker could:
1. Start an OAuth flow on their machine
2. Get their callback URL with code
3. Trick you into visiting that URL
4. Your app would exchange THEIR code, linking THEIR account

The `state` parameter is a random value you generate and store before redirect. When the callback comes, you verify it matches. An attacker can't guess your state.

> Stuck? See [Solution 1.3](#solution-13-local-callback-server) at the bottom.

### Exercise 1.4: Token Exchange

After receiving the code, exchange it for an access token:
1. POST to `https://github.com/login/oauth/access_token`
2. Include: client_id, client_secret, code, redirect_uri
3. Parse the response to get access_token
4. Handle errors (invalid code, expired code, etc.)

**Why exchange a code instead of getting the token directly?**

The code is short-lived (10 minutes) and only usable once. It travels through the browser (URL). If someone intercepts it, they still need your client_secret to exchange it. The token never touches the browser.

This is called the "back-channel" exchange - server to server, not through the user's browser.

**GitHub-specific:** GitHub doesn't issue refresh tokens by default. The access token is long-lived but can be revoked. Other OAuth providers (Google, Atlassian) issue short-lived access tokens + refresh tokens.

> Stuck? See [Solution 1.4](#solution-14-token-exchange) at the bottom.

### Exercise 1.5: Secure Token Storage

Store the token securely:
1. Create `src/auth/token-store.ts`
2. For this learning project: encrypt and store in a local JSON file
3. Use Node's `crypto` module for encryption (AES-256-GCM)
4. The encryption key comes from an env var

Production alternatives (for awareness):
- macOS Keychain via `keytar`
- Environment variables (simple but less secure)
- Secret managers (AWS Secrets Manager, etc.)

> Stuck? See [Solution 1.5](#solution-15-secure-token-storage) at the bottom.

### Exercise 1.6: CLI Auth Command

Create a CLI command that orchestrates the flow:
```bash
npm run auth
```

This should:
1. Start the local server
2. Open the browser to the auth URL
3. Wait for the callback
4. Exchange code for token
5. Store token
6. Shut down server and confirm success

> Stuck? See [Solution 1.6](#solution-16-cli-auth-command) at the bottom.

### Exercise 1.7: Verify Token Works

Make a test API call to verify your token:
1. Call `https://api.github.com/user`
2. Include header: `Authorization: Bearer YOUR_TOKEN`
3. Log the response (your GitHub username)

If this works, your OAuth flow is complete!

### Key Takeaway
OAuth2 authorization code flow: redirect user -> user consents -> receive code -> exchange for token -> store securely. This is the foundation for any "Login with X" feature.

### The Full Picture

```
┌──────────────────────────────────────────────────────────────────────────┐
│ YOUR APP                          GITHUB                    USER        │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  1. Generate state ────────────────────────────────────────────────────► │
│  2. Redirect to GitHub auth URL ───────────────────────────────────────► │
│                                   3. Show consent screen ──────────────► │
│                                   4. User clicks "Authorize" ◄────────── │
│  5. Receive callback with code ◄──────────────────────────────────────── │
│  6. Verify state matches                                                 │
│  7. Exchange code for token ──────►                                      │
│  8. Receive access_token ◄────────                                       │
│  9. Store token securely                                                 │
│ 10. Make API calls with token ────►                                      │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

**Security at each step:**
- Steps 1-2: State prevents CSRF
- Steps 5-6: State validation
- Step 7: Back-channel (server-to-server), client_secret never in browser
- Step 8: Token delivered securely
- Step 9: Encrypted at rest

### Interview Relevance
- "Explain the OAuth2 authorization code flow"
- "Why use OAuth2 instead of API keys?"
- "How do you securely store tokens?"
- "What is CSRF protection in OAuth?"
- "What's the difference between the code and the token?"
- "Why does the code go through the browser but the token doesn't?"

---

## Phase 2 - GitHub API Client

### Goal
Build a type-safe client for the GitHub APIs you need.

### Concepts
- Type-safe API wrappers
- Response typing with Zod
- Rate limit handling
- Pagination
- Error mapping to domain errors

### Exercise 2.1: Notifications API

Create `src/github/notifications.ts`:
1. Define types for GitHub notification response
2. Implement `fetchNotifications(token: string): Promise<Notification[]>`
3. Handle pagination (notifications can span multiple pages)
4. Map GitHub errors to your `ApiError` type

GitHub Notifications API: `GET /notifications`

> Stuck? See [Solution 2.1](#solution-21-notifications-api) at the bottom.

### Exercise 2.2: PR Details API

Create `src/github/pull-requests.ts`:
1. Implement `getPRDetails(token: string, owner: string, repo: string, number: number)`
2. Return: title, body, author, state, review status, files changed
3. This is called during the "Contextualize" step

> Stuck? See [Solution 2.2](#solution-22-pr-details-api) at the bottom.

### Exercise 2.3: Issue Details API

Create `src/github/issues.ts`:
1. Implement `getIssueDetails(token: string, owner: string, repo: string, number: number)`
2. Return: title, body, author, labels, comments count

> Stuck? See [Solution 2.3](#solution-23-issue-details-api) at the bottom.

### Exercise 2.4: Rate Limit Awareness

GitHub has rate limits (5000 requests/hour for authenticated users).
1. Read the `X-RateLimit-Remaining` header from responses
2. Log a warning when below 100 remaining
3. Optionally: implement backoff when rate limited

> Stuck? See [Solution 2.4](#solution-24-rate-limit-awareness) at the bottom.

### Exercise 2.5: Integration Test

Write a test that:
1. Uses your real token (from storage)
2. Fetches your actual notifications
3. Logs what it found

This verifies everything works end-to-end.

### Key Takeaway
API clients should: validate responses, handle errors gracefully, respect rate limits, and be well-typed.

### Interview Relevance
- "How do you handle API rate limits?"
- "How do you type external API responses?"
- "What's the benefit of mapping external errors to domain errors?"

---

## Phase 3 - Notification Filtering

### Goal
Implement configurable filtering rules to separate signal from noise.

### Concepts
- Business rule extraction
- Configuration-driven behavior
- GitHub notification types and reasons
- The difference between team mention and direct mention

### Understanding GitHub Notifications

GitHub notifications have:
- `reason`: why you received it (mention, team_mention, review_requested, etc.)
- `subject.type`: what it's about (PullRequest, Issue, etc.)
- `repository`: which repo

Key reasons:
- `mention` - You were @mentioned directly
- `team_mention` - A team you're on was @mentioned (THIS IS THE NOISE)
- `review_requested` - Someone requested your review
- `author` - You created the thread
- `subscribed` - You're watching the repo

### Exercise 3.1: Define Filter Rules

Create `src/filters/rules.ts`:
1. Define a `FilterRule` type
2. Create a configuration schema for rules
3. Default rules:
   - INCLUDE: `reason === 'mention'`
   - INCLUDE: `reason === 'review_requested'`
   - EXCLUDE: `reason === 'team_mention'`

> Stuck? See [Solution 3.1](#solution-31-define-filter-rules) at the bottom.

### Exercise 3.2: Apply Filters

Create `src/filters/index.ts`:
1. Implement `applyFilters(notifications: Notification[], rules: FilterRule[]): Notification[]`
2. Rules can be include or exclude
3. Exclude rules take precedence

> Stuck? See [Solution 3.2](#solution-32-apply-filters) at the bottom.

### Exercise 3.3: Make Rules Configurable

Allow rules to be specified in a config file:
1. Create `config/filter-rules.json`
2. Load rules at startup
3. Allow overriding default rules

This makes the agent tweakable without code changes.

> Stuck? See [Solution 3.3](#solution-33-make-rules-configurable) at the bottom.

### Exercise 3.4: Test with Real Data

Run against your actual notifications:
1. Fetch all notifications
2. Apply filters
3. Log: total count, filtered count, reasons for each

Verify: team mentions are filtered out, direct mentions remain.

### Key Takeaway
Filtering is where you codify "what matters to me." Make it configurable so you can tune it over time.

---

## Phase 4 - Mastra Agent Workflow

### Goal
Build a multi-step Mastra workflow where each step requires LLM reasoning.

### Prerequisites
You already know from Confluence Agent:
- How to create a Mastra agent with tools
- Tool calling basics (inputSchema, outputSchema, execute)
- Agent instructions

**What's NEW in this phase:**
- **Workflows** (not just single agent.generate calls)
- **Multi-step orchestration** with state passing between steps
- **Conditional tool calls** (agent decides which tool based on notification type)
- **Structured decision output** (not prose, but JSON decisions)

### Exercise 4.1: Set Up Agent (Quick)

You know this. Just get the basics working:
- Add `@mastra/core`
- Create agent with your LLM
- Verify it responds

No need for detailed instructions - reference Confluence Agent if stuck.

### Exercise 4.2: Create GitHub Tools

Create tools that wrap your GitHub client:
1. `fetchNotificationsTool` - fetches and applies initial filters
2. `getPRDetailsTool` - gets PR context for a notification
3. `getIssueDetailsTool` - gets issue context

**New pattern here:** These tools take dynamic parameters from previous agent reasoning. The agent decides WHICH notification to get details for.

> Stuck? See [Solution 4.2](#solution-42-create-github-tools) at the bottom.

### Exercise 4.3: Step 1 - Triage

The first agent step receives filtered notifications and decides which deserve deeper analysis.

Agent instructions:
```
You are triaging GitHub notifications for a senior engineer.
Given a list of notifications, decide which ones warrant further investigation.

Consider:
- Direct @mentions are usually important
- Review requests should be looked at
- Notifications in repos the user owns are higher priority

Return a JSON array of notification IDs to investigate further, with a brief reason for each.
```

Implement this step. The agent should:
1. Receive the filtered notification list
2. Reason about each one
3. Output: `[{ id: string, reason: string }]`

> Stuck? See [Solution 4.3](#solution-43-step-1-triage) at the bottom.

### Exercise 4.4: Step 2 - Contextualize

For each triaged notification, get context and make a judgment.

The agent:
1. Calls `getPRDetailsTool` or `getIssueDetailsTool`
2. Reads the context
3. Decides: `ignore`, `inform`, or `urgent`

Agent instructions:
```
You have additional context for a GitHub notification.
Decide how important this is:

- IGNORE: Not actionable, just FYI
- INFORM: Worth knowing about, but not urgent
- URGENT: Needs attention soon

Consider: Is the user being asked a question? Is a review blocking someone? Is there a deadline?

Return: { decision: "ignore" | "inform" | "urgent", summary: string }
```

> Stuck? See [Solution 4.4](#solution-44-step-2-contextualize) at the bottom.

### Exercise 4.5: Step 3 - Summarize

Compose the final Slack message.

The agent:
1. Receives all contextualized notifications
2. Groups by urgency
3. Writes a concise, useful Slack message

Agent instructions:
```
You are composing a Slack notification for a developer.
Group items by urgency. Be concise. Include links.

Format:
🔴 URGENT
- [PR Title](link) - summary

🟡 INFORM
- [Issue Title](link) - summary

Keep it scannable. No fluff.
```

> Stuck? See [Solution 4.5](#solution-45-step-3-summarize) at the bottom.

### Exercise 4.6: Wire Up the Workflow

Connect all three steps into a Mastra workflow:
1. Triage -> Contextualize -> Summarize
2. Pass state between steps
3. Handle errors at each step (don't fail the whole run if one notification errors)

> Stuck? See [Solution 4.6](#solution-46-wire-up-the-workflow) at the bottom.

### Exercise 4.7: Test End-to-End

Run the full workflow with your real notifications:
```bash
npm run agent
```

Observe:
- Which notifications made it through triage?
- What decisions did contextualize make?
- Is the final message useful?

Iterate on prompts based on results.

### Key Takeaway
Agent workflows shine when each step requires judgment. Tools fetch data; agents reason about it.

### Interview Relevance
- "How do you design agent workflows?"
- "What should be a tool vs agent logic?"
- "How do you test LLM-based systems?"

---

## Phase 5 - Slack Output

### Goal
Send the composed message to Slack.

### Concepts
- Slack Incoming Webhooks (simplest Slack integration)
- Message formatting for Slack
- Error handling for external services

### Exercise 5.1: Create Slack Webhook

1. Go to https://api.slack.com/apps
2. Create a new app (or use an existing workspace)
3. Add "Incoming Webhooks" feature
4. Create a webhook for a channel (e.g., #notifications)
5. Add webhook URL to your config

### Exercise 5.2: Create Slack Tool

Create `src/slack/index.ts`:
1. Implement `sendSlackMessage(webhookUrl: string, message: string)`
2. Handle errors (webhook invalid, Slack down, etc.)
3. Support basic formatting (bold, links, emoji)

> Stuck? See [Solution 5.2](#solution-52-create-slack-tool) at the bottom.

### Exercise 5.3: Integrate with Workflow

Update Step 3 (Summarize) to call the Slack tool at the end.

Add a `sendSlackTool` to the agent's tool set.

### Exercise 5.4: Test Full Flow

Run the agent and verify:
1. Message appears in Slack
2. Formatting looks good
3. Links work

### Key Takeaway
Slack webhooks are the simplest way to send notifications. More complex integrations (buttons, interactivity) require a full Slack app.

---

## Phase 6 - Polish & Scheduling

### Goal
Make the agent production-ready with scheduling, observability, and testing.

### Concepts
- Scheduled execution (cron)
- Observability (what happened in each run)
- Testing strategies for agents
- Graceful error handling

### Exercise 6.1: Add Scheduling

Options:
1. Node cron (`node-cron` package)
2. OS cron (crontab)
3. GitHub Actions scheduled workflow

Implement option 1 for local development:
```typescript
// Run every 2 hours
cron.schedule('0 */2 * * *', async () => {
  await runAgent();
});
```

> Stuck? See [Solution 6.1](#solution-61-add-scheduling) at the bottom.

### Exercise 6.2: Run History

Create `src/history.ts`:
1. After each run, log: timestamp, notifications processed, decisions made, errors
2. Store in a local JSON file (or SQLite for bonus points)
3. Add a CLI command to view recent runs: `npm run history`

### Exercise 6.3: Dry Run Mode

Add a `--dry-run` flag that:
1. Runs the full workflow
2. Logs what WOULD be sent to Slack
3. Doesn't actually send

Useful for testing prompt changes.

### Exercise 6.4: Unit Tests

Write tests for:
1. Config validation (various invalid configs)
2. Filter rules (various notification scenarios)
3. Token storage (encrypt/decrypt roundtrip)

These don't require the LLM.

### Exercise 6.5: Integration Test

Write a test that:
1. Uses a mock LLM (or records/replays responses)
2. Runs the full workflow with fixture data
3. Verifies the output message format

### Key Takeaway
Production agents need: scheduling, observability, dry-run mode, and tests at multiple levels.

---

## Final Outcome

```bash
# One-time auth
npm run auth

# Run once
npm run agent

# Run with dry-run
npm run agent -- --dry-run

# View history
npm run history

# Run scheduled (stays running)
npm run scheduled
```

After completing this curriculum:

- Build production TypeScript projects with proper configuration and error handling
- Implement OAuth2 authorization code flow
- Design type-safe API clients
- Create Mastra agent workflows where each step requires reasoning
- Integrate with external services (GitHub, Slack)
- Test and observe agent behavior

---

## Project Structure

```
gh-notify/
├── src/
│   ├── index.ts              # CLI entry point
│   ├── config.ts             # Configuration with validation
│   ├── logger.ts             # Structured logging
│   ├── errors.ts             # Error types
│   ├── auth/
│   │   ├── github.ts         # OAuth flow
│   │   └── token-store.ts    # Secure token storage
│   ├── github/
│   │   ├── notifications.ts  # Notifications API
│   │   ├── pull-requests.ts  # PR API
│   │   └── issues.ts         # Issues API
│   ├── filters/
│   │   ├── rules.ts          # Filter rule types
│   │   └── index.ts          # Apply filters
│   ├── agent/
│   │   ├── index.ts          # Mastra agent setup
│   │   ├── tools.ts          # GitHub and Slack tools
│   │   └── workflow.ts       # 3-step workflow
│   ├── slack/
│   │   └── index.ts          # Slack webhook
│   └── history.ts            # Run history
├── config/
│   └── filter-rules.json     # Configurable filter rules
├── tests/
│   ├── config.test.ts
│   ├── filters.test.ts
│   └── workflow.test.ts
├── .env.example
├── .gitignore
├── package.json
└── tsconfig.json
```

---

## Solutions

### Solution 0.1: Create Project

```bash
mkdir gh-notify && cd gh-notify
npm init -y
npm install typescript tsx zod pino dotenv
npm install -D @types/node
```

`tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "dist",
    "rootDir": "src",
    "declaration": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

`package.json` scripts:
```json
{
  "scripts": {
    "dev": "tsx src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js"
  }
}
```

---

### Solution 0.2: Configuration with Validation

```typescript
// src/config.ts
import { z } from 'zod';
import { config as loadEnv } from 'dotenv';

loadEnv();

const ConfigSchema = z.object({
  GITHUB_CLIENT_ID: z.string().min(1, 'GitHub Client ID is required'),
  GITHUB_CLIENT_SECRET: z.string().min(1, 'GitHub Client Secret is required'),
  TOKEN_ENCRYPTION_KEY: z.string().length(32, 'Encryption key must be 32 characters'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

export type Config = z.infer<typeof ConfigSchema>;

function loadConfig(): Config {
  const result = ConfigSchema.safeParse(process.env);

  if (!result.success) {
    console.error('Configuration error:');
    result.error.issues.forEach(issue => {
      console.error(`  ${issue.path.join('.')}: ${issue.message}`);
    });
    process.exit(1);
  }

  return result.data;
}

export const config = loadConfig();
```

---

### Solution 0.3: Structured Logging

```typescript
// src/logger.ts
import pino from 'pino';
import { config } from './config.js';

const transport = config.NODE_ENV === 'development'
  ? {
      target: 'pino-pretty',
      options: { colorize: true }
    }
  : undefined;

export const logger = pino({
  level: config.LOG_LEVEL,
  transport,
});

// Usage:
// logger.info({ userId: 123 }, 'User logged in');
// logger.error({ err }, 'Request failed');
```

---

### Solution 0.4: Error Handling Pattern

```typescript
// src/errors.ts
export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public cause?: Error
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class ConfigError extends AppError {
  constructor(message: string) {
    super('CONFIG_ERROR', message);
    this.name = 'ConfigError';
  }
}

export class AuthError extends AppError {
  constructor(message: string, cause?: Error) {
    super('AUTH_ERROR', message, cause);
    this.name = 'AuthError';
  }
}

export class ApiError extends AppError {
  constructor(
    public statusCode: number,
    message: string,
    cause?: Error
  ) {
    super('API_ERROR', message, cause);
    this.name = 'ApiError';
  }
}

// Result type (simple version)
export type Result<T, E = AppError> =
  | { ok: true; value: T }
  | { ok: false; error: E };

export const ok = <T>(value: T): Result<T, never> => ({ ok: true, value });
export const err = <E>(error: E): Result<never, E> => ({ ok: false, error });
```

---

### Solution 1.2: Build Authorization URL

```typescript
// src/auth/github.ts
import { config } from '../config.js';
import crypto from 'crypto';

const GITHUB_AUTH_URL = 'https://github.com/login/oauth/authorize';

export function generateState(): string {
  return crypto.randomBytes(16).toString('hex');
}

export function buildAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: config.GITHUB_CLIENT_ID,
    redirect_uri: 'http://localhost:3000/callback',
    scope: 'notifications repo',
    state,
  });

  return `${GITHUB_AUTH_URL}?${params.toString()}`;
}
```

---

### Solution 1.3: Local Callback Server

```typescript
// src/auth/server.ts
import http from 'http';
import { URL } from 'url';
import { buildAuthUrl, generateState } from './github.js';
import { logger } from '../logger.js';

export function startAuthServer(): Promise<{ code: string; state: string }> {
  return new Promise((resolve, reject) => {
    const expectedState = generateState();

    const server = http.createServer((req, res) => {
      const url = new URL(req.url!, `http://localhost:3000`);

      if (url.pathname === '/') {
        // Redirect to GitHub
        const authUrl = buildAuthUrl(expectedState);
        res.writeHead(302, { Location: authUrl });
        res.end();
        return;
      }

      if (url.pathname === '/callback') {
        const code = url.searchParams.get('code');
        const state = url.searchParams.get('state');

        if (state !== expectedState) {
          res.writeHead(400);
          res.end('State mismatch - possible CSRF attack');
          reject(new Error('State mismatch'));
          return;
        }

        if (!code) {
          res.writeHead(400);
          res.end('No code received');
          reject(new Error('No code'));
          return;
        }

        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end('<h1>Success!</h1><p>You can close this window.</p>');

        server.close();
        resolve({ code, state });
      }
    });

    server.listen(3000, () => {
      logger.info('Auth server listening on http://localhost:3000');
      logger.info('Open http://localhost:3000 in your browser to authenticate');
    });
  });
}
```

---

### Solution 1.4: Token Exchange

```typescript
// src/auth/github.ts (add to existing file)

const GITHUB_TOKEN_URL = 'https://github.com/login/oauth/access_token';

export async function exchangeCodeForToken(code: string): Promise<string> {
  const response = await fetch(GITHUB_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: config.GITHUB_CLIENT_ID,
      client_secret: config.GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: 'http://localhost:3000/callback',
    }),
  });

  if (!response.ok) {
    throw new AuthError(`Token exchange failed: ${response.status}`);
  }

  const data = await response.json();

  if (data.error) {
    throw new AuthError(`GitHub error: ${data.error_description}`);
  }

  return data.access_token;
}
```

---

### Solution 1.5: Secure Token Storage

```typescript
// src/auth/token-store.ts
import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { config } from '../config.js';
import { logger } from '../logger.js';

const TOKEN_FILE = path.join(process.cwd(), '.token');
const ALGORITHM = 'aes-256-gcm';

function encrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(
    ALGORITHM,
    Buffer.from(config.TOKEN_ENCRYPTION_KEY),
    iv
  );

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();

  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

function decrypt(encrypted: string): string {
  const [ivHex, authTagHex, encryptedText] = encrypted.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');

  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    Buffer.from(config.TOKEN_ENCRYPTION_KEY),
    iv
  );
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

export async function storeToken(token: string): Promise<void> {
  const encrypted = encrypt(token);
  await fs.writeFile(TOKEN_FILE, encrypted, 'utf8');
  logger.info('Token stored securely');
}

export async function loadToken(): Promise<string | null> {
  try {
    const encrypted = await fs.readFile(TOKEN_FILE, 'utf8');
    return decrypt(encrypted);
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') {
      return null;
    }
    throw e;
  }
}
```

---

### Solution 1.6: CLI Auth Command

```typescript
// src/auth/index.ts
import open from 'open';
import { startAuthServer } from './server.js';
import { exchangeCodeForToken } from './github.js';
import { storeToken } from './token-store.js';
import { logger } from '../logger.js';

export async function runAuthFlow(): Promise<void> {
  logger.info('Starting GitHub OAuth flow...');

  // Start server and open browser concurrently
  const serverPromise = startAuthServer();

  // Give server a moment to start, then open browser
  setTimeout(() => {
    open('http://localhost:3000');
  }, 500);

  // Wait for callback
  const { code } = await serverPromise;
  logger.info('Received authorization code');

  // Exchange for token
  const token = await exchangeCodeForToken(code);
  logger.info('Token exchange successful');

  // Store token
  await storeToken(token);
  logger.info('Authentication complete!');
}

// If running directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAuthFlow().catch(console.error);
}
```

Add to `package.json`:
```json
{
  "scripts": {
    "auth": "tsx src/auth/index.ts"
  }
}
```

---

(Additional solutions continue for remaining phases...)

---

Tags: #agents #learning #typescript #mastra #oauth #github
