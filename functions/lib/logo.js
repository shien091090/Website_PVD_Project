import { HttpError } from './http.js';
import { LOGO_KEY } from './develop.js';

// 後台上傳的圖片(工作室 LOGO、每輪分享圖): 以 base64 上傳, 檢查檔頭確認真的是圖片, 存進 R2(<種類>/<時間>-<亂數>.<副檔名>);
// 舊檔留著, 退回舊版時還用得到
export const MAX_LOGO = 1024 * 1024;
const ALL = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/svg+xml': 'svg' };
// 分享圖給社群平台抓, 平台大多不吃 SVG
const RASTER = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' };
export const SHARE_KEY = /^share\/[a-z0-9-]{1,40}\.(png|jpg|webp)$/;
export const KINDS = {
  logo: { max: MAX_LOGO, types: ALL, key: LOGO_KEY },
  share: { max: 2 * 1024 * 1024, types: RASTER, key: SHARE_KEY },
};

function sniff(bytes) {
  const at = (i, ...v) => v.every((b, k) => bytes[i + k] === b);
  if (at(0, 0x89, 0x50, 0x4e, 0x47)) return 'image/png';
  if (at(0, 0xff, 0xd8, 0xff)) return 'image/jpeg';
  if (at(0, 0x52, 0x49, 0x46, 0x46) && at(8, 0x57, 0x45, 0x42, 0x50)) return 'image/webp';
  const head = new TextDecoder().decode(bytes.slice(0, 1024)).replace(/^﻿/, '').trimStart();
  if (/^(<\?xml[^>]*>\s*)?(<!--[\s\S]*?-->\s*)*(<!DOCTYPE svg[^>]*>\s*)?<svg[\s>]/i.test(head)) return 'image/svg+xml';
  return null;
}

export function decodeImage(input, kind = 'logo') {
  const k = KINDS[kind];
  if (!input || typeof input.data !== 'string' || !k.types[input.type]) throw new HttpError(400, 'bad_type');
  let bytes;
  try { bytes = Uint8Array.from(atob(input.data), c => c.charCodeAt(0)); } catch { throw new HttpError(400, 'bad_image'); }
  if (!bytes.length) throw new HttpError(400, 'bad_image');
  if (bytes.length > k.max) throw new HttpError(400, 'too_large');
  if (sniff(bytes) !== input.type) throw new HttpError(400, 'bad_image');
  return { bytes, type: input.type, ext: k.types[input.type] };
}

export async function saveImage(bucket, input, now, kind = 'logo') {
  if (!bucket) throw new HttpError(503, 'no_storage');
  const { bytes, type, ext } = decodeImage(input, kind);
  const rand = [...crypto.getRandomValues(new Uint8Array(4))].map(b => b.toString(16).padStart(2, '0')).join('');
  const key = `${kind}/${now.toString(36)}-${rand}.${ext}`;
  await bucket.put(key, bytes, { httpMetadata: { contentType: type } });
  return key;
}

export const decodeLogo = input => decodeImage(input, 'logo');
export const saveLogo = (bucket, input, now) => saveImage(bucket, input, now, 'logo');

// 從 R2 取回: 檔名每次上傳都不同, 可以長期快取; SVG 一律禁止執行腳本
export async function serveImage(env, kind, name) {
  const key = `${kind}/${name}`;
  if (!KINDS[kind].key.test(key) || !env.FILES) return new Response('Not found', { status: 404 });
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
