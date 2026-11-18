import { test } from 'node:test';
import assert from 'node:assert/strict';
import { splitCountdown, deadlineLabel, esc } from '../../site/js/format.js';

test('倒數拆成天時分秒', () => {
  assert.deepEqual(splitCountdown(((3 * 24 + 14) * 60 + 22) * 60000 + 9000), { d: 3, h: 14, m: 22, s: 9 });
});
test('倒數負數歸零', () => {
  assert.deepEqual(splitCountdown(-5), { d: 0, h: 0, m: 0, s: 0 });
});
test('截止字樣用台灣時間', () => {
  assert.equal(deadlineLabel(Date.UTC(2026, 10, 8, 12, 0)), '11/8(日) 20:00:00 截止');
  assert.equal(deadlineLabel(Date.UTC(2026, 10, 30, 16, 5)), '12/1(二) 00:05:00 截止');
  assert.equal(deadlineLabel(Date.parse('2026-11-29T23:59:59+08:00')), '11/29(日) 23:59:59 截止');
});
test('跳脫 HTML', () => {
  assert.equal(esc('<a "x">&\''), '&lt;a &quot;x&quot;&gt;&amp;&#39;');
});

test('得票百分比四捨五入成整數且加總剛好 100', async () => {
  const { percents } = await import('../../site/js/format.js');
  assert.deepEqual(percents([58, 41, 27]), [46, 33, 21]);
  assert.deepEqual(percents([1, 1, 1]), [34, 33, 33]);
  assert.deepEqual(percents([2, 1, 0]), [67, 33, 0]);
  assert.deepEqual(percents([0, 0]), [0, 0]);
  for (const n of [[7, 3, 5, 9], [1, 2, 3, 4, 5], [999, 1]]) assert.equal(percents(n).reduce((a, b) => a + b, 0), 100);
});
