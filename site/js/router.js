import { GAME_CODES } from './games.js';

// #play, #play/<代號>, #vote, #develop, #game/<代號>, 其他都是首頁
export function parse(hash) {
  const [page, arg] = String(hash || '').replace(/^#/, '').split('/');
  const known = GAME_CODES.includes(arg) ? arg : null;
  if (page === 'play') return { page, arg: known };
  if (page === 'vote' || page === 'develop') return { page, arg: null };
  if (page === 'game' && known) return { page, arg: known };
  return { page: 'home', arg: null };
}
