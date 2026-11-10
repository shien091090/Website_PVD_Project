import { json } from '../lib/http.js';
import { current } from '../lib/develop.js';

// 前台: 開發頁目前內容; 後台還沒發布過就回 null, 前台改讀 content/develop.md
export async function onRequestGet(ctx) {
  const c = await current(ctx.env.DB);
  return json({ content: c ? c.content : null });
}
