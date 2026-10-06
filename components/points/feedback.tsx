'use client';
import {useEffect, useState} from 'react';
import {useLocale} from 'next-intl';
import {usePathname} from 'next/navigation';
import Link from 'next/link';
import {PointsResponse} from '@/lib/schemas/points';

const eventName = 'citizen-points-updated';
let award: {amount: number; at: number} | null = null;
export function announcePoints(amount: number) {
  if (!Number.isInteger(amount) || amount <= 0) return;
  award = {amount, at: Date.now()};
  window.dispatchEvent(new Event(eventName));
}
export function refreshPoints() { window.dispatchEvent(new Event(eventName)); }
export function pointsName(locale: string) {
  return process.env.NEXT_PUBLIC_POINTS_NAME || (locale === 'ja' ? 'はまらいんやポイント' : 'Hamarainya Points');
}

export function PointsHeader() {
  const locale = useLocale();
  const pathname = usePathname();
  const [balance, setBalance] = useState<number | null>(null);
  const [earned, setEarned] = useState<number | null>(null);
  useEffect(() => {
    let active = true;
    let request = 0;
    const update = () => {
      const current = ++request;
      if (award && Date.now() - award.at < 8000) setEarned(award.amount);
      fetch('/api/points', {cache: 'no-store'})
        .then(async r => r.ok ? PointsResponse.parse(await r.json()) : null)
        .then(data => { if (active && current === request) setBalance(data?.balance ?? null); })
        .catch(() => { if (active && current === request) setBalance(null); });
    };
    update();
    window.addEventListener(eventName, update);
    return () => { active = false; window.removeEventListener(eventName, update); };
  }, [pathname]);
  return <div className="mx-auto flex max-w-xl flex-wrap items-center justify-between gap-2 px-4 pb-3 text-sm">
    <Link href={`/${locale}/me/points`} className="inline-flex min-h-11 max-w-full items-center gap-2 rounded-full border border-[#dee2d6] bg-white px-4 font-semibold">
      <span className="break-words">{balance === null ? (locale === 'ja' ? 'ポイントを見る' : 'View points') : pointsName(locale)}</span>
      {balance !== null && <span className="shrink-0 tabular-nums">{balance.toLocaleString(locale)} pt</span>}
    </Link>
    {earned !== null && <div role="status" className="flex items-center gap-2 rounded-lg bg-[#e3efe2] px-3 text-[#1d4a2c]">
      <span>+{earned} pt · {locale === 'ja' ? '獲得しました' : 'Points earned'}</span>
      <button className="min-h-11 min-w-11 font-bold" aria-label={locale === 'ja' ? '閉じる' : 'Dismiss'} onClick={() => {award = null; setEarned(null);}}>×</button>
    </div>}
  </div>;
}
