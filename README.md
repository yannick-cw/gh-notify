# GitHub Notify

A learning project for building a GitHub notification triage agent. Fetches your GitHub notifications, filters out noise (team mentions, watched repos), uses an LLM to decide what matters, and posts relevant items to Slack.

## Setup

```bash
npm install
cp .env.example .env   # fill in your credentials
```

## Usage

```bash
npm run auth            # OAuth2 flow - opens browser, exchanges token, stores encrypted
npm run dev             # Run the agent
npm run history         # View run history
npm test                # Run tests
```

## What's Built So Far

### Phase 0 - TypeScript Foundation
- Zod-validated config from `.env`
- Structured logging with pino
- ADT error types with `Result<T>` pattern

### Phase 1 - GitHub OAuth2 Flow
- Full authorization code flow (redirect, callback, back-channel token exchange)
- CSRF protection with random state parameter
- AES-256-GCM encrypted token storage

### Phase 2 - GitHub API Client
- `fetchNotifications` - fetches notification threads
- `getPRDetails` - fetches PR with reviewers/teams (for distinguishing personal vs team review requests)
- `getIssueDetails` - fetches issue with labels and comment count
- Shared `getGithub<T>` helper with Zod response validation and rate limit warnings

## Project Structure

```
src/
├── index.ts                 # CLI entry point
├── config.ts                # Zod-validated env config
├── logger.ts                # Pino structured logging
├── errors.ts                # AppError ADT + Result type
├── auth/
│   ├── github.ts            # OAuth flow (Hono server, auth URL, token exchange)
│   ├── token-store.ts       # AES-256-GCM encrypt/decrypt to .tokens/
│   └── index.ts             # Auth CLI command
└── github/
    ├── api.ts               # Shared getGithub<T> fetch + validate
    ├── notifications.ts     # GET /notifications
    ├── pull-requests.ts     # GET /repos/:owner/:repo/pulls/:number
    └── issues.ts            # GET /repos/:owner/:repo/issues/:number
```

## Tech Stack

TypeScript, Node.js 20+, Hono, Zod, Pino
