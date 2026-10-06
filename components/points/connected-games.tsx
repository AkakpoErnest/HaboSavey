'use client';
import {useEffect, useState} from 'react';
import {GameLinksResponse, type GameLinkInfo} from '@/lib/schemas/game';
import {api, Notice, useL} from '@/components/poll/shared';

export function ConnectedGames() {
  const {locale, L} = useL();
  const [links, setLinks] = useState<GameLinkInfo[] | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  useEffect(() => {
    let active = true;
    api<unknown>('/api/game/links', {cache: 'no-store'})
      .then(value => { const parsed = GameLinksResponse.parse(value); if (active) setLinks(parsed.links); })
      .catch(() => { if (active) setError(true); });
    return () => { active = false; };
  }, [attempt]);
  async function disconnect(id: string) {
    setBusy(id); setError(false); setNotice('');
    try {
      await api(`/api/game/links/${encodeURIComponent(id)}`, {method: 'DELETE'});
      setLinks(current => current?.map(link => link.id === id ? {...link, revoked: true} : link) ?? null);
      setConfirm(null);
      setNotice(L('連携を解除しました。', 'Game disconnected.'));
    } catch {
      setError(true);
    } finally { setBusy(null); }
  }
  const date = (value: string) => new Intl.DateTimeFormat(locale, {dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Tokyo'}).format(new Date(value));
  return <section aria-labelledby="connected-games-title" className="space-y-4">
    <h2 id="connected-games-title" className="text-xl font-bold">{L('連携中のゲーム', 'Connected games')}</h2>
    <p className="text-base leading-relaxed">{L('連携を解除すると、その接続からの情報取得とイベント送信が停止します。再連携はゲームから行えます。', 'Disconnecting stops that connection from reading your profile or submitting game events. You can reconnect from the game.')}</p>
    {notice && <Notice tone="success">{notice}</Notice>}
    {error && <Notice tone="error">{L('操作を完了できませんでした。接続状況を再読み込みしてください。', 'Could not complete the request. Reload connections to check their status.')}<button className="block min-h-11 font-semibold underline" disabled={busy !== null} onClick={() => {setError(false); setConfirm(null); setAttempt(n => n + 1);}}>{L('再読み込み', 'Reload connections')}</button></Notice>}
    {links === null && !error && <p role="status">{L('連携を読み込み中…', 'Loading connections…')}</p>}
    {links?.length === 0 && <p>{L('連携したゲームはありません。', 'No games connected yet.')}</p>}
    <ul className="space-y-3">{links?.map(link => <li key={link.id} className="space-y-3 rounded-xl border border-[#dee2d6] bg-white p-4">
      <h3 className="text-lg font-semibold">{locale === 'ja' ? link.appName.ja : link.appName.en}</h3>
      <p className="text-sm">{L('連携日時', 'Connected')}: <time dateTime={link.createdAt}>{date(link.createdAt)} JST</time></p>
      <p className="text-sm">{L('最終利用', 'Last used')}: {link.lastUsedAt ? <time dateTime={link.lastUsedAt}>{date(link.lastUsedAt)} JST</time> : L('まだ利用されていません', 'Not used yet')}</p>
      {link.revoked ? <p className="font-semibold">{L('解除済み', 'Disconnected')}</p> : confirm === link.id ? <div className="space-y-2">
        <p>{L('この連携を解除しますか？', 'Disconnect this connection?')}</p>
        <div className="flex flex-wrap gap-3"><button disabled={busy !== null} className="min-h-11 rounded-lg bg-[#214e43] px-4 font-semibold text-white disabled:opacity-50" onClick={() => disconnect(link.id)}>{busy === link.id ? L('解除中…', 'Disconnecting…') : L('解除する', 'Disconnect')}</button><button disabled={busy !== null} className="min-h-11 px-4 underline" onClick={() => setConfirm(null)}>{L('キャンセル', 'Cancel')}</button></div>
      </div> : <button disabled={busy !== null} className="min-h-11 font-semibold underline" onClick={() => setConfirm(link.id)}>{L('連携を解除', 'Disconnect game')}</button>}
    </li>)}</ul>
  </section>;
}
