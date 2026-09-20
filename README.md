# Personal Communication Intelligence

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

3. Run the database migration in `supabase/migrations/` against your Supabase project (via the
   Supabase SQL editor, or the Supabase CLI once you have it installed locally).

4. Seed sample data:

   ```bash
   npm run seed
   ```

5. Run the app:

   ```bash
   npm run dev
   ```

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npx tsc --noEmit` | TypeScript type check |
| `npm test` | Run the test suite (Vitest) |
| `npm run seed` | Seed the sample communications dataset into Supabase |

## Project structure

```text
app/                    Next.js routes (UI + API)
components/             UI components (shadcn/ui in components/ui)
lib/
  ai/                   OpenAI client, prompts, structured extraction
  db/                   Supabase client and data access
  pipeline/             Orchestrates AI understanding + persistence
  validation/           Zod schemas for AI output
  observability/        Minimal structured logging
types/                  Shared TypeScript types
supabase/migrations/    SQL schema migrations
scripts/                Sample data + seeding
tests/                  Vitest unit/integration tests
docs/                   Per-phase reports and architecture notes
```

## Privacy: what is sent to OpenAI

For every communication analyzed, the sender address, sender name, subject, full message body,
and received timestamp are sent to OpenAI to extract structured facts (see
`lib/ai/prompts/communication-analysis-v1.ts`). Nothing else is sent. See
[`docs/phase-1.md`](./docs/phase-1.md) for the full data-flow explanation.
