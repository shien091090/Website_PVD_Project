import { getJSON, postJSON, turnstileToken, prefetchToken } from './api.js';
import { avHtml } from './avatars.js';
import { esc } from './format.js';
import { mobileQ, myAv, rerenderBoard } from './play.js';

// 留言板: 每款快取一份, 每次打開都重抓; 鎖住時輸入區換成一行說明
const cache = {};
const ERR = {
  too_fast: '留言太快了，請等 30 秒再試',
  hour_limit: '這一小時留言次數已達上限',
  ip_limit: '這一小時留言次數已達上限',
  turnstile: '驗證沒有通過，請再試一次',
  bad_body: '留言內容不能是空白，最多 200 字',
};
let onPosted = () => {};
// 上限跟伺服器一樣以字元算(表情符號算 1 字)
const MAX = 200, len = s => [...s].length;
// 留言框跟著內容長高, 整段都看得到
const grow = t => { t.style.height = 'auto'; if (t.scrollHeight) t.style.height = t.scrollHeight + 'px'; }; // 還沒顯示時量不到, 先用預設一列
// 每款的輸入草稿、送出中、錯誤訊息存在這裡, 不綁在畫面元素上:
// 留言板隨時可能重畫(讀取完成、手機轉向切版面), 重畫後照這些狀態畫回來
const drafts = {}, sending = {}, errors = {};

function html(code) {
  const c = cache[code];
  const n = c ? c.count : '…';
  const head = `<h3>留言板<small>${mobileQ.matches ? '· ' : ''}${n} 則</small></h3>`;
  const list = !c ? '<p class="cmsg">讀取中…</p>'
    : c.error ? '<p class="cmsg">留言暫時讀不到，請稍後再試。</p>'
    : c.comments.map((m, i) => `<div class="cm" data-n="${i}">${avHtml(m.avatar)}<div class="t">${esc(m.body)}</div></div>`).join('');
  const form = c?.locked ? '<p class="clock">留言功能暫時無法使用</p>'
    : `<form class="cform"><button type="button" class="avbtn" aria-label="選擇頭像" aria-haspopup="dialog">${avHtml(myAv)}</button><textarea rows="1" maxlength="${MAX}" placeholder="留一句話給這款遊戲…" aria-label="留言">${esc(drafts[code] || '')}</textarea><span class="ccount" aria-live="polite">${len(drafts[code] || '')}/${MAX}</span><button${sending[code] ? ' disabled' : ''}>${sending[code] ? '送出中…' : '送出'}</button></form><p class="cerr" role="alert"${errors[code] ? '' : ' hidden'}>${esc(errors[code] || '')}</p>`;
  return head + `<div class="cms">${list}</div>` + form;
}

const fetching = {};
function mount(el, code) {
  // 驗證冷啟動要 5 秒多, 打開留言板就先做, 看留言、打字的時間就驗證完了(鎖住的不用)
  if (!cache[code]?.locked) prefetchToken();
  if (fetching[code]) return;
  fetching[code] = getJSON(`/api/comments?game=${code}`)
    .then(d => { cache[code] = d; })
    .catch(() => { if (!cache[code]) cache[code] = { error: true, count: 0, comments: [], locked: false }; })
    .finally(() => { fetching[code] = null; redraw(code); });
}
// 重畫時不要再觸發讀取, 讀取只在使用者打開某款時做
let skipFetch = false;
export const board = {
  html,
  mount: (el, code) => { columns(el); el.querySelectorAll('.cform textarea').forEach(grow); if (!skipFetch) mount(el, code); },
};
// 電腦版留言排兩欄: 依新到舊, 每則放進當下較短的那欄, 兩欄高度差最多一則
function columns(el) {
  const cms = el.querySelector('.cms');
  if (!cms || mobileQ.matches || !el.closest('#detail')) return;
  const items = [...cms.querySelectorAll('.cm')].sort((a, b) => a.dataset.n - b.dataset.n);
  if (!items.length) return;
  const cols = [0, 1].map(() => Object.assign(document.createElement('div'), { className: 'col' }));
  cms.classList.add('two');
  cms.replaceChildren(...cols);
  for (const it of items) (cols[0].offsetHeight <= cols[1].offsetHeight ? cols[0] : cols[1]).append(it);
}
function redraw(code) {
  const focused = document.activeElement?.matches?.(`.board[data-code="${code}"] .cform textarea`);
  skipFetch = true;
  try { rerenderBoard(code); } finally { skipFetch = false; }
  if (focused) {
    const t = document.querySelector(`.board[data-code="${code}"] .cform textarea`);
    t?.focus(); t?.setSelectionRange(t.value.length, t.value.length);
  }
}

async function submit(code) {
  const text = (drafts[code] || '').trim();
  if (!text || sending[code]) return;
  sending[code] = true; errors[code] = '';
  redraw(code);
  try {
    const token = await turnstileToken();
    const { comment } = await postJSON('/api/comments', { game: code, avatar: myAv, body: text, token });
    const c = cache[code] && !cache[code].error ? cache[code] : (cache[code] = { count: 0, comments: [], locked: false });
    c.comments.unshift(comment); c.count++;
    drafts[code] = '';
    onPosted(code);
  } catch (e) {
    if (e.code === 'locked') (cache[code] ||= { count: 0, comments: [], locked: false }).locked = true;
    else errors[code] = ERR[e.code] || '送出失敗，請稍後再試';
  } finally {
    sending[code] = false;
    redraw(code);
    if (!errors[code]) document.querySelectorAll(`.board[data-code="${code}"] .cms`).forEach(b => { b.scrollTop = 0; });
  }
}

export function initComments(opts = {}) {
  onPosted = opts.onPosted || onPosted;
  // 欄寬或字型變了, 每則高度跟著變, 重排兩欄
  let t;
  const relayout = () => document.querySelectorAll('#detail .board').forEach(columns);
  addEventListener('resize', () => { clearTimeout(t); t = setTimeout(relayout, 150); });
  document.fonts?.ready.then(relayout);
  document.addEventListener('input', e => {
    const i = e.target.closest?.('.board .cform textarea'); if (!i) return;
    if (/[\r\n]/.test(i.value)) i.value = i.value.replace(/[\r\n]+/g, ' '); // 貼上的換行改成空白, 跟伺服器存的一樣
    drafts[i.closest('.board').dataset.code] = i.value;
    i.closest('.cform').querySelector('.ccount').textContent = `${len(i.value)}/${MAX}`;
    grow(i);
  });
  document.addEventListener('focusin', e => { if (e.target.closest?.('.board .cform textarea')) prefetchToken(); });
  // Enter 送出, 不換行(輸入法選字中的 Enter 不算)
  document.addEventListener('keydown', e => {
    const t = e.target.closest?.('.board .cform textarea');
    if (!t || e.key !== 'Enter' || e.isComposing || e.keyCode === 229) return;
    e.preventDefault();
    t.form.requestSubmit();
  });
  document.addEventListener('submit', e => {
    const f = e.target.closest('.board .cform'); if (!f) return;
    e.preventDefault();
    submit(f.closest('.board').dataset.code);
  });
}
