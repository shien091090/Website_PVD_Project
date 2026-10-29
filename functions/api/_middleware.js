import { getVisitor, visitorCookie, ipHash } from '../lib/visitor.js';
import { HttpError, fail } from '../lib/http.js';

// 所有 /api: 訪客編號與 IP 雜湊放進 context.data; 錯誤一律回 {error:{code,message}}
export async function onRequest(context) {
  const { request, env, data } = context;
  const v = getVisitor(request);
  data.vid = v.vid;
  data.ip = request.headers.get('CF-Connecting-IP') || '';
  data.ipHash = await ipHash(request, env.IP_SALT || '');
  let res;
  try {
    res = await context.next();
  } catch (e) {
    if (e instanceof HttpError) res = fail(e.status, e.code, e.message);
    else { console.error(e); res = fail(500, 'server_error'); }
  }
  res = new Response(res.body, res);
  res.headers.set('Cache-Control', 'no-store');
  if (v.isNew) res.headers.append('Set-Cookie', visitorCookie(v.vid));
  return res;
}
