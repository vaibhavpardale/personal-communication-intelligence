import type { CommunicationCategory, CommunicationIntent } from "@/types/communication";
import type { AttentionLevel } from "@/lib/decision-engine/types";
import type { DatasetSplit } from "@/types/evaluation";

export interface GoldenLabel {
  subject: string; // matched against the seeded communication with the same subject
  expected_category: CommunicationCategory;
  expected_intent: CommunicationIntent;
  expected_attention_level: AttentionLevel;
  dataset_split: DatasetSplit;
}

/**
 * Manually authored ground truth for scripts/sample-communications.ts, in the same order.
 *
 * Methodology (see docs/phase-3.md for the full write-up):
 * - expected_category / expected_intent reflect the author's intent when writing each
 *   communication (these are objective — the content was written to fit a specific label).
 * - expected_attention_level was computed by hand by running the same formula as
 *   lib/decision-engine/decide.ts against an idealized extraction of each communication
 *   (the facts a correct AI extraction should produce), then frozen here as a static value.
 *   It is NOT recomputed live from the engine at evaluation time — that would make the
 *   "decision accuracy" metric measure nothing, since the engine would trivially agree with
 *   itself. Freezing it here means evaluation actually catches drift between what the AI
 *   extracts from the real communication and what an ideal extraction would produce.
 * - Every 4th item (index % 4 === 3) is held out as "dev" (safe to look at while tuning);
 *   the rest are "test" (do not tune weights/thresholds/prompts against these results).
 */
