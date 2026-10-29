import { parse } from './router.js';
import { renderHeaders } from './shell.js';
import { initHome, fit, open } from './home.js';
import { initPlay, enterPlay, setBoard } from './play.js';
import { initVote, setState, getState, focusVoted, setVoteError } from './vote.js';
import { getJSON, postJSON, turnstileToken } from './api.js';
import { renderDevelop } from './develop.js';
import { initTheme } from './theme.js';
import { initGamePage, enterGame, leaveGame } from './gamepage.js';
import { board, initComments } from './comments.js';
import * as store from './store.js';

const show = name => { open(null); location.hash = name; };

renderHeaders();
initHome({ show });
initTheme();
initPlay();
initGamePage();
setBoard(board);
initComments();
initVote({ onZero: () => loadState(), onPick: pickVote });

// 投票狀態以伺服器為準; 倒數歸零、進投票頁、分頁回到前景都重抓; 失敗每 5 秒重試
let retry = null;
async function loadState() {
  clearTimeout(retry);
  try { setState(await getJSON('/api/state')); }
  catch { retry = setTimeout(loadState, 5000); }
}
const VOTE_ERR = { turnstile: '驗證沒有通過，請再試一次', ip_limit: '這個網路投票次數太多，請稍後再試' };
async function pickVote(code) {
  const before = getState();
  setVoteError('');
  setState({ ...before, myVote: code, now: undefined });
  focusVoted();
  try {
    const token = await turnstileToken();
    const r = await postJSON('/api/vote', { game: code, token });
    setState({ ...getState(), myVote: r.myVote, now: undefined });
  } catch (e) {
    setState({ ...before, now: undefined });
    if (e.code === 'ended' || e.code === 'no_round') return loadState();
    setVoteError(VOTE_ERR[e.code] || '投票失敗，請稍後再試');
  }
}
loadState();
document.addEventListener('visibilitychange', () => { if (!document.hidden) loadState(); });

function route() {
  const { page, arg } = parse(location.hash);
  const prev = document.body.dataset.pg;
  if (page === 'game') {
    const played = new Set(store.get('played', []));
    played.add(arg); store.set('played', [...played]);
    document.querySelector('#pg-game .back').href = `#play/${arg}`;
    enterGame(arg);
  } else leaveGame();
  document.body.dataset.pg = page;
  if (page === 'play') enterPlay(arg, prev === 'game');
  else if (page === 'vote') { setState({ ...getState(), now: undefined }); loadState(); }
  else if (page === 'develop') renderDevelop();
  else fit();
  if (prev !== page) scrollTo(0, 0);
}
addEventListener('hashchange', route);
route();
