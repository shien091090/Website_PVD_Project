import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { makeD1 } from '../helpers/d1.js';
import * as share from '../../functions/api/admin/share.js';
import { onRequestGet as serveShare } from '../../functions/files/share/[name].js';
import { withShare, DEFAULT_SHARE } from '../../functions/index.js';
import { currentRound } from '../../functions/lib/rounds.js';

const NOW = Date.parse('2026-11-12T12:00:00+08:00');
const fakeR2 = () => { const m = new Map(); return { m, async put(k, v, o) { m.set(k, { body: v, httpMetadata: o.httpMetadata }); }, async get(k) { return m.get(k) || null; } }; };
const PNG = Buffer.from('89504e470d0a1a0a0000000d49484452', 'hex').toString('base64');
const ctxOf = (db, method, path, body, env = {}) => ({
  request: new Request('https://x.test' + path, { method, body: body === undefined ? undefined : JSON.stringify(body) }),
  env: { DB: db, ...env }, data: { now: () => NOW },
});
const run = async (fn, ctx) => { try { const r = await fn(ctx); return { status: r.status, body: await r.json() }; } catch (e) { return { status: e.status, body: { error: { code: e.code } } }; } };
const withRound = async () => { const db = makeD1(); await db.prepare('INSERT INTO rounds (starts_at, ends_at) VALUES (?, ?)').bind(NOW - 1000, NOW + 1000).run(); return db; };

test('分享圖: 上傳後記在那一輪, 目前這輪讀得到; 改回預設圖就清掉', async () => {
  const db = await withRound(), R2 = fakeR2();
  const r = await run(share.onRequestPost, ctxOf(db, 'POST', '/api/admin/share', { roundId: 1, type: 'image/png', data: PNG }, { FILES: R2 }));
  assert.equal(r.status, 201);
  assert.match(r.body.shareImage, /^share\/[a-z0-9]+-[0-9a-f]{8}\.png$/);
  assert.equal((await currentRound(db, NOW)).shareImage, r.body.shareImage);
  const res = await serveShare({ params: { name: r.body.shareImage.slice(6) }, env: { FILES: R2 } });
  assert.equal(res.headers.get('Content-Type'), 'image/png');
  assert.equal((await run(share.onRequestDelete, ctxOf(db, 'DELETE', '/api/admin/share?roundId=1'))).status, 200);
  assert.equal((await currentRound(db, NOW)).shareImage, '');
});

test('分享圖: 不收 SVG、沒有這一輪、沒設定儲存空間都擋下', async () => {
  const db = await withRound();
  const up = (body, env = { FILES: fakeR2() }) => run(share.onRequestPost, ctxOf(db, 'POST', '/api/admin/share', body, env));
  assert.equal((await up({ roundId: 1, type: 'image/svg+xml', data: Buffer.from('<svg></svg>').toString('base64') })).body.error.code, 'bad_type');
  assert.equal((await up({ roundId: 9, type: 'image/png', data: PNG })).status, 404);
  assert.equal((await up({ roundId: 1, type: 'image/png', data: PNG }, {})).body.error.code, 'no_storage');
  assert.equal((await run(share.onRequestDelete, ctxOf(db, 'DELETE', '/api/admin/share?roundId=9'))).status, 404);
});

test('首頁 OG: 網址換成目前網域; 有分享圖就用它並拿掉寫死的尺寸, 沒有就用預設圖', () => {
  const html = readFileSync('site/index.html', 'utf8');
  const def = withShare(html, 'https://preview.example', '');
  assert.match(def, new RegExp(`<meta property="og:image" content="https://preview.example/${DEFAULT_SHARE}">`));
  assert.match(def, new RegExp(`<meta name="twitter:image" content="https://preview.example/${DEFAULT_SHARE}">`));
  assert.match(def, /<meta property="og:url" content="https:\/\/preview.example\/">/);
  assert.match(def, /og:image:width/);
  const own = withShare(html, 'https://preview.example', 'share/abc-12345678.png');
  assert.match(own, /<meta property="og:image" content="https:\/\/preview.example\/files\/share\/abc-12345678.png">/);
  assert.doesNotMatch(own, /og:image:width|og:image:height/);
  assert.doesNotMatch(own, /pvd-project\.pages\.dev/);
});

test('預設分享圖檔案存在, 尺寸 1200×630', () => {
  const b = readFileSync('site/' + DEFAULT_SHARE);
  assert.equal(b.readUInt32BE(16), 1200);
  assert.equal(b.readUInt32BE(20), 630);
});
