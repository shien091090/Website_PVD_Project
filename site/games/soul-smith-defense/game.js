'use strict';
// 魂匠守衛者(打磨版第 13 輪) — 玩法驗證 Demo。邏輯與繪製分離: update 改狀態, render 只呼叫 Art.drawXxx。

const Placeholder = {}; // interface.json 涵蓋所有圖形, 無佔位

// 第 13 輪: 畫布 1280×720(16:9), 遊戲與繪製一律用設計座標 1024×576, 每幀把畫布放大 1.25 倍
const SC = 1.25;
const W = 1024, H = 576; // 設計座標(邏輯 / 夾值用)
const CW = (typeof Art !== 'undefined' && Art.canvas && Art.canvas.width) || 1280; // 畫布邏輯尺寸(Art.canvas, 發布加寬時才會變)
const CH = (typeof Art !== 'undefined' && Art.canvas && Art.canvas.height) || 720;
const OX = (CW - 1280) / 2; // 畫布像素寬比 1280 多出來的一半(邏輯畫布座標); 設計區平移量
const EDGE = OX / SC;       // 設計座標下, 畫面左右兩側各多出來的寬度(貼邊用)
const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');
let DPR = window.devicePixelRatio || 1;
// 畫布依容器等比縮放: 算出最大的 16:9 尺寸並置中(留黑邊, 不裁切不拉伸); 實際像素 = 邏輯尺寸 × DPR
function fitCanvas() {
  DPR = window.devicePixelRatio || 1;
  const cw = window.innerWidth || document.documentElement.clientWidth || CW;
  const ch = window.innerHeight || document.documentElement.clientHeight || CH;
  const s = Math.min(cw / CW, ch / CH);
  canvas.style.width = Math.floor(CW * s) + 'px';
  canvas.style.height = Math.floor(CH * s) + 'px';
  const pw = Math.round(CW * DPR), ph = Math.round(CH * DPR);
  if (canvas.width !== pw || canvas.height !== ph) { canvas.width = pw; canvas.height = ph; }
}
fitCanvas();
window.addEventListener('resize', fitCanvas);
window.addEventListener('orientationchange', fitCanvas);

// ───────── 常數 ─────────
const BASIC = { ranged: 1, melee: 1, frost: 1, shock: 1, heal: 1, seek: 1, march: 1, charge: 1 };
const ATTACK = { ranged: 1, melee: 1, frost: 1, shock: 1, pierce: 1, iceArrow: 1, whirl: 1, frostSmash: 1, thunderSlash: 1, thunderOrb: 1 };
const RESONANT = Object.assign({ heal: 1, healRay: 1 }, ATTACK); // 會共鳴 = 攻擊類 + 支援類
const COMBO_KIND = ['pierce', 'iceArrow', 'whirl', 'frostSmash', 'thunderSlash', 'thunderOrb', 'blink', 'healRay', 'holyPath', 'steadfast'];
const COMBO_NAME = ['穿透箭', '冰箭', '旋風斬', '冰霜重擊', '雷霆斬', '雷電球', '瞬閃', '治癒光線', '神聖之路', '不動如山'];
const COMBO_IDX = {}; COMBO_KIND.forEach((k, i) => { COMBO_IDX[k] = i; });
const NCOMBO = COMBO_KIND.length;
const RECIPES = [
  [['ranged', 'ranged']], [['ranged', 'frost']], [['melee', 'melee']], [['melee', 'frost']],
  [['shock', 'melee']], [['shock', 'ranged']], [['shock', 'seek']], [['heal', 'ranged']], [['heal', 'charge']],
  [['march', 'seek'], ['march', 'charge']]
];
// 圖鑑 / 第一次合成演出用的 11 條配方: [材料 A, 材料 B, 組合序號](順序 = 合成表, 不動如山兩條排最後)
const RECIPE_FLAT = [];
RECIPES.forEach((alts, ci) => alts.forEach(r => RECIPE_FLAT.push([r[0], r[1], ci])));
const KITS = { crossbowKit: 1, pillarKit: 1 };
const KIT_NAME = { crossbowKit: 'crossbow', pillarKit: 'pillar', soldierKit: 'soldier', golemKit: 'golem' };
const CASTLE_POS = { x: 900, y: 336, half: 56 };
const CASTLE_DOOR = { x: 844, y: 336 };
const SHOP_ALL = [['pillarKit', '魂柱', 40], ['crossbowKit', '箭塔', 15], ['soldierKit', '步兵', 12], ['golemKit', '石魔像', 18]];
const PRICE = { pillar: 40, tower: 15, soldier: 12, golem: 18 };
// 第 7 輪: 說明文字換成使用者指定的新文字(含全形逗號)
const DESC = {
  ranged: ['遠攻', '射箭攻擊範圍內敵人'], melee: ['近戰', '近身砍擊敵人'], frost: ['冰霜', '攻擊附帶緩速效果'],
  shock: ['電擊', '攻擊附帶傷害擴散效果'], heal: ['治癒', '緩慢治癒附近友軍'],
  seek: ['自動索敵', '主動追打附近的敵人'], march: ['進攻主堡', '走回主堡，返還花費金幣'], charge: ['衝鋒', '沿路衝撞敵人'],
  pierce: ['穿透箭', '一箭貫穿整排敵人', ['ranged', 'ranged']], iceArrow: ['冰箭', '射箭攻擊附帶強大緩速效果', ['ranged', 'frost']],
  whirl: ['旋風斬', '大範圍砍擊', ['melee', 'melee']], frostSmash: ['冰霜重擊', '範圍重擊並附帶緩速效果', ['melee', 'frost']],
  thunderSlash: ['雷霆斬', '重擊附帶暈眩效果', ['shock', 'melee']], thunderOrb: ['雷電球', '發射出一顆電擊周遭敵人的雷電球', ['shock', 'ranged']],
  blink: ['瞬閃', '敵人接近時會瞬移到敵人面前', ['shock', 'seek']], healRay: ['治癒光線', '發射治癒射線快速治癒友軍', ['heal', 'ranged']],
  holyPath: ['神聖之路', '移動時產生一條治癒和加速效果的軌跡', ['heal', 'charge']], steadfast: ['不動如山', '大幅提高防禦力但無法移動', ['march', 'seek'], 'charge'],
  shop: ['購買', '可開啟商店功能']
};
// 第 7 輪: 顯示名稱改名(字串 key 不變); Boss 三隻(生命不乘關卡倍率、半邊長 36、掉 10 枚金幣)
const ENEMY_DEF = {
  imp: { name: '小魔怪', hp: 40, speed: 45, half: 16, items: ['melee', 'march'], coins: 1, dmg: 2 },
  archer: { name: '魔箭怪', hp: 30, speed: 50, half: 16, items: ['ranged', 'march'], coins: 2, dmg: 2 },
  ice: { name: '霜結怪', hp: 50, speed: 42, half: 16, items: ['frost', 'march'], coins: 2, dmg: 2 },
  drummer: { name: '奔牛怪', hp: 45, speed: 48, half: 18, items: ['charge', 'march'], coins: 2, dmg: 2 },
  thunder: { name: '電電怪', hp: 45, speed: 46, half: 18, items: ['shock', 'march'], coins: 2, dmg: 2 },
  healer: { name: '治癒怪', hp: 50, speed: 40, half: 18, items: ['heal', 'march'], coins: 2, dmg: 2 },
  brute: { name: '大傢伙', hp: 80, speed: 40, half: 22, items: ['melee', 'seek', 'march'], coins: 3, dmg: 3 },
  bossFrost: { name: '霜角巨怪', boss: true, hp: 600, speed: 30, half: 36, items: ['frost', 'melee', 'melee', 'march'], coins: 10, dmg: 6 },
  bossThunder: { name: '雷霆魔王', boss: true, hp: 900, speed: 30, half: 36, items: ['shock', 'shock', 'heal', 'march'], coins: 10, dmg: 10 }
};
const BOSS_INTRO = { sec: 2.9, sfx: { bossFrost: 'boss_intro_frost', bossThunder: 'boss_intro_thunder' } };
const KIND_OF = { tower: 'crossbow', pillar: 'pillar', soldier: 'soldier', castle: 'castle' };
function isSoul(h) { return !!h && !KITS[h]; }
function zeroSingles() { return { ranged: 0, melee: 0, frost: 0, shock: 0, heal: 0, seek: 0, march: 0, charge: 0 }; }
function zeros(n) { const a = []; for (let i = 0; i < n; i++) a.push(0); return a; }

// ───────── 關卡資料 ─────────
function gp(sp, pairs, gap) { return { sp, list: pairs, gap: gap || 1.2 }; } // 一組出怪: 出怪點序號 + [[種類, 隻數], ...] + 每隻間隔(swift = 輕快小鬼)
const LEVELS = [
  {
    name: '新手教學・初陣', gold: 30, cap: 1, mul: 1.0, t1: 15, gap: 24,
    paths: [[[288, 48], [288, 336], [900, 336]]],
    spawns: [{ name: 'A', x: 288, y: 88, ang: Math.PI / 2 }],
    towers: [], soldiers: [], neutrals: [],
    waves: [
      [gp(0, [['imp', 1], ['archer', 1]])],
      [gp(0, [['swift', 8]], 0.4)],
      [gp(0, [['imp', 4], ['archer', 2]])]
    ]
  },
  {
    name: '新手教學・共鳴', gold: 70, cap: 2, mul: 1.0, t1: 15, gap: 26,
    paths: [[[0, 144], [528, 144], [528, 528], [720, 528], [720, 336], [900, 336]]],
    spawns: [{ name: 'A', x: 40, y: 144, ang: 0 }],
    towers: [], soldiers: [], neutrals: [[264, 408]],
    waves: [
      [gp(0, [['imp', 2]])],
      [gp(0, [['thunder', 1], ['imp', 3], ['archer', 3]])],
      [gp(0, [['imp', 4], ['archer', 3], ['ice', 2], ['thunder', 1]])]
    ]
  },
  {
    name: '長蛇', gold: 70, cap: 2, mul: 1.2, t1: 15, gap: 28,
    paths: [[[0, 144], [96, 144], [96, 528], [240, 528], [240, 144], [384, 144], [384, 528], [528, 528], [528, 96], [672, 96], [672, 528], [816, 528], [816, 336], [900, 336]]],
    spawns: [{ name: 'A', x: 40, y: 144, ang: 0 }],
    towers: [], soldiers: [], neutrals: [[600, 312]],
    waves: [
      [gp(0, [['imp', 6]])],
      [gp(0, [['imp', 4], ['archer', 3]])],
      [gp(0, [['ice', 3], ['imp', 4], ['thunder', 2]])],
      [gp(0, [['brute', 2], ['archer', 3], ['imp', 3], ['healer', 1]])],
      [gp(0, [['brute', 3], ['ice', 3], ['archer', 3], ['thunder', 2], ['healer', 1], ['bossFrost', 1]])]
    ],
    boss: { type: 'bossFrost', sp: 0, x: 40, y: 144 }
  },
  {
    name: '三叉', gold: 80, cap: 3, mul: 1.5, t1: 15, gap: 24,
    paths: [
      [[0, 144], [432, 144], [432, 336], [576, 336], [576, 528], [720, 528], [720, 336], [900, 336]],
      [[0, 336], [432, 336], [576, 336], [576, 528], [720, 528], [720, 336], [900, 336]],
      [[0, 528], [432, 528], [432, 336], [576, 336], [576, 528], [720, 528], [720, 336], [900, 336]]
    ],
    spawns: [{ name: '北', x: 40, y: 144, ang: 0 }, { name: '中', x: 40, y: 336, ang: 0 }, { name: '南', x: 40, y: 528, ang: 0 }],
    towers: [], soldiers: [], neutrals: [[648, 264], [648, 456]],
    waves: [
      [gp(0, [['imp', 4]]), gp(2, [['imp', 4]])],
      [gp(1, [['archer', 3], ['ice', 2]]), gp(0, [['imp', 4]])],
      [gp(2, [['drummer', 3], ['brute', 1]]), gp(1, [['imp', 5], ['thunder', 1]])],
      [gp(0, [['brute', 2], ['ice', 3]]), gp(2, [['archer', 4], ['healer', 1]]), gp(1, [['imp', 3], ['thunder', 1]])],
      [gp(0, [['imp', 3], ['archer', 2]]), gp(1, [['imp', 3], ['archer', 2]]), gp(2, [['imp', 3], ['archer', 2]])],
      [gp(0, [['brute', 3], ['drummer', 2], ['healer', 1]]), gp(1, [['ice', 3], ['brute', 2], ['thunder', 2]]), gp(2, [['imp', 5], ['healer', 1]])],
      [0, 1, 2].map(i => gp(i, [['imp', 3], ['brute', 2], ['ice', 1], ['drummer', 1], ['thunder', 1], ['healer', 1]].concat(i === 1 ? [['bossThunder', 1]] : [])))
    ],
    boss: { type: 'bossThunder', sp: 1, x: 40, y: 336 }
  }
];

// ───────── 幾何 ─────────
function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
function mkPath(pts) {
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  return { pts, cum, len: cum[cum.length - 1] };
}
function pathPoint(P, s) {
  s = clamp(s, 0, P.len);
  for (let i = 1; i < P.pts.length; i++) {
    if (s <= P.cum[i] || i === P.pts.length - 1) {
      const seg = P.cum[i] - P.cum[i - 1] || 1;
      const t = (s - P.cum[i - 1]) / seg;
      return { x: P.pts[i - 1][0] + (P.pts[i][0] - P.pts[i - 1][0]) * t, y: P.pts[i - 1][1] + (P.pts[i][1] - P.pts[i - 1][1]) * t };
    }
  }
  return { x: P.pts[0][0], y: P.pts[0][1] };
}
function segProject(ax, ay, bx, by, x, y) {
  const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy;
  const t = l2 === 0 ? 0 : clamp(((x - ax) * dx + (y - ay) * dy) / l2, 0, 1);
  const px = ax + dx * t, py = ay + dy * t;
  return { t, x: px, y: py, d: Math.hypot(x - px, y - py) };
}
function pathProject(P, x, y) {
  let best = null;
  for (let i = 1; i < P.pts.length; i++) {
    const a = P.pts[i - 1], b = P.pts[i];
    const r = segProject(a[0], a[1], b[0], b[1], x, y);
    if (!best || r.d < best.d) best = { d: r.d, x: r.x, y: r.y, s: P.cum[i - 1] + (P.cum[i] - P.cum[i - 1]) * r.t };
  }
  return best;
}

// ───────── 狀態 ─────────
const keys = { L: false, R: false, U: false, D: false };
let zNeedRelease = false;
let RT = 0; // 真實秒數(未夾 dt, 埋點用)
let hideAt = null;
let curSrc = null; // 目前正在出手的我方單位(階段 30 判斷「步兵 / 石魔像的攻擊命中」用)

// 這次開網頁期間的狀態(重新整理才重置)
const S = {
  unlocked: [true, false, false, false], attempts: [0, 0, 0, 0], fails: [0, 0, 0, 0],
  // 第 14 輪: 這次開網頁的累計(恭喜過關畫面的統計): play = 每局(durationSec − hiddenSec)加總, attempts = level_start 次數, fails = 失敗結算局數, kills = 擊倒加總
  sess: { play: 0, attempts: 0, fails: 0, kills: 0 },
  combos: zeros(NCOMBO).map(() => false), recipes: zeros(11).map(() => false), golemUnlocked: false, pillarUnlocked: false, muted: false,
  won: [false, false, false, false], tutMode: null, pendingUnlock: -1, tutClearShown: false, tutClearSt: null,
  tut: { done: [], shownSt: [], doneSt: [], pressed: {}, fx: null, cur: 0, view: null, lastView: null },
  menuBlocks: 0, menuLockedTries: 0 // 關卡預覽頁按 Z 進不去的卡次數
};
const G = {
  screen: 'title', cursor: 0, titleT: 0, tt: { clear: null, adv: null }, sq: [], music: null, inited: false, level: 1, popup: null, steal: null, hand: null, flag: null,
  fuseSnd: 0, comboSnd: 0, paused: false, codex: false, guide: null, reveal: null, revealQ: [], banner: null, panelWave: 0, bumpAge: 0.4,
  tc: null, tapp: {}, run: {}, warn: null, resp: {}, waveAt: [], queue: [], firstKill: null, firstEnemyT: null, sawArcher: false, shopOpens: 0, qCur: 0, qBase: 0, q23seen: false, clearedW: [], strandedHit: false, vshown: {}, t30was4: false
};

// 關卡預覽頁的第 1 關教學鎖: 第 1 關勝利過、而且這次開網頁還沒在第 2 關勝利過
function tutLock1() { return !!S.won[0] && !S.won[1]; }
// 第 11 輪: 精簡教學(第 1 關拿掉階段 1~4、9)
const BRIEF_SKIP = [1, 2, 3, 4, 9];
function briefMode() { return S.tutMode === 'brief'; }
function openTutChoice() {
  G.tc = { cursor: 0, age: 0, picked: -1, pickAge: 0.35, moves: 0 };
  zNeedRelease = true; // 開視窗的那一下 Z 要先放開
  snd('guide_card');
}
function confirmTutChoice() {
  const c = G.tc;
  c.picked = c.cursor; c.pickAge = 0;
  snd('ui_confirm');
}
function applyTutChoice(cur) {
  S.tutMode = cur === 0 ? 'full' : 'brief';
  if (S.tutMode === 'brief') for (const k of BRIEF_SKIP) S.tut.done[k] = true; // 不記 shownSt / doneSt, 埋點標 skipped
}

function emptyEv() {
  return {
    matched: [], effects: [], singles: zeroSingles(), virt: [], resonating: false, ice: false, shockAttach: 0, frostAura: false, healAura: false,
    charge: false, chargeN: 0, holy: false, blinkN: 0, rooted: false, ranged: false
  };
}
function mkUnit(cat, x, y, half, slots) {
  return {
    cat, x, y, half, slots, factory: [], price: 0, cd: {}, ev: emptyEv(),
    hitAge: 0.2, attackAge: 0.15, attackKind: 'other', attackAngle: 0, moving: false, charging: false, state: 'normal',
    hp: 1, maxHp: 1, slowT: 0, auraSlow: false, healing: false, onTrail: false, home: { x, y }, m: null, awayT: 0, flagObj: null, trailObj: null,
    prevCombos: zeros(NCOMBO), comboLast: zeros(NCOMBO).map(() => -99), removed: false, chHit: new Map(), rayT: -99
  };
}
function nulls(n) { const a = []; for (let i = 0; i < n; i++) a.push(null); return a; }
function mkTower(x, y) { const u = mkUnit('tower', x, y, 24, nulls(2)); u.price = PRICE.tower; u.factory = ['ranged']; return u; }
function mkPillar(x, y) { const u = mkUnit('pillar', x, y, 18, nulls(1)); u.changeAge = 0.5; u.price = PRICE.pillar; return u; }
function mkSoldier(x, y) {
  const u = mkUnit('soldier', x, y, 16, ['melee', 'seek']);
  u.team = 'ally'; u.hp = u.maxHp = 80; u.price = PRICE.soldier; u.factory = ['melee']; return u;
}
function mkGolem(x, y, team) {
  const u = mkUnit('golem', x, y, 28, team === 'ally' ? ['seek', null, null] : nulls(3));
  u.team = team; u.hp = u.maxHp = 220; u.price = PRICE.golem;
  if (team !== 'ally') { u.wx = x; u.wy = y; u.wanderT = 0; }
  return u;
}

let LV = null; // 目前關卡資料(含 lanes)
function prepLevel(n) {
  const base = LEVELS[n - 1];
  LV = Object.assign({}, base, { n, lanes: base.paths.map(mkPath) });
}

// ───────── 工具 ─────────
function r1(v) { return Math.round(v * 10) / 10; }
function newStat() {
  return {
    gameSec: 0, slowMoSec: 0, hiddenSec: 0, leaks: 0, leaksByWave: [], leaksBySpawn: {}, kills: 0, playerKills: 0, playerHits: 0,
    goldEarned: 0, goldRefund: 0, goldSpent: 0, purchases: {}, pillarsMax: 0,
    steals: { started: 0, done: 0, diedDone: 0, canceled: 0 }, installs: { direct: 0, replace: 0 }, fuses: {}, drops: 0, groundExpired: 0,
    demolishes: 0, homeRefunds: {}, bundledBack: 0, flags: { purchase: 0, rally: 0 }, unitDowns: 0, maxRespawnQueue: 0, marchLoops: 0,
    blinks: 0, healed: 0, enemyHealed: 0, recruits: 0, combosNew: [],
    pauseSec: 0, pauses: 0, codexSec: 0, codexOpens: 0, guideSec: 0, revealSec: 0, reveals: 0, gateSec: 0, clearWaitSec: 0, tutorialBlocks: {}, tutorialSpawns: 0, tutorialGold: 0, tutorialFloor: 0, menuBlocks: 0, menuLockedTries: 0,
    stealLock: { locks: 0, lockedSec: 0, ignoredZ: 0, ignoredMove: 0, ignoredOther: 0 }
  };
}

// ───────── 聲音(防呆: sound.js 沒載入也不當) ─────────
let lastArrowRT = -9, lastZapRT = -9;
function snd(name) { if (G.sq.indexOf(name) < 0) G.sq.push(name); }
function composeComboSnd() {
  const f = G.fuseSnd, c = G.comboSnd;
  G.fuseSnd = 0; G.comboSnd = 0;
  if (!f && !c) return;
  if (f === 2 || c === 2) snd('combo_new');
  else if (f) snd('fuse');
  else snd('combo');
}
function flushSnd() {
  composeComboSnd();
  const q = G.sq; G.sq = [];
  if (S.muted || typeof Sound === 'undefined' || !Sound.play) return;
  for (const n of q) {
    if (n === 'arrow_shot') { if (RT - lastArrowRT < 0.1) continue; lastArrowRT = RT; }
    if (n === 'shock_zap') { if (RT - lastZapRT < 0.15) continue; lastZapRT = RT; }
    try { Sound.play(n); } catch (err) { console.error(err); }
  }
}
function setMusic(name) {
  G.music = name;
  if (typeof Sound === 'undefined' || !G.inited) return;
  try {
    if (S.muted) return;
    if (name) Sound.playMusic(name);
    else if (Sound.stopMusic) Sound.stopMusic();
    else Sound.playMusic(null);
  } catch (err) { console.error(err); }
}
function applyMute() {
  if (typeof Sound === 'undefined') return;
  try {
    if (Sound.setMuted) Sound.setMuted(S.muted);
    else if (S.muted) { if (Sound.stopMusic) Sound.stopMusic(); }
    else if (G.music) Sound.playMusic(G.music);
  } catch (err) { console.error(err); }
}
function muffle(on) { try { if (typeof Sound !== 'undefined' && Sound.setSlowMo) Sound.setSlowMo(on); } catch (err) { console.error(err); } }
function toggleMute() {
  S.muted = !S.muted; applyMute();
}

