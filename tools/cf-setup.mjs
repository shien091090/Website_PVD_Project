// Cloudflare 一次性設定: D1、Turnstile、Access(後台)、Pages 的秘密變數
// 用法: node tools/cf-setup.mjs [--dry-run]
// 需要 .secrets.env: CLOUDFLARE_API_TOKEN、CLOUDFLARE_ACCOUNT_ID、ACCESS_TEAM、ADMIN_EMAIL
// Pages 專案要先在 Cloudflare 網頁上「連接 GitHub」建立(見 docs/部署說明.md), 名稱 pvd-project
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';

const DRY = process.argv.includes('--dry-run');
const PROJECT = 'pvd-project', DOMAIN = `${PROJECT}.pages.dev`;
const env = Object.fromEntries((existsSync('.secrets.env') ? readFileSync('.secrets.env', 'utf8') : '')
  .split(/\r?\n/).map(l => l.match(/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/)).filter(Boolean).map(m => [m[1], m[2]]));
for (const k of ['CLOUDFLARE_API_TOKEN', 'CLOUDFLARE_ACCOUNT_ID', 'ACCESS_TEAM', 'ADMIN_EMAIL'])
  if (!env[k] && !DRY) { console.error(`.secrets.env 缺少 ${k}`); process.exit(1); }
const A = env.CLOUDFLARE_ACCOUNT_ID || '<ACCOUNT_ID>';

async function cf(method, path, body) {
  const url = `https://api.cloudflare.com/client/v4/accounts/${A}${path}`;
  if (DRY) { console.log(method, url, body ? JSON.stringify(body) : ''); return { id: '<id>', uuid: '<uuid>', sitekey: '<sitekey>', secret: '<secret>', aud: '<aud>' }; }
  const r = await fetch(url, { method, headers: { Authorization: `Bearer ${env.CLOUDFLARE_API_TOKEN}`, 'Content-Type': 'application/json' }, body: body && JSON.stringify(body) });
  const d = await r.json();
  if (!d.success) throw new Error(`${method} ${path}: ${JSON.stringify(d.errors)}`);
  return d.result;
}
const wrangler = (args, input) => {
  console.log('wrangler', args.join(' '));
  if (!DRY) execFileSync(process.execPath, ['node_modules/wrangler/bin/wrangler.js', ...args],
    { input, stdio: [input ? 'pipe' : 'inherit', 'inherit', 'inherit'], env: { ...process.env, CLOUDFLARE_API_TOKEN: env.CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID: A } });
};

// 1. D1: 建資料庫, 把 id 寫回 wrangler.toml, 套資料表
const db = await cf('POST', '/d1/database', { name: 'pvd' });
let toml = readFileSync('wrangler.toml', 'utf8').replace(/database_id = ".*"/, `database_id = "${db.uuid}"`);
wrangler(['d1', 'migrations', 'apply', 'pvd', '--remote']);

// 2. Turnstile: 隱形模式, 只允許本站網域
const ts = await cf('POST', '/challenges/widgets', { name: 'PVD計畫', domains: [DOMAIN, 'localhost'], mode: 'invisible' });

// 3. Access: /admin 與 /api/admin(含預覽網址) 只允許 ADMIN_EMAIL
const app = await cf('POST', '/access/apps', {
  name: 'PVD計畫後台', type: 'self_hosted', domain: `${DOMAIN}/admin`, session_duration: '720h',
  self_hosted_domains: [`${DOMAIN}/admin`, `${DOMAIN}/api/admin`, `*.${DOMAIN}/admin`, `*.${DOMAIN}/api/admin`],
});
await cf('POST', `/access/apps/${app.id}/policies`, { name: '只有工作室', decision: 'allow', include: [{ email: { email: env.ADMIN_EMAIL } }] });

// 4. 非秘密設定進 wrangler.toml, 秘密用 wrangler 設定
toml = toml.replace(/\n\[vars\][\s\S]*$/, '') + `\n[vars]\nACCESS_TEAM = "${env.ACCESS_TEAM}"\nACCESS_AUD = "${app.aud}"\n`;
if (!DRY) writeFileSync('wrangler.toml', toml); else console.log('--- wrangler.toml 會變成 ---\n' + toml);
wrangler(['pages', 'secret', 'put', 'TURNSTILE_SECRET', '--project-name', PROJECT], ts.secret);
wrangler(['pages', 'secret', 'put', 'IP_SALT', '--project-name', PROJECT], randomBytes(24).toString('hex'));

console.log(`\n完成。請把 site/js/config.js 的 turnstileSiteKey 改成: ${ts.sitekey}\n然後 commit wrangler.toml 與 config.js 並推送。`);
