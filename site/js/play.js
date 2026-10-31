import { GAMES } from './games.js';
import { AV, avHtml } from './avatars.js';
import * as store from './store.js';
import { esc } from './format.js';

// 試玩頁(1b): 電腦左清單 + 右詳情; 手機點一款從底部拉出抽屜
export const mobileQ = matchMedia('(max-width: 720px)');
export const touchQ = matchMedia('(hover: none) and (pointer: coarse)');
const glist = document.getElementById('glist'), detail = document.getElementById('detail'), psheet = document.getElementById('psheet');
let sel = mobileQ.matches ? null : 0;
let onOpen = () => {};

export const ico = (g, cls = '') => g.icon
  ? `<span class="icon ${cls}" style="--c:${g.bg};--fc:${g.fg}"><img src="${esc(g.icon)}" alt=""></span>`
  : `<span class="icon ${cls}" style="--c:${g.bg};--fc:${g.fg}">${esc(g.letter)}</span>`;

const DEV_PC = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2.5" y="4" width="19" height="12.5" rx="2" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M9 20.5h6M12 16.5v4" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>';
const DEV_PH = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6.5" y="2.5" width="11" height="19" rx="2.5" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M10.5 18.2h3" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>';
const devHtml = g => `<span class="devs" role="img" aria-label="${g.mobile ? '支援電腦與手機' : '僅支援電腦遊玩'}">${DEV_PC}${g.mobile ? DEV_PH : ''}</span>`;
// 不支援手機的遊戲, 在觸控裝置上試玩鈕改成「僅支援電腦遊玩」
const startBtn = g => (!g.mobile && touchQ.matches)
  ? '<span class="startbtn off">僅支援電腦遊玩</span>'
  : `<a class="startbtn" href="#game/${g.code}">▶ 開始試玩</a>`;

// 留言板內容由外部提供(留言模組), 這裡只決定放在哪
let board = { html: () => '', mount: () => {} };
export function setBoard(b) { board = b; }

export let myAv = store.get('av', -1); // 預設隨機, 選過就記住
if (!(myAv >= 0 && myAv < AV.length)) myAv = Math.floor(Math.random() * AV.length);

export function renderPlay() {
  const mob = mobileQ.matches;
  glist.innerHTML = GAMES.map((g, i) => `
    <div class="gi${!mob && i === sel ? ' sel' : ''}" style="--c:${g.bg};--fc:${g.fg}">
      <button class="gh" data-i="${i}" ${mob ? 'aria-haspopup="dialog"' : `aria-pressed="${i === sel}"`}>${ico(g)}
        <span class="nm"><b>${esc(g.name)}</b><span class="tm">${esc(g.time)}<span class="devs" role="img" aria-label="${g.mobile ? '支援電腦與手機' : '僅支援電腦'}">${DEV_PC}${g.mobile ? DEV_PH : ''}</span></span></span>
        <span class="arr">›</span><span class="pm">+</span></button>
    </div>`).join('');
  const open = mob && sel != null;
  psheet.classList.toggle('on', open);
  if (open) {
    const g = GAMES[sel];
    psheet.innerHTML = `<div class="bd"></div>
      <div class="pn" role="dialog" aria-modal="true" aria-label="${esc(g.name)}" style="--c:${g.bg};--fc:${g.fg}">
        <div class="ph">${ico(g)}<span class="nm"><b>${esc(g.name)}</b><span>${esc(g.time)}${devHtml(g)}</span></span><button class="x" aria-label="關閉">✕</button></div>
        <div class="gb"><p>${esc(g.intro)}</p>${startBtn(g)}<div class="board" data-code="${g.code}" style="display:contents">${board.html(g.code)}</div></div>
      </div>`;
    board.mount(psheet.querySelector('.board'), g.code);
  } else psheet.innerHTML = '';
  if (!mob && sel != null) {
    const g = GAMES[sel];
    const meta = `<dl class="meta"><dt>時長</dt><dd>${esc(g.time)}</dd><dt>裝置</dt><dd>${devHtml(g)}</dd></dl>`;
    // 有橫幅: 圖示壓在橫幅左下角, 標題與時長裝置排在圖示右邊
    detail.innerHTML = `
      <div class="dl${g.banner ? ' has-cover' : ''}">
        ${g.banner
          ? `<div class="cover"><img src="${esc(g.banner)}" alt=""></div><div class="hd">${ico(g)}<div class="ht"><b>${esc(g.name)}</b>${meta}</div></div>`
          : `<div class="hd">${ico(g)}<b>${esc(g.name)}</b></div>${meta}`}
        <p>${esc(g.intro)}</p>
        ${startBtn(g)}
      </div>
      <div class="dr board" data-code="${g.code}">${board.html(g.code)}</div>`;
    board.mount(detail.querySelector('.board'), g.code);
  }
}