// ───────── 開局 / 結算 ─────────
function startLevel(n) {
  G.level = n; prepLevel(n);
  S.attempts[n - 1]++; S.sess.attempts++;
  G.ac = null;
  G.screen = 'play';
  const T = S.tut;
  G.time = 0; G.clock = 0; G.gold = LV.gold; G.castleHp = 20; G.wave = 0; G.waveStarted = 0;
  G.towers = []; G.pillars = []; G.soldiers = []; // 開局全空
  G.golems = LV.neutrals.map(g => mkGolem(g[0], g[1], 'neutral'));
  G.enemies = []; G.corpses = []; G.parts = []; G.coins = []; G.flags = [];
  G.projs = []; G.beams = []; G.areas = []; G.sparks = []; G.names = []; G.breaks = [];
  G.chains = []; G.orbs = []; G.hbeams = []; G.blinks = []; G.trails = []; G.slashes = [];
  G.frostAlly = []; G.frostEnemy = []; G.healAlly = []; G.healEnemy = [];
  G.castle = mkUnit('castle', CASTLE_POS.x, CASTLE_POS.y, 56, nulls(3));
  G.castle.slots[0] = 'shop';
  G.castle.hitAge = 0.3;
  G.player = mkUnit('player', 780, 462, 16, []);
  G.hand = null; G.flag = null; G.popup = null; G.steal = null; G.target = null;
  G.rq = []; G.rqT = 0; G.fuseSnd = 0; G.comboSnd = 0;
  G.queue = [];
  G.waveAt = LV.waves.map((w, k) => LV.t1 + k * LV.gap);
  G.tutLevel = (n === 1 && !T.done[16]) || (n === 2 && !S.won[1]);
  G.tutDriven = G.tutLevel; // 第 1、2 關教學中: 波次由教學推進
  if (G.tutDriven) { // 第 1 關階段 8 / 第 2 關階段 17 已完成: 進關 3 秒時開始預警
    G.waveAt = LV.waves.map(() => null);
    if ((n === 1 && T.done[8]) || (n === 2 && T.done[17])) G.waveAt[0] = 9;
  }
  G.cdFrom = 0; G.warned = {};
  G.banner = null; G.panelWave = 0; G.bumpAge = 0.4;
  G.paused = false; G.codex = false; G.guide = null; G.reveal = null; G.revealQ = [];
  G.tapp = {}; G.run = { placedTower: false, placedPillar: false }; G.warn = null; G.resp = {};
  G.firstKill = null; G.firstEnemyT = null; G.sawArcher = false; G.shopOpens = 0; G.qCur = 0; G.qBase = 0; G.q23seen = false;
  G.clearedW = []; G.strandedHit = false; G.vshown = {}; G.t30was4 = false; curSrc = null;
  G.w2ClearT = null; G.rec22 = false; G.waitLogged = false; G.arrow16 = null; G.arrowKey = null;
  G.bossIntro = null; G.boss = null; G.bossStat = LV.boss ? { type: LV.boss.type, spawned: false, spawnT: null, introSec: 0, result: 'none', aliveGameSec: 0, hpEndPct: null, stealBlocks: 0, killer: null, t0: 0 } : null;
  G.win = false; G.resultT = 0; G.stat = newStat();
  G.stat.leaksByWave = LV.waves.map(() => 0);
  G.stat.menuBlocks = S.menuBlocks; S.menuBlocks = 0;
  G.stat.menuLockedTries = S.menuLockedTries; S.menuLockedTries = 0;
  G.t0 = RT; // 本局開始的真實秒數(結算算遊玩時間用)
  T.fx = null; T.view = null; T.lastView = null; T.cur = 0; T.pressed = {};
  zNeedRelease = true;
  setMusic('battle');
}
function startAdvance() {
  const to = S.pendingUnlock;
  if (to >= 1 && !S.unlocked[to]) { G.tt.adv = { from: to - 1, to, age: 0, unlocked: false }; snd('level_advance'); }
  else S.pendingUnlock = -1;
}
function toTitle(failIdx) {
  G.screen = 'title'; G.titleT = 0; G.popup = null; G.steal = null;
  let c = 0; for (let i = 0; i < 4; i++) if (S.unlocked[i]) c = i;
  if (failIdx !== undefined && failIdx !== null) c = failIdx;
  if (c === 0 && tutLock1() && S.unlocked[1]) c = 1; // 第 1 關上教學鎖時游標不會落在它
  G.cursor = c;
  G.tWarn = null;
  G.tt = { clear: null, adv: null };
  if (S.won[0] && S.won[1] && !S.tutClearShown) {
    S.tutClearShown = true; S.tutClearSt = r1(RT);
    G.tt.clear = { age: 0, closing: false, closeAge: 0.3 };
    snd('tutorial_clear');
  } else startAdvance();
  muffle(false);
  setMusic('title');
  flushSnd();
}
function endLevel(win) {
  const hp = Math.max(0, G.castleHp);
  const allClear = win && G.level === 4; // 第 14 輪: 第 4 關勝利出「恭喜過關」
  G.screen = 'result'; G.win = win; G.resultT = 0; G.resultCursor = 0;
  G.ac = allClear ? { age: 0, sec: 0, skipped: false, skipAt: null, cursor: 0, landed: false, pinned: false, cleared: false, ticks: 0, glints: 0, stats: null } : null;
  // 第 1 關勝利、而這次開網頁還沒在第 2 關勝利過: 只有 [繼續](「重玩」會繞過關卡預覽頁的第 1 關教學鎖)
  G.options = win ? ((G.level === 1 && !S.won[1]) ? ['繼續'] : ['繼續', '重玩']) : ['重來', '關卡預覽'];
  G.popup = null; G.steal = null; G.guide = null; G.reveal = null; G.revealQ = []; G.paused = false; G.codex = false; muffle(false);
  const bi = G.bossIntro; G.bossIntro = null; // 同一幀剛開始演出就結算: 演出不留到結算畫面
  G.sq = G.sq.filter(n => n !== 'castle_hit');
  if (win) {
    S.won[G.level - 1] = true;
    if (G.level < 4 && !S.unlocked[G.level]) S.pendingUnlock = G.level; // 解鎖與推進動畫延到回關卡預覽頁才播
  } else S.fails[G.level - 1]++;
  const T = S.tut; T.fx = null; T.view = null; T.lastView = null;
  const st = G.stat;
  const durSec = r1(RT - G.t0), hidSec = r1(st.hiddenSec);
  S.sess.play += durSec - hidSec; if (!win) S.sess.fails++; S.sess.kills += st.kills;
  const sess = { playSec: Math.round(S.sess.play), attempts: S.sess.attempts, fails: S.sess.fails, kills: S.sess.kills };
  if (G.ac) G.ac.stats = { playSec: sess.playSec, attempts: sess.attempts, fails: sess.fails, kills: sess.kills, comboCount: S.combos.filter(Boolean).length, castleHp: hp, castleMaxHp: 20 };
  if (window.PVDX && win) { // 通知網站: 單關通關, 最後一關再送全局通關(失敗不送)
    PVDX.levelClear(G.level);
    if (G.level === 4) PVDX.gameClear();
  }
  setMusic(null);
  if (allClear) snd('medal_spin'); // 第 4 關勝利不播 level_win, 由 all_clear 當凱旋
  else snd(win ? 'level_win' : 'level_lose');
}

// ───────── 單位分類 ─────────
function unitKind(u) {
  if (u.cat === 'golem') return u.team === 'neutral' ? 'neutral' : 'golem';
  return KIND_OF[u.cat];
}
function hasItem(u) { return u.slots.some(s => !!s); }
function isMobileAlly(t) { return t.cat === 'soldier' || (t.cat === 'golem' && t.team === 'ally'); }
function allyMobile() { return G.soldiers.concat(G.golems.filter(g => g.team === 'ally')); }
function allyAlive() { return allyMobile().filter(u => u.state === 'normal' && !u.removed); }
function liveEnemies() { return G.enemies.filter(e => !e.dead && !e.gone); }
function canFuseUnit(u) { return u.cat === 'tower' || u.cat === 'pillar' || u.cat === 'castle' || u.cat === 'soldier' || (u.cat === 'golem' && u.team === 'ally'); }
function ownUnits() { // 我方建築 + 移動單位(含各種狀態) + 主堡
  return G.towers.concat(G.pillars, G.soldiers, G.golems.filter(g => g.team === 'ally'), [G.castle]);
}

// ───────── 合成 / 組合評估 ─────────
function findFuse(slots) {
  for (let ci = 0; ci < NCOMBO; ci++) {
    for (const r of RECIPES[ci]) {
      const a = r[0], b = r[1];
      for (let i = 0; i < slots.length; i++) for (let j = i + 1; j < slots.length; j++) {
        const x = slots[i], y = slots[j];
        if ((x === a && y === b) || (x === b && y === a)) return { ci, i, j, mats: [x, y] };
      }
    }
  }
  return null;
}
function pairFuses(a, b) { return RECIPES.some(alts => alts.some(r => (r[0] === a && r[1] === b) || (r[0] === b && r[1] === a))); }
function tryFuse(u) {
  const out = [];
  if (!canFuseUnit(u)) return out;
  for (let guard = 0; guard < 6; guard++) {
    const f = findFuse(u.slots);
    if (!f) break;
    u.slots[f.i] = COMBO_KIND[f.ci]; u.slots[f.j] = null;
    out.push(f);
  }
  return out;
}
function wouldFuseAfterSwap(u, idx, item) {
  const s = u.slots.slice(); s[idx] = item;
  return !!findFuse(s);
}
// plain: 這次是配方第一次真的合成(由演出慶祝), 頭上照一般跳名稱、不加「新組合!」也不另播音效
function popName(u, ci, plain) {
  const isNew = !S.combos[ci];
  if (!isNew && G.time - u.comboLast[ci] < 4) return 0;
  u.comboLast[ci] = G.time;
  if (isNew) { S.combos[ci] = true; G.stat.combosNew.push(COMBO_NAME[ci]); }
  G.names.push({ unit: u, name: COMBO_NAME[ci], isNew: isNew && !plain, age: 0 });
  return plain ? 0 : (isNew ? 2 : 1);
}
function recipeIndexOf(f) { // 這次合成用的是 RECIPE_FLAT 的哪一條
  for (let i = 0; i < RECIPE_FLAT.length; i++) {
    const r = RECIPE_FLAT[i];
    if (r[2] === f.ci && ((r[0] === f.mats[0] && r[1] === f.mats[1]) || (r[0] === f.mats[1] && r[1] === f.mats[0]))) return i;
  }
  return -1;
}
// 槽位改變後: 魂柱波紋、檢查合成
function afterSlotsChange(t) {
  if (t.cat === 'pillar') t.changeAge = 0;
  const fs = tryFuse(t);
  for (const f of fs) {
    const nm = COMBO_NAME[f.ci];
    G.stat.fuses[nm] = (G.stat.fuses[nm] || 0) + 1;
    const ri = recipeIndexOf(f);
    if (ri >= 0 && !S.recipes[ri]) { // 某條配方這次開網頁第一次真的合成: 排進演出, 不播 fuse / combo_new / combo
      S.recipes[ri] = true;
      const rc = RECIPE_FLAT[ri], d = DESC[COMBO_KIND[f.ci]];
      G.revealQ.push({ a: rc[0], b: rc[1], result: COMBO_KIND[f.ci], name: d[0], text: d[1], aName: DESC[rc[0]][0], bName: DESC[rc[1]][0] });
      popName(t, f.ci, true);
    } else {
      const r = popName(t, f.ci);
      G.fuseSnd = Math.max(G.fuseSnd, r === 2 ? 2 : 1);
    }
  }
  return fs.length;
}

// 配組池: 實體魂件 + 共鳴來的虛魂件(規則 15)
function evalUnit(u, virt, canMove, noAttack) {
  const real = [], realCombo = [];
  for (const k of u.slots) {
    if (!k) continue;
    if (BASIC[k]) real.push({ kind: k, used: false, v: false });
    else if (COMBO_IDX[k] !== undefined) realCombo.push(COMBO_IDX[k]);
  }
  const vb = [], vcombo = [];
  for (const v of virt) {
    v.used = true;
    if (BASIC[v.kind]) vb.push({ kind: v.kind, used: false, v: true });
    else if (COMBO_IDX[v.kind] !== undefined) vcombo.push(COMBO_IDX[v.kind]);
  }
  function take(kind) { // 先用虛的、再用實體的
    for (const o of vb) if (!o.used && o.kind === kind) { o.used = true; return o; }
    for (const o of real) if (!o.used && o.kind === kind) { o.used = true; return o; }
    return null;
  }
  const matched = [];
  for (let ci = 0; ci < 9; ci++) { // 不動如山(9)只由實體合成
    if (!canMove && (ci === 6 || ci === 8)) continue;
    for (const r of RECIPES[ci]) {
      for (let g = 0; g < 8; g++) {
        const x = take(r[0]);
        if (!x) break;
        const y = take(r[1]);
        if (!y) { x.used = false; break; }
        if (!x.v && !y.v) { x.used = false; y.used = false; break; }
        matched.push(ci);
      }
    }
  }
  const singles = zeroSingles();
  for (const o of real) if (!o.used) singles[o.kind]++;
  for (const o of vb) if (!o.used) singles[o.kind]++;
  let groups = realCombo.concat(vcombo, matched);
  if (!canMove) groups = groups.filter(c => c !== 6 && c !== 8);
  const cnt = ci => { let n = 0; for (const c of groups) if (c === ci) n++; return n; };
  const effects = [], seen = zeros(NCOMBO);
  if (!noAttack) {
    for (const ci of groups) {
      if (ci <= 5 || ci === 7) { seen[ci]++; effects.push({ key: 'c' + ci + '_' + seen[ci], t: COMBO_KIND[ci] }); }
    }
    if (singles.ranged) effects.push({ key: 's_ranged', t: 'ranged', n: singles.ranged });
    if (singles.melee) effects.push({ key: 's_melee', t: 'melee', n: singles.melee });
  }
  const holyN = cnt(8), blinkN = cnt(6);
  const chargeN = canMove ? singles.charge + holyN : 0;
  const otherAtk = effects.some(e => e.t !== 'healRay') || chargeN > 0 || blinkN > 0;
  let shockAttach = 0, lone = false;
  if (!noAttack && singles.shock > 0) {
    if (otherAtk) shockAttach = singles.shock;
    else { effects.push({ key: 's_shock', t: 'shock', n: singles.shock }); lone = true; }
  }
  const anyAtk = otherAtk || lone;
  u.ev = {
    matched, effects, singles, virt, resonating: !noAttack && virt.length > 0,
    ice: !noAttack && singles.frost > 0 && anyAtk, shockAttach,
    frostAura: !noAttack && singles.frost > 0 && !anyAtk, healAura: !noAttack && singles.heal > 0,
    charge: chargeN > 0, chargeN, holy: holyN > 0, blinkN, rooted: cnt(9) > 0,
    ranged: !noAttack && (singles.ranged > 0 || cnt(0) > 0 || cnt(1) > 0 || cnt(5) > 0)
  };
}
function evalEnemy(e) {
  const singles = zeroSingles();
  for (const k of e.slots) if (k && BASIC[k]) singles[k]++;
  const effects = [];
  if (singles.ranged) effects.push({ key: 's_ranged', t: 'ranged', n: singles.ranged });
  if (singles.melee) effects.push({ key: 's_melee', t: 'melee', n: singles.melee });
  if (singles.shock && !singles.ranged && !singles.melee) effects.push({ key: 's_shock', t: 'shock', n: singles.shock });
  e.ev = Object.assign(emptyEv(), { effects, singles, frostAura: singles.frost > 0, healAura: singles.heal > 0, ranged: singles.ranged > 0 });
}
function activeTowers() { return G.towers.filter(t => t.state === 'normal' && !t.removed); }
function receivers() { return activeTowers().concat(allyAlive(), [G.castle], [G.player]); }
function pillarVirt(r) {
  const ps = G.pillars.filter(p => p.state === 'normal' && !p.removed && dist(p, r) <= 150).map(p => ({ p, d: dist(p, r) })).sort((a, b) => a.d - b.d);
  const virt = [];
  for (const o of ps) { const k = o.p.slots[0]; if (k && RESONANT[k]) virt.push({ kind: k, used: true, pillar: o.p }); }
  return virt;
}
function computeEvals() {
  for (const r of receivers()) evalUnit(r, pillarVirt(r), r.cat !== 'castle' && r.cat !== 'player', false);
  for (const p of G.pillars) evalUnit(p, [], p.state === 'normal', true);
  for (const u of allyMobile()) if (u.state !== 'normal') { u.ev = emptyEv(); u.prevCombos = zeros(NCOMBO); }
  for (const t of G.towers) if (t.state !== 'normal') t.ev = emptyEv();
  for (const g of G.golems) if (g.team === 'neutral') g.ev = emptyEv();
  G.enemies.forEach(evalEnemy);
}

