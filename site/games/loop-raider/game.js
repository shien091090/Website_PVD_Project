// 回放冒險 - game.js (傳統腳本, 無 module)
// W: 設計區寬(玩法、判定、版面都用 1280); CW: 實際畫布寬(觸控裝置 1280~1680, 設計區置中, 兩側由 touch.js 塗黑放按鈕); OX: 設計區置中位移
var W = 1280, H = 720;
var CW = Math.max(1280, (window.Art && Art.canvas && Art.canvas.width) || 1280), OX = (CW - W) / 2;
var TS = 40, GW = 32, GH = 18, DT = 1 / 60;
var KINDS = ['wood', 'stone', 'crystal', 'core'];
// JUMP_V 是炸彈工的跳躍初速(關卡編輯器可達檢查讀它, 名稱與值不改); 劍士、獵人用 JUMP_V_HI(規則 42)
var GRAV = 2400, JUMP_V = 720, JUMP_V_HI = 850;
function jumpV(cls) { return cls === 'bomber' ? JUMP_V : JUMP_V_HI; }
var PW = 28, PH = 36;

// 規格與 interface 都沒有、需要的圖形: 集中在這裡(目前沒有需要的)
var Placeholder = {};

// ---------------------------------------------------------------- 常數資料
// 裝置代碼沿用舊道具代碼; 倉庫清單固定順序(疾時 / 聚木 / 聚石 / 聚晶 / 聚核 / 拾遺 / 驅獸 / 巢心)
var DEV_ORDER = ['gear', 'bagWood', 'bagStone', 'bagCrystal', 'coreLamp', 'glove', 'horn', 'heart'];
var SHOP = [
  { type: 'gear', cost: 150, max: 6 }, { type: 'bagWood', cost: 70, max: 4 }, { type: 'bagStone', cost: 70, max: 4 },
  { type: 'coreLamp', cost: 70, max: 4 }, { type: 'glove', cost: 100, max: 4 }, { type: 'horn', cost: 120, max: 4 }
];
var SITE_COST = [[3, 20, 40], [3, 40, 80], [16, 50, 80], [30, 100, 200], [30, 120, 250], [40, 200, 260], [60, 300, 400], [0, 0, 0]];
var UNLOCK_COST = [0, 10, 30, 50, 150, 450, 700, 0];
var PARENTS = [[], [0], [0], [1], [1], [2], [2], [3, 4, 5, 6]];
// 關卡卡片 0~7; 營地建築卡 8 = 升級所、9 = 商店
var CARD_POS = [[392, 281], [616, 131], [616, 431], [840, 56], [840, 206], [840, 356], [840, 506], [1064, 281], [62, 150], [62, 430]];
var UP_SPEED = [1, 1.08, 1.16, 1.24], UP_CD = [1, 0.85, 0.7, 0.55], UP_HP = [3, 4, 5, 6];
var SPEED_COST = [10, 100, 500], HP_COST = [20, 300, 600], CD_COST = [15, 150, 300], ATK_COST = [50, 200, 500];
var RECRUIT_COST = 50;
var CLS = { sword: { speed: 260 }, hunter: { speed: 270 }, bomber: { speed: 230 } };
var CLS_LIST = ['sword', 'hunter', 'bomber'];
var THEMES = ['forest', 'forest', 'forest', 'cliff', 'cliff', 'mine', 'mine', 'salt'];
var LEVEL_NAMES = ['林間小徑', '藤蔓斜坡', '野豬谷地', '岩柱塔', '吊橋峽谷', '礦車隧道', '晶礦深井', '鹽原斷門'];
var MUSIC_OF = { forest: 'forest', cliff: 'cliff', mine: 'mine', salt: 'boss' };

// 怪物數值: hp / shield / drop(每 1 HP 掉的素材) / core(擊倒魔核) / 框
var MDEF = {
  boar: { w: 48, h: 32, hp: 4, drop: 'wood', core: 1 },
  frog: { w: 32, h: 28, hp: 3, drop: 'wood', core: 1 },
  bee: { w: 32, h: 32, hp: 2, drop: 'crystal', core: 1 },
  thorn: { w: 40, h: 48, hp: 5, drop: 'wood', core: 1 },
  ram: { w: 44, h: 36, hp: 5, drop: 'stone', core: 1 },
  hawk: { w: 40, h: 28, hp: 3, drop: 'crystal', core: 1 },
  lizard: { w: 36, h: 24, hp: 3, drop: 'stone', core: 1 },
  shield: { w: 32, h: 40, hp: 4, sh: 3, drop: 'stone', core: 1 },
  beetle: { w: 32, h: 24, hp: 2, drop: 'crystal', core: 1 },
  bat: { w: 24, h: 20, hp: 1, drop: 'crystal', core: 1 },
  mother: { w: 64, h: 56, hp: 14, drop: 'wood', core: 6 }
};
var MOTHER_DROP = { forest: 'wood', cliff: 'stone', mine: 'crystal' };

// ---------------------------------------------------------------- 關卡資料
// 地形與物件在 levels.js(window.LEVEL_DEFS, index.html 先載入), 由關卡編輯器 editor/index.html 編輯; 欄位格式見該檔開頭說明
// tiles: GH 行 × GW 字("." 空、"#" 實心、"L" 巢穴實心); 物件格座標 [c, r]; mons 列的意思依種類不同(見 levels.js)
var LEVEL_DEFS = window.LEVEL_DEFS || [];
var LEVELS = [];
function buildLevel(idx, d) {
  var g = [], r, c;
  for (r = 0; r < GH; r++) {
    var row = (d.tiles && d.tiles[r]) || '';
    g.push(new Array(GW).fill(0));
    for (c = 0; c < GW; c++) { var ch = row.charAt(c); g[r][c] = ch === '#' ? 1 : (ch === 'L' ? 2 : 0); }
  }
  var L = { idx: idx, name: LEVEL_NAMES[idx], theme: THEMES[idx], base: g, spikes: d.spikes, cracks: d.cracks, sites: [], lairs: [], picks: [], mons: [], chest: null, cave: null };
  d.sites.forEach(function (s, i) {
    var st = { kind: s.kind, role: s.role, cells: s.cells, sign: s.sign, fog: s.fog, cost: SITE_COST[idx][i], gate: null, lair: null };
    st.cells.forEach(function (q) { g[q[1]][q[0]] = 0; });
    if (s.kind === 'nestgate') {
      st.gate = { x: (s.gate[0] + 1) * TS, y: (s.gate[1] + 1) * TS };
      st.lair = { x: s.lair[0] * TS, y: s.lair[1] * TS, w: s.lair[2] * TS, h: s.lair[3] * TS };
      L.lairs.push(st.lair);
    }
    // 工程中心(迷霧推開圓心)與框選範圍(格)
    var x0 = 99, y0 = 99, x1 = -1, y1 = -1, cx0 = 99, cy0 = 99, cx1 = -1, cy1 = -1;
    var pts = st.cells.slice();
    if (st.gate) { pts.push([s.gate[0], s.gate[1]], [s.gate[0] + 1, s.gate[1] + 1]); }
    pts.forEach(function (q) { cx0 = Math.min(cx0, q[0]); cy0 = Math.min(cy0, q[1]); cx1 = Math.max(cx1, q[0]); cy1 = Math.max(cy1, q[1]); });
    st.ox = (cx0 + cx1 + 1) * TS / 2; st.oy = (cy0 + cy1 + 1) * TS / 2;
    pts.forEach(function (q) { x0 = Math.min(x0, q[0]); y0 = Math.min(y0, q[1]); x1 = Math.max(x1, q[0] + 1); y1 = Math.max(y1, q[1] + 1); });
    st.fog.forEach(function (f) { x0 = Math.min(x0, f[0]); y0 = Math.min(y0, f[1]); x1 = Math.max(x1, f[0] + f[2]); y1 = Math.max(y1, f[1] + f[3]); });
    st.box = [x0, y0, x1 - x0, y1 - y0];
    st.maxR = 0;
    st.fog.forEach(function (f) {
      [[f[0], f[1]], [f[0] + f[2], f[1]], [f[0], f[1] + f[3]], [f[0] + f[2], f[1] + f[3]]].forEach(function (p) {
        st.maxR = Math.max(st.maxR, Math.hypot(p[0] * TS - st.ox, p[1] * TS - st.oy));
      });
    });
    st.maxR += 4;
    L.sites.push(st);
  });
  function zOf(c, r) {
    var i, k;
    for (i = 0; i < L.sites.length; i++) {
      var fg = L.sites[i].fog;
      for (k = 0; k < fg.length; k++) if (c >= fg[k][0] && c < fg[k][0] + fg[k][2] && r >= fg[k][1] && r < fg[k][1] + fg[k][3]) return i;
    }
    // 斷橋捷徑蓋住的坑底: 橋修好後那裡進不去, 東西只在未修時存在(z <= -2)
    for (i = 0; i < L.sites.length; i++) {
      var st = L.sites[i];
      if (st.kind === 'bridge' && st.role === 'shortcut' && r >= 16 && st.cells.some(function (q) { return q[0] === c; })) return -2 - i;
    }
    return -1;
  }
  d.picks.forEach(function (p) { L.picks.push({ id: L.picks.length, kind: p[0], x: p[1] * TS + 20 + (p[3] || 0), y: p[2] * TS + 20, z: zOf(p[1], p[2]) }); });
  var mid = 0;
  d.mons.forEach(function (m) {
    var t = m[0], z = zOf(m[1], t === 'bee' || t === 'hawk' || t === 'bats' ? m[2] : m[2] - 1), x = m[1] * TS + 20, y;
    var brood = z >= 0 && L.sites[z].kind === 'nestgate' && t !== 'mother';
    if (t === 'bee' || t === 'hawk') y = m[2] * TS + 20;
    else if (t === 'bats') { L.mons.push({ id: mid++, type: 'bats', x: x, y: m[2] * TS + 20, z: z }); return; }
    else if (t === 'lizard') { y = (m[2] + 1) * TS + 12; z = zOf(m[1], m[2]); }
    else y = m[2] * TS - MDEF[t].h / 2;
    L.mons.push({ id: mid++, type: t, x: x, y: y, z: z, brood: brood, kind: m[3] || null });
  });
  if (d.chest) L.chest = { x: d.chest[0] * TS + 20, y: d.chest[1] * TS - 18, item: d.chest[2], z: zOf(d.chest[0], d.chest[1] - 1) };
  L.start = { x: d.start[0] * TS + 20, y: d.start[1] * TS - PH / 2 };
  L.goal = { x: d.goal[0] * TS + 20, y: d.goal[1] * TS - 40 };
  if (idx === 7) { L.goal.hidden = true; L.goal.x = 640; }
  return L;
}
for (var li = 0; li < LEVEL_DEFS.length; li++) LEVELS.push(buildLevel(li, LEVEL_DEFS[li]));

function siteSolid(site, repaired) { return (site.kind === 'rubble' || site.kind === 'nestgate') ? !repaired : repaired; }
function gateCells(st) { var c = st.gate.x / TS - 1, r = st.gate.y / TS - 1; return [[c, r], [c + 1, r], [c, r + 1], [c + 1, r + 1]]; }
// 目前修復狀態下的實心格表(不含裂岩牆)
function makeSolid(L, rep) {
  var s = [], r;
  for (r = 0; r < GH; r++) s.push(L.base[r].map(function (v) { return v ? 1 : 0; }));
  L.sites.forEach(function (st, i) {
    if (!siteSolid(st, rep[i])) return;
    (st.kind === 'nestgate' ? gateCells(st) : st.cells).forEach(function (q) { s[q[1]][q[0]] = 1; });
  });
  return s;
}
function isSol(s, c, r) {
  if (c < 0 || c >= GW) return true;
  if (r < 0 || r >= GH) return false;
  return s[r][c] === 1;
}
// 物件所屬工程是否已修好(-1 = 主路)
function zOk(z, rep) { if (z === -1) return true; if (z <= -2) return !rep[-2 - z]; return !!rep[z]; }

// ---------------------------------------------------------------- 全域狀態
var G = null, R = null, SOL = null;
var keys = { left: false, right: false, up: false };
var edge = { z: false, x: false, down: false, jump: false, jumpRel: false };
function isTouch() { return !!(window.PVDX && window.PVDX.on); }
function snd(name) { if (!name) return; try { if (window.Sound && Sound.play) Sound.play(name); } catch (e) { if (window.console) console.error(e); } }
var sndThrottle = {};
function sndT(name, gap) {
  var t = G ? G.t : 0;
  if (sndThrottle[name] !== undefined && t - sndThrottle[name] < gap) return;
  sndThrottle[name] = t; snd(name);
}
function zeros() { return { wood: 0, stone: 0, crystal: 0, core: 0 }; }

function newGame() {
  var z8 = function (v) { var a = []; for (var i = 0; i < 8; i++) a.push(typeof v === 'function' ? v() : v); return a; };
  G = {
    screen: 'title', paused: false, t: 0, gt: 0,
    stock: zeros(),
    opened: [true, false, false, false, false, false, false, false],
    rec: z8(null), repaired: z8(function () { return [false, false, false]; }), repT: z8(function () { return [-99, -99, -99]; }),
    recruited: { sword: true, hunter: false, bomber: false },
    // 裝置倉庫 = 每種擁有座數(owned) − 已安裝座數; slots[l][i] 是裝置代碼或 null
    lastCls: z8(null), owned: {}, slots: z8(function () { return [null, null]; }),
    up: { speed: 0, hp: 0, cd: 0, atk: 0 }, chestTaken: z8(false), heartTaken: z8(false), repairVer: z8(0),
    shopLeft: SHOP.map(function (s) { return s.max; }), shopSel: 0, unlockFx: null,
    mapSel: 0, panel: null, upRow: 0, upSel: 0,
    bump: { wood: 1, stone: 1, crystal: 1, core: 1 }, flights: [],
    rp: z8(function () { return { pos: 0, cursor: 0 }; }),
    res: null, pendingRec: null, resLevel: -1,
    lockT: 0, lockFn: null, clearedAny: false, bossBeaten: false, ending: null, kills: 0,
    tot: { run: zeros(), replay: zeros(), clearBonus: zeros() },
    musicNow: null, timers: [], muted: false, endTime: 0, fPanel: 1, fSnd: 1, resFirst: false
  };
  R = null; SOL = null; thumbCache = {};
  tutReset();
}

function maxHp() { return UP_HP[G.up.hp]; }
function itemCount(l, type) {
  var n = 0;
  G.slots[l].forEach(function (it) { if (it === type) n++; });
  return n;
}
function installedCount(type) {
  var n = 0;
  G.slots.forEach(function (s) { s.forEach(function (it) { if (it === type) n++; }); });
  return n;
}
// 倉庫裡還沒安裝的座數
function storeOf(type) { return (G.owned[type] || 0) - installedCount(type); }
function storeTotal() { var n = 0; DEV_ORDER.forEach(function (t) { n += storeOf(t); }); return n; }
function addOwned(type) { G.owned[type] = (G.owned[type] || 0) + 1; }
// 即時入帳與回放重算共用同一個加成函式
function amountFor(l, src, base) {
  if (src === 'pick') return base + itemCount(l, 'glove');
  return base * (1 + itemCount(l, 'horn') + itemCount(l, 'heart'));
}
function clearBonus(l) {
  return { wood: 4 * itemCount(l, 'bagWood'), stone: 3 * itemCount(l, 'bagStone'), crystal: 2 * itemCount(l, 'bagCrystal'),
    core: 2 * itemCount(l, 'coreLamp') + 4 * itemCount(l, 'heart') };
}
function speedMul(l) { return 1 + 0.25 * itemCount(l, 'gear'); }
function r1(v) { return Math.round(v * 10) / 10; }
function rateOf(l, rec) {
  var tot = zeros(), cb = clearBonus(l), out = {};
  rec.events.forEach(function (e) { tot[e.kind] += amountFor(l, e.src, e.n); });
  KINDS.forEach(function (k) {
    tot[k] += cb[k];
    out[k] = r1(tot[k] * 3600 / Math.max(1, rec.N) * speedMul(l));
  });
  return out;
}
function totalRates() {
  var t = zeros();
  for (var l = 0; l < 8; l++) if (G.rec[l]) { var r = rateOf(l, G.rec[l]); KINDS.forEach(function (k) { t[k] += r[k]; }); }
  KINDS.forEach(function (k) { t[k] = r1(t[k]); });
  return t;
}

// ---------------------------------------------------------------- 新手教學(polish 第 5 輪整個重做)
// 流程只走一遍: 地圖 1 選關 → 準備 1 開始挑戰 → 演出 1~6(第一次進第 1 關暫停自動播)→ 自由遊玩 →
// 第一次過關回大地圖(鎖住): 地圖 2(2a / 2b)→ 地圖 3 升級所 → 地圖 4 商店 → 總結板。
// 計時一律用 T.clk(暫停時不走); 逐字規則與美術共用: 每字 0.077、{Z} 0.16、, ， 、 ! ！ 。 後多停 0.18、彈出 0.32 後開始打字、最後一字後再 0.32 才算顯示完
// 第 6 輪: 逐字 0.045 / {Z} 0.10 / 標點後多停 0.12 / 彈出 0.25 / 最後一字後 0.25 算顯示完, 全段按 Z 推進
var TUT_CHAR = 0.045, TUT_KEYDUR = 0.10, TUT_PUNCT = 0.12, TUT_POP = 0.25, TUT_OUT = 0.25, CP_WAIT = 3.2, CP_DOCK = 0.95;
var T = null;
function tutReset() {
  T = { off: false, clk: 0, stage: null, scene: null, step: '', pick: 0, prep: 0, demo: 0, rep: 0,
    bub: null, arrows: [], arrowsT: 0.25, swapFn: null, spot: null, eff: null, gate: null,
    ds: 0, dsT: 0, cpT: 0, dockT: null, fade6: -1, pend6: false, demoSnd: {},
    lockMap: false, flightSeen: false, branch: null, sum: null };
}
// 第 1 關教學期間(只在第 1 關還沒過關時): 擋終點(規則 2a)、重生(規則 3a)、操作方式面板
function tutL1() { return !T.off && !!R && R.l === 0 && !G.rec[0]; }

// ---- 逐字時間表: 回傳每個字出現的時刻與最後一個字的時刻
function typeInfo(s) {
  var times = [], t = 0, i = 0, pend = 0;
  while (i < s.length) {
    var ch = s.charAt(i), dur = TUT_CHAR;
    if (ch === '[' || ch === ']' || ch === '\n') { i++; continue; }
    if (ch === '{') { var j = s.indexOf('}', i); if (j > i) { dur = TUT_KEYDUR; i = j; ch = ''; } }
    t += pend + dur; pend = 0;
    times.push(t);
    if (ch !== '' && ',，、!！。'.indexOf(ch) >= 0) pend = TUT_PUNCT;
    i++;
  }
  return { times: times, last: times.length ? times[times.length - 1] : 0 };
}
function typedCount(info, tt) {
  var n = 0, k;
  if (tt < 0) return 0;
  for (k = 0; k < info.times.length; k++) if (info.times[k] <= tt) n++;
  return n;
}
function tutArrow(tipX, tipY, aimX, aimY, side, along) { return { tipX: tipX, tipY: tipY, aimX: aimX, aimY: aimY, side: side, along: along }; }
// 開一個泡泡(+ 箭頭): scene 'map' | 'panel' | 'play' 決定哪個畫面才畫
function tutOpen(step, scene, text, bx, by, place, arrows, nextLabel) {
  T.bub = { step: step, text: text, cont: null, contT: null, x: bx, y: by, place: place, age: 0, outT: null, next: nextLabel || null,
    info: typeInfo(text), cinfo: null, done: false, doneT: 0, typed: 0, ctyped: 0 };
  T.step = step; T.scene = scene; T.arrows = arrows || []; T.arrowsT = 0; T.swapFn = null;
  snd('tut_pop');
}
// 換句演出: 舊泡泡縮回 0.25 秒後執行 fn(沒有泡泡就直接執行)
function tutSwap(fn) {
  var b = T.bub;
  if (!b) { fn(); return; }
  if (b.outT !== null) return;
  b.outT = 0; T.swapFn = fn;
}
function tutAddCont(s) {
  var b = T.bub;
  if (!b || b.cont !== null) return;
  b.cont = s; b.contT = 0; b.cinfo = typeInfo(s); b.done = false; b.doneT = 0;
}
function bubDone(b) {
  if (b.cont !== null) return b.contT >= b.cinfo.last + TUT_POP;
  return b.age - TUT_POP >= b.info.last + TUT_POP;
}
function bubTick(dt) {
  var b = T.bub;
  T.arrowsT = Math.min(0.25, T.arrowsT + dt);
  if (!b) return;
  if (b.outT !== null) {
    b.outT += dt;
    if (b.outT >= TUT_OUT) { var f = T.swapFn; T.swapFn = null; T.bub = null; if (f) f(); }
    return;
  }
  b.age += dt;
  var n = typedCount(b.info, b.age - TUT_POP);
  if (n > b.typed) { b.typed = n; sndT('tut_type', 0.09); }
  if (b.cont !== null) {
    b.contT += dt;
    n = typedCount(b.cinfo, b.contT);
    if (n > b.ctyped) { b.ctyped = n; sndT('tut_type', 0.09); }
  }
  var d = bubDone(b);
  b.doneT = d ? b.doneT + dt : 0;
  b.done = d;
}
function tutSceneOk() {
  var sc = G.screen;
  if (T.scene === 'map') return sc === 'map';
  if (T.scene === 'panel') return sc === 'levelPanel' && !!G.panel && !G.panel.sub;
  if (T.scene === 'play') return sc === 'play' && !!R && R.state === 'run';
  return false;
}
// 回傳 drawTutorial 的 state, 沒有就回 null
function tutView() {
  if (T.off || !tutSceneOk()) return null;
  var b = T.bub;
  if (!b && !T.arrows.length && !T.spot) return null;
  var s = { step: T.step, arrows: T.arrows, arrowsT: T.arrowsT, bubble: null, spot: null, doneT: T.eff ? Math.min(0.3, T.eff.t) : 0.3, doneDur: 0.3, t: T.clk };
  if (b) {
    s.bubble = { x: b.x, y: b.y, place: b.place, text: b.text, typeT: b.age - TUT_POP, cont: b.cont, contT: b.contT,
      next: b.next ? { key: 'z', label: b.next, show: b.done && b.outT === null } : null, inT: Math.min(TUT_POP, b.age), outT: b.outT };
  }
  if (T.spot) s.spot = { holes: T.spot.holes, k: T.spot.k };
  return s;
}
function lockFor(sec, fn) { G.lockT = sec; G.lockFn = fn; }

// ---- 地圖 1 / 準備 1(按 Z 後先播 0.3 秒完成特效, 播完才換畫面)
function tutMapPickOpen() {
  T.stage = 'pick';
  // 觸控模式第 1 關卡在 (290,274)~(450,456), 中心 x 370: 板子與箭頭照電腦版相對卡片的位置平移
  if (isTouch()) tutOpen('map_pick', 'map', '選擇這一關', 330, 127, 'above', [tutArrow(370, 256, 370, 365, 'bottom', 330)], '進入');
  else tutOpen('map_pick', 'map', '選擇這一關', 440, 134, 'above', [tutArrow(480, 263, 480, 349, 'bottom', 440)], '進入');
}
function tutPrepOpen() {
  T.stage = 'prep';
  tutOpen('prep_start', 'panel', '直接按{Z}開始關卡吧!', 518, 596, 'below', [tutArrow(863, 536, 967, 498, 'right', 641)]);
}
// 在第 1 關卡片按 Z: 回傳 true = 由教學接手(播完特效再開準備頁)
function tutPickZ() {
  if (T.off || T.stage !== 'pick' || T.eff) return false;
  T.pick = 2; T.eff = { t: 0 };
  lockFor(0.3, function () { T.eff = null; T.stage = null; T.bub = null; T.arrows = []; openPanel(0); });
  return true;
}
// 在開始挑戰列按 Z: 回傳 true = 由教學接手(播完特效再進關)
function tutPrepZ() {
  if (T.off || T.stage !== 'prep' || T.eff) return false;
  T.prep = 2; T.eff = { t: 0 };
  lockFor(0.3, function () { T.eff = null; T.stage = null; T.bub = null; T.arrows = []; startChallenge(); });
  return true;
}

