'use client';
import {useEffect, useState} from 'react';
import Link from 'next/link';
import {ArrowRight, Check} from 'lucide-react';
import type {ListPollsResponse} from '@/lib/schemas';
import {HoyaBoya} from '@/components/mascot';
import {AppShell, Notice, OPTION_COLORS, api, pick, useL} from './shared';

export function PollList() {
  const {locale, L} = useL();
  const [polls, setPolls] = useState<ListPollsResponse['polls'] | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { api<ListPollsResponse>('/api/polls').then((d) => setPolls(d.polls)).catch((e) => setError(e.message)); }, []);

  const open = polls?.filter((p) => p.status === 'open') ?? [];
  const closed = polls?.filter((p) => p.status === 'closed') ?? [];
  const Card = ({p, i}: {p: ListPollsResponse['polls'][number]; i: number}) => (
    <Link href={`/${locale}/p/${p.id}`} className={`cs-rise cs-lift cs-press block overflow-hidden rounded-2xl border border-[#dee2d6] bg-white cs-d${Math.min(i + 2, 5)}`}>
      <div className="grid grid-cols-2 gap-0.5 bg-[#dee2d6]">
        {p.options.map((o) => (
          <div key={o.key} className="relative aspect-[4/3] bg-[#e4e8dc]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={o.imageUrl} alt="" className="size-full object-cover" loading="lazy"/>
            <span className="absolute left-2 top-2 grid size-8 place-items-center rounded-full text-base font-black text-white" style={{background: OPTION_COLORS[o.key]}}>{o.key.toUpperCase()}</span>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between gap-3 p-4">
        <div>
          <h2 className="text-lg font-bold leading-snug">{pick(locale, p.titleJa, p.titleEn)}</h2>
          {p.myChoice && <p className="mt-1 flex items-center gap-1 text-sm font-semibold text-[#1d4a2c]"><Check size={16}/>{L(`投票済み（${p.myChoice.toUpperCase()}）`, `You voted ${p.myChoice.toUpperCase()}`)}</p>}
        </div>
        <ArrowRight className="shrink-0" size={22}/>
      </div>
    </Link>
  );

  return (
    <AppShell>
      <div className="pt-4">
        <p className="cs-rise mb-2 text-xs font-bold tracking-[0.18em] text-[#5b6b5c]">{L('気仙沼市', 'KESENNUMA CITY')}</p>
        <h1 className="cs-rise cs-d1 text-[1.75rem] font-bold leading-snug tracking-tight">{L('まちの計画、あなたはどっち？', 'City plans: which do you prefer?')}</h1>
        <p className="cs-rise cs-d2 mt-3 text-base leading-relaxed text-[#4d5d4f]">{L('AとBの案を見比べて、選ぶだけ。登録は不要です。', 'Compare A and B and pick one. No sign-up needed.')}</p>
        <HoyaBoya pose="wave" height={120} className="mt-5" say={L('AとB、きみはどっちが好き？', 'A or B? Which one do you like?')}/>
        {error && <div className="mt-6"><Notice tone="error">{error}</Notice></div>}
        {!polls && !error && <div className="cs-skeleton mt-6 aspect-[4/3] rounded-2xl"/>}
        {polls && open.length === 0 && <div className="mt-6"><Notice>{L('現在受付中の投票はありません。', 'There are no open polls right now.')}</Notice></div>}
        <div className="mt-6 space-y-5">{open.map((p, i) => <Card key={p.id} p={p} i={i}/>)}</div>
        {closed.length > 0 && <>
          <h2 className="mt-10 text-xl font-bold">{L('終了した投票', 'Closed polls')}</h2>
          <div className="mt-4 space-y-5 opacity-90">{closed.map((p, i) => <Card key={p.id} p={p} i={i}/>)}</div>
        </>}
      </div>
    </AppShell>
  );
}
