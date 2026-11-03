import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startServer, openBrowser, PC } from './server.js';

let srv, browser;
before(async () => { srv = await startServer(); browser = await openBrowser(); });
after(async () => { await browser?.close(); await srv?.stop(); });

test('影片可以跳到指定秒數(伺服器回分段)', async () => {
  const res = await fetch(srv.url + 'media/pvd-light.mp4', { headers: { Range: 'bytes=100-199' } });
  assert.equal(res.status, 206);
  assert.equal((await res.arrayBuffer()).byteLength, 100);
});

test('影片播放時點畫面上 P、V、D 原本的位置沒有反應', async () => {
  const ctx = await browser.newContext({ ...PC, colorScheme: 'light' });
  const page = await ctx.newPage();
  await page.goto(srv.url + '?theme=light');
  await page.click('#what');
  await page.waitForFunction(() => document.getElementById('home').classList.contains('playing'));
  for (const k of ['play', 'vote', 'develop']) {
    const box = await page.evaluate(k => { const r = document.querySelector(`.key[data-k="${k}"] .plate`).getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; }, k);
    await page.mouse.click(box.x, box.y);
  }
  await page.waitForTimeout(300);
  assert.equal(await page.evaluate(() => location.hash), '');
  assert.equal(await page.evaluate(() => document.body.dataset.pg), 'home');
  assert.ok(await page.evaluate(() => document.getElementById('home').classList.contains('playing')), '影片還在播');
  await ctx.close();
});

test('看到一半關掉再按播放, 第一個顯示的畫面是接播點, 不閃上次停下的畫面', async () => {
  const ctx = await browser.newContext({ ...PC, colorScheme: 'light' });
  const page = await ctx.newPage();
  await page.goto(srv.url + '?theme=light');
  await page.click('#what');
  await page.waitForFunction(() => document.getElementById('home').classList.contains('playing'));
  // 跳到禮物盒那段再關掉
  await page.evaluate(() => new Promise(r => { const f = document.getElementById('film'); f.addEventListener('seeked', r, { once: true }); f.currentTime = 31; }));
  await page.waitForTimeout(300);
  await page.click('#close');
  await page.waitForTimeout(500);
  // 再按一次: 記下影片被顯示出來那一刻畫面上是哪一格
  await page.evaluate(() => {
    const f = document.getElementById('film'), home = document.getElementById('home');
    window.shown = null;
    new MutationObserver(() => { if (home.classList.contains('playing') && window.shown === null) window.shown = f.currentTime; })
      .observe(home, { attributes: true, attributeFilter: ['class'] });
  });
  await page.click('#what');
  await page.waitForFunction(() => window.shown !== null, null, { timeout: 10000 });
  const shown = await page.evaluate(() => window.shown);
  assert.ok(shown >= 0.7 && shown < 2, `顯示時在第 ${shown} 秒`);
  await ctx.close();
});
