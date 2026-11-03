import * as store from './store.js';
import { setHomeTheme } from './home.js';
import { pickTheme } from './ab.js';
import { SITE } from './config.js';

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

// 正式網址(與送數據的網址相同)才隨機分組: 第一次來時等 PostHog 旗標最多 1.5 秒(期間頁面先藏起來, 避免閃色), 之後固定用本機存的。
// 預覽網址不分組, 角落一律有切換鈕, 選的主題另外存(theme-test), 不會混進正式分組。
// 網址帶 ?theme=light|dark 也是測試用: 不存檔, 並顯示切換鈕
export function initTheme(flagPromise, onDecided = () => {}) {
  const prod = SITE.analyticsHosts.includes(location.hostname);
  const forced = new URLSearchParams(location.search).get('theme');
  const stored = store.get(prod ? 'theme' : 'theme-test', null);
  const decide = flag => {
    const r = pickTheme({ prod, forced, stored, flag, rand: Math.random() });
    if (prod && r.source !== 'forced') store.set('theme', r.theme);
    applyTheme(r.theme);
    document.documentElement.classList.remove('pvd-wait');
    onDecided(r);
    if (!prod || r.source === 'forced') initToggle(r.source === 'test' ? 'theme-test' : null);
  };
  if (pickTheme({ prod, forced, stored, flag: null, rand: 0 }).source !== 'random') return decide(null);
  const timeout = new Promise(res => setTimeout(() => res(null), 1500));
  Promise.race([flagPromise, timeout]).then(decide);
}

// saveKey: 切換後存到哪(null = 不存)
function initToggle(saveKey) {
  document.body.insertAdjacentHTML('beforeend', '<button class="thm" id="thm"></button>');
  document.getElementById('thm').addEventListener('click', () => {
    applyTheme(cur === 'dark' ? 'light' : 'dark');
    if (saveKey) store.set(saveKey, cur);
  });
  applyTheme(cur);
}
