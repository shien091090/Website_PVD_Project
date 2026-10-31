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

test('試玩頁介紹: 有橫幅的遊戲頂端放 21:9 橫幅, 圖示壓在橫幅左下角; 沒橫幅的照舊', async () => {
  const ctx = await browser.newContext(PC);
  const page = await ctx.newPage();
  await page.goto(srv.url + '#play/dungeon-zoo');
  const cover = page.locator('#detail .cover');
  await cover.waitFor();
  assert.match(await cover.locator('img').getAttribute('src'), /dungeon-zoo-banner\.png$/);
  await page.waitForFunction(() => document.querySelector('#detail .cover img').complete);
  const c = await cover.locator('img').boundingBox(), dl = await page.locator('#detail .dl').boundingBox();
  const ic = await page.locator('#detail .hd .icon').boundingBox();
  assert.ok(Math.abs(c.width / c.height - 21 / 9) < 0.03, `橫幅比例 ${c.width}x${c.height}`);
  assert.ok(Math.abs(c.width - dl.width) < 2 && Math.abs(c.y - dl.y) < 4, '橫幅貼齊左半頂端');
  assert.ok(ic.y < c.y + c.height && ic.y + ic.height > c.y + c.height, '圖示跨在橫幅下緣');
  assert.ok(ic.x - c.x < c.width * 0.25, '圖示在左邊');
  await page.goto(srv.url + '#play/slime-tetris');
  await page.locator('#detail .hd').waitFor();
  assert.equal(await page.locator('#detail .cover').count(), 0);
  await ctx.close();
});

test('試玩頁介紹: 窄螢幕標題不壓進橫幅, 開始鈕不用捲動就看得到', async () => {
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 640 } }); // 1366×768 筆電扣掉瀏覽器工具列
  const page = await ctx.newPage();
  await page.goto(srv.url + '#play/dungeon-zoo');
  await page.locator('#detail .cover img').waitFor();
  const c = await page.locator('#detail .cover').boundingBox(), t = await page.locator('#detail .hd b').boundingBox();
  if (t.height > 1) assert.ok(t.y >= c.y + c.height, `標題頂 ${t.y} 在橫幅底 ${c.y + c.height} 之下`);
  const b = await page.locator('#detail .startbtn').boundingBox(), dl = await page.locator('#detail .dl').boundingBox();
  assert.ok(b.y + b.height <= dl.y + dl.height, `開始鈕底 ${b.y + b.height} 超出介紹區底 ${dl.y + dl.height}`);
  await ctx.close();
});
