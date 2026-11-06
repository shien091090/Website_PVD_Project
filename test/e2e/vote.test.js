import { test, beforeEach, afterEach, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startServer, openBrowser, PC, PHONE } from './server.js';

let srv, browser;
before(async () => { browser = await openBrowser(); });
after(async () => { await browser?.close(); });
beforeEach(async () => { srv = await startServer(); });
afterEach(async () => { await srv?.stop(); });

const OPTS = ['bubble-tempo', 'dungeon-zoo', 'jelly-jinni', 'soul-smith-defense'];
const round = (startOff, endOff) => {
  const n = Date.now();
  srv.sql(`INSERT INTO rounds (starts_at, ends_at) VALUES (${n + startOff}, ${n + endOff})`);
  srv.sql('INSERT INTO round_options SELECT (SELECT max(id) FROM rounds), v.id, v.id, v.i FROM (' + OPTS.map((id, i) => `SELECT '${id}' AS id, ${i} AS i`).join(' UNION ALL ') + ') v');
};
const votes = list => srv.sql('INSERT INTO votes VALUES ' + list.map(([vid, g]) => `(1,'${vid}','${g}','h',1,1)`).join(','));

test('投票、重新整理仍記得、改投, 倒數歸零自動切成結果', async () => {
  round(-60000, 20000);
  const ctx = await browser.newContext(PC);
  const page = await ctx.newPage();
  await page.goto(srv.url + '#vote');
  await page.locator('#deadline:has-text("截止")').waitFor();
  const voted = () => page.waitForResponse(r => r.url().endsWith('/api/vote') && r.status() === 200, { timeout: 15000 });
  await Promise.all([voted(), page.click('.vr[data-k="bubble-tempo"]')]);
  await page.reload();
  await page.locator('.vr.on[data-k="bubble-tempo"]').waitFor();
  await Promise.all([voted(), page.click('.vr[data-k="jelly-jinni"]')]);
  await page.locator('.vr.on[data-k="jelly-jinni"]').waitFor();
  assert.equal(await page.locator('.vr.on').count(), 1);
  // 截止後 3 秒內自動顯示勝出卡(唯一一票)
  await page.locator('#winbox:has-text("接力吉尼")').waitFor({ timeout: 20000 });
  assert.ok(await page.locator('#pg-vote.end').count());
  await ctx.close();
});

test('已投的那款再點一次就取消投票, 重新整理後也沒有票', async () => {
  round(-60000, 600000);
  const ctx = await browser.newContext(PC);
  const page = await ctx.newPage();
  await page.goto(srv.url + '#vote');
  await page.locator('#deadline:has-text("截止")').waitFor();
  const voted = () => page.waitForResponse(r => r.url().endsWith('/api/vote') && r.status() === 200, { timeout: 15000 });
  await page.locator('#vdone:has-text("不用另外按送出")').waitFor();
  await Promise.all([voted(), page.click('.vr[data-k="dungeon-zoo"]')]);
  await page.locator('#vdone.ok:has-text("已完成投票")').waitFor();
  assert.match(await page.textContent('#vdone'), /來馬戲團看一點大場面/);
  assert.ok(await page.locator('#vdone .icon').count());
  await Promise.all([voted(), page.click('.vr[data-k="dungeon-zoo"]')]);
  assert.equal(await page.locator('.vr.on').count(), 0);
  await page.locator('#vdone:not(.ok):has-text("不用另外按送出")').waitFor();
  await page.reload();
  await page.locator('.vr[data-k="dungeon-zoo"]').waitFor();
  assert.equal(await page.locator('.vr.on').count(), 0);
  assert.equal(srv.sql('SELECT count(*) AS n FROM votes')[0].n, 0);
  await ctx.close();
});

