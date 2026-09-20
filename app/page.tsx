import Link from "next/link";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AnalyzeAllButton } from "@/components/communications/analyze-all-button";
import { listCommunicationsWithAttention } from "@/lib/db/communications";
import { isSupabaseConfigured } from "@/lib/config";
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
  try {
    communications = await listCommunicationsWithAttention();
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
        action={<Button render={<Link href="/communications">Go to Communications</Link>} />}
      />
    );
  }

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

  return (
    <main className="mx-auto max-w-3xl space-y-8 p-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">What needs my attention?</h1>
          <p className="mt-1 text-muted-foreground">
            {needsAttentionCount} thing{needsAttentionCount === 1 ? "" : "s"} need action or review
          </p>
        </div>
        {unanalyzed.length > 0 && <AnalyzeAllButton />}
      </div>

      {NEEDS_ATTENTION_LEVELS.map((level) => {
        const items = byLevel.get(level);
        if (!items || items.length === 0) return null;
        return <LevelSection key={level} level={level} items={items} />;
      })}

      <EverythingElseSection count={everythingElseCount} />
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
    <section>
      <div className="mb-3 flex items-center gap-2">
        <Badge variant={meta.badgeVariant}>{meta.label.toUpperCase()}</Badge>
        <span className="text-sm text-muted-foreground">
          {items.length} item{items.length === 1 ? "" : "s"}
        </span>
      </div>
      <div className="space-y-2">
        {items.map((c) => (
          <Link
            key={c.id}
            href={`/communications/${c.id}`}
            className="block rounded-md border p-3 transition-colors hover:bg-muted"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium">{c.subject}</span>
              {c.analysis && <Badge variant="outline">{c.analysis.category}</Badge>}
            </div>
            {c.attention && (
              <p className="mt-1 text-sm text-muted-foreground">{c.attention.reason}</p>
            )}
          </Link>
        ))}
      </div>
    </section>
  );
}

function EverythingElseSection({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <section className="border-t pt-6">
      <Link href="/communications" className="text-sm text-muted-foreground hover:underline">
        Everything else · {count} communication{count === 1 ? "" : "s"} →
      </Link>
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
