/** The Heed mark: one dot (the thing that matters) with two waves converging on it. Same artwork as app/icon.svg. */
export function LogoMark({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" role="img" aria-label="Heed" className={className}>
      <rect width="32" height="32" rx="8" fill="var(--primary)" />
      <g transform="translate(-1.2 0)" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round">
        <circle cx="20.5" cy="16" r="3.4" fill="#fff" stroke="none" />
        <path d="M14.77 11.98a7 7 0 0 0 0 8.04" />
        <path d="M11.49 9.69a11 11 0 0 0 0 12.62" strokeOpacity=".6" />
      </g>
    </svg>
  );
}

export function Wordmark() {
  return (
    <span className="flex items-center gap-2">
      <LogoMark />
      <span className="text-lg font-semibold tracking-tight">Heed</span>
    </span>
  );
}
