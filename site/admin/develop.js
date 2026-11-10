import { api, onTab, fmt, esc } from './admin.js';
import { fromMarkdown, developHtml, logoSrc } from '../js/devcontent.js';

// ---- 開發頁: 左邊編輯, 右邊用網站本身的樣式即時預覽; 按「發布」才上線 ----
const $ = id => document.getElementById(id);
const ERR = {
  bad_title: '標題太長（最多 60 字）', bad_updated: '日期太長', too_many_sections: '段落最多 20 段', bad_section_title: '每一段都要有標題，且最多 40 字',
  bad_section_body: '段落內容太長（每段最多 3000 字）', bad_developer: '開發者名稱太長', bad_studio: '工作室名稱太長', bad_email: 'Email 格式不正確',
  too_many_links: '連結最多 8 個', bad_link: '每個連結都要有名稱，網址要以 http:// 或 https:// 開頭', bad_bio: '自介太長（最多 1000 字）',
  bad_logo: 'LOGO 不正確，請重新上傳', bad_type: '只能上傳 PNG、JPG、WebP 或 SVG', bad_image: '這個檔案不是正確的圖片', too_large: '圖片要在 1MB 以內',
  no_storage: '圖片儲存空間還沒設定好', not_found: '找不到這個版本', bad_json: '內容太大',
};
const errText = e => ERR[e.message] || e.message;

let saved = null; // 線上版本(還沒發布過時是舊文字檔的內容)
let draft = null;
let loadedOnce = false;
const same = () => JSON.stringify(draft) === JSON.stringify(saved);
const clone = o => JSON.parse(JSON.stringify(o));

// 預覽: iframe 載入網站樣式一次, 之後只換內容(不重載, 不跳回頂端)
const frame = $('dframe');
frame.srcdoc = `<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><base href="${location.origin}/">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@500;700;900&display=swap"><link rel="stylesheet" href="css/site.css">
<style>body{margin:0}.dev{border-top:0}</style></head><body><article class="dev"><div class="dev-in" id="devin"></div></article></body></html>`;
frame.addEventListener('load', preview);
function preview() {
  const box = frame.contentDocument?.getElementById('devin');
  if (box && draft) box.innerHTML = developHtml(draft, '/');
}

function status(text, dirty) {
  $('dst').textContent = text;
  $('ddot').classList.toggle('dirty', dirty);
  $('drevert').disabled = $('dpub').disabled = !dirty;
}
function changed() { preview(); status(same() ? (saved?.__fromFile ? '目前開發頁用的是舊文字檔的內容' : '和線上版本相同') : '有尚未發布的修改', !same()); }

function fill() {
  $('dtitle').value = draft.title; $('dupd').value = draft.updated; $('dauto').checked = draft.autoDate;
  $('dupd').disabled = draft.autoDate;
  $('ddev').value = draft.developer; $('dmail').value = draft.email; $('dstudio').value = draft.studio; $('dbio').value = draft.bio;
  drawSecs(); drawLinks(); drawLogo(); changed();
}
function drawSecs() {
  $('dsecs').innerHTML = draft.sections.map((s, i) => `<div class="sec"><div class="top"><span class="no">${i + 1}</span><input data-i="${i}" data-k="title" value="${esc(s.title)}" maxlength="40" placeholder="段落標題" aria-label="第 ${i + 1} 段標題">
    <button class="b" data-mv="${i},-1" ${i ? '' : 'disabled'} aria-label="上移">↑</button><button class="b" data-mv="${i},1" ${i < draft.sections.length - 1 ? '' : 'disabled'} aria-label="下移">↓</button><button class="b danger" data-rm="${i}">刪除</button></div>
    <span class="tool" data-for="dsec${i}"><button class="b" data-fx="b">粗體</button><button class="b" data-fx="d">刪除線</button><button class="b" data-fx="l">連結</button></span>
    <textarea id="dsec${i}" data-i="${i}" data-k="body" rows="5" maxlength="3000" placeholder="這段的內容" aria-label="第 ${i + 1} 段內容">${esc(s.body)}</textarea></div>`).join('');
}
function drawLinks() {
  $('dlinks').innerHTML = draft.links.map((l, i) => `<div class="lk"><input data-li="${i}" data-k="label" value="${esc(l.label)}" maxlength="20" placeholder="名稱，例如 Threads" aria-label="連結名稱">
    <input data-li="${i}" data-k="url" value="${esc(l.url)}" maxlength="300" placeholder="https://…" aria-label="連結網址"><button class="b danger" data-lrm="${i}">刪除</button></div>`).join('');
}
function drawLogo() {
  const src = logoSrc(draft, '/');
  $('dlogo').innerHTML = src ? `<img src="${esc(src)}" alt="">` : 'LOGO';
  $('dlogo').classList.toggle('has', !!src);
  $('dldel').disabled = !src;
}

