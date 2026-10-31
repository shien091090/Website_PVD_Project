'use strict';
/* 來馬戲團看一點大場面(打磨版第 9 輪)— 玩法驗證 Demo。只用方向鍵 + Z、X, 地下城另有空白鍵(拋捕捉繩)。
   邏輯與繪製分離: update(dt) 改狀態, render() 呼叫 Art.drawXxx。 */

// ───────────────────────── 基本工具 ─────────────────────────
const CW = (Art.canvas && Art.canvas.width) || 1680;
const CH = (Art.canvas && Art.canvas.height) || 720;
// 畫面 1680×720 = 原本 1280×720 的設計區置中、左右各多 OX。所有畫面先平移 OX 再畫, 介面座標維持原 1280 設計值;
// 兩側由美術的整面底色補滿; 地下城鏡頭可視寬 = CW, 顯示範圍是設計座標 -OX ~ DW+OX。
const DW = 1280, OX = (CW - DW) / 2;
const DAY_MAX = 4;
const START_GOLD = 40;                     // 第 1 天開局 / 重來開局的底金(見習表演沒有金幣)
const WAIT_SECS = 5;                       // 暗號「過 5 秒」
const GUIDE_SHOW_AT = 4.0;                 // 見習表演暫停式引導開演後幾秒暫停
const SHOW_SECS = 30;                     // 正式表演秒數
const STAR_AT = [1050, 2100, 3150];        // 評星門檻
const SHELF_FAME = [200, 500, 1000];           // 商店上架名聲門檻(0 一開始就上架)
const ROWS = 4;                            // 暗號節目單列數
const TIERS = ['quiet', 'clap', 'cheer', 'frenzy'];
const LOOSE_LINE = 92;                     // 失控線(全場平均熱度 %)
const D2R = Math.PI / 180;
const rnd = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
function normAng(a) { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; }
function fmtNum(v) { return String(+v.toFixed(2)); }


// ───────────────────────── 聲音(全部走這一層; Sound 不存在也不會壞) ─────────────────────────
const Snd = {
  muted: false, ready: false, want: null, cur: undefined, frame: {}, crowdCur: '',
  // 循環觀眾聲(安靜段 = ''); Sound 沒有 setCrowd 就略過
  crowd(n) {
    n = n || '';
    if (n === this.crowdCur) return;
    this.crowdCur = n;
    try { if (typeof Sound !== 'undefined' && Sound.setCrowd) Sound.setCrowd(n); } catch (e) { console.error(e); }
  },
  init() {
    if (this.ready) return;
    this.ready = true;
    try { if (typeof Sound !== 'undefined' && Sound.init) Sound.init(); } catch (e) { console.error(e); }
    this.cur = undefined; this.sync();
  },
  play(n, a) {
    if (this.muted || !this.ready) return;
    try { if (typeof Sound !== 'undefined' && Sound.play) Sound.play(n, a); } catch (e) { console.error(e); }
  },
  once(n, a) { if (this.frame[n]) return; this.frame[n] = true; this.play(n, a); },
  music(n) { this.want = n; this.sync(); },
  sync() {
    if (!this.ready) return;
    const w = this.muted ? null : this.want;
    if (w === this.cur) return;
    this.cur = w;
    try {
      if (typeof Sound === 'undefined') return;
      if (w) { if (Sound.playMusic) Sound.playMusic(w); }
      else if (Sound.stopMusic) Sound.stopMusic();
      else if (Sound.playMusic) Sound.playMusic(null);
    } catch (e) { console.error(e); }
  },
  duckCur: false,
  // 出口詢問框、換武器視窗開著時音樂壓低一半
  duck(b) {
    b = !!b;
    if (b === this.duckCur) return;
    this.duckCur = b;
    try { if (typeof Sound !== 'undefined' && Sound.setMusicDuck) Sound.setMusicDuck(b); } catch (e) { console.error(e); }
  },
  toggleMute() {
    this.muted = !this.muted;
    try { if (typeof Sound !== 'undefined' && Sound.setMuted) Sound.setMuted(this.muted); } catch (e) { console.error(e); }
    this.sync();
  },
};

// ───────────────────────── 資料表 ─────────────────────────
const SPECIES = ['monkey', 'beetle', 'parrot', 'hedgehog', 'lily', 'penguin', 'tanuki'];
const SP = {
  monkey:   { name: '火柴猴',   hp: 7,  effect: 'ignite', interval: 3.0, decay: 2,   rep: 1, kill: 3, desc: '丟出直直飛的火柴, 穿過的都會〔生氣〕', skill: 'match' },
  beetle:   { name: '齒輪甲蟲', hp: 12, effect: 'ignite', interval: 3.8, decay: 2,   rep: 1, kill: 5, desc: '轉圈噴出一串齒輪, 打中會〔生氣〕', skill: 'gear' },
  parrot:   { name: '標靶鸚鵡', hp: 12, effect: 'target', interval: 2.6, decay: 2,   rep: 1, kill: 5, desc: '羽毛射中的變成大家的〔標靶〕', skill: 'feather' },
  hedgehog: { name: '爆竹刺蝟', hp: 12, effect: 'ignite', interval: 3.4, decay: 2,   rep: 2, kill: 6, desc: '朝對手丟爆竹, 炸到的都會〔生氣〕', skill: 'firecracker' },
  lily:     { name: '鈴蘭精',   hp: 10, effect: 'calm',   interval: 3.0, decay: 2,   rep: 2, kill: 6, desc: '朝對手撒三發花粉, 打中會〔冷靜〕', skill: 'pollen' },
  penguin:  { name: '冰柱企鵝', hp: 16, effect: 'freeze', interval: 3.0, decay: 1.5, rep: 2, kill: 7, desc: '一道冰柱射線, 打中的〔凍住〕不動', skill: 'icebeam' },
  tanuki:   { name: '戲法狸',   hp: 18, effect: 'warp',   interval: 3.6, decay: 1.5, rep: 2, kill: 8, desc: '紙牌射中的會被〔變走〕到別處', skill: 'card' },
};
const NEST_CH = { m: 'monkey', g: 'beetle', p: 'parrot', h: 'hedgehog', l: 'lily', q: 'penguin', k: 'tanuki' };
const PROJ = {
  pollen:  { speed: 160, r: 12, life: 4 },
  match:   { speed: 200, r: 14, life: 2.4 },
  gear:    { speed: 150, r: 10, life: 4 },
  feather: { speed: 260, r: 12, life: 3 },
  card:    { speed: 200, r: 12, life: 3 },
};

// 暗號(看全場)與表演卡; price / fame 只有商店賣的才有意義
const CUES = [
  { key: 'wait',     name: '過 5 秒',      desc: '上一張表演卡演完 5 秒後',        price: 0,  fame: 0 },
  { key: 'cold',     name: '冷場',         desc: '一半以上的魔物冷掉了',          price: 40, fame: 0, lock: 'd2' },   // 第 2 座開放後才上架(不看名聲)
  { key: 'angry3',   name: '三隻怪物生氣', desc: '場上同時有 3 隻生氣',           price: 40, fame: 0 },
  { key: 'multi3',   name: '一招 3 隻',    desc: '有一招打中 3 隻以上',           price: 100, fame: 500 },
  { key: 'target1',  name: '有人當標靶',   desc: '有一隻正被當成標靶',            price: 80, fame: 500 },
  { key: 'gain30',   name: '當觀眾更滿意', desc: '這列輪到後觀眾滿意度又多了 30',  price: 70, fame: 200 },
  { key: 'cheering', name: '觀眾在喝采',   desc: '觀眾正在喝采',                  price: 50, fame: 0 },
];
const PROGS = [
  { key: 'parade',   name: '繞場',   desc: '大家繞著全場走 5 秒',          price: 30, fame: 0 },
  { key: 'scatter',  name: '散場',   desc: '大家互相遠離 3 秒',            price: 40, fame: 0 },
  { key: 'gather',   name: '聚集',   desc: '大家互相靠近 3 秒',            price: 60, fame: 200 },
  { key: 'rush',     name: '衝撞',   desc: '最生氣的那隻追著別隻衝撞 5 秒', price: 0,  fame: 0 },
  { key: 'shuffle',  name: '魔術箱', desc: '全場洗牌換位置',              price: 80, fame: 200 },
  { key: 'rain',     name: '下雨',   desc: '讓所有生氣的怪物都冷靜一點',   price: 40, fame: 0 },
  { key: 'keg',      name: '炸藥桶', desc: '丟炸藥桶進場 炸到的都生氣',    price: 130, fame: 500 },
  { key: 'confetti', name: '大彩炮', desc: '把場上的飛彈收成一發大彩炮',   price: 180, fame: 1000 },
];
const CUE_BY = {}; CUES.forEach(c => { CUE_BY[c.key] = c; });
const PROG_BY = {}; PROGS.forEach(c => { PROG_BY[c.key] = c; });

// 地下城: 層的 boosts / chests 座標 = (列, 欄); 啟動時會核對地圖上該格真的是 B / C
const MEADOW_MAP = [
  '######################',
  '#....................#',
  '#..m.............m...#',
  '#....................#',
  '#.........o..........#',
  '#....................#',
  '#......o.......o.....#',
  '#....................#',
  '#.........S..........#',
  '#....................#',
  '######################'];
const DUNGEONS = {
  meadow: { name: '見習草地', species: ['monkey'], floors: [{ style: 'meadow', map: MEADOW_MAP, boosts: [], chests: [] }] },
  d1: {
    name: '湖畔鐘塔', species: ['monkey', 'beetle', 'parrot'],
    floors: [
      { style: 'lake',
        map: [
          '################################',
          '#........#..........#..........#',
          '#..m..Y..#..GG......#..Y...m...#',
          '#....o...G..GG..C...G...o....D.#',
          '#..GG....#....WW....#....GG....#',
          '#..GG..B.#....WW....#....GG....#',
          '#........#..........#..........#',
          '####..########....########..####',
          '####..########....########..####',
          '#........#..........#..........#',
          '#...W..Y.#..o...GG..#..Y.W.....#',
          '#........G......GG..G.......C..#',
          '#.....o..#..........#.....g....#',
          '#..m..GG.#....S.....#..o....B..#',
          '#.....GG.#........E.#..........#',
          '################################'],
        boosts: [[5, 7, 'heart'], [13, 28, 'rope']],
        chests: [[3, 16, 'gold', 25], [11, 28, 'gold', 25]] },
      { style: 'tower',
        map: [
          '################################',
          '#........#..........#..........#',
          '#..g..L..#....K.....#...L..p.E.#',
          '#....K...X....oo....X..........#',
          '#.L......#..........#......L.C.#',
          '#....W...#.........B#..........#',
          '#........#..........#....K.p...#',
          '####..########....########..####',
          '####..########....########..####',
          '#........#..........#..........#',
          '#....L.K.#..L....L..#..W.......#',
          '#........X..........X..K.....C.#',
          '#..W..B..#..........#..........#',
          '#.g...o..#..U.S.....#...L..m...#',
          '#..K.....#..........#..........#',
          '################################'],
        boosts: [[5, 19, 'atk'], [12, 6, 'rope']],
        chests: [[4, 29, 'key', 'd2key'], [11, 29, 'gold', 40]] },
    ],
  },
  d2: {
    name: '雪境冰窟', species: ['hedgehog', 'lily', 'penguin', 'tanuki'],
    floors: [
      { style: 'snow',
        map: [
          '################################',
          '#........#..........#..........#',
          '#..h.....#..........#..L....l..#',
          '#...L...............#..........#',
          '#......W.#....LL....#....o.....#',
          '#.B......#....C.........D......#',
          '#...o....#..........#..W.......#',
          '####..########....########..####',
          '####..########....########..####',
          '#........#..........#..........#',
          '#..L.....#..o....o..#.....L....#',
          '#...................#..........#',
          '#....W...#....F.....#..l....B..#',
          '#.h......#....S.....#.....W....#',
          '#........#........E.#..........#',
          '################################'],
        boosts: [[5, 2, 'atk'], [12, 28, 'rope']],
        chests: [[5, 14, 'gold', 40]] },
      { style: 'snow',
        map: [
          '################################',
          '#........#..........#..........#',
          '#..q.....#.1....2...#..L....q..#',
          '#...L....#..........#..........#',
          '#......W.#....LL....#....o.....#',
          '#.1......#....C.....#.......2..#',
          '#...o....#..........#..W..D....#',
          '####..########....########..####',
          '####..########....########..####',
          '#........#..........#..........#',
          '#..L.....#..o....o..#.....L....#',
          '#........#..........#..........#',
          '#....W...#..........#..l....B..#',
          '#.h......#..U.S.....#.....W....#',
          '#........#..........#..........#',
          '################################'],
        boosts: [[12, 28, 'rope']],
        chests: [[5, 14, 'gold', 50]] },
      { style: 'snow',
        map: [
          '################################',
          '#........#..........#..........#',
          '#..k.....#..........#..L....k..#',
          '#...L...............#....h.....#',
          '#......W.#....LL....#....o.....#',
          '#.B......#..........#.......E..#',
          '#...o....#....C.F...#..W.......#',
          '####..########....########..####',
          '####..########....########..####',
          '#........#..........#..........#',
          '#..L.....#..o....o.....L....q..#',
          '#...................#..........#',
          '#....W...#..........#..l....B..#',
          '#.h......#..U.S.....#.....W....#',
          '#........#..........#..........#',
          '################################'],
        boosts: [[5, 2, 'heart'], [12, 28, 'atk']],
        chests: [[6, 14, 'gold', 60]] },
    ],
  },
};
const DUNGEON_ORDER = ['d1', 'd2'];
const BOOST_NAME = { heart: '血量上限 +1', rope: '捕捉繩 +1', atk: '攻擊力 +1' };
const BOOST_TEXT = { heart: '血量上限 +1!', rope: '捕捉繩 +1!', atk: '攻擊力 +1!' };
const BOOST_TOTAL = 9, CARD_TOTAL = 13;
const HEART_CAP = 7;                       // 血量上限最多 7(血量石碑只剩 2 個)
const TIME_LIMIT = 120;
const KEY_INFO = { name: '雪境冰窟的鑰匙', desc: '打開第 2 座地下城' };
function cardInfo(key) { return key === 'd2key' ? KEY_INFO : (CUE_BY[key] || PROG_BY[key]); }
function cardName(key) { return cardInfo(key).name; }
// 這座地下城還剩幾個寶箱 / 石碑
function leftCount(id, what, kindIs) {   // kindIs: 'key' = 只算鑰匙寶箱, 'gold' = 只算金幣寶箱
  let n = 0;
  DUNGEONS[id].floors.forEach((f, fi) => {
    for (const o of f[what]) if ((!kindIs || (kindIs === 'key') === (o[2] === 'key')) &&!(what === 'chests' ? G.openedChests : G.usedBoosts)[id + ':' + fi + ':' + o[0] + ':' + o[1]]) n++;
  });
  return n;
}
const TILE = 60;

// 房間(世界座標, 3 座地下城共用); 活動範圍 = 房間內縮 30
const ROOM_X = [[60, 540], [600, 1200], [1260, 1860]];
const ROOM_Y = [[60, 420], [540, 900]];
function roomOf(x, y) { return (y < 480 ? 0 : 1) * 3 + (x < 570 ? 0 : x < 1230 ? 1 : 2); }
function roomBounds(room) {
  if (D && D.id === 'meadow') return { x0: 90, x1: 1230, y0: 90, y1: 570 };
  const cx = room % 3, cy = Math.floor(room / 3);
  return { x0: ROOM_X[cx][0] + 30, x1: ROOM_X[cx][1] - 30, y0: ROOM_Y[cy][0] + 30, y1: ROOM_Y[cy][1] - 30 };
}
const SHOW_B = { x0: 100, x1: 1180, y0: 186, y1: 526 };
const ARENA = { x0: 60, x1: 1220, y0: 146, y1: 566 };
const SHOW_POS = [[380, 260], [900, 260], [380, 450], [900, 450], [640, 356], [180, 220], [1100, 220], [180, 490], [1100, 490], [640, 220],
  [640, 490], [180, 356], [1100, 356], [510, 356], [770, 356], [510, 220], [770, 490], [770, 220], [510, 490], [300, 356]];



// ───────────────────────── 全域狀態 ─────────────────────────
let G = null;       // 整輪遊戲
let D = null;       // 地下城
let S = null;       // 表演場
let scene = 'title';
let CAL = null;     // 日曆過場
let PL = null;      // 出發準備
let SEL = { cur: 0 };
let WS = null;      // 選武器
let IM = null;      // 進場過場
let DR = null;      // 地下城結算
let SR = null;      // 表演結算
let RS = null;      // 總結算
let TITLE_T = 0;
let tutorialDone = false;   // 見習日完成過(本次開啟網頁內)
let cardSeen = false;       // 本次開啟網頁看過「拿到卡」過場(第一次多一行提示)
const keys = { up: false, down: false, left: false, right: false, z: false, x: false, space: false };
let pressed = {};

function emptyRows() { const r = []; for (let i = 0; i < ROWS; i++) r.push({ cue: '', prog: '' }); return r; }

function newRun(replay) {
  G = {
    day: replay ? 1 : 0, gold: START_GOLD, rep: 0, goldEarned: 0, chestGold: 0, chestsOpened: 0, bestChain: 0, maxOnStage: 0,
    weapon: 'club', ownedWeapons: { club: true },
    heartMax: 5, ropeMax: 5, atk: 0,
    bank: [],
    unlocked: { d1: true, d2: false },
    unlockQueue: [], shelfSeen: {},
    usedBoosts: {}, openedChests: {}, newCards: {}, cardsGot: 0, boostsGot: 0, keyDay: 0, editT: 0, stagePopT: 0.3,
    ownedCues: { wait: true }, ownedProgs: { rush: true }, shopSeen: {},
    rows: emptyRows(), stageInit: false,
    log: ['', '', '', ''], todayD: '',
    s1: { cur: 0, top: 0, zone: 'grid', back: 0 },
    s2: { row: 0, col: 0, panel: null },
    shop: { tab: 0, zone: 'tab', idx: 0, col: 0, from: 'dungeon', enterT: 0, bought: [], pop: null, buyWait: null, cg: null },
  };
  if (replay) { for (let i = 0; i < 3; i++) addMonster('monkey', false); }   // 見習草地收服 3 隻 → 重來也是 3 隻
  D = null; S = null;
}

function musicFor(sc) {
  switch (sc) {
    case 'title': case 'calendar': case 'prep': case 'select': return 'title';
    case 'weapon': case 'dungeon': return 'dungeon';
    case 'intermission': case 'setup1': case 'setup2': case 'shop': return 'setup';
    case 'show': return 'show';
    case 'dresult': case 'sresult': case 'result': return 'result';
  }
  return null;
}
function setScene(s) {
  scene = s;
  pressed = {};
  keys.z = false; keys.x = false; keys.space = false;   // 轉場後的動作要重新按
  if (s !== 'show') Snd.crowd('');
  Snd.music(musicFor(s));
}

// ───────────────────────── 怪物庫(每隻獨立) ─────────────────────────
function bankSort() { G.bank.sort((a, b) => SPECIES.indexOf(a.sp) - SPECIES.indexOf(b.sp) || a.num - b.num); }
function addMonster(sp, on) {
  let num = 0; for (const b of G.bank) if (b.sp === sp && b.num > num) num = b.num;
  const m = { sp, num: num + 1, on: !!on };
  G.bank.push(m); bankSort();
  return m;
}
function stageCount() { let n = 0; for (const b of G.bank) if (b.on) n++; return n; }
function ropeMaxNow() { return D && D.id === 'meadow' ? 3 : G.ropeMax; }   // 見習草地 3 條
function xCdBase(w) { return w === 'sword' ? 3 : w === 'spear' ? 1.2 : 0; }
function xCdMax() { return D && D.tamer ? xCdBase(D.tamer.weapon) : xCdBase(G.weapon); }
const STAGE_MAX_TUT = 3;   // 見習表演 3 隻全上台

// 名聲剛跨過上架門檻 → 出發準備冒「商店上架新東西」(同時跨過多段只冒一次)
function checkUnlock() {
  let shelf = false;
  for (const f of SHELF_FAME) if (G.rep >= f && !G.shelfSeen[f]) { G.shelfSeen[f] = true; shelf = true; }
  if (shelf && G.unlockQueue.indexOf('shelf') < 0) G.unlockQueue.push('shelf');
}

function stageLimit() { return G.day === 0 ? STAGE_MAX_TUT : 20; }
function monsterInfoState(b, x, y) {
  return { x, y, species: b.sp, num: b.num, desc: SP[b.sp].desc, effect: SP[b.sp].effect };
}

// ───────────────────────── 輸入(只掛鍵盤) ─────────────────────────
function keyName(e) {
  switch (e.code) {
    case 'ArrowUp': return 'up'; case 'ArrowDown': return 'down';
    case 'ArrowLeft': return 'left'; case 'ArrowRight': return 'right';
    case 'KeyZ': return 'z'; case 'KeyX': return 'x'; case 'Space': return 'space';
  }
  switch (e.key) {
    case 'ArrowUp': return 'up'; case 'ArrowDown': return 'down';
    case 'ArrowLeft': return 'left'; case 'ArrowRight': return 'right';
    case 'z': case 'Z': return 'z'; case 'x': case 'X': return 'x'; case ' ': case 'Spacebar': return 'space';
  }
  return null;
}
// 按下 / 放開 / 全放開: 鍵盤與觸控按鈕(touch.js)共用同一條路徑
function inputDown(k) {
  if (window.PVDX && PVDX.paused) return;   // 網站暫停 / 直拿提示 / Esc 暫停中不收輸入
  Snd.init();
  keys[k] = true;
  pressed[k] = true;
  if (TUT.cur && TUT.cur.phase === 'show') TUT.cur.pk[k] = true;
}
function inputUp(k) { keys[k] = false; }
function inputReset() {
  for (const k in keys) keys[k] = false;
  pressed = {};
}
window.addEventListener('keydown', function (e) {
  // M: 靜音開關(通用鍵, 哪個畫面都能按; 和出發準備的聲音按鈕切同一個設定)
  if (e.code === 'KeyM' || e.key === 'm' || e.key === 'M') {
    e.preventDefault();
    if (e.repeat || (window.PVDX && PVDX.paused)) return;
    Snd.init(); Snd.toggleMute(); Snd.play('ui_confirm');
    return;
  }
  const k = keyName(e);
  if (!k) return;
  e.preventDefault();
  if (e.repeat) return;
  inputDown(k);
});
window.addEventListener('keyup', function (e) {
  const k = keyName(e);
  if (!k) return;
  e.preventDefault();
  inputUp(k);
});
window.addEventListener('blur', function () {
  inputReset();
});


/// ───────────────────────── 新手教學(29 階段) ─────────────────────────
// 已完成階段記在本次開啟網頁的記憶裡(整關重來、失敗重來都不重置)
// 第 7 階段是「附註」: 不佔主階段位置, 另存在 TUT.note, 和主階段同時顯示
// 第 13~16、21~25 階段是暫停式引導卡: 由下方 GD(引導狀態)負責, 不走泡泡的 TUT.cur
const TUT = { done: {}, trig: {}, cur: null, note: null, escMon: null };
function tut(flag) { if (TUT.cur && TUT.cur.phase === 'show') TUT.cur.flags[flag] = true; }
function tutTrig(id) { if (!TUT.done[id]) TUT.trig[id] = true; }
function inMeadow() { return scene === 'dungeon' && D && D.id === 'meadow'; }
function inDungeon() { return scene === 'dungeon' && !!D; }
function inD1F1() { return inDungeon() && D.id === 'd1' && D.fi === 0; }
function scr(wx, wy) { const c = camOf(); return { x: wx - c.x, y: wy - c.y }; }
function nearestMon() {
  if (!D) return null;
  const T = D.tamer; let best = null, bd = 1e9;
  for (const m of D.mons) { if (m.dead) continue; const d = dist(m.x, m.y, T.x, T.y); if (d < bd) { bd = d; best = m; } }
  return best;
}
function monTgt(m, hh) { const p = scr(m.x, m.y); return { x: p.x, y: p.y, hh: hh || 58 }; }
function slotCenter(idx) {
  const r = Math.floor(idx / 10) - G.s1.top, c = idx % 10;
  return { x: 145 + 110 * c, y: 120 + 125 * r };
}
function nestTgt() {
  if (!D) return null;
  const T = D.tamer; let best = null, bd = 1e9;
  for (const n of D.nests) { const d = dist(n.x, n.y, T.x, T.y); if (d < bd) { bd = d; best = n; } }
  if (!best) return null;
  const p = scr(best.x, best.y); return { x: p.x, y: p.y, hh: 40 };
}
function nearestOf(list) {
  if (!D) return null;
  const T = D.tamer; let best = null, bd = 1e9;
  for (const o of list) { const d = dist(o.x, o.y, T.x, T.y); if (d < bd) { bd = d; best = o; } }
  return best ? { o: best, d: bd } : null;
}
// 馴獸師頭上(血量列之上): 尾巴指向 (馴獸師 x, 馴獸師 y − 60)
function tamerTgt() { if (!D) return null; const p = scr(D.tamer.x, D.tamer.y); return { x: p.x, y: p.y, hh: 60 }; }
function objTgt(r, hh) { if (!r) return null; const p = scr(r.o.x, r.o.y); return { x: p.x, y: p.y, hh: hh || 30 }; }