// ───────── 戰鬥輔助 ─────────
function nearest(u, list, test) {
  let best = null, bd = 1e9;
  for (const t of list) {
    const d = dist(u, t);
    if (d < bd && (!test || test(t, d))) { bd = d; best = t; }
  }
  return best;
}
function stolenBy(u) { return G.steal && G.steal.enemy === u; }
function speedMult(u) { return (1 - Math.max(u.auraSlow ? 0.3 : 0, u.slowT > 0 ? 0.5 : 0, stolenBy(u) ? 0.6 : 0)) * (u.onTrail ? 1.5 : 1); }
function unitDown(t) {
  t.state = 'gone'; t.m = null; t.moving = false; t.charging = false; t.healing = false; t.downAt = G.time; t.chHit = new Map();
  G.breaks.push({ kind: t.cat === 'soldier' ? 'soldier' : 'golem', x: t.x, y: t.y, age: 0 });
  G.rq.push(t);
  if (G.rq.length === 1) G.rqT = 0;
  G.stat.unitDowns++; G.stat.maxRespawnQueue = Math.max(G.stat.maxRespawnQueue, G.rq.length);
  snd('unit_down');
}
// o: { src: 'player' | 'unit' | 'enemy', frost: bool }
function hurt(t, amt, o) {
  if (t.dead || t.state === 'gone' || t.removed) return;
  const src = o && o.src;
  if (t.cat !== 'enemy' && t.ev && t.ev.rooted) amt = Math.max(1, Math.round(amt * 0.5)); // 不動如山: 受傷減半
  t.hp -= amt; t.hitAge = 0;
  if (t.cat === 'soldier' && t.hp < 1 && tutLvl1()) { t.hp = 1; G.stat.tutorialFloor++; } // 第 1 關教學中步兵生命最低停在 1
  if (o && o.slash) { // 近戰類單體命中: 醒目的斬擊(取代命中火花)
    const sk = o.slash, enemySide = o.side === 'enemy';
    G.slashes.push({
      kind: sk, x: t.x, y: t.y, angle: o.ang || 0, team: enemySide ? 'enemy' : 'ally',
      frost: !enemySide && sk === 'melee' && !!o.frost, shock: !enemySide && sk === 'melee' && (o.shock || 0) > 0, age: 0
    });
  } else G.sparks.push({ x: t.x, y: t.y, frost: !!(o && o.frost), age: 0 });
  if (t.cat === 'enemy' && src === 'player') G.stat.playerHits++;
  if (t.cat === 'enemy' && curSrc && isMobileAlly(curSrc) && t.slots.indexOf('march') < 0) G.strandedHit = true; // 階段 30: 步兵 / 石魔像打中呆站的敵人
  if (t.hp <= 0) {
    t.hp = 0;
    if (t.cat === 'enemy') {
      t.dead = true; G.stat.kills++; snd(t.boss ? 'boss_die' : 'enemy_die');
      if (t.boss) bossEnd(t, 'killed', src === 'player' ? 'player' : 'unit');
      if (!G.firstKill && tutLvl1() && !S.tut.done[9]) G.firstKill = { x: t.x, y: t.y, t: G.time }; // 階段 9「掉金幣」引導卡的觸發點
      if (src === 'player') { G.stat.playerKills++; }
      if (G.steal && G.steal.enemy === t) completeSteal('died'); // 讀條中敵人倒下: 搶奪當場完成
    } else unitDown(t);
  }
}
function slowIt(t) { t.slowT = 2; }
function stun(e, dur) { // 暈眩取剩餘較長者
  if (e.dead) return;
  const rem = e.stunDur - e.stunAge;
  if (rem < dur) { e.stunDur = dur; e.stunAge = 0; }
}
function knockBack(e, from) {
  const P = LV.lanes[e.lane];
  const pr = pathProject(P, e.x, e.y);
  let ang;
  if (pr.d <= 4) {
    const s1 = Math.max(0, pr.s - 60), q = pathPoint(P, s1);
    e.kb = { mode: 'path', s0: pr.s, s1, t: 0 };
    ang = (Math.abs(q.x - e.x) + Math.abs(q.y - e.y) < 0.01) ? Math.atan2(e.y - from.y, e.x - from.x) : Math.atan2(q.y - e.y, q.x - e.x);
  } else {
    let dx = e.x - from.x, dy = e.y - from.y, d = Math.hypot(dx, dy);
    if (d < 1) { const a = Math.random() * Math.PI * 2; dx = Math.cos(a); dy = Math.sin(a); d = 1; }
    e.kb = { mode: 'line', x0: e.x, y0: e.y, x1: clamp(e.x + dx / d * 60, 0, W), y1: clamp(e.y + dy / d * 60, 48, H), t: 0 };
    ang = Math.atan2(dy, dx);
  }
  return ang;
}
function contact(u, t) { return dist(u, t) <= u.half + t.half + 12; }
function spawnProj(u, t, kind, dmg, owner, src, shock) {
  G.projs.push({ x: u.x, y: u.y, angle: Math.atan2(t.y - u.y, t.x - u.x), kind, owner, dmg, target: t, travel: 0, src, shock: shock || 0, from: owner === 'ally' ? curSrc : null });
}
// 電擊連鎖: 被打的目標身邊 80 內最近的其他目標(最多 2n 隻, 上限 6), 各吃該次傷害的 50%; 連鎖不再連鎖、不帶冰
function chainFrom(t, dmg, n, o, firstFrom, silent) {
  const pool = (o.side === 'ally' ? liveEnemies() : allyAlive()).filter(h => h !== t && !h.dead && Math.hypot(h.x - t.x, h.y - t.y) <= 80);
  pool.sort((a, b) => Math.hypot(a.x - t.x, a.y - t.y) - Math.hypot(b.x - t.x, b.y - t.y));
  const hit = pool.slice(0, Math.min(2 * n, 6));
  const segs = firstFrom ? [[firstFrom.x, firstFrom.y, t.x, t.y]] : [];
  for (const h of hit) {
    hurt(h, Math.max(1, Math.round(dmg * 0.5)), { src: o.src, frost: false });
    segs.push([t.x, t.y, h.x, h.y]);
  }
  if (segs.length) G.chains.push({ segs: segs.slice(0, 8), owner: o.side, age: 0 });
  if (hit.length && !silent) snd('shock_zap');
  return hit.length;
}
function dealHit(t, dmg, ho, silent) {
  hurt(t, dmg, ho);
  if (ho.frost) slowIt(t);
  if (ho.shock > 0) chainFrom(t, dmg, ho.shock, ho, null, silent);
}
function pickHealTarget(u) {
  let best = null, br = 2;
  for (const a of allyAlive()) {
    if (a.hp >= a.maxHp || dist(u, a) > 260) continue;
    if (G.time - a.rayT < 1.0) continue;
    const r = a.hp / a.maxHp;
    if (r < br) { br = r; best = a; }
  }
  return best;
}
function addHeal(t, amt, enemySide) {
  const real = Math.min(amt, t.maxHp - t.hp);
  if (real <= 0) return 0;
  t.hp += real; t.healing = true;
  if (enemySide) G.stat.enemyHealed += real; else G.stat.healed += real;
  return real;
}
function runAttacks(u, side, gdt, src) {
  const hostiles = side === 'ally' ? liveEnemies() : allyAlive();
  const E = u.ev, ice = E.ice;
  const ho = { src, frost: ice, shock: E.shockAttach, side };
  let standing = false;
  for (const ef of E.effects) {
    let tgt = null, period = 1;
    switch (ef.t) {
      case 'ranged': case 'iceArrow': tgt = nearest(u, hostiles, (t, d) => d <= 200); period = 1; break;
      case 'melee': case 'frostSmash': case 'thunderSlash': tgt = nearest(u, hostiles, t => contact(u, t)); period = 0.8; break;
      case 'pierce': tgt = nearest(u, hostiles, (t, d) => d <= 260); period = 1; break;
      case 'whirl': tgt = nearest(u, hostiles, (t, d) => d <= 60); period = 0.8; break;
      case 'thunderOrb': tgt = nearest(u, hostiles, (t, d) => d <= 220); period = 2; break;
      case 'shock': tgt = nearest(u, hostiles, (t, d) => d <= 100); period = 1; break;
      case 'healRay': tgt = pickHealTarget(u); period = 1; break;
    }
    if (!tgt) continue;
    if (ef.t !== 'healRay') standing = true;
    if ((u.cd[ef.key] || 0) > 0) continue;
    u.cd[ef.key] = period;
    u.attackAge = 0;
    const isMelee = ef.t === 'melee' || ef.t === 'frostSmash' || ef.t === 'thunderSlash';
    const aim = Math.atan2(tgt.y - u.y, tgt.x - u.x);
    u.attackKind = isMelee ? 'melee' : 'other'; u.attackAngle = isMelee ? aim : 0; // 近戰類出手: 朝目標撲過去
    const hoM = isMelee ? Object.assign({}, ho, { slash: ef.t, ang: aim }) : ho;
    switch (ef.t) {
      case 'ranged': spawnProj(u, tgt, ice ? 'ice' : 'normal', 10 * ef.n, side, src, E.shockAttach); snd(side === 'ally' ? 'arrow_shot' : 'enemy_shot'); break;
      case 'melee': dealHit(tgt, (u.swift ? 1 : 14) * ef.n, hoM); if (side === 'ally') snd('melee_hit'); break; // 輕快小鬼打人只有 1
      case 'iceArrow': spawnProj(u, tgt, 'ice', 10, side, src, E.shockAttach); snd('arrow_shot'); break;
      case 'pierce': {
        const ang = Math.atan2(tgt.y - u.y, tgt.x - u.x);
        const x2 = u.x + Math.cos(ang) * 260, y2 = u.y + Math.sin(ang) * 260;
        G.beams.push({ x1: u.x, y1: u.y, x2, y2, frost: ice, age: 0 });
        for (const h of hostiles) if (!h.dead && segProject(u.x, u.y, x2, y2, h.x, h.y).d <= 14) dealHit(h, 14, ho);
        snd('pierce_shot');
        break;
      }
      case 'whirl':
        G.areas.push({ kind: 'whirl', x: u.x, y: u.y, radius: 60, angle: 0, frost: ice, age: 0 });
        for (const h of hostiles) if (!h.dead && dist(u, h) <= 60) dealHit(h, 16, ho);
        snd('whirl');
        break;
      case 'frostSmash':
        G.areas.push({ kind: 'frostSmash', x: tgt.x, y: tgt.y, radius: 60, angle: 0, frost: false, age: 0 });
        hurt(tgt, 16, { src, frost: true, slash: 'frostSmash', ang: aim, side });
        if (E.shockAttach > 0) chainFrom(tgt, 16, E.shockAttach, ho, null, false);
        for (const h of hostiles) if (h === tgt || dist(h, tgt) <= 60) slowIt(h);
        snd('melee_hit');
        break;
      case 'thunderSlash':
        hurt(tgt, 22, { src, frost: ice, slash: 'thunderSlash', ang: aim, side });
        if (ice) slowIt(tgt);
        stun(tgt, 0.5);
        chainFrom(tgt, 22, 1, { src, side }, null, true);
        snd('thunder_slash');
        break;
      case 'thunderOrb': {
        const a = Math.atan2(tgt.y - u.y, tgt.x - u.x);
        G.orbs.push({ x: u.x, y: u.y, dx: Math.cos(a), dy: Math.sin(a), travel: 0, pulseT: 0, pulseAge: 0.15, src, from: side === 'ally' ? curSrc : null });
        snd('thunder_orb');
        break;
      }
      case 'shock': {
        const dmg = 8 * ef.n;
        hurt(tgt, dmg, { src, frost: ice });
        if (ice) slowIt(tgt);
        chainFrom(tgt, dmg, ef.n, { src, side }, u, true);
        snd('shock_zap');
        break;
      }
      case 'healRay': {
        tgt.rayT = G.time;
        addHeal(tgt, 15, false);
        G.hbeams.push({ x1: u.x, y1: u.y, x2: tgt.x, y2: tgt.y, age: 0 });
        snd('heal_ray');
        break;
      }
    }
  }
  return standing;
}
// 衝鋒衝撞: 每隻進入碰觸距離的敵人(同一隻 1 秒內只撞一次)受傷、被撞退 60、暈眩 1 秒
function chargeHits(u) {
  if (u.removed || u.state !== 'normal' || !u.ev.charge) return;
  const ho = { src: 'unit', frost: u.ev.ice, shock: u.ev.shockAttach, side: 'ally' };
  for (const h of liveEnemies()) {
    if (!contact(u, h)) continue;
    const last = u.chHit.get(h);
    if (last !== undefined && G.time - last < 1.0) continue;
    u.chHit.set(h, G.time);
    u.attackAge = 0;
    dealHit(h, 30 * u.ev.chargeN, ho);
    if (h.dead) { G.areas.push({ kind: 'charge', x: h.x, y: h.y, radius: 30, angle: Math.atan2(h.y - u.y, h.x - u.x), frost: ho.frost, age: 0 }); snd('charge_hit'); continue; }
    const ang = knockBack(h, u);
    stun(h, 1.0);
    G.areas.push({ kind: 'charge', x: h.x, y: h.y, radius: 30, angle: ang, frost: ho.frost, age: 0 });
    snd('charge_hit');
  }
}
// 瞬閃: 位置瞬間換掉, 落地放電(回集結點時不放電)
function doBlink(u, nx, ny, landing) {
  const x1 = u.x, y1 = u.y;
  u.x = nx; u.y = ny;
  u.cd.blink = 3.0; u.attackAge = 0;
  G.blinks.push({ x1, y1, x2: nx, y2: ny, age: 0 });
  G.stat.blinks++; snd('blink');
  if (landing) {
    G.areas.push({ kind: 'shockBurst', x: nx, y: ny, radius: 60, angle: 0, frost: u.ev.ice, age: 0 });
    for (const h of liveEnemies()) if (Math.hypot(h.x - nx, h.y - ny) <= 60) { hurt(h, 10, { src: 'unit', frost: u.ev.ice }); if (u.ev.ice) slowIt(h); }
    snd('shock_zap');
  }
}
function blinkLogic(u) {
  if ((u.cd.blink || 0) > 0) return;
  const near = liveEnemies().filter(e => Math.hypot(e.x - u.home.x, e.y - u.home.y) <= 220);
  if (near.length) {
    const tgt = nearest(u, near);
    const range = u.ev.ranged ? 180 : u.half + tgt.half + 12;
    if (dist(u, tgt) <= range) return;
    const gap = u.half + tgt.half + 6;
    let dx = u.x - tgt.x, dy = u.y - tgt.y, d = Math.hypot(dx, dy);
    if (d < 1) { dx = 1; dy = 0; d = 1; }
    doBlink(u, tgt.x + dx / d * gap, tgt.y + dy / d * gap, true);
  } else if (Math.hypot(u.x - u.home.x, u.y - u.home.y) > 1) {
    doBlink(u, u.home.x, u.home.y, false);
  }
}

// ───────── 移動 ─────────
function moveToward(u, tx, ty, spd, dt) {
  const dx = tx - u.x, dy = ty - u.y, d = Math.hypot(dx, dy);
  if (d < 0.001) return true;
  const st = spd * dt;
  u.moving = true;
  if (d <= st) { u.x = tx; u.y = ty; return true; }
  u.x += dx / d * st; u.y += dy / d * st;
  return false;
}
function routeDist(x, y) {
  let m = 1e9;
  for (const P of LV.lanes) m = Math.min(m, pathProject(P, x, y).d);
  return m;
}
function targetLane(u) { // 離集結點最近的路線(一樣近取列在前面的)
  let bi = 0, bd = 1e9;
  LV.lanes.forEach((P, i) => { const d = pathProject(P, u.home.x, u.home.y).d; if (d < bd - 1e-6) { bd = d; bi = i; } });
  return bi;
}
// 衝鋒 / 神聖之路: 走到目標路線 → 逆向走到出怪點 → 走出畫面 → 消失 1 秒 → 從主堡門出來繼續
function routeMarch(u, spd, dt) {
  let m = u.m;
  if (!m) m = u.m = { phase: 'to', lane: targetLane(u), s: 0 };
  const P = LV.lanes[m.lane];
  if (m.phase === 'to') {
    const pr = pathProject(P, u.x, u.y);
    if (pr.d > 1.5) { moveToward(u, pr.x, pr.y, spd, dt); return; }
    m.s = pr.s; m.phase = 'rev';
  }
  if (m.phase === 'rev') {
    m.s = Math.max(0, m.s - spd * dt);
    const q = pathPoint(P, m.s);
    u.x = q.x; u.y = q.y; u.moving = true;
    if (m.s <= 0) {
      const a = P.pts[0], b = P.pts[1], d = Math.hypot(a[0] - b[0], a[1] - b[1]) || 1;
      m.phase = 'out'; m.out = u.half + 8; m.dx = (a[0] - b[0]) / d; m.dy = (a[1] - b[1]) / d;
    }
    return;
  }
  if (m.phase === 'out') {
    const mv = Math.min(spd * dt, m.out);
    u.x += m.dx * mv; u.y += m.dy * mv; m.out -= mv; u.moving = true;
    if (m.out <= 0.0001) {
      u.state = 'away'; u.awayT = 1.0; u.moving = false; u.charging = false;
      G.stat.marchLoops++;
      u.m = { phase: 'door', lane: m.lane, s: 0 };
    }
  }
}
function returnHome(u, spd, dt) {
  if (Math.hypot(u.x - u.home.x, u.y - u.home.y) > 0.5) moveToward(u, u.home.x, u.home.y, spd, dt);
}
// 退款(規則 26): 依出廠清單收回身上還在的出廠基本魂件, 退款 = ⌊基準 × 收回 / 出廠⌋; 沒有出廠魂件則全額基準
function settleRefund(u, base, apply) {
  const fac = u.factory || [];
  const slots = u.slots.slice();
  let back = 0;
  for (const f of fac) { const i = slots.indexOf(f); if (i >= 0) { slots[i] = null; back++; } }
  const refund = fac.length ? Math.floor(base * back / fac.length) : base;
  if (apply) for (let i = 0; i < slots.length; i++) u.slots[i] = slots[i];
  return { refund, back, rest: slots.filter(Boolean) };
}
function homeRefund(u) {
  const r = settleRefund(u, u.price, true);
  G.gold += r.refund; G.stat.goldRefund += r.refund; G.stat.bundledBack += r.back;
  r.rest.forEach((it, k) => G.parts.push(mkPart(it, 772 + 32 * k, 482, 0)));
  u.removed = true; u.moving = false; u.charging = false;
  if (u.flagObj) { const i = G.flags.indexOf(u.flagObj); if (i >= 0) G.flags.splice(i, 1); u.flagObj = null; }
  const kind = unitKind(u);
  G.stat.homeRefunds[kind] = (G.stat.homeRefunds[kind] || 0) + 1;
  snd('home_refund');
}
function allyBehavior(u, dt, standing) {
  u.moving = false; u.charging = false;
  if (u.cat === 'castle') return;
  const E = u.ev, mult = speedMult(u), s = E.singles;
  if (E.rooted) { u.m = null; return; } // 不動如山: 完全不移動
  if (!E.charge) u.m = null;
  if (E.charge) { routeMarch(u, 90 * mult, dt); u.charging = u.moving; return; }
  if (standing) return;
  if (E.blinkN > 0) { blinkLogic(u); return; }
  if (s.seek > 0) {
    const tgt = nearest(u, liveEnemies(), t => Math.hypot(t.x - u.home.x, t.y - u.home.y) <= 200);
    if (tgt) {
      const stop = E.ranged ? 180 : u.half + tgt.half + 6;
      if (dist(u, tgt) > stop) moveToward(u, tgt.x, tgt.y, Math.min(70 * s.seek, 140) * mult, dt);
      return;
    }
    if (!(s.march > 0)) { returnHome(u, 80 * mult, dt); return; }
  }
  if (s.march > 0) {
    const spd = (u.cat === 'tower' || u.cat === 'pillar') ? 40 : 60;
    moveToward(u, CASTLE_POS.x, CASTLE_POS.y, spd * mult, dt);
    if (dist(u, CASTLE_POS) <= 66) homeRefund(u); // 進入主堡半徑 + 10: 消失並退款
    return;
  }
  returnHome(u, 80 * mult, dt);
}
function enemyBehavior(e, dt, standing) {
  e.moving = false;
  if (standing) return;
  const s = e.ev.singles, mult = speedMult(e);
  if (s.seek > 0) {
    const tgt = nearest(e, allyAlive(), (t, d) => d <= 160);
    if (tgt) {
      const stop = e.ev.ranged ? 180 : e.half + tgt.half + 6;
      if (dist(e, tgt) > stop) {
        moveToward(e, tgt.x, tgt.y, Math.min(70 * s.seek, 140) * mult, dt);
        e.s = pathProject(LV.lanes[e.lane], e.x, e.y).s;
      }
      return;
    }
  }
  if (s.march > 0) {
    const P = LV.lanes[e.lane];
    const p = pathPoint(P, e.s);
    if (Math.hypot(p.x - e.x, p.y - e.y) > 1) moveToward(e, p.x, p.y, e.speed * mult, dt);
    else {
      e.s += e.speed * mult * dt;
      const q = pathPoint(P, e.s);
      e.x = q.x; e.y = q.y; e.moving = true;
    }
  }
}

// ───────── 敵人 / 倒下消散 / 金幣 ─────────
function spawnEnemy(q) {
  const swift = q.type === 'swift'; // 疾行怪: 小魔怪的變體(生命 40、速度 75、打人 1), 只在第 1 關第 2 波
  const type = swift ? 'imp' : q.type;
  const d = ENEMY_DEF[type];
  const e = mkUnit('enemy', 0, 0, d.half, d.items.slice());
  e.type = type; e.swift = swift; e.lane = q.sp; e.s = 0; e.speed = swift ? 75 : d.speed; e.wave = q.wave;
  e.hp = e.maxHp = d.boss ? d.hp : (swift ? 40 : Math.round(d.hp * LV.mul)); // Boss 生命是最終值, 不乘關卡倍率
  if (type === 'archer' && tutLvl1()) e.hp = e.maxHp = e.maxHp * 2; // 第 1 關教學中的魔箭怪生命 ×2, 讓玩家來得及走過去搶
  e.spawnT = G.time;
  if (G.firstEnemyT === null) G.firstEnemyT = G.time;
  if (type === 'archer') G.sawArcher = true;
  e.stunAge = 1.0; e.stunDur = 1.0; e.kb = null;
  const p = d.boss ? { x: LV.boss.x, y: LV.boss.y } : pathPoint(LV.lanes[q.sp], 0); // Boss 從路線上的出場位置出現
  e.x = p.x; e.y = p.y; e.dead = false; e.gone = false;
  if (d.boss) { e.boss = true; e.s = pathProject(LV.lanes[q.sp], p.x, p.y).s; }
  G.enemies.push(e);
  return e;
}
// ───────── Boss: 出場演出 / 血條 / 結束記錄 ─────────
function startBossIntro(q) {
  const b = LV.boss, bs = G.bossStat;
  G.bossIntro = { q, type: b.type, age: 0, t0: RT, music: false };
  bs.spawned = true;
  snd(BOSS_INTRO.sfx[b.type]);
  setMusic(null); // battle 淡出; 演出 2.0 秒起換 boss
}
function updateBossIntro(dt) {
  const bi = G.bossIntro;
  bi.age = Math.min(BOSS_INTRO.sec, bi.age + dt);
  if (!bi.music && bi.age >= 2.0) { bi.music = true; setMusic('boss'); }
  if (bi.age < BOSS_INTRO.sec) return;
  const bs = G.bossStat, b = LV.boss, d = ENEMY_DEF[b.type];
  bs.introSec = RT - bi.t0;
  G.bossIntro = null;
  const e = spawnEnemy(bi.q);
  bs.t0 = G.stat.gameSec;
  G.boss = { e, type: b.type, name: d.name, showAge: 0, hiding: false, hideAge: 0, gone: false };
}
function bossEnd(e, how, killer) {
  const bs = G.bossStat, b = G.boss;
  if (!bs || bs.result !== 'none') return;
  bs.result = how; bs.aliveGameSec = G.stat.gameSec - bs.t0;
  bs.hpEndPct = how === 'killed' ? 0 : e.hp / e.maxHp;
  bs.killer = killer;
  if (b) { b.hiding = true; b.hideAge = 0; }
}
function bossBarTick(gdt) {
  const b = G.boss;
  if (!b || b.gone) return;
  if (b.showAge < 0.4) b.showAge = Math.min(0.4, b.showAge + gdt);
  if (b.hiding) { b.hideAge = Math.min(0.6, b.hideAge + gdt); if (b.hideAge >= 0.6) b.gone = true; }
}
function cleanupEnemies() {
  G.enemies = G.enemies.filter(e => {
    if (e.gone) { e.removed = true; return false; }
    if (e.dead) {
      e.removed = true;
      const d = ENEMY_DEF[e.type];
      const cl = d.boss ? 1.2 : 0.6; // Boss 消散 1.2 秒、金幣散在 60 半徑內
      G.corpses.push({ kind: e.type, x: e.x, y: e.y, life: cl, maxLife: cl }); // 只是倒下消散特效, 不可互動
      for (let i = 0; i < d.coins; i++) {
        const a = Math.random() * Math.PI * 2, r = Math.random() * (d.boss ? 60 : 40);
        const tx = clamp(e.x + Math.cos(a) * r, 8, W - 8), ty = clamp(e.y + Math.sin(a) * r, 56, H - 8);
        G.coins.push({ x: e.x, y: e.y, x0: e.x, y0: e.y, tx, ty, spawnAge: 0 }); // 彈出 0.4 秒後落定
      }
      return false;
    }
    return true;
  });
}
function mkPart(item, x, y, spawnAge) {
  return { cat: 'part', item, x, y, half: 14, spawnAge, life: 10, permanent: item === 'shop', removed: false };
}

// ───────── 互動目標 ─────────
function placeInfo(kit) {
  const P = G.player;
  const col = Math.floor(P.x / 48), row = Math.floor((P.y - 48) / 48);
  const cx = 24 + 48 * col, cy = 72 + 48 * row;
  let valid = col >= 0 && col <= 20 && row >= 0 && row <= 10;
  if (valid && routeDist(cx, cy) < 52) valid = false;
  if (valid && Math.hypot(cx - CASTLE_POS.x, cy - CASTLE_POS.y) < 90) valid = false;
  if (valid) {
    for (const s of G.towers.concat(G.pillars)) {
      if (Math.hypot(s.x - cx, s.y - cy) < 40) { valid = false; break; }
    }
  }
  let tutBlocked = false; // 教學鎖: 位置合規則但不合教學
  if (valid) {
    if (kit === 'crossbowKit' && placeHere() === 7) tutBlocked = !(cx === PLACE_TOWER.x && cy === PLACE_TOWER.y); // 第 8 輪: 階段 7 只能蓋在「放這裡」那格
    else if (kit === 'pillarKit' && tutLvl2() && period(25)) tutBlocked = !hasFriendNear(cx, cy, 150);
  }
  return { x: cx, y: cy, valid, tutBlocked, kind: kit === 'crossbowKit' ? 'crossbow' : 'pillar' };
}
function flagInfo() {
  const P = G.player;
  const valid = dist(P, CASTLE_POS) >= 90;
  let tutBlocked = false; // 教學鎖(只在按 Z 時擋): 第 8 輪階段 14 只能在「放這裡」(464,336) 24 內插
  if (placeHere() === 14) tutBlocked = Math.hypot(P.x - PLACE_FLAG.x, P.y - PLACE_FLAG.y) > 24;
  return { x: P.x, y: P.y, valid, tutBlocked };
}
// 第 1 關教學的「放這裡」: 回傳目前是階段 7 / 14 期間(7 / 14), 否則 0
const PLACE_TOWER = { x: 360, y: 408 }, PLACE_FLAG = { x: 464, y: 336 };
function placeHere() {
  if (!tutLvl1()) return 0;
  if (period(7)) return 7;
  if (period(14)) return 14;
  return 0;
}
function interactables() { // 可被安裝 / 拿取的單位
  const L = [];
  G.towers.forEach(o => { if (!o.removed) L.push(o); });
  G.pillars.forEach(o => { if (!o.removed) L.push(o); });
  G.soldiers.forEach(o => { if ((o.state === 'normal' || o.state === 'returning') && !o.removed) L.push(o); });
  G.golems.forEach(o => { if ((o.state === 'normal' || o.state === 'returning') && !o.removed) L.push(o); });
  L.push(G.castle);
  return L;
}
function nearestInRange(list) {
  const P = G.player;
  let best = null, bd = 1e9;
  for (const o of list) {
    const d = dist(P, o);
    if (d <= o.half + 48 && d < bd) { bd = d; best = o; }
  }
  return best;
}
function findInstallTarget() {
  const shop = G.hand === 'shop';
  const L = interactables().filter(u => !(shop && u.cat === 'golem' && u.team === 'neutral'));
  G.parts.forEach(p => L.push(p));
  return nearestInRange(L);
}
function findTakeTarget() {
  const L = interactables().filter(u => (u.cat === 'castle' || (u.cat === 'golem' && u.team === 'neutral')) ? hasItem(u) : true);
  G.parts.forEach(p => L.push(p));
  const only11 = tutLvl1() && period(11); // 第 12 輪: 第 1 關階段 11 期間, 身上沒有遠攻的活敵人不算拿取目標(不跳提示)
  liveEnemies().forEach(e => { if (hasItem(e) && !e.boss && !(only11 && e.slots.indexOf('ranged') < 0)) L.push(e); }); // 第 8 輪: Boss 不算拿取目標
  return nearestInRange(L);
}
function findBossTarget() { // 手空、旁邊沒有其他拿取目標時, Boss 才當互動目標(只能顯示「不能拔除」)
  return nearestInRange(liveEnemies().filter(e => e.boss));
}
function findTarget() {
  if (G.steal) return G.steal.enemy;
  if (G.flag || KITS[G.hand]) return null;
  if (!G.hand) return findTakeTarget() || findBossTarget();
  return findInstallTarget();
}
function actionLabel() {
  if (G.steal) return G.steal.locked ? '' : '取消搶奪'; // 第一次搶奪鎖: 按 Z 沒有動作, 不顯示
  if (G.flag) return flagInfo().valid ? '插旗' : '不能插'; // 教學位置鎖不提前顯示, 按 Z 才擋
  if (KITS[G.hand]) return placeInfo(G.hand).valid ? '蓋下' : '不能蓋';
  const t = findTarget();
  if (G.hand) {
    if (!t) return '丟下';
    if (t.cat === 'part') return '互換';
    if (installBlocked(t, G.hand)) return '不能裝';
    return t.slots.some(s => !s) ? '裝上' : '替換';
  }
  if (!t) return '';
  if (t.cat === 'enemy') return t.boss ? '不能拔除' : (stealBlocked() ? '暫不能拔除' : '搶奪');
  if (t.cat === 'part') return '拿起';
  return '選單';
}
function shopHolder() {
  for (const u of ownUnits()) {
    if (u.removed) continue;
    if ((u.cat === 'soldier' || u.cat === 'golem') && u.state !== 'normal' && u.state !== 'returning') continue;
    if (u.state === 'away') continue;
    if (u.slots.indexOf('shop') >= 0) return u;
  }
  return null;
}
function shopItems() { return SHOP_ALL.filter(s => s[0] !== 'golemKit' || S.golemUnlocked); }

