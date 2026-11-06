import { parse } from './router.js';
import { renderHeaders } from './shell.js';
import { initHome, fit, open } from './home.js';
import { initPlay, enterPlay, setBoard } from './play.js';
import { initVote, setState, getState, focusVoted, setVoteError } from './vote.js';
import { getJSON, postJSON, turnstileToken } from './api.js';
import { renderDevelop } from './develop.js';
import { initTheme } from './theme.js';
import { initGamePage, enterGame, leaveGame, lapGame } from './gamepage.js';
import { board, initComments } from './comments.js';
import { initAnalytics, track, trackPage, setTheme, initEngage, setSource } from './analytics.js';
import { takeLinkSource } from './link.js';
import * as store from './store.js';

const show = name => { open(null); location.hash = name; };

// 數據: 主題決定後才送第一個頁面瀏覽, 讓每個事件都帶主題分組
let themeReady = false, firstPage = null;
const flag = new Promise(res => initAnalytics({ onFlags: res }));
const linkSrc = takeLinkSource(); // 從社群短連結進站: 來源要排在第一個頁面瀏覽之前
if (linkSrc) setSource(linkSrc);
initTheme(flag, ({ theme, source }) => {
  setTheme(theme, source);
  themeReady = true;
  if (firstPage) trackPage(firstPage);
});
const pageView = page => (themeReady ? trackPage(page) : (firstPage = page));
const engage = initEngage(() => document.body.dataset.pg);

renderHeaders();
initHome({ show, onVideo: what => track(what === 'play' ? 'video_play' : 'video_complete') });
initPlay({ onOpen: game => track('game_detail_open', { game }) });
initGamePage({ onClear: (kind, game, seconds, level) => kind === 'level'
  ? track('level_clear', { game, level, play_seconds: seconds })
  : track('game_clear', { game, play_seconds: seconds }) });
setBoard(board);
initComments({ onPosted: game => track('comment_post', { game }) });
initVote({ onZero: () => loadState(), onPick: pickVote });

// 投票狀態以伺服器為準; 倒數歸零、進投票頁、分頁回到前景都重抓; 失敗每 5 秒重試
let retry = null;
async function loadState() {
  clearTimeout(retry);
  try {
    const s = await getJSON('/api/state');
    setState(sending && s.phase === 'live' ? { ...s, myVote: want, sending: true } : s); // 改投還在送: 畫面維持最後點的那款
  }
  catch { retry = setTimeout(loadState, 5000); }
}
const VOTE_ERR = { turnstile: '驗證沒有通過，請再試一次', ip_limit: '這個網路投票次數太多，請稍後再試' };
// 一次只送一票: 送出中又改點, 等這票回來再送最後點的那款, 慢回來的舊票不會把打勾蓋回去
let sending = false, want = null, saved = null;
async function pickVote(code) {
  setVoteError('');
  if (!sending) saved = getState().myVote || null;
  want = code;
  setState({ ...getState(), myVote: code, sending: !!code || sending, now: undefined });
  if (code) focusVoted();
  if (sending) return;
  sending = true;
  try {
    while (want !== saved) {
      // 取消投票不用防機器人驗證
      const game = want, token = game ? await turnstileToken() : undefined;
      const r = await postJSON('/api/vote', { game, token });
      if (game) track('vote_cast', { game, changed: !!saved }); else track('vote_cancel', { game: saved });
      saved = r.myVote;
    }
  } catch (e) {
    want = saved;
    setState({ ...getState(), myVote: saved, now: undefined });
    if (e.code === 'ended' || e.code === 'no_round') loadState();
    else setVoteError(VOTE_ERR[e.code] || '投票失敗，請稍後再試');
  } finally { sending = false; setState({ ...getState(), sending: false, now: undefined }); }
}
loadState();
document.addEventListener('visibilitychange', () => { if (!document.hidden) loadState(); });

let playing = null, routed = false;
function route() {
  const { page, arg } = parse(location.hash);
  const prev = document.body.dataset.pg;
  if (playing && !(page === 'game' && arg === playing)) {
    track('game_leave', { game: playing, seconds: leaveGame() });
    playing = null;
  }
  if (page === 'game') {
    const played = new Set(store.get('played', []));
    played.add(arg); store.set('played', [...played]);
    document.querySelector('#pg-game .back').href = `#play/${arg}`;
    if (playing !== arg) { enterGame(arg); playing = arg; track('game_start', { game: arg }); }
  }
  if (routed && prev !== page) engage.flush(); // 換頁: 先送上一頁的前景時間, 各頁分開算
  routed = true;
  document.body.dataset.pg = page;
  // 遊玩中鎖住縮放, 手機快速點兩下不會把網頁放大; 其他頁照常可以雙指放大
  document.querySelector('meta[name=viewport]').content = 'width=device-width, initial-scale=1, viewport-fit=cover' + (page === 'game' ? ', maximum-scale=1, user-scalable=no' : '');
  if (page === 'play') { enterPlay(arg, prev === 'game'); if (prev !== 'play') track('play_page_view'); }
  else if (page === 'vote') { setState({ ...getState(), now: undefined }); loadState(); }
  else if (page === 'develop') renderDevelop();
  else fit();
  if (prev !== page) { scrollTo(0, 0); pageView(page); }
}
// 玩到一半關分頁: 用 sendBeacon 送離開事件; 從返回快取回來時重新計時, 之後離開再記一次
addEventListener('pagehide', () => { if (playing) track('game_leave', { game: playing, seconds: lapGame() }, { transport: 'sendBeacon' }); });
addEventListener('pageshow', e => { if (e.persisted) lapGame(); });
addEventListener('hashchange', route);
route();
