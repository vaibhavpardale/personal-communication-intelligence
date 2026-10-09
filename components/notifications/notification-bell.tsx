"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import { LEVEL_META } from "@/lib/decision-engine/level-meta";
import { isQuietHours, reasonFor, shouldNotify, type Candidate } from "@/lib/notifications/prefs";
import { PREFS_EVENT, loadPrefs, loadSet, saveSet } from "@/lib/notifications/storage";

const POLL_MS = 2 * 60 * 1000;
const MAX_POPUPS = 3;

/** The bell collects what is worth your attention by YOUR rules; pop-ups follow the same rules, minus quiet hours. */
export function NotificationBell() {
  const [matching, setMatching] = useState<Candidate[]>([]);
  const [seen, setSeen] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState(false);
  const wrapper = useRef<HTMLDivElement>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications", { cache: "no-store" });
      if (!res.ok) return;
      const { candidates } = (await res.json()) as { candidates: Candidate[] };
      const prefs = loadPrefs();
      const now = new Date();
      const hits = candidates.filter((c) => shouldNotify(c, prefs, now));
      setMatching(hits);
      setSeen(loadSet("seen"));

      // Pop-ups: only for things not announced before, never during quiet hours.
      if (prefs.browser && "Notification" in window && Notification.permission === "granted" && !isQuietHours(prefs, now)) {
        const notified = loadSet("notified");
        const fresh = hits.filter((c) => !notified.has(c.id));
        for (const c of fresh.slice(0, MAX_POPUPS)) {
          new Notification(c.subject, { body: `${reasonFor(c, now)}. ${c.why ?? ""}`.trim(), tag: c.id });
        }
        if (fresh.length > MAX_POPUPS) {
          new Notification(`${fresh.length - MAX_POPUPS} more need your attention`, { tag: "pith-more" });
        }
        fresh.forEach((c) => notified.add(c.id));
        saveSet("notified", notified);
      }
    } catch {
      /* offline or server restarting: try again on the next tick */
    }
  }, []);

  useEffect(() => {
    const first = setTimeout(refresh, 0);
    const timer = setInterval(refresh, POLL_MS);
    window.addEventListener("focus", refresh);
    window.addEventListener(PREFS_EVENT, refresh);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
      window.removeEventListener("focus", refresh);
      window.removeEventListener(PREFS_EVENT, refresh);
    };
  }, [refresh]);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (wrapper.current && !wrapper.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const unseen = matching.filter((c) => !seen.has(c.id));

  function markAllSeen() {
    const next = new Set(seen);
    matching.forEach((c) => next.add(c.id));
    saveSet("seen", next);
    setSeen(next);
  }

  const now = new Date();
  return (
    <div ref={wrapper} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={unseen.length ? `${unseen.length} new notifications` : "Notifications"}
        aria-expanded={open}
        className="relative grid size-9 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        <Bell className="size-5" strokeWidth={1.75} />
        {unseen.length > 0 && (
          <span className="absolute -right-0.5 -top-0.5 grid min-w-4 place-items-center rounded-full bg-destructive px-1 text-[10px] font-semibold leading-4 text-white">
            {unseen.length > 9 ? "9+" : unseen.length}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-20 w-96 max-w-[90vw] overflow-hidden rounded-2xl border bg-background shadow-lg">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <span className="text-sm font-semibold">Worth your attention</span>
            {unseen.length > 0 && (
              <button type="button" onClick={markAllSeen} className="text-xs font-medium text-primary hover:underline">
                Mark all seen
              </button>
            )}
          </div>
          {matching.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">Nothing is asking for you right now.</p>
          ) : (
            <ul className="max-h-96 divide-y overflow-y-auto">
              {matching.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/?id=${c.id}`}
                    onClick={() => setOpen(false)}
                    className={`block px-4 py-3 hover:bg-muted ${seen.has(c.id) ? "opacity-70" : ""}`}
                  >
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className={`size-2 rounded-full ${LEVEL_META[c.level].dot}`} />
                      <span className="truncate">{c.sender}</span>
                      <span className="ml-auto shrink-0 font-medium text-foreground/80">{reasonFor(c, now)}</span>
                    </div>
                    <div className="mt-0.5 line-clamp-2 text-sm font-medium leading-snug">{c.subject}</div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <div className="border-t px-4 py-2.5 text-xs text-muted-foreground">
            <Link href="/settings#notifications" onClick={() => setOpen(false)} className="hover:underline">
              Choose what notifies you
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
