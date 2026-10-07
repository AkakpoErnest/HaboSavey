'use client';
import {useEffect, useState} from 'react';
import Link from 'next/link';
import {ArrowRight, ImagePlus, Plus, Sparkles} from 'lucide-react';
import type {CreatePollInput, CreateUploadResponse, GenerateResponse, GenerationJobResponse, ListPollsResponse, Poll, QrCodeInfo} from '@/lib/schemas';
import {Button} from '@/components/ui/button';
import {cn} from '@/lib/utils';
import {AppShell, Notice, OPTION_COLORS, api, pick, useL} from '@/components/poll/shared';
import {PROMPT_PRESETS} from './poll-prompt';
import {QrCard} from './qr-card';
import {StaffGate} from './staff-gate';

const input = 'block min-h-12 w-full rounded-xl border border-[#bfcbb7] bg-white px-4 text-base outline-none focus:border-[#214e43] focus:ring-2 focus:ring-[#214e43]/30';

async function uploadPollImage(file: File): Promise<string> {
  const type = file.type as 'image/jpeg' | 'image/png' | 'image/webp';
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(type)) throw new Error('JPEG / PNG / WebP only');
  const up = await api<CreateUploadResponse>('/api/uploads', {method: 'POST', json: {bucket: 'poll-images', contentType: type, sizeBytes: file.size}});
  const res = await fetch(up.uploadUrl, {method: 'PUT', headers: {'content-type': type}, body: file});
  if (!res.ok) throw new Error('Upload failed');
  return up.path;
}

function ImagePick({k, file, onFile, previewUrl}: {k: 'a' | 'b'; file: File | null; onFile: (f: File) => void; previewUrl?: string | null}) {
  const {L} = useL();
  const [filePreview, setPreview] = useState<string | null>(null);
  useEffect(() => { if (!file) { setPreview(null); return; } const u = URL.createObjectURL(file); setPreview(u); return () => URL.revokeObjectURL(u); }, [file]);
  const preview = previewUrl ?? filePreview;
  return (
    <label className="relative block aspect-[3/2] cursor-pointer overflow-hidden rounded-xl border-2 border-dashed bg-white" style={{borderColor: OPTION_COLORS[k]}}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {preview ? <img src={preview} alt="" className="size-full object-cover"/> : <span className="grid size-full place-items-center text-center text-base text-[#4d5d4f]"><span><ImagePlus className="mx-auto mb-2"/>{L(`案${k.toUpperCase()}の画像を選ぶ`, `Choose image ${k.toUpperCase()}`)}</span></span>}
      <span className="absolute left-2 top-2 grid size-9 place-items-center rounded-full font-black text-white" style={{background: OPTION_COLORS[k]}}>{k.toUpperCase()}</span>
      {previewUrl && <span className="absolute right-2 top-2 rounded-full bg-black/60 px-3 py-1 text-sm font-semibold text-white">{L('AIイメージ', 'AI image')}</span>}
      <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}/>
    </label>
  );
}

type Generated = {path: string; url: string};

