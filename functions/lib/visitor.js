// 訪客編號: 伺服器設定的 HttpOnly cookie(避開 iOS Safari 7 天清除本機資料)
const NAME = 'pvd_vid';
const VALID = /^[A-Za-z0-9_-]{22}$/;

export function getVisitor(request) {
  const m = (request.headers.get('cookie') || '').match(/(?:^|;\s*)pvd_vid=([^;]*)/);
  if (m && VALID.test(m[1])) return { vid: m[1], isNew: false };
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  const vid = btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return { vid, isNew: true };
}

export const visitorCookie = vid => `${NAME}=${vid}; Max-Age=31536000; Path=/; HttpOnly; Secure; SameSite=Lax`;

export async function ipHash(request, salt) {
  const ip = request.headers.get('CF-Connecting-IP') || '0.0.0.0';
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(salt + '|' + ip));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 32);
}