// ---- 演出 1~6(第一次進第 1 關: 世界暫停, 自動依序播; 除 Esc、M 外輸入全部忽略)
function outFog(z) { return z < 0 || (z >= 0 && !!R.rep[z]); }
function nearPickOut(kind) {
  var best = null, bd = 1e9, s = R.L.start;
  R.L.picks.forEach(function (d) {
    if (d.kind !== kind || !outFog(d.z) || !zOk(d.z, R.rep) || R.taken[d.id] !== undefined) return;
    var dd = Math.hypot(d.x - s.x, d.y - s.y);
    if (dd < bd) { bd = dd; best = d; }
  });
  return best;
}
function nearMonOut() {
  var best = null, bd = 1e9, s = R.L.start;
  R.mons.forEach(function (m) {
    if (!m.alive || !outFog(m.z)) return;
    var dd = Math.hypot(m.x - s.x, m.y - s.y);
    if (dd < bd) { bd = dd; best = m; }
  });
  return best;
}
// 每處未修工程的聚光燈光洞: 工程牌 + 結構格外接矩形 + 迷霧矩形
function spotHoles() {
  var holes = [];
  R.L.sites.forEach(function (st, i) {
    if (R.rep[i]) return;
    var rects = [], sx = st.sign[0] * TS + 20, sy = st.sign[1] * TS - 24;
    rects.push([sx - 18, sy - 24, 36, 48]);
    var cells = st.kind === 'nestgate' ? gateCells(st) : st.cells, c0 = 99, r0 = 99, c1 = -1, r1b = -1;
    cells.forEach(function (q) { c0 = Math.min(c0, q[0]); r0 = Math.min(r0, q[1]); c1 = Math.max(c1, q[0] + 1); r1b = Math.max(r1b, q[1] + 1); });
    if (c1 > c0) rects.push([c0 * TS, r0 * TS, (c1 - c0) * TS, (r1b - r0) * TS]);
    st.fog.forEach(function (f) { rects.push([f[0] * TS, f[1] * TS, f[2] * TS, f[3] * TS]); });
    rects = rects.slice(0, 6);
    var x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    rects.forEach(function (q) { x0 = Math.min(x0, q[0]); y0 = Math.min(y0, q[1]); x1 = Math.max(x1, q[0] + q[2]); y1 = Math.max(y1, q[1] + q[3]); });
    holes.push({ rects: rects, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, site: i });
  });
  return holes.slice(0, 3);
}
// 工程牌上方 120px 內有實心格(沒空間從上方指)
function solidAboveSign(st) {
  var col = st.sign[0], top = st.sign[1] * TS - 48, r;
  for (r = Math.max(0, Math.floor((top - 120) / TS)); r * TS < top; r++) if (isSol(SOL, col, r)) return true;
  return false;
}
function demoGo(n) {
  var L = R.L, p = R.p, g = L.goal;
  T.ds = n; T.dsT = 0;
  if (n === 1) {
    // 角色中心 (100, 462): 板子 (290, 330)、尖端 (120, 438)
    tutOpen('demo_you', 'play', '這是[你]', p.x + 190, p.y - 132, 'above', [tutArrow(p.x + 20, p.y - 24, p.x, p.y, 'bottom', p.x + 130)], '繼續');
  } else if (n === 2) {
    T.cpT = 0; T.dockT = null; T.bub = null; T.arrows = []; T.demoSnd = {}; snd('tut_panel');
  } else if (n === 3) {
    var arr = [];
    ['wood', 'stone', 'crystal'].forEach(function (k) {
      var d = nearPickOut(k);
      if (!d) return;
      // 板子 (630, 336) 估寬 465~795: 目標在板子左邊 → 從左緣出發, 否則從下緣出發
      if (d.x < 465) arr.push(tutArrow(d.x + 10, d.y - 18, d.x, d.y, 'left', 300));
      else arr.push(tutArrow(d.x, d.y - 18, d.x, d.y, 'bottom', Math.max(477, Math.min(783, d.x + 22))));
    });
    if (!arr.length) { demoGo(4); return; }
    tutOpen('demo_mat', 'play', '這是[素材],多多收集,\n不同素材有不同用途', 630, 336, 'above', arr, '繼續');
  } else if (n === 4) {
    var m = nearMonOut();
    if (!m) { demoGo(5); return; }
    tutOpen('demo_mon', 'play', '打怪也會\n[掉落素材]', m.x + 280, m.y - 48, 'above', [tutArrow(m.x + 30, m.y - 24, m.x, m.y, 'left', m.y - 116)], '繼續');
  } else if (n === 5) {
    if (g.hidden) { demoGo(6); return; }
    tutOpen('demo_goal', 'play', '[終點],抵達後就可以結算關卡了', g.x - 20, g.y - 260, 'above', [tutArrow(g.x + 8, g.y - 46, g.x, g.y, 'bottom', g.x + 3)], '繼續');
  } else if (n === 6) {
    var holes = spotHoles();
    if (!holes.length) { demoGo(7); return; }
    T.spot = { holes: holes, k: 0 }; T.fade6 = -1; T.pend6 = true; T.step = 'demo_sites'; T.scene = 'play'; T.bub = null; T.arrows = [];
    snd('tut_spot');
  } else if (n === 7) {
    T.spot = null; T.fade6 = -1; T.pend6 = false;
    tutOpen('demo_start', 'play', '開始遊玩吧!', 640, 290, 'above', [], '繼續');
  }
}
function demoEnd() {
  T.demo = 2; R.demo = false; T.ds = 0; T.spot = null; T.arrows = []; T.bub = null; T.stage = null; T.fade6 = -1; T.pend6 = false;
  clearKeys(); R.lastSnap = snap(); acc = 0;
}
// 演出 2 示範(T 0.6~3.0): 角色只在原地做動作(世界不模擬), 示範完回到起點原姿勢
function demoPose(cp) {
  var S = snap(), pp = S.p, tl, u;
  if (cp >= 0.6 && cp < 3.0) {
    if (cp < 1.2) {
      tl = cp - 0.6;
      if (tl < 0.25) { pp.facing = -1; pp.pose = 'run'; pp.poseT = tl; pp.x += -20 * (tl / 0.25); }
      else if (tl < 0.5) { pp.facing = 1; pp.pose = 'run'; pp.poseT = tl - 0.25; pp.x += -20 + 40 * ((tl - 0.25) / 0.25); }
      else { pp.facing = 1; pp.x += 20 * Math.max(0, 1 - (tl - 0.5) / 0.1); }
    } else if (cp < 1.8) {
      tl = cp - 1.2; u = tl / 0.5;
      if (u < 1) { pp.y -= 60 * 4 * u * (1 - u); pp.pose = u < 0.5 ? 'rise' : 'fall'; pp.poseT = tl; }
    } else if (cp < 2.4) {
      tl = cp - 1.8;
      if (tl >= 0.05 && tl < 0.2) { pp.pose = 'slash'; pp.poseT = tl - 0.05; pp.sw = 0; }
      else if (tl >= 0.3 && tl < 0.45) { pp.pose = 'slash'; pp.poseT = tl - 0.3; pp.sw = 1; }
    } else {
      tl = cp - 2.4;
      if (tl < 0.2) { pp.pose = 'dash'; pp.poseT = tl; pp.x += pp.facing * 40 * (tl / 0.2); }
      else if (tl < 0.45) { pp.x += pp.facing * 40 * (1 - (tl - 0.2) / 0.25); }
    }
  }
  R.lastSnap = S;
}
// 演出 2 的音效: 跳 / 揮砍兩下 / 衝刺各在動作開始那一刻播一次(用旗標, 不用前後幀比較)
function demoSounds(cp) {
  var ev = [[1.2, 'jump'], [1.85, 'slash'], [2.1, 'slash'], [2.4, 'dash']];
  ev.forEach(function (e, i) {
    if (!T.demoSnd[i] && cp >= e[0]) { T.demoSnd[i] = true; snd(e[1]); }
  });
}
function demoTick(dt) {
  var ds = T.ds;
  T.dsT += dt;
  if (ds === 2) {
    T.cpT = Math.min(CP_WAIT, T.cpT + dt);
    demoSounds(T.cpT);
    demoPose(T.cpT);
    if (T.dockT !== null) {
      T.dockT = Math.min(CP_DOCK, T.dockT + dt);
      if (T.dockT >= 0.7 && !T.demoSnd.dock) { T.demoSnd.dock = true; snd('tut_dock'); }
      if (T.dockT >= CP_DOCK) { R.lastSnap = snap(); demoGo(3); }
    }
    return;
  }
  if (ds === 6) {
    if (T.fade6 >= 0) {
      T.fade6 += dt;
      if (T.spot) T.spot.k = Math.max(0, 1 - T.fade6 / 0.5);
      if (T.fade6 >= 0.5) demoGo(7);
      return;
    }
    if (T.spot) T.spot.k = Math.min(1, T.dsT / 0.6);
    // 聚光燈淡入 0.6 秒後開始打字: 板子提早彈出
    if (T.pend6 && T.dsT >= 0.6 - TUT_POP) {
      T.pend6 = false;
      tutOpen('demo_sites', 'play', '收集素材後可以[修復通道],\n解鎖更多可以去的地方', 390, 330, 'above', [], '繼續');
    }
  }
}
// 演出中的 Z(inputDown 在 R.demo 時只放行這一顆): 顯示完才接受
function tutDemoZ() {
  var ds = T.ds, b = T.bub;
  if (ds === 2) {
    if (T.cpT >= CP_WAIT && T.dockT === null) { T.dockT = 0; snd('tut_next'); }
    return;
  }
  if (!b || b.outT !== null || !b.done || !b.next) return;
  if (ds === 6) {
    if (T.fade6 >= 0) return;
    snd('tut_next'); T.fade6 = 0; tutSwap(function () { T.arrows = []; });
    return;
  }
  if (ds === 7) { snd('tut_go'); tutSwap(demoEnd); return; }
  snd('tut_next');
  tutSwap(function () { demoGo(ds + 1); });
}

// ---- 規則 2a: 第 1 關教學關的過關條件(迷霧外的地上素材撿完、迷霧外的怪打完)
function gateTarget() {
  var p = R.p, best = null, bd = 1e9;
  R.L.picks.forEach(function (d) {
    if (!outFog(d.z) || !zOk(d.z, R.rep) || R.taken[d.id] !== undefined) return;
    var dd = Math.hypot(d.x - p.x, d.y - p.y);
    if (dd < bd) { bd = dd; best = { kind: 'pick', ref: d }; }
  });
  if (best) return best;
  R.mons.forEach(function (m) {
    if (!m.alive || !outFog(m.z)) return;
    var dd = Math.hypot(m.x - p.x, m.y - p.y);
    if (dd < bd) { bd = dd; best = { kind: 'mon', ref: m }; }
  });
  return best;
}
// 擋終點的箭頭與泡泡位置(目標會動, 每幀重算)
function gateLayout(g) {
  var r = g.ref, isPick = g.kind === 'pick', cx = r.x, cy = r.y;
  var top = isPick ? cy - 12 : cy - r.h / 2 - 13, bot = isPick ? cy + 12 : cy + r.h / 2;
  var s = cx < 640 ? 1 : -1, tipY = top - 6, y = tipY - 140;
  if (y - 90 < 46) {
    tipY = bot + 6;
    return { x: cx + 90 * s, y: tipY + 140, place: 'below', arrow: tutArrow(cx, tipY, cx, cy, 'top', cx + 50 * s) };
  }
  return { x: cx + 90 * s, y: y, place: 'above', arrow: tutArrow(cx, tipY, cx, cy, 'bottom', cx + 50 * s) };
}
function gateText(g) { return g.kind === 'pick' ? '先撿[素材]再結算關卡吧!' : '先打死[怪物]再結算關卡吧!'; }
// 站在旗子上按 ↓: 回傳 true = 條件未達成, 擋下不過關
function tutGateCheck() {
  if (!tutL1()) return false;
  var g = gateTarget();
  if (!g) return false;
  var ly = gateLayout(g);
  T.gate = g; T.stage = null;
  snd('ui_deny');
  tutOpen('gate', 'play', gateText(g), ly.x, ly.y, ly.place, [ly.arrow]);
  return true;
}
function gateTick() {
  var g = T.gate;
  if (!g) return;
  var b = T.bub;
  if (!tutL1() || R.state !== 'run' || !b || b.step !== 'gate') { T.gate = null; if (b && b.step === 'gate') { T.bub = null; T.arrows = []; } return; }
  if (b.outT !== null) return;
  var gone = g.kind === 'pick' ? R.taken[g.ref.id] !== undefined : !g.ref.alive;
  if (gone || (b.done && b.doneT >= 2.0)) { tutSwap(function () { T.arrows = []; T.gate = null; }); return; }
  var ly = gateLayout(g);
  b.x = ly.x; b.y = ly.y; b.place = ly.place; T.arrows = [ly.arrow];
}

// ---- 過關回大地圖後的接續介紹(鎖住大地圖操作)
function tutStartReplay() {
  if (T.off || T.rep) return;
  T.rep = 1; T.stage = 'replay'; T.lockMap = true; T.flightSeen = false; T.branch = null;
  // 觸控模式: 照電腦版相對第 1 關卡(中心 (370,365)、卡底 456)的位置平移; 大地圖被教學鎖住時不畫方向鍵
  if (isTouch()) tutOpen('map_replay', 'map', '接著會不斷重演剛剛的通關歷程', 360, 591, 'below', [tutArrow(356, 468, 370, 365, 'top', 264)]);
  else tutOpen('map_replay', 'map', '接著會不斷重演剛剛的通關歷程', 470, 575, 'below', [tutArrow(466, 429, 480, 349, 'top', 374)]);
}
function tutToUpgrade() {
  T.stage = 'upgrade';
  // 觸控模式升級所卡在 (62,52)~(238,188), 上方沒有空間放板子: 電腦版的一行板子上下翻到卡片下方(x 同電腦版), 箭頭從板子上緣往左上指卡片右緣
  if (isTouch()) tutOpen('map_upgrade', 'map', '[升級所]可以解鎖新職業、提升角色能力', 305, 198, 'below', [tutArrow(250, 120, 150, 120, 'top', 447)], '繼續');
  else tutOpen('map_upgrade', 'map', '[升級所]可以解鎖新職業、提升角色能力', 305, 140, 'above', [tutArrow(250, 218, 150, 218, 'bottom', 447)], '繼續');
}
function tutToShop() {
  T.stage = 'shop';
  // 觸控模式商店卡在 (62,214)~(238,350): 電腦版的兩行板子與箭頭照相對卡片的位置往上平移 216
  if (isTouch()) tutOpen('map_shop', 'map', '[商店]可以購買裝置,裝置可以\n安裝在關卡中,提升素材產量', 245, 360, 'below', [tutArrow(250, 282, 150, 282, 'top', 438)], '繼續');
  else tutOpen('map_shop', 'map', '[商店]可以購買裝置,裝置可以\n安裝在關卡中,提升素材產量', 245, 576, 'below', [tutArrow(250, 498, 150, 498, 'top', 438)], '繼續');
}
function tutToSummary() {
  T.stage = 'summary'; T.arrows = []; T.bub = null; T.sum = { openT: 0, closing: false, closeT: 0.3, cards: 0 };
  snd('summary_open');
}
// 地圖 2: 判斷窗口 = 顯示完後 3.0 秒; 2a / 2b 都等 Z(顯示完才出現徽章)
function replayTick() {
  var b = T.bub;
  if (!b || b.outT !== null) return;
  if (b.step === 'map_slow') return;
  if (T.branch === null) {
    if (T.flightSeen) T.branch = 'a';
    else if (b.done && b.doneT >= 3.0) {
      T.branch = 'b';
      tutSwap(function () {
        // 觸控模式: 秒數右緣在第 1 關卡 (442, 371); 電腦版的兩行板子與箭頭照相對秒數的位置平移
        if (isTouch()) tutOpen('map_slow', 'map', '但這次通關花比較多時間,\n[素材累積的比較慢],可以考慮重刷一次關卡', 352, 551, 'below', [tutArrow(425, 387, 422, 371, 'top', 474)], '繼續');
        else tutOpen('map_slow', 'map', '但這次通關花比較多時間,\n[素材累積的比較慢],可以考慮重刷一次關卡', 470, 575, 'below', [tutArrow(543, 411, 540, 395, 'top', 592)], '繼續');
      });
      return;
    }
  }
  if (T.branch === 'a' && b.cont === null && b.age - TUT_POP >= b.info.last) { b.next = '繼續'; tutAddCont(',\n源源不絕[累積素材]'); }
}
function sumTick(dt) {
  var m = T.sum;
  if (m.closing) {
    m.closeT = Math.min(0.3, m.closeT + dt);
    if (m.closeT >= 0.3) { T.sum = null; T.lockMap = false; T.stage = 'done'; }
    return;
  }
  m.openT += dt;
  while (m.cards < 4 && m.openT >= 0.7 + 0.45 * m.cards + 0.55) { m.cards++; snd('summary_card'); }
}
// 大地圖被教學鎖住時的 Z: 只用來推進教學
function tutZ() {
  var b = T.bub, s = T.stage;
  if (s === 'summary') {
    var m = T.sum;
    if (m && !m.closing && m.openT >= 2.6) { m.closing = true; m.closeT = 0; snd('tutorial_done'); }
    return;
  }
  if (!b || b.outT !== null || !b.done || !b.next) return;
  if (s === 'replay') { snd('tut_next'); tutSwap(tutToUpgrade); }
  else if (s === 'upgrade') { snd('tut_next'); tutSwap(tutToShop); }
  else if (s === 'shop') { snd('tut_next'); tutSwap(tutToSummary); }
}
function tutStep(dt) {
  if (T.off) return;
  T.clk += dt;
  if (T.eff) T.eff.t += dt;
  bubTick(dt);
  if (G.screen === 'play' && R) { if (R.demo) demoTick(dt); else gateTick(); }
  if (T.stage === 'replay') replayTick();
  if (T.sum) sumTick(dt);
}
// 操作方式面板(第 1 關教學期間每幀畫): 演出 2 起才出現, 演出 3 起固定在左上角
function ctrlPanelVisible() { return tutL1() && (T.demo >= 2 || (T.demo === 1 && T.ds >= 2)); }
function ctrlPanelState() {
  var p = R.L.start;
  if (T.demo >= 2 || T.ds >= 3) return { T: CP_WAIT, waitZ: false, dockT: CP_DOCK, px: p.x, py: p.y, alpha: T.demo >= 2 ? G.fPanel : 1, t: T.clk };
  return { T: T.cpT, waitZ: T.cpT >= CP_WAIT && T.dockT === null, dockT: T.dockT, px: p.x, py: p.y, alpha: 1, t: T.clk };
}

// ---------------------------------------------------------------- 物理
function boxHit(x, y, w, h) {
  var c0 = Math.floor((x - w / 2) / TS), c1 = Math.floor((x + w / 2 - 0.001) / TS);
  var r0 = Math.floor((y - h / 2) / TS), r1_ = Math.floor((y + h / 2 - 0.001) / TS);
  for (var r = r0; r <= r1_; r++) for (var c = c0; c <= c1; c++) if (isSol(SOL, c, r)) return true;
  return false;
}
function moveX(b, dx) {
  if (!dx) return false;
  var n = Math.ceil(Math.abs(dx) / 8), s = dx / n;
  for (var i = 0; i < n; i++) {
    b.x += s;
    if (boxHit(b.x, b.y, b.w, b.h)) {
      if (s > 0) b.x = Math.floor((b.x + b.w / 2) / TS) * TS - b.w / 2 - 0.01;
      else b.x = (Math.floor((b.x - b.w / 2) / TS) + 1) * TS + b.w / 2 + 0.01;
      return true;
    }
  }
  return false;
}
function moveY(b, dy) {
  if (!dy) return false;
  var n = Math.ceil(Math.abs(dy) / 8), s = dy / n;
  for (var i = 0; i < n; i++) {
    b.y += s;
    if (boxHit(b.x, b.y, b.w, b.h)) {
      if (s > 0) b.y = Math.floor((b.y + b.h / 2) / TS) * TS - b.h / 2 - 0.01;
      else b.y = (Math.floor((b.y - b.h / 2) / TS) + 1) * TS + b.h / 2 + 0.01;
      return true;
    }
  }
  return false;
}
function groundAhead(m, dir) {
  return isSol(SOL, Math.floor((m.x + dir * (m.w / 2 + 2)) / TS), Math.floor((m.y + m.h / 2 + 4) / TS));
}
function ovl(ax, ay, aw, ah, bx, by, bw, bh) {
  return Math.abs(ax - bx) < (aw + bw) / 2 && Math.abs(ay - by) < (ah + bh) / 2;
}
function circleBox(cx, cy, r, m) {
  var dx = Math.max(Math.abs(cx - m.x) - m.w / 2, 0), dy = Math.max(Math.abs(cy - m.y) - m.h / 2, 0);
  return dx * dx + dy * dy <= r * r;
}
function circleCell(cx, cy, r, c, rr) {
  var dx = Math.max(Math.abs(cx - (c * TS + 20)) - 20, 0), dy = Math.max(Math.abs(cy - (rr * TS + 20)) - 20, 0);
  return dx * dx + dy * dy <= r * r;
}
// 從 (x, y) 往下找第一個實心格頂面 y, 找不到回 null
function groundTopBelow(x, y) {
  var c = Math.floor(x / TS), r0 = Math.max(0, Math.floor(y / TS));
  for (var r = r0; r < GH; r++) if (isSol(SOL, c, r)) return r * TS;
  return null;
}
function groundTopFrom(x, y) { var g = groundTopBelow(x, y); return g === null ? 680 : g; }

// ---- 地形擋線(規則 35a): 預告截斷、爆炸被牆擋住、爆風擊退帶
// 從 (x1, y1) 朝 (x2, y2) 找第一個實心格, 回傳截斷後的終點(實心格之前最後一個自由點); 沒碰到回原終點
function rayTrunc(x1, y1, x2, y2) {
  var d = Math.hypot(x2 - x1, y2 - y1), n = Math.max(1, Math.ceil(d / 4)), i, lx = x1, ly = y1;
  for (i = 1; i <= n; i++) {
    var qx = x1 + (x2 - x1) * i / n, qy = y1 + (y2 - y1) * i / n;
    if (isSol(SOL, Math.floor(qx / TS), Math.floor(qy / TS))) return { x: lx, y: ly };
    lx = qx; ly = qy;
  }
  return { x: x2, y: y2 };
}
// 爆心到目標中心的連線是否穿過實心格(起點格與目標格本身不算)
function lineBlocked(x1, y1, x2, y2) {
  var d = Math.hypot(x2 - x1, y2 - y1), n = Math.max(1, Math.ceil(d / 4)), i;
  var oc = Math.floor(x1 / TS), orr = Math.floor(y1 / TS), tc = Math.floor(x2 / TS), tr = Math.floor(y2 / TS);
  for (i = 0; i <= n; i++) {
    var c = Math.floor((x1 + (x2 - x1) * i / n) / TS), r = Math.floor((y1 + (y2 - y1) * i / n) / TS);
    if ((c === oc && r === orr) || (c === tc && r === tr)) continue;
    if (isSol(SOL, c, r)) return true;
  }
  return false;
}
// 地面衝撞道: 從 m 朝 dir 走, 取「最遠 maxD」「前方牆」「腳下平台邊緣」三者最近的行走距離(與實際衝撞 chargeStep 用同一組 2px 步進)
function laneDist(m, dir, maxD) {
  var pos = m.x, t = { x: m.x, y: m.y, w: m.w, h: m.h };
  while (Math.abs(pos - m.x) < maxD - 0.01) {
    var st = Math.min(2, maxD - Math.abs(pos - m.x)), nx = pos + dir * st;
    if (boxHit(nx, m.y, m.w, m.h)) break;
    pos = nx; t.x = pos;
    if (!groundAhead(t, dir)) break;
  }
  return Math.abs(pos - m.x);
}
// 衝撞一幀(速度 spd): 2px 一步, 撞牆 / 到平台邊緣 / 走滿 m.lane 就回 true(衝撞結束)
function chargeStep(m, spd) {
  var rem = spd * DT;
  while (rem > 0) {
    var st = Math.min(2, rem, m.lane - m.dist);
    if (st <= 0.0001) return true;
    rem -= st;
    if (moveX(m, m.facing * st)) return true;
    m.dist += st;
    if (m.onGround && !groundAhead(m, m.facing)) return true;
    if (m.dist >= m.lane - 0.01) return true;
  }
  return false;
}
// 刺藤花藤鞭掃區寬: 前方 140, 碰到牆那一側截在牆面
function sweepWidth(m) {
  var x0 = m.x + m.facing * 20, gy = m.y + m.h / 2, r0 = Math.floor((gy - 40) / TS), r1b = Math.floor((gy - 0.001) / TS), w, r;
  for (w = 0; w < 140; w += 2) {
    var c = Math.floor((x0 + m.facing * (w + 1)) / TS);
    for (r = r0; r <= r1b; r++) if (isSol(SOL, c, r)) return w;
  }
  return 140;
}
// 爆風擊退的水平帶: 左右各 130, 從玩家所在格往外逐格找牆(牆 = 玩家身高範圍內任何實心格, 含裂岩牆; 不看腳下地板與頭頂天花板)
function waveBand(px, py) {
  var r0 = Math.floor((py - 18) / TS), r1b = Math.floor((py + 18 - 0.001) / TS), col = Math.floor(px / TS);
  var left = px - 130, right = px + 130, cr = [], c, r;
  function colSolid(cc) { for (var rr = r0; rr <= r1b; rr++) if (isSol(SOL, cc, rr)) return true; return false; }
  function colCracks(cc) { for (var rr = r0; rr <= r1b; rr++) R.L.cracks.forEach(function (q, i) { if (q[0] === cc && q[1] === rr && R.crHp[i] > 0) cr.push(q); }); }
  for (c = col - 1; c >= Math.floor((px - 130) / TS); c--) {
    if (colSolid(c)) { left = Math.max(left, (c + 1) * TS); colCracks(c); break; }
  }
  for (c = col + 1; c <= Math.floor((px + 130) / TS); c++) {
    if (colSolid(c)) { right = Math.min(right, c * TS); colCracks(c); break; }
  }
  left = Math.min(left, px); right = Math.max(right, px);
  return { left: left, right: right, cracks: cr };
}
// 畫面矩形扣掉實心格(evenodd)的 clip, 讓區域型預告 / 爆炸 / 範圍圈不畫進牆裡; 站立面(頂面外露的格)只扣掉下方, 貼地的圈不被切半
function solidClipBegin(c, sol) {
  var r, cc;
  c.save(); c.beginPath(); c.rect(0, 0, W, H);
  for (r = 0; r < GH; r++) for (cc = 0; cc < GW; cc++) {
    if (sol[r][cc] !== 1) continue;
    var top = (r > 0 && sol[r - 1][cc] !== 1) ? 5 : 0;
    c.rect(cc * TS, r * TS + top, TS, TS - top);
  }
  c.clip('evenodd');
}

