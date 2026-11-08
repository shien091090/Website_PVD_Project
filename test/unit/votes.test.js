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
  const round = async (startsAt, endsAt, opts = ['bubble-tempo', 'dungeon-zoo', 'jelly-jinni', 'soul-smith-defense']) => {
    const r = await db.prepare('INSERT INTO rounds (starts_at, ends_at) VALUES (?, ?)').bind(startsAt, endsAt).run();
    for (const [i, id] of opts.entries()) await db.prepare('INSERT INTO round_options VALUES (?, ?, ?, ?)').bind(r.meta.last_row_id, id, id + '名', i).run();
    return r;
  };
  const state = o => call(stateApi.onRequestGet, 'GET', '/api/state', undefined, o);
  const vote = (game, o) => call(voteApi.onRequestPost, 'POST', '/api/vote', { game, token: 't' }, o);
  return { db, call, round, state, vote, set: t => { now = t; } };
}

test('進行中: 狀態不含任何票數, 可改投且只算一票', async () => {
  const s = setup();
  await s.round(T0 - H, T0 + H);
  assert.deepEqual((await s.vote('bubble-tempo')).body, { myVote: 'bubble-tempo', changed: false });
  assert.deepEqual((await s.vote('jelly-jinni')).body, { myVote: 'jelly-jinni', changed: true });
  const st = await s.state();
  assert.equal(st.body.phase, 'live');
  assert.equal(st.body.myVote, 'jelly-jinni');
  assert.equal(st.body.results, null);
  assert.ok(!/counts|total|votes/.test(st.text), st.text);
  const admin = await s.call(roundsApi.onRequestGet, 'GET', '/api/admin/rounds');
  assert.deepEqual(admin.body.rounds[0].counts, { 'bubble-tempo': 0, 'dungeon-zoo': 0, 'jelly-jinni': 1, 'soul-smith-defense': 0 });
});

test('取消投票: 刪掉自己這一輪的票, 可以再投; 截止後不能取消', async () => {
  const s = setup();
  await s.round(T0 - H, T0 + H);
  await s.vote('jelly-jinni'); await s.vote('jelly-jinni', { vid: 'v2' });
  assert.deepEqual((await s.vote(null)).body, { myVote: null, changed: true });
  assert.deepEqual((await s.vote(null)).body, { myVote: null, changed: false }, '沒票時取消不出錯');
  assert.equal((await s.state()).body.myVote, null);
  const admin = await s.call(roundsApi.onRequestGet, 'GET', '/api/admin/rounds');
  assert.equal(admin.body.rounds[0].counts['jelly-jinni'], 1, '只刪自己的票');
  assert.equal((await s.vote('bubble-tempo')).body.myVote, 'bubble-tempo');
  s.set(T0 + 2 * H);
  assert.equal((await s.vote(null)).body.error.code, 'ended');
});

test('截止後投票 409 ended', async () => {
  const s = setup();
  await s.round(T0 - 2 * H, T0 - H);
  assert.equal((await s.vote('bubble-tempo')).body.error.code, 'ended');
});

test('沒有任何輪次: phase none, 投票 409 no_round', async () => {
  const s = setup();
  assert.equal((await s.state()).body.phase, 'none');
  assert.equal((await s.vote('bubble-tempo')).body.error.code, 'no_round');
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
  await s.vote('bubble-tempo', { vid: 'a' }); await s.vote('bubble-tempo', { vid: 'b' });
  await s.vote('jelly-jinni', { vid: 'c' }); await s.vote('jelly-jinni', { vid: 'd' });
  s.set(T0 + 2 * H);
  assert.deepEqual((await s.state()).body.results, { pending: true });
  const rounds = await s.call(roundsApi.onRequestGet, 'GET', '/api/admin/rounds');
  assert.equal(rounds.body.rounds[0].tie, true);
  assert.equal((await s.call(winnerApi.onRequestPut, 'PUT', '/api/admin/winner', { roundId: 1, game: 'jelly-jinni' })).status, 200);
  const r = (await s.state()).body.results;
  assert.equal(r.pending, false);
  assert.equal(r.winner, 'jelly-jinni');
  assert.equal(r.total, 5); // 後台指定勝出款前台多加 1 票
  assert.equal(r.counts['jelly-jinni'], 3);
  assert.equal(r.counts['bubble-tempo'], 2);
  assert.equal((await s.call(roundsApi.onRequestGet, 'GET', '/api/admin/rounds')).body.rounds[0].counts['jelly-jinni'], 2); // 後台仍是原始票數
});

