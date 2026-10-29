// 網站自己的本機儲存, 鍵一律 pvd: 開頭(遊戲接入規範保留給網站)
export function get(key, dflt) {
  try { const v = localStorage.getItem('pvd:' + key); return v == null ? dflt : JSON.parse(v); } catch { return dflt; }
}
export function set(key, val) {
  try { localStorage.setItem('pvd:' + key, JSON.stringify(val)); } catch {}
}