// 只重畫留言板(不動清單與抽屜動畫)
export function rerenderBoard(code) {
  document.querySelectorAll(`.board[data-code="${code}"]`).forEach(el => { el.innerHTML = board.html(code); board.mount(el, code); });
}

// 由路由呼叫: code 有值就選它; 沒值時手機收起抽屜
export function enterPlay(code, fromGame) {
  const i = GAMES.findIndex(g => g.code === code);
  if (i >= 0) sel = i; else if (!fromGame && mobileQ.matches) sel = null;
  if (!mobileQ.matches && sel == null) sel = 0;
  renderPlay();
}

export function initPlay(opts = {}) {
  onOpen = opts.onOpen || onOpen;
  glist.addEventListener('click', e => {
    const b = e.target.closest('.gh'); if (!b) return;
    sel = +b.dataset.i;
    renderPlay();
    onOpen(GAMES[sel].code);
    psheet.querySelector('.x')?.focus();
  });
  const closeSheet = () => { if (!mobileQ.matches || sel == null) return; const i = sel; sel = null; renderPlay(); glist.querySelector(`[data-i="${i}"]`)?.focus(); };
  psheet.addEventListener('click', e => { if (e.target.closest('.x') || e.target.classList.contains('bd')) closeSheet(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !avpop.classList.contains('on')) closeSheet(); });
  mobileQ.addEventListener('change', () => { if (!mobileQ.matches && sel == null) sel = 0; renderPlay(); });
  initAvatarPop();
}

// 頭像小彈窗: 跳在按鈕正上方, 不壓黑背景
let avpop, avOpener = null;
function initAvatarPop() {
  document.body.insertAdjacentHTML('beforeend', `<div class="avpop" id="avpop" role="dialog" aria-label="選擇頭像"><small>選頭像</small>
    <div class="avgrid">${AV.map((a, i) => `<button type="button" data-a="${i}" aria-label="頭像 ${i + 1}">${avHtml(i)}</button>`).join('')}</div></div>`);
  avpop = document.getElementById('avpop');
  const openAv = btn => {
    avOpener = btn;
    avpop.querySelectorAll('[data-a]').forEach(b => b.classList.toggle('cur', +b.dataset.a === myAv));
    avpop.classList.add('on');
    const r = btn.getBoundingClientRect(), w = avpop.offsetWidth;
    const left = Math.max(8, Math.min(r.left - 6, innerWidth - w - 8));
    avpop.style.left = left + 'px';
    avpop.style.bottom = innerHeight - r.top + 12 + 'px';
    avpop.style.setProperty('--ax', r.left + r.width / 2 - left - 8 + 'px');
    avpop.querySelector('.cur').focus();
  };
  const closeAv = refocus => { if (!avpop.classList.contains('on')) return; avpop.classList.remove('on'); if (refocus) avOpener?.focus(); };
  document.addEventListener('click', e => {
    const b = e.target.closest('.avbtn');
    if (b) return avpop.classList.contains('on') && avOpener === b ? closeAv() : openAv(b);
    const a = e.target.closest('#avpop [data-a]');
    if (a) {
      myAv = +a.dataset.a; store.set('av', myAv);
      document.querySelectorAll('.avbtn').forEach(x => x.innerHTML = avHtml(myAv)); // 不重畫表單, 保留已打的字
      return closeAv(true);
    }
    if (!e.target.closest('#avpop')) closeAv();
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeAv(true); });
  addEventListener('resize', () => closeAv());
  document.addEventListener('scroll', () => closeAv(), true);
}
