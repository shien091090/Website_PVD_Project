import { fromMarkdown, developHtml } from './devcontent.js';

// 開發頁內容: 後台發布的版本優先; 後台還沒發布過(或讀不到)就用 content/develop.md
let loaded = false;
async function load() {
  try {
    const r = await fetch('api/develop', { cache: 'no-store' });
    if (r.ok) { const { content } = await r.json(); if (content) return content; }
  } catch {}
  const r = await fetch('content/develop.md', { cache: 'no-cache' });
  if (!r.ok) throw new Error(r.status);
  return fromMarkdown(await r.text());
}

export async function renderDevelop() {
  if (loaded) return;
  const box = document.getElementById('devin');
  let c;
  try { c = await load(); } catch {
    box.innerHTML = '<p>開發日誌暫時讀不到，請稍後再試。</p>';
    return;
  }
  loaded = true;
  box.innerHTML = developHtml(c);
}
