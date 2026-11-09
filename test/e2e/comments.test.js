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
  await pick(page, '魂匠守衛者');
  await page.fill('.board .cform textarea', '好玩');
  await page.click('.board .cform button:has-text("送出")');
  await page.waitForFunction(() => document.querySelector('.board .cms .cm .t')?.textContent === '好玩', null, { timeout: 15000 });
  assert.match(await page.locator('.board h3').textContent(), /1 則/);
  assert.equal(await page.locator('.board .cform textarea').inputValue(), '');

  await page.fill('.board .cform textarea', '再一則');
  await page.click('.board .cform button:has-text("送出")');
  await page.locator('.cerr:has-text("留言太快了")').waitFor({ timeout: 15000 });
  assert.equal(await page.locator('.board .cform textarea').inputValue(), '再一則');

  const other = await browser.newContext(PC);
  const p2 = await other.newPage();
  await p2.goto(srv.url + '#play/soul-smith-defense');
  await p2.waitForFunction(() => document.querySelector('.board .cms .cm .t')?.textContent === '好玩');
  await other.close();
  await ctx.close();
});

test('鎖住的遊戲沒有輸入框, 只顯示一行說明', async () => {
  srv.sql("INSERT INTO locks (game, locked) VALUES ('bubble-tempo', 1)");
  const ctx = await browser.newContext(PC);
  const page = await ctx.newPage();
  await page.goto(srv.url + '#play/bubble-tempo');
  await page.locator('.board .clock:has-text("留言功能暫時無法使用")').waitFor();
  assert.equal(await page.locator('.board .cform').count(), 0);
  await ctx.close();
  srv.sql('DELETE FROM locks'); // 解鎖, 後面的測試還要在這款留言
});

test('伺服器錯誤時顯示失敗且保留文字', async () => {
  const ctx = await browser.newContext(PC);
  const page = await ctx.newPage();
  await page.route('**/api/comments', r => r.request().method() === 'POST'
    ? r.fulfill({ status: 500, contentType: 'application/json', body: '{"error":{"code":"server_error"}}' }) : r.continue());
  await page.goto(srv.url + '#play/jelly-jinni');
  await page.fill('.board .cform textarea', '測試失敗');
  await page.click('.board .cform button:has-text("送出")');
  await page.locator('.cerr:has-text("送出失敗，請稍後再試")').waitFor({ timeout: 15000 });
  assert.equal(await page.locator('.board .cform textarea').inputValue(), '測試失敗');
  await ctx.close();
});

test('HTML 以純文字顯示', async () => {
  srv.sql("INSERT INTO comments (game, avatar, body, vid, ip_hash, created_at) VALUES ('bubble-tempo', 0, '<img src=x onerror=window.__xss=1>', 'z', 'z', 1)");
  const ctx = await browser.newContext(PC);
  const page = await ctx.newPage();
  await page.goto(srv.url + '#play/bubble-tempo');
  await page.waitForFunction(() => document.querySelector('.board .cms .cm .t')?.textContent.includes('<img'));
  assert.equal(await page.evaluate(() => window.__xss), undefined);
  assert.equal(await page.locator('.board .cms .t img').count(), 0);
  await ctx.close();
});

test('手機抽屜裡也能留言', async () => {
  const ctx = await browser.newContext(PHONE);
  const page = await ctx.newPage();
  await page.goto(srv.url + '#play');
  await pick(page, '接力吉尼');
  await page.fill('.psheet .cform textarea', '手機留言');
  await page.click('.psheet .cform button:has-text("送出")');
  await page.waitForFunction(() => document.querySelector('.psheet .cms .cm .t')?.textContent === '手機留言', null, { timeout: 15000 });
  await ctx.close();
});

// 假留言: 新到舊, 長短混搭
const LENS = [200, 5, 60, 200, 20, 40, 8, 120];
const fakeList = route => route.request().method() === 'GET'
  ? route.fulfill({ contentType: 'application/json', body: JSON.stringify({ count: LENS.length, locked: false,
    comments: LENS.map((n, i) => ({ id: i + 1, avatar: i % 8, body: `${i + 1}`.padEnd(n, '字'), createdAt: 0 })) }) })
  : route.continue();

test('電腦版留言排兩欄: 依新到舊放進較短的那欄, 兩欄高度差不超過一則; 視窗變寬重排', async () => {
  const ctx = await browser.newContext(PC);
  const page = await ctx.newPage();
  await page.route('**/api/comments?game=*', fakeList);
  await page.goto(srv.url + '#play/bubble-tempo');
  await page.waitForFunction(n => document.querySelectorAll('#detail .cms .col .cm').length === n, LENS.length, { timeout: 15000 });
  const check = () => page.evaluate(() => {
    const cols = [...document.querySelectorAll('#detail .cms .col')];
    const hs = [0, 0], issues = [], gap = parseFloat(getComputedStyle(cols[0]).rowGap) || 0;
    const items = cols.flatMap((c, ci) => [...c.children].map(el => ({ ci, n: parseInt(el.querySelector('.t').textContent), h: el.offsetHeight })));
    items.sort((a, b) => a.n - b.n);
    for (const it of items) {
      const want = hs[0] <= hs[1] ? 0 : 1;
      if (Math.abs(hs[0] - hs[1]) > 1 && it.ci !== want) issues.push(`第 ${it.n} 則放到第 ${it.ci + 1} 欄`);
      hs[it.ci] += it.h + (hs[it.ci] ? gap : 0);
    }
    const r = cols.map(c => c.getBoundingClientRect());
    return { cols: cols.length, issues, sideBySide: Math.abs(r[0].top - r[1].top) < 1 && r[1].left > r[0].right };
  });
  let res = await check();
  assert.equal(res.cols, 2);
  assert.ok(res.sideBySide, '兩欄左右並排');
  assert.deepEqual(res.issues, []);
  assert.match(await page.locator('#detail .cms .col').first().locator('.cm .t').first().textContent(), /^1字/, '最新一則在左欄最上面');
  await page.setViewportSize({ width: 1700, height: 800 });
  await page.waitForTimeout(400);
  res = await check();
  assert.deepEqual(res.issues, []);
  await ctx.close();
});