const ARROWS = ['up', 'down', 'left', 'right'];
function miniTgt(i) { return { x: 322 + 212 * i, y: 691, hh: 23 }; }
function nearestWeak() {
  if (!D) return null;
  let w = null, bd = 1e9;
  for (const m of D.mons) if (!m.dead && isWeak(m)) { const d = dist(m.x, m.y, D.tamer.x, D.tamer.y); if (d < bd) { bd = d; w = m; } }
  return w;
}
function weakOrNest() { const w = nearestWeak(); return w ? monTgt(w) : nestTgt(); }
function rowsHaveKey(k) { return G.rows.some(r => r.cue === k || r.prog === k); }
function pendingNewCards() { return Object.keys(G.newCards).filter(k => !rowsHaveKey(k)); }
function snap29() { return TUT.cur && TUT.cur.id === 29 && TUT.cur.snap ? TUT.cur.snap : pendingNewCards(); }
const TS = {
  1: { where: () => scene === 'weapon' && G.day === 0, text: () => '[Z] 帶這把出發', keys: () => [],
    geo: () => ({ x: 820, y: 562, bx: 820, by: 618, side: 'down' }), ok: c => !!c.flags.wz },
  2: { where: () => inMeadow(), text: () => '方向鍵 移動', keys: () => ARROWS, tgt: tamerTgt, ok: c => ARROWS.every(k => c.pk[k]) },
  3: { where: () => inMeadow(), text: () => '[Z] 打牠', keys: () => [], tgt: () => { const m = nearestMon(); return m ? monTgt(m) : nestTgt(); }, ok: c => !!c.flags.zhit },
  4: { where: () => inMeadow(), text: () => '牠虛弱了 面向牠按 [空白] 拋繩', keys: () => [], tgt: weakOrNest, ok: c => !!c.flags.lasso || (!!D && !!D.lasso) },
  5: { where: () => inDungeon(), text: () => '繞牠一圈', keys: () => ['circle'], tgt: () => (D && D.lasso ? monTgt(D.lasso.m) : null), ok: c => !!c.flags.capture },
  6: { where: () => inMeadow() || inD1F1(), text: () => '還沒虛弱 會掙脫 先用 [Z] 打虛弱', keys: () => [],
    tgt: () => { const m = TUT.escMon; return m && D && D.mons.indexOf(m) >= 0 && !m.dead ? monTgt(m) : null; },
    ok: c => !!c.flags.weak },
  7: { note: true, where: () => inMeadow(), text: () => '每次收服都會用掉 1 條繩子, 最多 ' + ropeMaxNow() + ' 條', keys: () => [],
    ok: () => !!D && D.caps.length >= 3 },
  8: { where: () => scene === 'setup1' && G.day === 0, text: () => '[Z] 選 3 隻上台 ' + stageCount() + '/3', keys: () => [],
    tgt: () => {
      let i = G.s1.zone === 'grid' ? G.s1.cur : G.bank.findIndex(b => !b.on);
      if (i < 0) i = 0;
      const c = slotCenter(i); return { x: c.x, y: c.y, hh: 55 };
    }, ok: () => stageCount() === 3 },
  9: { where: () => scene === 'setup1' && G.day === 0, text: () => '[↓] 再 [Z] 下一步', keys: () => [],
    tgt: () => ({ x: 1070, y: 505, hh: 35 }), ok: c => !!c.flags.next },
  10: { where: () => scene === 'setup2' && G.day === 0, text: () => '[Z] 選暗號: 什麼時候演', keys: () => [],
    tgt: () => ({ x: 280, y: 100, hh: 26 }), ok: () => !!G.rows[0].cue },
  11: { where: () => scene === 'setup2' && G.day === 0, text: () => '[→] 再 [Z] 選表演卡: 演什麼', keys: () => [],
    tgt: () => ({ x: 580, y: 100, hh: 26 }), ok: () => !!(G.rows[0].cue && G.rows[0].prog) },
  12: { where: () => scene === 'setup2' && G.day === 0, text: () => '[↓] 到開演 按 [Z]', keys: () => [],
    tgt: () => ({ x: 260, y: 445, hh: 35 }), ok: c => !!c.flags.go },
  // 13~16: 表演引導卡(見 GD)
  17: { where: () => scene === 'show', text: () => '暗號成立 就演表演卡', keys: () => [],
    tgt: () => miniTgt(S && S.cur >= 0 ? S.cur : 0), ok: c => !!c.flags.fired && c.age >= 3 },
  18: { where: () => scene === 'show', text: () => '超過紅線 就會失控', keys: () => [],
    geo: () => ({ x: 812, y: 46, bx: 700, by: 110, side: 'down' }), tick: (c, dt) => { c.t += dt; },
    ok: c => c.t >= 4 || (!!S && S.heat < 75 && c.t > 0.3) },
  19: { where: () => scene === 'prep', text: () => '[←][→] 選 [Z] 決定', keys: () => [],
    geo: () => (PL.cur === 0 ? { x: 440, y: 165, bx: 440, by: 105, side: 'up' } : { x: 850, y: 235, bx: 850, by: 175, side: 'up' }),
    ok: c => !!c.flags.placeChosen },
  20: { where: () => scene === 'shop', text: () => '[←][→] 換分頁', keys: () => [], tgt: () => ({ x: 640, y: 85, hh: 25 }), ok: c => !!c.flags.tab },
  // 21~25: 地下城引導卡(見 GD)
  26: { where: () => inD1F1() && !!D.stairs, text: () => '走進樓梯 往下一層', keys: () => [],
    tgt: () => { const p = scr(D.stairs.x, D.stairs.y); return { x: p.x, y: p.y, hh: 30 }; }, ok: c => !!c.flags.stairs },
  27: { where: () => inD1F1(), text: () => '躲進草叢 魔物看不到你', keys: () => [],
    tgt: () => (D.bushes.length ? objTgt(nearestOf(D.bushes)) : null), ok: c => !!c.flags.hide },
  28: { where: () => inD1F1(), keys: () => [],
    text: () => (D && D.fruits.length ? '吃果子 血量 +1' : '[Z] 打樹 掉下果子'),
    tgt: () => {
      if (!D) return null;
      if (D.fruits.length) return objTgt(nearestOf(D.fruits), 24);
      const t = nearestOf(D.trees.filter(t => t.hasFruit));
      return t ? objTgt(t, 32) : null;
    }, ok: c => !!c.flags.fruitEat },
  29: { where: () => scene === 'setup2', keys: () => [],
    text: () => {
      if (!snap29().some(k => CUE_BY[k])) return '剛買的表演卡 換上去試試';
      let row = G.rows.findIndex(r => !r.cue);
      return row < 0 || rowState(row) !== 'open' ? '剛買的暗號 換上去試試' : '剛買的暗號 排進新的一列';
    },
    tgt: () => {
      if (snap29().some(k => CUE_BY[k])) {
        let row = G.rows.findIndex(r => !r.cue);
        if (row < 0 || rowState(row) !== 'open') row = 0;
        return { x: 280, y: 100 + 78 * row, hh: 26 };
      }
      return G.rows[0].cue ? { x: 580, y: 100, hh: 26 } : { x: 280, y: 100, hh: 26 };
    },
    ok: c => !!c.snap && c.snap.some(k => rowsHaveKey(k)) },
};
const TUT_IDS = Object.keys(TS).map(Number).sort((a, b) => a - b);
const TUT_CHAIN = { 2: 3, 8: 9, 10: 11, 11: 12 };   // 「階段 N 完成後」才出現的下一階段
const TUT_ABOVE_HUD = { 18: true };                  // 指向 HUD 的主階段: 畫在 HUD 之上

// 每幀檢查「第一次成立」的出現時機(成立後鎖存)
function tutWatch() {
  if (scene === 'weapon' && G.day === 0) tutTrig(1);
  if (scene === 'dungeon' && D) {
    if (D.id === 'meadow') {
      if (!D.quest || D.quest.phase === 'bar' || D.quest.phase === 'done') tutTrig(2);   // 任務列就位後才出現
      if (TUT.done[3] && D.mons.some(m => !m.dead && isWeak(m))) tutTrig(4);
    }
    if (D.lasso) tutTrig(5);
    if (D.id === 'd1' && D.fi === 0 && !D.down && !D.floorFx) {
      if (!TUT.done[26] && D.stairs && dist(D.tamer.x, D.tamer.y, D.stairs.x, D.stairs.y) <= 240) tutTrig(26);
      if (!TUT.done[27] && D.bushes.length) { const b = nearestOf(D.bushes); if (b && b.d <= 150) tutTrig(27); }
      if (!TUT.done[28] && D.tamer.hearts < D.tamer.maxHearts) {
        const f = nearestOf(D.fruits), t = nearestOf(D.trees.filter(t => t.hasFruit));
        if ((f && f.d <= 200) || (t && t.d <= 200)) tutTrig(28);
      }
    }
  }
  if (scene === 'setup1' && G.day === 0) tutTrig(8);
  if (scene === 'setup2' && G.day === 0) tutTrig(10);
  if (scene === 'setup2' && pendingNewCards().length > 0) tutTrig(29);
  if (scene === 'show' && S && S.heat >= 85) tutTrig(18);
  if (scene === 'prep' && G.day === 1) tutTrig(19);
  if (scene === 'shop') tutTrig(20);
}
function tutStart(id) {
  const c = { id, phase: 'show', pk: {}, flags: {}, t: 0, age: 0, doneT: 0, lastGeo: null, snap: id === 29 ? pendingNewCards() : null };
  TUT.cur = c;
  if (id === 4) noteStart(7);   // 第 7 階段(捕捉繩)和第 4 階段同時出現
}
function noteStart(id) {
  if (TUT.done[id] || TUT.note) return;
  TUT.note = { id, phase: 'show', age: 0, doneT: 0 };
}
function questDone() { return !!(D && D.quest && D.quest.phase === 'done'); }   // 任務完成定格中只播 quest_done
function noteDone() {
  const n = TUT.note;
  if (!n || n.phase !== 'show') return;
  n.phase = 'done'; n.doneT = 0;
  if (!questDone()) Snd.play('tutorial_done');
}
function noteUpdate(dt) {
  const n = TUT.note;
  if (!n) return;
  if (n.phase === 'show') {
    n.age += dt;
    if (!TS[n.id].where()) {
      // 見習草地結束(第 7 階段): 算完成
      if (n.id === 7) TUT.done[7] = true;
      TUT.note = null; return;
    }
    if (TS[n.id].ok()) noteDone();
  } else {
    n.doneT += dt;
    if (n.doneT >= 0.6) { TUT.done[n.id] = true; TUT.note = null; }
  }
}
// 表演收場(時間到或失控開始)的瞬間: 還在顯示的表演泡泡(第 17、18 階段)直接算完成(不播特效, cut: true)
function tutCutShow() {
  const c = TUT.cur;
  if (c && (c.id === 17 || c.id === 18)) {
    TUT.done[c.id] = true; TUT.cur = null;
  }
  if (!TUT.done[18]) TUT.trig[18] = false;   // 排隊中還沒出現的: 解除鎖存, 下一場熱度再到 85 才出現
}
function tutForceSkip(maxId) {
  for (const id of TUT_IDS) if (id <= maxId) { if (TUT.trig[id] || (TUT.cur && TUT.cur.id === id)) TUT.done[id] = true; }
  if (TUT.cur && TUT.cur.id <= maxId) TUT.cur = null;
}
// 走下樓梯: 第 26 階段本身完成(不播特效); 其他地下城階段收起、不算完成, 下次條件成立再出現
function tutStairs() {
  const c = TUT.cur;
  if (c && c.id === 26 && c.phase === 'show') {
    TUT.done[26] = true; TUT.cur = null;
  }
  tutDungeonLeave();
}
function tutDungeonLeave() {
  if (TUT.cur && TUT.cur.phase === 'done') TUT.done[TUT.cur.id] = true;
  for (const k of [5, 6, 26, 27, 28]) if (!TUT.done[k]) TUT.trig[k] = false;
  if (TUT.cur && ((TUT.cur.id >= 2 && TUT.cur.id <= 6) || (TUT.cur.id >= 26 && TUT.cur.id <= 28))) TUT.cur = null;
}
// 地下城結束: 見習草地的階段(2~5、附註 7)在流程出口強制標成完成; 其餘地下城階段只解除鎖存, 下次條件成立再出現
function tutDungeonEnd(id) {
  if (id === 'meadow') {
    for (const k of [2, 3, 4, 5, 7]) if (TUT.trig[k] || (TUT.cur && TUT.cur.id === k) || (TUT.note && TUT.note.id === k)) TUT.done[k] = true;
    if (TUT.note && TUT.note.id === 7) TUT.note = null;
  }
  tutDungeonLeave();
}
function tutUpdate(dt) {
  tutWatch();
  noteUpdate(dt);
  const c = TUT.cur;
  if (c) {
    const def = TS[c.id];
    if (c.phase === 'show') {
      const here = def.where();
      if (here) { c.age += dt; if (def.tick) def.tick(c, dt); }
      if (def.ok(c)) {
        c.phase = 'done'; c.doneT = 0;
        if (!questDone()) Snd.play('tutorial_done');
        if (TUT_CHAIN[c.id]) tutTrig(TUT_CHAIN[c.id]);
      } else if (!here) {
        TUT.cur = null;   // 離開該階段的場景: 收起來, 條件成立時再出現
      }
    } else {
      c.doneT += dt;
      if (c.doneT >= 0.6) { TUT.done[c.id] = true; TUT.cur = null; }
    }
  }
  if (!TUT.cur) {
    for (const id of TUT_IDS) {
      if (TS[id].note || TUT.done[id] || !TUT.trig[id]) continue;
      if (id === 17 && S && S.loose) continue;   // 收場期間不再冒出表演階段
      if (TS[id].where()) { tutStart(id); break; }
    }
  }
}
// 泡泡位置(RD 算): 目標在畫面上半(y < 300)放下方, 否則上方; 左右夾在畫面內; 第 1、18、19 階段版位固定
function tutGeo(c, def) {
  if (def.geo) return def.geo();
  const tg = def.tgt(); if (!tg) return null;
  const side = tg.y < 300 ? 'down' : 'up';
  const ty = side === 'down' ? tg.y + tg.hh : tg.y - tg.hh;
  const top = (scene === 'dungeon' ? 100 : 50) + 52;
  const by = clamp(side === 'down' ? ty + 60 : ty - 60, top, CH - 52);
  const bx = clamp(tg.x, 170, DW - 170);
  return { x: tg.x, y: ty, bx, by, side };
}
// mode: 'below' = 只畫 HUD 之下的(地下城); 'above' = 只畫 HUD 之上的(第 18 階段); 'all' = 全部(非地下城畫面, HUD 之後呼叫)
function renderTutorial(mode) {
  if (GD) return;   // 暫停式引導期間泡泡不畫
  const c = TUT.cur;
  if (!c) return;
  const above = !!TUT_ABOVE_HUD[c.id];
  if (mode === 'below' && above) return;
  if (mode === 'above' && !above) return;
  const def = TS[c.id];
  let geo;
  if (c.phase === 'show') {
    if (!def.where()) return;
    geo = tutGeo(c, def); if (!geo) return;
    c.lastGeo = geo;
  } else {
    geo = c.lastGeo; if (!geo) return;
  }
  const keysList = def.keys();
  Art.drawTutorial(ctx, {
    stage: c.id, kind: 'main', text: def.text(), keys: keysList,
    pressed: c.id === 2 ? keysList.filter(k => c.pk[k]) : [],
    x: geo.x, y: geo.y, bx: geo.bx, by: geo.by, side: geo.side, phase: c.phase,
    appearT: Math.min(0.25, c.age), appearDur: 0.25,
    doneT: c.phase === 'done' ? c.doneT : 0.6, doneDur: 0.6,
  });
}
// 附註(第 7 階段): 畫在 HUD 之上, 整個泡泡在 HUD 帶內(中心 (186, 26)), 尾巴朝下指向捕捉繩列正中央
function renderTutNote() {
  if (GD) return;
  const n = TUT.note;
  if (!n || !inDungeon()) return;
  if (n.phase === 'show' && !TS[n.id].where()) return;
  Art.drawTutorial(ctx, {
    stage: n.id, kind: 'note', text: TS[n.id].text(), keys: [], pressed: [],
    x: 40 + 11 * (ropeMaxNow() - 1), y: 60, bx: 186, by: 26, side: 'up', phase: n.phase,
    appearT: Math.min(0.25, n.age), appearDur: 0.25,
    doneT: n.phase === 'done' ? n.doneT : 0.6, doneDur: 0.6,
  });
}


// ───────────────────────── 暫停式引導(第 13~16、21~25 階段) ─────────────────────────
// GD 開著: 整個表演場 / 地下城停住(update 不呼叫 updateShow / updateDungeon), 只吃 Z; 泡泡不畫、計時停住
let GD = null;
const GUIDE_IDS = { show: [13, 14, 15, 16], dungeon: [21, 22, 23, 24, 25] };
const GUIDE_READ = 3.0, GUIDE_APPEAR = 0.3, GUIDE_PAUSE = 0.8, GUIDE_OUTRO = 0.4, GUIDE_FX = 2.5;
// 每張卡的文字、聚光燈、卡片位置、箭頭尖端(數值照 spec「引導卡版位」; 暫停當下算一次, 引導期間遊戲停住所以位置不會動)
function guideGeo(id) {
  const base = { text: '', sub: '', grand: false, spot: { shape: 'none', x: 0, y: 0, w: 0, h: 0, r: 0 }, cardX: 640, cardY: 340, tipX: null, tipY: null, edgeAngle: null };
  const rect = (x, y, w, h) => ({ shape: 'rect', x, y, w, h, r: 0 });
  // HUD 上的東西照美術的 HUD 放大換算位置
  const hp = (x, y) => (Art.hudPt ? Art.hudPt(x, y) : { x, y, k: 1 });
  const hrect = (x, y, w, h) => { const p = hp(x, y); return rect(p.x, p.y, w * p.k, h * p.k); };
  const hdy = (Art.hudH ? Art.hudH('dungeon') : 100) - 100;
  // 表演場 HUD(熱度表)也放大了
  const sp2 = (x, y) => (Art.showPt ? Art.showPt(x, y) : { x, y, k: 1 });
  const srect = (x, y, w, h) => { const p = sp2(x, y); return rect(p.x, p.y, w * p.k, h * p.k); };
  const circ = (x, y, r) => ({ shape: 'circle', x, y, w: 0, h: 0, r });
  switch (id) {
    case 13: return Object.assign(base, { text: '怪物在表演了 會照你排的節目演出', sub: '表演中不可操作', spot: rect(322, 691, 212, 56), cardX: 430, cardY: 560, tipX: 322, tipY: 661 });
    case 14: {
      let best = null;
      for (const m of S.mons) {
        if (!best || m.rage > best.rage || (m.rage === best.rage && dist(m.x, m.y, 640, 356) < dist(best.x, best.y, 640, 356))) best = m;
      }
      const mx = best ? best.x : 640, my = best ? best.y : 356;
      const barY = my - (best && best.sp === 'tanuki' ? 52 : 44);   // 怒氣條中心(條 60×8, x mx ± 30)
      const g = { text: '這個是怒氣條 越生氣表演得越賣力', spot: circ(mx, my - 20, 64) };
      if (my >= 300) {   // 卡在上方, 箭頭尖端 = 怒氣條正上方
        g.cardX = clamp(mx, 240, 1040); g.cardY = my - 178; g.tipX = mx; g.tipY = barY - 8;
      } else if (mx < 640) {   // 上方放不下: 卡在右邊, 箭頭水平指向怒氣條
        g.cardX = mx + 308; g.cardY = barY; g.tipX = mx + 34; g.tipY = barY;
      } else {
        g.cardX = mx - 308; g.cardY = barY; g.tipX = mx - 34; g.tipY = barY;
      }
      return Object.assign(base, g);
    }
    case 15: return Object.assign(base, { text: '怪物表演得越賣力 觀眾熱度就越高', spot: srect(640, 25, 428, 46), cardX: sp2(640, 25).x, cardY: 200, tipX: sp2(686, 50).x, tipY: sp2(686, 50).y });
    case 16: return Object.assign(base, { text: '透過你的表演安排 讓場子熱起來吧!', grand: true });
    case 21: {
      const p = scr(D.tamer.x, D.tamer.y), below = p.y < 426;
      return Object.assign(base, { text: '在地下城自由探索 抓怪、拿道具、變強', spot: circ(p.x, p.y - 16, 90),
        cardX: clamp(p.x, 240, 1040), cardY: clamp(below ? p.y + 168 : p.y - 200, 190, 650), tipX: p.x, tipY: below ? p.y + 76 : p.y - 108 });
    }
    case 22: return Object.assign(base, { text: '每次進地下城 捕捉繩都會補回 ' + ropeMaxNow() + ' 條', spot: hrect(140, 74, 248, 40), cardX: Math.max(300, hp(140, 74).x + 160), cardY: 200 + hdy, tipX: hp(140, 96).x, tipY: hp(140, 96).y });
    case 23: return Object.assign(base, { text: '要注意時間限制 時間到就收工', spot: hrect(631, 25, 340, 36), cardX: hp(631, 25).x, cardY: 175 + hdy, tipX: hp(600, 45).x, tipY: hp(600, 45).y });
    case 24: {
      const p = D.exit ? scr(D.exit.x, D.exit.y) : { x: 640, y: 400 };
      let sx = p.x, sy = p.y, edge = null;
      if (p.x < -OX || p.x > DW + OX || p.y < 100 || p.y > 720) { sx = clamp(p.x, 60 - OX, 1220 + OX); sy = clamp(p.y, 160, 660); edge = Math.atan2(p.y - sy, p.x - sx); }
      const below = sy < 410;
      return Object.assign(base, { text: '這是出口 可以中途離開', spot: circ(sx, sy, 50), edgeAngle: edge,
        cardX: clamp(sx, 240, 1040), cardY: below ? sy + 144 : sy - 144, tipX: sx, tipY: below ? sy + 52 : sy - 52 });
    }
    case 25: return Object.assign(base, { text: '多多在地下城抓怪 讓牠們去表演吧!', grand: true });
  }
  return base;
}
function startGuide(which) {
  GD = { which, ids: GUIDE_IDS[which], i: -1, phase: 'pause', t: 0, pauseT: 0, cardT: 0, outroT: 0, cur: null, prev: null };
  Snd.play('guide_pause');
  Snd.crowd('');   // 表演的觀眾聲循環停住, 結束時恢復
}
function guideShowCard(i) {
  const id = GD.ids[i];
  GD.i = i; GD.cardT = 0; GD.prev = GD.cur; GD.cur = guideGeo(id);
  Snd.play(GD.cur.grand ? 'guide_finale' : 'guide_card');
}
function endGuide() {
  const g = GD;
  GD = null;
  if (g.which === 'show') {
    if (S) Snd.crowd(S.tierIdx > 0 ? TIERS[S.tierIdx] : '');
    tutTrig(17);   // 表演繼續的那一刻: 第 17 階段出現
  } else if (D) { D.zWait = true; D.xWait = true; }
}
function updateGuide(dt) {
  const g = GD;
  g.t += dt;
  if (g.phase === 'pause') {
    g.pauseT += dt;
    if (g.pauseT >= GUIDE_PAUSE) { g.pauseT = GUIDE_PAUSE; g.phase = 'card'; guideShowCard(0); }
    return;
  }
  if (g.phase === 'card') {
    g.cardT += dt;
    if (g.cardT >= GUIDE_READ && pressed.z) {   // 出現滿 3 秒才接受 Z; 未滿不反應(不播音效)
      const id = g.ids[g.i];
      TUT.done[id] = true;
      if (g.i < g.ids.length - 1) guideShowCard(g.i + 1);
      else { Snd.play('ui_confirm'); g.phase = 'outro'; g.outroT = 0; }
    }
    return;
  }
  g.outroT += dt;
  if (g.outroT >= GUIDE_OUTRO) endGuide();
}
function lerp(a, b, k) { return a + (b - a) * k; }
function guideSpot(prev, cur, k) {
  if (!prev || prev.spot.shape === 'none' || cur.spot.shape === 'none' || k >= 1) return cur.spot;
  const wh = s => (s.shape === 'circle' ? [s.r * 2, s.r * 2] : [s.w, s.h]);
  const a = wh(prev.spot), b = wh(cur.spot);
  const w = lerp(a[0], b[0], k), h = lerp(a[1], b[1], k);
  const sp = { shape: cur.spot.shape, x: lerp(prev.spot.x, cur.spot.x, k), y: lerp(prev.spot.y, cur.spot.y, k), w, h, r: 0 };
  if (sp.shape === 'circle') { sp.r = w / 2; sp.w = 0; sp.h = 0; }
  return sp;
}
function renderGuide() {
  const g = GD;
  const st = { which: g.which, phase: g.phase, pauseT: g.pauseT, pauseDur: GUIDE_PAUSE, outroT: GUIDE_OUTRO, outroDur: GUIDE_OUTRO,
    index: Math.max(0, g.i), total: g.ids.length, grand: false, text: '', sub: '', spot: { shape: 'none', x: 0, y: 0, w: 0, h: 0, r: 0 },
    cardX: 640, cardY: 340, tipX: null, tipY: null, edgeAngle: null, appearT: GUIDE_APPEAR, appearDur: GUIDE_APPEAR,
    readT: 0, readDur: GUIDE_READ, ready: false, fxT: GUIDE_FX, fxDur: GUIDE_FX, t: g.t };
  if (g.phase !== 'pause' && g.cur) {
    const c = g.cur, k = Math.min(1, g.cardT / GUIDE_APPEAR), p = g.prev;
    st.grand = c.grand; st.text = c.text; st.sub = c.sub; st.cardX = c.cardX; st.cardY = c.cardY; st.edgeAngle = c.edgeAngle;
    st.spot = guideSpot(p, c, k);
    st.tipX = c.tipX; st.tipY = c.tipY;
    if (p && p.tipX !== null && c.tipX !== null && k < 1) { st.tipX = lerp(p.tipX, c.tipX, k); st.tipY = lerp(p.tipY, c.tipY, k); }
    st.appearT = Math.min(GUIDE_APPEAR, g.cardT);
    st.readT = Math.min(GUIDE_READ, g.cardT); st.ready = g.cardT >= GUIDE_READ;
    if (c.grand) st.fxT = Math.min(GUIDE_FX, g.cardT);
    if (g.phase === 'outro') { st.outroT = Math.min(GUIDE_OUTRO, g.outroT); st.appearT = GUIDE_APPEAR; st.readT = GUIDE_READ; st.ready = true; }
  }
  Art.drawGuide(ctx, st);
}



