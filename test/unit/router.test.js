import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parse } from '../../site/js/router.js';
import { GAME_CODES } from '../../site/js/games.js';

const [A, B] = GAME_CODES; // 目前上架的前兩款

test('遊玩頁帶遊戲代號', () => assert.deepEqual(parse('#game/' + A), { page: 'game', arg: A }));
test('未知遊戲回首頁', () => assert.deepEqual(parse('#game/nope'), { page: 'home', arg: null }));
test('空 hash 是首頁', () => assert.deepEqual(parse(''), { page: 'home', arg: null }));
test('試玩頁可帶代號', () => assert.deepEqual(parse('#play/' + B), { page: 'play', arg: B }));
test('試玩頁未知代號忽略', () => assert.deepEqual(parse('#play/x'), { page: 'play', arg: null }));
test('投票與開發', () => {
  assert.deepEqual(parse('#vote'), { page: 'vote', arg: null });
  assert.deepEqual(parse('#develop'), { page: 'develop', arg: null });
});
test('未知頁回首頁', () => assert.deepEqual(parse('#about'), { page: 'home', arg: null }));
