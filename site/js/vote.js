import { GAMES, byCode } from './games.js';
import { splitCountdown, deadlineLabel, esc } from './format.js';
import { ico } from './play.js';
import * as store from './store.js';

// 投票頁(3b): 進行中 = 左倒數 + 右選項; 結束 = 左勝出卡 + 右名次長條; 同票未定 = 結果統計中
const pg = document.getElementById('pg-vote'), cdnums = document.getElementById('cdnums'), vrows = document.getElementById('vrows');
const pad = n => String(n).padStart(2, '0');
const CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
const CROWN = '<span class="crown" aria-label="勝出"><svg viewBox="0 0 64 48" aria-hidden="true"><path d="M6 14l14 12L32 6l12 20 14-12-5 28H11z" fill="#ffd23f" stroke="#2d2144" stroke-width="4" stroke-linejoin="round"/><rect x="11" y="38" width="42" height="7" rx="2" fill="#f5a524" stroke="#2d2144" stroke-width="4"/><circle cx="32" cy="27" r="4" fill="#f45b52"/></svg></span>';
let state = { phase: 'loading' }, offset = 0, onZero = () => {}, onPick = () => {}, zeroFired = false;

export const serverNow = () => Date.now() + offset;

// 伺服器狀態進來時以它的 now 校正本機時鐘
export function setState(s, clientNow = Date.now()) {
  state = s;
  if (s.now != null) offset = s.now - clientNow;
  zeroFired = false;
  document.body.classList.toggle('vend', s.phase === 'ended');
  render();
}
export const getState = () => state;

function tick() {
  if (state.phase !== 'live') return;
  const left = state.round.endsAt - serverNow();
  const v = splitCountdown(left);
  cdnums.querySelectorAll('b').forEach(b => b.textContent = pad(v[b.dataset.u]));
  if (left <= 0 && !zeroFired) { zeroFired = true; onZero(); }
}

export function render() {
  const end = state.phase === 'ended';
  pg.classList.toggle('end', end);
  pg.classList.toggle('pending', end && !!state.results?.pending);
  pg.classList.toggle('none', state.phase === 'none' || state.phase === 'loading');
  document.getElementById('deadline').textContent = state.phase === 'live' ? deadlineLabel(state.round.endsAt) : '';
  const played = new Set(store.get('played', []));
  vrows.innerHTML = state.phase === 'loading' ? '' : state.phase === 'none' ? '<p class="vmsg">投票尚未開放</p>' : GAMES.map(g => `
    <div class="vr${state.myVote === g.code ? ' on' : ''}" role="radio" tabindex="0" aria-checked="${state.myVote === g.code}" data-k="${g.code}">
      <span class="rd">${CHECK}</span>${ico(g)}
      <span class="nm"><b>${esc(g.name)}</b><span class="st">${played.has(g.code)
        ? '<span class="tag-played">✓ 玩過了</span>'
        : `<span class="tag-un">還沒玩過</span><a class="gotry" href="#play/${g.code}">去試玩 ›</a>`}</span></span>
    </div>`).join('');
  const winbox = document.getElementById('winbox'), ranked = document.getElementById('ranked');
  const r = end ? state.results : null;
  if (r && !r.pending) {
    const w = byCode(r.winner);
    const rk = GAMES.map(g => ({ g, n: r.counts[g.code] || 0 }))
      .sort((a, b) => (b.g === w) - (a.g === w) || b.n - a.n); // 勝出款排第一(同票由後台指定時也一樣)
    const top = Math.max(1, ...rk.map(x => x.n));
    const wn = r.counts[w.code] || 0;
    winbox.innerHTML = `
      <span class="lb">投票結束 · 勝出</span>
      <div class="body">${w.banner ? `<img class="wbn" src="${esc(w.banner)}" alt="">` : ico(w, 'wi')}<div style="display:flex;flex-direction:column;gap:inherit"><span class="k">投票結束 · 勝出</span><b>${winName(w.name)}</b><span class="vs">${wn.toLocaleString()} 票 · 佔 ${r.total ? Math.round(wn / r.total * 100) : 0}%</span></div></div>`;
    ranked.innerHTML = `<h2>最終票數<small>共 ${r.total.toLocaleString()} 票</small></h2>` + rk.map(({ g, n }, i) => `
      <div class="vr rr${i === 0 ? ' first' : ''}">${i === 0 ? CROWN : ''}<span class="rk">${i + 1}</span>${ico(g)}<span class="rn">${esc(g.name)}</span>
        <span class="bar${n ? '' : ' zero'}"><i data-w="${n / top * 100}%">${n ? Math.round(n / r.total * 100) + '%' : ''}</i></span>
        <span class="vc"><b>${n.toLocaleString()}</b><small> 票</small></span></div>`).join('');
    fitResults();
    requestAnimationFrame(() => requestAnimationFrame(() => ranked.querySelectorAll('.bar i').forEach(i => i.style.width = i.dataset.w)));
  } else if (r) {
    winbox.innerHTML = '<span class="lb">投票結束</span><div class="body"><div style="display:flex;flex-direction:column;gap:inherit"><span class="k">投票結束</span><b>結果統計中</b><span class="vs">勝出遊戲將由工作室公布</span></div></div>';
    ranked.innerHTML = '';
  }
  tick();
}

