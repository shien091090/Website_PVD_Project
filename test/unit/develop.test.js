import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { makeD1 } from '../helpers/d1.js';
import * as adminDev from '../../functions/api/admin/develop.js';
import * as adminLogo from '../../functions/api/admin/logo.js';
import * as pubDev from '../../functions/api/develop.js';
import { onRequestGet as serveLogo } from '../../functions/files/logo/[name].js';
import { fromMarkdown, developHtml } from '../../site/js/devcontent.js';

const NOW = Date.parse('2026-11-10T01:00:00+08:00');
const fakeR2 = () => {
  const m = new Map();
  return { m, async put(k, v, o) { m.set(k, { body: v, httpMetadata: o.httpMetadata }); }, async get(k) { return m.get(k) || null; } };
};
const ctxOf = (db, method, path, body, env = {}) => ({
  request: new Request('https://x.test' + path, { method, body: body === undefined ? undefined : JSON.stringify(body) }),
  env: { DB: db, ...env }, data: { now: () => NOW, admin: 'me@x' },
});
const run = async (fn, ctx) => { try { const r = await fn(ctx); return { status: r.status, body: await r.json() }; } catch (e) { return { status: e.status, body: { error: { code: e.code } } }; } };
const CONTENT = {
  title: '第二波開發中', updated: '2026/11/05', autoDate: false,
  sections: [{ title: '近期目標', body: '第一段\n\n第二段 **粗體**' }],
  developer: '時淵', studio: '梅拉利卡工作室', email: 'a@b.co', links: [{ label: 'Threads', url: 'https://threads.com/@x' }], bio: '自介', logo: '',
};
const PNG = Buffer.from('89504e470d0a1a0a0000000d49484452', 'hex').toString('base64');

test('開發頁: 後台還沒發布過時前台拿到 null(改讀舊文字檔)', async () => {
  assert.deepEqual((await run(pubDev.onRequestGet, ctxOf(makeD1(), 'GET', '/api/develop'))).body, { content: null });
});

test('開發頁: 發布後前台拿到新內容, 發布紀錄記下時間與人', async () => {
  const db = makeD1();
  const r = await run(adminDev.onRequestPost, ctxOf(db, 'POST', '/api/admin/develop', { content: CONTENT }));
  assert.equal(r.status, 201);
  assert.deepEqual((await run(pubDev.onRequestGet, ctxOf(db, 'GET', '/api/develop'))).body.content, CONTENT);
  const back = (await run(adminDev.onRequestGet, ctxOf(db, 'GET', '/api/admin/develop'))).body;
  assert.equal(back.current.content.title, '第二波開發中');
  assert.deepEqual(back.history, [{ id: 1, publishedAt: NOW, publishedBy: 'me@x' }]);
});

test('開發頁: 勾自動日期時, 發布當天的台灣日期寫進最後更新', async () => {
  const db = makeD1();
  const r = await run(adminDev.onRequestPost, ctxOf(db, 'POST', '/api/admin/develop', { content: { ...CONTENT, autoDate: true, updated: '舊日期' } }));
  assert.equal(r.body.content.updated, '2026/11/10');
});

test('開發頁: 退回舊版會複製成新的一版, 紀錄保留', async () => {
  const db = makeD1();
  const pub = c => run(adminDev.onRequestPost, ctxOf(db, 'POST', '/api/admin/develop', { content: c }));
  await pub(CONTENT); await pub({ ...CONTENT, title: '第二版' });
  const r = await run(adminDev.onRequestPost, ctxOf(db, 'POST', '/api/admin/develop', { revertTo: 1 }));
  assert.equal(r.status, 201);
  const back = (await run(adminDev.onRequestGet, ctxOf(db, 'GET', '/api/admin/develop'))).body;
  assert.equal(back.current.content.title, '第二波開發中');
  assert.deepEqual(back.history.map(h => h.id), [3, 2, 1]);
  assert.equal((await run(adminDev.onRequestPost, ctxOf(db, 'POST', '/api/admin/develop', { revertTo: 99 }))).status, 404);
});

