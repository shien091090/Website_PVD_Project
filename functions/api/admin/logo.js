import { json, readJson, nowOf } from '../../lib/http.js';
import { saveLogo, MAX_LOGO } from '../../lib/logo.js';

// 後台: 上傳工作室 LOGO(JSON 內帶 base64), 回傳存放位置; 要按「發布」才會出現在開發頁
export async function onRequestPost(ctx) {
  const body = await readJson(ctx.request, Math.ceil(MAX_LOGO * 4 / 3) + 1024);
  return json({ logo: await saveLogo(ctx.env.FILES, body, nowOf(ctx)) }, 201);
}
