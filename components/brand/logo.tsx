export const TAGLINE = "Only what needs you.";
export const DESCRIPTOR = "Notification intelligence for your inbox.";

/** The Heed mark: a lowercase "h" with a notification-badge dot. Same artwork as app/icon.svg. */
export function LogoMark({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" role="img" aria-label="Heed" className={className}>
      <rect width="32" height="32" rx="9" fill="var(--primary)" />
      <path
        d="M8.4 7.5v17M8.4 15.5c0-3.6 2.4-6 6.1-6s6.1 2.4 6.1 6v9"
        fill="none"
        stroke="#fff"
        strokeWidth="4.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="24.2" cy="8.8" r="3" fill="#fbbf24" />
    </svg>
  );
}

export function Wordmark({ withTagline = false }: { withTagline?: boolean }) {
  return (
    <span className="flex items-center gap-2">
      <LogoMark />
      <span className="text-lg font-semibold tracking-tight">Heed</span>
      {withTagline && <span className="ml-1 hidden border-l pl-3 text-xs text-muted-foreground lg:inline">{TAGLINE}</span>}
    </span>
  );
}
