import Link from "next/link";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AnalyzeAllButton } from "@/components/communications/analyze-all-button";
import { SyncButton } from "@/components/gmail/sync-button";
import { ItemActions } from "@/components/communications/item-actions";
import { SampleToggle } from "@/components/sample-toggle";
import { shouldShowSample } from "@/lib/sample-visibility";
import { getActiveGmailConnection } from "@/lib/db/gmail-connection";
import { formatRelative } from "@/lib/utils";
import { listCommunicationsWithAttention } from "@/lib/db/communications";
import { isGmailConfigured, isSupabaseConfigured } from "@/lib/config";
import { LEVEL_META } from "@/lib/decision-engine/level-meta";
import type { AttentionLevel } from "@/lib/decision-engine/types";
import type { CommunicationWithAttention } from "@/types/attention";

export const dynamic = "force-dynamic";

const NEEDS_ATTENTION_LEVELS: AttentionLevel[] = ["ACT_NOW", "REVIEW", "WATCH"];

export default async function Home() {
  if (!isSupabaseConfigured()) {
    return (
      <EmptyShell
        title="Supabase is not configured"
        message="Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local, run the migrations in supabase/migrations, and seed sample data with `npm run seed`."
      />
    );
  }

  let communications: CommunicationWithAttention[];
  let gmailConnected = false;
  try {
    communications = await listCommunicationsWithAttention();
    gmailConnected = isGmailConfigured() && Boolean(await getActiveGmailConnection());
  } catch (error) {
    return (
      <EmptyShell
        title="Could not load your attention feed"
        message={error instanceof Error ? error.message : "Unknown error"}
      />
    );
  }

  if (communications.length === 0) {
    return (
      <EmptyShell
        title="No communications yet"
        message="Run `npm run seed` to load sample data, then analyze it from the Communications page."
        action={<Button nativeButton={false} render={<Link href="/communications">Go to Communications</Link>} />}
      />
    );
  }

  // Sample (golden-set) data is hidden by default once real Gmail mail exists; the toggle overrides.
  const hasGmail = communications.some((c) => c.source === "gmail");
  const showSample = await shouldShowSample(hasGmail);
  const sampleCount = communications.filter((c) => c.source === "sample").length;
  if (!showSample) communications = communications.filter((c) => c.source !== "sample");

  // Read or hidden items leave the feed; they stay reachable under "Done & hidden".
  const archived = communications.filter((c) => (c.user_status ?? "unread") !== "unread");
  communications = communications.filter((c) => (c.user_status ?? "unread") === "unread");

  const unanalyzed = communications.filter((c) => !c.attention);
  const byLevel = new Map<AttentionLevel, CommunicationWithAttention[]>();
  for (const c of communications) {
    if (!c.attention) continue;
    const list = byLevel.get(c.attention.level) ?? [];
    list.push(c);
    byLevel.set(c.attention.level, list);
  }

  const needsAttentionCount = NEEDS_ATTENTION_LEVELS.reduce(
    (sum, level) => sum + (byLevel.get(level)?.length ?? 0),
    0,
  );
  const everythingElseCount =
    (byLevel.get("LOW_PRIORITY")?.length ?? 0) +
    (byLevel.get("NO_ACTION")?.length ?? 0) +
    unanalyzed.length;

  const everythingElse = communications.filter(
    (c) => !c.attention || c.attention.level === "LOW_PRIORITY" || c.attention.level === "NO_ACTION",
  );

  return (
    <main className="mx-auto max-w-3xl space-y-8 p-8">
      <div className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">What needs my attention?</h1>
            <p className="mt-1 text-muted-foreground">
              {needsAttentionCount} thing{needsAttentionCount === 1 ? "" : "s"} need action or review
              out of {communications.length}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            {sampleCount > 0 && <SampleToggle on={showSample} />}
            {gmailConnected && <SyncButton />}
            {unanalyzed.length > 0 && <AnalyzeAllButton />}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {NEEDS_ATTENTION_LEVELS.map((level) => (
            <a
              key={level}
              href={`#${level}`}
              className={`rounded-lg border p-3 transition-shadow hover:shadow-sm ${LEVEL_META[level].tint}`}
            >
              <div className="text-2xl font-semibold">{byLevel.get(level)?.length ?? 0}</div>
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <span className={`size-2 rounded-full ${LEVEL_META[level].dot}`} />
                {LEVEL_META[level].label}
              </div>
            </a>
          ))}
          <a href="#everything-else" className="rounded-lg border p-3 transition-shadow hover:shadow-sm">
            <div className="text-2xl font-semibold">{everythingElseCount}</div>
            <div className="text-sm text-muted-foreground">Everything else</div>
          </a>
        </div>
      </div>

      {NEEDS_ATTENTION_LEVELS.map((level) => {
        const items = byLevel.get(level);
        if (!items || items.length === 0) return null;
        return <LevelSection key={level} level={level} items={items} />;
      })}

      {needsAttentionCount === 0 && (
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          All caught up. Nothing needs your attention right now.
        </p>
      )}

      <EverythingElseSection items={everythingElse} />
      <ArchivedSection items={archived} />
    </main>
  );
}