export const goldenLabels: GoldenLabel[] = [
  { subject: "Credit Card Payment Due Tomorrow", expected_category: "FINANCIAL", expected_intent: "ACTION_REQUIRED", expected_attention_level: "ACT_NOW", dataset_split: "test" },
  { subject: "Debit Alert: INR 15,000 spent at Amazon", expected_category: "FINANCIAL", expected_intent: "ALERT", expected_attention_level: "WATCH", dataset_split: "test" },
  { subject: "Your refund of INR 2,300 has been processed", expected_category: "FINANCIAL", expected_intent: "CONFIRMATION", expected_attention_level: "LOW_PRIORITY", dataset_split: "test" },
  { subject: "Invoice INV-2291 - Payment Due", expected_category: "FINANCIAL", expected_intent: "ACTION_REQUIRED", expected_attention_level: "REVIEW", dataset_split: "dev" },
  { subject: "Your Netflix membership renews soon", expected_category: "SUBSCRIPTION", expected_intent: "REMINDER", expected_attention_level: "WATCH", dataset_split: "test" },
  { subject: "OVERDUE: Electricity bill payment pending", expected_category: "FINANCIAL", expected_intent: "ACTION_REQUIRED", expected_attention_level: "ACT_NOW", dataset_split: "test" },
  { subject: "Booking Confirmed: 6E-204 Mumbai to Delhi", expected_category: "TRAVEL", expected_intent: "CONFIRMATION", expected_attention_level: "LOW_PRIORITY", dataset_split: "test" },
  { subject: "Flight 6E-204 departure time changed", expected_category: "TRAVEL", expected_intent: "ALERT", expected_attention_level: "REVIEW", dataset_split: "dev" },
  { subject: "Flight AI-509 has been cancelled", expected_category: "TRAVEL", expected_intent: "ACTION_REQUIRED", expected_attention_level: "REVIEW", dataset_split: "test" },
  { subject: "Reservation confirmed at Taj Lands End", expected_category: "TRAVEL", expected_intent: "CONFIRMATION", expected_attention_level: "LOW_PRIORITY", dataset_split: "test" },
  { subject: "Car rental confirmed for your Delhi trip", expected_category: "TRAVEL", expected_intent: "CONFIRMATION", expected_attention_level: "LOW_PRIORITY", dataset_split: "test" },
  { subject: "Need the Q3 report by end of day", expected_category: "WORK", expected_intent: "ACTION_REQUIRED", expected_attention_level: "ACT_NOW", dataset_split: "dev" },
  { subject: "Project Alpha - weekly status update", expected_category: "WORK", expected_intent: "UPDATE", expected_attention_level: "WATCH", dataset_split: "test" },
  { subject: "Issue with our last delivery - need response", expected_category: "WORK", expected_intent: "ACTION_REQUIRED", expected_attention_level: "ACT_NOW", dataset_split: "test" },
  { subject: "Meeting rescheduled: Project Beta sync", expected_category: "WORK", expected_intent: "UPDATE", expected_attention_level: "WATCH", dataset_split: "test" },
  { subject: "FYI: Updated office holiday calendar", expected_category: "WORK", expected_intent: "INFORMATION", expected_attention_level: "NO_ACTION", dataset_split: "dev" },
  { subject: "Performance review scheduled", expected_category: "WORK", expected_intent: "REMINDER", expected_attention_level: "REVIEW", dataset_split: "test" },
  { subject: "Please review my PR before merging", expected_category: "WORK", expected_intent: "ACTION_REQUIRED", expected_attention_level: "REVIEW", dataset_split: "test" },
  { subject: "New sign-in to your Cisco Webex account", expected_category: "WORK", expected_intent: "ALERT", expected_attention_level: "WATCH", dataset_split: "test" },
  { subject: "You have a meeting invite: Vendor sync", expected_category: "WORK", expected_intent: "ACTION_REQUIRED", expected_attention_level: "ACT_NOW", dataset_split: "dev" },
  { subject: "Order confirmed: Mechanical Keyboard", expected_category: "SHOPPING", expected_intent: "CONFIRMATION", expected_attention_level: "WATCH", dataset_split: "test" },
  { subject: "Your order has shipped", expected_category: "SHOPPING", expected_intent: "UPDATE", expected_attention_level: "LOW_PRIORITY", dataset_split: "test" },
  { subject: "Arriving tomorrow: Mechanical Keyboard", expected_category: "SHOPPING", expected_intent: "REMINDER", expected_attention_level: "REVIEW", dataset_split: "test" },
  { subject: "Return confirmed for Wireless Mouse", expected_category: "SHOPPING", expected_intent: "CONFIRMATION", expected_attention_level: "WATCH", dataset_split: "dev" },
  { subject: "Refund issued for your return", expected_category: "SHOPPING", expected_intent: "CONFIRMATION", expected_attention_level: "LOW_PRIORITY", dataset_split: "test" },
  { subject: "Delay in your order delivery", expected_category: "SHOPPING", expected_intent: "ALERT", expected_attention_level: "WATCH", dataset_split: "test" },
  { subject: "Your AWS bill for August is ready - USD 184.32", expected_category: "SUBSCRIPTION", expected_intent: "TRANSACTION", expected_attention_level: "WATCH", dataset_split: "test" },
  { subject: "Your Spotify Premium renews in 3 days", expected_category: "SUBSCRIPTION", expected_intent: "REMINDER", expected_attention_level: "WATCH", dataset_split: "dev" },
  { subject: "Your gym membership renews soon", expected_category: "SUBSCRIPTION", expected_intent: "REMINDER", expected_attention_level: "WATCH", dataset_split: "test" },
  { subject: "Big Billion Days: Up to 70% off electronics", expected_category: "MARKETING", expected_intent: "PROMOTION", expected_attention_level: "NO_ACTION", dataset_split: "test" },
  { subject: "This week in tech: AI, funding rounds, and more", expected_category: "MARKETING", expected_intent: "INFORMATION", expected_attention_level: "NO_ACTION", dataset_split: "test" },
  { subject: "Upgrade to Spotify Family and save", expected_category: "MARKETING", expected_intent: "PROMOTION", expected_attention_level: "NO_ACTION", dataset_split: "dev" },
  { subject: "50% off at restaurants near you this weekend", expected_category: "MARKETING", expected_intent: "PROMOTION", expected_attention_level: "NO_ACTION", dataset_split: "test" },
  { subject: "Join our free webinar on AI product management", expected_category: "MARKETING", expected_intent: "PROMOTION", expected_attention_level: "NO_ACTION", dataset_split: "test" },
  { subject: "3 people viewed your profile this week", expected_category: "SOCIAL", expected_intent: "INFORMATION", expected_attention_level: "NO_ACTION", dataset_split: "test" },
  { subject: "Your weekly digest is here", expected_category: "SOCIAL", expected_intent: "INFORMATION", expected_attention_level: "NO_ACTION", dataset_split: "dev" },
  { subject: "Reminder: Community meetup this weekend", expected_category: "SOCIAL", expected_intent: "REMINDER", expected_attention_level: "LOW_PRIORITY", dataset_split: "test" },
  { subject: "A new version of your app is available", expected_category: "OTHER", expected_intent: "INFORMATION", expected_attention_level: "NO_ACTION", dataset_split: "test" },
  { subject: "Scheduled maintenance completed", expected_category: "OTHER", expected_intent: "INFORMATION", expected_attention_level: "NO_ACTION", dataset_split: "test" },
  { subject: "Your monthly account statement is ready", expected_category: "FINANCIAL", expected_intent: "INFORMATION", expected_attention_level: "LOW_PRIORITY", dataset_split: "dev" },
  { subject: "Your visa application status has been updated", expected_category: "TRAVEL", expected_intent: "UPDATE", expected_attention_level: "LOW_PRIORITY", dataset_split: "test" },
  { subject: "Insurance premium of INR 18,400 due", expected_category: "FINANCIAL", expected_intent: "ACTION_REQUIRED", expected_attention_level: "REVIEW", dataset_split: "test" },
  { subject: "Team lunch this Friday?", expected_category: "WORK", expected_intent: "INFORMATION", expected_attention_level: "LOW_PRIORITY", dataset_split: "test" },
  { subject: "Project Beta - launch retrospective notes", expected_category: "WORK", expected_intent: "INFORMATION", expected_attention_level: "LOW_PRIORITY", dataset_split: "dev" },
];
