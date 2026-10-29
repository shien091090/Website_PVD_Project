import { json, readJson, HttpError } from '../../lib/http.js';
import { lockedGames } from '../../lib/comments.js';
import { GAME_CODES } from '../../../site/js/games.js';

export async function onRequestGet(ctx) {
  const locked = await lockedGames(ctx.env.DB);
  return json(Object.fromEntries(GAME_CODES.map(c => [c, locked.includes(c)])));
}

export async function onRequestPut(ctx) {
  const { game, locked } = await readJson(ctx.request);
  if (!GAME_CODES.includes(game)) throw new HttpError(404, 'unknown_game');
  await ctx.env.DB.prepare('INSERT INTO locks (game, locked) VALUES (?, ?) ON CONFLICT(game) DO UPDATE SET locked = excluded.locked')
    .bind(game, locked ? 1 : 0).run();
  return json({ game, locked: !!locked });
}
