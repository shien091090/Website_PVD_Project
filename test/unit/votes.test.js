import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeD1 } from '../helpers/d1.js';
import * as stateApi from '../../functions/api/state.js';
import * as voteApi from '../../functions/api/vote.js';
import * as roundsApi from '../../functions/api/admin/rounds.js';
import * as winnerApi from '../../functions/api/admin/winner.js';
import { winnerOf } from '../../functions/lib/votes.js';

const H = 3_600_000, T0 = 1_800_000_000_000;
function setup() {
  const db = makeD1();
  let now = T0;
  const call = async (fn, method, path, body, { vid = 'v1', ipHash = 'h1' } = {}) => {
    const ctx = { request: new Request('https://x.test' + path, { method, body: body === undefined ? undefined : JSON.stringify(body) }),
      env: { DB: db }, data: { vid, ipHash, ip: '', now: () => now, verify: async () => true } };
    try { const r = await fn(ctx); const text = await r.text(); return { status: r.status, text, body: JSON.parse(text) }; }
    catch (e) { return { status: e.status, body: { error: { code: e.code } } }; }
  };
  const round = (startsAt, endsAt) => db.prepare('INSERT INTO rounds (starts_at, ends_at) VALUES (?, ?)').bind(startsAt, endsAt).run();
  const state = o => call(stateApi.onRequestGet, 'GET', '/api/state', undefined, o);
  const vote = (game, o) => call(voteApi.onRequestPost, 'POST', '/api/vote', { game, token: 't' }, o);
  return { db, call, round, state, vote, set: t => { now = t; } };
}

test('進行中: 狀態不含任何票數, 可改投且只算一票', async () => {
  const s = setup();
  await s.round(T0 - H, T0 + H);
  assert.deepEqual((await s.vote('slime-tetris')).body, { myVote: 'slime-tetris', changed: false });
  assert.deepEqual((await s.vote('ghost-echo')).body, { myVote: 'ghost-echo', changed: true });
  const st = await s.state();
  assert.equal(st.body.phase, 'live');
  assert.equal(st.body.myVote, 'ghost-echo');
  assert.equal(st.body.results, null);
  assert.ok(!/counts|total|votes/.test(st.text), st.text);
  const admin = await s.call(roundsApi.onRequestGet, 'GET', '/api/admin/rounds');
  assert.deepEqual(admin.body.rounds[0].counts, { 'bubble-catcher': 0, 'slime-tetris': 0, 'dungeon-zoo': 0, 'ghost-echo': 1 });
});

test('截止後投票 409 ended', async () => {
  const s = setup();
  await s.round(T0 - 2 * H, T0 - H);
  assert.equal((await s.vote('slime-tetris')).body.error.code, 'ended');
});

test('沒有任何輪次: phase none, 投票 409 no_round', async () => {
  const s = setup();
  assert.equal((await s.state()).body.phase, 'none');
  assert.equal((await s.vote('slime-tetris')).body.error.code, 'no_round');
});

test('不存在的遊戲 404', async () => {
  const s = setup();
  await s.round(T0 - H, T0 + H);
  assert.equal((await s.vote('nope')).status, 404);
});

test('結束且 0 票: 結果統計中, 不帶票數', async () => {
  const s = setup();
  await s.round(T0 - 2 * H, T0 - H);
  const st = await s.state();
  assert.equal(st.body.phase, 'ended');
  assert.deepEqual(st.body.results, { pending: true });
});

test('同票: 統計中, 後台指定後顯示勝出與票數', async () => {
  const s = setup();
  await s.round(T0 - H, T0 + H);
  await s.vote('slime-tetris', { vid: 'a' }); await s.vote('slime-tetris', { vid: 'b' });
  await s.vote('ghost-echo', { vid: 'c' }); await s.vote('ghost-echo', { vid: 'd' });
  s.set(T0 + 2 * H);
  assert.deepEqual((await s.state()).body.results, { pending: true });
  const rounds = await s.call(roundsApi.onRequestGet, 'GET', '/api/admin/rounds');
  assert.equal(rounds.body.rounds[0].tie, true);
  assert.equal((await s.call(winnerApi.onRequestPut, 'PUT', '/api/admin/winner', { roundId: 1, game: 'ghost-echo' })).status, 200);
  const r = (await s.state()).body.results;
  assert.equal(r.pending, false);
  assert.equal(r.winner, 'ghost-echo');
  assert.equal(r.total, 4);
  assert.equal(r.counts['slime-tetris'], 2);
});

