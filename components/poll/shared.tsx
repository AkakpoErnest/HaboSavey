'use client';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {useEffect, useState} from 'react';
import {useLocale} from 'next-intl';
import {Waves} from 'lucide-react';
import {PointsHeader} from '@/components/points/feedback';

/** Inline ja/en strings for the poll + admin screens. */
export function useL() {
  const locale = useLocale();
  return {locale, L: (ja: string, en: string) => (locale === 'ja' ? ja : en)};
}

/** Picks the ja or en field, falling back to Japanese. */
export const pick = (locale: string, ja: string, en: string | null | undefined) => (locale === 'en' && en ? en : ja);

export class ApiFetchError extends Error {
  constructor(public code: string, message: string, public status: number) { super(message); }
}

export async function api<T>(url: string, init?: RequestInit & {json?: unknown}): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {...(init?.json !== undefined ? {'content-type': 'application/json'} : {}), ...init?.headers},
    body: init?.json !== undefined ? JSON.stringify(init.json) : init?.body,
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new ApiFetchError(data?.error?.code ?? 'internal', data?.error?.message ?? 'Something went wrong', res.status);
  return data as T;
}

/** Mobile-first page frame shared by the poll and admin screens. */
export function AppShell({children, wide = false, hidePoints = false}: {children: React.ReactNode; wide?: boolean; hidePoints?: boolean}) {
  const {locale, L} = useL();
  const pathname = usePathname();
  const other = locale === 'ja' ? 'en' : 'ja';
  const switchHref = pathname.replace(/^\/(ja|en)(?=\/|$)/, `/${other}`);
  return (
    <div className="min-h-dvh bg-[#f8f9f3] text-[#213f36]">
      <header className={`mx-auto flex h-16 items-center justify-between gap-3 px-4 ${wide ? 'max-w-5xl' : 'max-w-xl'}`}>
        <Link href={`/${locale}`} className="flex min-h-11 items-center gap-2 text-lg font-extrabold tracking-tight">
          <span className="grid size-9 place-items-center rounded-full bg-[#214e43] text-white"><Waves size={20}/></span>
          Citizen Sentiment<span className="-ml-2 text-[#cf704c]">.</span>
        </Link>
        <Link href={switchHref} lang={other} className="min-h-11 content-center text-sm font-semibold underline-offset-4 hover:underline">
          {L('English', '日本語')}
        </Link>
      </header>
      {!hidePoints && <PointsHeader/>}
      <main id="main" className={`mx-auto px-4 pb-32 ${wide ? 'max-w-5xl' : 'max-w-xl'}`}>{children}</main>
    </div>
  );
}

export function Notice({tone = 'info', children}: {tone?: 'info' | 'error' | 'success'; children: React.ReactNode}) {
  const cls = tone === 'error' ? 'bg-[#fbe9e2] text-[#7a2e14]' : tone === 'success' ? 'bg-[#e3efe2] text-[#1d4a2c]' : 'bg-[#e9edde] text-[#213f36]';
  return <div role={tone === 'error' ? 'alert' : 'status'} className={`rounded-xl p-4 text-base leading-relaxed ${cls}`}>{children}</div>;
}

export const OPTION_COLORS = {a: '#214e43', b: '#a8532f'} as const;

/** Horizontal A/B result bars with percentages. */
export function ResultBars({a, b, labels}: {a: number; b: number; labels: {a: string; b: string}}) {
  const total = a + b;
  const pct = (n: number) => (total ? Math.round((n / total) * 100) : 0);
  const {L} = useL();
  const [grown, setGrown] = useState(false);
  useEffect(() => { const t = requestAnimationFrame(() => setGrown(true)); return () => cancelAnimationFrame(t); }, []);
  return (
    <div className="space-y-3">
      {(['a', 'b'] as const).map((k) => (
        <div key={k}>
          <div className="mb-1 flex justify-between gap-3 text-base font-semibold">
            <span>{k.toUpperCase()} · {labels[k]}</span>
            <span className="tabular-nums">{pct(k === 'a' ? a : b)}%</span>
          </div>
          <div className="h-4 overflow-hidden rounded-full bg-[#e4e8dc]">
            <div className="h-full rounded-full transition-[width] duration-700" style={{width: grown ? `${pct(k === 'a' ? a : b)}%` : '0%', background: OPTION_COLORS[k]}}/>
          </div>
        </div>
      ))}
      <p className="text-sm text-[#5b6b5c]">{L(`投票数 ${total}`, `${total} vote${total === 1 ? '' : 's'}`)}</p>
    </div>
  );
}
