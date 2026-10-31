// PostHog 補設定: 儀表板「PVD計畫」加上通關時間、每人停留時間、各頁停留時間; 主題 AB 的停留時間改成每人加總;
// 順便修好第一次設定時中文欄位名沒加引號、跑不起來的圖表
// 用法: node tools/posthog-playtime.mjs [--dry-run]。已有同名圖表就跳過, 可以重跑
// 需要 .secrets.env: POSTHOG_PERSONAL_KEY、POSTHOG_PROJECT_ID、POSTHOG_HOST(例 https://us.posthog.com)
import { readFileSync, existsSync } from 'node:fs';
import { quoteCJK } from './hogql.mjs';

const DRY = process.argv.includes('--dry-run');
const env = Object.fromEntries((existsSync('.secrets.env') ? readFileSync('.secrets.env', 'utf8') : '')
  .split(/\r?\n/).map(l => l.match(/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/)).filter(Boolean).map(m => [m[1], m[2]]));
for (const k of ['POSTHOG_PERSONAL_KEY', 'POSTHOG_PROJECT_ID', 'POSTHOG_HOST'])
  if (!env[k] && !DRY) { console.error(`.secrets.env 缺少 ${k}`); process.exit(1); }
const BASE = `${env.POSTHOG_HOST || 'https://us.posthog.com'}/api/projects/${env.POSTHOG_PROJECT_ID || '<PROJECT_ID>'}`;

async function ph(path, body, method = 'POST') {
  if (DRY && method !== 'GET') { console.log(method, BASE + path, body ? JSON.stringify(body) : ''); return {}; }
  if (DRY) return { results: [] };
  const r = await fetch(BASE + path, { method, headers: { Authorization: `Bearer ${env.POSTHOG_PERSONAL_KEY}`, 'Content-Type': 'application/json' }, body: body && JSON.stringify(body) });
  const d = await r.json();
  if (!r.ok) throw new Error(`${path}: ${JSON.stringify(d)}`);
  return d;
}

const dash = (await ph('/dashboards/?limit=200', null, 'GET')).results.find(d => d.name === 'PVD計畫' && !d.deleted);
if (!dash && !DRY) { console.error('找不到儀表板「PVD計畫」, 請先跑 posthog-setup.mjs'); process.exit(1); }
const existing = (await ph('/insights/?limit=200', null, 'GET')).results.filter(i => !i.deleted);
const hogql = query => ({ kind: 'DataVisualizationNode', source: { kind: 'HogQLQuery', query: quoteCJK(query) } });
// 一段前景時間超過 2 小時視為分頁擺著沒看, 只算 2 小時
const FG = 'least(toFloat(properties.fg_ms), 7200000)';

async function upsert(name, description, query) {
  const old = existing.find(i => i.name === name);
  if (old) { await ph(`/insights/${old.id}/`, { description, query: hogql(query) }, 'PATCH'); console.log(`已更新: ${name}`); }
  else { await ph('/insights/', { name, description, dashboards: [dash?.id], query: hogql(query) }); console.log(`已新增: ${name}`); }
}

await upsert('各遊戲通關時間', '玩完一局時, 這位玩家這款遊戲累計的實際遊玩時間(可能分好幾次玩; 暫停、分頁切走不算)', `
SELECT toString(properties.game) AS 遊戲, count() AS 玩完次數,
  round(avg(toFloat(properties.play_seconds)) / 60, 1) AS 平均分鐘,
  round(median(toFloat(properties.play_seconds)) / 60, 1) AS 中位數分鐘
FROM events
WHERE event = 'game_finish' AND properties.play_seconds IS NOT NULL AND timestamp > now() - INTERVAL 90 DAY
GROUP BY 遊戲 ORDER BY 玩完次數 DESC`);

await upsert('每人在網站停留時間', '近 30 天每人看得到網頁的時間加總(含玩遊戲、跨多次造訪)', `
SELECT count() AS 人數, round(avg(t) / 60000, 1) AS 平均分鐘, round(median(t) / 60000, 1) AS 中位數分鐘, round(max(t) / 60000, 1) AS 最長分鐘
FROM (SELECT person_id, sum(${FG}) AS t FROM events
  WHERE event = 'engaged' AND timestamp > now() - INTERVAL 30 DAY GROUP BY person_id)`);

await upsert('各頁面停留時間', '近 30 天各頁看得到的時間; 平均每人 = 總時間 / 有到過這頁的人數', `
SELECT multiIf(p = 'home', '首頁', p = 'play', '試玩頁', p = 'game', '遊玩中', p = 'vote', '投票頁', p = 'develop', '開發日誌', p) AS 頁面,
  count(DISTINCT person_id) AS 人數, round(sum(f) / 60000 / count(DISTINCT person_id), 1) AS 平均每人分鐘,
  round(sum(f) / 3600000, 1) AS 總時數
FROM (SELECT person_id, toString(properties.page) AS p, ${FG} AS f FROM events
  WHERE event = 'engaged' AND timestamp > now() - INTERVAL 30 DAY)
GROUP BY 頁面 ORDER BY 總時數 DESC`);

await upsert('各遊戲平均遊玩時間', '每次離開遊玩頁(含直接關分頁)一筆實際遊玩時間; 超過 2 小時不計', `
SELECT toString(properties.game) AS 遊戲, count() AS 遊玩次數,
  round(avg(toFloat(properties.seconds)) / 60, 1) AS 平均分鐘,
  round(median(toFloat(properties.seconds)) / 60, 1) AS 中位數分鐘
FROM events
WHERE event = 'game_leave' AND timestamp > now() - INTERVAL 30 DAY
  AND toFloat(properties.seconds) BETWEEN 0 AND 7200
GROUP BY 遊戲 ORDER BY 遊玩次數 DESC`);

// 原本取每人「最長一次造訪」, 改成每人所有造訪加總
await upsert('主題 AB: 停留時間與很快離開的比例', '每人前景時間加總; 很快離開 = 沒點過任何東西且加總 < 10/30 秒', `
SELECT theme AS 主題, count() AS 人數, round(avg(fg) / 1000, 1) AS 平均停留秒數,
  round(100 * countIf(fg < 10000 AND NOT inter) / count(), 1) AS 十秒內離開百分比,
  round(100 * countIf(fg < 30000 AND NOT inter) / count(), 1) AS 三十秒內離開百分比
FROM (
  SELECT person_id, argMax(toString(properties.theme), timestamp) AS theme,
    sum(${FG}) AS fg, max(toString(properties.interacted) = 'true') AS inter
  FROM events WHERE event = 'engaged' AND timestamp > now() - INTERVAL 90 DAY
  GROUP BY person_id
) GROUP BY theme ORDER BY theme`);
