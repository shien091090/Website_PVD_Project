import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pickTheme } from '../../site/js/ab.js';

test('測試網址指定的主題最優先', () => {
  assert.deepEqual(pickTheme({ forced: 'dark', stored: 'light', flag: 'light', rand: 0 }), { theme: 'dark', source: 'forced' });
});
test('其次用本機存過的分組', () => {
  assert.deepEqual(pickTheme({ stored: 'dark', flag: 'light', rand: 0 }), { theme: 'dark', source: 'stored' });
});
test('再來用 PostHog 旗標', () => {
  assert.deepEqual(pickTheme({ flag: 'dark', rand: 0 }), { theme: 'dark', source: 'flag' });
});
test('都沒有就各半隨機', () => {
  assert.deepEqual(pickTheme({ rand: 0.49 }), { theme: 'light', source: 'random' });
  assert.deepEqual(pickTheme({ rand: 0.5 }), { theme: 'dark', source: 'random' });
});
test('不認得的值忽略', () => {
  assert.deepEqual(pickTheme({ forced: 'pink', stored: 'x', flag: 'control', rand: 0.9 }), { theme: 'dark', source: 'random' });
});