// ───────── 更新 ─────────
function atkDur(u) { return u.attackKind === 'melee' ? 0.25 : 0.15; } // 近戰類出手的撲擊 0.25 秒, 其他 0.15
function tickAge(o, k, dur, dt) { if (o[k] < dur) o[k] = Math.min(dur, o[k] + dt); }
function decCd(u, gdt) { for (const k in u.cd) if (u.cd[k] > 0) u.cd[k] = Math.max(0, u.cd[k] - gdt); }
function tickUnit(u, gdt) {
  tickAge(u, 'hitAge', u.cat === 'castle' ? 0.3 : 0.2, gdt);
  tickAge(u, 'attackAge', atkDur(u), gdt);
  if (u.slowT > 0) u.slowT = Math.max(0, u.slowT - gdt);
  decCd(u, gdt);
}
function castleHit(e) {
  G.castleHp -= ENEMY_DEF[e.type].dmg;
  G.castle.hitAge = 0;
  e.gone = true;
  if (G.steal && G.steal.enemy === e) cancelSteal('leak');
  if (e.boss) bossEnd(e, 'leaked', null);
  G.stat.leaks++; G.stat.leaksByWave[e.wave]++;
  const nm = LV.spawns[e.lane].name;
  G.stat.leaksBySpawn[nm] = (G.stat.leaksBySpawn[nm] || 0) + 1;
  if (G.castleHp > 0) snd('castle_hit');
}
function openPopup(p) { G.popup = p; snd('popup_open'); muffle(true); }
function closePopup() { if (!G.popup) return; G.popup = null; snd('popup_close'); muffle(false); }
function unitMobileTick(u, gdt) {
  // 我方移動單位: 排隊中 / 消失中 / 歸隊中 / 正常
  if (u.state === 'gone' || u.removed) return;
  if (u.state === 'away') {
    u.awayT -= gdt;
    if (u.awayT <= 0) {
      const lane = u.m ? u.m.lane : 0;
      u.state = 'normal'; u.x = CASTLE_DOOR.x; u.y = CASTLE_DOOR.y;
      u.m = { phase: 'rev', lane, s: LV.lanes[lane].len - 56 };
      snd('unit_return');
    }
    return;
  }
  tickUnit(u, gdt);
  if (u.state === 'returning') {
    u.moving = false; u.charging = false;
    if (moveToward(u, u.home.x, u.home.y, 100, gdt)) {
      u.state = 'normal'; u.moving = false;
      if (u.flagObj) { const i = G.flags.indexOf(u.flagObj); if (i >= 0) G.flags.splice(i, 1); u.flagObj = null; }
    }
    return;
  }
  curSrc = u;
  const st = runAttacks(u, 'ally', gdt, 'unit');
  allyBehavior(u, gdt, st);
  chargeHits(u);
  curSrc = null;
}
// 建築也能因移動類魂件移動(away 也要計時)
function buildingTick(u, gdt, attacks) {
  if (u.removed) return;
  if (u.state === 'away') {
    u.awayT -= gdt;
    if (u.awayT <= 0) {
      const lane = u.m ? u.m.lane : 0;
      u.state = 'normal'; u.x = CASTLE_DOOR.x; u.y = CASTLE_DOOR.y;
      u.m = { phase: 'rev', lane, s: LV.lanes[lane].len - 56 };
      snd('unit_return');
    }
    return;
  }
  tickUnit(u, gdt);
  curSrc = u;
  const st = attacks ? runAttacks(u, 'ally', gdt, 'unit') : false;
  allyBehavior(u, gdt, st);
  chargeHits(u);
  curSrc = null;
}
// 聖光軌跡: 神聖之路單位每走 12px 留一點, 每點存在 4 秒, 最多 64 點
function trailTick(gdt) {
  for (const u of G.towers.concat(G.pillars, G.soldiers, G.golems.filter(g => g.team === 'ally'))) {
    if (u.removed || !u.ev.holy || u.state !== 'normal') continue;
    let tr = u.trailObj;
    const last = tr && tr.pts[tr.pts.length - 1];
    if (!tr || (last && Math.hypot(u.x - last[0], u.y - last[1]) > 60)) { tr = u.trailObj = { owner: u, pts: [] }; G.trails.push(tr); }
    const lp = tr.pts[tr.pts.length - 1];
    if (!lp || Math.hypot(u.x - lp[0], u.y - lp[1]) >= 12) { tr.pts.push([u.x, u.y, 4]); if (tr.pts.length > 64) tr.pts.shift(); }
  }
  for (const tr of G.trails) { tr.pts.forEach(p => { p[2] -= gdt; }); tr.pts = tr.pts.filter(p => p[2] > 0); }
  G.trails = G.trails.filter(tr => { if (tr.pts.length) return true; if (tr.owner.trailObj === tr) tr.owner.trailObj = null; return false; });
}
function onAnyTrail(a) {
  for (const tr of G.trails) {
    const pts = tr.pts;
    if (pts.length === 1 && Math.hypot(a.x - pts[0][0], a.y - pts[0][1]) <= 20) return true;
    for (let i = 1; i < pts.length; i++) {
      const p = pts[i - 1], q = pts[i];
      if (Math.hypot(p[0] - q[0], p[1] - q[1]) > 40) continue;
      if (segProject(p[0], p[1], q[0], q[1], a.x, a.y).d <= 20) return true;
    }
  }
  return false;
}
// 冰霜圈減速、治癒領域(不疊加)、聖光軌跡(不疊加)
function updateAuras(gdt) {
  const liveE = liveEnemies(), A = allyAlive();
  liveE.forEach(e => { e.auraSlow = false; e.healing = false; });
  allyMobile().forEach(u => { u.auraSlow = false; u.healing = false; u.onTrail = false; });
  G.frostAlly = []; G.frostEnemy = []; G.healAlly = []; G.healEnemy = [];
  for (const u of activeTowers().concat(A, [G.castle], [G.player])) {
    if (u.ev.frostAura) { G.frostAlly.push(u); for (const e of liveE) if (dist(u, e) <= 70) e.auraSlow = true; }
    if (u.ev.healAura) G.healAlly.push(u);
  }
  for (const e of liveE) {
    if (e.ev.frostAura) { G.frostEnemy.push(e); for (const a of A) if (dist(e, a) <= 70) a.auraSlow = true; }
    if (e.ev.healAura) G.healEnemy.push(e);
  }
  for (const a of A) {
    a.onTrail = onAnyTrail(a);
    let amt = 0;
    if (G.healAlly.some(s => dist(s, a) <= 100)) amt += 6 * gdt;
    if (a.onTrail) amt += 4 * gdt;
    if (amt > 0) addHeal(a, amt, false);
  }
  for (const e of liveE) {
    if (G.healEnemy.some(s => dist(s, e) <= 100)) addHeal(e, 6 * gdt, true);
  }
}
function orbTick(gdt) {
  G.orbs = G.orbs.filter(o => {
    o.x += o.dx * 60 * gdt; o.y += o.dy * 60 * gdt; o.travel += 60 * gdt;
    if (o.pulseAge < 0.15) o.pulseAge = Math.min(0.15, o.pulseAge + gdt);
    o.pulseT += gdt;
    while (o.pulseT >= 0.5) {
      o.pulseT -= 0.5;
      const segs = [];
      for (const h of liveEnemies()) {
        if (Math.hypot(h.x - o.x, h.y - o.y) <= 60) { curSrc = o.from || null; hurt(h, 5, { src: o.src, frost: false }); curSrc = null; segs.push([o.x, o.y, h.x, h.y]); }
      }
      o.pulseAge = 0;
      if (segs.length) { G.chains.push({ segs: segs.slice(0, 8), owner: 'ally', age: 0 }); snd('shock_zap'); }
    }
    return o.travel < 300 && o.x > -20 && o.x < W + 20 && o.y > 30 && o.y < H + 20;
  });
}

function updateTitle(dt) {
  const tt = G.tt;
  G.titleT += dt;
  if (G.tc) { // 教學種類詢問視窗: 其他東西停住
    const c = G.tc;
    c.age += dt;
    if (c.picked >= 0) {
      c.pickAge = Math.min(0.35, c.pickAge + dt);
      if (c.pickAge >= 0.35) { G.tc = null; applyTutChoice(c.picked); startLevel(1); }
    }
    flushSnd();
    return;
  }
  if (G.tWarn) { G.tWarn.age += dt; if (G.tWarn.age >= 1.2) G.tWarn = null; } // 真實時間
  if (tt.clear) {
    const c = tt.clear;
    if (!c.closing) c.age += dt;
    else {
      c.closeAge = Math.min(0.3, c.closeAge + dt);
      if (c.closeAge >= 0.3) { tt.clear = null; startAdvance(); }
    }
  } else if (tt.adv) {
    const a = tt.adv;
    a.age += dt;
    if (a.age >= 0.8 && !a.unlocked) { a.unlocked = true; S.unlocked[a.to] = true; snd('level_unlock'); }
    if (a.age >= 1.4) { tt.adv = null; S.pendingUnlock = -1; G.cursor = a.to; }
  }
  flushSnd();
}

// 第 14 輪: 恭喜過關演出的時間推進與音效觸發點(計數器式, 不用前後幀比較)
const AC_INTRO = 4.4;
function updateAllClear(dt) {
  const a = G.ac;
  a.sec += dt;
  a.age += dt;
  if (!a.skipped) {
    if (!a.landed && a.age >= 1.1) { a.landed = true; snd('medal_land'); }
    if (!a.pinned && a.age >= 1.7) { a.pinned = true; snd('medal_pin'); }
    if (!a.cleared && a.age >= 2.25) { a.cleared = true; snd('all_clear'); }
    while (a.ticks < 5 && a.age >= 2.6 + 0.22 * a.ticks) { snd('stat_tick'); a.ticks++; }
  }
  while (a.glints < 3 && a.age >= 2.4 + 3 * a.glints) { snd('medal_glint'); a.glints++; } // 只播前 3 次
}
function allClearZ() {
  const a = G.ac;
  if (a.age < 0.5) return; // 0.5 秒內的 Z 不算
  if (a.age < AC_INTRO) { // 演出中: 跳到結束狀態, 這一下不算選按鈕
    a.skipped = true; a.skipAt = Math.round(a.age * 10) / 10;
    if (!a.cleared) { a.cleared = true; snd('all_clear'); } // 還沒播的凱旋跳過時立刻播
    a.landed = a.pinned = true; a.ticks = 5; a.glints = Math.max(a.glints, 1); // 沒到的落定 / 別上 / 統計音不播; 反光下一次在 5.4
    a.age = AC_INTRO;
    zNeedRelease = true; // Z 要放開再按才執行按鈕
    return;
  }
  if (zNeedRelease) return;
  const replay = a.cursor === 1;
  snd('ui_confirm');
  G.ac = null;
  if (replay) startLevel(4); else toTitle();
}

function update(dt) {
  if (G.screen === 'title') { updateTitle(dt); return; }
  if (G.screen === 'result') {
    G.resultT += dt;
    if (G.ac) updateAllClear(dt);
    flushSnd();
    return;
  }
  if (G.screen !== 'play') return;
  const st = G.stat;
  // 暫停類狀態(同時只會有一個): 遊戲時間 0, 只推進各自的真實時間
  if (G.guide) { st.guideSec += dt; updateGuide(dt); flushSnd(); return; }
  if (G.reveal) { st.revealSec += dt; updateReveal(dt); flushSnd(); return; }
  if (G.codex) { st.codexSec += dt; flushSnd(); return; }
  if (G.paused) { st.pauseSec += dt; flushSnd(); return; }
  if (G.revealQ.length) { startReveal(); st.revealSec += dt; flushSnd(); return; }
  if (G.bossIntro) { updateBossIntro(dt); flushSnd(); return; } // Boss 出場演出: 遊戲暫停 2.9 秒, 只接受 M, 不算進遊戲時間
  normalUpdate(dt);
}

// ───────── 波次 ─────────
// 階段 k 期間: 已出現(含條件暫時不成立而隱藏)且還沒完成。階段 24、26 的出現要等它自己的出現條件成立(tapp), 不能只看前一階段完成
const APPEAR_ONLY = { 24: 1, 26: 1 };
function period(k) { const T = S.tut; return !T.done[k] && (!!G.tapp[k] || (!APPEAR_ONLY[k] && !!T.done[k - 1])); }
function waveWaiting() { return G.waveStarted < LV.waves.length && G.waveAt[G.waveStarted] === null; }
function strandedList() { return liveEnemies().filter(e => e.slots.indexOf('march') < 0); } // 呆站的敵人: 身上沒有進攻主堡
// 第 k 波清空: 第 1~k 波出完、沒有等著出場的教學重出敵人, 且場上活著的敵人全是呆站的(沒有活敵人也算)
function waveClear(k) {
  if (G.waveStarted < k) return false;
  if (G.bossIntro) return false; // Boss 出場演出中(已從佇列拿出、還沒真的出場)
  if (G.queue.some(q => q.wave < k)) return false;
  if (Object.keys(G.resp).length) return false;
  return liveEnemies().every(e => e.slots.indexOf('march') < 0);
}
function waitKind() { // 波次面板等待的種類: 'clear' 等這波敵人打完 / 'tutorial' 等新手任務
  if (!G.tutDriven || !waveWaiting()) return 'tutorial';
  const k = G.waveStarted;
  if ((G.level === 1 && k === 2) || (G.level === 2 && (k === 1 || k === 2))) return waveClear(k) ? 'tutorial' : 'clear';
  return 'tutorial';
}
function tutSchedule() { // 第 1、2 關教學中: 波次由教學推進
  if (!G.tutDriven) return;
  const T = S.tut, fx = s => !!(T.fx && T.fx.stage === s);
  const sched = k => { G.waveAt[k] = G.clock + 6; G.cdFrom = G.clock; };
  if (G.level === 1) {
    if (G.waveAt[0] === null && T.done[8]) sched(0);
    if (G.waveAt[1] === null && G.waveAt[0] !== null && T.done[14] && !fx(14) && G.waveStarted >= 1 && !G.queue.some(q => q.wave === 0)) sched(1);
    if (G.waveAt[2] === null && G.waveAt[1] !== null && T.done[16] && !fx(16)) sched(2);
  } else {
    if (G.waveAt[0] === null && T.done[17] && !fx(17)) sched(0);
    if (G.waveAt[1] === null && G.waveAt[0] !== null && T.done[25] && !fx(25) && waveClear(1)) sched(1);
    if (G.waveAt[2] === null && G.waveAt[1] !== null && T.done[28] && waveClear(2)) sched(2);
  }
}
function checkWaveClear() { // 每波第一次清空記一筆(批次尾端呼叫)
  for (let k = 1; k <= LV.waves.length; k++) {
    if (G.clearedW[k] || !waveClear(k)) continue;
    G.clearedW[k] = true;
  }
}
function startWave(k) {
  G.waveStarted = k + 1; G.wave = G.waveStarted;
  const base = G.waveAt[k];
  G.cdFrom = base;
  LV.waves[k].forEach(g => {
    let i = 0;
    g.list.forEach(([type, cnt]) => {
      for (let c = 0; c < cnt; c++) {
        G.queue.push({ t: base + i * g.gap, sp: g.sp, type, wave: k, hold9: G.level === 1 && k === 0 && type === 'archer' && tutLvl1() && !S.tut.done[9] });
        i++;
      }
    });
  });
  G.queue.sort((a, b) => a.t - b.t);
  snd('wave_start'); 
  const lastW = k + 1 === LV.waves.length;
  G.banner = { wave: k + 1, last: lastW, boss: lastW && !!LV.boss, age: 0 };
}
function releaseHold9() {
  for (const q of G.queue) if (q.hold9) { q.hold9 = false; q.t = Math.max(q.t, G.clock + 1.2); }
  G.queue.sort((a, b) => a.t - b.t);
}
function waveUpdate(gdt) {
  const st = G.stat;
  tutSchedule();
  if (waveWaiting()) { if (waitKind() === 'clear') st.clearWaitSec += gdt; else st.gateSec += gdt; }
  G.clock += gdt;
  while (G.waveStarted < LV.waves.length && G.waveAt[G.waveStarted] !== null && G.clock >= G.waveAt[G.waveStarted]) startWave(G.waveStarted);
  while (G.queue.length && G.queue[0].t <= G.clock) {
    if (G.queue[0].hold9) break;
    const q = G.queue.shift();
    if (ENEMY_DEF[q.type] && ENEMY_DEF[q.type].boss) { startBossIntro(q); break; } // 輪到 Boss: 先演出場演出, 演完才真的出場
    spawnEnemy(q);
  }
  const k = G.waveStarted;
  if (k < LV.waves.length && G.waveAt[k] !== null) {
    const rem = G.waveAt[k] - G.clock;
    if (rem <= 6 && rem > 0 && !G.warned[k]) { G.warned[k] = true; snd('wave_warning'); }
  }
  if (G.banner) {
    G.banner.age += gdt;
    if (G.banner.age >= 1.6) { G.panelWave = G.banner.wave; G.bumpAge = 0; G.banner = null; }
  }
  if (G.bumpAge < 0.4) G.bumpAge = Math.min(0.4, G.bumpAge + gdt);
}
function respLane() { const w = LV.waves[Math.max(0, G.waveStarted - 1)]; return w && w[0] ? w[0].sp : 0; }
function spawnTutEnemy(type, lane) {
  const stage = S.tut.view ? S.tut.view.stage : (S.tut.cur || null);
  G.stat.tutorialSpawns++;
  spawnEnemy({ type, sp: lane, wave: Math.max(0, G.waveStarted - 1) });
}
// 教學重出: 任務沒完成就重出同樣的怪, 條件成立後 1.2 秒出 1 隻
function tutRespawnTick(gdt) {
  const T = S.tut, R = G.resp, want = {};
  const live = liveEnemies();
  const eHas = it => live.some(e => e.slots.indexOf(it) >= 0);
  const partHas = it => G.parts.some(p => !p.removed && p.item === it);
  if (tutLvl1()) {
    if (!T.done[9] && !G.firstKill && G.waveStarted >= 1 && !G.queue.some(q => q.type === 'imp' && q.wave === 0) && live.length === 0) want.imp = ['imp', respLane()];
    const arch = T.done[10] ? !T.done[12] : ((briefMode() ? T.done[8] : T.done[9]) && G.sawArcher && !G.queue.some(q => q.type === 'archer')); // 後者: 階段 10 前弓鬼就沒了的保險
    if (arch && !eHas('ranged') && G.hand !== 'ranged' && !partHas('ranged') && !G.towers.some(t => t.slots.indexOf('pierce') >= 0)) want.archer = ['archer', respLane()];
  }
  if (tutLvl2()) {
    if (T.done[19] && !T.done[21]) { // 階段 20~21 期間
      const gm = G.golems.some(g => g.team === 'neutral' && g.slots.indexOf('march') >= 0);
      if (!eHas('march') && G.hand !== 'march' && !partHas('march') && !gm && G.stat.recruits === 0) want.march = ['imp', 0];
    }
    if ((G.tapp[26] || T.done[26]) && !T.done[27]) { // 階段 26~27 期間(26 要等它自己出現: 有帶電擊的活敵人)
      if (!eHas('shock') && G.hand !== 'shock' && !partHas('shock') && !G.pillars.some(p => p.slots.indexOf('shock') >= 0)) want.shock = ['thunder', respLane()];
    }
  }
  for (const key of Object.keys(want)) {
    if (!R[key]) R[key] = { t: 1.2 };
    else {
      R[key].t -= gdt;
      if (R[key].t <= 0) { delete R[key]; spawnTutEnemy(want[key][0], want[key][1]); }
    }
  }
  for (const key of Object.keys(R)) if (!want[key]) delete R[key];
}
function partsFrozen() { return tutLvl1() || (tutLvl2() && (period(20) || period(21) || period(26) || period(27))); }

