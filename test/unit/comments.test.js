import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeD1 } from '../helpers/d1.js';
import { onRequestGet, onRequestPost } from '../../functions/api/comments.js';
import { cleanBody } from '../../functions/lib/comments.js';

const T0 = 1_800_000_000_000;
function setup() {
  const db = makeD1();
  let now = T0, pass = true;
  const call = async (method, { game = 'slime-tetris', body, vid = 'v1', ipHash = 'h1' } = {}) => {
    const url = 'https://x.test/api/comments' + (method === 'GET' ? `?game=${game}` : '');
    const request = new Request(url, { method, body: body === undefined ? undefined : JSON.stringify(body) });
    const ctx = { request, env: { DB: db, TURNSTILE_SECRET: 's' }, data: { vid, ipHash, ip: '1.1.1.1', now: () => now, verify: async () => pass } };
    try {
      const r = await (method === 'GET' ? onRequestGet : onRequestPost)(ctx);
      return { status: r.status, body: await r.json() };
    } catch (e) { return { status: e.status, body: { error: { code: e.code } } }; }
  };
  const post = (text, o = {}) => call('POST', { ...o, body: { game: o.game || 'slime-tetris', avatar: 3, body: text, token: 't' } });
  return { db, call, post, tick: ms => { now += ms; }, setPass: v => { pass = v; } };
}

test('送出後看得到, 新的在最前面, 則數正確', async () => {
  const s = setup();
  assert.equal((await s.post('第一則')).status, 201);
  s.tick(31000);
  await s.post('第二則');
  const r = await s.call('GET');
  assert.equal(r.body.count, 2);
  assert.deepEqual(r.body.comments.map(c => c.body), ['第二則', '第一則']);
  assert.equal(r.body.comments[0].avatar, 3);
  assert.equal(r.body.locked, false);
});

test('HTML 原樣存入(前端負責跳脫)', async () => {
  const s = setup();
  const r = await s.post('<script>x</script>');
  assert.equal(r.body.comment.body, '<script>x</script>');
});

test('空白、超過 120 字被擋; 剛好 120 字可以', async () => {
  const s = setup();
  assert.equal((await s.post('   ')).body.error.code, 'bad_body');
  assert.equal((await s.post('字'.repeat(121))).status, 400);
  assert.equal((await s.post('字'.repeat(120))).status, 201);
});

test('內容清理: 控制字元移除、換行變空白', () => {
  assert.equal(cleanBody(' a\u0000b\nc '), 'ab c');
  assert.equal(cleanBody('😀'.repeat(120)), '😀'.repeat(120));
  assert.equal(cleanBody(42), null);
});

test('頭像要是 0–7', async () => {
  const s = setup();
  const r = await s.call('POST', { body: { game: 'slime-tetris', avatar: 8, body: 'x', token: 't' } });
  assert.equal(r.body.error.code, 'bad_avatar');
});

test('不存在的遊戲 404', async () => {
  const s = setup();
  assert.equal((await s.call('GET', { game: 'nope' })).status, 404);
  assert.equal((await s.post('x', { game: 'nope' })).body.error.code, 'unknown_game');
});

test('30 秒內第二則太快', async () => {
  const s = setup();
  await s.post('a');
  s.tick(10000);
  const r = await s.post('b');
  assert.equal(r.status, 429);
  assert.equal(r.body.error.code, 'too_fast');
});

test('同訪客一小時 20 則上限', async () => {
  const s = setup();
  for (let i = 0; i < 20; i++) { assert.equal((await s.post('m' + i)).status, 201); s.tick(31000); }
  assert.equal((await s.post('m20')).body.error.code, 'hour_limit');
});

test('同 IP 一小時 60 則上限', async () => {
  const s = setup();
  for (let i = 0; i < 60; i++) assert.equal((await s.post('m' + i, { vid: 'v' + i })).status, 201);
  assert.equal((await s.post('x', { vid: 'other' })).body.error.code, 'ip_limit');
});

test('Turnstile 沒過 403', async () => {
  const s = setup();
  s.setPass(false);
  assert.equal((await s.post('x')).body.error.code, 'turnstile');
});

test('鎖住後不能留言, 既有留言照常顯示', async () => {
  const s = setup();
  await s.post('鎖前');
  await s.db.prepare('INSERT INTO locks (game, locked) VALUES (?, 1)').bind('slime-tetris').run();
  s.tick(31000);
  assert.equal((await s.post('鎖後')).body.error.code, 'locked');
  const r = await s.call('GET');
  assert.equal(r.body.locked, true);
  assert.deepEqual(r.body.comments.map(c => c.body), ['鎖前']);
});

test('已刪除的不出現也不算則數', async () => {
  const s = setup();
  await s.post('留著'); s.tick(31000);
  await s.post('刪掉');
  await s.db.prepare("UPDATE comments SET deleted = 1 WHERE body = '刪掉'").run();
  const r = await s.call('GET');
  assert.equal(r.body.count, 1);
  assert.deepEqual(r.body.comments.map(c => c.body), ['留著']);
});

test('回應不帶訪客編號與 IP', async () => {
  const s = setup();
  await s.post('a');
  const r = await s.call('GET');
  assert.deepEqual(Object.keys(r.body.comments[0]).sort(), ['avatar', 'body', 'createdAt', 'id']);
});
