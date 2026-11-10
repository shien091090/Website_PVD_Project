import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { startServer, openBrowser, PC } from './server.js';

let srv, browser;
before(async () => { browser = await openBrowser(); srv = await startServer(); });
after(async () => { await browser?.close(); await srv?.stop(); });

test('後台編輯開發頁: 帶入舊文字檔、即時預覽、上傳 LOGO、發布後前台更新、可以退回', async () => {
  const ctx = await browser.newContext(PC);
  const page = await ctx.newPage();
  await page.goto(srv.url + '#develop');
  await page.locator('#devin h1:has-text("準備第二波概念遊戲中")').waitFor();

  const admin = await ctx.newPage();
  await admin.goto(srv.url + 'admin/');
  await admin.click('nav button[data-tab="develop"]');
  await admin.locator('#dnote:has-text("舊文字檔")').waitFor();
  assert.equal(await admin.inputValue('#dtitle'), '準備第二波概念遊戲中');
  assert.equal(await admin.inputValue('#ddev'), '時淵');
  assert.ok(await admin.locator('#dpub').isDisabled(), '沒改東西不能發布');

  // 改標題、加一段 → 預覽即時更新
  await admin.fill('#dtitle', '後台改的標題');
  await admin.click('#daddsec');
  await admin.fill('#dsecs .sec:last-child input', '新的段落');
  await admin.fill('#dsecs .sec:last-child textarea', '新段落的內容');
  const pv = admin.frameLocator('#dframe');
  await pv.locator('#devin h1:has-text("後台改的標題")').waitFor();
  await pv.locator('#devin h2:has-text("新的段落")').waitFor();
  await admin.locator('#dst:has-text("尚未發布")').waitFor();

  // 上傳 LOGO → 預覽看得到
  await admin.setInputFiles('#dlfile', { name: 'logo.png', mimeType: 'image/png', buffer: readFileSync('site/media/avatars/dog.png') });
  await admin.locator('#dlmsg:has-text("已上傳")').waitFor();
  await pv.locator('#devin img.logo').waitFor();
  assert.ok(await pv.locator('#devin img.logo').evaluate(i => i.complete && i.naturalWidth > 0), '預覽的 LOGO 有載入');

  // 發布 → 前台更新
  await admin.click('#dpub');
  await admin.locator('#dst:has-text("已發布")').waitFor();
  await admin.locator('#dhist li .cur').waitFor();
  await page.reload();
  await page.locator('#devin h1:has-text("後台改的標題")').waitFor();
  await page.locator('#devin h2:has-text("新的段落")').waitFor();
  await page.waitForFunction(() => { const i = document.querySelector('#devin img.logo'); return i && i.complete && i.naturalWidth > 0; });
  assert.ok(await admin.locator('#dnote').isHidden());

  // 再發一版, 然後退回第一版
  await admin.fill('#dtitle', '第二版標題');
  await admin.click('#dpub');
  await admin.locator('#dhist li:nth-child(2) [data-rev]').waitFor();
  await admin.click('#dhist li:nth-child(2) [data-rev]');
  await admin.locator('#dst:has-text("已退回")').waitFor();
  assert.equal(await admin.inputValue('#dtitle'), '後台改的標題');
  await page.reload();
  await page.locator('#devin h1:has-text("後台改的標題")').waitFor();
  await ctx.close();
});

test('後台開發頁: 不合規的內容顯示原因, 不會發布', async () => {
  const ctx = await browser.newContext(PC);
  const admin = await ctx.newPage();
  await admin.goto(srv.url + 'admin/');
  await admin.click('nav button[data-tab="develop"]');
  await admin.locator('#dtitle').waitFor();
  await admin.waitForFunction(() => document.getElementById('dtitle').value !== '');
  await admin.fill('#dmail', 'not-an-email');
  await admin.click('#dpub');
  await admin.locator('#dst:has-text("Email 格式不正確")').waitFor();
  await ctx.close();
});
