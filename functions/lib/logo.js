import { HttpError } from './http.js';

// 工作室 LOGO: 後台以 base64 上傳, 檢查檔頭確認真的是圖片, 存進 R2(logo/<時間>-<亂數>.<副檔名>); 舊檔留著, 退回舊版時還用得到
export const MAX_LOGO = 1024 * 1024;
const TYPES = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/svg+xml': 'svg' };

function sniff(bytes) {
  const at = (i, ...v) => v.every((b, k) => bytes[i + k] === b);
  if (at(0, 0x89, 0x50, 0x4e, 0x47)) return 'image/png';
  if (at(0, 0xff, 0xd8, 0xff)) return 'image/jpeg';
  if (at(0, 0x52, 0x49, 0x46, 0x46) && at(8, 0x57, 0x45, 0x42, 0x50)) return 'image/webp';
  const head = new TextDecoder().decode(bytes.slice(0, 1024)).replace(/^﻿/, '').trimStart();
  if (/^(<\?xml[^>]*>\s*)?(<!--[\s\S]*?-->\s*)*(<!DOCTYPE svg[^>]*>\s*)?<svg[\s>]/i.test(head)) return 'image/svg+xml';
  return null;
}

export function decodeLogo(input) {
  if (!input || typeof input.data !== 'string' || !TYPES[input.type]) throw new HttpError(400, 'bad_type');
  let bytes;
  try { bytes = Uint8Array.from(atob(input.data), c => c.charCodeAt(0)); } catch { throw new HttpError(400, 'bad_image'); }
  if (!bytes.length) throw new HttpError(400, 'bad_image');
  if (bytes.length > MAX_LOGO) throw new HttpError(400, 'too_large');
  if (sniff(bytes) !== input.type) throw new HttpError(400, 'bad_image');
  return { bytes, type: input.type, ext: TYPES[input.type] };
}

export async function saveLogo(bucket, input, now) {
  if (!bucket) throw new HttpError(503, 'no_storage');
  const { bytes, type, ext } = decodeLogo(input);
  const rand = [...crypto.getRandomValues(new Uint8Array(4))].map(b => b.toString(16).padStart(2, '0')).join('');
  const key = `logo/${now.toString(36)}-${rand}.${ext}`;
  await bucket.put(key, bytes, { httpMetadata: { contentType: type } });
  return key;
}
