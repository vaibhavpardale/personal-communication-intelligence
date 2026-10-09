"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import type { SenderPreference, SenderPreferenceMap } from "@/lib/decision-engine/preferences";
import type { Suggestion } from "@/lib/learning";

/** The senders treated specially, and what it has noticed from the user's own behavior. */
export function SenderPreferencesPanel({ preferences, suggestions }: { preferences: SenderPreferenceMap; suggestions: Suggestion[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  async function set(sender: string, preference: SenderPreference | null) {
    setBusy(sender);
    setError(null);
    try {
      const res = await fetch("/api/sender-preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sender, preference }),
      });
      if (!res.ok) {
        setError((await res.json().catch(() => ({}))).error ?? `Failed (HTTP ${res.status}).`);
        return;
      }
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  const entries = Object.entries(preferences).sort(([a], [b]) => a.localeCompare(b));
  const visible = suggestions.filter((s) => !dismissed.has(`${s.kind}:${s.sender}`));

  return (
    <div className="space-y-6 text-sm">
      <div className="space-y-2">
        <h3 className="font-medium">What the app has noticed</h3>
        {visible.length === 0 ? (
          <p className="text-muted-foreground">
            Nothing yet. As you use Done, Hide and &ldquo;Was this useful?&rdquo;, the app will suggest who to mute or mark VIP, and always explain why.
          </p>
        ) : (
          <ul className="space-y-2">
            {visible.map((s) => (
              <li key={`${s.kind}:${s.sender}`} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3">
                <div className="min-w-0">
                  <div className="font-medium">
                    {s.kind === "mute" ? "Mute" : "Mark VIP"}: {s.name}
                  </div>
                  <div className="truncate text-xs text-muted-foreground">
                    {s.sender} · {s.reason}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" disabled={busy === s.sender} onClick={() => set(s.sender, s.kind === "mute" ? "muted" : "vip")}>
                    {s.kind === "mute" ? "Mute" : "Mark VIP"}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setDismissed(new Set(dismissed).add(`${s.kind}:${s.sender}`))}>
                    Not now
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="space-y-2">
        <h3 className="font-medium">Your senders</h3>
        {entries.length === 0 ? (
          <p className="text-muted-foreground">No VIP or muted senders. Set one from any message.</p>
        ) : (
          <ul className="divide-y rounded-xl border">
            {entries.map(([sender, preference]) => (
              <li key={sender} className="flex items-center justify-between gap-3 px-3 py-2">
                <span className="min-w-0 truncate">
                  {sender} <span className="ml-2 rounded-full bg-accent px-2 py-0.5 text-xs text-accent-foreground">{preference === "vip" ? "VIP" : "Muted"}</span>
                </span>
                <Button size="sm" variant="ghost" disabled={busy === sender} onClick={() => set(sender, null)}>
                  Remove
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
