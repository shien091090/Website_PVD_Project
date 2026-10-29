import { json, readJson, HttpError, nowOf } from '../../lib/http.js';
import { allRounds, phaseOf } from '../../lib/rounds.js';
import { tally, topGames } from '../../lib/votes.js';

// 後台: 所有輪次與即時票數(只有後台看得到)
export async function onRequestGet(ctx) {
  const db = ctx.env.DB, now = nowOf(ctx);
  const rounds = [];
  for (const r of await allRounds(db)) {
    const { counts, total } = await tally(db, r.id);
    rounds.push({ ...r, phase: r.startsAt > now ? 'upcoming' : phaseOf(r, now), counts, total, tie: topGames(counts).length !== 1 });
  }
  return json({ now, rounds });
}

function times(body) {
  const startsAt = Number(body.startsAt), endsAt = Number(body.endsAt);
  if (!Number.isFinite(startsAt) || !Number.isFinite(endsAt) || endsAt <= startsAt) throw new HttpError(400, 'bad_times');
  return { startsAt, endsAt };
}

export async function onRequestPost(ctx) {
  const { startsAt, endsAt } = times(await readJson(ctx.request));
  const r = await ctx.env.DB.prepare('INSERT INTO rounds (starts_at, ends_at) VALUES (?, ?)').bind(startsAt, endsAt).run();
  return json({ id: r.meta.last_row_id, startsAt, endsAt }, 201);
}

export async function onRequestPut(ctx) {
  const body = await readJson(ctx.request);
  const { startsAt, endsAt } = times(body);
  const r = await ctx.env.DB.prepare('UPDATE rounds SET starts_at = ?, ends_at = ? WHERE id = ?').bind(startsAt, endsAt, Number(body.id)).run();
  if (!r.meta.changes) throw new HttpError(404, 'not_found');
  return json({ id: Number(body.id), startsAt, endsAt });
}