// ---------------------------------------------------------------- 進關
function newMon(d) {
  var D = MDEF[d.type];
  var m = { id: d.id, type: d.type, z: d.z, x: d.x, y: d.y, w: D.w, h: D.h, hp: D.hp, maxHp: D.hp, sh: D.sh || 0, maxSh: D.sh || 0, hasShield: !!D.sh,
    facing: -1, state: 'walk', t: 0, vx: 0, vy: 0, onGround: false, alive: true, hitT: 0, blockT: 0, breakT: 0.4, anim: Math.random() * 3,
    fl: null, atk: null, sx: d.x, sy: d.y, t2: 0, cd: 1.6, jt: 0, brood: !!d.brood, chip: D.hp + (D.sh || 0), chipT: 0.4, dist: 0, lock: 0,
    lockX: 0, lockY: 0, ang: 0, stT: 0, stD: 0, mk: d.kind || null, grp: null, idx: 0, dir: 1, lane: 0, sw: 0 };
  if (d.type === 'frog') { m.state = 'crouch'; m.t = 1.2; }
  else if (d.type === 'bee') m.state = 'fly';
  else if (d.type === 'thorn') m.state = 'idle';
  else if (d.type === 'beetle') m.state = 'crawl';
  else if (d.type === 'hawk') { m.state = 'circle'; m.dir = 1; m.homeX = d.x; m.homeY = d.y; m.by = d.y; }
  else if (d.type === 'lizard') { m.state = 'crawl'; m.cd = 0.5; m.ceilY = d.y - 12; }
  else if (d.type === 'mother') { m.state = 'walk'; m.cd = 2.0; }
  return m;
}
function monName(m) { return m.type === 'mother' ? 'mother_' + m.mk : m.type; }
function startRun(l, cls) {
  var L = LEVELS[l], rep = G.repaired[l];
  G.lastCls[l] = cls;
  SOL = makeSolid(L, rep);
  L.cracks.forEach(function (q) { SOL[q[1]][q[0]] = 1; });
  var hp = maxHp();
  R = {
    l: l, cls: cls, L: L, rep: rep.slice(), f: 0, state: 'run', cT: 0, deadT: 0, dead: null, focus: null, irisSnd: false, shatterDone: false, atkId: 0,
    p: { x: L.start.x, y: L.start.y, w: PW, h: PH, vx: 0, vy: 0, facing: 1, onGround: false, hp: hp, inv: 0, kb: 0, kbDir: 0, kbSpd: 80 / 0.15, hurtT: 0,
      pose: 'idle', poseT: 0, actPose: null, actT: 0, dashT: 0, dashUsed: false, dashHit: {}, dashCr: {}, atkCd: 0, swingIdx: 0, reslash: false, skCd: 0, skDur: 1.2,
      stealth: false, stealthT: 2.5, unT: 0.3, autoCd: 0.3, coyote: 0, jumpBuf: 0, jumpT: 99, readyT: 0.5, castT: 0.3, denyT: 0.25, prevCd: 0, skKill: false, fallV: 0 },
    mons: [], groups: [], arrows: [], bombs: [], shots: [], rocks: [], expl: [], waves: [], poofs: [], popups: [], chains: {}, chainTexts: [], bits: [],
    crHp: L.cracks.map(function () { return 3; }), taken: {}, chestOpen: G.chestTaken[l], chestF: -1, gotItems: [], notice: null, noticeQ: [], gotHeart: false,
    frames: [], events: [], demo: false, rt: 0, rland: false, run: zeros(), kills: 0, hurtBy: '', atGoal: false, shake: 0, boss: null, beam: null, goalFall: 0, lastSnap: null, sndLand: 0
  };
  var gid = 0;
  L.mons.forEach(function (d) {
    if (!zOk(d.z, rep)) return;
    if (d.type === 'bats') {
      var g = { cx: d.x, cy: d.y, sx: d.x, sy: d.y, ang: 0, id: gid++ };
      R.groups.push(g);
      for (var i = 0; i < 3; i++) {
        var b = newMon({ id: 500 + d.id * 3 + i, type: 'bat', x: d.x + 50, y: d.y, z: d.z, brood: d.brood });
        b.grp = g; b.idx = i; b.state = 'fly'; R.mons.push(b);
      }
      return;
    }
    var m = newMon(d);
    if (d.type === 'mother') {
      var st = null;
      L.sites.forEach(function (s) { if (s.kind === 'nestgate') st = s; });
      m.lo = st.lair.x + m.w / 2 + 1; m.hi = st.lair.x + st.lair.w - m.w / 2 - 1;
    }
    R.mons.push(m);
  });
  if (l === 7) R.boss = newBoss();
  R.p.skDur = skillDur(cls);
  R.snd = soundCorner(L); G.fPanel = 1; G.fSnd = 1;
  R.frames.push(snap());
  G.screen = 'play'; G.paused = false;
  clearKeys();
  // 新手教學: 第 1 關第一次進關 → 暫停並自動播演出 1~6; 中途重來 / 離開再進來不重播
  T.bub = null; T.arrows = []; T.gate = null; T.spot = null; T.swapFn = null;
  if (tutL1() && T.demo === 0) { T.demo = 1; R.demo = true; T.fade6 = -1; T.cpT = 0; demoGo(1); }
  else if (T.demo === 1) T.demo = 2;
  setMusic(MUSIC_OF[L.theme]);
}
function skillDur(cls) {
  var base = cls === 'sword' ? 1.2 : (cls === 'hunter' ? 2.0 : 1.5);
  return base * UP_CD[G.up.cd];
}
function atkB() { return G.up.atk; }

// ---------------------------------------------------------------- 素材與傷害
function addPoof(x, y, size) { R.poofs.push({ x: x, y: y, t: 0, size: size || 'small' }); }
function addPopup(kind, value, x, y) {
  for (var i = 0; i < R.popups.length; i++) {
    var q = R.popups[i];
    if (q.kind === kind && q.t < 0.2) { q.value = Math.min(60, q.value + value); return; }
  }
  var n = 0; R.popups.forEach(function (q) { if (q.t < 0.3 && q.kind !== kind) n++; });
  R.popups.push({ x: x, y: y - 20 - n * 16, t: 0, kind: kind, value: Math.min(60, Math.max(1, value)) });
}
// 得到素材: src = 'pick' | 'dmg' | 'kill'; 立即計入這趟所得與錄影, 畫面另噴素材粒
function gain(kind, base, src, x, y) {
  if (base <= 0) return 0;
  var amt = amountFor(R.l, src, base);
  R.run[kind] += amt;
  R.events.push({ f: R.f, x: x, y: y, kind: kind, n: base, src: src });
  if (src === 'pick') { addPopup(kind, amt, x, y); }
  else {
    var nb = Math.min(amt, 8), per = Math.floor(amt / nb), i;
    for (i = 0; i < nb; i++) {
      var val = i === nb - 1 ? amt - per * (nb - 1) : per;
      var vx = (Math.random() * 2 - 1) * 110, gy = groundTopFrom(x + vx * 0.4, y) - 8;
      R.bits.push({ x0: x, y0: y, vx: vx, vy0: -320, gy: gy, kind: kind, t: -i * 0.03, val: val, px: x, py: y, vxx: 0, vyy: 0, done: false });
    }
  }
  return amt;
}
function updateBits() {
  var p = R.p, i;
  for (i = R.bits.length - 1; i >= 0; i--) {
    var b = R.bits[i];
    b.t += DT;
    var u = b.t;
    if (u < 0) { continue; }
    var ox = b.px, oy = b.py;
    if (u < 0.4) {
      var g = 2 * (b.gy - b.y0 - b.vy0 * 0.4) / 0.16;
      b.px = b.x0 + b.vx * u; b.py = b.y0 + b.vy0 * u + 0.5 * g * u * u;
    } else if (u < 0.6) {
      b.px = b.x0 + b.vx * 0.4; b.py = b.gy - 10 * Math.sin(Math.PI * (u - 0.4) / 0.2);
      b.sx = b.px; b.sy = b.py;
    } else if (u < 1.0) {
      var k = (u - 0.6) / 0.4; k = k * k;
      b.px = b.sx + (p.x - b.sx) * k; b.py = b.sy + (p.y - b.sy) * k;
    }
    b.vxx = (b.px - ox) / DT; b.vyy = (b.py - oy) / DT;
    if (u >= 1.0) {
      R.bits.splice(i, 1);
      addPopup(b.kind, b.val, p.x, p.y);
      sndT('drop_collect', 0.08);
    }
  }
}
function pushNotice(type) { R.noticeQ.push(type); }
function killMon(m, opt) {
  opt = opt || {};
  m.alive = false; m.fl = null;
  addPoof(m.x, m.y, m.type === 'mother' ? 'big' : 'small');
  if (!opt.noCore) {
    var core = MDEF[m.type].core * 1;
    if (m.type === 'mother') { gain(MOTHER_DROP[m.mk], 4, 'kill', m.x, m.y); }
    else if (m.brood) core = 2;
    gain('core', core, 'kill', m.x, m.y - 14);
  }
  R.kills++;
  if (m.type === 'mother' && !G.heartTaken[R.l] && !R.gotHeart) { R.gotHeart = true; R.gotItems.push('heart'); pushNotice('heart'); }
  if (m.atk != null) {
    var ch = R.chains[m.atk] || (R.chains[m.atk] = { n: 0 });
    ch.n++;
    if (ch.n >= 2) {
      var ct = ch.text;
      if (!ct) { ct = ch.text = { x: m.x, y: m.y - 20, t: 0, n: ch.n }; R.chainTexts.push(ct); snd('chain'); }
      ct.n = Math.min(20, ch.n); ct.x = m.x; ct.y = m.y - 20; ct.t = 0;
    }
  }
  if (opt.fromPlayer) R.p.skKill = true;
  snd(m.type === 'mother' ? 'brood_down' : (opt.noSound ? '' : 'monster_down'));
}
function isWeak(m) { return m.type === 'mother' && (m.state === 'stun' || m.state === 'pant' || m.state === 'stuck'); }
// src: {kind, fx, cy, atk, blockable, pl(玩家攻擊)}
function dmgMon(m, dmg, src) {
  if (!m.alive) return false;
  if (m.type === 'mother' && (m.state === 'burrow' || m.state === 'under')) return false;
  if (m.hasShield && src.blockable && (src.fx - m.x) * m.facing > 0 && src.cy >= m.y - m.h / 2) {
    var sn = Math.min(dmg, m.sh);
    m.chip = m.hp + m.sh; m.chipT = 0; m.sh -= sn; m.hitT = 0.1; m.blockT = 0.2;
    gain('stone', sn, 'dmg', m.x, m.y - 10);
    if (m.sh <= 0) { m.hasShield = false; m.breakT = 0; snd('shield_break'); }
    else sndT('hit_block', 0.05);
    return false;
  }
  if (isWeak(m)) dmg *= 2;
  var n = Math.min(dmg, m.hp);
  m.atk = src.atk;
  m.chip = m.hp + m.sh; m.chipT = 0;
  m.hp -= n; m.hitT = 0.1;
  if (n > 0) gain(MDEF[m.type].drop === 'wood' && m.type === 'mother' ? MOTHER_DROP[m.mk] : MDEF[m.type].drop, n, 'dmg', m.x, m.y);
  if (m.hp <= 0) { killMon(m, { fromPlayer: src.pl }); if (src.kind === 'dash' && src.pl) R.p.skCd = 0; }
  else sndT('hit', 0.05);
  if (R.shake < 0.12 && dmg >= 2 && src.pl) R.shake = 0.12;
  return true;
}
function flingMon(m, dir, atk) {
  if (m.type === 'mother' || m.type === 'thorn' || m.type === 'lizard') return;
  m.fl = { dir: dir, t: 0.6, hit: {} }; m.atk = atk; m.vx = 0; m.vy = 0;
  if (m.state === 'aim' || m.state === 'windup' || m.state === 'fuse') m.state = m.type === 'beetle' ? 'crawl' : (m.type === 'bee' ? 'fly' : 'walk');
}
function endFling(m) {
  m.fl = null; m.vx = 0; m.vy = 0;
  if (m.type === 'bee') { m.state = 'fly'; m.sx = m.x; m.sy = m.y; m.t2 = 0; }
  else if (m.type === 'hawk') { m.state = 'circle'; m.ang = 0; m.sx = m.x; m.sy = m.y; m.by = m.y; }
  else if (m.type === 'frog') { m.state = 'crouch'; m.t = 0.6; }
  else if (m.type === 'bat') { m.state = 'fly'; m.ret = true; }
  else if (m.type === 'beetle') { m.state = 'crawl'; }
  else m.state = 'walk';
}
function hitCrack(i, n) {
  if (R.crHp[i] <= 0) return;
  R.crHp[i] = n >= 3 ? 0 : Math.max(0, R.crHp[i] - n);
  var q = R.L.cracks[i];
  if (R.crHp[i] <= 0) { SOL[q[1]][q[0]] = 0; addPoof(q[0] * TS + 20, q[1] * TS + 20); }
}
function hurtPlayer(fromX, by, opt, fromY) {
  var p = R.p;
  if (R.state !== 'run' || p.inv > 0 || p.dashT > 0 || p.stealth) return;
  p.hp -= 1; p.inv = 1; p.hurtT = 0.25; R.hurtBy = by;
  if (opt && opt.butt) { p.kb = 0.3; p.kbDir = opt.butt; p.kbSpd = 240 / 0.3; p.vy = -300; p.onGround = false; }
  else { p.kb = 0.15; p.kbDir = (p.x - fromX) >= 0 ? 1 : -1; p.kbSpd = 80 / 0.15; }
  if (p.hp <= 0) failRun(by, fromX, fromY === undefined || fromY === null ? p.y : fromY); else snd('player_hurt');
}
function hurtSpike(hitX, hitY) {
  var p = R.p;
  if (R.state !== 'run' || p.inv > 0 || p.dashT > 0) return;
  p.hp -= 1; p.inv = 1; p.kb = 0; p.vx = 0; p.vy = -520; p.hurtT = 0.25; p.onGround = false; p.coyote = 0; R.hurtBy = 'spike';
  if (p.hp <= 0) failRun('spike', hitX, hitY); else snd('player_hurt');
}
function boom(x, y, atk, r, dmg, pl, kind) {
  R.expl.push({ x: x, y: y, t: 0, dur: 0.4, r: r, kind: kind });
  snd('explosion');
  // 爆炸被牆擋住(規則 35a): 先由近到遠炸裂岩牆(碎掉的牆不再擋後面的), 再算怪物與玩家
  var cs = [];
  R.L.cracks.forEach(function (q, i) {
    if (kind === 'bomb' && R.crHp[i] > 0 && circleCell(x, y, r, q[0], q[1])) cs.push({ i: i, d: Math.hypot(q[0] * TS + 20 - x, q[1] * TS + 20 - y) });
  });
  cs.sort(function (a, b) { return a.d - b.d; });
  cs.forEach(function (o) {
    var q = R.L.cracks[o.i];
    if (R.crHp[o.i] > 0 && !lineBlocked(x, y, q[0] * TS + 20, q[1] * TS + 20)) hitCrack(o.i, 3);
  });
  R.mons.forEach(function (m) { if (m.alive && circleBox(x, y, r, m) && !lineBlocked(x, y, m.x, m.y)) dmgMon(m, dmg, { kind: kind, fx: x, cy: y, atk: atk, pl: pl }); });
  if (kind === 'bomb' && R.boss) bossHitTest(function (b) { return circleBox(x, y, r, b); }, dmg);
  // 炸彈會波及自己: 玩家判定框與爆炸圈相交且沒被牆擋住 → 扣 1(一般受傷: 無敵 1 秒、遠離爆心彈開 80px; 不吃攻擊力加成), 一顆炸彈只傷一次
  if (kind === 'bomb') {
    var p = R.p;
    if (circleBox(x, y, r, p) && !lineBlocked(x, y, p.x, p.y)) hurtPlayer(x, 'bomb', null, y);
  }
}
// 死亡動畫(1.3 秒, 世界定格、不接輸入), 播完才出失敗面板; 這趟作廢(不存回放、素材與裝置不入帳)
var DEATH_DUR = 1.3;
// 第 1 關教學重生(規則 3a): 死亡動畫 1.3 秒 + 停 0.4 秒後整趟重置, 再播 1.6 秒重生落下才交回操作
function respawnRun() {
  var l = R.l, cls = R.cls;
  startRun(l, cls);
  R.state = 'respawn'; R.rt = 0; R.rland = false; R.lastSnap = snap();
  snd('respawn');
}
function failRun(by, hx, hy) {
  if (R.state === 'fail') return;
  var p = R.p;
  R.state = 'fail'; R.deadT = 0; R.shatterDone = false;
  R.dead = { x: Math.max(p.w / 2, Math.min(W - p.w / 2, p.x)), y: by === 'fall' ? 702 : p.y, facing: p.facing, hitX: hx, hitY: hy };
  R.lastSnap = snap();
  clearKeys();
  snd('player_death');
}

// ---------------------------------------------------------------- 玩家
function stepPlayer() {
  var p = R.p, cls = R.cls, spd = CLS[cls].speed * UP_SPEED[G.up.speed];
  p.atkCd = Math.max(0, p.atkCd - DT);
  if (p.stealth) {
    p.stealthT += DT;
    if (p.stealthT >= 2.5) { p.stealth = false; p.stealthT = 2.5; p.unT = 0; p.skCd = p.skDur; snd('stealth_off'); }
  } else p.skCd = Math.max(0, p.skCd - DT);
  if (p.prevCd > 0 && p.skCd <= 0 && !p.stealth) { p.readyT = 0; snd('skill_ready'); }
  p.prevCd = p.skCd;
  p.readyT = Math.min(0.5, p.readyT + DT); p.castT = Math.min(0.3, p.castT + DT); p.denyT = Math.min(0.25, p.denyT + DT); p.unT = Math.min(0.3, p.unT + DT);
  p.inv = Math.max(0, p.inv - DT); p.hurtT = Math.max(0, p.hurtT - DT);
  if (p.actT > 0) { p.actT -= DT; if (p.actT <= 0) p.actPose = null; }
  p.jumpT += DT;
  if (edge.jump) p.jumpBuf = 0.1; else p.jumpBuf = Math.max(0, p.jumpBuf - DT);
  p.coyote = p.onGround ? 0.08 : Math.max(0, p.coyote - DT);
  p.skKill = false;
  if (edge.z) doAttack();
  if (edge.x) doSkill();
  var dir = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
  if (p.dashT > 0) {
    p.dashT -= DT;
    var hit = moveX(p, p.facing * (160 / 0.18) * DT);
    p.vy = 0;
    var ds = { kind: 'dash', fx: p.x, cy: p.y, atk: p.atk, blockable: true, pl: true };
    R.mons.forEach(function (m) {
      if (m.alive && !p.dashHit[m.id] && ovl(p.x, p.y, p.w, p.h, m.x, m.y, m.w, m.h)) {
        p.dashHit[m.id] = 1; dmgMon(m, 2 + atkB(), ds);
      }
    });
    R.L.cracks.forEach(function (q, i) {
      if (R.crHp[i] > 0 && !p.dashCr[i] && ovl(p.x, p.y, p.w + 4, p.h, q[0] * TS + 20, q[1] * TS + 20, 40, 40)) { p.dashCr[i] = 1; hitCrack(i, 1 + atkB()); }
    });
    if (R.boss && !p.dashHit.boss) { p.dashHit.boss = 1; bossHitTest(function (b) { return ovl(p.x, p.y, p.w, p.h, b.x, b.y, b.w, b.h); }, 2 + atkB()); }
    if (hit) p.dashT = 0;
    if (p.dashT <= 0) { p.dashT = 0; p.actPose = null; p.actT = 0; }
    p.onGround = false;
  } else {
    if (p.kb > 0) { p.kb -= DT; moveX(p, p.kbDir * p.kbSpd * DT); }
    else {
      p.vx = dir * spd;
      if (dir !== 0) p.facing = dir;
      moveX(p, p.vx * DT);
    }
    var jv = jumpV(cls);
    if (p.jumpBuf > 0 && p.coyote > 0) { p.vy = -jv; p.jumpT = 0; p.jumpBuf = 0; p.coyote = 0; p.onGround = false; snd('jump'); }
    if (edge.jumpRel && p.jumpT < 0.15 && p.vy < -jv / 2) p.vy = -jv / 2;
    p.vy = Math.min(p.vy + GRAV * DT, 1500);
    var hd = false, fv = p.vy;
    if (moveY(p, p.vy * DT)) { if (p.vy > 0) hd = true; p.vy = 0; }
    if (hd && !p.onGround && fv > 600) snd('land');
    p.onGround = hd;
    if (hd) p.dashUsed = false;
  }
  p.x = Math.max(p.w / 2, Math.min(W - p.w / 2, p.x));

  if (cls === 'hunter' && !p.stealth) {
    p.autoCd -= DT;
    if (p.autoCd <= 0) {
      var best = null, bd = 260.01;
      R.mons.forEach(function (m) { if (m.alive && m.state !== 'under') { var d2 = Math.hypot(m.x - p.x, m.y - p.y); if (d2 < bd) { bd = d2; best = { x: m.x, y: m.y }; } } });
      if (R.boss) { var wb = bossWeakBox(); if (wb) { var d3 = Math.hypot(wb.x - p.x, wb.y - p.y); if (d3 < bd) { bd = d3; best = { x: wb.x, y: wb.y }; } } }
      if (best) { p.autoCd = 0.6; fireArrow(Math.atan2(best.y - p.y, best.x - p.x), ++R.atkId); snd('arrow'); }
      else p.autoCd = 0;
    }
  }
  var pose;
  if (p.hurtT > 0) pose = 'hurt';
  else if (p.actT > 0 && p.actPose) pose = p.actPose;
  else if (p.dashT > 0) pose = 'dash';
  else if (!p.onGround) pose = p.vy < 0 ? 'rise' : 'fall';
  else pose = Math.abs(p.vx) > 1 && p.kb <= 0 ? 'run' : 'idle';
  if (pose !== p.pose || (p.reslash && pose === 'slash')) { p.pose = pose; p.poseT = 0; } else p.poseT += DT;
  p.reslash = false;
  p.skDur = skillDur(cls);
}
function fireArrow(ang, atk) {
  var p = R.p;
  R.arrows.push({ x: p.x, y: p.y, ox: p.x, vx: Math.cos(ang) * 700, vy: Math.sin(ang) * 700, ang: ang, dist: 0, max: 900, atk: atk });
}
function setAct(name, t) { R.p.actPose = name; R.p.actT = t; }
function doAttack() {
  var p = R.p, f = p.facing;
  if (R.cls === 'sword') {
    // 劍士沒有攻擊間隔: 每次 Z 按下(非自動連發)就揮一次; 動作沒播完又按 → poseT 歸 0 重播、刀光上下交替; 衝刺中也能揮
    p.swingIdx ^= 1; p.reslash = true; setAct('slash', 0.15); sndT('slash', 0.05);
    var x0 = f > 0 ? p.x + 14 : p.x - 14 - 50, atk = ++R.atkId, cx = x0 + 25, d = 1 + atkB();
    R.mons.forEach(function (m) {
      if (m.alive && ovl(cx, p.y, 50, 40, m.x, m.y, m.w, m.h)) dmgMon(m, d, { kind: 'slash', fx: p.x, cy: p.y, atk: atk, blockable: true, pl: true });
    });
    R.L.cracks.forEach(function (q, i) {
      if (R.crHp[i] > 0 && ovl(cx, p.y, 50, 40, q[0] * TS + 20, q[1] * TS + 20, 40, 40)) hitCrack(i, d);
    });
    if (R.boss) bossHitTest(function (b) { return ovl(cx, p.y, 50, 40, b.x, b.y, b.w, b.h); }, d);
  } else if (R.cls === 'bomber') {
    if (p.dashT > 0 || p.atkCd > 0) return;
    p.atkCd = 0.6; setAct('throw', 0.2); snd('bomb_throw');
    R.bombs.push({ x: p.x + f * 14, y: p.y - 8, vx: f * 300, vy: -500, t: 0, atk: ++R.atkId });
  }
}
function doSkill() {
  var p = R.p, f = p.facing;
  if (p.skCd > 0 || p.stealth) { p.denyT = 0; return; }
  if (R.cls === 'sword') {
    if (p.dashT > 0 || p.dashUsed) { return; }
    p.dashUsed = true; p.dashT = 0.18; p.dashHit = {}; p.dashCr = {}; p.atk = ++R.atkId; p.skCd = skillDur('sword'); p.castT = 0; snd('dash');
  } else if (R.cls === 'hunter') {
    p.stealth = true; p.stealthT = 0; p.skCd = p.skDur; p.castT = 0; snd('stealth_on');
  } else {
    p.skCd = skillDur('bomber'); p.castT = 0; setAct('wave', 0.3); snd('shockwave');
    var atk = ++R.atkId, d = 1 + atkB();
    // 爆風擊退: 水平帶(左右各 130、上下各 40), 兩側碰到實心格(含裂岩牆)就截在牆面; 上下不打
    var bd = waveBand(p.x, p.y), bl = bd.left, br = bd.right, y0 = p.y - 40, y1 = p.y + 40;
    R.waves.push({ x: p.x, y: p.y, t: 0, left: bl, right: br });
    R.mons.forEach(function (m) {
      if (m.alive && m.x + m.w / 2 > bl && m.x - m.w / 2 < br && m.y + m.h / 2 > y0 && m.y - m.h / 2 < y1) {
        var dir = (m.x - p.x) > 0 ? 1 : ((m.x - p.x) < 0 ? -1 : f);
        var alive = dmgMon(m, d, { kind: 'shock', fx: p.x, cy: p.y, atk: atk, pl: true });
        if (alive && m.alive) flingMon(m, dir, atk);
      }
    });
    // 帶兩端擋住它的裂岩牆直接碎掉
    bd.cracks.forEach(function (q) {
      R.L.cracks.forEach(function (cq, i) { if (R.crHp[i] > 0 && cq[0] === q[0] && cq[1] === q[1]) hitCrack(i, 3); });
    });
    if (R.boss) bossHitTest(function (b) { return b.x + b.w / 2 > bl && b.x - b.w / 2 < br && b.y + b.h / 2 > y0 && b.y - b.h / 2 < y1; }, d);
  }
}