// ───────── 一般幀(沒有暫停類狀態) ─────────
function normalUpdate(dt) {
  if (G.popup) { G.popup.shake = Math.min(0.25, G.popup.shake + dt); G.stat.slowMoSec += dt; }
  const gdt = dt * (G.popup ? 0.2 : 1);
  G.time += gdt; G.stat.gameSec += gdt;
  const P = G.player;

  // 玩家移動
  P.moving = false;
  if (!G.popup && !(G.steal && G.steal.locked)) {
    const dx = (keys.R ? 1 : 0) - (keys.L ? 1 : 0), dy = (keys.D ? 1 : 0) - (keys.U ? 1 : 0);
    if (dx || dy) {
      const l = Math.hypot(dx, dy);
      P.x = clamp(P.x + dx / l * 260 * gdt, 16, W - 16);
      P.y = clamp(P.y + dy / l * 260 * gdt, 64, H - 16);
      P.moving = true;
    }
  }
  tickAge(P, 'attackAge', atkDur(P), gdt);
  decCd(P, gdt);
  if (G.warn) { G.warn.age += gdt; if (G.warn.age >= 1.2) G.warn = null; }

  // 搶奪
  if (G.steal) {
    const s = G.steal, e = s.enemy;
    if (e.dead) completeSteal('died');
    else if (e.removed || e.gone) cancelSteal('leak');
    else if (!s.locked && dist(P, e) > e.half + 68) cancelSteal('far'); // 鎖住期間玩家不能動, 不因距離取消
    else {
      s.t += gdt;
      if (s.t >= 1.5) completeSteal('bar');
    }
  }

  computeEvals();
  waveUpdate(gdt);
  G.enemies.forEach(evalEnemy);
  const liveE = liveEnemies();
  updateAuras(gdt);

  // 我方
  G.towers.forEach(u => buildingTick(u, gdt, true));
  G.pillars.forEach(u => { tickAge(u, 'changeAge', 0.5, gdt); buildingTick(u, gdt, false); });
  allyMobile().forEach(u => unitMobileTick(u, gdt));
  tickUnit(G.castle, gdt); runAttacks(G.castle, 'ally', gdt, 'unit');
  runAttacks(P, 'ally', gdt, 'player');
  G.towers = G.towers.filter(u => !u.removed);
  G.pillars = G.pillars.filter(u => !u.removed);
  G.soldiers = G.soldiers.filter(u => !u.removed);
  G.golems = G.golems.filter(u => !u.removed);
  trailTick(gdt);

  // 重生隊伍: 一次一隻, 每隻 5 秒
  if (G.rq.length) {
    G.rqT += gdt;
    if (G.rqT >= 5) {
      const u = G.rq.shift(); G.rqT = 0;
      u.state = 'returning'; u.x = CASTLE_DOOR.x; u.y = CASTLE_DOOR.y; u.hp = u.maxHp; u.slowT = 0; u.m = null;
      snd('unit_return');
    }
  }
  G.flags.forEach(f => { if (f.plantAge < 0.3) f.plantAge = Math.min(0.3, f.plantAge + gdt); });

  // 中立石魔像
  for (const g of G.golems) {
    if (g.team !== 'neutral') continue;
    tickUnit(g, gdt);
    g.moving = false;
    if (g.slots.indexOf('march') >= 0) {
      g.marchT = (g.marchT || 0) + gdt; // 走向主堡已經過幾秒(階段 22 等待提示用)
      moveToward(g, CASTLE_POS.x, CASTLE_POS.y, 60, gdt);
      if (dist(g, CASTLE_POS) <= 66) g.recruited = true;
    } else {
      g.wanderT -= gdt;
      if (g.wanderT <= 0) {
        g.wanderT = 2;
        const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * 100;
        g.wx = g.home.x + Math.cos(a) * r; g.wy = g.home.y + Math.sin(a) * r;
      }
      moveToward(g, g.wx, g.wy, 40, gdt);
    }
  }
  const rec = G.golems.filter(g => g.recruited);
  if (rec.length) {
    for (const g of rec) {
      g.removed = true;
      let k = 0;
      for (const it of g.slots) {
        if (!it) continue;
        G.parts.push(mkPart(it, 772 + 32 * k, 482, 0));
        k++;
      }
      G.stat.recruits++; snd('recruit'); 
    }
    G.golems = G.golems.filter(g => !g.recruited);
    S.golemUnlocked = true;
  }

  // 敵人
  for (const e of liveE) {
    if (e.dead) continue;
    tickUnit(e, gdt);
    if (e.stunAge < e.stunDur) e.stunAge = Math.min(e.stunDur, e.stunAge + gdt);
    if (e.kb) {
      const k = e.kb; k.t += gdt / 0.2;
      const f = Math.min(1, k.t);
      if (k.mode === 'path') { const q = pathPoint(LV.lanes[e.lane], k.s0 + (k.s1 - k.s0) * f); e.x = q.x; e.y = q.y; if (f >= 1) e.s = k.s1; }
      else { e.x = k.x0 + (k.x1 - k.x0) * f; e.y = k.y0 + (k.y1 - k.y0) * f; if (f >= 1) e.s = pathProject(LV.lanes[e.lane], e.x, e.y).s; }
      if (f >= 1) e.kb = null;
      e.moving = false;
    } else if (e.stunAge < e.stunDur) {
      e.moving = false;
    } else {
      const st = runAttacks(e, 'enemy', gdt, 'enemy');
      enemyBehavior(e, gdt, st);
    }
    if (!e.dead && dist(e, CASTLE_POS) <= 66) castleHit(e);
  }

  // 投射物、雷電球
  G.projs = G.projs.filter(p => {
    const t = p.target;
    if (t && !t.dead && !t.gone && t.state !== 'gone' && !t.removed) p.angle = Math.atan2(t.y - p.y, t.x - p.x);
    const st = 420 * gdt;
    p.x += Math.cos(p.angle) * st; p.y += Math.sin(p.angle) * st; p.travel += st;
    const list = p.owner === 'ally' ? liveEnemies() : allyAlive();
    for (const h of list) {
      if (h.dead || h.gone) continue;
      if (dist(p, h) <= h.half + 6) {
        const ice = p.kind === 'ice';
        curSrc = p.from || null;
        dealHit(h, p.dmg, { src: p.src, frost: ice, shock: p.shock, side: p.owner });
        curSrc = null;
        return false;
      }
    }
    return p.travel < 320;
  });
  orbTick(gdt);

  // 單次特效 / 金幣 / 倒下消散 / 地上魂件
  for (const arr of [G.beams, G.areas, G.sparks, G.slashes, G.names, G.breaks, G.chains, G.hbeams, G.blinks]) arr.forEach(o => { o.age += gdt; });
  G.slashes = G.slashes.filter(o => o.age < 0.25);
  G.beams = G.beams.filter(o => o.age < 0.15);
  G.areas = G.areas.filter(o => o.age < 0.3);
  G.sparks = G.sparks.filter(o => o.age < 0.25);
  G.names = G.names.filter(o => o.age < 1.5);
  G.breaks = G.breaks.filter(o => o.age < 0.5);
  G.chains = G.chains.filter(o => o.age < 0.2);
  G.hbeams = G.hbeams.filter(o => o.age < 0.3);
  G.blinks = G.blinks.filter(o => o.age < 0.3);
  const frozen = partsFrozen();
  for (const p of G.parts) {
    if (p.spawnAge < 0.6) p.spawnAge = Math.min(0.6, p.spawnAge + gdt);
    if (!p.permanent && !frozen) {
      p.life -= gdt;
      if (p.life <= 0) {
        p.removed = true; G.stat.groundExpired++;
        snd('ground_expire');
      }
    }
  }
  const coinLock = tutLvl1() && !S.tut.done[9]; // 第 1 關教學中, 階段 9 完成前金幣不會被吸
  G.coins = G.coins.filter(c => {
    if (c.spawnAge < 0.4) { // 落地過程: 落定前不會被吸
      c.spawnAge = Math.min(0.4, c.spawnAge + gdt);
      const f = c.spawnAge / 0.4;
      c.x = c.x0 + (c.tx - c.x0) * f; c.y = c.y0 + (c.ty - c.y0) * f;
      return true;
    }
    if (coinLock) return true;
    const d = Math.hypot(P.x - c.x, P.y - c.y);
    let got = false;
    if (d <= 20) got = true;
    else if (d <= 90) {
      const st = Math.min(420 * gdt, d);
      c.x += (P.x - c.x) / d * st; c.y += (P.y - c.y) / d * st;
      if (Math.hypot(P.x - c.x, P.y - c.y) <= 20) got = true;
    }
    if (got) { G.gold += 2; G.stat.goldEarned += 2; snd('coin_pickup'); return false; }
    return true;
  });
  G.corpses.forEach(c => { c.life -= gdt; });
  G.corpses = G.corpses.filter(c => c.life > 0);

  cleanupEnemies();
  bossBarTick(gdt);
  G.parts = G.parts.filter(p => !p.removed);
  tutRespawnTick(gdt);
  checkWaveClear();

  // 共鳴配組的組合名稱(同一幀多個只播一次: 有首次就只播 combo_new)
  for (const u of activeTowers().concat(allyAlive(), [G.castle], [P])) {
    for (let ci = 0; ci < NCOMBO; ci++) {
      let n = 0; for (const c of u.ev.matched) if (c === ci) n++;
      if (n > u.prevCombos[ci]) {
        const r = popName(u, ci);
        if (r) G.comboSnd = Math.max(G.comboSnd, r);
      }
      u.prevCombos[ci] = n;
    }
  }

  // 彈窗自動關閉
  if (G.popup && G.popup.target) {
    const t = G.popup.target;
    if (t.removed || t.dead || t.gone || t.state === 'gone' || t.state === 'away' || dist(G.player, t) > t.half + 68) closePopup();
  }
  if (G.popup && G.popup.type === 'soul') layoutPopup(G.popup);
  G.target = findTarget();
  if (G.popup) G.target = G.popup.target || null;

  // 第 1 關第 2 波清空後的等待計時(階段 15 要再等 2.0 秒遊戲時間才出引導卡)
  if (G.level === 1 && waveClear(2)) { if (G.w2ClearT === null) G.w2ClearT = G.time; } else G.w2ClearT = null;

  updateTutorial(dt);

  // 結束判定(批次尾端只判一次)
  if (G.castleHp <= 0) endLevel(false);
  else if (G.waveStarted >= LV.waves.length && G.queue.length === 0 && !G.bossIntro && liveEnemies().length === 0 && Object.keys(G.resp).length === 0) endLevel(true);
  flushSnd();
}

// ───────── 第一次合成演出 / 圖鑑 / 暫停 ─────────
function startReveal() {
  const r = G.revealQ.shift();
  G.reveal = Object.assign({ age: 0, closing: false, closeAge: 0.3, t0: RT }, r);
  G.stat.reveals++;
  snd('combo_reveal');
}
function updateReveal(dt) {
  const r = G.reveal;
  if (!r.closing) r.age = Math.min(1.5, r.age + dt);
  else {
    r.closeAge = Math.min(0.3, r.closeAge + dt);
    if (r.closeAge >= 0.3) {
      G.reveal = null;
      if (G.revealQ.length) startReveal();
    }
  }
}
function revealZ() {
  const r = G.reveal;
  if (!r || r.closing || r.age < 1.5) return;
  r.closing = true; r.closeAge = 0; snd('ui_confirm');
}
function openCodex() { G.codex = true; G.stat.codexOpens++; G.codexT0 = RT; snd('codex_open'); }
function closeCodex() { G.codex = false; snd('codex_close'); }
function togglePause() {
  if (!G.paused) { G.paused = true; G.stat.pauses++; snd('pause_on'); }
  else { G.paused = false; snd('pause_off'); }
}

// ───────── 新手教學(31 階段: 暫停式引導卡 + 新手任務泡泡; 階段 31 是階段 30 期間的插隊) ─────────
const CARD = { 1: 1, 2: 1, 3: 1, 8: 1, 9: 1, 10: 1, 15: 1, 18: 1, 19: 1, 28: 1, 29: 1 };
const SEG = { 1: [1, 2, 3], 18: [18, 19] };
const SEQ = {
  1: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16],
  2: [17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30]
};
function tutSeq() { return SEQ[G.level] || []; }
function tutCur() { const T = S.tut; for (const k of tutSeq()) if (!T.done[k]) return k; return 0; }
function tutLvl1() { return G.level === 1 && !S.tut.done[16]; }
function tutLvl2() { return G.level === 2 && !S.won[1]; } // 第 2 關教學中: 這次開網頁還沒在第 2 關勝利過
function handEmpty() { return G.hand === null && !G.flag; }
function enemiesWith(it) { return liveEnemies().filter(e => e.slots.indexOf(it) >= 0); }
function partsWith(it) { return G.parts.filter(p => !p.removed && p.item === it); }
function nearestTo(list) { return nearest(G.player, list); }
function shopOpen() { return !!(G.popup && G.popup.type === 'shop'); }
function golemHasMarch() { return G.golems.some(g => g.team === 'neutral' && g.slots.indexOf('march') >= 0); }
function visSoldiers() { return G.soldiers.filter(visibleMobile); }

// ── 教學鎖 ──
function shopLocked(kit) {
  const T = S.tut;
  if (tutLvl1()) {
    if (kit === 'pillarKit') return true;
    if (kit === 'crossbowKit' && !T.done[4]) return true; // 方向鍵任務(階段 4)完成前, 箭塔上鎖
    if (kit === 'soldierKit' || kit === 'golemKit') return !(T.done[13] || G.tapp[13]); // 步兵: 階段 13 出現就解開
    // 箭塔: 買過 1 座之後鎖住, 到階段 13「完成」才解開(第 7 輪: 階段 13 期間商店只剩步兵可買)
    if (kit === 'crossbowKit') return (G.stat.purchases.crossbow || 0) >= 1 && !T.done[13];
  }
  if (tutLvl2() && period(17)) { // 第 2 關開場任務: 箭塔與步兵各限一份, 石魔像鎖住(第 7 輪)
    if (kit === 'golemKit') return true;
    if (kit === 'crossbowKit' && (G.towers.length > 0 || G.hand === 'crossbowKit')) return true;
    if (kit === 'soldierKit' && (G.soldiers.length > 0 || (!!G.flag && G.flag.reason === 'purchase' && G.flag.kind === 'soldier'))) return true;
  }
  if (tutLvl2()) {
    if (kit === 'pillarKit' && !S.pillarUnlocked) return true;
    if (kit !== 'pillarKit' && period(24)) return true; // 階段 24 期間只能買魂柱
  }
  return false;
}
function installBlocked(t, h) { // 裝上 / 替換被教學擋下
  const T = S.tut;
  if (tutLvl1()) {
    let ok = false;
    if (!T.done[12] && (T.done[11] || G.tapp[12]) && h === 'ranged' && t.cat === 'tower') ok = true;
    if (period(16)) { // 只能把清單裡還沒打勾的那件裝到它的目的單位
      const dd = done16Flags();
      if ((h === 'pierce' && !dd[0] && t.cat === 'soldier') || (h === 'melee' && !dd[1] && t.cat === 'tower') || (h === 'seek' && !dd[2] && t.cat === 'tower')) ok = true;
    }
    return !ok;
  }
  if (tutLvl2()) {
    const neutralGolem = t.cat === 'golem' && t.team === 'neutral';
    if (h === 'march' && T.done[20] && !T.done[21] && !neutralGolem) return true;
    if (t.cat === 'pillar' && T.done[25] && !T.done[27] && h !== 'shock') return true;
    if (h === 'shock' && T.done[26] && !T.done[27] && t.cat !== 'pillar') return true;
  }
  return false;
}
function stealBlocked() { // 階段 10 前不能搶; 階段 14 完成(步兵旗插下)起到階段 16 完成也不能搶(第 2 波與互換教學期間, 第 9 輪提前)
  return tutLvl1() && (!S.tut.done[10] || (!!S.tut.done[14] && !S.tut.done[16]));
}
function stealPref() {
  const T = S.tut;
  if (G.level === 1 && T.done[10] && !T.done[11]) return 'ranged';
  if (G.level === 2 && T.done[19] && !T.done[21]) return 'march';
  if (G.level === 2 && T.done[25] && !T.done[27]) return 'shock';
  return null;
}
function hasFriendNear(x, y, r) {
  if (Math.hypot(x - CASTLE_POS.x, y - CASTLE_POS.y) <= r) return true;
  for (const t of activeTowers()) if (Math.hypot(x - t.x, y - t.y) <= r) return true;
  for (const u of allyAlive()) if (Math.hypot(x - u.x, y - u.y) <= r) return true;
  return false;
}
function tutBlock(action, item, text, dist) {
  snd('ui_invalid');
  if (text !== null) G.warn = { text: text || '教學期間不可這樣操作', age: 0 };
  const b = G.stat.tutorialBlocks; b[action] = (b[action] || 0) + 1;
}
// 離「放這裡」指定位置的距離(整數): 只有第 1 關階段 7 的蓋箭塔、階段 14 的插旗有值
function placeDist() {
  const ph = placeHere(), P = G.player;
  if (ph === 7) return Math.round(Math.hypot(P.x - PLACE_TOWER.x, P.y - PLACE_TOWER.y));
  if (ph === 14) return Math.round(Math.hypot(P.x - PLACE_FLAG.x, P.y - PLACE_FLAG.y));
  return undefined;
}

// ── 引導卡 ──
function circ(x, y, r) { return { x, y, r }; }
function layoutCard(spots) {
  let top = 1e9, bottom = -1e9, sx = 0;
  spots.forEach(s => { top = Math.min(top, s.y - s.r); bottom = Math.max(bottom, s.y + s.r); sx += s.x; });
  const cardX = clamp(sx / spots.length, 240, 784);
  const above = top >= 190;
  const cardY = above ? top - 40 - 70 : Math.min(496, bottom + 40 + 70);
  const arrows = spots.map(s => {
    const tipX = s.x, tipY = above ? s.y - s.r - 4 : s.y + s.r + 4;
    return { tipX, tipY, rootX: clamp(tipX, cardX - 200, cardX + 200), rootY: above ? cardY + 70 : cardY - 70 };
  });
  return { cardX, cardY, arrows };
}
function buildCard(k) {
  const P = G.player;
  let text = '', sub = '', spots = [];
  switch (k) {
    case 1: text = '這是你'; spots = [circ(P.x, P.y, 40)]; break;
    case 2: text = '這是主堡'; sub = '保護它, 別讓它被攻破'; spots = [circ(900, 326, 92)]; break;
    case 3: text = '怪物要來了'; sub = '該做些準備了'; spots = [circ(288, 88, 56)]; break;
    case 8: {
      const t = G.towers[0];
      text = '這是代表遠攻的「魂件」'; sub = '建築、敵人、步兵都有不同的魂件';
      spots = [t ? circ(t.x - 10, t.y - 44, 20) : circ(512, 288, 20)];
      break;
    }
    case 9: {
      const f = G.firstKill || { x: 512, y: 288 };
      text = '打倒怪物會掉金幣'; sub = '靠近就會撿起來'; spots = [circ(f.x, f.y, 56)];
      break;
    }
    case 10: {
      const e = liveEnemies().find(q => q.type === 'archer') || liveEnemies()[0];
      text = '靠近它按 [Z]'; sub = '把怪物身上的魂件拔下來';
      spots = [e ? circ(e.x, e.y, 32) : circ(512, 288, 32)];
      break;
    }
    case 15: {
      const t = G.towers[0], s = visSoldiers()[0];
      text = '試試把箭塔和步兵的魂件互換吧!'; sub = '魂件可以隨意拆裝';
      if (t) spots.push(circ(t.x, t.y - 10, 52));
      if (s) spots.push(circ(s.x, s.y - 12, 44));
      if (!spots.length) spots.push(circ(512, 288, 52));
      break;
    }
    case 18: {
      const g = G.golems.find(q => q.team === 'neutral' && !q.removed);
      text = '這是中立怪物'; sub = '不會打你, 也不會打敵人';
      spots = [g ? circ(g.x, g.y - 4, 64) : circ(512, 288, 64)];
      break;
    }
    case 19: {
      const e = G.enemies.find(q => !q.dead && !q.gone);
      text = '試試把怪物的「進攻主堡」拆下來,\n裝在中立怪物身上'; sub = '';
      spots = [e ? circ(e.x, e.y - 6, 32) : circ(512, 288, 32)];
      break;
    }
    case 29: {
      const e = nearestTo(strandedList());
      text = '這隻怪物剛剛被你拔掉了\n「進攻主堡」魂件'; sub = '所以呆站在這裡';
      spots = [e ? circ(e.x, e.y - 6, 32) : circ(512, 288, 32)];
      break;
    }
    case 28: {
      const p = G.pillars.find(q => q.slots[0] === 'shock') || G.pillars[0];
      text = '現在魂柱周邊的友軍都有電擊效果了'; sub = '';
      spots = [p ? circ(p.x, p.y, 154) : circ(512, 288, 154)];
      break;
    }
  }
  return Object.assign({ stage: k, text, sub, spots }, layoutCard(spots));
}
function startGuide(stages) {
  if (G.popup) closePopup();
  G.guide = { stages: stages.slice(), cards: stages.map(buildCard), idx: 0, phase: 'intro', phaseAge: 0, cardAge: 0.3, readAge: 0, from: null, trans: 0.3, t0: RT };
  snd('guide_pause');
}
function showCard(g) {
  const T = S.tut, k = g.cards[g.idx].stage;
  g.cardAge = 0; g.readAge = 0;
  snd('guide_card');
  G.tapp[k] = true;
  if (T.shownSt[k] === undefined) { T.shownSt[k] = r1(RT); }
}
function updateGuide(dt) {
  const g = G.guide;
  if (g.phase === 'intro') {
    g.phaseAge += dt;
    if (g.phaseAge >= 0.3) { g.phase = 'card'; g.phaseAge = 0; showCard(g); }
  } else if (g.phase === 'card') {
    g.cardAge = Math.min(0.3, g.cardAge + dt);
    g.trans = Math.min(0.3, g.trans + dt);
    g.readAge = Math.min(1.5, g.readAge + dt);
  } else {
    g.phaseAge += dt;
    if (g.phaseAge >= 0.3) {
      G.guide = null;
    }
  }
}
function completeCard(k) {
  const T = S.tut;
  T.done[k] = true; T.doneSt[k] = r1(RT);
  if (k === 9) releaseHold9();
  if (k === 29) G.strandedHit = false; // 階段 30 只算這之後的命中
}
function guideZ() {
  const g = G.guide;
  if (!g || g.phase !== 'card' || g.readAge < 1.5) return;
  const cur = g.cards[g.idx];
  completeCard(cur.stage);
  if (g.idx < g.cards.length - 1) {
    g.from = { spots: cur.spots.map(s => Object.assign({}, s)), arrows: cur.arrows.map(a => Object.assign({}, a)) };
    g.idx++; g.trans = 0;
    showCard(g);
  } else { snd('ui_confirm'); g.phase = 'outro'; g.phaseAge = 0; }
}
function cardReady(k) {
  const T = S.tut;
  switch (k) {
    case 1: return G.time >= 1.0;
    case 8: return true;
    case 9: return !!G.firstKill && G.time - G.firstKill.t >= 0.4;
    case 10: return liveEnemies().some(e => e.type === 'archer' && G.time - e.spawnT >= 2.0);
    case 15: return G.w2ClearT !== null && G.time - G.w2ClearT >= 2.0;
    case 18: return liveEnemies().some(e => G.time - e.spawnT >= 2.0);
    case 19: return true;
    case 28: return true;
    case 29: return T.done[28] && waveClear(LV.waves.length) && strandedList().length >= 1;
  }
  return false;
}

