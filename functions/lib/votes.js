import { HttpError } from './http.js';
import { GAME_CODES } from '../../site/js/games.js';

// 每輪每訪客一筆, 改投就更新; 新訪客同 IP 每小時最多 30 票
export async function castVote(db, { round, vid, ipHash, game, now }) {
  const prev = await db.prepare('SELECT game FROM votes WHERE round_id = ? AND vid = ?').bind(round.id, vid).first();
  if (prev) {
    await db.prepare('UPDATE votes SET game = ?, updated_at = ? WHERE round_id = ? AND vid = ?').bind(game, now, round.id, vid).run();
    return { changed: prev.game !== game };
  }
  const n = await db.prepare('SELECT COUNT(*) AS n FROM votes WHERE round_id = ? AND ip_hash = ? AND created_at > ?')
    .bind(round.id, ipHash, now - 3_600_000).first('n');
  if (n >= 30) throw new HttpError(429, 'ip_limit');
  await db.prepare('INSERT INTO votes (round_id, vid, game, ip_hash, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)')
    .bind(round.id, vid, game, ipHash, now, now).run();
  return { changed: false };
}

export async function tally(db, roundId) {
  const counts = Object.fromEntries(GAME_CODES.map(c => [c, 0]));
  const { results } = await db.prepare('SELECT game, COUNT(*) AS n FROM votes WHERE round_id = ? GROUP BY game').bind(roundId).all();
  for (const r of results) if (r.game in counts) counts[r.game] = r.n;
  return { counts, total: Object.values(counts).reduce((a, b) => a + b, 0) };
}

export function topGames(counts) {
  const max = Math.max(...Object.values(counts));
  return max > 0 ? Object.keys(counts).filter(k => counts[k] === max) : [];
}

// 後台指定的優先; 否則唯一最高票; 同票或 0 票 → null(結果統計中)
export function winnerOf(counts, adminWinner) {
  if (adminWinner) return adminWinner;
  const top = topGames(counts);
  return top.length === 1 ? top[0] : null;
}

export async function myVote(db, roundId, vid) {
  return (await db.prepare('SELECT game FROM votes WHERE round_id = ? AND vid = ?').bind(roundId, vid).first('game')) || null;
}
