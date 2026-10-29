export function splitCountdown(ms) {
  const r = Math.max(0, Math.floor(ms / 1000));
  return { d: Math.floor(r / 86400), h: Math.floor(r / 3600) % 24, m: Math.floor(r / 60) % 60, s: r % 60 };
}

const WD = '日一二三四五六';
// 台灣時間, 例: 11/8(日) 20:00 截止
export function deadlineLabel(utcMs) {
  const t = new Date(utcMs + 8 * 3600000); // 台灣無日光節約, 固定 +8
  const p = n => String(n).padStart(2, '0');
  return `${t.getUTCMonth() + 1}/${t.getUTCDate()}(${WD[t.getUTCDay()]}) ${p(t.getUTCHours())}:${p(t.getUTCMinutes())} 截止`;
}

export const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
