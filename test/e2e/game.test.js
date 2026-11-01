import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startServer, openBrowser, PC, PHONE, PHONE_L } from './server.js';

let srv, browser;
before(async () => { srv = await startServer(); browser = await openBrowser(); });
after(async () => { await browser?.close(); await srv?.stop(); });

test('電腦開遊玩頁載入遊戲並記成玩過', async () => {
  const ctx = await browser.newContext(PC);
  const page = await ctx.newPage();
  await page.goto(srv.url + '#game/ghost-echo');
  const frame = page.locator('#pg-game iframe');
  await frame.waitFor();
  assert.match(await frame.getAttribute('src'), /\/games\/ghost-echo\/$/);
  const title = await page.frameLocator('#pg-game iframe').locator('title').textContent({ timeout: 10000 });
  assert.match(title, /幽影接力/);
  const played = await page.evaluate(() => JSON.parse(localStorage.getItem('pvd:played')));
  assert.ok(played.includes('ghost-echo'));
  await ctx.close();
});

test('手機玩到一半轉直再轉回, 遊戲不重新載入', async () => {
  const ctx = await browser.newContext(PHONE_L);
  const page = await ctx.newPage();
  await page.goto(srv.url + '#game/ghost-echo');
  await page.locator('#pg-game iframe').waitFor();
  const f = page.frame({ url: /ghost-echo/ });
  await f.waitForLoadState();
  await f.evaluate(() => { window.__mark = 1; });
  await page.setViewportSize(PHONE.viewport);
  await page.waitForTimeout(300);
  assert.ok(await page.locator('text=把手機轉成橫向').isVisible());
  await page.setViewportSize(PHONE_L.viewport);
  await page.waitForTimeout(300);
  assert.equal(await page.frame({ url: /ghost-echo/ }).evaluate(() => window.__mark), 1);
  await ctx.close();
});

test('手機直拿進遊玩頁不載入遊戲, 只顯示轉向提示', async () => {
  const ctx = await browser.newContext(PHONE);
  const page = await ctx.newPage();
  await page.goto(srv.url + '#game/ghost-echo');
  await page.waitForTimeout(500);
  assert.equal(await page.locator('#pg-game iframe').count(), 0);
  assert.ok(await page.locator('text=把手機轉成橫向').isVisible());
  await ctx.close();
});

test('返回回到試玩頁並選回該款', async () => {
  const ctx = await browser.newContext(PC);
  const page = await ctx.newPage();
  await page.goto(srv.url + '#game/ghost-echo');
  await page.click('text=‹ 返回');
  await page.waitForFunction(() => location.hash === '#play/ghost-echo');
  assert.equal(await page.locator('#pg-game iframe').count(), 0);
  assert.equal(await page.locator('.gi.sel .nm b').textContent(), '幽影接力');
  await ctx.close();
});

