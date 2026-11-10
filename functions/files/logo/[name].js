import { LOGO_KEY } from '../../lib/develop.js';

// 工作室 LOGO(存在 R2): 檔名每次上傳都不同, 可以長期快取; SVG 一律禁止執行腳本
export async function onRequestGet({ params, env }) {
  const key = `logo/${params.name}`;
  if (!LOGO_KEY.test(key) || !env.FILES) return new Response('Not found', { status: 404 });
  const obj = await env.FILES.get(key);
  if (!obj) return new Response('Not found', { status: 404 });
  return new Response(obj.body, {
    headers: {
      'Content-Type': obj.httpMetadata?.contentType || 'application/octet-stream',
      'Cache-Control': 'public, max-age=31536000, immutable',
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; sandbox",
    },
  });
}
