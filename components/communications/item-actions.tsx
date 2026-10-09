"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "cn";
import type { UserStatus } from "@/types/communication";

/**
 * "Done" and "Hide" take a communication off the attention screen; "Restore"
 * brings it back. Nothing is ever deleted here, and Gmail is read-only, so the
 * original email and the evaluation data are never touched.
 */
export function ItemActions({
  id,
  status,
  className,
}: {
  id: string;
  status: UserStatus;
  className?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function setStatus(next: UserStatus) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/communications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? `Failed (HTTP ${res.status}).`);
        return;
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {status === "unread" ? (
        <>
          <Button size="sm" variant="outline" disabled={busy} onClick={() => setStatus("read")}>
            Done
          </Button>
          <Button size="sm" variant="ghost" disabled={busy} onClick={() => setStatus("hidden")}>
            Hide
          </Button>
        </>
      ) : (
        <Button size="sm" variant="outline" disabled={busy} onClick={() => setStatus("unread")}>
          Restore
        </Button>
      )}
      {error && <span className="basis-full text-xs text-destructive">{error}</span>}
    </div>
  );
}
