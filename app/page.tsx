import Link from "next/link";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AnalyzeAllButton } from "@/components/communications/analyze-all-button";
import { ItemActions } from "@/components/communications/item-actions";
import { SyncButton } from "@/components/gmail/sync-button";
import { SampleToggle } from "@/components/sample-toggle";
import { isGmailConfigured, isSupabaseConfigured } from "@/lib/config";
import { listCommunicationsWithAttention } from "@/lib/db/communications";
import { getActiveGmailConnection } from "@/lib/db/gmail-connection";
import { LEVEL_META } from "@/lib/decision-engine/level-meta";
import type { AttentionLevel } from "@/lib/decision-engine/types";
import { shouldShowSample } from "@/lib/sample-visibility";
import { formatRelative } from "@/lib/utils";
import type { CommunicationWithAttention } from "@/types/attention";

export const dynamic = "force-dynamic";

const NEEDS_ATTENTION_LEVELS: AttentionLevel[] = ["ACT_NOW", "REVIEW", "WATCH"];

type Tab = "attention" | AttentionLevel | "low" | "done";

const isUnread = (c: CommunicationWithAttention) => (c.user_status ?? "unread") === "unread";
const isLowOrNoise = (c: CommunicationWithAttention) =>
  !c.attention || c.attention.level === "LOW_PRIORITY" || c.attention.level === "NO_ACTION";

export default async function Home({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab: tabParam } = await searchParams;

  if (!isSupabaseConfigured()) {
    return (
      <EmptyShell
        title="Supabase is not configured"
        message="Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local, run the migrations in supabase/migrations, and seed sample data with `npm run seed`."
      />
    );
  }

  let all: CommunicationWithAttention[];
  let gmailConnected = false;
  try {
    all = await listCommunicationsWithAttention();
    gmailConnected = isGmailConfigured() && Boolean(await getActiveGmailConnection());
  } catch (error) {
    return (
      <EmptyShell
        title="Could not load your attention feed"
        message={error instanceof Error ? error.message : "Unknown error"}
      />
    );
  }

  if (all.length === 0) {
    return (
      <EmptyShell
        title="No communications yet"
        message="Sync Gmail from Settings, or run `npm run seed` to load sample data."
        action={<Button nativeButton={false} render={<Link href="/settings">Go to Settings</Link>} />}
      />
    );
  }

  // Sample (golden-set) data is hidden by default once real Gmail mail exists; the switch overrides.
  const hasGmail = all.some((c) => c.source === "gmail");
  const showSample = await shouldShowSample(hasGmail);
  const sampleCount = all.filter((c) => c.source === "sample").length;
  const visible = showSample ? all : all.filter((c) => c.source !== "sample");

  const unread = visible.filter(isUnread);
  const done = visible.filter((c) => !isUnread(c));
  const unanalyzedCount = unread.filter((c) => !c.attention).length;

  const byLevel = (level: AttentionLevel) => unread.filter((c) => c.attention?.level === level);
  const needsAttention = NEEDS_ATTENTION_LEVELS.flatMap(byLevel);
  const lowAndNoise = unread.filter(isLowOrNoise);

  const tab: Tab =
    tabParam === "done" || tabParam === "low" || (NEEDS_ATTENTION_LEVELS as string[]).includes(tabParam ?? "")
      ? (tabParam as Tab)
      : "attention";

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: "attention", label: "Needs attention", count: needsAttention.length },
    ...NEEDS_ATTENTION_LEVELS.map((level) => ({
      key: level as Tab,
      label: LEVEL_META[level].label,
      count: byLevel(level).length,
    })),
    { key: "low", label: "Low priority & noise", count: lowAndNoise.length },
    { key: "done", label: "Done & hidden", count: done.length },
  ];

  return (
    <main className="mx-auto max-w-4xl space-y-6 p-6 sm:p-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">What needs my attention?</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {needsAttention.length === 0
              ? "All caught up."
              : `${needsAttention.length} item${needsAttention.length === 1 ? "" : "s"} to deal with`}
            {" · "}
            {unread.length} unread of {visible.length}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          {sampleCount > 0 && <SampleToggle on={showSample} />}
          {gmailConnected && <SyncButton />}
          {unanalyzedCount > 0 && <AnalyzeAllButton />}
        </div>
      </header>

      <nav className="-mx-1 flex flex-wrap gap-1 border-b pb-2" aria-label="Attention views">
        {tabs.map((t) => {
          const active = t.key === tab;
          return (
            <Link
              key={t.key}
              href={t.key === "attention" ? "/" : `/?tab=${t.key}`}
              aria-current={active ? "page" : undefined}
              className={`inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors ${
                active ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted"
              }`}
            >
              {t.key in LEVEL_META && (
                <span className={`size-2 rounded-full ${LEVEL_META[t.key as AttentionLevel].dot}`} />
              )}
              {t.label}
              <span className={`text-xs ${active ? "opacity-80" : "opacity-60"}`}>{t.count}</span>
            </Link>
          );
        })}
      </nav>

      {tab === "attention" &&
        (needsAttention.length === 0 ? (
          <CaughtUp />
        ) : (
          NEEDS_ATTENTION_LEVELS.map((level) => {
            const items = byLevel(level);
            if (items.length === 0) return null;
            const meta = LEVEL_META[level];
            return (
              <section key={level} className="space-y-3">
                <h2 className="flex items-center gap-2 text-sm font-semibold">
                  <span className={`size-2.5 rounded-full ${meta.dot}`} />
                  {meta.label}
                  <span className="font-normal text-muted-foreground">· {meta.description}</span>
                </h2>
                {items.map((c) => (
                  <FeedItem key={c.id} item={c} />
                ))}
              </section>
            );
          })
        ))}

      {(NEEDS_ATTENTION_LEVELS as string[]).includes(tab) &&
        (byLevel(tab as AttentionLevel).length === 0 ? (
          <CaughtUp />
        ) : (
          <div className="space-y-3">
            {byLevel(tab as AttentionLevel).map((c) => (
              <FeedItem key={c.id} item={c} />
            ))}
          </div>
        ))}

      {tab === "low" && <CompactList items={lowAndNoise} empty="Nothing here." />}
      {tab === "done" && <CompactList items={done} empty="Nothing marked done or hidden yet." />}
    </main>
  );
}

