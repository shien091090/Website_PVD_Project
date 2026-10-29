import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getVisitor, visitorCookie, ipHash } from '../../functions/lib/visitor.js';

const req = (headers = {}) => new Request('https://x.test/api/state', { headers });

test('沒有 cookie 就產生新的 22 字訪客編號', () => {
  const v = getVisitor(req());
  assert.equal(v.isNew, true);
  assert.match(v.vid, /^[A-Za-z0-9_-]{22}$/);
});
test('合法 cookie 沿用', () => {
  const v = getVisitor(req({ cookie: 'a=1; pvd_vid=abcdefghijklmnopqrstuv; b=2' }));
  assert.deepEqual(v, { vid: 'abcdefghijklmnopqrstuv', isNew: false });
});
test('格式不對的 cookie 換新的', () => {
  const v = getVisitor(req({ cookie: 'pvd_vid=bad<>' }));
  assert.equal(v.isNew, true);
});
test('cookie 屬性', () => {
  const c = visitorCookie('abcdefghijklmnopqrstuv');
  for (const part of ['pvd_vid=abcdefghijklmnopqrstuv', 'HttpOnly', 'Secure', 'SameSite=Lax', 'Max-Age=31536000', 'Path=/']) assert.ok(c.includes(part), part);
});
test('IP 雜湊: 同 IP 同鹽相同, 換鹽不同', async () => {
  const r = req({ 'CF-Connecting-IP': '1.2.3.4' });
  const a = await ipHash(r, 's1'), b = await ipHash(r, 's1'), c = await ipHash(r, 's2');
  assert.equal(a, b); assert.notEqual(a, c); assert.equal(a.length, 32);
});
