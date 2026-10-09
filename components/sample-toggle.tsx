"use client";

import { useRouter } from "next/navigation";
import { cn } from "cn";
import { SAMPLE_COOKIE } from "@/lib/sample-cookie";


/** Switch for showing the synthetic sample (golden-set) communications. Persists in a cookie. */
export function SampleToggle({ on }: { on: boolean }) {
  const router = useRouter();

  function toggle() {
    document.cookie = `${SAMPLE_COOKIE}=${on ? "0" : "1"}; path=/; max-age=31536000; samesite=lax`;
    router.refresh();
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={toggle}
      className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
    >
      <span
        className={cn(
          "relative inline-block h-5 w-9 rounded-full transition-colors",
          on ? "bg-foreground" : "bg-border",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 size-4 rounded-full bg-background transition-all",
            on ? "left-[18px]" : "left-0.5",
          )}
        />
      </span>
      Sample data
    </button>
  );
}
