import { findLink, linkCookie } from '../lib/links.js';

// 社群貼文短連結: 查到就帶著來源 cookie 跳到導連頁, 查不到就回首頁; 網址列不會出現任何參數
export async function onRequestGet(ctx) {
  const origin = new URL(ctx.request.url).origin;
  let link = null;
  try { link = await findLink(ctx.env.DB, ctx.params.code); } catch (e) { console.error(e); }
  const headers = new Headers({ Location: origin + '/' + (link?.page ? '#' + link.page : ''), 'Cache-Control': 'no-store' });
  if (link) headers.append('Set-Cookie', linkCookie(link));
  return new Response(null, { status: 302, headers });
}
