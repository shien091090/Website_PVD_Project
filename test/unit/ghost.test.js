import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isGhost } from '../../site/js/ghost.js';
import { onRequestGet, ghostCookie } from '../../functions/ghost.js';

test('有透明標記才算透明模式', () => {
  assert.equal(isGhost({ cookie: 'a=1; pvd_ghost=1' }), true);
  assert.equal(isGhost({ cookie: 'pvd_ghost=1' }), true);
  assert.equal(isGhost({ cookie: 'pvd_ghost=; x=1' }), false);
  assert.equal(isGhost({ cookie: 'xpvd_ghost=1' }), false);
  assert.equal(isGhost({ cookie: '' }), false);
});

test('透明人連結放一年的標記並回首頁, 加 off 就取消', () => {
  const on = onRequestGet({ request: new Request('https://x.dev/ghost') });
  assert.equal(on.status, 302);
  assert.equal(on.headers.get('Location'), 'https://x.dev/');
  assert.equal(on.headers.get('Set-Cookie'), ghostCookie(true));
  assert.match(ghostCookie(true), /^pvd_ghost=1; Max-Age=31536000; Path=\//);
  const off = onRequestGet({ request: new Request('https://x.dev/ghost?off') });
  assert.match(off.headers.get('Set-Cookie'), /^pvd_ghost=; Max-Age=0/);
});
