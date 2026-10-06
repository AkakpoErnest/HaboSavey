'use client';
import {useEffect, useRef, useState, type ReactNode} from 'react';

/**
 * Photo/video banner with readable text on top. Background: a looping, silent video of Kesennuma-style bay at dusk
 * (public/video, made seamless + compressed from Ernest's Gemini clip). The poster frame shows instantly; the video
 * fades in once playing. No video for prefers-reduced-motion or data-saver users (poster only), smaller file on phones,
 * paused while off-screen.
 */
export function DuskBanner({children, priority = false, rounded = true, className = ''}: {children: ReactNode; aiLabel?: string; priority?: boolean; rounded?: boolean; className?: string}) {
  const ref = useRef<HTMLVideoElement>(null);
  const [src, setSrc] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const saveData = (navigator as Navigator & {connection?: {saveData?: boolean}}).connection?.saveData;
    if (reduced || saveData) return;
    setSrc(window.innerWidth <= 768 ? '/video/bay-dusk-720.mp4' : '/video/bay-dusk-1280.mp4');
  }, []);

  useEffect(() => {
    const v = ref.current;
    if (!v || !src) return;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) v.play().catch(() => { /* autoplay blocked: keep the poster */ });
      else v.pause();
    }, {threshold: 0.1});
    io.observe(v);
    return () => io.disconnect();
  }, [src]);

  return (
    <section className={`relative isolate overflow-hidden bg-[#14302a] text-white ${rounded ? 'rounded-3xl' : ''} ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/video/bay-dusk-poster.webp"
        alt=""
        aria-hidden="true"
        loading={priority ? 'eager' : 'lazy'}
        fetchPriority={priority ? 'high' : 'auto'}
        className="absolute inset-0 -z-20 size-full object-cover object-[70%_50%]"
      />
      {src && (
        <video
          ref={ref}
          src={src}
          muted
          loop
          playsInline
          preload="metadata"
          aria-hidden="true"
          onPlaying={() => setPlaying(true)}
          className={`absolute inset-0 -z-10 size-full object-cover object-[70%_50%] transition-opacity duration-1000 ${playing ? 'opacity-100' : 'opacity-0'}`}
        />
      )}
      {/* Darkens the left/bottom so white text stays readable on any crop */}
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-r from-[#0d241f]/85 via-[#0d241f]/45 to-transparent"/>
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-t from-[#0d241f]/60 via-transparent to-transparent"/>
      {children}
    </section>
  );
}
