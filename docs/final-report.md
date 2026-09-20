# Final Completion Report: Personal Communication Intelligence

Four-stage AI Product Management capstone, built end-to-end. This report summarizes the
completed system; see `docs/phase-1.md` through `docs/phase-4.md` for stage-by-stage detail,
what was verified at each step, and known limitations.

## Product

A personal AI system that sits over digital communications and answers one question: **what
needs my attention?** Not another inbox, summarizer, or chatbot — a pipeline that understands
each communication, applies personal context, makes a deterministic attention decision, and
explains that decision in plain language. The core experience is the attention feed at `/`:
communications grouped into ACT_NOW / REVIEW / WATCH, with everything else collapsed into a
count.

## Architecture

```text
Communication (sample data or Gmail)
        |
        v
AI Understanding (OpenAI, schema-validated, versioned prompt)
        |
        v
Structured Facts (category, intent, entities, dates, amount, requested action, summary)
        |
        v
Personal Context (seeded: important people/orgs/projects/subscriptions/vendors)
        |
        v
Deterministic Decision Engine (6 weighted factors -> ACT_NOW/REVIEW/WATCH/LOW_PRIORITY/NO_ACTION)
        |
        v
AI Explanation (grounded strictly in the facts + decision above; never influences the decision)
        |
        v
Attention Feed
```

The governing rule throughout: **the LLM understands and explains; application code decides.**
The decision engine (`lib/decision-engine/`) has zero AI or database dependencies — it is a pure
function, independently unit-tested, and would produce identical output for identical input
regardless of which model or prompt produced the facts feeding it.

## Technology

- **Frontend/Backend**: Next.js (App Router) + React + TypeScript + Tailwind CSS + shadcn/ui, no
  separate backend service.
- **Database**: Supabase (PostgreSQL) — 6 tables: `communications`, `communication_analysis`,
  `personal_context`, `attention_decisions`, `evaluation_dataset`, `user_feedback`, plus
  `gmail_connections`. 4 migrations, additive and idempotent.
- **AI**: OpenAI API, two independently-versioned prompts (`communication-analysis-v1`,
  `communication-explanation-v1`), both schema-validated with Zod (`chat.completions.parse` +
  `zodResponseFormat`).
- **Auth**: Google OAuth 2.0 (Authorization Code flow) for Gmail, read-only scope.
- **Tests**: Vitest, 65 tests, all passing.

## AI

- **Model**: configurable via `OPENAI_MODEL` (defaults to `gpt-4o-mini`), centralized in
  `lib/config.ts`.
- **Extraction prompt** (`communication-analysis-v1`): given sender, subject, body, and received
  timestamp, extracts category, intent, organization, people, other entities, event date,
  deadline, amount/currency, product/service, reference ID, requested action, a factual summary,
  and a confidence score — instructed to never invent information and to use `null` for anything
  not present.
- **Explanation prompt** (`communication-explanation-v1`): given only the extracted facts, the
  already-computed attention level, the engine's reason, and matched personal context, produces
  "why does this matter" and "what can you do" — instructed the same way, and runs strictly after
  the decision, never before or in place of it.
- **Structured extraction**: enforced via Zod schemas (`lib/validation/`), not prompt-only
  discipline — malformed model output is rejected before it reaches the database.
- **Personal context**: a flat, manually-seeded table (`personal_context`) of important people,
  organizations, projects, subscriptions, and recurring vendors, matched against communication
  fields by case-insensitive substring containment (`lib/decision-engine/context-matching.ts`).
- **Decision engine**: 6 factors (urgency, action_required, impact, personal_relevance,
  deadline_proximity, sender_importance), each 0–5 and independently explainable, combined via
  configurable weights (`lib/decision-engine/weights.ts`) into a 0–5 score, bucketed into 5
  attention levels via configurable thresholds.

## Data

- `communications` — raw data only (sender, subject, content, timestamps, source).
- `communication_analysis` — AI-derived structured facts, one row per communication, versioned
  by `model` and `prompt_version`. Kept in a separate table from raw data throughout, so
  provenance is always inspectable.
- `personal_context` — manually seeded facts about what/who matters (14 entries for the sample
  dataset).
- `attention_decisions` — one row per communication: the level, all 6 factor scores, the overall
  score, the deterministic reason, which personal context entries matched (and how), the decision
  version, and (once generated) the AI explanation text plus its own model/prompt version.
- `user_feedback` — Important / Not Important / Dismiss per communication, captured for future
  evaluation/personalization, not acted on yet (per the brief).
- `evaluation_dataset` — 44 frozen, hand-labeled ground-truth rows (see Evaluation below).
- `gmail_connections` — OAuth tokens, server-side only.

## Evaluation

