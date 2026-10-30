// 把遊戲複製到 site/games/<代號>/。用法: npm run sync-games [-- <代號>]
// 有發布版的遊戲讀 release/(格式見 docs/遊戲發布格式.md), 會一併換圖示與 games.js 的遊戲資料;
// 還沒有發布版的照舊直接複製遊戲資料夾
import { cpSync, rmSync, statSync, readdirSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { checkRelease, applyInfo } from './release.mjs';

const RELEASE = {
  'dungeon-zoo': 'E:/Project/Game/WebGame_DungeonZoo/release',
};
const SRC = {
  'bubble-catcher': 'E:/Project/Game/WebGame_BubbleCatcher/game',
  'slime-tetris': 'E:/Project/Game/WebGame_SlimeTetris/game',
  'ghost-echo': 'E:/Project/Game/WebGame_GhostEchoV2/polish/game/game',
};
const LIMIT = 25 * 1024 * 1024; // Cloudflare Pages 單檔上限
const GAMES_JS = 'site/js/games.js';

const big = [];
const walk = d => readdirSync(d, { withFileTypes: true }).forEach(e => {
  const p = join(d, e.name);
  if (e.isDirectory()) walk(p); else if (statSync(p).size > LIMIT) big.push(p);
});

const only = process.argv[2];
const codes = only ? [only] : [...Object.keys(RELEASE), ...Object.keys(SRC)];
const infos = {};
for (const code of codes) {
  if (RELEASE[code]) {
    const { errors, info } = checkRelease(RELEASE[code]);
    if (!errors.length && info.code !== code) errors.push(`info.json 的代號是 ${info.code}, 不是 ${code}`);
    if (errors.length) { console.error(`${RELEASE[code]} 不合發布格式:\n- ` + errors.join('\n- ')); process.exit(1); }
    infos[code] = info;
    continue;
  }
  const src = SRC[code];
  if (!src) { console.error(`沒有這個遊戲代號: ${code}`); process.exit(1); }
  if (!existsSync(join(src, 'index.html'))) { console.error(`${src} 裡沒有 index.html`); process.exit(1); }
  walk(src);
}
if (big.length) { console.error('以下檔案超過 25MB, Cloudflare Pages 放不下:\n' + big.join('\n')); process.exit(1); }

let games = readFileSync(GAMES_JS, 'utf8');
for (const code of codes) {
  const dst = `site/games/${code}`;
  const src = RELEASE[code] ? join(RELEASE[code], 'game') : SRC[code];
  rmSync(dst, { recursive: true, force: true });
  cpSync(src, dst, { recursive: true });
  if (infos[code]) {
    mkdirSync('site/media/games', { recursive: true });
    cpSync(join(RELEASE[code], 'assets', 'icon.png'), `site/media/games/${code}.png`);
    games = applyInfo(games, infos[code], `media/games/${code}.png`);
  }
  console.log(`${code} ← ${src}`);
}
writeFileSync(GAMES_JS, games);