// 勝出卡名稱: 「中文(英文)」拆成兩段, 換行時落在括號前
function winName(name) {
  const m = name.match(/^(.+?)([(（].*)$/);
  return m ? `<span class="nw">${esc(m[1])}</span><wbr><span class="nw">${esc(m[2])}</span>` : esc(name);
}

// 結果頁版面: 勝出卡名稱縮字到兩行內、不超出卡片; 名次各列名稱欄取最長名稱的寬度(上限為列寬 38%), 長條就能對齊
function fitResults() {
  if (!pg.classList.contains('end') || pg.classList.contains('pending')) return;
  const b = document.querySelector('#winbox .body b');
  if (b && b.offsetParent) {
    b.style.fontSize = '';
    let fs = parseFloat(getComputedStyle(b).fontSize);
    const min = Math.max(14, fs * 0.4);
    const fits = () => {
      const lh = parseFloat(getComputedStyle(b).lineHeight) || fs * 1.08;
      return b.scrollHeight <= lh * 2 + 2 && [b, ...b.querySelectorAll('.nw')].every(e => e.scrollWidth <= b.parentElement.clientWidth + 1);
    };
    while (!fits() && fs > min) { fs -= 2; b.style.fontSize = fs + 'px'; }
  }
  const rows = [...ranked.querySelectorAll('.rr')];
  if (!rows.length || !rows[0].offsetParent || getComputedStyle(rows[0]).display !== 'grid' || innerWidth <= 1000) { ranked.style.removeProperty('--rnw'); return; }
  ranked.style.setProperty('--rnw', 'max-content');
  const need = Math.max(...rows.map(r => r.querySelector('.rn').getBoundingClientRect().width));
  ranked.style.setProperty('--rnw', Math.ceil(Math.min(need, rows[0].clientWidth * 0.38)) + 'px');
}
let fitT;
addEventListener('resize', () => { clearTimeout(fitT); fitT = setTimeout(fitResults, 120); });

export function setVoteError(msg) {
  let el = pg.querySelector('.verr');
  if (!el) {
    el = document.createElement('p'); el.className = 'verr'; el.setAttribute('role', 'alert');
    document.querySelector('#pg-vote .vright.live').appendChild(el);
  }
  el.textContent = msg || '';
  el.hidden = !msg;
}

export function initVote(opts) {
  onZero = opts.onZero || onZero;
  onPick = opts.onPick || onPick;
  cdnums.innerHTML = [['d', '天'], ['h', '時'], ['m', '分'], ['s', '秒']].map(([k, u]) => `<div class="n${k === 's' ? ' sec' : ''}"><b data-u="${k}">00</b><i>${u}</i></div>`).join('');
  setInterval(tick, 1000);
  const pick = el => { if (state.phase === 'live' && el.dataset.k !== state.myVote) onPick(el.dataset.k); };
  vrows.addEventListener('click', e => { if (e.target.closest('.gotry')) return; const r = e.target.closest('.vr'); if (r) pick(r); });
  vrows.addEventListener('keydown', e => { const r = e.target.closest('.vr'); if (r && (e.key === ' ' || e.key === 'Enter')) { e.preventDefault(); pick(r); } });
}

// 選取後(或失敗還原後)把焦點留在打勾的那列
export function focusVoted() { vrows.querySelector('.vr.on')?.focus(); }
