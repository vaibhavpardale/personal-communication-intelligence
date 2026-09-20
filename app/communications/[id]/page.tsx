import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AnalyzeButton } from "@/components/communications/analyze-button";
import { getCommunicationWithAttention } from "@/lib/db/communications";
import { isSupabaseConfigured } from "@/lib/config";
import { LEVEL_META } from "@/lib/decision-engine/level-meta";
import type { DecisionFactorScores } from "@/lib/decision-engine/types";

export const dynamic = "force-dynamic";

export default async function CommunicationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  if (!isSupabaseConfigured()) {
    return (
      <main className="mx-auto max-w-2xl p-8">
        <div className="rounded-md border border-dashed p-8 text-center">
          <h1 className="text-lg font-semibold">Supabase is not configured</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local to view this
            communication.
          </p>
        </div>
      </main>
    );
  }

  const communication = await getCommunicationWithAttention(id);

  if (!communication) {
    notFound();
  }

  const { analysis, attention } = communication;

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-8">
      <div>
        <Link href="/communications" className="text-sm text-muted-foreground hover:underline">
          ← All communications
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">{communication.subject}</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Original Communication</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <Row label="From" value={`${communication.sender_name ?? "Unknown"} <${communication.sender}>`} />
          <Row label="Received" value={new Date(communication.received_at).toLocaleString()} />
          <Row label="Subject" value={communication.subject} />
          <div>
            <div className="mb-1 font-medium">Content</div>
            <pre className="whitespace-pre-wrap rounded bg-muted p-3 font-sans text-sm">
              {communication.content}
            </pre>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>AI Understanding</CardTitle>
          {!analysis && <AnalyzeButton communicationId={communication.id} />}
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {analysis ? (
            <>
              <div className="flex gap-2">
                <Badge>{analysis.category}</Badge>
                <Badge variant="secondary">{analysis.intent}</Badge>
              </div>
              <Row label="Summary" value={analysis.summary} />
              <Row label="Organization" value={analysis.organization ?? "—"} />
              <Row label="People" value={analysis.people?.join(", ") || "—"} />
              <Row label="Other entities" value={analysis.entities?.join(", ") || "—"} />
              <Row label="Event date" value={analysis.event_date ?? "—"} />
              <Row label="Deadline" value={analysis.deadline ?? "—"} />
              <Row
                label="Amount"
                value={analysis.amount != null ? `${analysis.amount} ${analysis.currency ?? ""}`.trim() : "—"}
              />
              <Row label="Product / service" value={analysis.product_service ?? "—"} />
              <Row label="Reference ID" value={analysis.reference_id ?? "—"} />
              <Row label="Requested action" value={analysis.requested_action ?? "—"} />
              <Row label="Confidence" value={`${Math.round(analysis.confidence * 100)}%`} />
              <Row label="Model" value={analysis.model} />
              <Row label="Prompt version" value={analysis.prompt_version} />
            </>
          ) : (
            <p className="text-muted-foreground">Not yet analyzed.</p>
          )}
        </CardContent>
      </Card>

      {analysis && (
        <Card>
          <CardHeader>
            <CardTitle>Attention Decision</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {attention ? (
              <>
                <Badge variant={LEVEL_META[attention.level].badgeVariant} className="text-sm">
                  {LEVEL_META[attention.level].label}
                </Badge>
                <p>{attention.reason}</p>

                <div>
                  <div className="mb-2 font-medium">Why was this classified this way?</div>
                  <div className="space-y-1">
                    {(Object.keys(attention.scores) as (keyof DecisionFactorScores)[]).map((key) => (
                      <ScoreRow key={key} label={key} value={attention.scores[key]} />
                    ))}
                  </div>
                </div>

                {attention.matched_context && attention.matched_context.length > 0 && (
                  <div>
                    <div className="mb-1 font-medium">Personal context used</div>
                    <ul className="list-inside list-disc text-muted-foreground">
                      {attention.matched_context.map((m, i) => (
                        <li key={i}>
                          {m.key} ({m.context_type}, importance {m.importance}/5) — matched on {m.matched_on}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <Row label="Overall score" value={`${attention.overall_score.toFixed(2)} / 5`} />
                <Row label="Decision version" value={attention.decision_version} />
              </>
            ) : (
              <p className="text-muted-foreground">Not yet decided.</p>
            )}
          </CardContent>
        </Card>
      )}
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[140px_1fr] gap-2">
      <div className="text-muted-foreground">{label}</div>
      <div>{value}</div>
    </div>
  );
}

function ScoreRow({ label, value }: { label: string; value: number }) {
  const niceLabel = label
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
  return (
    <div className="grid grid-cols-[180px_1fr] items-center gap-2">
      <div className="text-muted-foreground">{niceLabel}</div>
      <div className="flex items-center gap-2">
        <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
          <div className="h-full bg-foreground" style={{ width: `${(value / 5) * 100}%` }} />
        </div>
        <span className="text-xs text-muted-foreground">{value}/5</span>
      </div>
    </div>
  );
}
