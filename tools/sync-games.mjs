// 把遊戲資料夾複製到 site/games/<代號>/。用法: npm run sync-games [-- <代號>]
import { cpSync, rmSync, statSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const SRC = {
  'bubble-catcher': 'E:/Project/Game/WebGame_BubbleCatcher/game',
  'slime-tetris': 'E:/Project/Game/WebGame_SlimeTetris/game',
  'dungeon-zoo': 'E:/Project/Game/WebGame_DungeonZoo/polish/game/game',
  'ghost-echo': 'E:/Project/Game/WebGame_GhostEchoV2/polish/game/game',
};
const LIMIT = 25 * 1024 * 1024; // Cloudflare Pages 單檔上限

const big = [];
const walk = d => readdirSync(d, { withFileTypes: true }).forEach(e => {
  const p = join(d, e.name);
  if (e.isDirectory()) walk(p); else if (statSync(p).size > LIMIT) big.push(p);
});

const only = process.argv[2];
const codes = only ? [only] : Object.keys(SRC);
for (const code of codes) {
  const src = SRC[code];
  if (!src) { console.error(`沒有這個遊戲代號: ${code}`); process.exit(1); }
  if (!existsSync(join(src, 'index.html'))) { console.error(`${src} 裡沒有 index.html`); process.exit(1); }
  walk(src);
}
if (big.length) { console.error('以下檔案超過 25MB, Cloudflare Pages 放不下:\n' + big.join('\n')); process.exit(1); }
for (const code of codes) {
  const dst = `site/games/${code}`;
  rmSync(dst, { recursive: true, force: true });
  cpSync(SRC[code], dst, { recursive: true });
  console.log(`${code} ← ${SRC[code]}`);
}
