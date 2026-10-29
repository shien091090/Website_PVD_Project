// 留言頭像: 8 個 (底色, 表情); 留言只存頭像編號
const FACES = [
  '<circle cx="7.5" cy="9.5" r="1.3"/><circle cx="12.5" cy="9.5" r="1.3"/>',
  '<circle cx="7.5" cy="9" r="1.3"/><circle cx="12.5" cy="9" r="1.3"/><path d="M7.5 12.3q2.5 2.4 5 0" fill="none" stroke="#2d2144" stroke-width="1.3" stroke-linecap="round"/>',
  '<path d="M6 10l1.5-1.6L9 10M11 10l1.5-1.6L14 10" fill="none" stroke="#2d2144" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/><circle cx="10" cy="13" r="1"/>',
];
export const AV = [['#f29cac', 0], ['#aaefd5', 1], ['#f5e291', 2], ['#2fc9ed', 0], ['#4776c3', 1], ['#e0c64f', 2], ['#f5554a', 1], ['#aaefd5', 2]];
export const avHtml = i => {
  const [c, f] = AV[i] || AV[0];
  return `<span class="av" style="--c:${c}"><svg viewBox="0 0 20 20" fill="#2d2144" aria-hidden="true">${FACES[f]}</svg></span>`;
};
