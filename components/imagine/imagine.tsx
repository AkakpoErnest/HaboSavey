'use client';
import {useEffect, useState} from 'react';
import Link from 'next/link';
import {AlertTriangle, Camera, Check, CircleHelp, Coins, Send, Sparkles, ThumbsUp} from 'lucide-react';
import type {CreateUploadResponse, GenerationJobResponse, ImagineFeedbackResponse, ImagineGenerateResponse, ImagineInfoResponse, ImagineSubmitResponse, Preset} from '@/lib/schemas';
import {Button} from '@/components/ui/button';
import {HoyaBoya} from '@/components/mascot';
import {AppShell, Notice, api, useL} from '@/components/poll/shared';

const PRESETS: {key: Preset; emoji: string; ja: string; en: string}[] = [
  {key: 'greenery', emoji: '🌳', ja: '緑・花', en: 'Greenery'},
  {key: 'seating', emoji: '🪑', ja: 'ベンチ', en: 'Seating'},
  {key: 'lighting', emoji: '💡', ja: 'あかり', en: 'Lighting'},
  {key: 'accessibility', emoji: '♿', ja: 'バリアフリー', en: 'Accessible'},
  {key: 'tsunami_safe', emoji: '🌊', ja: '津波から安全', en: 'Tsunami-safe'},
  {key: 'festival', emoji: '🏮', ja: 'お祭り', en: 'Festival'},
];

const PENDING = 'cs_imagine_pending';
type Step = 'start' | 'generating' | 'pick' | 'done';

/** Playful lines that rotate while the AI paints (takes 30 s – 2 min). */
const WAIT_LINES: [string, string][] = [
  ['いま5年後を描いてるよ…', 'Painting the future…'],
  ['カツオに相談中…🐟', 'Asking the bonito for advice… 🐟'],
  ['ベンチの位置で悩んでるよ…🪑', 'Agonising over bench placement… 🪑'],
  ['カモメが通りすぎるのを待ってる…', 'Waiting for the seagulls to move… 🕊️'],
  ['お花をひとつずつ植えてるよ…🌸', 'Planting flowers one by one… 🌸'],
  ['夕焼けの色を混ぜてるよ…🌅', 'Mixing the perfect sunset… 🌅'],
  ['タイムマシン、燃料補給中…⏳', 'Refuelling the time machine… ⏳'],
  ['さんまを焼く匂いで集中できない…', 'Distracted by grilled sanma… 🔥'],
  ['もうすぐできるよ！（1〜2分）', 'Almost there! (1–2 min)'],
];

function WaitingLine({L}: {L: (ja: string, en: string) => string}) {
  const [i, setI] = useState(0);
  useEffect(() => { const t = setInterval(() => setI((n) => (n + 1) % WAIT_LINES.length), 3500); return () => clearInterval(t); }, []);
  return <HoyaBoya pose="wave" height={120} say={L(...WAIT_LINES[i])}/>;
}
type Result = {path: string; url: string};

