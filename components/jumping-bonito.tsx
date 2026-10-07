'use client';

import {useEffect, useRef, useState} from 'react';

/** A short decorative leap, with a long quiet interval between appearances. */
export function JumpingBonito() {
  const ref = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  useEffect(() => {
    let visible = false;
    const update = () => setPlaying(visible && !document.hidden);
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      update();
    });
    if (ref.current) observer.observe(ref.current);
    document.addEventListener('visibilitychange', update);
    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', update);
    };
  }, []);

  return <div ref={ref} className="bonito-water" data-playing={playing} aria-hidden="true">
    <svg className="bonito-fish" viewBox="0 0 120 52" fill="none">
      <path d="M28 26 6 8l5 18-5 18 22-18Z" fill="#214e43"/>
      <path d="M24 26C45 2 88 5 114 26 88 48 45 50 24 26Z" fill="#9bbeb7"/>
      <path d="M24 26C45 2 88 5 114 26H24Z" fill="#214e43"/>
      <path d="m53 12 14-11 9 13M57 40l13 10 6-11" fill="#3e746a"/>
      <path d="m76 27-16 12 5-14" fill="#527d74"/>
      <path d="m34 30 23 5m-17 0 19 5m-10-2 14 5" stroke="#527d74" strokeWidth="2" strokeLinecap="round"/>
      <path d="M92 18q-8 10 0 18" stroke="#dce9dd" strokeWidth="2"/>
      <circle cx="101" cy="23" r="3" fill="#f8f9f3"/><circle cx="102" cy="23" r="1.5" fill="#213f36"/>
    </svg>
    <svg className="bonito-splash" viewBox="0 0 300 35" fill="none">
      <ellipse cx="190" cy="27" rx="34" ry="5" stroke="#9bbeb7" strokeWidth="2"/>
      <path d="m170 19-7-9m28 7V4m20 15 8-9" stroke="#9bbeb7" strokeWidth="3" strokeLinecap="round"/>
    </svg>
  </div>;
}
