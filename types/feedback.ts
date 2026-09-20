export const FEEDBACK_TYPES = ["IMPORTANT", "NOT_IMPORTANT", "DISMISS"] as const;

export type FeedbackType = (typeof FEEDBACK_TYPES)[number];

export interface UserFeedback {
  id: string;
  communication_id: string;
  feedback_type: FeedbackType;
  created_at: string;
}

export type NewUserFeedback = Omit<UserFeedback, "id" | "created_at">;
