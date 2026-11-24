import { byCode, tagOf } from './games.js';
import { esc } from './format.js';
import { track } from './analytics.js';

// 30 秒介紹影片: 點遊戲清單橫幅上的「30 秒介紹」(有影片的遊戲才有按鈕), 跳出置中彈窗播放(不是全螢幕)
// 影片跟網站放在一起(media/trailer-<代號>.mp4); 還沒有影片的遊戲先顯示「製作中」示意
let el = null, opener = null, ses = null; // ses: 這次開啟的觀看紀錄, 關掉時送出

export function openTrailer(code, btn) {
  const g = byCode(code); if (!g) return;
  opener = btn || null;
  if (!el) {
    document.body.insertAdjacentHTML('beforeend', '<div class="trl" role="dialog" aria-modal="true" aria-labelledby="trlT"></div>');
    el = document.querySelector('.trl');
    el.addEventListener('click', e => {
      if (e.target === el) closeTrailer('backdrop'); else if (e.target.closest('.trl .x')) closeTrailer('x');
    });
    addEventListener('keydown', e => { // 先攔下 Esc, 不讓手機抽屜跟著關
      if (e.key === 'Escape' && el.classList.contains('on')) { e.stopPropagation(); closeTrailer('esc'); }
    }, true);
    addEventListener('pagehide', () => sendClose('leave')); // 開著影片直接關分頁或離開網站
  }
  el.innerHTML = `<div class="box"><div class="top"><b id="trlT">${esc(tagOf(g))}</b><small>30 秒介紹</small><button type="button" class="x" aria-label="關閉">✕</button></div>
    <div class="tv">${g.trailer
      ? `<video src="${esc(g.trailer)}" ${g.banner ? `poster="${esc(g.banner)}"` : ''} controls autoplay playsinline preload="auto"></video>`
      : `<div class="soon"${g.banner ? ` style="background-image:url('${esc(g.banner)}')"` : ''}><span>介紹影片製作中</span></div>`}</div></div>`;
  el.classList.add('on');
  document.body.classList.add('trl-on');
  el.querySelector('.x').focus();
  sendClose('reopen');
  ses = { game: code, t0: performance.now(), maxSec: 0, dur: 0, done: false };
  const v = el.querySelector('video');
  if (v) {
    const s = ses;
    v.addEventListener('timeupdate', () => { s.maxSec = Math.max(s.maxSec, v.currentTime); s.dur = v.duration || s.dur; });
    v.addEventListener('ended', () => { s.done = true; });
  }
  track('trailer_open', { game: code });
}

// 關掉時送一筆: 開著多久(從點開算, 含載入)、看到影片的幾 %、有沒有播到結尾、怎麼關的
function sendClose(how) {
  if (!ses) return;
  const s = ses; ses = null;
  track('trailer_close', {
    game: s.game, how, open_ms: Math.round(performance.now() - s.t0),
    watched_pct: s.done ? 100 : s.dur ? Math.min(100, Math.round(s.maxSec / s.dur * 100)) : 0, completed: s.done,
  }, how === 'leave' ? { transport: 'sendBeacon' } : undefined);
}

export function closeTrailer(how = 'other') {
  if (!el?.classList.contains('on')) return;
  sendClose(how);
  el.querySelector('video')?.pause();
  el.classList.remove('on');
  document.body.classList.remove('trl-on');
  el.innerHTML = ''; // 關掉就停止下載
  opener?.focus();
}
