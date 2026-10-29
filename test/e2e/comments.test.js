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
