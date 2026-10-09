import { BRAND } from "@/lib/brand";

export const TAGLINE = BRAND.tagline;
export const DESCRIPTOR = BRAND.descriptor;

/** A funnel of narrowing bars ending in one amber dot: everything, filtered down to what matters. Same artwork as app/icon.svg. */
export function LogoMark({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" role="img" aria-label={BRAND.name} className={className}>
      <rect width="32" height="32" rx="9" fill="var(--primary)" />
      <g stroke="#fff" strokeWidth="3.2" strokeLinecap="round">
        <path d="M7.5 8.5h17" />
        <path d="M10.5 14.5h11" strokeOpacity=".75" />
        <path d="M13.5 20.5h5" strokeOpacity=".55" />
      </g>
      <circle cx="16" cy="26" r="2.6" fill="#fbbf24" />
    </svg>
  );
}

export function Wordmark({ withTagline = false }: { withTagline?: boolean }) {
  return (
    <span className="flex items-center gap-2">
      <LogoMark />
      <span className="text-lg font-semibold tracking-tight">{BRAND.name}</span>
      {withTagline && <span className="ml-1 hidden border-l pl-3 text-xs text-muted-foreground xl:inline">{TAGLINE}</span>}
    </span>
  );
}
