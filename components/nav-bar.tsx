"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Inbox, ListChecks, Newspaper, Settings } from "lucide-react";
import { Suspense } from "react";
import { Wordmark } from "@/components/brand/logo";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { ViewToggle } from "@/components/view-toggle";
import { cn } from "cn";

const LINKS = [
  { href: "/", label: "Attention", icon: ListChecks },
  { href: "/brief", label: "Brief", icon: Newspaper },
  { href: "/communications", label: "Mail", icon: Inbox },
  { href: "/evaluation", label: "Evals", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings },
];

const isActive = (pathname: string, href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

/** Top bar everywhere; on phones the links move to a tab bar at the bottom, where a thumb can reach them. */
export function NavBar() {
  const pathname = usePathname();

  return (
    <>
      <header className="sticky top-0 z-10 border-b bg-background/90 pt-[env(safe-area-inset-top)] backdrop-blur">
        <nav className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3 text-sm sm:px-6">
          <Link href="/" aria-label="Pith home">
            <Wordmark withTagline />
          </Link>
          <div className="ml-auto flex items-center gap-1">
            <div className="hidden items-center gap-1 md:flex">
              {LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={isActive(pathname, link.href) ? "page" : undefined}
                  className={cn(
                    "rounded-md px-3 py-1.5 transition-colors",
                    isActive(pathname, link.href)
                      ? "bg-accent font-medium text-accent-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  {link.label}
                </Link>
              ))}
            </div>
            <Suspense fallback={null}>
              <ViewToggle />
            </Suspense>
            <NotificationBell />
          </div>
        </nav>
      </header>

      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-20 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
      >
        <ul className="mx-auto grid max-w-md grid-cols-5">
          {LINKS.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium",
                    active ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  <Icon className="size-5" strokeWidth={active ? 2.25 : 1.75} />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