/** Staff: render option A or B from a source photo with an image model, using a preset or edited brief. */
function GenerateOption({k, ensureSource, chosen, onChoose, defaultPreset}: {k: 'a' | 'b'; ensureSource: () => Promise<string>; chosen: string | null; onChoose: (g: Generated) => void; defaultPreset: 'wood' | 'steel' | 'classic'}) {
  const {locale, L} = useL();
  const initial = PROMPT_PRESETS.find((p) => p.id === defaultPreset)!.prompt;
  const [prompt, setPrompt] = useState<string>(initial);
  // Follow the default preset (e.g. B switches to Kit's "steel" once a source photo is added) unless the brief was edited.
  useEffect(() => { setPrompt((cur) => (PROMPT_PRESETS.some((p) => p.prompt === cur) ? initial : cur)); }, [initial]);
  const [variants, setVariants] = useState(2);
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<Generated[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setBusy(true); setError(null); setResults([]);
    try {
      const originalPath = await ensureSource();
      const {jobId} = await api<GenerateResponse>('/api/generate', {method: 'POST', json: {originalPath, prompt, variants, sourceBucket: 'poll-images', rawPrompt: true}});
      const started = Date.now();
      for (;;) {
        await new Promise((r) => setTimeout(r, 2000));
        const job = await api<GenerationJobResponse>(`/api/generate/${jobId}`);
        if (job.status === 'done') { setResults(job.results); if (job.results[0]) onChoose(job.results[0]); break; }
        if (job.status === 'failed') throw new Error(job.error ?? 'Generation failed');
        if (Date.now() - started > 4 * 60_000) throw new Error(L('時間がかかりすぎています。もう一度お試しください。', 'This is taking too long. Please try again.'));
      }
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }

  return (
    <details className="rounded-xl border border-[#dee2d6] bg-white p-4 open:space-y-3">
      <summary className="flex min-h-11 cursor-pointer items-center gap-2 text-base font-semibold"><Sparkles size={18}/>{L(`案${k.toUpperCase()}をAIで作成`, `Generate ${k.toUpperCase()} with AI`)}</summary>
      <div className="flex flex-wrap gap-2" role="group" aria-label={L('プロンプトのひな形', 'Prompt presets')}>
        {PROMPT_PRESETS.map((p) => (
          <button type="button" key={p.id} onClick={() => setPrompt(p.prompt)} aria-pressed={prompt === p.prompt}
            className={`cs-press min-h-11 rounded-full border-2 px-3 text-sm font-bold ${prompt === p.prompt ? 'border-[#214e43] bg-[#214e43] text-white' : 'border-[#e6d9dc] bg-white'}`}>
            {locale === 'en' ? p.labelEn : p.labelJa}
          </button>
        ))}
      </div>
      <p className="text-sm leading-relaxed text-[#4d5d4f]">{L('Aに実際の写真を選び、作りたい案を説明してください（英語推奨）。結果は「AIイメージ」と表示されます。', 'Choose a real photo as A and describe the proposal (English works best). Results are labelled "AI image".')}</p>
      <label className="block space-y-1 text-base font-semibold">{L('AIへの指示', 'Prompt')}
        <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} maxLength={4000} rows={12} className={cn(input, 'min-h-72 py-3 font-normal leading-relaxed')}/>
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-base">{L('案の数', 'Variants')}
          <select value={variants} onChange={(e) => setVariants(Number(e.target.value))} className="min-h-11 rounded-lg border border-[#bfcbb7] bg-white px-3 text-base">{[1, 2, 3, 4].map((n) => <option key={n}>{n}</option>)}</select>
        </label>
        <Button type="button" onClick={run} disabled={busy || !prompt.trim()}><Sparkles size={18}/>{busy ? L('作成中…（1〜2分）', 'Generating… (1–2 min)') : L('Bを作成', 'Generate B')}</Button>
        
      </div>
      {error && <Notice tone="error">{error}</Notice>}
      {results.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          {results.map((r, i) => (
            <button type="button" key={r.path} onClick={() => onChoose(r)} className={`overflow-hidden rounded-lg border-2 text-left ${chosen === r.path ? 'border-[#a8532f]' : 'border-transparent'}`} aria-pressed={chosen === r.path}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={r.url} alt={L(`AI案 ${i + 1}`, `AI option ${i + 1}`)} className="aspect-[3/2] w-full object-cover"/>
              <span className="block p-2 text-sm font-semibold">{chosen === r.path ? L('✓ Bに使用中', '✓ Using as B') : L(`案 ${i + 1} を使う`, `Use option ${i + 1}`)}</span>
            </button>
          ))}
        </div>
      )}
    </details>
  );
}

