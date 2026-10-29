import { VIDEO } from './config.js';

// 首頁: 1920x1080 舞台等比縮放; 手機直向改直排; 「PVD計畫是什麼?」從標題定格處接播影片
const home = document.getElementById('home'), stage = document.getElementById('stage'),
      film = document.getElementById('film'), title = document.getElementById('title');
const keys = [...document.querySelectorAll('.key')];
let s = 1, col = false, theme = 'light', show = () => {};

const clip = () => {
  const v = VIDEO[theme] || VIDEO.light;
  return col && v.portrait ? v.portrait : v.landscape;
};

export function fit() {
  if (document.body.dataset.pg !== 'home') return;
  if (home.classList.contains('playing') || home.classList.contains('moving')) return;
  const H = document.getElementById('hero').clientHeight;
  s = Math.min(innerWidth / 1920, H / 1080);
  stage.style.setProperty('--s', s);
  title.classList.remove('col');
  title.style.setProperty('--x0', (1920 - title.offsetWidth) / 2 + 'px');
  col = H > innerWidth * 1.1;
  syncVideo();
  if (!col) return;
  let p = Math.min(innerWidth * .24, (H - 240) / 4.6) / s;
  const setP = () => { title.style.setProperty('--p', p + 'px'); title.style.setProperty('--g', p * .16 + 'px'); };
  setP();
  title.classList.add('col');
  // 以展開 Develop (含右邊按鈕) 後的寬度為準; 太寬就整體縮小, 展開時才不會超出兩側
  const widest = () => Math.max(...keys.map(k => k.offsetWidth + k.querySelector('.rest').scrollWidth), title.querySelector('.plan').offsetWidth);
  const room = (innerWidth - 32) / s;
  const W = widest();
  if (W > room) { p *= room / W; setP(); }
  title.style.setProperty('--cy', 540 - title.offsetHeight / 2 + 'px');
}

function syncVideo() {
  const c = clip();
  title.style.setProperty('--title-top', c.titleTop + 'px');
  if (!film.getAttribute('src') || !film.src.endsWith(c.src)) film.src = c.src;
}

export function setHomeTheme(t) { theme = t; syncVideo(); }

function flip(change, dur = 450) {
  const els = [...title.children], a = els.map(e => e.getBoundingClientRect());
  change();
  const b = els.map(e => e.getBoundingClientRect());
  els.forEach((e, i) => {
    e.style.transition = 'none'; e.style.transformOrigin = '0 0';
    e.style.transform = `translate(${(a[i].left - b[i].left) / s}px, ${(a[i].top - b[i].top) / s}px) scale(${a[i].height / b[i].height})`;
  });
  title.offsetWidth;
  els.forEach(e => { e.style.transition = `transform ${dur}ms cubic-bezier(.4,0,.2,1)`; e.style.transform = ''; });
  setTimeout(() => els.forEach(e => { e.style.transition = ''; e.style.transformOrigin = ''; }), dur + 30);
}

export function open(k) { keys.forEach(x => x.classList.toggle('open', x === k)); title.classList.toggle('focus', !!k); }

function restore() {
  home.classList.remove('playing'); document.body.classList.remove('lock');
  // 直排且播的是橫版: 標題從橫排位置滑回直排
  if (col && !(VIDEO[theme] || VIDEO.light).portrait) flip(() => title.classList.add('col')); else fit();
}

export function initHome(opts) {
  show = opts.show;
  const onVideo = opts.onVideo || (() => {});
  let lastPointer = 'mouse';
  keys.forEach(k => {
    k.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') open(k); });
    k.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') open(null); });
    k.addEventListener('pointerdown', e => { lastPointer = e.pointerType; });
    k.addEventListener('focus', () => { if (k.matches(':focus-visible')) open(k); });
    k.addEventListener('blur', () => open(null));
    k.addEventListener('click', e => {
      e.preventDefault();
      if (e.target.closest('.go')) return show(k.dataset.k);
      if (lastPointer !== 'mouse' && !k.classList.contains('open')) { open(k); return; }
      show(k.dataset.k);
    });
  });
  document.addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse' && !e.target.closest('.key')) open(null); });
  document.getElementById('what').addEventListener('click', () => {
    open(null);
    scrollTo(0, 0); document.body.classList.add('lock');
    const c = clip();
    film.currentTime = c.start;
    const reveal = () => { home.classList.remove('moving'); home.classList.add('playing'); };
    // 直排且沒有直版影片: 標題先滑回橫排位置再切影片
    if (col && c === (VIDEO[theme] || VIDEO.light).landscape) {
      home.classList.add('moving');
      flip(() => title.classList.remove('col'));
      setTimeout(reveal, 470);
    } else if (film.requestVideoFrameCallback) film.requestVideoFrameCallback(reveal);
    else film.addEventListener('playing', reveal, { once: true });
    film.play().catch(() => {});
    onVideo('play');
  });
  document.getElementById('close').addEventListener('click', () => {
    film.pause();
    home.classList.add('closing'); restore();
    setTimeout(() => home.classList.remove('closing'), 320);
  });
  film.addEventListener('ended', () => { restore(); onVideo('complete'); });
  document.querySelectorAll('[data-go]').forEach(b => b.addEventListener('click', () => show(b.dataset.go)));
  document.getElementById('more').addEventListener('click', e => { e.preventDefault(); document.getElementById('about').scrollIntoView({ behavior: 'smooth' }); });
  addEventListener('resize', fit);
  document.fonts.ready.then(fit);
}
