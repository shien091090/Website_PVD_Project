// 4 款遊戲資料(前端與 API 共用)。名稱、介紹、時長、主色為暫定值, 等素材清單交來再換
// code: 網址用代號, 上線後不改; icon: 圖示路徑, null 時用 letter 畫色塊; fg: 主色上的字色
export const GAMES = [
  { code: 'bubble-catcher', name: '捕泡手', letter: '捕', time: '5–15 分鐘', mobile: false, bg: '#4776c3', fg: '#ffffff', icon: null,
    intro: '跟著節奏接住落下的泡泡，連成一串就能衝上更高的關卡。（暫定介紹）' },
  { code: 'slime-tetris', name: '史萊姆擴張', letter: '史', time: '5–15 分鐘', mobile: false, bg: '#aaefd5', fg: '#2d2144', icon: null,
    intro: '把落下的史萊姆排好位置，讓同色的史萊姆擴張佔滿版面。（暫定介紹）' },
  { code: 'dungeon-zoo', name: '來馬戲團看一點大場面', letter: '來', time: '18–30 分鐘', mobile: true, bg: '#f29cac', fg: '#2d2144', icon: 'media/games/dungeon-zoo.png',
    intro: '深入地下城戰鬥、捕捉怪物，再送牠們上馬戲團舞台賺取掌聲和收益。攻略越深，陣容越熱鬧，一起炒熱全場氣氛吧！' },
  { code: 'ghost-echo', name: '幽影接力', letter: '幽', time: '5–15 分鐘', mobile: false, bg: '#e0c64f', fg: '#2d2144', icon: null,
    intro: '跟著上一輪自己留下的影子接力前進，一起抵達終點。（暫定介紹）' },
];
export const GAME_CODES = GAMES.map(g => g.code);
export const byCode = code => GAMES.find(g => g.code === code) || null;
