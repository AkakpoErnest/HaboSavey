'use client';
import {useEffect} from 'react';
import {usePathname} from 'next/navigation';

// What animates in as it scrolls into view. Headings appear word by word; cards and blocks slide up, staggered.
const BLOCKS = 'main section .section-intro, main .challenge, main .steps > div, main .survey-banner, main .play-card, main figure, main .cs-soft-card';
const HEADINGS = 'main section h2';

/**
 * Scroll-in animations for the whole site. Classes are added only by JS (no JS → everything simply visible) and
 * nothing runs with prefers-reduced-motion. Uses one IntersectionObserver; transform/opacity only.
 */
export function ScrollReveal() {
  const pathname = usePathname();
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
    }, {rootMargin: '0px 0px -10% 0px', threshold: 0.12});

    const t = setTimeout(() => {
      // Only animate what starts below the fold, so the first screen never flashes.
      const below = (el: Element) => el.getBoundingClientRect().top > window.innerHeight * 0.9;
      document.querySelectorAll<HTMLElement>(HEADINGS).forEach((h) => {
        if (h.dataset.words || !below(h) || h.children.length) return;
        const words = (h.textContent ?? '').split(/(\s+)/);
        // Japanese has no spaces: split into short chunks of characters instead.
        const parts = words.length > 2 ? words : Array.from(h.textContent ?? '').reduce<string[]>((a, c, i) => (i % 3 ? (a[a.length - 1] += c, a) : [...a, c]), []);
        h.dataset.words = '1';
        h.setAttribute('aria-label', h.textContent ?? '');
        h.innerHTML = '';
        parts.forEach((w, i) => {
          if (/^\s+$/.test(w)) { h.append(w); return; }
          const s = document.createElement('span');
          s.className = 'cs-word'; s.textContent = w; s.setAttribute('aria-hidden', 'true');
          s.style.transitionDelay = `${Math.min(i, 14) * 55}ms`;
          h.append(s);
        });
        h.classList.add('cs-reveal-words'); io.observe(h);
      });
      const groups = new Map<Element | null, number>();
      document.querySelectorAll<HTMLElement>(BLOCKS).forEach((el) => {
        if (el.classList.contains('cs-reveal') || !below(el)) return;
        const n = groups.get(el.parentElement) ?? 0; groups.set(el.parentElement, n + 1);
        el.style.transitionDelay = `${Math.min(n, 5) * 90}ms`;
        el.classList.add('cs-reveal'); io.observe(el);
      });
    }, 50);
    return () => { clearTimeout(t); io.disconnect(); };
  }, [pathname]);
  return null;
}
