export const CATEGORIES = [
  "FINANCIAL",
  "TRAVEL",
  "WORK",
  "SHOPPING",
  "SUBSCRIPTION",
  "MARKETING",
  "SOCIAL",
  "OTHER",
] as const;

export type CommunicationCategory = (typeof CATEGORIES)[number];

export const INTENTS = [
  "ACTION_REQUIRED",
  "INFORMATION",
  "CONFIRMATION",
  "REMINDER",
  "UPDATE",
  "PROMOTION",
  "TRANSACTION",
  "ALERT",
  "OTHER",
] as const;

export type CommunicationIntent = (typeof INTENTS)[number];

export type UserStatus = "unread" | "read" | "hidden";

/** Raw communication as received from a source (sample data, Gmail, ...). */
export interface Communication {
  id: string;
  source: string;
  source_type: string;
  sender: string;
  sender_name: string | null;
  subject: string;
  content: string;
  received_at: string;
  /** Source-native id (e.g. Gmail message id), used to avoid re-importing the same item. */
  external_id: string | null;
  /** What the user has done with it in the app. Absent until migration 0006 is applied. */
  user_status?: UserStatus;
  created_at: string;
}

export type NewCommunication = Omit<Communication, "id" | "created_at" | "external_id"> & {
  external_id?: string | null;
};

/** AI-derived structured understanding of a communication. */
export interface CommunicationAnalysis {
  id: string;
  communication_id: string;
  category: CommunicationCategory;
  intent: CommunicationIntent;
  organization: string | null;
  people: string[] | null;
  entities: string[] | null;
  event_date: string | null;
  deadline: string | null;
  amount: number | null;
  currency: string | null;
  product_service: string | null;
  reference_id: string | null;
  requested_action: string | null;
  summary: string;
  confidence: number;
  model: string;
  prompt_version: string;
  created_at: string;
}

export interface CommunicationWithAnalysis extends Communication {
  analysis: CommunicationAnalysis | null;
}