function FeedItem({ item: c }: { item: CommunicationWithAttention }) {
  const meta = c.attention ? LEVEL_META[c.attention.level] : null;
  return (
    <article className={`flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-start ${meta?.tint ?? ""}`}>
      <Link href={`/communications/${c.id}`} className="min-w-0 flex-1 space-y-1 hover:opacity-90">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="truncate">
            {c.sender_name ?? c.sender} · {formatRelative(c.received_at)}
            {c.source === "sample" && " · sample"}
          </span>
          {c.analysis && (
            <Badge variant="outline" className="shrink-0">
              {c.analysis.category}
            </Badge>
          )}
        </div>
        <h3 className="font-medium leading-snug">{c.subject}</h3>
        {c.attention && (
          <>
            <p className="line-clamp-2 text-sm text-foreground/80">
              {c.attention.why_it_matters ?? c.attention.reason}
            </p>
            {c.attention.what_you_can_do && (
              <p className="line-clamp-2 text-sm text-muted-foreground">
                <span className="font-medium text-foreground">Next: </span>
                {c.attention.what_you_can_do}
              </p>
            )}
          </>
        )}
      </Link>
      <ItemActions id={c.id} status="unread" className="shrink-0 sm:flex-col sm:items-stretch" />
    </article>
  );
}

function CompactList({ items, empty }: { items: CommunicationWithAttention[]; empty: string }) {
  if (items.length === 0) {
    return <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">{empty}</p>;
  }
  return (
    <ul className="divide-y rounded-lg border text-sm">
      {items.map((c) => (
        <li key={c.id} className="flex flex-wrap items-center gap-3 px-3 py-2">
          <span
            className={`size-2 shrink-0 rounded-full ${c.attention ? LEVEL_META[c.attention.level].dot : "bg-border"}`}
          />
          <Link href={`/communications/${c.id}`} className="min-w-0 flex-1 truncate hover:underline">
            <span className="text-muted-foreground">{c.sender_name ?? c.sender} · </span>
            {c.subject}
          </Link>
          <span className="shrink-0 text-xs text-muted-foreground">{formatRelative(c.received_at)}</span>
          <Badge variant="outline" className="shrink-0">
            {c.attention ? LEVEL_META[c.attention.level].label : "Not analyzed"}
          </Badge>
          <ItemActions id={c.id} status={c.user_status ?? "unread"} />
        </li>
      ))}
    </ul>
  );
}

function CaughtUp() {
  return (
    <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
      All caught up. Nothing needs your attention here.
    </p>
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
