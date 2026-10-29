import { test, beforeEach, afterEach, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startServer, openBrowser, PC, PHONE } from './server.js';

let srv, browser;
before(async () => { browser = await openBrowser(); });
after(async () => { await browser?.close(); });
beforeEach(async () => { srv = await startServer(); });
afterEach(async () => { await srv?.stop(); });

const round = (startOff, endOff) => { const n = Date.now(); srv.sql(`INSERT INTO rounds (starts_at, ends_at) VALUES (${n + startOff}, ${n + endOff})`); };
const votes = list => srv.sql('INSERT INTO votes VALUES ' + list.map(([vid, g]) => `(1,'${vid}','${g}','h',1,1)`).join(','));

test('投票、重新整理仍記得、改投, 倒數歸零自動切成結果', async () => {
  round(-60000, 20000);
  const ctx = await browser.newContext(PC);
  const page = await ctx.newPage();
  await page.goto(srv.url + '#vote');
  await page.locator('#deadline:has-text("截止")').waitFor();
  const voted = () => page.waitForResponse(r => r.url().endsWith('/api/vote') && r.status() === 200, { timeout: 15000 });
  await Promise.all([voted(), page.click('.vr[data-k="slime-tetris"]')]);
  await page.reload();
  await page.locator('.vr.on[data-k="slime-tetris"]').waitFor();
  await Promise.all([voted(), page.click('.vr[data-k="ghost-echo"]')]);
  await page.locator('.vr.on[data-k="ghost-echo"]').waitFor();
  assert.equal(await page.locator('.vr.on').count(), 1);
  // 截止後 3 秒內自動顯示勝出卡(唯一一票)
  await page.locator('#winbox:has-text("幽影接力")').waitFor({ timeout: 20000 });
  assert.ok(await page.locator('#pg-vote.end').count());
  await ctx.close();
});

test('已結束: 勝出卡與 4 條長條, 全站結束狀態', async () => {
  round(-7200000, -3600000);
  votes([['a', 'slime-tetris'], ['b', 'slime-tetris'], ['c', 'slime-tetris'], ['d', 'ghost-echo']]);
  const ctx = await browser.newContext(PC);
  const page = await ctx.newPage();
  await page.goto(srv.url + '#vote');
  await page.locator('#winbox:has-text("史萊姆擴張")').waitFor();
  assert.match(await page.locator('#winbox').textContent(), /3 票 · 佔 75%/);
  assert.equal(await page.locator('#ranked .rr').count(), 4);
  assert.ok(await page.locator('#pg-vote .tab[data-k="vote"] .badge').isVisible());
  await page.goto(srv.url + '#play');
  assert.ok(await page.locator('.vnote:has-text("投票已結束，但遊戲仍可以試玩")').isVisible());
  await ctx.close();
});

test('已結束 0 票: 結果統計中, 沒有票數', async () => {
  round(-7200000, -3600000);
  const ctx = await browser.newContext(PC);
  const page = await ctx.newPage();
  await page.goto(srv.url + '#vote');
  await page.locator('#winbox:has-text("結果統計中")').waitFor();
  assert.equal(await page.locator('#ranked .rr').count(), 0);
  await ctx.close();
});

test('沒有任何輪次: 投票尚未開放', async () => {
  const ctx = await browser.newContext(PC);
  const page = await ctx.newPage();
  await page.goto(srv.url + '#vote');
  await page.locator('text=投票尚未開放').waitFor();
  await ctx.close();
});

test('伺服器錯誤: 勾選還原並顯示失敗', async () => {
  round(-60000, 3600000);
  const ctx = await browser.newContext(PC);
  const page = await ctx.newPage();
  await page.route('**/api/vote', r => r.fulfill({ status: 500, contentType: 'application/json', body: '{"error":{"code":"server_error"}}' }));
  await page.goto(srv.url + '#vote');
  await page.locator('#deadline:has-text("截止")').waitFor();
  await page.click('.vr[data-k="dungeon-zoo"]');
  await page.locator('.verr:has-text("投票失敗，請稍後再試")').waitFor({ timeout: 15000 });
  assert.equal(await page.locator('.vr.on').count(), 0);
  await ctx.close();
});

test('手機版投票頁倒數橫排', async () => {
  round(-60000, 3600000);
  const ctx = await browser.newContext(PHONE);
  const page = await ctx.newPage();
  await page.goto(srv.url + '#vote');
  await page.locator('#deadline:has-text("截止")').waitFor();
  const boxes = await page.locator('#cdnums .n').evaluateAll(els => els.map(e => e.getBoundingClientRect().top));
  assert.ok(Math.max(...boxes) - Math.min(...boxes) < 5, '四個數字在同一列');
  await ctx.close();
});

test('快速連點兩款: 畫面打勾與伺服器記錄一致, 不出現錯誤', async () => {
  round(-60000, 3600000);
  const ctx = await browser.newContext(PC);
  const page = await ctx.newPage();
  await page.goto(srv.url + '#vote');
  await page.locator('#deadline:has-text("截止")').waitFor();
  await page.click('.vr[data-k="slime-tetris"]');
  await page.click('.vr[data-k="ghost-echo"]');
  await page.waitForTimeout(6000);
  const shown = await page.locator('.vr.on').getAttribute('data-k');
  assert.equal(await page.locator('.verr:visible').count(), 0);
  await page.reload();
  await page.locator('.vr.on').waitFor();
  assert.equal(await page.locator('.vr.on').getAttribute('data-k'), shown);
  await ctx.close();
});
