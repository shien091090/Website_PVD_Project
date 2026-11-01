// 4 款遊戲資料(前端與 API 共用)。名稱、介紹、時長、主色為暫定值, 等素材清單交來再換
// code: 網址用代號, 上線後不改; device: 建議裝置 pc / mobile(每款都支援兩種, 只是建議其一); icon: 圖示路徑, null 時用 letter 畫色塊; fg: 主色上的字色
export const GAMES = [
  { code: 'bubble-catcher', name: '捕泡手', letter: '捕', time: '5–15 分鐘', device: 'mobile', bg: '#4776c3', fg: '#ffffff', icon: null,
    intro: '跟著節奏接住落下的泡泡，連成一串就能衝上更高的關卡。（暫定介紹）' },
  { code: 'dungeon-zoo', name: '來馬戲團看一點大場面', letter: '來', time: '15–20 分鐘', device: 'pc', bg: '#f29cac', fg: '#2d2144', icon: 'media/games/dungeon-zoo.png', banner: 'media/games/dungeon-zoo-banner.png',
    intro: '深入地下城戰鬥、捕捉怪物，再送牠們上馬戲團舞台賺取掌聲和收益。攻略越深，陣容越熱鬧，一起炒熱全場氣氛吧！' },
  { code: 'jelly-jinni', name: '接力吉尼(Jelly Jinni)', letter: '接', time: '5–15 分鐘', device: 'pc', bg: '#e0c64f', fg: '#2d2144', icon: null,
    intro: '死掉不是結束！和上一代的自己攜手，接力跳躍、破解機關，共同抵達終點吧!' },
  { code: 'soul-smith-defense', name: '魂匠守衛者', letter: '魂', time: '12–20 分鐘', device: 'pc', bg: '#a8cf9c', fg: '#2d2144', icon: 'media/games/soul-smith-defense.png', banner: 'media/games/soul-smith-defense-banner.png',
    intro: '會衝上前砍怪的箭塔？拔敵人的攻擊招式來用？一款所有能力都能自由拼裝的塔防，發揮想像力守住主堡！' },
];
export const GAME_CODES = GAMES.map(g => g.code);
export const byCode = code => GAMES.find(g => g.code === code) || null;
