import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeD1 } from '../helpers/d1.js';

test('migration 建出四張資料表', async () => {
  const db = makeD1();
  const { results } = await db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
  const names = results.map(r => r.name);
  for (const t of ['rounds', 'votes', 'comments', 'locks']) assert.ok(names.includes(t), t);
});

test('同一輪同一訪客只能有一票', async () => {
  const db = makeD1();
  const ins = () => db.prepare('INSERT INTO votes (round_id, vid, game, ip_hash, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)')
    .bind(1, 'v1', 'slime-tetris', 'h', 1, 1).run();
  await ins();
  await assert.rejects(ins);
});
