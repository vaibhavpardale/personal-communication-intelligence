import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AnalyzeAllButton } from "@/components/communications/analyze-all-button";
import { AnalyzeButton } from "@/components/communications/analyze-button";
import { listCommunicationsWithAttention } from "@/lib/db/communications";
import { isSupabaseConfigured } from "@/lib/config";
import { LEVEL_META } from "@/lib/decision-engine/level-meta";

export const dynamic = "force-dynamic";

const LEVEL_FILTERS = ["ACT_NOW", "REVIEW", "WATCH", "LOW_PRIORITY", "NO_ACTION"] as const;
const SOURCE_FILTERS = [
  { value: "", label: "All sources" },
  { value: "gmail", label: "Gmail" },
  { value: "sample", label: "Sample" },
];

type Filters = { level?: string; source?: string; q?: string };

function hrefWith(current: Filters, change: Partial<Filters>): string {
  const next = { ...current, ...change };
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(next)) if (value) params.set(key, value);
  const qs = params.toString();
  return qs ? `/communications?${qs}` : "/communications";
}

export default async function CommunicationsPage({
  searchParams,
}: {
  searchParams: Promise<Filters>;
}) {
  const filters = await searchParams;
  if (!isSupabaseConfigured()) {
    return (
      <EmptyState
        title="Supabase is not configured"
        message="Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local, run the migration in supabase/migrations, and seed sample data with `npm run seed`."
      />
    );
  }

  let communications;
  try {
    communications = await listCommunicationsWithAttention();
  } catch (error) {
    return (
      <EmptyState
        title="Could not load communications"
        message={error instanceof Error ? error.message : "Unknown error"}
      />
    );
  }

  if (communications.length === 0) {
    return (
      <EmptyState
        title="No communications yet"
        message="Run `npm run seed` to load the sample dataset."
      />
    );
  }

  const unanalyzedCount = communications.filter((c) => !c.analysis).length;
  const query = filters.q?.trim().toLowerCase() ?? "";
  const visible = communications.filter((c) => {
    if (filters.source && c.source !== filters.source) return false;
    if (filters.level === "UNANALYZED" ? Boolean(c.attention) : filters.level && c.attention?.level !== filters.level) return false;
    if (query && !`${c.subject} ${c.sender} ${c.sender_name ?? ""}`.toLowerCase().includes(query)) return false;
    return true;
  });

  return (
    <main className="mx-auto max-w-5xl p-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Communications</h1>
          <p className="text-sm text-muted-foreground">
            Showing {visible.length} of {communications.length} · {unanalyzedCount} awaiting analysis
          </p>
        </div>
        <AnalyzeAllButton />
      </div>

      <div className="mb-4 space-y-3">
        <form action="/communications" className="flex gap-2">
          {filters.level && <input type="hidden" name="level" value={filters.level} />}
          {filters.source && <input type="hidden" name="source" value={filters.source} />}
          <input
            type="search"
            name="q"
            defaultValue={filters.q ?? ""}
            placeholder="Search sender or subject"
            className="h-8 w-full max-w-sm rounded-lg border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          />
          <button type="submit" className="h-8 rounded-lg border px-3 text-sm hover:bg-muted">
            Search
          </button>
        </form>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <FilterChip href={hrefWith(filters, { level: "" })} active={!filters.level}>
            All levels
          </FilterChip>
          {LEVEL_FILTERS.map((level) => (
            <FilterChip key={level} href={hrefWith(filters, { level })} active={filters.level === level}>
              <span className={`mr-1.5 inline-block size-2 rounded-full ${LEVEL_META[level].dot}`} />
              {LEVEL_META[level].label}
            </FilterChip>
          ))}
          <FilterChip href={hrefWith(filters, { level: "UNANALYZED" })} active={filters.level === "UNANALYZED"}>
            Not analyzed
          </FilterChip>
          <span className="mx-1 h-4 w-px bg-border" />
          {SOURCE_FILTERS.map((src) => (
            <FilterChip
              key={src.value}
              href={hrefWith(filters, { source: src.value })}
              active={(filters.source ?? "") === src.value}
            >
              {src.label}
            </FilterChip>
          ))}
        </div>
      </div>

      {visible.length === 0 && (
        <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
          Nothing matches these filters. <Link href="/communications" className="underline">Clear filters</Link>
        </p>
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Sender</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Attention</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.map((c) => (
              <TableRow key={c.id}>
                <TableCell>
                  <Link href={`/communications/${c.id}`} className="hover:underline">
                    <div className="font-medium">{c.sender_name ?? c.sender}</div>
                    <div className="text-xs text-muted-foreground">{c.sender}</div>
                  </Link>
                </TableCell>
                <TableCell className="max-w-xs">
                  <Link href={`/communications/${c.id}`} className="hover:underline">
                    {c.subject}
                  </Link>
                </TableCell>
                <TableCell>
                  {c.analysis ? (
                    <Badge variant="secondary">{c.analysis.category}</Badge>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>
                  {c.attention ? (
                    <Badge variant={LEVEL_META[c.attention.level].badgeVariant}>
                      {LEVEL_META[c.attention.level].label}
                    </Badge>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                  {new Date(c.received_at).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  {c.analysis ? <Badge>Analyzed</Badge> : <Badge variant="outline">Not analyzed</Badge>}
                </TableCell>
                <TableCell className="text-right">
                  {!c.analysis && <AnalyzeButton communicationId={c.id} />}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </main>
  );
}

function FilterChip({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "true" : undefined}
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs transition-colors ${
        active ? "border-foreground bg-foreground text-background" : "text-muted-foreground hover:bg-muted"
      }`}
    >
      {children}
    </Link>
  );
}

function EmptyState({ title, message }: { title: string; message: string }) {
  return (
    <main className="mx-auto max-w-2xl p-8">
      <div className="rounded-md border border-dashed p-8 text-center">
        <h1 className="text-lg font-semibold">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{message}</p>
      </div>
    </main>
  );
}
