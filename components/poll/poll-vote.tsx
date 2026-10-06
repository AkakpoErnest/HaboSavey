'use client';
import {useEffect, useRef, useState} from 'react';
import Link from 'next/link';
import {Check, Coins, Gamepad2, Maximize2, Sparkles, X} from 'lucide-react';
import type {PollChoice, PollDetailResponse, PollVoteResponse} from '@/lib/schemas';
import {announcePoints, pointsName} from '@/components/points/feedback';
import {Button} from '@/components/ui/button';
import {HoyaBoya} from '@/components/mascot';
import {Burst, CountUp, FloatingHearts} from '@/components/motion';
import {AppShell, ApiFetchError, Notice, OPTION_COLORS, ResultBars, api, pick, useL} from './shared';

/** KesenMemento / Kesennuma Living City (the partner game). */
const GAME_URL = process.env.NEXT_PUBLIC_GAME_URL || 'https://kesennuma-living-city-production.up.railway.app/';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** One page to vote: /[locale]/poll (featured poll), /[locale]/poll/<slug>. After voting it becomes the thank-you view. */
export function PollVote({id, via}: {id: string; via?: string}) {
  const {locale, L} = useL();
  const [data, setData] = useState<PollDetailResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<PollChoice | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [changing, setChanging] = useState(false);
  const [zoom, setZoom] = useState<PollChoice | null>(null);
  const [award, setAward] = useState<{points: number; nickname: string | null} | null>(null);
  const zoomRef = useRef<HTMLDialogElement>(null);
  const badgeOffset = useHostBadgeOffset();

  useEffect(() => {
    api<PollDetailResponse>(`/api/polls/${encodeURIComponent(id)}`)
      .then((d) => {
        setData(d);
        setSelected(d.myChoice);
        // Old uuid links show the memorable URL instead.
        if (UUID_RE.test(id) && d.poll.slug && d.poll.slug !== id) {
          window.history.replaceState(null, '', `/${locale}/poll/${d.poll.slug}${window.location.search}`);
        }
      })
      .catch((e: ApiFetchError) => setError(e.status === 404 ? L('この投票は見つかりませんでした。', 'This poll could not be found.') : e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => { if (zoom) zoomRef.current?.showModal(); else zoomRef.current?.close(); }, [zoom]);

  if (error && !data) return <AppShell><div className="space-y-4 pt-6"><Notice tone="error">{error}</Notice><HoyaBoya pose="surprised" height={120}/></div></AppShell>;
  if (!data) return <AppShell><div className="space-y-4 pt-6" aria-busy="true"><div className="cs-skeleton h-8 w-3/4 rounded"/><div className="cs-skeleton aspect-[3/2] rounded-2xl"/><div className="cs-skeleton aspect-[3/2] rounded-2xl"/></div></AppShell>;

  const {poll} = data;
  const label = (k: PollChoice) => { const o = poll.options[k === 'a' ? 0 : 1]; return pick(locale, o.labelJa, o.labelEn); };
  const voted = data.myChoice !== null && !changing;
  const pName = pointsName(locale);
  const pointsHref = `/${locale}/me/points`;
  const selfPath = id === 'current' ? `/${locale}/poll` : `/${locale}/poll/${poll.slug}`;

  async function submit() {
    if (!selected) return;
    setSubmitting(true); setError(null);
    try {
      const res = await api<PollVoteResponse>(`/api/polls/${poll.id}/vote`, {method: 'PUT', json: {choice: selected, ...(via ? {via} : {})}});
      setData((d) => d && {...d, myChoice: res.myChoice, results: res.results, votePoints: 0});
      if (res.pointsAwarded > 0) setAward({points: res.pointsAwarded, nickname: res.guest?.nickname ?? null});
      announcePoints(res.pointsAwarded);
      setChanging(false);
      window.scrollTo({top: 0, behavior: 'smooth'});
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  // ── Thank-you view: no question repeated, just thanks, points earned and a link to the points page ──
  if (voted) {
    return (
      <AppShell>
        <section className="relative overflow-hidden pt-6 text-center" aria-live="polite">
          {award && <Confetti/>}
          {award && <FloatingHearts/>}
          <h1 className="cs-rise text-[2rem] font-bold leading-snug tracking-tight">{L('ありがとう！\nはまらいんや！', 'Thank you!\nHamarainya!')}</h1>
          <div className="mt-4 flex justify-center"><HoyaBoya pose="cheer" height={170}/></div>

          {award ? (
            <div className="cs-rise cs-d2 cs-soft-card mx-auto mt-6 max-w-sm border border-[#f6dfe3] bg-gradient-to-b from-[#fff6e6] to-[#fde8eb] p-5">
              <p className="flex items-center justify-center gap-2 text-3xl font-black text-[#c0566b]"><Coins size={28}/><Burst>+<CountUp value={award.points}/> pt</Burst></p>
              <p className="mt-1 text-base">{L(`${pName}をゲットしました！`, `You earned ${pName}!`)}</p>
              {award.nickname && (
                <p className="mt-3 rounded-xl bg-[#f1f4ec] px-3 py-2 text-base">
                  {L('あなたのニックネーム：', 'Your nickname: ')}<b>{award.nickname}</b>
                  <span className="mt-1 block text-sm text-[#4d5d4f]">{L('登録なし・匿名のままでOK。ポイントはこの端末に保存されます。', 'No sign-up, fully anonymous. Points are saved on this phone.')}</span>
                </p>
              )}
              <Button asChild className="mt-4 w-full text-base"><Link href={pointsHref}>{L('ポイントを見る・ほかの端末でも使う', 'See my points / use them on another phone')}</Link></Button>
              <Button asChild variant="outline" className="mt-3 w-full text-base"><Link href={`/${locale}/imagine`}><Sparkles size={18}/>{L('ポイントで「5年後のまち」を想像する', 'Use points: imagine your town in 5 years')}</Link></Button>
              <Button asChild variant="outline" className="mt-3 w-full text-base"><a href={GAME_URL} target="_blank" rel="noopener"><Gamepad2 size={18}/>{L('ゲーム「気仙沼リビングシティ」で使う', 'Use them in the Kesennuma Living City game')}</a></Button>
            </div>
          ) : (
            <p className="mx-auto mt-6 max-w-sm text-base text-[#4d5d4f]">{L('ご参加ありがとうございました。', 'Thank you for taking part.')} <Link className="font-semibold underline underline-offset-4" href={pointsHref}>{L('ポイントを見る', 'See my points')}</Link></p>
          )}

          <p className="mt-6 text-sm text-[#5b6b5c]">{L('あなたの選択：', 'Your choice: ')}<b>{data.myChoice!.toUpperCase()} · {label(data.myChoice!)}</b></p>
          {data.results && (
            <div className="cs-soft-card mx-auto mt-4 max-w-sm border border-[#e6e2d6] bg-white p-5 text-left">
              <ResultBars a={data.results.a} b={data.results.b} labels={{a: label('a'), b: label('b')}}/>
            </div>
          )}
          {data.canVote && <button className="mt-4 min-h-11 text-sm font-semibold text-[#4d5d4f] underline underline-offset-4" onClick={() => setChanging(true)}>{L('投票を変更する', 'Change my vote')}</button>}
        </section>
      </AppShell>
    );
  }

  const blocked = {
    sign_in: <>{L('この投票にはログインが必要です。', 'Please sign in to vote in this poll.')} <Link className="font-semibold underline" href={`/${locale}/signin?next=${encodeURIComponent(selfPath + (via ? `?via=${via}` : ''))}`}>{L('ログイン', 'Sign in')}</Link></>,
    verify: L('この投票は、住民確認済みの方のみ参加できます。市役所などで配布している住民確認QRコードを読み取ってください。', 'Only verified Kesennuma residents can vote. Scan a resident QR code from city hall to verify.'),
    not_open: L('この投票はまだ始まっていません。', 'This poll has not opened yet.'),
    closed: L('この投票は終了しました。', 'This poll has closed.'),
  } as const;

  // ── The form ──
  return (
    <AppShell>
      <article className="pt-4">
        <p className="cs-rise mb-2 text-xs font-bold tracking-[0.18em] text-[#5b6b5c]">{L('気仙沼市 · 市民の声', 'KESENNUMA CITY · YOUR VOICE')}</p>
        <h1 className="cs-rise cs-d1 text-[1.75rem] font-bold leading-snug tracking-tight">{pick(locale, poll.questionJa, poll.questionEn)}</h1>
        {(poll.descriptionJa || poll.descriptionEn) && <p className="cs-rise cs-d2 mt-3 text-base leading-relaxed text-[#4d5d4f]">{pick(locale, poll.descriptionJa, poll.descriptionEn)}</p>}

        {data.votePoints > 0 && data.canVote && (
          <p className="cs-rise cs-d2 mt-4 flex items-start gap-2 rounded-[22px] bg-gradient-to-r from-[#fde8eb] to-[#fff6e6] p-3.5 text-base font-bold text-[#8a2f45]">
            <Sparkles size={20} className="mt-0.5 shrink-0"/>
            <span>{L(`投票すると${pName}が${data.votePoints}ptもらえます！`, `Vote and get ${data.votePoints} ${pName}!`)}</span>
          </p>
        )}

        {!data.canVote && data.blockedReason && <div className="mt-6"><Notice>{blocked[data.blockedReason]}</Notice></div>}
        {!data.canVote && data.blockedReason === 'closed' && data.results && (
          <section className="mt-4 rounded-2xl border border-[#dee2d6] bg-white p-5"><h2 className="mb-3 text-lg font-bold">{L('結果', 'Results')}</h2><ResultBars a={data.results.a} b={data.results.b} labels={{a: label('a'), b: label('b')}}/></section>
        )}

        <fieldset className="relative mt-6 grid gap-4 sm:grid-cols-2" disabled={!data.canVote}>
          <legend className="sr-only">{L('AかBを選んでください', 'Choose A or B')}</legend>
          <span aria-hidden="true" className="cs-vs pointer-events-none grid size-12 place-items-center rounded-full border-[3px] border-white bg-[#f4c47a] text-base font-black text-[#5a3a0a] shadow-lg">VS</span>
          {poll.options.map((o, i) => {
            const isSel = selected === o.key;
            return (
              <div key={o.key} className={`cs-rise relative ${i ? 'cs-d4' : 'cs-d3'}`}>
                <label
                  className={`cs-lift cs-press cs-soft-card block cursor-pointer overflow-hidden rounded-[28px] border-[3px] bg-white transition-shadow ${isSel ? 'cs-bounce cs-selected-glow' : ''} has-[:focus-visible]:outline has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-[#bd643c] ${isSel ? 'shadow-lg' : 'border-[#dee2d6]'}`}
                  style={isSel ? {borderColor: OPTION_COLORS[o.key]} : undefined}
                >
                  <input type="radio" name="choice" value={o.key} checked={isSel} onChange={() => setSelected(o.key)} className="sr-only"/>
                  <div className="relative aspect-[3/2] bg-[#e4e8dc]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={o.imageUrl} alt={pick(locale, o.labelJa, o.labelEn)} className="size-full object-cover" loading="eager"/>
                    <span className={`cs-badge absolute left-3 top-3 grid size-12 place-items-center text-xl font-black text-white shadow-md ${isSel ? 'cs-badge-wobble' : ''}`} style={{background: OPTION_COLORS[o.key]}}>{o.key.toUpperCase()}</span>
                    {isSel && <span className="cs-pop absolute right-3 top-3 grid size-11 place-items-center rounded-full bg-white text-[#214e43] shadow"><Check size={24} strokeWidth={3}/></span>}
                  </div>
                  <div className="flex min-h-16 items-center gap-3 p-4 pr-16">
                    <span className={`grid size-6 shrink-0 place-items-center rounded-full border-2 ${isSel ? '' : 'border-[#9aa892]'}`} style={isSel ? {borderColor: OPTION_COLORS[o.key], background: OPTION_COLORS[o.key]} : undefined}>
                      {isSel && <span className="cs-pop size-2.5 rounded-full bg-white"/>}
                    </span>
                    <span className="text-lg font-semibold leading-snug">{pick(locale, o.labelJa, o.labelEn)}</span>
                  </div>
                </label>
                <button type="button" onClick={() => setZoom(o.key)} className="cs-press absolute bottom-3 right-3 grid size-11 place-items-center rounded-full border border-[#f0dfe2] bg-white text-[#213f36] shadow-sm" aria-label={L(`${o.key.toUpperCase()}を拡大`, `Enlarge ${o.key.toUpperCase()}`)}>
                  <Maximize2 size={18}/>
                </button>
              </div>
            );
          })}
        </fieldset>

        {error && <div className="mt-4"><Notice tone="error">{error}</Notice></div>}
        <p className="mt-6 text-sm leading-relaxed text-[#5b6b5c]">{L('投票は匿名です。1台の端末から1票、投票期間中は変更できます。', 'Votes are anonymous. One vote per device, and you can change it while the poll is open.')}</p>
      </article>

      {data.canVote && (
        <div className="fixed inset-x-0 bottom-0 border-t border-[#dee2d6] bg-[#f8f9f3]/95 px-4 pt-3 backdrop-blur" style={{paddingBottom: `calc(max(12px, env(safe-area-inset-bottom)) + ${badgeOffset}px)`}}>
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

const CONFETTI_COLORS = ['#f2a7b4', '#214e43', '#f4c47a', '#8fc9d1', '#cf704c', '#c0566b'];
/** Small one-shot burst after a vote (hidden under reduced motion). */
function Confetti() {
  return (
    <div className="cs-confetti" aria-hidden="true">
      {Array.from({length: 18}, (_, i) => {
        const angle = (i / 18) * Math.PI * 2;
        const dist = 90 + (i % 3) * 40;
        const kind = i % 3 === 0 ? 'heart' : i % 3 === 1 ? 'dot' : '';
        return <i key={i} className={kind} style={{'--x': `${Math.cos(angle) * dist}px`, '--y': `${Math.sin(angle) * dist - 40}px`, '--r': `${(i % 2 ? 1 : -1) * (180 + i * 20)}deg`, '--c': CONFETTI_COLORS[i % CONFETTI_COLORS.length]} as React.CSSProperties}>{kind === 'heart' ? '♥' : null}</i>;
      })}
    </div>
  );
}

/**
 * Hosting badges (e.g. Netlify's fixed "Powered by Netlify" iframe at the bottom-right) can sit on top of our fixed
 * vote button and swallow taps. Returns the extra bottom space needed to keep the button clear of such a badge.
 */
function useHostBadgeOffset() {
  const [offset, setOffset] = useState(0);
  useEffect(() => {
    const measure = () => {
      const badge = document.getElementById('nl-badge-frame');
      const r = badge?.getBoundingClientRect();
      setOffset(r && r.height > 0 && r.top < window.innerHeight ? Math.ceil(window.innerHeight - r.top) + 8 : 0);
    };
    measure();
    const obs = new MutationObserver(measure);
    obs.observe(document.body, {childList: true});
    window.addEventListener('resize', measure);
    const t = setInterval(measure, 1500);
    return () => { obs.disconnect(); window.removeEventListener('resize', measure); clearInterval(t); };
  }, []);
  return offset;
}
