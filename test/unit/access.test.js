import { test } from 'node:test';
import assert from 'node:assert/strict';
import { verifyAccess, _resetCache } from '../../functions/lib/access.js';

const b64u = buf => Buffer.from(buf).toString('base64url');
const { privateKey, publicKey } = await crypto.subtle.generateKey(
  { name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify']);
const jwk = { ...(await crypto.subtle.exportKey('jwk', publicKey)), kid: 'k1' };
const ENV = { ACCESS_TEAM: 'pvdteam', ACCESS_AUD: 'aud123' };

async function sign(claims, kid = 'k1') {
  const h = b64u(JSON.stringify({ alg: 'RS256', kid, typ: 'JWT' })), p = b64u(JSON.stringify(claims));
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', privateKey, new TextEncoder().encode(`${h}.${p}`));
  return `${h}.${p}.${b64u(sig)}`;
}
const certsFetch = () => { const f = async url => { f.urls.push(url); return new Response(JSON.stringify({ keys: [jwk] })); }; f.urls = []; return f; };
const req = (jwt, host = 'pvd-project.pages.dev') => new Request(`https://${host}/api/admin/locks`, { headers: jwt ? { 'Cf-Access-Jwt-Assertion': jwt } : {} });
const future = () => Math.floor(Date.now() / 1000) + 600;

test('合法 Access JWT 回 email, 金鑰從團隊網址取', async () => {
  _resetCache();
  const f = certsFetch();
  const jwt = await sign({ aud: ['aud123'], email: 'me@x.com', exp: future() });
  assert.equal(await verifyAccess(req(jwt), ENV, f), 'me@x.com');
  assert.equal(f.urls[0], 'https://pvdteam.cloudflareaccess.com/cdn-cgi/access/certs');
});

test('aud 不對、過期、簽章被改、沒帶 JWT 都回 null', async () => {
  _resetCache();
  const f = certsFetch();
  assert.equal(await verifyAccess(req(await sign({ aud: ['other'], email: 'me@x.com', exp: future() })), ENV, f), null);
  assert.equal(await verifyAccess(req(await sign({ aud: ['aud123'], email: 'me@x.com', exp: 1 })), ENV, f), null);
  const good = await sign({ aud: ['aud123'], email: 'me@x.com', exp: future() });
  const [h, , s] = good.split('.');
  const forged = `${h}.${b64u(JSON.stringify({ aud: ['aud123'], email: 'evil@x.com', exp: future() }))}.${s}`;
  assert.equal(await verifyAccess(req(forged), ENV, f), null);
  assert.equal(await verifyAccess(req(null), ENV, f), null);
  assert.equal(await verifyAccess(req('garbage'), ENV, f), null);
});

test('本機開發可用 ADMIN_DEV_EMAIL 略過, 但只限 localhost', async () => {
  _resetCache();
  const env = { ...ENV, ADMIN_DEV_EMAIL: 'dev@local' };
  assert.equal(await verifyAccess(req(null, 'localhost:8788'), env, certsFetch()), 'dev@local');
  assert.equal(await verifyAccess(req(null, '127.0.0.1:8788'), env, certsFetch()), 'dev@local');
  assert.equal(await verifyAccess(req(null), env, certsFetch()), null);
});

test('沒設定 ACCESS_TEAM 時一律拒絕', async () => {
  _resetCache();
  const jwt = await sign({ aud: ['aud123'], email: 'me@x.com', exp: future() });
  assert.equal(await verifyAccess(req(jwt), { ACCESS_AUD: 'aud123' }, certsFetch()), null);
});
