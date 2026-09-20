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

export default async function CommunicationsPage() {
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

  return (
    <main className="mx-auto max-w-5xl p-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Communications</h1>
          <p className="text-sm text-muted-foreground">
            {communications.length} communications · {unanalyzedCount} awaiting analysis
          </p>
        </div>
        <AnalyzeAllButton />
      </div>

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
            {communications.map((c) => (
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
