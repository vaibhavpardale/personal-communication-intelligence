# Phase 4: Gmail Integration + Final Product

## What was built

### Gmail OAuth

- `lib/gmail/oauth.ts`: standard OAuth 2.0 Authorization Code flow against Google's real
  endpoints (`accounts.google.com/o/oauth2/v2/auth`, `oauth2.googleapis.com/token`) —
  `buildAuthUrl`, `exchangeCodeForTokens`, `refreshAccessToken`. Requests only
  `https://www.googleapis.com/auth/gmail.readonly` — least privilege; this app cannot send,
  delete, or modify anything in the user's mailbox, only read it.
- `app/api/gmail/auth/route.ts`: redirects to Google's real consent screen. Generates a random
  CSRF `state` value, stored in an httpOnly, `sameSite=lax`, 10-minute cookie. Returns `501` with
  an honest error (not a fake redirect) when `GMAIL_CLIENT_ID`/`SECRET`/`REDIRECT_URI` aren't set.
- `app/api/gmail/callback/route.ts`: verifies the returned `state` against the cookie before
  doing anything else (rejects on mismatch or a Google-reported `error` param), exchanges the
  code for tokens, fetches the connected address via Gmail's own `users.getProfile` endpoint
  (no extra `userinfo` scope needed), and stores the connection.
- Access/refresh tokens are stored server-side in a new `gmail_connections` table, accessed only
  through the Supabase service-role client — never sent to the browser or to OpenAI.
  `lib/gmail/client.ts#getValidAccessToken` refreshes the access token automatically (with a
  60-second buffer) using the stored refresh token, and persists the new token.

### Gmail ingestion — reuses the existing pipeline, does not fork it

- `lib/gmail/normalize.ts#normalizeGmailMessage` maps a raw Gmail API message into the exact same
  `NewCommunication` shape used for sample data (`source: "gmail"`, `source_type: "email"`,
  parsed sender/name, subject, body, received timestamp, plus an `external_id` for idempotent
  re-sync). Body extraction walks the MIME tree for `text/plain` first, falls back to a stripped
  `text/html` part, then the snippet; content is capped at 5,000 characters.
  `POST /api/gmail/sync` then calls `upsertExternalCommunications` (unique on `source,
  external_id`, so re-syncing never creates duplicates) and runs every newly-imported
  communication through **the same** `processCommunication` used by "Analyze"/"Analyze All" for
  sample data — AI understanding, personal context, decision engine, and explanation, unchanged.
  There is no Gmail-specific AI code anywhere.

### Security & data controls

- OAuth client secret and access/refresh tokens never leave the server.
- `/settings` clearly separates two distinct, independently-triggerable actions, matching the
  brief: **Disconnect** (`POST /api/gmail/disconnect`, deletes the stored token row only — nothing
  imported is touched) and **Delete imported Gmail data** (`POST /api/gmail/delete-data`, deletes
  every `communications` row with `source = 'gmail'`, which cascades via foreign keys to delete
  its analysis, attention decision, and feedback rows too — but leaves the connection itself
  intact so syncing can resume).
- Both destructive UI actions require a second click ("click again to confirm") rather than
  firing immediately.

### Final product

- `/settings` is the only new page. When Supabase isn't configured, or Gmail OAuth env vars
  aren't set, it says so plainly — never a Connect button that silently does nothing.
- The attention feed (`/`), Communication Detail, and Evaluation pages required no changes:
  because Gmail communications land in the same `communications` table and go through the same
  pipeline, they simply appear in the existing UI once analyzed.

## Verified

- `npx tsc --noEmit` — passes.
- `npm run lint` — passes.
- `npm test` — 65/65 passing (19 new for this phase):
  - `buildAuthUrl`: correct Google endpoint, `gmail.readonly` scope, all required params.
  - `exchangeCodeForTokens` / `refreshAccessToken`: correct endpoint, correct grant type and
    body params, error propagation with status + body on failure (network mocked).
  - `getValidAccessToken`: returns the cached token when still valid, refreshes and persists a
    new one when expired, throws a clear "please reconnect" error when there's no refresh token.
  - `fetchRecentMessages` / `getProfileEmail`: correct bearer-authenticated requests, correct
    list-then-get sequencing, empty-list handling, error propagation.
  - `normalizeGmailMessage` / `extractMessageContent`: header parsing (with/without a display
    name), `internalDate` fallback when there's no `Date` header, MIME-tree recursion,
    `text/plain` preference over `text/html`, HTML tag/script stripping, snippet fallback,
    content truncation.
- `npm run build` — production build succeeds; every new Gmail route is correctly dynamic.
- `npm run dev` — verified via `curl`: `/settings` renders and (with Supabase/Gmail unconfigured
  in this sandbox) shows the honest "not configured" message; `GET /api/gmail/auth` correctly
  returns `501` rather than attempting a fake redirect; `/`, `/communications`, and `/evaluation`
  are unaffected.

## Known limitations — stated honestly, not worked around

- **The live OAuth consent flow was not walked through end-to-end in this environment**, because
  doing so requires (a) a real Google Cloud project and OAuth client, which this sandbox does not
  have, and (b) a real Google account interactively granting consent in a browser, which is true
  regardless of environment — no amount of local tooling substitutes for a human clicking
  "Allow" on Google's own consent screen. Every piece of code involved (`buildAuthUrl`,
  `exchangeCodeForTokens`, `refreshAccessToken`, `getProfileEmail`, `fetchRecentMessages`,
  the callback route's state-matching logic, and the normalization pipeline) is real, calls
  Google's actual documented endpoints, and is unit-tested against realistic request/response
  shapes — but it has not been exercised against the live Google OAuth servers or a real mailbox.
  To do that yourself: follow "Gmail setup" in the README with your own Google Cloud credentials.
- Sync is a simple "most recent N messages" strategy (default 20, capped at 50 per call) with no
  pagination across calls and no label/category filtering — reasonable for a personal capstone
  demo, not a production ingestion pipeline.
- Message fetches are sequential (one Gmail API call per message), not batched/parallelized —
  fine at capstone volumes, would need a concurrency limit (like `analyze-all`'s batching) at
  larger scale.
- Tokens are stored as plaintext columns in Supabase (protected by the service-role key and
  Supabase's own encryption at rest, but not additionally application-level encrypted). A
  production system would add field-level encryption or a secrets manager; documented here rather
  than silently assumed.
- This remains a single-user, single-connection app by design (per the brief's "not a
  multi-tenant SaaS" instruction) — `gmail_connections` has no user/tenant scoping.
