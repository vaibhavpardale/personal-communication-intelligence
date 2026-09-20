# Phase 2: Personal Context + Attention Engine

## What was built

- **Personal context** (`lib/context/types.ts`, `supabase/migrations/0002_phase2_context_and_attention.sql`):
  a flat `personal_context` table (`context_type`, `key`, `value`, `importance` 1–5, `confidence`).
  No memory graph, no derivation from history yet — just manually seeded facts
  (`scripts/sample-personal-context.ts`) matching the recurring entities already present in the
  Phase 1 sample dataset: Cisco, Microsoft, Globex Inc (organizations); Priya Sharma, Daniel Osei
  (people); Project Alpha, Project Beta (projects); Netflix, AWS, Spotify, Cult.fit
  (subscriptions); HDFC Bank, Amazon.in (recurring vendors).
- **Deterministic decision engine** (`lib/decision-engine/`), a pure TypeScript module with no AI
  and no database access:
  - `scoring.ts` — six independently-explainable factors (0–5 each): `urgency`,
    `action_required`, `impact`, `personal_relevance`, `deadline_proximity`, `sender_importance`.
  - `context-matching.ts` — case-insensitive substring matching between communication fields
    (sender, people, organization, entities) and seeded personal context; returns which entry
    matched and where (`sender` vs `content`).
  - `weights.ts` — configurable factor weights and level thresholds, isolated from both scoring
    logic and the UI.
  - `decide.ts` — `decideAttention(input, personalContext, now)`: computes the weighted-average
    score, classifies it into an `AttentionLevel` (`ACT_NOW` / `REVIEW` / `WATCH` /
    `LOW_PRIORITY` / `NO_ACTION`), and generates a deterministic (non-LLM) reason sentence from
    whichever factors are actually high — e.g. "A communication where this requires action, and
    the deadline is today or tomorrow."
  - `build-input.ts` — maps a `Communication` + `CommunicationAnalysis` into the engine's input
    shape, keeping the engine decoupled from database row shapes.
- **Pipeline integration** (`lib/pipeline/process-communication.ts`): now runs AI understanding →
  decision engine → persistence in one call, storing the result in a new `attention_decisions`
  table (one row per communication, versioned via `decision_version`, upserted on re-analysis).
  Personal context is fetched once per batch (not per communication) and passed in explicitly,
  so the engine itself stays a pure function of its inputs.
- **UI**:
  - `/` is now the attention feed — "What needs my attention?" — grouping analyzed
    communications into ACT_NOW / REVIEW / WATCH sections with the decision reason shown inline,
    plus an "Everything else" count (LOW_PRIORITY + NO_ACTION + not-yet-analyzed) linking to the
    full list.
  - `/communications` gained an "Attention" column.
  - `/communications/[id]` gained an "Attention Decision" card: level, a bar per factor score
    (0–5), the personal context entries that were matched (and whether via sender or content),
    the overall score, and the decision version.

## Verified

- `npx tsc --noEmit` — passes.
- `npm run lint` — passes.
- `npm test` — 34/34 passing (18 new tests for this phase):
  - `decideAttention`: one test per required scenario (ACT_NOW, REVIEW, WATCH, LOW_PRIORITY,
    NO_ACTION — including the exact NO_ACTION reason text from the brief), personal relevance
    raising the score, deadline proximity increasing monotonically as the date approaches,
    overdue deadlines scoring like due-tomorrow, matched-context reporting, and purity
    (same input always produces the same output — no hidden state, no AI, no clock drift beyond
    the explicit `now` parameter).
  - `findMatches` / `maxImportance`: case-insensitivity, substring containment, no false
    positives, and null/empty candidate handling.
  - `processCommunication`: decision engine now wired into the pipeline; verifies personal
    context flows through to scoring, and that a failure at either the analysis or the
    attention-decision persistence step is caught and reported rather than thrown.
- `npm run build` — production build succeeds; all data-backed routes remain dynamic.
- `npm run dev` — verified via `curl`: `/` and `/communications` both render (again correctly
  showing "Supabase is not configured" — see Known limitations).

## Design notes / trade-offs

- **Weighted average, not a rules tree.** Each factor is scored 0–5, combined with a configurable
  weight (`FACTOR_WEIGHTS`), and the resulting 0–5 average is bucketed into a level via
  configurable thresholds (`ATTENTION_THRESHOLDS`). This keeps every number traceable to a
  specific, named factor (satisfying "explainable") while staying tunable without touching
  scoring logic.
- **`sender_importance` vs `personal_relevance` are intentionally split**: `sender_importance`
  only looks at who sent it (sender address, sender name, organization); `personal_relevance`
  only looks at what/who the content is about (people, other entities, product/service). This
  avoids double-counting the same context match and keeps "why did this score high" answerable
  in one sentence.
- **Amounts are not currency-normalized.** A threshold of "amount >= 10000" is applied regardless
  of whether the amount is INR or USD, which is a real simplification (documented, not hidden).
- **Reason generation is templated, not LLM-generated.** Phase 2 is about the deterministic
  decision engine; natural-language explanation grounded in the decision is Phase 3's job.

## Known limitations

- Same environment constraint as Phase 1: no live Supabase/OpenAI credentials in this sandbox, so
  the full seed → analyze → decide → view flow has not been observed against a real database.
  The app continues to show an explicit "not configured" state rather than fabricating data.
- Personal context is manually seeded, as specified for this phase; deriving it from historical
  communications is an explicit future direction, not attempted here.
- Context matching is case-insensitive substring containment — no fuzzy matching, aliasing (e.g.
  "HDFC" vs "HDFC Bank Ltd"), or disambiguation between two people sharing a first name.
