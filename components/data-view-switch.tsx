"use client";

import { useRouter } from "next/navigation";
import { VIEW_COOKIE, VIEW_LABELS, type DataView } from "@/lib/data-view";

/** Chooses which mail to show. "Samples only" is the safe setting for demos and recordings. */
export function DataViewSwitch({ view }: { view: DataView }) {
  const router = useRouter();

  function change(next: DataView) {
    document.cookie = `${VIEW_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
    router.refresh();
  }

  return (
    <label className="flex items-center gap-2 text-sm text-muted-foreground">
      Showing
      <select
        value={view}
        onChange={(e) => change(e.target.value as DataView)}
        aria-label="Which mail to show"
        className="h-8 rounded-md border bg-background px-2 text-sm text-foreground"
      >
        {(Object.keys(VIEW_LABELS) as DataView[]).map((v) => (
          <option key={v} value={v}>
            {VIEW_LABELS[v]}
          </option>
        ))}
      </select>
    </label>
  );
}