// ---------------------------------------------------------------- 怪物
function setSt(m, name, dur) { m.state = name; m.t = dur || 0; m.stT = 0; m.stD = dur || 0; }
function monFloor(m) {
  m.vy = Math.min(m.vy + GRAV * DT, 1500);
  var hd = false;
  if (moveY(m, m.vy * DT)) { if (m.vy > 0) hd = true; m.vy = 0; }
  m.onGround = hd;
  return hd;
}
function faceP(m) { m.facing = R.p.x >= m.x ? 1 : -1; }
// 規則 35b: 獵人潛行中所有怪物都發現不到玩家(視為不在任何索敵範圍內)
function hid() { return !!R.p.stealth; }
function beetleBlast(m, killed) {
  if (killed) {
    if (m.hp > 0) gain('crystal', m.hp, 'dmg', m.x, m.y);
    m.hp = 0; killMon(m, { noSound: true });
  } else { m.alive = false; addPoof(m.x, m.y, 'small'); }
  R.expl.push({ x: m.x, y: m.y, t: 0, dur: 0.4, r: 70, kind: 'beetle' });
  snd('explosion');
  var p = R.p;
  if (circleBox(m.x, m.y, 70, { x: p.x, y: p.y, w: p.w, h: p.h }) && !lineBlocked(m.x, m.y, p.x, p.y)) hurtPlayer(m.x, 'beetle', null, m.y);
  R.mons.forEach(function (o) { if (o !== m && o.alive && circleBox(m.x, m.y, 70, o) && !lineBlocked(m.x, m.y, o.x, o.y)) dmgMon(o, 2, { kind: 'beetle', fx: m.x, cy: m.y, atk: m.atk }); });
}
function stepFling(m) {
  var fl = m.fl;
  var hit = moveX(m, fl.dir * 460 * DT);
  var hitMon = false;
  R.mons.forEach(function (o) {
    if (o === m || !o.alive || o.fl || fl.hit[o.id]) return;
    if (o.type === 'mother' && (o.state === 'under' || o.state === 'burrow')) return;
    if (ovl(m.x, m.y, m.w, m.h, o.x, o.y, o.w, o.h)) {
      fl.hit[o.id] = 1; hitMon = true;
      dmgMon(o, 2, { kind: 'fling', fx: m.x, cy: m.y, atk: m.atk });
      if (o.alive) flingMon(o, fl.dir, m.atk);
    }
  });
  fl.t -= DT;
  if (m.type === 'beetle' && (hit || hitMon)) { beetleBlast(m, true); return; }
  if (hit && m.alive) { dmgMon(m, 1, { kind: 'fling', fx: m.x, cy: m.y, atk: m.atk }); if (m.alive) endFling(m); return; }
  if (fl.t <= 0 && m.alive) endFling(m);
}
var FROG_V0 = Math.sqrt(2 * GRAV * 80), FROG_VX = 120 / (2 * FROG_V0 / GRAV);
function frogPlan(m) {
  var p = R.p, dir = m.facing, tries = 0, res = null;
  if (!hid() && Math.hypot(p.x - m.x, p.y - m.y) <= 300) dir = (p.x - m.x) >= 0 ? 1 : -1;
  while (tries < 2) {
    var lx = m.x + dir * 120, col = Math.floor(lx / TS), r0 = Math.floor((m.y + m.h / 2) / TS), ground = false, ly = m.y + m.h / 2, k;
    for (k = 0; k <= 6; k++) if (isSol(SOL, col, r0 + k)) { ground = true; ly = (r0 + k) * TS; break; }
    if (ground && !isSol(SOL, col, Math.floor(m.y / TS))) { res = { dir: dir, lx: lx, ly: ly }; break; }
    dir = -dir; tries++;
    if (tries === 2) res = { dir: dir, lx: m.x + dir * 120, ly: m.y + m.h / 2 };
  }
  return res;
}
function stepMon(m) {
  var p = R.p;
  if (!m.alive) return; // 規則 35: 被擊倒立即停止一切行動
  m.hitT = Math.max(0, m.hitT - DT); m.blockT = Math.max(0, m.blockT - DT); m.breakT = Math.min(0.4, m.breakT + DT);
  m.chipT = Math.min(0.4, m.chipT + DT); m.anim += DT; m.stT += DT;
  if (m.fl) { stepFling(m); return; }
  var dx = p.x - m.x, dy = p.y - m.y, hd, h;
  switch (m.type) {
    case 'boar':
      hd = monFloor(m);
      if (m.state === 'walk') {
        if (m.onGround && !groundAhead(m, m.facing)) m.facing *= -1;
        if (moveX(m, 80 * m.facing * DT)) m.facing *= -1;
        if (!hid() && m.onGround && Math.abs(dy) <= 40 && dx * m.facing > 0 && Math.abs(dx) <= 240) { setSt(m, 'windup', 0.5); m.lane = laneDist(m, m.facing, 240); snd('windup'); }
      } else if (m.state === 'windup') { m.t -= DT; if (m.t <= 0) { setSt(m, 'charge', 0); m.dist = 0; } }
      else if (m.state === 'charge') {
        if (chargeStep(m, 420)) setSt(m, 'stun', 1);
      } else { m.t -= DT; if (m.t <= 0) setSt(m, 'walk', 0); }
      break;
    case 'frog':
      hd = monFloor(m);
      if (m.state === 'crouch') { if (m.onGround) { m.t -= DT; if (m.t <= 0) frogJump(m); } }
      else {
        m.jt += DT;
        if (moveX(m, m.vx * DT)) m.vx = 0;
        if (hd && m.jt > 0.1) { setSt(m, 'crouch', 1.2); m.vx = 0; }
      }
      break;
    case 'bee': stepBee(m); break;
    case 'thorn':
      monFloor(m);
      if (m.state === 'idle') {
        if (!hid()) m.facing = dx >= 0 ? 1 : -1;
        if (!hid() && Math.abs(dx) <= 140 && Math.abs(dy) <= 60) { setSt(m, 'windup', 0.6); m.sw = sweepWidth(m); snd('windup'); }
      } else if (m.state === 'windup') { m.t -= DT; if (m.t <= 0) setSt(m, 'whip', 0.3); }
      else if (m.state === 'whip') {
        var zx = m.facing > 0 ? m.x + 20 : m.x - 20 - m.sw, gy = m.y + m.h / 2;
        if (m.sw > 0 && ovl(zx + m.sw / 2, gy - 20, m.sw, 40, p.x, p.y, p.w, p.h)) hurtPlayer(m.x, 'thorn', null, m.y);
        m.t -= DT; if (m.t <= 0) setSt(m, 'recover', 1.2);
      } else { m.t -= DT; if (m.t <= 0) setSt(m, 'idle', 0); }
      break;
    case 'ram':
      hd = monFloor(m);
      if (m.state === 'walk') {
        if (m.onGround && !groundAhead(m, m.facing)) m.facing *= -1;
        if (moveX(m, 70 * m.facing * DT)) m.facing *= -1;
        if (!hid() && m.onGround && Math.abs(dy) <= 40 && dx * m.facing > 0 && Math.abs(dx) <= 200) { setSt(m, 'windup', 0.6); m.lane = laneDist(m, m.facing, 160); snd('windup'); }
      } else if (m.state === 'windup') { m.t -= DT; if (m.t <= 0) { setSt(m, 'butt', 0); m.dist = 0; } }
      else if (m.state === 'butt') {
        if (chargeStep(m, 300)) setSt(m, 'stagger', 0.8);
      } else { m.t -= DT; if (m.t <= 0) setSt(m, 'walk', 0); }
      break;
    case 'hawk': stepHawk(m); break;
    case 'lizard': stepLizard(m); break;
    case 'shield':
      monFloor(m);
      if (!hid() && Math.abs(dx) <= 400 && Math.abs(dy) <= 120) {
        m.facing = dx >= 0 ? 1 : -1;
        if (Math.abs(dx) > 8 && (!m.onGround || groundAhead(m, m.facing))) moveX(m, 40 * m.facing * DT);
      } else {
        if (m.onGround && !groundAhead(m, m.facing)) m.facing *= -1;
        if (moveX(m, 40 * m.facing * DT)) m.facing *= -1;
      }
      break;
    case 'beetle':
      monFloor(m);
      if (m.state === 'crawl') {
        var near = !hid() && Math.hypot(dx, dy) <= 300, spd = near ? 70 : 40;
        if (near) m.facing = dx >= 0 ? 1 : -1;
        if (m.onGround && !groundAhead(m, m.facing)) { if (near) { /* 不離開平台 */ } else m.facing *= -1; }
        else if (moveX(m, spd * m.facing * DT) && !near) m.facing *= -1;
        if (!hid() && Math.hypot(dx, dy) <= 50) { setSt(m, 'fuse', 0.8); snd('beetle_fuse'); }
      } else if (m.state === 'fuse') {
        m.t -= DT;
        if (m.t <= 0) beetleBlast(m, false);
      }
      break;
    case 'bat': stepBat(m); break;
    case 'mother': stepMother(m); break;
  }
}
function frogJump(m) {
  var pl = frogPlan(m);
  m.facing = pl.dir; m.state = 'jump'; m.vy = -FROG_V0; m.vx = pl.dir * FROG_VX; m.jt = 0; m.onGround = false; m.stT = 0;
}
function stepBee(m) {
  var p = R.p;
  m.t2 += DT;
  var inRange = !hid() && Math.hypot(p.x - m.x, p.y - m.y) <= 400;
  if (m.state === 'aim') {
    // 瞄準點跟著玩家; 潛行開始那一刻起凍結在當時的玩家中心
    if (!hid()) { m.aimX = p.x; m.aimY = p.y; }
    m.facing = m.aimX >= m.x ? 1 : -1;
    m.t -= DT;
    if (m.t <= 0) {
      var dx = m.aimX - m.x, dy = m.aimY - m.y, d = Math.max(1, Math.hypot(dx, dy));
      R.shots.push({ x: m.x, y: m.y, vx: dx / d * 220, vy: dy / d * 220, life: 4 });
      snd('bee_shot');
      setSt(m, 'fly', 0); m.cd = 1.6;
    }
  } else {
    if (moveX(m, 60 * m.facing * DT)) m.facing *= -1;
    if (m.x - m.sx >= 120) m.facing = -1; else if (m.x - m.sx <= -120) m.facing = 1;
    if (inRange) { m.cd -= DT; if (m.cd <= 0) { setSt(m, 'aim', 0.4); m.aimX = p.x; m.aimY = p.y; } }
  }
  m.y = m.sy + 16 * Math.sin(Math.PI * m.t2);
}
// 俯衝鷹(polish 第 4 輪 bug: 穿牆): 判定框(40×28)任何時刻都不進入實心格。
// 沿線掃描: 從 (x, y) 朝 (tx, ty) 以最多 2px 一步前進, 最多走 maxLen; 下一步判定框會碰到實心格就停在碰撞前的位置。
// 預告軌跡終點與實際俯衝都用這一支(實際俯衝每幀從目前位置續掃, 與預告相差 ≤ 2px)
function hawkSweep(x, y, tx, ty, maxLen) {
  var d = Math.hypot(tx - x, ty - y), len = Math.min(d, maxLen);
  if (len <= 0.0001) return { x: x, y: y, hit: false, reached: d <= 0.0001 };
  var ux = (tx - x) / d, uy = (ty - y) / d, pos = 0, st;
  while (pos < len - 0.0001) {
    st = Math.min(2, len - pos);
    if (boxHit(x + ux * (pos + st), y + uy * (pos + st), 40, 28)) return { x: x + ux * pos, y: y + uy * pos, hit: true, reached: false };
    pos += st;
  }
  return { x: x + ux * len, y: y + uy * len, hit: false, reached: len >= d - 0.0001 };
}
function hawkEndReturn(m) { setSt(m, 'circle', 0); m.ang = 0; m.sx = m.x; m.by = m.y; }
function stepHawk(m) {
  var p = R.p, dx = p.x - m.x, nx, ny;
  m.lock = Math.max(0, m.lock - DT);
  if (m.state === 'circle') {
    m.ang = 0;
    // 水平來回: 下一步會碰到實心格就折返(不移動)
    nx = m.x + 90 * m.dir * DT;
    if (boxHit(nx, m.y, m.w, m.h)) m.dir = -m.dir; else m.x = nx;
    if (m.x - m.sx >= 100) m.dir = -1; else if (m.x - m.sx <= -100) m.dir = 1;
    m.facing = m.dir;
    // 上下 ±4px 擺動: 會碰到實心格, 那一幀不擺
    ny = m.by + 4 * Math.sin(m.anim * 2);
    if (!boxHit(m.x, ny, m.w, m.h)) m.y = ny;
    if (!hid() && m.lock <= 0 && p.y > m.y && Math.abs(dx) <= 320) { setSt(m, 'hover', 0.7); m.lockX = p.x; m.lockY = p.y; }
  } else if (m.state === 'hover') {
    m.ang = 0;
    m.t -= DT; m.facing = m.lockX >= m.x ? 1 : -1;
    if (m.t <= 0) { setSt(m, 'dive', 0); m.ang = Math.atan2(m.lockY - m.y, m.lockX - m.x); snd('hawk_dive'); }
  } else if (m.state === 'dive') {
    m.ang = Math.atan2(m.lockY - m.y, m.lockX - m.x);
    var sw = hawkSweep(m.x, m.y, m.lockX, m.lockY, 520 * DT);
    m.x = sw.x; m.y = sw.y;
    if (sw.hit || sw.reached) { setSt(m, 'return', 0); m.lock = 1.0; }
  } else if (m.state === 'return') {
    var st = 200 * DT, hdx = m.homeX - m.x, hd = Math.abs(hdx) < 1 ? m.dir : (hdx > 0 ? 1 : -1);
    if (m.y <= m.homeY + 0.001) { hawkEndReturn(m); return; }
    // 先試往正上方; 被擋 → 往出生點的水平方向(已在正下方就往盤旋前進方向); 再被擋 → 另一側; 三個方向都被擋 → 就地轉回盤旋
    ny = Math.max(m.homeY, m.y - st);
    if (!boxHit(m.x, ny, m.w, m.h)) { m.y = ny; m.ang = -Math.PI / 2; }
    else if (!boxHit(m.x + hd * st, m.y, m.w, m.h)) { m.x += hd * st; m.ang = hd > 0 ? 0 : Math.PI; }
    else if (!boxHit(m.x - hd * st, m.y, m.w, m.h)) { m.x -= hd * st; m.ang = hd > 0 ? Math.PI : 0; }
    else { hawkEndReturn(m); return; }
    if (m.y <= m.homeY + 0.001) hawkEndReturn(m);
  }
}
// 落石蜥沿天花板爬: 前緣上方要有天花板, 且前緣身體那格不能是牆(天花板有凹槽時會穿牆)
function lizardCanGo(m, nx, dir) {
  var col = Math.floor((nx + 18 * dir) / TS), cr = Math.floor((m.ceilY - 2) / TS);
  return nx >= m.sx - 80 && nx <= m.sx + 80 && isSol(SOL, col, cr) && !isSol(SOL, col, cr + 1);
}
function stepLizard(m) {
  var p = R.p, dx = p.x - m.x;
  m.y = m.ceilY + 12;
  m.cd = Math.max(0, m.cd - DT);
  if (m.state === 'crawl') {
    var nx = m.x + 40 * m.dir * DT;
    if (lizardCanGo(m, nx, m.dir)) m.x = nx; else m.dir *= -1;
    m.facing = m.dir;
    if (!hid() && m.cd <= 0 && Math.abs(dx) <= 200 && p.y > m.y) { setSt(m, 'windup', 0.5); m.colX = m.x + Math.max(-40, Math.min(40, dx)); snd('windup'); }
  } else if (m.state === 'windup') {
    var mv = Math.max(-80 * DT, Math.min(80 * DT, m.colX - m.x));
    if (mv !== 0 && lizardCanGo(m, m.x + mv, mv > 0 ? 1 : -1)) m.x += mv;
    m.t -= DT;
    if (m.t <= 0) { R.rocks.push({ x: m.x, y: m.y + 12, vx: 0, vy: 0, t: 0, kind: 'lizard', g: GRAV }); snd('rock_drop'); setSt(m, 'throw', 0.2); }
  } else if (m.state === 'throw') {
    m.t -= DT; if (m.t <= 0) { setSt(m, 'crawl', 0); m.cd = 2.0; }
  }
}
function stepBat(m) {
  var g = m.grp, p = R.p;
  var ang = g.ang + m.idx * 2.0944, tx = g.cx + 50 * Math.cos(ang), ty = g.cy + 50 * Math.sin(ang);
  if (!hid()) m.facing = p.x >= m.x ? 1 : -1;
  if (m.ret) {
    var ddx = tx - m.x, ddy = ty - m.y, d = Math.hypot(ddx, ddy), st = 200 * DT;
    if (d <= st + 4) { m.ret = false; m.x = tx; m.y = ty; } else { m.x += ddx / d * st; m.y += ddy / d * st; }
  } else { m.x = tx; m.y = ty; }
}
function stepGroups() {
  var p = R.p;
  R.groups.forEach(function (g) {
    g.ang += 1.6 * DT;
    var alive = R.mons.some(function (m) { return m.grp === g && m.alive; });
    if (!alive) return;
    var tx = g.sx, ty = g.sy;
    if (!hid() && Math.hypot(p.x - g.cx, p.y - g.cy) <= 360) { tx = p.x; ty = p.y; }
    var ddx = tx - g.cx, ddy = ty - g.cy, d = Math.hypot(ddx, ddy), st = 50 * DT;
    if (d > st) { g.cx += ddx / d * st; g.cy += ddy / d * st; }
  });
}
function stepMother(m) {
  var p = R.p, dx = p.x - m.x, dy = p.y - m.y, h, lo = m.lo, hi = m.hi;
  monFloor(m);
  function bound() { var out = m.x <= lo || m.x >= hi; m.x = Math.max(lo, Math.min(hi, m.x)); return out; }
  if (m.mk === 'forest') {
    if (m.state === 'walk') {
      h = moveX(m, 50 * m.facing * DT);
      if (h || bound() || (m.onGround && !groundAhead(m, m.facing))) m.facing *= -1;
      if (!hid() && Math.abs(dy) <= 80 && dx * m.facing > 0 && Math.abs(dx) <= 320) {
        setSt(m, 'windup', 0.8); snd('windup');
        m.lane = laneDist(m, m.facing, Math.max(0, m.facing > 0 ? hi - m.x : m.x - lo));
      }
    } else if (m.state === 'windup') { m.t -= DT; if (m.t <= 0) { setSt(m, 'charge', 0); m.dist = 0; } }
    else if (m.state === 'charge') {
      // 衝撞距離已把巢穴邊緣算進 m.lane; 這裡只做保險夾位
      var ended = chargeStep(m, 380);
      m.x = Math.max(lo, Math.min(hi, m.x));
      if (ended) setSt(m, 'stun', 1.5);
    } else { m.t -= DT; if (m.t <= 0) { setSt(m, 'walk', 0); if (!hid()) m.facing = dx >= 0 ? 1 : -1; if (m.x <= lo) m.facing = 1; if (m.x >= hi) m.facing = -1; } }
  } else if (m.mk === 'cliff') {
    if (m.state === 'walk') {
      h = moveX(m, 40 * m.facing * DT);
      if (h || bound() || (m.onGround && !groundAhead(m, m.facing))) m.facing *= -1;
      if (!hid() && Math.hypot(dx, dy) <= 360) { m.cd -= DT; if (m.cd <= 0) { setSt(m, 'windup', 0.7); m.facing = dx >= 0 ? 1 : -1; m.spitDir = m.facing; snd('windup'); } }
    } else if (m.state === 'windup') {
      // 噴出方向跟著玩家所在側; 潛行開始那一刻起凍結
      if (!hid()) m.spitDir = dx >= 0 ? 1 : -1;
      m.t -= DT;
      if (m.t <= 0) {
        var dir = m.spitDir;
        [30, 50, 70].forEach(function (a) {
          var r = a * Math.PI / 180;
          R.rocks.push({ x: m.x, y: m.y - 10, vx: Math.cos(r) * 300 * dir, vy: -Math.sin(r) * 300, t: 0, kind: 'spit', g: SPIT_G });
        });
        snd('rock_drop'); setSt(m, 'spit', 0.2);
      }
    } else if (m.state === 'spit') { m.t -= DT; if (m.t <= 0) setSt(m, 'pant', 1.5); }
    else { m.t -= DT; if (m.t <= 0) { setSt(m, 'walk', 0); m.cd = 3.0; } }
  } else {
    if (m.state === 'walk') {
      h = moveX(m, 50 * m.facing * DT);
      if (h || bound() || (m.onGround && !groundAhead(m, m.facing))) m.facing *= -1;
      if (!hid() && Math.hypot(dx, dy) <= 400) { m.cd -= DT; if (m.cd <= 0) { setSt(m, 'burrow', 0.6); m.crackX = Math.max(lo, Math.min(hi, p.x)); snd('windup'); } }
    } else if (m.state === 'burrow') { m.t -= DT; if (m.t <= 0) { setSt(m, 'under', 0.8); m.x = m.crackX; } }
    else if (m.state === 'under') { m.t -= DT; if (m.t <= 0) { setSt(m, 'erupt', 0.2); m.x = m.crackX; } }
    else if (m.state === 'erupt') { m.t -= DT; if (m.t <= 0) setSt(m, 'stuck', 1.5); }
    else { m.t -= DT; if (m.t <= 0) { setSt(m, 'walk', 0); m.cd = 4.0; if (!hid()) m.facing = dx >= 0 ? 1 : -1; } }
  }
}
var SPIT_G = 300;

