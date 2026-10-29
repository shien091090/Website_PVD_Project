// 亮/暗主題分組: 測試網址 ?theme= > 本機已存的分組 > PostHog 旗標 theme-ab > 各半隨機
const OK = t => t === 'light' || t === 'dark';

export function pickTheme({ forced, stored, flag, rand }) {
  if (OK(forced)) return { theme: forced, source: 'forced' };
  if (OK(stored)) return { theme: stored, source: 'stored' };
  if (OK(flag)) return { theme: flag, source: 'flag' };
  return { theme: rand < 0.5 ? 'light' : 'dark', source: 'random' };
}
