import Link from "next/link";
import { notFound } from "next/navigation";
import { DetailPanel } from "@/components/communications/detail-panel";
import { getGmailLabel } from "@/lib/db/evaluation";
import { listSenderPreferences } from "@/lib/db/sender-preferences";
import { senderAddress } from "@/lib/decision-engine/preferences";
import { getCommunicationWithAttention } from "@/lib/db/communications";
import { isSupabaseConfigured } from "@/lib/config";

export const dynamic = "force-dynamic";

export default async function CommunicationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  if (!isSupabaseConfigured()) {
    return (
      <main className="mx-auto max-w-2xl p-8">
        <div className="rounded-md border border-dashed p-8 text-center">
          <h1 className="text-lg font-semibold">Supabase is not configured</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local to view this
            communication.
          </p>
        </div>
      </main>
    );
  }

  const communication = await getCommunicationWithAttention(id);

  if (!communication) {
    notFound();
  }

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-8">
      <Link href="/communications" className="text-sm text-muted-foreground hover:underline">
        ← All communications
      </Link>
      <DetailPanel
        communication={communication}
        evalLabel={communication.source !== "sample" ? await getGmailLabel(communication.id) : null}
        senderPreference={(await listSenderPreferences())[senderAddress(communication.sender)] ?? null}
      />
    </main>
  );
}
