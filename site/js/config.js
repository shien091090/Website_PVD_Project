// 換影片: 替換 media/ 裡的檔案後改這裡。start = 影片中標題定格的秒數(從這裡接播才無縫);
// titleTop = 標題在 1920x1080 畫格中的上緣位置(px)。portrait 是手機直拿用的直版, 還沒有就填 null
export const VIDEO = {
  light: { landscape: { src: 'media/pvd-light.mp4', start: 0.8, titleTop: 435 }, portrait: null },
  dark: { landscape: { src: 'media/pvd-dark.mp4', start: 0.8, titleTop: 435 }, portrait: null },
};

// 公開金鑰(不是秘密)。turnstileSiteKey 目前是 Cloudflare 的測試鍵, 上線前換成正式的
// analyticsHosts: 只有這些網址送數據, 預覽網址(測試環境)不送; 之後綁自訂網域要加進來
export const SITE = {
  turnstileSiteKey: '1x00000000000000000000BB',
  posthogKey: '',
  posthogHost: 'https://us.i.posthog.com',
  analyticsHosts: ['pvd-project.pages.dev'],
};
