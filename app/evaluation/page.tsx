import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listEvaluationExamples, type EvaluationExampleRow } from "@/lib/db/evaluation";
import { isSupabaseConfigured } from "@/lib/config";
import { ATTENTION_LEVELS } from "@/lib/decision-engine/types";
import { summarizeEvaluation } from "@/lib/evaluation/metrics";

export const dynamic = "force-dynamic";

function formatPct(value: number | null): string {
  return value != null ? `${Math.round(value * 100)}%` : "—";
}

export default async function EvaluationPage() {
  if (!isSupabaseConfigured()) {
    return (
      <EmptyShell
        title="Supabase is not configured"
        message="Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local to view evaluation results."
      />
    );
  }

  let examples;
  try {
    examples = await listEvaluationExamples();
  } catch (error) {
    return (
      <EmptyShell
        title="Could not load the evaluation dataset"
        message={error instanceof Error ? error.message : "Unknown error"}
      />
    );
  }

  if (examples.length === 0) {
    return (
      <EmptyShell
        title="No evaluation dataset yet"
        message="Run `npm run seed` to load the golden dataset (scripts/golden-labels.ts, frozen ground truth for the sample communications)."
      />
    );
  }

  const sections = [
    {
      key: "golden",
      title: "Golden set (synthetic samples)",
      note: "Frozen, hand-labeled sample communications.",
    },
    {
      key: "gmail",
      title: "Real Gmail (hand-reviewed labels)",
      note: "Labels cover attention level only, so category and intent accuracy do not apply.",
    },
  ] as const;

  return (
    <main className="mx-auto max-w-4xl space-y-10 p-8">
      <h1 className="text-2xl font-semibold">Evaluation</h1>
      {sections.map((section) => {
        const rows = examples.filter((e) => e.dataset === section.key);
        if (rows.length === 0) return null;
        return <EvaluationSection key={section.key} title={section.title} note={section.note} examples={rows} />;
      })}
    </main>
  );
}

function EvaluationSection({
  title,
  note,
  examples,
}: {
  title: string;
  note: string;
  examples: EvaluationExampleRow[];
}) {
  const summary = summarizeEvaluation(examples);

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {summary.evaluatedCount} of {summary.totalDatasetSize} examples analyzed
          {summary.pendingCount > 0 && ` · ${summary.pendingCount} pending analysis`} · {note}
        </p>
      </div>

      {summary.evaluatedCount === 0 ? (
        <EmptyShell
          title="No metrics yet — nothing in this dataset has been analyzed"
          message="Go to Communications and run Analyze All (this requires a configured OpenAI API key), then come back to this page."
        />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <MetricCard label="Decision accuracy" value={summary.decisionAccuracy} />
            <MetricCard label="Category accuracy" value={summary.categoryAccuracy} />
            <MetricCard label="Intent accuracy" value={summary.intentAccuracy} />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Per-level precision / recall (attention decision)</CardTitle>
            </CardHeader>
            <CardContent>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground">
                    <th className="py-1 font-medium">Level</th>
                    <th className="py-1 font-medium">Precision</th>
                    <th className="py-1 font-medium">Recall</th>
                    <th className="py-1 font-medium">Support</th>
                  </tr>
                </thead>
                <tbody>
                  {ATTENTION_LEVELS.map((level) => {
                    const m = summary.perLevel[level];
                    return (
                      <tr key={level} className="border-t">
                        <td className="py-1.5">{level}</td>
                        <td className="py-1.5">{formatPct(m.precision)}</td>
                        <td className="py-1.5">{formatPct(m.recall)}</td>
                        <td className="py-1.5 text-muted-foreground">{m.support}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Examples</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {examples
                .filter((e) => e.actual_attention_level)
                .map((e) => (
                  <div
                    key={e.communication_id}
                    className="flex flex-wrap items-center justify-between gap-2 border-b pb-2 last:border-0"
                  >
                    <span className="max-w-[40%] truncate">{e.subject}</span>
                    <Badge variant="outline">{e.dataset_split}</Badge>
                    <span className="text-muted-foreground">expected</span>
                    <Badge variant="secondary">{e.expected_attention_level}</Badge>
                    <span className="text-muted-foreground">actual</span>
                    <Badge
                      variant={
                        e.actual_attention_level === e.expected_attention_level
                          ? "secondary"
                          : "destructive"
                      }
                    >
                      {e.actual_attention_level}
                    </Badge>
                  </div>
                ))}
            </CardContent>
          </Card>
        </>
      )}
    </section>
  );
}

function MetricCard({ label, value }: { label: string; value: number | null }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-sm text-muted-foreground">{label}</div>
        <div className="text-2xl font-semibold">{formatPct(value)}</div>
      </CardContent>
    </Card>
  );
}

function EmptyShell({ title, message }: { title: string; message: string }) {
  return (
    <main className="mx-auto max-w-2xl p-8">
      <div className="rounded-md border border-dashed p-8 text-center">
        <h1 className="text-lg font-semibold">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{message}</p>
      </div>
    </main>
  );
}
