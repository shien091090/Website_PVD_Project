import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GAMES, byTime } from '../../site/js/games.js';

test('遊戲依時長由短到長排, 下限相同時比上限', () => {
  const g = (code, time) => ({ code, time });
  const list = [g('a', '15–25 分鐘'), g('b', '2–5 分鐘'), g('c', '10–20 分鐘'), g('d', '10–15 分鐘')].sort(byTime);
  assert.deepEqual(list.map(x => x.code), ['b', 'd', 'c', 'a']);
});

test('網站的遊戲清單已依時長排好', () => {
  assert.deepEqual(GAMES.map(x => x.code), [...GAMES].sort(byTime).map(x => x.code));
});
