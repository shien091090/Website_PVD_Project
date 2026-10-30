import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startServer, openBrowser, PC, PHONE } from './server.js';

let srv, browser;
before(async () => { srv = await startServer(); browser = await openBrowser(); });
after(async () => { await browser?.close(); await srv?.stop(); });

async function pick(page, name) {
  await page.click(`.gh:has-text("${name}")`);
}
const firstComment = page => page.locator('.board .cms .cm .t').first().textContent();

test('送出留言後出現在最上面, 別的瀏覽器也看得到, 連送被擋且保留文字', async () => {
  const ctx = await browser.newContext(PC);
  const page = await ctx.newPage();
  await page.goto(srv.url + '#play');
  await pick(page, '史萊姆擴張');
  await page.fill('.board .cform input', '好玩');
  await page.click('.board .cform button:has-text("送出")');
  await page.waitForFunction(() => document.querySelector('.board .cms .cm .t')?.textContent === '好玩', null, { timeout: 15000 });
  assert.match(await page.locator('.board h3').textContent(), /1 則/);
  assert.equal(await page.locator('.board .cform input').inputValue(), '');

  await page.fill('.board .cform input', '再一則');
  await page.click('.board .cform button:has-text("送出")');
  await page.locator('.cerr:has-text("留言太快了")').waitFor({ timeout: 15000 });
  assert.equal(await page.locator('.board .cform input').inputValue(), '再一則');

  const other = await browser.newContext(PC);
  const p2 = await other.newPage();
  await p2.goto(srv.url + '#play/slime-tetris');
  await p2.waitForFunction(() => document.querySelector('.board .cms .cm .t')?.textContent === '好玩');
  await other.close();
  await ctx.close();
});

test('鎖住的遊戲沒有輸入框, 只顯示一行說明', async () => {
  srv.sql("INSERT INTO locks (game, locked) VALUES ('dungeon-zoo', 1)");
  const ctx = await browser.newContext(PC);
  const page = await ctx.newPage();
  await page.goto(srv.url + '#play/dungeon-zoo');
  await page.locator('.board .clock:has-text("留言功能暫時無法使用")').waitFor();
  assert.equal(await page.locator('.board .cform').count(), 0);
  await ctx.close();
});

test('伺服器錯誤時顯示失敗且保留文字', async () => {
  const ctx = await browser.newContext(PC);
  const page = await ctx.newPage();
  await page.route('**/api/comments', r => r.request().method() === 'POST'
    ? r.fulfill({ status: 500, contentType: 'application/json', body: '{"error":{"code":"server_error"}}' }) : r.continue());
  await page.goto(srv.url + '#play/ghost-echo');
  await page.fill('.board .cform input', '測試失敗');
  await page.click('.board .cform button:has-text("送出")');
  await page.locator('.cerr:has-text("送出失敗，請稍後再試")').waitFor({ timeout: 15000 });
  assert.equal(await page.locator('.board .cform input').inputValue(), '測試失敗');
  await ctx.close();
});

test('HTML 以純文字顯示', async () => {
  srv.sql("INSERT INTO comments (game, avatar, body, vid, ip_hash, created_at) VALUES ('bubble-catcher', 0, '<img src=x onerror=window.__xss=1>', 'z', 'z', 1)");
  const ctx = await browser.newContext(PC);
  const page = await ctx.newPage();
  await page.goto(srv.url + '#play/bubble-catcher');
  await page.waitForFunction(() => document.querySelector('.board .cms .cm .t')?.textContent.includes('<img'));
  assert.equal(await page.evaluate(() => window.__xss), undefined);
  assert.equal(await page.locator('.board .cms img').count(), 0);
  await ctx.close();
});

test('手機抽屜裡也能留言', async () => {
  const ctx = await browser.newContext(PHONE);
  const page = await ctx.newPage();
  await page.goto(srv.url + '#play');
  await pick(page, '幽影接力');
  await page.fill('.psheet .cform input', '手機留言');
  await page.click('.psheet .cform button:has-text("送出")');
  await page.waitForFunction(() => document.querySelector('.psheet .cms .cm .t')?.textContent === '手機留言', null, { timeout: 15000 });
  await ctx.close();
});

