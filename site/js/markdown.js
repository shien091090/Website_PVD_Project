import { esc } from './format.js';

// 開發頁文字檔: --- 之間是「鍵: 值」(縮排的下一行接在同一個值後面換行), 「連結:」下面每行「- 名稱 | 網址」; 內文 ## 分段、空行分段落
export function parseDevelop(text) {
  const src = String(text).replace(/\r\n?/g, '\n');
  const meta = {};
  let body = src;
  const fm = src.match(/^---\n([\s\S]*?)\n---\n?/);
  if (fm) {
    body = src.slice(fm[0].length);
    let list = null, last = null;
    for (const line of fm[1].split('\n')) {
      const item = line.match(/^\s*-\s*(.+?)\s*\|\s*(\S+)\s*$/);
      if (item && list) { list.push({ label: item[1], url: item[2] }); continue; }
      if (/^\s+\S/.test(line) && last) { meta[last] += '\n' + line.trim(); continue; }
      const kv = line.match(/^([^:：]+)[:：]\s*(.*)$/);
      if (!kv) continue;
      const key = kv[1].trim();
      if (key === '連結') { list = meta[key] = []; last = null; continue; }
      list = null;
      meta[key] = kv[2].trim();
      last = key;
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
      html: paragraphs(s.lines.join('\n')),
    })),
  };
}

// 內文: 空行分段落, 段內換行轉 br
export const paragraphs = text => String(text).replace(/\r\n?/g, '\n').split(/\n\s*\n/).map(p => p.trim()).filter(Boolean)
  .map(p => `<p>${p.split('\n').map(inline).join('<br>')}</p>`).join('');

// 基本資料裡的多行文字: 每行照內文規則轉換, 換行轉 br
export const richText = s => String(s).split('\n').map(inline).join('<br>');

function inline(s) {
  return esc(s)
    .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
    .replace(/~~(.+?)~~/g, '<del>$1</del>')
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, t, u) =>
      /^https?:\/\//.test(u) ? `<a href="${u}" target="_blank" rel="noopener">${t}</a>` : t);
}
