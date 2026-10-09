import Link from "next/link";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AnalyzeAllButton } from "@/components/communications/analyze-all-button";
import { DetailPanel } from "@/components/communications/detail-panel";
import { SyncButton } from "@/components/gmail/sync-button";
import { SampleToggle } from "@/components/sample-toggle";
import { isGmailConfigured, isSupabaseConfigured } from "@/lib/config";
import { listCommunicationsWithAttention } from "@/lib/db/communications";
import { getActiveGmailConnection } from "@/lib/db/gmail-connection";
import { LEVEL_META } from "@/lib/decision-engine/level-meta";
import type { AttentionLevel } from "@/lib/decision-engine/types";
import { getGmailLabel } from "@/lib/db/evaluation";
import { shouldShowSample } from "@/lib/sample-visibility";
import { formatRelative } from "@/lib/utils";
import type { CommunicationWithAttention } from "@/types/attention";

export const dynamic = "force-dynamic";

const NEEDS_ATTENTION_LEVELS: AttentionLevel[] = ["ACT_NOW", "REVIEW", "WATCH"];

type Tab = "attention" | AttentionLevel | "low" | "done" | "hidden";

const isUnread = (c: CommunicationWithAttention) => (c.user_status ?? "unread") === "unread";
const isLowOrNoise = (c: CommunicationWithAttention) =>
  !c.attention || c.attention.level === "LOW_PRIORITY" || c.attention.level === "NO_ACTION";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; id?: string }>;
}) {
  const { tab: tabParam, id: idParam } = await searchParams;

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
  const done = visible.filter((c) => c.user_status === "read");
  const hidden = visible.filter((c) => c.user_status === "hidden");
  const unanalyzedCount = unread.filter((c) => !c.attention).length;

  const byLevel = (level: AttentionLevel) => unread.filter((c) => c.attention?.level === level);
  const needsAttention = NEEDS_ATTENTION_LEVELS.flatMap(byLevel);
  const lowAndNoise = unread.filter(isLowOrNoise);

  const tab: Tab =
    tabParam === "done" || tabParam === "hidden" || tabParam === "low" || (NEEDS_ATTENTION_LEVELS as string[]).includes(tabParam ?? "")
      ? (tabParam as Tab)
      : "attention";

  const list = tab === "attention" ? needsAttention : tab === "low" ? lowAndNoise : tab === "done" ? done : tab === "hidden" ? hidden : byLevel(tab);
  const hrefFor = (id: string) => (tab === "attention" ? `/?id=${id}` : `/?tab=${tab}&id=${id}`);
  const explicitItem = idParam ? list.find((c) => c.id === idParam) : undefined;
  const selectedExplicit = Boolean(explicitItem);
  // With nothing chosen (or the chosen item just handled), the first item opens on wide screens.
  const selected = explicitItem ?? list[0];
  const selectedIndex = selected ? list.indexOf(selected) : -1;
  const neighbour = selectedIndex >= 0 ? (list[selectedIndex + 1] ?? list[selectedIndex - 1]) : undefined;
  const evalLabel = selected && selected.source !== "sample" ? await getGmailLabel(selected.id) : null;
  const nextHref = neighbour ? hrefFor(neighbour.id) : tab === "attention" ? "/" : `/?tab=${tab}`;

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: "attention", label: "Needs attention", count: needsAttention.length },
    ...NEEDS_ATTENTION_LEVELS.map((level) => ({
      key: level as Tab,
      label: LEVEL_META[level].label,
      count: byLevel(level).length,
    })),
    { key: "low", label: "Low priority & noise", count: lowAndNoise.length },
    { key: "done", label: "Done", count: done.length },
    { key: "hidden", label: "Hidden", count: hidden.length },
  ];

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-6 sm:p-8">
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

      <div className="grid gap-6 lg:grid-cols-[380px_minmax(0,1fr)]">
        <section className={`space-y-5 ${selectedExplicit ? "hidden lg:block" : ""}`}>
          {list.length === 0 && (
            <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
              {tab === "done"
                ? "Nothing marked done yet. Use Done when you've seen or handled an item."
                : tab === "hidden"
                  ? "Nothing hidden. Use Hide for items that aren't relevant to you."
                  : "All caught up. Nothing here."}
            </p>
          )}
          {tab === "attention"
            ? NEEDS_ATTENTION_LEVELS.map((level) => {
                const items = byLevel(level);
                if (items.length === 0) return null;
                const meta = LEVEL_META[level];
                return (
                  <div key={level} className="space-y-2">
                    <h2 className="flex items-center gap-2 text-sm font-semibold">
                      <span className={`size-2.5 rounded-full ${meta.dot}`} />
                      {meta.label}
                      <span className="font-normal text-muted-foreground">· {meta.description}</span>
                    </h2>
                    {items.map((c) => (
                      <ListRow key={c.id} item={c} href={hrefFor(c.id)} selected={c.id === selected?.id} />
                    ))}
                  </div>
                );
              })
            : list.map((c) => (
                <ListRow key={c.id} item={c} href={hrefFor(c.id)} selected={c.id === selected?.id} />
              ))}
        </section>

        <aside className={`${selectedExplicit ? "" : "hidden lg:block"}`}>
          {selected ? (
            <div className="lg:sticky lg:top-16 lg:max-h-[calc(100vh-5rem)] lg:overflow-y-auto lg:rounded-xl lg:border lg:p-5">
              <Link
                href={tab === "attention" ? "/" : `/?tab=${tab}`}
                className="mb-4 inline-block text-sm text-muted-foreground hover:underline lg:hidden"
              >
                ← Back to list
              </Link>
              <DetailPanel communication={selected} afterActionHref={nextHref} evalLabel={evalLabel} />
            </div>
          ) : (
            <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
              Select an item to see why it matters and what to do.
            </p>
          )}
        </aside>
      </div>
    </main>
  );
}

function ListRow({
  item: c,
  href,
  selected,
}: {
  item: CommunicationWithAttention;
  href: string;
  selected: boolean;
}) {
  const meta = c.attention ? LEVEL_META[c.attention.level] : null;
  return (
    <Link
      href={href}
      aria-current={selected ? "true" : undefined}
      className={`block rounded-lg border p-3 transition-colors ${
        selected ? "border-foreground/40 bg-muted" : "hover:bg-muted/60"
      }`}
    >
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className={`size-2 shrink-0 rounded-full ${meta?.dot ?? "bg-border"}`} />
        <span className="truncate">
          {c.sender_name ?? c.sender}
          {c.source === "sample" && " · sample"}
        </span>
        <span className="ml-auto shrink-0">{formatRelative(c.received_at)}</span>
      </div>
      <h3 className="mt-1 line-clamp-2 text-sm font-medium leading-snug">{c.subject}</h3>
      {c.attention && (
        <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
          {c.attention.why_it_matters ?? c.attention.reason}
        </p>
      )}
    </Link>
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
