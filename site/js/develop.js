import { parseDevelop } from './markdown.js';
import { esc } from './format.js';

// 開發頁內容來自 content/develop.md(使用者自己改檔推送即更新)
let loaded = false;
export async function renderDevelop() {
  if (loaded) return;
  const box = document.getElementById('devin');
  let text;
  try {
    const r = await fetch('content/develop.md', { cache: 'no-cache' });
    if (!r.ok) throw new Error(r.status);
    text = await r.text();
  } catch {
    box.innerHTML = '<p>開發日誌暫時讀不到，請稍後再試。</p>';
    return;
  }
  loaded = true;
  const { meta, sections } = parseDevelop(text);
  const logo = meta.LOGO ? `<img class="logo" src="${esc(meta.LOGO)}" alt="${esc(meta['工作室'] || '')} LOGO">` : '<div class="logo">LOGO</div>';
  const name = [meta['工作室'], meta['工作室英文']].filter(Boolean).map(esc).join(' ');
  box.innerHTML = `
    <div>${meta['更新日期'] ? `<span class="upd">最後更新 ${esc(meta['更新日期'])}</span>` : ''}<h1>${esc(meta['標題'] || '開發日誌')}</h1></div>
    ${sections.map((s, i) => `<section><h2><span>${i + 1}</span>${esc(s.title)}</h2>${s.html}</section>`).join('')}
    <div class="studio">${logo}<div class="who"><small>開發者</small><b>${name}</b><p>${esc(meta['工作室簡介'] || '')}</p></div></div>
    <div class="links">${(meta['連結'] || []).filter(l => /^https?:\/\//.test(l.url))
      .map(l => `<a href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.label)} ↗</a>`).join('')}</div>`;
}
