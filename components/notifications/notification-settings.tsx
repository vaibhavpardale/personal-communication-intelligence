"use client";

import { Button } from "@/components/ui/button";
import type { NotifyMode, NotifyPrefs } from "@/lib/notifications/prefs";
import { savePrefs } from "@/lib/notifications/storage";
import { usePermission, usePrefs } from "@/lib/notifications/use-prefs";

const MODES: { value: NotifyMode; label: string; hint: string }[] = [
  { value: "urgent", label: "Only the urgent", hint: "Act Now items. Quietest." },
  { value: "deadlines", label: "Urgent and deadlines", hint: "Act Now, plus anything with a deadline coming up." },
  { value: "review", label: "Everything worth a look", hint: "Also items Heed would ask you to review soon." },
];

export function NotificationSettings() {
  const prefs = usePrefs();
  const permission = usePermission();

  function update(patch: Partial<NotifyPrefs>) {
    savePrefs({ ...prefs, ...patch });
  }

  async function toggleBrowser(on: boolean) {
    if (!on) return update({ browser: false });
    if (!("Notification" in window)) return;
    const result = Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
    update({ browser: result === "granted" });
  }

  return (
    <div className="space-y-5 text-sm">
      <fieldset className="space-y-2">
        <legend className="mb-1 font-medium">What is worth an interruption</legend>
        {MODES.map((m) => (
          <label key={m.value} className="flex cursor-pointer items-start gap-3 rounded-xl border p-3 has-[:checked]:border-primary has-[:checked]:bg-accent/50">
            <input
              type="radio"
              name="notify-mode"
              checked={prefs.mode === m.value}
              onChange={() => update({ mode: m.value })}
              className="mt-1 accent-[var(--primary)]"
            />
            <span>
              <span className="block font-medium">{m.label}</span>
              <span className="text-muted-foreground">{m.hint}</span>
            </span>
          </label>
        ))}
      </fieldset>

      {prefs.mode !== "urgent" && (
        <label className="flex items-center gap-3">
          <span>Count a deadline as close when it is within</span>
          <select
            value={prefs.deadlineDays}
            onChange={(e) => update({ deadlineDays: Number(e.target.value) })}
            className="h-8 rounded-md border bg-background px-2"
          >
            {[1, 2, 3, 5, 7].map((d) => (
              <option key={d} value={d}>
                {d} day{d === 1 ? "" : "s"}
              </option>
            ))}
          </select>
        </label>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <span>Quiet hours</span>
        <input type="time" value={prefs.quietStart} onChange={(e) => update({ quietStart: e.target.value })} className="h-8 rounded-md border bg-background px-2" />
        <span className="text-muted-foreground">to</span>
        <input type="time" value={prefs.quietEnd} onChange={(e) => update({ quietEnd: e.target.value })} className="h-8 rounded-md border bg-background px-2" />
        <span className="text-xs text-muted-foreground">No pop-ups then; the bell still collects them.</span>
      </div>

      <div className="space-y-2 rounded-xl border p-3">
        <label className="flex cursor-pointer items-center gap-3">
          <input
            type="checkbox"
            checked={prefs.browser && permission === "granted"}
            disabled={permission === "unsupported" || permission === "denied"}
            onChange={(e) => toggleBrowser(e.target.checked)}
            className="accent-[var(--primary)]"
          />
          <span className="font-medium">Show pop-up notifications while Heed is open</span>
        </label>
        {permission === "denied" && (
          <p className="text-xs text-muted-foreground">Your browser is blocking notifications for this site. Allow them in the browser&apos;s site settings, then come back.</p>
        )}
        {permission === "unsupported" && <p className="text-xs text-muted-foreground">This browser does not support notifications.</p>}
        {prefs.browser && permission === "granted" && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => new Notification("Heed", { body: "This is how a notification will look." })}
          >
            Send a test
          </Button>
        )}
      </div>

      <p className="text-xs text-muted-foreground">These choices are saved in this browser only. They are never sent to a server.</p>
    </div>
  );
}
