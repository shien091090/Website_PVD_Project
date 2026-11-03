// 亮/暗主題分組(只在正式網址): 測試網址 ?theme= > 本機已存的分組 > PostHog 旗標 theme-ab > 各半隨機
// 不是正式網址(預覽、本機)不分組: ?theme= > 角落切換鈕存的主題 > 亮色
const OK = t => t === 'light' || t === 'dark';

export function pickTheme({ prod, forced, stored, flag, rand }) {
  if (OK(forced)) return { theme: forced, source: 'forced' };
  if (!prod) return { theme: OK(stored) ? stored : 'light', source: 'test' };
  if (OK(stored)) return { theme: stored, source: 'stored' };
  if (OK(flag)) return { theme: flag, source: 'flag' };
  return { theme: rand < 0.5 ? 'light' : 'dark', source: 'random' };
}
