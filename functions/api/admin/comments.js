import { json, HttpError } from '../../lib/http.js';
import { GAME_CODES } from '../../../site/js/games.js';

// 後台: 列出某款全部留言(含已刪除), 軟刪除單則
export async function onRequestGet(ctx) {
  const game = new URL(ctx.request.url).searchParams.get('game');
  if (!GAME_CODES.includes(game)) throw new HttpError(404, 'unknown_game');
  const { results } = await ctx.env.DB.prepare('SELECT id, avatar, body, created_at AS createdAt, deleted FROM comments WHERE game = ? ORDER BY created_at DESC, id DESC LIMIT 1000')
    .bind(game).all();
  return json({ game, comments: results });
}

export async function onRequestDelete(ctx) {
  const id = Number(new URL(ctx.request.url).searchParams.get('id'));
  const r = await ctx.env.DB.prepare('UPDATE comments SET deleted = 1 WHERE id = ?').bind(id).run();
  if (!r.meta.changes) throw new HttpError(404, 'not_found');
  return json({ ok: true });
}