// ---------------------------------------------------------------- 守門巨像(最終 Boss)
var BOSS_HOME = { hx: 640, hy: 230, lx: 420, ly: 300, rx: 860, ry: 300 };
function newBoss() {
  return { hp: 45, maxHp: 45, phase: 1, state: 'idle', t: 1.0, stT: 0, seq: 0, side: 0, hx: 640, hy: 230,
    lf: { x: 420, y: 300, rot: 0, show: true, stuck: false }, rf: { x: 860, y: 300, rot: 0, show: true, stuck: false },
    blocks: null, weak: null, weakId: null, angry: false, eye: 0, lid: 0, split: 0, roar: 0, steam: 0, hit: 0, ko: false, koT: 1.5, plFall: 0,
    chip: 45, chipT: 0.4, lost: 0, acc: 0, F: null, landY: 600, beamDir: 1, bx: 0, from: null, rockI: 0, weakShown: false };
}
function clack(u) { u = Math.max(0, Math.min(1, u)); return Math.min(1, Math.ceil(u * 6) / 6); }
function bossSt(B, name, dur) { B.state = name; B.t = dur; B.stT = 0; B.stD = dur; B.from = { hx: B.hx, hy: B.hy, lx: B.lf.x, ly: B.lf.y, rx: B.rf.x, ry: B.rf.y }; }
function bossBoxes() {
  var B = R.boss, a = [];
  if (!B || B.ko) return a;
  a.push({ id: 'seam', x: B.hx, y: B.hy, w: 200, h: 160 });
  if (B.phase >= 3) a.push({ id: 'core', x: B.hx, y: B.hy, w: 90, h: 90 });
  if (B.lf.show) a.push({ id: 'fistL', x: B.lf.x, y: B.lf.y, w: 110, h: 100 });
  if (B.rf.show) a.push({ id: 'fistR', x: B.rf.x, y: B.rf.y, w: 110, h: 100 });
  return a;
}
function bossWeakBox() {
  var B = R.boss;
  if (!B || !B.weakId) return null;
  var res = null;
  bossBoxes().forEach(function (b) { if (b.id === B.weakId) res = b; });
  return res;
}
function bossHitTest(test, dmg) {
  var B = R.boss;
  if (!B || B.ko) return false;
  var touched = false, weakHit = false;
  bossBoxes().forEach(function (b) { if (test(b)) { touched = true; if (b.id === B.weakId) weakHit = true; } });
  if (!touched) return false;
  if (weakHit) damageBoss(dmg); else { B.hit = 0.1; sndT('hit_block', 0.05); }
  return true;
}
function damageBoss(dmg) {
  var B = R.boss, n = Math.min(dmg, B.hp), i;
  B.chip = B.hp; B.chipT = 0; B.hp -= n; B.hit = 0.1;
  for (i = 0; i < n; i++) { gain(KINDS[B.lost % 4], 1, 'dmg', B.hx, B.hy); B.lost++; }
  if (B.hp <= 0) { bossKo(); return; }
  if ((B.phase === 1 && B.hp <= 30) || (B.phase === 2 && B.hp <= 15)) { bossTrans(); return; }
  sndT('hit', 0.05);
}
function bossTrans() {
  var B = R.boss;
  B.weak = null; B.weakId = null; B.lf.stuck = false; B.rf.stuck = false; B.steam = 0; B.eye = 0; B.beamOn = false; R.beam = null;
  bossSt(B, 'transRise', 0.6); B.next = B.phase + 1; B.rockI = 0;
  snd('boss_phase');
}
function bossKo() {
  var B = R.boss;
  B.hp = 0; B.weak = null; B.weakId = null; B.ko = true; B.koT = 0; R.beam = null; B.eye = 0; B.steam = 0; B.state = 'ko'; B.t = 1.5; B.stT = 0;
  gain('core', 10, 'kill', B.hx, B.hy);
  addPoof(640, 300, 'huge');
  R.kills++;
  snd('boss_down');
}
function bossTop(x) { return groundTopFrom(x, 40); }
function stepBoss() {
  var B = R.boss, p = R.p, H0 = BOSS_HOME, u;
  B.hit = Math.max(0, B.hit - DT); B.chipT = Math.min(0.4, B.chipT + DT); B.stT += DT;
  B.angry = !B.ko;
  if (B.ko) {
    B.koT = Math.min(1.5, B.koT + DT);
    if (B.koT >= 1.5) R.goalFall = Math.min(0.5, R.goalFall + DT);
    return;
  }
  var F = B.F;
  function lerpTo(key, a, b, uu) { return a + (b - a) * clack(uu); }
  switch (B.state) {
    case 'idle':
      B.t = Math.max(0, B.t - DT);
      // 待機倒數到 0 時若獵人還在潛行就停在待機、不出招(規則 35b)
      if (B.t <= 0 && !hid()) {
        var mv;
        if (B.phase === 1) mv = 'slam'; else if (B.phase === 2) mv = B.seq % 2 === 0 ? 'beam' : 'slam'; else mv = B.seq % 2 === 0 ? 'rocks' : 'beam';
        B.seq++;
        if (mv === 'slam') { B.F = (B.side === 0) ? B.lf : B.rf; B.side ^= 1; B.acc = 0; bossSt(B, 'slamPrep', 1.2); }
        else if (mv === 'beam') { B.beamDir = -B.beamDir; bossSt(B, 'beamPrep', 1.2); snd('boss_beam_charge'); }
        else { rockInit(B); bossSt(B, 'rockPrep', 1.0); }
      }
      break;
    case 'slamPrep':
      F = B.F;
      B.t -= DT; B.acc += DT;
      if (B.acc >= 0.1) {
        B.acc = 0;
        if (hid()) { /* 潛行: 拳停住不再跟 */ }
        else if (B.stT < 0.8) F.x += Math.max(-110, Math.min(110, Math.max(70, Math.min(1210, p.x)) - F.x));
        F.y += Math.max(-60, Math.min(60, Math.max(70, p.y - 200) - F.y));
      }
      B.landY = bossTop(F.x);
      if (B.t <= 0) { bossSt(B, 'slamHit', 0.12); B.y0 = F.y; }
      break;
    case 'slamHit':
      F = B.F;
      B.t -= DT; u = 1 - Math.max(0, B.t) / 0.12;
      F.y = B.y0 + (B.landY - 50 - B.y0) * u;
      if (ovl(F.x, F.y, 110, 100, p.x, p.y, p.w, p.h)) hurtPlayer(F.x, 'boss_fist', null, F.y);
      if (B.t <= 0) {
        F.y = B.landY - 40; F.stuck = true; B.weak = 'fist'; B.weakId = F === B.lf ? 'fistL' : 'fistR';
        bossSt(B, 'slamStuck', 3.0); snd('boss_slam'); snd('boss_weak'); R.shake = 0.12;
        R.poofs.push({ x: F.x, y: B.landY, t: 0, size: 'small' });
      }
      break;
    case 'slamStuck':
      B.t -= DT;
      if (B.t <= 0) { B.F.stuck = false; B.weak = null; B.weakId = null; bossSt(B, 'slamRise', 0.6); }
      break;
    case 'slamRise':
      F = B.F; B.t -= DT; u = 1 - Math.max(0, B.t) / 0.6;
      var hxk = F === B.lf ? H0.lx : H0.rx, hyk = F === B.lf ? H0.ly : H0.ry, fr = B.from;
      F.x = lerpTo('x', F === B.lf ? fr.lx : fr.rx, hxk, u); F.y = lerpTo('y', F === B.lf ? fr.ly : fr.ry, hyk, u);
      if (B.t <= 0) bossSt(B, 'idle', 1.0);
      break;
    case 'beamPrep':
      B.t -= DT; B.eye = Math.min(1, B.stT / 1.2);
      if (B.t <= 0) { bossSt(B, 'beam', 1.0); snd('boss_beam'); }
      break;
    case 'beam':
      B.t -= DT; u = 1 - Math.max(0, B.t) / 1.0;
      B.bx = B.beamDir > 0 ? 80 + 1120 * u : 1200 - 1120 * u;
      R.beam = beamEnd(B);
      beamHurt(R.beam);
      B.eye = 1;
      if (B.t <= 0) { R.beam = null; B.eye = 0; bossSt(B, 'beamDown', 0.4); B.lid = 1; }
      break;
    case 'beamDown':
      B.t -= DT; u = 1 - Math.max(0, B.t) / 0.4;
      B.hx = lerpTo('x', B.from.hx, 640, u); B.hy = lerpTo('y', B.from.hy, 360, u);
      if (B.t <= 0) { B.weak = 'seam'; B.weakId = 'seam'; B.steam = 1; bossSt(B, 'overheat', 3.0); snd('boss_weak'); }
      break;
    case 'overheat':
      B.t -= DT;
      if (B.t <= 0) { B.weak = null; B.weakId = null; B.steam = 0; bossSt(B, 'beamRise', 0.6); }
      break;
    case 'beamRise':
      B.t -= DT; u = 1 - Math.max(0, B.t) / 0.6;
      B.hx = lerpTo('x', B.from.hx, H0.hx, u); B.hy = lerpTo('y', B.from.hy, H0.hy, u); B.lid = 1 - clack(u);
      if (B.t <= 0) { B.lid = 0; bossSt(B, 'idle', 1.0); }
      break;
    case 'rockPrep':
      B.t -= DT; u = 1 - Math.max(0, B.t) / 1.0;
      B.blocks.forEach(function (b, i) { b.x = b.x0 + (RK_X[i] - b.x0) * clack(u); b.y = b.y0 + (150 - b.y0) * clack(u); b.land = bossTop(RK_X[i]); });
      if (B.t <= 0) { bossSt(B, 'rockDrop', 1.05); B.rockI = 0; }
      break;
    case 'rockDrop':
      B.t -= DT;
      B.blocks.forEach(function (b, i) {
        var t0 = 0.3 * i, el = B.stT - t0;
        if (el >= 0 && el < 0.15) {
          if (!b.started) { b.started = true; snd('boss_rock'); }
          b.falling = true; b.y = 150 + (b.land - 30 - 150) * (el / 0.15);
          if (ovl(b.x, b.y, 100, 60, p.x, p.y, p.w, p.h)) hurtPlayer(b.x, 'boss_rock', null, b.y);
        } else if (el >= 0.15 && b.show) {
          b.show = false; b.falling = false; addPoof(b.x, b.land - 20, 'small'); R.shake = 0.12;
        }
      });
      if (B.t <= 0) { bossSt(B, 'rockDown', 0.4); }
      break;
    case 'rockDown':
      B.t -= DT; u = 1 - Math.max(0, B.t) / 0.4;
      B.hx = lerpTo('x', B.from.hx, 640, u); B.hy = lerpTo('y', B.from.hy, 395, u);
      if (B.t <= 0) { B.weak = 'core'; B.weakId = 'core'; bossSt(B, 'rockWeak', 3.0); snd('boss_weak'); }
      break;
    case 'rockWeak':
      B.t -= DT;
      if (B.t <= 0) { B.weak = null; B.weakId = null; bossSt(B, 'rockRise', 0.6); }
      break;
    case 'rockRise':
      B.t -= DT; u = 1 - Math.max(0, B.t) / 0.6;
      B.hx = lerpTo('x', B.from.hx, H0.hx, u); B.hy = lerpTo('y', B.from.hy, H0.hy, u);
      if (B.t <= 0) { B.blocks.forEach(function (b, i) { b.show = true; b.falling = false; b.started = false; b.x0 = RK_HOME[i]; b.y0 = 130; b.x = b.x0; b.y = b.y0; }); bossSt(B, 'idle', 1.0); }
      break;
    case 'transRise':
      B.t -= DT; u = 1 - Math.max(0, B.t) / 0.6; fr = B.from;
      B.hx = lerpTo('x', fr.hx, H0.hx, u); B.hy = lerpTo('y', fr.hy, H0.hy, u);
      B.lf.x = lerpTo('x', fr.lx, H0.lx, u); B.lf.y = lerpTo('y', fr.ly, H0.ly, u);
      B.rf.x = lerpTo('x', fr.rx, H0.rx, u); B.rf.y = lerpTo('y', fr.ry, H0.ry, u);
      B.lid = 0;
      if (B.t <= 0) {
        B.phase = B.next; bossSt(B, 'roar', 1.0);
        if (B.phase === 3) { B.lf.show = false; B.rf.show = false; B.lf.stuck = false; B.rf.stuck = false; rockInit(B); }
      }
      break;
    case 'roar':
      B.t -= DT; u = 1 - Math.max(0, B.t) / 1.0;
      B.roar = 1 - u;
      if (B.phase === 2) B.plFall = u; else { B.split = u; B.plFall = 1; }
      if (B.t <= 0) { B.roar = 0; if (B.phase === 2) B.plFall = 1; if (B.phase === 3) B.split = 1; B.seq = 0; bossSt(B, 'idle', 1.0); }
      break;
  }
}
var RK_X = [320, 520, 760, 960], RK_HOME = [330, 500, 780, 950];
function rockInit(B) {
  if (B.blocks) { B.blocks.forEach(function (b, i) { b.show = true; b.falling = false; b.started = false; b.x0 = b.x; b.y0 = b.y; }); return; }
  B.blocks = RK_HOME.map(function (x, i) { return { x: x, y: 130, x0: x, y0: 130, show: true, falling: false, started: false, land: 600 }; });
}
// 光束終點: 從眼睛朝掃描點走, 被第一個實心格擋住
function beamEnd(B) {
  var x1 = B.hx, y1 = B.hy, x2 = B.bx, y2 = 600, d = Math.hypot(x2 - x1, y2 - y1), n = Math.ceil(d / 6), i, ex = x2, ey = y2;
  for (i = 1; i <= n; i++) {
    var qx = x1 + (x2 - x1) * i / n, qy = y1 + (y2 - y1) * i / n;
    if (isSol(SOL, Math.floor(qx / TS), Math.floor(qy / TS))) { ex = qx; ey = qy; break; }
  }
  return { x1: x1, y1: y1, x2: ex, y2: ey, w: 48, t: B.stT };
}
function beamHurt(b) {
  var p = R.p, d = Math.hypot(b.x2 - b.x1, b.y2 - b.y1), n = Math.ceil(d / 8), i;
  for (i = 0; i <= n; i++) {
    var qx = b.x1 + (b.x2 - b.x1) * i / n, qy = b.y1 + (b.y2 - b.y1) * i / n;
    if (Math.abs(qx - p.x) < p.w / 2 + 24 && Math.abs(qy - p.y) < p.h / 2 + 24) { hurtPlayer(qx, 'boss_beam', null, qy); return; }
  }
}

// ---------------------------------------------------------------- 飛行物
function stepProj() {
  var i, a, m, k, p = R.p;
  for (i = R.arrows.length - 1; i >= 0; i--) {
    a = R.arrows[i];
    var sx = a.vx * DT, sy = a.vy * DT, steps = Math.ceil(Math.hypot(sx, sy) / 8), dead = false;
    for (k = 0; k < steps && !dead; k++) {
      a.x += sx / steps; a.y += sy / steps;
      var c = Math.floor(a.x / TS), r = Math.floor(a.y / TS);
      if (a.x < 0 || a.x > W || a.y < -40 || a.y > H + 40) { dead = true; break; }
      if (isSol(SOL, c, r)) { dead = true; break; }
      for (var j = 0; j < R.mons.length; j++) {
        m = R.mons[j];
        if (m.alive && Math.abs(a.x - m.x) <= m.w / 2 + 3 && Math.abs(a.y - m.y) <= m.h / 2 + 3 && !(m.type === 'mother' && m.state === 'under')) {
          dmgMon(m, 1 + atkB(), { kind: 'arrow', fx: a.ox, cy: a.y, atk: a.atk, blockable: true, pl: true });
          dead = true; break;
        }
      }
      if (!dead && R.boss) {
        var ax = a.x, ay = a.y;
        if (bossHitTest(function (b) { return Math.abs(ax - b.x) <= b.w / 2 + 3 && Math.abs(ay - b.y) <= b.h / 2 + 3; }, 1 + atkB())) dead = true;
      }
    }
    a.dist += Math.hypot(sx, sy);
    if (dead || a.dist >= a.max) R.arrows.splice(i, 1);
  }
  for (i = R.bombs.length - 1; i >= 0; i--) {
    var b = R.bombs[i];
    b.t += DT; b.vy += GRAV * DT;
    var bn = Math.ceil(Math.max(Math.abs(b.vx), Math.abs(b.vy)) * DT / 6), ex = false;
    for (k = 0; k < bn && !ex; k++) {
      var bpx = b.x, bpy = b.y;
      b.x += b.vx * DT / bn; b.y += b.vy * DT / bn;
      // 碰到地形: 爆心退回進入實心格之前的自由位置(爆炸判定從那裡算, 才不會被撞上的那面牆自己擋住)
      if (isSol(SOL, Math.floor(b.x / TS), Math.floor(b.y / TS)) || b.x < 0 || b.x > W) { b.x = bpx; b.y = bpy; ex = true; break; }
      for (var q = 0; q < R.mons.length; q++) {
        m = R.mons[q];
        if (m.alive && ovl(b.x, b.y, 12, 12, m.x, m.y, m.w, m.h) && !(m.type === 'mother' && m.state === 'under')) { ex = true; break; }
      }
      if (!ex && R.boss) { var bx = b.x, by = b.y; bossBoxes().forEach(function (bb) { if (ovl(bx, by, 12, 12, bb.x, bb.y, bb.w, bb.h)) ex = true; }); }
    }
    if (b.y > H + 100) { R.bombs.splice(i, 1); continue; }
    if (ex) { boom(b.x, b.y, b.atk, 60, 2 + atkB(), true, 'bomb'); R.bombs.splice(i, 1); }
  }
  for (i = R.shots.length - 1; i >= 0; i--) {
    var s = R.shots[i];
    s.x += s.vx * DT; s.y += s.vy * DT; s.life -= DT;
    if (s.life <= 0 || isSol(SOL, Math.floor(s.x / TS), Math.floor(s.y / TS)) || s.x < 0 || s.x > W || s.y > H + 40) { R.shots.splice(i, 1); continue; }
    if (ovl(s.x, s.y, 12, 12, p.x, p.y, p.w, p.h)) { hurtPlayer(s.x, 'bee', null, s.y); R.shots.splice(i, 1); }
  }
  for (i = R.rocks.length - 1; i >= 0; i--) {
    var rk = R.rocks[i];
    rk.t += DT; rk.vy += rk.g * DT; rk.x += rk.vx * DT; rk.y += rk.vy * DT;
    if (isSol(SOL, Math.floor(rk.x / TS), Math.floor(rk.y / TS)) || rk.x < 0 || rk.x > W || rk.y > H + 40) { addPoof(rk.x, rk.y, 'small'); R.rocks.splice(i, 1); continue; }
    if (ovl(rk.x, rk.y, 20, 20, p.x, p.y, p.w, p.h)) { hurtPlayer(rk.x, rk.kind === 'lizard' ? 'lizard' : 'mother_cliff', null, rk.y); addPoof(rk.x, rk.y, 'small'); R.rocks.splice(i, 1); }
  }
}

// ---------------------------------------------------------------- 快照(錄影與畫面共用)
function monArt(m) {
  if (m.fl) return 'flung';
  if (m.type === 'shield') return m.blockT > 0 && m.hasShield ? 'block' : 'walk';
  return m.state;
}
function buildTele() {
  var tl = [], p = R.p;
  R.mons.forEach(function (m) {
    if (!m.alive || m.fl) return;
    var gy = m.y + m.h / 2, pr;
    // 預告端點一律由這裡截在實心地形 / 平台邊緣, 與實際攻擊距離一致(規則 35a)
    if (m.type === 'boar' && m.state === 'windup') tl.push({ kind: 'lane', x: m.x + m.facing * 24, y: gy, x2: m.x + m.facing * (24 + m.lane), p: 1 - m.t / 0.5 });
    else if (m.type === 'ram' && m.state === 'windup') tl.push({ kind: 'lane', x: m.x + m.facing * 22, y: gy, x2: m.x + m.facing * (22 + m.lane), p: 1 - m.t / 0.6 });
    else if (m.type === 'frog' && m.state === 'crouch' && m.t <= 0.3 && m.onGround) { var pl = frogPlan(m); tl.push({ kind: 'ring', x: pl.lx, y: pl.ly, w: 40, p: 1 - m.t / 0.3 }); }
    else if (m.type === 'bee' && m.state === 'aim') { var ae = rayTrunc(m.x, m.y, m.aimX, m.aimY); tl.push({ kind: 'aim', x: m.x, y: m.y, x2: ae.x, y2: ae.y, p: 1 - m.t / 0.4 }); }
    else if (m.type === 'thorn' && m.state === 'windup') tl.push({ kind: 'sweep', x: m.facing > 0 ? m.x + 20 : m.x - 20 - m.sw, y: gy - 40, w: m.sw, h: 40, p: 1 - m.t / 0.6 });
    else if (m.type === 'hawk' && m.state === 'hover') { var de = hawkSweep(m.x, m.y, m.lockX, m.lockY, 1e9); tl.push({ kind: 'dive', x: m.x, y: m.y, x2: de.x, y2: de.y, p: 1 - m.t / 0.7 }); }
    else if (m.type === 'lizard' && m.state === 'windup') tl.push({ kind: 'column', x: m.colX, y: m.y + 12, y2: groundTopFrom(m.colX, m.y + 12), w: 32, p: 1 - m.t / 0.5 });
    else if (m.type === 'beetle' && m.state === 'fuse') tl.push({ kind: 'blast', x: m.x, y: m.y, r: 70, p: 1 - m.t / 0.8 });
    else if (m.type === 'mother') {
      if (m.mk === 'forest' && m.state === 'windup') tl.push({ kind: 'lane', x: m.x + m.facing * 32, y: gy, x2: m.x + m.facing * (32 + m.lane), p: 1 - m.t / 0.8 });
      else if (m.mk === 'cliff' && m.state === 'windup') {
        var dir = m.spitDir || (p.x >= m.x ? 1 : -1);
        [30, 50, 70].forEach(function (a) {
          var r = a * Math.PI / 180, vx = Math.cos(r) * 300 * dir, vy = -Math.sin(r) * 300, all = [], pts = [], q, hit = false;
          // 每 0.03 秒取一點, 碰到第一個實心格(或出畫面)就截斷, 再均勻抽到 3~12 點
          for (q = 0; q < 70 && !hit; q++) {
            var tt = q * 0.03, ax = m.x + vx * tt, ay = m.y - 10 + vy * tt + 0.5 * SPIT_G * tt * tt;
            if (ax < 0 || ax > W || ay > H || isSol(SOL, Math.floor(ax / TS), Math.floor(ay / TS))) hit = true;
            else all.push([Math.round(ax), Math.round(ay)]);
          }
          if (all.length < 3) return;
          var cnt = Math.min(12, all.length);
          for (q = 0; q < cnt; q++) pts.push(all[Math.round(q * (all.length - 1) / (cnt - 1))]);
          tl.push({ kind: 'arc', pts: pts, p: 1 - m.t / 0.7 });
        });
      } else if (m.mk === 'mine' && m.state === 'under') tl.push({ kind: 'crack', x: m.crackX, y: gy, w: 64, p: 1 - m.t / 0.8 });
    }
  });
  var B = R.boss;
  if (B && !B.ko) {
    if (B.state === 'slamPrep') tl.push({ kind: 'column', x: B.F.x, y: B.F.y + 50, y2: B.landY, w: 110, p: Math.min(1, B.stT / 1.2) });
    else if (B.state === 'beamPrep') tl.push({ kind: 'path', x: B.beamDir > 0 ? 80 : 1200, y: 600, x2: B.beamDir > 0 ? 1200 : 80, p: Math.min(1, B.stT / 1.2) });
    else if (B.state === 'rockPrep') B.blocks.forEach(function (b, i) { tl.push({ kind: 'ring', x: RK_X[i], y: bossTop(RK_X[i]), w: 100, p: Math.min(1, B.stT / 1.0) }); });
    else if (B.state === 'rockDrop') B.blocks.forEach(function (b, i) { if (b.show) tl.push({ kind: 'ring', x: RK_X[i], y: bossTop(RK_X[i]), w: 100, p: 1 }); });
  }
  return tl;
}
function bossSnap() {
  var B = R.boss;
  if (!B) return null;
  return { hx: B.hx, hy: B.hy, phase: B.phase, eye: B.eye, lid: B.lid, split: B.split, weak: B.weak, angry: B.angry,
    lf: { x: B.lf.x, y: B.lf.y, rot: B.lf.rot, show: B.lf.show, stuck: B.lf.stuck }, rf: { x: B.rf.x, y: B.rf.y, rot: B.rf.rot, show: B.rf.show, stuck: B.rf.stuck },
    blocks: B.blocks && B.phase >= 3 ? B.blocks.map(function (b) { return { x: b.x, y: b.y, show: b.show, falling: b.falling }; }) : null,
    plFall: B.plFall, roar: B.roar, steam: B.steam, hit: B.hit > 0, ko: B.ko, koT: B.koT, koDur: 1.5, hp: B.hp, maxHp: B.maxHp, chip: B.chip, chipT: B.chipT };
}
function snap() {
  var p = R.p;
  var S = {
    p: { x: p.x, y: p.y, cls: R.cls, facing: p.facing, pose: p.pose, poseT: p.poseT, sw: p.pose === 'slash' ? p.swingIdx : 0, inv: p.inv > 0, stealth: p.stealth, stealthT: p.stealthT, unT: p.unT },
    m: [], tl: buildTele(),
    a: R.arrows.map(function (a) { return [a.x, a.y, a.ang]; }),
    // 第 4 項 = 玩家判定框此刻在爆炸圈內(沒被牆擋住): 炸彈現在炸開會打到自己
    b: R.bombs.map(function (b) { return [b.x, b.y, b.t, circleBox(b.x, b.y, 60, p) && !lineBlocked(b.x, b.y, p.x, p.y)]; }),
    s: R.shots.map(function (s) { return [s.x, s.y]; }),
    rk: R.rocks.map(function (s) { return [s.x, s.y, s.t, s.kind]; }),
    ex: R.expl.map(function (e) { return [e.x, e.y, e.t, e.dur, e.r, e.kind]; }),
    wv: R.waves.map(function (e) { return [e.x, e.y, e.t, e.left, e.right]; }),
    po: R.poofs.map(function (e) { return [e.x, e.y, e.t, e.size]; }),
    cr: R.crHp.slice(), chest: R.chestOpen, boss: bossSnap(), beam: R.beam ? { x1: R.beam.x1, y1: R.beam.y1, x2: R.beam.x2, y2: R.beam.y2, w: 48, t: R.beam.t } : null,
    gfall: R.goalFall
  };
  R.mons.forEach(function (m) {
    if (!m.alive) return;
    S.m.push({ k: m.type, mk: m.mk, x: m.x, y: m.y, w: m.w, h: m.h, f: m.facing, st: monArt(m), hit: m.hitT > 0, brood: m.brood, t: m.anim, hp: m.hp, mhp: m.maxHp,
      sh: m.sh, msh: m.maxSh, chip: m.chip, chipT: m.chipT, fd: m.fl ? m.fl.dir : 0, ang: (m.state === 'dive' || m.state === 'return') ? m.ang : 0, fuse: m.state === 'fuse' ? Math.max(0, 0.8 - m.t) : 0.8,
      hs: m.hasShield, brk: m.breakT, stT: m.stT, stD: m.stD, weak: isWeak(m) });
  });
  return S;
}