test('開發頁: 不合規的內容擋下, 空的段落與連結自動略過', async () => {
  const db = makeD1();
  const bad = async (patch, code) => assert.equal((await run(adminDev.onRequestPost, ctxOf(db, 'POST', '/api/admin/develop', { content: { ...CONTENT, ...patch } }))).body.error.code, code, code);
  await bad({ email: 'nope' }, 'bad_email');
  await bad({ links: [{ label: 'x', url: 'javascript:alert(1)' }] }, 'bad_link');
  await bad({ links: [{ label: '', url: 'https://a.b' }] }, 'bad_link');
  await bad({ sections: [{ title: '', body: '沒有標題' }] }, 'bad_section_title');
  await bad({ title: 'x'.repeat(61) }, 'bad_title');
  await bad({ logo: '../../etc/passwd' }, 'bad_logo');
  await bad({ sections: Array(21).fill({ title: 't', body: '' }) }, 'too_many_sections');
  const r = await run(adminDev.onRequestPost, ctxOf(db, 'POST', '/api/admin/develop', { content: { ...CONTENT, sections: [{ title: '', body: '' }, { title: 'a', body: ' b ' }], links: [{ label: '', url: '' }] } }));
  assert.deepEqual(r.body.content.sections, [{ title: 'a', body: 'b' }]);
  assert.deepEqual(r.body.content.links, []);
});

test('LOGO: 上傳存進 R2, 檔名不重複, 取回時帶正確型別與禁止腳本的標頭', async () => {
  const R2 = fakeR2();
  const r = await run(adminLogo.onRequestPost, ctxOf(makeD1(), 'POST', '/api/admin/logo', { type: 'image/png', data: PNG }, { FILES: R2 }));
  assert.equal(r.status, 201);
  assert.match(r.body.logo, /^logo\/[a-z0-9]+-[0-9a-f]{8}\.png$/);
  const res = await serveLogo({ params: { name: r.body.logo.slice(5) }, env: { FILES: R2 } });
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('Content-Type'), 'image/png');
  assert.match(res.headers.get('Content-Security-Policy'), /sandbox/);
  assert.equal((await serveLogo({ params: { name: 'nope.png' }, env: { FILES: R2 } })).status, 404);
});

test('LOGO: 型別不符、不是圖片、超過 1MB、沒設定儲存空間都擋下', async () => {
  const up = (body, env = { FILES: fakeR2() }) => run(adminLogo.onRequestPost, ctxOf(makeD1(), 'POST', '/api/admin/logo', body, env));
  assert.equal((await up({ type: 'image/gif', data: PNG })).body.error.code, 'bad_type');
  assert.equal((await up({ type: 'image/jpeg', data: PNG })).body.error.code, 'bad_image');
  assert.equal((await up({ type: 'image/svg+xml', data: Buffer.from('<html><script>1</script>').toString('base64') })).body.error.code, 'bad_image');
  assert.equal((await up({ type: 'image/svg+xml', data: Buffer.from('<?xml version="1.0"?>\n<svg xmlns="http://www.w3.org/2000/svg"></svg>').toString('base64') })).status, 201);
  const big = Buffer.concat([Buffer.from('89504e47', 'hex'), Buffer.alloc(1024 * 1024)]).toString('base64');
  assert.equal((await up({ type: 'image/png', data: big })).body.error.code, 'too_large');
  assert.equal((await up({ type: 'image/png', data: PNG }, {})).body.error.code, 'no_storage');
});

test('舊文字檔轉成後台格式, 畫面跟以前一樣', () => {
  const c = fromMarkdown(readFileSync('site/content/develop.md', 'utf8'));
  assert.equal(c.title, '準備第二波概念遊戲中');
  assert.equal(c.developer, '時淵');
  assert.equal(c.email, 'meraklika1025@gmail.com');
  assert.match(c.bio, /~~善於自嗨的~~/);
  assert.equal(c.sections.length, 1);
  assert.equal(c.sections[0].title, '近期開發目標');
  assert.doesNotMatch(c.sections[0].body, /<!--/);
  const html = developHtml(c);
  assert.match(html, /<h1>準備第二波概念遊戲中<\/h1>/);
  assert.match(html, /<del>善於自嗨的<\/del>/);
  assert.match(html, /<div class="logo">LOGO<\/div>/);
});

test('畫面: 內容一律跳脫, LOGO 用 R2 位置, 不合規的連結不顯示', () => {
  const html = developHtml({ ...CONTENT, title: '<img src=x>', logo: 'logo/a.png', links: [{ label: 'x', url: 'javascript:1' }] }, '/');
  assert.doesNotMatch(html, /<img src=x>/);
  assert.match(html, /<img class="logo" src="\/files\/logo\/a.png"/);
  assert.doesNotMatch(html, /class="links"/);
  assert.match(html, /<p>第一段<\/p><p>第二段 <b>粗體<\/b><\/p>/);
});
