// 透明人連結: 給站長自己用。點過的瀏覽器放一年的標記, 有標記就完全不送 PostHog 數據; /ghost?off 取消
export const GHOST_COOKIE = 'pvd_ghost';
export const ghostCookie = on => `${GHOST_COOKIE}=${on ? '1; Max-Age=31536000' : '; Max-Age=0'}; Path=/; Secure; SameSite=Lax`;

export function onRequestGet(ctx) {
  const url = new URL(ctx.request.url);
  const on = !url.searchParams.has('off');
  return new Response(null, { status: 302, headers: { Location: url.origin + '/', 'Cache-Control': 'no-store', 'Set-Cookie': ghostCookie(on) } });
}
