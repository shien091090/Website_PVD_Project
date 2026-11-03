// 首頁影片: Pages 的靜態檔不理會 Range, 瀏覽器就無法跳到片中某秒(從 0.8 秒接播會先閃上次停下的畫面)。
// 這裡向靜態檔要整個檔案, 依 Range 切出那一段回 206。只管 /media/ 第一層的 mp4, 其他照原樣回。
export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  if (!url.pathname.endsWith('.mp4')) return env.ASSETS.fetch(request);
  const res = await env.ASSETS.fetch(new Request(url, { method: 'GET' }));
  if (!res.ok) return res;
  const buf = await res.arrayBuffer(), size = buf.byteLength;
  const headers = new Headers(res.headers);
  headers.set('Accept-Ranges', 'bytes');
  const m = /^bytes=(\d*)-(\d*)$/.exec(request.headers.get('Range') || '');
  if (!m || (!m[1] && !m[2])) {
    headers.set('Content-Length', String(size));
    return new Response(buf, { status: 200, headers });
  }
  let start, end;
  if (m[1]) { start = +m[1]; end = m[2] ? Math.min(+m[2], size - 1) : size - 1; }
  else { start = Math.max(0, size - +m[2]); end = size - 1; }
  if (start >= size || start > end) {
    headers.set('Content-Range', `bytes */${size}`);
    headers.delete('Content-Length');
    return new Response(null, { status: 416, headers });
  }
  headers.set('Content-Range', `bytes ${start}-${end}/${size}`);
  headers.set('Content-Length', String(end - start + 1));
  return new Response(buf.slice(start, end + 1), { status: 206, headers });
}