test('唯一最高票直接勝出; 非同票不能指定', async () => {
  const s = setup();
  await s.round(T0 - H, T0 + H);
  await s.vote('dungeon-zoo', { vid: 'a' }); await s.vote('dungeon-zoo', { vid: 'b' }); await s.vote('ghost-echo', { vid: 'c' });
  s.set(T0 + 2 * H);
  assert.equal((await s.state()).body.results.winner, 'dungeon-zoo');
  assert.equal((await s.call(winnerApi.onRequestPut, 'PUT', '/api/admin/winner', { roundId: 1, game: 'ghost-echo' })).body.error.code, 'not_tie');
});

test('只能指定同票最高的其中一款', async () => {
  const s = setup();
  await s.round(T0 - H, T0 + H);
  await s.vote('dungeon-zoo', { vid: 'a' }); await s.vote('ghost-echo', { vid: 'b' });
  s.set(T0 + 2 * H);
  assert.equal((await s.call(winnerApi.onRequestPut, 'PUT', '/api/admin/winner', { roundId: 1, game: 'slime-tetris' })).body.error.code, 'not_top');
});

test('winnerOf 規則', () => {
  assert.equal(winnerOf({ a: 3, b: 1 }, null), 'a');
  assert.equal(winnerOf({ a: 2, b: 2 }, null), null);
  assert.equal(winnerOf({ a: 0, b: 0 }, null), null);
  assert.equal(winnerOf({ a: 2, b: 2 }, 'b'), 'b');
});

test('上一輪結束、下一輪未開始: 顯示上一輪結果與下一輪開始時間; 時間到切成新一輪', async () => {
  const s = setup();
  await s.round(T0 - 3 * H, T0 - H);
  await s.round(T0 + H, T0 + 5 * H);
  await s.db.prepare('INSERT INTO votes VALUES (1, ?, ?, ?, ?, ?)').bind('v1', 'slime-tetris', 'h', 1, 1).run();
  let st = (await s.state()).body;
  assert.equal(st.phase, 'ended');
  assert.equal(st.round.id, 1);
  assert.equal(st.results.winner, 'slime-tetris');
  assert.deepEqual(st.next, { startsAt: T0 + H });
  s.set(T0 + 2 * H);
  st = (await s.state()).body;
  assert.equal(st.phase, 'live');
  assert.equal(st.round.id, 2);
  assert.equal(st.myVote, null);
});

test('同 IP 第 31 個新訪客 429', async () => {
  const s = setup();
  await s.round(T0 - H, T0 + H);
  for (let i = 0; i < 30; i++) assert.equal((await s.vote('slime-tetris', { vid: 'n' + i, ipHash: 'same' })).status, 200);
  assert.equal((await s.vote('slime-tetris', { vid: 'n30', ipHash: 'same' })).body.error.code, 'ip_limit');
  assert.equal((await s.vote('ghost-echo', { vid: 'n0', ipHash: 'same' })).status, 200, '已投過的人改投不受限');
});

test('後台新增與修改輪次, 結束時間要晚於開始', async () => {
  const s = setup();
  assert.equal((await s.call(roundsApi.onRequestPost, 'POST', '/api/admin/rounds', { startsAt: T0, endsAt: T0 - 1 })).status, 400);
  assert.equal((await s.call(roundsApi.onRequestPost, 'POST', '/api/admin/rounds', { startsAt: T0 - H, endsAt: T0 + H })).status, 201);
  assert.equal((await s.call(roundsApi.onRequestPut, 'PUT', '/api/admin/rounds', { id: 1, startsAt: T0 - H, endsAt: T0 + 9 * H })).status, 200);
  assert.equal((await s.state()).body.round.endsAt, T0 + 9 * H);
  assert.equal((await s.call(roundsApi.onRequestPut, 'PUT', '/api/admin/rounds', { id: 9, startsAt: T0, endsAt: T0 + H })).status, 404);
});
