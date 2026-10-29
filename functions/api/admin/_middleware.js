import { verifyAccess } from '../../lib/access.js';
import { fail } from '../../lib/http.js';

// 後台: 先驗 Access 登入; 會改資料的請求另外擋跨站偽造(要 JSON 標頭、來源必須同站)
export async function onRequest(ctx) {
  const { request } = ctx;
  const email = await verifyAccess(request, ctx.env);
  if (!email) return fail(401, 'unauthorized');
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    const origin = request.headers.get('Origin');
    const site = request.headers.get('Sec-Fetch-Site');
    if (!(request.headers.get('Content-Type') || '').startsWith('application/json')) return fail(403, 'bad_request');
    if (origin && origin !== new URL(request.url).origin) return fail(403, 'cross_site');
    if (site && site !== 'same-origin') return fail(403, 'cross_site');
  }
  ctx.data.admin = email;
  return ctx.next();
}