// ───────────────────────── 開始畫面 / 日曆 / 出發準備 / 地下城選擇 / 選武器 ─────────────────────────
function titleInput() {
  if (!pressed.z) return;
  Snd.init(); Snd.play('title_start');
  newRun(tutorialDone);
  beginDay(tutorialDone ? 1 : 0);
}
function beginDay(day) {
  G.day = day;
  CAL = { t: 0, dur: 2.0 };
  Snd.play('calendar_flip');
  setScene('calendar');
}
function calendarInput(dt) {
  CAL.t += dt;
  if (CAL.t >= CAL.dur || (CAL.t >= 0.5 && pressed.z)) {
    if (G.day === 0) startWeaponSelect('meadow');
    else enterPrep('dungeon', 0);
  }
}
// 出發準備: stage = dungeon(地下城前)/ show(表演前); cur 0 = 主卡、1 = 商店
function enterPrep(stage, cur) {
  PL = { stage, zone: 'card', cur: cur || 0, notice: null };
  nextNotice();
  setScene('prep');
}
function nextNotice() {
  let id = null;
  const qi = G.unlockQueue.indexOf('d2');
  if (qi >= 0) id = G.unlockQueue.splice(qi, 1)[0];   // 第 2 座開放排在上架提示之前
  else if (G.unlockQueue.length > 0) id = G.unlockQueue.shift();
  if (id) {
    PL.notice = { text: id === 'shelf' ? '商店上架新東西' : '第 2 座地下城開放: ' + DUNGEONS.d2.name, t: 0 };
    Snd.play('unlock');
  } else PL.notice = null;
}
function prepGo() {
  if (PL.cur === 1) {
    G.shop = { tab: 0, zone: 'tab', idx: 0, col: 0, from: PL.stage, enterT: 0, bought: [], pop: null, buyWait: null, cg: null }; UI.floats = []; setScene('shop');
  }
  else if (PL.stage === 'dungeon') { SEL.cur = 0; setScene('select'); }
  else enterSetup1();
}
function prepInput(dt) {
  if (PL.notice) { PL.notice.t += dt; if (PL.notice.t >= 1.5) nextNotice(); }
  if (PL.hold !== undefined) {   // 第 18 階段: 讓完成特效(0.6 秒)在這個畫面播完再進去
    PL.hold += dt;
    if (PL.hold >= 0.6) prepGo();
    return;
  }
  if (PL.zone === 'card') {
    if (pressed.left && PL.cur > 0) { PL.cur--; Snd.play('ui_move'); }
    else if (pressed.right && PL.cur < 1) { PL.cur++; Snd.play('ui_move'); }
    else if (pressed.down) { PL.zone = 'sound'; Snd.play('ui_move'); }
    else if (pressed.z) {
      tut('placeChosen');
      Snd.play('ui_confirm');
      if (TUT.cur && TUT.cur.id === 19 && TUT.cur.phase === 'show') PL.hold = 0;
      else prepGo();
    }
  } else {
    if (pressed.up) { PL.zone = 'card'; Snd.play('ui_move'); }
    else if (pressed.z) { Snd.toggleMute(); Snd.play('ui_confirm'); }
  }
}
function selectInput() {
  if (pressed.left && SEL.cur > 0) { SEL.cur--; Snd.play('ui_move'); }
  else if (pressed.right && SEL.cur < DUNGEON_ORDER.length - 1) { SEL.cur++; Snd.play('ui_move'); }
  else if (pressed.x) { Snd.play('ui_cancel'); enterPrep('dungeon', 0); }
  else if (pressed.z) {
    const id = DUNGEON_ORDER[SEL.cur];
    if (G.unlocked[id]) { Snd.play('ui_confirm'); startWeaponSelect(id); } else Snd.play('ui_denied');
  }
}
// 選武器(每次進地下城前一定出現; 只有一把也要選)
const WEAPON_ORDER = ['club', 'sword', 'spear'];
const WEAPON_NAME = { club: '棍棒', sword: '劍', spear: '長槍' };
const WEAPON_LINE = { club: '[Z] 敲擊', sword: '[Z] 斬擊 可打回飛彈 [X] 擊暈', spear: '[Z] 長刺 [X] 突進' };
function startWeaponSelect(id) {
  const opts = WEAPON_ORDER.filter(k => G.ownedWeapons[k]).map(k => ({ key: k, name: WEAPON_NAME[k], line: WEAPON_LINE[k], last: k === G.weapon }));
  let idx = opts.findIndex(o => o.last); if (idx < 0) idx = 0;
  WS = { id, idx, t: 0, opts, leave: -1 };
  setScene('weapon');
}
function weaponInput(dt) {
  WS.t += dt;
  if (WS.leave >= 0) {   // 見習日: 讓第 1 階段的完成特效播完(0.6 秒)再進見習草地
    WS.leave += dt;
    if (WS.leave >= 0.6) startDungeon(WS.id);
    return;
  }
  if (pressed.left && WS.idx > 0) { WS.idx--; Snd.play('ui_move'); }
  else if (pressed.right && WS.idx < WS.opts.length - 1) { WS.idx++; Snd.play('ui_move'); }
  else if (pressed.x) { if (G.day > 0) { Snd.play('ui_cancel'); setScene('select'); } }
  else if (pressed.z) {
    const o = WS.opts[WS.idx];
    G.weapon = o.key;
    Snd.play('ui_confirm');
    tut('wz');
    if (G.day === 0) WS.leave = 0; else startDungeon(WS.id);
  }
}
// 一天結束(表演之後); 見習日不計入天數
function advanceDay() {
  if (G.day >= 1) G.log[G.day - 1] = G.todayD;
  if (G.day >= DAY_MAX) { toResult(); return; }
  beginDay(G.day + 1);
}


// ───────────────────────── 地下城: 地圖與碰撞 ─────────────────────────
function solidCell(c, r) {
  if (c < 0 || r < 0 || c >= D.W || r >= D.H) return true;
  const ch = D.grid[r][c];
  return ch === '#' || ch === 'o' || ch === 'X' || ch === 'Y';
}
// 爆炸桶與寶箱: 半徑 22 的圓形障礙
function kegBlock(x, y, rad) {
  for (const k of D.kegs) if (k.mode !== 'gone' && dist(x, y, k.x, k.y) < rad + 22) return k;
  for (const c of D.chests) if (dist(x, y, c.x, c.y) < rad + 22) return c;
  return null;
}

function circleSolid(x, y, rad) {
  const c0 = Math.floor((x - rad) / TILE), c1 = Math.floor((x + rad) / TILE);
  const r0 = Math.floor((y - rad) / TILE), r1 = Math.floor((y + rad) / TILE);
  for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) {
    if (!solidCell(c, r)) continue;
    const nx = clamp(x, c * TILE, c * TILE + TILE), ny = clamp(y, r * TILE, r * TILE + TILE);
    if ((nx - x) * (nx - x) + (ny - y) * (ny - y) < rad * rad) return true;
  }
  return !!kegBlock(x, y, rad);
}
function circleOnChar(x, y, rad, ch) {
  const c0 = Math.floor((x - rad) / TILE), c1 = Math.floor((x + rad) / TILE);
  const r0 = Math.floor((y - rad) / TILE), r1 = Math.floor((y + rad) / TILE);
  for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) {
    if (c < 0 || r < 0 || c >= D.W || r >= D.H || D.grid[r][c] !== ch) continue;
    const nx = clamp(x, c * TILE, c * TILE + TILE), ny = clamp(y, r * TILE, r * TILE + TILE);
    if ((nx - x) * (nx - x) + (ny - y) * (ny - y) < rad * rad) return true;
  }
  return false;
}
function solidAtPoint(x, y) { return solidCell(Math.floor(x / TILE), Math.floor(y / TILE)); }
function camOf() {
  if (!D) return { x: 0, y: 0 };
  const T = D.tamer;
  // 可視寬 CW(1680): 地圖比可視寬窄時置中(兩側露出的是地下城背景底色), 否則跟著玩家並夾在地圖範圍內
  const mapW = D.W * TILE;
  const cx = mapW <= CW ? -(CW - mapW) / 2 : clamp(T.x - CW / 2, 0, mapW - CW);
  const HH = Art.hudH ? Art.hudH('dungeon') : 100;   // HUD 帶高度(放大後可能超過 100), 地圖從它下面開始
  const cy = clamp(T.y - 310 - (HH - 100) / 2, 0, Math.max(0, D.H * TILE - (CH - HH)));
  return { x: cx + OX, y: cy - HH };   // 設計座標畫面 = 世界 − cam(x 已含平移 OX)
}
function monStat(sp) {
  const base = SP[sp];
  if (D && D.id === 'meadow' && sp === 'monkey') return { hp: 6, interval: 4.0 };
  return { hp: base.hp, interval: base.interval };
}
function isWeak(m) { return D && D.id === 'meadow' ? m.hp <= 2 : m.hp <= m.maxHp * 0.3; }


function startDungeon(id) {
  const def = DUNGEONS[id];
  const meadow = id === 'meadow';
  D = {
    id, def, fi: 0, floorN: def.floors.length, style: def.floors[0].style,
    grid: null, W: 0, H: 0, portals: [], nests: [], mons: [], hz: [], fx: [], floats: [], cracks: {}, kegs: [], trees: [], fruits: [], fountains: [], blasts: [], bushes: [],
    shrines: [], chests: [], stairs: null,
    timed: !meadow, timeLeft: TIME_LIMIT, elapsed: 0, pairCd: { 1: 0, 2: 0 }, lasso: null,
    ropes: 0, tamer: null, caps: [], kills: 0, killGold: 0, heartsLost: 0, hidden: false, respawnT: meadow ? 3 : 8,
    exit: null, prompt: null, capPop: 0,
    rope: null, down: null, dying: null, zWait: false, xWait: false,
    cardGet: null, floorFx: null, chestOpen: null, loot: [], upStairs: null,
    saved: {}, floorVisits: 0, chestGold: 0, stayAt: -1, goldOpens: [],
    // 見習草地任務卡 / 任務列: card 2.0 → shrink 0.5 → bar(常駐)→ done 1.0
    quest: meadow ? { phase: 'card', t: 0, clock: 0, popT: 0.4 } : null,
  };
  D.ropes = ropeMaxNow();   // 每次進地下城捕捉繩補滿
  const mh = G.heartMax;
  D.tamer = { x: 0, y: 0, facing: 0, weapon: G.weapon, hearts: mh, maxHearts: mh, invuln: 0, slowT: 0, zCd: 0, xCd: 0, dash: null, hidden: false };
  D.hb = { fx: 'none', t: 2, delta: 0, last: mh };   // 頭上心列特效
  buildFloor(0);
  if (!meadow) G.todayD = id;
  setScene('dungeon');
  if (D.quest) { Snd.play('quest_show'); }
}
// 建出第 fi 層(0 起算): 地圖、魔物、物件全部重置; 心 / 繩 / 攻擊力 / 收服列帶過來
// arrive: 'down' = 從上一層走下來(或開局): 出現在 S 面向上; 'up' = 從下一層走上來: 出現在 D 面向下, D 暫時不待命
// 同一趟回到去過的樓層: 地形(裂牆)、爆炸桶、果樹、果子、回復泉維持離開時的樣子; 魔物重生(第 22b 條)
function saveFloor() {
  D.saved[D.fi] = { grid: D.grid, cracks: D.cracks, kegs: D.kegs, trees: D.trees, fruits: D.fruits, fountains: D.fountains };
}
function buildFloor(fi, arrive) {
  const fd = D.def.floors[fi];
  const grid = fd.map.map(r => r.split(''));
  D.fi = fi; D.style = fd.style; D.grid = grid; D.H = grid.length; D.W = grid[0].length;
  D.portals = []; D.nests = []; D.mons = []; D.hz = []; D.fx = []; D.floats = []; D.cracks = {}; D.kegs = []; D.trees = []; D.fruits = [];
  D.fountains = []; D.blasts = []; D.bushes = []; D.shrines = []; D.chests = []; D.stairs = null; D.upStairs = null; D.exit = null;
  D.lasso = null; D.rope = null; D.prompt = null; D.pairCd = { 1: 0, 2: 0 };
  let sx = 0, sy = 0;
  for (let r = 0; r < D.H; r++) for (let c = 0; c < D.W; c++) {
    const ch = grid[r][c], cx = c * TILE + 30, cy = r * TILE + 30;
    const key = D.id + ':' + fi + ':' + r + ':' + c;
    if (ch === 'S') { sx = cx; sy = cy; grid[r][c] = '.'; }
    else if (ch === '1' || ch === '2') { D.portals.push({ id: +ch, x: cx, y: cy, charge: 0, armed: true }); grid[r][c] = '.'; }
    else if (ch === 'E') { D.exit = { x: cx, y: cy, armed: true }; grid[r][c] = '.'; }
    else if (ch === 'D') { D.stairs = { x: cx, y: cy, armed: true }; grid[r][c] = '.'; }
    else if (ch === 'U') { D.upStairs = { x: cx, y: cy, armed: true }; grid[r][c] = '.'; }
    else if (ch === 'B') {
      const b = fd.boosts.find(o => o[0] === r && o[1] === c);
      D.shrines.push({ x: cx, y: cy, kind: b ? b[2] : 'heart', key, used: !!G.usedBoosts[key] }); grid[r][c] = '.';
    }
    else if (ch === 'C') {
      const b = fd.chests.find(o => o[0] === r && o[1] === c);
      const isKey = !!b && b[2] === 'key';
      D.chests.push({ x: cx, y: cy, r, c, kind: b ? b[2] : 'gold', ckey: b && isKey ? b[3] : '', gold: b && b[2] === 'gold' ? b[3] : 0, key, isKey,
        open: !!G.openedChests[key], openT: isKey ? 0.3 : 0.6 }); grid[r][c] = '.';
    }
    else if (ch === 'K') { D.kegs.push({ x: cx, y: cy, mode: 'ok', fuseT: 0 }); grid[r][c] = '.'; }
    else if (ch === 'F') { D.fountains.push({ x: cx, y: cy, full: true }); grid[r][c] = '.'; }
    else if (ch === 'Y') D.trees.push({ x: cx, y: cy, hasFruit: true });
    else if (ch === 'G') D.bushes.push({ x: cx, y: cy });
    else if (NEST_CH[ch]) { D.nests.push({ sp: NEST_CH[ch], x: cx, y: cy, room: D.id === 'meadow' ? 0 : roomOf(cx, cy), mon: null, respawn: 0 }); grid[r][c] = 'n'; }
  }
  const sv = D.saved[fi];
  if (sv) { D.grid = sv.grid; D.cracks = sv.cracks; D.kegs = sv.kegs; D.trees = sv.trees; D.fruits = sv.fruits; D.fountains = sv.fountains; }
  const T = D.tamer;
  T.x = sx; T.y = sy; T.facing = 0; T.dash = null; T.hidden = false; T.slowT = 0; T.zCd = 0; T.xCd = 0;
  if (arrive === 'up' && D.stairs) { T.x = D.stairs.x; T.y = D.stairs.y; T.facing = 4; D.stairs.armed = false; }
  for (const n of D.nests) spawnWild(n);
}

// 任務卡 / 縮小期間(2.5 秒)與任務完成定格(1.0 秒): 整個地下城停住, 不接受按鍵; 回傳 true = 這幀已處理完
function updateQuest(dt) {
  const Q = D.quest;
  if (!Q) return false;
  Q.clock += dt;
  if (Q.popT < 0.4) Q.popT = Math.min(0.4, Q.popT + dt);
  if (Q.phase === 'card') {
    Q.t += dt;
    if (Q.t >= 2.0) { Q.phase = 'shrink'; Q.t = 0; }
    return true;
  }
  if (Q.phase === 'shrink') {
    Q.t += dt;
    if (Q.t >= 0.5) { Q.phase = 'bar'; Q.t = 0; }
    return true;
  }
  if (Q.phase === 'done') {
    // 定格: 只有飄字、特效、心列、任務列動畫照播
    Q.t += dt;
    for (const f of D.fx) f.t += dt;
    D.fx = D.fx.filter(f => f.t < f.dur);
    for (const f of D.floats) f.t += dt;
    D.floats = D.floats.filter(f => f.t < f.dur);
    const hb = D.hb;
    if (hb.fx !== 'none') { hb.t += dt; if (hb.t >= 2) { hb.fx = 'none'; hb.t = 2; hb.delta = 0; } }
    if (Q.t >= 1.0) endDungeon('tutorial');
    return true;
  }
  return false;
}

function spawnWild(n) {
  const st = monStat(n.sp);
  const m = {
    sp: n.sp, x: n.x, y: n.y, hp: st.hp, maxHp: st.hp, interval: st.interval, hitT: 0, stun: 0, lassoed: false, kb: null,
    room: n.room, nest: n, dead: false, ang: rnd(0, Math.PI * 2), dirT: rnd(0.5, 2), cyc: rnd(0, 1),
    tp: 0, tpT: 0, teleT: rnd(0, 2.5), swooping: false, castT: 0, inRange: false, burst: null,
    face: 1, move: 'walk', moveT: 0, moveDur: 0, weak: false, casting: false,
    windup: false, windupT: 0, windupDur: 0, aim: null, escapeT: 0.4, warnH: null,
  };
  if (n.sp === 'penguin' || n.sp === 'parrot') m.cyc = rnd(0, 2);
  n.mon = m; n.respawn = 0;
  D.mons.push(m);
}

// ───────────────────────── 魔物移動(地下城與表演場共用) ─────────────────────────
function advStraight(m, speed, dt, b) {
  m.x += Math.cos(m.ang) * speed * dt; m.y += Math.sin(m.ang) * speed * dt;
  if (m.x < b.x0) { m.x = b.x0; m.ang = Math.PI - m.ang; } else if (m.x > b.x1) { m.x = b.x1; m.ang = Math.PI - m.ang; }
  if (m.y < b.y0) { m.y = b.y0; m.ang = -m.ang; } else if (m.y > b.y1) { m.y = b.y1; m.ang = -m.ang; }
  const c = Math.cos(m.ang); if (speed > 0 && Math.abs(c) > 0.05) m.face = c > 0 ? 1 : -1;
}
function advClamp(m, speed, dt, b) {
  m.x = clamp(m.x + Math.cos(m.ang) * speed * dt, b.x0, b.x1);
  m.y = clamp(m.y + Math.sin(m.ang) * speed * dt, b.y0, b.y1);
  const c = Math.cos(m.ang); if (Math.abs(c) > 0.05) m.face = c > 0 ? 1 : -1;
}
// env: { b: 邊界, dir(m): 新方向, tele(m): 瞬移落點 }; mul: 速度倍率
function moveMonster(m, dt, env, mul) {
  const b = env.b;
  m.move = 'walk'; m.moveT = 0; m.moveDur = 0;
  switch (m.sp) {
    case 'lily':
      m.dirT -= dt; if (m.dirT <= 0) { m.ang = env.dir(m); m.dirT = rnd(2, 3); }
      advStraight(m, 50 * mul, dt, b); break;
    case 'beetle':
      m.dirT -= dt; if (m.dirT <= 0) { m.ang = env.dir(m); m.dirT = 4; }
      advStraight(m, 110 * mul, dt, b); break;
    case 'monkey':
      // 殘血(mul < 1)改每 2.0 秒跳一次、每次 40 像素; 平常每 1.0 秒跳 80
      { const per = mul < 1 ? 2 : 1; m.cyc += dt; if (m.cyc >= per) { m.cyc -= per; m.ang = env.dir(m); } }
      if (m.cyc < 0.3) { m.move = 'hop'; m.moveT = m.cyc; m.moveDur = 0.3; advClamp(m, (80 / 0.3) * mul, dt, b); }
      break;
    case 'parrot':
      m.cyc += dt;
      if (m.cyc >= 2) { m.cyc -= 2; m.ang = env.dir(m); m.swooping = true; }
      if (m.swooping) {
        if (m.cyc < 0.5) { m.move = 'swoop'; m.moveT = m.cyc; m.moveDur = 0.5; advStraight(m, 220 * mul, dt, b); }
        else { m.swooping = false; m.ang = env.dir(m); advStraight(m, 20 * mul, dt, b); }
      } else advStraight(m, 20 * mul, dt, b);
      break;

    case 'hedgehog':   // 小碎步: 80 像素/秒直走 0.8 秒、停 0.4 秒、換方向, 一直循環
      m.cyc += dt; if (m.cyc >= 1.2) { m.cyc -= 1.2; m.ang = env.dir(m); }
      if (m.cyc < 0.8) advStraight(m, 80 * mul, dt, b);
      break;

    case 'penguin': {
      m.cyc += dt; if (m.cyc >= 2) { m.cyc -= 2; m.ang = env.dir(m); }
      let sp = 0;
      if (m.cyc < 1) sp = 150; else if (m.cyc < 1.6) sp = 150 * (1 - (m.cyc - 1) / 0.6);
      advStraight(m, sp * mul, dt, b); break;
    }
    case 'tanuki':
      if (m.tp === 1) {
        m.tpT += dt; m.move = 'fadeOut'; m.moveT = Math.min(m.tpT, 0.25); m.moveDur = 0.25;
        if (m.tpT >= 0.25) { const p = env.tele(m); m.x = p.x; m.y = p.y; m.tp = 2; m.tpT = 0; m.move = 'fadeIn'; m.moveT = 0; }
        break;
      }
      if (m.tp === 2) {
        m.tpT += dt; m.move = 'fadeIn'; m.moveT = Math.min(m.tpT, 0.25); m.moveDur = 0.25;
        if (m.tpT >= 0.25) { m.tp = 0; m.tpT = 0; m.teleT = 0; m.move = 'walk'; m.moveT = 0; m.moveDur = 0; }
        break;
      }
      m.teleT += dt;
      if (m.teleT >= 2.5) { m.tp = 1; m.tpT = 0; break; }
      m.dirT -= dt; if (m.dirT <= 0) { m.ang = env.dir(m); m.dirT = 3; }
      advStraight(m, 30 * mul, dt, b); break;
  }
}



// ───────────────────────── 技能(地下城 / 表演場共用) ─────────────────────────
function newHz(o) {
  return Object.assign({ kind: '', phase: 'fly', x: 0, y: 0, radius: 0, angle: 0, length: 0, width: 0, t: 0, dur: 0,
    speed: 0, reflected: false, dead: false, owner: null, cast: null, hit: null, trav: 0, ox: 0, oy: 0 }, o);
}
function hzList() { return scene === 'show' || scene === 'sresult' ? S.hz : D.hz; }
function killHz(h) {
  if (h.dead) return;
  h.dead = true;
  if (h.cast) { h.cast.alive--; checkSettle(h.cast); }
}
function newCast(owner, chain, dungeon) {
  return { owner, chain, hits: new Set(), alive: 0, angry: false, settled: false, dungeon };
}

function emitSkill(m, tx, ty, cast) {
  const list = hzList();
  const kind = SP[m.sp].skill;
  const base = Math.atan2(ty - m.y, tx - m.x);
  const mk = (ang, extra) => {
    const p = PROJ[kind];
    const h = newHz(Object.assign({ kind, phase: 'fly', x: m.x, y: m.y, radius: p.r, angle: ang, dur: p.life, speed: p.speed, owner: m, cast, ox: m.x, oy: m.y }, extra || {}));
    cast.alive++; list.push(h);
  };
  if (kind === 'pollen') { mk(base - 20 * D2R); mk(base); mk(base + 20 * D2R); }
  else if (kind === 'match') mk(base);
  else if (kind === 'feather') mk(base);
  else if (kind === 'card') { [-22.5, -7.5, 7.5, 22.5].forEach(a => mk(base + a * D2R)); }
  else if (kind === 'gear') {
    cancelBurst(m);   // 上一串還沒射完(例如被表演卡提前叫演): 先收掉, 免得那一招永遠結算不了
    m.burst = { k: 0, t: 0, base, cast };
    cast.alive++;
    stepBurst(m, 0);
  } else if (kind === 'icebeam') {
    const h = newHz({ kind, phase: 'warn', x: m.x, y: m.y, angle: base, length: 460, width: 36, t: 0, dur: 0.7, owner: m, cast });
    cast.alive++; list.push(h);
  } else if (kind === 'firecracker') {
    // 朝對象當下的位置丟一顆爆竹: 落點出現半徑 70(外緣)的預警圈, 0.8 秒後爆炸(落點開始就鎖定)
    const h = newHz({ kind, phase: 'warn', x: tx, y: ty, radius: 70, angle: 0, t: 0, dur: 0.8, owner: m, cast });
    cast.alive++; list.push(h);
  }
}

function stepBurst(m, dt) {
  const b = m.burst; if (!b) return;
  b.t += dt;
  const p = PROJ.gear, list = hzList();
  while (b.k < 12 && b.t >= b.k * 0.1) {
    const h = newHz({ kind: 'gear', phase: 'fly', x: m.x, y: m.y, radius: p.r, angle: b.base + 30 * D2R * b.k, dur: p.life, speed: p.speed, owner: m, cast: b.cast, ox: m.x, oy: m.y });
    b.cast.alive++; list.push(h); b.k++;
  }
  if (b.k >= 12) { const c = b.cast; m.burst = null; c.alive--; checkSettle(c); }
}
function cancelBurst(m) {
  if (m.burst) { const c = m.burst.cast; m.burst = null; c.alive--; checkSettle(c); }
}
function cancelWarns(m) {
  for (const h of hzList()) if (!h.dead && h.owner === m && h.phase === 'warn' && h.kind !== 'firecracker') killHz(h);   // 已經出現的爆竹預警圈照常爆
}
function inLine(px, py, ox, oy, ang, len, wid, pad) {
  const c = Math.cos(ang), s = Math.sin(ang);
  const u = (px - ox) * c + (py - oy) * s, v = -(px - ox) * s + (py - oy) * c;
  return u >= -pad && u <= len + pad && Math.abs(v) <= wid / 2 + pad;
}
function inArc(px, py, ox, oy, ang, spread, r, pad) {
  const d = dist(px, py, ox, oy);
  if (d > r + pad) return false;
  if (d <= pad) return true;
  const da = Math.abs(normAng(Math.atan2(py - oy, px - ox) - ang));
  return da <= spread / 2 + Math.asin(Math.min(1, pad / d));
}
function lineHitsCircle(h, px, py, rad) {
  const c = Math.cos(h.angle), s = Math.sin(h.angle);
  const u = (px - h.x) * c + (py - h.y) * s, v = -(px - h.x) * s + (py - h.y) * c;
  const cu = clamp(u, 0, h.length), cv = clamp(v, -h.width / 2, h.width / 2);
  return (u - cu) * (u - cu) + (v - cv) * (v - cv) <= rad * rad;
}


