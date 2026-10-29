import * as store from './store.js';
import { setHomeTheme } from './home.js';
import { pickTheme } from './ab.js';

// 亮/暗主題: 暗色 = :root.dark (首頁舞台深海藍、內容區炭灰)
let cur = 'light';
export function applyTheme(t) {
  cur = t === 'dark' ? 'dark' : 'light';
  document.documentElement.classList.toggle('dark', cur === 'dark');
  setHomeTheme(cur);
  const b = document.getElementById('thm');
  if (b) b.textContent = `測試：${cur === 'dark' ? '暗色主題' : '亮色主題'} ⇄`;
}
export const currentTheme = () => cur;

// 決定分組: 第一次來時等 PostHog 旗標最多 1.5 秒(期間頁面先藏起來, 避免閃色), 之後固定用本機存的
// 網址帶 ?theme=light|dark 是測試用: 不存檔, 並顯示切換鈕
export function initTheme(flagPromise, onDecided = () => {}) {
  const forced = new URLSearchParams(location.search).get('theme');
  const stored = store.get('theme', null);
  const decide = flag => {
    const r = pickTheme({ forced, stored, flag, rand: Math.random() });
    if (r.source !== 'forced') store.set('theme', r.theme);
    applyTheme(r.theme);
    document.documentElement.classList.remove('pvd-wait');
    onDecided(r);
    if (r.source === 'forced') initToggle();
  };
  if (pickTheme({ forced, stored, flag: null, rand: 0 }).source !== 'random') return decide(null);
  const timeout = new Promise(res => setTimeout(() => res(null), 1500));
  Promise.race([flagPromise, timeout]).then(decide);
}

function initToggle() {
  document.body.insertAdjacentHTML('beforeend', '<button class="thm" id="thm"></button>');
  document.getElementById('thm').addEventListener('click', () => applyTheme(cur === 'dark' ? 'light' : 'dark'));
  applyTheme(cur);
}