/** "Kesennuma in 5 years": photo → AI visions (points) → OpenAI feedback → submit to the town (immediately public A/B poll). */
export function Imagine() {
  const {locale, L} = useL();
  const [info, setInfo] = useState<ImagineInfoResponse | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [place, setPlace] = useState('');
  const [wish, setWish] = useState('');
  const [presets, setPresets] = useState<Preset[]>([]);
  const [step, setStep] = useState<Step>('start');
  const [publishedSlug, setPublishedSlug] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [results, setResults] = useState<Result[]>([]);
  const [chosen, setChosen] = useState<Result | null>(null);
  const [feedback, setFeedback] = useState<ImagineFeedbackResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadInfo = () => api<ImagineInfoResponse>('/api/imagine/info').then(setInfo).catch(() => setInfo(null));
  useEffect(() => { loadInfo(); }, []);
  useEffect(() => { if (!file) return; const u = URL.createObjectURL(file); setPreview(u); return () => URL.revokeObjectURL(u); }, [file]);

  const canAfford = !!info && info.balance >= info.cost;
  const togglePreset = (k: Preset) => setPresets((p) => (p.includes(k) ? p.filter((x) => x !== k) : [...p, k]));

  async function startGuest() {
    setBusy(true); setError(null);
    try { await api('/api/auth/anonymous', {method: 'POST'}); await loadInfo(); } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }

  async function generate() {
    if (!file) return;
    setBusy(true); setError(null); setResults([]); setChosen(null); setFeedback(null);
    try {
      const type = (['image/jpeg', 'image/png', 'image/webp'].includes(file.type) ? file.type : 'image/jpeg') as 'image/jpeg';
      const up = await api<CreateUploadResponse>('/api/uploads', {method: 'POST', json: {bucket: 'originals', contentType: type, sizeBytes: file.size}});
      const put = await fetch(up.uploadUrl, {method: 'PUT', headers: {'content-type': type}, body: file});
      if (!put.ok) throw new Error(L('写真のアップロードに失敗しました。', 'Photo upload failed.'));
      const g = await api<ImagineGenerateResponse>('/api/imagine/generate', {method: 'POST', json: {originalPath: up.path, wish, presets}});
      setJobId(g.jobId); setStep('generating'); setInfo((i) => i && {...i, balance: g.balance});
      try { localStorage.setItem(PENDING, JSON.stringify({jobId: g.jobId, wish, presets, place, at: Date.now()})); } catch {}
      await waitForJob(g.jobId);
    } catch (e) { setError((e as Error).message); setStep('start'); } finally { setBusy(false); }
  }

  /** Polls a job until it finishes. The job id is kept in localStorage, so a reload (or a phone locking) resumes here. */
  async function waitForJob(id: string) {
    const started = Date.now();
    try {
      for (;;) {
        await new Promise((r) => setTimeout(r, 2000));
        const job = await api<GenerationJobResponse>(`/api/generate/${id}`);
        if (job.status === 'done') { setResults(job.results); setStep('pick'); break; }
        if (job.status === 'failed') { await loadInfo(); throw new Error((job.error ?? '') + ' ' + L('ポイントは返金されました。', 'Your points were refunded.')); }
        if (Date.now() - started > 16 * 60_000) throw new Error(L('時間がかかっています。少し待ってからもう一度お試しください。', 'This is taking long. Please try again shortly.'));
      }
    } finally { try { localStorage.removeItem(PENDING); } catch {} }
  }

  // Resume a generation that was still running when the page was closed or reloaded.
  useEffect(() => {
    let saved: {jobId: string; wish: string; presets: Preset[]; place: string; at: number} | null = null;
    try { saved = JSON.parse(localStorage.getItem(PENDING) ?? 'null'); } catch {}
    if (!saved?.jobId) return;
    if (Date.now() - saved.at > 20 * 60_000) { try { localStorage.removeItem(PENDING); } catch {} return; }
    setJobId(saved.jobId); setWish(saved.wish ?? ''); setPresets(saved.presets ?? []); setPlace(saved.place ?? ''); setStep('generating');
    waitForJob(saved.jobId).catch((e) => { setError((e as Error).message); setStep('start'); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function choose(r: Result) {
    setChosen(r); setFeedback(null); setError(null);
    try {
      setFeedback(await api<ImagineFeedbackResponse>('/api/imagine/feedback', {method: 'POST', json: {jobId, path: r.path, wish, presets, locale}}));
    } catch (e) { setError((e as Error).message); }
  }

  async function submit() {
    if (!chosen || !jobId) return;
    setBusy(true); setError(null);
    try {
      const published = await api<ImagineSubmitResponse>('/api/imagine/submit', {method: 'POST', json: {jobId, path: chosen.path, wish, placeName: place, feedbackSummary: feedback?.summary ?? ''}});
      setPublishedSlug(published.pollSlug); setStep('done'); window.scrollTo({top: 0, behavior: 'smooth'});
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }

  if (step === 'done') {
    return (
      <AppShell>
        <section className="pt-8 text-center">
          <h1 className="text-[1.9rem] font-black leading-snug">{L('提出しました！\nありがとう！', 'Submitted!\nThank you!')}</h1>
          <div className="mt-4 flex justify-center"><HoyaBoya pose="cheer" height={160}/></div>
          <p className="mx-auto mt-5 max-w-sm text-base leading-relaxed text-[#4d5d4f]">{L('「いま」と「5年後」のA/B投票として公開しました。誰でも投票できます。', 'Your idea is now public as an A/B poll: "today" vs "in 5 years". Anyone can vote.')}</p>
          <div className="mx-auto mt-6 grid max-w-sm gap-3">
            <Button asChild className="w-full text-base"><Link href={`/${locale}/poll/${publishedSlug}`}>{L('提案を見る・共有する', 'View and share your proposal')}</Link></Button>
            <Button variant="outline" className="w-full text-base" onClick={() => { setStep('start'); setFile(null); setPreview(null); setWish(''); setPresets([]); setResults([]); setChosen(null); setFeedback(null); }}>{L('もうひとつ想像する', 'Imagine another place')}</Button>
          </div>
        </section>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="space-y-6 pt-4">
        <header>
          <p className="cs-rise mb-2 text-xs font-bold tracking-[0.18em] text-[#5b6b5c]">{L('5年後の気仙沼', 'KESENNUMA IN 5 YEARS')}</p>
          <h1 className="cs-rise cs-d1 text-[1.8rem] font-black leading-snug tracking-tight">{L('写真を撮って、\n5年後を想像しよう', 'Snap a place.\nImagine it in 5 years.')}</h1>
          <p className="cs-rise cs-d2 mt-3 text-base leading-relaxed text-[#4d5d4f]">{L('AIが「こうなったらいいな」を3つの姿にして、アドバイスもくれます。気に入ったらまちに提案しよう！', 'AI turns your wish into 3 pictures and gives feedback. Like one? Propose it to the town!')}</p>
        </header>

        {info && (
          <div className="cs-soft-card flex items-center justify-between gap-3 border border-[#f6dfe3] bg-gradient-to-r from-[#fff6e6] to-[#fde8eb] px-4 py-3">
            <span className="flex items-center gap-2 text-base font-bold text-[#8a2f45]"><Coins size={20}/>{L(`1回 ${info.cost}pt`, `${info.cost} pt per try`)}</span>
            <span className="text-sm font-semibold text-[#4d5d4f]">{L(`残高 ${info.balance}pt`, `You have ${info.balance} pt`)}</span>
          </div>
        )}
        {info && !info.realAi && <Notice>{L('いまはデモモードです（AI画像とフィードバックはサンプル）。', 'Demo mode: AI pictures and feedback are samples for now.')}</Notice>}
        {info && !info.signedIn && (
          <Notice>
            {L('登録なしのゲストで始められます。ポイントは投票でもらえます。', 'Start as a guest, no sign-up. Earn points by voting.')}
            <div className="mt-3 flex flex-wrap gap-2"><Button className="text-base" disabled={busy} onClick={startGuest}>{L('ゲストで始める', 'Start as guest')}</Button><Button asChild variant="outline" className="text-base"><Link href={`/${locale}/poll`}>{L('投票してポイントをもらう', 'Vote to earn points')}</Link></Button></div>
          </Notice>
        )}
        {info?.signedIn && !canAfford && step === 'start' && (
          <Notice>{L(`あと${info.cost - info.balance}ptで使えます。投票に参加してポイントをためよう！`, `You need ${info.cost - info.balance} more pt. Vote in a poll to earn them!`)} <Link className="font-bold underline" href={`/${locale}/poll`}>{L('投票する', 'Vote')}</Link></Notice>
        )}

        {step === 'start' && (
          <>
            <label className="cs-soft-card relative block aspect-[4/3] cursor-pointer overflow-hidden border-[3px] border-dashed border-[#f2a7b4] bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {preview ? <img src={preview} alt="" className="size-full object-cover"/> : (
                <span className="grid size-full place-items-center text-center text-base font-bold text-[#8a2f45]"><span><Camera className="mx-auto mb-2" size={36}/>{L('写真を撮る・選ぶ', 'Take or choose a photo')}</span></span>
              )}
              <input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" className="sr-only" onChange={(e) => e.target.files?.[0] && setFile(e.target.files[0])}/>
            </label>
            <label className="block space-y-1 text-base font-bold">{L('どこの写真？（任意）', 'Where is this? (optional)')}
              <input value={place} onChange={(e) => setPlace(e.target.value)} maxLength={40} placeholder={L('例：内湾、魚市場の前', 'e.g. Inner bay, fish market')} className="block min-h-12 w-full rounded-2xl border border-[#e6d9dc] bg-white px-4 text-base font-normal"/>
            </label>
            <fieldset>
              <legend className="mb-2 text-base font-bold">{L('どんなまちにしたい？', 'What would make it better?')}</legend>
              <div className="flex flex-wrap gap-2">
                {PRESETS.map((p) => {
                  const on = presets.includes(p.key);
                  return <button type="button" key={p.key} onClick={() => togglePreset(p.key)} aria-pressed={on} className={`cs-press min-h-11 rounded-full border-2 px-4 text-base font-bold ${on ? 'cs-bounce border-[#214e43] bg-[#214e43] text-white' : 'border-[#e6d9dc] bg-white text-[#213f36]'}`}>{p.emoji} {L(p.ja, p.en)}</button>;
                })}
              </div>
            </fieldset>
            <label className="block space-y-1 text-base font-bold">{L('5年後、こうなってほしい（任意）', 'In 5 years I wish… (optional)')}
              <textarea value={wish} onChange={(e) => setWish(e.target.value)} maxLength={500} rows={3} placeholder={L('例：子どもが遊べる芝生と、海を見ながら休めるベンチ', 'e.g. a lawn for kids and benches facing the sea')} className="block w-full rounded-2xl border border-[#e6d9dc] bg-white px-4 py-3 text-base font-normal"/>
            </label>
            {error && <Notice tone="error">{error}</Notice>}
            <Button className="cs-press w-full text-base" disabled={!file || busy || !canAfford || (!wish.trim() && presets.length === 0)} onClick={generate}>
              <Sparkles size={18}/>{busy ? L('準備中…', 'Preparing…') : L(`AIで5年後を見る（${info?.cost ?? 10}pt）`, `See it in 5 years (${info?.cost ?? 10} pt)`)}
            </Button>
          </>
        )}

        {step === 'generating' && (
          <div className="space-y-4 text-center">
            <p role="status" className="sr-only">{L('AIが画像を作っています。1〜2分かかります。', 'The AI is creating images. This takes 1–2 minutes.')}</p>
            <WaitingLine L={L}/>
            <div className="grid grid-cols-3 gap-2">{[0, 1, 2].map((i) => <div key={i} className="cs-skeleton aspect-square rounded-2xl"/>)}</div>
          </div>
        )}

        {step === 'pick' && (
          <section className="space-y-4">
            <h2 className="text-xl font-black">{L('いちばん好きな未来を選んでね', 'Pick your favourite future')}</h2>
            <div className="grid grid-cols-3 gap-2">
              {results.map((r, i) => (
                <button type="button" key={r.path} onClick={() => choose(r)} aria-pressed={chosen?.path === r.path} className={`cs-press relative overflow-hidden rounded-2xl border-[3px] ${chosen?.path === r.path ? 'cs-bounce border-[#c0566b]' : 'border-transparent'}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={r.url} alt={L(`案${i + 1}`, `Option ${i + 1}`)} className="aspect-square w-full object-cover"/>
                  {chosen?.path === r.path && <span className="cs-pop absolute right-1.5 top-1.5 grid size-7 place-items-center rounded-full bg-white text-[#c0566b]"><Check size={16} strokeWidth={3}/></span>}
                </button>
              ))}
            </div>
            {chosen && (
              <div className="grid grid-cols-2 gap-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <figure className="cs-soft-card overflow-hidden bg-white"><img src={preview ?? ''} alt="" className="aspect-[4/3] w-full object-cover"/><figcaption className="p-2 text-center text-sm font-bold">{L('いま', 'Today')}</figcaption></figure>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <figure className="cs-soft-card overflow-hidden bg-white"><img src={chosen.url} alt="" className="aspect-[4/3] w-full object-cover"/><figcaption className="p-2 text-center text-sm font-bold text-[#c0566b]">{L('5年後（AIイメージ）', 'In 5 years (AI)')}</figcaption></figure>
              </div>
            )}
            {chosen && !feedback && !error && <p className="text-center text-base" aria-busy="true">{L('AIがアドバイスを考えています…', 'AI is thinking about feedback…')}</p>}
            {feedback && (
              <article className="cs-soft-card space-y-3 border border-[#e6e2d6] bg-white p-5">
                <h3 className="flex items-center gap-2 text-lg font-black"><Sparkles size={20} className="text-[#c0566b]"/>{L('AIからのフィードバック', 'AI feedback')}{feedback.demo && <span className="rounded-full bg-[#fde8eb] px-2 py-0.5 text-xs text-[#8a2f45]">{L('デモ', 'demo')}</span>}</h3>
                <p className="text-base leading-relaxed">{feedback.summary}</p>
                <ul className="space-y-1.5">{feedback.strengths.map((s) => <li key={s} className="flex gap-2 text-base"><ThumbsUp size={18} className="mt-1 shrink-0 text-[#214e43]"/>{s}</li>)}</ul>
                <ul className="space-y-1.5">{feedback.considerations.map((s) => <li key={s} className="flex gap-2 text-base"><AlertTriangle size={18} className="mt-1 shrink-0 text-[#c08a2b]"/>{s}</li>)}</ul>
                <ul className="space-y-1.5">{feedback.questionsForCity.map((s) => <li key={s} className="flex gap-2 text-base text-[#4d5d4f]"><CircleHelp size={18} className="mt-1 shrink-0"/>{s}</li>)}</ul>
              </article>
            )}
            {error && <Notice tone="error">{error}</Notice>}
            {chosen && <Button className="cs-press w-full text-base" disabled={busy} onClick={submit}><Send size={18}/>{busy ? L('送信中…', 'Sending…') : L('このアイデアをまちに提案する', 'Propose this idea to the town')}</Button>}
            <p className="text-sm text-[#5b6b5c]">{L('送信するとすぐに公開され、誰でも投票できます。人の顔や車のナンバーが写っていない写真を選んでください。', 'Submitting publishes your proposal immediately for everyone to vote on. Choose a photo without people’s faces or licence plates.')}</p>
          </section>
        )}
      </div>
    </AppShell>
  );
}
