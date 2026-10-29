import { json, readJson, HttpError, nowOf } from '../lib/http.js';
import { cleanBody, listComments, countComments, isLocked, checkRate, addComment } from '../lib/comments.js';
import { verifyTurnstile } from '../lib/turnstile.js';
import { GAME_CODES } from '../../site/js/games.js';

const RATE_MSG = { too_fast: '留言太快了，請等 30 秒再試', hour_limit: '這一小時留言次數已達上限', ip_limit: '這一小時留言次數已達上限' };

function gameOf(code) {
  if (!GAME_CODES.includes(code)) throw new HttpError(404, 'unknown_game');
  return code;
}

export async function onRequestGet(ctx) {
  const db = ctx.env.DB;
  const game = gameOf(new URL(ctx.request.url).searchParams.get('game'));
  const [locked, count, comments] = await Promise.all([isLocked(db, game), countComments(db, game), listComments(db, game)]);
  return json({ game, locked, count, comments });
}

// 檢查順序: 遊戲 → 鎖 → 內容 → 頻率 → Turnstile(最貴的放最後)
export async function onRequestPost(ctx) {
  const db = ctx.env.DB, { vid, ipHash, ip } = ctx.data, now = nowOf(ctx);
  const input = await readJson(ctx.request);
  const game = gameOf(input.game);
  if (await isLocked(db, game)) throw new HttpError(403, 'locked');
  const body = cleanBody(input.body);
  if (!body) throw new HttpError(400, 'bad_body');
  if (!Number.isInteger(input.avatar) || input.avatar < 0 || input.avatar > 7) throw new HttpError(400, 'bad_avatar');
  const limited = await checkRate(db, vid, ipHash, now);
  if (limited) throw new HttpError(429, limited, RATE_MSG[limited]);
  const verify = ctx.data.verify || (t => verifyTurnstile(t, ip, ctx.env.TURNSTILE_SECRET));
  if (!(await verify(input.token))) throw new HttpError(403, 'turnstile');
  const comment = await addComment(db, { game, avatar: input.avatar, body, vid, ipHash, now });
  return json({ comment }, 201);
}
