import { DESCRIPTOR } from "@/components/brand/logo";

export const dynamic = "force-dynamic";

/** Only same-site paths can be previewed. */
function safePath(to: string | undefined): string {
  return to && to.startsWith("/") && !to.startsWith("//") && !to.startsWith("/phone") ? to : "/";
}

export default async function PhonePreview({ searchParams }: { searchParams: Promise<{ to?: string }> }) {
  const { to } = await searchParams;
  const src = safePath(to);

  return (
    <main className="flex flex-1 flex-col items-center gap-4 bg-muted/50 px-4 py-8">
      <div className="text-center">
        <h1 className="text-lg font-semibold">Phone preview</h1>
        <p className="text-sm text-muted-foreground">
          This is exactly what Pith looks like on a phone. A real phone gets this layout automatically, and you can install it
          from the browser menu (Add to Home Screen).
        </p>
      </div>

      {/* A 390 x 780 viewport is a current iPhone; the frame is only decoration */}
      <div className="rounded-[3rem] border-[10px] border-foreground bg-foreground p-0 shadow-xl">
        <iframe
          title="Pith on a phone"
          src={src}
          className="block h-[780px] w-[390px] rounded-[2.2rem] border-0 bg-background"
        />
      </div>

      <p className="text-xs text-muted-foreground">{DESCRIPTOR}</p>
    </main>
  );
}
