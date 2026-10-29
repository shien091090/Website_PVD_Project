import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readJson, HttpError, fail } from '../../functions/lib/http.js';
import { onRequest } from '../../functions/api/_middleware.js';

test('readJson 太大或格式錯丟 400', async () => {
  const big = new Request('https://x.test', { method: 'POST', body: JSON.stringify({ a: 'x'.repeat(5000) }) });
  await assert.rejects(readJson(big), e => e instanceof HttpError && e.status === 400);
  await assert.rejects(readJson(new Request('https://x.test', { method: 'POST', body: '{' })), e => e.status === 400);
  assert.deepEqual(await readJson(new Request('https://x.test', { method: 'POST', body: '{"a":1}' })), { a: 1 });
});
test('fail 格式', async () => {
  const r = fail(429, 'too_fast', '太快');
  assert.equal(r.status, 429);
  assert.deepEqual(await r.json(), { error: { code: 'too_fast', message: '太快' } });
});
test('middleware: 新訪客加 Set-Cookie、no-store、HttpError 轉 JSON', async () => {
  const ctx = { request: new Request('https://x.test/api/x', { headers: { 'CF-Connecting-IP': '1.1.1.1' } }), env: { IP_SALT: 's' }, data: {},
    next: async () => { throw new HttpError(404, 'unknown_game'); } };
  const r = await onRequest(ctx);
  assert.equal(r.status, 404);
  assert.equal((await r.json()).error.code, 'unknown_game');
  assert.match(r.headers.get('Set-Cookie'), /pvd_vid=/);
  assert.equal(r.headers.get('Cache-Control'), 'no-store');
  assert.match(ctx.data.vid, /^[A-Za-z0-9_-]{22}$/);
  assert.equal(ctx.data.ipHash.length, 32);
});
test('middleware: 其他錯誤回 500 server_error', async () => {
  const ctx = { request: new Request('https://x.test/api/x', { headers: { cookie: 'pvd_vid=abcdefghijklmnopqrstuv' } }), env: { IP_SALT: 's' }, data: {},
    next: async () => { throw new Error('boom'); } };
  const r = await onRequest(ctx);
  assert.equal(r.status, 500);
  assert.equal((await r.json()).error.code, 'server_error');
  assert.equal(r.headers.get('Set-Cookie'), null);
});
