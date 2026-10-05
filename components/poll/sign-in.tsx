'use client';
import {useState} from 'react';
import {useRouter, useSearchParams} from 'next/navigation';
import {Mail} from 'lucide-react';
import type {MagicLinkResponse} from '@/lib/schemas';
import {Button} from '@/components/ui/button';
import {AppShell, Notice, api, useL} from './shared';

export function SignIn() {
  const {locale, L} = useL();
  const router = useRouter();
  const params = useSearchParams();
  const raw = params.get('next') ?? `/${locale}`;
  const next = /^\/(?!\/)/.test(raw) ? raw : `/${locale}`;
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(params.get('auth_error') ? L('ログインに失敗しました。もう一度お試しください。', 'Sign-in failed. Please try again.') : null);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setError(null);
    try {
      const r = await api<MagicLinkResponse>('/api/auth/magic-link', {method: 'POST', json: {email, locale, next}});
      if (r.devSignedIn) { router.replace(next); router.refresh(); return; }
      setSent(true);
    } catch (err) { setError((err as Error).message); } finally { setBusy(false); }
  }

  return (
    <AppShell>
      <div className="pt-8">
        <h1 className="text-[1.75rem] font-bold tracking-tight">{L('ログイン', 'Sign in')}</h1>
        {sent ? (
          <div className="mt-6"><Notice tone="success">{L(`${email} にログイン用のリンクを送りました。メールを開いてリンクをタップしてください。`, `We sent a sign-in link to ${email}. Open the email and tap the link.`)}</Notice></div>
        ) : (
          <form onSubmit={submit} className="mt-6 space-y-4">
            <p className="text-base leading-relaxed text-[#4d5d4f]">{L('メールアドレスを入力してください。パスワードは不要です。', 'Enter your email. No password needed.')}</p>
            <label className="block text-base font-semibold" htmlFor="email">{L('メールアドレス', 'Email')}</label>
            <input id="email" type="email" required autoComplete="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)}
              className="block min-h-12 w-full rounded-xl border border-[#bfcbb7] bg-white px-4 text-base outline-none focus:border-[#214e43] focus:ring-2 focus:ring-[#214e43]/30"/>
            {error && <Notice tone="error">{error}</Notice>}
            <Button type="submit" className="w-full text-base" disabled={busy}><Mail size={18}/>{busy ? L('送信中…', 'Sending…') : L('ログインリンクを送る', 'Send sign-in link')}</Button>
          </form>
        )}
      </div>
    </AppShell>
  );
}
