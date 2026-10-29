// 後台登入: Cloudflare Access 在請求帶 Cf-Access-Jwt-Assertion, 這裡驗 RS256 簽章、aud、到期
// 本機開發(.dev.vars 設 ADMIN_DEV_EMAIL)且網址是 localhost 時直接放行
let certs = null, certsAt = 0, certsTeam = null;
export const _resetCache = () => { certs = null; certsAt = 0; certsTeam = null; };

const b64uDecode = s => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - s.length % 4) % 4)), c => c.charCodeAt(0));
const jsonPart = s => JSON.parse(new TextDecoder().decode(b64uDecode(s)));

async function keysFor(team, fetchFn) {
  if (certs && certsTeam === team && Date.now() - certsAt < 600_000) return certs;
  const r = await fetchFn(`https://${team}.cloudflareaccess.com/cdn-cgi/access/certs`);
  certs = (await r.json()).keys || []; certsAt = Date.now(); certsTeam = team;
  return certs;
}

export async function verifyAccess(request, env, fetchFn = fetch) {
  const host = new URL(request.url).hostname;
  if (env.ADMIN_DEV_EMAIL && (host === 'localhost' || host === '127.0.0.1')) return env.ADMIN_DEV_EMAIL;
  const jwt = request.headers.get('Cf-Access-Jwt-Assertion');
  if (!jwt || !env.ACCESS_TEAM || !env.ACCESS_AUD) return null;
  try {
    const [h, p, s] = jwt.split('.');
    const header = jsonPart(h), claims = jsonPart(p);
    if (header.alg !== 'RS256') return null;
    const jwk = (await keysFor(env.ACCESS_TEAM, fetchFn)).find(k => k.kid === header.kid);
    if (!jwk) return null;
    const key = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
    const ok = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, b64uDecode(s), new TextEncoder().encode(`${h}.${p}`));
    if (!ok) return null;
    const aud = [].concat(claims.aud || []);
    if (!aud.includes(env.ACCESS_AUD)) return null;
    if (!claims.exp || claims.exp * 1000 < Date.now()) return null;
    return claims.email || null;
  } catch { return null; }
}
