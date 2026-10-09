import { Badge } from "@/components/ui/badge";
import { AnalyzeButton } from "@/components/communications/analyze-button";
import { FeedbackButtons } from "@/components/communications/feedback-buttons";
import { ItemActions } from "@/components/communications/item-actions";
import { LabelControl } from "@/components/communications/label-control";
import { LEVEL_META } from "@/lib/decision-engine/level-meta";
import type { AttentionLevel, DecisionFactorScores } from "@/lib/decision-engine/types";
import type { CommunicationWithAttention } from "@/types/attention";

/** Everything about one communication: the answer first, the evidence folded below. */
export function DetailPanel({
  communication,
  afterActionHref,
  evalLabel = null,
}: {
  communication: CommunicationWithAttention;
  /** The user's expected level for the real-inbox evaluation, if already set. */
  evalLabel?: AttentionLevel | null;
  /** Where to go once the item is marked done or hidden (the feed passes the next item). */
  afterActionHref?: string;
}) {
  const { analysis, attention } = communication;
  const meta = attention ? LEVEL_META[attention.level] : null;

  return (
    <div className="space-y-5">
      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          {meta && <Badge variant={meta.badgeVariant}>{meta.label}</Badge>}
          {analysis && <Badge variant="outline">{analysis.category}</Badge>}
          {analysis && <Badge variant="outline">{analysis.intent}</Badge>}
          {communication.source === "sample" && <Badge variant="outline">sample</Badge>}
        </div>
        <h2 className="text-xl font-semibold leading-snug">{communication.subject}</h2>
        <p className="text-sm text-muted-foreground">
          {communication.sender_name ?? "Unknown"} &lt;{communication.sender}&gt; ·{" "}
          {new Date(communication.received_at).toLocaleString()}
        </p>
        <ItemActions
          id={communication.id}
          status={communication.user_status ?? "unread"}
          afterHref={afterActionHref}
        />
      </header>

      {attention?.why_it_matters && attention.what_you_can_do ? (
        <div className={`space-y-3 rounded-lg border p-4 ${meta?.tint ?? ""}`}>
          <div>
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Why it matters
            </div>
            <p className="mt-1">{attention.why_it_matters}</p>
          </div>
          <div>
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              What you can do
            </div>
            <p className="mt-1">{attention.what_you_can_do}</p>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
          {analysis ? "No AI explanation for this item yet." : "This communication has not been analyzed yet."}
          {!analysis && <AnalyzeButton communicationId={communication.id} />}
        </div>
      )}

      <section>
        <h3 className="mb-2 text-sm font-semibold">Original email</h3>
        <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded-lg bg-muted p-3 font-sans text-sm">
          {communication.content}
        </pre>
      </section>

      {attention && (
        <details className="rounded-lg border">
          <summary className="cursor-pointer px-4 py-3 text-sm font-semibold hover:bg-muted/50">
            How this was decided
          </summary>
          <div className="space-y-3 px-4 pb-4 text-sm">
            <p className="text-muted-foreground">{attention.reason}</p>
            <div className="space-y-1">
              {(Object.keys(attention.scores) as (keyof DecisionFactorScores)[]).map((key) => (
                <ScoreRow key={key} label={key} value={attention.scores[key]} />
              ))}
            </div>
            {attention.matched_context && attention.matched_context.length > 0 && (
              <div>
                <div className="mb-1 font-medium">Personal context used</div>
                <ul className="list-inside list-disc text-muted-foreground">
                  {attention.matched_context.map((m, i) => (
                    <li key={i}>
                      {m.key} ({m.context_type}, importance {m.importance}/5), matched on {m.matched_on}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <Row label="Overall score" value={`${attention.overall_score.toFixed(2)} / 5`} />
            <Row label="Decision version" value={attention.decision_version} />
          </div>
        </details>
      )}

      {analysis && (
        <details className="rounded-lg border">
          <summary className="cursor-pointer px-4 py-3 text-sm font-semibold hover:bg-muted/50">
            What the AI extracted
          </summary>
          <div className="space-y-2 px-4 pb-4 text-sm">
            <Row label="Summary" value={analysis.summary} />
            <Row label="Organization" value={analysis.organization ?? "—"} />
            <Row label="People" value={analysis.people?.join(", ") || "—"} />
            <Row label="Event date" value={analysis.event_date ?? "—"} />
            <Row label="Deadline" value={analysis.deadline ?? "—"} />
            <Row
              label="Amount"
              value={analysis.amount != null ? `${analysis.amount} ${analysis.currency ?? ""}`.trim() : "—"}
            />
            <Row label="Requested action" value={analysis.requested_action ?? "—"} />
            <Row label="Confidence" value={`${Math.round(analysis.confidence * 100)}%`} />
            <Row label="Model" value={`${analysis.model} · ${analysis.prompt_version}`} />
          </div>
        </details>
      )}

      {attention && communication.source !== "sample" && (
        <LabelControl id={communication.id} engineLevel={attention.level} label={evalLabel} />
      )}

      <div>
        <p className="mb-2 text-sm text-muted-foreground">Was this useful?</p>
        <FeedbackButtons communicationId={communication.id} />
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[130px_1fr] gap-2">
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
    <div className="grid grid-cols-[160px_1fr] items-center gap-2">
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
