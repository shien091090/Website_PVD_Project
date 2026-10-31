import { byCode } from './games.js';

// 遊玩頁: 返回 bar + 21:9 iframe。手機直拿不載入, 轉橫才載入;
// 已載入後轉回直向或分頁被切走 → 送暫停訊息, 遊戲區只是藏起來, iframe 不重新載入
const scr = document.getElementById('scr');
const portraitQ = matchMedia('(orientation: portrait) and (max-width: 720px)'); // 與 CSS 的直拿條件一致
let code = null, frame = null, paused = false, enteredAt = 0;
let onFinish = () => {};

const post = type => frame?.contentWindow?.postMessage({ type }, location.origin);

function sync() {
  if (!code) return;
  if (!frame && !portraitQ.matches) {
    frame = document.createElement('iframe');
    frame.src = `/games/${code}/`; // Pages 會把 index.html 轉址成資料夾, 直接用資料夾網址
    frame.title = byCode(code).name;
    frame.allow = 'autoplay; fullscreen; gamepad';
    scr.appendChild(frame);
    frame.addEventListener('load', () => frame?.focus());
  }
  const shouldPause = portraitQ.matches || document.hidden;
  if (frame && shouldPause !== paused) { paused = shouldPause; post(paused ? 'pvd:pause' : 'pvd:resume'); }
}

export function enterGame(c) {
  if (code === c) return;
  leaveGame();
  code = c; paused = false; enteredAt = Date.now();
  sync();
}

// 回傳這次在遊玩頁停留的秒數; 不在遊玩頁時回 null
export function leaveGame() {
  if (!code) return null;
  frame?.remove();
  frame = null; code = null;
  return Math.round((Date.now() - enteredAt) / 1000);
}

// 回傳從上次計時起的秒數並重新計時(關分頁時用, 遊戲框不拆, 從返回快取回來還能繼續玩)
export function lapGame() {
  if (!code) return null;
  const now = Date.now(), s = Math.round((now - enteredAt) / 1000);
  enteredAt = now;
  return s;
}

export function initGamePage(opts = {}) {
  onFinish = opts.onFinish || onFinish;
  portraitQ.addEventListener('change', sync);
  document.addEventListener('visibilitychange', sync);
  addEventListener('message', e => {
    if (e.origin !== location.origin || !frame || e.source !== frame.contentWindow) return;
    if (e.data?.type === 'pvd:finish') onFinish(code);
  });
}