A 44-item golden dataset (`scripts/golden-labels.ts`) with `expected_category`,
`expected_intent`, and `expected_attention_level` per sample communication. Category/intent
labels reflect authorial intent (objective, since the content was written to fit a label);
attention-level labels were computed by hand using the exact decision-engine formula against an
idealized extraction of each communication, then frozen — and all 44 were verified against the
real `decideAttention()` function before being committed (44/44 matched). 33 of the 44 are held
out as a frozen `test` split; 11 are `dev`.

`lib/evaluation/metrics.ts` computes category accuracy, intent accuracy, decision accuracy, and
per-level precision/recall/support as pure functions, tested against constructed edge cases
(pending examples excluded from denominators, `null` vs `0` for classes never predicted or never
occurring, fractional accuracy). The `/evaluation` page computes these live from whatever has
actually been analyzed.

**Actual measured results: none, and this is stated honestly.** This environment has no OpenAI
API key and no live Supabase project, so no communication has been run through the real AI
pipeline — `/evaluation` correctly shows "0 of 44 analyzed" rather than invented numbers. Once
real credentials are added, migrations run, `npm run seed` executed, and "Analyze All" run from
`/communications`, real accuracy/precision/recall will appear automatically (the page queries
live data on every load, not a stored snapshot).

## Gmail

- **OAuth**: standard Authorization Code flow against Google's real endpoints, `gmail.readonly`
  scope only (this app cannot send, delete, or modify mail), CSRF-protected via a signed
  short-lived state cookie, automatic access-token refresh with a stored refresh token.
- **Ingestion**: `POST /api/gmail/sync` fetches the most recent messages (default 20, capped at
  50), normalizes each into the identical `Communication` model used for sample data (MIME-aware
  body extraction, preferring `text/plain`, falling back to stripped `text/html`, then the
  snippet), upserts them idempotently (unique on `source, external_id`), and runs every new one
  through the same `processCommunication` pipeline used everywhere else — no Gmail-specific AI
  code.
- **Not verified live in this environment**: there is no Google Cloud OAuth client configured
  here, and even with one, completing the flow requires a real human consenting in a browser —
  not something any sandboxed environment can substitute for. Every function involved is real,
  targets Google's actual documented endpoints, and is unit-tested against realistic
  request/response shapes (19 tests) with the network mocked. See `docs/phase-4.md` for exactly
  what was and wasn't exercised, and the README's "Gmail setup" section for how to verify it
  yourself.

## Testing

- **65/65 tests passing** (Vitest), spanning all four phases:
  - Schema validation (7), AI extraction (4), AI explanation (4), DB row mapping (2).
  - Decision engine (10) + context matching (6) — every attention level, personal-relevance and
    deadline-proximity monotonicity, purity, matched-context reporting.
  - Pipeline orchestration (6) — success path, personal context flow-through, resilience to
    AI/explanation/persistence failures at each stage.
  - Evaluation metrics (7) — accuracy and precision/recall edge cases.
  - Gmail (19) — OAuth URL/token exchange, token refresh, message fetching, normalization.
- `npx tsc --noEmit`, `npm run lint`, and `npm run build` all pass after every stage.
- `npm run dev` was checked via `curl` after every stage: every route returns 200 (or the correct
  error code for misconfigured integrations), and pages needing a database show an honest
  "not configured" state rather than crashing or fabricating data.

## Security

- No secrets are hard-coded; all configuration is centralized in `lib/config.ts`, sourced from
  environment variables documented in `.env.example`.
- The Supabase **service role key** and the OpenAI and Gmail client secrets are used only in
  server components, route handlers, and scripts — never sent to the browser.
- Gmail OAuth: least-privilege `gmail.readonly` scope, CSRF state verification on callback,
  httpOnly cookies, automatic token refresh, and separate, explicit user controls for revoking
  access (Disconnect) versus deleting imported data (Delete imported Gmail data) — the two are
  intentionally independent, matching the brief.
- Destructive UI actions (disconnect, delete data) require a confirming second click.

## Known limitations

Honest, not hidden — see each phase doc for the full list. In short:
- No live OpenAI/Supabase/Google OAuth credentials existed in this build environment, so nothing
  was verified against real external services — only against realistic mocks, with all real
  request/response shapes unit-tested.
- No currency normalization in impact scoring; no fuzzy/aliased personal-context matching; no
  pagination or filtering in Gmail sync; tokens are not field-level encrypted at rest.
- Explanation quality is grounded and schema-validated but not automatically scored — the brief's
  allowance for a "simple manual evaluation mechanism" is met by the `/evaluation` per-example
  list and the Communication Detail page.
- Single-user, single-tenant by design, per the brief.

## Future roadmap

Only listed now that the four-stage capstone is complete, per the brief:
- Additional sources (Slack, Teams, WhatsApp, Android notifications), calendar integration.
- Richer, derived (not just manually seeded) personal context from communication history.
- Feedback-driven personalization of decision weights.
- Local/private AI processing options to reduce what leaves the device.
- A native mobile application.
