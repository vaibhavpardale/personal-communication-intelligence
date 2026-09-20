import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="mx-auto flex max-w-2xl flex-1 flex-col items-start justify-center gap-6 px-8 py-24">
      <span className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
        Personal Communication Intelligence
      </span>
      <h1 className="text-3xl font-semibold tracking-tight">
        What needs my attention?
      </h1>
      <p className="max-w-md text-muted-foreground">
        Phase 1 (Foundation + AI Understanding) is complete: communications are understood and
        turned into structured facts. The attention feed that decides what deserves your focus
        arrives in Phase 2.
      </p>
      <Button render={<Link href="/communications">View Communications</Link>} />
    </main>
  );
}
