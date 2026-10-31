import { byCode } from './games.js';
import * as store from './store.js';

// 遊玩頁: 返回 bar + 21:9 iframe。手機直拿不載入, 轉橫才載入;
// 已載入後轉回直向或分頁被切走 → 送暫停訊息, 遊戲區只是藏起來, iframe 不重新載入
const scr = document.getElementById('scr');
const portraitQ = matchMedia('(orientation: portrait) and (max-width: 720px)'); // 與 CSS 的直拿條件一致
let code = null, frame = null, paused = false;
let onFinish = () => {};

// 遊玩時間只算真正在玩: 遊戲框載入且沒暫停(分頁切走、手機轉直)才計時
// lapAt: 上次回報離開時的累計值; savedAt: 上次存進本機「這款累計遊玩時間」時的累計值
let acc = 0, runSince = null, lapAt = 0, savedAt = 0;
const active = () => acc + (runSince == null ? 0 : Date.now() - runSince);
function setRunning(on) {
  if (on && runSince == null) runSince = Date.now();
  if (!on && runSince != null) { acc += Date.now() - runSince; runSince = null; }
}
// 把還沒存的遊玩時間加進本機的這款累計(跨多次進出, 玩完一局時歸零)
function saveTotal() {
  const t = store.get('playtime', {}), a = active();
  t[code] = (t[code] || 0) + (a - savedAt); savedAt = a;
  store.set('playtime', t);
  return t;
}
function lap() {
  const a = active(), s = Math.round((a - lapAt) / 1000);
  lapAt = a; saveTotal();
  return s;
}

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
  setRunning(!!frame && !shouldPause);
}

export function enterGame(c) {
  if (code === c) return;
  leaveGame();
  code = c; paused = false;
  acc = 0; runSince = null; lapAt = 0; savedAt = 0;
  sync();
}

// 回傳這次實際遊玩的秒數; 不在遊玩頁時回 null
export function leaveGame() {
  if (!code) return null;
  setRunning(false);
  const s = lap();
  frame?.remove();
  frame = null; code = null;
  return s;
}

// 回傳從上次回報起實際遊玩的秒數(關分頁時用, 遊戲框不拆, 從返回快取回來還能繼續玩)
export function lapGame() {
  return code ? lap() : null;
}

export function initGamePage(opts = {}) {
  onFinish = opts.onFinish || onFinish;
  portraitQ.addEventListener('change', sync);
  document.addEventListener('visibilitychange', sync);
  addEventListener('message', e => {
    if (e.origin !== location.origin || !frame || e.source !== frame.contentWindow) return;
    if (e.data?.type !== 'pvd:finish') return;
    // 玩完一局: 帶上這款累計的遊玩時間, 然後歸零, 下一局重新累計
    const t = saveTotal(), total = Math.round(t[code] / 1000);
    t[code] = 0; store.set('playtime', t);
    onFinish(code, total);
  });
}
