/**
 * Which mail the app shows. "sample" is for demos and recordings: it hides every real message,
 * everywhere (feed, brief, bell, list), so nothing private can end up on screen.
 */
export type DataView = "real" | "all" | "sample";

export const VIEW_COOKIE = "pci_view";
export const VIEW_LABELS: Record<DataView, string> = {
  real: "My mail",
  all: "My mail + samples",
  sample: "Samples only (demo)",
};

const isView = (v: string | undefined): v is DataView => v === "real" || v === "all" || v === "sample";

/**
 * An explicit choice wins. The earlier on/off cookie still maps over ("1" showed both, "0" real only).
 * With no choice: real mail if there is any, otherwise the samples.
 */
export function resolveView(cookie: string | undefined, legacyCookie: string | undefined, hasRealMail: boolean): DataView {
  if (isView(cookie)) return cookie;
  if (legacyCookie === "1") return "all";
  if (legacyCookie === "0") return "real";
  return hasRealMail ? "real" : "sample";
}

export function applyDataView<T extends { source: string }>(items: T[], view: DataView): T[] {
  if (view === "all") return items;
  return items.filter((c) => (view === "sample" ? c.source === "sample" : c.source !== "sample"));
}
