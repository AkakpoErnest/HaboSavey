// Citizen Sentiment × KesenMemento: drop-in connector (no dependencies, plain ES module).
//
//   import { createCitizenSentiment } from './cs-connect.js';
//   const cs = createCitizenSentiment({ baseUrl: 'https://<citizen-sentiment-host>', lang: 'ja' });
//   cs.handleRedirect();          // once at startup: picks up the token after "Connect"
//   cs.mountChip();               // optional HUD chip (points + stamps, or a Connect button)
//   cs.placeVisited('bay');       // when the player reaches a tour stop / place
//   cs.actCompleted(1);           // when a ship act (1–3) is finished
//
// Everything is fail-safe: if Citizen Sentiment is unreachable or the player never connects, calls resolve quietly
// and the game is unaffected. Add ?cs=0 to the game URL to disable it entirely.

const TOKEN_KEY = 'cs.token';
const STATE_KEY = 'cs.state';
const SENT_PREFIX = 'cs.sent:';

const TEXT = {
  ja: { connect: '市民の声と連携', pts: 'pt', stamps: 'スタンプ', newStamp: '新しいスタンプ！', points: 'ポイント', expired: '連携の有効期限が切れました' },
  en: { connect: 'Connect Citizen Sentiment', pts: 'pt', stamps: 'stamps', newStamp: 'New stamp!', points: 'points', expired: 'Your link expired' },
};