test('已結束: 勝出卡與 4 條長條, 全站結束狀態', async () => {
  round(-7200000, -3600000);
  votes([['a', 'bubble-tempo'], ['b', 'bubble-tempo'], ['c', 'bubble-tempo'], ['d', 'jelly-jinni']]);
  const ctx = await browser.newContext(PC);
  const page = await ctx.newPage();
  await page.goto(srv.url + '#vote');
  await page.locator('#winbox:has-text("Bubble Tempo")').waitFor();
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
  await page.click('.vr[data-k="bubble-tempo"]');
  await page.click('.vr[data-k="jelly-jinni"]');
  await page.waitForTimeout(6000);
  const shown = await page.locator('.vr.on').getAttribute('data-k');
  assert.equal(await page.locator('.verr:visible').count(), 0);
  await page.reload();
  await page.locator('.vr.on').waitFor();
  assert.equal(await page.locator('.vr.on').getAttribute('data-k'), shown);
  await ctx.close();
});

test('先投 A 再投 B, A 的回應較慢: 畫面不跳回 A, 最後記錄是 B', async () => {
  round(-60000, 3600000);
  const ctx = await browser.newContext(PC);
  const page = await ctx.newPage();
  let n = 0;
  await page.route('**/api/vote', async r => {
    const first = n++ === 0;
    if (first) await new Promise(res => setTimeout(res, 1500));
    await r.continue();
    await page.evaluate(() => { window.votesDone = (window.votesDone || 0) + 1; }).catch(() => {});
  });
  await page.goto(srv.url + '#vote');
  await page.locator('#deadline:has-text("截止")').waitFor();
  await page.click('.vr[data-k="bubble-tempo"]');
  await page.waitForTimeout(200);
  await page.click('.vr[data-k="jelly-jinni"]');
  // 之後每次重畫都記下打勾的是哪款, 直到兩個投票請求都回來
  await page.evaluate(() => { window.seen = new Set(); new MutationObserver(() => window.seen.add(document.querySelector('.vr.on')?.dataset.k)).observe(document.getElementById('vrows'), { childList: true }); });
  await page.waitForFunction(() => window.votesDone >= 2 || false, null, { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(1000);
  assert.deepEqual([...await page.evaluate(() => [...window.seen])].filter(Boolean).filter(k => k !== 'jelly-jinni'), []);
  await page.reload();
  await page.locator('.vr.on').waitFor();
  assert.equal(await page.locator('.vr.on').getAttribute('data-k'), 'jelly-jinni');
  await ctx.close();
});

test('後台開新一輪只勾 2 款候選, 投票頁只出現這 2 款', async () => {
  const ctx = await browser.newContext(PC);
  const page = await ctx.newPage();
  await page.goto(srv.url + 'admin/');
  await page.click('nav button[data-tab="vote"]');
  await page.locator('#nadd').waitFor();
  // 日期 + 時分秒下拉(24 小時制)
  const setDt = async (cls, ms) => {
    const t = new Date(ms + 8 * 3600000).toISOString();
    await page.fill(`.${cls} input`, t.slice(0, 10));
    const sel = page.locator(`.${cls} select`);
    for (const [i, a] of [[0, 11], [1, 14], [2, 17]]) await sel.nth(i).selectOption(t.slice(a, a + 2));
  };
  assert.equal(await page.locator('.nstart select').first().locator('option').count(), 24);
  await setDt('nstart', Date.now() - 3600000); await setDt('nend', Date.now() + 3600000);
  await page.uncheck('.nopt[value="dungeon-zoo"]'); await page.uncheck('.nopt[value="soul-smith-defense"]');
  await page.click('#nadd');
  await page.locator('.card[data-id="1"]').waitFor();
  await page.goto(srv.url + '#vote');
  await page.locator('#vrows .vr').first().waitFor();
  assert.deepEqual(await page.locator('#vrows .vr').evaluateAll(els => els.map(e => e.dataset.k)), ['bubble-tempo', 'jelly-jinni']);
  await ctx.close();
});
