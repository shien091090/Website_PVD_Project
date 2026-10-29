import { parse } from './router.js';
import { renderHeaders } from './shell.js';
import { initHome, fit, open } from './home.js';
import { initPlay, enterPlay, setBoard } from './play.js';
import { initVote, setState, getState, focusVoted } from './vote.js';
import { renderDevelop } from './develop.js';
import { initTheme } from './theme.js';
import * as store from './store.js';

const show = name => { open(null); location.hash = name; };

renderHeaders();
initHome({ show });
initTheme();
initPlay();
setBoard({ html: () => '<h3>留言板<small>0 則</small></h3><div class="cms"></div>', mount: () => {} });
initVote({
  onPick: code => { setState({ ...getState(), myVote: code }); focusVoted(); },
});
// 投票 API 接上之前先用示意狀態: 7 天後截止
setState({ phase: 'live', now: Date.now(), round: { id: 1, startsAt: Date.now(), endsAt: Date.now() + 7 * 86400000 }, myVote: null });

function route() {
  const { page, arg } = parse(location.hash);
  const prev = document.body.dataset.pg;
  if (page === 'game') {
    const played = new Set(store.get('played', []));
    played.add(arg); store.set('played', [...played]);
    document.querySelector('#pg-game .back').href = `#play/${arg}`;
  }
  document.body.dataset.pg = page;
  if (page === 'play') enterPlay(arg, prev === 'game');
  else if (page === 'vote') setState(getState());
  else if (page === 'develop') renderDevelop();
  else fit();
  if (prev !== page) scrollTo(0, 0);
}
addEventListener('hashchange', route);
route();
