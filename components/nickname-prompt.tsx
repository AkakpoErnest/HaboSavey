'use client';
import {useEffect, useRef, useState} from 'react';
import {usePathname} from 'next/navigation';

const SEEN = 'cs_nick_asked';
// Screens where a popup would get in the way (projector, staff, sign-in, account linking).
const SKIP = /\/(poll\/(.+\/)?result|admin|signin|connect)(\/|$)/;

/**
 * First visit: asks which nickname the person wants. Saving creates their guest account (no email) with that name;
 * "Later" keeps things as they are and a random nickname is given when they first earn points. Asked once per device.
 */
export function NicknamePrompt({locale}: {locale: string}) {
  const ja = locale === 'ja';
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (SKIP.test(pathname)) return;
    try { if (localStorage.getItem(SEEN)) return; } catch { return; }
    let alive = true;
    fetch('/api/me').then((r) => r.json()).then((d) => {
      const me = d?.me;
      if (!alive) return;
      // Already chose a name (email account, or a guest who renamed) → never ask.
      if (me && !me.anonymous) { remember(); return; }
      setName(me?.displayName ?? '');
      setOpen(true);
    }).catch(() => {});
    return () => { alive = false; };
  }, [pathname]);
  useEffect(() => { if (open) input.current?.focus(); }, [open]);

  const remember = () => { try { localStorage.setItem(SEEN, '1'); } catch {} };
  const close = () => { remember(); setOpen(false); };

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const displayName = name.trim();
    if (!displayName) return;
    setBusy(true); setError('');
    try {
      await fetch('/api/auth/anonymous', {method: 'POST'});
      const r = await fetch('/api/me', {method: 'PATCH', headers: {'content-type': 'application/json'}, body: JSON.stringify({displayName})});
      if (!r.ok) throw new Error();
      close();
    } catch {
      setError(ja ? '保存できませんでした。もう一度お試しください。' : "Couldn't save. Please try again.");
    } finally { setBusy(false); }
  }

  if (!open) return null;
  return (
    <div className="nick-backdrop" role="dialog" aria-modal="true" aria-labelledby="nick-title">
      <form className="nick-card" onSubmit={save}>
        <h2 id="nick-title">{ja ? 'ようこそ！ニックネームは？' : 'Welcome! Pick a nickname'}</h2>
        <p>{ja ? '名前やメールは不要です。投票でたまるポイントはこのニックネームに貯まります。' : 'No real name or email needed. Points you earn are saved under this nickname.'}</p>
        <input ref={input} value={name} onChange={(e) => setName(e.target.value)} maxLength={40} placeholder={ja ? '例：さんま好き' : 'e.g. SanmaFan'} aria-label={ja ? 'ニックネーム' : 'Nickname'}/>
        {error && <p className="nick-error" role="alert">{error}</p>}
        <div className="nick-actions">
          <button type="button" className="nick-later" onClick={close}>{ja ? 'あとで' : 'Later'}</button>
          <button type="submit" className="nick-save" disabled={busy || !name.trim()}>{busy ? '…' : ja ? 'はじめる' : 'Start'}</button>
        </div>
      </form>
    </div>
  );
}