// ── 新手任務泡泡 ──
function tipFor(o) {
  switch (o.cat) {
    case 'player': return { x: o.x, up: o.y - 20, down: o.y + 44 };
    case 'castle': return { x: 900, up: 246, down: 336 + 56 + 4 };
    case 'tower': return { x: o.x, up: o.y - 58, down: o.y + 24 + 4 };
    case 'pillar': return { x: o.x, up: o.y - 52, down: o.y + 18 + 4 };
    case 'soldier': return { x: o.x, up: o.y - 50, down: o.y + 16 + 4 };
    case 'golem': return { x: o.x, up: o.y - 62, down: o.team === 'neutral' ? o.y + 54 : o.y + 28 + 4 };
    case 'enemy': return { x: o.x, up: o.y - o.half - 34, down: o.y + o.half + 4 };
    case 'part': return { x: o.x, up: o.y - 18, down: o.y + 14 + 4 };
  }
  return null;
}
// 第 13 輪: 泡泡避開左上波次面板(x 8~228、y 52~110): 本體上緣 < 119 時本體左緣至少 236(中心 x ≥ 236 + 半寬)
function avoidPanel(bodyX, bodyY, hh, hw) { return (bodyY - hh < 119) ? Math.max(bodyX, 236 + hw) : bodyX; }
function objView(k, text, keysArr, obj, o) {
  if (!obj) return null;
  const t = tipFor(obj);
  if (!t || t.x !== t.x || t.up !== t.up) return null;
  o = o || {};
  const hh = o.large ? 50 : 36; // 兩行大泡泡(階段 17)本體 400×100
  let side = 'up', tipY = t.up, by = tipY - 20 - hh;
  if (by - hh < 60) { side = 'down'; tipY = t.down; by = tipY + 20 + hh; }
  return {
    stage: k, text, sub: o.sub || '', large: !!o.large, keys: keysArr.slice(), pressedKeys: o.pressed || [], checklist: o.checklist || [], tipX: t.x, tipY, side,
    bodyX: o.large ? clamp(avoidPanel(t.x, by, hh, 200), 200, 824) : clamp(avoidPanel(t.x, by, hh, 150), 150, 874), bodyY: by, late: false
  };
}
function placeView(k, text, tipX, tipY, bodyX, bodyY) { // 指著「放這裡」標示的固定版位(第 8 輪)
  return { stage: k, text, sub: '', large: false, keys: ['z'], pressedKeys: [], checklist: [], tipX, tipY, side: 'up', bodyX, bodyY, late: false };
}
// 觸控模式: 美術把單位彈窗放大 1.5 倍、商店放大 1.4 倍(以彈窗中心為準), 指向彈窗的教學泡泡與彈窗版位照同一倍數算
function popK() { return touchOn() ? 1.5 : 1; }
function shopK() { return touchOn() ? 1.4 : 1; }
function shopCellView(k, text, keysArr, kit) {
  const items = shopItems(), i = items.findIndex(s => s[0] === kit);
  if (i < 0) return null;
  const sk = shopK(), cx = 512 + (i - (items.length - 1) / 2) * 88 * sk, tipY = 320 - 79 * sk;
  return { stage: k, text, sub: '', large: false, keys: keysArr.slice(), pressedKeys: [], checklist: [], tipX: cx, tipY, side: 'up', bodyX: cx, bodyY: tipY - 56, late: true };
}
function popupView(k, text, keysArr) {
  const p = G.popup, cx = p.x, cy = p.y, hw = 160 * popK();
  let side, tipX, bodyX;
  if (cx >= 512) { side = 'left'; tipX = cx - hw - 4; bodyX = tipX - 170; }
  else { side = 'right'; tipX = cx + hw + 4; bodyX = tipX + 170; }
  bodyX = avoidPanel(bodyX, cy, 36, 150);
  return { stage: k, text, sub: '', large: false, keys: keysArr.slice(), pressedKeys: [], checklist: [], tipX, tipY: cy, side, bodyX, bodyY: cy, late: true };
}
const ITEMS16 = [['pierce', 'soldier', '穿透箭'], ['melee', 'crossbow', '近戰'], ['seek', 'crossbow', '自動索敵']];
function done16Flags() {
  return [
    G.soldiers.some(s => s.slots.indexOf('pierce') >= 0),
    G.towers.some(t => t.slots.indexOf('melee') >= 0),
    G.towers.some(t => t.slots.indexOf('seek') >= 0)
  ];
}
// 搬運箭頭(階段 16): 挑還沒搬好的一件 X, 由它所在的位置(單位魂件格 / 地上 / 手上)指向目的單位
function pick16(dd) {
  const P = G.player, h = G.hand;
  const hi = ITEMS16.findIndex(it => it[0] === h);
  if (hi >= 0 && !dd[hi]) return { i: hi, src: 'hand', fx: P.x + 28, fy: P.y, fr: 16, from: 'hand' };
  for (let i = 0; i < 3; i++) {
    if (dd[i]) continue;
    const it = ITEMS16[i][0];
    const holders = G.towers.filter(u => !u.removed).concat(visSoldiers()).filter(u => u.slots.indexOf(it) >= 0);
    const u = nearestTo(holders);
    if (u) {
      const L = u.slots.length, gi = u.slots.indexOf(it), cy = u.cat === 'tower' ? u.y - 44 : u.y - 36;
      return { i, src: 'unit', u, gi, fx: u.x - (L - 1) * 10 + 20 * gi, fy: cy, fr: 14, from: u.cat === 'tower' ? 'crossbow' : 'soldier' };
    }
    const gp = nearestTo(partsWith(it));
    if (gp) return { i, src: 'ground', fx: gp.x, fy: gp.y, fr: 20, from: 'ground' };
  }
  return null;
}
function arrow16(X) { // 算箭頭的座標; 終點 = 離起點最近的目的單位的尖端(弩塔 y−58、步兵 y−50)
  const toKind = ITEMS16[X.i][1];
  const dest = toKind === 'soldier' ? visSoldiers() : G.towers.filter(u => !u.removed);
  let best = null, bd = 1e9;
  for (const u of dest) { const d = Math.hypot(u.x - X.fx, u.y - X.fy); if (d < bd) { bd = d; best = u; } }
  if (!best) return null;
  const tx = best.x, ty = best.y - (toKind === 'soldier' ? 50 : 58);
  const dd = Math.hypot(tx - X.fx, ty - X.fy), h = clamp(dd * 0.35, 40, 120);
  const cy = Math.max(60, Math.min(X.fy, ty) - h);
  const key = ITEMS16[X.i][0] + '|' + X.src;
  if (G.arrowKey !== key) { // 換一件、或起點種類改變: 新箭頭從起點長出來, 並記埋點
    G.arrowKey = key; G.arrowT0 = G.time;
  }
  return { fromX: X.fx, fromY: X.fy, fromR: X.fr, toX: tx, toY: ty, ctrlX: (X.fx + tx) / 2, ctrlY: cy, item: ITEMS16[X.i][0] };
}
// 階段 16 彈窗小泡泡(第 10 輪): 算要指的那一格
function tip16(p) {
  const t = p.target, unit = t.cat === 'tower' ? 'crossbow' : t.cat === 'soldier' ? 'soldier' : null;
  let slot = null;
  if (unit && p.mode === 'menu') {
    const X = pick16(done16Flags());
    if (X && X.src === 'unit' && X.u === t) slot = X.gi;
  } else if (unit && p.mode === 'replace') {
    const dd = done16Flags();
    for (let i = 0; i < 3 && slot === null; i++) { // (1) 依清單順序第一件還沒打勾、且不屬於這種單位的魂件所在格
      if (dd[i] || ITEMS16[i][1] === unit) continue;
      const gi = t.slots.indexOf(ITEMS16[i][0]);
      if (gi >= 0) slot = gi;
    }
    if (slot === null) { // (2) 編號最小、魂件不屬於這種單位的格
      for (let j = 0; j < t.slots.length; j++) {
        const it = t.slots[j];
        if (!it) continue;
        const own = unit === 'crossbow' ? (it === 'melee' || it === 'seek') : it === 'pierce';
        if (!own) { slot = j; break; }
      }
    }
  }
  return { mode: p.mode, unit, slot, item: slot === null ? null : t.slots[slot] };
}
function slotTipView(p) {
  const tp = tip16(p);
  if (tp.slot === null || tp.slot >= p.cells.length) return null;
  const k = popK(), cx = p.x + (-120 + 48 * tp.slot) * k, tipY = p.y - 54 * k;
  return { stage: 16, text: p.mode === 'menu' ? '拔掉這個魂件' : '換掉這個魂件', sub: '', large: false, compact: true, keys: [], pressedKeys: [], checklist: [], tipX: cx, tipY, side: 'up', bodyX: clamp(avoidPanel(cx, tipY - 59, 17, 75), 76, 948), bodyY: tipY - 59, late: true };
}
function view16(ign) {
  const p = ign ? null : G.popup;
  if (p) {
    if (p.type !== 'soul') return null;
    return slotTipView(p);
  }
  const dd = done16Flags();
  const cl = ITEMS16.map((it, i) => ({ item: it[0], to: it[1], done: dd[i] }));
  const X = pick16(dd);
  let text, arrow = null;
  if (X && X.src === 'hand') text = '把' + ITEMS16[X.i][2] + (ITEMS16[X.i][1] === 'soldier' ? '裝到步兵身上' : '裝到箭塔上');
  else if (X && handEmpty()) text = X.src === 'ground' ? '照箭頭, 撿起' + ITEMS16[X.i][2] : '照箭頭, 拿下' + ITEMS16[X.i][2];
  else text = '走到空地按 Z 丟下';
  if (X && text !== '走到空地按 Z 丟下' && !ign) arrow = arrow16(X);
  // 泡泡固定在畫面左上、不帶箭頭(side "none"); 指引交給搬運箭頭
  return { stage: 16, text, sub: '', large: false, keys: [], pressedKeys: [], checklist: cl, tipX: 700, tipY: 158, side: 'none', bodyX: 700, bodyY: 158, late: false, arrow };
}
function qView(k, ign) { // ign: 不管彈窗開著與否, 算「場上」版位(完成特效在原位置播用)
  const P = G.player, p = ign ? null : G.popup;
  const open = !!p, shop = open && p.type === 'shop';
  const T = S.tut;
  const pressed = ['left', 'up', 'right', 'down'].filter(n => T.pressed[n]);
  switch (k) {
    case 4: return open ? null : objView(k, '方向鍵移動', ['left', 'up', 'right', 'down'], P, { pressed });
    case 5: return open ? null : objView(k, '到主堡按空白鍵', ['space'], shopHolder());
    case 6:
      if (shop) return shopCellView(k, '選箭塔, 按 Z 買', ['left', 'right', 'z'], 'crossbowKit');
      return open ? null : objView(k, '到主堡按空白鍵', ['space'], shopHolder());
    case 7: return open ? null : placeView(k, '蓋在「放這裡」的位置', PLACE_TOWER.x, PLACE_TOWER.y - 74, PLACE_TOWER.x, PLACE_TOWER.y - 74 - 56);
    case 11:
      if (!ign && G.steal && G.steal.locked) return objView(k, '正在拔除, 請稍候', [], G.steal.enemy);
      return open ? null : objView(k, '靠近怪物按 Z 把「魂件」拔下來', ['z'], nearestTo(enemiesWith('ranged')));
    case 12: {
      if (open) return null;
      if (G.hand === 'ranged') return objView(k, '裝到箭塔上', ['z'], nearestTo(G.towers));
      if (handEmpty() && partsWith('ranged').length) return objView(k, '撿起地上的「遠攻」', ['z'], nearestTo(partsWith('ranged')));
      return objView(k, '再拔一個「遠攻」', ['z'], nearestTo(enemiesWith('ranged')));
    }
    case 13:
      if (shop) return shopCellView(k, '選步兵, 按 Z 買', ['left', 'right', 'z'], 'soldierKit');
      return open ? null : objView(k, '接著, 召喚一隻步兵吧', ['space'], shopHolder());
    case 14: return open ? null : placeView(k, '把旗子插在「放這裡」', PLACE_FLAG.x, PLACE_FLAG.y - 74, PLACE_FLAG.x, PLACE_FLAG.y - 74 - 56);
    case 16: return view16(ign);
    case 17: {
      if (open) return null;
      return objView(k, '按照上一局的教學,\n擺上一個箭塔和步兵來防止敵軍進攻吧!', [], shopHolder(), { large: true, checklist: cl17() });
    }
    case 20:
      if (open) return null;
      if (handEmpty()) return objView(k, '拔下怪物的「進攻主堡」', ['z'], nearestTo(enemiesWith('march')));
      return objView(k, '走到空地按 Z 丟下', ['z'], P);
    case 21: {
      if (open) return null;
      if (G.hand === 'march') return objView(k, '裝在石魔像身上', ['z'], nearestTo(G.golems.filter(g => g.team === 'neutral' && !g.removed)));
      if (handEmpty() && partsWith('march').length) return objView(k, '撿起地上的「進攻主堡」', ['z'], nearestTo(partsWith('march')));
      return objView(k, '再拔一個「進攻主堡」', ['z'], nearestTo(enemiesWith('march')));
    }
    case 22: {
      if (open) return null;
      if (recruited22()) return objView(k, '去主堡看看', ['space'], shopHolder());
      // 還沒招募成功: 不擋操作的等待提示, 貼在走向主堡的那隻中立石魔像頭上
      const g = G.golems.find(q => q.team === 'neutral' && !q.removed && q.slots.indexOf('march') >= 0);
      return g ? objView(k, '石魔像正在朝著主堡移動,請等待', [], g) : null;
    }
    case 23: return shop ? shopCellView(k, '之後就可以召喚石魔像了!', [], 'golemKit') : null;
    case 24:
      if (shop) return shopCellView(k, '選魂柱, 按 Z 買', ['left', 'right', 'z'], 'pillarKit');
      return open ? null : objView(k, '接著試試看購買魂柱', ['space'], shopHolder());
    case 25: return open ? null : objView(k, '蓋在友軍旁邊', ['z'], P);
    case 26:
      if (open) return null;
      if (handEmpty()) return objView(k, '拔下電電怪的「電擊」', ['z'], nearestTo(enemiesWith('shock')));
      return objView(k, '走到空地按 Z 丟下', ['z'], P);
    case 27: {
      if (open) return null;
      if (G.hand === 'shock') return objView(k, '裝在魂柱上', ['z'], nearestTo(G.pillars));
      if (handEmpty() && partsWith('shock').length) return objView(k, '撿起地上的「電擊」', ['z'], nearestTo(partsWith('shock')));
      return objView(k, '再拔一個「電擊」', ['z'], nearestTo(enemiesWith('shock')));
    }
    case 30: return view30();
    case 31: {
      if (open) return null;
      const u = nearestTo(units31());
      if (!u) return null;
      return objView(k, (u.cat === 'golem' ? '石魔像' : '步兵') + '身上要有攻擊魂件', ['z'], u, { large: true, sub: '例如近戰、遠攻、電擊等等' });
    }
  }
  return null;
}
function recruited22() { return S.golemUnlocked || G.stat.recruits > 0; }
function cl17() { return [{ item: 'crossbowKit', to: null, done: G.towers.length > 0 }, { item: 'soldierKit', to: null, done: G.soldiers.length > 0 }]; }
// ── 階段 30 / 31(呆站的敵人) ──
function near200Stranded(u) { return strandedList().some(e => Math.hypot(e.x - u.home.x, e.y - u.home.y) <= 200); }
function unitHasAttack(u) { const E = u.ev; return E.effects.some(e => e.t !== 'healRay') || E.chargeN > 0 || E.blinkN > 0; }
function units31() { return allyMobile().filter(u => u.state === 'normal' && !u.removed && near200Stranded(u)); }
function cond31() { const L = units31(); return L.length > 0 && L.every(u => !unitHasAttack(u)); }
function view30() {
  const p = G.popup;
  const mobiles = allyMobile();
  if (p) {
    if (p.type === 'shop') return mobiles.length === 0 ? shopCellView(30, '選步兵, 按 Z 買', ['left', 'right', 'z'], 'soldierKit') : null;
    if (p.mode === 'menu' && isMobileAlly(p.target)) return popupView(30, '選「移防」, 按 Z', ['left', 'right', 'z']);
    return null;
  }
  const P = G.player, st = strandedList();
  if (G.flag) return objView(30, '把旗子插在怪物旁邊', ['z'], nearestTo(st));
  if (mobiles.length === 0) return objView(30, '先召喚一隻步兵', ['space'], shopHolder());
  if (G.hand) return objView(30, '走到空地按 Z 丟下', ['z'], P);
  if (mobiles.some(u => u.state === 'returning' && near200Stranded(u))) return null; // 等它走到集結點
  const vis = mobiles.filter(u => (u.state === 'normal' || u.state === 'returning') && !u.removed);
  if (!vis.length) return null;
  return objView(30, '走到步兵旁按 Z', ['z'], nearestTo(vis));
}
function qCond(k) {
  switch (k) {
    case 7: return G.hand === 'crossbowKit' || G.run.placedTower;
    case 11: return enemiesWith('ranged').length > 0 || qDone(11);
    case 14: return !!(G.flag && G.flag.reason === 'purchase') || qDone(14);
    case 5: return !briefMode() || G.time >= 1.0; // 精簡教學: 進關 1.0 秒出現
    case 17: return G.time >= 1.0;
    case 22: return recruited22() || G.golems.some(g => g.team === 'neutral' && !g.removed && (g.marchT || 0) >= 3.0); // 走了 3 秒還沒到就先出等待提示
    case 23: return shopOpen();
    case 24: return waveClear(1);
    case 25: return G.hand === 'pillarKit' || qDone(25);
    case 26: return enemiesWith('shock').length > 0 || qDone(26);
    case 31: return cond31() || qDone(31);
  }
  return true;
}
function qDone(k) {
  const T = S.tut, st = G.stat;
  const pil = it => G.pillars.some(p => p.slots.indexOf(it) >= 0);
  switch (k) {
    case 4: return !!(T.pressed.left && T.pressed.right && T.pressed.up && T.pressed.down);
    case 5: return shopOpen() || G.shopOpens > G.qBase;
    case 22: return recruited22() && (shopOpen() || G.shopOpens > G.qBase); // 招募前打開商店不算
    case 6: return (st.purchases.crossbow || 0) > 0;
    case 7: return G.run.placedTower;
    case 11: return G.hand === 'ranged' || G.towers.some(t => t.slots.indexOf('pierce') >= 0);
    case 12: return G.towers.some(t => t.slots.indexOf('pierce') >= 0);
    case 13: return (st.purchases.soldier || 0) > 0;
    case 14: return st.flags.purchase > 0;
    case 16: { const dd = done16Flags(); return dd[0] && G.towers.some(t => t.slots.indexOf('melee') >= 0 && t.slots.indexOf('seek') >= 0); }
    case 17: return G.towers.length > 0 && G.soldiers.length > 0;
    case 20: return G.hand === 'march' || golemHasMarch() || st.recruits > 0;
    case 21: return golemHasMarch() || st.recruits > 0;
    case 23: return G.q23seen && !shopOpen();
    case 24: return (st.purchases.pillar || 0) > 0 || G.pillars.length > 0;
    case 25: return G.run.placedPillar || G.pillars.length > 0;
    case 26: return G.hand === 'shock' || pil('shock');
    case 27: return pil('shock');
    case 30: return G.strandedHit || strandedList().length === 0;
    case 31: return T.done[30] || allyMobile().some(u => u.state === 'normal' && !u.removed && near200Stranded(u) && unitHasAttack(u));
  }
  return false;
}
function completeQuest(k, view) {
  const T = S.tut;
  T.done[k] = true; T.doneSt[k] = r1(RT);
  if (T.shownSt[k] === undefined) { T.shownSt[k] = T.doneSt[k]; }
  snd('tutorial_done');
  const v = (T.lastView && T.lastView.stage === k) ? T.lastView : (view || qView(k, true));
  T.fx = v ? { stage: k, view: v, t: 0 } : null;
  T.lastView = null; T.view = null;
}
function updateTutorial(dt) {
  const T = S.tut;
  T.view = null;
  if (T.fx) {
    T.fx.t += dt;
    if (T.fx.t >= 0.6) T.fx = null; else return;
  }
  let k = tutCur();
  T.cur = k;
  if (!k) return;
  if (CARD[k]) {
    if (cardReady(k)) startGuide(SEG[k] || [k]);
    return;
  }
  // 階段 31 插隊: 階段 30 期間條件成立就出現(完成特效播完才回到 30); 條件不成立又沒完成時回到 30
  if (k === 30 && !T.done[31] && (cond31() || (G.tapp[31] && qDone(31)))) k = 31;
  if (G.qCur !== k) { G.qCur = k; G.qBase = G.shopOpens; G.q23seen = false; }
  if (!qCond(k) && !(k === 23 && qDone(k))) return; // 階段 23 的完成條件是商店關閉(出現條件是商店開著), 要另外放行
  if (!G.tapp[k]) { // 這一刻階段出現
    G.tapp[k] = true;
    if (k === 24) {
      S.pillarUnlocked = true; // 階段 24 出現的這一刻魂柱解鎖, 金幣不到 40 補到 40
      if (tutLvl2() && G.gold < PRICE.pillar) tutGold(24, PRICE.pillar - G.gold);
    }
  }
  if (k === 22 && recruited22() && !G.rec22) { G.rec22 = true; G.qBase = G.shopOpens; } // 招募成功的這一刻起才算「打開商店」
  const view = qView(k, false);
  if (k === 22 && view && !recruited22() && !G.waitLogged) { // 等待提示第一次出現
    G.waitLogged = true;
    const g = G.golems.find(q => q.team === 'neutral' && !q.removed && q.slots.indexOf('march') >= 0);
  }
  if (k === 16 && G.popup && G.popup.type === 'soul') { // 彈窗小泡泡第一次畫出 / 改指另一格
    const tp = tip16(G.popup);
    if (G.popup.tipSlot === undefined || G.popup.tipSlot !== tp.slot) {
      G.popup.tipSlot = tp.slot;
    }
  }
  if (qDone(k)) { completeQuest(k, view); return; }
  if (k === 17 && tutLvl2()) { // 階段 17 保險(第 7 輪): 金幣不夠買還缺的那幾樣時, 當下補到夠(例: 蓋了又拆把錢拆光)
    const need = (G.towers.length > 0 || G.hand === 'crossbowKit' ? 0 : PRICE.tower) + (G.soldiers.length > 0 || (G.flag && G.flag.reason === 'purchase' && G.flag.kind === 'soldier') ? 0 : PRICE.soldier);
    if (G.gold < need) tutGold(17, need - G.gold);
  }
  if (k === 30) { // 「先召喚一隻步兵」出現的那一刻, 金幣不到 12 補到 12
    const is4 = !!view && view.text === '先召喚一隻步兵';
    if (is4 && !G.t30was4 && tutLvl2() && G.gold < PRICE.soldier) tutGold(30, PRICE.soldier - G.gold);
    G.t30was4 = is4;
  }
  if (view) {
    T.view = view; T.lastView = view;
    if (!G.vshown[k]) {
      G.vshown[k] = true; snd('quest_new');
      if (T.shownSt[k] === undefined) { T.shownSt[k] = r1(RT); }
    }
    if (k === 23) G.q23seen = true;
  }
}
function tutGold(stage, amount) { // 教學補金幣: 不算 goldEarned
  G.gold += amount; G.stat.tutorialGold += amount;
  snd('coin_pickup');
}

