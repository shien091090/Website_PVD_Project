import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeD1 } from '../helpers/d1.js';
import { onRequest as guard } from '../../functions/api/admin/_middleware.js';
import * as adminComments from '../../functions/api/admin/comments.js';
import * as adminLocks from '../../functions/api/admin/locks.js';
import * as pub from '../../functions/api/comments.js';

const ctxOf = (db, method, path, body, extra = {}) => ({
  request: new Request('https://x.test' + path, { method, body: body === undefined ? undefined : JSON.stringify(body) }),
  env: { DB: db }, data: { vid: 'v', ipHash: 'h', ip: '', now: () => 1_800_000_000_000, verify: async () => true }, ...extra,
});
const run = async (fn, ctx) => { try { const r = await fn(ctx); return { status: r.status, body: await r.json() }; } catch (e) { return { status: e.status, body: { error: { code: e.code } } }; } };

test('後台 middleware 驗不過回 401, 驗過放行', async () => {
  const deny = await guard({ request: new Request('https://pvd.pages.dev/api/admin/locks'), env: {}, data: {}, next: async () => new Response('ok') });
  assert.equal(deny.status, 401);
  const allow = await guard({ request: new Request('http://localhost:8788/api/admin/locks'), env: { ADMIN_DEV_EMAIL: 'd@l' }, data: {}, next: async () => new Response('ok') });
  assert.equal(await allow.text(), 'ok');
});

test('刪除留言: 前台看不到, 後台看得到且標記已刪', async () => {
  const db = makeD1();
  const posted = await run(pub.onRequestPost, ctxOf(db, 'POST', '/api/comments', { game: 'slime-tetris', avatar: 1, body: '要刪的', token: 't' }));
  const id = posted.body.comment.id;
  assert.equal((await run(adminComments.onRequestDelete, ctxOf(db, 'DELETE', `/api/admin/comments?id=${id}`))).status, 200);
  const front = await run(pub.onRequestGet, ctxOf(db, 'GET', '/api/comments?game=slime-tetris'));
  assert.equal(front.body.count, 0);
  const back = await run(adminComments.onRequestGet, ctxOf(db, 'GET', '/api/admin/comments?game=slime-tetris'));
  assert.equal(back.body.comments.length, 1);
  assert.equal(back.body.comments[0].deleted, 1);
  assert.equal(back.body.comments[0].body, '要刪的');
});

test('刪除不存在的留言 404', async () => {
  const db = makeD1();
  assert.equal((await run(adminComments.onRequestDelete, ctxOf(db, 'DELETE', '/api/admin/comments?id=999'))).status, 404);
});

test('鎖留言開關: 鎖住後前台不能留言, 解鎖後可以', async () => {
  const db = makeD1();
  const put = locked => run(adminLocks.onRequestPut, ctxOf(db, 'PUT', '/api/admin/locks', { game: 'ghost-echo', locked }));
  assert.equal((await put(true)).status, 200);
  const list = await run(adminLocks.onRequestGet, ctxOf(db, 'GET', '/api/admin/locks'));
  assert.deepEqual(list.body, { 'bubble-catcher': false, 'slime-tetris': false, 'dungeon-zoo': false, 'ghost-echo': true });
  const post = () => run(pub.onRequestPost, ctxOf(db, 'POST', '/api/comments', { game: 'ghost-echo', avatar: 0, body: 'x', token: 't' }));
  assert.equal((await post()).body.error.code, 'locked');
  await put(false);
  assert.equal((await post()).status, 201);
});

test('鎖不存在的遊戲 404', async () => {
  const db = makeD1();
  assert.equal((await run(adminLocks.onRequestPut, ctxOf(db, 'PUT', '/api/admin/locks', { game: 'nope', locked: true }))).status, 404);
});

test('後台會改資料的請求: 非 JSON 或跨站來源一律 403', async () => {
  const next = async () => new Response('ok');
  const env = { ADMIN_DEV_EMAIL: 'd@l' };
  const mk = (method, headers) => ({ request: new Request('http://localhost:8788/api/admin/rounds', { method, headers, body: method === 'GET' ? undefined : '{}' }), env, data: {}, next });
  assert.equal((await guard(mk('POST', { 'Content-Type': 'text/plain' }))).status, 403);
  assert.equal((await guard(mk('POST', { 'Content-Type': 'application/json', Origin: 'https://evil.example' }))).status, 403);
  assert.equal((await guard(mk('POST', { 'Content-Type': 'application/json', 'Sec-Fetch-Site': 'cross-site' }))).status, 403);
  assert.equal(await (await guard(mk('POST', { 'Content-Type': 'application/json', Origin: 'http://localhost:8788' }))).text(), 'ok');
  assert.equal(await (await guard(mk('DELETE', {}))).status, 403, 'DELETE 也要 JSON 標頭');
  assert.equal(await (await guard(mk('GET', {}))).text(), 'ok');
});
