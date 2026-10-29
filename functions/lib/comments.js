// 匿名留言: 只存頭像編號與內容; 訪客編號與 IP 雜湊只用來限制頻率, 不對外回傳
export const MAX_LEN = 120;

export function cleanBody(text) {
  if (typeof text !== 'string') return null;
  const s = text.replace(/[\r\n\t]+/g, ' ').replace(/[\u0000-\u001f\u007f]/g, '').trim();
  if (!s || [...s].length > MAX_LEN) return null;
  return s;
}

const row = r => ({ id: r.id, avatar: r.avatar, body: r.body, createdAt: r.created_at });

export async function listComments(db, game, limit = 200) {
  const { results } = await db.prepare('SELECT id, avatar, body, created_at FROM comments WHERE game = ? AND deleted = 0 ORDER BY created_at DESC, id DESC LIMIT ?')
    .bind(game, limit).all();
  return results.map(row);
}

export const countComments = (db, game) =>
  db.prepare('SELECT COUNT(*) AS n FROM comments WHERE game = ? AND deleted = 0').bind(game).first('n');

export async function isLocked(db, game) {
  return (await db.prepare('SELECT locked FROM locks WHERE game = ?').bind(game).first('locked')) === 1;
}

export async function lockedGames(db) {
  const { results } = await db.prepare('SELECT game FROM locks WHERE locked = 1').all();
  return results.map(r => r.game);
}

// 頻率限制: 同訪客 30 秒 1 則、1 小時 20 則; 同 IP 1 小時 60 則
export async function checkRate(db, vid, ipHash, now) {
  const q = (col, val, since) => db.prepare(`SELECT COUNT(*) AS n FROM comments WHERE ${col} = ? AND created_at > ?`).bind(val, since).first('n');
  if (await q('vid', vid, now - 30_000) >= 1) return 'too_fast';
  if (await q('vid', vid, now - 3_600_000) >= 20) return 'hour_limit';
  if (await q('ip_hash', ipHash, now - 3_600_000) >= 60) return 'ip_limit';
  return null;
}

export async function addComment(db, { game, avatar, body, vid, ipHash, now }) {
  const r = await db.prepare('INSERT INTO comments (game, avatar, body, vid, ip_hash, created_at) VALUES (?, ?, ?, ?, ?, ?)')
    .bind(game, avatar, body, vid, ipHash, now).run();
  return { id: r.meta.last_row_id, avatar, body, createdAt: now };
}
