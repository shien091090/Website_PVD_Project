import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startServer, openBrowser, PC } from './server.js';

let srv, browser;
before(async () => { srv = await startServer(); browser = await openBrowser(); });
after(async () => { await browser?.close(); await srv?.stop(); });

// 用假的 PostHog 腳本記下網站呼叫了什麼(測網站與 PostHog 的介接, 不測 PostHog 本身)
const FAKE = flag => `window.posthog = { calls: [],
  init(k, o) { this.calls.push(['init', k, o]); },
  capture(e, p, o) { this.calls.push(['capture', e, p, o]); },
  register(p) { this.calls.push(['register', p]); },
  setPersonProperties(p) { this.calls.push(['person', p]); },
  onFeatureFlags(cb) { setTimeout(cb, 50); },
  getFeatureFlag() { return ${JSON.stringify(flag)}; } };`;

async function open(flag, url = '?utm_source=threads&utm_content=p1#play') {
  const ctx = await browser.newContext(PC);
  const page = await ctx.newPage();
  await page.route('**/js/config.js', async r => {
    const res = await r.fetch();
    r.fulfill({ response: res, body: (await res.text()).replace("posthogKey: ''", "posthogKey: 'phc_test'").replace('analyticsHosts: [', "analyticsHosts: ['localhost', ") });
  });
  await page.route('**/static/array.full.js', r => r.fulfill({ contentType: 'text/javascript', body: FAKE(flag) }));
  await page.goto(srv.url + url);
  return { ctx, page, calls: () => page.evaluate(() => window.posthog?.calls || []) };
}
const events = calls => calls.filter(c => c[0] === 'capture');

test('第一次來依旗標分組, 主題先註冊再送頁面瀏覽, 重新整理不變', async () => {
  const { ctx, page, calls } = await open('dark');
  await page.waitForFunction(() => window.posthog?.calls.some(c => c[0] === 'capture' && c[1] === '$pageview'));
  assert.equal(await page.evaluate(() => document.documentElement.className), 'dark');
  assert.equal(await page.evaluate(() => localStorage.getItem('pvd:theme')), '"dark"');
  const c = await calls();
  const reg = c.findIndex(x => x[0] === 'register'), pv = c.findIndex(x => x[1] === '$pageview');
  assert.ok(reg >= 0 && reg < pv, '主題註冊在第一個頁面瀏覽之前');
  assert.deepEqual(c[reg][1], { theme: 'dark', theme_source: 'flag' });
  assert.match(c[pv][2].$current_url, /utm_source=threads/);
  await page.reload();
  await page.waitForFunction(() => window.posthog?.calls.some(c => c[0] === 'register'));
  assert.deepEqual((await calls()).find(x => x[0] === 'register')[1], { theme: 'dark', theme_source: 'stored' });
  await ctx.close();
});

test('不在正式網址(預覽網址)時不載入數據服務, 頁面照常出現', async () => {
  const ctx = await browser.newContext(PC);
  const page = await ctx.newPage();
  await page.route('**/js/config.js', async r => {
    const res = await r.fetch();
    r.fulfill({ response: res, body: (await res.text()).replace("posthogKey: ''", "posthogKey: 'phc_test'") });
  });
  let loaded = false;
  await page.route('**/static/array.full.js', r => { loaded = true; r.fulfill({ contentType: 'text/javascript', body: FAKE('dark') }); });
  await page.goto(srv.url + '#play');
  await page.waitForFunction(() => !document.documentElement.classList.contains('pvd-wait') && localStorage.getItem('pvd:theme'));
  await page.click('.gh:has-text("史萊姆擴張")');
  await page.waitForTimeout(500);
  assert.equal(loaded, false);
  assert.equal(await page.evaluate(() => window.posthog), undefined);
  await ctx.close();
});

test('旗標沒回來: 1.5 秒內頁面出現並隨機分組', async () => {
  const ctx = await browser.newContext(PC);
  const page = await ctx.newPage();
  await page.route('**/js/config.js', async r => {
    const res = await r.fetch();
    r.fulfill({ response: res, body: (await res.text()).replace("posthogKey: ''", "posthogKey: 'phc_test'").replace('analyticsHosts: [', "analyticsHosts: ['localhost', ") });
  });
  await page.route('**/static/array.full.js', () => {}); // 永遠不回應
  const t0 = Date.now();
  await page.goto(srv.url + '#play', { waitUntil: 'commit' });
  await page.waitForFunction(() => !document.documentElement.classList.contains('pvd-wait') && localStorage.getItem('pvd:theme'));
  assert.ok(Date.now() - t0 < 4000);
  assert.ok(await page.locator('#pg-play').isVisible());
  await ctx.close();
});

test('點遊戲、開始玩、離開都有事件', async () => {
  const { ctx, page, calls } = await open('light', '#play');
  await page.waitForFunction(() => window.posthog?.calls.some(c => c[1] === '$pageview'));
  await page.click('.gh:has-text("史萊姆擴張")');
  await page.click('.detail .startbtn');
  await page.waitForFunction(() => location.hash === '#game/slime-tetris');
  await page.click('text=‹ 返回');
  await page.waitForFunction(() => window.posthog.calls.some(c => c[1] === 'game_leave'));
  const ev = events(await calls()).map(c => c[1]);
  for (const e of ['play_page_view', 'game_detail_open', 'game_start', 'game_leave']) assert.ok(ev.includes(e), e);
  const leave = events(await calls()).find(c => c[1] === 'game_leave')[2];
  assert.equal(leave.game, 'slime-tetris');
  assert.equal(typeof leave.seconds, 'number');
  await ctx.close();
});

