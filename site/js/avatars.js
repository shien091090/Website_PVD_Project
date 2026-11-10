// 留言頭像: 26×26 像素圖, 固定以 26px 顯示(一格對齊一個螢幕點, 不會糊); 留言只存頭像編號(順序固定, 新角色只能加在最後)
const BGS = ['#aaefd5', '#f29cac', '#f5e291', '#2fc9ed', '#4776c3', '#e0c64f', '#f5554a', '#aaefd5'];
const CHARS = [
  ['dog', '長角狗勾'],
  ['goblin', '老老哥布林'],
  ['ghost', '送花小幽靈'],
  ['dragon', '長比鼻幼龍'],
  ['whale', '蜂蜜大鯨鯊'],
  ['owl', '橡實小小梟'],
  ['candle', '快燒完的小燭精'],
  ['bunny', '飛行員兔兔'],
];
export const AV = CHARS.map(([file, name], i) => ({ name, bg: BGS[i % BGS.length], src: `media/avatars/${file}.png` }));
export const avHtml = i => {
  const a = AV[i] || AV[0];
  return `<span class="av" style="--c:${a.bg}"><img src="${a.src}" alt="" width="26" height="26"></span>`;
};

// 像素對齊: 每張頭像圖對齊到螢幕點, 外框依圖的實際大小貼合, 一格固定佔整數個螢幕點(125%、150% 這類非整數縮放就用 1 點/格, 圖會略小但不糊)
function snapAll() {
  const d = window.devicePixelRatio || 1, k = Math.max(1, Math.floor(d + 0.01)), size = 26 * k / d;
  const frame = Math.round((size + 6) * d) / d + 'px'; // 外框 = 圖 + 兩側各 1px 空隙 + 2px 邊, 框貼著圖
  document.querySelectorAll('.av img').forEach(img => {
    Object.assign(img.parentElement.style, { width: frame, height: frame });
    const box = img.parentElement.getBoundingClientRect();
    if (!box.width) return;
    Object.assign(img.style, { width: size + 'px', height: size + 'px', margin: '0', left: '0', top: '0', transform: 'none' });
    const r = img.getBoundingClientRect(), s = r.width / size || 1; // s: 祖先有縮放(滑過放大)時的比例
    const x = Math.round((box.left + (box.width - size * s) / 2) * d) / d, y = Math.round((box.top + (box.height - size * s) / 2) * d) / d;
    img.style.transform = `translate(${(x - r.left) / s}px,${(y - r.top) / s}px)`;
  });
}
let queued = false;
const later = () => { if (!queued) { queued = true; queueMicrotask(() => { queued = false; snapAll(); }); } };
if (typeof document !== 'undefined') {
  new MutationObserver(ms => { if (ms.some(m => !(m.type === 'attributes' && m.target.matches?.('.av, .av img')))) later(); }).observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'style', 'hidden'] });
  ['resize', 'transitionend', 'animationend', 'load', 'pointerover', 'pointerout'].forEach(e => addEventListener(e, later, true));
  document.fonts?.ready.then(later);
  later();
}
