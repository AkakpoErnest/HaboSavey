/**
 * Citizen Sentiment logo: a speech bubble (citizens' voice) holding two waves (Kesennuma's sea), with the dusk sun.
 * Source of truth: public/brand/logo-mark.svg (keep both in sync).
 */
export function LogoMark({size = 36, className = ''}: {size?: number; className?: string}) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} className={className} aria-hidden="true" focusable="false">
      <path d="M17 9h30a12 12 0 0 1 12 12v15a12 12 0 0 1-12 12H30l-11.5 9.5a1.6 1.6 0 0 1-2.6-1.3V48A12 12 0 0 1 5 36V21A12 12 0 0 1 17 9Z" fill="#214e43"/>
      <g fill="none" stroke="#f8f9f3" strokeWidth="4.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 25.5c3.2-3.4 6.4-3.4 9.6 0s6.4 3.4 9.6 0 6.4-3.4 9.6 0 6.4 3.4 9.6 0"/>
        <path d="M14 34.5c3.2-3.4 6.4-3.4 9.6 0s6.4 3.4 9.6 0 6.4-3.4 9.6 0"/>
      </g>
      <circle cx="51.5" cy="11.5" r="8" fill="#cf704c" stroke="#f8f9f3" strokeWidth="3"/>
    </svg>
  );
}

/** Mark + wordmark, with the small Japanese tagline. */
export function LogoLockup({size = 40, tagline = true}: {size?: number; tagline?: boolean}) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <LogoMark size={size}/>
      <span className="flex flex-col leading-none">
        <span className="font-extrabold tracking-tight">Citizen Sentiment<span className="text-[#cf704c]">.</span></span>
        {tagline && <span className="mt-1 text-[0.62em] font-semibold tracking-[0.14em] text-[#5b6b5c]">市民の声・気仙沼</span>}
      </span>
    </span>
  );
}
