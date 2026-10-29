import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseDevelop } from '../../site/js/markdown.js';

const SRC = `---
更新日期: 2026/10/20
標題: 開工了
工作室: 梅拉利卡工作室
工作室英文: Meraklika
工作室簡介: 四個人的團隊
LOGO:
連結:
- Threads | https://www.threads.net/@x
- Discord | https://discord.gg/y
---

## 目前開發狀況
第一段<script>alert(1)</script>
第一段第二行

第二段 [壞](javascript:alert(1)) [好](https://a.b/c)

## 近期開發目標
**11 月：**完成前三章
`;

test('讀出 front matter', () => {
  const { meta } = parseDevelop(SRC);
  assert.equal(meta['更新日期'], '2026/10/20');
  assert.equal(meta['工作室英文'], 'Meraklika');
  assert.equal(meta.LOGO, '');
  assert.deepEqual(meta['連結'], [{ label: 'Threads', url: 'https://www.threads.net/@x' }, { label: 'Discord', url: 'https://discord.gg/y' }]);
});
test('## 分段, 空行分段落, 單行換行轉 br', () => {
  const { sections } = parseDevelop(SRC);
  assert.deepEqual(sections.map(s => s.title), ['目前開發狀況', '近期開發目標']);
  assert.equal(sections[0].html.split('<p>').length - 1, 2);
  assert.match(sections[0].html, /第一段.*<br>第一段第二行/);
});
test('HTML 被跳脫', () => {
  const { sections } = parseDevelop(SRC);
  assert.ok(!sections[0].html.includes('<script>'));
  assert.ok(sections[0].html.includes('&lt;script&gt;'));
});
test('只允許 http/https 連結', () => {
  const h = parseDevelop(SRC).sections[0].html;
  assert.ok(!/href="javascript/.test(h));
  assert.match(h, /<a href="https:\/\/a\.b\/c" target="_blank" rel="noopener">好<\/a>/);
});
test('粗體', () => {
  assert.match(parseDevelop(SRC).sections[1].html, /<b>11 月：<\/b>完成前三章/);
});
test('沒有 front matter 也能解析', () => {
  const r = parseDevelop('## A\nx');
  assert.deepEqual(r.meta, {});
  assert.equal(r.sections[0].title, 'A');
});
