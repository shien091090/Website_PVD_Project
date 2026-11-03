import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pickTheme } from '../../site/js/ab.js';

test('測試網址指定的主題最優先', () => {
  assert.deepEqual(pickTheme({ prod: true, forced: 'dark', stored: 'light', flag: 'light', rand: 0 }), { theme: 'dark', source: 'forced' });
});
test('其次用本機存過的分組', () => {
  assert.deepEqual(pickTheme({ prod: true, stored: 'dark', flag: 'light', rand: 0 }), { theme: 'dark', source: 'stored' });
});
test('再來用 PostHog 旗標', () => {
  assert.deepEqual(pickTheme({ prod: true, flag: 'dark', rand: 0 }), { theme: 'dark', source: 'flag' });
});
test('都沒有就各半隨機', () => {
  assert.deepEqual(pickTheme({ prod: true, rand: 0.49 }), { theme: 'light', source: 'random' });
  assert.deepEqual(pickTheme({ prod: true, rand: 0.5 }), { theme: 'dark', source: 'random' });
});
test('不認得的值忽略', () => {
  assert.deepEqual(pickTheme({ prod: true, forced: 'pink', stored: 'x', flag: 'control', rand: 0.9 }), { theme: 'dark', source: 'random' });
});
test('不是正式網址: 不分組, 用測試切換存的主題, 沒有就亮色', () => {
  assert.deepEqual(pickTheme({ prod: false, stored: 'dark', flag: 'light', rand: 0.9 }), { theme: 'dark', source: 'test' });
  assert.deepEqual(pickTheme({ prod: false, flag: 'dark', rand: 0.9 }), { theme: 'light', source: 'test' });
  assert.deepEqual(pickTheme({ prod: false, forced: 'dark', stored: 'light' }), { theme: 'dark', source: 'forced' });
});
