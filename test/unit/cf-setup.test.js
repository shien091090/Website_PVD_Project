import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

const out = execFileSync(process.execPath, ['tools/cf-setup.mjs', '--dry-run'], { encoding: 'utf8' });

test('設定腳本: 先把資料庫 id 寫進 wrangler.toml 才套資料表', () => {
  assert.ok(out.indexOf('寫入 wrangler.toml') >= 0 && out.indexOf('寫入 wrangler.toml') < out.indexOf('migrations apply'), out);
});
test('設定腳本: 已存在的資源先查再建(可重跑)', () => {
  assert.match(out, /GET .*\/d1\/database\?name=pvd/);
  assert.match(out, /GET .*\/challenges\/widgets/);
  assert.match(out, /GET .*\/access\/apps/);
});
test('設定腳本: 秘密同時設到正式與預覽環境, 後台登入 cookie 為 strict', () => {
  assert.match(out, /PATCH .*\/pages\/projects\/pvd-project .*"production".*"preview"/);
  assert.match(out, /"same_site_cookie_attribute":"strict"/);
});
