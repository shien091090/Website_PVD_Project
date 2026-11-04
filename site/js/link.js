// 社群短連結(/s/<代碼>)跳轉時伺服器放的來源 cookie: 讀一次就刪, 重新整理不會重算
const NAME = 'pvd_link';
export function takeLinkSource(doc = document) {
  const m = doc.cookie.match(/(?:^|;\s*)pvd_link=([^;]*)/);
  if (!m) return null;
  doc.cookie = `${NAME}=; Max-Age=0; Path=/; Secure; SameSite=Lax`;
  try {
    const v = JSON.parse(decodeURIComponent(m[1]));
    return v && typeof v.s === 'string' && v.s ? v : null;
  } catch { return null; }
}