// ---------------------------------------------------------------- 每步更新
function stepRun() {
  if (R.state === 'fail' || R.state === 'won') return;
  var p = R.p, i, rec = R.state === 'run';
  if (rec) R.f++;
  stepPlayer();
  stepGroups();
  R.mons.forEach(stepMon);
  if (R.boss) stepBoss();
  if (p.skKill && R.cls === 'sword' && p.dashT > 0) p.skCd = 0;
  stepProj();
  updateBits();
  if (R.state === 'fail') return;
  if (rec) {
    R.mons.forEach(function (m) {
      if (!m.alive || m.fl) return;
      if (m.type === 'mother' && (m.state === 'under' || m.state === 'burrow')) return;
      if (m.type === 'mother' && m.state === 'erupt' && Math.abs(p.x - m.x) > 40) return;
      if (ovl(p.x, p.y, p.w, p.h, m.x, m.y, m.w, m.h)) {
        if (m.type === 'ram' && m.state === 'butt') hurtPlayer(m.x, 'ram', { butt: m.facing }, m.y);
        else hurtPlayer(m.x, monName(m), null, m.y);
      }
    });
  }
  if (R.state === 'fail') return;
  R.L.picks.forEach(function (d) {
    if (R.taken[d.id] !== undefined || !zOk(d.z, R.rep)) return;
    if (ovl(p.x, p.y, p.w, p.h, d.x, d.y, 24, 24)) { R.taken[d.id] = R.f; gain(d.kind, 1, 'pick', d.x, d.y); sndT('pickup', 0.03); }
  });
  var ch = R.L.chest;
  if (ch && zOk(ch.z, R.rep) && !R.chestOpen && ovl(p.x, p.y, p.w, p.h, ch.x, ch.y, 40, 36)) {
    R.chestOpen = true; R.chestF = R.f; R.gotItems.push(ch.item); pushNotice(ch.item); snd('chest_open');
  }
  if (rec) {
    for (i = 0; i < R.L.spikes.length; i++) {
      var sp = R.L.spikes[i];
      if (ovl(p.x, p.y, p.w, p.h, sp[0] * TS + 20, sp[1] * TS + 30, 40, 20)) { hurtSpike(sp[0] * TS + 20, sp[1] * TS + 30); break; }
    }
  }
  if (R.state === 'fail') return;
  [['popups', 0.8], ['chainTexts', 0.8], ['poofs', 0.5], ['expl', 0.4], ['waves', 0.4]].forEach(function (z) {
    var arr = R[z[0]];
    for (var j = arr.length - 1; j >= 0; j--) { arr[j].t += DT; if (arr[j].t >= z[1]) arr.splice(j, 1); }
  });
  R.shake = Math.max(0, R.shake - DT);
  if (R.notice) { R.notice.t += DT; if (R.notice.t >= 1.5) R.notice = null; }
  if (!R.notice && R.noticeQ.length) { R.notice = { type: R.noticeQ.shift(), t: 0 }; snd('item_get'); }
  if (p.y - p.h / 2 > H + 20) { failRun('fall', p.x, 702); return; }
  var g = R.L.goal, gActive = !g.hidden || R.goalFall >= 0.5;
  var at = gActive && rec && ovl(p.x, p.y, p.w, p.h, g.x, g.y, 40, 80);
  if (at && !R.atGoal) { snd('goal_reach'); }
  R.atGoal = at;
  if (rec) {
    R.frames.push(snap());
    if (at && edge.down && !tutGateCheck()) finishRun();
  }
}
// 過關動畫(1.4 秒): 按 ↓ 那一刻錄影結束、世界定格
var CLEAR_DUR = 1.4;
function finishRun() {
  var g = R.L.goal, p = R.p;
  R.state = 'clear'; R.atGoal = true; R.irisSnd = false;
  R.cT = 0; T.gate = null; T.bub = null; T.arrows = [];
  R.focus = { x: (p.x + g.x) / 2, y: (p.y + g.y) / 2 };
  R.lastSnap = R.frames[R.frames.length - 1];
  clearKeys();
  snd('level_clear');
}
// 世界放大倍率: 0.08~0.72 秒由 1 推到 1.7(先慢後快再慢), 之後保持
function clearZoom(t) {
  if (t <= 0.08) return 1;
  if (t >= 0.72) return 1.7;
  var u = (t - 0.08) / 0.64;
  return 1 + 0.7 * u * u * (3 - 2 * u);
}

// ---------------------------------------------------------------- 過關結算
function addStock(kind, n) { G.stock[kind] += n; G.bump[kind] = 0; }
function winRun() {
  R.state = 'won';
  var l = R.l, g = R.L.goal, N = R.f;
  // 通知網站(winRun 每次真的過關只跑一次): 單關通關(第幾關從 1 起); 最後一關(第 8 關)緊接送全局通關
  if (window.PVDX) { PVDX.levelClear(l + 1); if (l === 7) PVDX.gameClear(); }
  var rec = { frames: R.frames, events: R.events, N: N, cls: R.cls, ver: G.repairVer[l], goal: { x: g.x, y: g.y }, pickF: R.taken, chestF: R.chestF,
    marks: R.events.slice(0, 60).map(function (e) { return { p: Math.min(1, e.f / Math.max(1, N)), kind: e.kind }; }) };
  var cb = clearBonus(l), run = {};
  KINDS.forEach(function (k) { G.tot.run[k] += R.run[k]; G.tot.clearBonus[k] += cb[k]; run[k] = R.run[k] + cb[k]; addStock(k, run[k]); });
  rec.run = run;
  G.kills += R.kills;
  R.gotItems.forEach(function (t) {
    addOwned(t);
    if (t === 'heart') G.heartTaken[l] = true; else G.chestTaken[l] = true;
  });
  var rt = r1(N / 60);
  G.clearedAny = true;
  var old = G.rec[l], first8 = (l === 7 && !G.bossBeaten);
  G.res = { time: rt, run: run, rates: null, cls: R.cls, items: R.gotItems.slice(), oldTime: null, oldRates: null, oldCls: null, oldRun: null };
  if (!old) { G.rec[l] = rec; G.rp[l] = { pos: 0, cursor: 0 }; G.pendingRec = null; }
  else { G.pendingRec = rec; G.res.oldTime = r1(old.N / 60); G.res.oldRates = rateOf(l, old); G.res.oldCls = old.cls; G.res.oldRun = old.run; }
  G.res.rates = rateOf(l, rec);
  G.resLevel = l; G.resFirst = !old;
  checkBossOpen();
  if (first8) {
    G.bossBeaten = true; G.endTime = G.gt; G.rec[7] = rec; G.pendingRec = null; G.rp[7] = { pos: 0, cursor: 0 };
    G.screen = 'ending'; G.ending = { t: 0 }; R = null; SOL = null; clearKeys();
    return;
  }
  G.screen = 'result';
}
function checkBossOpen() {
  if (G.opened[7]) return;
  for (var i = 0; i < 7; i++) if (!G.rec[i]) return;
  G.opened[7] = true;
}
function clearKeys() { keys.left = keys.right = keys.up = false; edge.z = edge.x = edge.down = edge.jump = edge.jumpRel = false; }

// ---------------------------------------------------------------- 回放
// 觸控模式縮圖在卡片 (16,8)、0.8 倍(128×72)
function thumbPos(l, x, y) {
  if (isTouch()) return [CARD_POS[l][0] + 16 + x * 0.1, CARD_POS[l][1] + 8 + y * 0.1];
  return [CARD_POS[l][0] + 8 + x * 0.125, CARD_POS[l][1] + 8 + y * 0.125];
}
var ICON_X = { wood: 36, stone: 206, crystal: 376, core: 546 };
function flyMode() { return G.screen === 'map' && !G.paused; }
function spawnGain(l, kind, amt, x, y) {
  if (amt <= 0) return;
  G.tot.replay[kind] += amt;
  if (!flyMode()) { addStock(kind, amt); return; }
  if (T.stage === 'replay' && l === 0) T.flightSeen = true;
  var tp = thumbPos(l, x, y), n = Math.min(5, amt);
  for (var i = 0; i < n; i++) {
    G.flights.push({ x0: tp[0] + (Math.random() * 12 - 6), y0: tp[1] + (Math.random() * 12 - 6), kind: kind, t: 0, n: i === n - 1 ? amt - (n - 1) : 1 });
  }
}
function advanceReplays(dt) {
  for (var l = 0; l < 8; l++) {
    var rec = G.rec[l];
    if (!rec) continue;
    var rp = G.rp[l];
    rp.pos += dt * 60 * speedMul(l);
    for (var guard = 0; guard < 4; guard++) {
      var fl = Math.floor(rp.pos);
      while (rp.cursor < rec.events.length && rec.events[rp.cursor].f <= Math.min(fl, rec.N)) {
        var ev = rec.events[rp.cursor++];
        spawnGain(l, ev.kind, amountFor(l, ev.src, ev.n), ev.x, ev.y);
      }
      if (fl >= rec.N) {
        var cb = clearBonus(l);
        KINDS.forEach(function (k) { spawnGain(l, k, cb[k], rec.goal.x, rec.goal.y); });
        rp.pos -= rec.N; rp.cursor = 0;
      } else break;
    }
  }
}
function flightPos(f) {
  var tx = ICON_X[f.kind], ty = 20, t = f.t;
  if (t < 0.2) { var u0 = t / 0.2, e = 1 - (1 - u0) * (1 - u0); return [f.x0, f.y0 - 28 * e]; }
  var u = Math.min(1, (t - 0.2) / 0.5), sx = f.x0, sy = f.y0 - 28;
  return [sx + (tx - sx) * u, sy + (ty - sy) * u - 4 * 80 * u * (1 - u)];
}
function updateFlights(dt) {
  if (G.flights.length && !flyMode()) {
    G.flights.forEach(function (f) { addStock(f.kind, f.n); });
    G.flights = [];
    return;
  }
  for (var i = G.flights.length - 1; i >= 0; i--) {
    var f = G.flights[i];
    f.t += dt;
    if (f.t >= 0.7) { addStock(f.kind, f.n); sndT('coin_land', 0.06); G.flights.splice(i, 1); }
  }
}

// ---------------------------------------------------------------- 選單邏輯
function allClearedBefore8() { for (var i = 0; i < 7; i++) if (!G.rec[i]) return false; return true; }
function levelState(l) {
  if (l === 7) { if (G.rec[7]) return 'cleared'; return G.opened[7] ? 'open' : 'sealed'; }
  if (G.rec[l]) return 'cleared';
  if (G.opened[l]) return 'open';
  return PARENTS[l].some(function (p) { return !!G.rec[p]; }) ? 'buyable' : 'sealed';
}
function canPay(cost) { return KINDS.every(function (k) { return !cost[k] || G.stock[k] >= cost[k]; }); }
function pay(cost) { KINDS.forEach(function (k) { if (cost[k]) G.stock[k] -= cost[k]; }); }
function costOf(kind, n) { var c = zeros(); c[kind] = n; return c; }
function recruitCost() { return costOf('wood', RECRUIT_COST); }
var STAT_KEYS = ['speed', 'hp', 'cd', 'atk'], STAT_COSTS = [SPEED_COST, HP_COST, CD_COST, ATK_COST], STAT_MAX = [3, 3, 3, 3];
function statCost(i) {
  var lv = G.up[STAT_KEYS[i]], arr = STAT_COSTS[i];
  return lv >= arr.length ? null : costOf('core', arr[lv]);
}
function anyAffordable() {
  var ok = false;
  ['hunter', 'bomber'].forEach(function (c) { if (!G.recruited[c] && canPay(recruitCost())) ok = true; });
  for (var i = 0; i < 4; i++) { var c = statCost(i); if (c && canPay(c)) ok = true; }
  return ok;
}
// 兩個職業都已解鎖且四項強化全滿
function allUpgraded() {
  if (!G.recruited.hunter || !G.recruited.bomber) return false;
  for (var i = 0; i < 4; i++) if (statCost(i)) return false;
  return true;
}
function firstAffordableUpRow() {
  var r = -1;
  if (['hunter', 'bomber'].some(function (c) { return !G.recruited[c] && canPay(recruitCost()); })) return 0;
  for (var i = 0; i < 4; i++) { var c = statCost(i); if (c && canPay(c)) { r = i + 1; break; } }
  return r;
}
// 商店: 最便宜的未售完裝置價格(全售完回 1e9)
function shopMinCost() {
  var m = 1e9;
  SHOP.forEach(function (s, i) { if (G.shopLeft[i] > 0 && s.cost < m) m = s.cost; });
  return m;
}
function shopAffordable() { return G.stock.crystal >= shopMinCost(); }
function shopSoldOut() { return G.shopLeft.every(function (v) { return v <= 0; }); }
function firstBuyableShopRow() {
  for (var i = 0; i < SHOP.length; i++) if (G.shopLeft[i] > 0 && G.stock.crystal >= SHOP[i].cost) return i;
  return -1;
}
// 欄由左到右: 營地(升級所、商店) / 第 1 關 / 第 2、3 關 / 第 4~7 關 / 第 8 關
var MAP_COLS = [[8, 9], [0], [1, 2], [3, 4, 5, 6], [7]];
// 卡片垂直中心: 關卡卡電腦版高 136、觸控模式 152(名稱條兩行); 升級所 / 商店卡固定 136
function cardHalf(i) { return (isTouch() && i < 8) ? 91 : 68; }
function cardWid(i) { return (isTouch() && i < 8) ? 160 : 176; }
// 觸控模式的欄: 第 4~7 關分成兩欄(第 4、6 關 / 第 5、7 關)
var MAP_COLS_TOUCH = [[8, 9], [0], [1, 2], [3, 6], [4, 5], [7]];
function mapCols() { return isTouch() ? MAP_COLS_TOUCH : MAP_COLS; }
function cardCY(i) { return CARD_POS[i][1] + cardHalf(i); }
function mapMove(dx, dy) {
  var MAP_COLS = mapCols();
  var s = G.mapSel, ci = 0, i, moved = false;
  MAP_COLS.forEach(function (col, k) { if (col.indexOf(s) >= 0) ci = k; });
  if (dy) {
    var col = MAP_COLS[ci], idx = col.indexOf(s) + dy;
    if (idx >= 0 && idx < col.length) { G.mapSel = col[idx]; moved = true; }
  } else {
    var nc = ci + dx;
    if (nc < 0 || nc >= MAP_COLS.length) return;
    var best = MAP_COLS[nc][0], bd = 1e9;
    for (i = 0; i < MAP_COLS[nc].length; i++) {
      var d = Math.abs(cardCY(MAP_COLS[nc][i]) - cardCY(s));
      if (d < bd) { bd = d; best = MAP_COLS[nc][i]; }
    }
    G.mapSel = best; moved = true;
  }
  if (moved) snd('ui_move');
}
function minSiteCost(l) {
  var m = 1e9;
  LEVELS[l].sites.forEach(function (st, i) { if (!G.repaired[l][i] && st.cost < m) m = st.cost; });
  return m;
}
function openPanel(l) {
  var ci = CLS_LIST.indexOf(G.lastCls[l]);
  G.panel = { l: l, row: 2, clsSel: ci < 0 ? 0 : ci, siteSel: 0, slotSel: 0, sub: null, devSel: 0, slotFor: 0 };
  G.screen = 'levelPanel';
  if (l === 0 && !T.off && T.pick === 2 && T.prep < 2) { T.prep = 1; tutPrepOpen(); }
}
// 裝置倉庫清單(只含還沒安裝的種類, 固定順序)
function devEntries() {
  var out = [];
  DEV_ORDER.forEach(function (t) { var n = storeOf(t); if (n > 0) out.push({ type: t, n: n }); });
  return out;
}
function equipDev(l, slot, type) {
  G.slots[l][slot] = type || null;
  snd('equip');
}
function doRepair(l, i) {
  var st = LEVELS[l].sites[i];
  if (G.repaired[l][i] || G.stock.stone < st.cost) { snd('ui_deny'); return; }
  G.stock.stone -= st.cost;
  G.repaired[l][i] = true; G.repT[l][i] = G.t; G.repairVer[l]++;
  snd('repair');
  G.timers.push({ t: 0.6, fn: function () { snd('fog_clear'); } });
}
function startChallenge() {
  var P = G.panel, l = P.l;
  var owned = CLS_LIST.filter(function (c) { return G.recruited[c]; });
  if (owned.length <= 1) { var cl = owned[0]; G.panel = null; startRun(l, cl); }
  else { P.sub = 'class'; }
}
function panelKey(code) {
  var P = G.panel, l = P.l, L = LEVELS[l];
  if (P.sub === 'dev') {
    var ent = devEntries(), cnt = ent.length + 1;
    if (code === 'ArrowUp') { if (P.devSel > 0) { P.devSel--; snd('ui_move'); } }
    else if (code === 'ArrowDown') { if (P.devSel < cnt - 1) { P.devSel++; snd('ui_move'); } }
    else if (code === 'KeyX') { P.sub = null; snd('ui_back'); }
    else if (code === 'KeyZ') {
      if (P.devSel === 0) { equipDev(l, P.slotFor, null); P.sub = null; }
      else if (ent[P.devSel - 1]) {
        equipDev(l, P.slotFor, ent[P.devSel - 1].type);
        P.sub = null;
      } else snd('ui_deny');
    }
    return;
  }
  if (P.sub === 'class') {
    if (code === 'ArrowLeft') { if (P.clsSel > 0) { P.clsSel--; snd('ui_move'); } }
    else if (code === 'ArrowRight') { if (P.clsSel < 2) { P.clsSel++; snd('ui_move'); } }
    else if (code === 'KeyX') { P.sub = null; snd('ui_back'); }
    else if (code === 'KeyZ') {
      var c = CLS_LIST[P.clsSel];
      if (!G.recruited[c]) { snd('ui_deny'); return; }
      snd('ui_confirm');
      G.panel = null; startRun(l, c);
    }
    return;
  }
  if (code === 'ArrowUp') { if (P.row > 0) { P.row--; snd('ui_move'); } }
  else if (code === 'ArrowDown') { if (P.row < 2) { P.row++; snd('ui_move'); } }
  else if (code === 'ArrowLeft' || code === 'ArrowRight') {
    var d = code === 'ArrowLeft' ? -1 : 1;
    if (P.row === 0 && L.sites.length) { P.siteSel = Math.max(0, Math.min(2, P.siteSel + d)); snd('ui_move'); }
    else if (P.row === 1) { P.slotSel = Math.max(0, Math.min(1, P.slotSel + d)); snd('ui_move'); }
  } else if (code === 'KeyX') { G.panel = null; G.screen = 'map'; snd('ui_back'); }
  else if (code === 'KeyZ') {
    if (P.row === 0) { if (L.sites.length) doRepair(l, P.siteSel); else snd('ui_deny'); }
    else if (P.row === 1) {
      // 倉庫沒有未安裝的裝置且這一格是空的 → 不反應
      if (storeTotal() > 0 || G.slots[l][P.slotSel]) { P.sub = 'dev'; P.slotFor = P.slotSel; P.devSel = devEntries().length ? 1 : 0; snd('ui_confirm'); } else snd('ui_deny');
    } else {
      snd('ui_confirm');
      if (!tutPrepZ()) startChallenge();
    }
  }
}
function doUnlock(l) {
  if (G.stock.wood < UNLOCK_COST[l]) { snd('ui_deny'); return; }
  G.stock.wood -= UNLOCK_COST[l]; G.opened[l] = true;
  snd('unlock_level');
}
function mapZ() {
  var s = G.mapSel;
  if (s < 8) {
    var st = levelState(s);
    if (st === 'sealed') snd('ui_deny');
    else if (st === 'buyable') doUnlock(s);
    else {
      snd('ui_confirm');
      if (!(s === 0 && tutPickZ())) openPanel(s);
    }
  } else if (s === 8) { G.screen = 'upgrade'; G.upRow = 0; G.upSel = 0; snd('ui_confirm'); }
  else { G.screen = 'shop'; G.shopSel = 0; snd('ui_confirm'); }
}
function shopKey(code) {
  if (code === 'ArrowUp') { if (G.shopSel > 0) { G.shopSel--; snd('ui_move'); } }
  else if (code === 'ArrowDown') { if (G.shopSel < SHOP.length - 1) { G.shopSel++; snd('ui_move'); } }
  else if (code === 'KeyX') { G.screen = 'map'; snd('ui_back'); }
  else if (code === 'KeyZ') {
    var i = G.shopSel, s = SHOP[i];
    if (G.shopLeft[i] > 0 && G.stock.crystal >= s.cost) {
      G.stock.crystal -= s.cost; G.shopLeft[i]--; addOwned(s.type);
      snd('buy_item');
    } else snd('ui_deny');
  }
}
function upgradeKey(code) {
  if (code === 'ArrowUp') { if (G.upRow > 0) { G.upRow--; snd('ui_move'); } }
  else if (code === 'ArrowDown') { if (G.upRow < 4) { G.upRow++; snd('ui_move'); } }
  else if (code === 'ArrowLeft' && G.upRow === 0) { G.upSel = 0; snd('ui_move'); }
  else if (code === 'ArrowRight' && G.upRow === 0) { G.upSel = 1; snd('ui_move'); }
  else if (code === 'KeyX') { G.screen = 'map'; snd('ui_back'); }
  else if (code === 'KeyZ') {
    if (G.upRow === 0) {
      var c = G.upSel === 0 ? 'hunter' : 'bomber';
      if (!G.recruited[c] && G.stock.wood >= RECRUIT_COST) {
        G.stock.wood -= RECRUIT_COST; G.recruited[c] = true;
        // 解鎖特效 1.3 秒(只播 unlock_class, 不疊 upgrade / ui_confirm)
        G.unlockFx = { idx: G.upSel, t: 0 };
        snd('unlock_class');
      } else snd('ui_deny');
    } else {
      var k = G.upRow - 1, cost = statCost(k);
      if (cost && canPay(cost)) {
        pay(cost); G.up[STAT_KEYS[k]]++;
        snd('upgrade');
      } else snd('ui_deny');
    }
  }
}
function toMap() {
  if (T.demo === 1) T.demo = 2;
  T.bub = null; T.arrows = []; T.gate = null; T.spot = null; T.swapFn = null; T.fade6 = -1;
  R = null; SOL = null; G.panel = null; G.screen = 'map'; G.paused = false; clearKeys();
  checkBossOpen();
}

