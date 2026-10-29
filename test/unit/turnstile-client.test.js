import { test, mock } from 'node:test';
import assert from 'node:assert/strict';

// 假的瀏覽器環境與假的 Turnstile: 每次 execute 由測試決定何時回 token
const widgets = [];
globalThis.document = { createElement: () => ({ style: {} }), body: { appendChild() {} }, head: { appendChild() {} } };
globalThis.window = globalThis;
globalThis.turnstile = {
  render(box, opts) { widgets.push(opts); return widgets.length - 1; },
  reset() {},
  execute(id) { turnstile.onExecute?.(widgets[id]); },
};
const { turnstileToken } = await import('../../site/js/api.js');

test('需要手動驗證時不因 8 秒逾時而失敗', async () => {
  mock.timers.enable({ apis: ['setTimeout'] });
  turnstile.onExecute = w => { w['before-interactive-callback']?.(); setTimeout(() => w.callback('tok-slow'), 20000); };
  const p = turnstileToken();
  for (let i = 0; i < 20; i++) await Promise.resolve();
  mock.timers.tick(20001);
  assert.equal(await p, 'tok-slow');
  mock.timers.reset();
});

test('同時兩次取 token 各自拿到結果, 不互相覆蓋', async () => {
  let n = 0;
  turnstile.onExecute = w => { const t = 'tok' + (++n); setTimeout(() => w.callback(t), 10); };
  const [a, b] = await Promise.all([turnstileToken(), turnstileToken()]);
  assert.deepEqual([a, b], ['tok1', 'tok2']);
});

test('沒有跳出手動驗證就 8 秒逾時', async () => {
  mock.timers.enable({ apis: ['setTimeout'] });
  turnstile.onExecute = () => {};
  const p = turnstileToken();
  for (let i = 0; i < 20; i++) await Promise.resolve();
  mock.timers.tick(8001);
  await assert.rejects(p, e => e.code === 'turnstile');
  mock.timers.reset();
});
