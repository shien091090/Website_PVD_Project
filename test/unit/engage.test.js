import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Engage } from '../../site/js/analytics.js';

test('前景時間累計, 每次隱藏回報這段與總計', () => {
  const e = new Engage(0);
  assert.deepEqual(e.hidden(10000), { fgMs: 10000, totalFgMs: 10000, interacted: false });
  e.visible(20000);
  assert.deepEqual(e.hidden(25000), { fgMs: 5000, totalFgMs: 15000, interacted: false });
});
test('已經隱藏時重複呼叫不重算', () => {
  const e = new Engage(0);
  e.hidden(1000);
  assert.equal(e.hidden(5000), null);
});
test('有互動就標記', () => {
  const e = new Engage(0);
  e.interact();
  assert.equal(e.hidden(3000).interacted, true);
});