// ───────────────────────── 地下城: 馴獸師 ─────────────────────────
function facingFromDir(dx, dy) {
  if (dx === 0 && dy === -1) return 0; if (dx === 1 && dy === -1) return 1; if (dx === 1 && dy === 0) return 2;
  if (dx === 1 && dy === 1) return 3; if (dx === 0 && dy === 1) return 4; if (dx === -1 && dy === 1) return 5;
  if (dx === -1 && dy === 0) return 6; return 7;
}
// source: 技能代號 / 'hurt' / 'blast'
// h: 打中的投射物 / 射線 / 爆炸(傷害地形給 null); 心歸零時記下它, 倒下動畫定格時要標亮
function hurtTamer(source, h) {
  const T = D.tamer;
  if (D.down || T.invuln > 0 || T.dash) return false;
  T.hearts--; T.invuln = 1.5; D.heartsLost++;
  if (h && h.kind === 'icebeam') T.slowT = 1;
  const lethal = T.hearts <= 0;
  if (lethal && !D.dying) D.dying = { source, kobj: h || null };
  if (!lethal) Snd.play('player_hurt');
  if (D.lasso && !lethal) breakLasso('hit');
  return true;
}
const HZ_CAUSE = { pollen: '鈴蘭精的花粉', match: '火柴猴的火柴', gear: '齒輪甲蟲的齒輪', feather: '標靶鸚鵡的羽毛', icebeam: '冰柱企鵝的冰柱', card: '戲法狸的紙牌', firecracker: '爆竹刺蝟的爆竹' };
function downCause(src) {
  if (src === 'blast') return '被〔爆炸桶〕炸倒了';
  if (src === 'hurt') return D.style === 'snow' ? '被〔冰刺〕刺傷倒下了' : '被〔齒輪刃〕割傷倒下了';
  return '被〔' + (HZ_CAUSE[src] || '魔物') + '〕打倒了';
}
// 心歸零: 倒下動畫共 1.5 秒(定格 0.3 + 倒下 1.2), 期間不接受按鍵、不算進 120 秒
function startDown() {
  const T = D.tamer, dy = D.dying;
  const cause = downCause(dy.source);
  resolvePendingChest();   // 開箱動畫中倒下: 卡片照樣收進來
  D.down = { t: 0, dur: 1.5, cause, kobj: dy.kobj };
  D.prompt = null; D.rope = null;
  if (D.lasso) { D.lasso.m.lassoed = false; D.lasso = null; }   // 套索直接消失: 不播斷掉音效、不記 lasso_break
  Snd.play('player_down'); Snd.music(null);
}
function tryMoveTamer(dx, dy) {
  const T = D.tamer;
  let blocked = false;
  T.x += dx; if (circleSolid(T.x, T.y, 18)) { T.x -= dx; blocked = true; }
  T.y += dy; if (circleSolid(T.x, T.y, 18)) { T.y -= dy; blocked = true; }
  return blocked;
}
function tileAt(x, y) {
  const c = Math.floor(x / TILE), r = Math.floor(y / TILE);
  if (c < 0 || r < 0 || c >= D.W || r >= D.H) return '#';
  return D.grid[r][c];
}
function updateTamer(dt) {
  const T = D.tamer;
  T.invuln = Math.max(0, T.invuln - dt); T.slowT = Math.max(0, T.slowT - dt);
  T.zCd = Math.max(0, T.zCd - dt); T.xCd = Math.max(0, T.xCd - dt);
  if (T.dash) { updateDash(dt); return; }
  const dx = (keys.right ? 1 : 0) - (keys.left ? 1 : 0), dy = (keys.down ? 1 : 0) - (keys.up ? 1 : 0);
  if (dx || dy) {
    T.facing = facingFromDir(dx, dy);
    const len = Math.hypot(dx, dy);
    let sp = 300;
    if (tileAt(T.x, T.y) === 'W') sp *= 0.5;
    if (T.slowT > 0) sp *= 0.5;
    const step = sp * dt, n = Math.max(1, Math.ceil(step / 8));
    for (let i = 0; i < n; i++) tryMoveTamer(dx / len * step / n, dy / len * step / n);
  }
  // 躲草叢
  const inBush = tileAt(T.x, T.y) === 'G';
  if (inBush && !T.hidden) {
    Snd.play('bush_hide'); tut('hide');
  }
  T.hidden = inBush;
  if (circleOnChar(T.x, T.y, 18, 'L')) hurtTamer('hurt', null);
  if (!keys.z) D.zWait = false;
  if (!keys.x) D.xWait = false;
  if (keys.z && !D.zWait && T.zCd <= 0) doAttack(false);
  if (keys.x && !D.xWait && T.xCd <= 0 && !T.dash) doAttack(true);
  if (pressed.space) tryThrowRope();   // 拋繩只吃按下的那一下, 不連發
}
function addFx(o) { D.fx.push(Object.assign({ x: D.tamer.x, y: D.tamer.y, weapon: D.tamer.weapon, move: 'normal', shape: 'arc', angle: 0, spread: 0, radius: 0, length: 0, width: 0, t: 0, dur: 0.2 }, o)); }
function doAttack(isX) {
  const T = D.tamer, wp = T.weapon, ang = (T.facing - 2) * Math.PI / 4;
  const atk = G.atk;
  let sh = null;
  if (!isX) {
    if (wp === 'club') { sh = { shape: 'arc', spread: 100 * D2R, radius: 70, dmg: 2 + atk }; T.zCd = 0.35; }
    else if (wp === 'sword') { sh = { shape: 'arc', spread: 120 * D2R, radius: 80, dmg: 2 + atk, reflect: true }; T.zCd = 0.35; }
    else { sh = { shape: 'line', length: 170, width: 40, dmg: 2 + atk }; T.zCd = 0.45; }
    addFx({ move: 'normal', shape: sh.shape, angle: ang, spread: sh.spread || 0, radius: sh.radius || 0, length: sh.length || 0, width: sh.width || 0, dur: 0.2 });
    Snd.play('attack', wp);
    if (applyShape(sh, T.x, T.y, ang) > 0) tut('zhit');
  } else {
    if (wp === 'club') return;
    T.xCd = xCdMax();
    Snd.play('skill', wp); tut('xskill');
    if (wp === 'sword') {
      sh = { shape: 'arc', spread: 120 * D2R, radius: 80, dmg: 0, stun: true };
      addFx({ move: 'skill', shape: 'arc', angle: ang, spread: sh.spread, radius: 80 });
      applyShape(sh, T.x, T.y, ang);
    } else if (wp === 'spear') {
      T.dash = { t: 0, ang, hit: new Set(), sx: T.x, sy: T.y, trav: 0 };
      addFx({ move: 'skill', shape: 'dash', angle: ang, length: 220, dur: 0.25 });
    }
  }
}
function updateDash(dt) {
  const T = D.tamer, d = T.dash;
  const step = Math.min(dt, 0.25 - d.t) * (220 / 0.25);
  const n = Math.max(1, Math.ceil(step / 8));
  let blocked = false;
  for (let i = 0; i < n; i++) {
    const sx = Math.cos(d.ang) * step / n, sy = Math.sin(d.ang) * step / n;
    const ox = T.x, oy = T.y;
    T.x += sx; if (circleSolid(T.x, T.y, 18)) { T.x -= sx; }
    T.y += sy; if (circleSolid(T.x, T.y, 18)) { T.y -= sy; }
    if (T.x === ox && T.y === oy) { blocked = true; break; }
    d.trav += Math.hypot(T.x - ox, T.y - oy);
    for (const m of D.mons) {
      if (m.dead || m.lassoed || d.hit.has(m)) continue;
      if (dist(m.x, m.y, T.x, T.y) <= 24 + 18) { d.hit.add(m); damageMon(m, 3 + G.atk, 'weapon'); }
    }
  }
  d.t += dt;
  if (blocked || d.t >= 0.25) {
    T.dash = null;
    hitObjects({ shape: 'line', length: d.trav + 60, width: 40 }, d.sx, d.sy, d.ang);
  }
}
function inShape(sh, px, py, ox, oy, ang, pad) {
  if (sh.shape === 'arc') return inArc(px, py, ox, oy, ang, sh.spread, sh.radius, pad);
  if (sh.shape === 'circle') return dist(px, py, ox, oy) <= sh.radius + pad;
  return inLine(px, py, ox, oy, ang, sh.length, sh.width, pad);
}
function applyShape(sh, ox, oy, ang) {
  const T = D.tamer;
  let n = 0;
  for (const m of D.mons) {
    if (m.dead || m.lassoed) continue;
    if (!inShape(sh, m.x, m.y, ox, oy, ang, 24)) continue;
    if (sh.dmg > 0) { damageMon(m, sh.dmg, 'weapon'); n++; }
    if (m.dead) continue;
    if (sh.stun) { m.stun = 2; cancelWarns(m); cancelBurst(m); cancelWindup(m); n++; Snd.once('hit_monster'); }
    if (sh.knock) {
      const a = Math.atan2(m.y - T.y, m.x - T.x);
      m.kb = { vx: Math.cos(a) * 640, vy: Math.sin(a) * 640, t: 0.25 };
    }
  }
  if (sh.reflect) {
    for (const h of D.hz) {
      if (h.dead || h.kind === 'icebeam' || h.reflected || h.phase !== 'fly') continue;
      if (!inShape(sh, h.x, h.y, ox, oy, ang, h.radius)) continue;
      const ow = h.owner;
      h.angle = (ow && !ow.dead && D.mons.indexOf(ow) >= 0) ? Math.atan2(ow.y - T.y, ow.x - T.x) : h.angle + Math.PI;
      h.speed *= 1.2; h.reflected = true; h.t = 0;
    }
  }
  hitObjects(sh, ox, oy, ang);
  return n;
}
// 攻擊範圍蓋到的互動物件: 裂牆、爆炸桶、果樹
function hitObjects(sh, ox, oy, ang) {
  const reach = (sh.radius || sh.length || 0) + 70;
  const c0 = Math.max(0, Math.floor((ox - reach) / TILE)), c1 = Math.min(D.W - 1, Math.floor((ox + reach) / TILE));
  const r0 = Math.max(0, Math.floor((oy - reach) / TILE)), r1 = Math.min(D.H - 1, Math.floor((oy + reach) / TILE));
  for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) {
    if (D.grid[r][c] !== 'X') continue;
    if (!inShape(sh, c * TILE + 30, r * TILE + 30, ox, oy, ang, 0)) continue;
    addCrack(r, c);
  }
  for (const k of D.kegs) if (k.mode === 'ok' && inShape(sh, k.x, k.y, ox, oy, ang, 0)) igniteKeg(k);
  for (const t of D.trees) if (t.hasFruit && inShape(sh, t.x, t.y, ox, oy, ang, 0)) dropFruit(t);
}
function addCrack(r, c) {
  const key = r * D.W + c;
  D.cracks[key] = (D.cracks[key] || 0) + 1;
  if (D.cracks[key] >= 3) {
    D.grid[r][c] = '.';
    Snd.play('wall_break'); tut('wall');
  } else Snd.play('wall_crack');
}
function igniteKeg(k) {
  if (k.mode !== 'ok') return;
  k.mode = 'fuse'; k.fuseT = 0; Snd.play('keg_fuse');
}
function explodeKeg(k) {
  k.mode = 'gone'; k.fuseT = 0;   // 炸掉就消失, 這趟不再長回來(下次進地下城才重新生成)
  const blast = { x: k.x, y: k.y, t: 0, dur: 0.3 };
  D.blasts.push(blast);
  Snd.play('keg_blast'); tut('keg');
  for (const m of D.mons) {
    if (m.dead || m.lassoed) continue;
    if (dist(m.x, m.y, k.x, k.y) <= 130 + 24) damageMon(m, 4, 'blast');
  }
  if (dist(D.tamer.x, D.tamer.y, k.x, k.y) <= 130 + 18) hurtTamer('blast', blast);
  for (let r = 0; r < D.H; r++) for (let c = 0; c < D.W; c++) {
    if (D.grid[r][c] === 'X' && dist(c * TILE + 30, r * TILE + 30, k.x, k.y) <= 130) addCrack(r, c);
  }
  for (const o of D.kegs) if (o !== k && o.mode === 'ok' && dist(o.x, o.y, k.x, k.y) <= 130) igniteKeg(o);
}
// 回血果樹: 打樹掉下 1 顆果子(這趟不再結果); 果子留在樹下方那格, 馴獸師碰到且心沒滿才吃(魔物不理果子)
function dropFruit(t) {
  t.hasFruit = false;
  const f = { x: t.x, y: t.y + 60 };
  D.fruits.push(f);
  Snd.play('fruit_drop');
}
function damageMon(m, dmg, by) {
  if (m.dead || m.lassoed) return;
  const wasWeak = isWeak(m);
  m.hp -= dmg; m.hitT = 0.1;
  if (!wasWeak && m.hp <= 0) m.hp = 1;   // 保底殘血: 非殘血的魔物不會被一擊打死, 停在 1 血進殘血
  Snd.once('hit_monster');
  if (D.id === 'meadow' && wasWeak) { m.hp += dmg; return; }   // 見習草地殘血魔物不再受傷(照樣閃白、播受擊音)
  if (m.hp <= 0) killMon(m, by);
  else if (!wasWeak && isWeak(m)) { Snd.once('monster_weak'); tut('weak'); }
}
function killMon(m, by) {
  m.dead = true; cancelWarns(m); cancelBurst(m);
  m.nest.mon = null; m.nest.respawn = D.respawnT;
  const k = SP[m.sp].kill;
  G.gold += k; G.goldEarned += k; D.kills++; D.killGold += k;
  Snd.play('kill');
  addDFloat(m.x, m.y - 40, '+' + k, 'gold');
  if (D.lasso && D.lasso.m === m) D.lasso = null;
}
function addDFloat(x, y, text, kind, dur) { D.floats.push({ x, y, text, kind, t: 0, dur: dur || 1 }); }


// ───────────────────────── 地下城: 魔物 ─────────────────────────
function dirDungeon(m) {
  const T = D.tamer, d = dist(m.x, m.y, T.x, T.y);
  if (d >= 300 || T.hidden) return rnd(0, Math.PI * 2);
  const to = Math.atan2(T.y - m.y, T.x - m.x);
  if (d > 200) return to;
  if (d < 120) return to + Math.PI;
  return to + (Math.random() < 0.5 ? 1 : -1) * Math.PI / 2;
}
function teleDungeon(m) {
  const b = roomBounds(m.room), T = D.tamer;
  if (dist(m.x, m.y, T.x, T.y) < 300 && !T.hidden) {
    for (let i = 0; i < 40; i++) {
      const x = rnd(b.x0, b.x1), y = rnd(b.y0, b.y1), d = dist(x, y, T.x, T.y);
      if (d >= 150 && d <= 250) return { x, y };
    }
  }
  return { x: rnd(b.x0, b.x1), y: rnd(b.y0, b.y1) };
}
function intervalWild(m) { return m.interval * (m.weak ? 1.5 : 1); }
// 前搖(只在地下城): 每次施放前魔物停住、頭上「!」、朝要射的方向畫短箭頭; 冰柱企鵝的射線預警(0.7 秒)就是牠的前搖
const WINDUP = { lily: 0.6, monkey: 0.6, beetle: 0.6, tanuki: 0.6, hedgehog: 0.6, parrot: 0.5 };
// 前搖被打斷(劍擊暈、被套住): 不放技能, 間隔重新計時
function cancelWindup(m) {
  if (!m.windup) return;
  m.windup = false; m.windupT = 0; m.aim = null;
  m.castT = intervalWild(m);
}
function updateWild(m, dt) {
  const T = D.tamer;
  m.hitT = Math.max(0, m.hitT - dt);
  m.escapeT = Math.min(0.4, m.escapeT + dt);
  m.weak = isWeak(m);
  const b = roomBounds(m.room);
  if (m.lassoed) { m.casting = false; cancelWindup(m); return; }
  if (m.stun > 0) { m.stun = Math.max(0, m.stun - dt); m.casting = false; cancelWindup(m); return; }
  // 前搖中: 停住不動(戲法狸不瞬移), 瞄準方向每幀跟著馴獸師, 前搖結束的瞬間放技能
  if (m.windup) {
    m.move = 'walk'; m.moveT = 0; m.moveDur = 0;
    m.aim = Math.atan2(T.y - m.y, T.x - m.x);
    m.windupT += dt;
    if (m.windupT >= m.windupDur) {
      m.windup = false; m.windupT = 0; m.aim = null;
      emitSkill(m, T.x, T.y, newCast(m, 1, true));
      Snd.once('monster_cast');
      m.castT = intervalWild(m);
    }
    m.casting = !!m.burst;
    if (m.burst) stepBurst(m, 0);
    return;
  }
  if (m.kb) {
    m.x = clamp(m.x + m.kb.vx * dt, b.x0, b.x1); m.y = clamp(m.y + m.kb.vy * dt, b.y0, b.y1);
    m.kb.t -= dt; if (m.kb.t <= 0) m.kb = null;
  } else if (D.id === 'meadow' && m.weak) {
    m.move = 'walk'; m.moveT = 0; m.moveDur = 0;   // 見習草地的殘血魔物原地不動
  } else {
    moveMonster(m, dt, { b, dir: dirDungeon, tele: teleDungeon }, m.weak ? 0.5 : 1);
  }
  if (m.burst) stepBurst(m, dt);
  let warn = null;
  for (const h of D.hz) if (!h.dead && h.owner === m && h.phase === 'warn' && h.kind !== 'firecracker') warn = h;   // 丟出去的爆竹預警圈不算「正在施放」
  m.warnH = warn;
  m.casting = !!warn || !!m.burst;
  const d = dist(m.x, m.y, T.x, T.y);
  if (D.id === 'meadow') { m.inRange = false; m.casting = false; }   // 見習草地的魔物不攻擊, 只走動
  else if (d < 300 && !T.hidden) {
    if (!m.inRange) { m.inRange = true; m.castT = intervalWild(m); }
    m.castT -= dt;
    if (m.sp === 'penguin') {
      // 企鵝: 射線預警開始 = 前搖開始
      if (m.castT <= 0 && !m.casting) {
        emitSkill(m, T.x, T.y, newCast(m, 1, true));
        Snd.once('monster_windup');
        m.castT = intervalWild(m);
      }
    } else if (m.castT <= WINDUP[m.sp] && !m.casting && m.tp === 0) {
      // 施放間隔 − 前搖長度 時開始前搖(前搖算在間隔裡)
      m.windup = true; m.windupT = 0; m.windupDur = WINDUP[m.sp];
      m.aim = Math.atan2(T.y - m.y, T.x - m.x);
      Snd.once('monster_windup');
    }
  } else m.inRange = false;
}

// ───────────────────────── 地下城: 投射物 ─────────────────────────
function updateHazardsDungeon(dt) {
  const T = D.tamer;
  for (const h of D.hz) {
    if (h.dead) continue;
    if (h.owner && !h.owner.dead) { h.ox = h.owner.x; h.oy = h.owner.y; }
    if (h.kind === 'icebeam') {
      h.t += dt;
      if (h.phase === 'warn') {
        if (h.owner.dead || h.owner.stun > 0 || h.owner.lassoed) { killHz(h); continue; }
        if (h.t >= h.dur) {
          h.phase = 'active'; h.t = 0; h.dur = 0.2;
          Snd.once('monster_cast');
          if (lineHitsCircle(h, T.x, T.y, 18)) hurtTamer('icebeam', h);
          for (const k of D.kegs) if (k.mode === 'ok' && inLine(k.x, k.y, h.x, h.y, h.angle, h.length, h.width, 0)) igniteKeg(k);
        }
      } else if (h.t >= h.dur) killHz(h);
      continue;
    }
    if (h.kind === 'firecracker') {   // 預警 0.8 秒後爆炸(判定只在爆炸那一瞬間做一次); 擊暈 / 被套 / 被收服也照常爆
      h.t += dt;
      if (h.phase === 'warn') {
        if (h.t >= h.dur) {
          h.phase = 'active'; h.t = 0; h.dur = 0.2;
          Snd.once('firecracker');
          if (dist(h.x, h.y, T.x, T.y) <= h.radius + 18) hurtTamer('firecracker', h);
        }
      } else if (h.t >= h.dur) killHz(h);
      continue;
    }
    h.t += dt;
    if (h.t >= h.dur) { killHz(h); continue; }
    const step = h.speed * dt;
    h.x += Math.cos(h.angle) * step; h.y += Math.sin(h.angle) * step;
    if (solidAtPoint(h.x, h.y)) {
      if (h.reflected) { const tr = D.trees.find(t => t.hasFruit && Math.floor(t.x / TILE) === Math.floor(h.x / TILE) && Math.floor(t.y / TILE) === Math.floor(h.y / TILE)); if (tr) dropFruit(tr); }
      killHz(h); continue;
    }
    let kegHit = null;
    for (const k of D.kegs) if (k.mode !== 'gone' && dist(h.x, h.y, k.x, k.y) <= 22 + h.radius) { kegHit = k; break; }
    if (kegHit) { igniteKeg(kegHit); killHz(h); continue; }
    if (h.reflected) {
      for (const m of D.mons) {
        if (m.dead || m.lassoed) continue;
        if (dist(h.x, h.y, m.x, m.y) <= h.radius + 24) { damageMon(m, 3 + G.atk, 'reflect'); killHz(h); break; }
      }
      continue;
    }
    if (T.invuln <= 0 && !T.dash && dist(h.x, h.y, T.x, T.y) <= h.radius + 18) {
      if (h.kind === 'match') {
        if (!h.hit) h.hit = new Set();
        if (h.cast && h.hit.has(h.cast)) continue;
        if (h.cast) h.hit.add(h.cast);
        hurtTamer('match', h);
      } else { hurtTamer(h.kind, h); killHz(h); }
    }
  }
  D.hz = D.hz.filter(h => !h.dead);
}


// ───────────────────────── 地下城: 互動物件、捕捉 ─────────────────────────
function updateObjects(dt) {
  const T = D.tamer;
  // 傳送陣
  D.pairCd[1] = Math.max(0, D.pairCd[1] - dt); D.pairCd[2] = Math.max(0, D.pairCd[2] - dt);
  for (const p of D.portals) {
    const d = dist(T.x, T.y, p.x, p.y);
    if (d > 40) p.armed = true;
    if (d <= 24 && p.armed && D.pairCd[p.id] <= 0) {
      p.charge += dt;
      if (p.charge >= 0.3) {
        const other = D.portals.find(q => q !== p && q.id === p.id);
        p.charge = 0;
        if (other) {
          T.x = other.x; T.y = other.y; other.armed = false; other.charge = 0;
          D.pairCd[p.id] = 1.5;
          Snd.play('teleport'); tut('tele');
        }
      }
    } else p.charge = 0;
  }
  // 回復泉
  for (const f of D.fountains) {
    if (f.full && T.hearts < T.maxHearts && dist(T.x, T.y, f.x, f.y) <= 30) {
      f.full = false; T.hearts = T.maxHearts;
      addDFloat(T.x, T.y - 50, '血量補滿', 'heal');
      Snd.play('heal'); tut('heal');
    }
  }
  // 爆炸桶
  for (const k of D.kegs) {
    if (k.mode === 'fuse') { k.fuseT += dt; if (k.fuseT >= 1.0) explodeKeg(k); }
  }
  for (const b of D.blasts) b.t += dt;
  D.blasts = D.blasts.filter(b => b.t < b.dur);
  // 果子: 馴獸師中心離果子 ≤ 30 且心沒滿 → 吃掉回 1 心; 心滿了碰了沒反應、果子留著
  for (const f of D.fruits) {
    if (f.eaten || T.hearts >= T.maxHearts || dist(T.x, T.y, f.x, f.y) > 30) continue;
    f.eaten = true; T.hearts++;
    addDFloat(T.x, T.y - 50, '血量 +1', 'heal');
    Snd.play('fruit_eat'); tut('fruitEat');
  }
  D.fruits = D.fruits.filter(f => !f.eaten);
}

function startLasso(m) {
  m.lassoed = true; cancelWarns(m); cancelBurst(m); cancelWindup(m); m.casting = false;
  const T = D.tamer;
  D.lasso = { m, t: 0, limit: 5, sum: 0, last: Math.atan2(T.y - m.y, T.x - m.x) };
  Snd.play('capture_ready'); tut('lasso');
}
function breakLasso(reason) {
  if (!D.lasso) return;
  const m = D.lasso.m;
  m.lassoed = false;
  Snd.play('lasso_break');
  D.lasso = null;
}

function captureDone() {
  const L = D.lasso, m = L.m;
  D.ropes--;   // 只有收服成功才扣繩
  const auto = G.stageInit && stageCount() < 20;
  const b = addMonster(m.sp, auto);
  D.caps.push(m.sp); D.capPop = 0;
  addDFloat(m.x, m.y - 40, '收服!', 'capture');
  const Q = D.quest, finalCap = !!Q && D.caps.length >= 3;
  if (!finalCap) Snd.play('capture');   // 任務完成那一刻只播 quest_done, 不疊 capture
  tut('capture');
  m.dead = true; m.nest.mon = null; m.nest.respawn = D.respawnT;
  D.lasso = null;
  if (Q) {
    Q.popT = 0;
    if (finalCap) {
      Q.phase = 'done'; Q.t = 0;   // 任務完成: 定格 1.0 秒後才進結算
      Snd.play('quest_done');
    }
  }
}
function updateCapture(dt) {
  const T = D.tamer;
  if (!D.lasso) return;
  const L = D.lasso, m = L.m;
  L.t += dt;
  const a = Math.atan2(T.y - m.y, T.x - m.x);
  L.sum += normAng(a - L.last); L.last = a;
  if (dist(T.x, T.y, m.x, m.y) > 220) { breakLasso('distance'); return; }
  if (L.t >= L.limit) { breakLasso('timeout'); return; }
  if (Math.abs(L.sum) / (Math.PI * 2) >= 1) captureDone();
}

