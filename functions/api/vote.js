import { json, readJson, HttpError, nowOf } from '../lib/http.js';
import { currentRound, phaseOf } from '../lib/rounds.js';
import { castVote } from '../lib/votes.js';
import { verifyTurnstile } from '../lib/turnstile.js';
import { GAME_CODES } from '../../site/js/games.js';

export async function onRequestPost(ctx) {
  const db = ctx.env.DB, now = nowOf(ctx), { vid, ipHash, ip } = ctx.data;
  const { game, token } = await readJson(ctx.request);
  const round = await currentRound(db, now);
  const phase = phaseOf(round, now);
  if (phase === 'none') throw new HttpError(409, 'no_round');
  if (phase === 'ended') throw new HttpError(409, 'ended');
  if (!GAME_CODES.includes(game)) throw new HttpError(404, 'unknown_game');
  const verify = ctx.data.verify || (t => verifyTurnstile(t, ip, ctx.env.TURNSTILE_SECRET));
  if (!(await verify(token))) throw new HttpError(403, 'turnstile');
  const { changed } = await castVote(db, { round, vid, ipHash, game, now });
  return json({ myVote: game, changed });
}
