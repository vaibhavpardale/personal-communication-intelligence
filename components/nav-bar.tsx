"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Wordmark } from "@/components/brand/logo";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { cn } from "cn";

const LINKS = [
  { href: "/", label: "Attention" },
  { href: "/brief", label: "Brief" },
  { href: "/communications", label: "Communications" },
  { href: "/evaluation", label: "Evaluation" },
  { href: "/settings", label: "Settings" },
];

export function NavBar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-10 border-b bg-background/90 backdrop-blur">
      <nav className="mx-auto flex max-w-6xl items-center gap-4 px-6 py-3 text-sm">
        <Link href="/" aria-label="Heed home">
          <Wordmark />
        </Link>
        <div className="ml-auto flex items-center gap-1">
          {LINKS.map((link) => {
            const active = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "rounded-md px-3 py-1.5 transition-colors",
                  active
                    ? "bg-accent font-medium text-accent-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {link.label}
              </Link>
            );
          })}
          <NotificationBell />
        </div>
      </nav>
    </header>
  );
}