// ───────── 輸入動作 ─────────
function cancelSteal(reason) {
  const s = G.steal; if (!s) return;
  G.steal = null;
  G.stat.steals.canceled++; snd('steal_cancel');
  endStealLock(s, 'leak');
}
function completeSteal(via) {
  const s = G.steal; if (!s) return;
  const e = s.enemy, item = e.slots[s.index];
  G.hand = item; e.slots[s.index] = null; G.steal = null;
  G.stat.steals.done++; if (via === 'died') G.stat.steals.diedDone++;
  snd('steal_done');
  endStealLock(s, via === 'died' ? 'died' : 'bar');
}
function endStealLock(s, result) { // 第一次搶奪鎖解鎖: 拔下 / 取消的同一幀
  if (!s.locked) return;
  const L = s.lock, sl = G.stat.stealLock, sec = r1(RT - L.t0);
  sl.lockedSec += RT - L.t0;
}
function doInstall(t, mode, item, swappedOut) {
  G.stat.installs[mode]++;
  afterSlotsChange(t);
}
function menuCells(t) {
  const lockSlot = tutLvl1() && !S.tut.done[15]; // 第 1 關教學中, 階段 15 完成前魂件格上鎖
  const lockShop = tutLvl1() && t.cat === 'castle'; // 第 1 關教學中主堡的購買格一直上鎖
  const lockMarch = tutLvl2() && S.tut.done[21] && t.cat === 'golem' && t.team === 'neutral'; // 石魔像走回主堡期間, 它的進攻主堡上鎖
  const cells = t.slots.map(k => ({ type: 'slot', item: k || null, locked: lockSlot || (lockShop && k === 'shop') || (lockMarch && k === 'march') }));
  if (t.cat === 'tower' || t.cat === 'pillar') cells.push({ type: 'demolish', refund: settleRefund(t, Math.floor(t.price * 0.6), false).refund, locked: !!G.tutLevel }); // 第 8 輪: 第 1 關教學局與第 2 關教學中整局不能拆除
  else if (isMobileAlly(t)) cells.push({ type: 'rally', locked: G.level === 1 && !!G.tutLevel }); // 第 1 關教學局整局不能移防
  return cells;
}
function demolish(t) {
  const r = settleRefund(t, Math.floor(t.price * 0.6), true);
  G.gold += r.refund; G.stat.goldRefund += r.refund; G.stat.bundledBack += r.back;
  const items = r.rest, m = items.length;
  items.forEach((it, k) => G.parts.push(mkPart(it, t.x - 16 * (m - 1) + 32 * k, t.y + 30, 0)));
  t.removed = true;
  G.towers = G.towers.filter(u => !u.removed);
  G.pillars = G.pillars.filter(u => !u.removed);
  G.stat.demolishes++;
  snd('demolish');
}
function popupZ() {
  const p = G.popup;
  if (p.type === 'shop') {
    const items = shopItems();
    const it = items[p.index], kit = it[0], price = it[2];
    const isUnit = kit === 'soldierKit' || kit === 'golemKit';
    const nm = KIT_NAME[kit];
    const fail = msg => { p.msg = msg; p.shake = 0; snd('ui_invalid'); };
    if (shopLocked(kit)) { p.msg = '教學期間不能買'; p.shake = 0; tutBlock('shop', nm, null); return; }
    if (kit === 'pillarKit' && G.pillars.length + (G.hand === 'pillarKit' ? 1 : 0) >= LV.cap) { fail('已達上限'); return; }
    if (G.gold < price) { fail('金幣不足'); return; }
    if (!isUnit && (G.hand || G.flag)) { fail('手上要空著'); return; }
    if (isUnit && (G.flag || KITS[G.hand])) { fail('先放下手上的東西'); return; }
    G.gold -= price; G.stat.goldSpent += price;
    G.stat.purchases[nm] = (G.stat.purchases[nm] || 0) + 1;
    if (isUnit) G.flag = { reason: 'purchase', kind: nm, unit: null }; else G.hand = kit;
    snd('purchase');
    closePopup();
    return;
  }
  const t = p.target, i = p.index, c = p.cells[i];
  if (p.mode === 'menu') {
    if (c.type === 'slot' && !c.item) { p.shake = 0; snd('ui_invalid'); return; }
    if (c.locked) { p.shake = 0; tutBlock(c.type === 'demolish' ? 'demolish' : (c.type === 'rally' ? 'rally' : 'take'), c.item || null); return; }
    if (c.type === 'slot') {
      const cell = t.slots[i];
      G.hand = cell; t.slots[i] = null;
      if (t.cat === 'pillar') t.changeAge = 0;
      snd('take_part');
      closePopup();
    } else if (c.type === 'demolish') {
      demolish(t); closePopup();
    } else if (c.type === 'rally') {
      G.flag = { reason: 'rally', kind: t.cat, unit: t };
      closePopup();
    }
  } else {
    const cell = t.slots[i], h = G.hand;
    t.slots[i] = h; G.hand = cell;
    snd('swap_part');
    closePopup();
    doInstall(t, 'replace', h, cell);
  }
}
function tryPlace() {
  const info = placeInfo(G.hand);
  if (!info.valid) { snd('ui_invalid'); return; }
  if (info.tutBlocked) {
    const hereLock = G.hand === 'crossbowKit' && placeHere() === 7;
    tutBlock(G.hand === 'crossbowKit' ? 'build' : 'pillar', G.hand === 'crossbowKit' ? 'crossbow' : 'pillar', hereLock ? '請放在「放這裡」的位置' : '教學期間不能放這裡', hereLock ? placeDist() : undefined);
    return;
  }
  const k = G.hand;
  let bundled = [];
  if (k === 'crossbowKit') { const u = mkTower(info.x, info.y); u.slots[0] = 'ranged'; bundled = ['ranged']; G.towers.push(u); G.run.placedTower = true; }
  else { G.pillars.push(mkPillar(info.x, info.y)); G.stat.pillarsMax = Math.max(G.stat.pillarsMax, G.pillars.length); G.run.placedPillar = true; }
  G.hand = null;
  snd('place_unit');
}
function plantFlag() {
  const P = G.player, fi = flagInfo();
  if (G.flag.unit && G.flag.unit.removed) { G.flag = null; return; } // 那隻兵已走回主堡退款: 旗幟直接消失
  if (!fi.valid) { snd('ui_invalid'); return; }
  if (fi.tutBlocked) { tutBlock('flag', G.flag.kind, '請放在「放這裡」的位置', placeDist()); return; }
  const f = G.flag; G.flag = null;
  const atHere = placeHere() === 14; // 階段 14: 旗子(= 集結點)直接落在指定點 (464,336), 不是玩家中心
  const fo = atHere ? { x: PLACE_FLAG.x, y: PLACE_FLAG.y, plantAge: 0 } : { x: P.x, y: P.y + 16, plantAge: 0 };
  let u = f.unit;
  if (f.reason === 'purchase') {
    u = f.kind === 'soldier' ? mkSoldier(CASTLE_DOOR.x, CASTLE_DOOR.y) : mkGolem(CASTLE_DOOR.x, CASTLE_DOOR.y, 'ally');
    u.state = 'returning';
    (f.kind === 'soldier' ? G.soldiers : G.golems).push(u);
    snd('unit_return');
  } else {
    if (u.flagObj) { const i = G.flags.indexOf(u.flagObj); if (i >= 0) G.flags.splice(i, 1); }
    if (u.state === 'away') { u.state = 'returning'; u.x = CASTLE_DOOR.x; u.y = CASTLE_DOOR.y; }
    else if (u.state === 'normal') u.state = 'returning';
    u.m = null;
  }
  u.home = { x: fo.x, y: fo.y }; u.flagObj = fo;
  G.flags.push(fo);
  G.stat.flags[f.reason === 'purchase' ? 'purchase' : 'rally']++;
  snd('flag_plant');
}
function zPress() {
  const P = G.player;
  if (G.steal) { cancelSteal('key'); return; }
  if (G.popup) { popupZ(); return; }
  if (G.flag) { plantFlag(); return; }
  if (KITS[G.hand]) { tryPlace(); return; }
  if (G.hand) { // 魂件
    const t = findInstallTarget();
    if (!t) {
      G.parts.push(mkPart(G.hand, P.x, P.y, 0.6));
      G.stat.drops++; G.hand = null; snd('drop_part');
      return;
    }
    if (t.cat === 'part') {
      const h = G.hand; G.hand = t.item; t.item = h; t.life = 10; t.permanent = h === 'shop';
      snd('swap_part');
      return;
    }
    if (installBlocked(t, G.hand)) { tutBlock('install', G.hand); return; }
    const ei = t.slots.findIndex(s => !s);
    if (ei >= 0) {
      const h = G.hand;
      t.slots[ei] = h; G.hand = null;
      snd('install_part'); doInstall(t, 'direct', h, null);
      return;
    }
    const cells = t.slots.map(k => ({ type: 'slot', item: k || null, locked: false }));
    let idx = 0;
    for (let j = 0; j < t.slots.length; j++) if (canFuseUnit(t) && wouldFuseAfterSwap(t, j, G.hand)) { idx = j; break; }
    openPopup({ type: 'soul', mode: 'replace', target: t, cells, index: idx, shake: 0.25, msg: '', x: 0, y: 0 });
    layoutPopup(G.popup);
    return;
  }
  const t = findTakeTarget();
  if (!t) {
    const b = findBossTarget(); // Boss 的魂件拔不下來: 無效、播 ui_invalid、不跳教學提示
    if (b) {
      snd('ui_invalid');
      if (G.bossStat) G.bossStat.stealBlocks++;
    }
    return;
  }
  if (t.cat === 'part') {
    G.hand = t.item; t.removed = true; G.parts = G.parts.filter(p => !p.removed);
    snd('take_part');
    return;
  }
  if (t.cat === 'enemy') {
    if (stealBlocked()) { tutBlock('steal', null); return; }
    const idxs = []; t.slots.forEach((s, i) => { if (s) idxs.push(i); });
    const pref = stealPref();
    const pi = pref ? idxs.filter(i => t.slots[i] === pref) : [];
    const index = pi.length ? pi[0] : idxs[Math.floor(Math.random() * idxs.length)];
    const lock = tutLvl1() && period(11); // 第 1 關階段 11 期間開始的搶奪上「第一次搶奪鎖」
    G.steal = { enemy: t, index, t: 0, locked: lock, lock: lock ? { t0: RT, z: 0, m: 0, o: 0 } : null };
    G.stat.steals.started++; snd('steal_start');
    if (lock) { G.stat.stealLock.locks++; }
    return;
  }
  const cells = menuCells(t);
  let idx = cells.findIndex(c => c.type === 'slot' && c.item);
  if (idx < 0) idx = cells.length - 1;
  openPopup({ type: 'soul', mode: 'menu', target: t, cells, index: idx, shake: 0.25, msg: '', x: 0, y: 0 });
  layoutPopup(G.popup);
}
function popupTitle(t) {
  if (t.cat === 'tower') return '箭塔';
  if (t.cat === 'pillar') return '魂柱';
  if (t.cat === 'soldier') return '步兵';
  if (t.cat === 'golem') return t.team === 'neutral' ? '中立石魔像' : '石魔像';
  return '主堡';
}
function attachTop(t) { // 目標最上方附屬物的頂端(槽列頂)
  switch (t.cat) {
    case 'tower': return t.y - 44 - 10;
    case 'pillar': return t.y - 38 - 10;
    case 'soldier': return t.y - 36 - 10;
    case 'golem': return t.y - 48 - 10;
    case 'castle': return 250;
    default: return t.y - t.half - 20 - 10;
  }
}
function layoutPopup(p) {
  const t = p.target;
  if (touchOn()) { // 觸控模式: 彈窗放大 popK 倍(半寬 160k、半高 90k); 左右再避開方向鍵(設計區 x < 100)與 A / B 鈕(x > 1004)
    const k = popK(), hh = 90 * k, hw = 160 * k;
    let ty = attachTop(t) - 8 - hh;
    const top = (tutLvl1() && period(16)) ? ty - 54 * k - 76 < 61 : ty - hh < 50; // 階段 16: 上方要留得下指向格子的小泡泡
    if (top) ty = t.y + t.half + (t.cat === 'golem' && t.team === 'neutral' ? 22 : 0) + 8 + hh;
    p.x = clamp(t.x, 100 + hw, 1004 - hw); p.y = clamp(ty, 50 + hh, 576 - hh);
    return;
  }
  let y = attachTop(t) - 8 - 90;
  const thr = (tutLvl1() && period(16)) ? 101 : 50; // 第 10 輪: 階段 16 期間上方要留得下小泡泡(上緣 < 101 改到下方)
  if (y - 90 < thr) y = t.y + t.half + (t.cat === 'golem' && t.team === 'neutral' ? 22 : 0) + 8 + 90;
  p.x = clamp(t.x, 160, 864); p.y = clamp(y, 140, 486);
}
function popupDesc(p) {
  const c = p.cells[p.index];
  if (!c) return null;
  if (c.type === 'slot') {
    if (!c.item) return null;
    const d = DESC[c.item];
    return { name: d[0], text: d[1], materials: d[2] ? d[2].slice() : [], alt: d[3] || null };
  }
  if (c.type === 'demolish') return { name: '拆除', text: '拆掉, 退還 ' + c.refund + ' 金', materials: [], alt: null };
  return { name: '重設集結點', text: '更改駐守位置', materials: [], alt: null };
}
function onKey(k) {
  if (k === 'M') { toggleMute(); return; } // 任何畫面都能切換靜音
  if (G.screen === 'title') {
    const tt = G.tt;
    if (tt.clear) { // 新手教學完成大提示: 出現滿 1.0 秒才接受 Z
      const c = tt.clear;
      if (k === 'Z' && !c.closing && c.age >= 1.0) { c.closing = true; c.closeAge = 0; snd('ui_confirm'); }
      return;
    }
    if (tt.adv) return; // 推進動畫播放期間只接受 M
    if (G.tc) { // 教學種類詢問視窗
      const c = G.tc;
      if (c.picked >= 0) return; // 確定後閃一下, 期間只接受 M
      if (k === 'L' || k === 'R') {
        const n = clamp(c.cursor + (k === 'R' ? 1 : -1), 0, 1);
        if (n !== c.cursor) { c.cursor = n; c.moves++; snd('ui_move'); }
      } else if (k === 'Z') { if (zNeedRelease) return; confirmTutChoice(); }
      else if (k === 'X') {
        snd('ui_move');
        G.tc = null;
      }
      return;
    }
    if (k === 'L' || k === 'R') { // 第 12 輪: 游標可以移到全部 4 張卡(含未解鎖、教學鎖住), 不循環、到頭停住不播音效
      const c = clamp(G.cursor + (k === 'R' ? 1 : -1), 0, 3);
      if (c !== G.cursor) { G.cursor = c; snd('ui_move'); }
    } else if (k === 'Z') {
      const ci = G.cursor;
      if (!S.unlocked[ci]) { // 未解鎖: 不進入, 那張卡正下方跳「尚未解鎖」
        snd('ui_invalid');
        G.tWarn = { age: 0, x: 152 + 240 * ci, text: '尚未解鎖' };
        S.menuLockedTries++;
        return;
      }
      if (ci === 0 && tutLock1()) { // 教學鎖住的第 1 關: 不進入, 跳「教學期間不可這樣操作」
        snd('ui_invalid');
        G.tWarn = { age: 0, x: 152, text: '教學期間不可這樣操作' };
        S.menuBlocks++;
        return;
      }
      if (ci === 0 && S.tutMode === null && !S.tut.done[16]) { openTutChoice(); return; }
      snd('ui_confirm'); startLevel(ci + 1);
    }
    return;
  }
  if (G.screen === 'result' && G.ac) {
    const a = G.ac;
    if (a.age >= AC_INTRO && (k === 'L' || k === 'R')) { // 演出中 ← → 無效、不播音效
      const c = clamp(a.cursor + (k === 'R' ? 1 : -1), 0, 1);
      a.cursor = c; snd('ui_move'); // 和一般結算相同: 到頭也播
    } else if (k === 'Z') allClearZ();
    return;
  }
  if (G.screen === 'result') {
    const n = G.options.length;
    if (k === 'L' || k === 'R') { G.resultCursor = clamp(G.resultCursor + (k === 'R' ? 1 : -1), 0, n - 1); snd('ui_move'); }
    else if (k === 'Z' && G.resultT >= 0.5) {
      const o = G.options[G.resultCursor];
      snd('ui_confirm');
      if (o === '重玩' || o === '重來') startLevel(G.level);
      else if (o === '關卡預覽') toTitle(G.level - 1);
      else toTitle();
    }
    return;
  }
  // 遊戲中: 引導卡、合成演出只接受 Z 與 M; 圖鑑接受 C / X / Esc; 暫停只接受 Esc
  if (G.guide) { if (k === 'Z') guideZ(); return; }
  if (G.reveal) { if (k === 'Z') revealZ(); return; }
  if (G.bossIntro) return; // Boss 出場演出: 不能跳過, 只有 M(上面已處理)
  if (G.codex) { if (k === 'C' || k === 'X' || k === 'ESC') closeCodex(); return; }
  if (G.paused) { if (k === 'ESC') togglePause(); return; }
  if (k === 'ESC') { togglePause(); return; }
  if (k === 'C') { openCodex(); return; }
  if (G.steal && G.steal.locked) { // 第一次搶奪鎖: 方向鍵、Z、X、空白鍵全部無效, 不播音效、不跳提示, 只計數
    const L = G.steal.lock, sl = G.stat.stealLock;
    if (k === 'Z') { L.z++; sl.ignoredZ++; }
    else if (k === 'L' || k === 'R' || k === 'U' || k === 'D') { L.m++; sl.ignoredMove++; }
    else { L.o++; sl.ignoredOther++; }
    return;
  }
  const T = S.tut;
  if (k === 'L' || k === 'R' || k === 'U' || k === 'D') {
    if (tutCur() === 4) T.pressed[{ L: 'left', R: 'right', U: 'up', D: 'down' }[k]] = true;
  }
  if (k === 'Z') { if (zNeedRelease) return; zPress(); }
  else if (k === 'X') {
    if (G.popup) closePopup();
  } else if (k === 'S') {
    if (G.steal || G.popup) return;
    const h = shopHolder();
    if (h && dist(G.player, h) <= 110) {
      let idx = shopItems().findIndex(s => !shopLocked(s[0])); // 游標在第一個沒鎖住的品項
      if (idx < 0) idx = 0;
      openPopup({ type: 'shop', target: null, index: idx, shake: 0.25, msg: '' });
      G.shopOpens++;
    }
  } else if (k === 'L' || k === 'R') {
    const p = G.popup;
    if (!p) return;
    const n = p.type === 'shop' ? shopItems().length : p.cells.length;
    p.index = (p.index + (k === 'R' ? 1 : n - 1)) % n;
    if (p.type === 'shop') p.msg = '';
    snd('ui_move');
  }
}
const KEYMAP = { ArrowLeft: 'L', ArrowRight: 'R', ArrowUp: 'U', ArrowDown: 'D', KeyZ: 'Z', KeyX: 'X', Space: 'S', KeyM: 'M', KeyC: 'C', Escape: 'ESC' };
// 輸入入口(鍵盤與觸控層共用): 鍵名 L R U D Z X S M C ESC
function inputDown(k) {
  if (window.PVDX && PVDX.paused) return;
  if (!G.inited) { G.inited = true; try { if (typeof Sound !== 'undefined' && Sound.init) Sound.init(); } catch (err) { console.error(err); } setMusic(G.music); }
  if (k === 'L' || k === 'R' || k === 'U' || k === 'D') keys[k] = true;
  try { onKey(k); } catch (err) { console.error(err); }
  flushSnd();
}
function inputUp(k) {
  if (k === 'Z') zNeedRelease = false;
  if (k === 'L' || k === 'R' || k === 'U' || k === 'D') keys[k] = false;
}
function inputReset() { keys.L = keys.R = keys.U = keys.D = false; zNeedRelease = false; }
window.addEventListener('keydown', e => {
  const k = KEYMAP[e.code];
  if (!k) return;
  e.preventDefault();
  if (e.repeat) return;
  inputDown(k);
});
window.addEventListener('keyup', e => {
  const k = KEYMAP[e.code];
  if (!k) return;
  e.preventDefault();
  inputUp(k);
});
window.addEventListener('blur', inputReset);
if (document.addEventListener) {
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) hideAt = Date.now();
    else if (hideAt !== null) {
      if (G.screen === 'play' && G.stat) G.stat.hiddenSec += (Date.now() - hideAt) / 1000;
      hideAt = null;
    }
  });
}

