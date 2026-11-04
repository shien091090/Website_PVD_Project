import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startServer, openBrowser, PC } from './server.js';

let srv, browser;
before(async () => { browser = await openBrowser(); srv = await startServer(); });
after(async () => { await browser?.close(); await srv?.stop(); });

test('後台產生短連結, 打開後跳到導連頁、網址列沒有參數、來源 cookie 讀完就刪', async () => {
  const ctx = await browser.newContext(PC);
  const page = await ctx.newPage();
  await page.goto(srv.url + 'admin/');
  await page.click('nav button[data-tab="links"]');
  await page.fill('#usrc', 'threads'); await page.fill('#ucamp', 'pvd-round1'); await page.fill('#ucont', 'post-0101');
  await page.selectOption('#upage', 'play');
  await page.click('#umake');
  await page.locator('#umsg:has-text("已產生新連結")').waitFor();
  const url = await page.inputValue('#uout');
  assert.match(url, /\/s\/[A-Za-z0-9]{7}$/);
  assert.ok(!/threads|round1|post-0101|play/.test(url));
  await page.locator('#ulist tr:has-text("threads")').waitFor();
  await page.click('#umake');
  await page.locator('#umsg:has-text("沿用同一條連結")').waitFor();
  assert.equal(await page.inputValue('#uout'), url);

  await page.check('#unosrc'); await page.fill('#ucont', 'post-0102');
  assert.ok(await page.locator('#usrc').isDisabled());
  await page.click('#umake');
  await page.locator('#ulist tr:has-text("不指定")').waitFor();
  assert.notEqual(await page.inputValue('#uout'), url);

  await page.goto(url);
  await page.waitForURL(srv.url + '#play');
  assert.equal(new URL(page.url()).search, '');
  await page.locator('#pg-play').waitFor({ state: 'visible' });
  assert.equal(await page.evaluate(() => document.cookie.includes('pvd_link')), false);
  await ctx.close();
});