test('玩到一半關分頁也送離開事件, 從返回快取回來後重新計時', async () => {
  const { ctx, page, calls } = await open('light', '#play');
  await page.waitForFunction(() => window.posthog?.calls.some(c => c[1] === '$pageview'));
  await page.click('.gh:has-text("捕泡手")');
  await page.click('.detail .startbtn');
  await page.waitForFunction(() => location.hash === '#game/bubble-catcher');
  await page.evaluate(() => dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true })));
  const leaves = async () => events(await calls()).filter(c => c[1] === 'game_leave');
  const [first] = await leaves();
  assert.ok(first, '關分頁時送出');
  assert.equal(first[2].game, 'bubble-catcher');
  assert.equal(typeof first[2].seconds, 'number');
  assert.deepEqual(first[3], { transport: 'sendBeacon' });
  // 從返回快取回到遊玩頁: 之後正常離開再記一次, 秒數從回來時起算
  await page.evaluate(() => dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })));
  await page.click('text=‹ 返回');
  await page.waitForFunction(() => window.posthog.calls.filter(c => c[1] === 'game_leave').length === 2);
  assert.equal((await leaves())[1][2].game, 'bubble-catcher');
  await ctx.close();
});

test('分頁隱藏時送 engaged 前景時間', async () => {
  const { ctx, page, calls } = await open('light', '#play');
  await page.waitForFunction(() => window.posthog?.calls.some(c => c[1] === '$pageview'));
  await page.click('.gh:has-text("幽影接力")');
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  const e = events(await calls()).find(c => c[1] === 'engaged');
  assert.ok(e, 'engaged 事件');
  assert.ok(e[2].fg_ms > 0);
  assert.equal(e[2].interacted, true);
  assert.equal(e[2].page, 'play');
  assert.deepEqual(e[3], { transport: 'sendBeacon' });
  await ctx.close();
});

test('網址 ?theme= 強制主題並出現切換鈕, 不存檔', async () => {
  const { ctx, page } = await open('light', '?theme=dark#vote');
  await page.locator('#thm').waitFor();
  assert.equal(await page.evaluate(() => document.documentElement.className), 'dark');
  assert.equal(await page.evaluate(() => localStorage.getItem('pvd:theme')), null);
  await ctx.close();
});

test('遊玩時間只算真正在玩: 分頁切走的時間不算; 玩完一局帶上這款累計的遊玩時間', async () => {
  const ctx = await browser.newContext(PC);
  const page = await ctx.newPage();
  await page.clock.install();
  await page.route('**/js/config.js', async r => {
    const res = await r.fetch();
    r.fulfill({ response: res, body: (await res.text()).replace("posthogKey: ''", "posthogKey: 'phc_test'").replace('analyticsHosts: [', "analyticsHosts: ['localhost', ") });
  });
  await page.route('**/static/array.full.js', r => r.fulfill({ contentType: 'text/javascript', body: FAKE('light') }));
  await page.goto(srv.url + '#game/slime-tetris');
  await page.locator('#pg-game iframe').waitFor();
  const setHidden = h => page.evaluate(h => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => h });
    document.dispatchEvent(new Event('visibilitychange'));
  }, h);
  const ev = async name => (await page.evaluate(() => window.posthog.calls)).filter(c => c[0] === 'capture' && c[1] === name);
  await page.clock.runFor(10000);
  await setHidden(true);
  await page.clock.runFor(60000);
  await setHidden(false);
  await page.clock.runFor(5000);
  await page.click('text=‹ 返回');
  await page.waitForFunction(() => window.posthog.calls.some(c => c[1] === 'game_leave'));
  // 時鐘仍照真實時間走, 載入與點擊會多幾秒; 重點是切走的 60 秒不算
  const s = (await ev('game_leave'))[0][2].seconds;
  assert.ok(s >= 15 && s < 45, `遊玩 ${s} 秒`);
  // 第二次進來玩 20 秒後玩完: 累計 35 秒
  await page.evaluate(() => { location.hash = '#game/slime-tetris'; });
  await page.locator('#pg-game iframe').waitFor();
  await page.clock.runFor(20000);
  const f = await (await page.$('#pg-game iframe')).contentFrame();
  await f.waitForLoadState();
  await f.evaluate(() => parent.postMessage({ type: 'pvd:finish' }, location.origin));
  await page.waitForFunction(() => window.posthog.calls.some(c => c[1] === 'game_finish'));
  const fin = (await ev('game_finish'))[0][2];
  assert.equal(fin.game, 'slime-tetris');
  assert.ok(fin.play_seconds >= s + 20 && fin.play_seconds < s + 50, `累計 ${fin.play_seconds} 秒`);
  await ctx.close();
});

test('換頁時送出上一頁的 engaged 前景時間, 各頁分開算', async () => {
  const { ctx, page, calls } = await open('light', '#play');
  await page.waitForFunction(() => window.posthog?.calls.some(c => c[1] === '$pageview'));
  await page.evaluate(() => { location.hash = '#vote'; });
  await page.waitForFunction(() => window.posthog.calls.some(c => c[1] === 'engaged'));
  const [e] = events(await calls()).filter(c => c[1] === 'engaged');
  assert.equal(e[2].page, 'play');
  assert.ok(e[2].fg_ms > 0);
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  const all = events(await calls()).filter(c => c[1] === 'engaged');
  assert.equal(all.length, 2);
  assert.equal(all[1][2].page, 'vote');
  await ctx.close();
});
