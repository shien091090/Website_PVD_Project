import { parseDevelop, paragraphs, richText } from './markdown.js';
import { esc } from './format.js';

// 開發頁內容 → 畫面; 前台開發頁與後台預覽共用同一份, 預覽才會跟上線後一樣
// 內容格式: { title, updated, sections: [{ title, body }], developer, studio, email, links: [{ label, url }], bio, logo, logoUrl }
// logo 是後台上傳到 R2 的位置(logo/xxx.png); logoUrl 只有舊文字檔會用到

// 舊的 content/develop.md 轉成同一種格式(後台還沒發布過時沿用)
export function fromMarkdown(text) {
  const src = String(text).replace(/\r\n?/g, '\n');
  const { meta } = parseDevelop(src);
  const body = src.replace(/^---\n[\s\S]*?\n---\n?/, '').replace(/<!--[\s\S]*?-->/g, '');
  const sections = [];
  for (const line of body.split('\n')) {
    const h = line.match(/^##\s+(.+)$/);
    if (h) sections.push({ title: h[1].trim(), body: '' });
    else if (sections.length) sections[sections.length - 1].body += line + '\n';
  }
  return {
    title: meta['標題'] || '', updated: meta['更新日期'] || '', autoDate: false,
    sections: sections.map(s => ({ title: s.title, body: s.body.trim() })),
    developer: meta['開發者'] || '', studio: [meta['工作室'], meta['工作室英文']].filter(Boolean).join(' '),
    email: meta.Email || '', links: meta['連結'] || [], bio: meta['工作室簡介'] || '', logo: '', logoUrl: meta.LOGO || '',
  };
}

export const logoSrc = (c, base = '') => (c.logo ? `${base}files/${c.logo}` : c.logoUrl || '');

export function developHtml(c, base = '') {
  const src = logoSrc(c, base);
  const logo = src ? `<img class="logo" src="${esc(src)}" alt="${esc(c.studio || '')} LOGO">` : '<div class="logo">LOGO</div>';
  const mail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.email || '') ? `<a class="mail" href="mailto:${esc(c.email)}">${esc(c.email)}</a>` : '';
  const links = (c.links || []).filter(l => l.label && /^https?:\/\//.test(l.url));
  const sections = (c.sections || []).filter(s => s.title);
  return `
    <div>${c.updated ? `<span class="upd">最後更新 ${esc(c.updated)}</span>` : ''}<h1>${esc(c.title || '開發日誌')}</h1></div>
    ${sections.map((s, i) => `<section><h2><span>${i + 1}</span>${esc(s.title)}</h2>${paragraphs(s.body || '')}</section>`).join('')}
    <div class="studio">${logo}<div class="who"><small>開發者</small><b>${esc(c.developer || c.studio || '')}</b>${c.developer && c.studio ? `<span class="org">${esc(c.studio)}</span>` : ''}<p>${richText(c.bio || '')}</p>${mail}</div></div>
    ${links.length ? `<div class="links">${links.map(l => `<a href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.label)} ↗</a>`).join('')}</div>` : ''}`;
}
