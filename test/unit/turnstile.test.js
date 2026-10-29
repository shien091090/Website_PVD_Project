import { test } from 'node:test';
import assert from 'node:assert/strict';
import { verifyTurnstile } from '../../functions/lib/turnstile.js';

const fakeFetch = body => { const calls = []; const f = async (url, init) => { calls.push({ url, init }); return new Response(JSON.stringify(body)); }; f.calls = calls; return f; };

test('驗證通過', async () => {
  const f = fakeFetch({ success: true });
  assert.equal(await verifyTurnstile('tok', '1.2.3.4', 'sec', f), true);
  assert.equal(f.calls[0].url, 'https://challenges.cloudflare.com/turnstile/v0/siteverify');
});
test('驗證失敗', async () => {
  assert.equal(await verifyTurnstile('tok', '1.2.3.4', 'sec', fakeFetch({ success: false })), false);
});
test('空 token 不呼叫驗證直接失敗', async () => {
  const f = fakeFetch({ success: true });
  assert.equal(await verifyTurnstile('', '1.2.3.4', 'sec', f), false);
  assert.equal(f.calls.length, 0);
});
