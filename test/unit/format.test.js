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
  assert.equal(deadlineLabel(Date.UTC(2026, 10, 8, 12, 0)), '11/8(日) 20:00 截止');
  assert.equal(deadlineLabel(Date.UTC(2026, 10, 30, 16, 5)), '12/1(二) 00:05 截止');
});
test('跳脫 HTML', () => {
  assert.equal(esc('<a "x">&\''), '&lt;a &quot;x&quot;&gt;&amp;&#39;');
});
