"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { LEVEL_META } from "@/lib/decision-engine/level-meta";
import { ATTENTION_LEVELS, type AttentionLevel } from "@/lib/decision-engine/types";

/**
 * Lets the user record what the attention level SHOULD have been. That answer is
 * the "expected" side of the real-inbox evaluation; the engine's level is "actual".
 */
export function LabelControl({
  id,
  engineLevel,
  label,
}: {
  id: string;
  engineLevel: AttentionLevel;
  label: AttentionLevel | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [choice, setChoice] = useState<AttentionLevel>(label ?? engineLevel);

  async function send(method: "PUT" | "DELETE", level?: AttentionLevel) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/communications/${id}/label`, {
        method,
        headers: { "Content-Type": "application/json" },
        body: level ? JSON.stringify({ level }) : undefined,
      });
      if (!res.ok) {
        setError((await res.json().catch(() => ({}))).error ?? `Failed (HTTP ${res.status}).`);
        return;
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-2 rounded-lg border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">Rate this decision</h3>
        {label && (
          <span className="text-xs text-muted-foreground">
            In evaluation as <strong>{LEVEL_META[label].label}</strong>
            {label === engineLevel ? " (matches)" : " (differs from the engine)"}
          </span>
        )}
      </div>
      <p className="text-sm text-muted-foreground">
        The engine said <strong>{LEVEL_META[engineLevel].label}</strong>. What should it have been? Your answer is
        added to the real-Gmail evaluation.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant="outline" disabled={busy} onClick={() => send("PUT", engineLevel)}>
          Engine is right
        </Button>
        <span className="text-xs text-muted-foreground">or</span>
        <select
          value={choice}
          onChange={(e) => setChoice(e.target.value as AttentionLevel)}
          disabled={busy}
          aria-label="Correct attention level"
          className="h-7 rounded-md border border-border bg-background px-2 text-xs"
        >
          {ATTENTION_LEVELS.map((level) => (
            <option key={level} value={level}>
              {LEVEL_META[level].label}
            </option>
          ))}
        </select>
        <Button size="sm" disabled={busy} onClick={() => send("PUT", choice)}>
          Save
        </Button>
        {label && (
          <Button size="sm" variant="ghost" disabled={busy} onClick={() => send("DELETE")}>
            Remove
          </Button>
        )}
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </section>
  );
}
