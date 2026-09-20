export interface GmailConnection {
  id: string;
  email: string;
  access_token: string;
  refresh_token: string | null;
  token_expires_at: string;
  scope: string;
  connected_at: string;
  updated_at: string;
}

export type NewGmailConnection = Omit<GmailConnection, "id" | "connected_at" | "updated_at">;
