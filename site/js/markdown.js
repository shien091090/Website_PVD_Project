import { esc } from './format.js';

// 開發頁文字檔: --- 之間是「鍵: 值」, 「連結:」下面每行「- 名稱 | 網址」; 內文 ## 分段、空行分段落
export function parseDevelop(text) {
  const src = String(text).replace(/\r\n?/g, '\n');
  const meta = {};
  let body = src;
  const fm = src.match(/^---\n([\s\S]*?)\n---\n?/);
  if (fm) {
    body = src.slice(fm[0].length);
    let list = null;
    for (const line of fm[1].split('\n')) {
      const item = line.match(/^\s*-\s*(.+?)\s*\|\s*(\S+)\s*$/);
      if (item && list) { list.push({ label: item[1], url: item[2] }); continue; }
      const kv = line.match(/^([^:：]+)[:：]\s*(.*)$/);
      if (!kv) continue;
      const key = kv[1].trim();
      if (key === '連結') { list = meta[key] = []; continue; }
      list = null;
      meta[key] = kv[2].trim();
    }
  }
  const sections = [];
  let cur = null;
  for (const line of body.split('\n')) {
    const h = line.match(/^##\s+(.+)$/);
    if (h) { cur = { title: h[1].trim(), lines: [] }; sections.push(cur); continue; }
    if (cur) cur.lines.push(line);
  }
  return {
    meta,
    sections: sections.map(s => ({
      title: s.title,
      html: s.lines.join('\n').split(/\n\s*\n/).map(p => p.trim()).filter(Boolean)
        .map(p => `<p>${p.split('\n').map(inline).join('<br>')}</p>`).join(''),
    })),
  };
}

function inline(s) {
  return esc(s)
    .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, t, u) =>
      /^https?:\/\//.test(u) ? `<a href="${u}" target="_blank" rel="noopener">${t}</a>` : t);
}
