import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startServer, openBrowser, PC, PHONE, PHONE_L } from './server.js';

let srv, browser;
before(async () => { srv = await startServer(); browser = await openBrowser(); });
after(async () => { await browser?.close(); await srv?.stop(); });

test('電腦開遊玩頁載入遊戲並記成玩過', async () => {
  const ctx = await browser.newContext(PC);
  const page = await ctx.newPage();
  await page.goto(srv.url + '#game/slime-tetris');
  const frame = page.locator('#pg-game iframe');
  await frame.waitFor();
  assert.match(await frame.getAttribute('src'), /\/games\/slime-tetris\/$/);
  const title = await page.frameLocator('#pg-game iframe').locator('title').textContent({ timeout: 10000 });
  assert.match(title, /史萊姆擴張/);
  const played = await page.evaluate(() => JSON.parse(localStorage.getItem('pvd:played')));
  assert.ok(played.includes('slime-tetris'));
  await ctx.close();
});

test('手機玩到一半轉直再轉回, 遊戲不重新載入', async () => {
  const ctx = await browser.newContext(PHONE_L);
  const page = await ctx.newPage();
  await page.goto(srv.url + '#game/slime-tetris');
  await page.locator('#pg-game iframe').waitFor();
  const f = page.frame({ url: /slime-tetris/ });
  await f.waitForLoadState();
  await f.evaluate(() => { window.__mark = 1; });
  await page.setViewportSize(PHONE.viewport);
  await page.waitForTimeout(300);
  assert.ok(await page.locator('text=把手機轉成橫向').isVisible());
  await page.setViewportSize(PHONE_L.viewport);
  await page.waitForTimeout(300);
  assert.equal(await page.frame({ url: /slime-tetris/ }).evaluate(() => window.__mark), 1);
  await ctx.close();
});

test('手機直拿進遊玩頁不載入遊戲, 只顯示轉向提示', async () => {
  const ctx = await browser.newContext(PHONE);
  const page = await ctx.newPage();
  await page.goto(srv.url + '#game/slime-tetris');
  await page.waitForTimeout(500);
  assert.equal(await page.locator('#pg-game iframe').count(), 0);
  assert.ok(await page.locator('text=把手機轉成橫向').isVisible());
  await ctx.close();
});

test('返回回到試玩頁並選回該款', async () => {
  const ctx = await browser.newContext(PC);
  const page = await ctx.newPage();
  await page.goto(srv.url + '#game/slime-tetris');
  await page.click('text=‹ 返回');
  await page.waitForFunction(() => location.hash === '#play/slime-tetris');
  assert.equal(await page.locator('#pg-game iframe').count(), 0);
  assert.equal(await page.locator('.gi.sel .nm b').textContent(), '史萊姆擴張');
  await ctx.close();
});

test('遊戲收到暫停訊息', async () => {
  const ctx = await browser.newContext(PHONE_L);
  const page = await ctx.newPage();
  await page.goto(srv.url + '#game/slime-tetris');
  await page.waitForFunction(() => document.querySelector('#pg-game iframe')?.contentDocument?.readyState === 'complete'
    && /slime-tetris/.test(document.querySelector('#pg-game iframe').contentWindow.location.href));
  // 從上層在遊戲視窗掛監聽, 避免拿到轉址前的舊 frame
  await page.evaluate(() => { window.__msgs = []; document.querySelector('#pg-game iframe').contentWindow.addEventListener('message', e => window.__msgs.push(e.data.type)); });
  await page.setViewportSize(PHONE.viewport);
  await page.waitForTimeout(300);
  await page.setViewportSize(PHONE_L.viewport);
  await page.waitForTimeout(300);
  assert.deepEqual(await page.evaluate(() => window.__msgs), ['pvd:pause', 'pvd:resume']);
  await ctx.close();
});

test('遊戲圖示塞滿圓角框, 不會撐出框外', async () => {
  for (const opts of [PC, PHONE]) {
    const ctx = await browser.newContext(opts);
    const page = await ctx.newPage();
    await page.goto(srv.url + '#play');
    const icons = page.locator('.icon:has(img)');
    await icons.first().locator('img').waitFor();
    await page.waitForFunction(() => [...document.querySelectorAll('.icon img')].every(i => i.complete));
    for (const icon of await icons.all()) {
      const box = await icon.boundingBox();
      const img = await icon.locator('img').boundingBox();
      assert.ok(img.width <= box.width && img.height <= box.height, `圖 ${img.width}x${img.height} 超出框 ${box.width}x${box.height}`);
      assert.ok(img.width >= box.width - 8, '圖要塞滿框');
      assert.equal(await icon.evaluate(e => getComputedStyle(e).overflow), 'hidden');
    }
    await ctx.close();
  }
});

test('遊戲框是 21:9, 電腦四周留白較多, 手機橫拿只留一點', async () => {
  for (const [opts, gap] of [[PC, 40], [PHONE_L, 8]]) {
    const ctx = await browser.newContext(opts);
    const page = await ctx.newPage();
    await page.goto(srv.url + '#game/slime-tetris');
    await page.locator('#scr iframe').waitFor();
    const area = await page.locator('.gwrap').boundingBox();
    const scr = await page.locator('#scr').boundingBox();
    assert.ok(Math.abs(scr.width / scr.height - 21 / 9) < 0.02, `比例 ${scr.width}x${scr.height}`);
    const side = Math.min(scr.x - area.x, area.x + area.width - scr.x - scr.width, scr.y - area.y, area.y + area.height - scr.y - scr.height);
    assert.ok(Math.abs(side - gap) <= 1, `最窄留白 ${side}, 應為 ${gap}`);
    await ctx.close();
  }
});

test('手機橫拿: 返回鈕放進瀏海保留區, 遊戲左邊不多空一條', async () => {
  const ctx = await browser.newContext(PHONE_L);
  const page = await ctx.newPage();
  await page.goto(srv.url + '#game/slime-tetris');
  await page.locator('#scr iframe').waitFor();
  await page.addStyleTag({ content: '.page { --sal: 92px; }' }); // 模擬 iPhone 左邊瀏海保留區
  const scr = await page.locator('#scr').boundingBox();
  const back = await page.locator('#pg-game .back').boundingBox();
  assert.ok(scr.x <= 92 + 2 + 8 + 1, `遊戲左邊從 ${scr.x} 開始`);
  assert.ok(back.x >= 0 && back.x + back.width <= scr.x, '返回鈕完整顯示且不壓到遊戲');
  assert.match(await page.locator('#pg-game .back').textContent(), /返回/);
  await ctx.close();
});
