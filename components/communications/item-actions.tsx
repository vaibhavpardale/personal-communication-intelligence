"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import type { UserStatus } from "@/types/communication";

/**
 * Mark read / hide / delete for one communication. These only change the app:
 * Gmail access is read-only, so the original email is never touched.
 */
export function ItemActions({ id, status }: { id: string; status: UserStatus }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(request: () => Promise<Response>) {
    setBusy(true);
    setError(null);
    try {
      const res = await request();
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? `Failed (HTTP ${res.status}).`);
        return;
      }
      router.refresh();
    } finally {
      setBusy(false);
      setConfirmDelete(false);
    }
  }

  const setStatus = (next: UserStatus) =>
    run(() =>
      fetch(`/api/communications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      }),
    );

  const remove = () => run(() => fetch(`/api/communications/${id}`, { method: "DELETE" }));

  return (
    <div className="flex flex-wrap items-center gap-2">
      {status === "unread" ? (
        <>
          <Button size="xs" variant="outline" disabled={busy} onClick={() => setStatus("read")}>
            Mark read
          </Button>
          <Button size="xs" variant="outline" disabled={busy} onClick={() => setStatus("hidden")}>
            Hide
          </Button>
        </>
      ) : (
        <Button size="xs" variant="outline" disabled={busy} onClick={() => setStatus("unread")}>
          Restore
        </Button>
      )}
      <Button
        size="xs"
        variant={confirmDelete ? "destructive" : "ghost"}
        disabled={busy}
        onClick={() => (confirmDelete ? remove() : setConfirmDelete(true))}
        onBlur={() => setConfirmDelete(false)}
      >
        {confirmDelete ? "Click again to delete" : "Delete"}
      </Button>
      {error && <span className="text-xs text-destructive">{error}</span>}
    </div>
  );
}
