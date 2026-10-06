'use client';
import {useEffect, useState} from 'react';
import Link from 'next/link';
import {useSearchParams} from 'next/navigation';
import {Copy, KeyRound, Share2} from 'lucide-react';
import type {MeResponse} from '@/lib/schemas';
import {Button} from '@/components/ui/button';
import {Notice, api, useL} from '@/components/poll/shared';

/**
 * Guest (anonymous) account card on the points page: the nickname, plus the personal link that opens this account
 * on another phone. Uses the phone's share sheet (LINE, Messages, …) when available, otherwise copies the link.
 */
export function GuestAccountCard() {
  const {locale, L} = useL();
  const params = useSearchParams();
  const [me, setMe] = useState<MeResponse['me']>(null);
  const [copied, setCopied] = useState(false);
  useEffect(() => { api<MeResponse>('/api/me').then((r) => setMe(r.me)).catch(() => setMe(null)); }, []);

  const restoreError = params.get('restore_error') && <Notice tone="error">{L('このリンクは使えませんでした。リンクが正しいか確認してください。', 'That link did not work. Please check it is complete.')}</Notice>;
  if (!me?.anonymous || !me.personalLink) return restoreError || null;
  const link = `${me.personalLink}${locale === 'en' ? '&lang=en' : ''}`;

  async function share() {
    const text = L('市民の声（気仙沼）の私のポイント用リンク', 'My Citizen Sentiment (Kesennuma) points link');
    if (navigator.share) {
      try { await navigator.share({title: 'Citizen Sentiment', text, url: link}); return; } catch { /* cancelled */ }
    }
    await copy();
  }
  async function copy() {
    try { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 2500); } catch { /* clipboard blocked */ }
  }

  return (
    <section className="space-y-3 rounded-2xl border border-[#dee2d6] bg-white p-5">
      {restoreError}
      <p className="text-sm font-semibold text-[#5b6b5c]">{L('ゲストアカウント（登録なし・匿名）', 'Guest account (no sign-up, anonymous)')}</p>
      <p className="text-2xl font-bold">{me.displayName}</p>
      <p className="flex gap-2 text-base leading-relaxed text-[#4d5d4f]"><KeyRound size={20} className="mt-1 shrink-0"/>
        {L('ポイントはこのスマホに保存されています。別のスマホやゲームで使うには、下の「あなた専用リンク」を保存してください。リンクはパスワードと同じです。他の人に教えないでください。',
           'Your points are saved on this phone. To use them on another phone or in the game, save your personal link below. Treat it like a password: don’t share it with others.')}
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        <Button className="w-full text-base" onClick={share}><Share2 size={18}/>{L('あなた専用リンクを保存・送る', 'Save / send my personal link')}</Button>
        <Button variant="outline" className="w-full text-base" onClick={copy}><Copy size={18}/>{copied ? L('コピーしました！', 'Copied!') : L('リンクをコピー', 'Copy link')}</Button>
      </div>
      <p className="text-sm text-[#5b6b5c]">{L('メールで保存したい場合は', 'Prefer email? ')}<Link className="font-semibold underline underline-offset-4" href={`/${locale}/signin?next=${encodeURIComponent(`/${locale}/me/points`)}`}>{L('メールでログイン（任意）', 'Sign in with email (optional)')}</Link>{L('。ポイントは引き継がれます。', '. Your points carry over.')}</p>
    </section>
  );
}