// ───── 拋繩(空白鍵) ─────
const ROPE_SPEED = 700, ROPE_RANGE = 220, ROPE_BACK = 0.15;
// 「現在按空白鍵會瞄到哪一隻」: 馴獸師中心 220 以內、和面向相差 ≤ 30° 的野生魔物裡最近的一隻(被套住、淡出中的戲法狸除外)
function ropeAimTarget() {
  const T = D.tamer;
  const face = (T.facing - 2) * Math.PI / 4;
  let tgt = null, bd = 1e9;
  for (const m of D.mons) {
    if (m.dead || m.lassoed || (m.sp === 'tanuki' && m.tp === 1)) continue;
    const d = dist(m.x, m.y, T.x, T.y);
    if (d > ROPE_RANGE) continue;
    if (Math.abs(normAng(Math.atan2(m.y - T.y, m.x - T.x) - face)) > 30 * D2R + 1e-9) continue;
    if (d < bd) { bd = d; tgt = m; }
  }
  return tgt ? { m: tgt, d: bd } : null;
}
function tryThrowRope() {
  const T = D.tamer;
  if (D.lasso || D.rope || T.dash) return;   // 套索中、繩子飛行中: 空白鍵不反應
  if (D.ropes <= 0) {
    Snd.play('ui_denied');
    D.floats = D.floats.filter(f => !(f.kind === 'hint' && f.text === '繩子用完了'));
    addDFloat(T.x, T.y - 96, '繩子用完了', 'hint', 1.5);
    return;
  }
  const face = (T.facing - 2) * Math.PI / 4;
  const aim = ropeAimTarget();
  const tgt = aim ? aim.m : null;
  D.rope = { phase: 'out', x: T.x, y: T.y, ang: face, trav: 0, t: 0, dur: ROPE_RANGE / ROPE_SPEED, tgt, tdist: aim ? aim.d : null, aimed: !!aim, hx: T.x, hy: T.y };
  Snd.play('rope_throw');
}
function ropeResult(result, m) {
}

function updateRope(dt) {
  const R = D.rope, T = D.tamer;
  if (!R) return;
  if (R.phase === 'back') {
    R.t += dt;
    if (R.t >= ROPE_BACK) D.rope = null;
    return;
  }
  // 飛出中: 繩頭追著目標(沒目標就朝面向直飛); 分段走, 免得穿過牆或魔物
  let left = Math.min(ROPE_SPEED * dt, ROPE_RANGE - R.trav);
  const n = Math.max(1, Math.ceil(left / 8));
  for (let i = 0; i < n && R.phase === 'out'; i++) {
    const st = left / n;
    if (R.tgt && !R.tgt.dead && !R.tgt.lassoed) R.ang = Math.atan2(R.tgt.y - R.y, R.tgt.x - R.x);
    R.x += Math.cos(R.ang) * st; R.y += Math.sin(R.ang) * st; R.trav += st;
    // 撞牆、石柱、裂牆、果樹、爆炸桶 → 收回, 不扣繩
    if (solidAtPoint(R.x, R.y) || kegBlock(R.x, R.y, 0)) {
      ropeResult('miss', null); R.phase = 'back'; R.t = 0; R.hx = R.x; R.hy = R.y; break;
    }
    let hit = null;
    for (const m of D.mons) {
      if (m.dead || m.lassoed || (m.sp === 'tanuki' && m.tp === 1)) continue;
      // 套索最長 220: 魔物離馴獸師超過 220 就不算打中(免得套上瞬間就斷)
      if (dist(R.x, R.y, m.x, m.y) <= 16 + 24 && dist(T.x, T.y, m.x, m.y) <= 220) { hit = m; break; }
    }
    if (hit) {
      if (isWeak(hit)) {
        ropeResult('lasso', hit);
        D.rope = null;
        startLasso(hit);
      } else {
        ropeResult('escape', hit);
        hit.escapeT = 0;
        addDFloat(hit.x, hit.y - 60, '掙脫了!', 'escape');
        Snd.play('rope_escape');
        if (!TUT.done[6] && (D.id === 'meadow' || (D.id === 'd1' && D.fi === 0))) { TUT.escMon = hit; tutTrig(6); }
        R.phase = 'back'; R.t = 0; R.hx = R.x; R.hy = R.y;
      }
      break;
    }
    if (R.trav >= ROPE_RANGE - 1e-6) { ropeResult('miss', null); R.phase = 'back'; R.t = 0; R.hx = R.x; R.hy = R.y; break; }
  }
  if (R.phase === 'out') R.t = Math.min(R.dur, R.trav / ROPE_SPEED);
}


// ───────────────────────── 地下城: 強化石碑、寶箱、樓梯、拿到卡過場、下樓轉場 ─────────────────────────
function takeBoost(s) {
  const T = D.tamer;
  s.used = true; G.usedBoosts[s.key] = true; G.boostsGot++;
  let value = 0;
  if (s.kind === 'heart') {
    G.heartMax = Math.min(HEART_CAP, G.heartMax + 1); T.maxHearts = G.heartMax; T.hearts = Math.min(T.maxHearts, T.hearts + 1); value = G.heartMax;
  } else if (s.kind === 'rope') {
    G.ropeMax = Math.min(9, G.ropeMax + 1); D.ropes = Math.min(G.ropeMax, D.ropes + 1); value = G.ropeMax;
  } else { G.atk = Math.min(3, G.atk + 1); value = G.atk; }
  D.loot.push({ kind: s.kind, key: '', name: BOOST_NAME[s.kind] });
  addDFloat(T.x, T.y - 96, BOOST_TEXT[s.kind], 'boost', 1.5);
  Snd.play('boost_get');   // 心 +1 的回血特效不另播 heal
}
function openChest(c) {
  c.open = true; c.openT = 0; G.openedChests[c.key] = true;
  if (c.isKey) D.chestOpen = { c, t: 0 };
  else D.goldOpens.push({ c, t: 0, paid: false });   // 金幣寶箱: 不暫停, 開蓋完成(0.3 秒)那刻金幣進錢包
  Snd.play('chest_open');
}
function payGoldChest(o) {
  const c = o.c;
  o.paid = true;
  G.gold += c.gold; G.goldEarned += c.gold; G.chestGold += c.gold; G.chestsOpened++; D.chestGold += c.gold;
  D.loot.push({ kind: 'gold', key: '', name: '金幣寶箱 +' + c.gold, gold: c.gold });
  addDFloat(c.x, c.y - 50, '金幣 +' + c.gold, 'gold', 1);
  Snd.play('gold_get');
}
// 卡片收進擁有(收下過場時、或過場來不及就地圖結束時)
function grantCard(c, readT) {
  if (c.kind === 'key') {   // 鑰匙: 不算卡; 第 2 座在過場開始那一刻就開放(這裡只是保險, 沒開放過才補開)
    unlockKey();
    D.loot.push({ kind: 'key', key: c.ckey, name: KEY_INFO.name });
    return;
  }
  const first = !cardSeen;
  if (c.kind === 'cue') G.ownedCues[c.ckey] = true; else G.ownedProgs[c.ckey] = true;
  G.newCards[c.ckey] = c.kind; G.cardsGot++;
  D.loot.push({ kind: c.kind, key: c.ckey, name: cardName(c.ckey) });
}
// 拿到鑰匙: 第 2 座開放(過場開始那一刻; 不看名聲、不用離開), 下次出發準備冒「第 2 座地下城開放」
function unlockKey() {
  if (G.unlocked.d2) return;
  G.unlocked.d2 = true; G.unlockQueue.push('d2'); G.keyDay = G.day;
  if (G.unlockQueue.indexOf('shelf') < 0) G.unlockQueue.push('shelf');   // 冷場同時上架 → 商店上架新東西
}
// 開箱動畫還沒播完就結束地下城(時間到、離開): 卡片照樣收進來
function resolvePendingChest() {
  if (D.chestOpen) { grantCard(D.chestOpen.c, 0); D.chestOpen = null; }
  for (const o of D.goldOpens) if (!o.paid) payGoldChest(o);   // 開蓋還沒完成就結束: 金幣照樣收進來
  D.goldOpens = [];
}
function updateFindings(dt) {
  const T = D.tamer;
  for (const s of D.shrines) if (!s.used && dist(T.x, T.y, s.x, s.y) <= 30) takeBoost(s);
  for (const o of D.goldOpens) {
    o.t += dt; o.c.openT = Math.min(0.6, o.t);
    if (!o.paid && o.t >= 0.3) payGoldChest(o);
  }
  D.goldOpens = D.goldOpens.filter(o => o.t < 0.6);
  if (D.chestOpen) {
    const o = D.chestOpen;
    o.t += dt; o.c.openT = Math.min(0.3, o.t);
    if (o.t >= 0.3) {
      D.chestOpen = null;
      const c = o.c;
      D.cardGet = { c, kind: c.kind, key: c.ckey, t: 0, dur: 1.2, ready: false, first: !cardSeen, fromX: c.x, fromY: c.y };
      if (c.kind === 'key') unlockKey();   // 鑰匙: 過場開始那一刻就開放第 2 座(不播 unlock)
      Snd.play('card_get');
    }
  } else {
    for (const c of D.chests) if (!c.open && dist(T.x, T.y, c.x, c.y) <= 22 + 18 + 6) { openChest(c); break; }
  }
  if (D.stairs && !D.floorFx) {
    const d = dist(T.x, T.y, D.stairs.x, D.stairs.y);
    if (!D.stairs.armed) { if (d > 50) D.stairs.armed = true; }
    else if (d <= 30) startFloorFx(false);
  }
  if (D.upStairs && !D.floorFx && dist(T.x, T.y, D.upStairs.x, D.upStairs.y) <= 30) startFloorFx(true);
}
function updateCardGet(dt) {
  const g = D.cardGet;
  for (const f of D.floats) f.t += dt;
  D.floats = D.floats.filter(f => f.t < f.dur);
  g.t = Math.min(g.dur, g.t + dt);
  g.ready = g.t >= g.dur;
  if (g.ready && pressed.z) {
    Snd.play('ui_confirm');
    grantCard(g.c, g.t + (g.extra || 0));
    if (g.kind !== 'key') cardSeen = true;
    D.cardGet = null; D.zWait = true; D.xWait = true;
  } else if (g.ready) g.extra = (g.extra || 0) + dt;   // 1.2 秒之後的等待時間也算進「過場開到按 Z」
}
function startFloorFx(up) {
  D.floorFx = { t: 0, dur: 1.0, n: up ? D.fi : D.fi + 2, up: !!up, switched: false };
  Snd.play(up ? 'stairs_up' : 'stairs_down');
  if (!up) tutStairs();
}
function updateFloorFx(dt) {
  const f = D.floorFx;
  f.t += dt;
  if (!f.switched && f.t >= 0.4) {
    f.switched = true;
    if (D.lasso) {   // 套索直接消失: 不扣繩、不播斷掉音效
      const m = D.lasso.m;
      m.lassoed = false;
      D.lasso = null;
    }
    for (const o of D.goldOpens) if (!o.paid) payGoldChest(o);
    D.goldOpens = [];
    saveFloor();
    const nf = f.up ? D.fi - 1 : D.fi + 1, revisit = !!D.saved[nf];
    D.floorVisits++;
    buildFloor(nf, f.up ? 'up' : 'down');
  }
  if (f.t >= f.dur) D.floorFx = null;
}

// 出口詢問框開著: 整個地下城暫停, 只接受 ← → Z X(飄字照常計時)
function updateExitPrompt(dt) {
  const P = D.prompt;
  P.t += dt;
  for (const f of D.floats) f.t += dt;
  D.floats = D.floats.filter(f => f.t < f.dur);
  if (pressed.left && P.choice !== 0) { P.choice = 0; Snd.play('ui_move'); }
  else if (pressed.right && P.choice !== 1) { P.choice = 1; Snd.play('ui_move'); }
  else if (pressed.x || (pressed.z && P.choice === 1)) {
    D.prompt = null; D.exit.armed = false;   // 離開出口 > 50 才會再觸發
    D.stayAt = D.elapsed;
    D.zWait = true; D.xWait = true;
    Snd.play('ui_cancel');
  } else if (pressed.z) {
    Snd.play('ui_confirm');
    D.prompt = null;
    endDungeon('exit');
  }
}
function checkExit() {
  const E = D.exit, T = D.tamer;
  if (!E) return;
  const d = dist(T.x, T.y, E.x, E.y);
  if (!E.armed) { if (d > 50) E.armed = true; return; }
  if (d <= 30) {
    D.prompt = { choice: 1, t: 0 };
    const reshow = D.stayAt >= 0;
    Snd.play('exit_prompt');   // 出口和開放第 2 座無關(改由鑰匙寶箱)
  }
}

function updateDungeon(dt) {
  // 倒下動畫: 定格 0.3 + 倒下 1.2, 期間其他一切定格、不接受按鍵
  if (D.down) { D.down.t += dt; if (D.down.t >= D.down.dur) endDungeon('down'); return; }
  if (updateQuest(dt)) return;
  if (D.floorFx) { updateFloorFx(dt); return; }
  if (D.cardGet) { updateCardGet(dt); return; }
  if (D.prompt) { updateExitPrompt(dt); return; }
  // 暫停式引導(第 21~25 階段): 第一次進正式地下城, 自由活動滿 3 秒(上面幾種暫停都不在)就暫停
  if (D.id !== 'meadow' && !TUT.done[21] && D.elapsed >= 3.0) { startGuide('dungeon'); return; }
  D.elapsed += dt;
  if (D.timed) D.timeLeft -= dt;
  updateTamer(dt);
  updateObjects(dt);
  updateFindings(dt);
  if (D.floorFx) return;
  for (const n of D.nests) {
    if (!n.mon) { n.respawn -= dt; if (n.respawn <= 0) spawnWild(n); }
  }
  for (const m of D.mons) if (!m.dead) updateWild(m, dt);
  updateHazardsDungeon(dt);
  D.mons = D.mons.filter(m => !m.dead);
  updateRope(dt);
  updateCapture(dt);
  for (const f of D.fx) f.t += dt;
  D.fx = D.fx.filter(f => f.t < f.dur);
  for (const f of D.floats) f.t += dt;
  D.floats = D.floats.filter(f => f.t < f.dur);
  const T = D.tamer;
  // 心數增減: 重新從 0 計時並換成新的特效(扣血 / 回血)
  { const hb = D.hb;
    if (T.hearts !== hb.last) {
      hb.fx = T.hearts < hb.last ? 'hurt' : 'heal'; hb.delta = Math.abs(T.hearts - hb.last); hb.t = 0; hb.last = T.hearts;
    } else if (hb.fx !== 'none') {
      hb.t += dt;
      if (hb.t >= 2) { hb.fx = 'none'; hb.t = 2; hb.delta = 0; }
    } }
  if (T.hearts <= 0) {
    if (D.id === 'meadow') T.hearts = T.maxHearts;   // 教學不會失敗: 補滿血量、原地繼續
    else { startDown(); return; }
  }
  if (D.timed && D.timeLeft <= 0) { endDungeon('time'); return; }
  checkExit();
}
function endDungeon(reason) {
  resolvePendingChest();
  if (D.lasso) { D.lasso.m.lassoed = false; D.lasso = null; }
  DR = { reason, captures: D.caps.slice(), kills: D.kills, gold: D.killGold, cause: reason === 'down' && D.down ? D.down.cause : '',
    floorReached: D.fi + 1, loot: D.loot.map(l => ({ kind: l.kind, key: l.key, name: l.name })) };
  Snd.play('dungeon_end', reason);
  tutDungeonEnd(D.id);
  D = null;
  checkUnlock();
  setScene('dresult');
}
function dresultInput() {
  if (!pressed.z) return;
  Snd.play('ui_confirm');
  startIntermission();   // 每天都播進場過場(第 4b 條)
}


// 進場過場(第 4b 條): 地下城結算之後每天都播; 馴獸師帶著這趟收服的魔物走進帳篷; 出現 0.6 秒後才接受 Z
function startIntermission() {
  const mons = G.day === 0 ? ['monkey', 'monkey', 'monkey'] : (DR ? DR.captures.slice() : []);
  IM = { t: 0, mons, n: mons.length, pops: 0, cheered: false };
  setScene('intermission');
  Snd.play('intermission');
}
function intermissionInput(dt) {
  IM.t += dt;
  const allInT = 2.05 + 0.25 * IM.n;
  // 每隻魔物走到門的時刻 t_k = 1.75 + 0.25k(k = 1..n)播 enter_pop; 全員進門播 intermission_cheer
  while (IM.pops < IM.n && IM.t >= 1.75 + 0.25 * (IM.pops + 1)) { IM.pops++; Snd.play('enter_pop'); }
  if (!IM.cheered && IM.t >= allInT) { IM.cheered = true; Snd.play('intermission_cheer'); }
  if (IM.t >= 0.6 && pressed.z) {
    Snd.play('ui_confirm');
    if (G.day === 0) enterSetup1(); else enterPrep('show', 0);
  }
}


// ───────────────────────── 布置 ─────────────────────────
const UI = { floats: [] };
function uiFloat(x, y, text, kind) { UI.floats.push({ x, y, text, kind, t: 0, dur: 1 }); }
// 擋下提示(kind hint, 1.5 秒, 停在原位); 同一個提示顯示中又觸發 → 重新計時, 不疊兩個
function setupHint(text, x, y) {
  UI.floats = UI.floats.filter(f => !(f.kind === 'hint' && f.text === text));
  UI.floats.push({ x, y, text, kind: 'hint', t: 0, dur: 1.5 });
}
function enterSetup1() {
  if (G.day >= 1 && !G.stageInit) { G.bank.forEach((b, i) => { b.on = i < 20; }); G.stageInit = true; }
  G.s1 = { cur: 0, top: 0, zone: 'grid', back: 0 };
  G.editT = 0; G.stagePopT = 0.3;
  UI.floats = [];
  setScene('setup1');
}
// 格子游標移動(10 欄); 回傳 moved / up / down / ''
function gridMove(s, key, n) {
  const cur = s[key], row = Math.floor(cur / 10), last = Math.floor((n - 1) / 10);
  if (pressed.left) { if (cur % 10 > 0) { s[key]--; return 'moved'; } }
  else if (pressed.right) { if (cur % 10 < 9 && cur + 1 < n) { s[key]++; return 'moved'; } }
  else if (pressed.up) { if (row > 0) { s[key] -= 10; return 'moved'; } return 'up'; }
  else if (pressed.down) { if (row < last) { s[key] = Math.min(n - 1, cur + 10); return 'moved'; } return 'down'; }
  return '';
}
function fixScroll(s, key, n) {
  if (s[key] >= n) s[key] = Math.max(0, n - 1);
  const rows = Math.max(1, Math.ceil(n / 10)), row = Math.floor(s[key] / 10);
  if (row < s.top) s.top = row;
  if (row > s.top + 2) s.top = row - 2;
  s.top = clamp(s.top, 0, Math.max(0, rows - 3));
}
function goSetup2() { delete G.s1.hold; G.s2 = { row: 0, col: 0, panel: null }; setScene('setup2'); }
function setup1Input(dt) {
  const s = G.s1, n = G.bank.length;
  fixScroll(s, 'cur', n);
  if (G.stagePopT < 0.3) G.stagePopT = Math.min(0.3, G.stagePopT + dt);
  if (s.hold !== undefined) {   // 第 9 階段: 讓完成特效(0.6 秒)在這個畫面播完再進第 2 步, 期間不接輸入
    s.hold += dt;
    if (TUT.done[9] || s.hold >= 1.0) goSetup2();
    return;
  }
  if (s.zone === 'grid') {
    const r = gridMove(s, 'cur', n);
    if (r === 'moved') Snd.play('ui_move');
    else if (r === 'down') { s.back = s.cur; s.zone = 'next'; Snd.play('ui_move'); }
    else if (pressed.z && n > 0) {
      const b = G.bank[s.cur];
      if (b.on) { b.on = false; G.stagePopT = 0; Snd.play('ui_cancel'); }
      else if (stageCount() < stageLimit()) { b.on = true; G.stagePopT = 0; Snd.play('ui_confirm'); }
      else Snd.play('ui_denied');   // 見習日 3 隻就是全部(上限 = 怪物庫數), 實際碰不到; 提示與埋點已拿掉
    }
    fixScroll(s, 'cur', n);
  } else if (s.zone === 'next') {
    if (pressed.up) { s.zone = 'grid'; s.cur = s.back; Snd.play('ui_move'); }
    else if (pressed.down) { if (G.day !== 0) { s.zone = 'back'; Snd.play('ui_move'); } }   // 見習日沒有「回選地點」
    else if (pressed.z) {
      const need = G.day === 0 ? stageCount() === STAGE_MAX_TUT : stageCount() >= 1;
      if (need) {
        Snd.play('ui_confirm');
        if (TUT.cur && TUT.cur.id === 9 && TUT.cur.phase === 'show') { tut('next'); s.hold = 0; }   // 先播完成特效再換畫面
        else goSetup2();
      }
      else {
        Snd.play('ui_denied');
        if (G.day === 0) {   // 見習日一定要選滿 3 隻
          setupHint('要選 3 隻上台 才能下一步', 1070, 450);
        }
      }
    }
  } else {
    if (pressed.up) { s.zone = 'next'; Snd.play('ui_move'); }
    else if (pressed.z) {
      // 「回選地點」: 回今天去哪(上台設定保留, 不過天); 見習日沒有這個按鈕
      Snd.play('ui_cancel');
      enterPrep('show', 0);
    }
  }
}



// 布置第 2 步: 節目單。游標 0~3 是列, 4 開演, 5 返回上一步
const BTN_GO = ROWS, BTN_BACK = ROWS + 1;
function cueCap() { return Math.min(ROWS, Object.keys(G.ownedCues).length); }   // 可排列數 = min(4, 擁有的暗號數)
// 列的狀態: locked(暗號不夠, 鎖住)| blocked(先排上面的列)| open(可編輯)
function rowState(i) {
  if (i >= cueCap()) return 'locked';
  let n = 0; while (n < ROWS && G.rows[n].cue) n++;   // 已有暗號的列(清空會往上補, 所以一定從第 1 列連續排下來)
  if (i < n) return 'open';
  if (i === n) return (n > 0 && !G.rows[n - 1].prog) ? 'blocked' : 'open';   // 只排了暗號、還沒選表演卡的列只能是最後一列
  return 'blocked';
}
function lastOpenRow() { let r = 0; for (let i = 0; i < ROWS; i++) if (rowState(i) === 'open') r = i; return r; }
// 清空暗號 = 整列刪掉, 下面的列往上補
function clearRow(i) { G.rows.splice(i, 1); G.rows.push({ cue: '', prog: '' }); }
// 選單: 擁有的暗號(依表順序)→ 上移 → 下移 → 清空; act: pick 填入 | swap 和別列交換 | denied(空列選已排在別列的)| up | down | clear
function panelOptions(layer, row) {
  const out = [];
  if (layer === 'cue') {
    const hasCue = !!G.rows[row].cue;
    CUES.forEach(c => {
      if (!G.ownedCues[c.key]) return;
      let used = 0;
      for (let j = 0; j < ROWS; j++) if (j !== row && G.rows[j].cue === c.key) used = j + 1;
      out.push({ key: c.key, name: c.name, desc: c.desc, used, act: used === 0 ? 'pick' : (hasCue ? 'swap' : 'denied') });
    });
    if (hasCue && row > 0) out.push({ key: 'up', name: '上移', desc: '', used: 0, act: 'up' });
    if (hasCue && row < ROWS - 1 && G.rows[row + 1].cue) out.push({ key: 'down', name: '下移', desc: '', used: 0, act: 'down' });
    out.push({ key: 'clear', name: '清空', desc: '', used: 0, act: 'clear' });
  } else {
    PROGS.forEach(c => { if (G.ownedProgs[c.key]) out.push({ key: c.key, name: c.name, desc: c.desc, used: 0, act: 'pick' }); });
  }
  return out;
}
// 布置第 2 步 → 第 1 步(節目單保留)
function backToSetup1() {
  Snd.play('ui_cancel');
  G.s1.zone = 'grid';
  setScene('setup1');
}
function setup2Input(dt) {
  const s = G.s2;
  G.editT += dt;
  if (s.hold !== undefined) {   // 第 12 階段: 讓完成特效(0.6 秒)在這個畫面播完再進表演場, 期間不接輸入
    s.hold += dt;
    if (TUT.done[12] || s.hold >= 1.0) { delete s.hold; startShow(); }
    return;
  }
  if (s.panel) {
    const p = s.panel;
    if (pressed.up) { p.index = Math.max(0, p.index - 1); Snd.play('ui_move'); }
    else if (pressed.down) { p.index = Math.min(p.options.length - 1, p.index + 1); Snd.play('ui_move'); }
    else if (pressed.x) { s.panel = null; Snd.play('ui_cancel'); }
    else if (pressed.z) {
      const o = p.options[p.index];
      if (p.layer === 'cue') {
        const row = s.row;
        if (o.act === 'clear') { clearRow(row); s.panel = null; s.row = Math.min(row, lastOpenRow()); Snd.play('ui_cancel'); return; }
        if (o.act === 'denied') { Snd.play('ui_denied'); return; }   // 空列選已排在別列的暗號: 沒有暗號可以換過去
        if (o.act === 'swap') {   // 兩列暗號互換, 各自的表演卡留在原列
          const other = o.used - 1, tmp = G.rows[row].cue;
          G.rows[row].cue = G.rows[other].cue; G.rows[other].cue = tmp;
          s.panel = null; Snd.play('row_swap'); return;
        }
        if (o.act === 'up' || o.act === 'down') {   // 整列(暗號 + 表演卡)和上 / 下一列對調, 游標跟著這列
          const other = o.act === 'up' ? row - 1 : row + 1, tmp = G.rows[row];
          G.rows[row] = G.rows[other]; G.rows[other] = tmp;
          s.row = other; s.col = 0;
          s.panel = null; Snd.play('row_swap'); return;
        }
        G.rows[row].cue = o.key;
      } else G.rows[s.row].prog = o.key;
      s.panel = null; Snd.play('ui_confirm');
    }
    return;
  }
  const last = lastOpenRow();
  if (s.row === BTN_GO) {   // 「開演」
    if (pressed.up) { s.row = last; Snd.play('ui_move'); }
    else if (pressed.right) { s.row = BTN_BACK; Snd.play('ui_move'); }
    else if (pressed.z) {
      Snd.play('ui_confirm');
      if (TUT.cur && TUT.cur.id === 12 && TUT.cur.phase === 'show') { tut('go'); s.hold = 0; }   // 先播完成特效再開演
      else startShow();
    }
    else if (pressed.x) { backToSetup1(); }
    return;
  }
  if (s.row === BTN_BACK) {   // 「返回上一步」
    if (pressed.up) { s.row = last; Snd.play('ui_move'); }
    else if (pressed.left) { s.row = BTN_GO; Snd.play('ui_move'); }
    else if (pressed.z) { backToSetup1(); }
    return;
  }
  if (s.row > last) s.row = last;
  if (pressed.up) { if (s.row > 0) { s.row--; Snd.play('ui_move'); } }
  else if (pressed.down) { s.row = s.row >= last ? BTN_GO : s.row + 1; Snd.play('ui_move'); }
  else if (pressed.left) { s.col = 0; Snd.play('ui_move'); }
  else if (pressed.right) { s.col = 1; Snd.play('ui_move'); }
  else if (pressed.x) {
    if (s.col === 0) { if (G.rows[s.row].cue) { clearRow(s.row); s.row = Math.min(s.row, lastOpenRow()); Snd.play('ui_cancel'); } }
    else Snd.play('ui_denied');   // 表演卡格沒有清空
  }
  else if (pressed.z) {
    const r = G.rows[s.row];
    if (s.col === 1 && !r.cue) { Snd.play('ui_denied'); return; }   // 先選暗號才能選表演卡
    const layer = s.col === 0 ? 'cue' : 'program';
    const options = panelOptions(layer, s.row);
    const cur = layer === 'cue' ? r.cue : r.prog;
    let index = options.findIndex(o => o.key === cur); if (index < 0) index = 0;
    s.panel = { layer, options, index };
    Snd.play('ui_confirm');
  }
}



