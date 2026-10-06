'use client';
import {useEffect, useState} from 'react';
import Link from 'next/link';
import {PointsResponse, type PointsReason} from '@/lib/schemas/points';
import {AppShell, ApiFetchError, Notice, api, useL} from '@/components/poll/shared';
import {pointsName} from './feedback';
import {ConnectedGames} from './connected-games';

export function PointsHistory() {
  const {locale, L} = useL();
  const [data, setData] = useState<PointsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [signedOut, setSignedOut] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    api<unknown>('/api/points', {cache: 'no-store'}).then(value => {
      const parsed = PointsResponse.parse(value);
      if (active) setData(parsed);
    }).catch((e: unknown) => {
      if (!active) return;
      if (e instanceof ApiFetchError && e.status === 401) setSignedOut(true);
      else setError(locale === 'ja' ? 'ポイントを読み込めませんでした。もう一度お試しください。' : 'Could not load points. Please try again.');
    });
    return () => { active = false; };
  }, [attempt, locale]);
  const reasons: Record<PointsReason, string> = {
    poll_vote: L('投票への参加', 'Poll participation'), survey_response: L('アンケート回答', 'Survey response'),
    proposal_approved: L('写真提案の承認', 'Approved photo proposal'), qr_checkin: L('現地QRチェックイン', 'On-site QR check-in'),
    game_deposit: L('ゲームへの移動', 'Game deposit'), game_reward: L('ゲーム報酬', 'Game reward'), admin_adjust: L('管理者による調整', 'Staff adjustment'),
  };
  return <AppShell><section className="space-y-6 pt-5">
    <h1 className="text-3xl font-bold tracking-tight">{pointsName(locale)}</h1>
    <p className="text-base leading-relaxed">{L('どの選択肢を選んだかではなく、まちづくりへの参加でポイントが貯まります。', 'Earn points for participating, regardless of which option you choose.')}</p>
    {signedOut ? <Notice><Link className="inline-flex min-h-11 items-center font-semibold underline" href={`/${locale}/signin?next=${encodeURIComponent(`/${locale}/me/points`)}`}>{L('ログインしてポイントを見る', 'Sign in to view your points')}</Link></Notice>
      : error ? <Notice tone="error">{error}<button className="mt-2 block min-h-11 font-semibold underline" onClick={() => {setError(null); setAttempt(n => n + 1);}}>{L('再試行', 'Retry')}</button></Notice>
      : !data ? <p role="status">{L('読み込み中…', 'Loading points…')}</p> : <>
        <div className="rounded-2xl border border-[#dee2d6] bg-white p-6">
          <p>{L('残高', 'Balance')}</p><p className="my-3 text-4xl font-bold tabular-nums">{data.balance.toLocaleString(locale)} <span className="text-xl">pt</span></p>
          <p>{L('今日の獲得', 'Earned today')}: {data.todayEarned} / {data.dailyCap} pt</p>
          <p className="mt-2 text-sm">{L('1日の上限は日本時間の午前0時にリセットされます。', 'The daily limit resets at midnight Japan time.')}</p>
        </div>
        {data.claimedGuestPoints > 0 && <Notice tone="success">{L(`この端末で獲得した ${data.claimedGuestPoints}pt をアカウントに受け取りました！`, `We moved ${data.claimedGuestPoints} pt you earned on this device into your account!`)}</Notice>}
        {!data.eligible && <Notice><Link className="font-semibold underline" href="#resident-verification">{L('住民確認でポイントがもらえます', 'Verify your residency to earn points')}</Link></Notice>}
        <section><h2 className="text-xl font-bold">{L('ポイントの貯め方', 'How to earn')}</h2><ul className="space-y-3">{Object.entries(data.rules).map(([reason, amount]) => <li className="flex justify-between gap-4" key={reason}><span>{reasons[reason as PointsReason]}</span><span className="shrink-0 font-semibold">+{amount} pt</span></li>)}</ul>
          <p className="mt-4 text-sm leading-relaxed">{L('住民確認済みの方が対象です。投票・回答・承認は各企画につき1回、QRは各コードにつき1日1回。1日の上限により獲得数が少なくなることがあります。', 'For verified residents. Polls, responses and approvals earn once per activity; QR check-ins once per code per day. The daily cap may reduce an award.')}</p></section>
        <section><h2 className="text-xl font-bold">{L('最近の履歴（最大100件）', 'Recent history (up to 100 entries)')}</h2>
          {data.history.length === 0 ? <p>{L('まだ履歴がありません。', 'No points activity yet.')}</p> : <ul className="divide-y divide-[#dee2d6]">{data.history.map((entry, i) => <li key={`${entry.refId}-${entry.createdAt}-${i}`} className="flex justify-between gap-4 py-4"><div><p className="font-semibold">{reasons[entry.reason]}</p><time dateTime={entry.createdAt} className="text-sm">{new Intl.DateTimeFormat(locale, {dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Tokyo'}).format(new Date(entry.createdAt))} JST</time></div><span className="shrink-0 font-bold tabular-nums">{entry.amount > 0 ? '+' : ''}{entry.amount} pt</span></li>)}</ul>}</section>
        <ConnectedGames/>
      </>}
    <section id="resident-verification" className="rounded-xl bg-[#e9edde] p-5"><h2 className="text-xl font-bold">{L('住民確認について', 'Resident verification')}</h2><p className="text-base leading-relaxed">{L('市役所などで案内される住民確認用QRコードを読み取り、ログインして確認を完了してください。一般の投票用QRコードとは異なります。', 'Scan a resident-verification QR code provided through city hall or a participating event, sign in, and complete the verification step. Ordinary poll QR codes do not verify residency.')}</p></section>
  </section></AppShell>;
}
