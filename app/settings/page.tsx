import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SyncButton } from "@/components/gmail/sync-button";
import { DisconnectButton } from "@/components/gmail/disconnect-button";
import { DeleteDataButton } from "@/components/gmail/delete-data-button";
import { getActiveGmailConnection } from "@/lib/db/gmail-connection";
import { isGmailConfigured, isSupabaseConfigured } from "@/lib/config";

export const dynamic = "force-dynamic";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ gmail?: string }>;
}) {
  const { gmail: gmailStatus } = await searchParams;

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-8">
      <h1 className="text-2xl font-semibold">Settings</h1>

      {gmailStatus === "connected" && <Banner tone="success">Gmail connected successfully.</Banner>}
      {gmailStatus === "denied" && <Banner tone="warning">Gmail connection was cancelled.</Banner>}
      {gmailStatus === "error" && (
        <Banner tone="error">Something went wrong connecting Gmail. Check server logs.</Banner>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Gmail</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          {!isSupabaseConfigured() ? (
            <p className="text-muted-foreground">
              Supabase is not configured, so Gmail connection state cannot be stored yet. Set
              SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY first.
            </p>
          ) : !isGmailConfigured() ? (
            <p className="text-muted-foreground">
              Gmail integration is not configured. Create OAuth 2.0 credentials in the Google
              Cloud Console and set <code>GMAIL_CLIENT_ID</code>, <code>GMAIL_CLIENT_SECRET</code>,
              and <code>GMAIL_REDIRECT_URI</code> in <code>.env.local</code> (see README for the
              exact steps).
            </p>
          ) : (
            <GmailPanel />
          )}
        </CardContent>
      </Card>
    </main>
  );
}

async function GmailPanel() {
  const connection = await getActiveGmailConnection();

  if (!connection) {
    return (
      <div className="space-y-3">
        <p className="text-muted-foreground">
          Connect your Gmail account to import real emails through the same AI understanding,
          personal context, and attention pipeline used for sample data. Only read-only access is
          requested (<code>gmail.readonly</code>) — this app cannot send, delete, or modify
          anything in your mailbox.
        </p>
        <a
          href="/api/gmail/auth"
          className="inline-flex h-8 items-center rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/80"
        >
          Connect Gmail
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Badge>Connected</Badge>
        <span>{connection.email}</span>
      </div>
      <div className="flex flex-wrap gap-2">
        <SyncButton />
        <DisconnectButton />
        <DeleteDataButton />
      </div>
      <p className="text-xs text-muted-foreground">
        &ldquo;Disconnect&rdquo; revokes this app&apos;s stored access without deleting anything
        already imported. &ldquo;Delete imported Gmail data&rdquo; permanently removes every
        communication, analysis, attention decision, and feedback entry that came from Gmail, but
        keeps the connection so you can sync again later.
      </p>
    </div>
  );
}

function Banner({ tone, children }: { tone: "success" | "warning" | "error"; children: ReactNode }) {
  const toneClass =
    tone === "success"
      ? "border-green-500/40 bg-green-500/10"
      : tone === "warning"
        ? "border-yellow-500/40 bg-yellow-500/10"
        : "border-destructive/40 bg-destructive/10";
  return <div className={`rounded-md border p-3 text-sm ${toneClass}`}>{children}</div>;
}
