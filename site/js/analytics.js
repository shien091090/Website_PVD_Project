import { SITE } from './config.js';
import { isGhost } from './ghost.js';

// PostHog: 沒填 posthogKey、不在正式網址或是透明人模式時所有函式都是空操作。hash 路由所以頁面瀏覽手動送
let ph = null, queue = [];
const on = () => SITE.posthogKey && SITE.analyticsHosts.includes(location.hostname) && !isGhost();
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
    // 封測期間留在訪客瀏覽器裡的來源標籤(例 cb-test)會一直跟著之後的事件, 正式發布後第一次進站時清掉
    if (ph.get_property('src_epoch') !== SRC_EPOCH) { SRC_KEYS.forEach(k => ph.unregister(k)); ph.register({ src_epoch: SRC_EPOCH }); }
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

// 從社群短連結進站: 之後的事件都帶來源; 第一次的來源記在人身上(儀表板依 $initial_utm_source 分組)
// 不指定平台的連結不帶平台, 在儀表板跟直接進站的人算在一起, 但活動、貼文代號與連結代碼照記
// 每點一次連結就整組換成這條連結的來源: 這條沒有的欄位(例 沒填活動)要清掉, 不能沿用上一條連結的
export const SRC_KEYS = ['utm_source', 'utm_campaign', 'utm_content', 'link_code'];
export const SRC_EPOCH = 'launch-2026-11-10';
export function setSource(l) {
  const utm = { utm_source: l.s || undefined, utm_campaign: l.ca || undefined, utm_content: l.co || undefined };
  const props = Object.fromEntries(Object.entries({ ...utm, link_code: l.c }).filter(([, v]) => v));
  const first = Object.fromEntries(Object.entries(utm).filter(([, v]) => v).map(([k, v]) => ['$initial_' + k, v]));
  run(p => {
    SRC_KEYS.filter(k => !(k in props)).forEach(k => p.unregister(k));
    p.register(props);
    if (Object.keys(first).length) p.setPersonProperties({}, first);
  });
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

// 分頁隱藏、離開或換頁時送 engaged 事件(用 sendBeacon, 關分頁也送得出去)
export function initEngage(pageOf) {
  const e = new Engage(performance.now());
  const send = () => {
    const r = e.hidden(performance.now());
    if (r) track('engaged', { fg_ms: Math.round(r.fgMs), total_fg_ms: Math.round(r.totalFgMs), interacted: r.interacted, page: pageOf() }, { transport: 'sendBeacon' });
  };
  document.addEventListener('visibilitychange', () => (document.hidden ? send() : e.visible(performance.now())));
  addEventListener('pagehide', send);
  document.addEventListener('click', ev => { if (ev.target.closest('a, button, [role="radio"], input')) e.interact(); }, true);
  // 換頁時呼叫(還在舊頁時): 送出舊頁這段, 分頁還看得到就從現在起算新頁
  return { flush() { send(); if (!document.hidden) e.visible(performance.now()); } };
}
