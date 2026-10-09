import { DEFAULT_PREFS, type NotifyPrefs } from "@/lib/notifications/prefs";

/** Browser-only storage for notification settings and what has already been seen. Every access is guarded: it can be unavailable. */
const PREFS_KEY = "heed.notify.prefs";
const SEEN_KEY = "heed.notify.seen";
const NOTIFIED_KEY = "heed.notify.notified";
export const PREFS_EVENT = "heed:prefs";

function read<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable: settings last for this page view only */
  }
}

export const loadPrefs = (): NotifyPrefs => ({ ...DEFAULT_PREFS, ...read<Partial<NotifyPrefs>>(PREFS_KEY, {}) });

export function savePrefs(prefs: NotifyPrefs) {
  write(PREFS_KEY, prefs);
  window.dispatchEvent(new Event(PREFS_EVENT));
}

export const loadSet = (kind: "seen" | "notified"): Set<string> =>
  new Set(read<string[]>(kind === "seen" ? SEEN_KEY : NOTIFIED_KEY, []));

export function saveSet(kind: "seen" | "notified", ids: Set<string>) {
  // Keep the newest few hundred so this never grows without bound.
  write(kind === "seen" ? SEEN_KEY : NOTIFIED_KEY, [...ids].slice(-500));
}
