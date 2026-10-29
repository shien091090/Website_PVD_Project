import { json, readJson, HttpError, nowOf } from '../../lib/http.js';
import { tally, topGames } from '../../lib/votes.js';

// 同票時由後台指定勝出(只能從並列最高票的幾款中選; 0 票時四款都可選)
export async function onRequestPut(ctx) {
  const db = ctx.env.DB, now = nowOf(ctx);
  const { roundId, game } = await readJson(ctx.request);
  const round = await db.prepare('SELECT * FROM rounds WHERE id = ?').bind(Number(roundId)).first();
  if (!round) throw new HttpError(404, 'not_found');
  if (now < round.ends_at) throw new HttpError(409, 'not_ended');
  const { counts } = await tally(db, round.id);
  const top = topGames(counts);
  if (top.length === 1) throw new HttpError(409, 'not_tie');
  if (!(game in counts)) throw new HttpError(404, 'unknown_game');
  if (top.length && !top.includes(game)) throw new HttpError(409, 'not_top');
  await db.prepare('UPDATE rounds SET winner = ? WHERE id = ?').bind(game, round.id).run();
  return json({ roundId: round.id, winner: game });
}