function CreatePollForm({onCreated}: {onCreated: (p: Poll, qr: QrCodeInfo | null) => void}) {
  const {L} = useL();
  const [f, setF] = useState({titleJa: '', titleEn: '', questionJa: '', questionEn: '', descriptionJa: '', aJa: '', aEn: '', bJa: '', bEn: ''});
  const [files, setFiles] = useState<{a: File | null; b: File | null}>({a: null, b: null});
  const [aPath, setAPath] = useState<string | null>(null);
  const [generatedB, setGeneratedB] = useState<Generated | null>(null);
  const [generatedA, setGeneratedA] = useState<Generated | null>(null);
  // Optional source photo for AI: both A and B can be rendered from it (Kit's A/B brief). Without it, B is rendered from photo A.
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [sourcePath, setSourcePath] = useState<string | null>(null);
  async function ensureSource() {
    if (!sourceFile) return ensureA();
    if (sourcePath) return sourcePath;
    const p = await uploadPollImage(sourceFile);
    setSourcePath(p);
    return p;
  }
  async function ensureSourceStrict() {
    if (!sourceFile) throw new Error(L('Aを作るには、上の「AI用の元写真」を選んでください。', 'To generate A, choose a source photo above first.'));
    return ensureSource();
  }
  async function ensureA() {
    if (!files.a) throw new Error(L('先にAの写真を選んでください。', 'Choose photo A first.'));
    if (aPath) return aPath;
    const p = await uploadPollImage(files.a);
    setAPath(p);
    return p;
  }
  const [openNow, setOpenNow] = useState(true);
  const [slug, setSlug] = useState('');
  const [featured, setFeatured] = useState(false);
  const [resultsVisibility, setRV] = useState<CreatePollInput['resultsVisibility']>('after_vote');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({...f, [k]: e.target.value});

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if ((!files.a && !generatedA) || (!files.b && !generatedB)) { setError(L('AとBの両方の画像を選んでください。', 'Please choose both images.')); return; }
    setBusy(true); setError(null);
    try {
      const [a, b] = await Promise.all([generatedA ? generatedA.path : ensureA(), generatedB ? generatedB.path : uploadPollImage(files.b!)]);
      const body: CreatePollInput = {
        titleJa: f.titleJa, titleEn: f.titleEn || undefined, questionJa: f.questionJa, questionEn: f.questionEn || undefined,
        descriptionJa: f.descriptionJa,
        optionA: {imagePath: a, labelJa: f.aJa, labelEn: f.aEn || undefined},
        optionB: {imagePath: b, labelJa: f.bJa, labelEn: f.bEn || undefined},
        status: openNow ? 'open' : 'draft', resultsVisibility, requireSignIn: false, verifiedOnly: false, createQr: true,
        featured, ...(slug.trim() ? {slug: slug.trim()} : {}),
      };
      const r = await api<{poll: Poll; qr: QrCodeInfo | null}>('/api/polls', {method: 'POST', json: body});
      onCreated(r.poll, r.qr);
    } catch (err) { setError((err as Error).message); } finally { setBusy(false); }
  }

  return (
    <form onSubmit={submit} className="space-y-5 rounded-2xl border border-[#dee2d6] bg-[#fffef8] p-5">
      <h2 className="text-xl font-bold">{L('新しいA/B投票', 'New A/B poll')}</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-1 text-base font-semibold">{L('タイトル（日本語）*', 'Title (Japanese) *')}<input className={input} required value={f.titleJa} onChange={set('titleJa')}/></label>
        <label className="space-y-1 text-base font-semibold">{L('タイトル（英語）', 'Title (English)')}<input className={input} value={f.titleEn} onChange={set('titleEn')}/></label>
        <label className="space-y-1 text-base font-semibold">{L('質問（日本語）*', 'Question (Japanese) *')}<input className={input} required value={f.questionJa} onChange={set('questionJa')} placeholder="どちらの案がいいですか？"/></label>
        <label className="space-y-1 text-base font-semibold">{L('質問（英語）', 'Question (English)')}<input className={input} value={f.questionEn} onChange={set('questionEn')} placeholder="Which design do you prefer?"/></label>
      </div>
      <label className="block space-y-1 text-base font-semibold">{L('説明（日本語）', 'Description (Japanese)')}<textarea className={cn(input, 'min-h-24 py-3')} value={f.descriptionJa} onChange={set('descriptionJa')}/></label>
      <div className="space-y-2 rounded-2xl border border-dashed border-[#bfcbb7] bg-white p-4">
        <p className="text-base font-semibold">{L('AI用の元写真（任意）', 'Source photo for AI (optional)')}</p>
        <p className="text-sm text-[#5b6b5c]">{L('ここに実際の写真を入れると、AとBの両方を同じ写真からAIで作れます（例：Kitの「木」と「鋼」の遊歩道）。', 'Add a real photo here to render both A and B from the same view (e.g. Kit\'s wood vs steel promenades).')}</p>
        <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => { setSourceFile(e.target.files?.[0] ?? null); setSourcePath(null); }} className="block w-full text-base"/>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        {(['a', 'b'] as const).map((k) => (
          <div key={k} className="space-y-3">
            <ImagePick k={k} file={files[k]} previewUrl={k === 'b' ? generatedB?.url : generatedA?.url}
              onFile={(file) => { setFiles({...files, [k]: file}); if (k === 'a') { setAPath(null); setGeneratedA(null); } else setGeneratedB(null); }}/>
            {k === 'a'
              ? sourceFile && <GenerateOption k="a" defaultPreset="wood" ensureSource={ensureSourceStrict} chosen={generatedA?.path ?? null} onChoose={setGeneratedA}/>
              : <GenerateOption k="b" defaultPreset={sourceFile ? 'steel' : 'classic'} ensureSource={ensureSource} chosen={generatedB?.path ?? null} onChoose={setGeneratedB}/>}
            <label className="block space-y-1 text-base font-semibold">{L(`案${k.toUpperCase()}の名前（日本語）*`, `Option ${k.toUpperCase()} label (Japanese) *`)}<input className={input} required value={f[k === 'a' ? 'aJa' : 'bJa']} onChange={set(k === 'a' ? 'aJa' : 'bJa')}/></label>
            <label className="block space-y-1 text-base font-semibold">{L(`案${k.toUpperCase()}の名前（英語）`, `Option ${k.toUpperCase()} label (English)`)}<input className={input} value={f[k === 'a' ? 'aEn' : 'bEn']} onChange={set(k === 'a' ? 'aEn' : 'bEn')}/></label>
          </div>
        ))}
      </div>
      <fieldset className="space-y-2">
        <legend className="mb-1 text-base font-semibold">{L('結果の公開', 'Show results')}</legend>
        {([['after_vote', L('投票した人に表示', 'To people who voted')], ['after_close', L('終了後に表示', 'After the poll closes')], ['always', L('常に表示', 'Always')]] as const).map(([v, t]) => (
          <label key={v} className="flex min-h-11 items-center gap-3 text-base"><input type="radio" name="rv" className="size-5 accent-[#214e43]" checked={resultsVisibility === v} onChange={() => setRV(v)}/>{t}</label>
        ))}
      </fieldset>
      <label className="block space-y-1 text-base font-semibold">{L('URL名（任意・英小文字と数字とハイフン）', 'URL name (optional: lowercase letters, digits, hyphens)')}
        <span className="flex items-center gap-1 font-normal text-[#5b6b5c]">/poll/<input className={`${input} min-h-11`} value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase())} placeholder="promenade" pattern="[a-z0-9][a-z0-9-]{1,38}[a-z0-9]"/></span>
      </label>
      <label className="flex min-h-11 items-center gap-3 text-base"><input type="checkbox" className="size-5 accent-[#214e43]" checked={openNow} onChange={(e) => setOpenNow(e.target.checked)}/>{L('すぐに公開する', 'Open immediately')}</label>
      <label className="flex min-h-11 items-center gap-3 text-base"><input type="checkbox" className="size-5 accent-[#214e43]" checked={featured} onChange={(e) => setFeatured(e.target.checked)}/>{L('/poll で表示する投票にする（チラシのQRコード用）', 'Show this poll at /poll (for flyer QR codes)')}</label>
      {error && <Notice tone="error">{error}</Notice>}
      <Button type="submit" className="w-full text-base" disabled={busy}>{busy ? L('作成中…', 'Creating…') : L('投票を作成してQRコードを発行', 'Create poll + QR code')}</Button>
    </form>
  );
}

