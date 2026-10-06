import type {ReactNode} from 'react';

/**
 * Photo banner with readable text on top. Decorative background: an AI-generated scene of Kesennuma bay at dusk
 * (public/images/ASSETS.md). Unlabelled at Ernest's request (2026-10-06); poll option images keep their "AI image" label.
 */
export function DuskBanner({children, priority = false, className = ''}: {children: ReactNode; aiLabel?: string; priority?: boolean; className?: string}) {
  return (
    <section className={`relative isolate overflow-hidden rounded-3xl bg-[#14302a] text-white ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/images/bay-dusk-1200.webp"
        srcSet="/images/bay-dusk-800.webp 800w, /images/bay-dusk-1200.webp 1200w"
        sizes="(max-width: 640px) 100vw, 1100px"
        alt=""
        aria-hidden="true"
        loading={priority ? 'eager' : 'lazy'}
        fetchPriority={priority ? 'high' : 'auto'}
        className="absolute inset-0 -z-10 size-full object-cover object-[70%_50%]"
      />
      {/* Darkens the left/bottom so white text stays readable on any crop */}
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-r from-[#0d241f]/90 via-[#0d241f]/55 to-transparent"/>
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-t from-[#0d241f]/70 via-transparent to-transparent"/>
      {children}
    </section>
  );
}
