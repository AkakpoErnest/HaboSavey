'use client';
import {useEffect, useState} from 'react';
import Link from 'next/link';
import type {MeResponse} from '@/lib/schemas';
import {Button} from '@/components/ui/button';
import {AppShell, Notice, api, useL} from '@/components/poll/shared';

/** Renders children only for staff/admin; otherwise a sign-in prompt. */
export function StaffGate({children}: {children: React.ReactNode}) {
  const {locale, L} = useL();
  const [me, setMe] = useState<MeResponse['me'] | undefined>(undefined);
  useEffect(() => { api<MeResponse>('/api/me').then((r) => setMe(r.me)).catch(() => setMe(null)); }, []);
  if (me === undefined) return <AppShell wide><p className="pt-8 text-base">{L('読み込み中…', 'Loading…')}</p></AppShell>;
  if (!me || (me.role !== 'staff' && me.role !== 'admin')) {
    const here = typeof window === 'undefined' ? `/${locale}/admin/polls` : window.location.pathname;
    return (
      <AppShell>
        <div className="space-y-4 pt-8">
          <Notice>{me ? L('このページは市の職員専用です。', 'This page is for city staff only.') : L('職員アカウントでログインしてください。', 'Please sign in with a staff account.')}</Notice>
          {!me && <Button asChild className="w-full text-base"><Link href={`/${locale}/signin?next=${encodeURIComponent(here)}`}>{L('ログイン', 'Sign in')}</Link></Button>}
        </div>
      </AppShell>
    );
  }
  return <>{children}</>;
}
