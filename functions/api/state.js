import { json, nowOf } from '../lib/http.js';
import { currentRound, nextRound, phaseOf, roundOptions } from '../lib/rounds.js';
import { tally, winnerOf, myVote, percents } from '../lib/votes.js';
import { lockedGames } from '../lib/comments.js';

// 投票狀態。任何時候都不回傳票數, 結束且勝出已定才回傳各款百分比
export async function onRequestGet(ctx) {
  const db = ctx.env.DB, now = nowOf(ctx);
  const round = await currentRound(db, now);
  const phase = phaseOf(round, now);
  const next = await nextRound(db, now);
  let results = null;
  if (phase === 'ended') {
    const { counts } = await tally(db, round.id);
    const winner = winnerOf(counts, round.winner);
    if (winner) {
      // 同票由後台指定勝出時, 公布前替勝出款多算 1 票, 免得看起來勝出卻跟第二名同百分比(資料庫原始票數不動)
      const c = { ...counts, [winner]: counts[winner] + (round.winner ? 1 : 0) };
      const keys = [winner, ...Object.keys(c).filter(k => k !== winner)]; // 勝出款排前面, 分配餘數時優先
      const p = percents(keys.map(k => c[k]));
      results = { pending: false, winner, pct: Object.fromEntries(keys.map((k, i) => [k, p[i]])) };
    } else results = { pending: true };
  }
  return json({
    now, phase,
    round: round && { id: round.id, startsAt: round.startsAt, endsAt: round.endsAt, options: await roundOptions(db, round.id) },
    next: next && { startsAt: next.startsAt },
    myVote: phase === 'live' ? await myVote(db, round.id, ctx.data.vid) : null,
    locks: await lockedGames(db),
    results,
  });
}
