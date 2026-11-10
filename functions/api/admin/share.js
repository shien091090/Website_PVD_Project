import { json, readJson, nowOf, HttpError } from '../../lib/http.js';
import { saveImage, KINDS } from '../../lib/logo.js';

// 後台: 每一輪的分享圖。上傳後立即生效(那一輪是目前這輪時, 首頁的連結預覽就換成它); 刪除 = 改回整站預設圖
async function setShare(db, roundId, key) {
  const r = await db.prepare('UPDATE rounds SET share_image = ? WHERE id = ?').bind(key, roundId).run();
  if (!r.meta.changes) throw new HttpError(404, 'not_found');
}

export async function onRequestPost(ctx) {
  const body = await readJson(ctx.request, Math.ceil(KINDS.share.max * 4 / 3) + 1024);
  const roundId = Number(body.roundId);
  if (!(await ctx.env.DB.prepare('SELECT id FROM rounds WHERE id = ?').bind(roundId).first())) throw new HttpError(404, 'not_found');
  const key = await saveImage(ctx.env.FILES, body, nowOf(ctx), 'share');
  await setShare(ctx.env.DB, roundId, key);
  return json({ roundId, shareImage: key }, 201);
}

export async function onRequestDelete(ctx) {
  const roundId = Number(new URL(ctx.request.url).searchParams.get('roundId'));
  await setShare(ctx.env.DB, roundId, '');
  return json({ roundId, shareImage: '' });
}
