import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startServer, openBrowser, PC, PHONE } from './server.js';

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

test('首頁下方 P、V 色塊上的字是白色, D 是深色(亮暗主題都一樣)', async () => {
  for (const theme of ['light', 'dark']) {
    const ctx = await browser.newContext(PC);
    const page = await ctx.newPage();
    await page.goto(srv.url + '?theme=' + theme);
    const cols = await page.evaluate(() => [...document.querySelectorAll('.steps .plate')].map(p => getComputedStyle(p.querySelector('b')).color));
    assert.deepEqual(cols, ['rgb(255, 255, 255)', 'rgb(255, 255, 255)', 'rgb(45, 33, 68)'], theme);
    await ctx.close();
  }
});

test('手機直拿: 舞台是直的 1080x1920, 播放時 PVD計畫跟直式影片第一格同位置, 播放直式影片', async () => {
  const ctx = await browser.newContext(PHONE);
  const page = await ctx.newPage();
  await page.goto(srv.url + '?theme=light');
  await page.waitForFunction(() => document.getElementById('title').classList.contains('col'));
  await page.evaluate(() => document.fonts.ready);
  const where = () => page.evaluate(() => {
    const st = document.getElementById('stage'), sr = st.getBoundingClientRect(), s = sr.width / st.offsetWidth;
    const at = (e) => { const b = e.getBoundingClientRect(); return [(b.x - sr.x) / s, (b.y - sr.y) / s, b.width / s]; };
    return { w: st.offsetWidth, h: st.offsetHeight, plates: [...document.querySelectorAll('#title .plate')].map(at), plan: at(document.querySelector('#title .plan')) };
  });
  const r0 = await where();
  assert.deepEqual([r0.w, r0.h], [1080, 1920]);
  assert.ok(Math.abs(r0.plates[0][2] - 210) < 21, `頁面上色塊接近影片大小 ${r0.plates[0]}`);
  await page.click('#what');
  await page.waitForFunction(() => document.getElementById('home').classList.contains('playing'), null, { timeout: 10000 });
  // 直式影片 1.0 秒的位置(pvd-motion tools/probe-title.mjs 量的): 色塊 210, 左緣 435, 上緣 519.5 / 763.1 / 1006.7; 計畫上緣 1270.5
  const r = await where();
  [519.5, 763.1, 1006.7].forEach((y, i) => {
    assert.ok(Math.abs(r.plates[i][0] - 435) < 2 && Math.abs(r.plates[i][1] - y) < 2 && Math.abs(r.plates[i][2] - 210) < 2, `第 ${i + 1} 塊 ${r.plates[i]}`);
  });
  assert.ok(Math.abs(r.plan[1] - 1270.5) < 3, `計畫 ${r.plan}`);
  assert.match(await page.evaluate(() => document.getElementById('film').src), /pvd-light-portrait\.mp4$/);
  assert.deepEqual(await page.evaluate(() => { const f = document.getElementById('film'); return [f.offsetWidth, f.offsetHeight]; }), [1080, 1920]);
  await ctx.close();
});
