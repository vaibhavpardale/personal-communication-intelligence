import type { AttentionLevel } from "@/lib/decision-engine/types";

export const LEVEL_META: Record<
  AttentionLevel,
  { label: string; badgeVariant: "default" | "secondary" | "outline" | "destructive" }
> = {
  ACT_NOW: { label: "Act Now", badgeVariant: "destructive" },
  REVIEW: { label: "Review", badgeVariant: "default" },
  WATCH: { label: "Watch", badgeVariant: "secondary" },
  LOW_PRIORITY: { label: "Low Priority", badgeVariant: "outline" },
  NO_ACTION: { label: "No Action", badgeVariant: "outline" },
};
