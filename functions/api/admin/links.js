import { json, readJson, nowOf } from '../../lib/http.js';
import { createLink, allLinks } from '../../lib/links.js';

// 後台: 產生短連結(同一組參數回傳既有代碼)與列出所有已產生的連結
export async function onRequestGet(ctx) {
  return json({ links: await allLinks(ctx.env.DB) });
}

export async function onRequestPost(ctx) {
  const link = await createLink(ctx.env.DB, await readJson(ctx.request), nowOf(ctx));
  return json(link, link.created ? 201 : 200);
}
