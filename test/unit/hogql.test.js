import { test } from 'node:test';
import assert from 'node:assert/strict';
import { quoteCJK } from '../../tools/hogql.mjs';

test('中文欄位名加雙引號, 單引號字串裡的中文不動', () => {
  assert.equal(quoteCJK("SELECT multiIf(p = 'home', '首頁', p) AS 頁面, count() AS 人數2 FROM e GROUP BY 頁面"),
    `SELECT multiIf(p = 'home', '首頁', p) AS "頁面", count() AS "人數2" FROM e GROUP BY "頁面"`);
});
