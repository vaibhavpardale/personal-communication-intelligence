"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Monitor, Smartphone } from "lucide-react";
import { cn } from "cn";

/** Desktop / Phone preview switch. Phone shows the real phone layout inside a device frame, which is what a phone gets automatically. */
export function ViewToggle() {
  const pathname = usePathname();
  const params = useSearchParams();
  const onPhone = pathname === "/phone";
  const desktopHref = onPhone ? params.get("to") || "/" : pathname;
  const phoneHref = `/phone?to=${encodeURIComponent(onPhone ? params.get("to") || "/" : pathname)}`;

  const item = (active: boolean) =>
    cn(
      "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors",
      active ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
    );

  return (
    <div className="hidden items-center rounded-full bg-muted p-0.5 md:flex" role="group" aria-label="Preview layout">
      <Link href={desktopHref} className={item(!onPhone)} aria-pressed={!onPhone}>
        <Monitor className="size-3.5" /> Desktop
      </Link>
      <Link href={phoneHref} className={item(onPhone)} aria-pressed={onPhone}>
        <Smartphone className="size-3.5" /> Phone
      </Link>
    </div>
  );
}