export function createCitizenSentiment({ baseUrl, app = 'kesenmemento', lang = 'ja', storage = safeStorage() } = {}) {
  if (!baseUrl) throw new Error('cs-connect: baseUrl is required');
  const api = baseUrl.replace(/\/$/, '');
  const disabled = typeof location !== 'undefined' && new URLSearchParams(location.search).get('cs') === '0';
  const t = () => TEXT[lang] ?? TEXT.ja;
  const listeners = new Set();
  let me = null;
  let chip = null;

  const token = () => storage.get(TOKEN_KEY);
  // "Already sent" memory is per game + per account (the token's subject), so a second account on the same device
  // still collects its own stamps. Corrupt storage is treated as empty.
  const sentKey = () => `${SENT_PREFIX}${app}:${tokenSubject(token()) ?? 'anon'}`;
  const sent = () => {
    try { const v = JSON.parse(storage.get(sentKey()) || '[]'); return new Set(Array.isArray(v) ? v : []); } catch { return new Set(); }
  };
  const markSent = (k) => { const s = sent(); s.add(k); storage.set(sentKey(), JSON.stringify([...s].slice(-300))); };
  const emit = () => listeners.forEach((fn) => { try { fn(me); } catch { /* listener error */ } });

  async function call(path, init = {}) {
    if (disabled || !token()) return null;
    try {
      const res = await fetch(`${api}${path}`, {
        ...init,
        headers: { authorization: `Bearer ${token()}`, ...(init.body ? { 'content-type': 'application/json' } : {}) },
      });
      if (res.status === 401) { storage.remove(TOKEN_KEY); me = null; emit(); toast(t().expired); return null; }
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null; // offline / blocked: never break the game
    }
  }

  async function refresh() {
    me = await call('/api/game/me');
    emit();
    return me;
  }

  async function send(event, dedupeKey) {
    if (disabled || !token() || sent().has(dedupeKey)) return null;
    const r = await call('/api/game/events', { method: 'POST', body: JSON.stringify(event) });
    if (r) {
      markSent(dedupeKey);
      if (r.newStamp || r.pointsAwarded) {
        toast(r.pointsAwarded ? `${t().newStamp} +${r.pointsAwarded} ${t().pts}` : t().newStamp);
        refresh();
      }
    }
    return r;
  }

  function toast(text) {
    if (typeof document === 'undefined') return;
    const el = document.createElement('div');
    el.textContent = text;
    el.setAttribute('role', 'status');
    Object.assign(el.style, {
      position: 'fixed', left: '50%', top: '16px', transform: 'translateX(-50%)', zIndex: 2147483000,
      background: '#214e43', color: '#fff', padding: '10px 18px', borderRadius: '999px', font: '600 15px system-ui, sans-serif',
      boxShadow: '0 6px 20px rgba(0,0,0,.25)', transition: 'opacity .4s', pointerEvents: 'none',
    });
    document.body.appendChild(el);
    setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.remove(), 450); }, 2200);
  }

  const cs = {
    /** True once the player has linked their Citizen Sentiment account. */
    isConnected: () => !disabled && !!token(),

    /** Sends the player to Citizen Sentiment to sign in and approve; they come back to the current URL. */
    connect() {
      if (disabled) return;
      const state = randomNonce();
      storage.set(STATE_KEY, state);
      const back = location.href.split('#')[0];
      location.href = `${api}/${lang}/connect?` + new URLSearchParams({ app, return: back, state });
    },

    /** Call once at startup. Reads #cs_token=… after the connect redirect, checks state, stores the token. */
    handleRedirect() {
      if (disabled || typeof location === 'undefined' || !location.hash.includes('cs_token=')) return false;
      const p = new URLSearchParams(location.hash.slice(1));
      const expected = storage.get(STATE_KEY);
      const returned = p.get('cs_state');
      const newToken = p.get('cs_token');
      // Only accept a token we asked for: a non-empty nonce we stored, returned unchanged.
      const ok = !!expected && expected.length >= 16 && returned === expected && !!newToken;
      storage.remove(STATE_KEY);
      if (ok) {
        storage.set(TOKEN_KEY, newToken);
        storage.remove(sentKey()); // fresh link: re-sync this account's stamps
      }
      history.replaceState(null, '', location.pathname + location.search);
      if (ok) refresh();
      return ok;
    },

    disconnect() { storage.remove(sentKey()); storage.remove(TOKEN_KEY); me = null; emit(); },

    /** { displayName, verifiedResident, points, pointsName, stamps: { places, acts } } or null. */
    me: refresh,

    /** Player reached a place (use the game's stop id, e.g. 'bay', 'market', 'pier7'). Sent once per place. */
    placeVisited: (placeId) => send({ type: 'place_visited', placeId: String(placeId).toLowerCase() }, `place:${placeId}`),

    /** Player finished ship act 1, 2 or 3. Sent once per act. */
    actCompleted: (act) => send({ type: 'act_completed', act: Number(act) }, `act:${act}`),

    /** Subscribe to profile changes (after connect, new stamps, etc.). Returns an unsubscribe function. */
    onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); },

    setLang(l) { lang = l; renderChip(); },

    /** Optional ready-made HUD chip (top-right). Pass a parent element to place it yourself. */
    mountChip(parent) {
      if (disabled || typeof document === 'undefined' || chip) return;
      chip = document.createElement('button');
      chip.type = 'button';
      Object.assign(chip.style, {
        position: parent ? 'static' : 'fixed', right: '12px', top: '12px', zIndex: 2147482000, minHeight: '44px',
        padding: '8px 14px', borderRadius: '999px', border: '1px solid rgba(255,255,255,.5)', background: 'rgba(20,45,38,.82)',
        color: '#fff', font: '600 14px system-ui, sans-serif', cursor: 'pointer', backdropFilter: 'blur(6px)',
      });
      chip.addEventListener('click', () => (token() ? refresh() : cs.connect()));
      (parent ?? document.body).appendChild(chip);
      listeners.add(renderChip);
      renderChip();
      if (token()) refresh();
    },
  };
  return cs;

  function renderChip() {
    if (!chip) return;
    if (!token()) { chip.textContent = `🌊 ${t().connect}`; return; }
    if (!me) { chip.textContent = '🌊 …'; return; }
    const stamps = me.stamps.places.length + me.stamps.acts.length;
    chip.textContent = `🌊 ${me.points} ${t().pts} · ${stamps} ${t().stamps}`;
    chip.title = (lang === 'en' ? me.pointsName.en : me.pointsName.ja) + (me.verifiedResident ? '' : lang === 'en' ? ' (verify residency to earn)' : '（住民確認でポイント獲得）');
  }
}

function randomNonce() {
  const c = globalThis.crypto;
  if (c?.randomUUID) return c.randomUUID().replace(/-/g, '');
  if (c?.getRandomValues) return Array.from(c.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, '0')).join('');
  throw new Error('cs-connect: secure random numbers are unavailable');
}

/** The account id inside the (signed, not secret) token, used only to namespace local storage. */
function tokenSubject(tok) {
  try {
    const body = tok?.split('.')[0];
    if (!body) return null;
    const json = JSON.parse(atob(body.replace(/-/g, '+').replace(/_/g, '/')));
    return typeof json.sub === 'string' ? json.sub : null;
  } catch {
    return null;
  }
}

function safeStorage() {
  const mem = new Map();
  const ls = (() => { try { const k = '__cs_t'; localStorage.setItem(k, '1'); localStorage.removeItem(k); return localStorage; } catch { return null; } })();
  const guard = (fn, fallback) => { try { return fn(); } catch { return fallback; } };
  return {
    get: (k) => guard(() => (ls ? ls.getItem(k) : mem.get(k) ?? null), null),
    set: (k, v) => guard(() => (ls ? ls.setItem(k, v) : mem.set(k, v))),
    remove: (k) => guard(() => (ls ? ls.removeItem(k) : mem.delete(k))),
  };
}
