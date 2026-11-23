import { byCode, tagOf } from './games.js';
import { esc } from './format.js';
import { track } from './analytics.js';

// 30 秒介紹影片: 點遊戲清單橫幅上的「30 秒介紹」(有影片的遊戲才有按鈕), 跳出置中彈窗播放(不是全螢幕)
// 影片跟網站放在一起(media/trailer-<代號>.mp4); 還沒有影片的遊戲先顯示「製作中」示意
let el = null, opener = null;

export function openTrailer(code, btn) {
  const g = byCode(code); if (!g) return;
  opener = btn || null;
  if (!el) {
    document.body.insertAdjacentHTML('beforeend', '<div class="trl" role="dialog" aria-modal="true" aria-labelledby="trlT"></div>');
    el = document.querySelector('.trl');
    el.addEventListener('click', e => { if (e.target === el || e.target.closest('.trl .x')) closeTrailer(); });
    addEventListener('keydown', e => { // 先攔下 Esc, 不讓手機抽屜跟著關
      if (e.key === 'Escape' && el.classList.contains('on')) { e.stopPropagation(); closeTrailer(); }
    }, true);
  }
  el.innerHTML = `<div class="box"><div class="top"><b id="trlT">${esc(tagOf(g))}</b><small>30 秒介紹</small><button type="button" class="x" aria-label="關閉">✕</button></div>
    <div class="tv">${g.trailer
      ? `<video src="${esc(g.trailer)}" ${g.banner ? `poster="${esc(g.banner)}"` : ''} controls autoplay playsinline preload="auto"></video>`
      : `<div class="soon"${g.banner ? ` style="background-image:url('${esc(g.banner)}')"` : ''}><span>介紹影片製作中</span></div>`}</div></div>`;
  el.classList.add('on');
  document.body.classList.add('trl-on');
  el.querySelector('.x').focus();
  track('trailer_open', { game: code, ready: !!g.trailer });
}

export function closeTrailer() {
  if (!el?.classList.contains('on')) return;
  el.querySelector('video')?.pause();
  el.classList.remove('on');
  document.body.classList.remove('trl-on');
  el.innerHTML = ''; // 關掉就停止下載
  opener?.focus();
}
