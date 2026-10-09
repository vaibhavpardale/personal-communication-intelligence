# Heed

**Only what needs you.** Notification intelligence for your inbox. Heed reads your mail and tells you what needs you, by when, and why.

Heed is a responsive web app that installs on a phone (Add to Home Screen) and uses a phone layout automatically. The Phone toggle in the header previews that layout on a desktop.

A personal AI system that sits over digital communications and answers one question:

> **What needs my attention?**

This is an AI Product Management capstone. It is intentionally small: a clean TypeScript
application, a deterministic decision engine, and an LLM used only for understanding and
explanation — never as the sole authority for what deserves attention.

Core architectural principle: **LLM understands. Application code decides. LLM explains.**

See [`docs/`](./docs) for the per-phase reports (what was built, what was verified, and known
limitations at each stage).

## Stack

- **Frontend/Backend**: Next.js (App Router), React, TypeScript, Tailwind CSS, shadcn/ui
- **Database**: Supabase (PostgreSQL)
- **AI**: OpenAI API
- **Tests**: Vitest

## Getting started

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env.local` and fill in your credentials:

   ```bash
   cp .env.example .env.local
   ```

   You need:
   - An OpenAI API key (`OPENAI_API_KEY`)
   - A Supabase project URL and **service role** key (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`)
   - Optional, for real Gmail import: a Google Cloud OAuth 2.0 Client ID (`GMAIL_CLIENT_ID`,
     `GMAIL_CLIENT_SECRET`, `GMAIL_REDIRECT_URI`) — see "Gmail setup" below. Everything else works
     without this; the Settings page says so plainly if it's missing.

3. Run the migrations in `supabase/migrations/` (in order) against your Supabase project (via the
   Supabase SQL editor, or the Supabase CLI once you have it installed locally).

4. Seed sample data (communications + personal context + the golden evaluation dataset):

   ```bash
   npm run seed
   ```

5. Run the app:

   ```bash
   npm run dev
   ```

   This runs on **http://localhost:3005** (pinned in `package.json`, not the Next.js default of
   3000) so the Gmail OAuth redirect URI below stays stable regardless of what else is running
   locally. Change the port in `package.json`'s `dev`/`start` scripts, `.env.local`, and the
   OAuth client's redirect URI together if you need a different one.

## Gmail setup (optional)

1. In the [Google Cloud Console](https://console.cloud.google.com/), create a project (or use an
   existing one) and enable the **Gmail API**.
2. Under APIs & Services > Credentials, create an **OAuth 2.0 Client ID** (Web application).
3. Add `http://localhost:3005/api/gmail/callback` (or your deployed URL's equivalent) as an
   authorized redirect URI.
4. Put the client ID/secret and that same redirect URI into `.env.local` as `GMAIL_CLIENT_ID`,
   `GMAIL_CLIENT_SECRET`, `GMAIL_REDIRECT_URI`.
5. Go to `/settings` in the app and click "Connect Gmail". Only the read-only
   `gmail.readonly` scope is requested — this app cannot send, delete, or modify anything in your
   mailbox. From Settings you can also disconnect the account (revokes stored access) or
   permanently delete everything imported from Gmail, independently of each other.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npx tsc --noEmit` | TypeScript type check |
| `npm test` | Run the test suite (Vitest) |
| `npm run seed` | Seed sample communications, personal context, and the golden evaluation dataset |

## Project structure

```text
app/                    Next.js routes (UI + API)
components/             UI components (shadcn/ui in components/ui)
lib/
  ai/                   OpenAI client, prompts, structured extraction
  db/                   Supabase client and data access
  decision-engine/      Deterministic attention scoring (no AI, no DB)
  context/              Personal context types
  evaluation/           Pure metrics (accuracy, precision/recall) over the golden dataset
  gmail/                OAuth, Gmail API client, and normalization into the Communication model
  pipeline/             Orchestrates AI understanding -> decision -> explanation -> persistence
  validation/           Zod schemas for AI output
  observability/        Minimal structured logging
types/                  Shared TypeScript types
supabase/migrations/    SQL schema migrations
scripts/                Sample data + seeding
tests/                  Vitest unit/integration tests
docs/                   Per-phase reports and architecture notes
```

## Privacy: what is sent to OpenAI, and what Gmail data is stored

For every communication analyzed (sample or Gmail-imported), the sender address, sender name,
subject, full message body (truncated to 5,000 characters for Gmail), and received timestamp are
sent to OpenAI to extract structured facts (see `lib/ai/prompts/communication-analysis-v1.ts`). A
second call sends the extracted facts, decision, and matched personal context to generate an
explanation (see `lib/ai/prompts/communication-explanation-v1.ts`). Nothing else — no other
communications, no OAuth tokens, no full mailbox — is ever sent to OpenAI.

Gmail OAuth access/refresh tokens are stored server-side only (Supabase, accessed via the service
role key) and are never sent to the client or to OpenAI. You can revoke stored access
("Disconnect") or permanently delete every communication imported from Gmail ("Delete imported
Gmail data") from `/settings`, independently of each other. See
[`docs/phase-4.md`](./docs/phase-4.md) for the full Gmail data-flow explanation, and
[`docs/phase-1.md`](./docs/phase-1.md) for the base pipeline.
