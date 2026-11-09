// 留言頭像: 26×26 像素圖, 固定以 26px 顯示(一格對齊一個螢幕點, 不會糊); 留言只存頭像編號(順序固定, 新角色只能加在最後)
const BGS = ['#aaefd5', '#f29cac', '#f5e291', '#2fc9ed', '#4776c3', '#e0c64f', '#f5554a', '#aaefd5'];
const CHARS = [
  ['dog', '圓臉垂耳犬'],
  ['goblin', '大鼻禿頭長老'],
  ['ghost', '圓糰抱花靈'],
  ['dragon', '細頸蕈角龍'],
  ['whale', '尖鰭蜂蜜虎鯨'],
  ['owl', '橡果小梟'],
  ['candle', '燭淚精靈'],
  ['bunny', '飛行員兔兔'],
];
export const AV = CHARS.map(([file, name], i) => ({ name, bg: BGS[i % BGS.length], src: `media/avatars/${file}.png` }));
export const avHtml = i => {
  const a = AV[i] || AV[0];
  return `<span class="av" style="--c:${a.bg}"><img src="${a.src}" alt="" width="26" height="26"></span>`;
};
