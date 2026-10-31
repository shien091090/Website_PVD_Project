// PostHog 一次性設定: 主題 AB 旗標、兩條漏斗、來源×裝置、主題比較, 全部放進儀表板「PVD計畫」
// 用法: node tools/posthog-setup.mjs [--dry-run]
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
  if (DRY) { console.log(method, BASE + path, body ? JSON.stringify(body) : ''); return { id: '<id>', api_token: '<phc_key>' }; }
  const r = await fetch(BASE + path, { method, headers: { Authorization: `Bearer ${env.POSTHOG_PERSONAL_KEY}`, 'Content-Type': 'application/json' }, body: body && JSON.stringify(body) });
  const d = await r.json();
  if (!r.ok) throw new Error(`${path}: ${JSON.stringify(d)}`);
  return d;
}

// 主題分組旗標: light / dark 各 50%
await ph('/feature_flags/', {
  key: 'theme-ab', name: '亮暗主題 AB 分組', active: true,
  filters: { groups: [{ properties: [], rollout_percentage: 100 }],
    multivariate: { variants: [{ key: 'light', rollout_percentage: 50 }, { key: 'dark', rollout_percentage: 50 }] } },
});

const dash = await ph('/dashboards/', { name: 'PVD計畫', description: '來源、漏斗、主題 AB' });
const insight = (name, source, description = '') => ph('/insights/', { name, description, dashboards: [dash.id], query: { kind: 'InsightVizNode', source } });
const ev = event => ({ kind: 'EventsNode', event, math: 'total' });
const bySource = { breakdown: '$initial_utm_source', breakdown_type: 'person' };
const funnel = steps => ({ kind: 'FunnelsQuery', series: steps.map(ev), dateRange: { date_from: '-30d' },
  funnelsFilter: { funnelWindowInterval: 7, funnelWindowIntervalUnit: 'day', funnelVizType: 'steps' }, breakdownFilter: bySource });

await insight('各來源人數與裝置', { kind: 'TrendsQuery', series: [{ ...ev('$pageview'), math: 'dau' }], dateRange: { date_from: '-30d' },
  trendsFilter: { display: 'ActionsTable' },
  breakdownFilter: { breakdowns: [{ property: '$initial_utm_source', type: 'person' }, { property: '$device_type', type: 'event' }] } });
await insight('漏斗: 進站 → 開始玩 → 投票', funnel(['$pageview', 'game_start', 'vote_cast']), '7 天內完成, 依來源平台分組');
await insight('漏斗: 進站 → 開始玩 → 留言', funnel(['$pageview', 'game_start', 'comment_post']), '7 天內完成, 依來源平台分組');

// 主題比較: 每人取最後一次回報的累計前景時間; 很快離開 = 沒點過任何東西且前景時間 < 10/30 秒
await ph('/insights/', {
  name: '主題 AB: 停留時間與很快離開的比例', dashboards: [dash.id],
  query: { kind: 'DataVisualizationNode', source: { kind: 'HogQLQuery', query: quoteCJK(`
SELECT theme AS 主題, count() AS 人數, round(avg(fg) / 1000, 1) AS 平均停留秒數,
  round(100 * countIf(fg < 10000 AND NOT inter) / count(), 1) AS 十秒內離開百分比,
  round(100 * countIf(fg < 30000 AND NOT inter) / count(), 1) AS 三十秒內離開百分比
FROM (
  SELECT person_id, argMax(toString(properties.theme), timestamp) AS theme,
    max(toFloat(properties.total_fg_ms)) AS fg, max(toString(properties.interacted) = 'true') AS inter
  FROM events WHERE event = 'engaged' AND timestamp > now() - INTERVAL 90 DAY
  GROUP BY person_id
) GROUP BY theme ORDER BY theme`) } },
});

// 各遊戲遊玩時間: 每次離開遊玩頁(含直接關分頁)一筆; 超過 2 小時視為分頁擺著沒玩, 不計
await ph('/insights/', {
  name: '各遊戲平均遊玩時間', dashboards: [dash.id],
  query: { kind: 'DataVisualizationNode', source: { kind: 'HogQLQuery', query: quoteCJK(`
SELECT toString(properties.game) AS 遊戲, count() AS 遊玩次數,
  round(avg(toFloat(properties.seconds)) / 60, 1) AS 平均分鐘,
  round(median(toFloat(properties.seconds)) / 60, 1) AS 中位數分鐘
FROM events
WHERE event = 'game_leave' AND timestamp > now() - INTERVAL 30 DAY
  AND toFloat(properties.seconds) BETWEEN 0 AND 7200
GROUP BY 遊戲 ORDER BY 遊玩次數 DESC`) } },
});

// 專案金鑰(phc_ 開頭, 公開的)給網頁用
const project = await ph('/', null, 'GET');
console.log(`完成: 儀表板「PVD計畫」\n請把 site/js/config.js 的 posthogKey 改成: ${project.api_token}`);
