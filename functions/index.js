import { currentRound } from './lib/rounds.js';
import { nowOf } from './lib/http.js';

// 首頁: 社群平台抓連結預覽時讀 OG 標籤。網址改成目前這個網域(測試網址就指向測試網址),
// 目前這輪有上傳分享圖就換成它, 沒有就用整站預設圖
export const DEFAULT_SHARE = 'media/og/share-default-v1.png';

export function withShare(html, origin, shareImage) {
  const img = shareImage ? `${origin}/files/${shareImage}` : `${origin}/${DEFAULT_SHARE}`;
  let out = html
    .replace(/(<meta (?:property="og:image"|name="twitter:image") content=")[^"]*"/g, `$1${img}"`)
    .replace(/(<meta property="og:url" content=")[^"]*"/, `$1${origin}/"`);
  // 後台上傳的圖尺寸不一定是 1200×630, 不寫死尺寸讓平台自己量
  if (shareImage) out = out.replace(/\s*<meta property="og:image:(?:width|height)" content="\d+">/g, '');
  return out;
}

export async function onRequestGet(ctx) {
  // 不讓瀏覽器拿舊版快取比對: 靜態檔沒變, 但分享圖可能換了
  const req = new Request(ctx.request);
  req.headers.delete('If-None-Match');
  req.headers.delete('If-Modified-Since');
  const res = await ctx.next(req);
  if (!res.ok || !(res.headers.get('Content-Type') || '').includes('text/html')) return res;
  let shareImage = '';
  try { shareImage = (await currentRound(ctx.env.DB, nowOf(ctx)))?.shareImage || ''; } catch (e) { console.error(e); }
  const headers = new Headers(res.headers);
  headers.delete('ETag'); headers.delete('Content-Length');
  headers.set('Cache-Control', 'no-cache');
  return new Response(withShare(await res.text(), new URL(ctx.request.url).origin, shareImage), { status: res.status, headers });
}
