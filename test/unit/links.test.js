import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeD1 } from '../helpers/d1.js';
import * as adminLinks from '../../functions/api/admin/links.js';
import * as short from '../../functions/s/[code].js';
import { takeLinkSource } from '../../site/js/link.js';

const T = 1_800_000_000_000;
const call = async (fn, db, method, path, body, params) => {
  const ctx = { request: new Request('https://pvd.test' + path, { method, body: body === undefined ? undefined : JSON.stringify(body) }), env: { DB: db }, params, data: { now: () => T } };
  try { const r = await fn(ctx); return { status: r.status, res: r, body: r.status === 302 ? null : await r.json() }; }
  catch (e) { return { status: e.status, body: { error: { code: e.code } } }; }
};
const make = (db, b) => call(adminLinks.onRequestPost, db, 'POST', '/api/admin/links', b);

test('產生短連結: 代碼不含參數明碼, 同一組參數沿用同一個代碼', async () => {
  const db = makeD1();
  const a = await make(db, { source: 'threads', campaign: 'pvd-round1', content: 'post-0101', page: 'play' });
  assert.equal(a.status, 201);
  assert.match(a.body.code, /^[A-Za-z0-9]{7}$/);
  assert.ok(!/threads|round|post|play/.test(a.body.code));
  const again = await make(db, { source: 'threads', campaign: 'pvd-round1', content: 'post-0101', page: 'play' });
  assert.equal(again.status, 200);
  assert.equal(again.body.code, a.body.code);
  assert.equal(again.body.created, false);
  const other = await make(db, { source: 'threads', campaign: 'pvd-round1', content: 'post-0101', page: 'vote' });
  assert.notEqual(other.body.code, a.body.code);
  const list = await call(adminLinks.onRequestGet, db, 'GET', '/api/admin/links');
  assert.equal(list.body.links.length, 2);
});

test('產生短連結: 平台必填, 參數只能英文小寫數字連字號, 導連頁要在清單裡', async () => {
  const db = makeD1();
  assert.equal((await make(db, { source: 'Threads!', page: '' })).body.error.code, 'bad_source');
  assert.equal((await make(db, { source: 'fb', campaign: 'a b', page: '' })).body.error.code, 'bad_campaign');
  assert.equal((await make(db, { source: 'fb', page: 'admin' })).body.error.code, 'bad_page');
  assert.equal((await make(db, { source: 'fb', page: '' })).status, 201); // 活動、貼文代號可空
  const none = await make(db, { source: '', campaign: 'pvd-round1', page: 'play' }); // 不指定平台
  assert.equal(none.status, 201);
  assert.equal(none.body.source, '');
});

test('連結備註: 不影響代碼, 同一組參數填新備註會更新, 不填則保留', async () => {
  const db = makeD1();
  const a = await make(db, { source: 'threads', campaign: 'r1', page: '', note: '第一篇' });
  assert.equal(a.body.note, '第一篇');
  const b = await make(db, { source: 'threads', campaign: 'r1', page: '', note: '改過的備註' });
  assert.equal(b.body.code, a.body.code);
  assert.equal(b.body.note, '改過的備註');
  const c = await make(db, { source: 'threads', campaign: 'r1', page: '' });
  assert.equal(c.body.note, '改過的備註');
  const list = await call(adminLinks.onRequestGet, db, 'GET', '/api/admin/links');
  assert.equal(list.body.links.length, 1);
  assert.equal(list.body.links[0].note, '改過的備註');
});

test('打開短連結: 跳到導連頁並放來源 cookie; 查不到就回首頁、不放 cookie', async () => {
  const db = makeD1();
  const { body: l } = await make(db, { source: 'threads', campaign: 'pvd-round1', content: 'post-0101', page: 'play' });
  const hit = await call(short.onRequestGet, db, 'GET', '/s/' + l.code, undefined, { code: l.code });
  assert.equal(hit.status, 302);
  assert.equal(hit.res.headers.get('Location'), 'https://pvd.test/#play');
  const ck = hit.res.headers.get('Set-Cookie');
  assert.match(ck, /^pvd_link=/);
  assert.deepEqual(JSON.parse(decodeURIComponent(ck.split(';')[0].slice('pvd_link='.length))), { c: l.code, s: 'threads', ca: 'pvd-round1', co: 'post-0101' });
  for (const code of ['nope123', '../../x', '']) {
    const miss = await call(short.onRequestGet, db, 'GET', '/s/' + code, undefined, { code });
    assert.equal(miss.res.headers.get('Location'), 'https://pvd.test/');
    assert.equal(miss.res.headers.get('Set-Cookie'), null);
  }
});

test('前台讀來源 cookie: 讀一次就刪, 壞掉的 cookie 不理', () => {
  const doc = { _c: 'a=1; pvd_link=' + encodeURIComponent(JSON.stringify({ c: 'Abc1234', s: 'threads', ca: 'r1', co: '' })), get cookie() { return this._c; }, set cookie(v) { this.set = v; } };
  assert.deepEqual(takeLinkSource(doc), { c: 'Abc1234', s: 'threads', ca: 'r1', co: '' });
  assert.match(doc.set, /^pvd_link=; Max-Age=0/);
  assert.equal(takeLinkSource({ cookie: 'pvd_link=%7Bbad' }), null);
  assert.equal(takeLinkSource({ cookie: 'x=1' }), null);
  assert.deepEqual(takeLinkSource({ cookie: 'pvd_link=' + encodeURIComponent(JSON.stringify({ c: 'Abc1234', s: '', ca: 'r1', co: '' })) }), { c: 'Abc1234', s: '', ca: 'r1', co: '' });
});
