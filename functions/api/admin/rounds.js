import { json, readJson, HttpError, nowOf } from '../../lib/http.js';
import { allRounds, phaseOf, roundOptions } from '../../lib/rounds.js';
import { GAMES } from '../../../site/js/games.js';
import { tally, topGames } from '../../lib/votes.js';

// 後台: 所有輪次與即時票數(只有後台看得到)
export async function onRequestGet(ctx) {
  const db = ctx.env.DB, now = nowOf(ctx);
  const rounds = [];
  for (const r of await allRounds(db)) {
    const { counts, total } = await tally(db, r.id);
    rounds.push({ ...r, options: await roundOptions(db, r.id), phase: r.startsAt > now ? 'upcoming' : phaseOf(r, now), counts, total, tie: topGames(counts).length !== 1 });
  }
  return json({ now, rounds });
}

function times(body) {
  const startsAt = Number(body.startsAt), endsAt = Number(body.endsAt);
  if (!Number.isFinite(startsAt) || !Number.isFinite(endsAt) || endsAt <= startsAt) throw new HttpError(400, 'bad_times');
  return { startsAt, endsAt };
}

// 候選: 從網站目前的遊戲中勾選至少 2 款, 名稱存一份當時的
function options(body) {
  const ids = Array.isArray(body.options) ? [...new Set(body.options.map(String))] : [];
  if (ids.length < 2) throw new HttpError(400, 'too_few_options');
  return ids.map(id => {
    const g = GAMES.find(x => x.code === id);
    if (!g) throw new HttpError(400, 'unknown_option');
    return { id, label: g.name };
  });
}

export async function onRequestPost(ctx) {
  const body = await readJson(ctx.request);
  const { startsAt, endsAt } = times(body);
  const opts = options(body);
  const db = ctx.env.DB;
  const r = await db.prepare('INSERT INTO rounds (starts_at, ends_at) VALUES (?, ?)').bind(startsAt, endsAt).run();
  const id = r.meta.last_row_id;
  await db.batch(opts.map((o, i) => db.prepare('INSERT INTO round_options (round_id, option_id, label, sort) VALUES (?, ?, ?, ?)').bind(id, o.id, o.label, i)));
  return json({ id, startsAt, endsAt, options: opts }, 201);
}

export async function onRequestPut(ctx) {
  const body = await readJson(ctx.request);
  const { startsAt, endsAt } = times(body);
  const r = await ctx.env.DB.prepare('UPDATE rounds SET starts_at = ?, ends_at = ? WHERE id = ?').bind(startsAt, endsAt, Number(body.id)).run();
  if (!r.meta.changes) throw new HttpError(404, 'not_found');
  return json({ id: Number(body.id), startsAt, endsAt });
}

// 刪除輪次(連同這輪的票), 例如測完的測試輪
export async function onRequestDelete(ctx) {
  const id = Number(new URL(ctx.request.url).searchParams.get('id'));
  const db = ctx.env.DB;
  const [, , r] = await db.batch([
    db.prepare('DELETE FROM votes WHERE round_id = ?').bind(id),
    db.prepare('DELETE FROM round_options WHERE round_id = ?').bind(id),
    db.prepare('DELETE FROM rounds WHERE id = ?').bind(id),
  ]);
  if (!r.meta.changes) throw new HttpError(404, 'not_found');
  return json({ ok: true });
}