test('送出途中留言板重畫, 錯誤訊息仍看得到且保留文字', async () => {
  const ctx = await browser.newContext(PC);
  const page = await ctx.newPage();
  // 留言板讀取卡住, 直到送出被回應後才放行, 確保錯誤先出現、留言板後重畫(不靠驗證速度)
  let answered;
  const posted = new Promise(res => { answered = res; });
  await page.route('**/api/comments?game=*', async r => { await posted; await new Promise(res => setTimeout(res, 200)); r.continue(); });
  await page.route('**/api/comments', r => {
    if (r.request().method() !== 'POST') return r.continue();
    r.fulfill({ status: 429, contentType: 'application/json', body: '{"error":{"code":"too_fast"}}' });
    answered();
  });
  await page.goto(srv.url + '#play/bubble-catcher');
  await page.fill('.board .cform input', '讀取中送出');
  await page.click('.board .cform button:has-text("送出")');
  await page.waitForFunction(() => !document.querySelector('.board .cmsg')?.textContent.includes('讀取中'), null, { timeout: 15000 });
  await page.waitForTimeout(300);
  assert.ok(await page.locator('.cerr:has-text("留言太快了")').isVisible());
  assert.equal(await page.locator('.board .cform input').inputValue(), '讀取中送出');
  assert.equal(await page.locator('.board .cform button:has-text("送出")').isDisabled(), false);
  await ctx.close();
});

test('手機打到一半轉成電腦版面, 文字還在', async () => {
  const ctx = await browser.newContext(PHONE);
  const page = await ctx.newPage();
  await page.goto(srv.url + '#play');
  await page.click('.gh:has-text("捕泡手")');
  await page.locator('.psheet .cform input').waitFor();
  await page.fill('.psheet .cform input', '轉向前打的字');
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.locator('.detail .cform input').waitFor();
  assert.equal(await page.locator('.detail .cform input').inputValue(), '轉向前打的字');
  await ctx.close();
});

test('送出後按鈕立刻顯示送出中', async () => {
  const ctx = await browser.newContext(PC);
  const page = await ctx.newPage();
  await page.route('**/api/comments', async r => {
    if (r.request().method() !== 'POST') return r.continue();
    await new Promise(res => setTimeout(res, 2000)); r.continue();
  });
  await page.goto(srv.url + '#play/ghost-echo');
  await page.locator('.board .cms').waitFor();
  await page.fill('.board .cform input', '等一下');
  await page.click('.board .cform button:has-text("送出")');
  const btn = page.locator('.board .cform button:not(.avbtn)');
  await page.waitForFunction(() => document.querySelector('.board .cform button:not(.avbtn)')?.textContent === '送出中…', null, { timeout: 500 });
  assert.equal(await btn.isDisabled(), true);
  await page.waitForFunction(() => document.querySelector('.board .cms .cm .t')?.textContent === '等一下', null, { timeout: 15000 });
  assert.equal(await btn.textContent(), '送出');
  await ctx.close();
});

// 假的驗證: 每次驗證要 1.5 秒, 記下驗證了幾次
const SLOW_TS = `window.__ex = 0; window.turnstile = {
  render(el, o) { this.o = o; return 'w'; }, reset() {},
  execute() { window.__ex++; setTimeout(() => this.o.callback('XXXX.DUMMY.TOKEN.XXXX'), 1500); } };
window.__pvdTs();`;

test('點進留言框就先做驗證, 按送出時不用再等驗證', async () => {
  const ctx = await browser.newContext(PC);
  const page = await ctx.newPage();
  await page.route('**/turnstile/v0/api.js*', r => r.fulfill({ contentType: 'text/javascript', body: SLOW_TS }));
  await page.goto(srv.url + '#play/slime-tetris'); // 前面的測試鎖了 dungeon-zoo
  await page.locator('.board .cms').waitFor();
  await page.click('.board .cform input');
  await page.waitForFunction(() => window.__ex === 1);
  await page.waitForTimeout(1700);
  await page.fill('.board .cform input', '很快');
  const t0 = Date.now();
  await page.click('.board .cform button:has-text("送出")');
  await page.waitForFunction(() => document.querySelector('.board .cms .cm .t')?.textContent === '很快', null, { timeout: 15000 });
  assert.ok(Date.now() - t0 < 1400, `送出花了 ${Date.now() - t0}ms`);
  assert.equal(await page.evaluate(() => window.__ex), 1, '沒有再驗證一次');
  await ctx.close();
});
