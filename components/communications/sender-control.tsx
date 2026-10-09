"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { senderAddress, type SenderPreference } from "@/lib/decision-engine/preferences";

/** Tell Pith how to treat this sender from now on. It re-rates their mail straight away, with no AI calls. */
export function SenderControl({ sender, preference }: { sender: string; preference: SenderPreference | null }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const address = senderAddress(sender);

  async function set(next: SenderPreference | null) {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/sender-preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sender: address, preference: next }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage(body.error ?? `Failed (HTTP ${res.status}).`);
        return;
      }
      setMessage(body.changed ? `Re-rated ${body.changed} message${body.changed === 1 ? "" : "s"} from this sender.` : null);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-2 rounded-xl border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">This sender</h3>
        <span className="truncate text-xs text-muted-foreground">{address}</span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant={preference === "vip" ? "default" : "outline"} disabled={busy} onClick={() => set(preference === "vip" ? null : "vip")}>
          {preference === "vip" ? "VIP (click to undo)" : "Mark as VIP"}
        </Button>
        <Button size="sm" variant={preference === "muted" ? "default" : "outline"} disabled={busy} onClick={() => set(preference === "muted" ? null : "muted")}>
          {preference === "muted" ? "Muted (click to undo)" : "Mute"}
        </Button>
        <span className="text-xs text-muted-foreground">
          {preference === "vip"
            ? "Their mail ranks higher and can notify you."
            : preference === "muted"
              ? "Their mail is filed as low priority and never notifies."
              : "VIP ranks their mail higher. Mute files it away and stops notifications."}
        </span>
      </div>
      {message && <p className="text-xs text-muted-foreground">{message}</p>}
    </section>
  );
}
