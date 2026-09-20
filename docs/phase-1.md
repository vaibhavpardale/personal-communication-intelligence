# Phase 1: Foundation + AI Understanding

## What was built

- **Next.js app** (App Router, TypeScript, Tailwind, shadcn/ui) with no separate backend service.
- **Database schema** (`supabase/migrations/0001_phase1_foundation.sql`):
  - `communications` — raw communication data (sender, subject, content, timestamps).
  - `communication_analysis` — AI-derived structured facts, one row per communication
    (upserted on re-analysis), kept in a separate table from raw data so provenance is always
    clear.
- **AI understanding pipeline** (`lib/ai/`):
  - `prompts/communication-analysis-v1.ts` — a versioned prompt that instructs the model to
    extract category, intent, organization, people, other entities, event date, deadline,
    amount, currency, product/service, reference ID, requested action, a factual summary, and a
    confidence score, using `null` for anything not present in the text and never inventing
    information.
  - `analyze-communication.ts` — calls OpenAI (`chat.completions.parse`) with the response
    constrained to a Zod schema (`lib/validation/analysis-schema.ts`), so malformed output is
    rejected before it ever reaches the database.
  - Model and prompt version are stored alongside every analysis row.
- **Pipeline orchestration** (`lib/pipeline/process-communication.ts`): ties AI analysis and
  persistence together, catching and logging per-item failures so an "analyze all" batch never
  fails as a whole because one communication errors out.
- **Sample dataset** (`scripts/sample-communications.ts`): 40 synthetic communications across
  financial, travel, work, shopping, subscription, marketing, and social/low-value categories,
  with realistic amounts, dates, senders, and recurring entities (e.g. "Priya Sharma (Manager)",
  "Cisco", "Microsoft", "Netflix", "AWS", "Project Alpha", "Project Beta") that Phase 2's personal
  context will reference.
- **UI**:
  - `/` — landing page.
  - `/communications` — list view with sender, subject, category, date, and analysis status;
    "Analyze" (per row) and "Analyze All" actions.
  - `/communications/[id]` — detail view with **Original Communication** and **AI
    Understanding** shown as clearly separate sections.
- **API routes**: `POST /api/communications/[id]/analyze`, `POST /api/communications/analyze-all`
  (processes unanalyzed communications in batches of 5).
- **Tests** (Vitest, 16 tests, OpenAI mocked — no live API calls in tests):
  - Schema validation: valid payloads, all-null payloads, missing fields, invalid enum values,
    out-of-range confidence, wrong types.
  - `analyzeCommunication`: happy path, prompt contents, model refusal, failed schema
    validation.
  - `processCommunication`: success path, AI failure handled without throwing, persistence
    failure handled without throwing.
  - `toAnalysisInsertRow`: pure mapping from AI output to the DB row shape.

## Verified

- `npx tsc --noEmit` — passes.
- `npm run lint` — passes (0 warnings, 0 errors).
- `npm test` — 16/16 passing.
- `npm run build` — production build succeeds; `/communications` and `/communications/[id]` are
  correctly marked dynamic (server-rendered on demand), so the build does not require a live
  database connection.
- `npm run dev` — verified with `curl`: `/` renders the "What needs my attention?" landing copy;
  `/communications` renders (correctly showing the "Supabase is not configured" empty state, see
  Known limitations); no route returns a 500.

## Known limitations

- **No live Supabase/OpenAI verification in this environment.** This sandbox has no Docker or
  Supabase CLI available, so there is no local Postgres instance, and no OpenAI API key was
  provided. That means:
  - The migration SQL has not been run against a real database.
  - `analyzeCommunication` has not been exercised against the real OpenAI API — it is verified
    only via mocked unit tests.
  - The full flow (seed → analyze → view) has not been observed end-to-end with real data.
  - This is not faked: the app is written so `/communications` shows an explicit "Supabase is
    not configured" message rather than pretending to have data. Once you add real
    `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` / `OPENAI_API_KEY` values to `.env.local`, run
    the migration, and run `npm run seed`, the full pipeline should work end-to-end — but that
    step needs to happen with your credentials, not mine.
- No authentication/authorization — this is a single-user local capstone.
- `entities` is a single catch-all JSONB array for named entities not otherwise modeled
  (locations, flight/order numbers, product names); it is not further typed or categorized.
- Concurrency for "Analyze All" is a simple fixed batch size (5) with no retry/backoff logic.

## Data sent to OpenAI

For each communication analyzed: sender address, sender name, subject, full message content,
and received timestamp (see `lib/ai/prompts/communication-analysis-v1.ts`). No other data (e.g.
personal context, other communications) is included in the prompt. The response is validated
against a strict schema before being stored; anything that fails validation is discarded, not
persisted.
