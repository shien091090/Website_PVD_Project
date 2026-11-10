import { json, readJson, nowOf, HttpError } from '../../lib/http.js';
import { current, history, publish, revert } from '../../lib/develop.js';

// 後台: 讀開發頁目前內容與發布紀錄; 發布新內容, 或退回某一版
export async function onRequestGet(ctx) {
  const db = ctx.env.DB;
  return json({ current: await current(db), history: await history(db) });
}

export async function onRequestPost(ctx) {
  const body = await readJson(ctx.request, 64 * 1024);
  const now = nowOf(ctx), by = ctx.data.admin || '';
  if (body.revertTo != null) {
    if (!Number.isInteger(body.revertTo)) throw new HttpError(400, 'bad_id');
    return json(await revert(ctx.env.DB, body.revertTo, now, by), 201);
  }
  return json(await publish(ctx.env.DB, body.content, now, by), 201);
}
