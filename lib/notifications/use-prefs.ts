"use client";

import { useMemo, useSyncExternalStore } from "react";
import { DEFAULT_PREFS, type NotifyPrefs } from "@/lib/notifications/prefs";
import { PREFS_EVENT, loadPrefs } from "@/lib/notifications/storage";

const subscribe = (onChange: () => void) => {
  window.addEventListener(PREFS_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(PREFS_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
};

// The snapshot is a string so React can tell cheaply whether it changed.
const snapshot = () => JSON.stringify(loadPrefs());
const serverSnapshot = () => JSON.stringify(DEFAULT_PREFS);

/** Notification settings from this browser's storage, kept in sync across tabs and components. */
export function usePrefs(): NotifyPrefs {
  const raw = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  return useMemo(() => JSON.parse(raw) as NotifyPrefs, [raw]);
}

const permissionSnapshot = () => ("Notification" in window ? Notification.permission : "unsupported");

/** The browser's notification permission; re-read whenever settings change. */
export function usePermission(): NotificationPermission | "unsupported" {
  return useSyncExternalStore(subscribe, permissionSnapshot, () => "default" as const);
}