// ───────────────────────── 表演場 ─────────────────────────
function startShow() {
  const tutorial = G.day === 0;
  S = {
    tutorial, left: SHOW_SECS, total: SHOW_SECS, clock: 0, mons: [], hz: [], floats: [], banner: null,
    rows: G.rows.map(r => ({ cue: r.cue, prog: r.prog, complete: !!(r.cue && r.prog) })),
    cur: -1, waitT: 0, sinceFire: 0, fires: 0, ev: { multi3: false }, satSince: 0, curWait: 0, waitMax: 0, waitCue: '',
    move: null, rush: null, kegs: [], confs: [], rain: null,
    sat: 0, best: 0, performs: 0, angryPerforms: 0, loose: null,
    fences: { top: [], bottom: [] }, vis: { top: [], bottom: [] },
    heat: 0, tierIdx: 0, lowT: 0, tierT: 0.4, frenzyT: 0, heatSum: 0, heatDt: 0, heatMax: 0, tierSec: [0, 0, 0, 0],
    marksPeak: 0, looseHeat: null, lastCeil: SHOW_SECS,
  };
  for (let i = 0; i < 8; i++) {
    S.fences.top.push(false); S.fences.bottom.push(false);
    S.vis.top.push({ mode: 'watch', t: 0 }); S.vis.bottom.push({ mode: 'watch', t: 0 });
  }
  let idx = 0;
  const roster = G.bank.filter(b => b.on).slice(0, 20);
  for (const b of roster) {
    const p = SHOW_POS[idx++];
    const m = {
      sp: b.sp, num: b.num, x: p[0], y: p[1], rage: tutorial ? 75 : 60, marks: 0, markT: 0, markAdd: 0, slow: false,
      perfT: rnd(0.5, 2), perfAct: -1, relayT: -1, relayChain: 0, lastRelay: -99, frozen: 0, target: 0,
      fx: 'none', fxT: 0, progMove: false, knock: null, lastRam: -99, pd: null,
      ang: rnd(0, Math.PI * 2), dirT: rnd(0.5, 2), cyc: rnd(0, 1), tp: 0, tpT: 0, teleT: rnd(0, 2.5), swooping: false,
      face: 1, move: 'walk', moveT: 0, moveDur: 0, burst: null,
    };
    if (b.sp === 'penguin' || b.sp === 'parrot') m.cyc = rnd(0, 2);
    S.mons.push(m);
  }
  if (roster.length > G.maxOnStage) G.maxOnStage = roster.length;
  S.cur = S.rows.findIndex(r => r.complete);
  Snd.play('show_start');
  if (tutorial) tutForceSkip(12);   // 沒走完的布置階段收掉(第 12 階段的完成特效已在布置畫面播完)
  setScene('show');
  // 熱度: 開演時直接依開演熱度定段
  S.heat = avgHeat(); S.heatMax = S.heat; S.tierIdx = tierOf(S.heat);
  Snd.crowd(S.tierIdx > 0 ? TIERS[S.tierIdx] : '');
}
const ANGRY_LOW = 80;
function rl() { return ANGRY_LOW; }
function isAngry(m) { return m.rage >= ANGRY_LOW; }
// 每隻的熱度 = 怒氣 × 0.8 + 標記 × 4; 全場熱度 = 平均(含凍住中的)
function heatOf(m) { return m.rage * 0.8 + m.marks * 4; }
function tierOf(h) { return h >= 85 ? 3 : h >= 75 ? 2 : h >= 50 ? 1 : 0; }
function avgHeat() { let s = 0; for (const m of S.mons) s += heatOf(m); return S.mons.length ? s / S.mons.length : 0; }
// 熱度段: 往上跨門檻立刻換段, 往下要低於該段門檻連續 1 秒才降段
function updateHeat(dt) {
  S.heat = avgHeat();
  if (S.heat > S.heatMax) S.heatMax = S.heat;
  S.heatSum += S.heat * dt; S.heatDt += dt; S.tierSec[S.tierIdx] += dt;
  if (S.tierT < 0.4) S.tierT = Math.min(0.4, S.tierT + dt);
  const tgt = tierOf(S.heat);
  let next = S.tierIdx;
  if (tgt > S.tierIdx) { next = tgt; S.lowT = 0; }
  else if (tgt < S.tierIdx) { S.lowT += dt; if (S.lowT >= 1) { next = tgt; S.lowT = 0; } }
  else S.lowT = 0;
  if (S.tierIdx === 3) S.frenzyT += dt;
  if (next !== S.tierIdx) {
    S.tierIdx = next; S.tierT = 0; S.frenzyT = 0;
    if (next === 3 && S.heat < LOOSE_LINE) Snd.play('heat_warn');   // 同一幀直接失控: 只播 loose
    Snd.crowd(next > 0 ? TIERS[next] : '');
  }
}
function intervalShow(m) { return m.rage < 50 ? 6 : 4 - 2.5 * (m.rage - 50) / 50; }
function addSFloat(x, y, text, kind, dur) { S.floats.push({ x, y, text, kind, t: 0, dur: dur || 1 }); }

function pickAim(m) {
  let best = null, bd = 1e9;
  for (const o of S.mons) {
    if (o === m || o.target <= 0) continue;
    const d = dist(m.x, m.y, o.x, o.y); if (d < bd) { bd = d; best = o; }
  }
  if (!best) for (const o of S.mons) {
    if (o === m || (o.sp === 'tanuki' && o.tp === 1)) continue;
    const d = dist(m.x, m.y, o.x, o.y); if (d < bd) { bd = d; best = o; }
  }
  return best ? { x: best.x, y: best.y } : { x: 640, y: 356 };
}
function perform(m, chain) {
  m.perfAct = 0; m.perfT = intervalShow(m); m.relayT = -1;
  S.performs++;
  if (chain > S.best) S.best = chain;
  if (chain > G.bestChain) G.bestChain = chain;
  const cast = newCast(m, chain, false);
  cast.angry = isAngry(m);
  if (cast.angry) { S.angryPerforms++; Snd.once('angry_perform'); }
  Snd.once('perform');
  if (chain >= 2) Snd.once('chain', chain);
  const t = pickAim(m);
  emitSkill(m, t.x, t.y, cast);
}
function checkSettle(c) {
  if (c.dungeon || c.settled || c.alive > 0) return;
  c.settled = true;
  if (scene !== 'show' || !S || S.loose) return;
  const n = c.hits.size, m = c.owner;
  if (n >= 3) S.ev.multi3 = true;
  const v = SP[m.sp].rep * (1 + 0.5 * Math.min(4, n)) * (c.angry ? 2 : 1) * (1 + 0.25 * (c.chain - 1));
  const f = Math.max(1, Math.round(v));
  S.sat += f; S.satSince += f;
  addSFloat(m.x, m.y - 70, '滿意度 +' + f + (c.angry ? ' 生氣×2' : ''), c.angry ? 'angryFame' : 'sat');
  if (c.chain >= 2) addSFloat(m.x, m.y - 95, '連鎖 ' + c.chain, 'chain');
}

// 標記(只在規格與程式裡, 玩家看不到): 只拿來畫外觀
function markCap() { return S.tutorial ? 2 : 5; }
function notePeak(m) { if (m.marks > S.marksPeak) S.marksPeak = m.marks; }
function addMark(m) {
  m.markT = 4; m.markAdd = 1;
  if (m.marks >= markCap()) return;   // 滿了只是停著, 不失控
  m.marks++; notePeak(m);
}
function markDown(m) {   // 澆熄 / 下雨: 標記 −1
  m.marks--; m.markT = 4;
  if (m.marks === 0) { m.slow = true; m.markT = 0; }
}
// 怒氣上升(點燃型): skill = 是否為技能(技能才會引發接演)
function igniteMon(m, amt, skill, chain) {
  const old = m.rage;
  m.rage = Math.min(100, m.rage + amt);
  m.fx = 'ignited'; m.fxT = 0; Snd.once('ignite');
  if (m.marks > 0) {
    if (m.markAdd <= 0) addMark(m);
  } else if (m.rage >= 100 && (old < 100 || m.slow)) {
    m.marks = 1; m.markT = 4; m.markAdd = 1; m.slow = false; notePeak(m);
  }
  if (skill && m.rage >= rl() && m.relayT < 0 && S.clock - m.lastRelay >= 1.5 && m.frozen <= 0) {
    m.relayT = 0.3; m.relayChain = chain + 1; m.lastRelay = S.clock;
  }
}
function calmSkillHit(m) {
  m.fx = 'doused'; m.fxT = 0; Snd.once('calm');
  if (m.marks > 0) markDown(m);
  else m.rage = Math.max(0, m.rage - 12);
}
function randPoint() { return { x: rnd(SHOW_B.x0, SHOW_B.x1), y: rnd(SHOW_B.y0, SHOW_B.y1) }; }
function applySkillHit(h, v) {
  const kind = h.kind, c = h.cast;
  c.hits.add(v);
  if (kind === 'pollen') calmSkillHit(v);
  else if (kind === 'match') igniteMon(v, 10, true, c.chain);
  else if (kind === 'gear') igniteMon(v, 6, true, c.chain);
  else if (kind === 'firecracker') igniteMon(v, 8, true, c.chain);
  else if (kind === 'feather') { v.target = 4; v.fx = 'special'; v.fxT = 0; Snd.once('special'); }
  else if (kind === 'icebeam') { v.frozen = 1.5; v.fx = 'special'; v.fxT = 0; Snd.once('special'); }
  else if (kind === 'card') { const p = randPoint(); v.x = p.x; v.y = p.y; v.fx = 'special'; v.fxT = 0; Snd.once('special'); }
}
function validVictim(h, v) { return v !== h.owner && !h.cast.hits.has(v); }

function updateHazardsShow(dt) {
  for (const h of S.hz) {
    if (h.dead) continue;
    if (h.owner) { h.ox = h.owner.x; h.oy = h.owner.y; }
    if (h.capt) {   // 被大彩炮收走: 飛向場地中央, 不再判定(已從那一招摘除)
      h.t += dt;
      const k = Math.min(1, h.t / 0.6);
      h.x = h.sx + (640 - h.sx) * k; h.y = h.sy + (356 - h.sy) * k;
      if (h.t >= 0.6) h.dead = true;
      continue;
    }
    if (h.kind === 'icebeam') {
      h.t += dt;
      if (h.phase === 'warn') {
        if (h.t >= h.dur) {
          h.phase = 'active'; h.t = 0; h.dur = 0.2;
          for (const v of S.mons) if (validVictim(h, v) && inLine(v.x, v.y, h.x, h.y, h.angle, h.length, h.width, 0)) applySkillHit(h, v);
        }
      } else if (h.t >= h.dur) killHz(h);
      continue;
    }
    if (h.kind === 'firecracker') {
      h.t += dt;
      if (h.phase === 'warn') {
        if (h.t >= h.dur) {
          h.phase = 'active'; h.t = 0; h.dur = 0.2;
          Snd.once('firecracker');
          for (const v of S.mons) if (validVictim(h, v) && dist(v.x, v.y, h.x, h.y) <= h.radius) applySkillHit(h, v);   // 判定只在爆炸那一瞬間做一次
        }
      } else if (h.t >= h.dur) killHz(h);
      continue;
    }
    h.t += dt;
    if (h.t >= h.dur) { killHz(h); continue; }
    const step = h.speed * dt;
    h.x += Math.cos(h.angle) * step; h.y += Math.sin(h.angle) * step;
    if (h.x < ARENA.x0 || h.x > ARENA.x1 || h.y < ARENA.y0 || h.y > ARENA.y1) { killHz(h); continue; }
    for (const v of S.mons) {
      if (!validVictim(h, v)) continue;
      if (dist(h.x, h.y, v.x, v.y) <= h.radius + 24) {
        applySkillHit(h, v);
        if (h.kind !== 'match') { killHz(h); break; }
      }
    }
  }
  S.hz = S.hz.filter(h => !h.dead);
}

// 失控 = 表演立刻結束: 一切停住, 失控那隻衝向圍欄、撞破、觀眾逃走
function pickLoose() {
  let best = null;
  for (const m of S.mons) {
    if (!best || m.marks > best.marks || (m.marks === best.marks && m.rage > best.rage)) best = m;   // 標記最多, 同數取怒氣高, 再同取怪物庫順序前的
  }
  return best;
}
function startLoose(m) {
  const side = m.y < 356 ? 'top' : 'bottom';
  S.loose = { m, t: 0, side, idx: clamp(Math.round((m.x - 165) / 136), 0, 7), broken: false, fled: false };
  tutCutShow();   // 失控開始 = 收場: 表演階段直接算完成
  rushEnd(true);  // 衝撞進行中就收場: 記中斷
  m.frozen = 0; m.target = 0; m.relayT = -1; m.knock = null;
  m.move = 'walk'; m.moveT = 0; m.moveDur = 0;
  Snd.music(null); Snd.crowd(''); Snd.play('loose');
}
function updateLooseShow(dt) {
  const L = S.loose, m = L.m;
  L.t += dt;
  if (L.t <= 1.0 || !L.broken) {
    const fx = 165 + 136 * L.idx, fy = L.side === 'top' ? 140 : 572;
    const d = dist(m.x, m.y, fx, fy);
    if (L.t < 1.0 && d > 0.5) {
      const st = Math.min(200 * dt, d);
      m.x += (fx - m.x) / d * st; m.y += (fy - m.y) / d * st;
      if (Math.abs(fx - m.x) > 1) m.face = fx > m.x ? 1 : -1;
    }
  }
  if (L.t >= 1.0 && !L.broken) {
    L.broken = true; S.fences[L.side][L.idx] = true;
    for (const side of ['top', 'bottom']) for (const v of S.vis[side]) { v.mode = 'flee'; v.t = 0; }
    Snd.play('crowd_flee');
  }
  if (L.broken) for (const side of ['top', 'bottom']) for (const v of S.vis[side]) if (v.mode === 'flee') { v.t = Math.min(1.5, L.t - 1.0); }
  if (L.t >= 2.5) finishShow('loose');
}

// 繞場橢圓: 中心 (640, 356)、橫半徑 420、縱半徑 140, 順時針(畫面座標 y 向下, 角度增加 = 順時針)
const PAR = { cx: 640, cy: 356, a: 420, b: 140, v: 200 };
function parNearest(x, y) {
  let best = null, bd = 1e9;
  for (let i = 0; i < 720; i++) {
    const th = i / 720 * Math.PI * 2, px = PAR.cx + PAR.a * Math.cos(th), py = PAR.cy + PAR.b * Math.sin(th);
    const d = dist(x, y, px, py); if (d < bd) { bd = d; best = { th, x: px, y: py, on: false }; }
  }
  return best;
}
function updateShowMon(m, dt) {
  if (m.fx !== 'none') { m.fxT += dt; if (m.fxT >= 0.5) { m.fx = 'none'; m.fxT = 0; } }
  if (m.perfAct >= 0) { m.perfAct += dt; if (m.perfAct >= 0.5) m.perfAct = -1; }
  if (m.target > 0) m.target = Math.max(0, m.target - dt);
  if (m.markAdd > 0) m.markAdd = Math.max(0, m.markAdd - dt);
  if (m.knock) { m.knock.t += dt; if (m.knock.t >= 0.25) m.knock = null; }
  const frozen = m.frozen > 0;
  if (frozen) m.frozen = Math.max(0, m.frozen - dt);
  if (m.marks > 0) {
    m.markT -= dt;
    if (m.markT <= 0) {
      m.marks--; m.markT = 4;
      if (m.marks === 0) { m.slow = true; m.markT = 0; }
    }
  }
  if (!frozen && m.marks === 0) {
    if (m.slow) { m.rage = Math.max(0, m.rage - 2 * dt); if (m.rage < rl()) m.slow = false; }
    else m.rage = Math.max(0, m.rage - SP[m.sp].decay * dt);
  }
  if (m.burst && !frozen) stepBurst(m, dt);
  if (!frozen) {
    if (m.relayT >= 0) {
      m.relayT -= dt;
      if (m.relayT <= 0) { const ch = m.relayChain; m.relayT = -1; perform(m, ch); }
    }
    m.perfT -= dt;
    if (m.perfT <= 0) perform(m, 1);
  }
  m.progMove = false;
  if (frozen) return;   // 移動優先順序: 凍住 > 被撞開 > 衝撞手 > 表演卡移動 > 自己的模式
  if (m.knock) {
    m.x = clamp(m.x + m.knock.vx * dt, SHOW_B.x0, SHOW_B.x1); m.y = clamp(m.y + m.knock.vy * dt, SHOW_B.y0, SHOW_B.y1);
    m.move = 'walk'; m.moveT = 0; m.moveDur = 0;
    return;
  }
  const R = S.rush;
  if (R && R.left > 0 && R.m === m) {
    rushSteer(R, m, dt);
    m.move = 'walk'; m.moveT = 0; m.moveDur = 0;
    advStraight(m, 360, dt, SHOW_B);
    return;
  }
  const mv = S.move;
  if (mv && mv.left > 0) {
    m.progMove = true; m.move = 'walk'; m.moveT = 0; m.moveDur = 0;
    if (mv.type === 'parade') {
      if (!m.pd) m.pd = parNearest(m.x, m.y);
      const P = m.pd;
      if (!P.on) {
        const dx = P.x - m.x, dy = P.y - m.y, d = Math.hypot(dx, dy), st = PAR.v * dt;
        if (d <= st) { m.x = P.x; m.y = P.y; P.on = true; }
        else { m.x += dx / d * st; m.y += dy / d * st; if (Math.abs(dx) > 1) m.face = dx > 0 ? 1 : -1; }
      } else {
        const ds = Math.sqrt(PAR.a * PAR.a * Math.sin(P.th) * Math.sin(P.th) + PAR.b * PAR.b * Math.cos(P.th) * Math.cos(P.th));
        const nth = P.th + PAR.v * dt / ds, ox = m.x;
        P.th = nth; m.x = PAR.cx + PAR.a * Math.cos(nth); m.y = PAR.cy + PAR.b * Math.sin(nth);
        if (Math.abs(m.x - ox) > 0.01) m.face = m.x > ox ? 1 : -1;
      }
      return;
    }
    if (mv.type === 'scatter') {
      let near = null, nd = 1e9;
      for (const o of S.mons) if (o !== m) { const d = dist(m.x, m.y, o.x, o.y); if (d < nd) { nd = d; near = o; } }
      if (near) {
        let ax = m.x - near.x, ay = m.y - near.y;
        if (nd < 1) { const a = rnd(0, Math.PI * 2); ax = Math.cos(a); ay = Math.sin(a); nd = 1; }
        m.x = clamp(m.x + ax / nd * 120 * dt, SHOW_B.x0, SHOW_B.x1);
        m.y = clamp(m.y + ay / nd * 120 * dt, SHOW_B.y0, SHOW_B.y1);
        if (Math.abs(ax) > 1) m.face = ax > 0 ? 1 : -1;
      }
      return;
    }
    if (mv.type === 'gather') {
      const dx = mv.tx - m.x, dy = mv.ty - m.y, d = Math.hypot(dx, dy);
      if (d > 70) {
        const st = Math.min(130 * dt, d - 70);
        m.x += dx / d * st; m.y += dy / d * st; if (Math.abs(dx) > 1) m.face = dx > 0 ? 1 : -1;
      }
      return;
    }
    m.progMove = false;
  }
  moveMonster(m, dt, { b: SHOW_B, dir: () => rnd(0, Math.PI * 2), tele: teleShow }, 1);
}
function teleShow(m) {
  for (let i = 0; i < 40; i++) {
    const a = rnd(0, Math.PI * 2), r = rnd(0, 300);
    const x = m.x + Math.cos(a) * r, y = m.y + Math.sin(a) * r;
    if (x >= SHOW_B.x0 && x <= SHOW_B.x1 && y >= SHOW_B.y0 && y <= SHOW_B.y1) return { x, y };
  }
  return { x: clamp(m.x, SHOW_B.x0, SHOW_B.x1), y: clamp(m.y, SHOW_B.y0, SHOW_B.y1) };
}
// 衝撞追最近的怪: 一段一段衝, 每段開始找離衝撞手最近的其他魔物(上一段撞到的先跳過, 場上只剩牠才選牠), 朝牠當下的位置直線衝;
// 撞到這段的目標或衝滿 0.7 秒就重新找; 場上沒有其他魔物 → 退回舊規則(隨機方向, 每 0.8 秒換)
function rushSteer(R, m, dt) {
  R.segT += dt;
  if (R.tgt && (R.segT >= 0.7 || R.tgt.dead)) R.tgt = null;
  if (R.tgt && R.tgt.gone) R.tgt = null;
  if (!R.tgt) {
    let best = null, bd = 1e9, only = null, n = 0;
    for (const o of S.mons) {
      if (o === m) continue;
      n++; only = o;
      if (o === R.skip) continue;
      const d = dist(m.x, m.y, o.x, o.y); if (d < bd) { bd = d; best = o; }
    }
    if (!best && n === 1) best = only;   // 場上只剩上一段撞過的那隻
    if (best) {
      R.tgt = best; R.segT = 0; R.legs++;
      const dx = best.x - m.x, dy = best.y - m.y;
      m.ang = (Math.abs(dx) < 1 && Math.abs(dy) < 1) ? rnd(0, Math.PI * 2) : Math.atan2(dy, dx);
    } else {   // 沒有其他魔物
      R.dirT -= dt; if (R.dirT <= 0) { R.dirT = 0.8; m.ang = rnd(0, Math.PI * 2); }
    }
  }
}
function rushEnd(cut) {
  const R = S.rush;
  if (!R || R.ended) return;
  R.ended = true;
}
// 衝撞: 衝撞手身體碰到的其他魔物(中心距 ≤ 48)被撞開 0.25 秒退 80 像素, 怒氣 +8(不是技能, 不引發接演); 同一隻每 1 秒最多被撞一次
function updateRush(dt) {
  const R = S.rush;
  if (!R) return;
  R.left -= dt;
  if (R.left <= 0) { rushEnd(false); S.rush = null; return; }
  const r = R.m;
  if (r.frozen > 0) return;
  for (const v of S.mons) {
    if (v === r || S.clock - v.lastRam < 1) continue;
    if (dist(v.x, v.y, r.x, r.y) > 48) continue;
    v.lastRam = S.clock; R.hits++;
    if (v === R.tgt) { R.skip = v; R.tgt = null; }   // 撞到這段的目標: 下一段重新找(剛撞過的先跳過)
    let ax = v.x - r.x, ay = v.y - r.y, d = Math.hypot(ax, ay);
    if (d < 1) { const a = rnd(0, Math.PI * 2); ax = Math.cos(a); ay = Math.sin(a); d = 1; }
    v.knock = { t: 0, vx: ax / d * 320, vy: ay / d * 320 };
    igniteMon(v, 8, false, 0);
    Snd.once('rush_hit');
  }
}
// 炸藥桶: 飛 0.5 秒 → 引信 1.0 秒 → 爆炸 0.3 秒; 爆炸那一瞬間圈內(半徑 110)的魔物怒氣 +20(不是技能)
function updateKegs(dt) {
  for (const k of S.kegs) {
    k.t += dt;
    if (k.phase === 'fly' && k.t >= 0.5) { k.phase = 'fuse'; k.t -= 0.5; Snd.once('keg_fuse'); }
    if (k.phase === 'fuse' && k.t >= 1.0) {
      k.phase = 'blast'; k.t -= 1.0; Snd.once('keg_blast');
      for (const v of S.mons) if (dist(v.x, v.y, k.x, k.y) <= 110) igniteMon(v, 20, false, 0);
    }
    if (k.phase === 'blast' && k.t >= 0.3) k.dead = true;
  }
  S.kegs = S.kegs.filter(k => !k.dead);
}
// 大彩炮: 收 0.6 秒 → 蓄力 1.0 秒 → 爆 0.8 秒; 觀眾滿意度 + (10 + 5N)
function updateConfs(dt) {
  for (const c of S.confs) {
    c.t += dt;
    if (c.phase === 'gather' && c.t >= 0.6) { c.phase = 'charge'; c.t -= 0.6; }
    if (c.phase === 'charge' && c.t >= 1.0) {
      c.phase = 'burst'; c.t -= 1.0;
      const add = 10 + 5 * c.n;
      S.sat += add; S.satSince += add;
      addSFloat(640, 300, '大彩炮 +' + add, 'confetti', 1.5);
      Snd.play('confetti_burst');
    }
    if (c.phase === 'burst' && c.t >= 0.8) c.dead = true;
  }
  S.confs = S.confs.filter(c => !c.dead);
}

