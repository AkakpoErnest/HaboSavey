'use client';
import {useCallback, useEffect, useState} from 'react';
import Link from 'next/link';
import {ArrowLeft, Download, ExternalLink, Plus} from 'lucide-react';
import type {Poll, PollResultsResponse, QrCodeInfo, QrListResponse} from '@/lib/schemas';
import {Button} from '@/components/ui/button';
import {AppShell, Notice, OPTION_COLORS, ResultBars, api, pick, useL} from '@/components/poll/shared';
import {QrCard} from './qr-card';
import {StaffGate} from './staff-gate';

export function AdminPollDetail({id}: {id: string}) {
  const {locale, L} = useL();
  const [res, setRes] = useState<PollResultsResponse | null>(null);
  const [qrs, setQrs] = useState<QrCodeInfo[]>([]);
  const [label, setLabel] = useState('');
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [r, q] = await Promise.all([api<PollResultsResponse>(`/api/polls/${id}/results`), api<QrListResponse>('/api/admin/qr')]);
      setRes(r);
      setQrs(q.codes.filter((c) => c.targetType === 'poll' && c.targetId === id));
    } catch (e) { setError((e as Error).message); }
  }, [id]);
  useEffect(() => { load(); const t = setInterval(load, 15000); return () => clearInterval(t); }, [load]);

  async function setStatus(status: Poll['status']) {
    try { await api(`/api/polls/${id}`, {method: 'PATCH', json: {status}}); await load(); } catch (e) { setError((e as Error).message); }
  }
  async function addQr(e: React.FormEvent) {
    e.preventDefault();
    try { await api('/api/admin/qr', {method: 'POST', json: {kind: 'link', targetType: 'poll', targetId: id, label}}); setLabel(''); await load(); } catch (err) { setError((err as Error).message); }
  }

  const poll = res?.poll;
  const lbl = (i: 0 | 1) => (poll ? pick(locale, poll.options[i].labelJa, poll.options[i].labelEn) : '');
  const maxDay = Math.max(1, ...(res?.byDay.map((d) => d.a + d.b) ?? [1]));

  return (
    <StaffGate>
      <AppShell wide>
        <Link href={`/${locale}/admin/polls`} className="inline-flex min-h-11 items-center gap-1 pt-2 text-base font-semibold"><ArrowLeft size={18}/>{L('一覧へ', 'All polls')}</Link>
        {error && <div className="mt-4"><Notice tone="error">{error}</Notice></div>}
        {!res && !error && <p className="pt-6 text-base">{L('読み込み中…', 'Loading…')}</p>}
        {res && poll && (
          <div className="mt-2 grid gap-8 lg:grid-cols-[1.3fr_1fr]">
            <section className="space-y-6">
              <div>
                <h1 className="text-[1.75rem] font-bold leading-snug tracking-tight">{pick(locale, poll.questionJa, poll.questionEn)}</h1>
                <p className="mt-1 text-base text-[#5b6b5c]">{pick(locale, poll.titleJa, poll.titleEn)} · {poll.status === 'open' ? L('受付中', 'Open') : poll.status === 'closed' ? L('終了', 'Closed') : L('下書き', 'Draft')}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {poll.options.map((o, i) => (
                  <figure key={o.key} className="overflow-hidden rounded-xl border border-[#dee2d6] bg-white">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={o.imageUrl} alt="" className="aspect-[3/2] w-full object-cover"/>
                    <figcaption className="p-2 text-sm font-semibold"><span style={{color: OPTION_COLORS[o.key]}}>{o.key.toUpperCase()}</span> · {lbl(i as 0 | 1)}</figcaption>
                  </figure>
                ))}
              </div>
              <div className="rounded-2xl border border-[#dee2d6] bg-white p-5">
                <h2 className="mb-4 text-lg font-bold">{L('結果', 'Results')}</h2>
                <ResultBars a={res.tally.a} b={res.tally.b} labels={{a: lbl(0), b: lbl(1)}}/>
                <p className="mt-2 text-sm text-[#5b6b5c]">{L(`ログインして投票：${Math.round(res.signedInShare * 100)}%`, `Signed-in voters: ${Math.round(res.signedInShare * 100)}%`)}</p>
              </div>
              <div className="rounded-2xl border border-[#dee2d6] bg-white p-5">
                <h2 className="mb-3 text-lg font-bold">{L('配布チャネル別', 'By distribution channel')}</h2>
                {res.bySource.length === 0 ? <p className="text-base text-[#5b6b5c]">{L('まだ投票がありません。', 'No votes yet.')}</p> : (
                  <table className="w-full text-left text-base">
                    <thead><tr className="border-b border-[#dee2d6] text-sm text-[#5b6b5c]"><th className="py-2 font-semibold">{L('チャネル', 'Channel')}</th><th className="py-2 text-right font-semibold">A</th><th className="py-2 text-right font-semibold">B</th></tr></thead>
                    <tbody>{res.bySource.map((s) => <tr key={s.qrCodeId ?? 'web'} className="border-b border-[#eef0e8] last:border-0"><td className="py-2 pr-2">{s.qrCodeId ? s.label : L('Webリンク', 'Web link')}</td><td className="py-2 text-right tabular-nums">{s.a}</td><td className="py-2 text-right tabular-nums">{s.b}</td></tr>)}</tbody>
                  </table>
                )}
              </div>
              {res.byDay.length > 0 && (
                <div className="rounded-2xl border border-[#dee2d6] bg-white p-5">
                  <h2 className="mb-3 text-lg font-bold">{L('日別の投票数', 'Votes per day')}</h2>
                  <ul className="space-y-2">{res.byDay.map((d) => (
                    <li key={d.day} className="grid grid-cols-[6.5rem_1fr_3rem] items-center gap-2 text-sm">
                      <span className="tabular-nums">{d.day}</span>
                      <span className="flex h-3 overflow-hidden rounded-full bg-[#eef0e8]" style={{width: `${((d.a + d.b) / maxDay) * 100}%`}}>
                        <span style={{flex: d.a, background: OPTION_COLORS.a}}/><span style={{flex: d.b, background: OPTION_COLORS.b}}/>
                      </span>
                      <span className="text-right tabular-nums">{d.a + d.b}</span>
                    </li>))}</ul>
                </div>
              )}
              <div className="flex flex-wrap gap-3">
                <Button asChild variant="outline"><a href={`/api/polls/${id}/results?format=csv`}><Download size={18}/>CSV</a></Button>
                <Button asChild variant="outline"><Link href={`/${locale}/poll/${poll.slug}/result`} target="_blank"><ExternalLink size={18}/>{L('発表用の結果画面', 'Presentation results')}</Link></Button>
                <Button asChild variant="outline"><Link href={`/${locale}/poll/${poll.slug}`} target="_blank"><ExternalLink size={18}/>{L('投票ページ', 'Voting page')}</Link></Button>
                {poll.status !== 'open' && <Button onClick={() => setStatus('open')}>{L('公開する', 'Open poll')}</Button>}
                {poll.status === 'open' && <Button variant="outline" onClick={() => setStatus('closed')}>{L('投票を終了する', 'Close poll')}</Button>}
              </div>
            </section>
            <aside className="space-y-4">
              <h2 className="text-lg font-bold">{L('QRコード', 'QR codes')}</h2>
              <p className="text-base text-[#4d5d4f]">{L('配布先（ポスター、広報紙、ウェブ等）ごとにQRコードを作ると、どこから投票されたかが分かります。', 'Make one QR code per channel (poster, newsletter, website…) to see where votes come from.')}</p>
              {qrs.map((q) => <QrCard key={q.id} qr={q} title={pick(locale, poll.questionJa, poll.questionEn)}/>)}
              <form onSubmit={addQr} className="flex gap-2">
                <input required value={label} onChange={(e) => setLabel(e.target.value)} placeholder={L('例：広報けせんぬま11月号', 'e.g. November newsletter')} className="min-h-12 min-w-0 flex-1 rounded-xl border border-[#bfcbb7] bg-white px-4 text-base"/>
                <Button type="submit" aria-label={L('QRコードを追加', 'Add QR code')}><Plus size={18}/></Button>
              </form>
            </aside>
          </div>
        )}
      </AppShell>
    </StaffGate>
  );
}