// ---------------------------------------------------------------- 輸入(只用鍵盤)
var soundInited = false;
function ensureSound() {
  if (soundInited) return; soundInited = true;
  try { if (window.Sound && Sound.init) Sound.init(); } catch (e) { if (window.console) console.error(e); }
}
function applyMute() { try { if (window.Sound && Sound.setMuted) Sound.setMuted(!!G.muted); } catch (e) { } }
function startSession() {
  G.screen = 'map'; G.mapSel = 0;
  G.gt = 0;
  snd('title_start');
  if (!T.off && T.pick === 0) { T.pick = 1; tutMapPickOpen(); }
}
function inputDown(code) {
  if (window.PVDX && PVDX.paused) return;
  ensureSound();
  if (code === 'KeyM') { G.muted = !G.muted; applyMute(); return; }
  var sc = G.screen;
  if (sc === 'title') { if (code === 'Escape') return; startSession(); return; }
  if (sc === 'ending') {
    if (code === 'Escape') return;
    if (G.ending.t < 10.4) G.ending.t = 10.4;
    else { G.ending = null; toMap(); }
    return;
  }
  if (G.lockT > 0) return;
  if (code === 'Escape' && (sc === 'play' || sc === 'map' || sc === 'levelPanel' || sc === 'upgrade' || sc === 'shop')) {
    // 死亡動畫與過關動畫期間不能暫停
    if (sc === 'play' && R && R.state !== 'run') return;
    G.paused = !G.paused; clearKeys(); snd('pause');
    return;
  }
  if (G.paused) {
    if (sc === 'play') {
      if (code === 'KeyZ') { G.paused = false; startRun(R.l, R.cls); }
      else if (code === 'KeyX') toMap();
    }
    return;
  }
  if (sc === 'map') {
    if (T.lockMap) { if (code === 'KeyZ') tutZ(); return; }
    if (code === 'ArrowLeft') mapMove(-1, 0);
    else if (code === 'ArrowRight') mapMove(1, 0);
    else if (code === 'ArrowUp') mapMove(0, -1);
    else if (code === 'ArrowDown') mapMove(0, 1);
    else if (code === 'KeyZ') mapZ();
  } else if (sc === 'levelPanel') panelKey(code);
  else if (sc === 'upgrade') upgradeKey(code);
  else if (sc === 'shop') shopKey(code);
  else if (sc === 'play') {
    if (R.state === 'run' && R.demo) { if (code === 'KeyZ') tutDemoZ(); return; }
    if (R.state !== 'run') return;
    if (code === 'ArrowLeft') keys.left = true;
    else if (code === 'ArrowRight') keys.right = true;
    else if (code === 'ArrowUp') { keys.up = true; edge.jump = true; }
    else if (code === 'ArrowDown') edge.down = true;
    else if (code === 'KeyZ') edge.z = true;
    else if (code === 'KeyX') edge.x = true;
  } else if (sc === 'result') {
    if (code === 'KeyZ') {
      if (G.pendingRec) {
        G.rec[G.resLevel] = G.pendingRec; G.rp[G.resLevel] = { pos: 0, cursor: 0 }; G.pendingRec = null;
      }
      snd('ui_confirm');
      var firstClr = G.resFirst && G.resLevel === 0; G.resFirst = false;
      toMap();
      if (firstClr) tutStartReplay();
    } else if (code === 'KeyX' && G.pendingRec) {
      G.pendingRec = null; snd('ui_back'); toMap();
    }
  } else if (sc === 'fail') {
    if (code === 'KeyZ') { snd('ui_confirm'); startRun(R.l, R.cls); }
    else if (code === 'KeyX') { snd('ui_back'); toMap(); }
  }
}
function inputUp(code) {
  if (code === 'ArrowLeft') keys.left = false;
  else if (code === 'ArrowRight') keys.right = false;
  else if (code === 'ArrowUp') { if (keys.up) edge.jumpRel = true; keys.up = false; }
}
function inputReset() { clearKeys(); }
var GAME_KEYS = { ArrowLeft: 1, ArrowRight: 1, ArrowUp: 1, ArrowDown: 1, Space: 1, KeyZ: 1, KeyX: 1, Escape: 1, KeyM: 1 };
function onKeyDown(e) {
  if (e.repeat) { if (GAME_KEYS[e.code]) e.preventDefault(); return; }
  if (GAME_KEYS[e.code]) e.preventDefault();
  if (e.code === 'Space' && G.screen !== 'title' && G.screen !== 'ending') return;
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  inputDown(e.code);
}
function onKeyUp(e) {
  if (GAME_KEYS[e.code]) e.preventDefault();
  inputUp(e.code);
}

// ---------------------------------------------------------------- 繪製: 關卡場景
var FONT = '"Microsoft JhengHei","PingFang TC","Noto Sans TC",sans-serif';
function txt(c, s, x, y, size, color, align) {
  c.save(); c.font = 'bold ' + size + 'px ' + FONT; c.fillStyle = color || '#fff'; c.textAlign = align || 'left'; c.textBaseline = 'middle';
  c.shadowColor = 'rgba(0,0,0,0.8)'; c.shadowBlur = 4;
  c.fillText(s, x, y); c.restore();
}
function solidBase(L, c, r) { if (c < 0 || c >= GW || r >= GH) return true; if (r < 0) return false; return L.base[r][c] > 0; }
function siteMeta(st) {
  if (st.meta) return st.meta;
  var cs = {}, meta = [], maxR = -1, cmin = 99, cmax = -1;
  st.cells.forEach(function (q) { cs[q[0] + ',' + q[1]] = 1; maxR = Math.max(maxR, q[1]); cmin = Math.min(cmin, q[0]); cmax = Math.max(cmax, q[0]); });
  st.cells.forEach(function (q) {
    var c = q[0], r = q[1], a = c, b = c;
    while (cs[(a - 1) + ',' + r]) a--;
    while (cs[(b + 1) + ',' + r]) b++;
    var o = { c: c, r: r, end: false, bottom: false, order: 0 };
    if (st.kind === 'bridge') {
      o.end = (c === a || c === b);
      var md = Math.floor((b - a) / 2); o.order = md > 0 ? Math.min(c - a, b - c) / md : 0;
    } else if (st.kind === 'stairs') {
      o.bottom = (r === maxR); o.order = cmax > cmin ? (c - cmin) / (cmax - cmin) : 0;
    }
    meta.push(o);
  });
  st.meta = meta;
  return meta;
}
function drawTerrain(c, L) {
  Art.drawBackground(c, { theme: L.theme, t: G.t });
  L.lairs.forEach(function (q) { Art.drawLairBack(c, { x: q.x, y: q.y, w: q.w, h: q.h, lairTheme: L.theme }); });
  drawGroundOnly(c, L);
  L.spikes.forEach(function (q) { Art.drawSpike(c, { x: q[0] * TS + 20, y: q[1] * TS + 20, theme: L.theme }); });
}
function drawGroundOnly(c, L) {
  var r, cc;
  for (r = 0; r < GH; r++) for (cc = 0; cc < GW; cc++) {
    var v = L.base[r][cc];
    if (v) Art.drawGround(c, { x: cc * TS + 20, y: r * TS + 20, theme: v === 2 ? 'lair' : L.theme,
      open: { n: !solidBase(L, cc, r - 1), e: !solidBase(L, cc + 1, r), s: !solidBase(L, cc, r + 1), w: !solidBase(L, cc - 1, r) } });
  }
}
function drawSites(c, L, rep, buildFn) {
  L.sites.forEach(function (st, i) {
    var rp = !!rep[i], bt = buildFn(i);
    if (st.kind === 'nestgate') { Art.drawNestGate(c, { x: st.gate.x, y: st.gate.y, open: rp, lairTheme: L.theme, buildT: bt, buildDur: 0.6 }); return; }
    if (st.kind === 'rubble' && rp && bt >= 0.6) return;
    siteMeta(st).forEach(function (o) {
      Art.drawWorksite(c, { x: o.c * TS + 20, y: o.r * TS + 20, kind: st.kind, role: st.role, repaired: rp, theme: L.theme, end: o.end, bottom: o.bottom,
        buildT: bt, buildDur: 0.6, order: o.order });
    });
  });
}
function drawMon(c, m) {
  var s = { x: m.x, y: m.y, facing: m.f, state: m.st, flingDir: m.fd, hit: m.hit, brood: !!m.brood, t: m.t };
  switch (m.k) {
    case 'boar': Art.drawBoar(c, s); break;
    case 'frog': delete s.t; Art.drawFrog(c, s); break;
    case 'bee': Art.drawShooterBee(c, s); break;
    case 'thorn': s.stateT = m.stT; delete s.flingDir; Art.drawThorn(c, s); break;
    case 'ram': Art.drawRam(c, s); break;
    case 'hawk': s.angle = m.ang; Art.drawHawk(c, s); break;
    case 'lizard': delete s.flingDir; Art.drawLizard(c, s); break;
    case 'shield': s.hasShield = !!m.hs; s.breakT = m.brk; s.breakDur = 0.4; Art.drawShieldman(c, s); break;
    case 'beetle': s.fuseT = m.fuse; s.fuseDur = 0.8; Art.drawBeetle(c, s); break;
    case 'bat': Art.drawBat(c, s); break;
    case 'mother': Art.drawBroodmother(c, { x: m.x, y: m.y, kind: m.mk, facing: m.f, state: m.st, stateT: m.stT, stateDur: m.stD, hit: m.hit, t: m.t }); break;
  }
}
function teleState(q) {
  return { kind: q.kind, x: q.x === undefined ? null : q.x, y: q.y === undefined ? null : q.y, x2: q.x2 === undefined ? null : q.x2, y2: q.y2 === undefined ? null : q.y2,
    w: q.w === undefined ? null : q.w, h: q.h === undefined ? null : q.h, r: q.r === undefined ? null : q.r, pts: q.pts || null, p: Math.max(0, Math.min(1, q.p)), t: G.t };
}
function bossDrawState(B) {
  return { hx: B.hx, hy: B.hy, phase: B.phase, eye: B.eye, lid: B.lid, split: B.split, weak: B.weak, angry: B.angry, lf: B.lf, rf: B.rf, blocks: B.blocks,
    plFall: B.plFall, roar: B.roar, steam: B.steam, hit: B.hit, ko: B.ko, koT: B.koT, koDur: 1.5, t: G.t };
}
var BOSS_IDLE = { hx: 640, hy: 230, phase: 1, eye: 0, lid: 0, split: 0, weak: null, angry: false, lf: { x: 420, y: 300, rot: 0, show: true, stuck: false }, rf: { x: 860, y: 300, rot: 0, show: true, stuck: false },
  blocks: null, plFall: 0, roar: 0, steam: 0, hit: false, ko: false, koT: 1.5, koDur: 1.5, hp: 45, maxHp: 45, chip: 45, chipT: 0.4 };
// o: {L, rep, S, mode: 'live' | 'preview' | 'thumb', taken(id), chestOpen, fog(i), build(i), noPlayer(死亡動畫: 不畫玩家), noRings(死亡 / 過關動畫: 不畫技能環與射程圈), cheering(過關動畫歡呼姿勢), cheerT(過關動畫: 旗子揮動與歡呼姿勢)}
function drawScene(c, o) {
  var L = o.L, S = o.S, live = o.mode === 'live', thumb = o.mode === 'thumb', i;
  if (!o.cached) drawTerrain(c, L);
  S.cr.forEach(function (hp, k) { if (hp > 0) Art.drawCrackWall(c, { x: L.cracks[k][0] * TS + 20, y: L.cracks[k][1] * TS + 20, hp: hp, theme: L.theme }); });
  drawSites(c, L, o.rep, o.build);
  // 區域型預告 / 爆炸 / 炸彈範圍圈: 先 clip 扣掉實心格再畫, 不畫進牆裡(規則 35a); 其他預告的端點已由 buildTele 截好
  function clipped(fn) {
    if (!o.sol) o.sol = live ? SOL : solidForScene(o);
    solidClipBegin(c, o.sol); fn(); c.restore();
  }
  if (o.mode !== 'preview') S.tl.forEach(function (q) {
    if (q.kind === 'blast' || q.kind === 'ring' || q.kind === 'crack') clipped(function () { Art.drawTelegraph(c, teleState(q)); });
    else Art.drawTelegraph(c, teleState(q));
  });
  L.picks.forEach(function (d) {
    if (!zOk(d.z, o.rep) || o.taken(d.id)) return;
    Art.drawPickup(c, { x: d.x, y: d.y, kind: d.kind, t: G.t });
  });
  if (L.chest && zOk(L.chest.z, o.rep)) Art.drawChest(c, { x: L.chest.x, y: L.chest.y, open: !!o.chestOpen });
  var g = L.goal;
  if (!g.hidden || S.gfall > 0) {
    var gy = g.y;
    if (g.hidden) gy = g.y - (1 - Math.min(1, S.gfall / 0.5)) * 400;
    Art.drawGoal(c, { x: g.x, y: gy, reached: live && !!R.atGoal, cheerT: o.cheerT === undefined ? CLEAR_DUR : o.cheerT, cheerDur: CLEAR_DUR });
  }
  if (live && !o.noRings && S.p && S.p.cls === 'hunter' && !S.p.stealth) Art.drawRangeRing(c, { x: S.p.x, y: S.p.y, radius: 260 });
  if (live && !o.noRings && S.p) {
    var p = R.p, cdT = Math.max(0, Math.min(p.skDur, p.skDur - p.skCd));
    Art.drawSkillRing(c, { x: p.x, y: p.y + p.h / 2, cls: R.cls, cdT: cdT, cdDur: p.skDur, readyT: p.readyT, readyDur: 0.5, castT: p.castT, castDur: 0.3,
      denyT: p.denyT, denyDur: 0.25, stealthLeft: p.stealth ? Math.max(0, 2.5 - p.stealthT) : 0, stealthDur: 2.5 });
  }
  S.m.forEach(function (m) { drawMon(c, m); });
  if (S.boss) Art.drawColossus(c, bossDrawState(S.boss));
  S.m.forEach(function (m) {
    if (thumb && m.k !== 'mother') return;
    if (o.mode === 'preview') return;
    var big = m.k === 'mother';
    Art.drawHpBar(c, { x: m.x, y: m.y - m.h / 2 - 8, hp: m.hp, maxHp: m.mhp, shield: m.sh, maxShield: m.msh, chip: m.chip, chipT: m.chipT, chipDur: 0.4, big: big, weak: !!m.weak, shieldSide: m.k === 'shield' && m.f > 0 ? 1 : -1 });
  });
  // 巨像血量歸 0(崩解演出起)不再畫血條
  if (S.boss && o.mode !== 'preview' && !S.boss.ko && S.boss.hp > 0) {
    var B = S.boss;
    Art.drawBossHpBar(c, { x: B.hx, y: B.hy - 80 - 20 - 44 * B.split, hp: B.hp, maxHp: B.maxHp, marks: [30, 15], chip: B.chip, chipT: B.chipT, chipDur: 0.4, weak: !!B.weak });
  }
  if (S.p && !o.noPlayer) Art.drawPlayer(c, { x: S.p.x, y: S.p.y, cls: S.p.cls, facing: S.p.facing, pose: o.cheering ? 'cheer' : S.p.pose, poseT: o.cheering ? Math.max(0, o.cheerT) : S.p.poseT, swingIdx: (!o.cheering && S.p.pose === 'slash') ? (S.p.sw || 0) : 0, invuln: S.p.inv, stealth: S.p.stealth,
    stealthT: S.p.stealthT, stealthDur: 2.5, unstealthT: S.p.unT, unstealthDur: 0.3 });
  S.a.forEach(function (a) { Art.drawArrow(c, { x: a[0], y: a[1], angle: a[2] }); });
  S.b.forEach(function (b) {
    // 縮圖不畫範圍圈(radius = 0); 範圍圈不畫進牆裡
    if (thumb) Art.drawBomb(c, { x: b[0], y: b[1], t: b[2], radius: 0, danger: false });
    else clipped(function () { Art.drawBomb(c, { x: b[0], y: b[1], t: b[2], radius: 60, danger: !!b[3] }); });
  });
  S.s.forEach(function (s) { Art.drawBeeShot(c, { x: s[0], y: s[1] }); });
  S.rk.forEach(function (s) { Art.drawRockShot(c, { x: s[0], y: s[1], t: s[2], kind: s[3] }); });
  if (S.beam) Art.drawBossBeam(c, S.beam);
  S.ex.forEach(function (e) { clipped(function () { Art.drawExplosion(c, { x: e[0], y: e[1], t: e[2], dur: e[3], radius: e[4], kind: e[5] }); }); });
  S.wv.forEach(function (e) { Art.drawShockwave(c, { x: e[0], y: e[1], t: e[2], dur: 0.4, left: e[3], right: e[4], halfH: 40 }); });
  S.po.forEach(function (e) { Art.drawPoof(c, { x: e[0], y: e[1], t: e[2], dur: 0.5, size: e[3] }); });
  if (live) R.bits.forEach(function (b) { if (b.t >= 0) Art.drawDropBit(c, { x: b.px, y: b.py, kind: b.kind, t: b.t, dur: 1.0, vx: b.vxx, vy: b.vyy }); });
  L.sites.forEach(function (st, k) {
    var cp = o.fog(k);
    if (cp < 0) return;
    st.fog.forEach(function (f) {
      Art.drawFog(c, { x: f[0] * TS, y: f[1] * TS, w: f[2] * TS, h: f[3] * TS, t: G.t, theme: L.theme, clearP: cp, ox: st.ox, oy: st.oy, maxR: st.maxR });
    });
  });
  if (!thumb) L.sites.forEach(function (st, k) {
    if (!o.rep[k]) Art.drawSiteSign(c, { x: st.sign[0] * TS + 20, y: st.sign[1] * TS - 24, role: st.role, num: k + 1 });
  });
}
// 非即時畫面(縮圖回放、預覽)的實心格表: 目前修復狀態 + 這一幀還沒碎的裂岩牆
function solidForScene(o) {
  var s = makeSolid(o.L, o.rep);
  o.L.cracks.forEach(function (q, i) { if (o.S.cr[i] > 0) s[q[1]][q[0]] = 1; });
  return s;
}
var PREVIEW_STATE = { boar: 'walk', frog: 'crouch', bee: 'fly', thorn: 'idle', ram: 'walk', hawk: 'circle', lizard: 'crawl', shield: 'walk', beetle: 'crawl', bat: 'fly', mother: 'walk' };
function previewSnap(l) {
  var L = LEVELS[l], rep = G.repaired[l];
  var S = { p: null, m: [], tl: [], a: [], b: [], s: [], rk: [], ex: [], wv: [], po: [], cr: L.cracks.map(function () { return 3; }), chest: G.chestTaken[l], boss: l === 7 ? BOSS_IDLE : null, beam: null, gfall: 0 };
  function add(d, type, x, y, idx) {
    var D = MDEF[type];
    S.m.push({ k: type, mk: d.kind || null, x: x, y: y, w: D.w, h: D.h, f: -1, st: PREVIEW_STATE[type], hit: false, brood: !!d.brood, t: 0, hp: D.hp, mhp: D.hp, sh: D.sh || 0, msh: D.sh || 0,
      chip: D.hp + (D.sh || 0), chipT: 0.4, fd: 0, ang: 0, fuse: 0.8, hs: !!D.sh, brk: 0.4, stT: 0, stD: 0, weak: false });
  }
  L.mons.forEach(function (d) {
    if (!zOk(d.z, rep)) return;
    if (d.type === 'bats') { for (var i = 0; i < 3; i++) add(d, 'bat', d.x + 50 * Math.cos(i * 2.0944 + G.t * 1.6), d.y + 50 * Math.sin(i * 2.0944 + G.t * 1.6)); }
    else add(d, d.type, d.x, d.y);
  });
  return S;
}
function buildFnFor(l) {
  return function (i) {
    if (!G.repaired[l][i]) return 0;
    var d = G.t - G.repT[l][i];
    return d < 0.6 ? d : 0.6;
  };
}
function fogFnFor(l) {
  return function (i) {
    if (!G.repaired[l][i]) return 0;
    var d = G.t - G.repT[l][i] - 0.6;
    if (d < 0) return 0;
    if (d < 0.8) return d / 0.8;
    return -1;
  };
}
var thumbCache = {};
function getThumb(l) {
  if (thumbCache[l] !== undefined) return thumbCache[l];
  var cv = null, c2 = null;
  try { cv = document.createElement('canvas'); cv.width = 320; cv.height = 180; c2 = cv.getContext('2d'); } catch (err) { c2 = null; }
  if (!c2) { thumbCache[l] = null; return null; }
  c2.scale(0.25, 0.25);
  try { drawTerrain(c2, LEVELS[l]); } catch (e2) { if (window.console) console.error(e2); thumbCache[l] = null; return null; }
  thumbCache[l] = cv;
  return cv;
}
function drawThumb(c, l, S, taken, chestOpen) {
  var L = LEVELS[l], p = CARD_POS[l];
  c.save();
  if (isTouch()) { c.translate(p[0] + 16, p[1] + 8); c.scale(0.8, 0.8); } // 觸控模式縮圖 0.8 倍
  else c.translate(p[0] + 8, p[1] + 8);
  c.beginPath(); c.rect(0, 0, 160, 90); c.clip();
  var cv = getThumb(l);
  if (cv) c.drawImage(cv, 0, 0, 160, 90);
  c.scale(0.125, 0.125);
  drawScene(c, { L: L, rep: G.repaired[l], S: S, mode: 'thumb', taken: taken, chestOpen: chestOpen, cached: !!cv, fog: fogFnFor(l), build: buildFnFor(l) });
  c.restore();
}
function drawPreview(c, l) {
  var L = LEVELS[l];
  c.save();
  c.translate(60, 96); c.beginPath(); c.rect(0, 0, 640, 360); c.clip(); c.scale(0.5, 0.5);
  drawScene(c, { L: L, rep: G.repaired[l], S: previewSnap(l), mode: 'preview', taken: function () { return false; }, chestOpen: G.chestTaken[l], fog: fogFnFor(l), build: buildFnFor(l) });
  c.restore();
}
function hudState(mode) {
  var bt = {};
  KINDS.forEach(function (k) { bt[k] = Math.min(0.2, G.bump[k]); });
  var s = { mode: mode, stock: { wood: G.stock.wood, stone: G.stock.stone, crystal: G.stock.crystal, core: G.stock.core }, ratePerMin: totalRates(), bumpT: bt, bumpDur: 0.2,
    time: null, hp: null, maxHp: null };
  if (mode === 'level' && R) { s.time = r1(R.f / 60); s.hp = Math.max(0, R.p.hp); s.maxHp = maxHp(); }
  return s;
}
// 關卡內聲音開關圖示: 角落依關卡決定(右上 → 左上 → 左下 → 右下, 取第一個不蓋到素材、寶箱、終點旗、工程牌、怪物出生格的角; 目前 levels.js 只有第 4 關走左上)
var SND_CORNERS = [[1250, 62], [30, 62], [30, 690], [1250, 690]];
function soundCorner(L) {
  var i, k;
  for (i = 0; i < SND_CORNERS.length; i++) {
    var cx = SND_CORNERS[i][0], cy = SND_CORNERS[i][1], blocked = false;
    var hit = function (x, y, w, h) { return ovl(cx, cy, 36, 36, x, y, w, h); };
    L.picks.forEach(function (d) { if (hit(d.x, d.y, 24, 24)) blocked = true; });
    if (L.chest && hit(L.chest.x, L.chest.y, 40, 36)) blocked = true;
    if (!L.goal.hidden && hit(L.goal.x, L.goal.y, 40, 80)) blocked = true;
    L.sites.forEach(function (st) { if (hit(st.sign[0] * TS + 20, st.sign[1] * TS - 24, 36, 48)) blocked = true; });
    L.mons.forEach(function (d) { var D = d.type === 'bats' ? MDEF.bat : MDEF[d.type]; if (hit(d.x, d.y, D.w, D.h)) blocked = true; });
    if (!blocked) return { x: cx, y: cy };
  }
  return { x: SND_CORNERS[0][0], y: SND_CORNERS[0][1] };
}
// 矩形是否碰到玩家、活著的怪物、地上還沒撿的素材、飛行物(教學橫幅與聲音圖示變淡用, 框外擴 4px 判定)
function liveOverlap(x, y, w, h) {
  var p = R.p, hitAny = false;
  w += 8; h += 8;
  if (ovl(x, y, w, h, p.x, p.y, p.w, p.h)) return true;
  R.mons.forEach(function (m) { if (m.alive && ovl(x, y, w, h, m.x, m.y, m.w, m.h)) hitAny = true; });
  R.L.picks.forEach(function (d) { if (R.taken[d.id] === undefined && zOk(d.z, R.rep) && ovl(x, y, w, h, d.x, d.y, 24, 24)) hitAny = true; });
  R.arrows.forEach(function (a) { if (ovl(x, y, w, h, a.x, a.y, 12, 12)) hitAny = true; });
  R.bombs.forEach(function (a) { if (ovl(x, y, w, h, a.x, a.y, 12, 12)) hitAny = true; });
  R.shots.forEach(function (a) { if (ovl(x, y, w, h, a.x, a.y, 12, 12)) hitAny = true; });
  R.rocks.forEach(function (a) { if (ovl(x, y, w, h, a.x, a.y, 20, 20)) hitAny = true; });
  return hitAny;
}
function fadeToward(v, target, dt) { return v < target ? Math.min(target, v + 6 * dt) : Math.max(target, v - 6 * dt); }
function fadeStep(dt) {
  if (G.screen === 'play' && R) {
    // 操作方式面板收在左上角的範圍: 電腦 0.6 倍(150×136), 觸控模式不縮小(250×226)
    var cpB = isTouch() ? [143, 167, 270, 240] : [93, 122, 170, 144];
    G.fPanel = fadeToward(G.fPanel, (T.demo >= 2 && ctrlPanelVisible() && liveOverlap(cpB[0], cpB[1], cpB[2], cpB[3])) ? 0.3 : 1, dt);
    G.fSnd = fadeToward(G.fSnd, liveOverlap(R.snd.x, R.snd.y, 36, 36) ? 0.3 : 1, dt);
  } else { G.fPanel = 1; G.fSnd = 1; }
}
function drawSoundIcon(c) {
  if (isTouch() || (T.sum && G.screen === 'map')) return;
  var inLv = !!R && (G.screen === 'play' || G.screen === 'result' || G.screen === 'fail');
  Art.drawSoundIcon(c, { x: inLv ? R.snd.x : 1250, y: inLv ? R.snd.y : 62, on: !G.muted, alpha: inLv ? G.fSnd : 1 });
}
// 觸控模式: 「按 ↓ 完成關卡」板子(底 y−8、高 48)和右下 A 鈕(觸控層 LAYOUT.a: 中心 y 568、半徑 72, 可按範圍 +16)同高時, 右緣停在 A 鈕左邊
function goalPromptMaxR(y) {
  if (!isTouch()) return 1272;
  var top = y - 56, bot = y - 8;
  if (bot < 568 - 88 || top > 568 + 88) return 1272;
  var ax = CW - Math.max(OX / 2, 92) - OX;   // A 鈕中心(設計座標)
  return Math.min(1272, ax - 88 - 6);
}
// 關卡畫面(世界部分, 不含資訊列): mode 'run' 一般 | 'clear' 過關動畫(以焦點放大) | 'dead' 死亡動畫(不畫玩家)
function liveScene(c, mode) {
  var S = R.lastSnap || R.frames[R.frames.length - 1];
  var sh = R.shake > 0 && mode === 'run';
  var cl = mode === 'clear', dead = mode === 'dead';
  if (sh) { c.save(); c.translate((Math.random() * 2 - 1) * 3, (Math.random() * 2 - 1) * 3); }
  if (cl) {
    var z = clearZoom(R.cT), f = R.focus;
    c.save(); c.translate(f.x, f.y); c.scale(z, z); c.translate(-f.x, -f.y);
  }
  drawScene(c, { L: R.L, rep: R.rep, S: S, mode: 'live', taken: function (id) { return R.taken[id] !== undefined; }, chestOpen: R.chestOpen,
    fog: function (i) { return R.rep[i] ? -1 : 0; }, build: function (i) { return 0.6; }, noPlayer: dead, noRings: dead || cl, cheering: cl && R.cT >= 0, cheerT: cl ? Math.max(0, R.cT) : undefined });
  var g = R.L.goal, gActive = !g.hidden || R.goalFall >= 0.5;
  if (mode === 'run' && R.atGoal && R.state === 'run' && gActive) Art.drawGoalPrompt(c, { x: g.x, y: g.y - 40, t: G.t, maxR: goalPromptMaxR(g.y - 40) });
  R.popups.forEach(function (p) { Art.drawPopup(c, { x: p.x, y: p.y, t: p.t, dur: 0.8, kind: p.kind, value: p.value }); });
  R.chainTexts.forEach(function (p) { Art.drawChainText(c, { x: p.x, y: p.y, n: p.n, t: p.t, dur: 0.8 }); });
  if (cl) c.restore();
  if (sh) c.restore();
}

