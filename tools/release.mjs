// 檢查遊戲專案的 release/ 資料夾, 並把它的遊戲資料套進 games.js。格式見 docs/遊戲發布格式.md
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { GAME_CODES } from '../site/js/games.js';

const LIMIT = 25 * 1024 * 1024; // Cloudflare Pages 單檔上限
const DOWNLOAD = /\bcreateObjectURL\b|\bdownload\s*=/;
const COLOR = /^#[0-9a-fA-F]{6}$/;
const TEXT = ['code', 'name', 'intro', 'time', 'ratio'];

const files = d => readdirSync(d, { withFileTypes: true })
  .flatMap(e => e.isDirectory() ? files(join(d, e.name)) : [join(d, e.name)]);

export function checkRelease(dir) {
  const errors = [];
  const game = join(dir, 'game');
  if (!existsSync(join(game, 'index.html'))) errors.push('release/game/ 裡沒有 index.html');
  if (existsSync(game)) for (const f of files(game)) {
    const rel = relative(game, f);
    if (/\.md$/i.test(f) && rel.replace(/\\/g, '/') !== 'audio/credits.md') errors.push(`release/game/ 裡不能放開發文件: ${rel}`);
    if (statSync(f).size > LIMIT) errors.push(`檔案超過 25MB: ${rel}`);
    if (/\.(js|html)$/i.test(f) && DOWNLOAD.test(readFileSync(f, 'utf8'))) errors.push(`程式裡有下載檔案的寫法: ${rel}`);
  }
  if (!existsSync(join(dir, 'assets', 'icon.png'))) errors.push('release/assets/ 裡沒有 icon.png');

  let info = null;
  const infoPath = join(dir, 'assets', 'info.json');
  if (!existsSync(infoPath)) errors.push('release/assets/ 裡沒有 info.json');
  else {
    try { info = JSON.parse(readFileSync(infoPath, 'utf8')); } catch { errors.push('info.json 不是正確的 JSON'); }
  }
  if (info) {
    for (const k of TEXT) if (typeof info[k] !== 'string' || !info[k].trim()) errors.push(`info.json 缺少 ${k}`);
    if (typeof info.mobile !== 'boolean') errors.push('info.json 的 mobile 要是 true 或 false');
    for (const k of ['color', 'textColor']) if (!COLOR.test(info[k] || '')) errors.push(`info.json 的 ${k} 要是 # 加 6 碼色碼`);
    if (typeof info.code === 'string' && !GAME_CODES.includes(info.code)) errors.push(`網站沒有這個遊戲代號: ${info.code}`);
  }
  return { errors, info };
}

const q = s => `'${String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;

// 只換掉 games.js 裡這款遊戲的那一筆, 其他內容原樣保留
export function applyInfo(src, info, icon) {
  const re = new RegExp(`  \\{ code: '${info.code}',[\\s\\S]*?\\},\\n`);
  if (!re.test(src)) throw new Error(`games.js 裡找不到 ${info.code}`);
  const entry = `  { code: ${q(info.code)}, name: ${q(info.name)}, letter: ${q([...info.name][0])}, time: ${q(info.time)}, `
    + `mobile: ${info.mobile}, bg: ${q(info.color)}, fg: ${q(info.textColor)}, icon: ${q(icon)},\n    intro: ${q(info.intro)} },\n`;
  return src.replace(re, () => entry);
}