const FIELDS = { dtitle: 'title', dupd: 'updated', ddev: 'developer', dmail: 'email', dstudio: 'studio', dbio: 'bio' };
$('tab-develop').addEventListener('input', e => {
  const t = e.target;
  if (!draft) return;
  if (FIELDS[t.id]) draft[FIELDS[t.id]] = t.value;
  else if (t.id === 'dauto') { draft.autoDate = t.checked; $('dupd').disabled = t.checked; }
  else if (t.dataset.i != null) draft.sections[+t.dataset.i][t.dataset.k] = t.value;
  else if (t.dataset.li != null) draft.links[+t.dataset.li][t.dataset.k] = t.value;
  else return;
  changed();
});
$('tab-develop').addEventListener('click', e => {
  const b = e.target.closest('button');
  if (!b || !draft) return;
  if (b.dataset.mv) { const [i, d] = b.dataset.mv.split(',').map(Number); [draft.sections[i], draft.sections[i + d]] = [draft.sections[i + d], draft.sections[i]]; drawSecs(); changed(); }
  else if (b.dataset.rm != null) {
    // 刪除段落用兩段式按鈕, 避免誤刪
    if (!b.classList.contains('arm')) { b.classList.add('arm'); b.textContent = '確定？'; setTimeout(() => { b.classList.remove('arm'); b.textContent = '刪除'; }, 3000); return; }
    draft.sections.splice(+b.dataset.rm, 1); drawSecs(); changed();
  }
  else if (b.dataset.lrm != null) { draft.links.splice(+b.dataset.lrm, 1); drawLinks(); changed(); }
  else if (b.dataset.fx) {
    const ta = $(b.parentElement.dataset.for), s = ta.selectionStart, en = ta.selectionEnd, sel = ta.value.slice(s, en) || '文字';
    const w = b.dataset.fx === 'b' ? `**${sel}**` : b.dataset.fx === 'd' ? `~~${sel}~~` : `[${sel}](https://)`;
    ta.setRangeText(w, s, en, 'end'); ta.focus(); ta.dispatchEvent(new Event('input', { bubbles: true }));
  }
  else if (b.dataset.w) { b.parentElement.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); frame.classList.toggle('phone', b.dataset.w === 'phone'); }
});
$('daddsec').addEventListener('click', () => { draft.sections.push({ title: '', body: '' }); drawSecs(); changed(); $('dsecs').lastElementChild.querySelector('input').focus(); });
$('daddlink').addEventListener('click', () => { draft.links.push({ label: '', url: '' }); drawLinks(); changed(); $('dlinks').lastElementChild.querySelector('input').focus(); });

// LOGO: 選了檔案就先上傳(預覽才看得到), 按「發布」才會換到開發頁上
$('dlup').addEventListener('click', () => $('dlfile').click());
$('dlfile').addEventListener('change', async e => {
  const f = e.target.files[0];
  e.target.value = '';
  if (!f) return;
  if (f.size > 1024 * 1024) { $('dlmsg').innerHTML = `<span class="err">${ERR.too_large}</span>`; return; }
  $('dlmsg').textContent = '上傳中…';
  try {
    const data = await new Promise((ok, no) => { const r = new FileReader(); r.onload = () => ok(String(r.result).split(',')[1]); r.onerror = no; r.readAsDataURL(f); });
    const { logo } = await api('logo', 'POST', { type: f.type, data });
    draft.logo = logo; draft.logoUrl = '';
    $('dlmsg').textContent = '已上傳，按「發布」後才會換到開發頁上';
    drawLogo(); changed();
  } catch (err) { if (err.message !== '401') $('dlmsg').innerHTML = `<span class="err">上傳失敗：${esc(errText(err))}</span>`; }
});
$('dldel').addEventListener('click', () => { draft.logo = ''; draft.logoUrl = ''; drawLogo(); changed(); });

$('drevert').addEventListener('click', () => { draft = clone(saved); fill(); });
$('dpub').addEventListener('click', async () => {
  $('dpub').disabled = true;
  try {
    const { logoUrl, __fromFile, ...content } = draft;
    await api('develop', 'POST', { content });
    await load();
    status('已發布，開發頁已更新', false);
  } catch (err) { if (err.message !== '401') { status(`發布失敗：${errText(err)}`, true); } }
});
$('dhist').addEventListener('click', async e => {
  const b = e.target.closest('[data-rev]');
  if (!b) return;
  if (!same() && !b.classList.contains('arm')) { b.classList.add('arm'); b.textContent = '未發布的修改會不見，確定？'; setTimeout(() => { b.classList.remove('arm'); b.textContent = '退回這版'; }, 3000); return; }
  b.disabled = true;
  try { await api('develop', 'POST', { revertTo: +b.dataset.rev }); await load(); status('已退回，開發頁已更新', false); }
  catch (err) { if (err.message !== '401') status(`退回失敗：${errText(err)}`, !same()); b.disabled = false; }
});

async function load() {
  const { current, history } = await api('develop');
  if (current) saved = current.content;
  else {
    // 還沒從後台發布過: 帶入目前開發頁用的舊文字檔內容
    const r = await fetch('../content/develop.md', { cache: 'no-cache' });
    saved = { ...fromMarkdown(r.ok ? await r.text() : ''), __fromFile: true };
  }
  saved = { links: [], sections: [], logoUrl: '', ...saved };
  draft = clone(saved);
  $('dnote').hidden = !!current;
  $('dnote').textContent = '目前開發頁用的是舊文字檔的內容，已經帶進來；按「發布」後就改由後台管理，之後不用再改檔案。';
  $('dhist').innerHTML = history.map((h, i) => `<li><span>${fmt(h.publishedAt)}</span>${i ? `<button class="b" data-rev="${h.id}">退回這版</button>` : '<span class="cur">目前線上版本</span>'}</li>`).join('')
    || '<li class="msg">還沒有從後台發布過</li>';
  fill();
}

onTab('develop', async () => {
  if (loadedOnce) return;
  try { await load(); loadedOnce = true; } catch (err) { if (err.message !== '401') status(`讀取失敗：${errText(err)}`, false); }
});
// 有未發布的修改時離開頁面要先確認
addEventListener('beforeunload', e => { if (draft && saved && !same()) e.preventDefault(); });
