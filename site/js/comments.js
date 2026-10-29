import { getJSON, postJSON, turnstileToken } from './api.js';
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
  bad_body: '留言內容不能是空白，最多 120 字',
};
let onPosted = () => {};
// 每款的輸入草稿、送出中、錯誤訊息存在這裡, 不綁在畫面元素上:
// 留言板隨時可能重畫(讀取完成、手機轉向切版面), 重畫後照這些狀態畫回來
const drafts = {}, sending = {}, errors = {};

function html(code) {
  const c = cache[code];
  const n = c ? c.count : '…';
  const head = `<h3>留言板<small>${mobileQ.matches ? '· ' : ''}${n} 則</small></h3>`;
  const list = !c ? '<p class="cmsg">讀取中…</p>'
    : c.error ? '<p class="cmsg">留言暫時讀不到，請稍後再試。</p>'
    : c.comments.map(m => `<div class="cm">${avHtml(m.avatar)}<div class="t">${esc(m.body)}</div></div>`).join('');
  const form = c?.locked ? '<p class="clock">留言功能暫時無法使用</p>'
    : `<form class="cform"><button type="button" class="avbtn" aria-label="選擇頭像" aria-haspopup="dialog">${avHtml(myAv)}</button><input maxlength="120" placeholder="留一句話給這款遊戲…" aria-label="留言" value="${esc(drafts[code] || '')}"><button${sending[code] ? ' disabled' : ''}>送出</button></form><p class="cerr" role="alert"${errors[code] ? '' : ' hidden'}>${esc(errors[code] || '')}</p>`;
  return head + `<div class="cms">${list}</div>` + form;
}

const fetching = {};
function mount(el, code) {
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
  mount: (el, code) => { if (!skipFetch) mount(el, code); },
};
function redraw(code) {
  const focused = document.activeElement?.matches?.(`.board[data-code="${code}"] .cform input`);
  skipFetch = true;
  try { rerenderBoard(code); } finally { skipFetch = false; }
  if (focused) document.querySelector(`.board[data-code="${code}"] .cform input`)?.focus();
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
  document.addEventListener('input', e => {
    const i = e.target.closest?.('.board .cform input'); if (!i) return;
    drafts[i.closest('.board').dataset.code] = i.value;
  });
  document.addEventListener('submit', e => {
    const f = e.target.closest('.board .cform'); if (!f) return;
    e.preventDefault();
    submit(f.closest('.board').dataset.code);
  });
}