// 暗號節目單引擎
function cueTrue(key) {
  const act = S.mons;
  switch (key) {
    case 'wait': return S.sinceFire >= WAIT_SECS;
    case 'cold': return act.length > 0 && act.filter(m => m.rage < 50).length * 2 >= act.length;
    case 'angry3': return act.filter(isAngry).length >= 3;
    case 'multi3': return S.ev.multi3;
    case 'target1': return act.some(m => m.target > 0);
    case 'gain30': return S.satSince >= 30;
    case 'cheering': return S.tierIdx >= 2;
  }
  return false;
}
function nextComplete(from) {
  for (let i = 1; i <= ROWS; i++) { const j = (from + i) % ROWS; if (S.rows[j].complete) return j; }
  return from;
}
function updateProgram(dt) {
  if (S.cur < 0) return;
  S.sinceFire += dt;
  if (S.waitT > 0) { S.waitT -= dt; S.curWait = 0; if (S.waitT > 0) return; S.waitT = 0; }   // 換列冷卻中: 等待秒數不計
  const row = S.rows[S.cur];
  S.curWait += dt;   // 這列從輪到(冷卻結束)起已等的秒數
  if (S.curWait > S.waitMax) { S.waitMax = S.curWait; S.waitCue = row.cue; }
  if (cueTrue(row.cue)) {
    S.cur = nextComplete(S.cur);
    S.waitT = 3.0; S.sinceFire = 0; S.curWait = 0;   // 發動後 3 秒內不檢查暗號
    S.ev = { multi3: false }; S.satSince = 0; S.fires++;
    fireProgram(row);
    Snd.play('cue_fire'); tut('fired');
  }
}
function pickTop(act) {
  let hi = -1;
  for (const m of act) if (m.rage > hi) hi = m.rage;
  let best = act.filter(m => m.rage === hi);
  let mk = -1; for (const m of best) if (m.marks > mk) mk = m.marks;
  best = best.filter(m => m.marks === mk);
  return best[Math.floor(Math.random() * best.length)] || null;
}
function fireProgram(row) {
  S.banner = { cue: row.cue, prog: row.prog, t: 0 };
  const act = S.mons;
  let n = 0;
  const react = () => act.forEach(m => { m.fx = 'special'; m.fxT = 0; });
  switch (row.prog) {
    case 'parade':   // 5 秒內大家(凍住的解凍後加入)走上橢圓, 順時針繞場
      for (const m of act) m.pd = parNearest(m.x, m.y);
      S.move = { type: 'parade', left: 5 }; react(); n = act.length; Snd.once('parade');
      break;
    case 'scatter':
      S.move = { type: 'scatter', left: 3 }; react(); n = act.length; Snd.once('scatter');
      break;
    case 'gather': {   // 發動瞬間算出全場平均位置, 3 秒內走過去, 離 70 就停
      let sx = 0, sy = 0;
      for (const m of act) { sx += m.x; sy += m.y; }
      S.move = { type: 'gather', left: 3, tx: act.length ? sx / act.length : 640, ty: act.length ? sy / act.length : 356 };
      react(); n = act.length; Snd.once('gather');
      break;
    }
    case 'rush': {   // 最生氣的那隻橫衝直撞 5 秒
      const t = pickTop(act);
      if (t) { S.rush = { m: t, left: 5, dirT: 0, hits: 0, legs: 0, segT: 0, tgt: null, skip: null }; t.fx = 'special'; t.fxT = 0; n = 1; Snd.once('rush'); }
      break;
    }
    case 'shuffle': {
      const placed = [];
      for (const m of act) {
        let minD = 60, p = null;
        while (!p) {
          for (let i = 0; i < 40; i++) {
            const q = randPoint();
            if (placed.every(o => dist(q.x, q.y, o.x, o.y) >= minD)) { p = q; break; }
          }
          minD *= 0.7;
          if (minD < 1) p = randPoint();
        }
        m.x = p.x; m.y = p.y; placed.push(p); m.fx = 'special'; m.fxT = 0; n++;
      }
      Snd.once('special');
      break;
    }
    case 'rain':   // 生氣的每一隻: 有標記 → 標記 −1, 沒標記 → 怒氣 −20(澆熄型、不是技能)
      for (const m of act) if (isAngry(m)) {
        if (m.marks > 0) { markDown(m); m.fx = 'doused'; m.fxT = 0; }
        else { m.rage = Math.max(0, m.rage - 20); m.fx = 'doused'; m.fxT = 0; }
        n++;
      }
      S.rain = { t: 0 }; Snd.once('rain');
      break;
    case 'keg': {   // 從上方觀眾席丟出 N 個炸藥桶, 落點兩兩相距 ≥ 140(選不到就放寬)
      const N = Math.min(6, 2 + Math.floor(act.length / 5));
      const pts = []; let minD = 140;
      while (pts.length < N) {
        let p = null;
        for (let i = 0; i < 60; i++) { const q = randPoint(); if (pts.every(o => dist(q.x, q.y, o.x, o.y) >= minD)) { p = q; break; } }
        if (p) pts.push(p); else { minD *= 0.8; if (minD < 1) pts.push(randPoint()); }
      }
      for (const p of pts) S.kegs.push({ x: p.x, y: p.y, fromX: p.x, fromY: 140, phase: 'fly', t: 0, dead: false });
      n = N;
      break;
    }
    case 'confetti': {   // 場上飛行中的投射物(範圍技能不算)全部失效, 飛向場地中央聚成彩炮
      let cnt = 0;
      for (const h of S.hz) {
        if (h.dead || h.phase !== 'fly' || h.kind === 'icebeam' || h.kind === 'firecracker') continue;
        const c = h.cast; h.cast = null;   // 不再打中任何東西; 這一招照常結算
        h.capt = true; h.phase = 'captured'; h.sx = h.x; h.sy = h.y; h.t = 0; h.dur = 0.6;
        cnt++;
        if (c) { c.alive--; checkSettle(c); }
      }
      S.confs.push({ phase: 'gather', t: 0, n: cnt });
      n = cnt; Snd.once('confetti_charge');
      break;
    }
  }
  return n;
}

function updateShow(dt) {
  if (S.loose) { updateLooseShow(dt); return; }
  // 暫停式引導(第 13~16 階段): 見習表演開演 5.0 秒(表演時間)後暫停
  if (S.tutorial && !TUT.done[13] && S.clock >= GUIDE_SHOW_AT) { startGuide('show'); return; }
  S.clock += dt; S.left -= dt;
  { // 表演時鐘: 最後 5 秒每跨過整數秒滴答一聲(5、4、3、2、1)
    const c = Math.ceil(Math.max(0, S.left));
    if (c < S.lastCeil) { S.lastCeil = c; if (c >= 1 && c <= 5) Snd.play('clock_tick'); }
  }
  updateProgram(dt);
  if (S.move) { S.move.left -= dt; if (S.move.left <= 0) S.move = null; }
  for (const m of S.mons) updateShowMon(m, dt);
  updateRush(dt);
  updateKegs(dt);
  updateConfs(dt);
  if (S.rain) { S.rain.t += dt; if (S.rain.t >= 1.5) S.rain = null; }
  updateHazardsShow(dt);
  updateHeat(dt);
  if (S.banner) { S.banner.t += dt; if (S.banner.t >= 0.8) S.banner = null; }
  for (const f of S.floats) f.t += dt;
  S.floats = S.floats.filter(f => f.t < f.dur);
  // 全場平均熱度到失控線: 失控(標記最多的那隻當主角)
  if (S.mons.length && S.heat >= LOOSE_LINE) { S.looseHeat = Math.round(S.heat); startLoose(pickLoose()); return; }
  if (S.left <= 0) { S.left = 0; finishShow('time'); }
}
function finishShow(reason) {
  const sat = S.sat, gold = S.tutorial ? 0 : 20 + Math.round(8 * Math.sqrt(sat));   // 收場: 觀眾滿意度換金幣, 同時加進名聲; 見習表演沒有金幣收入
  const loose = reason === 'loose';
  const L = S.loose;
  rushEnd(true);   // 時間到時衝撞還在進行: 記中斷(失控已在開始時記過)
  G.rep += sat; G.gold += gold; G.goldEarned += gold;
  if (S.best > G.bestChain) G.bestChain = S.best;
  SR = { sat, gold, fameGain: sat, tallyT: 0, tallyDur: 1.5, loose, timeLeft: loose ? Math.round(Math.max(0, S.left)) : 0, bestChain: S.best, tutorial: S.tutorial, tickT: 0 };
  const o = { day: G.day, reason, dur: +(S.total - Math.max(0, S.left)).toFixed(1), satisfaction: sat, gold, fameGain: sat, bestChain: S.best, performs: S.performs, angryPerforms: S.angryPerforms,
    onStage: S.mons.length,
    heatAvg: S.heatDt > 0 ? Math.round(S.heatSum / S.heatDt) : Math.round(S.heat), heatMax: Math.round(S.heatMax),
    tierSec: { quiet: +S.tierSec[0].toFixed(1), clap: +S.tierSec[1].toFixed(1), cheer: +S.tierSec[2].toFixed(1), frenzy: +S.tierSec[3].toFixed(1) },
    marksPeak: S.marksPeak, looseHeat: loose ? (S.looseHeat != null ? S.looseHeat : Math.round(S.heat)) : null,
    waitMax: +S.waitMax.toFixed(1), waitCue: S.waitCue };
  if (loose) { o.looseSpecies = L.m.sp; o.looseNum = L.m.num; o.looseX = Math.round(L.m.x); o.looseY = Math.round(L.m.y); }
  if (!loose) Snd.play('show_end');
  tutCutShow();   // 表演收場: 還在顯示的表演泡泡(17、18)直接算完成
  S = null;
  checkUnlock();
  setScene('sresult');
}
function sresultInput(dt) {
  if (SR.tallyT < SR.tallyDur) {
    SR.tallyT = Math.min(SR.tallyDur, SR.tallyT + dt);
    SR.tickT -= dt; if (SR.tickT <= 0) { SR.tickT = 0.12; Snd.play('coin_tally'); }
    return;
  }
  if (pressed.z) {
    Snd.play('ui_confirm');
    if (SR.tutorial) { tutorialDone = true; beginDay(1); }
    else advanceDay();
  }
}


// ───────────────────────── 商店 ─────────────────────────
const SHOP_TABS = ['weapon', 'cue', 'program'];
const SHOP_ITEMS = {
  weapon: ['club', 'sword', 'spear'],
  cue: ['angry3', 'cheering', 'cold', 'gain30', 'target1', 'multi3'],
  program: ['rain', 'parade', 'scatter', 'gather', 'shuffle', 'keg', 'confetti'],
};
const SHOP_COLS = 4;
const WEAPON_PRICE = { sword: 80, spear: 100 };
const WEAPON_FAME = { sword: 0, spear: 200 };
const WEAPON_DESC = { club: '[Z] 敲擊', sword: '[Z] 斬擊可打回飛彈 [X] 擊暈', spear: '[Z] 長刺 [X] 突進' };
function shopState(item) {
  const o = { item, cost: 0, level: 0, owned: false, equipped: false, affordable: false, fameReq: 0, fameLocked: false, lockKind: 'fame', fresh: false, popT: 0.3, popDur: 0.3 };
  if (WEAPON_DESC[item]) {
    o.owned = !!G.ownedWeapons[item];
    o.fameReq = WEAPON_FAME[item] || 0; o.fameLocked = !o.owned && G.rep < o.fameReq;
    o.cost = o.owned ? 0 : (WEAPON_PRICE[item] || 0);
    o.affordable = !o.owned && !o.fameLocked && G.gold >= o.cost;
  } else if (CUE_BY[item] || PROG_BY[item]) {
    const def = CUE_BY[item] || PROG_BY[item], own = CUE_BY[item] ? G.ownedCues : G.ownedProgs;
    o.owned = !!own[item]; o.fameReq = def.fame; o.fameLocked = !o.owned && G.rep < def.fame;
    if (def.lock === 'd2') { o.fameReq = 0; o.fameLocked = !o.owned && !G.unlocked.d2; o.lockKind = 'd2'; }
    o.cost = o.owned ? 0 : def.price; o.affordable = !o.owned && !o.fameLocked && G.gold >= o.cost;
  }
  // 剛上架(名聲剛過門檻、游標還沒停過這格): 右上角畫 NEW
  o.fresh = (o.fameReq > 0 || o.lockKind === 'd2') && !o.owned && !o.fameLocked && !G.shopSeen[item];
  if (G.shop.pop && G.shop.pop.item === item) o.popT = Math.min(0.3, G.shop.pop.t);
  return o;
}
function shopKind(item) { return WEAPON_DESC[item] ? 'weapon' : CUE_BY[item] ? 'cue' : 'program'; }
function shopCell(i) { return { x: 190 + 300 * (i % SHOP_COLS), y: 190 + 140 * Math.floor(i / SHOP_COLS) }; }
function shopDetailLines(item) {
  if (WEAPON_DESC[item]) return [WEAPON_DESC[item], '每次進地下城前選一把帶'];
  if (CUE_BY[item]) return [CUE_BY[item].desc];
  if (PROG_BY[item]) return [PROG_BY[item].desc];
  return [];
}
function shopBuy(item) {
  const st = shopState(item);
  if (st.owned) return;   // 已擁有: 按 Z 不反應
  if (st.fameLocked || G.gold < st.cost) { Snd.play('ui_denied'); return; }
  const s = G.shop;
  G.gold -= st.cost;
  s.bought.push(item);
  s.pop = { item, t: 0 };
  Snd.play('buy');
  if (WEAPON_DESC[item]) {
    G.ownedWeapons[item] = true;
    return;
  }
  // 暗號 / 表演卡: 立刻轉已擁有, 0.3 秒後播拿到卡的過場, 收下(按 Z)那一刻記 shop_buy
  const kind = shopKind(item);
  if (kind === 'cue') G.ownedCues[item] = true; else G.ownedProgs[item] = true;
  G.newCards[item] = kind; G.cardsGot++;
  s.buyWait = { item, kind, t: 0, cost: st.cost, first: !cardSeen, shopT: +s.enterT.toFixed(1), cell: shopCell(s.idx) };
}
function updateShopCardGet(dt) {
  const s = G.shop;
  if (s.buyWait) {
    s.buyWait.t += dt;
    if (s.buyWait.t >= 0.3) {
      const b = s.buyWait; s.buyWait = null;
      s.cg = { item: b.item, kind: b.kind, t: 0, dur: 1.2, ready: false, extra: 0, first: b.first, cost: b.cost, shopT: b.shopT, fromX: b.cell.x, fromY: b.cell.y };
      Snd.play('card_get');
    }
    return;
  }
  const g = s.cg;
  g.t = Math.min(g.dur, g.t + dt);
  g.ready = g.t >= g.dur;
  if (g.ready && pressed.z) {
    Snd.play('ui_confirm');
    cardSeen = true;
    s.cg = null;
  } else if (g.ready) g.extra += dt;
}
function shopInput(dt) {
  const s = G.shop, items = SHOP_ITEMS[SHOP_TABS[s.tab]], n = items.length;
  s.enterT += dt;
  if (s.pop) { s.pop.t += dt; if (s.pop.t >= 0.3) s.pop = null; }
  if (s.buyWait || s.cg) { updateShopCardGet(dt); return; }   // 買卡過場期間不接受其他按鍵
  const rows = Math.ceil(n / SHOP_COLS), row = Math.floor(s.idx / SHOP_COLS), col = s.idx % SHOP_COLS;
  const rowLast = r => Math.min(n - 1, r * SHOP_COLS + SHOP_COLS - 1);
  if (s.zone === 'tab') {
    if (pressed.left && s.tab > 0) { s.tab--; s.idx = 0; Snd.play('ui_move'); tut('tab'); }
    else if (pressed.right && s.tab < SHOP_TABS.length - 1) { s.tab++; s.idx = 0; Snd.play('ui_move'); tut('tab'); }
    else if (pressed.down) { s.zone = 'grid'; s.idx = 0; Snd.play('ui_move'); }
  } else if (s.zone === 'grid') {
    if (pressed.left) { if (col > 0) { s.idx--; Snd.play('ui_move'); } }
    else if (pressed.right) { if (col < SHOP_COLS - 1 && s.idx + 1 < n) { s.idx++; Snd.play('ui_move'); } }
    else if (pressed.up) {
      if (row === 0) s.zone = 'tab'; else s.idx = (row - 1) * SHOP_COLS + col;
      Snd.play('ui_move');
    } else if (pressed.down) {
      if (row + 1 < rows) s.idx = Math.min(n - 1, (row + 1) * SHOP_COLS + col);   // 那一欄下一列沒東西 → 到下一列最後一格
      else { s.zone = 'go'; s.col = col; }
      Snd.play('ui_move');
    } else if (pressed.z) shopBuy(items[s.idx]);
  } else {
    if (pressed.up) { s.zone = 'grid'; s.idx = Math.min(rowLast(rows - 1), (rows - 1) * SHOP_COLS + s.col); Snd.play('ui_move'); }
    else if (pressed.z) {
      Snd.play('ui_cancel');
      enterPrep(s.from, 1);   // 回到同一個出發準備畫面
    }
  }
  // 游標停到剛上架的格 → 不再畫 NEW
  if (s.zone === 'grid') { const it = items[s.idx], st = shopState(it); if (!st.fameLocked) G.shopSeen[it] = true; }
}

// ───────────────────────── 總結算 ─────────────────────────
function toResult() {
  const stars = G.rep >= STAR_AT[2] ? 3 : G.rep >= STAR_AT[1] ? 2 : G.rep >= STAR_AT[0] ? 1 : 0;
  RS = { t: 0, stars, shown: 0 };
  setScene('result');
  if (window.PVDX) PVDX.finish();   // 玩完一局: 通知網站(touch.js)
}
function resultInput(dt) {
  RS.t += dt;
  while (RS.shown < RS.stars && RS.t >= 0.8 + 0.6 * RS.shown) { RS.shown++; Snd.play('star'); }
  if (pressed.z) {
    Snd.play('ui_confirm');
    newRun(true);
    beginDay(1);
  }
}

// ───────────────────────── 主更新 ─────────────────────────
function update(dt) {
  Snd.frame = {};
  switch (scene) {
    case 'title': TITLE_T += dt; titleInput(); break;
    case 'calendar': calendarInput(dt); break;
    case 'intermission': intermissionInput(dt); break;
    case 'prep': prepInput(dt); break;
    case 'select': selectInput(); break;
    case 'weapon': weaponInput(dt); break;
    case 'dungeon': if (GD) updateGuide(dt); else updateDungeon(dt); break;
    case 'dresult': dresultInput(); break;
    case 'setup1': setup1Input(dt); break;
    case 'setup2': setup2Input(dt); break;
    case 'show': if (GD) updateGuide(dt); else updateShow(dt); break;
    case 'sresult': sresultInput(dt); break;
    case 'shop': shopInput(dt); break;
    case 'result': resultInput(dt); break;
  }
  for (const f of UI.floats) f.t += dt;
  UI.floats = UI.floats.filter(f => f.t < f.dur);
  pressed = {};
  // 出口詢問框、拿到卡過場、下樓轉場、倒下動畫中泡泡也停在當下
  let tdt = dt;
  if (scene === 'dungeon' && D && (D.prompt || D.down || D.cardGet || D.floorFx)) tdt = 0;
  if (scene === 'shop' && (G.shop.buyWait || G.shop.cg)) tdt = 0;
  if (!GD) tutUpdate(tdt);   // 暫停式引導期間泡泡計時停住
  Snd.duck(!!GD || (scene === 'dungeon' && !!D && !!(D.prompt || D.cardGet)) || (scene === 'shop' && !!G.shop.cg));
}

// ───────────────────────── 繪製 ─────────────────────────
function hudMessage() {
  switch (scene) {
    case 'prep': return '[←][→] 選擇 [Z] 決定 [↓] 聲音';
    case 'select': return '[←][→] 選擇 [Z] 決定 [X] 返回';
    case 'weapon': return G.day === 0 ? '[Z] 出發' : '[←][→] 選擇 [Z] 決定 [X] 返回';
    case 'dungeon': {
      if (D.down || D.cardGet || D.floorFx || GD) return '';
      if (D.quest && D.quest.phase !== 'bar') return '';   // 任務卡、縮小、任務完成期間沒有訊息
      if (D.prompt) return '[←][→] 選擇 [Z] 決定 [X] 留下';
      if (D.kegs.some(k => k.mode === 'fuse' && dist(k.x, k.y, D.tamer.x, D.tamer.y) <= 130 + 18)) return '爆炸桶要爆了 快跑!';
      if (D.lasso) return '繞牠一圈!';
      if (D.tamer.hidden) return '躲藏中';
      const w = D.tamer.weapon;
      return w === 'sword' ? '[Z] 攻擊 [X] 擊暈 [空白] 拋繩' : w === 'spear' ? '[Z] 攻擊 [X] 突進 [空白] 拋繩' : '[Z] 攻擊 [空白] 拋繩';
    }
    case 'dresult': case 'sresult': return '[Z] 繼續';
    case 'setup1': return G.s1.zone === 'grid' ? '[Z] 上台/下台 [↓] 下一步' : '[Z] 確定 [↑] 回格子';
    case 'setup2':
      if (G.s2.panel) return '[↑][↓] 選 [Z] 確定 [X] 取消';
      return G.s2.row >= BTN_GO ? '[←][→] 開演/返回 [Z] 確定' : '[↑][↓] 選列 [←][→] 暗號/表演卡 [Z] 放入 [X] 清空';
    case 'show': return '表演中…';
    case 'shop': return '[←][→] 切分頁 [Z] 購買';
    case 'result': return '[Z] 重來';
  }
  return '';
}
function hudState() {
  const inD = scene === 'dungeon' && D, inS = scene === 'show' && S;
  return {
    phase: scene, day: G.day, dayMax: DAY_MAX, gold: G.gold, rep: G.rep, sat: inS ? S.sat : 0,
    ropes: inD ? D.ropes : 0, ropeMax: inD ? ropeMaxNow() : 0, caught: inD ? D.caps.slice() : [],
    weapon: inD ? D.tamer.weapon : G.weapon, atk: inD ? G.atk : 0,
    xCdLeft: inD ? Math.min(D.tamer.xCd, xCdMax()) : 0, xCdMax: inD ? xCdMax() : 0,
    timeLeft: inD ? (D.timed ? Math.max(0, D.timeLeft) : 0) : 0,
    timeMax: inD ? (D.timed ? TIME_LIMIT : 0) : 0,
    dungeon: inD ? D.style : '', dungeonName: inD ? D.def.name : '', floor: inD ? D.fi + 1 : 0, floorMax: inD ? D.floorN : 0,
    message: hudMessage(),
  };
}
function bgState(sc) { return { scene: sc, day: G.day, prepStage: sc === 'prep' && PL ? PL.stage : '' }; }
// 區域類(冰柱射線、爆竹)畫在魔物之下, 投射物畫在上面
function drawHazards(list, areaPhase, ox, oy, killer) {
  const arr = killer && list.indexOf(killer) < 0 ? list.concat([killer]) : list;   // 致命的那顆已被收掉也要留在原地標亮
  for (const h of arr) {
    const isArea = h.kind === 'icebeam' || h.kind === 'firecracker';
    if (isArea !== areaPhase) continue;
    Art.drawHazard(ctx, { x: h.x - ox, y: h.y - oy, kind: h.kind, phase: h.phase, radius: h.radius, angle: h.angle, length: h.length, width: h.width,
      t: h.t, dur: h.dur, reflected: h.reflected, killer: !!killer && h === killer });
  }
}
function tileKind(ch) { return ch === '#' ? 'wall' : ch === 'o' ? 'pillar' : ch === 'L' ? 'hurt' : ch === 'W' ? 'slow' : ch === 'G' ? 'bush' : 'floor'; }
function onScr(x, y, m) { return x > -OX - m && x < DW + OX + m && y > (Art.hudH ? Art.hudH('dungeon') : 100) - m && y < CH + m; }
const STATIC_FLOAT = { hint: true, boost: true, confetti: true, unlock: true };

