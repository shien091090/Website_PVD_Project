// 透明人模式(站長自己用): 從 /ghost 進站的瀏覽器帶著標記, 不送任何數據; 畫面角落顯示提示與離開按鈕
export const isGhost = (doc = document) => /(?:^|;\s*)pvd_ghost=1(?:;|$)/.test(doc.cookie);

export function showGhostBadge(doc = document) {
  if (!isGhost(doc)) return;
  const el = doc.createElement('div');
  el.className = 'ghostbar';
  el.innerHTML = '<span>透明模式：這個瀏覽器不計入數據</span><a href="/ghost?off">離開</a>';
  doc.body.appendChild(el);
}
