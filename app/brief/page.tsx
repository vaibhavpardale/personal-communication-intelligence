import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { CopyBrief } from "@/components/communications/copy-brief";
import { isSupabaseConfigured } from "@/lib/config";
import { listCommunicationsWithAttention } from "@/lib/db/communications";
import { briefToText, buildBrief, type BriefItem } from "@/lib/brief";
import { LEVEL_META } from "@/lib/decision-engine/level-meta";
import { shouldShowSample } from "@/lib/sample-visibility";

export const dynamic = "force-dynamic";

function when(days: number | null): string | null {
  if (days === null) return null;
  if (days < 0) return `${-days} day${days === -1 ? "" : "s"} overdue`;
  if (days === 0) return "due today";
  if (days === 1) return "due tomorrow";
  return `due in ${days} days`;
}

export default async function BriefPage() {
  if (!isSupabaseConfigured()) {
    return (
      <main className="mx-auto max-w-2xl p-8">
        <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          Connect Supabase first (see Settings) to see your brief.
        </p>
      </main>
    );
  }

  const all = await listCommunicationsWithAttention();
  const hasGmail = all.some((c) => c.source === "gmail");
  const communications = (await shouldShowSample(hasGmail)) ? all : all.filter((c) => c.source !== "sample");

  const now = new Date();
  const brief = buildBrief(communications, now);
  const today = now.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" });

  return (
    <main className="mx-auto max-w-3xl space-y-8 p-6 sm:p-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-primary">{today}</p>
          <h1 className="text-3xl font-semibold tracking-tight">{brief.headline}</h1>
          <p className="mt-1 text-muted-foreground">
            Heed read {brief.total} unread message{brief.total === 1 ? "" : "s"}. Here is what matters, and nothing else.
          </p>
        </div>
        <CopyBrief text={briefToText(brief, now)} />
      </header>

      <Section title="Needs you" items={brief.needsYou} empty="Nothing needs a decision from you." />
      <Section title="Coming this week" items={brief.thisWeek} empty="No other dated items this week." />

      <p className="rounded-xl bg-muted/60 p-4 text-sm text-muted-foreground">
        Filed away for you: {brief.filed.watch} to keep an eye on, and {brief.filed.quiet} low priority or noise that you can skip.{" "}
        <Link href="/?tab=low" className="font-medium text-primary hover:underline">
          See what was filed
        </Link>
      </p>
    </main>
  );
}

function Section({ title, items, empty }: { title: string; items: BriefItem[]; empty: string }) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">{title}</h2>
      {items.length === 0 ? (
        <p className="rounded-xl border border-dashed p-5 text-sm text-muted-foreground">{empty}</p>
      ) : (
        <ul className="space-y-3">
          {items.map((i) => {
            const meta = LEVEL_META[i.level];
            const due = when(i.days);
            return (
              <li key={i.id}>
                <Link href={`/?id=${i.id}`} className={`block rounded-2xl border p-4 transition-shadow hover:shadow-md ${meta.tint}`}>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span className={`size-2 rounded-full ${meta.dot}`} />
                    <span className="font-medium text-foreground/80">{meta.label}</span>
                    <span>{i.sender}</span>
                    {due && (
                      <Badge variant="outline" className={i.days !== null && i.days < 0 ? "border-destructive/40 text-destructive" : ""}>
                        {due}
                      </Badge>
                    )}
                  </div>
                  <div className="mt-1 font-medium leading-snug">{i.subject}</div>
                  {i.next && (
                    <p className="mt-2 text-sm text-muted-foreground">
                      <span className="font-medium text-foreground">Next: </span>
                      {i.next}
                    </p>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