function renderDungeon() {
  const T = D.tamer, st = D.style, cam = camOf(), ox = cam.x, oy = cam.y, fl = D.fi + 1;
  Art.drawBackground(ctx, bgState('dungeon'));
  ctx.save();
  ctx.beginPath(); ctx.rect(-OX, 100, CW, CH - 100); ctx.clip();
  const wy0 = oy + 100;
  // 地圖比可視寬窄時, 地圖左右兩側的欄一律補牆(不露出地圖外的底色)
  const c0 = Math.floor((ox - OX) / TILE), c1 = Math.floor((ox - OX + CW) / TILE);
  const r0 = Math.max(0, Math.floor(wy0 / TILE)), r1 = Math.min(D.H - 1, Math.floor((wy0 + 620) / TILE));
  for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) {
    const ch = (c < 0 || c >= D.W) ? '#' : D.grid[r][c], x = c * TILE + 30 - ox, y = r * TILE + 30 - oy;
    if (ch === 'X') Art.drawCrackWall(ctx, { x, y, dungeon: st, cracks: D.cracks[r * D.W + c] || 0 });
    else Art.drawTile(ctx, { x, y, dungeon: st, floor: fl, kind: tileKind(ch), nest: ch === 'n' });
  }
  if (D.stairs) {
    const x = D.stairs.x - ox, y = D.stairs.y - oy;
    if (onScr(x, y, 60)) Art.drawStairs(ctx, { x, y, dungeon: st, floor: fl, dir: 'down' });
  }
  if (D.upStairs) {
    const x = D.upStairs.x - ox, y = D.upStairs.y - oy;
    if (onScr(x, y, 60)) Art.drawStairs(ctx, { x, y, dungeon: st, floor: fl, dir: 'up' });
  }
  if (D.exit) {
    const x = D.exit.x - ox, y = D.exit.y - oy;
    if (onScr(x, y, 60)) Art.drawExit(ctx, { x, y, dungeon: st, armed: D.exit.armed });
  }
  for (const f of D.fountains) {
    const x = f.x - ox, y = f.y - oy; if (!onScr(x, y, 60)) continue;
    Art.drawFountain(ctx, { x, y, dungeon: st, full: f.full });
  }
  for (const p of D.portals) {
    const x = p.x - ox, y = p.y - oy; if (!onScr(x, y, 60)) continue;
    Art.drawPortal(ctx, { x, y, dungeon: st, id: p.id, charge: clamp(p.charge / 0.3, 0, 1), cooling: D.pairCd[p.id] > 0 });
  }
  for (const s of D.shrines) {
    const x = s.x - ox, y = s.y - oy; if (!onScr(x, y, 60)) continue;
    Art.drawBoostShrine(ctx, { x, y, dungeon: st, kind: s.kind, used: s.used, t: D.elapsed });
  }
  for (const c of D.chests) {
    const x = c.x - ox, y = c.y - oy; if (!onScr(x, y, 60)) continue;
    const cd = c.isKey ? 0.3 : 0.6;   // 鑰匙寶箱 0.3、金幣寶箱 0.6(含金幣噴出)
    Art.drawChest(ctx, { x, y, dungeon: st, open: c.open, openT: c.open ? Math.min(cd, c.openT) : cd, openDur: cd, key: !!c.isKey });
  }
  for (const t of D.trees) {
    const x = t.x - ox, y = t.y - oy; if (!onScr(x, y, 60)) continue;
    Art.drawFruitTree(ctx, { x, y, dungeon: st, hasFruit: t.hasFruit });
  }
  for (const f of D.fruits) {
    const x = f.x - ox, y = f.y - oy; if (!onScr(x, y, 40)) continue;
    Art.drawFruit(ctx, { x, y, dungeon: st });
  }
  const kz = D.down && D.down.kobj && D.down.kobj.kind ? D.down.kobj : null;       // 致命的投射物 / 射線 / 爆竹(定格標亮)
  const kb = D.down && D.down.kobj && !D.down.kobj.kind ? D.down.kobj : null;      // 致命的爆炸
  drawHazards(D.hz, true, ox, oy, kz);
  for (const k of D.kegs) {
    if (k.mode === 'gone') continue;   // 炸掉就不畫、不擋路
    const x = k.x - ox, y = k.y - oy; if (!onScr(x, y, 140)) continue;
    const fuse = k.mode === 'fuse';
    Art.drawKeg(ctx, { x, y, dungeon: st, mode: k.mode, fuseT: fuse ? Math.min(1.0, k.fuseT) : 1.0, fuseDur: 1.0, radius: 130 });
  }
  // 拋繩瞄準記號: 現在按空白鍵會瞄到哪一隻(虛弱 = 綠色會套上, 沒虛弱 = 灰色會掙脫)
  const canAim = D.ropes > 0 && !D.lasso && !D.rope && !D.down && !D.cardGet && !D.floorFx && !D.prompt;
  const aim = canAim ? ropeAimTarget() : null;
  for (const m of D.mons) {
    const x = m.x - ox, y = m.y - oy; if (!onScr(x, y, 90)) continue;
    const pw = m.sp === 'penguin' && m.warnH && !m.warnH.dead ? m.warnH : null;   // 企鵝的射線預警就是牠的前搖
    const wu = m.windup || !!pw;
    Art.drawWildMonster(ctx, { x, y, species: m.sp, hp: m.hp, maxHp: m.maxHp, hit: m.hitT > 0, weak: isWeak(m),
      stunLeft: m.stun, stunDur: 2, lassoed: m.lassoed, casting: m.casting, move: m.move, moveT: m.moveT, moveDur: m.moveDur, dir: m.face,
      windup: wu, windupT: pw ? Math.min(0.7, pw.t) : (m.windup ? m.windupT : 0.6), windupDur: pw ? 0.7 : (m.windup ? m.windupDur : 0.6),
      aim: m.windup ? m.aim : null,
      escapeT: Math.min(0.4, m.escapeT), escapeDur: 0.4,
      ropeAim: aim && aim.m === m ? (isWeak(m) ? 'weak' : 'strong') : 'none' });
  }
  if (D.lasso) {
    const L = D.lasso, m = L.m;
    Art.drawLasso(ctx, { x1: T.x - ox, y1: T.y - oy, x2: m.x - ox, y2: m.y - oy, progress: clamp(Math.abs(L.sum) / (Math.PI * 2), 0, 1),
      t: L.t, limit: L.limit, len: dist(T.x, T.y, m.x, m.y), maxLen: 220 });
  }
  if (D.rope) {
    const R = D.rope;
    let hx = R.x, hy = R.y;
    if (R.phase === 'back') { const k = clamp(R.t / ROPE_BACK, 0, 1); hx = R.hx + (T.x - R.hx) * k; hy = R.hy + (T.y - R.hy) * k; }
    Art.drawRopeThrow(ctx, { x1: T.x - ox, y1: T.y - oy, x2: hx - ox, y2: hy - oy, phase: R.phase, t: R.phase === 'back' ? Math.min(ROPE_BACK, R.t) : R.t, dur: R.phase === 'back' ? ROPE_BACK : R.dur });
  }
  const dn = D.down;
  Art.drawTamer(ctx, { x: T.x - ox, y: T.y - oy, facing: T.facing, weapon: T.weapon, dashing: !!T.dash, blink: !dn && T.invuln > 0,
    lassoing: !!D.lasso, slowed: T.slowT > 0, hidden: !!T.hidden,
    down: !!dn, downT: dn ? Math.min(dn.dur, dn.t) : 1.5, downDur: 1.5 });
  for (const f of D.fx) {
    Art.drawWeaponFx(ctx, { x: f.x - ox, y: f.y - oy, weapon: f.weapon, move: f.move, shape: f.shape, angle: f.angle, spread: f.spread,
      radius: f.radius, length: f.length, width: f.width, t: f.t, dur: f.dur });
  }
  drawHazards(D.hz, false, ox, oy, kz);
  for (const b of D.blasts) {
    const x = b.x - ox, y = b.y - oy; if (!onScr(x, y, 140)) continue;
    Art.drawBlast(ctx, { x, y, radius: 130, t: b.t, dur: b.dur, killer: b === kb });
  }
  { const hb = D.hb;
    Art.drawHeartBar(ctx, { x: T.x - ox, y: T.y - oy - 46, hearts: T.hearts, maxHearts: T.maxHearts,
      fx: hb.fx, fxT: hb.fx === 'none' ? 2 : Math.min(2, hb.t), fxDur: 2, delta: hb.fx === 'none' ? 0 : hb.delta }); }
  for (const f of D.floats) {
    if (f.abs) continue;
    Art.drawFloatText(ctx, { x: f.x - ox, y: f.y - oy - (STATIC_FLOAT[f.kind] ? 0 : f.t * 30), text: f.text, kind: f.kind, t: f.t, dur: f.dur });
  }
  ctx.restore();
  if (dn) Art.drawDownFx(ctx, { x: T.x - ox, y: T.y - oy, cause: dn.cause, t: Math.min(dn.dur, dn.t), dur: dn.dur });
  renderTutorial('below');
  Art.drawHud(ctx, hudState());
  if (D.quest) {
    const Q = D.quest;
    const dur = Q.phase === 'card' ? 2.0 : Q.phase === 'shrink' ? 0.5 : Q.phase === 'done' ? 1.0 : 0.5;
    const qt = Q.phase === 'bar' ? 0.5 : Math.min(dur, Q.t);
    const idle = Q.phase === 'card' || Q.phase === 'shrink';
    Art.drawQuestBanner(ctx, { phase: Q.phase, t: qt, dur, species: 'monkey', count: D.caps.length, goal: 3,
      popT: idle ? 0.4 : Q.popT, popDur: 0.4 });
  }
  renderTutNote();
  if (D.prompt) Art.drawExitPrompt(ctx, { choice: D.prompt.choice, t: D.prompt.t });
  for (const f of D.floats) {   // 畫面固定位置的飄字(出口開放): 蓋在詢問框之上才看得到
    if (f.abs) Art.drawFloatText(ctx, { x: f.x, y: f.y, text: f.text, kind: f.kind, t: f.t, dur: f.dur });
  }
  if (D.cardGet) {
    const g = D.cardGet;
    const tip = g.kind === 'key' ? '下次出發時 可以去雪境冰窟了!' : (g.first ? '這是表演用的卡! 表演前排進節目單' : '');
    Art.drawCardGet(ctx, { kind: g.kind, key: g.key, name: cardName(g.key), desc: cardInfo(g.key).desc, tip,
      t: Math.min(g.dur, g.t), dur: g.dur, ready: g.ready, fromX: g.fromX - ox, fromY: g.fromY - oy });
  }
  if (D.floorFx) Art.drawFloorFx(ctx, { floor: D.floorFx.n, floorMax: D.floorN, dungeonName: D.def.name, t: Math.min(1, D.floorFx.t), dur: 1.0, up: !!D.floorFx.up });
  if (GD) renderGuide();   // 暫停式引導畫在最上層
}

function renderShow() {
  Art.drawShowArena(ctx, {});
  drawHazards(S.hz, true, 0, 0);
  const L = S.loose;
  const showMon = (m) => {
    const isL = !!L && L.m === m;
    let mode = 'roam';
    if (isL) mode = 'charge';
    else if (L) mode = 'stopped';
    else if (m.knock) mode = 'knock';
    else if (S.rush && S.rush.m === m && S.rush.left > 0) mode = 'rush';
    else if (m.progMove) mode = 'program';
    Art.drawShowMonster(ctx, {
      x: m.x, y: m.y, species: m.sp, rage: m.rage, angryLow: ANGRY_LOW,
      marks: Math.min(5, m.marks), mode, target: m.target > 0,
      frozenLeft: m.frozen, frozenDur: 1.5, performing: m.perfAct >= 0, performT: m.perfAct >= 0 ? m.perfAct : 0, performDur: 0.5,
      fx: m.fx, fxT: m.fx === 'none' ? 0 : m.fxT, fxDur: 0.5,
      looseT: isL ? L.t : 0, looseDur: 2.5,
      move: m.move, moveT: m.moveT, moveDur: m.moveDur, dir: m.face,
      knockT: m.knock ? m.knock.t : 0.25, knockDur: 0.25,
    });
  };
  for (const m of S.mons) if (!(L && L.m === m)) showMon(m);
  drawHazards(S.hz, false, 0, 0);
  for (const k of S.kegs) {
    const dur = k.phase === 'fly' ? 0.5 : k.phase === 'fuse' ? 1.0 : 0.3;
    Art.drawShowKeg(ctx, { x: k.x, y: k.y, fromX: k.fromX, fromY: k.fromY, phase: k.phase, t: Math.min(dur, k.t), dur, radius: 110 });
  }
  for (const c of S.confs) {
    if (c.phase === 'burst') continue;
    const dur = c.phase === 'gather' ? 0.6 : 1.0;
    Art.drawConfetti(ctx, { phase: c.phase, t: Math.min(dur, c.t), dur, count: c.n });
  }
  if (S.rain) Art.drawRainFx(ctx, { t: Math.min(1.5, S.rain.t), dur: 1.5 });
  if (S.banner) Art.drawBannerFx(ctx, { x: 640, y: 180, cue: S.banner.cue, program: S.banner.prog, t: S.banner.t, dur: 0.8 });
  for (const side of ['top', 'bottom']) {
    for (let i = 0; i < 8; i++) {
      const v = S.vis[side][i];
      Art.drawFence(ctx, { x: 165 + 136 * i, y: side === 'top' ? 140 : 572, side, broken: S.fences[side][i] });
      const mode = v.mode === 'flee' ? (v.t >= 1.5 ? 'empty' : 'flee') : 'watch';
      Art.drawVisitor(ctx, { x: 165 + 136 * i, y: side === 'top' ? 95 : 622, side, i, mode, mood: TIERS[S.tierIdx],
        t: S.clock, fleeT: mode === 'flee' ? v.t : 0, fleeDur: 1.5 });
    }
  }
  for (const c of S.confs) if (c.phase === 'burst') Art.drawConfetti(ctx, { phase: 'burst', t: Math.min(0.8, c.t), dur: 0.8, count: c.n });
  if (L) {
    showMon(L.m);
    Art.drawLooseFx(ctx, { x: L.m.x, y: L.m.y, t: Math.min(2.5, L.t), dur: 2.5 });
  }
  if (!L && S.tierIdx === 3) Art.drawHeatAlert(ctx, { t: S.frenzyT });
  for (let i = 0; i < ROWS; i++) {
    const r = S.rows[i], cur = i === S.cur;
    const waiting = cur && r.cue === 'wait' && S.waitT <= 0;
    Art.drawCueRow(ctx, { x: 322 + 212 * i, y: 691, style: 'mini', index: i, cue: r.cue, program: r.prog, complete: r.complete, selCell: -1,
      current: cur, t: waiting ? Math.min(WAIT_SECS, S.sinceFire) : 0, dur: waiting ? WAIT_SECS : 0, switching: cur && S.waitT > 0, locked: false, blocked: false, programOpen: true,
      waitT: cur && S.waitT <= 0 ? S.curWait : 0, waitWarn: 10 });
  }
  for (const f of S.floats) Art.drawFloatText(ctx, { x: f.x, y: f.y - (STATIC_FLOAT[f.kind] ? 0 : f.t * 30), text: f.text, kind: f.kind, t: f.t, dur: f.dur });
  Art.drawHud(ctx, hudState());
  Art.drawHeatMeter(ctx, { x: 640, y: 25, heat: S.heat, tier: TIERS[S.tierIdx], t: S.clock, tierT: Math.min(0.4, S.tierT), tierDur: 0.4, looseLine: LOOSE_LINE });
  Art.drawShowClock(ctx, { x: 900, y: 25, timeLeft: Math.max(0, S.left), timeMax: S.total, running: !L && !GD });
  renderTutorial('all');
  if (GD) renderGuide();   // 暫停式引導畫在最上層
}

function bankSlotState(b, x, y, selected) {
  return { x, y, species: b.sp, num: b.num, onStage: b.on, selected };
}
function drawBank(s, selected) {
  const n = G.bank.length;
  for (let i = s.top * 10; i < Math.min(n, (s.top + 3) * 10); i++) {
    const p = slotCenter(i);
    Art.drawBankSlot(ctx, bankSlotState(G.bank[i], p.x, p.y, selected && i === s.cur));
  }
  const rows = Math.ceil(n / 10);
  if (s.top > 0) Art.drawScrollMark(ctx, { x: 640, y: 58, dir: 'up' });
  if (s.top + 3 < rows) Art.drawScrollMark(ctx, { x: 640, y: 437, dir: 'down' });
}
function renderSetup1() {
  const s = G.s1;
  Art.drawBackground(ctx, bgState('setup1'));
  drawBank(s, s.zone === 'grid');
  const b = G.bank[Math.min(s.cur, G.bank.length - 1)];
  if (b) {
    Art.drawMonsterInfo(ctx, monsterInfoState(b, 480, 555));
  }
  Art.drawButton(ctx, { x: 960, y: 470, w: 220, h: 70, label: '下一步', selected: s.zone === 'next' });
  if (G.day !== 0) Art.drawButton(ctx, { x: 960, y: 570, w: 220, h: 70, label: '回上一頁', selected: s.zone === 'back' });
  for (const f of UI.floats) Art.drawFloatText(ctx, { x: f.x, y: f.y - (f.kind === 'hint' ? 0 : f.t * 30), text: f.text, kind: f.kind, t: f.t, dur: f.dur });
  Art.drawHud(ctx, hudState());
  Art.drawStageCount(ctx, { x: 640, y: 25, count: stageCount(), max: stageLimit(), popT: Math.min(0.3, G.stagePopT), popDur: 0.3 });
  renderTutorial('all');
}
function renderSetup2() {
  const s = G.s2;
  Art.drawBackground(ctx, bgState('setup2'));
  for (let i = 0; i < ROWS; i++) {
    const r = G.rows[i], stt = rowState(i), locked = stt === 'locked';
    Art.drawCueRow(ctx, { x: 380, y: 100 + 78 * i, style: 'row', index: i, cue: locked ? '' : r.cue, program: locked ? '' : r.prog, complete: !locked && !!(r.cue && r.prog),
      selCell: s.row === i ? s.col : -1, current: false, t: 0, dur: 0, switching: false, locked, blocked: stt === 'blocked', programOpen: !!r.cue, waitT: 0, waitWarn: 10 });
  }
  Art.drawButton(ctx, { x: 160, y: 410, w: 200, h: 70, label: '開演', selected: s.row === BTN_GO });
  Art.drawButton(ctx, { x: 400, y: 410, w: 200, h: 70, label: '返回上一步', selected: s.row === BTN_BACK });
  if (s.panel) Art.drawPickerPanel(ctx, { layer: s.panel.layer, options: s.panel.options, index: s.panel.index });
  Art.drawHud(ctx, hudState());
  renderTutorial('all');
}
function renderShop() {
  const s = G.shop, tab = SHOP_TABS[s.tab];
  Art.drawBackground(ctx, bgState('shop'));
  SHOP_TABS.forEach((t, i) => Art.drawShopTab(ctx, { x: 400 + 240 * i, y: 85, tab: t, current: i === s.tab, selected: s.zone === 'tab' && i === s.tab }));
  let lines = [];
  const items = SHOP_ITEMS[tab];
  items.forEach((it, i) => {
    const st = shopState(it), c = shopCell(i);
    st.x = c.x; st.y = c.y; st.selected = s.zone === 'grid' && s.idx === i;
    Art.drawShopItem(ctx, st);
  });
  if (s.zone === 'grid') lines = shopDetailLines(items[s.idx]);
  Art.drawShopDetail(ctx, { x: 640, y: 570, lines });
  Art.drawButton(ctx, { x: 1000, y: 625, w: 200, h: 70, label: '離開', selected: s.zone === 'go' });
  for (const f of UI.floats) Art.drawFloatText(ctx, { x: f.x, y: f.y - f.t * 30, text: f.text, kind: f.kind, t: f.t, dur: f.dur });
  Art.drawHud(ctx, hudState());
  renderTutorial('all');
  if (s.cg) {   // 拿到卡的過場: 畫在商店所有東西之上
    const g = s.cg;
    Art.drawCardGet(ctx, { kind: g.kind, key: g.item, name: cardName(g.item), desc: cardInfo(g.item).desc,
      tip: g.first ? '這是表演用的卡! 表演前排進節目單' : '', t: Math.min(g.dur, g.t), dur: g.dur, ready: g.ready, fromX: g.fromX, fromY: g.fromY });
  }
}

function render() {
  ctx.save(); ctx.translate(OX, 0);
  try { renderScene(); } finally { ctx.restore(); }
}
function renderScene() {
  switch (scene) {
    case 'title': Art.drawTitle(ctx, { t: TITLE_T }); break;
    case 'calendar': Art.drawCalendar(ctx, { day: G.day, dayMax: DAY_MAX, t: Math.min(CAL.t, CAL.dur), dur: CAL.dur, log: G.log.slice() }); break;
    case 'intermission': Art.drawIntermission(ctx, { t: IM.t, ready: IM.t >= 0.6, monsters: IM.mons, day: G.day, weapon: G.weapon }); break;
    case 'prep': {
      Art.drawBackground(ctx, bgState('prep'));
      Art.drawPlaceCard(ctx, { x: 440, y: 385, w: 440, h: 440, place: PL.stage === 'dungeon' ? 'dungeon' : 'show',
        note: PL.stage === 'dungeon' ? '抓魔物 · 找石碑變強' : '上台表演 · 賺滿意度', selected: PL.zone === 'card' && PL.cur === 0 });
      Art.drawPlaceCard(ctx, { x: 850, y: 385, w: 260, h: 300, place: 'shop', note: '武器 · 暗號 · 表演卡', selected: PL.zone === 'card' && PL.cur === 1 });
      Art.drawButton(ctx, { x: 1060, y: 640, w: 190, h: 60, label: Snd.muted ? '聲音 關' : '聲音 開', selected: PL.zone === 'sound' });
      if (PL.notice) Art.drawFloatText(ctx, { x: 640, y: 110, text: PL.notice.text, kind: 'unlock', t: PL.notice.t, dur: 1.5 });
      Art.drawHud(ctx, hudState());
      renderTutorial('all');
      break;
    }
    case 'select':
      Art.drawBackground(ctx, bgState('select'));
      DUNGEON_ORDER.forEach((id, i) => Art.drawDungeonCard(ctx, { x: 400 + 480 * i, y: 390, dungeon: id, name: DUNGEONS[id].name, floors: DUNGEONS[id].floors.length,
        species: DUNGEONS[id].species.slice(), chestsLeft: leftCount(id, 'chests', 'gold'), keyLeft: leftCount(id, 'chests', 'key'), boostsLeft: leftCount(id, 'boosts'),
        open: !!G.unlocked[id], condition: G.unlocked[id] ? '' : '在湖畔鐘塔第 2 層的寶箱找到鑰匙', selected: i === SEL.cur }));
      Art.drawHud(ctx, hudState());
      break;
    case 'weapon': {
      Art.drawBackground(ctx, bgState('weapon'));
      Art.drawWeaponSelect(ctx, { options: WS.opts.map(o => ({ key: o.key, name: o.name, line: o.line, last: o.last })), index: WS.idx,
        stats: { hearts: G.heartMax, ropes: WS.id === 'meadow' ? 3 : G.ropeMax, power: 2 + G.atk }, t: WS.t, tutorial: G.day === 0 });
      Art.drawHud(ctx, hudState());
      renderTutorial('all');
      break;
    }
    case 'dungeon': renderDungeon(); break;
    case 'dresult':
      Art.drawBackground(ctx, bgState('dresult'));
      Art.drawDungeonResult(ctx, { reason: DR.reason, cause: DR.cause || '', floorReached: DR.floorReached, captures: DR.captures, kills: DR.kills, gold: DR.gold, loot: DR.loot });
      Art.drawHud(ctx, hudState());
      break;
    case 'setup1': renderSetup1(); break;
    case 'setup2': renderSetup2(); break;
    case 'show': renderShow(); break;
    case 'sresult':
      Art.drawBackground(ctx, bgState('sresult'));
      Art.drawShowResult(ctx, { sat: SR.sat, gold: SR.gold, fameGain: SR.fameGain, tallyT: SR.tallyT, tallyDur: SR.tallyDur, bestChain: SR.bestChain, loose: SR.loose, timeLeft: SR.timeLeft, tutorial: SR.tutorial });
      Art.drawHud(ctx, hudState());
      break;
    case 'shop': renderShop(); break;
    case 'result': {
      Art.drawBackground(ctx, bgState('result'));
      const bank = SPECIES.filter(sp => G.bank.some(b => b.sp === sp)).map(sp => ({ species: sp, count: G.bank.filter(b => b.sp === sp).length }));
      Art.drawResultPanel(ctx, { rep: G.rep, goldEarned: G.goldEarned, bestChain: G.bestChain, days: G.log.slice(), bank,
        cards: G.cardsGot, cardsMax: CARD_TOTAL, boosts: G.boostsGot, boostsMax: BOOST_TOTAL, stars: RS.shown });
      Art.drawHud(ctx, hudState());
      break;
    }
  }
}


// ───────────────────────── 啟動 ─────────────────────────
const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');
let dpr = 1;   // 實際像素 / 邏輯像素(顯示大小 × devicePixelRatio)
function resize() {
  // 顯示大小由 index.html 的 CSS 決定(21:9 等比、置中、不裁切); 這裡只依實際顯示寬度配置畫布像素, 維持清晰
  const rect = canvas.getBoundingClientRect();
  const cssW = rect.width || Math.min(window.innerWidth, window.innerHeight * CW / CH) || CW;
  dpr = Math.min(Math.max(cssW * (window.devicePixelRatio || 1) / CW, 0.5), 2.5);
  canvas.width = Math.round(CW * dpr); canvas.height = Math.round(CH * dpr);
}
window.addEventListener('resize', resize);
window.addEventListener('orientationchange', function () { setTimeout(resize, 100); });
resize();

newRun(false);
Snd.music('title');
let lastTs = 0;
function frame(ts) {
  if (!lastTs) lastTs = ts;
  const dt = Math.min((ts - lastTs) / 1000, 1 / 30);
  lastTs = ts;
  try {
    if (!(window.PVDX && PVDX.paused)) update(dt);   // 網站暫停 / 直拿提示 / Esc 暫停時凍結(touch.js)
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, CW, CH);
    render();
    if (window.PVDX) PVDX.draw(ctx);                 // 觸控按鈕畫在最上層(電腦版是空函式)
  } catch (err) { console.error(err); }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

