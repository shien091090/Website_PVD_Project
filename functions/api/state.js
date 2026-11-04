import { json, nowOf } from '../lib/http.js';
import { currentRound, nextRound, phaseOf, roundOptions } from '../lib/rounds.js';
import { tally, winnerOf, myVote } from '../lib/votes.js';
import { lockedGames } from '../lib/comments.js';

// 投票狀態。進行中絕不回傳票數; 結束後勝出未定(同票/0 票)也不回傳
export async function onRequestGet(ctx) {
  const db = ctx.env.DB, now = nowOf(ctx);
  const round = await currentRound(db, now);
  const phase = phaseOf(round, now);
  const next = await nextRound(db, now);
  let results = null;
  if (phase === 'ended') {
    const { counts, total } = await tally(db, round.id);
    const winner = winnerOf(counts, round.winner);
    // 同票由後台指定勝出時, 前台公布的票數替勝出款多加 1 票, 免得看起來勝出卻跟第二名同票(資料庫原始票數不動)
    const bonus = winner && round.winner ? 1 : 0;
    results = winner ? { pending: false, winner, counts: { ...counts, [winner]: counts[winner] + bonus }, total: total + bonus } : { pending: true };
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
