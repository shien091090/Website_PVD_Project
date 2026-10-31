import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { checkRelease, applyInfo } from '../../tools/release.mjs';

const INFO = {
  code: 'dungeon-zoo', name: '來馬戲團看一點大場面', intro: '深入地下城戰鬥、捕捉怪物。', time: '18–30 分鐘',
  mobile: true, color: '#f29cac', textColor: '#2d2144', ratio: '16:9',
};

// 做一個合格的 release 資料夾, edit 可以在檢查前改掉某些檔案
function makeRelease(edit = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'rel-'));
  const files = {
    'game/index.html': '<script src="game.js"></script>',
    'game/game.js': 'let x = 1;',
    'game/audio/credits.md': '# 授權',
    'assets/icon.png': 'png',
    'assets/banner.png': 'png',
    'assets/info.json': JSON.stringify(INFO),
    ...edit,
  };
  for (const [p, body] of Object.entries(files)) {
    if (body == null) continue;
    mkdirSync(join(dir, p, '..'), { recursive: true });
    writeFileSync(join(dir, p), body);
  }
  return dir;
}
const errorsOf = edit => { const d = makeRelease(edit); try { return checkRelease(d).errors; } finally { rmSync(d, { recursive: true }); } };

test('合格的發布資料夾沒有錯誤, 並讀出遊戲資料', () => {
  const d = makeRelease();
  const r = checkRelease(d);
  rmSync(d, { recursive: true });
  assert.deepEqual(r.errors, []);
  assert.equal(r.info.name, INFO.name);
});

test('沒有入口頁要擋', () => {
  assert.match(errorsOf({ 'game/index.html': null }).join('\n'), /index\.html/);
});

test('遊戲資料夾裡有開發文件要擋, 授權來源不擋', () => {
  const e = errorsOf({ 'game/art/style.md': '# 風格' });
  assert.equal(e.length, 1);
  assert.match(e[0], /art[\\/]style\.md/);
});

test('程式裡有下載檔案的寫法要擋', () => {
  assert.match(errorsOf({ 'game/game.js': 'URL.createObjectURL(blob)' }).join('\n'), /game\.js/);
  assert.match(errorsOf({ 'game/game.js': 'a.download = "log.json"' }).join('\n'), /game\.js/);
});

test('沒有圖示、橫幅或遊戲資料要擋', () => {
  assert.match(errorsOf({ 'assets/icon.png': null }).join('\n'), /icon\.png/);
  assert.match(errorsOf({ 'assets/info.json': null }).join('\n'), /info\.json/);
  assert.match(errorsOf({ 'assets/banner.png': null }).join('\n'), /banner\.png/);
});

test('遊戲資料欄位缺漏或格式錯要擋', () => {
  const bad = { ...INFO, color: 'pink', mobile: '是' };
  delete bad.intro;
  const e = errorsOf({ 'assets/info.json': JSON.stringify(bad) }).join('\n');
  assert.match(e, /intro/);
  assert.match(e, /color/);
  assert.match(e, /mobile/);
});

test('網站沒有的遊戲代號要擋', () => {
  assert.match(errorsOf({ 'assets/info.json': JSON.stringify({ ...INFO, code: 'new-game' }) }).join('\n'), /new-game/);
});

test('套用遊戲資料只改這一款, 其他款不動', async () => {
  const src = readFileSync('site/js/games.js', 'utf8');
  const out = applyInfo(src, { ...INFO, intro: "有'引號'的介紹" }, 'media/games/dungeon-zoo.png', 'media/games/dungeon-zoo-banner.png');
  const { GAMES } = await import('data:text/javascript,' + encodeURIComponent(out));
  const { GAMES: before } = await import('../../site/js/games.js');
  const g = GAMES.find(x => x.code === 'dungeon-zoo');
  assert.deepEqual(g, {
    code: 'dungeon-zoo', name: INFO.name, letter: '來', time: INFO.time, mobile: true,
    bg: INFO.color, fg: INFO.textColor, icon: 'media/games/dungeon-zoo.png', banner: 'media/games/dungeon-zoo-banner.png', intro: "有'引號'的介紹",
  });
  assert.deepEqual(GAMES.filter(x => x.code !== 'dungeon-zoo'), before.filter(x => x.code !== 'dungeon-zoo'));
});
