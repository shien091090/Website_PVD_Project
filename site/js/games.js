// 4 款遊戲資料(前端與 API 共用)。名稱、介紹、時長、主色為暫定值, 等素材清單交來再換
// code: 網址用代號, 上線後不改; icon: 圖示路徑, null 時用 letter 畫色塊; fg: 主色上的字色
// 依時長由短到長: 先比下限, 再比上限
export const byTime = (a, b) => {
  const [a1, a2 = a1] = a.time.match(/\d+/g).map(Number), [b1, b2 = b1] = b.time.match(/\d+/g).map(Number);
  return a1 - b1 || a2 - b2;
};

export const GAMES = [
  { code: 'bubble-tempo', name: 'Bubble Tempo', letter: 'B', time: '2–5 分鐘', bg: '#aaefd5', fg: '#2d2144', icon: 'media/games/bubble-tempo.png', banner: 'media/games/bubble-tempo-banner.png', pattern: 'media/games/bubble-tempo-pattern.png',
    intro: '指尖拖著節奏泡泡，染色、瞄準、對上拍子！在風格各異的關卡裡跟上越來越快的音樂，挑戰你的反應力與節奏感！' },
  { code: 'dungeon-zoo', name: '來馬戲團看一點大場面', letter: '來', time: '15–25 分鐘', bg: '#f29cac', fg: '#2d2144', icon: 'media/games/dungeon-zoo.png', banner: 'media/games/dungeon-zoo-banner.png', pattern: 'media/games/dungeon-zoo-pattern.png',
    intro: '深入地下城戰鬥、捕捉怪物，再送牠們上馬戲團舞台賺取掌聲和收益。攻略越深，陣容越熱鬧，一起炒熱全場氣氛吧！' },
  { code: 'jelly-jinni', name: '接力吉尼(Jelly Jinni)', letter: '接', time: '5–10 分鐘', bg: '#4776c3', fg: '#ffffff', icon: 'media/games/jelly-jinni.png', banner: 'media/games/jelly-jinni-banner.png', pattern: 'media/games/jelly-jinni-pattern.png',
    intro: '死掉不是結束！和上一代的自己攜手，接力跳躍、破解機關，共同抵達終點吧!' },
  { code: 'soul-smith-defense', name: '魂匠守衛者', letter: '魂', time: '10–20 分鐘', bg: '#a8cf9c', fg: '#2d2144', icon: 'media/games/soul-smith-defense.png', banner: 'media/games/soul-smith-defense-banner.png', pattern: 'media/games/soul-smith-defense-pattern.png',
    intro: '會衝上前砍怪的箭塔？拔敵人的攻擊招式來用？一款所有能力都能自由拼裝的塔防，發揮想像力守住主堡！' },
].sort(byTime);
export const GAME_CODES = GAMES.map(g => g.code);
export const byCode = code => GAMES.find(g => g.code === code) || null;
