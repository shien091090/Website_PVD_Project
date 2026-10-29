import { SITE } from './config.js';

export class ApiError extends Error {
  constructor(status, code) { super(code); this.status = status; this.code = code; }
}

// 第一次造訪時, 第一個請求的回應才會帶回訪客編號 cookie; 其他請求要等它回來,
// 否則同時發出的請求會各自拿到不同編號, 投票可能記到別的編號上
let first = null;
function call(path, init) {
  if (!first) { first = send(path, init); return first; }
  return first.catch(() => {}).then(() => send(path, init));
}

async function send(path, init) {
  let r;
  try { r = await fetch(path, { credentials: 'same-origin', ...init }); } catch { throw new ApiError(0, 'network'); }
  let data = null;
  try { data = await r.json(); } catch {}
  if (!r.ok) throw new ApiError(r.status, data?.error?.code || 'server_error');
  return data;
}

export const getJSON = path => call(path);
export const postJSON = (path, body) => call(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

// Turnstile 隱形驗證: 送出留言或投票前取一次 token。
// 同時多次呼叫時依序處理, 各拿各的 token; 沒跳出手動驗證就 8 秒逾時,
// 跳出手動驗證(App 內瀏覽器、VPN 常見)就不計時, 等玩家點完
let ready = null, widget = null, current = null, chain = Promise.resolve();
const fail = () => new ApiError(0, 'turnstile');

function loadTurnstile() {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  if (ready) return ready;
  ready = new Promise((resolve, reject) => {
    window.__pvdTs = () => resolve(window.turnstile);
    const s = document.createElement('script');
    s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=__pvdTs';
    s.async = true;
    s.onerror = () => { ready = null; reject(fail()); };
    document.head.appendChild(s);
  });
  return ready;
}

async function getOne() {
  const ts = await Promise.race([loadTurnstile(), new Promise((_, rej) => setTimeout(() => rej(fail()), 8000))]);
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { current = null; reject(fail()); }, 8000);
    current = {
      done: t => { clearTimeout(timer); current = null; resolve(t); },
      error: () => { clearTimeout(timer); current = null; reject(fail()); },
      interactive: () => clearTimeout(timer),
    };
    if (widget == null) {
      const box = document.createElement('div');
      box.id = 'ts';
      box.style.cssText = 'position:fixed;left:50%;bottom:16px;transform:translateX(-50%);z-index:50';
      document.body.appendChild(box);
      widget = ts.render(box, {
        sitekey: SITE.turnstileSiteKey, execution: 'execute', appearance: 'interaction-only',
        callback: t => current?.done(t),
        'error-callback': () => current?.error(),
        'before-interactive-callback': () => current?.interactive(),
      });
    } else ts.reset(widget);
    ts.execute(widget);
  });
}

export function turnstileToken() {
  const p = chain.then(getOne, getOne);
  chain = p.catch(() => {});
  return p;
}
