import { test } from 'node:test';
import assert from 'node:assert/strict';

// 假的 PostHog: 記住 register 的屬性(跟真的一樣存在瀏覽器裡, 重新進站還在)
function fakePosthog(saved = {}) {
  return { props: { ...saved }, init() {}, onFeatureFlags() {}, getFeatureFlag() {}, capture() {}, setPersonProperties() {},
    register(o) { Object.assign(this.props, o); }, unregister(k) { delete this.props[k]; }, get_property(k) { return this.props[k]; } };
}
async function boot(saved) {
  const ph = fakePosthog(saved);
  globalThis.location = { hostname: 'pvd-project.pages.dev' };
  globalThis.window = { posthog: ph };
  globalThis.document = { createElement: () => ({}), head: { appendChild: s => s.onload() } };
  const m = await import('../../site/js/analytics.js?' + Math.random());
  m.initAnalytics();
  return { ph, m };
}

test('來源標籤: 新連結沒填的欄位會清掉, 不沿用上一條連結的活動', async () => {
  const { ph, m } = await boot();
  m.setSource({ c: 'a1', s: 'threads', ca: 'cb-test', co: 'cb-test-001' });
  assert.equal(ph.props.utm_campaign, 'cb-test');
  m.setSource({ c: 'b2', s: 'threads', ca: '', co: 'profile-2026-1110' });
  assert.equal(ph.props.utm_campaign, undefined);
  assert.equal(ph.props.utm_content, 'profile-2026-1110');
  assert.equal(ph.props.link_code, 'b2');
});

test('來源標籤: 封測時留在瀏覽器裡的來源, 正式發布後第一次進站就清掉, 之後不再清', async () => {
  const { ph } = await boot({ utm_source: 'threads', utm_campaign: 'cb-test', utm_content: 'cb-test-001', link_code: 'x', theme: 'dark' });
  assert.deepEqual(Object.keys(ph.props).sort(), ['src_epoch', 'theme']);
  const again = await boot({ ...ph.props, utm_campaign: 'pvd-round1' });
  assert.equal(again.ph.props.utm_campaign, 'pvd-round1');
});
