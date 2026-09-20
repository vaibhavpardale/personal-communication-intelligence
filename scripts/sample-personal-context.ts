import type { NewPersonalContextEntry } from "@/lib/context/types";

/**
 * Manually seeded personal context, matching the recurring entities in
 * scripts/sample-communications.ts so the decision engine has real signal
 * to react to (Cisco, Priya Sharma, Project Alpha, ...). Context generation
 * from historical communications is a future direction, not built here.
 */
export const samplePersonalContext: NewPersonalContextEntry[] = [
  { context_type: "IMPORTANT_ORGANIZATION", key: "Cisco", value: null, importance: 5, confidence: 1 },
  { context_type: "IMPORTANT_ORGANIZATION", key: "Microsoft", value: null, importance: 4, confidence: 1 },
  { context_type: "IMPORTANT_ORGANIZATION", key: "Globex Inc", value: "Key customer account", importance: 5, confidence: 1 },

  { context_type: "IMPORTANT_PERSON", key: "Priya Sharma", value: "Manager", importance: 5, confidence: 1 },
  { context_type: "IMPORTANT_PERSON", key: "Daniel Osei", value: "Customer contact at Globex Inc", importance: 4, confidence: 1 },

  { context_type: "PROJECT", key: "Project Alpha", value: null, importance: 4, confidence: 1 },
  { context_type: "PROJECT", key: "Project Beta", value: null, importance: 4, confidence: 1 },

  { context_type: "SUBSCRIPTION", key: "Netflix", value: null, importance: 2, confidence: 1 },
  { context_type: "SUBSCRIPTION", key: "AWS", value: null, importance: 3, confidence: 1 },
  { context_type: "SUBSCRIPTION", key: "Spotify", value: null, importance: 1, confidence: 1 },
  { context_type: "SUBSCRIPTION", key: "Cult.fit", value: null, importance: 1, confidence: 1 },

  { context_type: "RECURRING_VENDOR", key: "HDFC Bank", value: null, importance: 3, confidence: 1 },
  { context_type: "RECURRING_VENDOR", key: "Amazon.in", value: null, importance: 2, confidence: 1 },
];
