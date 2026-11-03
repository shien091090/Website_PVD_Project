import { test } from 'node:test';
import assert from 'node:assert/strict';
import { onRequestGet } from '../../functions/media/[file].js';

const BYTES = Uint8Array.from({ length: 100 }, (_, i) => i);
const call = (range) => {
  const headers = range ? { Range: range } : {};
  const request = new Request('https://x.test/media/pvd-light.mp4', { headers });
  let asked;
  const env = { ASSETS: { fetch: async (r) => { asked = r; return new Response(BYTES, { headers: { 'Content-Type': 'video/mp4', ETag: '"e"' } }); } } };
  return onRequestGet({ request, env }).then(async (res) => ({ res, body: new Uint8Array(await res.arrayBuffer()), asked }));
};

test('影片支援分段讀取: 指定範圍回 206 和那一段', async () => {
  const { res, body, asked } = await call('bytes=10-19');
  assert.equal(res.status, 206);
  assert.equal(res.headers.get('Content-Range'), 'bytes 10-19/100');
  assert.equal(res.headers.get('Content-Length'), '10');
  assert.equal(res.headers.get('Content-Type'), 'video/mp4');
  assert.deepEqual([...body], [10, 11, 12, 13, 14, 15, 16, 17, 18, 19]);
  assert.equal(asked.headers.get('Range'), null, '向靜態檔要整個檔案');
});

test('影片分段讀取: 只給起點、讀到結尾、從尾巴算', async () => {
  let { res, body } = await call('bytes=95-');
  assert.equal(res.headers.get('Content-Range'), 'bytes 95-99/100');
  assert.deepEqual([...body], [95, 96, 97, 98, 99]);
  ({ res, body } = await call('bytes=90-500'));
  assert.equal(res.headers.get('Content-Range'), 'bytes 90-99/100');
  ({ res, body } = await call('bytes=-3'));
  assert.deepEqual([...body], [97, 98, 99]);
});

test('影片沒指定範圍回整個檔案並標示可分段; 範圍超出回 416', async () => {
  let { res, body } = await call();
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('Accept-Ranges'), 'bytes');
  assert.equal(body.length, 100);
  ({ res } = await call('bytes=200-300'));
  assert.equal(res.status, 416);
  assert.equal(res.headers.get('Content-Range'), 'bytes */100');
});