test('唯一最高票直接勝出; 非同票不能指定', async () => {
  const s = setup();
  await s.round(T0 - H, T0 + H);
  await s.vote('dungeon-zoo', { vid: 'a' }); await s.vote('dungeon-zoo', { vid: 'b' }); await s.vote('jelly-jinni', { vid: 'c' });
  s.set(T0 + 2 * H);
  assert.equal((await s.state()).body.results.winner, 'dungeon-zoo');
  assert.equal((await s.call(winnerApi.onRequestPut, 'PUT', '/api/admin/winner', { roundId: 1, game: 'jelly-jinni' })).body.error.code, 'not_tie');
});

test('只能指定同票最高的其中一款', async () => {
  const s = setup();
  await s.round(T0 - H, T0 + H);
  await s.vote('dungeon-zoo', { vid: 'a' }); await s.vote('jelly-jinni', { vid: 'b' });
  s.set(T0 + 2 * H);
  assert.equal((await s.call(winnerApi.onRequestPut, 'PUT', '/api/admin/winner', { roundId: 1, game: 'bubble-tempo' })).body.error.code, 'not_top');
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
  await s.db.prepare('INSERT INTO votes VALUES (1, ?, ?, ?, ?, ?)').bind('v1', 'bubble-tempo', 'h', 1, 1).run();
  let st = (await s.state()).body;
  assert.equal(st.phase, 'ended');
  assert.equal(st.round.id, 1);
  assert.equal(st.results.winner, 'bubble-tempo');
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
  for (let i = 0; i < 30; i++) assert.equal((await s.vote('bubble-tempo', { vid: 'n' + i, ipHash: 'same' })).status, 200);
  assert.equal((await s.vote('bubble-tempo', { vid: 'n30', ipHash: 'same' })).body.error.code, 'ip_limit');
  assert.equal((await s.vote('jelly-jinni', { vid: 'n0', ipHash: 'same' })).status, 200, '已投過的人改投不受限');
});

test('後台新增與修改輪次, 結束時間要晚於開始', async () => {
  const s = setup();
  assert.equal((await s.call(roundsApi.onRequestPost, 'POST', '/api/admin/rounds', { startsAt: T0, endsAt: T0 - 1 })).status, 400);
  const ALL = ['bubble-tempo', 'jelly-jinni', 'soul-smith-defense'];
  // 暫時下架的遊戲不能當候選
  assert.equal((await s.call(roundsApi.onRequestPost, 'POST', '/api/admin/rounds', { startsAt: T0 - H, endsAt: T0 + H, options: ['bubble-tempo', 'dungeon-zoo'] })).body.error.code, 'unknown_option');
  assert.equal((await s.call(roundsApi.onRequestPost, 'POST', '/api/admin/rounds', { startsAt: T0 - H, endsAt: T0 + H })).body.error.code, 'too_few_options');
  assert.equal((await s.call(roundsApi.onRequestPost, 'POST', '/api/admin/rounds', { startsAt: T0 - H, endsAt: T0 + H, options: ['bubble-tempo', 'nope'] })).body.error.code, 'unknown_option');
  assert.equal((await s.call(roundsApi.onRequestPost, 'POST', '/api/admin/rounds', { startsAt: T0 - H, endsAt: T0 + H, options: ALL })).status, 201);
  assert.deepEqual((await s.state()).body.round.options.map(o => o.id), ALL);
  assert.equal((await s.call(roundsApi.onRequestPut, 'PUT', '/api/admin/rounds', { id: 1, startsAt: T0 - H, endsAt: T0 + 9 * H })).status, 200);
  assert.equal((await s.state()).body.round.endsAt, T0 + 9 * H);
  assert.equal((await s.call(roundsApi.onRequestPut, 'PUT', '/api/admin/rounds', { id: 9, startsAt: T0, endsAt: T0 + H })).status, 404);
});

