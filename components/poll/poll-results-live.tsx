'use client';
import {useCallback, useEffect, useState} from 'react';
import Link from 'next/link';
import QRCode from 'qrcode';
import type {PollResultsResponse} from '@/lib/schemas';
import {Button} from '@/components/ui/button';
import {HoyaBoya} from '@/components/mascot';
import {AppShell, ApiFetchError, Notice, OPTION_COLORS, api, pick, useL} from './shared';

const REFRESH_MS = 3000;

/**
 * Presentation screen: /[locale]/poll/result (featured poll) or /[locale]/poll/<slug>/result.
 * Live vote counts for a projector, with a QR code so the audience can still vote. Staff only
 * (results can stay hidden from voters until they vote).
 */
export function PollResultsLive({id}: {id: string}) {
  const {locale, L} = useL();
  const [res, setRes] = useState<PollResultsResponse | null>(null);
  const [error, setError] = useState<ApiFetchError | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  const load = useCallback(async () => {
    try {
      setRes(await api<PollResultsResponse>(`/api/polls/${encodeURIComponent(id)}/results`));
      setError(null);
      setUpdatedAt(new Date());
    } catch (e) { setError(e as ApiFetchError); }
  }, [id]);
  useEffect(() => { load(); const t = setInterval(load, REFRESH_MS); return () => clearInterval(t); }, [load]);

  const votePath = id === 'current' ? `/${locale}/poll` : `/${locale}/poll/${res?.poll.slug ?? id}`;
  useEffect(() => {
    if (typeof window === 'undefined') return;
    QRCode.toDataURL(window.location.origin + votePath, {margin: 1, width: 600, color: {dark: '#16392f', light: '#ffffff'}}).then(setQr);
  }, [votePath]);

  if (error && (error.status === 401 || error.status === 403)) {
    return (
      <AppShell>
        <div className="space-y-4 pt-8">
          <Notice>{L('結果画面は職員用です。職員アカウントでログインしてください。', 'The results screen is for staff. Please sign in with a staff account.')}</Notice>
          <Button asChild className="w-full text-base"><Link href={`/${locale}/signin?next=${encodeURIComponent(typeof window === 'undefined' ? '' : window.location.pathname)}`}>{L('ログイン', 'Sign in')}</Link></Button>
        </div>
      </AppShell>
    );
  }
  if (error) return <AppShell><div className="pt-8"><Notice tone="error">{error.message}</Notice></div></AppShell>;
  if (!res) return <AppShell wide hidePoints><div className="cs-skeleton mt-8 h-96 rounded-3xl"/></AppShell>;

  const {poll, tally} = res;
  const pct = (n: number) => (tally.total ? Math.round((n / tally.total) * 100) : 0);
  const leader = tally.a === tally.b ? null : tally.a > tally.b ? 'a' : 'b';

  return (
    <AppShell wide hidePoints>
      <div className="pt-2">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-bold tracking-[0.18em] text-[#5b6b5c]">{L('ライブ結果', 'LIVE RESULTS')} · {poll.status === 'open' ? L('受付中', 'open') : L('終了', 'closed')}</p>
            <h1 className="text-[clamp(1.6rem,3.2vw,2.6rem)] font-bold leading-tight tracking-tight">{pick(locale, poll.questionJa, poll.questionEn)}</h1>
          </div>
          <div className="text-right">
            <p className="text-[clamp(2.5rem,6vw,4.5rem)] font-black leading-none tabular-nums">{tally.total}</p>
            <p className="text-base font-semibold text-[#4d5d4f]">{L('票', 'votes')}</p>
          </div>
        </div>

        <div className="mt-6 grid gap-5 md:grid-cols-2">
          {poll.options.map((o) => {
            const n = o.key === 'a' ? tally.a : tally.b;
            return (
              <figure key={o.key} className={`overflow-hidden rounded-3xl border-4 bg-white transition-colors ${leader === o.key ? '' : 'border-transparent'}`} style={leader === o.key ? {borderColor: OPTION_COLORS[o.key]} : undefined}>
                <div className="relative aspect-[16/9] bg-[#e4e8dc]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={o.imageUrl} alt="" className="size-full object-cover"/>
                  <span className="absolute left-4 top-4 grid size-14 place-items-center rounded-full text-3xl font-black text-white shadow" style={{background: OPTION_COLORS[o.key]}}>{o.key.toUpperCase()}</span>
                </div>
                <figcaption className="p-5">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-xl font-bold leading-snug">{pick(locale, o.labelJa, o.labelEn)}</span>
                    <span className="text-[clamp(2rem,4.5vw,3.5rem)] font-black tabular-nums" style={{color: OPTION_COLORS[o.key]}}>{pct(n)}%</span>
                  </div>
                  <div className="mt-3 h-5 overflow-hidden rounded-full bg-[#e4e8dc]">
                    <div className="h-full rounded-full transition-[width] duration-700" style={{width: `${pct(n)}%`, background: OPTION_COLORS[o.key]}}/>
                  </div>
                  <p className="mt-2 text-base text-[#4d5d4f] tabular-nums">{L(`${n} 票`, `${n} vote${n === 1 ? '' : 's'}`)}</p>
                </figcaption>
              </figure>
            );
          })}
        </div>

        <div className="mt-8 grid items-center gap-6 rounded-3xl bg-[#e8eddf] p-6 md:grid-cols-[auto_1fr_auto]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {qr && <img src={qr} alt={L('投票用QRコード', 'QR code to vote')} className="size-40 rounded-xl bg-white p-2"/>}
          <div>
            <p className="text-2xl font-bold">{L('まだの方は、いま投票できます！', "Haven't voted yet? Scan to vote now!")}</p>
            <p className="mt-1 break-all text-base text-[#4d5d4f]">{typeof window === 'undefined' ? '' : window.location.host + votePath}</p>
            {res.bySource.length > 1 && (
              <p className="mt-3 text-sm text-[#4d5d4f]">{res.bySource.map((s) => `${s.qrCodeId ? s.label : L('Webリンク', 'Web link')}: ${s.a + s.b}`).join(' · ')}</p>
            )}
          </div>
          <HoyaBoya pose="wave" height={130}/>
        </div>
        <p className="mt-3 text-right text-xs text-[#5b6b5c]">{updatedAt && L(`${updatedAt.toLocaleTimeString('ja-JP')} 更新（${REFRESH_MS / 1000}秒ごと）`, `Updated ${updatedAt.toLocaleTimeString('en-GB')} (every ${REFRESH_MS / 1000}s)`)}</p>
      </div>
    </AppShell>
  );
}