export function AdminPolls() {
  const {locale, L} = useL();
  const [polls, setPolls] = useState<ListPollsResponse['polls'] | null>(null);
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState<{poll: Poll; qr: QrCodeInfo | null} | null>(null);
  const load = () => api<ListPollsResponse>('/api/polls').then((d) => setPolls(d.polls));
  useEffect(() => { load(); }, []);

  const statusText = (s: Poll['status']) => (s === 'open' ? L('受付中', 'Open') : s === 'closed' ? L('終了', 'Closed') : L('下書き', 'Draft'));
  return (
    <StaffGate>
      <AppShell wide>
        <div className="flex flex-wrap items-end justify-between gap-4 pt-4">
          <div>
            <p className="mb-1 text-xs font-bold tracking-[0.18em] text-[#5b6b5c]">{L('職員用', 'STAFF')}</p>
            <h1 className="text-[1.75rem] font-bold tracking-tight">{L('A/B投票の管理', 'A/B polls')}</h1>
          </div>
          {!creating && <Button onClick={() => { setCreating(true); setCreated(null); }}><Plus size={18}/>{L('新しい投票', 'New poll')}</Button>}
        </div>

        {created && (
          <div className="mt-6 space-y-3">
            <Notice tone="success">{L('投票を作成しました。QRコードを印刷して配布できます。', 'Poll created. Print the QR code to distribute it.')}</Notice>
            {created.qr && <QrCard qr={created.qr} title={pick(locale, created.poll.questionJa, created.poll.questionEn)}/>}
          </div>
        )}
        {creating && <div className="mt-6"><CreatePollForm onCreated={(poll, qr) => { setCreating(false); setCreated({poll, qr}); load(); }}/></div>}

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {polls?.map((p) => (
            <Link key={p.id} href={`/${locale}/admin/polls/${p.id}`} className="overflow-hidden rounded-2xl border border-[#dee2d6] bg-white hover:shadow-md">
              <div className="grid grid-cols-2 gap-0.5 bg-[#dee2d6]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {p.options.map((o) => <img key={o.key} src={o.imageUrl} alt="" className="aspect-[4/3] w-full object-cover" loading="lazy"/>)}
              </div>
              <div className="flex items-center justify-between gap-2 p-4">
                <div><p className="text-sm font-semibold text-[#5b6b5c]">{statusText(p.status)}</p><h2 className="font-bold leading-snug">{pick(locale, p.titleJa, p.titleEn)}</h2></div>
                <ArrowRight size={20} className="shrink-0"/>
              </div>
            </Link>
          ))}
        </div>
        {polls?.length === 0 && !creating && <div className="mt-6"><Notice>{L('まだ投票がありません。', 'No polls yet.')}</Notice></div>}
      </AppShell>
    </StaffGate>
  );
}
