import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { startServer, openBrowser, PC } from './server.js';

let srv, browser;
before(async () => { browser = await openBrowser(); srv = await startServer(); });
after(async () => { await browser?.close(); await srv?.stop(); });

const ogImage = html => html.match(/<meta property="og:image" content="([^"]+)"/)[1];

test('連結預覽: 沒有輪次時用預設分享圖; 後台替目前這輪上傳分享圖後首頁改用它, 改回預設圖又恢復', async () => {
  const ctx = await browser.newContext(PC);
  const page = await ctx.newPage();
  const home = async () => (await page.request.get(srv.url)).text();
  const def = ogImage(await home());
  assert.equal(def, srv.url + 'media/og/share-default-v1.png');
  assert.equal((await page.request.get(def)).headers()['content-type'], 'image/png');

  await page.goto(srv.url + 'admin/');
  await page.click('nav button[data-tab="vote"]');
  await page.locator('#nadd').waitFor();
  const setDt = async (cls, ms) => {
    const t = new Date(ms + 8 * 3600000).toISOString();
    await page.fill(`.${cls} input`, t.slice(0, 10));
    const sel = page.locator(`.${cls} select`);
    for (const [i, a] of [[0, 11], [1, 14], [2, 17]]) await sel.nth(i).selectOption(t.slice(a, a + 2));
  };
  await setDt('nstart', Date.now() - 3600000); await setDt('nend', Date.now() + 3600000);
  await page.click('#nadd');
  const card = page.locator('.card[data-id="1"]');
  await card.locator('.share:has-text("整站預設圖")').waitFor();
  assert.match(await card.locator('.share img').getAttribute('src'), /share-default-v1\.png$/, '沒上傳時顯示預設圖');
  await page.locator('.cshare:has-text("第 1 輪沒有上傳分享圖")').waitFor();
  await card.locator('.sfile').setInputFiles({ name: 'share.png', mimeType: 'image/png', buffer: readFileSync('site/media/og/share-default-v1.png') });
  await page.locator('.card[data-id="1"] .share:has-text("這一輪自己的")').waitFor();
  const thumb = page.locator('.card[data-id="1"] .share img');
  assert.match(await thumb.getAttribute('src'), /\/files\/share\//);
  await page.waitForFunction(() => { const i = document.querySelector('.card[data-id="1"] .share img'); return i.complete && i.naturalWidth === 1200; });
  await page.locator('.cshare:has-text("用第 1 輪的分享圖")').waitFor();
  assert.match(await page.locator('.cshare img').getAttribute('src'), /\/files\/share\//, '上方顯示目前生效的分享圖');

  const own = ogImage(await home());
  assert.match(own, /\/files\/share\/[a-z0-9]+-[0-9a-f]{8}\.png$/);
  assert.equal((await page.request.get(own)).headers()['content-type'], 'image/png');

  await page.click('.card[data-id="1"] .sdel');
  await page.locator('.card[data-id="1"] .share:has-text("整站預設圖")').waitFor();
  assert.equal(ogImage(await home()), def);
  await ctx.close();
});
