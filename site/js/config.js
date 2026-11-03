// 換影片: 替換 media/ 裡的檔案後改這裡。start = 影片中標題定格的秒數(從這裡接播才無縫);
// titleTop = 標題在畫格中的上緣位置(px)。portrait 是手機直拿用的直版(1080x1920, 沒有就填 null):
// p = 影片裡色塊邊長, titleTop = P 色塊上緣; 手機頁的直排標題照這兩個值排, 跟影片第一格對齊(pvd-motion tools/probe-title.mjs 量)
export const VIDEO = {
  light: { landscape: { src: 'media/pvd-light.mp4', start: 0.8, titleTop: 435 }, portrait: { src: 'media/pvd-light-portrait.mp4', start: 0.8, p: 210, titleTop: 519.5 } },
  dark: { landscape: { src: 'media/pvd-dark.mp4', start: 0.8, titleTop: 435 }, portrait: { src: 'media/pvd-dark-portrait.mp4', start: 0.8, p: 210, titleTop: 519.5 } },
};

// 公開金鑰(不是秘密)。本機開發用 Cloudflare 的測試鍵(搭配 .dev.vars 的測試秘密)
// analyticsHosts: 只有這些網址送數據, 預覽網址(測試環境)不送; 之後綁自訂網域要加進來
const LOCAL = typeof location !== 'undefined' && location.hostname === 'localhost';
export const SITE = {
  turnstileSiteKey: LOCAL ? '1x00000000000000000000BB' : '0x4AAAAAAFs6CZTmU8e8OaYt',
  posthogKey: 'phc_p7DoFzypCWkAw29bz5zqhSSct6DkbdshjconoK7dyeBe',
  posthogHost: 'https://us.i.posthog.com',
  analyticsHosts: ['pvd-project.pages.dev'],
};
