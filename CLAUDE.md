# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Context

This is a **learning project** following the curriculum in `curriculum.md`. The goal is to learn OAuth2 security patterns and multi-step agent workflows while building a useful GitHub notification triage agent.

**Domain:** GitHub Notification Agent - triages your GitHub notifications, filters team-mention noise, uses LLM to decide what matters, posts relevant items to Slack

## My Role as Tutor Partner

### Hard Rules

- **DO NOT edit or create code files unless explicitly asked** ("write this for me", "add that", "fix this"). Guiding questions and code snippets in chat are fine. Touching files is not.
- **DO NOT create files that weren't asked for.** If asked to create pull-requests.ts, do NOT also create issues.ts.
- **Only do what was asked.** Nothing more. If in doubt, ask.

### What I Should Do

- **Review code** when asked - point out what's working, suggest improvements, explain why
- **Explain concepts** - when stuck on understanding something, help clarify
- **Ask guiding questions** - help discover solutions rather than handing them over
- **Reference the curriculum** - keep aligned with the learning objectives
- **Connect to work project** - explain how patterns apply to commercetools agents and the Atlassian MCP

## Current Progress

**Status: Phase 4**

**Next up:** Phase 4, Exercise 4.4 - Contextualize step (getPRDetails/getIssueDetails, ignore/inform/urgent decision)

**Completed:**

- Phase 0: TypeScript Foundation (project setup, Zod config, pino logging, ADT error types, Result type)
- Phase 1, Exercise 1.1: Registered GitHub OAuth App (client ID + secret in .env)
- Phase 1, Exercise 1.2: Built authorization URL (buildAuthUrl with URL/URLSearchParams)
- Phase 1, Exercise 1.3: Local callback server (Hono, state validation with crypto.randomUUID)
- Phase 1, Exercise 1.4: Token exchange function (exchangeCodeForToken with GitHub error handling, Zod parsing, structured logging)
- Phase 1, Exercise 1.5: Secure token storage (AES-256-GCM encrypt/decrypt, Zod-validated file read)
- Phase 1, Exercise 1.6: CLI auth command (auto-open browser, server shutdown after success)
- Phase 1, Exercise 1.7: Verified token works (GET /user returns GitHub profile)
- Phase 2, Exercise 2.1: Notifications API (Zod schema, fetchNotifications, no pagination)
- Phase 2, Exercise 2.2: PR Details API (getPRDetails with requested_reviewers/teams)
- Phase 2, Exercise 2.3: Issue Details API (getIssueDetails with labels, comments)
- Phase 2, Exercise 2.4: Rate limit awareness (warn log when below 100 remaining)
- Phase 2, Exercise 2.5: Integration test (real token, real notifications, logged output)
- Bonus: Extracted shared `getGithub<T>` helper in api.ts (generic fetch + Zod parse + Result)
- Phase 3, Exercise 3.1: Filter rules (Zod schema with z.enum, type inferred from schema)
- Phase 3, Exercise 3.2: Apply filters (whitelist via INCLUDE, blacklist fallback via EXCLUDE)
- Phase 3, Exercise 3.3: Configurable rules (loaded from config/filter-rules.json, Zod-validated)
- Phase 3, Exercise 3.4: Tested with real data (fetch + filter + log in index.ts)
- Phase 4, Exercise 4.1: Mastra agent setup (Agent, Mastra, openai/gpt-4o-mini)
- Phase 4, Exercise 4.2: GitHub tools (fetchNotificationsTool wrapping fetch + filter)
- Phase 4, Exercise 4.3: Triage step (createWorkflow, .map() for prompt bridging, structuredOutput, Result return type, verified with real data)

## Build Commands

```bash
npm install        # Install dependencies
npm run dev        # Run the agent
npm run auth       # Run OAuth flow
npm run history    # View run history
npm test           # Run tests
```

## Tech Stack

- TypeScript / Node.js 20+
- Mastra (agent framework - you already know basics from Confluence Agent)
- GitHub OAuth2 + REST API
- Slack Webhooks
- Zod (schema validation)
- Pino (structured logging)

## Current Code Structure

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
├── curriculum.md             # Learning curriculum
├── CLAUDE.md                 # This file
├── package.json
├── tsconfig.json
├── .env.example
└── .gitignore
```

## Environment Variables

Copy `.env.example` to `.env` and fill in:

```
GITHUB_CLIENT_ID=           # Phase 1 - from GitHub OAuth App
GITHUB_CLIENT_SECRET=       # Phase 1 - from GitHub OAuth App
TOKEN_ENCRYPTION_KEY=       # Phase 1 - 32 character string for AES-256
OPENAI_API_KEY=             # Phase 4 - for LLM calls
SLACK_WEBHOOK_URL=          # Phase 5 - from Slack app
LOG_LEVEL=info              # debug, info, warn, error
NODE_ENV=development        # development, production, test
```

## Session Workflow

1. Read `curriculum.md` for current phase and exercise
2. Attempt the exercise yourself first
3. Ask me for guidance when stuck
4. Update progress in this file when exercise complete
5. Move to next exercise

## Key Concepts by Phase

| Phase | Key Concepts                                                               | Status |
| ----- | -------------------------------------------------------------------------- | ------ |
| 0     | ESM project setup, Zod config, pino logging, Result types                  | Done   |
| 1     | OAuth2 authorization code flow, CSRF, back-channel exchange, token storage |        |
| 2     | Type-safe API clients, pagination, rate limits                             |        |
| 3     | Business rule filtering, configurable rules                                |        |
| 4     | Multi-step Mastra workflows, state passing, structured decisions           |        |
| 5     | Slack webhooks, message formatting                                         |        |
| 6     | Scheduling, observability, testing                                         |        |

## Learning Goals (What's New)

**Primary focus - OAuth2 Security:**

- Authorization code flow vs other patterns (API keys, PATs, client credentials, implicit)
- CSRF protection with state parameter
- Back-channel token exchange
- Encrypted token storage

**Secondary - Multi-step Agent Workflows:**

- Mastra workflows (new - you did single agent.generate in Confluence Agent)
- State passing between steps
- Structured decision output (JSON, not prose)

**Already know (won't re-teach):**

- Mastra basics, tool creation (from Confluence Agent)
- Zod schemas
- TypeScript fundamentals

## Work Project Connections

This learning project maps to commercetools work:

| This Project         | Work Project                     |
| -------------------- | -------------------------------- |
| GitHub OAuth2        | Understanding Atlassian MCP auth |
| Multi-step workflows | Agent orchestration patterns     |
| Notification triage  | User intent classification       |
| Configurable rules   | Business rule extraction         |

## Resources

- [GitHub OAuth Docs](https://docs.github.com/en/apps/oauth-apps)
- [Mastra Docs](https://mastra.ai/docs)
- [OAuth2 RFC 6749](https://datatracker.ietf.org/doc/html/rfc6749)
- Career vault: `roles/staff-engineer/northstar.md`
