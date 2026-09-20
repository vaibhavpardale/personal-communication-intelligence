# Phase 3: Explanation + Evaluation

## What was built

### AI Explanation

- `lib/ai/prompts/communication-explanation-v1.ts` + `lib/ai/generate-explanation.ts`: a second,
  independently-versioned prompt/model call that runs **after** the deterministic decision
  engine, not before or instead of it. It is given only: the subject, the AI-extracted summary
  and facts (category, intent, organization, deadline, event date, amount, requested action),
  the attention level the engine already assigned, the engine's own reason string, and the
  personal context entries the engine matched. It is explicitly instructed not to invent
  anything beyond those facts, and produces two grounded fields: `why_it_matters` and
  `what_you_can_do`.
- Schema-validated with Zod (`lib/validation/explanation-schema.ts`), same pattern as Phase 1's
  extraction.
- `attention_decisions` gained `why_it_matters`, `what_you_can_do`, `explanation_model`,
  `explanation_prompt_version` columns (migration `0003`). Explanation and decision live in the
  same row because they describe the same event, but they are populated in two separate steps.
- **Resilience**: if explanation generation fails (rate limit, network, refusal), the pipeline
  logs it and still saves the decision with `null` explanation fields — the attention level must
  never depend on the explanation succeeding. The UI shows "No AI explanation available for this
  decision yet" in that case rather than blocking or fabricating text.
- The Communication Detail page now shows "Why does this matter?" / "What can you do?" above the
  factor-score breakdown, matched context, and decision/explanation versions.

### Evaluation

- **Golden dataset** (`scripts/golden-labels.ts`): 44 hand-labeled rows, one per sample
  communication, each with `expected_category`, `expected_intent`, `expected_attention_level`,
  and a `dataset_split` (`dev` or `test`). Persisted via a new `evaluation_dataset` table
  (migration `0003`), one row per `communication_id`.
  - **Category / intent labels** reflect the author's intent when writing each communication —
    objective, since the content was written to fit a specific label.
  - **Attention-level labels** were computed by hand, running the exact same formula as
    `lib/decision-engine/decide.ts` against an idealized extraction of each communication (the
    facts a correct AI extraction should produce), then frozen as a static value — not
    recomputed live from the engine at evaluation time. Recomputing live would make "decision
    accuracy" measure nothing (the engine would trivially agree with itself); freezing it means
    the metric actually catches drift between what the AI extracts from the real communication
    and what an ideal extraction would have produced. All 44 hand-computed values were verified
    by running them through the real `decideAttention()` function before being committed (see the
    "Methodology verification" note below) — 44/44 matched.
  - **Split**: every 4th item (11 of 44) is `dev` (safe to look at while iterating); the other 33
    are `test` (frozen — the weights/thresholds in `lib/decision-engine/weights.ts` were designed
    against the illustrative examples in the project brief, not against this specific set, so
    this split is a discipline for future changes rather than a retroactive claim).
- **Metrics** (`lib/evaluation/metrics.ts`), pure functions with no I/O:
  - `computeCategoryAccuracy`, `computeIntentAccuracy`, `computeDecisionAccuracy` — accuracy over
    whichever examples have actually been analyzed so far (pending/unanalyzed examples are
    excluded from the denominator, not counted as wrong).
  - `computeClassMetrics(examples, level)` — precision, recall, and support for one attention
    level; `precision`/`recall` are `null` (not `0`) when the system never predicted that class,
    or the golden set has no instances of it, respectively.
  - `summarizeEvaluation` — bundles all of the above plus dataset size / evaluated / pending
    counts, ready for the UI.
- **`/evaluation` page**: shows how many golden examples have been analyzed, decision/category/
  intent accuracy, a precision/recall/support table per attention level, and a per-example
  expected-vs-actual list.
- **Feedback**: a `user_feedback` table (migration `0003`) and `POST
  /api/communications/[id]/feedback` capture `IMPORTANT` / `NOT_IMPORTANT` / `DISMISS` per
  communication, surfaced as three buttons on the Communication Detail page. Per the brief, this
  is captured for future evaluation/personalization only — no ML personalization is built from
  it in this capstone.

## Verified

- `npx tsc --noEmit` — passes.
- `npm run lint` — passes.
- `npm test` — 46/46 passing (12 new tests since Phase 2):
  - `generateExplanation`: happy path, prompt grounding (contains the exact amount/level/matched
    context passed in, nothing else), model refusal, failed schema validation.
  - `processCommunication`: extended to assert the explanation is generated and passed to
    `saveAttentionDecision`, and that an explanation failure still results in a successful
    decision save with a `null` explanation (not a pipeline failure).
  - `lib/evaluation/metrics`: accuracy with/without pending examples, fractional accuracy,
    precision/recall/support for a class with true/false positives/negatives, `null` handling
    when a class was never predicted or never occurred, and the `summarizeEvaluation` rollup.
- `npm run build` — production build succeeds; `/evaluation` and the new feedback API route are
  correctly dynamic.
- `npm run dev` — verified via `curl`: `/`, `/communications`, and `/evaluation` all render
  (again showing "Supabase is not configured" — see Known limitations).
- **Golden-label methodology verification**: a one-off script constructed the same "idealized
  extraction" facts I used for each of the 44 hand calculations and ran them through the actual
  `decideAttention()` function; all 44 matched the frozen labels in `scripts/golden-labels.ts`
  before they were committed. This wasn't kept as a permanent script (it would only ever
  duplicate the frozen data), but the check happened and is recorded here for transparency.

## Evaluation results

**Not measured in this environment, and this is stated honestly rather than invented.** This
sandbox has no OpenAI API key and no live Supabase project (see Phase 1/2 limitations), so no
communication has actually been run through the real AI extraction pipeline. `/evaluation`
reflects that truthfully: with a fresh, empty `attention_decisions` table it shows "0 of 44
golden examples analyzed" and no accuracy numbers, rather than fabricated percentages.

Once you provide real `OPENAI_API_KEY` / `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` values,
run the migrations, `npm run seed`, and analyze the communications (from `/communications`, via
"Analyze All"), `/evaluation` will compute and display real, live metrics — decision accuracy,
category/intent accuracy, and per-level precision/recall — automatically, since it queries
current data on every page load rather than a stored snapshot.

## Known limitations

- Same environment constraint as Phases 1–2: no live OpenAI/Supabase credentials here, so
  extraction/decision/explanation accuracy has not been measured against the real model.
- The golden dataset's attention-level ground truth depends on my own idealized-extraction
  judgment calls for ambiguous cases (e.g., whether a conditional "contact us if this wasn't you"
  counts as a requested action) — documented inline in `scripts/golden-labels.ts`'s companion
  reasoning, not hidden.
- Explanation quality (concise / actionable / non-invented) is enforced by prompt instructions
  and grounding in the given facts, but is not automatically scored — the brief allows a "simple
  manual evaluation mechanism" here, and the `/evaluation` per-example list plus the Communication
  Detail page are that mechanism: a human can read each `why_it_matters` / `what_you_can_do` pair
  next to the source facts and judge them directly.
- `dataset_split` is tracked and enforced in the schema/labels, but nothing currently prevents
  someone from looking at `test`-split results while iterating — it's a discipline, not a
  technical barrier, appropriate for a single-developer capstone.
