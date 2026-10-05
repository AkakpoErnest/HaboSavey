'use client';
import {useEffect, useState} from 'react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {BadgeCheck} from 'lucide-react';
import type {MeResponse, QrRedeemResponse, QrResolveResponse} from '@/lib/schemas';
import {Button} from '@/components/ui/button';
import {HoyaBoya} from '@/components/mascot';
import {AppShell, ApiFetchError, Notice, api, useL} from './shared';

/** Landing page for printed QR codes: /q/<code>. */
export function QrLanding({code}: {code: string}) {
  const {locale, L} = useL();
  const router = useRouter();
  const [qr, setQr] = useState<QrResolveResponse | null>(null);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [state, setState] = useState<'idle' | 'working' | 'done' | 'already'>('idle');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<QrResolveResponse>(`/api/qr/${encodeURIComponent(code)}`)
      .then((r) => {
        setQr(r);
        if (r.kind === 'link' && r.usable && r.target) {
          const t = r.target;
          const path = t.type === 'poll' ? `/p/${t.id}?via=${code}` : t.type === 'survey' ? `/surveys/${t.id}` : t.type === 'challenge' ? `/challenges/${t.id}` : `/create?placeId=${t.id}`;
          router.replace(`/${locale}${path}`);
        }
        if (r.kind === 'verify_local') api<MeResponse>('/api/me').then((m) => setSignedIn(!!m.me));
      })
      .catch((e: ApiFetchError) => setError(e.status === 404 ? L('このQRコードは見つかりませんでした。', 'This QR code was not found.') : e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, locale]);

  async function verify() {
    setState('working'); setError(null);
    try {
      const r = await api<QrRedeemResponse>(`/api/qr/${encodeURIComponent(code)}/redeem`, {method: 'POST'});
      setState(r.alreadyVerified ? 'already' : 'done');
    } catch (e) { setError((e as Error).message); setState('idle'); }
  }

  return (
    <AppShell>
      <div className="pt-8">
        {error && <div className="space-y-4"><Notice tone="error">{error}</Notice><HoyaBoya pose="surprised" height={120}/></div>}
        {!qr && !error && <p className="text-base" aria-busy="true">{L('読み込み中…', 'Loading…')}</p>}
        {qr && !qr.usable && <Notice tone="error">{L('このQRコードは有効期限が切れたか、使用上限に達しています。', 'This QR code has expired or reached its limit.')}</Notice>}
        {qr?.kind === 'link' && qr.usable && <HoyaBoya pose="wave" height={120} say={L('いま開いてるよ…', 'Opening it for you…')}/>}
        {qr?.kind === 'verify_local' && qr.usable && (
          <section className="space-y-5 rounded-2xl border border-[#dee2d6] bg-white p-6">
            <BadgeCheck size={40} className="text-[#214e43]"/>
            <h1 className="text-2xl font-bold leading-snug">{L('気仙沼市民の確認', 'Kesennuma resident check')}</h1>
            <p className="text-base leading-relaxed text-[#4d5d4f]">{qr.label}</p>
            {state === 'done' || state === 'already'
              ? <Notice tone="success">{state === 'done' ? L('住民確認が完了しました ✅', 'You are now a verified resident ✅') : L('すでに確認済みです ✅', 'You are already verified ✅')}</Notice>
              : signedIn === false
                ? <Button asChild className="w-full text-base"><Link href={`/${locale}/signin?next=${encodeURIComponent(`/${locale}/q/${code}`)}`}>{L('ログインして確認する', 'Sign in to verify')}</Link></Button>
                : <Button className="w-full text-base" disabled={state === 'working' || signedIn === null} onClick={verify}>{L('住民として確認する', 'Verify me as a resident')}</Button>}
          </section>
        )}
      </div>
    </AppShell>
  );
}
