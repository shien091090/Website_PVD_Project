import { SITE } from './config.js';

// PostHog: 沒填 posthogKey 或不在正式網址時所有函式都是空操作。hash 路由所以頁面瀏覽手動送
let ph = null, queue = [];
const on = () => SITE.posthogKey && SITE.analyticsHosts.includes(location.hostname);
const run = fn => (ph ? fn(ph) : on() && queue.push(fn));

export function initAnalytics({ onFlags = () => {} } = {}) {
  if (!on()) { onFlags(null); return; }
  const assets = SITE.posthogHost.replace('://us.i.', '://us-assets.i.').replace('://eu.i.', '://eu-assets.i.');
  const s = document.createElement('script');
  s.src = assets + '/static/array.full.js';
  s.async = true;
  s.onload = () => {
    window.posthog.init(SITE.posthogKey, {
      api_host: SITE.posthogHost, capture_pageview: false, capture_pageleave: false, autocapture: false,
      persistence: 'localStorage+cookie', person_profiles: 'always',
    });
    ph = window.posthog;
    queue.forEach(fn => fn(ph)); queue = [];
    ph.onFeatureFlags(() => onFlags(ph.getFeatureFlag('theme-ab') || null));
  };
  s.onerror = () => { queue = []; onFlags(null); };
  document.head.appendChild(s);
}

export const track = (event, props = {}, opts) => run(p => p.capture(event, props, opts));
export const trackPage = page => track('$pageview', { page, $current_url: location.href });
export function setTheme(theme, source) {
  run(p => { p.register({ theme, theme_source: source }); p.setPersonProperties({ theme }); });
}

// 前景停留時間: 分頁看得到才計時(不要求滑鼠鍵盤互動, 遊戲框裡的操作上層看不到)
export class Engage {
  constructor(now) { this.since = now; this.total = 0; this.interacted = false; }
  visible(now) { if (this.since == null) this.since = now; }
  hidden(now) {
    if (this.since == null) return null;
    const fgMs = now - this.since;
    this.total += fgMs; this.since = null;
    return { fgMs, totalFgMs: this.total, interacted: this.interacted };
  }
  interact() { this.interacted = true; }
}

// 分頁隱藏或離開時送 engaged 事件(用 sendBeacon, 關分頁也送得出去)
export function initEngage(pageOf) {
  const e = new Engage(performance.now());
  const flush = () => {
    const r = e.hidden(performance.now());
    if (r) track('engaged', { fg_ms: Math.round(r.fgMs), total_fg_ms: Math.round(r.totalFgMs), interacted: r.interacted, page: pageOf() }, { transport: 'sendBeacon' });
  };
  document.addEventListener('visibilitychange', () => (document.hidden ? flush() : e.visible(performance.now())));
  addEventListener('pagehide', flush);
  document.addEventListener('click', ev => { if (ev.target.closest('a, button, [role="radio"], input')) e.interact(); }, true);
  return e;
}
