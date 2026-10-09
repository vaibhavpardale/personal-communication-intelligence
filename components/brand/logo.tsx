export const TAGLINE = "Only what needs you.";
export const DESCRIPTOR = "Notification intelligence for your inbox.";

/** The Pith mark: a bold "p" with a notification-badge dot. Same artwork as app/icon.svg. */
export function LogoMark({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" role="img" aria-label="Pith" className={className}>
      <rect width="32" height="32" rx="9" fill="var(--primary)" />
      <path d="M10 25V8.5" stroke="#fff" strokeWidth="4.4" strokeLinecap="round" fill="none" />
      <circle cx="16.4" cy="14.6" r="5.3" fill="none" stroke="#fff" strokeWidth="4.4" />
      <circle cx="25" cy="8" r="3" fill="#fbbf24" />
    </svg>
  );
}

export function Wordmark({ withTagline = false }: { withTagline?: boolean }) {
  return (
    <span className="flex items-center gap-2">
      <LogoMark />
      <span className="text-lg font-semibold tracking-tight">Pith</span>
      {withTagline && <span className="ml-1 hidden border-l pl-3 text-xs text-muted-foreground lg:inline">{TAGLINE}</span>}
    </span>
  );
}
