// Cloudflare 一次性設定: D1、Turnstile、Access(後台)、Pages 的秘密變數。可重跑: 已存在的就沿用
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

// 試跑時查詢一律回「不存在」, 建立一律回假值
async function cf(method, path, body) {
  const url = `https://api.cloudflare.com/client/v4/accounts/${A}${path}`;
  if (DRY) {
    console.log(method, url, body ? JSON.stringify(body) : '');
    return method === 'GET' ? [] : { id: '<id>', uuid: '<uuid>', sitekey: '<sitekey>', secret: '<secret>', aud: '<aud>' };
  }
  const r = await fetch(url, { method, headers: { Authorization: `Bearer ${env.CLOUDFLARE_API_TOKEN}`, 'Content-Type': 'application/json' }, body: body && JSON.stringify(body) });
  const d = await r.json();
  if (!d.success) throw new Error(`${method} ${path}: ${JSON.stringify(d.errors)}`);
  return d.result;
}
const wrangler = args => {
  console.log('wrangler', args.join(' '));
  if (!DRY) execFileSync(process.execPath, ['node_modules/wrangler/bin/wrangler.js', ...args],
    { stdio: 'inherit', env: { ...process.env, CLOUDFLARE_API_TOKEN: env.CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID: A } });
};
const saveToml = toml => { console.log('寫入 wrangler.toml'); if (DRY) console.log(toml); else writeFileSync('wrangler.toml', toml); };

// 1. D1: 沿用或新建 → 先把 id 寫進 wrangler.toml → 才套資料表(wrangler 要讀到正確 id)
const db = (await cf('GET', '/d1/database?name=pvd')).find(d => d.name === 'pvd') || await cf('POST', '/d1/database', { name: 'pvd' });
let toml = readFileSync('wrangler.toml', 'utf8').replace(/database_id = ".*"/, `database_id = "${db.uuid}"`);
saveToml(toml);
wrangler(['d1', 'migrations', 'apply', 'pvd', '--remote']);

// 2. Turnstile: 隱形模式, 只允許本站網域(含預覽網址)
const widgets = await cf('GET', '/challenges/widgets');
let ts = widgets.find(w => w.name === 'PVD計畫');
ts = ts ? await cf('GET', `/challenges/widgets/${ts.sitekey}`) // 列表不含 secret, 要再取一次
  : await cf('POST', '/challenges/widgets', { name: 'PVD計畫', domains: [DOMAIN, 'localhost'], mode: 'invisible' });

// 3. Access: /admin 與 /api/admin(含預覽網址) 只允許 ADMIN_EMAIL; 登入 cookie 只在本站送出
const apps = await cf('GET', '/access/apps');
let app = apps.find(a => a.name === 'PVD計畫後台');
if (!app) {
  app = await cf('POST', '/access/apps', {
    name: 'PVD計畫後台', type: 'self_hosted', domain: `${DOMAIN}/admin`, session_duration: '24h', same_site_cookie_attribute: 'strict',
    self_hosted_domains: [`${DOMAIN}/admin`, `${DOMAIN}/api/admin`, `*.${DOMAIN}/admin`, `*.${DOMAIN}/api/admin`],
  });
  await cf('POST', `/access/apps/${app.id}/policies`, { name: '只有工作室', decision: 'allow', include: [{ email: { email: env.ADMIN_EMAIL } }] });
}

// 4. 非秘密設定進 wrangler.toml; 秘密同時設到正式與預覽環境(每個階段都在預覽網址測)
toml = toml.replace(/\n\[vars\][\s\S]*$/, '') + `\n[vars]\nACCESS_TEAM = "${env.ACCESS_TEAM}"\nACCESS_AUD = "${app.aud}"\n`;
saveToml(toml);
const secrets = { TURNSTILE_SECRET: { type: 'secret_text', value: ts.secret }, IP_SALT: { type: 'secret_text', value: randomBytes(24).toString('hex') } };
await cf('PATCH', `/pages/projects/${PROJECT}`, { deployment_configs: { production: { env_vars: secrets }, preview: { env_vars: secrets } } });

console.log(`\n完成。請把 site/js/config.js 的 turnstileSiteKey 改成: ${ts.sitekey}\n然後 commit wrangler.toml 與 config.js 並推送。`);
