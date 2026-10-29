import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parse } from '../../site/js/router.js';

test('遊玩頁帶遊戲代號', () => assert.deepEqual(parse('#game/slime-tetris'), { page: 'game', arg: 'slime-tetris' }));
test('未知遊戲回首頁', () => assert.deepEqual(parse('#game/nope'), { page: 'home', arg: null }));
test('空 hash 是首頁', () => assert.deepEqual(parse(''), { page: 'home', arg: null }));
test('試玩頁可帶代號', () => assert.deepEqual(parse('#play/dungeon-zoo'), { page: 'play', arg: 'dungeon-zoo' }));
test('試玩頁未知代號忽略', () => assert.deepEqual(parse('#play/x'), { page: 'play', arg: null }));
test('投票與開發', () => {
  assert.deepEqual(parse('#vote'), { page: 'vote', arg: null });
  assert.deepEqual(parse('#develop'), { page: 'develop', arg: null });
});
test('未知頁回首頁', () => assert.deepEqual(parse('#about'), { page: 'home', arg: null }));
