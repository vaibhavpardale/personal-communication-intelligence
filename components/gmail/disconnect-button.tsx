"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function DisconnectButton() {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleClick() {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    setIsSubmitting(true);
    try {
      await fetch("/api/gmail/disconnect", { method: "POST" });
      router.refresh();
    } finally {
      setIsSubmitting(false);
      setConfirming(false);
    }
  }

  return (
    <Button size="sm" variant="outline" onClick={handleClick} disabled={isSubmitting}>
      {confirming ? "Click again to confirm" : "Disconnect"}
    </Button>
  );
}
