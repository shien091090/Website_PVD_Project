import * as store from './store.js';
import { SITE } from './config.js';
import { setHomeTheme } from './home.js';

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

// 測試用切換鈕(正式版由 AB 分組決定)
export function initThemeToggle(show) {
  if (!show) return;
  document.body.insertAdjacentHTML('beforeend', '<button class="thm" id="thm"></button>');
  document.getElementById('thm').addEventListener('click', () => { applyTheme(cur === 'dark' ? 'light' : 'dark'); store.set('theme', cur); });
  applyTheme(cur);
}

export function initTheme() {
  applyTheme(store.get('theme', 'light'));
  initThemeToggle(SITE.themeToggle);
}