test('手機抽屜的留言維持單欄', async () => {
  const ctx = await browser.newContext(PHONE);
  const page = await ctx.newPage();
  await page.route('**/api/comments?game=*', fakeList);
  await page.goto(srv.url + '#play');
  await pick(page, 'Bubble Tempo');
  await page.waitForFunction(n => document.querySelectorAll('.psheet .cms .cm').length === n, LENS.length, { timeout: 15000 });
  assert.equal(await page.locator('.psheet .cms .col').count(), 0);
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
  await page.goto(srv.url + '#play/bubble-tempo');
  await page.fill('.board .cform textarea', '讀取中送出');
  await page.click('.board .cform button:has-text("送出")');
  await page.waitForFunction(() => !document.querySelector('.board .cmsg')?.textContent.includes('讀取中'), null, { timeout: 15000 });
  await page.waitForTimeout(300);
  assert.ok(await page.locator('.cerr:has-text("留言太快了")').isVisible());
  assert.equal(await page.locator('.board .cform textarea').inputValue(), '讀取中送出');
  assert.equal(await page.locator('.board .cform button:has-text("送出")').isDisabled(), false);
  await ctx.close();
});

test('手機打到一半轉成電腦版面, 文字還在', async () => {
  const ctx = await browser.newContext(PHONE);
  const page = await ctx.newPage();
  await page.goto(srv.url + '#play');
  await page.click('.gh:has-text("Bubble Tempo")');
  await page.locator('.psheet .cform textarea').waitFor();
  await page.fill('.psheet .cform textarea', '轉向前打的字');
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.locator('.detail .cform textarea').waitFor();
  assert.equal(await page.locator('.detail .cform textarea').inputValue(), '轉向前打的字');
  await ctx.close();
});

test('送出後按鈕立刻顯示送出中', async () => {
  const ctx = await browser.newContext(PC);
  const page = await ctx.newPage();
  await page.route('**/api/comments', async r => {
    if (r.request().method() !== 'POST') return r.continue();
    await new Promise(res => setTimeout(res, 2000)); r.continue();
  });
  await page.goto(srv.url + '#play/jelly-jinni');
  await page.locator('.board .cms').waitFor();
  await page.fill('.board .cform textarea', '等一下');
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
  await page.goto(srv.url + '#play/soul-smith-defense');
  await page.locator('.board .cms').waitFor();
  await page.click('.board .cform textarea');
  await page.waitForFunction(() => window.__ex === 1);
  await page.waitForTimeout(1700);
  await page.fill('.board .cform textarea', '很快');
  const t0 = Date.now();
  await page.click('.board .cform button:has-text("送出")');
  await page.waitForFunction(() => document.querySelector('.board .cms .cm .t')?.textContent === '很快', null, { timeout: 15000 });
  assert.ok(Date.now() - t0 < 1400, `送出花了 ${Date.now() - t0}ms`);
  assert.equal(await page.evaluate(() => window.__ex), 1, '沒有再驗證一次');
  await ctx.close();
});

test('打開留言板就先做驗證, 不用等點進留言框', async () => {
  const ctx = await browser.newContext(PC);
  const page = await ctx.newPage();
  await page.route('**/turnstile/v0/api.js*', r => r.fulfill({ contentType: 'text/javascript', body: SLOW_TS }));
  await page.goto(srv.url + '#play');
  await page.click('.gh:has-text("接力吉尼")');
  await page.waitForFunction(() => window.__ex === 1, null, { timeout: 5000 });
  await page.click('.gh:has-text("Bubble Tempo")');
  await page.waitForTimeout(500);
  assert.equal(await page.evaluate(() => window.__ex), 1, '備用的驗證還沒用掉, 換一款不再驗證');
  await ctx.close();
});

for (const [name, dev, sel] of [['電腦版', PC, '.board'], ['手機版', PHONE, '.psheet']]) {
  test(`${name}留言框: 即時顯示字數與上限, 打到右端自動換行整段看得到, Enter 送出不換行`, async () => {
    const ctx = await browser.newContext(dev);
    const page = await ctx.newPage();
    await page.goto(srv.url + '#play');
    await pick(page, '魂匠守衛者');
    if (sel === '.psheet') await page.locator('.psheet .cform textarea').waitFor();
    const box = page.locator(`${sel} .cform textarea`), count = page.locator(`${sel} .cform .ccount`);
    assert.equal(await count.textContent(), '0/200');
    const h1 = await box.evaluate(e => e.clientHeight);
    await box.fill('');
    await box.pressSequentially('這款遊戲的節奏很棒😀');
    assert.equal(await count.textContent(), '10/200'); // 表情符號算 1 字
    await box.fill('很好玩'.repeat(30));
    assert.equal(await count.textContent(), '90/200');
    const m = await box.evaluate(e => ({ h: e.clientHeight, sh: e.scrollHeight }));
    assert.ok(m.h > h1 * 1.5, `變成多列 (${h1} → ${m.h})`);
    assert.ok(m.sh <= m.h + 1, '整段都看得到');
    await box.press('Enter');
    assert.ok(!(await box.inputValue()).includes('\n'), 'Enter 不會換行');
    await ctx.close();
  });
}
