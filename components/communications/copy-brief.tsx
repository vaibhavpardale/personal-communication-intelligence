"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function CopyBrief({ text }: { text: string }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setState("copied");
    } catch {
      setState("failed");
    }
    setTimeout(() => setState("idle"), 2000);
  }

  return (
    <Button variant="outline" size="sm" onClick={copy}>
      {state === "copied" ? "Copied" : state === "failed" ? "Could not copy" : "Copy as text"}
    </Button>
  );
}