test('遊戲收到暫停訊息', async () => {
  const ctx = await browser.newContext(PHONE_L);
  const page = await ctx.newPage();
  await page.goto(srv.url + '#game/ghost-echo');
  await page.waitForFunction(() => document.querySelector('#pg-game iframe')?.contentDocument?.readyState === 'complete'
    && /ghost-echo/.test(document.querySelector('#pg-game iframe').contentWindow.location.href));
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
  // 手機清單改用橫幅, 圖示改看抽屜裡的
  for (const [opts, hash] of [[PC, '#play'], [PHONE, '#play/dungeon-zoo']]) {
    const ctx = await browser.newContext(opts);
    const page = await ctx.newPage();
    await page.goto(srv.url + hash);
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

test('電腦遊戲框是 16:9 四周留白 40; 手機橫拿不限比例, 填滿只留一點', async () => {
  for (const [opts, gap, ratio] of [[PC, 40, 16 / 9], [PHONE_L, 8, null]]) {
    const ctx = await browser.newContext(opts);
    const page = await ctx.newPage();
    await page.goto(srv.url + '#game/ghost-echo');
    await page.locator('#scr iframe').waitFor();
    const area = await page.locator('.gwrap').boundingBox();
    const scr = await page.locator('#scr').boundingBox();
    const sides = [scr.x - area.x, area.x + area.width - scr.x - scr.width, scr.y - area.y, area.y + area.height - scr.y - scr.height];
    if (ratio) {
      assert.ok(Math.abs(scr.width / scr.height - ratio) < 0.02, `比例 ${scr.width}x${scr.height}`);
      assert.ok(Math.abs(Math.min(...sides) - gap) <= 1, `最窄留白 ${Math.min(...sides)}, 應為 ${gap}`);
    } else for (const s of sides) assert.ok(Math.abs(s - gap) <= 1, `四邊留白 ${sides}, 應都是 ${gap}`);
    await ctx.close();
  }
});

test('手機橫拿: 返回鈕放進瀏海保留區, 遊戲左邊不多空一條', async () => {
  const ctx = await browser.newContext(PHONE_L);
  const page = await ctx.newPage();
  await page.goto(srv.url + '#game/ghost-echo');
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
  await page.goto(srv.url + '#play/ghost-echo');
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

test('遊玩頁擋掉雙擊放大, 離開後恢復可縮放', async () => {
  const ctx = await browser.newContext(PHONE_L);
  const page = await ctx.newPage();
  await page.goto(srv.url + '#game/ghost-echo');
  await page.locator('#pg-game iframe').waitFor();
  const vp = () => page.locator('meta[name=viewport]').getAttribute('content');
  const ta = () => page.evaluate(() => [getComputedStyle(document.documentElement).touchAction, getComputedStyle(document.body).touchAction]);
  assert.match(await vp(), /maximum-scale=1/);
  assert.match(await vp(), /user-scalable=no/);
  assert.deepEqual(await ta(), ['manipulation', 'manipulation']);
  await page.evaluate(() => { location.hash = '#play/ghost-echo'; });
  await page.waitForTimeout(200);
  assert.doesNotMatch(await vp(), /user-scalable/);
  assert.deepEqual(await ta(), ['auto', 'auto']);
  await ctx.close();
});

test('遊玩頁擋掉 iPhone 的雙指縮放手勢(網頁與遊戲框內都擋)', async () => {
  const ctx = await browser.newContext(PHONE_L);
  const page = await ctx.newPage();
  await page.goto(srv.url + '#game/ghost-echo');
  const f = await (await page.waitForSelector('#pg-game iframe')).contentFrame();
  await f.waitForLoadState();
  await page.waitForTimeout(300);
  const blocked = (w, type) => w.evaluate(t => { const e = new Event(t, { bubbles: true, cancelable: true }); document.body.dispatchEvent(e); return e.defaultPrevented; }, type);
  for (const t of ['gesturestart', 'gesturechange', 'dblclick']) {
    assert.ok(await blocked(page, t), `網頁 ${t}`);
    assert.ok(await blocked(f, t), `遊戲框 ${t}`);
  }
  await page.evaluate(() => { location.hash = '#play/ghost-echo'; });
  await page.waitForTimeout(200);
  assert.equal(await blocked(page, 'gesturestart'), false);
  await ctx.close();
});

test('手機遊戲清單: 有橫幅的用橫幅當按鈕, 沒有的用主色暫代; 抽屜不放橫幅; 電腦清單不變', async () => {
  const ctx = await browser.newContext(PHONE);
  const page = await ctx.newPage();
  await page.goto(srv.url + '#play');
  await page.locator('#glist .gh').first().waitFor();
  const zoo = page.locator('.gh:has-text("來馬戲團看一點大場面")');
  assert.match(await zoo.locator('img.cv').getAttribute('src'), /dungeon-zoo-banner\.png$/);
  assert.match(await zoo.locator('.chip').textContent(), /15–20 分鐘/);
  const box = await zoo.boundingBox();
  assert.ok(Math.abs(box.width / box.height - 21 / 9) < 0.35, `格子 ${box.width}x${box.height}`);
  const bubble = page.locator('.gh:has-text("捕泡手")');
  assert.equal(await bubble.locator('img.cv').count(), 0);
  assert.ok(await bubble.locator('.fb').isVisible());
  await zoo.click();
  await page.locator('.psheet .pn').waitFor();
  assert.equal(await page.locator('.psheet .cover, .psheet img[src*="banner"]').count(), 0);
  await ctx.close();
  const pc = await browser.newContext(PC);
  const p2 = await pc.newPage();
  await p2.goto(srv.url + '#play');
  await p2.locator('#glist .gh').first().waitFor();
  assert.equal(await p2.locator('#glist .gh.bn').count(), 0);
  await pc.close();
});

test('遊戲還在載入時遊戲框顯示載入中, 載完就收起', async () => {
  const ctx = await browser.newContext(PC);
  const page = await ctx.newPage();
  let release;
  const gate = new Promise(r => { release = r; });
  await page.route(/\/games\/ghost-echo\/.+\.js/, async route => { await gate; await route.continue(); });
  await page.goto(srv.url + '#game/ghost-echo', { waitUntil: 'commit' });
  const ld = page.locator('#pg-game .gload');
  await ld.waitFor({ state: 'visible' });
  assert.match(await ld.textContent(), /載入中/);
  release();
  await ld.waitFor({ state: 'hidden', timeout: 15000 });
  await ctx.close();
});

test('建議裝置: 清單不放裝置圖示; 詳情寫建議裝置; 用的裝置不同才提示', async () => {
  const ctx = await browser.newContext(PC);
  const page = await ctx.newPage();
  await page.goto(srv.url + '#play/dungeon-zoo');
  await page.locator('.detail .startbtn').waitFor();
  assert.equal(await page.locator('#glist .devs').count(), 0);
  assert.match(await page.locator('.detail .meta').textContent(), /建議裝置\s*電腦/);
  assert.equal(await page.locator('.detail .rec').count(), 0, '電腦看建議電腦的遊戲不提示');
  await page.click('.gh:has-text("捕泡手")');
  assert.match(await page.locator('.detail .meta').textContent(), /建議裝置\s*手機/);
  assert.equal(await page.locator('.detail .rec').textContent(), '建議使用手機遊玩，以獲得最佳體驗');
  assert.ok(await page.locator('.detail .rec + .startbtn').isVisible(), '提示放在開始試玩正上方');
  await ctx.close();

  const ph = await browser.newContext(PHONE);
  const p2 = await ph.newPage();
  await p2.goto(srv.url + '#play/ghost-echo');
  await p2.locator('.psheet .startbtn').waitFor();
  assert.equal(await p2.locator('#glist .devs, .psheet .devs').count(), 0);
  assert.equal(await p2.locator('.psheet .rec').textContent(), '建議使用電腦遊玩，以獲得最佳體驗');
  assert.equal(await p2.locator('.psheet a.startbtn').count(), 1, '手機也能開始試玩');
  await ph.close();
});

test('用的裝置與建議不同時, 遊戲載入畫面也提示', async () => {
  const ctx = await browser.newContext(PHONE_L);
  const page = await ctx.newPage();
  await page.route(/\/games\/ghost-echo\/.+\.js/, () => {});
  await page.goto(srv.url + '#game/ghost-echo', { waitUntil: 'commit' });
  await page.locator('#pg-game .gload').waitFor();
  assert.match(await page.locator('#pg-game .gload').textContent(), /建議使用電腦遊玩，以獲得最佳體驗/);
  await ctx.close();
});
