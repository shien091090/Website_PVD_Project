const shape = r => r && { id: r.id, startsAt: r.starts_at, endsAt: r.ends_at, winner: r.winner };

// 目前這輪 = 已開始的輪次中最新的一輪(結束後到下一輪開始前, 仍是它)
export async function currentRound(db, now) {
  return shape(await db.prepare('SELECT * FROM rounds WHERE starts_at <= ? ORDER BY starts_at DESC, id DESC LIMIT 1').bind(now).first());
}
export async function nextRound(db, now) {
  return shape(await db.prepare('SELECT * FROM rounds WHERE starts_at > ? ORDER BY starts_at ASC LIMIT 1').bind(now).first());
}
export const phaseOf = (round, now) => (!round ? 'none' : now < round.endsAt ? 'live' : 'ended');

export async function allRounds(db) {
  const { results } = await db.prepare('SELECT * FROM rounds ORDER BY starts_at DESC, id DESC').all();
  return results.map(shape);
}