// ---------------------------------------------------------------- 繪製: 各畫面
function repCount(l) { var n = 0; G.repaired[l].forEach(function (v) { if (v) n++; }); return n; }
// 每處工程在縮圖上佔的區域(迷霧矩形 + 工程結構格外接矩形, × 0.125, 相對縮圖左上, 裁在 160×90 內)
function siteRegion(l, i) {
  var st = LEVELS[l].sites[i];
  if (st.thumbRects) return st.thumbRects;
  var rs = st.fog.map(function (f) { return [f[0] * TS, f[1] * TS, f[2] * TS, f[3] * TS]; });
  var cells = st.kind === 'nestgate' ? gateCells(st) : st.cells, c0 = 99, r0 = 99, c1 = -1, r1_ = -1;
  cells.forEach(function (q) { c0 = Math.min(c0, q[0]); r0 = Math.min(r0, q[1]); c1 = Math.max(c1, q[0] + 1); r1_ = Math.max(r1_, q[1] + 1); });
  rs.push([c0 * TS, r0 * TS, (c1 - c0) * TS, (r1_ - r0) * TS]);
  var out = [];
  rs.forEach(function (q) {
    var x0 = Math.max(0, q[0] * 0.125), y0 = Math.max(0, q[1] * 0.125), x1 = Math.min(160, (q[0] + q[2]) * 0.125), y1 = Math.min(90, (q[1] + q[3]) * 0.125);
    if (x1 > x0 && y1 > y0) out.push([x0, y0, x1 - x0, y1 - y0]);
  });
  st.thumbRects = out;
  return out;
}
function cardRegions(l) {
  var p = CARD_POS[l], regs = [];
  LEVELS[l].sites.forEach(function (st, i) {
    regs.push({ repaired: !!G.repaired[l][i], rects: siteRegion(l, i).map(function (q) { return [p[0] + 8 + q[0], p[1] + 8 + q[1], q[2], q[3]]; }) });
  });
  return regs;
}
// 觸控模式: 升級所 / 商店卡上移, 讓出左下角給方向鍵(原位置 (62,430) 會被方向鍵整張蓋住);
// 關卡卡改成 160×182(名稱條三行: 名稱 + 秒數 / 木材 石頭 / 水晶 魔核, 字 21px、素材圖示 30px), 以 y 365 為中線上下對稱:
//   第 1 關 (290,274) 在最左(壓在營地的橋頭上), 分出第 2 關 (515,46) / 第 3 關 (515,502);
//   第 2 關分出第 4 關 (720,170)、第 5 關 (895,46), 第 3 關分出第 7 關 (720,378)、第 6 關 (895,502)(近的子卡在第 3 欄、遠的在第 4 欄);
//   第 4~7 關匯到第 8 關 (1112,274)。每條連線都從來源卡右緣中點畫到目標卡左緣中點, 離其他卡片至少 33px、互不交叉
//   (2→5、3→6 從第 4 / 7 關的上 / 下方 33px 外水平通過; 4、7→8 從第 4 欄兩張卡中間通過)。
//   卡片 160 寬 × 4~5 欄塞在 x 290~1272 內, 欄間只剩 45~57px: 第 1→2 / 3、第 5 / 6→8 關的連線較陡(高低差 228)
var CARD_POS_TOUCH = [[290, 274], [515, 46], [515, 502], [720, 170], [895, 46], [895, 502], [720, 378], [1112, 274], [62, 52], [62, 214]];
function touchCardPos() {
  if (!isTouch()) return;
  for (var i = 0; i < CARD_POS_TOUCH.length; i++) CARD_POS[i] = CARD_POS_TOUCH[i].slice();
}
function renderMap(c) {
  touchCardPos();
  Art.drawMapBackground(c, { t: G.t });
  [[0, 1], [0, 2], [1, 3], [1, 4], [2, 5], [2, 6], [3, 7], [4, 7], [5, 7], [6, 7]].forEach(function (e) {
    Art.drawMapLink(c, { x1: CARD_POS[e[0]][0] + cardWid(e[0]), y1: cardCY(e[0]), x2: CARD_POS[e[1]][0], y2: cardCY(e[1]), lit: !!G.rec[e[0]] });
  });
  var left7 = 0, i;
  for (i = 0; i < 7; i++) if (!G.rec[i]) left7++;
  for (var l = 0; l < 8; l++) {
    var st = levelState(l), rec = G.rec[l], cost = zeros();
    if (l < 7 && (st === 'sealed' || st === 'buyable')) cost.wood = UNLOCK_COST[l];
    var zr = zeros(), rates = rec ? rateOf(l, rec) : zr;
    var built = (st === 'open' || st === 'cleared');
    Art.drawLevelCard(c, { x: CARD_POS[l][0], y: CARD_POS[l][1], index: l + 1, name: LEVELS[l].name, theme: THEMES[l], state: st, cost: cost, stock: G.stock,
      need: (l === 7 && st === 'sealed') ? left7 : null, rates: rates, recordCls: rec ? rec.cls : null, recordTime: rec ? r1(rec.N / 60) : null,
      repairedCount: repCount(l), siteCount: LEVELS[l].sites.length, devices: built ? G.slots[l].slice() : null });
    var rp = null, marks = [];
    if (st === 'open') drawThumb(c, l, previewSnap(l), function () { return false; }, G.chestTaken[l]);
    else if (st === 'cleared') {
      var fi = Math.min(Math.floor(G.rp[l].pos), rec.N), S = rec.frames[fi];
      drawThumb(c, l, S, function (id) { return rec.pickF[id] !== undefined && rec.pickF[id] <= fi; }, rec.chestF >= 0 ? fi >= rec.chestF : G.chestTaken[l]);
      rp = Math.max(0, Math.min(1, G.rp[l].pos / Math.max(1, rec.N))); marks = rec.marks;
    }
    Art.drawCardOverlay(c, { x: CARD_POS[l][0], y: CARD_POS[l][1], live: built, speedMul: rec ? speedMul(l) : 1, newArea: !!rec && rec.ver < G.repairVer[l], selected: G.mapSel === l, replayP: rp, marks: marks,
      regions: (built && LEVELS[l].sites.length) ? cardRegions(l) : [] });
  }
  Art.drawWorkshopCard(c, { x: CARD_POS[8][0], y: CARD_POS[8][1], anyAffordable: anyAffordable(), allDone: allUpgraded(), selected: G.mapSel === 8 });
  Art.drawShopCard(c, { x: CARD_POS[9][0], y: CARD_POS[9][1], anyAffordable: shopAffordable(), soldOut: shopSoldOut(), selected: G.mapSel === 9 });
  G.flights.forEach(function (f) {
    var pp = flightPos(f);
    Art.drawFlyingMaterial(c, { x: pp[0], y: pp[1], kind: f.kind, t: f.t, dur: 0.7 });
  });
  Art.drawHud(c, hudState('map'));
  // 觸控模式: 準備頁 / 商店 / 升級所蓋在大地圖上時, 不畫大地圖自己的操作列(面板有自己的)
  if (!T.lockMap && !(isTouch() && G.screen !== 'map')) {
    var kl =[{ key: 'up' }, { key: 'down' }, { key: 'left' }, { key: 'right' }, ' 選擇  ', { key: 'z' }, ' 確定'];
    if (!isTouch()) kl.push('  ', { key: 'esc' }, ' 暫停  ', { key: 'm' }, ' 靜音');
    Art.drawKeyLine(c, { x: 440, y: 702, align: 'left', px: 16, parts: kl, tone: 'board' });
  }
}
function renderPanel(c) {
  renderMap(c);
  var P = G.panel, l = P.l, rec = G.rec[l], L = LEVELS[l];
  Art.drawLevelPanel(c, {
    index: l + 1, name: L.name, theme: L.theme, row: P.row,
    sites: L.sites.map(function (st, i) { return { status: G.repaired[l][i] ? 'done' : 'open', role: st.role, kind: st.kind, cost: costOf('stone', G.repaired[l][i] ? 0 : st.cost) }; }),
    siteSel: L.sites.length ? P.siteSel : null, slots: G.slots[l].slice(), slotSel: P.slotSel,
    storeCount: storeTotal(),
    recordCls: rec ? rec.cls : null, recordTime: rec ? r1(rec.N / 60) : null, rates: rec ? rateOf(l, rec) : null, speedMul: rec ? speedMul(l) : 1,
    newArea: !!rec && rec.ver < G.repairVer[l], stock: G.stock, hintOff: !T.off && T.stage === 'prep'
  });
  drawPreview(c, l);
  if (P.row === 0 && L.sites.length && !P.sub) {
    var b = L.sites[P.siteSel].box;
    Art.drawSiteHighlight(c, { x: 60 + b[0] * 20, y: 96 + b[1] * 20, w: Math.max(20, Math.min(640, b[2] * 20)), h: Math.max(20, Math.min(360, b[3] * 20)), active: true });
  }
  if (P.sub === 'dev') {
    Art.drawDevicePanel(c, { slotNo: P.slotFor + 1, level: l + 1, current: G.slots[l][P.slotFor], entries: devEntries(), sel: P.devSel });
  } else if (P.sub === 'class') {
    Art.drawClassSelect(c, { sel: P.clsSel, classes: CLS_LIST.map(function (k) { return { cls: k, owned: !!G.recruited[k] }; }) });
  }
}
function renderShop(c) {
  renderMap(c);
  Art.drawShopPanel(c, { sel: G.shopSel, stock: G.stock,
    entries: SHOP.map(function (s, i) { return { type: s.type, cost: costOf('crystal', s.cost), left: G.shopLeft[i], max: s.max }; }) });
}
function renderUpgrade(c) {
  renderMap(c);
  var fx = G.unlockFx;
  Art.drawUpgradePage(c, {
    row: G.upRow, recruitSel: G.upSel,
    recruits: [{ cls: 'hunter', owned: !!G.recruited.hunter, cost: recruitCost() }, { cls: 'bomber', owned: !!G.recruited.bomber, cost: recruitCost() }],
    stats: STAT_KEYS.map(function (k, i) { return { key: k, lv: G.up[k], maxLv: STAT_MAX[i], cost: statCost(i) }; }),
    stock: G.stock, unlockIdx: fx ? fx.idx : null, unlockT: fx ? Math.min(1.3, fx.t) : 1.3, unlockDur: 1.3
  });
}
function endTotals() {
  var t = zeros();
  KINDS.forEach(function (k) { t[k] = G.tot.run[k] + G.tot.replay[k] + G.tot.clearBonus[k]; });
  return t;
}
function drawTutorialNow(c) {
  if (G.paused) return;
  var tv = tutView();
  if (tv) Art.drawTutorial(c, tv);
}
function drawSummaryNow(c) {
  var m = T.sum;
  if (m && G.screen === 'map') Art.drawTutSummary(c, { openT: m.openT, closing: m.closing, closeT: m.closeT, canClose: m.openT >= 2.6, t: T.clk });
}
function render() {
  var c = ctx;
  c.setTransform(canvas.width / CW, 0, 0, canvas.height / H, 0, 0);
  c.clearRect(0, 0, CW, H);
  // 設計區(1280)置中: 最外層平移一次, 其餘座標維持設計值
  c.save(); c.translate(OX, 0);
  try { renderWorld(c); } finally { c.restore(); }
  if (window.PVDX) PVDX.draw(c);
}
function renderWorld(c) {
  var sc = G.screen;
  if (sc === 'title') Art.drawTitle(c, { t: G.t, touch: isTouch() });
  else if (sc === 'map') { renderMap(c); drawTutorialNow(c); drawSummaryNow(c); if (G.paused) Art.drawPausePanel(c, { mode: 'map', touch: isTouch() }); }
  else if (sc === 'levelPanel') { renderPanel(c); drawTutorialNow(c); if (G.paused) Art.drawPausePanel(c, { mode: 'map', touch: isTouch() }); }
  else if (sc === 'shop') { renderShop(c); drawTutorialNow(c); if (G.paused) Art.drawPausePanel(c, { mode: 'map', touch: isTouch() }); }
  else if (sc === 'upgrade') { renderUpgrade(c); drawTutorialNow(c); if (G.paused) Art.drawPausePanel(c, { mode: 'map', touch: isTouch() }); }
  else if (sc === 'play' || sc === 'result' || sc === 'fail') {
    var rs = R.state;
    if (sc === 'result') {
      // 結算面板開著: 全木板當底(t = 1.4)
      Art.drawClearIris(c, { cx: R.focus.x, cy: R.focus.y, t: CLEAR_DUR, dur: CLEAR_DUR });
      Art.drawHud(c, hudState('level'));
      Art.drawResultPanel(c, G.res);
    } else if (rs === 'fail') {
      // 死亡動畫(畫定格的世界, 不畫玩家)與失敗面板(t = 1.3 暗下的世界當底)
      liveScene(c, 'dead');
      var d = R.dead;
      Art.drawDeathFx(c, { x: d.x, y: d.y, cls: R.cls, facing: d.facing, hitX: d.hitX, hitY: d.hitY, t: Math.min(DEATH_DUR, R.deadT), dur: DEATH_DUR });
      Art.drawHud(c, hudState('level'));
      if (ctrlPanelVisible()) Art.drawCtrlPanel(c, ctrlPanelState());
      if (sc === 'fail') Art.drawFailPanel(c, {});
    } else if (rs === 'respawn') {
      // 第 1 關教學重生(規則 3a): 重置後的新一趟定格, 角色由 drawRespawnFx 畫
      liveScene(c, 'dead');
      Art.drawRespawnFx(c, { x: R.L.start.x, y: R.L.start.y, cls: R.cls, facing: 1, t: Math.min(1.6, R.rt), dur: 1.6 });
      Art.drawHud(c, hudState('level'));
      if (ctrlPanelVisible()) Art.drawCtrlPanel(c, ctrlPanelState());
    } else if (rs === 'clear') {
      liveScene(c, 'clear');
      Art.drawClearIris(c, { cx: R.focus.x, cy: R.focus.y, t: Math.max(0, Math.min(CLEAR_DUR, R.cT)), dur: CLEAR_DUR });
      Art.drawHud(c, hudState('level'));
    } else {
      liveScene(c, 'run');
      Art.drawHud(c, hudState('level'));
      if (R.notice) Art.drawItemNotice(c, { type: R.notice.type, t: R.notice.t, dur: 1.5 });
      if (ctrlPanelVisible()) Art.drawCtrlPanel(c, ctrlPanelState());
      drawTutorialNow(c);
      if (G.paused) Art.drawPausePanel(c, { mode: 'level', touch: isTouch() });
    }
  } else if (sc === 'ending') {
    Art.drawEnding(c, { t: Math.min(14, G.ending.t), totalTime: r1(G.endTime || G.gt), kills: G.kills, totals: endTotals() });
  }
  drawSoundIcon(c);
}

// ---------------------------------------------------------------- 主迴圈
var acc = 0, lastTs = 0, duckNow = false;
function desiredMusic() {
  var sc = G.screen;
  if (sc === 'title') return 'title';
  if (sc === 'ending') return 'ending';
  if ((sc === 'play' || sc === 'result' || sc === 'fail') && R) return MUSIC_OF[R.L.theme];
  return 'map';
}
function setMusic(name) {
  if (G.musicNow === name) return;
  G.musicNow = name;
  try { if (window.Sound && Sound.playMusic) Sound.playMusic(name); } catch (e) { if (window.console) console.error(e); }
}
function update(dt) {
  G.t += dt;
  KINDS.forEach(function (k) { G.bump[k] = Math.min(1, G.bump[k] + dt); });
  if (soundInited) {
    setMusic(desiredMusic());
    if (duckNow !== G.paused) { duckNow = G.paused; try { if (window.Sound && Sound.setMusicDuck) Sound.setMusicDuck(duckNow); } catch (e) { } }
  }
  if (G.paused) return;
  if (G.screen === 'title') return;
  if (G.screen === 'ending') {
    var en = G.ending;
    en.t = Math.min(14, en.t + dt);
    return;
  }
  G.gt += dt;
  if (G.lockT > 0) {
    G.lockT -= dt;
    if (G.lockT <= 0) { var fn = G.lockFn; G.lockFn = null; G.lockT = 0; if (fn) fn(); }
  }
  for (var ti = G.timers.length - 1; ti >= 0; ti--) { G.timers[ti].t -= dt; if (G.timers[ti].t <= 0) { var tf = G.timers[ti].fn; G.timers.splice(ti, 1); tf(); } }
  advanceReplays(dt);
  updateFlights(dt);
  tutStep(dt);
  fadeStep(dt);
  if (G.unlockFx) { G.unlockFx.t += dt; if (G.unlockFx.t >= 1.3) G.unlockFx = null; }
  if (G.screen === 'play' && R && R.state === 'clear') {
    R.cT += dt;
    if (R.cT >= 1.15 && !R.irisSnd) { R.irisSnd = true; snd('iris_close'); }
    if (R.cT >= CLEAR_DUR) { R.cT = CLEAR_DUR; winRun(); }
    return;
  }
  if (G.screen === 'play' && R && R.state === 'fail') {
    R.deadT += dt;
    if (!R.shatterDone && R.deadT >= 0.7) { R.shatterDone = true; snd('shatter'); }
    if (tutL1()) { if (R.deadT >= DEATH_DUR + 0.4) respawnRun(); return; }
    if (R.deadT >= DEATH_DUR) { R.deadT = DEATH_DUR; G.screen = 'fail'; snd('level_fail'); }
    return;
  }
  if (G.screen === 'play' && R && R.state === 'respawn') {
    R.rt += dt;
    if (!R.rland && R.rt >= 1.41) { R.rland = true; snd('respawn_land'); }
    if (R.rt >= 1.6) { R.rt = 1.6; R.state = 'run'; R.lastSnap = snap(); acc = 0; clearKeys(); }
    return;
  }
  if (G.screen === 'play' && R && R.state === 'run') {
    if (R.demo) { acc = 0; return; }
    acc += dt;
    while (acc >= DT && R && R.state === 'run') {
      stepRun();
      edge.z = edge.x = edge.down = edge.jump = edge.jumpRel = false;
      acc -= DT;
    }
    if (R && R.state === 'run') R.lastSnap = snap();
  } else acc = 0;
}
function frameLoop(ts) {
  requestAnimationFrame(frameLoop);
  var dt = lastTs ? Math.min((ts - lastTs) / 1000, 1 / 30) : 0;
  lastTs = ts;
  try { if (!(window.PVDX && PVDX.paused)) update(dt); render(); } catch (err) { if (window.console) console.error(err); }
}
function resize() {
  var cw = document.documentElement.clientWidth || window.innerWidth, ch = document.documentElement.clientHeight || window.innerHeight;
  var s = Math.min(cw / CW, ch / H);
  var cssW = Math.max(1, Math.floor(CW * s)), cssH = Math.max(1, Math.floor(H * s));
  DPR = window.devicePixelRatio || 1;
  canvas.style.width = cssW + 'px'; canvas.style.height = cssH + 'px';
  canvas.width = Math.round(cssW * DPR); canvas.height = Math.round(cssH * DPR);
}
var canvas = null, ctx = null, DPR = 1;
// 關卡編輯器「試玩」: 網址帶 ?level=N(1~8)時跳過開始畫面直接用劍士進第 N 關(教學全部略過、關卡全開);
// 可另帶 &cls=hunter|bomber 換職業、&rep=101 指定工程 1~3 是否已修好。沒帶 level 參數時什麼都不做, 不影響正常遊玩
function devStart() {
  var q = (window.location && window.location.search) || '', m = /[?&]level=(\d+)/.exec(q);
  if (!m) return;
  var l = parseInt(m[1], 10) - 1;
  if (!(l >= 0 && l < LEVELS.length)) return;
  var cm = /[?&]cls=(sword|hunter|bomber)/.exec(q), rm = /[?&]rep=([01]{1,3})/.exec(q), i;
  T.off = true;
  for (i = 0; i < 8; i++) G.opened[i] = true;
  CLS_LIST.forEach(function (k) { G.recruited[k] = true; });
  if (rm) for (i = 0; i < rm[1].length; i++) G.repaired[l][i] = rm[1].charAt(i) === '1';
  G.clearedAny = true; G.screen = 'map'; G.mapSel = l;
  startRun(l, cm ? cm[1] : 'sword');
}
function init() {
  canvas = document.getElementById('c');
  ctx = canvas.getContext('2d');
  newGame();
  devStart();
  resize();
  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', resize);
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', function () { clearKeys(); });
  requestAnimationFrame(frameLoop);
}
if (typeof document !== 'undefined' && document.getElementById && document.getElementById('c') && !window.__LR_TEST) init();