// ───────── 繪製 ─────────
function slotCenterX(L, i, x) { const h = touchOn() ? 13 : 10; return x - L * h + h + h * 2 * i; } // 觸控模式魂件格 24、間距 26(與美術一致)
function resonantKinds(u) { const k = u.slots[0]; return (k && RESONANT[k]) ? [k] : []; }
function titleState() {
  const adv = G.tt.adv;
  let maxU = 0; for (let i = 0; i < 4; i++) if (S.unlocked[i]) maxU = i;
  const unlocking = !!(adv && adv.unlocked);
  return {
    levels: LEVELS.map((l, i) => ({ name: l.name, unlocked: S.unlocked[i], cleared: !!(S.unlocked[i] && S.won[i]), tutorial: i < 2, tutorialLocked: i === 0 && S.unlocked[0] && tutLock1() })),
    cursorIndex: (adv || G.tt.clear) ? -1 : G.cursor, // 大提示與推進動畫播完之前不畫游標
    blinkTime: G.titleT,
    tokenIndex: adv ? adv.to : maxU, tokenFrom: adv ? adv.from : maxU, tokenAge: adv ? Math.min(0.8, adv.age) : 0.8, tokenDuration: 0.8,
    unlockIndex: unlocking ? adv.to : -1, unlockAge: unlocking ? Math.min(0.6, adv.age - 0.8) : 0.6, unlockDuration: 0.6
  };
}
function touchOn() { return !!(window.PVDX && window.PVDX.on); }
// 觸控模式: 泡泡裡的按鍵字換成手機按鈕(Z → A、X → B、空白鍵 → 購買鈕)
function touchText(s) { return touchOn() && s ? s.replace(/按 Z/g, '按 A').replace(/按 X/g, '按 B').replace(/空白鍵/g, '購買鈕') : s; }
function render() {
  ctx.save();
  // 每幀開頭: 實際像素 = DPR, 再整體放大 1.25 倍(設計座標 1024×576 → 邏輯畫布 1280×720)
  // 畫面比 1280 寬時, 1280×720 設計區置中(最外層平移一次 OX); 兩側由 touch.js 塗黑放按鈕
  ctx.setTransform(DPR * SC, 0, 0, DPR * SC, DPR * OX, 0);
  ctx.clearRect(-OX / SC - 4, -4, CW / SC + 8, H + 8);
  try { renderScene(); } finally { ctx.restore(); }
}
function renderScene() {
  if (G.screen === 'title') {
    Art.drawTitle(ctx, titleState());
    // 聲音開關圖示(第 13 輪從 drawTitle 拆出): 詢問視窗 / 大提示開著與觸控模式不畫
    if (!G.tc && !G.tt.clear && !touchOn()) Art.drawMuteIcon(ctx, { x: 974 + EDGE, y: 40, size: 36, muted: S.muted });
    if (G.tWarn) Art.drawTutorialWarn(ctx, { x: G.tWarn.x, y: 450, text: G.tWarn.text, age: G.tWarn.age, duration: 1.2 });
    const c = G.tt.clear;
    if (c) Art.drawTutorialClear(ctx, { age: c.age, ready: !c.closing && c.age >= 1.0, closing: c.closing, closeAge: c.closeAge, closeDuration: 0.3 });
    const tc = G.tc;
    if (tc) Art.drawTutorialChoice(ctx, { cursor: tc.cursor, age: tc.age, openDuration: 0.25, picked: tc.picked, pickAge: tc.pickAge, pickDuration: 0.35 });
    return;
  }
  drawScene();
}
function visibleMobile(u) { return (u.state === 'normal' || u.state === 'returning') && !u.removed; }
function entityDrawList() {
  const L = [];
  const T = G.target;
  L.push({ y: G.castle.y, f: () => Art.drawCastle(ctx, { x: CASTLE_POS.x, y: CASTLE_POS.y, hp: Math.max(0, G.castleHp), maxHp: 20, hitAge: G.castle.hitAge, hitDuration: 0.3, attackAge: Math.min(0.15, G.castle.attackAge), attackDuration: 0.15, targeted: T === G.castle }) });
  G.towers.forEach(u => {
    if (u.state !== 'normal') return;
    const ro = u.ev.rooted;
    L.push({ y: u.y, f: () => Art.drawCrossbow(ctx, { x: u.x, y: u.y, attackAge: u.attackAge, attackDuration: atkDur(u), attackKind: u.attackKind, attackAngle: u.attackAngle, moving: !ro && u.moving, charging: !ro && u.charging, rooted: ro, resonating: u.ev.resonating, targeted: T === u }) });
  });
  G.pillars.forEach(u => {
    if (u.state !== 'normal') return;
    const ro = u.ev.rooted;
    L.push({ y: u.y, f: () => Art.drawPillar(ctx, { x: u.x, y: u.y, kinds: resonantKinds(u), moving: !ro && u.moving, charging: !ro && u.charging, rooted: ro, targeted: T === u }) });
  });
  const mob = (u) => {
    const ret = u.state === 'returning';
    const ro = !ret && u.ev.rooted;
    return {
      x: u.x, y: u.y, hp: ret ? u.maxHp : u.hp, maxHp: u.maxHp, hitAge: u.hitAge, hitDuration: 0.2, attackAge: u.attackAge, attackDuration: atkDur(u), attackKind: u.attackKind, attackAngle: u.attackAngle,
      moving: !ro && u.moving, charging: !ro && !ret && u.charging, rooted: ro, healing: !ret && u.healing && u.hp < u.maxHp,
      resonating: ret ? false : u.ev.resonating, returning: ret, targeted: T === u
    };
  };
  G.soldiers.forEach(u => { if (visibleMobile(u)) L.push({ y: u.y, f: () => Art.drawSoldier(ctx, mob(u)) }); });
  G.golems.forEach(u => {
    if (!visibleMobile(u)) return;
    L.push({
      y: u.y, f: () => {
        const s = mob(u); s.team = u.team;
        if (u.team === 'neutral') { s.hp = s.maxHp; s.charging = false; s.rooted = false; s.healing = false; s.resonating = false; s.returning = false; }
        Art.drawGolem(ctx, s);
      }
    });
  });
  G.enemies.forEach(e => L.push({
    y: e.y, f: () => Art.drawEnemy(ctx, {
      type: e.type, x: e.x, y: e.y, hp: e.hp, maxHp: e.maxHp, hitAge: e.hitAge, hitDuration: 0.2, attackAge: e.attackAge, attackDuration: atkDur(e), attackKind: e.attackKind, attackAngle: e.attackAngle,
      moving: e.boss ? true : (e.ev.singles.march > 0 || e.moving), slowed: e.slowT > 0 || e.auraSlow || stolenBy(e), stunAge: e.stunAge, stunDuration: e.stunDur,
      healing: !!e.healing && e.hp < e.maxHp, swift: !!e.swift, targeted: T === e
    })
  }));
  const P = G.player;
  L.push({
    y: P.y, f: () => Art.drawPlayer(ctx, {
      x: P.x, y: P.y, moving: P.moving, handItem: G.hand, holdingFlag: !!G.flag, stealing: !!G.steal, stealProgress: G.steal ? Math.min(1, G.steal.t / 1.5) : 0,
      resonating: P.ev.resonating, attackAge: P.attackAge, attackDuration: atkDur(P), attackKind: P.attackKind, attackAngle: P.attackAngle
    })
  });
  L.sort((a, b) => a.y - b.y);
  return L;
}
function virtOf(u) { return u.ev.virt.map(v => ({ kind: v.kind, used: v.used })); }
function drawArrow16() {
  const T = S.tut, v = T.view;
  if (G.screen !== 'play' || G.guide || G.reveal || T.fx || !v || v.stage !== 16 || !v.arrow) return;
  const a = v.arrow;
  Art.drawTutorialArrow(ctx, {
    fromX: a.fromX, fromY: a.fromY, fromR: a.fromR, toX: a.toX, toY: a.toY, ctrlX: a.ctrlX, ctrlY: a.ctrlY, item: a.item,
    t: G.time, appearAge: Math.min(0.3, Math.max(0, G.time - G.arrowT0)), appearDuration: 0.3
  });
}
function drawTut(late) {
  const T = S.tut;
  if (G.screen !== 'play' || G.guide || G.reveal) return;
  let v = null, doneAge = 0.6;
  if (T.fx) { v = T.fx.view; doneAge = T.fx.t; }
  else if (T.view) v = T.view;
  if (!v || !!v.late !== late) return;
  Art.drawTutorial(ctx, {
    stage: v.stage, text: touchText(v.text), sub: touchText(v.sub || ''), large: !!v.large, compact: !!v.compact, keys: v.keys, pressedKeys: v.pressedKeys, checklist: v.checklist.map(c => Object.assign({}, c)),
    tipX: v.tipX, tipY: v.tipY, side: v.side, bodyX: v.bodyX, bodyY: v.bodyY, doneAge, doneDuration: 0.6
  });
}
function panelState() {
  const total = LV.waves.length, k = G.waveStarted;
  let status = 'last', nextIn = -1, prog = 0;
  if (k < total) {
    if (waveWaiting()) status = waitKind();
    else {
      status = 'countdown';
      const rem = Math.max(0, G.waveAt[k] - G.clock);
      nextIn = Math.ceil(rem - 1e-9);
      prog = clamp(1 - rem / Math.max(0.001, G.waveAt[k] - G.cdFrom), 0, 1);
    }
  }
  return { x: 118, y: 81, wave: G.panelWave, totalWaves: total, status, nextWaveIn: nextIn, progress: prog, bumpAge: G.bumpAge, bumpDuration: 0.4 };
}
function easeOut(f) { return 1 - (1 - f) * (1 - f); }
function guideState() {
  const g = G.guide, c = g.cards[g.idx];
  let spots = c.spots.map(s => Object.assign({}, s)), arrows = c.arrows.map(a => Object.assign({}, a));
  if (g.from && g.trans < 0.3) { // 聚光燈與箭頭 0.3 秒從舊目標滑到新目標
    const f = easeOut(g.trans / 0.3);
    const L = (a, b) => a + (b - a) * f;
    spots = c.spots.map((s, i) => { const o = g.from.spots[Math.min(i, g.from.spots.length - 1)]; return { x: L(o.x, s.x), y: L(o.y, s.y), r: L(o.r, s.r) }; });
    arrows = c.arrows.map((a, i) => { const o = g.from.arrows[Math.min(i, g.from.arrows.length - 1)]; return { tipX: L(o.tipX, a.tipX), tipY: L(o.tipY, a.tipY), rootX: L(o.rootX, a.rootX), rootY: L(o.rootY, a.rootY) }; });
  }
  const card = g.phase === 'card';
  return {
    phase: g.phase, phaseAge: card ? 0 : g.phaseAge, phaseDuration: card ? 0 : 0.3, text: c.text, sub: c.sub, index: g.idx, total: g.cards.length,
    last: g.idx === g.cards.length - 1, spots, arrows, cardX: c.cardX, cardY: c.cardY, cardAge: g.cardAge, cardDuration: 0.3,
    readAge: g.readAge, readDuration: 1.5, ready: card && g.readAge >= 1.5
  };
}
function codexState() {
  const ents = RECIPE_FLAT.map((r, i) => ({
    a: r[0], b: r[1], result: COMBO_KIND[r[2]], aName: DESC[r[0]][0], bName: DESC[r[1]][0],
    name: DESC[COMBO_KIND[r[2]]][0], text: DESC[COMBO_KIND[r[2]]][1],
    unlocked: r[2] <= 8 ? !!S.combos[r[2]] : !!S.recipes[i] // 第 0~8 列: 這種組合出現過; 不動如山兩列: 那條配方真的合成過
  }));
  return { entries: ents, foundCount: S.combos.filter(Boolean).length };
}
function drawScene() {
  const P = G.player, T = G.target;
  const playing = G.screen === 'play';
  const bi = G.bossIntro;
  Art.drawBackground(ctx, { paths: LV.paths.map(p => p.map(q => [q[0], q[1]])) });
  const sh = shopHolder();
  const dSh = sh ? dist(P, sh) : 1e9;
  if (playing && sh && dSh <= 170) Art.drawShopZone(ctx, { x: sh.x, y: sh.y, radius: 110, active: dSh <= 110 });
  G.trails.forEach(tr => { if (tr.pts.length >= 2) Art.drawHolyTrail(ctx, { points: tr.pts.map(p => [p[0], p[1], p[2]]), maxLife: 4 }); });
  G.pillars.forEach(p => { if (p.state === 'normal') Art.drawPillarRange(ctx, { x: p.x, y: p.y, radius: 150, kinds: resonantKinds(p), changeAge: p.changeAge, changeDuration: 0.5 }); });
  // 共鳴線(接收者含玩家)
  for (const r of receivers()) {
    r.ev.virt.forEach(v => {
      const p = v.pillar;
      Art.drawResonanceLine(ctx, { x1: p.x, y1: p.y, x2: r.x, y2: r.y, kind: v.kind, active: v.used });
    });
  }
  (G.frostAlly || []).forEach(u => Art.drawFrostAura(ctx, { x: u.x, y: u.y, radius: 70, owner: 'ally' }));
  (G.frostEnemy || []).forEach(u => Art.drawFrostAura(ctx, { x: u.x, y: u.y, radius: 70, owner: 'enemy' }));
  (G.healAlly || []).forEach(u => Art.drawHealAura(ctx, { x: u.x, y: u.y, radius: 100, owner: 'ally' }));
  (G.healEnemy || []).forEach(u => Art.drawHealAura(ctx, { x: u.x, y: u.y, radius: 100, owner: 'enemy' }));
  G.flags.forEach(f => Art.drawRallyFlag(ctx, { x: f.x, y: f.y, plantAge: f.plantAge, plantDuration: 0.3 }));
  G.coins.forEach(c => Art.drawCoin(ctx, { x: c.x, y: c.y, spawnAge: c.spawnAge, spawnDuration: 0.4 }));
  G.corpses.forEach(c => Art.drawCorpse(ctx, { kind: c.kind, x: c.x, y: c.y, life: c.life, maxLife: c.maxLife }));
  const frozen = playing && partsFrozen();
  G.parts.forEach(p => Art.drawGroundPart(ctx, { item: p.item, x: p.x, y: p.y, spawnAge: p.spawnAge, spawnDuration: 0.6, life: p.permanent ? 10 : p.life, maxLife: 10, permanent: p.permanent, frozen: !p.permanent && frozen, targeted: T === p }));
  if (playing && G.tutLevel) { // 第 1 關階段 7 / 14 的「放這裡」標示: 地面層, 在地上魂件之後、放置預覽之前
    const ph = placeHere();
    if (ph === 7) Art.drawPlaceHere(ctx, { kind: 'crossbow', x: PLACE_TOWER.x, y: PLACE_TOWER.y, t: G.time });
    else if (ph === 14) Art.drawPlaceHere(ctx, { kind: 'flag', x: PLACE_FLAG.x, y: PLACE_FLAG.y, t: G.time });
  }
  if (G.flag) { const i = flagInfo(); Art.drawPlacePreview(ctx, { kind: 'flag', x: i.x, y: i.y, valid: i.valid }); }
  else if (KITS[G.hand]) { const i = placeInfo(G.hand); Art.drawPlacePreview(ctx, { kind: i.kind, x: i.x, y: i.y, valid: i.valid }); }
  entityDrawList().forEach(o => o.f());
  // 魂件槽列(玩家沒有)
  const sl = (u, x, y) => Art.drawSoulSlots(ctx, { x, y, slots: u.slots.slice(), virtual: u.state === 'normal' ? virtOf(u) : [] });
  G.towers.forEach(u => { if (u.state === 'normal') sl(u, u.x, u.y - 44); });
  G.pillars.forEach(u => { if (u.state === 'normal') Art.drawSoulSlots(ctx, { x: u.x, y: u.y - 38, slots: u.slots.slice(), virtual: [] }); });
  G.soldiers.forEach(u => { if (visibleMobile(u)) sl(u, u.x, u.y - 36); });
  G.golems.forEach(u => { if (!visibleMobile(u)) return; if (u.team === 'ally') sl(u, u.x, u.y - 48); else Art.drawSoulSlots(ctx, { x: u.x, y: u.y - 48, slots: u.slots.slice(), virtual: [] }); });
  sl(G.castle, CASTLE_POS.x, CASTLE_POS.y - 76);
  G.enemies.forEach(e => { if (!e.dead && (T === e || stolenBy(e))) Art.drawSoulSlots(ctx, { x: e.x, y: e.y - e.half - 20, slots: e.slots.slice(), virtual: [] }); });
  if (G.rq.length) Art.drawRespawnQueue(ctx, { x: 780, y: 282, kind: G.rq[0].cat === 'soldier' ? 'soldier' : 'golem', progress: Math.min(1, G.rqT / 5), count: G.rq.length });
  if (playing && !G.popup && sh && dSh <= 110) Art.drawShopHint(ctx, { x: sh.x, y: Math.min(564, sh.y + sh.half + 18) });
  // 投射物與特效
  G.projs.forEach(p => Art.drawProjectile(ctx, { x: p.x, y: p.y, angle: p.angle, kind: p.kind, owner: p.owner }));
  G.orbs.forEach(o => Art.drawThunderOrb(ctx, { x: o.x, y: o.y, pulseAge: o.pulseAge, pulseDuration: 0.15 }));
  G.beams.forEach(b => Art.drawPierceBeam(ctx, { x1: b.x1, y1: b.y1, x2: b.x2, y2: b.y2, frost: b.frost, age: b.age, duration: 0.15 }));
  G.hbeams.forEach(b => Art.drawHealBeam(ctx, { x1: b.x1, y1: b.y1, x2: b.x2, y2: b.y2, age: b.age, duration: 0.3 }));
  G.areas.forEach(a => Art.drawAreaHit(ctx, { kind: a.kind, x: a.x, y: a.y, radius: a.radius, angle: a.angle, frost: a.frost, age: a.age, duration: 0.3 }));
  G.slashes.forEach(s => Art.drawMeleeSlash(ctx, { kind: s.kind, x: s.x, y: s.y, angle: s.angle, team: s.team, frost: s.frost, shock: s.shock, age: s.age, duration: 0.25 }));
  G.chains.forEach(c => Art.drawShockChain(ctx, { segments: c.segs.map(s => s.slice()), owner: c.owner, age: c.age, duration: 0.2 }));
  G.sparks.forEach(s => Art.drawHitSpark(ctx, { x: s.x, y: s.y, frost: s.frost, age: s.age, duration: 0.25 }));
  G.blinks.forEach(b => Art.drawBlink(ctx, { x1: b.x1, y1: b.y1, x2: b.x2, y2: b.y2, age: b.age, duration: 0.3 }));
  G.breaks.forEach(b => Art.drawUnitBreak(ctx, { kind: b.kind, x: b.x, y: b.y, age: b.age, duration: 0.5 }));
  if (G.steal) {
    const e = G.steal.enemy, L = e.slots.length;
    Art.drawStealLink(ctx, { x1: P.x, y1: P.y, x2: slotCenterX(L, G.steal.index, e.x), y2: e.y - e.half - 20, progress: Math.min(1, G.steal.t / 1.5) });
  }
  G.names.forEach(n => { if (n.unit.state !== 'gone' && n.unit.state !== 'away' && !n.unit.removed) Art.drawComboName(ctx, { x: n.unit.x, y: n.unit.y - n.unit.half - 44, name: n.name, isNew: n.isNew, age: n.age, duration: 1.5 }); });
  // 預警
  const nk = G.waveStarted;
  if (playing && nk < LV.waves.length && G.waveAt[nk] !== null) {
    const rem = G.waveAt[nk] - G.clock;
    if (rem > 0 && rem <= 6) {
      const used = {};
      LV.waves[nk].forEach(g => { used[g.sp] = true; });
      LV.spawns.forEach((s, i) => { if (used[i]) Art.drawSpawnWarning(ctx, { x: s.x, y: s.y, angle: s.ang, remaining: rem, total: 6 }); });
    }
  }
  // 教學推進的波次之前, 出怪點「!」標示: 第 1 關階段 3 的卡片出現起到第 1 波預警開始; 第 2 關階段 17 出現起到第 1 波預警開始、階段 24 出現起到第 2 波預警開始
  if (playing && G.tutDriven) {
    if (G.level === 1 && (briefMode() ? (G.tapp[5] || S.tut.done[5]) : (G.tapp[3] || S.tut.done[3])) && !G.warned[0]) Art.drawSpawnMark(ctx, { x: LV.spawns[0].x, y: LV.spawns[0].y, t: G.time });
    else if (G.level === 2 && ((G.tapp[17] && !G.warned[0]) || (G.tapp[24] && !G.warned[1]))) Art.drawSpawnMark(ctx, { x: LV.spawns[0].x, y: LV.spawns[0].y, t: G.time });
  }
  if (playing && !G.popup) {
    const lb = actionLabel();
    if (lb) Art.drawActionHint(ctx, { x: P.x, y: P.y + 30, label: lb });
  }
  if (playing && G.warn) Art.drawTutorialWarn(ctx, { x: clamp(P.x, 120, 904), y: Math.min(P.y + 60, 558), text: G.warn.text, age: G.warn.age, duration: 1.2 });
  drawArrow16(); // 階段 16 的搬運箭頭: 在 drawTutorialWarn 之後、泡泡之前
  drawTut(false);
  Art.drawHud(ctx, { level: G.level, levelName: LV.name, gold: G.gold });
  if (playing) {
    Art.drawWavePanel(ctx, panelState());
    if (G.banner && G.banner.age < 1.6) Art.drawWaveBanner(ctx, { wave: G.banner.wave, totalWaves: LV.waves.length, last: G.banner.last, boss: !!G.banner.boss, age: G.banner.age, duration: 1.6 });
    const bb = G.boss;
    if (bb && !bb.gone && !G.bossIntro) {
      const be = bb.e, d = ENEMY_DEF[bb.type];
      Art.drawBossBar(ctx, {
        x: 590, y: 24, type: bb.type, name: d.name, hp: bb.hiding ? 0 : Math.max(0, Math.ceil(be.hp)), maxHp: be.maxHp,
        hitAge: Math.min(0.15, be.hitAge), hitDuration: 0.15, healing: !bb.hiding && !!be.healing && be.hp < be.maxHp,
        showAge: bb.showAge, showDuration: 0.4, hiding: bb.hiding, hideAge: bb.hiding ? bb.hideAge : 0, hideDuration: 0.6
      });
    }
  }
  // 聲音開關圖示(第 13 輪): 關卡中右上角, 引導卡開著與觸控模式不畫
  if (playing && !G.guide && !touchOn()) Art.drawMuteIcon(ctx, { x: 992 + EDGE, y: 74, size: 32, muted: S.muted });
  if (G.popup) {
    Art.drawSlowMo(ctx);
    drawPopup();
  }
  drawTut(true);
  if (G.guide) Art.drawGuide(ctx, guideState());
  if (G.reveal) {
    const r = G.reveal;
    Art.drawComboReveal(ctx, {
      a: r.a, b: r.b, result: r.result, name: r.name, text: r.text, aName: r.aName, bName: r.bName, age: r.age,
      ready: r.age >= 1.5, closing: r.closing, closeAge: r.closeAge, closeDuration: 0.3
    });
  }
  if (bi) {
    const bd = ENEMY_DEF[bi.type];
    Art.drawBossIntro(ctx, { type: bi.type, name: bd.name, parts: bd.items.slice(), x: LV.boss.x, y: LV.boss.y, age: bi.age, duration: BOSS_INTRO.sec });
  }
  if (G.codex) Art.drawCodex(ctx, codexState());
  else if (G.paused) Art.drawPause(ctx, {});
  if (G.screen === 'result' && G.ac) {
    Art.drawAllClear(ctx, { age: G.ac.age, introDuration: AC_INTRO, stats: Object.assign({}, G.ac.stats), options: ['繼續', '重玩'], cursorIndex: G.ac.cursor });
  } else if (G.screen === 'result') {
    const hpShow = Math.max(0, G.castleHp);
    Art.drawResult(ctx, {
      win: G.win, level: G.level, levelName: LV.name, wave: G.wave, totalWaves: LV.waves.length,
      castleHp: hpShow, castleMaxHp: 20,
      comboCount: S.combos.filter(Boolean).length, options: G.options.slice(), cursorIndex: G.resultCursor
    });
  }
}
function drawPopup() {
  const p = G.popup;
  if (p.type === 'shop') {
    const items = shopItems().map(s => {
      const isP = s[0] === 'pillarKit';
      const count = G.pillars.length + (G.hand === 'pillarKit' ? 1 : 0);
      let state = G.gold < s[2] ? 'poor' : 'ok';
      if (isP && count >= LV.cap) state = 'max';
      if (shopLocked(s[0])) state = 'locked';
      return { item: s[0], name: s[1], price: s[2], state, count: isP ? count : null, cap: isP ? LV.cap : null };
    });
    Art.drawShopPopup(ctx, { items, cursorIndex: p.index, message: p.msg, shakeAge: p.shake, shakeDuration: 0.25 });
    return;
  }
  const t = p.target;
  let label = '';
  if (p.mode === 'replace') label = '互換';
  else {
    const c = p.cells[p.index];
    label = c.type === 'slot' ? (c.item ? '拿起' : '') : (c.type === 'demolish' ? '拆除' : '移防');
    if (c.locked && label) label = '教學期間不可操作';
  }
  Art.drawSoulPopup(ctx, {
    mode: p.mode, x: p.x, y: p.y, title: popupTitle(t), cells: p.cells.map(c => Object.assign({ locked: false }, c)), index: p.index,
    hand: p.mode === 'replace' ? G.hand : null, actionLabel: label, desc: popupDesc(p), shakeAge: p.shake, shakeDuration: 0.25
  });
}

// ───────── 主迴圈 ─────────
let lastTs = null;
function frame(ts) {
  requestAnimationFrame(frame);
  const raw = lastTs === null ? 0 : (ts - lastTs) / 1000;
  lastTs = ts;
  RT += Math.max(0, raw);
  const dt = clamp(raw, 0, 1 / 30);
  try {
    if (!(window.PVDX && PVDX.paused)) update(dt);
    render();
    if (window.PVDX) { ctx.setTransform(DPR, 0, 0, DPR, 0, 0); PVDX.draw(ctx); } // 觸控層用邏輯畫布座標
  } catch (err) { console.error(err); }
}
toTitle();
requestAnimationFrame(frame);
