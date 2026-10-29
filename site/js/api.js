import { SITE } from './config.js';

export class ApiError extends Error {
  constructor(status, code) { super(code); this.status = status; this.code = code; }
}

async function call(path, init) {
  let r;
  try { r = await fetch(path, { credentials: 'same-origin', ...init }); } catch { throw new ApiError(0, 'network'); }
  let data = null;
  try { data = await r.json(); } catch {}
  if (!r.ok) throw new ApiError(r.status, data?.error?.code || 'server_error');
  return data;
}

export const getJSON = path => call(path);
export const postJSON = (path, body) => call(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

// Turnstile 隱形驗證: 送出留言或投票前取一次 token, 用完就 reset
let ready = null, widget = null, waiting = null;
function loadTurnstile() {
  if (ready) return ready;
  ready = new Promise((resolve, reject) => {
    window.__pvdTs = () => resolve(window.turnstile);
    const s = document.createElement('script');
    s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=__pvdTs';
    s.async = true;
    s.onerror = () => { ready = null; reject(new ApiError(0, 'turnstile')); };
    document.head.appendChild(s);
  });
  return ready;
}

export async function turnstileToken() {
  const timeout = new Promise((_, rej) => setTimeout(() => rej(new ApiError(0, 'turnstile')), 8000));
  const get = (async () => {
    const ts = await loadTurnstile();
    if (widget == null) {
      const box = document.createElement('div');
      box.id = 'ts';
      box.style.cssText = 'position:fixed;left:50%;bottom:16px;transform:translateX(-50%);z-index:50';
      document.body.appendChild(box);
      widget = ts.render(box, {
        sitekey: SITE.turnstileSiteKey, execution: 'execute', appearance: 'interaction-only',
        callback: t => waiting?.resolve(t),
        'error-callback': () => waiting?.reject(new ApiError(0, 'turnstile')),
      });
    } else ts.reset(widget);
    return new Promise((resolve, reject) => { waiting = { resolve, reject }; ts.execute(widget); });
  })();
  try { return await Promise.race([get, timeout]); } finally { waiting = null; }
}
