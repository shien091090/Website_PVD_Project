export function splitCountdown(ms) {
  const r = Math.max(0, Math.floor(ms / 1000));
  return { d: Math.floor(r / 86400), h: Math.floor(r / 3600) % 24, m: Math.floor(r / 60) % 60, s: r % 60 };
}

const WD = '日一二三四五六';
// 台灣時間到秒, 例: 11/29(日) 23:59:59 截止
export function deadlineLabel(utcMs) {
  const t = new Date(utcMs + 8 * 3600000); // 台灣無日光節約, 固定 +8
  const p = n => String(n).padStart(2, '0');
  return `${t.getUTCMonth() + 1}/${t.getUTCDate()}(${WD[t.getUTCDay()]}) ${p(t.getUTCHours())}:${p(t.getUTCMinutes())}:${p(t.getUTCSeconds())} 截止`;
}

export const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

// 得票百分比: 四捨五入成整數且加總剛好 100(最大餘數法); 沒有票時全部 0
export function percents(nums) {
  const total = nums.reduce((a, b) => a + b, 0);
  if (!total) return nums.map(() => 0);
  const raw = nums.map(n => n / total * 100), out = raw.map(Math.floor);
  const left = 100 - out.reduce((a, b) => a + b, 0);
  raw.map((r, i) => [r - out[i], i]).sort((a, b) => b[0] - a[0] || a[1] - b[1]).slice(0, left).forEach(([, i]) => out[i]++);
  return out;
}
