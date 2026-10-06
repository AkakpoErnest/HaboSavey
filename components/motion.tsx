'use client';
import {useEffect, useRef, useState} from 'react';
import {ChevronDown} from 'lucide-react';

/**
 * Decorative motion pieces (all aria-hidden, CSS transform/opacity only, hidden or frozen under prefers-reduced-motion
 * via app/globals.css). Never applied to Hoya Boya himself (city rules).
 */

/** Seagulls gliding across the hero, flapping. */
export function Seagulls({count = 4}: {count?: number}) {
  const gulls = Array.from({length: count}, (_, i) => ({
    top: 8 + ((i * 37) % 30),
    d: 18 + ((i * 7) % 12),
    delay: -i * 5.5,
    s: 0.6 + ((i * 13) % 6) / 10,
  }));
  return (
    <div className="cs-gulls" aria-hidden="true">
      {gulls.map((g, i) => (
        <span key={i} className="cs-gull" style={{top: `${g.top}%`, '--d': `${g.d}s`, '--delay': `${g.delay}s`, '--s': g.s} as React.CSSProperties}>
          <svg viewBox="0 0 34 14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 9c4-5 8-5 15 1 7-6 11-6 15-1"/></svg>
        </span>
      ))}
    </div>
  );
}

/** Warm light motes rising over the water (like lantern glints). */
export function Sparks({count = 14}: {count?: number}) {
  return (
    <div className="cs-sparks" aria-hidden="true">
      {Array.from({length: count}, (_, i) => (
        <i key={i} style={{left: `${(i * 61) % 100}%`, top: `${45 + ((i * 29) % 45)}%`, '--d': `${4 + (i % 5)}s`, '--delay': `${-(i * 0.7)}s`} as React.CSSProperties}/>
      ))}
    </div>
  );
}

/** Animated wave at the bottom edge of a section, blending into the page background. */
export function WaveEdge({color = '#f8f9f3'}: {color?: string}) {
  const path = 'M0 22 C 60 6, 120 6, 180 22 S 300 38, 360 22 S 480 6, 540 22 S 660 38, 720 22 V42 H0Z';
  return (
    <div className="cs-wave-edge" aria-hidden="true">
      <svg viewBox="0 0 1440 42" preserveAspectRatio="none">
        <path d={path} fill={color}/>
        <path d={path} transform="translate(720 0)" fill={color}/>
      </svg>
    </div>
  );
}

export function ScrollHint({label}: {label: string}) {
  return <a href="#main-content" className="cs-scroll-hint" aria-label={label}><ChevronDown size={30}/></a>;
}

/** Hearts and petals floating up (thank-you screen). */
export function FloatingHearts({count = 10}: {count?: number}) {
  const colors = ['#f2a7b4', '#c0566b', '#f4c47a', '#8fc9d1'];
  return (
    <div className="cs-hearts" aria-hidden="true">
      {Array.from({length: count}, (_, i) => (
        <i key={i} style={{left: `${(i * 37) % 100}%`, '--fs': `${14 + (i % 4) * 4}px`, '--c': colors[i % colors.length], '--d': `${2.8 + (i % 4) * 0.6}s`, '--delay': `${(i * 0.45) % 3}s`} as React.CSSProperties}>{i % 3 === 0 ? '✿' : '♥'}</i>
      ))}
    </div>
  );
}

/** One-shot sparkle burst around its children (e.g. "+10 pt"). */
export function Burst({children}: {children: React.ReactNode}) {
  const colors = ['#f4c47a', '#f2a7b4', '#8fc9d1', '#c0566b'];
  return (
    <span className="cs-burst">
      {children}
      {Array.from({length: 12}, (_, i) => {
        const a = (i / 12) * Math.PI * 2;
        return <i key={i} aria-hidden="true" style={{'--bx': `${Math.cos(a) * 70}px`, '--by': `${Math.sin(a) * 46}px`, '--c': colors[i % colors.length]} as React.CSSProperties}/>;
      })}
    </span>
  );
}

/** Animates a number from its previous value to `value` (instant under reduced motion). */
export function useCountUp(value: number, ms = 900) {
  const [shown, setShown] = useState(0);
  const from = useRef(0);
  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const start = from.current;
    if (reduced || start === value) { from.current = value; setShown(value); return; }
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / ms);
      const eased = 1 - Math.pow(1 - p, 3);
      setShown(Math.round(start + (value - start) * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
      else from.current = value;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, ms]);
  return shown;
}

export function CountUp({value, ms}: {value: number; ms?: number}) {
  return <>{useCountUp(value, ms)}</>;
}
