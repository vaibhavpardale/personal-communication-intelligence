import type { AttentionLevel } from "@/lib/decision-engine/types";

export const LEVEL_META: Record<
  AttentionLevel,
  {
    label: string;
    badgeVariant: "default" | "secondary" | "outline" | "destructive";
    description: string;
    /** Tailwind classes for the colored dot and the card accent. */
    dot: string;
    tint: string;
  }
> = {
  ACT_NOW: {
    label: "Act Now",
    badgeVariant: "destructive",
    description: "Do this today",
    dot: "bg-red-500",
    tint: "border-red-500/30 bg-red-500/5",
  },
  REVIEW: {
    label: "Review",
    badgeVariant: "default",
    description: "Look at this soon",
    dot: "bg-amber-500",
    tint: "border-amber-500/30 bg-amber-500/5",
  },
  WATCH: {
    label: "Watch",
    badgeVariant: "secondary",
    description: "Good to know, nothing to do yet",
    dot: "bg-blue-500",
    tint: "border-blue-500/25 bg-blue-500/5",
  },
  LOW_PRIORITY: {
    label: "Low Priority",
    badgeVariant: "outline",
    description: "Glance if you have time",
    dot: "bg-slate-400",
    tint: "",
  },
  NO_ACTION: {
    label: "No Action",
    badgeVariant: "outline",
    description: "Noise",
    dot: "bg-slate-300",
    tint: "",
  },
};
