'use client';
import {useEffect, useState} from 'react';
import Link from 'next/link';
import {useSearchParams} from 'next/navigation';
import {Gamepad2, ShieldCheck} from 'lucide-react';
import type {GameLinkResponse, MeResponse} from '@/lib/schemas';
import {Button} from '@/components/ui/button';
import {HoyaBoya} from '@/components/mascot';
import {AppShell, Notice, api, useL} from '@/components/poll/shared';

const GAMES = {kesenmemento: {name: 'KesenMemento', nameJa: 'ケセンメメント（気仙沼リビングシティ）'}} as const;

/** /[locale]/connect?app=kesenmemento&return=<game url>&state=<nonce>: links a partner game to this account. */
export function ConnectGame() {
  const {locale, L} = useL();
  const params = useSearchParams();
  const app = params.get('app') as keyof typeof GAMES | null;
  const returnUrl = params.get('return') ?? '';
  const state = params.get('state') ?? '';
  const [me, setMe] = useState<MeResponse['me'] | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { api<MeResponse>('/api/me').then((r) => setMe(r.me)).catch(() => setMe(null)); }, []);

  const game = app ? GAMES[app] : undefined;
  if (!game || !returnUrl) return <AppShell><div className="pt-8"><Notice tone="error">{L('接続リンクが正しくありません。', 'This connect link is not valid.')}</Notice></div></AppShell>;

  async function connect() {
    setBusy(true); setError(null);
    try {
      const r = await api<GameLinkResponse>('/api/game/link', {method: 'POST', json: {app, returnUrl, state}});
      window.location.href = r.redirectUrl;
    } catch (e) { setError((e as Error).message); setBusy(false); }
  }

  const here = typeof window === 'undefined' ? '' : window.location.pathname + window.location.search;
  return (
    <AppShell>
      <div className="space-y-6 pt-6">
        <h1 className="cs-rise text-[1.75rem] font-bold leading-snug tracking-tight">{L(`${game.nameJa} と連携`, `Connect ${game.name}`)}</h1>
        <HoyaBoya pose="wave" height={110} say={L('ゲームでもポイントやスタンプが集まるよ！', 'Collect points and stamps in the game too!')}/>
        <ul className="space-y-3 rounded-2xl border border-[#dee2d6] bg-white p-5 text-base leading-relaxed">
          <li className="flex gap-3"><Gamepad2 className="mt-1 shrink-0" size={20}/>{L('ゲーム内で訪れた場所のスタンプと、船のストーリーのバッジが記録されます。', 'Places you visit and ship-story acts you finish are recorded as stamps and badges.')}</li>
          <li className="flex gap-3"><ShieldCheck className="mt-1 shrink-0" size={20}/>{L('ゲームが見られるのは、表示名・住民確認済みかどうか・ポイント残高・スタンプです。ゲームは訪問やクリアの記録を送り、スタンプとポイントが付与されることがあります。メールアドレスや投票内容は共有されません。', 'The game can see your display name, whether you are a verified resident, your points and your stamps, and it can send visit/completion events that add stamps and points. It never sees your email or how you voted.')}</li>
          <li className="flex gap-3"><ShieldCheck className="mt-1 shrink-0" size={20}/>{L('連携はいつでも「マイページ › ポイント」から解除できます。', 'You can disconnect at any time from My page › Points.')}</li>
        </ul>
        {error && <Notice tone="error">{error}</Notice>}
        {me === undefined ? <p className="text-base">{L('読み込み中…', 'Loading…')}</p>
          : me === null
            ? <Button asChild className="w-full text-base"><Link href={`/${locale}/signin?next=${encodeURIComponent(here)}`}>{L('ログインして連携する', 'Sign in to connect')}</Link></Button>
            : <>
                <p className="text-base">{L(`${me.displayName} さんとして連携します。`, `You'll connect as ${me.displayName}.`)}{!me.verifiedLocal && L('（ポイントは住民確認後に付与されます）', ' (points start once you are a verified resident)')}</p>
                <Button className="cs-press w-full text-base" disabled={busy} onClick={connect}>{busy ? L('連携中…', 'Connecting…') : L('連携してゲームに戻る', 'Connect and return to the game')}</Button>
              </>}
        <a href={returnUrl} className="block min-h-11 text-center text-base underline underline-offset-4">{L('キャンセル', 'Cancel')}</a>
      </div>
    </AppShell>
  );
}
