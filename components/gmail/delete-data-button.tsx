"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function DeleteDataButton() {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);

  async function handleClick() {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/gmail/delete-data", { method: "POST" });
      const body = await res.json();
      setSummary(`Deleted ${body.deleted ?? 0} communications.`);
      router.refresh();
    } finally {
      setIsSubmitting(false);
      setConfirming(false);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <Button size="sm" variant="destructive" onClick={handleClick} disabled={isSubmitting}>
        {confirming ? "Click again to permanently delete" : "Delete imported Gmail data"}
      </Button>
      {summary && <span className="text-xs text-muted-foreground">{summary}</span>}
    </div>
  );
}
