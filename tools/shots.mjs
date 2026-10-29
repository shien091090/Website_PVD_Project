// 截圖檢查: node tools/shots.mjs <網址> <輸出資料夾> [頁面...]
// 每頁截 電腦 1280x800 / 手機直 390x844 / 手機橫 844x390 × 亮/暗
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';

const [, , base = 'http://localhost:8788/', out = 'shots', ...pages] = process.argv;
const PAGES = pages.length ? pages : ['', 'play', 'vote', 'develop'];
const VIEWS = { pc: { width: 1280, height: 800 }, ph: { width: 390, height: 844, mobile: true }, phl: { width: 844, height: 390, mobile: true } };
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
for (const [vn, v] of Object.entries(VIEWS)) for (const theme of ['light', 'dark']) {
  const ctx = await browser.newContext({ viewport: { width: v.width, height: v.height }, isMobile: !!v.mobile, hasTouch: !!v.mobile, deviceScaleFactor: 1 });
  await ctx.addInitScript(t => { try { localStorage.setItem('pvd:theme', JSON.stringify(t)); } catch {} }, theme);
  const page = await ctx.newPage();
  page.on('pageerror', e => console.log('PAGE ERROR', vn, theme, e.message));
  for (const p of PAGES) {
    await page.goto(base + (p.startsWith('?') ? p : '#' + p), { waitUntil: 'load' });
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${out}/${(p || 'home').replace(/[/?=&#]/g, '_')}-${vn}-${theme}.png` });
  }
  await ctx.close();
}
await browser.close();
