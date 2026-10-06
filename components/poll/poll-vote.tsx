'use client';
import {useEffect, useRef, useState} from 'react';
import Link from 'next/link';
import {Check, Maximize2, X} from 'lucide-react';
import type {PollChoice, PollDetailResponse, PollVoteResponse} from '@/lib/schemas';
import {announcePoints} from '@/components/points/feedback';
import {Button} from '@/components/ui/button';
import {HoyaBoya} from '@/components/mascot';
import {AppShell, ApiFetchError, Notice, OPTION_COLORS, ResultBars, api, pick, useL} from './shared';

export function PollVote({id, via}: {id: string; via?: string}) {
  const {locale, L} = useL();
  const [data, setData] = useState<PollDetailResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<PollChoice | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [changing, setChanging] = useState(false);
  const [zoom, setZoom] = useState<PollChoice | null>(null);
  const [justVoted, setJustVoted] = useState(false);
  const zoomRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    api<PollDetailResponse>(`/api/polls/${id}`)
      .then((d) => { setData(d); setSelected(d.myChoice); })
      .catch((e: ApiFetchError) => setError(e.status === 404 ? L('この投票は見つかりませんでした。', 'This poll could not be found.') : e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => { if (zoom) zoomRef.current?.showModal(); else zoomRef.current?.close(); }, [zoom]);

  if (error) return <AppShell><div className="space-y-4 pt-6"><Notice tone="error">{error}</Notice><HoyaBoya pose="surprised" height={120}/></div></AppShell>;
  if (!data) return <AppShell><div className="space-y-4 pt-6" aria-busy="true"><div className="cs-skeleton h-8 w-3/4 rounded"/><div className="cs-skeleton aspect-[3/2] rounded-2xl"/><div className="cs-skeleton aspect-[3/2] rounded-2xl"/></div></AppShell>;

  const {poll} = data;
  const label = (k: PollChoice) => { const o = poll.options[k === 'a' ? 0 : 1]; return pick(locale, o.labelJa, o.labelEn); };
  const voted = data.myChoice !== null && !changing;

  async function submit() {
    if (!selected) return;
    setSubmitting(true); setError(null);
    try {
      const res = await api<PollVoteResponse>(`/api/polls/${id}/vote`, {method: 'PUT', json: {choice: selected, ...(via ? {via} : {})}});
      setData((d) => d && {...d, myChoice: res.myChoice, results: res.results});
      announcePoints(res.pointsAwarded);
      setChanging(false);
      setJustVoted(true);
      window.scrollTo({top: 0, behavior: 'smooth'});
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  const blocked = {
    sign_in: <>{L('この投票にはログインが必要です。', 'Please sign in to vote in this poll.')} <Link className="font-semibold underline" href={`/${locale}/signin?next=${encodeURIComponent(`/${locale}/p/${id}${via ? `?via=${via}` : ''}`)}`}>{L('ログイン', 'Sign in')}</Link></>,
    verify: L('この投票は、住民確認済みの方のみ参加できます。市役所などで配布している住民確認QRコードを読み取ってください。', 'Only verified Kesennuma residents can vote. Scan a resident QR code from city hall to verify.'),
    not_open: L('この投票はまだ始まっていません。', 'This poll has not opened yet.'),
    closed: L('この投票は終了しました。', 'This poll has closed.'),
  } as const;

  return (
    <AppShell>
      <article className="pt-4">
        <p className="cs-rise mb-2 text-xs font-bold tracking-[0.18em] text-[#5b6b5c]">{L('気仙沼市 · 市民の声', 'KESENNUMA CITY · YOUR VOICE')}</p>
        <h1 className="cs-rise cs-d1 text-[1.75rem] font-bold leading-snug tracking-tight">{pick(locale, poll.questionJa, poll.questionEn)}</h1>
        {(poll.descriptionJa || poll.descriptionEn) && <p className="cs-rise cs-d2 mt-3 text-base leading-relaxed text-[#4d5d4f]">{pick(locale, poll.descriptionJa, poll.descriptionEn)}</p>}

        {voted && (
          <section className="relative mt-6 space-y-4 overflow-hidden rounded-2xl border border-[#dee2d6] bg-white p-5" aria-live="polite">
            {justVoted && <Confetti/>}
            <HoyaBoya pose="cheer" height={110} say={L('ありがとう！はまらいんや！', 'Thank you! Hamarainya!')}/>
            <p className="flex items-center gap-2 text-lg font-bold text-[#1d4a2c]"><span className="cs-pop grid size-8 place-items-center rounded-full bg-[#214e43] text-white"><Check size={18}/></span>{L('投票ありがとうございました！', 'Thanks for voting!')}</p>
            <p className="text-base">{L('あなたの選択：', 'Your choice: ')}<b>{data.myChoice!.toUpperCase()} · {label(data.myChoice!)}</b></p>
            {data.results
              ? <ResultBars a={data.results.a} b={data.results.b} labels={{a: label('a'), b: label('b')}}/>
              : <p className="text-base text-[#4d5d4f]">{L('結果は投票終了後に公開されます。', 'Results will be published when the poll closes.')}</p>}
            {data.canVote && <button className="min-h-11 text-base font-semibold underline underline-offset-4" onClick={() => setChanging(true)}>{L('投票を変更する', 'Change my vote')}</button>}
          </section>
        )}

        {!data.canVote && data.blockedReason && !voted && <div className="mt-6"><Notice>{blocked[data.blockedReason]}</Notice></div>}
        {!data.canVote && data.blockedReason === 'closed' && data.results && !voted && (
          <section className="mt-4 rounded-2xl border border-[#dee2d6] bg-white p-5"><h2 className="mb-3 text-lg font-bold">{L('結果', 'Results')}</h2><ResultBars a={data.results.a} b={data.results.b} labels={{a: label('a'), b: label('b')}}/></section>
        )}

        <fieldset className="mt-6 grid gap-4 sm:grid-cols-2" disabled={!data.canVote || voted}>
          <legend className="sr-only">{L('AかBを選んでください', 'Choose A or B')}</legend>
          {poll.options.map((o, i) => {
            const isSel = selected === o.key;
            return (
              <div key={o.key} className={`cs-rise relative ${i ? 'cs-d4' : 'cs-d3'}`}>
                <label
                  className={`cs-lift cs-press block cursor-pointer overflow-hidden rounded-2xl border-2 bg-white transition-shadow has-[:focus-visible]:outline has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-[#bd643c] ${isSel ? 'shadow-lg' : 'border-[#dee2d6]'}`}
                  style={isSel ? {borderColor: OPTION_COLORS[o.key]} : undefined}
                >
                  <input type="radio" name="choice" value={o.key} checked={isSel} onChange={() => setSelected(o.key)} className="sr-only"/>
                  <div className="relative aspect-[3/2] bg-[#e4e8dc]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={o.imageUrl} alt={pick(locale, o.labelJa, o.labelEn)} className="size-full object-cover" loading="eager"/>
                    <span className="absolute left-3 top-3 grid size-11 place-items-center rounded-full text-xl font-black text-white shadow" style={{background: OPTION_COLORS[o.key]}}>{o.key.toUpperCase()}</span>
                    {isSel && <span className="cs-pop absolute right-3 top-3 grid size-11 place-items-center rounded-full bg-white text-[#214e43] shadow"><Check size={24} strokeWidth={3}/></span>}
                  </div>
                  <div className="flex min-h-16 items-center gap-3 p-4 pr-16">
                    <span className={`grid size-6 shrink-0 place-items-center rounded-full border-2 ${isSel ? '' : 'border-[#9aa892]'}`} style={isSel ? {borderColor: OPTION_COLORS[o.key], background: OPTION_COLORS[o.key]} : undefined}>
                      {isSel && <span className="cs-pop size-2.5 rounded-full bg-white"/>}
                    </span>
                    <span className="text-lg font-semibold leading-snug">{pick(locale, o.labelJa, o.labelEn)}</span>
                  </div>
                </label>
                <button type="button" onClick={() => setZoom(o.key)} className="absolute bottom-3 right-3 grid size-11 place-items-center rounded-full border border-[#dee2d6] bg-white text-[#213f36]" aria-label={L(`${o.key.toUpperCase()}を拡大`, `Enlarge ${o.key.toUpperCase()}`)}>
                  <Maximize2 size={18}/>
                </button>
              </div>
            );
          })}
        </fieldset>

        {error && <div className="mt-4"><Notice tone="error">{error}</Notice></div>}
        <p className="mt-6 text-sm leading-relaxed text-[#5b6b5c]">{L('投票は匿名です。1台の端末から1票、投票期間中は変更できます。', 'Votes are anonymous. One vote per device, and you can change it while the poll is open.')}</p>
      </article>

      {data.canVote && !voted && (
        <div className="fixed inset-x-0 bottom-0 border-t border-[#dee2d6] bg-[#f8f9f3]/95 px-4 pt-3 backdrop-blur" style={{paddingBottom: 'max(12px, env(safe-area-inset-bottom))'}}>
          <div className="mx-auto flex max-w-xl gap-3">
            {changing && <Button variant="outline" className="text-base" onClick={() => { setChanging(false); setSelected(data.myChoice); }}>{L('戻る', 'Cancel')}</Button>}
            <Button className="flex-1 text-base" disabled={!selected || submitting} onClick={submit}>
              {submitting ? L('送信中…', 'Sending…') : selected ? L(`${selected.toUpperCase()} に投票する`, `Vote for ${selected.toUpperCase()}`) : L('AかBを選んでください', 'Choose A or B')}
            </Button>
          </div>
        </div>
      )}

      <dialog ref={zoomRef} onClose={() => setZoom(null)} onClick={(e) => { if (e.target === e.currentTarget) setZoom(null); }} className="m-auto w-[min(100vw-16px,1100px)] rounded-2xl bg-black p-0 backdrop:bg-black/80">
        {zoom && (
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={poll.options[zoom === 'a' ? 0 : 1].imageUrl} alt={label(zoom)} className="max-h-[85dvh] w-full object-contain"/>
            <p className="p-3 text-center text-base font-semibold text-white">{zoom.toUpperCase()} · {label(zoom)}</p>
            <button onClick={() => setZoom(null)} className="absolute right-2 top-2 grid size-11 place-items-center rounded-full bg-white/90 text-black" aria-label={L('閉じる', 'Close')}><X/></button>
          </div>
        )}
      </dialog>
    </AppShell>
  );
}

const CONFETTI_COLORS = ['#214e43', '#a8532f', '#f0c17d', '#6f9fb0', '#cf704c', '#8aa58c'];
/** Small one-shot burst after a vote (hidden under reduced motion). */
function Confetti() {
  return (
    <div className="cs-confetti" aria-hidden="true">
      {Array.from({length: 18}, (_, i) => {
        const angle = (i / 18) * Math.PI * 2;
        const dist = 90 + (i % 3) * 40;
        return <i key={i} style={{'--x': `${Math.cos(angle) * dist}px`, '--y': `${Math.sin(angle) * dist - 40}px`, '--r': `${(i % 2 ? 1 : -1) * (180 + i * 20)}deg`, '--c': CONFETTI_COLORS[i % CONFETTI_COLORS.length]} as React.CSSProperties}/>;
      })}
    </div>
  );
}