test('後台刪除輪次連同票一起刪, 前台回到上一輪或沒有輪次', async () => {
  const s = setup();
  await s.round(T0 - 3 * H, T0 - 2 * H);
  await s.round(T0 - H, T0 - 1);
  await s.db.prepare('INSERT INTO votes VALUES (2, ?, ?, ?, ?, ?)').bind('v1', 'bubble-tempo', 'h', 1, 1).run();
  assert.equal((await s.call(roundsApi.onRequestDelete, 'DELETE', '/api/admin/rounds?id=2')).status, 200);
  assert.equal(await s.db.prepare('SELECT COUNT(*) AS n FROM votes WHERE round_id = 2').first('n'), 0);
  assert.equal((await s.state()).body.round.id, 1);
  assert.equal((await s.call(roundsApi.onRequestDelete, 'DELETE', '/api/admin/rounds?id=2')).status, 404);
});

test('每一輪有自己的候選: 第二輪只能投新候選, 第一輪結果與名稱照樣保留', async () => {
  const s = setup();
  await s.round(T0 - 3 * H, T0 - 2 * H, ['jelly-jinni', 'dungeon-zoo']);
  await s.db.prepare('INSERT INTO votes VALUES (1, ?, ?, ?, ?, ?)').bind('v1', 'jelly-jinni', 'h', 1, 1).run();
  await s.db.prepare("UPDATE round_options SET option_id = 'old-game', label = '已下架的遊戲' WHERE round_id = 1 AND option_id = 'dungeon-zoo'").run();
  await s.round(T0 - H, T0 + H, ['jelly-jinni', 'bubble-tempo']);
  assert.equal((await s.vote('soul-smith-defense')).body.error.code, 'unknown_game');
  assert.equal((await s.vote('jelly-jinni')).status, 200); // 冠軍第二輪從 0 票重新來
  const st = (await s.state()).body;
  assert.deepEqual(st.round.options.map(o => o.id), ['jelly-jinni', 'bubble-tempo']);
  const rounds = (await s.call(roundsApi.onRequestGet, 'GET', '/api/admin/rounds')).body.rounds;
  const r1 = rounds.find(r => r.id === 1), r2 = rounds.find(r => r.id === 2);
  assert.deepEqual(r1.counts, { 'jelly-jinni': 1, 'old-game': 0 });
  assert.equal(r1.options.find(o => o.id === 'old-game').label, '已下架的遊戲');
  assert.deepEqual(r2.counts, { 'jelly-jinni': 1, 'bubble-tempo': 0 });
  assert.equal((await s.call(roundsApi.onRequestDelete, 'DELETE', '/api/admin/rounds?id=2')).status, 200);
  assert.equal(await s.db.prepare('SELECT COUNT(*) AS n FROM round_options WHERE round_id = 2').first('n'), 0);
});

test('資料庫升級時, 既有輪次自動補上第一波 4 款候選', async () => {
  const { DatabaseSync } = await import('node:sqlite');
  const { readFileSync } = await import('node:fs');
  const db = new DatabaseSync(':memory:');
  for (const f of ['0001_init.sql', '0002_links.sql']) db.exec(readFileSync(new URL('../../migrations/' + f, import.meta.url), 'utf8'));
  db.exec('INSERT INTO rounds (starts_at, ends_at) VALUES (1, 2)');
  db.exec(readFileSync(new URL('../../migrations/0003_round_options.sql', import.meta.url), 'utf8'));
  assert.deepEqual(db.prepare('SELECT option_id FROM round_options WHERE round_id = 1 ORDER BY sort').all().map(r => r.option_id),
    ['bubble-tempo', 'jelly-jinni', 'soul-smith-defense', 'dungeon-zoo']);
});
