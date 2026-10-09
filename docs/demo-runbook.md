# Demo runbook (personal app)

Goal: a clean recording of under three minutes. Everything below is repeatable.

## Before you record

1. **Stop the dev server**, then start a production build so the black "N" development badge does not appear:
   `npm run demo` (builds, then serves on http://localhost:3005).
2. **Check readiness** (read-only, changes nothing): `npm run demo:check`.
   Anything marked ✗ must be fixed; ! items are reminders.
3. **Reset the demo state** if you have rehearsed: `npm run demo:reset` shows what it would change;
   `npm run demo:reset -- --yes` restores Done / Hidden / Snoozed messages to unread and clears VIP and muted
   senders. No emails, analyses or evaluation labels are deleted.
4. **Reconnect Gmail** the same day (Settings → Reconnect Gmail). In Testing mode the token expires after 7 days.
   Sync "Since last sync" shortly before you record so the newest mail is in.
5. **Keep real mail off screen**: set the header menu **Showing** to **Samples only (demo)**. It hides every real
   message on the feed, the brief, the Communications list and the bell. (The older "Sample data" switch showed
   samples *and* your mail.) Do not open the Evaluation page: its examples list contains labeled real emails.
6. Browser: a clean window around 1440 x 900, zoom 110%, bookmarks bar hidden, other notifications muted.

## The flow (about 75 seconds for this app)

| Time | Do | Say (short) |
|---|---|---|
| 0:00 | Attention screen, Showing: Samples only (demo) | "Same engine on my own Gmail, read-only." |
| 0:08 | Sync dropdown → "Yesterday" → Sync now (or just show it, already synced) | "Sync by date. Since last sync is the default." |
| 0:18 | Open the first Act Now item | "It says why it matters and what to do." |
| 0:28 | Click **Done** | "Done clears it and opens the next one." |
| 0:36 | Brief page → Copy as text | "My daily brief: what needs me today." |
| 0:46 | Bell → Settings → Notifications | "It only interrupts on my rules. Of 24 candidates, one." |
| 0:58 | Open an item → This sender → **Mute** | "Noise sender: mute it, and it is filed away." |
| 1:08 | Header toggle → **Phone** | "And it is a phone app too." |

## Troubleshooting

- **"Gmail authorization expired"**: Settings → Reconnect Gmail.
- **Mute / VIP shows an error**: run `supabase/migrations/0007_sender_preferences.sql` in the Supabase SQL editor.
- **Done / Hide shows an error**: run `0006_user_status.sql`. Evaluation Gmail section missing: `0005_gmail_eval_labels.sql`.
- **Supabase unreachable**: the free project may have paused; unpause it in the dashboard.
- **Port 3005 busy**: another copy is running. Stop it, or set `APP_URL` for the check.
- The product name is a working title; change it in `lib/brand.ts`.