function LevelSection({
  level,
  items,
}: {
  level: AttentionLevel;
  items: CommunicationWithAttention[];
}) {
  const meta = LEVEL_META[level];
  return (
    <section id={level} className="scroll-mt-20">
      <div className="mb-3 flex items-center gap-2">
        <span className={`size-2.5 rounded-full ${meta.dot}`} />
        <h2 className="font-semibold">{meta.label}</h2>
        <span className="text-sm text-muted-foreground">
          {items.length} item{items.length === 1 ? "" : "s"} · {meta.description}
        </span>
      </div>
      <div className="space-y-3">
        {items.map((c) => (
          <div key={c.id} className={`rounded-lg border transition-shadow hover:shadow-md ${meta.tint}`}>
            <Link href={`/communications/${c.id}`} className="block p-4 pb-2">
              <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                <span className="truncate">
                  {c.sender_name ?? c.sender} · {formatRelative(c.received_at)}
                  {c.source === "sample" && " · sample"}
                </span>
                {c.analysis && <Badge variant="outline">{c.analysis.category}</Badge>}
              </div>
              <div className="mt-1 font-medium">{c.subject}</div>
              {c.attention && (
                <div className="mt-2 space-y-1 text-sm">
                  <p className="text-foreground/80">{c.attention.why_it_matters ?? c.attention.reason}</p>
                  {c.attention.what_you_can_do && (
                    <p className="text-muted-foreground">
                      <span className="font-medium text-foreground">Next: </span>
                      {c.attention.what_you_can_do}
                    </p>
                  )}
                </div>
              )}
            </Link>
            <div className="px-4 pb-3">
              <ItemActions id={c.id} status="unread" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function EverythingElseSection({ items }: { items: CommunicationWithAttention[] }) {
  if (items.length === 0) return null;
  return (
    <section id="everything-else" className="scroll-mt-20 border-t pt-6">
      <details>
        <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
          Everything else · {items.length} communication{items.length === 1 ? "" : "s"} (low priority,
          noise, or not yet analyzed)
        </summary>
        <ul className="mt-3 divide-y rounded-lg border text-sm">
          {items.map((c) => (
            <li key={c.id}>
              <Link
                href={`/communications/${c.id}`}
                className="flex items-center justify-between gap-3 px-3 py-2 hover:bg-muted"
              >
                <span className="truncate">
                  <span className="text-muted-foreground">{c.sender_name ?? c.sender} · </span>
                  {c.subject}
                </span>
                <Badge variant="outline" className="shrink-0">
                  {c.attention ? LEVEL_META[c.attention.level].label : "Not analyzed"}
                </Badge>
              </Link>
            </li>
          ))}
        </ul>
        <Link href="/communications" className="mt-3 inline-block text-sm text-muted-foreground hover:underline">
          Open full list with filters →
        </Link>
      </details>
    </section>
  );
}

function ArchivedSection({ items }: { items: CommunicationWithAttention[] }) {
  if (items.length === 0) return null;
  return (
    <section className="border-t pt-6">
      <details>
        <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
          Done &amp; hidden · {items.length}
        </summary>
        <ul className="mt-3 divide-y rounded-lg border text-sm">
          {items.map((c) => (
            <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
              <Link href={`/communications/${c.id}`} className="min-w-0 flex-1 truncate hover:underline">
                <span className="text-muted-foreground">{c.sender_name ?? c.sender} · </span>
                {c.subject}
              </Link>
              <Badge variant="outline">{c.user_status === "read" ? "Read" : "Hidden"}</Badge>
              <ItemActions id={c.id} status={c.user_status ?? "read"} />
            </li>
          ))}
        </ul>
      </details>
    </section>
  );
}

function EmptyShell({
  title,
  message,
  action,
}: {
  title: string;
  message: string;
  action?: ReactNode;
}) {
  return (
    <main className="mx-auto max-w-2xl p-8">
      <div className="rounded-md border border-dashed p-8 text-center">
        <h1 className="text-lg font-semibold">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{message}</p>
        {action && <div className="mt-4 flex justify-center">{action}</div>}
      </div>
    </main>
  );
}
