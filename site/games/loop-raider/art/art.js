/* 連環工程 — 美術模組(polish)
 * 全域物件 window.Art, 不用 ES module。全部 Canvas 2D 幾何繪製, 不引外部資源。
 * 每個函式自己 save / restore。介面: polish/game/interface.json(函式名、state 欄位一個不多一個不少)。
 * 視覺方向: visual/direction.md 選中方案(title B / hero A / ui A / materials C / monsters B / combat-fx A /
 *   replay-map B / repair-fog A / themes B / stage-panel A / skill-cd A / final-boss B / ending B / boss-stage C;
 *   polish 第 2 輪新增: death-anim B / clear-anim C / result-panel B / unlock-fx B / map-card B / devices C / map-layout B;
 *   polish 第 5 輪新增: tut-arrow B / tut-text B / keycap B / ctrl-panel A(+ 逐組點亮)/ tut-spotlight B / respawn C / tut-summary B)。
 * 時間: 有動畫的函式優先用 state 的 t / xxT; 沒傳時間的少數待機動態(寶箱閃光、旗飄、蜂彈旋轉、無敵閃爍、框選脈動)才讀系統時鐘。
 */
(function () {
  'use strict';

  var W = 1280, H = 720, TAU = Math.PI * 2;
  // 畫布寬度依裝置: 電腦 1280, 觸控裝置 1280~1680(照可視區長寬比); 設計區 W = 1280 由 game.js 置中平移, 美術畫面都在設計區內
  function pickWidth() {
    var w = 1280;
    try {
      var q = /[?&]w=([0-9]+)/.exec(location.search);
      var mm = function (s) { return !!(window.matchMedia && matchMedia(s).matches); };
      var touch = /[?&]touch=1(&|$)/.test(location.search) || mm('(pointer: coarse)') ||
        (((navigator.maxTouchPoints || 0) > 0 || 'ontouchstart' in window) && !mm('(hover: hover)'));
      if (q) w = +q[1];
      else if (touch) {
        var sc = window.screen || {}, sw = sc.width || 0, sh = sc.height || 0, iw = window.innerWidth || 0, ih = window.innerHeight || 0;
        var r = sw > 0 && sh > 0 ? Math.max(sw, sh) / Math.min(sw, sh) : 0;
        if (iw > ih && ih > 0) r = iw / ih;
        if (r > 0) w = 720 * r;
      }
    } catch (e) { /* 取不到就用 1280 */ }
    return Math.round(Math.max(1280, Math.min(1680, w || 1280)) / 2) * 2;
  }
  var VW = pickWidth();
  try { document.documentElement.style.setProperty('--cw', String(VW)); } catch (e) { /* 略過 */ }
  // 觸控模式(手機)字級下限: 玩家要讀的字至少畫布高的 1/35(約 21px), 按鍵徽章同步放大; 電腦版不動
  var TOUCH_MIN = 21;
  function isTouchOn() { return typeof window !== 'undefined' && !!window.PVDX && !!window.PVDX.on; }
  function tpx(px) { return (px < TOUCH_MIN && typeof window !== 'undefined' && window.PVDX && window.PVDX.on) ? TOUCH_MIN : px; }
  var FONT = '"Microsoft JhengHei","PingFang TC","Noto Sans TC","Heiti TC",sans-serif';
  var SIL = 0.2; // 目前縮放低於此值(大地圖縮圖 0.125)改畫剪影 / 色塊

  var PAL = {
    bg: '#1a2233', mapBg: '#14222a', mapLine: '#1d3036',
    wood: '#b8682a', woodLight: '#f2c88c', woodDark: '#6a3a14',
    stone: '#a9b3be', stoneLight: '#e6ebf0', stoneDark: '#5e6874',
    crystal: '#3fd6ea', crystalLight: '#d2fbff', crystalDark: '#137c90',
    core: '#d94bc6', coreLight: '#ffc6f4', coreDark: '#6e1a62', coreEye: '#ffe14a',
    sword: '#3d8bfd', hunter: '#1fbf9a', bomber: '#f28c28', skin: '#f4d2b0', outlineHero: '#ffffff',
    player: '#3d8bfd',
    brood: '#c264ff', danger: '#ff4a3a', weak: '#ffe066', foeEye: '#e8282c',
    shortcut: '#6fb0ff', treasure: '#ffc83d', nestRole: '#c264ff',
    spikeTip: '#e5484d', crack: '#c99a6c', crackLine: '#5a3a22', rubble: '#4e5868', rubbleLight: '#7d8898',
    plank: '#d59c57', plankDark: '#8a5a2a', stair: '#cbc1ae',
    chest: '#c27a2e', chestLid: '#dd9238', gold: '#f2c94c', goal: '#ffd23f', goalReached: '#3ccf6e',
    beeShot: '#ff5a2a', arrow: '#f3ead8', bomb: '#2a2a33', fire: '#ff9a2a',
    sand: '#e2c99c', sandDark: '#8a6a46',
    board: '#3a2a1f', plankUi: '#45321f', seam: '#21160e', edge: '#180f09', nail: '#d9b47a', groove: '#2a1d14',
    parch: '#efe3c6', parchDim: '#b8ab8e', ink: '#2b2118', inkDim: '#76664e', cream: '#f3e6c8', labelDim: '#c9b896',
    select: '#ffd84a', selectDeep: '#b8860b', short: '#c8202c', good: '#2f8f55', goodLight: '#4fd18b',
    hp: '#ff4d5e', newArea: '#ff8a3d', text: '#f2f4f8', textDim: '#9aa4b8'
  };
  var K = PAL; // 介面色(ui 方案 A)別名

  // 地形主題: shape = 外角造型(round 圓角 / chamfer 斜切 / square 直角 / salt 小圓角 / lair 圓角)
  var THEMES = {
    forest: { shape: 'round', tR: 10, bR: 16, line: '#2a1a0e', inner: '#73502f', chip: '#5c3f24', chipHi: '#8a6440', cap: '#5cbf45', capHi: '#a8e27a', capDark: '#3f8a33',
      sky0: '#3f6e5e', sky1: '#d6c486', far: '#8fae7c', mid: '#62895c', near: '#3b5c44', fog: '#a7b3a2', fogA: 'rgba(214,226,206,0.55)', fogB: 'rgba(120,138,118,0.35)' },
    cliff: { shape: 'chamfer', tR: 9, bR: 15, line: '#262b3a', inner: '#5d6680', band2: '#6c7690', band3: '#525a72', cap: '#e8eef5', capHi: '#ffffff', capDark: '#b9c4d2',
      sky0: '#6f90b8', sky1: '#dfe8f1', far: '#bccadb', mid: '#97abc4', near: '#7489a7', fog: '#c9d2de', fogA: 'rgba(250,252,255,0.65)', fogB: 'rgba(160,172,190,0.35)' },
    mine: { shape: 'square', tR: 0, bR: 0, line: '#0d0a08', inner: '#463b35', chip: '#372e29', chipHi: '#5a4d45', cap: '#76664f', capHi: '#9c8a70', capDark: '#4f4334',
      timber: '#6b4a2b', timberDark: '#3e2a17', sky0: '#110d0b', sky1: '#221a15', far: '#2a211b', mid: '#3a2c21', near: '#4c3828', fog: '#8c8378', fogA: 'rgba(176,166,150,0.55)', fogB: 'rgba(90,80,70,0.35)' },
    salt: { shape: 'salt', tR: 4, bR: 4, line: '#3a2440', inner: '#ad8299', mark: '#966c84', cap: '#fbf3ec', capHi: '#ffffff', capDark: '#e3c4d2',
      sky0: '#2a1f4e', sky1: '#f4c2a2', far: '#a3789f', ruin: '#4e3a68', ruinHi: '#6b5287', fog: '#c9b4c4', fogA: 'rgba(255,240,250,0.6)', fogB: 'rgba(150,120,150,0.35)' },
    lair: { shape: 'lair', tR: 8, bR: 12, line: '#120818', inner: '#2d1a38', chip: '#3c2349', chipHi: '#55306a', cap: '#5a2d6e', capHi: '#8a45a0', capDark: '#3a1a48',
      sky0: '#1a0e22', sky1: '#2a1634', far: '#24142e', mid: '#2e1a3a', near: '#38204a', fog: '#7a6a86', fogA: 'rgba(180,160,200,0.5)', fogB: 'rgba(70,50,90,0.4)' }
  };
  var THEME_KEYS = ['forest', 'cliff', 'mine', 'salt', 'lair'];
  var THEME_NAME = { forest: '翠林谷地', cliff: '風蝕高崖', mine: '地底礦坑', salt: '鹽原斷門', lair: '巢穴' };

  var KINDS = ['wood', 'stone', 'crystal', 'core'];
  var KIND_NAME = { wood: '木材', stone: '石頭', crystal: '水晶', core: '魔核' };
  var KIND_INK = { wood: '#7a4a1e', stone: '#4c5562', crystal: '#127a8c', core: '#8e2a80' };
  var HUD_X = { wood: 16, stone: 186, crystal: 356, core: 526 };
  var CLS = ['sword', 'hunter', 'bomber'];
  var CLS_NAME = { sword: '劍士', hunter: '獵人', bomber: '炸彈工' };
  // 職業說明兩行(polish 第 3 輪使用者定稿; 職業選擇卡與升級所職業卡共用)
  var CLS_TRAIT = { sword: '揮砍', hunter: '自動索敵', bomber: '爆破' };
  var CLS_SKILL = { sword: '衝刺', hunter: '潛行', bomber: '爆風擊退' };
  var ROLES = ['shortcut', 'treasure', 'nest'];
  var ROLE_NAME = { shortcut: '捷徑', treasure: '藏寶處', nest: '巢穴' };
  var ROLE_INK = { shortcut: '#1f5fa8', treasure: '#8a5f00', nest: '#7a2aa8' };
  var SITE_KIND_NAME = { bridge: '斷橋', stairs: '崩梯', rubble: '堵塞隧道', nestgate: '巢穴門' };
  var ITEMS = ['bagWood', 'bagStone', 'bagCrystal', 'coreLamp', 'glove', 'horn', 'heart', 'gear'];
  // 裝置(原道具; devices 方案 C「嵌牆圓盤機關」): 代碼沿用舊的道具代碼, 只換名稱與畫法
  var ITEM_NAME = { bagWood: '聚木機關', bagStone: '聚石機關', bagCrystal: '聚晶機關', coreLamp: '聚核機關', glove: '拾遺機關', horn: '驅獸機關', heart: '巢心機關', gear: '疾時機關' };
  var ITEM_CAT = { bagWood: '通關產出', bagStone: '通關產出', bagCrystal: '通關產出', coreLamp: '通關產出', glove: '撿拾加成', horn: '掉落加成', heart: '掉落 + 產出', gear: '回放加速' };
  var ITEM_FX = {
    bagWood: '每次通關 +4 木材', bagStone: '每次通關 +3 石頭', bagCrystal: '每次通關 +2 水晶', coreLamp: '每次通關 +2 魔核',
    glove: '撿到的素材 +1', horn: '打怪掉落 ×2', heart: '打怪掉落 ×2、通關 +4 魔核', gear: '回放速度 +25%'
  };

  // ---------- 共用小工具 ----------
  function num(v, d) { v = Number(v); return (typeof v === 'number' && isFinite(v)) ? v : d; }
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function oneOf(v, list, d) { return list.indexOf(v) >= 0 ? v : d; }
  function obj(v) { return (v && typeof v === 'object') ? v : {}; }
  function arr(v) { return Array.isArray(v) ? v : []; }
  function str(v, d) { return (typeof v === 'string') ? v : (typeof v === 'number' && isFinite(v) ? String(v) : d); }
  function face(v) { return v === -1 ? -1 : 1; }
  function seg(t, a, b) { return clamp((t - a) / (b - a), 0, 1); }
  function lerp(a, b, p) { return a + (b - a) * p; }
  function eOut(p) { p = clamp(p, 0, 1); return 1 - Math.pow(1 - p, 3); }
  function sm(p) { p = clamp(p, 0, 1); return p * p * (3 - 2 * p); }
  function fr(v) { return v - Math.floor(v); }
  function nowS() { try { return ((typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now()) / 1000; } catch (e) { return 0; } }
  function fmt1(v) { return (Math.round(num(v, 0) * 10) / 10).toFixed(1); }
  function intStr(v) { return String(Math.max(0, Math.round(clamp(num(v, 0), 0, 1e9)))); }
  function grp(n) { return String(Math.max(0, Math.round(clamp(num(n, 0), 0, 1e12)))).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
  function mats(v) { var o = obj(v); return { wood: num(o.wood, 0), stone: num(o.stone, 0), crystal: num(o.crystal, 0), core: num(o.core, 0) }; }
  function hash(a, b) { var h = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return h - Math.floor(h); }
  function themeOf(v) { return THEMES[oneOf(v, THEME_KEYS, 'forest')]; }
  function hexRgb(c) { c = c.replace('#', ''); return [parseInt(c.substr(0, 2), 16), parseInt(c.substr(2, 2), 16), parseInt(c.substr(4, 2), 16)]; }
  function mix(a, b, u) { var p = hexRgb(a), q = hexRgb(b); u = clamp(u, 0, 1); return 'rgb(' + Math.round(p[0] + (q[0] - p[0]) * u) + ',' + Math.round(p[1] + (q[1] - p[1]) * u) + ',' + Math.round(p[2] + (q[2] - p[2]) * u) + ')'; }

  // 目前變換相對邏輯畫布的縮放(扣掉 RD 的高 DPI 底圖倍率); abs = 畫面 px / 單位
  function scaleOf(ctx) {
    var a = 1, base = 1;
    try { if (ctx.getTransform) { var m = ctx.getTransform(); if (m && isFinite(m.a)) a = Math.hypot(m.a || 0, m.b || 0) || 1; } } catch (e) { a = 1; }
    try { if (ctx.canvas && ctx.canvas.width > 0) base = ctx.canvas.width / VW; } catch (e) { base = 1; }
    if (!isFinite(base) || base <= 0) base = 1;
    if (!isFinite(a) || a <= 0) a = 1;
    return { rel: a / base, abs: a };
  }

  function font(px, bold) { return (bold ? 'bold ' : '') + Math.round(tpx(px)) + 'px ' + FONT; }
  function text(ctx, s, x, y, px, col, align, bold, outline, oc) {
    ctx.font = font(px, bold); ctx.textAlign = align || 'left'; ctx.textBaseline = 'middle';
    if (outline) { ctx.lineJoin = 'round'; ctx.lineWidth = outline; ctx.strokeStyle = oc || 'rgba(20,12,6,0.95)'; ctx.strokeText(s, x, y); }
    ctx.fillStyle = col; ctx.fillText(s, x, y);
  }
  function tw(ctx, s, px, bold) { ctx.font = font(px, bold); var m = ctx.measureText(s); return (m && isFinite(m.width)) ? m.width : String(s).length * px; }

  function rr(ctx, x, y, w, h, r) {
    r = Math.max(0, Math.min(r, w / 2, h / 2));
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }
  function circle(ctx, x, y, r) { ctx.beginPath(); ctx.arc(x, y, Math.max(0, r), 0, TAU); }
  function ell(ctx, x, y, rx, ry, rot) { ctx.beginPath(); ctx.ellipse(x, y, Math.max(0, rx), Math.max(0, ry), rot || 0, 0, TAU); }
  function poly(ctx, p) { ctx.beginPath(); ctx.moveTo(p[0], p[1]); for (var i = 2; i < p.length; i += 2) ctx.lineTo(p[i], p[i + 1]); ctx.closePath(); }
  function star(ctx, x, y, r, n) {
    n = n || 5; ctx.beginPath();
    for (var i = 0; i < n * 2; i++) { var a = -Math.PI / 2 + i * Math.PI / n, q = (i % 2) ? r * 0.45 : r; ctx.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q); }
    ctx.closePath();
  }
  function star4(ctx, x, y, r) { poly(ctx, [x, y - r, x + r * 0.28, y - r * 0.28, x + r, y, x + r * 0.28, y + r * 0.28, x, y + r, x - r * 0.28, y + r * 0.28, x - r, y, x - r * 0.28, y - r * 0.28]); }
  function lin(ctx, x0, y0, x1, y1, stops) { var g = ctx.createLinearGradient(x0, y0, x1, y1); for (var i = 0; i < stops.length; i += 2) g.addColorStop(stops[i], stops[i + 1]); return g; }
  function rad(ctx, x, y, r0, r1, stops) { var g = ctx.createRadialGradient(x, y, Math.max(0, r0), x, y, Math.max(0.01, r1)); for (var i = 0; i < stops.length; i += 2) g.addColorStop(stops[i], stops[i + 1]); return g; }

  // ---------- 素材圖示(materials 方案 C; 地上、噴出粒、飛行、資訊列、面板、結算全部共用) ----------
  // 中心 (cx, cy), 外框 sz×sz; 畫面上小於 15px 時拿掉繩、年輪、星光與光暈
  function crystalSide(ctx, sx, rot, lw) {
    ctx.save(); ctx.translate(sx, 5.2); ctx.rotate(rot);
    poly(ctx, [0, -7.4, 2.4, -4.4, 2.4, 2.6, -2.4, 2.6, -2.4, -4.4]);
    ctx.fillStyle = lin(ctx, -2.4, 0, 2.4, 0, [0, PAL.crystalLight, 0.5, PAL.crystal, 1, PAL.crystalDark]); ctx.fill();
    ctx.lineWidth = lw; ctx.strokeStyle = '#1a1420'; ctx.stroke();
    ctx.restore();
  }
  function matIcon(ctx, kind, cx, cy, sz, forceSimple) {
    kind = oneOf(kind, KINDS, 'wood');
    sz = clamp(num(sz, 20), 1, 200);
    var k = sz / 20, detail = !forceSimple && sz * scaleOf(ctx).rel >= 15, lw = detail ? 1.5 : 1.9, i;
    ctx.save(); ctx.translate(cx, cy); ctx.scale(k, k);
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    if (kind === 'wood') {
      ctx.translate(-0.4, 0.9);
      var ends = [[-0.8, 3.6], [6.8, 3.6], [3, -3.2]], dx = -5.2, dy = -2.2, R = 3.5;
      for (i = 0; i < 3; i++) {
        ctx.beginPath(); ctx.moveTo(ends[i][0], ends[i][1]); ctx.lineTo(ends[i][0] + dx, ends[i][1] + dy);
        ctx.lineWidth = R * 2 + lw * 2; ctx.strokeStyle = '#1a1420'; ctx.stroke();
        ctx.lineWidth = R * 2; ctx.strokeStyle = lin(ctx, 0, ends[i][1] - R, 0, ends[i][1] + R, [0, PAL.wood, 1, PAL.woodDark]); ctx.stroke();
      }
      if (detail) { ctx.beginPath(); ctx.moveTo(-1.6, -7.2); ctx.lineTo(-3.8, 6.4); ctx.lineWidth = 1.6; ctx.strokeStyle = '#e7d39a'; ctx.stroke(); }
      for (i = 0; i < 3; i++) {
        ell(ctx, ends[i][0], ends[i][1], R * 0.86, R);
        ctx.fillStyle = rad(ctx, ends[i][0] - 0.8, ends[i][1] - 1, 0.3, R, [0, '#fff0cf', 1, PAL.woodLight]); ctx.fill();
        ctx.lineWidth = lw; ctx.strokeStyle = '#1a1420'; ctx.stroke();
        if (detail) { ell(ctx, ends[i][0], ends[i][1], R * 0.4, R * 0.48); ctx.lineWidth = 0.9; ctx.strokeStyle = PAL.woodDark; ctx.stroke(); }
      }
    } else if (kind === 'stone') {
      poly(ctx, [0, -9.4, 9, -4.7, 0, 0, -9, -4.7]); ctx.fillStyle = lin(ctx, 0, -9.4, 0, 0, [0, '#ffffff', 1, PAL.stoneLight]); ctx.fill();
      poly(ctx, [-9, -4.7, 0, 0, 0, 9.6, -9, 4.9]); ctx.fillStyle = PAL.stone; ctx.fill();
      poly(ctx, [0, 0, 9, -4.7, 9, 4.9, 0, 9.6]); ctx.fillStyle = PAL.stoneDark; ctx.fill();
      ctx.beginPath(); ctx.moveTo(-9, -4.7); ctx.lineTo(0, 0); ctx.lineTo(9, -4.7); ctx.moveTo(0, 0); ctx.lineTo(0, 9.6);
      ctx.lineWidth = detail ? 0.9 : 1.2; ctx.strokeStyle = 'rgba(26,20,32,0.7)'; ctx.stroke();
      if (detail) { ctx.beginPath(); ctx.moveTo(-6.4, 0.2); ctx.lineTo(-3.4, 2.4); ctx.lineTo(-4.6, 5.2); ctx.moveTo(3.2, 2.2); ctx.lineTo(6, 0.8); ctx.lineWidth = 0.9; ctx.strokeStyle = PAL.stoneDark; ctx.stroke(); }
      poly(ctx, [0, -9.4, 9, -4.7, 9, 4.9, 0, 9.6, -9, 4.9, -9, -4.7]); ctx.lineWidth = lw; ctx.strokeStyle = '#1a1420'; ctx.stroke();
    } else if (kind === 'crystal') {
      if (detail) { circle(ctx, 0, 1, 11.5); ctx.fillStyle = rad(ctx, 0, 1, 2, 11.5, [0, 'rgba(63,214,234,0.55)', 1, 'rgba(63,214,234,0)']); ctx.fill(); }
      crystalSide(ctx, -5.6, -0.5, lw); crystalSide(ctx, 5.6, 0.5, lw);
      var m = [0, -10.4, 3.8, -6, 3.8, 6, 0, 9.4, -3.8, 6, -3.8, -6];
      poly(ctx, m); ctx.fillStyle = PAL.crystal; ctx.fill();
      poly(ctx, [0, -10.4, 0, 9.4, -3.8, 6, -3.8, -6]); ctx.fillStyle = PAL.crystalLight; ctx.fill();
      poly(ctx, [0, -10.4, 3.8, -6, 3.8, 6, 0, 9.4, 1.4, 6, 1.4, -6]); ctx.fillStyle = PAL.crystalDark; ctx.globalAlpha *= 0.55; ctx.fill(); ctx.globalAlpha /= 0.55;
      poly(ctx, m); ctx.lineWidth = lw; ctx.strokeStyle = '#1a1420'; ctx.stroke();
      if (detail) { star4(ctx, -6.4, -6.4, 2.6); ctx.fillStyle = '#ffffff'; ctx.fill(); }
    } else {
      if (detail) { circle(ctx, 0, 1.5, 11.5); ctx.fillStyle = rad(ctx, 0, 1.5, 2, 11.5, [0, 'rgba(230,90,212,0.55)', 1, 'rgba(230,90,212,0)']); ctx.fill(); }
      ctx.beginPath(); ctx.moveTo(0.6, -10.4);
      ctx.bezierCurveTo(2.4, -6.4, 7.6, -4.4, 7.6, 2.4); ctx.bezierCurveTo(7.6, 6.8, 4.2, 9.6, 0, 9.6);
      ctx.bezierCurveTo(-4.2, 9.6, -7.6, 6.8, -7.6, 2.4); ctx.bezierCurveTo(-7.6, -1.6, -5, -3.4, -3.6, -6.2);
      ctx.quadraticCurveTo(-2.6, -3.4, -1.2, -3.8); ctx.quadraticCurveTo(-1.6, -7.6, 0.6, -10.4); ctx.closePath();
      ctx.fillStyle = rad(ctx, -1.6, 1.4, 0.5, 9.6, [0, PAL.coreLight, 0.45, PAL.core, 1, PAL.coreDark]); ctx.fill();
      ctx.lineWidth = lw; ctx.strokeStyle = '#1a1420'; ctx.stroke();
      ctx.fillStyle = PAL.coreEye;
      poly(ctx, [-5, 1.2, -1.2, 2.4, -1.6, 4.2, -4.6, 3.4]); ctx.fill(); poly(ctx, [5, 1.2, 1.2, 2.4, 1.6, 4.2, 4.6, 3.4]); ctx.fill();
      if (detail) { star4(ctx, 5.6, -6, 2.2); ctx.fillStyle = '#ffffff'; ctx.fill(); }
    }
    ctx.restore();
  }

  // ---------- 職業小圖示 / 鎖 / 石鍵帽(ui 方案 A) ----------
  function clsIcon(ctx, cls, cx, cy, sz) {
    cls = oneOf(cls, CLS, 'sword');
    var k = sz / 20;
    ctx.save(); ctx.translate(cx, cy); ctx.scale(k, k); ctx.lineJoin = 'round';
    circle(ctx, 0, 0, 9.4); ctx.fillStyle = '#2b2118'; ctx.fill();
    // 縮圖記號: 盾形 / 三角 / 圓(和主角剪影同一組)
    if (cls === 'sword') poly(ctx, [-5.5, -6, 5.5, -6, 5.5, 0, 0, 6.5, -5.5, 0]);
    else if (cls === 'hunter') poly(ctx, [0, -7, 6.5, 5.5, -6.5, 5.5]);
    else circle(ctx, 0, 0.5, 6);
    ctx.fillStyle = PAL[cls]; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = '#ffffff'; ctx.stroke();
    ctx.restore();
  }
  function lockIcon(ctx, cx, cy, sz, col) {
    var k = sz / 24;
    ctx.save(); ctx.translate(cx, cy); ctx.scale(k, k);
    ctx.lineWidth = 3; ctx.strokeStyle = col; ctx.beginPath(); ctx.arc(0, -3, 6, Math.PI, 0); ctx.lineTo(6, 1); ctx.moveTo(-6, 1); ctx.lineTo(-6, -3); ctx.stroke();
    rr(ctx, -9, 0, 18, 13, 2.5); ctx.fillStyle = col; ctx.fill();
    circle(ctx, 0, 5.5, 2); ctx.fillStyle = '#141a22'; ctx.fill();
    ctx.restore();
  }
  // ---------- 按鍵外觀(keycap 方案 B 扁平琺瑯徽章; 全遊戲唯一一份, 面板 / 教學 / drawKeyLine 共用) ----------
  // 深墨底 + 米白字(方向鍵畫幾何箭頭)+ 米白內圈線 + 上半淡反光, 底下一道薄硬邊是唯一的厚度。
  // 造型依功能: Z / X 圓角方、方向鍵正圓、Esc / M 長膠囊。高 = 1.5 px; 佔位寬至少 1.7 px(正圓置中在佔位內)。
  // 狀態 st: 'normal' 深墨 / 'hot' 金面(此刻按得下去)/ 'done' 金面 + 右上綠勾 / 'press' 硬邊消失往下貼平
  var KEY_NAME = { z: 'Z', x: 'X', left: '←', right: '→', up: '↑', down: '↓', esc: 'Esc', m: 'M' };
  var ARROW_ANG = { '←': Math.PI, '→': 0, '↑': -Math.PI / 2, '↓': Math.PI / 2 };
  function keyLabel(k) { // 介面代碼('z'、'left'…)或畫面字('Z'、'←'…)→ 畫面字; 表外值 → ''(畫空徽章, 不畫成任何合法按鍵)
    if (typeof k !== 'string') return '';
    if (KEY_NAME[k] !== undefined) return KEY_NAME[k];
    if (KEY_NAME[k.toLowerCase()] !== undefined) return KEY_NAME[k.toLowerCase()];
    return (ARROW_ANG[k] !== undefined || k === 'Z' || k === 'X' || k === 'Esc' || k === 'M') ? k : '';
  }
  function keyShape(label) { return ARROW_ANG[label] !== undefined ? 'round' : ((label === 'Esc' || label === 'M') ? 'pill' : 'square'); }
  function keyFaceW(ctx, label, px) { // 徽章本體寬
    px = tpx(px);
    var h = px * 1.5, s = keyShape(label);
    if (s === 'pill') return Math.max(h * 1.55, tw(ctx, label, px * 0.66, true) + px * 1.1);
    return s === 'round' ? h : px * 1.7;
  }
  function keyW(ctx, label, px) { px = tpx(px); return Math.max(px * 1.7, keyFaceW(ctx, keyLabel(label), px)); } // 佔位寬
  function keyArrow(ctx, label, cx, cy, s, col) {
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(ARROW_ANG[label]);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(-s * 0.42, 0); ctx.lineTo(s * 0.08, 0); ctx.lineWidth = Math.max(1.6, s * 0.17); ctx.strokeStyle = col; ctx.stroke();
    poly(ctx, [s * 0.46, 0, s * 0.02, -s * 0.36, s * 0.02, s * 0.36]); ctx.fillStyle = col; ctx.fill();
    ctx.lineWidth = Math.max(1, s * 0.06); ctx.strokeStyle = col; ctx.stroke();
    ctx.restore();
  }
  function keyPath(ctx, s, x, y, w, h) {
    if (s === 'round') circle(ctx, x + w / 2, y + h / 2, h / 2);
    else rr(ctx, x, y, w, h, s === 'pill' ? h / 2 : h * 0.28);
  }
  function keycap(ctx, label, cx, cy, px, st) {
    label = keyLabel(label); px = tpx(clamp(num(px, 16), 4, 200));
    if (st === true) st = 'hot'; else if (st !== 'hot' && st !== 'done' && st !== 'press') st = 'normal';
    var s = keyShape(label), w = keyFaceW(ctx, label, px), h = px * 1.5;
    var press = st === 'press', hot = st === 'hot' || st === 'done';
    var lip = press ? 0 : Math.max(1.5, px * 0.16);
    var x = cx - w / 2, y = cy - h / 2 - lip / 2 + (press ? px * 0.1 : 0);
    var fill = hot ? K.select : K.ink, ring = hot ? '#fff6c8' : K.cream, ink = hot ? K.ink : K.cream, lipC = hot ? K.selectDeep : K.edge;
    ctx.save();
    if (lip > 0) { keyPath(ctx, s, x, y + lip, w, h); ctx.fillStyle = lipC; ctx.fill(); ctx.lineWidth = 1.2; ctx.strokeStyle = K.edge; ctx.stroke(); }
    keyPath(ctx, s, x, y, w, h); ctx.fillStyle = fill; ctx.fill();
    ctx.lineWidth = Math.max(1.2, px * 0.09); ctx.strokeStyle = K.edge; ctx.stroke();
    ctx.save(); keyPath(ctx, s, x, y, w, h); ctx.clip();
    ctx.fillStyle = hot ? 'rgba(255,255,255,0.35)' : 'rgba(255,240,210,0.12)';
    ell(ctx, cx, y - h * 0.15, w * 0.62, h * 0.5); ctx.fill();
    ctx.restore();
    var ins = Math.max(1.8, px * 0.13);
    if (s === 'round') circle(ctx, cx, y + h / 2, h / 2 - ins);
    else rr(ctx, x + ins, y + ins, w - ins * 2, h - ins * 2, s === 'pill' ? (h - ins * 2) / 2 : h * 0.2);
    ctx.save(); ctx.lineWidth = Math.max(1, px * 0.07); ctx.strokeStyle = ring; ctx.globalAlpha *= hot ? 0.9 : 0.75; ctx.stroke(); ctx.restore();
    if (ARROW_ANG[label] !== undefined) keyArrow(ctx, label, cx, y + h / 2, px * 0.78, ink);
    else if (label) text(ctx, label, cx, y + h / 2 + px * 0.03, s === 'pill' ? px * 0.66 : px * 0.9, ink, 'center', true);
    if (st === 'done') {
      var r = Math.max(4, px * 0.34), ox = x + w - px * 0.12, oy = y + px * 0.12;
      circle(ctx, ox, oy, r); ctx.fillStyle = K.good; ctx.fill(); ctx.lineWidth = Math.max(1, r * 0.22); ctx.strokeStyle = '#ffffff'; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(ox - r * 0.5, oy); ctx.lineTo(ox - r * 0.1, oy + r * 0.4); ctx.lineTo(ox + r * 0.55, oy - r * 0.4);
      ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.lineWidth = Math.max(1.4, r * 0.32); ctx.stroke();
    }
    ctx.restore();
    return keyW(ctx, label, px);
  }
  // 一行嵌按鍵的文字。parts: 字串 / { key, st } / { t, col }(t = 指定顏色的字); tone 'board'(米白字 + 深描邊)| 'parch'(深墨字)
  // align 'left' | 'center' | 'right'; keyDy = 按鍵額外上下位移(輕彈用)。回傳整行寬
  function klineW(ctx, parts, px) {
    px = tpx(px);
    var g = px * 0.2, total = 0, n = 0;
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i], w;
      if (typeof p === 'string') w = p ? tw(ctx, p, px, true) : 0;
      else if (p && typeof p === 'object' && p.key !== undefined) w = keyW(ctx, p.key, px);
      else if (p && typeof p === 'object' && typeof p.t === 'string') w = tw(ctx, p.t, px, true);
      else continue;
      total += w + (n ? g : 0); n++;
    }
    return total;
  }
  function kline(ctx, parts, x, y, px, align, tone, keyDy) {
    parts = arr(parts); px = tpx(clamp(num(px, 16), 4, 200));
    var g = px * 0.2, total = klineW(ctx, parts, px), n = 0;
    var col = tone === 'parch' ? K.ink : K.cream, ol = tone === 'parch' ? 0 : Math.max(2, px * 0.2);
    var cx = align === 'center' ? x - total / 2 : (align === 'right' ? x - total : x);
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i], w;
      if (typeof p === 'string') {
        if (n) cx += g;
        w = p ? tw(ctx, p, px, true) : 0; if (p) text(ctx, p, cx, y + 0.5, px, col, 'left', true, ol, K.edge);
      } else if (p && typeof p === 'object' && p.key !== undefined) {
        if (n) cx += g;
        w = keyW(ctx, p.key, px); keycap(ctx, p.key, cx + w / 2, y + (keyDy || 0), px, p.st);
      } else if (p && typeof p === 'object' && typeof p.t === 'string') {
        if (n) cx += g;
        w = tw(ctx, p.t, px, true); text(ctx, p.t, cx, y + 0.5, px, p.col || col, 'left', true, ol, K.edge);
      } else continue;
      cx += w; n++;
    }
    return total;
  }
  // 面板提示列: items = [[鍵, 動作, hot]...]; 鍵可寫成 '↑↓' / '←→'(拆成兩顆), 每組 =「按鍵 + 動作」, 組間留 1.2 px
  function keyRow(ctx, items, x, y, px, align, tone) {
    var parts = [], i, j;
    for (i = 0; i < items.length; i++) {
      var k = String(items[i][0]), keys = ARROW_ANG[k.charAt(0)] !== undefined ? k.split('') : [k];
      for (j = 0; j < keys.length; j++) parts.push({ key: keys[j], st: items[i][2] === true ? 'hot' : 'normal' });
      parts.push(items[i][1] + (i < items.length - 1 ? '    ' : ''));
    }
    return kline(ctx, parts, x, y, px, align, tone || 'board');
  }
  // 動作章內嵌按鍵: 章 = 'hot' 金底 / 'idle' 米白 / 'off' 灰 + 紅斜線(付不起); 章內「[鍵] 動作」
  function actKey(ctx, key, s, x, y, state, align, px) {
    px = tpx(px || 12); // 觸控模式字級拉到下限時, 底框跟著放大
    var inner = klineW(ctx, [{ key: key }, s], px), w = inner + px * 1.0, h = px * 1.95;
    var lx = align === 'right' ? x - w : (align === 'center' ? x - w / 2 : x);
    ctx.save();
    if (state === 'hot') { rr(ctx, lx, y - h / 2 + 3, w, h, 5); ctx.fillStyle = K.selectDeep; ctx.fill(); }
    rr(ctx, lx, y - h / 2, w, h, 5);
    ctx.fillStyle = state === 'hot' ? K.select : state === 'off' ? '#9a9384' : '#fbf6ea'; ctx.fill();
    ctx.lineWidth = 1.5; ctx.strokeStyle = state === 'off' ? '#6a6456' : K.edge; ctx.stroke();
    if (state === 'off') ctx.globalAlpha *= 0.55;
    kline(ctx, [{ key: key }, s], lx + px * 0.5, y, px, 'left', 'parch');
    if (state === 'off') { ctx.globalAlpha /= 0.55; ctx.beginPath(); ctx.moveTo(lx + 4, y + h / 2 - 4); ctx.lineTo(lx + w - 4, y - h / 2 + 4); ctx.lineWidth = 2; ctx.strokeStyle = K.short; ctx.stroke(); }
    ctx.restore();
    return w;
  }
  function drawKeyLine(ctx, st) {
    st = obj(st);
    var x = num(st.x, 440), y = num(st.y, 702), px = clamp(num(st.px, 16), 12, 30);
    var align = oneOf(st.align, ['left', 'center', 'right'], 'left'), tone = st.tone === 'parch' ? 'parch' : 'board';
    var parts = arr(st.parts).slice(0, 16), out = [];
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i];
      if (typeof p === 'string') out.push(p);
      else if (typeof p === 'number' && isFinite(p)) out.push(String(p));
      else if (p && typeof p === 'object') out.push({ key: p.key });
    }
    ctx.save();
    var w = kline(ctx, out, x, y, px, align, tone);
    ctx.restore();
    return w;
  }
  // 木板面板: 底色 + 水平板縫 + 外框 + 四角釘
  function board(ctx, x, y, w, h, tint) {
    ctx.save();
    rr(ctx, x, y, w, h, 8); ctx.fillStyle = tint || K.board; ctx.fill();
    ctx.save(); rr(ctx, x, y, w, h, 8); ctx.clip();
    for (var yy = y + 26; yy < y + h; yy += 26) { ctx.fillStyle = K.seam; ctx.fillRect(x, yy, w, 1.5); ctx.fillStyle = 'rgba(255,220,170,0.05)'; ctx.fillRect(x, yy + 1.5, w, 1); }
    ctx.restore();
    rr(ctx, x + 1.5, y + 1.5, w - 3, h - 3, 8); ctx.lineWidth = 3; ctx.strokeStyle = K.edge; ctx.stroke();
    rr(ctx, x + 4, y + 4, w - 8, h - 8, 6); ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(255,215,160,0.18)'; ctx.stroke();
    var n = [[x + 9, y + 9], [x + w - 9, y + 9], [x + 9, y + h - 9], [x + w - 9, y + h - 9]];
    for (var i = 0; i < 4; i++) { circle(ctx, n[i][0], n[i][1], 2.6); ctx.fillStyle = K.nail; ctx.fill(); ctx.lineWidth = 1; ctx.strokeStyle = K.edge; ctx.stroke(); }
    ctx.restore();
  }
  // 羊皮紙牌: sel 'hot'(金框 + 上浮 3 + 吊牌三角)/ 'cold'(深色雙框)/ null; look 'normal' / 'dim' / 'done' / 'gray'
  function tag(ctx, x, y, w, h, sel, look) {
    ctx.save();
    var lift = sel === 'hot' ? 3 : 0;
    if (lift) { rr(ctx, x + 2, y + 3, w, h, 6); ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fill(); }
    y -= lift;
    var bg = look === 'dim' ? K.parchDim : look === 'done' ? '#d6e6c6' : look === 'gray' ? '#a9a59a' : K.parch;
    rr(ctx, x, y, w, h, 6); ctx.fillStyle = bg; ctx.fill();
    ctx.fillStyle = 'rgba(120,90,40,0.12)'; ctx.fillRect(x + 2, y + h - 5, w - 4, 3);
    if (sel === 'hot') {
      rr(ctx, x - 1.5, y - 1.5, w + 3, h + 3, 7); ctx.lineWidth = 4; ctx.strokeStyle = K.select; ctx.stroke();
      poly(ctx, [x + w / 2 - 8, y - 4, x + w / 2 + 8, y - 4, x + w / 2, y + 5]); ctx.fillStyle = K.select; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = K.edge; ctx.stroke();
    } else if (sel === 'cold') {
      rr(ctx, x + 1.5, y + 1.5, w - 3, h - 3, 6); ctx.lineWidth = 3; ctx.strokeStyle = K.ink; ctx.stroke();
    } else {
      rr(ctx, x + 0.5, y + 0.5, w - 1, h - 1, 6); ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(60,40,20,0.45)'; ctx.stroke();
    }
    ctx.restore();
    return y;
  }
  // 列凹槽: on = 金邊 + 左側金色指標 ▶
  function groove(ctx, x, y, w, h, label, on) {
    ctx.save();
    rr(ctx, x, y, w, h, 6); ctx.fillStyle = on ? '#33261a' : K.groove; ctx.fill();
    rr(ctx, x + 1, y + 1, w - 2, h - 2, 6); ctx.lineWidth = on ? 2.5 : 1; ctx.strokeStyle = on ? K.select : 'rgba(0,0,0,0.6)'; ctx.stroke();
    if (on) { poly(ctx, [x - 14, y + h / 2 - 9, x - 2, y + h / 2, x - 14, y + h / 2 + 9]); ctx.fillStyle = K.select; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = K.edge; ctx.stroke(); }
    if (label) text(ctx, label, x + 10, y + 11, 12, on ? K.select : K.labelDim, 'left', true, 3, K.edge);
    ctx.restore();
  }
  // 動作章: 'hot' 金底 / 'idle' 米白 / 'off' 灰 + 紅斜線(付不起)
  function act(ctx, s, x, y, state, align, px) {
    px = px || 12;
    var w = tw(ctx, s, px, true) + px * 1.2, h = px * 1.7;
    var lx = align === 'right' ? x - w : (align === 'center' ? x - w / 2 : x);
    ctx.save();
    if (state === 'hot') { rr(ctx, lx, y - h / 2 + 3, w, h, 4); ctx.fillStyle = K.selectDeep; ctx.fill(); }
    rr(ctx, lx, y - h / 2, w, h, 4);
    ctx.fillStyle = state === 'hot' ? K.select : state === 'off' ? '#9a9384' : '#fbf6ea'; ctx.fill();
    ctx.lineWidth = 1.5; ctx.strokeStyle = state === 'off' ? '#6a6456' : K.edge; ctx.stroke();
    text(ctx, s, lx + w / 2, y + 0.5, px, state === 'off' ? '#4a4538' : K.ink, 'center', true);
    if (state === 'off') { ctx.beginPath(); ctx.moveTo(lx + 4, y + h / 2 - 4); ctx.lineTo(lx + w - 4, y - h / 2 + 4); ctx.lineWidth = 2; ctx.strokeStyle = K.short; ctx.stroke(); }
    ctx.restore();
    return w;
  }
  // 花費: 只畫大於 0 的種類; 逐項比對 stock, 不足的那一種數字變紅 + 紅底「缺 N」。回傳 { w, ok }
  function costLine(ctx, cost, stock, x, y, px, align, inkCol, measureOnly) {
    var c = mats(cost), s = mats(stock), items = [], i;
    px = tpx(px); // 觸控模式字級拉到下限時, 圖示與「缺」標籤跟著放大, 不互相疊到
    for (i = 0; i < KINDS.length; i++) { var k = KINDS[i], v = Math.round(clamp(c[k], 0, 1e9)); if (v > 0) items.push([k, v, s[k] < v ? v - Math.max(0, Math.floor(s[k])) : 0]); }
    var isz = px * 1.25, ws = [], total = 0, ok = true;
    for (i = 0; i < items.length; i++) {
      var w = isz + 3 + tw(ctx, String(items[i][1]), px, true);
      if (items[i][2]) { ok = false; w += 4 + tw(ctx, '缺 ' + items[i][2], px * 0.78, true) + 8; }
      ws.push(w); total += w + (i ? 10 : 0);
    }
    if (measureOnly) return { w: total, ok: ok };
    var cx = align === 'center' ? x - total / 2 : (align === 'right' ? x - total : x);
    for (i = 0; i < items.length; i++) {
      if (i) cx += 10;
      matIcon(ctx, items[i][0], cx + isz / 2, y, isz);
      var nx = cx + isz + 3, sv = String(items[i][1]);
      text(ctx, sv, nx, y + 0.5, px, items[i][2] ? K.short : (inkCol || K.ink), 'left', true);
      if (items[i][2]) {
        var bx = nx + tw(ctx, sv, px, true) + 4, bs = '缺 ' + items[i][2], bw = tw(ctx, bs, px * 0.78, true) + 8;
        rr(ctx, bx, y - px * 0.62, bw, px * 1.24, 3); ctx.fillStyle = K.short; ctx.fill();
        text(ctx, bs, bx + bw / 2, y + 0.5, px * 0.78, '#ffffff', 'center', true);
      }
      cx += ws[i];
    }
    return { w: total, ok: ok };
  }
  function canPay(cost, stock) { var c = mats(cost), s = mats(stock); for (var i = 0; i < KINDS.length; i++) if (c[KINDS[i]] > s[KINDS[i]]) return false; return true; }
  function dimScreen(ctx, a, hole) {
    ctx.save();
    ctx.beginPath(); ctx.rect(-400, -200, W + 800, H + 400);
    if (hole) { ctx.rect(hole[0] + hole[2], hole[1], -hole[2], hole[3]); }
    ctx.fillStyle = 'rgba(6,8,12,' + a + ')'; ctx.fill();
    ctx.restore();
  }
  function newAreaChip(ctx, x, y, align, s, px) {
    px = tpx(px || 11); s = s || '修好後還沒跑過'; // 觸控模式字級拉到下限時底框跟著放大
    var w = tw(ctx, s, px, true) + 14, lx = align === 'right' ? x - w : (align === 'center' ? x - w / 2 : x);
    rr(ctx, lx, y - px * 0.9, w, px * 1.8, 4); ctx.fillStyle = PAL.newArea; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = '#ffffff'; ctx.stroke();
    text(ctx, s, lx + w / 2, y + 0.5, px, '#ffffff', 'center', true);
    return w;
  }
  function ratesRow(ctx, rates, x, y, step, px, col) {
    var r = mats(rates);
    for (var i = 0; i < 4; i++) {
      var k = KINDS[i];
      matIcon(ctx, k, x + i * step + px * 0.7, y, px * 1.35);
      text(ctx, '+' + fmt1(clamp(r[k], 0, 1e6)) + '/分', x + i * step + px * 1.5, y + 0.5, px, col || K.ink, 'left', true);
    }
  }

  // ---------- 工程角色標誌 / 號碼釘(工程牌、準備頁工程卡、預覽共用) ----------
  function roleGlyph(ctx, role, col) {
    ctx.fillStyle = col; ctx.strokeStyle = col; ctx.lineWidth = 2.6; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    if (role === 'shortcut') { // 閃電箭頭
      ctx.beginPath(); ctx.moveTo(-8, -5); ctx.lineTo(-2, 0); ctx.lineTo(-8, 5); ctx.moveTo(0, -5); ctx.lineTo(6, 0); ctx.lineTo(0, 5); ctx.stroke();
    } else if (role === 'treasure') { // 寶箱
      rr(ctx, -7, -2, 14, 8, 1.5); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-7, -2); ctx.quadraticCurveTo(0, -8, 7, -2); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#20242e'; ctx.fillRect(-1.2, -2, 2.4, 3.5);
    } else { // 魔物爪印
      ell(ctx, 0, 3, 4, 3); ctx.fill();
      circle(ctx, -5.5, -2, 1.9); ctx.fill(); circle(ctx, -2, -5.2, 1.9); ctx.fill(); circle(ctx, 2, -5.2, 1.9); ctx.fill(); circle(ctx, 5.5, -2, 1.9); ctx.fill();
    }
  }
  function roleMark(ctx, role, cx, cy, k, dim) {
    role = oneOf(role, ROLES, 'shortcut');
    ctx.save(); ctx.translate(cx, cy); ctx.scale(k, k);
    circle(ctx, 0, 0, 13); ctx.fillStyle = dim ? '#5a564c' : '#20242e'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = dim ? '#8a8678' : PAL[role === 'nest' ? 'nestRole' : role]; ctx.stroke();
    roleGlyph(ctx, role, dim ? '#8a8678' : PAL[role === 'nest' ? 'nestRole' : role]);
    ctx.restore();
  }
  // 號碼釘: 金屬圓釘 + 號碼(和工程牌頂端同款); r 半徑, px 字級
  function sitePin(ctx, n, x, y, r, px, dim) {
    ctx.save();
    circle(ctx, x, y + 1.5, r); ctx.fillStyle = K.edge; ctx.fill();
    circle(ctx, x, y, r); ctx.fillStyle = dim ? '#b9b8b2' : '#f6e7b8'; ctx.fill(); ctx.lineWidth = Math.max(1, r * 0.18); ctx.strokeStyle = K.edge; ctx.stroke();
    text(ctx, String(n), x, y + 0.5, px, K.ink, 'center', true);
    ctx.restore();
  }

  // ================= 主角(hero 方案 A 幾何剪影) =================
  // 原點 = 判定框中心; 造型以 28×40 設計, 內部 scale(1, 0.9) 收進 28×36。f = 面向; o = { swing, tuck, spread, pose, tint }
  var HC = { line: '#ffffff', ink: '#1a1420', pants: '#2b3245', metal: '#e8eef6', woodC: '#8a5a2a', cape: '#d8434e', hood: '#0f2a24', eye: '#d8fff0', lens: '#e8f6ff' };
  function hfs(ctx, fill, lw) { ctx.fillStyle = fill; ctx.fill(); if (lw) { ctx.lineWidth = lw; ctx.strokeStyle = HC.line; ctx.stroke(); } }
  function heroLegs(ctx, top, o) {
    var s = o.swing || 0, tuck = o.tuck || 0, sp = o.spread || 0;
    ctx.fillStyle = HC.pants;
    rr(ctx, -7 + s - sp, top, 5, 20 - top - tuck, 1.5); ctx.fill(); rr(ctx, 2 - s + sp, top, 5, 20 - top - tuck, 1.5); ctx.fill();
  }
  function heroFig(ctx, cls, f, o) {
    o = o || {};
    var pose = o.pose || 'idle', tint = o.tint;
    ctx.save(); ctx.scale(f === -1 ? -1 : 1, 0.9);
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    if (cls === 'sword') {
      var col = tint || PAL.sword;
      poly(ctx, [-4, -6, -13, 15, -5, 17, 2, -4]); hfs(ctx, HC.cape, 0);
      heroLegs(ctx, 13, o);
      poly(ctx, [-13, -6, 13, -6, 7, 14, -7, 14]); hfs(ctx, col, 2);
      ctx.fillStyle = PAL.gold; ctx.fillRect(-7, 8, 14, 3);
      ctx.fillStyle = 'rgba(255,255,255,0.35)'; poly(ctx, [-2, -4, 2, -4, 0, 4]); ctx.fill();
      poly(ctx, [-8, -13, -14, -19, -12, -11]); hfs(ctx, PAL.gold, 0);
      rr(ctx, -8, -20, 16, 14, 3); hfs(ctx, col, 2);
      ctx.fillStyle = HC.ink; ctx.fillRect(-1, -15, 8, 3);
      if (pose === 'slash' || pose === 'dash') { // 劍平舉朝前; slash 時依 o.slashA 繞護手上下擺(正 = 往下)
        ctx.save(); if (o.slashA) { ctx.translate(4, 1); ctx.rotate(o.slashA); ctx.translate(-4, -1); }
        poly(ctx, [4, -1, 13, -1, 14, 1, 13, 3, 4, 3]); hfs(ctx, HC.metal, 0); ctx.lineWidth = 1; ctx.strokeStyle = HC.ink; ctx.stroke();
        ctx.fillStyle = PAL.gold; ctx.fillRect(2.5, -3.5, 3, 9);
        ctx.restore();
      } else if (pose === 'cheer') { // 劍高舉
        poly(ctx, [9, -18, 11, -20, 13, -18, 13, -6, 9, -6]); hfs(ctx, HC.metal, 0); ctx.lineWidth = 1; ctx.strokeStyle = HC.ink; ctx.stroke();
        ctx.fillStyle = PAL.gold; ctx.fillRect(7.5, -6.5, 7, 2.5);
      } else {
        poly(ctx, [10, -17.5, 12, -20, 14, -17.5, 14, -3, 10, -3]); hfs(ctx, HC.metal, 0); ctx.lineWidth = 1; ctx.strokeStyle = HC.ink; ctx.stroke();
        ctx.fillStyle = PAL.gold; ctx.fillRect(8, -3.5, 6, 3);
        ctx.fillStyle = HC.woodC; ctx.fillRect(11, -0.5, 2, 5);
        circle(ctx, 11.5, 3, 2.4); hfs(ctx, PAL.skin, 0);
      }
    } else if (cls === 'hunter') {
      var hcCol = tint || PAL.hunter;
      ctx.save(); ctx.translate(-8, -4); ctx.rotate(-0.35);
      ctx.fillStyle = HC.woodC; ctx.fillRect(-3, -6, 6, 14);
      ctx.fillStyle = HC.eye; poly(ctx, [-3, -6, -1, -12, 1, -6]); ctx.fill(); poly(ctx, [0, -6, 2.5, -11, 3.5, -6]); ctx.fill();
      ctx.restore();
      heroLegs(ctx, 14, o);
      poly(ctx, [0, -20, 13, 15, -13, 15]); hfs(ctx, hcCol, 2);
      ctx.fillStyle = 'rgba(0,0,0,0.18)'; poly(ctx, [0, -20, -13, 15, -5, 15]); ctx.fill();
      poly(ctx, [-1, -13, 7, -9, 6, -4, -3, -4]); ctx.fillStyle = HC.hood; ctx.fill();
      circle(ctx, 2, -8, 1.3); ctx.fillStyle = HC.eye; ctx.fill(); circle(ctx, 5, -7.6, 1.3); ctx.fill();
      circle(ctx, 0, 0, 2); ctx.fillStyle = PAL.gold; ctx.fill();
      var by = pose === 'cheer' ? -6 : 2;
      ctx.strokeStyle = HC.woodC; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(0, by, 12.5, -1.1, 1.1); ctx.stroke(); // 弓臂外緣(含線寬)收在 x ≤ 14
      var ex = Math.cos(1.1) * 12.5, ey = Math.sin(1.1) * 12.5;
      ctx.strokeStyle = '#e8e2d0'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(ex, by - ey); ctx.lineTo(ex, by + ey); ctx.stroke();
      ctx.strokeStyle = PAL.arrow; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(ex - 1, by); ctx.lineTo(12, by); ctx.stroke();
      ctx.fillStyle = '#c9d3df'; poly(ctx, [11.5, by - 2.2, 14, by, 11.5, by + 2.2]); ctx.fill();
    } else {
      var bcol = tint || PAL.bomber;
      heroLegs(ctx, 15, o);
      circle(ctx, 0, 5, 12); hfs(ctx, bcol, 2);
      ctx.strokeStyle = '#5a3418'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-9, -2); ctx.lineTo(8, 13); ctx.stroke();
      for (var i = 0; i < 3; i++) { circle(ctx, -5 + i * 5, 1.5 + i * 4.4, 2.2); ctx.fillStyle = PAL.bomb; ctx.fill(); }
      circle(ctx, 0, -11, 8); hfs(ctx, PAL.skin, 1.8);
      ctx.beginPath(); ctx.arc(0, -12, 8, Math.PI, 0); ctx.closePath(); hfs(ctx, bcol, 0);
      ctx.fillStyle = '#3a3f4c'; ctx.fillRect(-8, -12.5, 16, 2.6);
      circle(ctx, 1, -11.2, 3.1); hfs(ctx, HC.lens, 0); ctx.lineWidth = 1.2; ctx.strokeStyle = '#3a3f4c'; ctx.stroke();
      circle(ctx, 6.4, -11.2, 3.1); hfs(ctx, HC.lens, 0); ctx.stroke();
      ctx.strokeStyle = HC.ink; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(3, -6.5, 2.4, 0.2, Math.PI - 0.2); ctx.stroke();
      ctx.strokeStyle = PAL.skin; ctx.lineWidth = 3;
      if (pose === 'throw') { ctx.beginPath(); ctx.moveTo(6, -1); ctx.lineTo(12.5, -8); ctx.stroke(); }
      else if (pose === 'wave') { ctx.beginPath(); ctx.moveTo(-8, 3); ctx.lineTo(-12.5, -3); ctx.moveTo(8, 3); ctx.lineTo(12.5, -3); ctx.stroke(); }
      else if (pose === 'cheer') { ctx.beginPath(); ctx.moveTo(-7, 0); ctx.lineTo(-11, -12); ctx.moveTo(7, 0); ctx.lineTo(11, -12); ctx.stroke(); }
      else if (o.holdBomb !== false) {
        circle(ctx, 9.5, 4, 4.3); ctx.fillStyle = PAL.bomb; ctx.fill(); ctx.lineWidth = 1.2; ctx.strokeStyle = HC.line; ctx.stroke();
        ctx.strokeStyle = '#c9b48a'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(10.5, -0.2); ctx.quadraticCurveTo(11.5, -2.4, 12.6, -2.8); ctx.stroke();
        star4(ctx, 12.6, -4.2, 1.6); ctx.fillStyle = PAL.goal; ctx.fill();
      } else { circle(ctx, 10.5, 2, 2.6); hfs(ctx, PAL.skin, 0); }
    }
    ctx.restore();
  }
  // 縮圖記號: 盾形 / 三角 / 圓(畫面上約 9px, 刻意大於判定框才看得出職業)
  function heroMark(ctx, cls, s, lw) {
    if (cls === 'sword') poly(ctx, [-0.5 * s, -s, 0.5 * s, -s, 0.5 * s, -0.5 * s, 0, 0, -0.5 * s, -0.5 * s]);
    else if (cls === 'hunter') poly(ctx, [0, -1.1 * s, 0.55 * s, 0, -0.55 * s, 0]);
    else circle(ctx, 0, -0.5 * s, 0.5 * s);
    ctx.fillStyle = PAL[cls]; ctx.fill(); ctx.lineWidth = lw; ctx.strokeStyle = '#ffffff'; ctx.stroke();
  }

  // 刀光掃動進度 → 刀鋒前緣角度(-π/2 = 頂、π/2 = 底); 第一幀就已掃出約 1/3, 連按重播時每一下都看得到
  function slashHead(sp) { return -Math.PI / 2 + 0.9 + (Math.PI - 0.9) * eOut(clamp(sp / 0.5, 0, 1)); }
  // 新月刀光: 原點 = 判定框中心; 外弧 48×19、內弧 28×8, 圓心在面向側框邊 (14, 0) → 全部落在框外 50×40 內
  // dir 0 = 由上往下斬, 1 = 由下往上斬(上下鏡像); 刀鋒前緣一條白亮線 + 小星, 尾端隨後收掉
  function drawSlashArc(ctx, f, dir, sp) {
    var hA = slashHead(sp), tA = -Math.PI / 2 + (Math.PI - 0.25) * clamp((sp - 0.2) / 0.8, 0, 1);
    if (hA - tA < 0.04) return;
    ctx.save(); ctx.scale(f === -1 ? -1 : 1, dir === 1 ? -1 : 1);
    ctx.globalAlpha *= 1 - sp * 0.55;
    ctx.beginPath(); ctx.ellipse(14, 0, 48, 19, 0, tA, hA, false); ctx.ellipse(14, 0, 28, 8, 0, hA, tA, true); ctx.closePath();
    ctx.fillStyle = 'rgba(232,244,255,0.92)'; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(120,180,255,0.95)'; ctx.stroke();
    var c = Math.cos(hA), s = Math.sin(hA);
    ctx.lineCap = 'round'; ctx.lineWidth = 3; ctx.strokeStyle = '#ffffff';
    ctx.beginPath(); ctx.moveTo(14 + 28 * c, 8 * s); ctx.lineTo(14 + 45 * c, 17.5 * s); ctx.stroke();
    if (sp < 0.6) { star4(ctx, 14 + 44 * c, 17 * s, 2.5); ctx.fillStyle = '#ffffff'; ctx.fill(); }
    ctx.restore();
  }
  var POSES = ['idle', 'run', 'rise', 'fall', 'slash', 'dash', 'throw', 'wave', 'hurt', 'cheer'];
  function drawPlayer(ctx, st) {
    st = obj(st);
    var x = num(st.x, 0), y = num(st.y, 0), cls = oneOf(st.cls, CLS, 'sword'), f = face(st.facing);
    var pose = oneOf(st.pose, POSES, 'idle'), pt = clamp(num(st.poseT, 0), 0, 1e6);
    var stealth = st.stealth === true, sDur = Math.max(0.01, num(st.stealthDur, 2.5)), sT = clamp(num(st.stealthT, sDur), 0, sDur);
    var uDur = Math.max(0.01, num(st.unstealthDur, 0.3)), uT = clamp(num(st.unstealthT, uDur), 0, uDur);
    var sc = scaleOf(ctx);
    ctx.save(); ctx.translate(x, y);
    if (pose === 'cheer') { // 過關動畫 0.72~0.86 秒(光圈回彈那一下)跳起, 框上方至多 16px
      var hp0 = seg(pt, 0.72, 0.86); if (hp0 > 0 && hp0 < 1) ctx.translate(0, -15 * Math.sin(Math.PI * hp0));
    }
    if (st.invuln === true && Math.floor(nowS() * 12) % 2 === 0) ctx.globalAlpha *= 0.3;
    if (sc.rel < SIL) {
      if (stealth) ctx.globalAlpha *= 0.45;
      ctx.translate(0, 18); heroMark(ctx, cls, 9 / sc.abs, 1 / sc.abs);
      ctx.restore(); return;
    }
    if (pose === 'dash') { // 速度線: 衝刺反方向, 框外至多 60px
      ctx.strokeStyle = 'rgba(220,236,255,0.85)'; ctx.lineCap = 'butt';
      var ls = [[-12, 52], [-3, 60], [6, 44], [14, 32]];
      for (var i = 0; i < ls.length; i++) { ctx.lineWidth = 3 - i * 0.4; ctx.beginPath(); ctx.moveTo(-f * 14, ls[i][0]); ctx.lineTo(-f * (14 + ls[i][1]), ls[i][0]); ctx.stroke(); }
    }
    if (pose === 'slash' && pt < 0.15) { // 新月刀光: 面向側框外 50×40、與身體同高; swingIdx 0 由上往下掃、1 由下往上掃
      var sp = pt / 0.15, swing = Math.round(num(st.swingIdx, 0)) === 1 ? 1 : 0;
      drawSlashArc(ctx, f, swing, sp);
    }
    ctx.save();
    if (stealth) ctx.globalAlpha *= 0.35;
    if (pose === 'dash') { ctx.rotate(f * 0.2); ctx.scale(0.86, 0.86); }
    if (pose === 'hurt') { ctx.rotate(-f * 0.16); ctx.scale(0.86, 0.86); }
    if (pose === 'wave') { ctx.translate(0, 18); ctx.scale(1, 0.92); ctx.translate(0, -18); }
    var o = { pose: pose, swing: 0 };
    if (pose === 'run') o.swing = Math.sin(pt * 18) * 3;
    if (pose === 'slash' && cls === 'sword') { // 劍身跟著刀鋒前緣擺: 0 由上往下、1 由下往上(±0.6 rad, 劍尖仍在框內)
      var sa = 0.6 * Math.sin(slashHead(Math.min(1, pt / 0.15)));
      o.slashA = Math.round(num(st.swingIdx, 0)) === 1 ? -sa : sa;
    }
    if (pose === 'rise') o.tuck = 5;
    if (pose === 'fall') o.spread = 2;
    if (pose === 'hurt') o.tint = '#ff6b6b';
    heroFig(ctx, cls, f, o);
    ctx.restore();
    if (pose === 'cheer') { // 慶祝: 頭頂兩顆小金星(框內)
      var cq = (pt * 4) % 1;
      ctx.fillStyle = PAL.select; star4(ctx, -9, -13 - cq * 3, 2.5); ctx.fill(); star4(ctx, 9, -12 - ((cq + 0.5) % 1) * 3, 2.2); ctx.fill();
    }
    if (stealth) { // 潛行: 殼形輪廓微光; 最後 0.5 秒閃爍預告
      var left = sDur - sT, blink = left < 0.5 && Math.floor(sT * 12) % 2 === 0;
      if (!blink) {
        ctx.save(); ctx.setLineDash([4, 3]); ctx.lineDashOffset = -sT * 30; ctx.lineWidth = 1.8; ctx.strokeStyle = 'rgba(190,255,235,0.95)';
        rr(ctx, -13, -17, 26, 34, 10); ctx.stroke(); ctx.restore();
        ctx.save(); ctx.globalAlpha *= 0.18; heroFig(ctx, cls, f, { pose: 'idle', tint: '#d8fff0' }); ctx.restore();
      }
    }
    if (uT < uDur) { // 現身閃光(框外至多 12px)
      var q = uT / uDur;
      ctx.save(); ctx.globalAlpha *= 1 - q;
      ell(ctx, 0, 0, 14 + 10 * q, 18 + 10 * q); ctx.lineWidth = 2; ctx.strokeStyle = '#eafff8'; ctx.stroke();
      ctx.fillStyle = '#ffffff';
      for (var j = 0; j < 6; j++) { var a = j * TAU / 6 + 0.3; star4(ctx, Math.cos(a) * (14 + 10 * q), Math.sin(a) * (18 + 10 * q), 2.4); ctx.fill(); }
      ctx.restore();
    }
    ctx.restore();
  }

  // ---------- 技能冷卻地面環(skill-cd 方案 A) ----------
  function arcPiece(ctx, cx, cy, rx, ry, a0, len) {
    if (len <= 0.001) return;
    ctx.beginPath(); ctx.ellipse(cx, cy, Math.max(0, rx), Math.max(0, ry), 0, a0, a0 + Math.min(len, TAU)); ctx.stroke();
  }
  function drawSkillRing(ctx, st) {
    st = obj(st);
    var x = num(st.x, 0), y = num(st.y, 0), cls = oneOf(st.cls, CLS, 'sword');
    var cdDur = Math.max(0.01, num(st.cdDur, 1)), cdT = clamp(num(st.cdT, cdDur), 0, cdDur);
    var rDur = Math.max(0.01, num(st.readyDur, 0.5)), rT = clamp(num(st.readyT, rDur), 0, rDur);
    var cDur = Math.max(0.01, num(st.castDur, 0.3)), cT = clamp(num(st.castT, cDur), 0, cDur);
    var dDur = Math.max(0.01, num(st.denyDur, 0.25)), dT = clamp(num(st.denyT, dDur), 0, dDur);
    var sDur = Math.max(0.01, num(st.stealthDur, 2.5)), sLeft = clamp(num(st.stealthLeft, 0), 0, sDur);
    var RX = 26, RY = 6, START = -Math.PI / 2;
    var deny = dT < dDur, dq = dT / dDur;
    var cx = x + (deny ? Math.sin(dq * Math.PI * 4) * 3 * (1 - dq) : 0), cy = y;
    ctx.save(); ctx.lineCap = 'butt';
    var cooling = cdT < cdDur;
    if (cooling) {
      var left = cdDur - cdT, warn = left < 0.35;
      ctx.lineWidth = 4; ctx.strokeStyle = deny ? 'rgba(200,32,44,0.85)' : 'rgba(12,10,8,0.72)'; arcPiece(ctx, cx, cy, RX, RY, 0, TAU);
      var nT = Math.min(60, Math.ceil(cdDur));
      ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(255,240,210,0.55)';
      for (var k = 1; k < nT; k++) { var ang = START + k / cdDur * TAU; var px = cx + Math.cos(ang) * RX, py = cy + Math.sin(ang) * RY; ctx.beginPath(); ctx.moveTo(px, py - 2); ctx.lineTo(px, py + 2); ctx.stroke(); }
      ctx.lineWidth = 4; ctx.strokeStyle = warn ? K.select : PAL[cls];
      arcPiece(ctx, cx, cy, RX, RY, START, cdT / cdDur * TAU);
      if (warn) { ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(255,246,200,0.9)'; arcPiece(ctx, cx, cy, RX - 2.5, RY - 2.5, 0, TAU); }
    } else {
      var fa = rT < rDur ? rT / rDur : 1;
      ell(ctx, cx, cy, RX - 3, RY - 2); ctx.fillStyle = 'rgba(255,216,74,' + (0.16 + 0.3 * (1 - fa)).toFixed(3) + ')'; ctx.fill();
      ctx.lineWidth = 4; ctx.strokeStyle = fa < 0.35 ? '#ffffff' : K.select; arcPiece(ctx, cx, cy, RX, RY, 0, TAU);
      if (fa < 1) {
        ctx.save(); ctx.globalAlpha *= 1 - fa; ctx.lineWidth = 3; ctx.strokeStyle = '#fff3b0';
        arcPiece(ctx, cx, cy, RX + 16.5 * fa, RY + 6 * fa, 0, TAU);
        ctx.fillStyle = K.select;
        for (var j = 0; j < 6; j++) { var an = j / 6 * TAU + 0.3; star4(ctx, cx + Math.cos(an) * RX * 0.9, cy + Math.sin(an) * RY - 26 * fa, 4 - 1.5 * fa); ctx.fill(); }
        ctx.restore();
      }
    }
    if (deny) { ctx.save(); ctx.globalAlpha *= 1 - dq; ctx.lineWidth = 2; ctx.strokeStyle = '#ff5a5a'; arcPiece(ctx, cx, cy, RX, RY, 0, TAU); ctx.restore(); }
    if (sLeft > 0) { ctx.save(); ctx.setLineDash([4, 3]); ctx.lineWidth = 2; ctx.strokeStyle = '#bff5e6'; arcPiece(ctx, cx, cy, RX - 8, RY - 3, START, sLeft / sDur * TAU); ctx.restore(); }
    if (cT < cDur) { var q = cT / cDur; ctx.save(); ctx.globalAlpha *= 1 - q; ctx.lineWidth = 3; ctx.strokeStyle = K.select; arcPiece(ctx, cx, cy, RX + 12 * q, RY + 4 * q, 0, TAU); ctx.restore(); }
    ctx.restore();
  }

  function drawRangeRing(ctx, st) {
    st = obj(st);
    var x = num(st.x, 0), y = num(st.y, 0), r = clamp(num(st.radius, 260), 2, 2000);
    ctx.save();
    ctx.setLineDash([10, 8]); ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(31,191,154,0.42)';
    circle(ctx, x, y, r - 1); ctx.stroke();
    ctx.restore();
  }

  // ================= 背景 =================
  function bgSky(ctx, th) { ctx.fillStyle = lin(ctx, 0, 0, 0, H, [0, th.sky0, 1, th.sky1]); ctx.fillRect(0, 0, W, H); }
  function saltBackdrop(ctx, simple, t) {
    var th = THEMES.salt;
    ctx.fillStyle = lin(ctx, 0, 0, 0, 640, [0, '#2a1f4e', 0.38, '#5e4180', 0.78, '#c47d9c', 1, '#f4c2a2']); ctx.fillRect(0, 0, W, H);
    var i;
    if (!simple) {
      for (i = 0; i < 50; i++) { ctx.fillStyle = 'rgba(255,240,255,' + (0.2 + hash(i, 5) * 0.4).toFixed(2) + ')'; circle(ctx, hash(i, 1) * W, 44 + hash(i, 2) * 200, 0.6 + hash(i, 3)); ctx.fill(); }
      ctx.fillStyle = 'rgba(255,200,200,0.18)';
      var o = (t * 6) % W;
      for (i = -1; i <= 0; i++) { ctx.fillRect(o + i * W, 430, W, 6); ctx.fillRect(o * 0.6 + 160 + i * W, 470, 900, 4); ctx.fillRect(o * 0.4 + 500 + i * W, 505, 780, 5); }
    }
    ctx.fillStyle = th.far;
    poly(ctx, [0, 640, 0, 600, 120, 600, 150, 584, 330, 584, 350, 604, 880, 606, 910, 590, 1060, 590, 1090, 602, 1280, 602, 1280, 640]); ctx.fill();
    function pillar(x0, x1, jag) {
      ctx.fillStyle = th.ruin;
      var p = [x0, 640, x0, jag[0]], n = jag.length - 1;
      for (var k = 1; k < n; k++) p.push(x0 + (x1 - x0) * k / n, jag[k]);
      p.push(x1, jag[n], x1, 640); poly(ctx, p); ctx.fill();
      if (!simple) {
        ctx.strokeStyle = th.ruinHi; ctx.lineWidth = 3;
        var top = Math.max.apply(null, jag) + 16;
        ctx.beginPath(); for (var q = 1; q < 4; q++) { var fx = x0 + (x1 - x0) * q / 4; ctx.moveTo(fx, top); ctx.lineTo(fx, 600); } ctx.stroke();
        var ex = (x0 + x1) / 2, ey = top + 70;
        ctx.lineWidth = 4; ell(ctx, ex, ey, 36, 20); ctx.stroke(); circle(ctx, ex, ey, 9); ctx.fillStyle = th.ruinHi; ctx.fill();
      }
    }
    pillar(140, 290, [128, 112, 126, 108, 120]);
    ctx.fillStyle = th.ruin; poly(ctx, [140, 108, 470, 118, 456, 136, 478, 150, 440, 166, 290, 166]); ctx.fill();
    pillar(990, 1140, [236, 214, 252, 226, 246]);
    if (simple) { ctx.fillStyle = th.ruin; ctx.fillRect(140, 108, 150, 540); ctx.fillRect(990, 214, 150, 430); }
  }
  function drawBackground(ctx, st) {
    st = obj(st);
    var key = oneOf(st.theme, THEME_KEYS, 'forest'), th = THEMES[key], t = num(st.t, 0), simple = scaleOf(ctx).rel < SIL, i, x, y;
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.clip();
    if (key === 'salt') { saltBackdrop(ctx, simple, t); ctx.restore(); return; }
    bgSky(ctx, th);
    if (key === 'forest') {
      ctx.fillStyle = th.far; for (i = 0; i < 7; i++) { circle(ctx, i * 220 - 40, 560 + hash(i, 1) * 60, 200 + hash(i, 2) * 60); ctx.fill(); }
      ctx.fillStyle = th.mid; for (i = 0; i < 9; i++) { x = 40 + i * 150 + hash(i, 3) * 40; y = 250 + hash(i, 4) * 70; ctx.fillRect(x - 7, y, 14, H - y); circle(ctx, x, y, 48 + hash(i, 5) * 18); ctx.fill(); }
      if (!simple) {
        ctx.fillStyle = th.near; ctx.fillRect(0, 0, 34, H); ctx.fillRect(W - 30, 0, 30, H);
        for (i = 0; i < 9; i++) { circle(ctx, 20 + i * 36, 10 + Math.sin(i) * 14, 34); ctx.fill(); circle(ctx, W - 20 - i * 34, 6 + Math.cos(i) * 12, 30); ctx.fill(); }
        ctx.fillStyle = 'rgba(255,250,200,0.5)';
        for (i = 0; i < 16; i++) { var px = fr(hash(i, 8) + t * (0.004 + hash(i, 9) * 0.004)) * W, py = 120 + hash(i, 10) * 420 + Math.sin(t * 0.7 + i) * 10; circle(ctx, px, py, 1.4 + hash(i, 11)); ctx.fill(); }
      }
    } else if (key === 'cliff') {
      ctx.fillStyle = th.far; for (i = 0; i < 12; i++) { x = i * 115 + hash(i, 1) * 40; y = 220 + hash(i, 2) * 120; poly(ctx, [x - 50, H, x - 8, y, x + 8, y, x + 50, H]); ctx.fill(); }
      ctx.fillStyle = th.mid; for (i = 0; i < 5; i++) { x = i * 300 + 40; y = 330 + hash(i, 3) * 60; poly(ctx, [x - 130, H, x - 100, y + 40, x - 60, y, x + 60, y, x + 100, y + 40, x + 130, H]); ctx.fill(); }
      if (!simple) {
        ctx.fillStyle = th.near;
        var pil = [120, 640, 1170];
        for (i = 0; i < 3; i++) { x = pil[i]; poly(ctx, [x - 44, H, x - 30, 430, x - 12, 360, x - 30, 290, x - 18, 250, x + 18, 250, x + 30, 290, x + 12, 360, x + 30, 430, x + 44, H]); ctx.fill(); }
        ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 2;
        var Pw = W + 300;
        for (i = 0; i < 9; i++) { x = fr(hash(i, 7) + t * 0.02 * (1 + (i % 2))) * Pw - 200; y = 60 + hash(i, 8) * 300; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 120 + hash(i, 9) * 80, y - 6); ctx.stroke(); }
      }
    } else if (key === 'mine') {
      ctx.fillStyle = th.far; for (i = 0; i < 10; i++) { x = i * 140 + hash(i, 1) * 50; ctx.fillRect(x, 60 + hash(i, 2) * 200, 46, 160 + hash(i, 3) * 200); }
      if (!simple) {
        ctx.strokeStyle = th.mid; ctx.lineWidth = 6;
        for (x = 60; x < W; x += 180) { ctx.strokeRect(x, 200, 120, 120); ctx.beginPath(); ctx.moveTo(x, 200); ctx.lineTo(x + 120, 320); ctx.stroke(); }
        var lamps = [220, 640, 1060];
        for (i = 0; i < 3; i++) {
          var fl = 0.85 + 0.15 * Math.sin(t * 7 + i * 2.1);
          ctx.fillStyle = rad(ctx, lamps[i], 150, 4, 150, [0, 'rgba(255,190,100,' + (0.3 * fl).toFixed(3) + ')', 1, 'rgba(255,190,100,0)']); ctx.fillRect(lamps[i] - 150, 0, 300, 300);
          ctx.strokeStyle = '#2a201a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(lamps[i], 100); ctx.lineTo(lamps[i], 140); ctx.stroke();
          ctx.fillStyle = '#ffcf7a'; ctx.fillRect(lamps[i] - 6, 144, 12, 12);
        }
        ctx.fillStyle = 'rgba(200,180,150,0.35)';
        for (i = 0; i < 14; i++) { circle(ctx, hash(i, 4) * W + Math.sin(t * 0.5 + i) * 14, fr(hash(i, 5) - t * 0.01) * H, 1.2); ctx.fill(); }
      }
    } else { // lair(介面只在 drawLairBack 用, 這裡給個暗紫底)
      ctx.fillStyle = 'rgba(194,100,255,0.06)'; for (i = 0; i < 8; i++) { circle(ctx, hash(i, 1) * W, hash(i, 2) * H, 60 + hash(i, 3) * 80); ctx.fill(); }
    }
    ctx.restore();
  }

  function drawMapBackground(ctx, st) {
    st = obj(st);
    var t = num(st.t, 0), i;
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.clip();
    // ---- 關卡區(河右岸到 x=1280): 冷色地圖紙 + 40px 淡格線 + 淡等高線 + 斷門方向的黃昏粉紫光 ----
    ctx.fillStyle = lin(ctx, 0, 0, 0, H, [0, '#16262e', 1, '#0f1b22']); ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = rad(ctx, 1200, 360, 10, 300, [0, 'rgba(196,125,156,0.22)', 1, 'rgba(94,65,128,0)']); ctx.fillRect(880, 40, 400, H - 40);
    ctx.strokeStyle = PAL.mapLine; ctx.lineWidth = 1;
    ctx.beginPath(); for (var gx = 320; gx <= W; gx += 40) { ctx.moveTo(gx + 0.5, 40); ctx.lineTo(gx + 0.5, H); } for (var gy = 40; gy <= H; gy += 40) { ctx.moveTo(300, gy + 0.5); ctx.lineTo(W, gy + 0.5); } ctx.stroke();
    ctx.strokeStyle = 'rgba(120,170,160,0.08)'; ctx.lineWidth = 2;
    for (i = 0; i < 7; i++) { var ex = 380 + hash(i, 1) * 820, ey = 160 + hash(i, 2) * 480; ell(ctx, ex, ey, 80 + hash(i, 3) * 90, 40 + hash(i, 4) * 50); ctx.stroke(); ell(ctx, ex, ey, 50 + hash(i, 3) * 60, 22 + hash(i, 4) * 30); ctx.stroke(); }
    // ---- 營地(x 0 ~ 河左岸): 暖色石板地 ----
    var y;
    ctx.save();
    ctx.beginPath(); ctx.moveTo(0, 0); for (y = 0; y <= H; y += 10) ctx.lineTo(riverX(y) - RIVER_HW, y); ctx.lineTo(0, H); ctx.closePath(); ctx.clip();
    ctx.fillStyle = lin(ctx, 0, 40, 0, H, [0, '#3e3227', 1, '#2e251c']); ctx.fillRect(0, 0, 380, H);
    ctx.strokeStyle = 'rgba(255,220,170,0.07)'; ctx.lineWidth = 1.2; // 石板紋(很淡)
    for (var r = 0; r < 25; r++) for (var c = 0; c < 9; c++) { ell(ctx, c * 40 + (r % 2) * 20 + 10, 52 + r * 28, 16, 10); ctx.stroke(); }
    mapHouse(ctx, 18, 92, 50, 34); mapHouse(ctx, 238, 96, 44, 30); mapHouse(ctx, 20, 616, 46, 32); mapHouse(ctx, 240, 620, 48, 30);
    // 小路: 升級所 ↔ 商店(150, 286~430), 中間 y=349 分岔往右接橋
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.strokeStyle = '#6e5a40'; ctx.lineWidth = 22;
    // 觸控模式: 升級所 / 商店卡上移到 (62,52) / (62,214)(讓出左下方向鍵), 小路改成 188~349
    var pT = isTouchOn() ? 188 : 286, pB = isTouchOn() ? 349 : 430;
    ctx.beginPath(); ctx.moveTo(150, pT); ctx.lineTo(150, pB); ctx.moveTo(150, 349); ctx.lineTo(330, 349); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,230,180,0.12)'; ctx.lineWidth = 2; ctx.setLineDash([6, 8]);
    ctx.beginPath(); ctx.moveTo(150, pT + 4); ctx.lineTo(150, pB - 4); ctx.moveTo(160, 349); ctx.lineTo(310, 349); ctx.stroke(); ctx.setLineDash([]);
    mapLamp(ctx, 36, 372, t); mapLamp(ctx, 262, 330, t); mapLamp(ctx, 262, 140, t); mapLamp(ctx, 36, 600, t);
    ctx.restore();
    // ---- 河: 由上到下, 中線 x = 330 + 10 sin(y/70)、寬 44; 冷深藍(不用水晶青)+ 兩岸描邊 + 小波紋 ----
    ctx.beginPath(); ctx.moveTo(riverX(0) - RIVER_HW, 0);
    for (y = 0; y <= H; y += 10) ctx.lineTo(riverX(y) - RIVER_HW, y);
    for (y = H; y >= 0; y -= 10) ctx.lineTo(riverX(y) + RIVER_HW, y);
    ctx.closePath(); ctx.fillStyle = '#1b2f48'; ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#5a4a36'; ctx.beginPath(); for (y = 0; y <= H; y += 10) { if (!y) ctx.moveTo(riverX(y) - RIVER_HW, y); else ctx.lineTo(riverX(y) - RIVER_HW, y); } ctx.stroke();
    ctx.strokeStyle = '#24404a'; ctx.beginPath(); for (y = 0; y <= H; y += 10) { if (!y) ctx.moveTo(riverX(y) + RIVER_HW, y); else ctx.lineTo(riverX(y) + RIVER_HW, y); } ctx.stroke();
    ctx.strokeStyle = 'rgba(150,180,215,0.35)'; ctx.lineWidth = 1.5;
    for (var k = 0; k < 15; k++) { var wy = 50 + k * 47 + 10 * Math.sin(t * 0.8 + k), wx = riverX(wy) - 8 + (k % 3) * 6; ctx.beginPath(); ctx.moveTo(wx, wy); ctx.quadraticCurveTo(wx + 4, wy - 3, wx + 8, wy); ctx.stroke(); }
    // ---- 橋: y 337~361 跨河, 兩端各伸出岸外 10px; 右端小路接到第 1 關卡片左緣 (392,349) ----
    var bx0 = riverX(349) - RIVER_HW - 10, bx1 = riverX(349) + RIVER_HW + 10;
    ctx.strokeStyle = '#6e5a40'; ctx.lineWidth = 10; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(bx1 - 4, 349); ctx.lineTo(387, 349); ctx.stroke();
    ctx.fillStyle = '#8a5a2a'; ctx.fillRect(bx0, 337, bx1 - bx0, 24);
    ctx.strokeStyle = '#3e2a17'; ctx.lineWidth = 1.5; ctx.lineCap = 'butt';
    for (var px = bx0 + 7; px < bx1; px += 7) { ctx.beginPath(); ctx.moveTo(px, 337); ctx.lineTo(px, 361); ctx.stroke(); }
    ctx.fillStyle = '#5a3a1e'; ctx.fillRect(bx0 - 2, 333, bx1 - bx0 + 4, 4); ctx.fillRect(bx0 - 2, 361, bx1 - bx0 + 4, 4);
    ctx.restore();
  }
  // 大地圖背景的零件(map-layout B)
  var RIVER_HW = 22;
  function riverX(y) { return 330 + 10 * Math.sin(y / 70); }
  function mapHouse(ctx, x, y, w, h) { // 遠處房舍剪影(窗透暖光)
    ctx.fillStyle = '#251c15'; ctx.fillRect(x, y, w, h);
    poly(ctx, [x - 6, y, x + w / 2, y - h * 0.7, x + w + 6, y]); ctx.fillStyle = '#4a2f22'; ctx.fill();
    ctx.fillStyle = 'rgba(255,190,110,0.55)'; ctx.fillRect(x + w / 2 - 5, y + h / 2 - 5, 10, 10);
  }
  function mapLamp(ctx, x, y, t) { // 暖光燈柱(光暈以 t 很慢地呼吸)
    var a = 0.32 + 0.05 * Math.sin(t * 1.6 + x);
    ctx.fillStyle = rad(ctx, x, y - 26, 2, 34, [0, 'rgba(255,190,110,' + a.toFixed(3) + ')', 1, 'rgba(255,190,110,0)']); ctx.fillRect(x - 34, y - 60, 68, 68);
    ctx.fillStyle = '#20160e'; ctx.fillRect(x - 2, y - 24, 4, 26);
    circle(ctx, x, y - 27, 5); ctx.fillStyle = '#ffd08a'; ctx.fill();
  }

  // ================= 地形 =================
  function shapePath(ctx, shape, x, y, w, h, k) {
    ctx.beginPath();
    if (shape === 'chamfer') {
      ctx.moveTo(x + k.tl, y); ctx.lineTo(x + w - k.tr, y); ctx.lineTo(x + w, y + k.tr); ctx.lineTo(x + w, y + h - k.br);
      ctx.lineTo(x + w - k.br, y + h); ctx.lineTo(x + k.bl, y + h); ctx.lineTo(x, y + h - k.bl); ctx.lineTo(x, y + k.tl);
    } else {
      ctx.moveTo(x + k.tl, y); ctx.arcTo(x + w, y, x + w, y + h, k.tr); ctx.arcTo(x + w, y + h, x, y + h, k.br);
      ctx.arcTo(x, y + h, x, y, k.bl); ctx.arcTo(x, y, x + w, y, k.tl);
    }
    ctx.closePath();
  }
  function drawGround(ctx, st) {
    st = obj(st);
    var x = num(st.x, 20), y = num(st.y, 20), key = oneOf(st.theme, THEME_KEYS, 'forest'), th = THEMES[key];
    var op = (st.open && typeof st.open === 'object') ? st.open : { n: st.top === true };
    var n = op.n === true, e = op.e === true, s = op.s === true, w = op.w === true;
    var L = x - 20, T = y - 20, c = Math.floor(L / 40), r = Math.floor(T / 40), simple = scaleOf(ctx).rel < SIL, i;
    var k = { tl: n && w ? th.tR : 0, tr: n && e ? th.tR : 0, br: s && e ? th.bR : 0, bl: s && w ? th.bR : 0 };
    ctx.save();
    ctx.beginPath(); ctx.rect(L, T, 40, 40); ctx.clip();
    shapePath(ctx, th.shape, L, T, 40, 40, k); ctx.fillStyle = th.line; ctx.fill();
    var g = 2.5, ix = L + (w ? g : 0), iy = T + (n ? g : 0), iw = 40 - (w ? g : 0) - (e ? g : 0), ih = 40 - (n ? g : 0) - (s ? g : 0);
    var ik = { tl: Math.max(0, k.tl - 1.5), tr: Math.max(0, k.tr - 1.5), br: Math.max(0, k.br - 1.5), bl: Math.max(0, k.bl - 1.5) };
    shapePath(ctx, th.shape, ix, iy, iw, ih, ik); ctx.fillStyle = th.inner; ctx.fill(); ctx.clip();
    var hv = hash(c, r);
    if (!simple) {
      if (key === 'forest') {
        ctx.fillStyle = th.chip; circle(ctx, L + 12 + hv * 14, T + 24 + hv * 6, 6 + hv * 3); ctx.fill();
        ctx.fillStyle = th.chipHi; circle(ctx, L + 10 + hv * 14, T + 22 + hv * 6, 2); ctx.fill();
        ctx.fillStyle = th.chip; circle(ctx, L + 32 - hv * 6, T + 12 + hv * 10, 3.5); ctx.fill();
        if (!n && s) { for (i = 0; i < 3; i++) { ell(ctx, L + 8 + i * 12, T + 38, 4, 5); ctx.fill(); } }
      } else if (key === 'cliff') {
        for (var yy = Math.floor(T / 13) * 13; yy < T + 40; yy += 13) {
          var band = ((Math.floor(yy / 13) % 3) + 3) % 3;
          ctx.fillStyle = band === 0 ? th.inner : (band === 1 ? th.band2 : th.band3);
          ctx.beginPath(); ctx.moveTo(L, yy);
          for (var zx = 0; zx <= 40; zx += 8) ctx.lineTo(L + zx, yy + ((Math.floor((L + zx) / 8)) % 2 ? 2.5 : 0));
          ctx.lineTo(L + 40, yy + 13); ctx.lineTo(L, yy + 13); ctx.closePath(); ctx.fill();
        }
      } else if (key === 'mine') {
        ctx.fillStyle = th.chip;
        poly(ctx, [L + 4, T + 30, L + 12, T + 18, L + 22, T + 30]); ctx.fill();
        poly(ctx, [L + 24, T + 8, L + 36, T + 8, L + 36, T + 20, L + 26, T + 18]); ctx.fill();
        ctx.fillStyle = th.chipHi; ctx.fillRect(L + 24, T + 8, 12, 2);
        if (hv > 0.86 && !n) { ctx.fillStyle = '#6f7de8'; poly(ctx, [L + 14, T + 36, L + 18, T + 18, L + 22, T + 36]); ctx.fill(); ctx.fillStyle = '#9aa4ff'; poly(ctx, [L + 22, T + 36, L + 27, T + 24, L + 30, T + 36]); ctx.fill(); }
        ctx.fillStyle = th.timber;
        if (w && !n) ctx.fillRect(ix, T, 7, 40);
        if (e && !n) ctx.fillRect(ix + iw - 7, T, 7, 40);
        if (s) { ctx.fillRect(L, iy + ih - 9, 40, 9); ctx.fillStyle = th.timberDark; ctx.fillRect(L, iy + ih - 2, 40, 2); ctx.fillRect(L + ((c % 2) ? 30 : 8), iy + ih - 9, 2, 9); }
      } else if (key === 'salt') {
        ctx.strokeStyle = th.mark; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(L + 4, T + 24); ctx.lineTo(L + 12, T + 18); ctx.lineTo(L + 24, T + 20); ctx.lineTo(L + 30, T + 30); ctx.lineTo(L + 22, T + 38);
        ctx.moveTo(L + 24, T + 20); ctx.lineTo(L + 34, T + 14); ctx.stroke();
      } else { // lair
        ctx.fillStyle = th.chip; circle(ctx, L + 10 + hv * 18, T + 26, 7); ctx.fill();
        if (hv > 0.6) { ctx.strokeStyle = 'rgba(194,100,255,0.55)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(L + 4, T + 12 + hv * 10); ctx.lineTo(L + 18, T + 20); ctx.lineTo(L + 30, T + 14 + hv * 12); ctx.stroke(); }
      }
    }
    if (n) {
      if (th.shape === 'round') {
        ctx.fillStyle = th.cap; ctx.fillRect(L, T, 40, simple ? 14 : 10);
        if (!simple) { for (i = 0; i < 5; i++) { circle(ctx, L + 4 + i * 8, T + 10, 4); ctx.fill(); } ctx.fillStyle = th.capHi; ctx.fillRect(L, T + g, 40, 2.5); ctx.fillStyle = th.capDark; for (i = 0; i < 5; i++) { circle(ctx, L + 4 + i * 8, T + 13, 1.2); ctx.fill(); } }
      } else if (th.shape === 'chamfer') {
        ctx.fillStyle = th.cap;
        if (simple) ctx.fillRect(L, T, 40, 14);
        else { ctx.beginPath(); ctx.moveTo(L, T); ctx.lineTo(L + 40, T); for (i = 5; i >= 0; i--) ctx.lineTo(L + i * 8, T + ((i % 2) ? 13 : 8)); ctx.closePath(); ctx.fill(); ctx.fillStyle = th.capHi; ctx.fillRect(L, T + g, 40, 2); }
      } else if (th.shape === 'square') {
        ctx.fillStyle = th.cap; ctx.fillRect(L, T, 40, simple ? 14 : 9);
        if (!simple) { ctx.fillStyle = th.capHi; ctx.fillRect(L, T + g, 40, 2); ctx.fillStyle = th.capDark; if (c % 2 === 0) ctx.fillRect(L + 38.5, T, 1.5, 9); ctx.fillRect(L, T + 9, 40, 1.5); }
      } else if (th.shape === 'salt') {
        ctx.fillStyle = th.cap; ctx.fillRect(L, T, 40, simple ? 14 : 10);
        if (!simple) { ctx.fillStyle = th.capHi; ctx.fillRect(L, T + g, 40, 2); ctx.fillStyle = th.capDark; ctx.fillRect(L, T + 10, 40, 3); }
      } else {
        ctx.fillStyle = th.cap; ctx.fillRect(L, T, 40, simple ? 14 : 8);
        if (!simple) { ctx.fillStyle = th.capHi; ctx.fillRect(L, T + g, 40, 1.5); ctx.fillStyle = 'rgba(194,100,255,0.8)'; circle(ctx, L + 8 + hv * 24, T + 6, 1.4); ctx.fill(); }
      }
    }
    ctx.restore();
  }

  function drawLairBack(ctx, st) {
    st = obj(st);
    var x = num(st.x, 0), y = num(st.y, 0), w = clamp(num(st.w, 40), 0, 1280), h = clamp(num(st.h, 40), 0, 720), lt = oneOf(st.lairTheme, ['forest', 'cliff', 'mine'], 'forest');
    if (w <= 0 || h <= 0) return;
    var simple = scaleOf(ctx).rel < SIL, i, n;
    ctx.save();
    ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    ctx.fillStyle = rad(ctx, x + w / 2, y + h * 0.6, 10, Math.max(w, h) * 0.75, [0, '#3a1f4a', 1, '#140a1c']); ctx.fillRect(x, y, w, h);
    if (!simple) {
      n = Math.min(40, Math.ceil(w / 60) + 1);
      for (i = 0; i < n; i++) {
        var bx = x + i * 60 + hash(i, 2) * 20;
        if (lt === 'forest') { ctx.fillStyle = 'rgba(70,40,30,0.6)'; ell(ctx, bx, y + 6, 26, 16 + hash(i, 3) * 10); ctx.fill(); ctx.strokeStyle = 'rgba(90,60,40,0.7)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(bx, y); ctx.quadraticCurveTo(bx + 8, y + 30, bx - 4, y + 40 + hash(i, 4) * 30); ctx.stroke(); }
        else if (lt === 'cliff') { ctx.fillStyle = 'rgba(70,74,100,0.6)'; poly(ctx, [bx - 22, y, bx + 22, y, bx + 6, y + 26 + hash(i, 3) * 18, bx - 4, y + 18]); ctx.fill(); }
        else { ctx.fillStyle = 'rgba(80,56,36,0.7)'; ctx.fillRect(bx - 4, y, 8, h); ctx.fillRect(bx - 20, y + 8, 40, 7); }
      }
      // 巢穴記號: 牆上發光紫紋 + 卵囊
      ctx.strokeStyle = 'rgba(194,100,255,0.55)'; ctx.lineWidth = 2; ctx.lineCap = 'round';
      for (i = 0; i < n; i++) {
        var vx = x + 30 + i * 60, vy = y + h * (0.3 + hash(i, 6) * 0.4);
        ctx.beginPath(); ctx.moveTo(vx - 14, vy); ctx.lineTo(vx - 4, vy - 8); ctx.lineTo(vx + 6, vy + 2); ctx.lineTo(vx + 16, vy - 6); ctx.stroke();
        if (hash(i, 7) > 0.5) { ell(ctx, vx, y + h - 10, 7, 9); ctx.fillStyle = 'rgba(120,60,150,0.7)'; ctx.fill(); ell(ctx, vx - 2, y + h - 13, 2, 3); ctx.fillStyle = 'rgba(220,170,255,0.6)'; ctx.fill(); }
      }
    } else { ctx.fillStyle = 'rgba(194,100,255,0.25)'; ctx.fillRect(x, y, w, h); }
    ctx.restore();
  }

  function drawSpike(ctx, st) {
    st = obj(st);
    var x = num(st.x, 0), y = num(st.y, 0), key = oneOf(st.theme, THEME_KEYS, 'forest'), simple = scaleOf(ctx).rel < SIL, i;
    ctx.save();
    ctx.beginPath(); ctx.rect(x - 20, y, 40, 20); ctx.clip();
    if (simple) { poly(ctx, [x - 20, y + 20, x - 13, y, x - 7, y + 20, x, y, x + 7, y + 20, x + 13, y, x + 20, y + 20]); ctx.fillStyle = PAL.spikeTip; ctx.fill(); ctx.restore(); return; }
    ctx.lineJoin = 'round';
    if (key === 'forest' || key === 'lair') { // 荊棘: 彎刺藤 + 紅尖
      ctx.strokeStyle = '#4a3a1e'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x - 20, y + 17); ctx.bezierCurveTo(x - 8, y + 10, x + 6, y + 22, x + 20, y + 15); ctx.stroke();
      for (i = 0; i < 4; i++) { var cx = x - 15 + i * 10; poly(ctx, [cx - 4, y + 17, cx + 1, y + 1, cx + 4, y + 16]); ctx.fillStyle = '#6a5a2a'; ctx.fill(); ctx.lineWidth = 1.2; ctx.strokeStyle = '#1a1408'; ctx.stroke(); poly(ctx, [cx - 0.8, y + 6, cx + 1, y + 1, cx + 2, y + 6]); ctx.fillStyle = PAL.spikeTip; ctx.fill(); }
    } else if (key === 'cliff' || key === 'salt') { // 岩刺
      ctx.fillStyle = '#3b3f4a'; ctx.fillRect(x - 20, y + 16, 40, 4);
      for (i = 0; i < 3; i++) { var sx = x - 13.3 + i * 13.3; poly(ctx, [sx - 6.5, y + 17, sx - 1, y + 1, sx + 6.5, y + 17]); ctx.fillStyle = key === 'salt' ? '#e6d4e0' : '#aeb7c6'; ctx.fill(); ctx.lineWidth = 1.4; ctx.strokeStyle = '#1a1c22'; ctx.stroke(); poly(ctx, [sx - 3, y + 7, sx - 1, y + 1, sx + 1.6, y + 7]); ctx.fillStyle = PAL.spikeTip; ctx.fill(); }
    } else { // 鐵釘板
      ctx.fillStyle = '#5a3e24'; ctx.fillRect(x - 20, y + 14, 40, 6); ctx.fillStyle = '#3e2a17'; ctx.fillRect(x - 20, y + 18, 40, 2);
      for (i = 0; i < 4; i++) { var nx = x - 15 + i * 10; poly(ctx, [nx - 3, y + 15, nx, y + 1, nx + 3, y + 15]); ctx.fillStyle = '#c9cfd8'; ctx.fill(); ctx.lineWidth = 1.2; ctx.strokeStyle = '#1a1c22'; ctx.stroke(); poly(ctx, [nx - 1.2, y + 6, nx, y + 1, nx + 1.2, y + 6]); ctx.fillStyle = PAL.spikeTip; ctx.fill(); }
    }
    ctx.restore();
  }

  function drawCrackWall(ctx, st) {
    st = obj(st);
    var x = num(st.x, 0), y = num(st.y, 0), hp = clamp(Math.round(num(st.hp, 3)), 1, 3), L = x - 20, T = y - 20, edgeC = themeOf(st.theme).line;
    ctx.save();
    ctx.beginPath(); ctx.rect(L, T, 40, 40); ctx.clip();
    ctx.fillStyle = PAL.crack; ctx.fillRect(L, T, 40, 40);
    if (scaleOf(ctx).rel < SIL) { ctx.strokeStyle = PAL.crackLine; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(L + 8, T + 6); ctx.lineTo(L + 22, T + 22); ctx.lineTo(L + 32, T + 36); ctx.stroke(); ctx.restore(); return; }
    // 暖色平板磚(打得破的牆), 橫向磚縫
    ctx.fillStyle = '#e0b88e'; ctx.fillRect(L, T, 40, 3);
    ctx.strokeStyle = 'rgba(90,58,34,0.55)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(L, T + 14); ctx.lineTo(L + 40, T + 14); ctx.moveTo(L, T + 27); ctx.lineTo(L + 40, T + 27);
    ctx.moveTo(L + 20, T); ctx.lineTo(L + 20, T + 14); ctx.moveTo(L + 10, T + 14); ctx.lineTo(L + 10, T + 27); ctx.moveTo(L + 30, T + 14); ctx.lineTo(L + 30, T + 27); ctx.moveTo(L + 20, T + 27); ctx.lineTo(L + 20, T + 40); ctx.stroke();
    ctx.strokeStyle = PAL.crackLine; ctx.lineWidth = 2.4; ctx.lineJoin = 'miter';
    ctx.beginPath(); ctx.moveTo(L + 18, T + 2); ctx.lineTo(L + 22, T + 12); ctx.lineTo(L + 17, T + 20); ctx.lineTo(L + 23, T + 30); ctx.stroke();
    if (hp <= 2) { ctx.beginPath(); ctx.moveTo(L + 22, T + 12); ctx.lineTo(L + 33, T + 9); ctx.moveTo(L + 17, T + 20); ctx.lineTo(L + 6, T + 25); ctx.lineTo(L + 3, T + 34); ctx.moveTo(L + 23, T + 30); ctx.lineTo(L + 31, T + 38); ctx.stroke(); }
    if (hp <= 1) {
      ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(L + 33, T + 9); ctx.lineTo(L + 38, T + 20); ctx.moveTo(L + 6, T + 25); ctx.lineTo(L + 2, T + 14); ctx.moveTo(L + 23, T + 30); ctx.lineTo(L + 12, T + 38); ctx.stroke();
      ctx.fillStyle = 'rgba(26,20,30,0.85)'; poly(ctx, [L, T, L + 8, T, L, T + 7]); ctx.fill(); poly(ctx, [L + 40, T + 40, L + 31, T + 40, L + 40, T + 31]); ctx.fill();
    }
    ctx.lineWidth = 2; ctx.strokeStyle = edgeC; ctx.strokeRect(L + 1, T + 1, 38, 38);
    ctx.restore();
  }

  // ---------- 工程結構 ----------
  var ROCKS = [[10, 10, 9], [29, 9, 9], [20, 22, 10], [8, 31, 8], [31, 31, 9]];
  function rubbleCell(ctx, L, T, simple, key) {
    ctx.fillStyle = '#2b313b'; ctx.fillRect(L, T, 40, 40);
    if (simple) { ctx.fillStyle = PAL.rubble; ctx.fillRect(L + 2, T + 2, 36, 36); return; }
    for (var i = 0; i < ROCKS.length; i++) {
      var r = ROCKS[i];
      circle(ctx, L + r[0], T + r[1], r[2]); ctx.fillStyle = PAL.rubble; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#151920'; ctx.stroke();
      ctx.beginPath(); ctx.arc(L + r[0], T + r[1], r[2] - 3, Math.PI * 1.1, Math.PI * 1.6); ctx.strokeStyle = PAL.rubbleLight; ctx.stroke();
    }
    if (key === 'forest') { ctx.strokeStyle = '#7a5130'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(L, T + 6); ctx.bezierCurveTo(L + 14, T + 18, L + 22, T + 4, L + 40, T + 20); ctx.stroke(); ctx.fillStyle = '#5cbf45'; circle(ctx, L + 12, T + 4, 4); ctx.fill(); }
    else if (key === 'mine') { ctx.fillStyle = '#6b4a2b'; ctx.fillRect(L + 2, T + 2, 36, 6); ctx.strokeStyle = '#2a1a0c'; ctx.lineWidth = 1.5; ctx.strokeRect(L + 2, T + 2, 36, 6); }
  }
  function blueprint(ctx, L, T, role, simple) {
    var col = PAL[role === 'nest' ? 'nestRole' : role];
    ctx.save();
    ctx.globalAlpha *= 0.14; ctx.fillStyle = col; ctx.fillRect(L + 2, T + 2, 36, 36); ctx.globalAlpha /= 0.14;
    if (!simple) { ctx.globalAlpha *= 0.6; ctx.setLineDash([6, 4]); ctx.lineWidth = 2; ctx.strokeStyle = col; ctx.strokeRect(L + 3, T + 3, 34, 34); }
    ctx.restore();
  }
  function bridgeCell(ctx, L, T, key, simple) {
    ctx.fillStyle = PAL.plank; ctx.fillRect(L, T, 40, 40);
    if (simple) return;
    ctx.strokeStyle = PAL.plankDark; ctx.lineWidth = 2;
    ctx.beginPath(); for (var i = 1; i < 4; i++) { ctx.moveTo(L, T + i * 10); ctx.lineTo(L + 40, T + i * 10); } ctx.stroke();
    ctx.fillStyle = '#3a2a1a'; for (i = 0; i < 4; i++) { circle(ctx, L + 6, T + 5 + i * 10, 1.4); ctx.fill(); circle(ctx, L + 34, T + 5 + i * 10, 1.4); ctx.fill(); }
    ctx.fillStyle = '#f0c27a'; ctx.fillRect(L, T, 40, 2.5);
    if (key === 'mine') { ctx.fillStyle = '#9aa2ae'; ctx.fillRect(L, T, 40, 3); ctx.fillStyle = '#3a3f4c'; ctx.fillRect(L, T + 3, 40, 1.5); }
  }
  function stairCell(ctx, L, T, th, simple) {
    ctx.fillStyle = PAL.stair; ctx.fillRect(L, T, 40, 40);
    if (simple) return;
    ctx.strokeStyle = '#857a66'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(L, T + 20); ctx.lineTo(L + 40, T + 20); ctx.moveTo(L + 20, T); ctx.lineTo(L + 20, T + 20); ctx.moveTo(L + 10, T + 20); ctx.lineTo(L + 10, T + 40); ctx.moveTo(L + 30, T + 20); ctx.lineTo(L + 30, T + 40); ctx.stroke();
    ctx.strokeRect(L + 0.75, T + 0.75, 38.5, 38.5);
    ctx.fillStyle = th.cap; ctx.fillRect(L, T, 40, 4);
  }
  function drawWorksite(ctx, st) {
    st = obj(st);
    var x = num(st.x, 0), y = num(st.y, 0), kind = oneOf(st.kind, ['bridge', 'stairs', 'rubble'], 'rubble');
    var role = oneOf(st.role, ROLES, 'shortcut'), key = oneOf(st.theme, THEME_KEYS, 'forest'), th = THEMES[key];
    var rep = st.repaired === true, L = x - 20, T = y - 20, simple = scaleOf(ctx).rel < SIL;
    var bDur = Math.max(0.01, num(st.buildDur, 0.6)), bT = clamp(num(st.buildT, bDur), 0, bDur), order = clamp(num(st.order, 0), 0, 1);
    var start = order * 0.7 * bDur, cd = Math.max(0.05, Math.min(0.3, bDur - start));
    var building = rep && bT < bDur, q = building ? clamp((bT - start) / cd, 0, 1) : 1;
    var showRepaired = rep && (!building || bT >= start);
    ctx.save();
    if (!building) { ctx.beginPath(); ctx.rect(L, T, 40, 40); ctx.clip(); }
    if (!showRepaired) {
      if (kind === 'rubble') rubbleCell(ctx, L, T, simple, key);
      else {
        ctx.save(); ctx.beginPath(); ctx.rect(L, T, 40, 40); ctx.clip();
        if (kind === 'bridge' && st.end === true) {
          ctx.fillStyle = PAL.plankDark; poly(ctx, [L + 14, T + 40, L + 14, T + 6, L + 18, T + 2, L + 21, T + 8, L + 26, T + 3, L + 26, T + 40]); ctx.fill();
          ctx.lineWidth = 1.5; ctx.strokeStyle = '#2a1a0c'; ctx.stroke();
          ctx.fillStyle = PAL.plank; poly(ctx, [L + 4, T + 2, L + 36, T + 2, L + 33, T + 8, L + 30, T + 5, L + 26, T + 10, L + 4, T + 10]); ctx.fill(); ctx.stroke();
        } else if (kind === 'stairs' && st.bottom === true) {
          var bits = [[8, 35, 5], [17, 33, 6], [27, 35, 5], [34, 36, 4], [22, 27, 4], [12, 28, 3.5]];
          for (var j = 0; j < bits.length; j++) { var b = bits[j]; poly(ctx, [L + b[0] - b[2], T + b[1] + b[2] * 0.6, L + b[0] - b[2] * 0.4, T + b[1] - b[2], L + b[0] + b[2], T + b[1] - b[2] * 0.3, L + b[0] + b[2] * 0.7, T + b[1] + b[2] * 0.7]); ctx.fillStyle = j % 2 ? '#a69c8a' : PAL.stair; ctx.fill(); ctx.lineWidth = 1.2; ctx.strokeStyle = '#3a342a'; ctx.stroke(); }
        }
        blueprint(ctx, L, T, role, simple);
        ctx.restore();
      }
    } else if (kind === 'rubble') {
      if (building && q < 1) { // 亂石炸開: 碎片飛出(框外至多 24px)
        ctx.save(); ctx.globalAlpha *= 1 - q;
        for (var i = 0; i < ROCKS.length; i++) {
          var rk = ROCKS[i], dx = (rk[0] - 20) / 20, dy = (rk[1] - 20) / 20 - 0.5;
          var px = L + rk[0] + dx * 24 * eOut(q), py = T + rk[1] + dy * 24 * eOut(q);
          circle(ctx, clamp(px, L - 24 + rk[2], L + 64 - rk[2]), clamp(py, T - 24 + rk[2], T + 64 - rk[2]), rk[2] * (1 - 0.5 * q)); ctx.fillStyle = PAL.rubble; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#151920'; ctx.stroke();
        }
        ctx.restore();
      }
    } else {
      if (building && q < 1) {
        ctx.save();
        if (kind === 'stairs') { ctx.globalAlpha *= Math.min(1, q * 2.5); ctx.translate(0, -40 * (1 - q) * (1 - q)); stairCell(ctx, L, T, th, simple); }
        else { ctx.translate(x, T); ctx.scale(1, 0.2 + 0.8 * q); ctx.translate(-x, -T); ctx.globalAlpha *= Math.min(1, q * 2); bridgeCell(ctx, L, T, key, simple); }
        ctx.restore();
      } else if (kind === 'stairs') stairCell(ctx, L, T, th, simple);
      else bridgeCell(ctx, L, T, key, simple);
    }
    ctx.restore();
  }

  function drawNestGate(ctx, st) {
    st = obj(st);
    var x = num(st.x, 0), y = num(st.y, 0), open = st.open === true, lt = oneOf(st.lairTheme, ['forest', 'cliff', 'mine'], 'forest');
    var bDur = Math.max(0.01, num(st.buildDur, 0.6)), bT = clamp(num(st.buildT, bDur), 0, bDur), q = open ? bT / bDur : 1;
    var L = x - 40, T = y - 40, simple = scaleOf(ctx).rel < SIL;
    var fc = lt === 'forest' ? '#5a4030' : (lt === 'cliff' ? '#5d6680' : '#6b4a2b'), fl = lt === 'forest' ? '#2a1a0e' : (lt === 'cliff' ? '#262b3a' : '#2a1a0c');
    ctx.save();
    ctx.beginPath(); ctx.rect(L, T, 80, 80); ctx.clip();
    // 門內(看得出門後是魔物巢)
    ctx.fillStyle = open ? 'rgba(60,24,80,0.55)' : '#1c0f24'; ctx.fillRect(L + 8, T + 8, 64, 72);
    if (open && !simple) { ctx.fillStyle = rad(ctx, x, y + 20, 4, 50, [0, 'rgba(194,100,255,0.35)', 1, 'rgba(194,100,255,0)']); ctx.fillRect(L + 8, T + 8, 64, 72); }
    if (!open || q < 1) { // 封印石板(施工中往下沉)
      var dy = open ? q * q * 72 : 0;
      ctx.save(); ctx.beginPath(); ctx.rect(L + 8, T + 8, 64, 72); ctx.clip();
      ctx.translate(0, dy);
      ctx.fillStyle = '#5d5670'; ctx.fillRect(L + 8, T + 8, 64, 72);
      if (!simple) {
        ctx.strokeStyle = '#2a2436'; ctx.lineWidth = 2; ctx.strokeRect(L + 9, T + 9, 62, 70);
        ctx.beginPath(); ctx.moveTo(x, T + 9); ctx.lineTo(x, T + 79); ctx.stroke();
        ctx.globalAlpha *= open ? 1 - q : 1;
        ctx.strokeStyle = PAL.brood; ctx.lineWidth = 3.5; ctx.lineCap = 'round'; ctx.shadowColor = PAL.brood; ctx.shadowBlur = 8;
        for (var i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(L + 22 + i * 12, T + 24); ctx.lineTo(L + 30 + i * 12, T + 58); ctx.stroke(); }
        ctx.shadowBlur = 0;
        ctx.strokeStyle = '#cfc8dc'; ctx.lineWidth = 3; circle(ctx, x, T + 68, 6); ctx.stroke();
      } else { ctx.fillStyle = PAL.brood; ctx.fillRect(L + 26, T + 26, 28, 30); }
      ctx.restore();
    }
    // 門框(材質呼應主題)
    ctx.fillStyle = fc; ctx.fillRect(L, T, 8, 80); ctx.fillRect(L + 72, T, 8, 80); ctx.fillRect(L, T, 80, 8);
    if (!simple) {
      ctx.lineWidth = 2; ctx.strokeStyle = fl; ctx.strokeRect(L + 1, T + 1, 6, 78); ctx.strokeRect(L + 73, T + 1, 6, 78); ctx.strokeRect(L + 1, T + 1, 78, 6);
      if (lt === 'forest') { ctx.fillStyle = '#5cbf45'; for (var m = 0; m < 4; m++) { circle(ctx, L + 10 + m * 20, T + 2, 4); ctx.fill(); } }
      if (lt === 'cliff') { ctx.fillStyle = '#e8eef5'; ctx.fillRect(L, T, 80, 3); }
    }
    circle(ctx, x, T + 4, 4); ctx.fillStyle = PAL.brood; ctx.fill();
    if (!open && !simple) { // 施工藍圖: 沿門框內側 nest 色虛線
      ctx.save(); ctx.globalAlpha *= 0.65; ctx.setLineDash([6, 4]); ctx.lineWidth = 2; ctx.strokeStyle = PAL.nestRole; ctx.strokeRect(L + 10, T + 10, 60, 68); ctx.restore();
    }
    ctx.restore();
  }

  // 工程牌: 36×48, 底邊貼地; 頂端圓釘寫號碼(0.5 倍預覽下號碼至少 10px)
  function drawSiteSign(ctx, st) {
    st = obj(st);
    var x = num(st.x, 0), y = num(st.y, 0), role = oneOf(st.role, ROLES, 'shortcut'), nn = Math.round(clamp(num(st.num, 1), 0, 9));
    var sc = scaleOf(ctx).rel, col = PAL[role === 'nest' ? 'nestRole' : role];
    ctx.save();
    ctx.fillStyle = '#7a5530'; ctx.fillRect(x - 2.5, y + 10, 5, 14);
    rr(ctx, x - 17, y - 10, 34, 22, 3); ctx.fillStyle = col; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = '#1a1408'; ctx.stroke();
    rr(ctx, x - 13, y - 6, 26, 14, 2); ctx.fillStyle = '#20242e'; ctx.fill();
    ctx.save(); ctx.translate(x, y + 1); ctx.scale(0.8, 0.8); roleGlyph(ctx, role, col); ctx.restore();
    if (sc >= SIL) {
      var px = Math.max(12, 10 / Math.max(0.05, sc)), r = Math.max(8, px * 0.72);
      sitePin(ctx, nn, x, y - 24 + Math.min(r, 12), r, px, false);
    }
    ctx.restore();
  }

  // ---------- 迷霧 ----------
  function drawFog(ctx, st) {
    st = obj(st);
    var x = num(st.x, 0), y = num(st.y, 0), w = clamp(num(st.w, 80), 0, 1280), h = clamp(num(st.h, 80), 0, 720);
    var t = num(st.t, 0), key = oneOf(st.theme, THEME_KEYS, 'forest'), th = THEMES[key];
    var p = clamp(num(st.clearP, 0), 0, 1), ox = num(st.ox, x + w / 2), oy = num(st.oy, y + h / 2), maxR = clamp(num(st.maxR, Math.hypot(w, h)), 0, 4000);
    if (w <= 0 || h <= 0 || p >= 1) return;
    var R = p * maxR, simple = scaleOf(ctx).rel < SIL;
    ctx.save();
    ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    if (R > 0.5) { ctx.beginPath(); ctx.rect(-4000, -4000, 8000, 8000); ctx.moveTo(ox + R, oy); ctx.arc(ox, oy, R, 0, TAU, true); ctx.clip('evenodd'); }
    ctx.fillStyle = th.fog; ctx.fillRect(x, y, w, h);
    if (!simple) {
      for (var gx = Math.floor(x / 80) - 1; gx <= Math.ceil((x + w) / 80) + 1; gx++) {
        for (var gy = Math.floor(y / 40) - 1; gy <= Math.ceil((y + h) / 40) + 1; gy++) {
          var hv = hash(gx, gy), cx = gx * 80 + 40 + Math.sin(t * 0.35 + hv * 6.28) * 16, cy = gy * 40 + 20;
          ctx.fillStyle = (gx + gy) % 2 ? th.fogA : th.fogB;
          if (th.shape === 'round' || th.shape === 'lair') { circle(ctx, cx, cy, 26 + hv * 12); ctx.fill(); }
          else if (th.shape === 'chamfer') { poly(ctx, [cx - 70 - hv * 20, cy, cx - 20, cy - 12 - hv * 4, cx + 70 + hv * 20, cy - 2, cx + 30, cy + 10 + hv * 4]); ctx.fill(); }
          else { rr(ctx, cx - 26, cy - 16, 52 + hv * 10, 30, key === 'mine' ? 2 : 6); ctx.fill(); }
        }
      }
    } else { ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.fillRect(x, y, w, h); }
    ctx.restore();
    if (R > 0.5) { // 推開的邊: 圓外一圈亮霧(寬 16, 畫在矩形內)
      ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
      ctx.globalAlpha *= 0.85 * (1 - p);
      circle(ctx, ox, oy, R + 8); ctx.lineWidth = 16; ctx.strokeStyle = 'rgba(240,242,248,0.9)'; ctx.stroke();
      circle(ctx, ox, oy, R + 1); ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(255,238,180,1)'; ctx.stroke();
      ctx.restore();
    }
  }

  // ---------- 預備動作的世界投影(紅色系) ----------
  function dangerA(p, t, base) { var pulse = 0.5 + 0.5 * Math.sin(t * (6 + 14 * p)); return clamp((base || 0.35) + 0.65 * p - 0.15 * pulse, 0.15, 1); }
  function stripes(ctx, x, y, w, h, off) {
    if (w <= 0 || h <= 0) return;
    ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    ctx.fillStyle = 'rgba(255,60,50,0.18)'; ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = 'rgba(255,60,50,0.42)'; ctx.lineWidth = 3;
    var o = ((off || 0) % 9 + 9) % 9;
    ctx.beginPath();
    for (var i = -h - 9 + o; i < w + h; i += 9) { ctx.moveTo(x + i, y + h); ctx.lineTo(x + i + h, y); }
    ctx.stroke(); ctx.restore();
  }
  function reticle(ctx, x, y, r) {
    ctx.lineWidth = 1.6; ctx.strokeStyle = 'rgba(255,70,50,0.95)'; circle(ctx, x, y, r * 0.65); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x - r, y); ctx.lineTo(x - r * 0.35, y); ctx.moveTo(x + r * 0.35, y); ctx.lineTo(x + r, y);
    ctx.moveTo(x, y - r); ctx.lineTo(x, y - r * 0.35); ctx.moveTo(x, y + r * 0.35); ctx.lineTo(x, y + r); ctx.stroke();
  }
  function arrowHead(ctx, x, y, ang, s) { ctx.save(); ctx.translate(x, y); ctx.rotate(ang); poly(ctx, [0, 0, -s, -s * 0.55, -s, s * 0.55]); ctx.fillStyle = 'rgba(255,90,70,0.95)'; ctx.fill(); ctx.restore(); }
  var TELE = ['lane', 'aim', 'dive', 'column', 'ring', 'blast', 'sweep', 'arc', 'crack', 'path'];
  function drawTelegraph(ctx, st) {
    st = obj(st);
    var kind = oneOf(st.kind, TELE, 'ring'), x = num(st.x, 0), y = num(st.y, 0), x2 = num(st.x2, x), y2 = num(st.y2, y);
    var w = clamp(num(st.w, 40), 0, 1400), h = clamp(num(st.h, 40), 0, 800), r = clamp(num(st.r, 40), 0, 800), p = clamp(num(st.p, 0), 0, 1), t = num(st.t, 0);
    var a = dangerA(p, t), i;
    ctx.save(); ctx.globalAlpha *= a; ctx.lineCap = 'round';
    if (kind === 'lane') {
      var lx = Math.min(x, x2), lw = Math.abs(x2 - x), dir = x2 >= x ? 1 : -1;
      stripes(ctx, lx, y - 24, lw, 24, -t * 30 * dir);
      ctx.save(); ctx.setLineDash([5, 4]); ctx.strokeStyle = 'rgba(255,90,70,0.85)'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(lx, y - 24); ctx.lineTo(lx + lw, y - 24); ctx.stroke(); ctx.restore();
      ctx.fillStyle = 'rgba(255,110,90,0.9)';
      // 前進箭頭的尖端(ax + dir*7)不超過 x2(端點已由 RD 截在牆面 / 平台邊緣)
      for (i = 0; i < 3; i++) { var ax = x + dir * (18 + i * 14 + ((t * 40) % 14)); if ((ax - x) * dir > lw - 8) continue; poly(ctx, [ax, y - 18, ax + dir * 7, y - 12, ax, y - 6, ax + dir * 3, y - 12]); ctx.fill(); }
    } else if (kind === 'aim') {
      // 準星整顆收在端點以內: 準星外緣剛好碰到 (x2,y2), 線畫到準星為止
      var aL = Math.hypot(x2 - x, y2 - y), aR = Math.min(10, aL / 2), aux = aL > 0 ? (x2 - x) / aL : 0, auy = aL > 0 ? (y2 - y) / aL : 0;
      var rcx = x2 - aux * aR, rcy = y2 - auy * aR;
      ctx.save(); ctx.setLineDash([2, 5]); ctx.lineDashOffset = -t * 20; ctx.strokeStyle = 'rgba(255,70,50,0.9)'; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(rcx, rcy); ctx.stroke(); ctx.restore();
      if (aR > 1) reticle(ctx, rcx, rcy, aR);
    } else if (kind === 'dive') {
      // 終點十字整個收在端點以內(十字半對角 ≈ 12 往回退)
      var dL = Math.hypot(x2 - x, y2 - y), dR = Math.min(8.5, dL / 3), dB = dR * 1.42, dux = dL > 0 ? (x2 - x) / dL : 0, duy = dL > 0 ? (y2 - y) / dL : 0;
      var dcx = x2 - dux * dB, dcy = y2 - duy * dB;
      ctx.save(); ctx.setLineDash([7, 5]); ctx.lineDashOffset = -t * 30; ctx.strokeStyle = 'rgba(255,90,70,0.9)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(dcx, dcy); ctx.stroke(); ctx.restore();
      ctx.lineWidth = 2.5; ctx.strokeStyle = 'rgba(255,70,50,0.95)'; ctx.beginPath(); ctx.moveTo(dcx - dR, dcy - dR); ctx.lineTo(dcx + dR, dcy + dR); ctx.moveTo(dcx + dR, dcy - dR); ctx.lineTo(dcx - dR, dcy + dR); ctx.stroke();
    } else if (kind === 'column') {
      var top = Math.min(y, y2), bot = Math.max(y, y2);
      stripes(ctx, x - w / 2, top, w, Math.max(0, bot - top - w / 8), t * 20);
      ell(ctx, x, bot - w / 8, w / 2, w / 8); ctx.fillStyle = 'rgba(255,60,50,0.3)'; ctx.fill(); ctx.lineWidth = 1.6; ctx.strokeStyle = 'rgba(255,90,70,0.95)'; ctx.stroke();
    } else if (kind === 'ring') {
      ell(ctx, x, y - w / 8, w / 2, w / 8); ctx.fillStyle = 'rgba(255,60,50,0.3)'; ctx.fill();
      ctx.save(); ctx.setLineDash([6, 4]); ctx.lineDashOffset = -t * 20; ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(255,90,70,0.95)'; ell(ctx, x, y - w / 8, w / 2 - 1, w / 8 - 1); ctx.stroke(); ctx.restore();
    } else if (kind === 'blast') {
      circle(ctx, x, y, r); ctx.fillStyle = 'rgba(255,70,40,0.14)'; ctx.fill();
      ctx.save(); ctx.setLineDash([6, 4]); ctx.lineDashOffset = -t * 24; ctx.strokeStyle = 'rgba(255,90,60,0.9)'; ctx.lineWidth = 2; circle(ctx, x, y, Math.max(0, r - 1)); ctx.stroke(); ctx.restore();
      circle(ctx, x, y, r * 0.62); ctx.strokeStyle = 'rgba(255,200,80,0.6)'; ctx.lineWidth = 1.2; ctx.stroke();
    } else if (kind === 'sweep') {
      stripes(ctx, x, y, w, h, t * 30);
      ctx.save(); ctx.setLineDash([5, 4]); ctx.strokeStyle = 'rgba(255,90,70,0.85)'; ctx.lineWidth = 1.4; ctx.strokeRect(x + 0.7, y + 0.7, Math.max(0, w - 1.4), Math.max(0, h - 1.4)); ctx.restore();
    } else if (kind === 'arc') {
      var pts = arr(st.pts).slice(0, 40), ok = [];
      for (i = 0; i < pts.length; i++) { var pp = arr(pts[i]); if (pp.length >= 2 && isFinite(Number(pp[0])) && isFinite(Number(pp[1]))) ok.push([Number(pp[0]), Number(pp[1])]); }
      if (ok.length >= 2) {
        ctx.save(); ctx.setLineDash([5, 4]); ctx.lineDashOffset = -t * 24; ctx.strokeStyle = 'rgba(255,90,70,0.9)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(ok[0][0], ok[0][1]); for (i = 1; i < ok.length; i++) ctx.lineTo(ok[i][0], ok[i][1]); ctx.stroke(); ctx.restore();
        var n1 = ok[ok.length - 1], n0 = ok[ok.length - 2]; arrowHead(ctx, n1[0], n1[1], Math.atan2(n1[1] - n0[1], n1[0] - n0[0]), 9);
      }
    } else if (kind === 'crack') {
      ell(ctx, x, y + 2, w / 2, 4); ctx.fillStyle = 'rgba(255,60,50,0.3)'; ctx.fill();
      ctx.strokeStyle = 'rgba(60,20,20,0.95)'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(x - w / 2, y + 2); for (i = 1; i <= 6; i++) ctx.lineTo(x - w / 2 + w * i / 6, y + 2 + (i % 2 ? -3 : 3)); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,90,70,0.9)'; ctx.lineWidth = 1.2; ctx.stroke();
      for (i = 0; i < 3; i++) { var u = fr(t * 1.5 + i / 3); ctx.fillStyle = 'rgba(200,160,130,' + (0.6 * (1 - u)).toFixed(3) + ')'; circle(ctx, x + (i - 1) * w / 4, y - u * 22, 4 + u * 5); ctx.fill(); }
    } else { // path 光束路線
      var d = x2 >= x ? 1 : -1;
      ctx.save(); ctx.setLineDash([10, 6]); ctx.lineDashOffset = -t * 60 * d; ctx.strokeStyle = 'rgba(255,90,70,0.95)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x2 - d * 1.5, y); ctx.stroke(); ctx.restore(); // 圓頭線帽不超出端點
      arrowHead(ctx, x2, y, d > 0 ? 0 : Math.PI, 12);
      var span = Math.abs(x2 - x);
      for (i = 0; i < 5; i++) { var mx = x + d * fr(i / 5 + t * 0.5) * span; arrowHead(ctx, mx, y, d > 0 ? 0 : Math.PI, 8); }
      ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(255,70,50,0.95)'; reticle(ctx, x, y, 12);
    }
    ctx.restore();
  }

  // ================= 素材 / 寶箱 / 終點旗 =================
  function drawPickup(ctx, st) {
    st = obj(st);
    var x = num(st.x, 0), y = num(st.y, 0), kind = oneOf(st.kind, ['wood', 'stone', 'crystal'], 'wood'), t = num(st.t, 0);
    ctx.save();
    if (scaleOf(ctx).rel < SIL) { matIcon(ctx, kind, x, y, 22, true); ctx.restore(); return; }
    var bob = Math.sin(t * 3 + x * 0.05) * 1;
    matIcon(ctx, kind, x, y + bob, 18);
    var sp = (Math.sin(t * 4 + x) + 1) / 2;
    if (sp > 0.8) { star4(ctx, x + 7, y - 7, 2.6 * (sp - 0.8) * 5); ctx.fillStyle = 'rgba(255,255,255,0.95)'; ctx.fill(); }
    ctx.restore();
  }

  function drawDropBit(ctx, st) {
    st = obj(st);
    var x = num(st.x, 0), y = num(st.y, 0), kind = oneOf(st.kind, KINDS, 'wood'), dur = Math.max(0.01, num(st.dur, 1)), t = clamp(num(st.t, 0), 0, dur);
    var vx = num(st.vx, 0), vy = num(st.vy, 0), u = t / dur, S = 14;
    ctx.save(); ctx.translate(x, y);
    if (u < 0.4) { ctx.rotate(t * 14); matIcon(ctx, kind, 0, 0, S); }
    else if (u < 0.6) {
      var q = (u - 0.4) / 0.2, k = Math.sin(Math.PI * q);
      ctx.translate(0, S / 2); ctx.scale(1 + 0.2 * k, 1 - 0.3 * k); matIcon(ctx, kind, 0, -S / 2, S);
    } else {
      var sp = Math.hypot(vx, vy), ang = Math.atan2(vy, vx), tl = Math.min(16, sp * 0.03);
      if (tl > 1) {
        for (var i = 3; i >= 1; i--) { ctx.save(); ctx.globalAlpha *= 0.12 * (4 - i); ctx.translate(-Math.cos(ang) * tl * i / 3, -Math.sin(ang) * tl * i / 3); matIcon(ctx, kind, 0, 0, S * (1 - 0.12 * i), true); ctx.restore(); }
      }
      ctx.rotate(ang); ctx.scale(1.2, 0.85); ctx.rotate(-ang); matIcon(ctx, kind, 0, 0, S);
    }
    ctx.restore();
  }

  function drawChest(ctx, st) {
    st = obj(st);
    var x = num(st.x, 0), y = num(st.y, 0), open = st.open === true, simple = scaleOf(ctx).rel < SIL;
    ctx.save();
    ctx.lineJoin = 'round'; ctx.lineWidth = 1.8; ctx.strokeStyle = '#2a1608';
    if (!open) {
      if (!simple) { var gl = 0.5 + 0.5 * Math.sin(nowS() * 4); ell(ctx, x, y + 2, 19, 15); ctx.fillStyle = 'rgba(255,214,90,' + (0.12 + 0.12 * gl).toFixed(3) + ')'; ctx.fill(); }
      rr(ctx, x - 17, y - 2, 34, 19, 3); ctx.fillStyle = PAL.chest; ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x - 17, y - 2); ctx.quadraticCurveTo(x - 17, y - 14, x, y - 14); ctx.quadraticCurveTo(x + 17, y - 14, x + 17, y - 2); ctx.closePath();
      ctx.fillStyle = PAL.chestLid; ctx.fill(); ctx.stroke();
      ctx.fillStyle = PAL.gold; ctx.fillRect(x - 11, y - 12, 4, 29); ctx.fillRect(x + 7, y - 12, 4, 29);
      rr(ctx, x - 4, y - 5, 8, 8, 1.5); ctx.fillStyle = PAL.gold; ctx.fill(); ctx.stroke();
      if (!simple) { var tw2 = 0.6 + 0.4 * Math.sin(nowS() * 5); star4(ctx, x + 14, y - 12, 3.5 * tw2 + 1); ctx.fillStyle = '#fff6c0'; ctx.fill(); }
    } else {
      rr(ctx, x - 16, y - 17, 32, 13, 2.5); ctx.fillStyle = '#4a3a2e'; ctx.fill(); ctx.stroke();
      rr(ctx, x - 17, y - 2, 34, 19, 3); ctx.fillStyle = '#6e5a48'; ctx.fill(); ctx.stroke();
      ell(ctx, x, y - 2, 15, 3.5); ctx.fillStyle = '#1c140e'; ctx.fill();
      ctx.fillStyle = '#8c7a5a'; ctx.fillRect(x - 11, y, 4, 17); ctx.fillRect(x + 7, y, 4, 17);
    }
    ctx.restore();
  }

  function drawGoal(ctx, st) {
    st = obj(st);
    var x = num(st.x, 0), y = num(st.y, 0), reached = st.reached === true;
    var cDur = Math.max(0.01, num(st.cheerDur, 1.4)), cT = clamp(num(st.cheerT, cDur), 0, cDur), cheering = cT < cDur, cq = cT / cDur;
    var cs = cq * 1.4; // 換算到 1.4 秒時間軸(cheerDur 不是 1.4 時等比例)
    var simple = scaleOf(ctx).rel < SIL;
    ctx.save();
    rr(ctx, x - 18, y + 34, 14, 6, 2); ctx.fillStyle = '#555c6a'; ctx.fill();
    ctx.fillStyle = '#e6e9ef'; ctx.fillRect(x - 13, y - 36, 4, 70);
    circle(ctx, x - 11, y - 37, 2.5); ctx.fillStyle = PAL.gold; ctx.fill();
    var wv = simple ? 0 : (cheering ? Math.sin(cs * 18) * 7 : Math.sin(nowS() * 4) * 2);
    var lift = reached || cheering ? -3 : 3;
    ctx.beginPath(); ctx.moveTo(x - 9, y - 35 + lift); ctx.quadraticCurveTo(x + 4, y - 37 + wv + lift, x + 19, y - 31 + lift + wv * 0.5);
    ctx.quadraticCurveTo(x + 4, y - 25 - wv + lift, x - 9, y - 15 + lift); ctx.closePath();
    ctx.fillStyle = reached || cheering ? PAL.goalReached : PAL.goal; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = '#1a1408'; ctx.stroke();
    if (reached || cheering) { ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2.5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x - 3, y - 27 + lift); ctx.lineTo(x + 1, y - 23 + lift); ctx.lineTo(x + 8, y - 31 + lift); ctx.stroke(); }
    else { star(ctx, x + 1, y - 26 + lift, 5); ctx.fillStyle = '#e5484d'; ctx.fill(); }
    if (cheering && !simple && cs >= 0.72) { // 光圈回彈那一下(0.72 起)旗頂往上噴金星(框外至多 40px), 0.72~1.3 飛出淡掉
      var sq = seg(cs, 0.72, 1.3), ga = ctx.globalAlpha;
      for (var i = 0; i < 9; i++) {
        var a = -Math.PI / 2 + (i - 4) * 0.2, d = (22 + 14 * hash(i, 3)) * eOut(sq);
        ctx.globalAlpha = ga * (1 - sq); star4(ctx, x + 2 + Math.cos(a) * d, y - 40 + Math.sin(a) * d, 3.6 * (1 - sq) + 1);
        ctx.fillStyle = i % 2 ? PAL.select : '#fff6c0'; ctx.fill();
      }
      ctx.globalAlpha = ga;
    }
    ctx.restore();
  }

  function drawGoalPrompt(ctx, st) {
    st = obj(st);
    var x = num(st.x, 640), y = num(st.y, 360), t = num(st.t, 0);
    // maxR: 板子右緣上限(觸控模式由 game.js 傳入, 讓開右下 A 鈕); 板子被推開時尖角改從板子底邊最近處斜指旗子
    var bw = 200, bh = 48, bx = clamp(x - bw / 2, 8, Math.min(1272, num(st.maxR, 1272)) - bw), by = y - 8 - bh, cx = bx + bw / 2, cy = by + bh / 2;
    var tx = clamp(x, bx + 18, bx + bw - 18);
    ctx.save();
    poly(ctx, [tx - 9, by + bh - 1, tx + 9, by + bh - 1, x, y - 2]); ctx.fillStyle = K.parch; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = K.edge; ctx.stroke();
    rr(ctx, bx, by, bw, bh, 8); ctx.fillStyle = K.parch; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = K.edge; ctx.stroke();
    ctx.fillStyle = K.parch; ctx.fillRect(tx - 7.5, by + bh - 3, 15, 4);
    // 「按 [↓] 完成關卡」: ↓ 用按鍵外觀嵌在句中(金面 = 此刻按得下去), 輕輕上下彈
    var bob = Math.sin(t * TAU / 0.6) * 1.5;
    kline(ctx, ['按', { key: 'down', st: 'hot' }, '完成關卡'], cx, cy, 18, 'center', 'parch', bob - 1);
    ctx.restore();
  }

  // ================= 血條 =================
  function drawHpBar(ctx, st) {
    st = obj(st);
    var x = num(st.x, 0), y = num(st.y, 0), maxHp = clamp(Math.round(num(st.maxHp, 1)), 1, 99), maxS = clamp(Math.round(num(st.maxShield, 0)), 0, 99);
    var hp = clamp(num(st.hp, maxHp), 0, maxHp), sh = clamp(num(st.shield, 0), 0, maxS), tot = maxHp + maxS;
    var cDur = Math.max(0.01, num(st.chipDur, 0.4)), cT = clamp(num(st.chipT, cDur), 0, cDur), chip = clamp(num(st.chip, hp + sh), 0, tot);
    var big = st.big === true, weak = st.weak === true;
    var Wd = Math.min(96, Math.max(16, 6 * tot + 4)), hh = big ? 7 : 5, x0 = x - Wd / 2, y0 = y - hh, u = Wd / tot;
    ctx.save();
    // 版面固定: 血量在左、盾值在右(不依盾牌朝向翻轉)。傷害先扣盾再扣血, 整條一律由右往左扣
    rr(ctx, x0, y0, Wd, hh, hh / 2); ctx.fillStyle = 'rgba(10,6,14,0.82)'; ctx.fill();
    ctx.save(); rr(ctx, x0, y0, Wd, hh, hh / 2); ctx.clip();
    var lost = (chip - (hp + sh)) * (1 - cT / cDur);
    if (lost > 0.01) { var ws = hp < maxHp ? hp : maxHp + sh; ctx.fillStyle = '#ffffff'; ctx.fillRect(x0 + ws * u, y0, lost * u, hh); }
    if (hp > 0) { ctx.fillStyle = lin(ctx, 0, y0, 0, y0 + hh, weak ? [0, '#fff09a', 1, '#e8b020'] : [0, '#ff8a8a', 1, '#e02a3c']); ctx.fillRect(x0, y0, hp * u, hh); }
    if (sh > 0) { ctx.fillStyle = lin(ctx, 0, y0, 0, y0 + hh, [0, '#c4d6ee', 1, '#6f8fb8']); ctx.fillRect(x0 + maxHp * u, y0, sh * u, hh); }
    if (maxS > 0) { ctx.fillStyle = '#1a1420'; ctx.fillRect(x0 + maxHp * u - 0.75, y0, 1.5, hh); }
    ctx.restore();
    if (weak) { rr(ctx, x0 + 0.75, y0 + 0.75, Wd - 1.5, hh - 1.5, hh / 2); ctx.lineWidth = 1.5; ctx.strokeStyle = PAL.weak; ctx.stroke(); }
    ctx.restore();
  }

  // ================= 怪物(monsters 方案 B: 圓潤 Q 版、上亮下暗、白眼紅瞳、不描邊) =================
  var FL = false; // 受擊閃白
  function blob(ctx, x, y, rx, ry, light, dark, rot) {
    if (FL) { light = '#ffffff'; dark = '#e6e8ee'; }
    ell(ctx, x, y, rx, ry, rot); ctx.fillStyle = lin(ctx, x, y - ry, x, y + ry, [0, light, 1, dark]); ctx.fill();
    ctx.lineWidth = 1.4; ctx.strokeStyle = 'rgba(20,10,20,0.45)'; ctx.stroke();
    ell(ctx, x - rx * 0.35, y - ry * 0.45, rx * 0.35, ry * 0.22, -0.4); ctx.fillStyle = 'rgba(255,255,255,0.32)'; ctx.fill();
  }
  function fcol(c) { return FL ? '#ffffff' : c; }
  function eyeB(ctx, x, y, r, angry, brood) {
    if (angry) { circle(ctx, x, y, r + 2.2); ctx.fillStyle = brood ? 'rgba(194,100,255,0.45)' : 'rgba(255,50,50,0.42)'; ctx.fill(); }
    circle(ctx, x, y, r); ctx.fillStyle = '#fbf6ee'; ctx.fill();
    ctx.fillStyle = brood ? PAL.brood : PAL.foeEye;
    if (angry) ell(ctx, x, y, r * 0.32, r * 0.8); else circle(ctx, x, y, r * 0.52);
    ctx.fill();
  }
  function spiralEye(ctx, x, y, r) {
    circle(ctx, x, y, r); ctx.fillStyle = '#fbf6ee'; ctx.fill();
    ctx.strokeStyle = '#3a2030'; ctx.lineWidth = Math.max(0.8, r * 0.18); ctx.beginPath();
    for (var a = 0; a < 9; a += 0.45) ctx.lineTo(x + Math.cos(a) * a * r * 0.1, y + Math.sin(a) * a * r * 0.1);
    ctx.stroke();
  }
  function brow(ctx, x, y, f, w) { ctx.strokeStyle = '#2a1010'; ctx.lineWidth = 1.8; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x - f * w, y - 2.5); ctx.lineTo(x + f * w, y + 0.5); ctx.stroke(); }
  function shadowE(ctx, y, rx) { ell(ctx, 0, y, rx, 2); ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fill(); }
  function veins(ctx, pts, lw) { // 巢穴記號: 背上發光紫紋
    ctx.save(); ctx.strokeStyle = PAL.brood; ctx.lineWidth = lw || 2.2; ctx.shadowColor = PAL.brood; ctx.shadowBlur = 6; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(pts[0], pts[1]); for (var i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]); ctx.stroke(); ctx.restore();
  }
  function stunStars(ctx, top, t, n) { // 星星帶: 判定框上緣上方 18~36px(血條之上)
    for (var i = 0; i < n; i++) {
      var a = t * 4 + i * TAU / n, sx = Math.cos(a) * 13, sy = top - 27 + Math.sin(a) * 3;
      star4(ctx, sx, sy, 4.5); ctx.fillStyle = i % 2 ? '#fff6c0' : PAL.weak; ctx.fill();
    }
  }
  function speedLines(ctx, side, x0, ys, len, col) {
    ctx.save(); ctx.strokeStyle = col || 'rgba(255,255,255,0.8)'; ctx.lineWidth = 2; ctx.lineCap = 'butt';
    for (var i = 0; i < ys.length; i++) { var l = len * (0.6 + 0.4 * hash(i, 5)); ctx.beginPath(); ctx.moveTo(side * x0, ys[i]); ctx.lineTo(side * (x0 + l), ys[i]); ctx.stroke(); }
    ctx.restore();
  }
  // 共用外殼: 剪影 / 擊飛(傾斜 + 框外速度線)/ 受擊閃白
  function foe(ctx, st, w, h, col, body, opt) {
    st = obj(st); opt = opt || {};
    var x = num(st.x, 0), y = num(st.y, 0), f = face(st.facing), state = st.state, t = num(st.t, 0);
    var sc = scaleOf(ctx);
    ctx.save(); ctx.translate(x, y);
    if (sc.rel < SIL) {
      var lw = 1.6 / sc.abs;
      ell(ctx, 0, 0, w / 2 - lw / 2, h / 2 - lw / 2); ctx.fillStyle = st.hit === true ? '#ffffff' : col; ctx.fill();
      ctx.lineWidth = lw; ctx.strokeStyle = st.brood === true ? PAL.brood : '#160c12'; ctx.stroke();
      if (st.brood === true) { ctx.lineWidth = 2 * lw; ctx.stroke(); }
      ctx.restore(); return;
    }
    var flung = state === 'flung' && opt.canFling !== false;
    var fd = st.flingDir === 1 ? 1 : (st.flingDir === -1 ? -1 : -f);
    if (flung) speedLines(ctx, -fd, w / 2 + 2, [-h * 0.3, 0, h * 0.3], 38);
    FL = st.hit === true;
    ctx.save();
    if (flung) { ctx.rotate(fd * 0.3); ctx.scale(0.86, 0.86); }
    try { body(ctx, f, state, t, st.brood === true, st); } finally { FL = false; }
    ctx.restore();
    ctx.restore();
  }

  function drawBoar(ctx, st) {
    foe(ctx, st, 48, 32, '#b8784a', function (ctx, f, s, t, brood) {
      s = oneOf(s, ['walk', 'windup', 'charge', 'stun', 'flung'], 'walk');
      var w = s === 'windup', ch = s === 'charge', stun = s === 'stun', lg = s === 'walk' ? Math.sin(t * 10) * 2 : (ch ? Math.sin(t * 22) * 2.5 : 0);
      shadowE(ctx, 14, 20);
      if (w) { ctx.fillStyle = 'rgba(220,200,170,0.8)'; circle(ctx, -f * 18, 12, 3.5); ctx.fill(); circle(ctx, -f * 22, 13, 2.5); ctx.fill(); ctx.translate(0, 16); ctx.scale(1, 0.86); ctx.translate(0, -16); }
      if (ch) ctx.rotate(f * 0.06);
      ctx.fillStyle = fcol('#5a3020'); [-12, -5, 6, 12].forEach(function (lx, i) { rr(ctx, lx * f - 2.5 + (i % 2 ? lg : -lg), 8, 5.5, 8, 2.5); ctx.fill(); });
      blob(ctx, -f * 2, 1, 18, 12, brood ? '#a86a8a' : '#d08a58', brood ? '#5a2a50' : '#7a4426');
      poly(ctx, [-f * 2, -10, f * 2, -15, f * 5, -9]); ctx.fillStyle = fcol('#7a4426'); ctx.fill();
      if (brood) veins(ctx, [-f * 16, -2, -f * 10, -8, -f * 4, -2, f * 2, -8]);
      blob(ctx, f * 15, 4, 6.5, 5.5, '#f2b4a4', '#c8786a');
      ctx.fillStyle = '#5a2a20'; circle(ctx, f * 17, 3, 1); ctx.fill(); circle(ctx, f * 14, 3, 1); ctx.fill();
      ctx.strokeStyle = '#fffaf0'; ctx.lineWidth = 2.4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(f * 12, 8); ctx.quadraticCurveTo(f * 16, 10, f * 18, 4); ctx.stroke();
      if (stun) { spiralEye(ctx, f * 8, -3, 3.4); stunStars(ctx, -16, t, 3); }
      else { eyeB(ctx, f * 8, -3, 3.4, w || ch, brood); if (w || ch) brow(ctx, f * 8, -7, f, 3.5); }
      if (ch) speedLines(ctx, -f, 6, [-6, 0, 6], 12, 'rgba(255,255,255,0.7)');
    });
  }

  function drawFrog(ctx, st) {
    foe(ctx, st, 32, 28, '#b5d43a', function (ctx, f, s, t, brood) {
      s = oneOf(s, ['crouch', 'jump', 'flung'], 'crouch');
      var top = brood ? '#b8a0e0' : '#d4f060', bot = brood ? '#6a4a9a' : '#6a9a20';
      if (s === 'jump') {
        ctx.strokeStyle = fcol('#5a8a18'); ctx.lineWidth = 4; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(-f * 6, 6); ctx.lineTo(-f * 13, 12); ctx.moveTo(f * 4, 7); ctx.lineTo(f * 8, 12); ctx.stroke();
        blob(ctx, 0, 0, 11, 10, top, bot);
        if (brood) veins(ctx, [-f * 8, -2, -f * 3, -6, f * 2, -2]);
        eyeB(ctx, f * 3, -7, 3.6, false, brood); eyeB(ctx, f * 9, -5, 3.6, false, brood);
      } else {
        shadowE(ctx, 12, 14);
        blob(ctx, -f * 9, 8, 6.5, 5, '#a8d040', '#5a8a18');
        blob(ctx, 0, 4, 14, 8.5, top, bot);
        ell(ctx, 0, 8, 9, 3.5); ctx.fillStyle = 'rgba(255,250,210,0.5)'; ctx.fill();
        if (brood) veins(ctx, [-f * 10, 2, -f * 4, -2, f * 2, 2]);
        eyeB(ctx, f * 2, -4, 4, false, brood); eyeB(ctx, f * 9, -3, 4, false, brood);
      }
    });
  }

  function drawShooterBee(ctx, st) {
    foe(ctx, st, 32, 32, '#f2c230', function (ctx, f, s, t, brood) {
      s = oneOf(s, ['fly', 'aim', 'flung'], 'fly');
      var aim = s === 'aim', flap = Math.sin(t * 40) * 0.5 + 0.5;
      if (aim) { ctx.rotate(f * 0.2); ctx.scale(0.92, 0.92); }
      ctx.fillStyle = 'rgba(235,245,255,0.65)'; ell(ctx, -f * 3, -9, 6, 2 + 3 * flap, -0.4); ctx.fill(); ell(ctx, f * 2, -10, 5, 2 + 2.5 * flap, 0.4); ctx.fill();
      blob(ctx, -f * 3, 2, 10.5, 8.5, aim ? '#ffc070' : '#ffe070', aim ? '#e06a10' : '#d89a10');
      ctx.save(); ell(ctx, -f * 3, 2, 10.5, 8.5); ctx.clip(); ctx.fillStyle = fcol('rgba(40,24,8,0.85)'); ctx.fillRect(-f * 3 - 6, -8, 3.5, 20); ctx.fillRect(-f * 3 + 1, -8, 3.5, 20); ctx.restore();
      if (brood) veins(ctx, [-f * 10, -2, -f * 5, -5, f * 1, -2], 2);
      blob(ctx, f * 9, -1, 5.5, 5.5, '#6a4a20', '#3a2410');
      eyeB(ctx, f * 10, -2, 2.6, aim, brood);
      poly(ctx, [-f * 12, 4, -f * 12, 8, -f * 15.5, 7]); ctx.fillStyle = fcol('#2a1a08'); ctx.fill();
      if (aim) { var g = 0.6 + 0.4 * Math.sin(t * 30); circle(ctx, -f * 14.5, 7, 2.6 + g); ctx.fillStyle = 'rgba(255,70,40,0.9)'; ctx.fill(); }
    });
  }

  function drawThorn(ctx, st) {
    st = obj(st);
    var stT = clamp(num(st.stateT, 0), 0, 100);
    foe(ctx, st, 40, 48, '#5fae3a', function (ctx, f, s, t, brood) {
      s = oneOf(s, ['idle', 'windup', 'whip', 'recover'], 'idle');
      var w = s === 'windup', wh = s === 'whip', rec = s === 'recover';
      ell(ctx, -6, 21, 7, 2.2, -0.3); ctx.fillStyle = fcol('#4a9a34'); ctx.fill(); ell(ctx, 6, 21, 7, 2.2, 0.3); ctx.fill();
      var sway = s === 'idle' ? Math.sin(t * 2) * 0.06 : 0;
      ctx.save(); ctx.translate(0, 24); ctx.rotate(sway); ctx.translate(0, -24);
      ctx.strokeStyle = fcol('#4f9a34'); ctx.lineWidth = 4.5; ctx.lineCap = 'butt'; ctx.beginPath(); ctx.moveTo(0, 21.7); ctx.quadraticCurveTo(-3, 10, 0, -2); ctx.stroke();
      ctx.strokeStyle = fcol('#6fbf42'); ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(-f * 1, 10); ctx.bezierCurveTo(-f * 9, 12, -f * 13, 5, -f * 11, 1); ctx.stroke();
      if (w) { ctx.beginPath(); ctx.moveTo(f * 1, 8); ctx.bezierCurveTo(-f * 10, 4, -f * 16, -12, -f * 6, -18); ctx.stroke(); circle(ctx, -f * 6, -18, 3.4); ctx.fillStyle = 'rgba(255,70,50,0.85)'; ctx.fill(); }
      else if (rec) { ctx.beginPath(); ctx.moveTo(f * 1, 10); ctx.quadraticCurveTo(f * 10, 22, f * 18, 22); ctx.stroke(); }
      else if (!wh) { ctx.beginPath(); ctx.moveTo(f * 1, 10); ctx.bezierCurveTo(f * 9, 12, f * 13, 5, f * 11, 1); ctx.stroke(); }
      var open = w ? 1 : (wh ? 0.9 : (rec ? 0.3 : 0.55));
      for (var i = 0; i < 6; i++) { var a = i * TAU / 6 + 0.3; blob(ctx, Math.cos(a) * (5 + open * 3), -10 + Math.sin(a) * (5 + open * 3), 5 * (0.7 + 0.3 * open), 3.6, '#ff8aa0', '#d03a5a', a); }
      blob(ctx, 0, -10, 5.5, 5.5, w || wh ? '#7a1a2a' : '#ffe680', w || wh ? '#3a0810' : '#e8a820');
      if (brood) veins(ctx, [-4, 6, 0, 0, 4, 6], 2);
      eyeB(ctx, f * 1, -11, 2.6, w || wh, brood);
      ctx.restore();
      if (wh) { // 藤鞭橫掃: 甩到面向側框外 140px、貼地高 40 範圍內
        var pr = eOut(stT / 0.3), tip = 20 + 137 * pr;
        ctx.strokeStyle = fcol('#6fbf42'); ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(f * 2, 8); ctx.quadraticCurveTo(f * tip * 0.55, 2, f * tip, 14); ctx.stroke();
        ctx.fillStyle = fcol('#d03a5a');
        for (var j = 1; j <= 5; j++) { var u = j / 6, px = f * tip * u, py = lerp(8, 14, u) - 4 * Math.sin(u * Math.PI); poly(ctx, [px - 3, py, px, py - 5, px + 3, py]); ctx.fill(); }
        ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(f * tip * 0.6, 12, 8, f > 0 ? -1.2 : Math.PI + 0.2, f > 0 ? -0.2 : Math.PI + 1.2); ctx.stroke();
      }
    }, { canFling: false });
  }

  function drawRam(ctx, st) {
    foe(ctx, st, 44, 36, '#d8dde6', function (ctx, f, s, t, brood) {
      s = oneOf(s, ['walk', 'windup', 'butt', 'stagger', 'flung'], 'walk');
      var w = s === 'windup', b = s === 'butt', stg = s === 'stagger', lg = s === 'walk' ? Math.sin(t * 9) * 2 : (b ? Math.sin(t * 20) * 2.5 : 0);
      shadowE(ctx, 16, 19);
      if (stg) ctx.rotate(Math.sin(t * 14) * 0.08);
      if (b) ctx.rotate(f * 0.08);
      if (w) { ctx.fillStyle = 'rgba(230,236,246,0.85)'; circle(ctx, -f * 18, 15, 3.5); ctx.fill(); circle(ctx, -f * 21, 16, 2.4); ctx.fill(); }
      ctx.fillStyle = fcol('#4a5060'); [-12, -5, 5, 11].forEach(function (lx, i) { rr(ctx, lx * f - 2.5 + (w && i < 2 ? -f * 2 : (i % 2 ? lg : -lg)), 7, 5, 11, 2.5); ctx.fill(); });
      [[-12, 0, 8], [-4, -6, 8.5], [5, -4, 8], [-9, 6, 7.5], [3, 5, 8]].forEach(function (q) { blob(ctx, -f * 2 + q[0] * f, q[1], q[2], q[2] * 0.92, brood ? '#e8d8ff' : '#ffffff', brood ? '#9a88bc' : '#aab4c8'); });
      if (brood) veins(ctx, [-f * 16, -2, -f * 10, -9, -f * 3, -4, f * 3, -10]);
      var hx = f * (w ? 15.5 : 14), hy = w ? 5 : -4;
      blob(ctx, hx, hy, 6.5, 6, '#7a8294', '#4a5060');
      ctx.strokeStyle = fcol('#e0bc78'); ctx.lineWidth = 4; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(hx - f * 3, hy - 3, 5.5, w ? 0.2 : -1.2, w ? 3.8 : 2.6); ctx.stroke();
      if (stg) { spiralEye(ctx, hx + f * 2.5, hy - 1, 2.6); stunStars(ctx, -18, t, 3); }
      else { eyeB(ctx, hx + f * 2.5, hy - 1, 2.6, w || b, brood); if (w || b) brow(ctx, hx + f * 2.5, hy - 4.5, f, 3); }
      if (b) speedLines(ctx, -f, 8, [-8, 0, 8], 12, 'rgba(255,255,255,0.7)');
    });
  }

  function drawHawk(ctx, st) {
    st = obj(st);
    var ang = num(st.angle, 0);
    foe(ctx, st, 40, 28, '#6a7ea8', function (ctx, f, s, t, brood) {
      s = oneOf(s, ['circle', 'hover', 'dive', 'return', 'flung'], 'circle');
      if (s === 'dive' || s === 'return') {
        var c = Math.abs(Math.cos(ang)), sn = Math.abs(Math.sin(ang)), k = Math.min(1, 19 / (20 * c + 10 * sn), 13 / (20 * sn + 10 * c));
        // 朝左半邊飛(含 return 水平往左 angle = π)時上下鏡像, 眼睛與背保持在上方, 不會變成肚皮朝天
        ctx.rotate(ang); ctx.scale(k, Math.cos(ang) < -1e-6 ? -k : k);
        if (s === 'dive') { poly(ctx, [20, 0, 4, -6, -16, -9, -10, 0, -16, 9, 4, 6]); ctx.fillStyle = FL ? '#ffffff' : lin(ctx, 0, -9, 0, 9, [0, '#8ea2c8', 1, '#34446a']); ctx.fill(); }
        else { blob(ctx, -8, -6, 10, 4, '#7a8eb8', '#3e4e72', -0.4); blob(ctx, -8, 6, 10, 4, '#7a8eb8', '#3e4e72', 0.4); blob(ctx, 0, 0, 10, 5.5, '#6a7ea8', '#34446a'); }
        if (brood) veins(ctx, [-10, 0, -4, -3, 2, 0], 2);
        blob(ctx, 10, 0, 5, 5, '#ffffff', '#c8ccd8');
        poly(ctx, [14, -2, 19, 0, 14, 2]); ctx.fillStyle = fcol('#f2c230'); ctx.fill();
        eyeB(ctx, 11, -1.5, 2, true, brood);
        return;
      }
      var hov = s === 'hover', flap = hov ? 1 : Math.sin(t * 9) * 0.5 + 0.5, wy = hov ? -11 : -1 - 7 * flap;
      ctx.scale(0.9, 0.9);
      blob(ctx, -f * 11, wy * 0.6, 11, 4.5, '#7a8eb8', '#3e4e72', -f * (hov ? 0.9 : 0.15 + 0.3 * flap));
      blob(ctx, f * 8, wy * 0.6 - 1, 9, 4.2, '#8ea2c8', '#4a5a80', f * (hov ? 0.9 : 0.15 + 0.3 * flap));
      blob(ctx, 0, 1, 9, 6, '#6a7ea8', '#34446a');
      if (brood) veins(ctx, [-f * 7, 2, -f * 2, -2, f * 3, 2], 2);
      blob(ctx, f * 9, -2, 5, 5, '#ffffff', '#c8ccd8');
      poly(ctx, [f * 13, -3, f * 17, -1, f * 13, 1]); ctx.fillStyle = fcol('#f2c230'); ctx.fill();
      eyeB(ctx, f * 10, -3, 2.2, hov, brood);
      if (hov) { ctx.strokeStyle = fcol('#f2c230'); ctx.lineWidth = 1.8; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(f * 1, 6); ctx.lineTo(f * 4, 11); ctx.moveTo(-f * 2, 6); ctx.lineTo(f * 0, 11); ctx.stroke(); }
    });
  }

  function drawLizard(ctx, st) {
    foe(ctx, st, 36, 24, '#d89a58', function (ctx, f, s, t, brood) {
      s = oneOf(s, ['crawl', 'windup', 'throw'], 'crawl');
      var w = s === 'windup', th = s === 'throw', lg = s === 'crawl' ? Math.sin(t * 10) * 2 : 0;
      ctx.scale(0.92, 1);
      ctx.strokeStyle = fcol('#8a5a2e'); ctx.lineWidth = 3; ctx.lineCap = 'round';
      [-9, -3, 4, 9].forEach(function (lx, i) { ctx.beginPath(); ctx.moveTo(lx, -4); ctx.lineTo(lx + (i % 2 ? 3 : -3) + (i % 2 ? lg : -lg), -11); ctx.stroke(); });
      ctx.lineWidth = 3.4; ctx.beginPath(); ctx.moveTo(-f * 12, -4);
      if (w) ctx.quadraticCurveTo(-f * 18, 4, -f * 8, 6); else if (th) ctx.quadraticCurveTo(-f * 18, 6, -f * 16, 10); else ctx.quadraticCurveTo(-f * 19, -2, -f * 17, 5);
      ctx.stroke();
      blob(ctx, -f * 1, -4, 13, 5.5, brood ? '#d8b8f0' : '#e8b070', brood ? '#7a5aa0' : '#a86a34');
      if (brood) veins(ctx, [-f * 10, -3, -f * 4, -6, f * 2, -3], 2);
      blob(ctx, f * 13, -1, 5, 4.5, '#f0bc80', '#b07038', f * 0.5);
      eyeB(ctx, f * 14, 0, 2.4, w || th, brood);
      if (w) { blob(ctx, -f * 7, 7, 4.5, 4, '#b8bec8', '#6a707c'); }
    }, { canFling: false });
  }

  function drawRockShot(ctx, st) {
    st = obj(st);
    var x = num(st.x, 0), y = num(st.y, 0), t = num(st.t, 0), kind = oneOf(st.kind, ['lizard', 'spit'], 'lizard');
    ctx.save(); ctx.translate(x, y); ctx.rotate(t * 8);
    var p = [];
    for (var i = 0; i < 7; i++) { var a = i / 7 * TAU, r = 7.5 * (0.8 + hash(i, kind === 'spit' ? 3 : 1) * 0.25); p.push(Math.cos(a) * r, Math.sin(a) * r); }
    poly(ctx, p); ctx.fillStyle = kind === 'spit' ? lin(ctx, 0, -8, 0, 8, [0, '#c9cfdc', 1, '#5d6680']) : lin(ctx, 0, -8, 0, 8, [0, '#d8d2c4', 1, '#7a6a5a']); ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(255,74,58,0.95)'; ctx.stroke(); // 紅色危險描邊(和炸彈分開)
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; circle(ctx, 2, 2, 2.4); ctx.fill();
    ctx.restore();
  }

  function drawShieldman(ctx, st) {
    st = obj(st);
    var hasShield = st.hasShield !== false, bDur = Math.max(0.01, num(st.breakDur, 0.4)), bT = clamp(num(st.breakT, bDur), 0, bDur);
    foe(ctx, st, 32, 40, '#7d8799', function (ctx, f, s, t, brood) {
      s = oneOf(s, ['walk', 'block', 'flung'], 'walk');
      var lg = s === 'walk' ? Math.sin(t * 8) * 1.8 : 0;
      shadowE(ctx, 18, 13);
      ctx.fillStyle = fcol('#3a4050'); rr(ctx, -6 + lg, 12, 5, 8, 2); ctx.fill(); rr(ctx, 1 - lg, 12, 5, 8, 2); ctx.fill();
      blob(ctx, -1, 3, 10, 10.5, hasShield ? '#9aa4b8' : '#f0a060', hasShield ? '#56607a' : '#b0582a');
      if (brood) veins(ctx, [-f * 9, 0, -f * 5, -4, -f * 1, 0, f * 3, -4], 2);
      blob(ctx, -1, -11.5, 8, 8, '#7a849c', '#424a60');
      rr(ctx, f > 0 ? -1 : -7, -13.5, 8, 3.5, 1.5); ctx.fillStyle = '#120a0a'; ctx.fill();
      eyeB(ctx, f * 3, -11.8, 2, !hasShield, brood);
      if (hasShield) {
        var sx = f > 0 ? 4 : -16, blk = s === 'block';
        rr(ctx, sx, -16, 12, 32, 5);
        ctx.fillStyle = FL || blk ? '#ffffff' : lin(ctx, sx, 0, sx + 12, 0, [0, '#7aa8e0', 1, '#3a5f90']); ctx.fill();
        ctx.lineWidth = 1.8; ctx.strokeStyle = '#e8f0ff'; ctx.stroke();
        circle(ctx, sx + 6, 0, 2.5); ctx.fillStyle = blk ? PAL.select : '#e8f0ff'; ctx.fill();
        if (blk) { ctx.strokeStyle = PAL.select; ctx.lineWidth = 2; for (var i = 0; i < 3; i++) { var yy = -8 + i * 8; ctx.beginPath(); ctx.moveTo(f * 13, yy); ctx.lineTo(f * 16, yy - 3); ctx.stroke(); } }
      } else {
        var bx = f > 0 ? 6 : -11; // 殘把手
        ctx.fillStyle = fcol('#5a86c0'); poly(ctx, [bx, -2, bx + 5, -4, bx + 4, 1, bx + 5, 4, bx, 5]); ctx.fill();
        brow(ctx, f * 3, -15, f, 3.5);
      }
      if (bT < bDur) { // 盾碎: 碎片往面向側噴開(框外至多 24px)
        var q = bT / bDur;
        ctx.save(); ctx.globalAlpha *= 1 - q;
        if (q < 0.4) { circle(ctx, f * 10, 0, 6 + 14 * q / 0.4); ctx.lineWidth = 3; ctx.strokeStyle = '#ffffff'; ctx.stroke(); }
        for (var j = 0; j < 5; j++) { var a = (j - 2) * 0.5, d = 4 + 18 * eOut(q); ctx.save(); ctx.translate(f * (10 + Math.cos(a) * d), Math.sin(a) * d * 0.8 + 40 * q * q); ctx.rotate(j + q * 8); poly(ctx, [-3.5, -4, 3.5, -3, 3, 4, -3, 3]); ctx.fillStyle = '#4f78a8'; ctx.fill(); ctx.lineWidth = 1.2; ctx.strokeStyle = '#ffffff'; ctx.stroke(); ctx.restore(); }
        ctx.restore();
      }
    });
  }

  function drawBeetle(ctx, st) {
    st = obj(st);
    var fDur = Math.max(0.01, num(st.fuseDur, 0.8)), fT = clamp(num(st.fuseT, fDur), 0, fDur);
    foe(ctx, st, 32, 24, '#3b4170', function (ctx, f, s, t, brood) {
      s = oneOf(s, ['crawl', 'fuse', 'flung'], 'crawl');
      var fu = s === 'fuse', q = fu ? fT / fDur : 0, blink = fu && Math.sin(q * q * 60) > 0, lg = s === 'crawl' ? Math.sin(t * 14) * 1.5 : 0;
      if (fu) { var k = 1 + 0.15 * q; ctx.scale(k, k); circle(ctx, 0, 0, 14); ctx.fillStyle = 'rgba(255,120,60,' + (0.2 + 0.3 * q).toFixed(3) + ')'; ctx.fill(); }
      shadowE(ctx, 10, 13);
      ctx.strokeStyle = fcol('#1a1a22'); ctx.lineWidth = 2; ctx.lineCap = 'round';
      [-7, 0, 7].forEach(function (lx, i) { ctx.beginPath(); ctx.moveTo(lx, 4); ctx.lineTo(lx - f * 3 + (i % 2 ? lg : -lg), 10); ctx.stroke(); });
      ctx.beginPath(); ctx.ellipse(-f * 1, 4, 12.5, 12, 0, Math.PI, TAU); ctx.closePath();
      ctx.fillStyle = FL || blink ? '#ffffff' : lin(ctx, 0, -8, 0, 4, [0, '#6a73b0', 1, '#22264a']); ctx.fill();
      ctx.lineWidth = 1.2; ctx.strokeStyle = 'rgba(20,10,30,0.5)'; ctx.stroke();
      ctx.strokeStyle = 'rgba(180,190,255,0.45)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(-f * 1, -7); ctx.lineTo(-f * 1, 3); ctx.stroke();
      if (brood) veins(ctx, [-f * 9, 0, -f * 5, -5, -f * 1, -1, f * 4, -5], 2);
      ell(ctx, -f * 1, 3, 9, 2.4); ctx.fillStyle = fu ? '#ffe14d' : '#ff9a2a'; ctx.fill();
      blob(ctx, f * 11, 2, 4.5, 4, '#3a3e48', '#1a1c22');
      eyeB(ctx, f * 12, 1, 2, fu, brood);
      ctx.strokeStyle = '#2a2a33'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-f * 4, -7); ctx.quadraticCurveTo(-f * 6, -10, -f * 5, -11); ctx.stroke();
      circle(ctx, -f * 5, -10.5, fu ? 1.4 + 1.2 * (blink ? 1 : 0) : 1.2); ctx.fillStyle = '#ffe14d'; ctx.fill();
    });
  }

  function drawBat(ctx, st) {
    foe(ctx, st, 24, 20, '#7a6a9a', function (ctx, f, s, t, brood) {
      var up = Math.sin(t * 16) > 0, wy = up ? -5 : 2;
      ctx.scale(0.88, 0.88);
      blob(ctx, -7, wy * 0.5, 6, 3, '#7a6a9a', '#3a2a50', up ? 0.6 : -0.2);
      blob(ctx, 7, wy * 0.5, 6, 3, '#7a6a9a', '#3a2a50', up ? -0.6 : 0.2);
      blob(ctx, 0, 0, 5, 5, brood ? '#b090d8' : '#8a7aaa', brood ? '#5a3a86' : '#4a3a66');
      poly(ctx, [-3.5, -3, -3, -7.5, -0.8, -4]); ctx.fillStyle = fcol('#5a4a7a'); ctx.fill(); poly(ctx, [3.5, -3, 3, -7.5, 0.8, -4]); ctx.fill();
      if (brood) veins(ctx, [-3, 2, 0, -1, 3, 2], 1.6);
      eyeB(ctx, f * 1.6 - 1.6, -0.5, 1.6, false, brood); eyeB(ctx, f * 1.6 + 1.6, -0.5, 1.6, false, brood);
    });
  }

  // ---------- 巢母(64×56, 三主題各一) ----------
  function weakGlow(ctx, x, y, rx, ry, t) {
    var pu = 0.75 + 0.25 * Math.sin(TAU * t * 4);
    ctx.save(); ctx.shadowColor = PAL.weak; ctx.shadowBlur = 14 * pu;
    ell(ctx, x, y, rx, ry); ctx.fillStyle = PAL.weak; ctx.fill(); ctx.restore();
    ell(ctx, x, y, rx * 0.55, ry * 0.5); ctx.fillStyle = '#fffbe0'; ctx.fill();
  }
  function drawBroodmother(ctx, st) {
    st = obj(st);
    var kind = oneOf(st.kind, ['forest', 'cliff', 'mine'], 'forest');
    var sDur = Math.max(0.01, num(st.stateDur, 1)), sT = clamp(num(st.stateT, 0), 0, 1000), sp = clamp(sT / sDur, 0, 1);
    var cols = { forest: '#9a7a4a', cliff: '#6c7690', mine: '#3b4170' };
    foe(ctx, st, 64, 56, cols[kind], function (ctx, f, s, t) {
      if (kind === 'forest') {
        s = oneOf(s, ['walk', 'windup', 'charge', 'stun'], 'walk');
        var w = s === 'windup', ch = s === 'charge', stun = s === 'stun', lg = s === 'walk' ? Math.sin(t * 7) * 2.5 : (ch ? Math.sin(t * 18) * 3 : 0);
        shadowE(ctx, 26, 28);
        if (w) { ctx.fillStyle = 'rgba(220,200,170,0.85)'; circle(ctx, -f * 26, 22, 4.5); ctx.fill(); circle(ctx, -f * 30, 24, 3); ctx.fill(); ctx.translate(0, 28); ctx.scale(1, 0.88); ctx.translate(0, -28); }
        if (ch) ctx.rotate(f * 0.06);
        ctx.scale(0.9, 1);
        ctx.fillStyle = fcol('#3a2614'); [-18, -8, 6, 16].forEach(function (lx, i) { rr(ctx, lx * f - 3.5 + (i % 2 ? lg : -lg), 12, 7, 15, 3); ctx.fill(); });
        for (var i = 0; i < 6; i++) { var bx = -f * (20 - i * 6); poly(ctx, [bx - 3, -10, bx - f * 1, -25 + (i % 2) * 5, bx + 4, -10]); ctx.fillStyle = fcol('#4f9a34'); ctx.fill(); }
        blob(ctx, -f * 3, 2, 26, 17, '#9a7a4a', '#4a3418');
        veins(ctx, [-f * 20, 2, -f * 13, -5, -f * 6, 2, f * 1, -5, f * 8, 2], 2.6);
        if (stun) weakGlow(ctx, -f * 6, -4, 9, 6, t);
        blob(ctx, f * 20, 5, 11, 10, '#a8865a', '#5a4020');
        blob(ctx, f * 29, 7, 6, 5, '#f2b4a4', '#c8786a');
        ctx.strokeStyle = '#fffaf0'; ctx.lineWidth = 3.4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(f * 25, 12); ctx.quadraticCurveTo(f * 33, 13, f * 34, 3); ctx.stroke();
        if (stun) { spiralEye(ctx, f * 20, -1, 4.5); }
        else { eyeB(ctx, f * 20, -1, 4.5, true, true); brow(ctx, f * 20, -6.5, f, 5); }
        if (ch) speedLines(ctx, -f, 8, [-10, 0, 10], 14, 'rgba(255,255,255,0.7)');
      } else if (kind === 'cliff') {
        s = oneOf(s, ['walk', 'windup', 'spit', 'pant'], 'walk');
        var wu = s === 'windup', spt = s === 'spit', pant = s === 'pant', lg2 = s === 'walk' ? Math.sin(t * 7) * 2.5 : 0;
        shadowE(ctx, 26, 28);
        if (wu || spt) { ctx.translate(-f * 20, 28); ctx.rotate(-f * 0.2 * (wu ? sm(sp) : 1)); ctx.scale(0.94, 0.94); ctx.translate(f * 20, -28); }
        ctx.strokeStyle = fcol('#3e4458'); ctx.lineWidth = 6; ctx.lineCap = 'round';
        [-20, -8, 8, 20].forEach(function (lx, i) { ctx.beginPath(); ctx.moveTo(lx * f * 0.9, 8); ctx.lineTo(lx * f * 0.9 + (i < 2 ? -f * 4 : f * 4) + (i % 2 ? lg2 : -lg2), 25); ctx.stroke(); });
        ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(-f * 18, 4); ctx.quadraticCurveTo(-f * 30, 10, -f * 29, 22); ctx.stroke();
        for (var k = 0; k < 5; k++) { var sx = -f * (18 - k * 8); poly(ctx, [sx - 4, -6, sx - f * 1, -22 + (k % 2) * 6, sx + 4, -6]); ctx.fillStyle = FL ? '#ffffff' : lin(ctx, 0, -22, 0, -6, [0, '#e8eef5', 1, '#7d8ca5']); ctx.fill(); }
        blob(ctx, -f * 2, 3, 24, 13, '#8a94ae', '#3e4660');
        veins(ctx, [-f * 18, 2, -f * 11, -4, -f * 4, 2, f * 3, -4, f * 10, 2], 2.6);
        if (pant) weakGlow(ctx, f * 8, 8, 9, 5, t);
        blob(ctx, f * 22, 0, 10, 8, '#9aa4bc', '#4a5470');
        var mo = spt ? 6 : (pant ? 4 : (wu ? 2 : 0.5));
        ctx.fillStyle = fcol('#2a1420'); ell(ctx, f * 27, 4, 5, mo); ctx.fill();
        if (pant) { ctx.fillStyle = '#ff8aa0'; ell(ctx, f * 30, 8 + Math.sin(t * 10), 2.5, 3.5); ctx.fill(); ctx.fillStyle = 'rgba(200,230,255,0.85)'; circle(ctx, f * 16, -10 + fr(t * 1.5) * 8, 1.8); ctx.fill(); }
        if (spt) { ctx.fillStyle = 'rgba(200,190,170,0.85)'; circle(ctx, f * 31, 1, 3); ctx.fill(); }
        if (pant) spiralEye(ctx, f * 22, -3, 3.6); else eyeB(ctx, f * 22, -3, 3.6, wu || spt, true);
      } else {
        s = oneOf(s, ['walk', 'burrow', 'under', 'erupt', 'stuck'], 'walk');
        if (s === 'under') { // 只畫地面上一團土堆
          ell(ctx, 0, 24, 30, 4); ctx.fillStyle = fcol('#5a4636'); ctx.fill();
          ctx.fillStyle = fcol('#7a6450'); for (var m = 0; m < 4; m++) { circle(ctx, -18 + m * 12, 21 + (m % 2) * 1.5, 3.5 + Math.sin(t * 6 + m) * 1); ctx.fill(); }
          ctx.fillStyle = 'rgba(194,100,255,0.6)'; circle(ctx, Math.sin(t * 3) * 10, 20, 1.6); ctx.fill();
          return;
        }
        var dy = s === 'burrow' ? sp * 56 : (s === 'erupt' ? (1 - eOut(sp)) * 56 : 0), stk = s === 'stuck';
        ctx.save();
        ctx.beginPath(); ctx.rect(-60, -80, 120, 108); ctx.clip(); // 地面以下不畫
        ctx.translate(0, dy);
        if (stk) { ctx.translate(f * 2, 6); ctx.rotate(f * 0.2); ctx.scale(0.9, 0.9); }
        var lg3 = s === 'walk' ? Math.sin(t * 10) * 2 : 0;
        ctx.strokeStyle = fcol('#141626'); ctx.lineWidth = 3.5; ctx.lineCap = 'round';
        [-16, -4, 10].forEach(function (lx, i) { ctx.beginPath(); ctx.moveTo(lx, 12); ctx.lineTo(lx - f * 5 + (i % 2 ? lg3 : -lg3), 26); ctx.stroke(); });
        ctx.beginPath(); ctx.ellipse(-f * 4, 12, 26, 26, 0, Math.PI, TAU); ctx.closePath();
        ctx.fillStyle = FL ? '#ffffff' : lin(ctx, 0, -14, 0, 12, [0, '#6a73b0', 1, '#1e2240']); ctx.fill();
        ctx.lineWidth = 1.4; ctx.strokeStyle = 'rgba(20,10,30,0.5)'; ctx.stroke();
        ctx.strokeStyle = 'rgba(190,200,255,0.4)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-f * 4, -13); ctx.lineTo(-f * 4, 11); ctx.stroke();
        veins(ctx, [-f * 22, 4, -f * 15, -6, -f * 8, 2, f * 0, -8, f * 8, 2], 2.6);
        if (stk) weakGlow(ctx, -f * 4, -2, 10, 6, t);
        blob(ctx, f * 18, 6, 9, 8, '#3a3e58', '#16182a');
        // 鑽頭角
        ctx.save(); ctx.translate(f * 21, 4); ctx.scale(f, 1);
        poly(ctx, [0, -6, 10.5, 0, 0, 6]); ctx.fillStyle = FL ? '#ffffff' : lin(ctx, 0, -6, 0, 6, [0, '#e8eef6', 1, '#7a8494']); ctx.fill();
        ctx.strokeStyle = '#3a3f4c'; ctx.lineWidth = 1.2; var ph = (t * 6) % 1;
        for (var d = 0; d < 3; d++) { var dx = (d + ph) * 3; ctx.beginPath(); ctx.moveTo(dx, -6 + dx * 6 / 10.5); ctx.lineTo(dx + 2, 6 - (dx + 2) * 6 / 10.5); ctx.stroke(); }
        ctx.restore();
        if (stk) spiralEye(ctx, f * 17, 3, 3.2); else eyeB(ctx, f * 17, 3, 3.2, s !== 'walk', true);
        ctx.restore();
        if (s === 'erupt' || s === 'burrow') { ctx.fillStyle = fcol('#6a5442'); for (var n2 = 0; n2 < 5; n2++) { var a2 = -Math.PI * (0.15 + n2 * 0.17), dd = 8 + 12 * sp; circle(ctx, Math.cos(a2) * dd * 1.2, 24 + Math.sin(a2) * dd, 3); ctx.fill(); } }
      }
      if (s === 'stun' || s === 'pant' || s === 'stuck') stunStars(ctx, -28, t, 4);
    }, { canFling: false });
  }

  // ---------- 守門巨像(final-boss 方案 B) ----------
  var FLB = false;
  function sandBlock(ctx, x, y, w, h, c, light, dark) {
    if (FLB) { light = '#ffffff'; dark = '#e2e6ee'; }
    var l = x - w / 2, r = x + w / 2, tp = y - h / 2, bt = y + h / 2;
    poly(ctx, [l + c, tp, r - c, tp, r, tp + c, r, bt - c, r - c, bt, l + c, bt, l, bt - c, l, tp + c]);
    ctx.fillStyle = lin(ctx, x, tp, x, bt, [0, light || '#e2c99c', 1, dark || '#8a6a46']); ctx.fill(); ctx.lineWidth = 1.6; ctx.strokeStyle = 'rgba(40,22,10,0.55)'; ctx.stroke();
    ctx.save(); ctx.clip();
    ctx.fillStyle = 'rgba(70,40,16,0.13)'; for (var yy = tp + 10; yy < bt; yy += 15) ctx.fillRect(l, yy, w, 5);
    ctx.fillStyle = 'rgba(255,255,255,0.28)'; ctx.fillRect(l, tp, w, 4);
    ctx.restore();
  }
  function rune(ctx, x, y, r, col) {
    ctx.save(); ctx.shadowColor = col; ctx.shadowBlur = 8; circle(ctx, x, y, r); ctx.fillStyle = col; ctx.fill(); ctx.restore();
    circle(ctx, x, y, r * 0.45); ctx.fillStyle = '#ffe0d0'; ctx.fill();
  }
  function glowLine(ctx, pts, col, lw) {
    ctx.save(); ctx.strokeStyle = col; ctx.shadowColor = col; ctx.shadowBlur = 8; ctx.lineWidth = lw; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(pts[0], pts[1]); for (var i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]); ctx.stroke(); ctx.restore();
  }
  function bossEye(ctx, x, y, r, angry) {
    if (angry) { circle(ctx, x, y, r + 4); ctx.fillStyle = 'rgba(255,50,50,0.5)'; ctx.fill(); }
    circle(ctx, x, y, r); ctx.fillStyle = FLB ? '#ffffff' : '#fbf6ee'; ctx.fill();
    ctx.fillStyle = PAL.foeEye; if (angry) ell(ctx, x, y, r * 0.32, r * 0.8); else circle(ctx, x, y, r * 0.5); ctx.fill();
  }
  function headUpper(ctx, o, t) { // 頭(原點 = 頭中心, 單位已 ×1.18)
    var cr = [[-50, -28, -62, 22], [-14, 14, -62, 30], [28, 50, -62, 22]];
    for (var i = 0; i < 3; i++) {
      var a = cr[i], mid = (a[0] + a[1]) / 2;
      poly(ctx, [a[0], a[2], mid - 4, a[2] - a[3], mid + 4, a[2] - a[3], a[1], a[2]]);
      ctx.fillStyle = FLB ? '#ffffff' : lin(ctx, 0, a[2] - a[3], 0, a[2], [0, '#f0dcb4', 1, '#a8845a']); ctx.fill();
    }
    sandBlock(ctx, 0, 0, 170, 130, 24);
    var runeCol = o.roar > 0 && Math.floor(t * 12) % 2 === 0 ? '#ff2a1a' : '#ff4a3a';
    if (!FLB) { glowLine(ctx, [-62, 8, -76, 8, -76, 40], runeCol, 3); glowLine(ctx, [62, 8, 76, 8, 76, 40], runeCol, 3); }
    if (o.phase >= 2) {
      ctx.strokeStyle = 'rgba(40,20,10,0.8)'; ctx.lineWidth = 2.2;
      ctx.beginPath(); ctx.moveTo(-70, -30); ctx.lineTo(-52, -18); ctx.lineTo(-60, 6); ctx.moveTo(58, -50); ctx.lineTo(46, -30); ctx.lineTo(56, -16); ctx.stroke();
      if (o.weak === 'seam') { glowLine(ctx, [-44, -40, -20, -46, 0, -38, 22, -46, 44, -40], PAL.weak, 6); weakGlow(ctx, 0, -40, 12, 7, t); }
      else if (!FLB) glowLine(ctx, [-44, -40, -20, -46, 0, -38, 22, -46, 44, -40], '#ff5a3a', 4);
    }
    ell(ctx, 0, -2, 36, 30); ctx.fillStyle = FLB ? '#e8e8f0' : '#2a1a12'; ctx.fill();
  }
  function bossFist(ctx, fo, side, weak, t) {
    fo = obj(fo); if (fo.show === false) return;
    var x = num(fo.x, 640 + side * 220), y = num(fo.y, 300), rot = clamp(num(fo.rot, 0), -7, 7), stuck = fo.stuck === true;
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(1.3, 1.4);
    sandBlock(ctx, 0, 0, 84, 68, 14);
    ctx.strokeStyle = 'rgba(40,22,10,0.55)'; ctx.lineWidth = 2.5;
    for (var i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(i * 21, 12); ctx.lineTo(i * 21, 33); ctx.stroke(); }
    if (stuck && !FLB) { ctx.strokeStyle = 'rgba(40,20,10,0.8)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-20, -30); ctx.lineTo(-8, -12); ctx.lineTo(-14, 4); ctx.moveTo(18, -28); ctx.lineTo(10, -6); ctx.stroke(); }
    var rx = -side * 30;
    if (weak) { weakGlow(ctx, rx, 0, 11, 15, t); ctx.fillStyle = 'rgba(255,240,150,0.9)'; star4(ctx, rx - 14, -16, 5); ctx.fill(); star4(ctx, rx + 13, -8, 4); ctx.fill(); }
    else if (!FLB) rune(ctx, rx, 0, 7, '#ff4a3a');
    ctx.restore();
    if (stuck) { ctx.save(); ctx.fillStyle = '#c7a7b9'; for (var j = 0; j < 6; j++) { var px = x - 50 + j * 20 + Math.sin(t * 9 + j) * 2, py = y + 46 - fr(t * 2 + j * 0.3) * 14; poly(ctx, [px - 4, py, px, py - 4, px + 4, py, px, py + 3]); ctx.fill(); } ctx.restore(); }
  }
  function drawColossus(ctx, st) {
    st = obj(st);
    var hx = num(st.hx, 640), hy = num(st.hy, 230), phase = clamp(Math.round(num(st.phase, 1)), 1, 3);
    var eye = clamp(num(st.eye, 0), 0, 1), lid = clamp(num(st.lid, 0), 0, 1), split = clamp(num(st.split, 0), 0, 1.6);
    var weak = oneOf(st.weak, ['fist', 'seam', 'core'], null), angry = st.angry === true, plFall = clamp(num(st.plFall, 0), 0, 1);
    var roar = clamp(num(st.roar, 0), 0, 1), steam = clamp(num(st.steam, 0), 0, 1), t = num(st.t, 0);
    var ko = st.ko === true, kDur = Math.max(0.01, num(st.koDur, 1.5)), kT = clamp(num(st.koT, kDur), 0, kDur), kq = ko ? kT / kDur : 0;
    var lf = obj(st.lf), rf = obj(st.rf), blocks = Array.isArray(st.blocks) ? st.blocks.slice(0, 4) : null;
    var o = { phase: phase, weak: weak, roar: roar }, i;
    var sc = scaleOf(ctx);
    ctx.save();
    if (sc.rel < SIL) { // 縮圖剪影: 砂岩頭 + 紅眼 + 雙拳 / 浮石
      ctx.globalAlpha *= 1 - kq;
      ctx.fillStyle = '#d2b484';
      if (phase < 3) { ctx.fillRect(hx - 100, hy - 80, 200, 160); poly(ctx, [hx - 60, hy - 80, hx - 40, hy - 130, hx - 20, hy - 80, hx + 20, hy - 80, hx + 40, hy - 130, hx + 60, hy - 80]); ctx.fill(); }
      else { ctx.fillRect(hx - 100, hy - 80 - 44 * split, 200, 70); ctx.fillRect(hx - 100, hy + 10 + 36 * split, 200, 70); }
      circle(ctx, hx, hy, phase < 3 ? 30 : 45); ctx.fillStyle = weak ? PAL.weak : '#ff4a3a'; ctx.fill();
      ctx.fillStyle = '#c9a674';
      [[lf, -1], [rf, 1]].forEach(function (p) { if (p[0].show !== false && phase < 3) ctx.fillRect(num(p[0].x, 640 + p[1] * 220) - 55, num(p[0].y, 300) - 50, 110, 100); });
      if (blocks) for (i = 0; i < blocks.length; i++) { var bb = obj(blocks[i]); if (bb.show !== false) ctx.fillRect(num(bb.x, 640) - 35, num(bb.y, 200) - 30, 70, 60); }
      ctx.restore(); return;
    }
    if (roar > 0 && roar < 1) ctx.translate(Math.sin(t * 70) * 4 * (1 - roar), Math.cos(t * 55) * 2 * (1 - roar));
    if (ko) ctx.globalAlpha *= 1 - kq;
    FLB = st.hit === true;
    // 肩甲: 第 1 階段掛在頭兩側; 1→2 時噴飛落到兩側, 落地後碎掉不留(不冒充地形)
    if (phase === 1 || plFall < 1) {
      for (i = 0; i < 2; i++) {
        var sd = i ? 1 : -1, sx = hx + sd * 136, sy = hy - 20, tx = 640 + sd * 470, ty = 560;
        var px = lerp(sx, tx, plFall), py = lerp(sy, ty, plFall * plFall) - Math.sin(plFall * Math.PI) * 140;
        ctx.save(); if (plFall > 0.85) ctx.globalAlpha *= (1 - plFall) / 0.15;
        ctx.translate(px, py); ctx.rotate(sd * (0.12 + plFall * 1.4)); ctx.scale(1.18, 1.18);
        sandBlock(ctx, 0, 0, 60, 84, 14, '#d8bc8e', '#7a5c3a');
        if (plFall === 0 && !FLB) rune(ctx, 0, -8, 6, '#ff4a3a');
        ctx.restore();
      }
    }
    var kOff = function (k) { return ko ? { dx: (hash(k, 2) - 0.5) * 160 * kq, dy: 260 * kq * kq + (hash(k, 3) - 0.3) * 40 * kq, r: (hash(k, 4) - 0.5) * 2 * kq } : { dx: 0, dy: 0, r: 0 }; };
    if (phase < 3) {
      var kh = kOff(1);
      ctx.save(); ctx.translate(hx + kh.dx, hy + kh.dy); ctx.rotate(kh.r); ctx.scale(1.18, 1.18);
      headUpper(ctx, o, t);
      if (lid > 0 || weak === 'seam') {
        bossEye(ctx, 0, 4, 20, false);
        ctx.save(); ell(ctx, 0, -2, 36, 30); ctx.clip(); ctx.fillStyle = FLB ? '#ffffff' : '#9a7a52'; ctx.fillRect(-40, -34, 80, 60 * Math.max(lid, weak === 'seam' ? 0.55 : 0)); ctx.restore();
      } else {
        if (eye > 0 && !FLB) { circle(ctx, 0, -2, 24 + eye * 14); ctx.fillStyle = 'rgba(255,70,50,' + (0.25 + 0.35 * eye).toFixed(3) + ')'; ctx.fill(); }
        bossEye(ctx, 0, -2, 22, angry || eye > 0);
      }
      rr(ctx, -40, 34, 80, 18, 4); ctx.fillStyle = FLB ? '#e8e8f0' : '#2a1a12'; ctx.fill();
      ctx.fillStyle = FLB ? '#ffffff' : '#c8aa7c'; for (i = 0; i < 5; i++) ctx.fillRect(-34 + i * 16, 36, 6, 14);
      ctx.restore();
    } else {
      var k1 = kOff(1), k2 = kOff(2), k3 = kOff(3);
      ctx.save(); ctx.translate(hx + k1.dx, hy - 44 * split + k1.dy); ctx.rotate(k1.r); ctx.scale(1.18, 1.18);
      ctx.save(); ctx.beginPath(); ctx.rect(-130, -130, 260, 118); ctx.clip(); headUpper(ctx, o, t); ctx.restore();
      ctx.restore();
      ctx.save(); ctx.translate(hx + k2.dx, hy + 36 * split + k2.dy); ctx.rotate(k2.r); ctx.scale(1.18, 1.18);
      ctx.save(); ctx.beginPath(); ctx.rect(-130, -12, 260, 100); ctx.clip(); sandBlock(ctx, 0, 0, 170, 130, 24); rr(ctx, -40, 34, 80, 18, 4); ctx.fillStyle = FLB ? '#e8e8f0' : '#2a1a12'; ctx.fill(); ctx.restore();
      ctx.restore();
      ctx.save(); ctx.translate(hx + k3.dx, hy + k3.dy);
      var cw = weak === 'core';
      ctx.save(); ctx.shadowColor = cw ? PAL.weak : '#ff5a2a'; ctx.shadowBlur = 22;
      circle(ctx, 0, 0, 40); ctx.fillStyle = rad(ctx, -10, -10, 4, 40, [0, FLB ? '#ffffff' : (cw ? '#fffbe0' : '#ffc890'), 1, FLB ? '#e2e6ee' : (cw ? '#e8b020' : '#d8401a')]); ctx.fill(); ctx.restore();
      if (cw) { spiralEye(ctx, 0, 0, 20); ctx.fillStyle = 'rgba(255,240,150,0.95)'; star4(ctx, -30, -30, 6); ctx.fill(); star4(ctx, 30, -24, 5); ctx.fill(); }
      else bossEye(ctx, 0, 0, 21, true);
      ctx.strokeStyle = FLB ? '#ffffff' : '#7a4a2a'; ctx.lineWidth = 3.5;
      for (i = 0; i < 8; i++) { var a = i * TAU / 8 + (cw ? 0 : t * TAU / 4); ctx.beginPath(); ctx.moveTo(Math.cos(a) * 41, Math.sin(a) * 41); ctx.lineTo(Math.cos(a) * 45, Math.sin(a) * 45); ctx.stroke(); }
      ctx.restore();
    }
    if (phase < 3) {
      var kl = kOff(5), kr = kOff(6);
      ctx.save(); ctx.translate(kl.dx, kl.dy); bossFist(ctx, lf, -1, weak === 'fist' && lf.stuck === true, t); ctx.restore();
      ctx.save(); ctx.translate(kr.dx, kr.dy); bossFist(ctx, rf, 1, weak === 'fist' && rf.stuck === true, t); ctx.restore();
    }
    if (blocks) for (i = 0; i < blocks.length; i++) {
      var b = obj(blocks[i]); if (b.show === false) continue;
      var bx = num(b.x, 640), by = num(b.y, 200), kb = kOff(10 + i);
      ctx.save(); ctx.translate(bx + kb.dx, by + kb.dy);
      if (b.falling === true) { ctx.strokeStyle = 'rgba(255,240,220,0.8)'; ctx.lineWidth = 2; for (var j = 0; j < 3; j++) { ctx.beginPath(); ctx.moveTo(-20 + j * 20, -34); ctx.lineTo(-20 + j * 20, -34 - 22 - j * 6); ctx.stroke(); } }
      ctx.scale(1.4, 1.2); sandBlock(ctx, 0, 0, 50, 50, 9); if (!FLB) rune(ctx, 0, 0, 5, '#ff4a3a');
      ctx.restore();
    }
    FLB = false;
    // 聚光: 光線往眼睛收; 過熱蒸氣
    if (eye > 0 && eye < 1 && !ko) {
      ctx.strokeStyle = 'rgba(255,120,90,0.85)'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
      for (i = 0; i < 10; i++) { var aa = i * TAU / 10, u = fr(t * 2 + i * 0.1), r0 = 150 - u * 100; ctx.beginPath(); ctx.moveTo(hx + Math.cos(aa) * r0, hy + Math.sin(aa) * r0); ctx.lineTo(hx + Math.cos(aa) * (r0 - 24), hy + Math.sin(aa) * (r0 - 24)); ctx.stroke(); }
    }
    if (steam > 0 && !ko) for (i = 0; i < 4; i++) { var u2 = fr(t * 2 + i / 4), sx2 = hx + (i % 2 ? 54 : -54); circle(ctx, sx2 + (i > 1 ? 12 : -12) * u2, hy - 80 - u2 * 80, 9 + u2 * 18); ctx.fillStyle = 'rgba(240,240,248,' + (0.7 * steam * (1 - u2)).toFixed(3) + ')'; ctx.fill(); }
    ctx.restore();
  }

  function drawBossBeam(ctx, st) {
    st = obj(st);
    var x1 = num(st.x1, 640), y1 = num(st.y1, 230), x2 = num(st.x2, 640), y2 = num(st.y2, 600), w = clamp(num(st.w, 48), 2, 200), t = num(st.t, 0);
    var len = Math.hypot(x2 - x1, y2 - y1), ang = Math.atan2(y2 - y1, x2 - x1), i;
    ctx.save();
    ctx.lineCap = 'butt';
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
    ctx.strokeStyle = 'rgba(255,60,40,0.28)'; ctx.lineWidth = w + 24; ctx.stroke();
    ctx.strokeStyle = 'rgba(255,90,60,0.85)'; ctx.lineWidth = w; ctx.stroke();
    ctx.strokeStyle = 'rgba(255,200,150,0.95)'; ctx.lineWidth = w * 0.45; ctx.stroke();
    ctx.strokeStyle = '#fff4ec'; ctx.lineWidth = w * 0.16; ctx.stroke();
    ctx.save(); ctx.translate(x1, y1); ctx.rotate(ang); // 流動的亮段
    ctx.fillStyle = 'rgba(255,255,240,0.55)';
    for (i = 0; i < 6; i++) { var d = fr(i / 6 + t * 2) * len; ctx.fillRect(d, -w * 0.3, 14, w * 0.6); }
    ctx.restore();
    ell(ctx, x2, y2 + 2, w * 0.9, 6); ctx.fillStyle = 'rgba(190,240,255,0.55)'; ctx.fill(); // 鹽痕
    circle(ctx, x2, y2 - 2, w * 0.5); ctx.fillStyle = 'rgba(255,170,90,0.7)'; ctx.fill();
    ctx.strokeStyle = '#ffe0a0'; ctx.lineWidth = 2; ctx.lineCap = 'round';
    for (i = 0; i < 6; i++) { var sa = -Math.PI * (0.1 + 0.8 * hash(i, Math.floor(t * 20))), sl = 16 + hash(i, 7) * 14; ctx.beginPath(); ctx.moveTo(x2, y2 - 2); ctx.lineTo(x2 + Math.cos(sa) * sl, y2 - 2 + Math.sin(sa) * sl); ctx.stroke(); }
    ctx.restore();
  }

  function drawBossHpBar(ctx, st) {
    st = obj(st);
    var x = num(st.x, 640), y = num(st.y, 110), maxHp = clamp(Math.round(num(st.maxHp, 45)), 1, 999), hp = clamp(num(st.hp, maxHp), 0, maxHp);
    var cDur = Math.max(0.01, num(st.chipDur, 0.4)), cT = clamp(num(st.chipT, cDur), 0, cDur), chip = clamp(num(st.chip, hp), 0, maxHp), weak = st.weak === true;
    var Wd = 360, hh = 12, x0 = x - Wd / 2, y0 = y - hh / 2, i;
    ctx.save();
    rr(ctx, x0, y0, Wd, hh, hh / 2); ctx.fillStyle = 'rgba(10,6,14,0.86)'; ctx.fill();
    ctx.save(); rr(ctx, x0, y0, Wd, hh, hh / 2); ctx.clip();
    var lost = (chip - hp) * (1 - cT / cDur);
    if (lost > 0.01) { ctx.fillStyle = '#ffffff'; ctx.fillRect(x0 + Wd * hp / maxHp, y0, Wd * lost / maxHp, hh); }
    if (hp > 0) { ctx.fillStyle = lin(ctx, 0, y0, 0, y0 + hh, weak ? [0, '#fff09a', 1, '#e8b020'] : [0, '#ff8a8a', 1, '#e02a3c']); ctx.fillRect(x0, y0, Wd * hp / maxHp, hh); }
    if (maxHp <= 120) { ctx.fillStyle = 'rgba(10,6,14,0.35)'; for (i = 1; i < maxHp; i++) ctx.fillRect(x0 + Wd * i / maxHp - 0.5, y0, 1, hh); }
    var marks = arr(st.marks).slice(0, 8);
    ctx.fillStyle = '#ffffff';
    for (i = 0; i < marks.length; i++) { var m = num(marks[i], -1); if (m > 0 && m < maxHp) ctx.fillRect(x0 + Wd * m / maxHp - 1.5, y0, 3, hh); }
    ctx.restore();
    rr(ctx, x0 + 0.75, y0 + 0.75, Wd - 1.5, hh - 1.5, hh / 2); ctx.lineWidth = 1.5; ctx.strokeStyle = weak ? PAL.weak : 'rgba(255,255,255,0.35)'; ctx.stroke();
    ctx.restore();
  }

  // ================= 飛行物與特效 =================
  function drawBeeShot(ctx, st) {
    st = obj(st);
    var x = num(st.x, 0), y = num(st.y, 0);
    ctx.save();
    if (scaleOf(ctx).rel >= SIL) { ctx.fillStyle = '#5a1206'; for (var i = 0; i < 6; i++) { var a = i * TAU / 6 + nowS() * 6; poly(ctx, [x + Math.cos(a) * 6, y + Math.sin(a) * 6, x + Math.cos(a + 0.5) * 3.5, y + Math.sin(a + 0.5) * 3.5, x + Math.cos(a - 0.5) * 3.5, y + Math.sin(a - 0.5) * 3.5]); ctx.fill(); } }
    circle(ctx, x, y, 4.4); ctx.fillStyle = PAL.beeShot; ctx.fill();
    circle(ctx, x - 1, y - 1, 1.6); ctx.fillStyle = '#ffd0a0'; ctx.fill();
    ctx.restore();
  }
  function drawArrow(ctx, st) {
    st = obj(st);
    var x = num(st.x, 0), y = num(st.y, 0), a = num(st.angle, 0);
    ctx.save(); ctx.translate(x, y); ctx.rotate(a);
    ctx.strokeStyle = PAL.arrow; ctx.lineWidth = 2; ctx.lineCap = 'butt'; ctx.beginPath(); ctx.moveTo(-10, 0); ctx.lineTo(7, 0); ctx.stroke();
    poly(ctx, [6, -3, 12, 0, 6, 3]); ctx.fillStyle = '#dfe6ee'; ctx.fill();
    ctx.fillStyle = PAL.hunter; poly(ctx, [-12, -3, -7, 0, -12, 3, -10, 0]); ctx.fill();
    ctx.restore();
  }
  function drawBomb(ctx, st) {
    st = obj(st);
    var x = num(st.x, 0), y = num(st.y, 0), t = num(st.t, 0);
    var R = clamp(num(st.radius, 60), 0, 64), danger = st.danger === true;
    ctx.save();
    // 爆炸範圍圈(polish 第 3 輪: 炸彈會炸到自己): 線畫在 radius 內側; 縮圖(radius 0 或縮放 < 0.2)不畫
    if (R > 4 && scaleOf(ctx).rel >= SIL) {
      ctx.save();
      if (danger) {
        var fl2 = 0.5 + 0.5 * Math.cos(t * TAU / 0.25); // 0.25 秒一閃
        circle(ctx, x, y, R); ctx.fillStyle = 'rgba(255,60,50,' + (0.07 + 0.07 * fl2).toFixed(3) + ')'; ctx.fill();
        circle(ctx, x, y, R - 1.2); ctx.lineWidth = 2.4; ctx.strokeStyle = 'rgba(255,74,58,' + (0.6 + 0.4 * fl2).toFixed(3) + ')'; ctx.stroke();
      } else {
        ctx.setLineDash([6, 5]); ctx.lineDashOffset = -t * 18;
        circle(ctx, x, y, R - 1); ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(255,240,215,0.35)'; ctx.stroke();
      }
      ctx.restore();
    }
    ctx.translate(x, y); ctx.rotate(t * 6);
    circle(ctx, 0, 1.5, 6); ctx.fillStyle = PAL.bomb; ctx.fill(); ctx.lineWidth = 1.2; ctx.strokeStyle = '#ffffff'; ctx.stroke();
    circle(ctx, -2, -0.5, 1.6); ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.fill();
    ctx.strokeStyle = '#c8a070'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(2.5, -3); ctx.lineTo(4, -5); ctx.stroke();
    var fl = 1 + Math.abs(Math.sin(t * 30)) * 1.2;
    star4(ctx, 4.8, -5.6, fl + 1); ctx.fillStyle = PAL.goal; ctx.fill();
    ctx.restore();
  }
  function drawExplosion(ctx, st) {
    st = obj(st);
    var x = num(st.x, 0), y = num(st.y, 0), dur = Math.max(0.01, num(st.dur, 0.4)), p = clamp(num(st.t, 0) / dur, 0, 1), R = clamp(num(st.radius, 60), 1, 400), kind = oneOf(st.kind, ['bomb', 'beetle'], 'bomb');
    ctx.save();
    var r = R * (0.45 + 0.55 * p);
    ctx.globalAlpha *= 1 - p * 0.85;
    circle(ctx, x, y, r); ctx.fillStyle = kind === 'beetle' ? 'rgba(255,120,60,0.85)' : 'rgba(255,154,42,0.85)'; ctx.fill();
    circle(ctx, x, y, r * 0.62); ctx.fillStyle = 'rgba(255,230,120,0.95)'; ctx.fill();
    circle(ctx, x, y, r - 1.5); ctx.lineWidth = 3; ctx.strokeStyle = '#ff5a1a'; ctx.stroke();
    if (kind === 'beetle') { // 青紫色甲殼碎片
      for (var i = 0; i < 8; i++) { var a = i * TAU / 8 + 0.3, d = R * (0.3 + 0.62 * eOut(p)); ctx.save(); ctx.translate(x + Math.cos(a) * d, y + Math.sin(a) * d); ctx.rotate(a + p * 6); poly(ctx, [-5, -3, 5, -4, 3, 4, -4, 3]); ctx.fillStyle = '#4a52a0'; ctx.fill(); ctx.lineWidth = 1; ctx.strokeStyle = '#c8ceff'; ctx.stroke(); ctx.restore(); }
    }
    ctx.restore();
  }
  // 爆風擊退(玩家, polish 第 3 輪): 從身側往左右各推出一道爆風, 只在 left~right、y±halfH 的水平帶內;
  // 白色弧形前緣 + 內側淡橘細線 + 往外的速度線與小箭頭 + 極淡暖色面。和火球、和敵方紅色、和舊的圓環都分開
  function drawShockwave(ctx, st) {
    st = obj(st);
    var x = num(st.x, 0), y = num(st.y, 0), dur = Math.max(0.01, num(st.dur, 0.4)), p = clamp(num(st.t, 0) / dur, 0, 1);
    var hh = clamp(num(st.halfH, 40), 4, 80);
    var left = clamp(num(st.left, x - 130), x - 400, x), right = clamp(num(st.right, x + 130), x, x + 400);
    var ep = eOut(p), i, side;
    ctx.save();
    ctx.beginPath(); ctx.rect(left, y - hh, right - left, hh * 2); ctx.clip(); // 判定外緣 = 畫面外緣
    ctx.globalAlpha *= 1 - p * 0.7;
    var simple = scaleOf(ctx).rel < SIL;
    for (side = -1; side <= 1; side += 2) {
      var L = side < 0 ? x - left : right - x; if (L < 1) continue;
      var f = L * ep, fx = x + side * f;                 // 前緣(最外點)
      var cut = L < 126;                                 // 這一側被牆截短
      var sq = cut ? seg(p, 0.55, 1) : 0;                // 撞牆壓扁
      var b = Math.min(f, 16 * (1 - 0.8 * sq));          // 弧形鼓出量
      var fh = hh * (0.78 + 0.22 * sq);                  // 前緣半高(壓扁時撐到整條帶)
      if (simple) { ctx.lineWidth = 6; ctx.strokeStyle = 'rgba(255,250,240,0.9)'; ctx.beginPath(); ctx.moveTo(fx - side * 2, y - fh * 0.7); ctx.lineTo(fx - side * 2, y + fh * 0.7); ctx.stroke(); continue; }
      // 極淡暖色面: 從身側到前緣
      ctx.fillStyle = 'rgba(255,236,200,0.12)'; ctx.fillRect(Math.min(x, fx), y - fh, Math.abs(fx - x), fh * 2);
      // 速度線(往外流動), 都在前緣之內
      ctx.lineCap = 'round'; ctx.strokeStyle = 'rgba(255,250,240,0.55)'; ctx.lineWidth = 2;
      for (i = 0; i < 5; i++) {
        var ly = y + (i - 2) * fh * 0.36, ln = Math.min(f - b, 18 + 10 * hash(i, side + 3)), ls = Math.max(0, f - b - 4 - ln - 6 * hash(i, 7));
        if (ln < 3) continue;
        ctx.beginPath(); ctx.moveTo(x + side * ls, ly); ctx.lineTo(x + side * (ls + ln), ly); ctx.stroke();
      }
      // 弧形前緣(白粗線 + 內側淡橘細線)
      var lw = 7 * (1 - p) + 3;
      ctx.beginPath(); ctx.moveTo(fx - side * b, y - fh); ctx.quadraticCurveTo(fx + side * b * 0.9 - side * lw / 2, y, fx - side * b, y + fh);
      ctx.lineWidth = lw; ctx.strokeStyle = 'rgba(255,250,240,0.92)'; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(fx - side * (b + lw + 2), y - fh * 0.85); ctx.quadraticCurveTo(fx - side * (lw + 4) + side * b * 0.5, y, fx - side * (b + lw + 2), y + fh * 0.85);
      ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(242,140,40,0.7)'; ctx.stroke();
      // 往外的小箭頭(兩顆, 前緣後方)
      ctx.fillStyle = 'rgba(255,255,255,0.88)';
      for (i = -1; i <= 1; i += 2) { var axx = fx - side * (b + lw + 10); if ((axx - x) * side < 6) continue; poly(ctx, [axx + side * 5, y + i * fh * 0.42, axx - side * 3, y + i * fh * 0.42 - 4, axx - side * 3, y + i * fh * 0.42 + 4]); ctx.fill(); }
      // 撞牆: 牆面一道亮白閃
      if (sq > 0) { ctx.fillStyle = 'rgba(255,250,235,' + (0.8 * (1 - sq * 0.6)).toFixed(3) + ')'; ctx.fillRect(side < 0 ? left : right - 3, y - hh, 3, hh * 2); }
    }
    ctx.restore();
  }
  function drawPoof(ctx, st) {
    st = obj(st);
    var x = num(st.x, 0), y = num(st.y, 0), dur = Math.max(0.01, num(st.dur, 0.5)), p = clamp(num(st.t, 0) / dur, 0, 1);
    var size = oneOf(st.size, ['small', 'big', 'huge'], 'small'), k = size === 'huge' ? 5.6 : (size === 'big' ? 1.85 : 1);
    ctx.save(); ctx.translate(x, y); ctx.scale(k, k);
    ctx.globalAlpha *= 1 - p;
    var pts = [[0, 0, 9], [-9, -4, 7], [9, -3, 7], [-5, 8, 6], [6, 8, 6], [0, -10, 6]];
    for (var i = 0; i < pts.length; i++) { var q = pts[i], sp = 1 + p * 0.75; circle(ctx, q[0] * sp, q[1] * sp, q[2] * (0.8 + p * 0.4)); ctx.fillStyle = i % 2 ? '#d8dce4' : '#b8bec9'; ctx.fill(); }
    if (size !== 'small') { ctx.fillStyle = size === 'huge' ? '#c9a674' : '#8a6a9a'; for (i = 0; i < 6; i++) { var a = i * TAU / 6 + 0.4, d = 6 + 14 * eOut(p); poly(ctx, [Math.cos(a) * d - 2, Math.sin(a) * d, Math.cos(a) * d, Math.sin(a) * d - 2.5, Math.cos(a) * d + 2, Math.sin(a) * d + 1]); ctx.fill(); } }
    ctx.restore();
  }
  function drawPopup(ctx, st) {
    st = obj(st);
    var x = num(st.x, 0), y = num(st.y, 0), dur = Math.max(0.01, num(st.dur, 0.8)), p = clamp(num(st.t, 0) / dur, 0, 1);
    var kind = oneOf(st.kind, KINDS, 'wood'), v = Math.round(clamp(num(st.value, 1), 0, 999));
    ctx.save();
    ctx.translate(x, y - 30 * p);
    ctx.globalAlpha *= p < 0.6 ? 1 : 1 - (p - 0.6) / 0.4;
    matIcon(ctx, kind, -17, 0, 16);
    text(ctx, '+' + v, -7, 0.5, 17, PAL[kind + 'Light'], 'left', true, 3.5, 'rgba(8,10,18,0.92)');
    ctx.restore();
  }
  function drawChainText(ctx, st) {
    st = obj(st);
    var x = num(st.x, 0), y = num(st.y, 0), dur = Math.max(0.01, num(st.dur, 0.8)), p = clamp(num(st.t, 0) / dur, 0, 1);
    var n = Math.round(clamp(num(st.n, 2), 0, 99));
    var pop = p < 0.12 ? 1 + 0.3 * (p / 0.12) : (p < 0.25 ? 1.3 - 0.3 * ((p - 0.12) / 0.13) : 1);
    ctx.save(); ctx.translate(x, y - 30 * p); ctx.scale(pop, pop);
    ctx.globalAlpha *= p < 0.65 ? 1 : 1 - (p - 0.65) / 0.35;
    text(ctx, n + ' 連鎖', 0, 0, 24, K.select, 'center', true, 4, 'rgba(8,10,18,0.92)');
    ctx.restore();
  }

  // ================= 裝置圖示(devices 方案 C 嵌牆圓盤機關; 倉庫、準備頁、卡片裝置格、商店、獲得提示、結算共用) =================
  // 方石座 + 四角鉚釘 + 外環(顏色 = 種類)+ 中心大符號。畫面上小於 24px 時拿掉鉚釘與細節, 只留「色環 + 符號」
  var DEV_PLATE = '#4a4652', DEV_PLATE_L = '#6a6574', DEV_INK = '#140e08', DEV_WELL = '#1d1a24';
  var DEV_RIM = { bagWood: PAL.wood, bagStone: PAL.stone, bagCrystal: PAL.crystal, coreLamp: PAL.core, glove: PAL.gold, horn: '#e0843a', heart: PAL.brood, gear: '#c98a3a' };
  var DEV_MAT = { bagWood: 'wood', bagStone: 'stone', bagCrystal: 'crystal', coreLamp: 'core' };
  function itemIcon(ctx, type, x, y, size) {
    type = oneOf(type, ITEMS, 'bagWood'); size = clamp(num(size, 32), 8, 160);
    var k = size / 32, small = size * scaleOf(ctx).rel < 24, lw = Math.max(1.6, 1.1 / k), rim = DEV_RIM[type], i, a;
    ctx.save(); ctx.translate(x, y); ctx.scale(k, k);
    ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.lineWidth = lw; ctx.strokeStyle = DEV_INK;
    // 方石座(嵌在牆上)
    var ph = 16 - lw / 2; // 方石座描邊整條收在 size 框內
    rr(ctx, -ph, -ph, ph * 2, ph * 2, 4); ctx.fillStyle = DEV_PLATE; ctx.fill(); ctx.stroke();
    if (!small) {
      rr(ctx, -13.5, -13.5, 27, 4, 2); ctx.fillStyle = DEV_PLATE_L; ctx.fill();
      ctx.fillStyle = '#c9c2b0'; var rv = [[-12, -12], [12, -12], [-12, 12], [12, 12]];
      for (i = 0; i < 4; i++) { circle(ctx, rv[i][0], rv[i][1], 1.5); ctx.fill(); }
    }
    // 外環
    if (type === 'gear') { // 銅色齒環
      ctx.beginPath();
      for (i = 0; i < 12; i++) { a = i * TAU / 12; ctx.lineTo(Math.cos(a - 0.12) * 13.6, Math.sin(a - 0.12) * 13.6); ctx.lineTo(Math.cos(a + 0.12) * 13.6, Math.sin(a + 0.12) * 13.6); ctx.lineTo(Math.cos(a + 0.26) * 11.2, Math.sin(a + 0.26) * 11.2); }
      ctx.closePath(); ctx.fillStyle = rim; ctx.fill(); ctx.stroke();
    } else {
      if (type === 'heart') { // 巢心: 紫環發光(光暈至多外擴 4px)
        circle(ctx, 0, 0, 15.5 + 4 / k); ctx.fillStyle = rad(ctx, 0, 0, 12, 15.5 + 4 / k, [0, 'rgba(194,100,255,0.75)', 1, 'rgba(194,100,255,0)']); ctx.fill();
      }
      circle(ctx, 0, 0, 12.6); ctx.fillStyle = rim; ctx.fill(); ctx.stroke();
    }
    circle(ctx, 0, 0, 9.4); ctx.fillStyle = DEV_WELL; ctx.fill(); ctx.lineWidth = lw * 0.7; ctx.stroke(); ctx.lineWidth = lw;
    // 中心符號
    if (DEV_MAT[type]) { // 聚X: 四個向內凹口 + 該素材圖示(同 drawPickup)
      ctx.fillStyle = DEV_WELL;
      for (i = 0; i < 4; i++) { a = i * TAU / 4 - Math.PI / 4; var cx = Math.cos(a), cy = Math.sin(a), qx = -cy, qy = cx; poly(ctx, [cx * 13.4 + qx * 2.6, cy * 13.4 + qy * 2.6, cx * 13.4 - qx * 2.6, cy * 13.4 - qy * 2.6, cx * 10, cy * 10]); ctx.fill(); }
      matIcon(ctx, DEV_MAT[type], 0, 0, 13, small);
    } else if (type === 'glove') { // 拾遺: 磁鐵 + 金星
      ctx.lineWidth = lw * 2.2; ctx.strokeStyle = '#e8e2d4'; ctx.lineCap = 'butt';
      ctx.beginPath(); ctx.moveTo(-4.5, -4); ctx.lineTo(-4.5, 0.5); ctx.arc(0, 0.5, 4.5, Math.PI, 0, true); ctx.lineTo(4.5, -4); ctx.stroke();
      ctx.strokeStyle = '#8d97a6'; ctx.beginPath(); ctx.moveTo(-4.5, -6.5); ctx.lineTo(-4.5, -4); ctx.moveTo(4.5, -6.5); ctx.lineTo(4.5, -4); ctx.stroke();
      ctx.lineCap = 'round'; ctx.lineWidth = lw; ctx.strokeStyle = DEV_INK;
      star4(ctx, 0, -4, 2.8); ctx.fillStyle = rim; ctx.fill();
    } else if (type === 'horn') { // 驅獸: 號角
      ctx.beginPath(); ctx.moveTo(-7, 4); ctx.quadraticCurveTo(-2, -0.5, 4, -6); ctx.lineTo(7, -2.5); ctx.quadraticCurveTo(0, 2.5, -5.5, 7); ctx.closePath();
      ctx.fillStyle = '#efe2c4'; ctx.fill(); ctx.lineWidth = lw * 0.7; ctx.stroke();
      ell(ctx, 5.6, -4.3, 1.8, 2.8); ctx.fillStyle = rim; ctx.fill();
    } else if (type === 'heart') { // 巢心: 金邊紫心
      ctx.save(); ctx.scale(0.5, 0.5); ctx.translate(0, 0.5);
      ctx.beginPath(); ctx.moveTo(0, 12); ctx.bezierCurveTo(-15, 2, -13, -12, -5, -11); ctx.quadraticCurveTo(-1, -10, 0, -6); ctx.quadraticCurveTo(1, -10, 5, -11); ctx.bezierCurveTo(13, -12, 15, 2, 0, 12); ctx.closePath();
      ctx.fillStyle = '#b05ae8'; ctx.fill(); ctx.lineWidth = lw * 2; ctx.strokeStyle = PAL.gold; ctx.stroke(); ctx.restore();
    } else { // 疾時: 白色 ▶▶
      ctx.fillStyle = '#ffffff'; poly(ctx, [-6, -4.5, -1, 0, -6, 4.5]); ctx.fill(); poly(ctx, [-0.5, -4.5, 4.5, 0, -0.5, 4.5]); ctx.fill();
    }
    ctx.restore();
  }
  function drawItemIcon(ctx, st) { st = obj(st); ctx.save(); itemIcon(ctx, st.type, num(st.x, 0), num(st.y, 0), num(st.size, 32)); ctx.restore(); }

  function drawItemNotice(ctx, st) {
    st = obj(st);
    var type = oneOf(st.type, ITEMS, 'bagWood'), dur = Math.max(0.01, num(st.dur, 1.5)), t = clamp(num(st.t, 0), 0, dur);
    var a = t < 0.2 ? t / 0.2 : (t > dur - 0.3 ? (dur - t) / 0.3 : 1);
    ctx.save();
    ctx.globalAlpha *= clamp(a, 0, 1);
    rr(ctx, 441, 101, 398, 42, 8); ctx.fillStyle = K.parch; ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = type === 'heart' ? PAL.brood : K.select; ctx.stroke();
    var s = '獲得 ' + ITEM_NAME[type], w = tw(ctx, s, 20, true), x0 = 640 - (32 + 10 + w) / 2;
    itemIcon(ctx, type, x0 + 16, 122, 30);
    text(ctx, s, x0 + 42, 122.5, 20, K.ink, 'left', true);
    ctx.restore();
  }

  // ================= 資訊列 / 聲音開關 =================
  function heartShape(ctx, cx, cy, s) {
    ctx.save(); ctx.translate(cx, cy); ctx.scale(s, s);
    ctx.beginPath(); ctx.moveTo(0, 6); ctx.bezierCurveTo(-9, 0, -7, -7, -3, -6); ctx.quadraticCurveTo(-1, -6, 0, -3); ctx.quadraticCurveTo(1, -6, 3, -6); ctx.bezierCurveTo(7, -7, 9, 0, 0, 6); ctx.closePath();
    ctx.restore();
  }
  function drawHud(ctx, st) {
    st = obj(st);
    var mode = st.mode === 'level' ? 'level' : 'map', stock = mats(st.stock), rate = mats(st.ratePerMin), bump = obj(st.bumpT);
    var bDur = Math.max(0.01, num(st.bumpDur, 0.2)), i;
    ctx.save();
    ctx.fillStyle = K.board; ctx.fillRect(0, 0, W, 40);
    ctx.fillStyle = K.plankUi; ctx.fillRect(0, 0, W, 19);
    ctx.fillStyle = K.seam; ctx.fillRect(0, 19, W, 1.5);
    ctx.fillStyle = K.edge; ctx.fillRect(0, 37, W, 3);
    for (i = 0; i < 4; i++) {
      var k = KINDS[i], x0 = HUD_X[k], bt = clamp(num(bump[k], bDur), 0, bDur), bq = bt / bDur, on = bq < 1, s = on ? Math.sin(Math.PI * bq) : 0;
      ctx.save(); ctx.translate(x0 + 81, 20); ctx.scale(1, 1 - 0.15 * s); ctx.translate(-x0 - 81, -20);
      rr(ctx, x0, 4, 162, 32, 5); ctx.fillStyle = K.parch; ctx.fill(); ctx.lineWidth = on ? 2.5 : 1.5; ctx.strokeStyle = on ? K.select : K.edge; ctx.stroke();
      ctx.restore();
      ctx.save(); ctx.translate(x0 + 20, 20); ctx.scale(1 + 0.25 * s, 1 - 0.2 * s); matIcon(ctx, k, 0, 0, 22); ctx.restore();
      ctx.save(); ctx.translate(x0 + 36, 21); ctx.scale(1 + 0.3 * s, 1 + 0.3 * s); text(ctx, intStr(stock[k]), 0, 0, 19, K.ink, 'left', true); ctx.restore();
      var rs = '+' + fmt1(clamp(rate[k], 0, 1e6)) + '/分';
      // 觸控模式: 產量字拉到 21px 後會撞到庫存數字, 寬度不夠時水平壓縮進庫存數字右邊的空間
      if (isTouchOn()) fitText(ctx, rs, x0 + 157, 21, 11, KIND_INK[k], Math.max(40, 157 - 36 - tw(ctx, intStr(stock[k]), 19, true) - 8), 'right');
      else text(ctx, rs, x0 + 157, 21, 11, KIND_INK[k], 'right', true);
      if (on) { // 投幣火花(至多 12px, 可超出資訊列下緣)
        ctx.save(); ctx.globalAlpha *= 1 - bq; ctx.strokeStyle = PAL[k + 'Light']; ctx.lineWidth = 2; ctx.lineCap = 'round';
        for (var j = 0; j < 5; j++) { var a = -Math.PI * (0.1 + j * 0.2), r1 = 11 + bq * 4, r2 = 14 + bq * 10; ctx.beginPath(); ctx.moveTo(x0 + 20 + Math.cos(a) * r1, 20 + Math.sin(a) * r1); ctx.lineTo(x0 + 20 + Math.cos(a) * r2, 20 + Math.sin(a) * r2); ctx.stroke(); }
        ctx.restore();
      }
    }
    if (mode === 'level') {
      var maxHp = clamp(Math.round(num(st.maxHp, 3)), 1, 9), hp = clamp(Math.round(num(st.hp, maxHp)), 0, maxHp);
      rr(ctx, 724, 4, 28 * maxHp + 20, 32, 5); ctx.fillStyle = K.parch; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = K.edge; ctx.stroke();
      for (i = 0; i < maxHp; i++) {
        heartShape(ctx, 748 + i * 28, 21, 1.3);
        if (i < hp) { ctx.fillStyle = PAL.hp; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = '#7a1420'; ctx.stroke(); }
        else { ctx.lineWidth = 1.8; ctx.strokeStyle = '#8a7a60'; ctx.stroke(); }
      }
      var tx = 724 + 28 * maxHp + 30;
      rr(ctx, tx, 4, 118, 32, 5); ctx.fillStyle = K.parch; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = K.edge; ctx.stroke();
      circle(ctx, tx + 17, 20, 7); ctx.lineWidth = 2; ctx.strokeStyle = K.ink; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(tx + 17, 20); ctx.lineTo(tx + 17, 15.5); ctx.moveTo(tx + 17, 20); ctx.lineTo(tx + 20.5, 20); ctx.stroke();
      text(ctx, fmt1(clamp(num(st.time, 0), 0, 99999)) + 's', tx + 30, 21, 18, K.ink, 'left', true);
    }
    ctx.restore();
  }
  function speaker(ctx, s, on, col) {
    ctx.save(); ctx.scale(s, s);
    poly(ctx, [-8, -3, -4, -3, 1, -8, 1, 8, -4, 3, -8, 3]); ctx.fillStyle = col; ctx.fill();
    ctx.strokeStyle = col; ctx.lineWidth = 1.8; ctx.lineCap = 'round';
    if (on) { ctx.beginPath(); ctx.arc(2, 0, 4.5, -0.9, 0.9); ctx.stroke(); ctx.beginPath(); ctx.arc(2, 0, 8, -0.9, 0.9); ctx.stroke(); }
    else { ctx.beginPath(); ctx.moveTo(4, -4); ctx.lineTo(10, 4); ctx.moveTo(10, -4); ctx.lineTo(4, 4); ctx.stroke(); }
    ctx.restore();
  }
  function drawSoundIcon(ctx, st) {
    st = obj(st);
    var x = num(st.x, 1250), y = num(st.y, 62), on = st.on !== false, al = clamp(num(st.alpha, 1), 0, 1);
    ctx.save(); ctx.globalAlpha *= al; // 關卡內碰到物件時 RD 傳 0.3; 畫法不依位置改變(左上 / 右上同一個樣子)
    rr(ctx, x - 18, y - 15, 36, 33, 6); ctx.fillStyle = on ? '#8f8471' : '#55504a'; ctx.fill();
    rr(ctx, x - 18, y - 18, 36, 33, 6); ctx.fillStyle = on ? '#ece4d2' : '#a9a59a'; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = K.edge; ctx.stroke();
    ctx.save(); ctx.translate(x - 3, y - 3); speaker(ctx, 1, on, on ? K.ink : '#4a4538'); ctx.restore();
    text(ctx, 'M', x + 11, y + 8.5, 10, on ? K.inkDim : '#4a4538', 'center', true);
    ctx.restore();
  }

  // ================= 新手教學(polish 第 5 輪重做: tut-arrow B 大箭頭 + tut-text B 泡泡 + tut-spotlight B 聚光燈) =================
  // 教學專用長相: 金色漫畫貼紙大箭頭、深色木板泡泡 + 每字彈跳; 金 = 介面選中 / 教學指向(全遊戲同一個意思)
  function stamp(ctx, x, y, q) {
    var s = q < 0.3 ? 1.6 - 0.6 * (q / 0.3) : 1;
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.rotate(-0.2);
    circle(ctx, 0, 0, 15); ctx.fillStyle = K.good; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = '#ffffff'; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-7, 0); ctx.lineTo(-2, 6); ctx.lineTo(8, -6); ctx.lineWidth = 3.5; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = '#ffffff'; ctx.stroke();
    ctx.restore();
  }
  function burst(ctx, x, y, q, n, R) {
    ctx.save(); ctx.fillStyle = K.select;
    for (var i = 0; i < n; i++) { var a = i * TAU / n - Math.PI / 2, d = R * eOut(q); star4(ctx, x + Math.cos(a) * d, y + Math.sin(a) * d, 5 * (1 - q * 0.6)); ctx.fill(); }
    ctx.restore();
  }
  function eBack(p) { p = clamp(p, 0, 1); var c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2); }
  function eInOut(p) { p = clamp(p, 0, 1); return p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2; }
  // 向量小工具(大箭頭用)
  function V(x, y) { return { x: x, y: y }; }
  function vAdd(a, b) { return V(a.x + b.x, a.y + b.y); }
  function vSub(a, b) { return V(a.x - b.x, a.y - b.y); }
  function vMul(a, k) { return V(a.x * k, a.y * k); }
  function vLen(a) { return Math.sqrt(a.x * a.x + a.y * a.y) || 1; }
  function vNorm(a) { var l = vLen(a); return V(a.x / l, a.y / l); }
  function vPerp(a) { return V(-a.y, a.x); }
  function vRot(a, r) { var c = Math.cos(r), s = Math.sin(r); return V(a.x * c - a.y * s, a.x * s + a.y * c); }
  function vQuad(a, c, b, u) { var v = 1 - u; return V(v * v * a.x + 2 * v * u * c.x + u * u * b.x, v * v * a.y + 2 * v * u * c.y + u * u * b.y); }
  function polyV(ctx, pts) { ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y); for (var i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y); }

  // ---------- 大箭頭(tut-arrow B 漫畫貼紙箭頭; polish 第 6 輪改成單一平順二次貝茲) ----------
  // 幾何照介面公式: â = (aim − tip) 單位向量; 箭尾 S = 提示板該邊 along 點往板內縮 6px; 底座 B = tip − â·36;
  // 控制點 C = B − â·(|B − S| / 2)(末端切線 = â, 中段不轉折); 箭頭 = B 兩側各 24px 的倒鉤三角(寬 48), 尖端在 tip。
  // 箭身半寬沿曲線 5 → 10。外觀: 金色緞帶 + 右下深金厚度 + 粗黑描邊 + 白色高光線。
  // 1 秒一圈: 0~0.4 拉弓(只有尖端沿 −â 縮回至多 10px, 箭尾不動)→ 0.4~0.5 彈回 → 0.5 起尖端在 tip, 箭頭沿 â 壓扁回彈 + 衝擊刺。
  // grow 0~1 = 沿曲線從箭尾長到尖端(進場 arrowsT / 收起 outT 共用)。
  var TA = { HEAD: 36, HW: 24, W0: 5, W1: 10, PULL: 10, INSET: 6, EDGE: 12 };
  function tutTail(a, R) { // R = 提示板實際矩形 { x, y, w, h }; 回傳箭尾 S(已往板內縮 6px)
    var side = oneOf(a.side, ['top', 'bottom', 'left', 'right'], 'bottom'), e = TA.EDGE, in6 = TA.INSET;
    if (side === 'top' || side === 'bottom') {
      var ax = clamp(num(a.along, R.x + R.w / 2), R.x + e, Math.max(R.x + e, R.x + R.w - e));
      return { S: V(ax, side === 'top' ? R.y + in6 : R.y + R.h - in6), n: V(0, side === 'top' ? -1 : 1) };
    }
    var ay = clamp(num(a.along, R.y + R.h / 2), R.y + e, Math.max(R.y + e, R.y + R.h - e));
    return { S: V(side === 'left' ? R.x + in6 : R.x + R.w - in6, ay), n: V(side === 'left' ? -1 : 1, 0) };
  }
  function tutArrowB(ctx, a, S, t, grow) {
    var T = V(num(a.tipX, 640), num(a.tipY, 360)), A = V(num(a.aimX, T.x), num(a.aimY, T.y + 1));
    var dA = vSub(A, T), ah = Math.sqrt(dA.x * dA.x + dA.y * dA.y) > 0.5 ? vNorm(dA) : vNorm(vSub(T, S)); // 瞄準點與尖端重合時退回弦方向
    var c = fr(t), pull = 0, sq = 1, impact = -1, speed = 0;
    if (c < 0.4) pull = TA.PULL * sm(c / 0.4);
    else if (c < 0.5) { var q = (c - 0.4) / 0.1; pull = TA.PULL * (1 - q * q); speed = q; }
    else { var x = c - 0.5, damp = Math.exp(-7 * x) * Math.cos(18 * x); sq = 1 - 0.22 * Math.max(0, damp); impact = x / 0.3; speed = clamp(1 - x / 0.12, 0, 1); }
    if (grow < 1) { pull = 0; sq = 1; impact = -1; speed = 0; }
    var Tp = vSub(T, vMul(ah, pull));                    // 拉弓: 只有尖端縮回
    var B = vSub(Tp, vMul(ah, TA.HEAD)), C = vSub(B, vMul(ah, vLen(vSub(B, S)) / 2));
    // 進場 / 收起: de Casteljau 截取 0~g 的那段曲線, 箭頭跟著長出
    var g = clamp(grow, 0, 1), hs = 1, Bc = B, Cc = C, hd = ah;
    if (g < 1) {
      var gq = eOut(g), Cg = V(S.x + (C.x - S.x) * gq, S.y + (C.y - S.y) * gq);
      Bc = vQuad(S, C, B, gq); Cc = Cg; hd = vNorm(vSub(Bc, Cg)); if (vLen(vSub(Bc, Cg)) < 0.01) hd = ah;
      hs = clamp(gq, 0.15, 1);
    }
    var hl = TA.HEAD * hs * sq, hw = TA.HW * hs * (1 + (1 - sq) * 0.8);      // 壓扁: 箭頭變短變寬, 尖端不動、箭尾不動
    var P = vAdd(Bc, vMul(hd, TA.HEAD * hs)), Bh = vSub(P, vMul(hd, hl));
    var Pi = vSub(P, vMul(hd, 2.5));                                        // 尖端內縮 2.5: 粗描邊外緣剛好到 tip
    var nh = vPerp(hd), N = 24, left = [], right = [], i, wEnd = TA.W0 + (TA.W1 - TA.W0) * (g < 1 ? eOut(g) : 1);
    function tanAt(u) { var d = vAdd(vMul(vSub(Cc, S), 2 * (1 - u)), vMul(vSub(Bh, Cc), 2 * u)); return vLen(d) < 0.01 ? hd : vNorm(d); }
    for (i = 0; i <= N; i++) {
      var u = i / N, pt = vQuad(S, Cc, Bh, u), nn = vPerp(tanAt(u)), w = TA.W0 + (wEnd - TA.W0) * u;
      left.push(vAdd(pt, vMul(nn, w))); right.push(vSub(pt, vMul(nn, w)));
    }
    var shape = left.slice();
    shape.push(vAdd(Bh, vMul(nh, Math.min(wEnd, hw))), vSub(vAdd(Bh, vMul(nh, hw)), vMul(hd, 6 * hs)), Pi, vSub(vSub(Bh, vMul(nh, hw)), vMul(hd, 6 * hs)), vSub(Bh, vMul(nh, Math.min(wEnd, hw))));
    for (i = N; i >= 0; i--) shape.push(right[i]);
    function path() { polyV(ctx, shape); ctx.closePath(); }
    ctx.save();
    if (g < 1) ctx.globalAlpha *= clamp(g * 4, 0, 1);
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    if (speed > 0) { // 彈射速度線: 箭頭兩側後方各一條, 平行於 â
      ctx.save(); ctx.globalAlpha *= speed; ctx.strokeStyle = '#fff6c8'; ctx.lineWidth = 3;
      for (i = -1; i <= 1; i += 2) { var s0 = vAdd(vSub(Bh, vMul(hd, 10)), vMul(nh, i * (hw + 6))), s1 = vAdd(vSub(Bh, vMul(hd, 34)), vMul(nh, i * (hw + 6))); ctx.beginPath(); ctx.moveTo(s0.x, s0.y); ctx.lineTo(s1.x, s1.y); ctx.stroke(); }
      ctx.restore();
    }
    // 厚度: 往右下擠出, 但不往指向方向前進(不超過尖端)
    var off = V(3, 4), pr = off.x * hd.x + off.y * hd.y; if (pr > 0) off = vSub(off, vMul(hd, pr));
    ctx.save(); ctx.translate(off.x, off.y); path(); ctx.fillStyle = K.selectDeep; ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = K.edge; ctx.stroke(); ctx.restore();
    path(); ctx.fillStyle = lin(ctx, S.x, S.y, P.x, P.y, [0, '#ffe98a', 0.6, K.select, 1, '#ffc928']); ctx.fill();
    ctx.lineWidth = 4; ctx.strokeStyle = K.edge; ctx.stroke();
    // 白色高光: 箭身一條 + 箭頭一道
    ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 2.5;
    var hp = [];
    for (i = 3; i <= 20; i++) { var uu = i / N, pp = vQuad(S, Cc, Bh, uu); hp.push(vAdd(pp, vMul(vPerp(tanAt(uu)), (TA.W0 + (wEnd - TA.W0) * uu) * 0.42))); }
    polyV(ctx, hp); ctx.stroke();
    var h0 = vAdd(vSub(Bh, vMul(hd, 2)), vMul(nh, hw * 0.55)), h1 = vAdd(vSub(Pi, vMul(hd, 10 * hs)), vMul(nh, 3 * hs));
    ctx.beginPath(); ctx.moveTo(h0.x, h0.y); ctx.lineTo(h1.x, h1.y); ctx.stroke();
    ctx.restore();
    if (impact >= 0 && impact <= 1) { // 衝擊刺: 尖端往箭尾那側扇開(與指向反方向夾角 < 90°), 不蓋目標
      ctx.save(); ctx.globalAlpha *= 1 - impact; ctx.lineJoin = 'round';
      var bk = vMul(hd, -1), angs = [0.8, -0.8, 1.15, -1.15, 1.45, -1.45];
      for (i = 0; i < angs.length; i++) {
        var dv = vRot(bk, angs[i]), pv = vPerp(dv), r0 = 30 + 8 * impact, r1 = r0 + 6 + 12 * (1 - impact) * (i < 2 ? 1.2 : 1);
        var b1 = vAdd(vAdd(P, vMul(dv, r0)), vMul(pv, 3.5)), b2 = vSub(vAdd(P, vMul(dv, r0)), vMul(pv, 3.5)), tp = vAdd(P, vMul(dv, r1));
        ctx.beginPath(); ctx.moveTo(b1.x, b1.y); ctx.lineTo(tp.x, tp.y); ctx.lineTo(b2.x, b2.y); ctx.closePath();
        ctx.fillStyle = i < 2 ? '#ffffff' : K.select; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = K.edge; ctx.stroke();
      }
      ctx.restore();
    }
  }

  // ---------- 提示板(tut-text B 深色木板; polish 第 6 輪: 無尖角、整句尺寸、逐行置中、\n 強制換行) ----------
  var TB = { px: 30, lh: 46, padX: 30, padY: 22, maxW: 560, kpx: 24, minNext: 140, inDur: 0.25 };
  var TUT_TIME = { ch: 0.045, key: 0.10, hold: 0.12, pop: 0.15, fade: 0.25 }; // 逐字規則(與 RD 同一條)
  var PUNCT_HOLD = ',，、!！。';               // 之後多停 0.12 秒
  var NO_LEAD = ',，、!！。?？;；:：)）」』》〉'; // 不放行首
  function tutTokens(s) { // [關鍵詞]、{Z} 句中按鍵、\n 強制換行; 其餘每字一個
    var o = [], i = 0, hl = false;
    s = typeof s === 'string' ? s : '';
    while (i < s.length && o.length < 400) {
      var c = s.charAt(i);
      if (c === '[') { hl = true; i++; continue; }
      if (c === ']') { hl = false; i++; continue; }
      if (c === '\n') { o.push({ nl: true }); i++; continue; }
      if (c === '\r') { i++; continue; }
      if (c === '{') { var j = s.indexOf('}', i); if (j > i && j - i <= 6) { o.push({ k: s.substring(i + 1, j) }); i = j + 1; continue; } }
      o.push({ c: c, hl: hl }); i++;
    }
    return o;
  }
  function tutTimes(tk) { // 每個字出現的累計時刻
    var t = 0, r = [];
    for (var i = 0; i < tk.length; i++) {
      r.push(t);
      if (tk[i].nl) continue;
      t += tk[i].k !== undefined ? TUT_TIME.key : TUT_TIME.ch;
      if (tk[i].c && PUNCT_HOLD.indexOf(tk[i].c) >= 0) t += TUT_TIME.hold;
    }
    return r;
  }
  function tutLayout(ctx, tk) { // 回傳每個字的 (行內 x, 行號, 寬) 與每行寬; 繪製時逐行置中
    var x = 0, line = 0, out = [], lw = [0], kw = TB.px * 1.7;
    for (var i = 0; i < tk.length; i++) {
      var k = tk[i];
      if (k.nl) { out.push({ x: x, line: line, w: 0 }); x = 0; line++; lw.push(0); continue; }
      var w = k.k !== undefined ? kw : tw(ctx, k.c, TB.px, true);
      if (x + w > TB.maxW && x > 0 && !(k.c && NO_LEAD.indexOf(k.c) >= 0)) { x = 0; line++; lw.push(0); }
      if (x === 0 && k.c === ' ') w = 0;
      out.push({ x: x, line: line, w: w }); x += w; lw[line] = x;
    }
    var mx = 0; for (i = 0; i < lw.length; i++) mx = Math.max(mx, lw[i]);
    return { items: out, lines: lw.length, lw: lw, maxW: mx };
  }
  function boardSize(L, hasNext) { return { w: Math.max(hasNext ? TB.minNext : 0, L.maxW + TB.padX * 2), h: L.lines * TB.lh + TB.padY * 2 }; }
  // 提示板的版面(箭尾也用它): 實際排好的矩形 + 進場 / 收起的縮放與淡出(以板子中心)
  function tutBoard(ctx, b) {
    var x = num(b.x, 640), y = num(b.y, 300), place = b.place === 'below' ? 'below' : 'above';
    var hasCont = typeof b.cont === 'string', hasNext = !!(b.next && typeof b.next === 'object');
    var tk1 = tutTokens(b.text), tk2 = hasCont ? tutTokens(b.cont) : [], tk = tk1.concat(tk2);
    var Lf = tutLayout(ctx, tk), szF = boardSize(Lf, hasNext), bw = szF.w, bh = szF.h;
    var contT = b.contT == null ? null : num(b.contT, 0);
    if (hasCont && contT != null && contT < 0.2) { // 接句: 決定接句那一刻以 0.2 秒長到新大小
      var sz1 = boardSize(tutLayout(ctx, tk1), hasNext), gq = sm(clamp(contT, 0, 0.2) / 0.2);
      bw = lerp(sz1.w, szF.w, gq); bh = lerp(sz1.h, szF.h, gq);
    }
    var bx = clamp(x - bw / 2, 20, Math.max(20, 1260 - bw)), by = place === 'above' ? y - bh : y;
    var inQ = clamp(num(b.inT, TB.inDur), 0, TB.inDur) / TB.inDur, outT = b.outT == null ? null : clamp(num(b.outT, 0), 0, 0.25);
    var sc = 0.6 + 0.4 * eBack(inQ), al = clamp(inQ / 0.5, 0, 1);
    if (outT != null) { var oq = outT / 0.25; sc *= 1 - 0.85 * eOut(oq); al *= 1 - oq; }
    return { x: bx, y: by, w: bw, h: bh, cx: bx + bw / 2, cy: by + bh / 2, sc: sc, al: al, tk1: tk1, tk2: tk2, tk: tk, L: Lf, contT: contT, outQ: outT == null ? 0 : outT / 0.25 };
  }
  // 「按 Z 繼續」徽章(提示板與操作方式面板共用): Z 按鍵外觀中心 (kx, ky) + 左邊小字 label + 每秒外擴一圈金環(≤18px)並輕輕一鼓
  function nextBadge(ctx, kx, ky, t, label, key, k) {
    k = k == null ? 1 : k; if (k <= 0.001) return;
    var ph = fr(t), lab = str(label, '繼續');
    ctx.save(); ctx.translate(kx, ky); ctx.scale(k, k);
    circle(ctx, 0, 0, 18 + 18 * eOut(ph)); ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(255,216,74,' + (0.85 * (1 - ph)).toFixed(3) + ')'; ctx.stroke();
    var lw = tw(ctx, lab, 16, true) + 18;
    rr(ctx, -26 - lw, -13, lw, 26, 6); ctx.fillStyle = K.parch; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = K.edge; ctx.stroke();
    text(ctx, lab, -26 - lw / 2, 1, 16, K.ink, 'center', true);
    var pop = 1 + 0.08 * Math.max(0, Math.sin(ph * TAU));
    ctx.scale(pop, pop); keycap(ctx, key === 'x' ? 'x' : 'z', 0, 0, 20, 'hot');
    ctx.restore();
  }
  function tutBubble(ctx, b, t, Bd) {
    if (Bd.al <= 0.001) return;
    var bx = Bd.x, by = Bd.y, bw = Bd.w, bh = Bd.h, tk = Bd.tk, tk1 = Bd.tk1, Lf = Bd.L;
    var r1 = tutTimes(tk1), r2 = tutTimes(Bd.tk2), typeT = num(b.typeT, 0), contT = Bd.contT, i;
    ctx.save();
    ctx.globalAlpha *= Bd.al;
    ctx.translate(Bd.cx, Bd.cy); ctx.scale(Bd.sc, Bd.sc); ctx.translate(-Bd.cx, -Bd.cy);
    // 深色木板: 落影 + 深木板 + 板縫 + 深邊 + 內側淡金線(沒有尾巴 / 尖角)
    rr(ctx, bx + 3, by + 6, bw, bh, 14); ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fill();
    rr(ctx, bx, by, bw, bh, 14); ctx.fillStyle = K.board; ctx.fill();
    ctx.save(); rr(ctx, bx, by, bw, bh, 14); ctx.clip();
    for (var yy = by + 26; yy < by + bh; yy += 26) { ctx.fillStyle = K.seam; ctx.fillRect(bx, yy, bw, 1.5); }
    ctx.restore();
    ctx.lineJoin = 'round'; ctx.lineWidth = 3; ctx.strokeStyle = K.edge;
    rr(ctx, bx + 1.5, by + 1.5, bw - 3, bh - 3, 13); ctx.stroke();
    rr(ctx, bx + 6, by + 6, bw - 12, bh - 12, 9); ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(255,216,74,0.35)'; ctx.stroke();
    // 字: 逐行水平置中、整塊垂直置中; 每字從下方 10px 彈起回彈落定(0.15 秒), 新字金色 0.25 秒內退成米白, 關鍵詞常駐金
    var y0 = by + bh / 2 - (Lf.lines * TB.lh) / 2 + TB.lh / 2;
    ctx.save(); rr(ctx, bx, by, bw, bh, 14); ctx.clip(); // 接句長大中, 還沒到的字不畫出板子
    for (i = 0; i < tk.length; i++) {
      if (tk[i].nl) continue;
      var first = i < tk1.length, rt = first ? r1[i] : r2[i - tk1.length], tt = first ? typeT : contT;
      if (tt == null || tt < 0 || tt < rt) continue;
      var it = Lf.items[i], age = tt - rt, q = seg(age, 0, TUT_TIME.pop), s = 0.4 + 0.6 * eBack(q), jy = 10 * (1 - eBack(q));
      var lx = bx + bw / 2 - Lf.lw[it.line] / 2;
      var cx = lx + it.x + it.w / 2, cy = y0 + it.line * TB.lh + jy;
      ctx.save(); ctx.translate(cx, cy); ctx.scale(s, s);
      if (tk[i].k !== undefined) keycap(ctx, tk[i].k, 0, -1, TB.kpx, 'normal');
      else if (tk[i].c !== ' ') text(ctx, tk[i].c, 0, 1, TB.px, tk[i].hl ? K.select : mix(K.select, K.cream, seg(age, 0, TUT_TIME.fade)), 'center', true, 6, K.edge);
      ctx.restore();
    }
    ctx.restore();
    var nx = b.next;
    if (nx && typeof nx === 'object' && nx.show === true) nextBadge(ctx, bx + bw - 34, by + bh, t, nx.label, nx.key);
    ctx.restore();
  }

  // ---------- 修復點聚光燈(tut-spotlight B) ----------
  function rrPath(ctx, x, y, w, h, r) { // 加進目前路徑(不 beginPath)
    r = Math.max(0, Math.min(r, w / 2, h / 2));
    ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
  }
  function spotClipOut(ctx, rects, e) { // 剪成「所有矩形外擴 e 的聯集之外」
    for (var i = 0; i < rects.length; i++) {
      var r = rects[i];
      ctx.beginPath(); ctx.rect(-60, -60, W + 120, H + 120); rrPath(ctx, r[0] - e, r[1] - e, r[2] + 2 * e, r[3] + 2 * e, Math.max(2, e + 2)); ctx.clip('evenodd');
    }
  }
  var SPOT_CACHE = {}, SPOT_CACHE_N = 0;
  function spotLayer(ctx, all, br, kk) { // 暗幕(柔邊多層)+ 光緣細線外暈
    var LAYERS = 7, STEP = 7, DIM = 0.72 * kk, LA = 1 - Math.pow(1 - DIM, 1 / LAYERS), i;
    ctx.save();
    ctx.beginPath(); ctx.rect(0, 40, W, H - 40); ctx.clip(); // 暗幕只蓋 y 40~720(不蓋資訊列)
    for (var L = 0; L < LAYERS; L++) { // 柔邊: 每層挖的洞比前一層大 7px, 越外越暗(約 49px 漸到 72%)
      ctx.save(); spotClipOut(ctx, all, br + L * STEP);
      ctx.fillStyle = 'rgba(6,7,16,' + LA.toFixed(4) + ')'; ctx.fillRect(0, 40, W, H - 40);
      ctx.restore();
    }
    ctx.save(); ctx.globalAlpha *= kk; spotClipOut(ctx, all, br);
    ctx.shadowColor = 'rgba(255,226,150,0.95)'; ctx.shadowBlur = 12; ctx.lineWidth = 2.5; ctx.strokeStyle = 'rgba(255,236,180,0.9)';
    for (i = 0; i < all.length; i++) { var g = all[i], e = br + 1.25; ctx.beginPath(); rrPath(ctx, g[0] - e, g[1] - e, g[2] + 2 * e, g[3] + 2 * e, Math.max(2, e + 2)); ctx.stroke(); }
    ctx.restore();
    ctx.restore();
  }
  function tutSpot(ctx, spot, t) {
    var kk = clamp(num(spot.k, 1), 0, 1), holes = arr(spot.holes).slice(0, 3), all = [], hs = [], i, j;
    if (kk <= 0.001) return;
    for (i = 0; i < holes.length; i++) {
      var h = obj(holes[i]), rs = arr(h.rects).slice(0, 6), ok = [];
      for (j = 0; j < rs.length; j++) { var r = arr(rs[j]); var q = [num(r[0], 0), num(r[1], 0), clamp(num(r[2], 0), 0, 1400), clamp(num(r[3], 0), 0, 800)]; ok.push(q); all.push(q); }
      if (!ok.length) continue;
      var x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
      for (j = 0; j < ok.length; j++) { x0 = Math.min(x0, ok[j][0]); y0 = Math.min(y0, ok[j][1]); x1 = Math.max(x1, ok[j][0] + ok[j][2]); y1 = Math.max(y1, ok[j][1] + ok[j][3]); }
      hs.push({ rects: ok, cx: num(h.cx, (x0 + x1) / 2), cy: num(h.cy, (y0 + y1) / 2), x0: x0, y0: y0, x1: x1, y1: y1 });
    }
    var p = fr(t / 2.4), br = Math.round(16 + 3 * Math.sin(p * TAU)); // 光洞外擴 ~16, 2.4 秒呼吸一圈(取整數 px 以便快取)
    ctx.save();
    // 暗幕 + 光緣很吃效能(多層 evenodd 裁切 + shadowBlur), 依「光洞矩形 + 外擴 + 解析度」快取成離屏圖, 每幀只貼圖; 淡入淡出用 globalAlpha
    var sc = ctx.getTransform ? ctx.getTransform().a : 1, key = br + '|' + sc.toFixed(3) + '|' + JSON.stringify(all), cv = SPOT_CACHE[key];
    if (!cv && typeof document !== 'undefined') {
      if (SPOT_CACHE_N > 12) { SPOT_CACHE = {}; SPOT_CACHE_N = 0; }
      cv = document.createElement('canvas'); cv.width = Math.ceil(W * sc); cv.height = Math.ceil(H * sc);
      var oc = cv.getContext('2d'); oc.setTransform(sc, 0, 0, sc, 0, 0); spotLayer(oc, all, br, 1);
      SPOT_CACHE[key] = cv; SPOT_CACHE_N++;
    }
    if (cv) { ctx.save(); ctx.globalAlpha *= kk; ctx.drawImage(cv, 0, 0, W, H); ctx.restore(); }
    else spotLayer(ctx, all, br, kk);
    for (i = 0; i < hs.length; i++) { // 光錐: 從畫面上緣(資訊列下)打到光洞, 錐內塵粒往下飄
      var hh = hs[i], ex = Math.min(170, (hh.x1 - hh.x0) / 2 + br) * 0.92, sx = hh.cx + 30 + 14 * Math.sin(p * TAU + i * 1.7), by = Math.max(60, hh.y0 - br);
      ctx.save(); ctx.globalAlpha *= kk;
      ctx.beginPath(); ctx.moveTo(sx - 16, 40); ctx.lineTo(sx + 16, 40); ctx.lineTo(hh.cx + ex, by); ctx.lineTo(hh.cx - ex, by); ctx.closePath();
      ctx.fillStyle = lin(ctx, 0, 40, 0, by, [0, 'rgba(255,238,196,0.10)', 0.7, 'rgba(255,238,196,0.06)', 1, 'rgba(255,238,196,0.13)']); ctx.fill(); ctx.clip();
      for (j = 0; j < 7; j++) {
        var u = fr(p + j / 7), py = 40 + u * (by - 40), px = sx + (hh.cx - sx) * u + Math.sin(j * 2.3 + p * TAU) * ex * 0.6 * u;
        ctx.globalAlpha = kk * 0.7 * Math.sin(Math.PI * u);
        circle(ctx, px, py, 1.6 + (j % 3) * 0.6); ctx.fillStyle = '#fff3d0'; ctx.fill();
      }
      ctx.restore();
    }
    ctx.restore();
  }

  var TUT_STEPS = ['map_pick', 'prep_start', 'demo_you', 'demo_mat', 'demo_mon', 'demo_goal', 'demo_sites', 'demo_start', 'gate', 'map_replay', 'map_slow', 'map_upgrade', 'map_shop'];
  function drawTutorial(ctx, st) {
    st = obj(st);
    var step = oneOf(st.step, TUT_STEPS, ''), t = num(st.t, 0);
    var arrows = arr(st.arrows).slice(0, 3), aT = clamp(num(st.arrowsT, 0.25), 0, 0.25), grow = aT / 0.25;
    var bubble = (st.bubble && typeof st.bubble === 'object') ? st.bubble : null;
    var dDur = Math.max(0.01, num(st.doneDur, 0.3)), dT = clamp(num(st.doneT, dDur), 0, dDur), done = dT < dDur, dq = dT / dDur, i;
    ctx.save();
    // 由下到上: 聚光燈暗幕與光洞 → 箭頭 → 提示板(蓋在箭尾上)
    if (st.spot && typeof st.spot === 'object') { ctx.save(); tutSpot(ctx, st.spot, t); ctx.restore(); }
    var Bd = bubble ? tutBoard(ctx, bubble) : null;
    if (Bd && Bd.outQ > 0) grow = Math.min(grow, 1 - Bd.outQ); // 板子收起時箭頭同步沿曲線縮回箭尾
    // 完成特效(地圖 1、準備 1): 提示板與箭頭一起縮進第 0 支箭頭的尖端 + 尖端噴 4 顆金星
    var ax = 640, ay = 360;
    if (arrows.length && Bd) { ax = num(obj(arrows[0]).tipX, 640); ay = num(obj(arrows[0]).tipY, 360); }
    else if (Bd) { ax = Bd.cx; ay = Bd.cy; }
    ctx.save();
    if (done) { var s = 1 - sm(dq); ctx.translate(ax, ay); ctx.scale(Math.max(0.001, s), Math.max(0.001, s)); ctx.translate(-ax, -ay); }
    if (Bd) { // 箭頭一定搭配提示板(bubble 為 null 時不畫箭頭)
      for (i = 0; i < arrows.length; i++) {
        var a = obj(arrows[i]), tl = tutTail(a, Bd), S = tl.S;
        S = V(Bd.cx + (S.x - Bd.cx) * Bd.sc, Bd.cy + (S.y - Bd.cy) * Bd.sc); // 箭尾跟著板子的進場 / 收起縮放
        ctx.save(); tutArrowB(ctx, a, S, t - i * 0.15, done ? 1 : grow); ctx.restore();
      }
      tutBubble(ctx, bubble, t, Bd);
    }
    ctx.restore();
    if (done && Bd) { // 4 顆金星往外噴(≤30px)
      ctx.save(); ctx.globalAlpha *= 1 - 0.6 * dq; ctx.fillStyle = K.select;
      for (i = 0; i < 4; i++) { var an = -Math.PI / 4 + i * Math.PI / 2, d = 30 * eOut(dq); star4(ctx, ax + Math.cos(an) * d, ay + Math.sin(an) * d, 7 * (1 - 0.5 * dq)); ctx.fill(); ctx.lineWidth = 1.2; ctx.strokeStyle = K.edge; ctx.stroke(); }
      ctx.restore();
    }
    ctx.restore();
  }

  // ================= 操作方式面板(ctrl-panel A 羊皮紙卷軸 + 逐組點亮; polish 第 6 輪時間軸 0~3.2 + 等 Z + dockT 收合) =================
  var CP = { BW: 250, BH: 226, KF: 0.6, FX: 18, FY: 54 };
  var CP_ROWS = [{ k: ['left', 'right'], s: '移動' }, { k: ['up'], s: '跳躍' }, { k: ['z'], s: '攻擊' }, { k: ['x'], s: '技能' }];
  function cpRod(ctx, y, w) {
    rr(ctx, -8, y - 6, w + 16, 12, 6); ctx.fillStyle = lin(ctx, 0, y - 6, 0, y + 6, [0, '#c98a4a', 0.5, '#8a5a2a', 1, '#4a2e14']); ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = K.edge; ctx.stroke();
    for (var s = -1; s <= 1; s += 2) { circle(ctx, s < 0 ? -10 : w + 10, y, 7); ctx.fillStyle = K.nail; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = K.edge; ctx.stroke(); }
  }
  // 卷軸卡(原點 = 紙左上, 原尺寸單位); h = 目前攤開高度; lit = 正在點亮的組(−1 = 無); tailA = 指向角色的小尖角
  function cpCard(ctx, h, tailA, flash, lit) {
    var BW = CP.BW, BH = CP.BH;
    ctx.save();
    if (h > 0.5) {
      rr(ctx, 2, 4, BW, h, 4); ctx.fillStyle = 'rgba(10,6,4,0.4)'; ctx.fill();
      rr(ctx, 0, 0, BW, h, 4); ctx.fillStyle = K.parch; ctx.fill();
      ctx.lineWidth = 2 + 3 * flash; ctx.strokeStyle = flash > 0 ? 'rgba(255,216,74,' + (0.6 + 0.4 * flash).toFixed(3) + ')' : K.edge; ctx.stroke();
      ctx.save(); rr(ctx, 0, 0, BW, h, 4); ctx.clip();
      ctx.fillStyle = 'rgba(120,90,40,0.10)'; for (var yy = 18; yy < BH; yy += 22) ctx.fillRect(6, yy, BW - 12, 1);
      ctx.fillStyle = K.select; rr(ctx, 14, 16, 6, 26, 3); ctx.fill();
      text(ctx, '操作方式', BW / 2 + 4, 30, 22, K.ink, 'center', true);
      ctx.fillStyle = 'rgba(43,33,24,0.35)'; ctx.fillRect(18, 52, BW - 36, 1.5);
      for (var i = 0; i < CP_ROWS.length; i++) { // 4 列: 鍵欄中心 x 72, 功能字欄起點 x 128
        var cy = 80 + i * 38, on = i === lit, dim = lit >= 0 && !on;
        if (on) { rr(ctx, 10, cy - 17, BW - 20, 34, 6); ctx.fillStyle = 'rgba(255,216,74,0.42)'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = K.selectDeep; ctx.stroke(); }
        ctx.save(); if (dim) ctx.globalAlpha *= 0.5;
        var ks = CP_ROWS[i].k, parts = [];
        for (var j = 0; j < ks.length; j++) parts.push({ key: ks[j], st: on ? 'hot' : 'normal' });
        kline(ctx, parts, 72, cy, 18, 'center', 'parch');
        text(ctx, CP_ROWS[i].s, 128, cy + 1, 20, K.ink, 'left', true);
        ctx.restore();
        if (i < CP_ROWS.length - 1) { ctx.fillStyle = 'rgba(43,33,24,0.12)'; ctx.fillRect(24, cy + 19, BW - 48, 1); }
      }
      ctx.restore();
      if (tailA > 0) {
        ctx.save(); ctx.globalAlpha *= tailA;
        poly(ctx, [BW / 2 - 11, h - 1, BW / 2, h + 12, BW / 2 + 11, h - 1]); ctx.fillStyle = K.parch; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = K.edge; ctx.stroke();
        ctx.fillStyle = K.parch; ctx.fillRect(BW / 2 - 9, h - 8, 18, 8);
        ctx.restore();
      }
    }
    ctx.restore();
    cpRod(ctx, 0, BW); cpRod(ctx, Math.max(0, h), BW);
  }
  // 跳躍示範期間整張變淡: T 1.2~1.3 由 1 → 0.35、1.3~1.7 停 0.35、1.7~1.85 回 1
  function cpJumpAlpha(T) {
    if (T < 1.2 || T >= 1.85) return 1;
    if (T < 1.3) return lerp(1, 0.35, (T - 1.2) / 0.1);
    if (T < 1.7) return 0.35;
    return lerp(0.35, 1, (T - 1.7) / 0.15);
  }
  function drawCtrlPanel(ctx, st) {
    st = obj(st);
    var T = clamp(num(st.T, 3.2), 0, 3.2), waitZ = st.waitZ === true, dockT = st.dockT == null ? null : clamp(num(st.dockT, 0.95), 0, 0.95);
    var px = num(st.px, 100), py = num(st.py, 462), al = clamp(num(st.alpha, 1), 0, 1), t = num(st.t, 0);
    var BW = CP.BW, BH = CP.BH, KF = isTouchOn() ? 1 : CP.KF, FX = CP.FX, FY = CP.FY, i; // 觸控模式: 收到左上角後不縮小(縮 0.6 倍字只剩 13px)
    // 原尺寸位置: 紙底在角色頭頂上方 14px(py − 32), 水平置中在角色, 含木軸外框左緣 ≥ 12
    var BIGX = clamp(px - BW / 2, 29, W - 29 - BW), BIGY = clamp(py - 32 - BH, 56, H - BH - 20);
    function pathAt(s) { var cx = Math.max(24, BIGX - 40), cy = 60, u = 1 - s; /* 上拱弧線; 控制點不往左越過 x 24 */ return { x: u * u * BIGX + 2 * u * s * cx + s * s * FX, y: u * u * BIGY + 2 * u * s * cy + s * s * FY }; }
    ctx.save();
    if (dockT == null) {
      ctx.globalAlpha *= cpJumpAlpha(T);
      if (T < 0.2) { // 捲起的卷軸從胸口冒出, 浮到頭頂上方並放大
        var q = eOut(T / 0.2), k0 = lerp(0.25, 1, q);
        ctx.globalAlpha *= clamp(q * 1.5, 0, 1);
        ctx.translate(lerp(px, BIGX + BW / 2, q), lerp(py - 4, BIGY, q)); ctx.scale(k0, k0); ctx.translate(-BW / 2, 0);
        cpCard(ctx, 0, 0, 0, -1);
      } else { // 0.2~0.6 攤開(0.5~0.6 長出尖角)→ 0.6~3.0 逐組點亮 → 3.0~3.2 停住 → 等 Z
        var u = eOut(seg(T, 0.2, 0.6)), tail = seg(T, 0.5, 0.6), lit = -1;
        if (T >= 0.6 && T < 3.0) lit = Math.min(3, Math.floor((T - 0.6) / 0.6));
        ctx.translate(BIGX, BIGY);
        cpCard(ctx, BH * u, tail, 0, lit);
        if (waitZ) nextBadge(ctx, BW - 24, BH - 4, t, '繼續', 'z'); // 下軸右端上方
      }
    } else if (dockT < 0.7) { // 徽章與尖角 0~0.12 收起; 縮成 0.6 倍沿上拱弧線滑到左上角, 途中高度縮 25% 再攤回, 後方拖 5 顆金色光點
      var s = eInOut(dockT / 0.7), kk = lerp(1, KF, s), hh = BH * (1 - 0.25 * Math.sin(Math.PI * s)), off = 1 - seg(dockT, 0, 0.12);
      for (i = 5; i >= 1; i--) {
        var sp = eInOut(seg(dockT - i * 0.05, 0, 0.7)); if (sp <= 0) continue;
        var pp = pathAt(sp), pk = lerp(1, KF, sp);
        ctx.save(); ctx.globalAlpha *= 0.65 * (1 - i / 6) * (0.8 + 0.2 * Math.sin(t * 20 + i));
        star4(ctx, pp.x + BW * pk / 2, pp.y + BH * pk / 2, 8 - i); ctx.fillStyle = K.select; ctx.fill(); ctx.restore();
      }
      var p = pathAt(s);
      ctx.translate(p.x, p.y); ctx.scale(kk, kk);
      cpCard(ctx, hh, off, 0, -1);
      if (off > 0) nextBadge(ctx, BW - 24, hh - 4, t, '繼續', 'z', off);
    } else { // 0.7~0.95 落定(木軸輕彈 + 金框閃)→ 固定在左上角 (18,54) 150×136
      var a = seg(dockT, 0.7, 0.95), bounce = 1 + 0.05 * Math.sin(Math.PI * a), fl = a < 1 ? 1 - a : 0;
      if (dockT >= 0.95) ctx.globalAlpha *= al; // 只在固定後讓路
      ctx.translate(FX + BW * KF / 2, FY); ctx.scale(KF * bounce, KF * bounce); ctx.translate(-BW / 2, 0);
      cpCard(ctx, BH, 0, fl, -1);
      if (fl > 0) { ctx.globalAlpha *= fl; for (var j = 0; j < 4; j++) { star4(ctx, j % 2 ? BW + 12 : -12, j < 2 ? -6 : BH + 6, 10 * fl); ctx.fillStyle = K.select; ctx.fill(); } }
    }
    ctx.restore();
  }

  // ================= 重生落下(respawn C 碎片倒帶) =================
  function drawRespawnFx(ctx, st) {
    st = obj(st);
    var x = num(st.x, 100), y = num(st.y, 462), cls = oneOf(st.cls, CLS, 'sword'), f = face(st.facing);
    var dur = Math.max(0.01, num(st.dur, 1.6)), t = clamp(num(st.t, 0), 0, dur) * 1.6 / dur; // 換算到 1.6 秒時間軸
    var GX = x, GY = y - 60, FORM = 1.05, DROP0 = 1.2, G = 2720, LAND = DROP0 + Math.sqrt(2 * 60 / G), FEET = y + 18;
    var cols = SHARD_COL[cls] || SHARD_COL.sword, i;
    ctx.save();
    ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.clip();
    // 承接死亡動畫的暗幕(約 70%, 角色周圍略淡); 1.15~1.6 掀開
    var dk = 0.7 * (1 - eOut(seg(t, 1.15, 1.6)));
    if (dk > 0.002) { ctx.fillStyle = rad(ctx, x, y, 30, 200, [0, 'rgba(10,6,20,' + (dk * 0.72).toFixed(3) + ')', 1, 'rgba(10,6,20,' + dk.toFixed(3) + ')']); ctx.fillRect(0, 0, W, H); }
    var gl = seg(t, 0.5, FORM) * (1 - seg(t, FORM, FORM + 0.2)); // 聚合點微光(越聚越亮)
    if (gl > 0) { circle(ctx, GX, GY, 34); ctx.fillStyle = rad(ctx, GX, GY, 0, 34, [0, 'rgba(255,255,255,' + (0.55 * gl).toFixed(3) + ')', 1, 'rgba(255,255,255,0)']); ctx.fill(); }
    function shardAt(k, tt) { // 從畫面上緣散開處沿縮小的螺旋飛回人形格位
      var c = k % 4, r = Math.floor(k / 4), tx = GX - 10.5 + c * 7, ty = GY - 13.5 + r * 9;
      var sx = clamp(x - 120 + hash(k, 5) * 420, 10, W - 10), sy = 30 + hash(k, 6) * 60;
      var t0 = 0.12 + hash(k, 7) * 0.25, pq = eInOut(seg(tt, t0, 0.95));
      var bx = sx + (tx - sx) * pq, by = sy + (ty - sy) * pq, sw = (1 - pq) * (34 + hash(k, 8) * 30), an = hash(k, 9) * TAU + pq * 7;
      return { x: bx + Math.cos(an) * sw, y: by + Math.sin(an) * sw * 0.6, rot: (1 - pq) * (hash(k, 1) - 0.5) * 14, p: pq, on: tt >= t0, t0: t0 };
    }
    function shardPath(sz) {
      ctx.beginPath();
      if (cls === 'sword') ctx.rect(-sz * 0.6, -sz * 0.6, sz * 1.2, sz * 1.2);
      else if (cls === 'hunter') { ctx.moveTo(0, -sz); ctx.lineTo(sz * 0.9, sz * 0.7); ctx.lineTo(-sz * 0.9, sz * 0.7); ctx.closePath(); }
      else ctx.arc(0, 0, sz * 0.7, 0, TAU);
    }
    if (t < FORM + 0.05) {
      var fo = 1 - seg(t, FORM - 0.02, FORM + 0.05);
      for (i = 0; i < 14; i++) {
        var s = shardAt(i, t); if (!s.on) continue;
        var sz = 3.2 + hash(i, 1) * 2.4;
        ctx.save();
        for (var k = 3; k >= 1; k--) { // 3 點淡拖尾
          var o = shardAt(i, t - k * 0.035);
          ctx.globalAlpha = 0.18 * (4 - k) / 3 * fo * (1 - s.p * 0.6);
          circle(ctx, o.x, o.y, sz * 0.5); ctx.fillStyle = '#ffffff'; ctx.fill();
        }
        ctx.globalAlpha = fo * Math.min(1, seg(t, s.t0, s.t0 + 0.1) + 0.2);
        ctx.translate(s.x, s.y); ctx.rotate(s.rot);
        shardPath(sz); ctx.fillStyle = cols[i % cols.length]; ctx.fill(); ctx.lineWidth = 0.9; ctx.strokeStyle = '#ffffff'; ctx.stroke();
        ctx.restore();
      }
    }
    var ip = seg(t, FORM - 0.12, FORM + 0.04); // 成形: 往內收的白環(半徑 40 → 0)
    if (ip > 0 && ip < 1) { ctx.save(); ctx.globalAlpha *= 0.3 + 0.7 * ip; circle(ctx, GX, GY, 40 * (1 - eOut(ip))); ctx.lineWidth = 1 + 2.5 * ip; ctx.strokeStyle = '#ffffff'; ctx.stroke(); ctx.restore(); }
    if (t >= FORM) {
      var cy = GY, pose = 'idle';
      if (t >= DROP0 && t < LAND) { var uu = t - DROP0; cy = GY + 0.5 * G * uu * uu; pose = 'fall'; }
      else if (t >= LAND) cy = y;
      var wh = 1 - seg(t, FORM, FORM + 0.25); // 發白成形, 0.25 秒退回原色
      ctx.save(); ctx.translate(x, cy);
      heroFig(ctx, cls, f, { pose: pose });
      if (wh > 0) { ctx.save(); ctx.globalAlpha *= wh; heroFig(ctx, cls, f, { pose: pose, tint: '#ffffff' }); ctx.restore(); }
      ctx.restore();
      if (t < FORM + 0.12) { ctx.save(); ctx.globalAlpha *= 0.9 * (1 - (t - FORM) / 0.12); circle(ctx, GX, GY, 24); ctx.fillStyle = rad(ctx, GX, GY, 0, 24, [0, 'rgba(255,255,255,1)', 1, 'rgba(255,255,255,0)']); ctx.fill(); ctx.restore(); }
      var sp = seg(t, FORM, FORM + 0.3); // 身上 4 顆小星往外散
      if (sp > 0 && sp < 1) {
        ctx.save(); ctx.globalAlpha *= 1 - sp; ctx.fillStyle = '#ffffff';
        for (var j = 0; j < 4; j++) { var a = j * TAU / 4 + 0.6, rr2 = 16 + 14 * eOut(sp); star4(ctx, GX + Math.cos(a) * rr2, GY + Math.sin(a) * rr2 * 1.2, 3); ctx.fill(); }
        ctx.restore();
      }
    }
    var dp = seg(t, LAND, LAND + 0.35); // 落地: 腳下兩撮小塵 + 地面一條短亮線(≤ 寬 40)
    if (dp > 0 && dp < 1) {
      ctx.save(); ctx.globalAlpha *= 1 - dp;
      for (var m = -1; m <= 1; m += 2) { circle(ctx, x + m * (10 + 8 * eOut(dp)), FEET - 3 - 4 * Math.sin(Math.PI * dp), 3 + 1.5 * dp); ctx.fillStyle = '#e9ddc6'; ctx.fill(); }
      var hw = 8 + 12 * eOut(dp);
      ctx.beginPath(); ctx.moveTo(x - hw, FEET - 1); ctx.lineTo(x + hw, FEET - 1); ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.strokeStyle = '#ffffff'; ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  }

  // ================= 新手教學總結板(tut-summary B 改: 4 張直卡、無跑道、縮矮、各自輪播) =================
  var TS = { BX: 80, BY: 110, BW: 1120, BH: 500, CW: 244, CH: 310, CY: 180 };
  var TS_TEXT = [['*刷關卡*'], ['*刷越快*,', '素材累積越快'], ['素材可解鎖', '*修復工程*、', '解鎖*新關卡*'], ['有空也多去', '*升級所*和*商店*', '看看吧!']];
  function tsRich(ctx, line, cx, y, px) { // *xx* = 螢光筆金色關鍵詞
    var parts = String(line).split('*'), total = 0, ws = [], i;
    for (i = 0; i < parts.length; i++) { ws.push(parts[i] ? tw(ctx, parts[i], px, true) : 0); total += ws[i]; }
    var x = cx - total / 2;
    for (i = 0; i < parts.length; i++) {
      if (!parts[i]) continue;
      if (i % 2 === 1) { rr(ctx, x - 3, y - px * 0.1, ws[i] + 6, px * 0.55, 3); ctx.fillStyle = 'rgba(255,216,74,0.8)'; ctx.fill(); }
      text(ctx, parts[i], x, y, px, K.ink, 'left', true);
      x += ws[i];
    }
  }
  function tsPin(ctx, n, x, y, r) {
    circle(ctx, x + 1, y + 2, r); ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fill();
    circle(ctx, x, y, r); ctx.fillStyle = K.select; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = K.edge; ctx.stroke();
    circle(ctx, x - r * 0.3, y - r * 0.35, r * 0.28); ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.fill();
    text(ctx, String(n), x, y + 1, r * 1.15, K.ink, 'center', true);
  }
  function tsGround(ctx, c0, c1, top, theme) {
    for (var c = c0; c <= c1; c++) {
      drawGround(ctx, { x: c * 40 + 20, y: top + 20, theme: theme, open: { n: true, e: c === c1, s: false, w: c === c0 } });
      drawGround(ctx, { x: c * 40 + 20, y: top + 60, theme: theme, open: { n: false, e: c === c1, s: false, w: c === c0 } });
    }
  }
  function tsArc(x0, y0, x1, y1, lift, q) { var mx = (x0 + x1) / 2, my = Math.min(y0, y1) - lift, u = 1 - q; return [u * u * x0 + 2 * u * q * mx + q * q * x1, u * u * y0 + 2 * u * q * my + q * q * y1]; }
  function tsFade(ctx, u, w, h) { var a = u < 0.04 ? 1 - u / 0.04 : (u > 0.96 ? (u - 0.96) / 0.04 : 0); if (a > 0) { ctx.fillStyle = 'rgba(10,8,6,' + (0.85 * a).toFixed(3) + ')'; ctx.fillRect(0, 0, w, h); } }
  function tsThumb(ctx, x, y, p, theme) { // 卡片縮圖裡的回放(背景 + 地面 + 主角記號)
    ctx.save(); ctx.beginPath(); ctx.rect(x + 8, y + 8, 160, 90); ctx.clip();
    ctx.translate(x + 8, y + 8); ctx.scale(0.125, 0.125);
    drawBackground(ctx, { theme: theme, t: 0 });
    var th = THEMES[theme] || THEMES.forest;
    ctx.fillStyle = th.inner; ctx.fillRect(0, 600, 1280, 120); ctx.fillStyle = th.cap; ctx.fillRect(0, 600, 1280, 24);
    if (p !== null) drawPlayer(ctx, { x: 90 + 1100 * p, y: 582, cls: 'sword', facing: 1, pose: 'run', poseT: p * 3 });
    ctx.restore();
  }
  // 小圖(各自 3 秒一圈); 世界視窗 VW×VH 縮進 222×124
  var TS_VIEW = [[640, 360], [330, 184], [330, 184], [420, 235]];
  function tsMini0(ctx, lt) { // 刷關卡: 角色從左跑到終點旗、旗子揮動
    var u = fr(lt / 3), i;
    drawBackground(ctx, { theme: 'forest', t: 0 });
    tsGround(ctx, 0, 15, 300, 'forest');
    var run = clamp(u / 0.62, 0, 1), px = 50 + 500 * run, h = 0, pose = 'run', pt = lt;
    if (px > 300 && px < 400) { var jq = (px - 300) / 100; h = 70 * Math.sin(Math.PI * jq); pose = jq < 0.5 ? 'rise' : 'fall'; }
    var arrive = u >= 0.62, cT = arrive ? (u - 0.62) * 3 : 1.4;
    if (arrive) { pose = 'cheer'; pt = clamp(cT, 0, 1.4); }
    drawGoal(ctx, { x: 580, y: 260, reached: arrive, cheerT: arrive ? clamp(cT, 0, 1.4) : 1.4, cheerDur: 1.4 });
    var pk = [[170, 'wood'], [250, 'stone'], [470, 'crystal']];
    for (i = 0; i < pk.length; i++) if (px < pk[i][0]) drawPickup(ctx, { x: pk[i][0], y: 284, kind: pk[i][1], t: lt });
    drawBoar(ctx, { x: 350, y: 284, facing: -1, state: 'walk', t: lt });
    drawPlayer(ctx, { x: px, y: 282 - h, cls: 'sword', facing: 1, pose: pose, poseT: pt });
    tsFade(ctx, u, 640, 360);
  }
  function tsMini1(ctx, lt) { // 刷越快, 素材累積越快: 已過關卡片重演, 素材一顆顆彈出投進資訊列格, 數字往上跳
    var u = fr(lt / 3), cyc = Math.floor(lt / 3), i;
    ctx.fillStyle = lin(ctx, 0, 0, 0, 184, [0, '#1d3036', 1, '#14222a']); ctx.fillRect(0, 0, 330, 184);
    ctx.strokeStyle = 'rgba(80,120,130,0.18)'; ctx.lineWidth = 1; for (i = 0; i < 9; i++) { ctx.beginPath(); ctx.moveTo(i * 40, 0); ctx.lineTo(i * 40, 184); ctx.stroke(); }
    var cx = 14, cy = 40, marks = [0.2, 0.45, 0.7], landed = 0, bump = 1;
    drawLevelCard(ctx, { x: cx, y: cy, index: 1, name: '翠林入口', theme: 'forest', state: 'cleared', recordCls: 'sword', recordTime: 18.4, rates: { wood: 9.8, stone: 3.3, crystal: 0, core: 0 }, devices: [null, null], repairedCount: 3, siteCount: 3 });
    tsThumb(ctx, cx, cy, u, 'forest');
    drawCardOverlay(ctx, { x: cx, y: cy, devices: [null, null], speedMul: 1, newArea: false, selected: false, replayP: u, marks: [{ p: marks[0], kind: 'wood' }, { p: marks[1], kind: 'wood' }, { p: marks[2], kind: 'wood' }], regions: [] });
    var fl = [];
    for (i = 0; i < marks.length; i++) { var since = (u - marks[i]) * 3; if (since >= 0.6) { landed++; bump = Math.min(bump, since - 0.6); } else if (since >= 0) fl.push([cx + 8 + 160 * marks[i], since / 0.6]); }
    // 小資訊列格(同 drawHud 的木材格長相)
    var sx = 206, sy = 12, sq = bump < 0.2 ? 1 - 0.15 * Math.sin(Math.PI * bump / 0.2) : 1;
    ctx.save(); ctx.translate(sx + 55, sy + 20); ctx.scale(1, sq); ctx.translate(-sx - 55, -sy - 20);
    rr(ctx, sx, sy, 110, 40, 6); ctx.fillStyle = K.parch; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = K.edge; ctx.stroke();
    matIcon(ctx, 'wood', sx + 22, sy + 20, 26);
    var nb = bump < 0.2 ? 1 + 0.3 * Math.sin(Math.PI * bump / 0.2) : 1;
    ctx.save(); ctx.translate(sx + 44, sy + 21); ctx.scale(nb, nb); text(ctx, String(12 + cyc * 3 % 60 + landed), 0, 0, 22, K.ink, 'left', true); ctx.restore();
    ctx.restore();
    for (i = 0; i < fl.length; i++) { var p = tsArc(fl[i][0], cy + 80, sx + 22, sy + 20, 50, eOut(fl[i][1])); drawFlyingMaterial(ctx, { x: p[0], y: p[1], kind: 'wood', t: fl[i][1] * 0.6, dur: 0.6 }); }
  }
  function tsMini2(ctx, lt) { // 前半: 斷橋鋪好、迷霧推開; 後半: 上鎖的關卡卡片鎖彈開、變成已開放
    var u = fr(lt / 3) * 3, i;
    if (u < 1.5) {
      drawBackground(ctx, { theme: 'forest', t: 0 });
      tsGround(ctx, 0, 2, 120, 'forest'); tsGround(ctx, 5, 8, 120, 'forest');
      var rep = u >= 0.25, bT = clamp(u - 0.25, 0, 0.6);
      for (i = 0; i < 2; i++) drawWorksite(ctx, { x: 140 + i * 40, y: 140, kind: 'bridge', role: 'shortcut', repaired: rep, theme: 'forest', end: true, bottom: false, buildT: rep ? bT : 0.6, buildDur: 0.6, order: 0 });
      drawPickup(ctx, { x: 260, y: 106, kind: 'crystal', t: lt }); drawPickup(ctx, { x: 296, y: 106, kind: 'wood', t: lt + 0.4 });
      drawFog(ctx, { x: 200, y: 0, w: 130, h: 120, t: lt, theme: 'forest', clearP: sm(seg(u, 0.6, 1.3)), ox: 180, oy: 120, maxR: 230 });
      if (u < 0.95) drawSiteSign(ctx, { x: 96, y: 96, role: 'shortcut', num: 1 });
      tsFade(ctx, u / 1.5, 330, 184);
    } else {
      var v = u - 1.5;
      ctx.fillStyle = lin(ctx, 0, 0, 0, 184, [0, '#1d3036', 1, '#14222a']); ctx.fillRect(0, 0, 330, 184);
      var open = v >= 0.5, shake = (v > 0.3 && v < 0.5) ? Math.sin(v * 90) * 3 : 0, cx = 77 + shake, cy = 24;
      drawLevelCard(ctx, { x: cx, y: cy, index: 2, name: '藤蔓小徑', theme: 'forest', state: open ? 'open' : 'buyable', cost: { wood: 50, stone: 0, crystal: 0, core: 0 }, stock: { wood: 80, stone: 0, crystal: 0, core: 0 }, devices: open ? [null, null] : null, repairedCount: 0, siteCount: 3 });
      if (open) {
        tsThumb(ctx, cx, cy, null, 'forest'); devSockets(ctx, cx, cy, [null, null]);
        var fq = seg(v, 0.5, 0.85); if (fq < 1) { rr(ctx, cx, cy, 176, 136, 8); ctx.fillStyle = 'rgba(255,248,220,' + (0.85 * (1 - fq)).toFixed(3) + ')'; ctx.fill(); }
        var lq = seg(v, 0.5, 1.0); if (lq < 1) { ctx.save(); ctx.globalAlpha *= 1 - lq; lockIcon(ctx, cx + 88, cy + 38 - 50 * eOut(lq), 30 * (1 + 0.5 * lq), K.select); ctx.restore(); }
        var bq = seg(v, 0.5, 0.95); if (bq > 0 && bq < 1) { ctx.save(); ctx.globalAlpha *= 1 - bq; ctx.fillStyle = K.select; for (i = 0; i < 8; i++) { var a = i * TAU / 8, d = 60 + 30 * eOut(bq); star4(ctx, cx + 88 + Math.cos(a) * d, cy + 68 + Math.sin(a) * d * 0.6, 7); ctx.fill(); } ctx.restore(); }
      }
      tsFade(ctx, v / 1.5, 330, 184);
    }
  }
  function tsMini3(ctx, lt) { // 升級所卡與商店卡並排、輪流亮起金色選取框
    var u = fr(lt / 3) * 3, i;
    ctx.fillStyle = lin(ctx, 0, 0, 0, 235, [0, '#3e3227', 1, '#2e251c']); ctx.fillRect(0, 0, 420, 235);
    ctx.strokeStyle = 'rgba(0,0,0,0.18)'; ctx.lineWidth = 2; for (i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(0, 50 * i + 20); ctx.lineTo(420, 50 * i + 20); ctx.stroke(); }
    var wsSel = u < 1.5;
    drawWorkshopCard(ctx, { x: 24, y: 50, anyAffordable: true, allDone: false, selected: wsSel });
    drawShopCard(ctx, { x: 220, y: 50, anyAffordable: true, soldOut: false, selected: !wsSel });
  }
  var TS_MINI = [tsMini0, tsMini1, tsMini2, tsMini3];
  function tsMiniBox(ctx, i, x, y, lt) {
    var w = 222, h = 124, v = TS_VIEW[i];
    ctx.save();
    ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    ctx.fillStyle = '#10141c'; ctx.fillRect(x, y, w, h);
    ctx.translate(x, y); ctx.scale(w / v[0], h / v[1]);
    TS_MINI[i](ctx, Math.max(0, lt));
    ctx.restore();
    ctx.save();
    ctx.lineWidth = 3; ctx.strokeStyle = K.edge; ctx.strokeRect(x - 1, y - 1, w + 2, h + 2);
    ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(255,215,160,0.4)'; ctx.strokeRect(x + 1.5, y + 1.5, w - 3, h - 3);
    ctx.restore();
  }
  function tsCard(ctx, i, x, y, lt) {
    var CW = TS.CW, CH = TS.CH;
    rr(ctx, x + 2, y + 4, CW, CH, 7); ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fill();
    rr(ctx, x, y, CW, CH, 7); ctx.fillStyle = K.parch; ctx.fill();
    ctx.fillStyle = 'rgba(120,90,40,0.12)'; ctx.fillRect(x + 3, y + CH - 6, CW - 6, 3);
    if (i === 3) { ctx.save(); ctx.setLineDash([8, 5]); rr(ctx, x + 3, y + 3, CW - 6, CH - 6, 5); ctx.lineWidth = 2; ctx.strokeStyle = K.inkDim; ctx.stroke(); ctx.restore(); } // 第 4 張 = 旁註
    rr(ctx, x + 0.5, y + 0.5, CW - 1, CH - 1, 7); ctx.lineWidth = 1.5; ctx.strokeStyle = K.edge; ctx.stroke();
    tsMiniBox(ctx, i, x + 11, y + 34, lt);
    tsPin(ctx, i + 1, x + CW / 2, y + 4, 17);
    var lines = TS_TEXT[i];
    for (var j = 0; j < lines.length; j++) tsRich(ctx, lines[j], x + CW / 2, y + 218 + j * 36, 22);
  }
  function drawTutSummary(ctx, st) {
    st = obj(st);
    var openT = clamp(num(st.openT, 0), 0, 1e6), closing = st.closing === true, closeQ = closing ? clamp(num(st.closeT, 0), 0, 0.3) / 0.3 : 0;
    var canClose = st.canClose === true, t = num(st.t, 0), i;
    var BX = TS.BX, BY = TS.BY, BW = TS.BW, BH = TS.BH, CW = TS.CW, CH = TS.CH, CY = TS.CY;
    ctx.save();
    // 全畫面半透明暗幕(大地圖在背後保留可見)
    ctx.fillStyle = 'rgba(8,6,4,' + (0.62 * seg(openT, 0, 0.3) * (1 - closeQ)).toFixed(3) + ')'; ctx.fillRect(0, 0, W, H);
    if (closing) { var sc = 1 - 0.1 * closeQ; ctx.translate(640, 360); ctx.scale(sc, sc); ctx.translate(-640, -360); ctx.globalAlpha *= 1 - closeQ; }
    var bq = seg(openT, 0, 0.5);
    ctx.translate(0, -(BY + BH + 10) * (1 - eBack(bq)));
    board(ctx, BX, BY, BW, BH);
    text(ctx, '新手教學總結', 640, 150, 32, K.cream, 'center', true, 6, K.edge);
    ctx.fillStyle = K.select; ctx.fillRect(640 - 120, 172, 240, 3);
    for (i = 0; i < 4; i++) { // 第 i 張在 0.7 + 0.45i 起從右側滑入 0.55 秒, 回彈落定 + 卡底揚塵; 落定後小圖開始輪播(起點錯開 0.75 秒)
      var T0 = 0.7 + 0.45 * i, q = seg(openT, T0, T0 + 0.55);
      if (q <= 0) continue;
      var x = 110 + 272 * i, dx = (1 - eBack(q)) * (1300 - x), tilt = (1 - eOut(q)) * 0.12;
      var lt = Math.max(0, openT - (T0 + 0.55)) + 0.75 * i;
      ctx.save();
      ctx.translate(x + dx + CW / 2, CY + CH); ctx.rotate(tilt); ctx.translate(-x - CW / 2, -CY - CH);
      tsCard(ctx, i, x, CY, lt);
      ctx.restore();
      var dq = seg(openT, T0 + 0.41, T0 + 0.76);
      if (dq > 0 && dq < 1) {
        ctx.save(); ctx.globalAlpha *= 0.7 * (1 - dq); ctx.fillStyle = '#d8c7a4';
        for (var k = 0; k < 3; k++) { circle(ctx, x - 4 - dq * 14 - k * 6, CY + CH - 4 - k * 5 * dq, 5 + dq * 4 - k); ctx.fill(); circle(ctx, x + CW + 4 + dq * 14 + k * 6, CY + CH - 4 - k * 5 * dq, 5 + dq * 4 - k); ctx.fill(); }
        ctx.restore();
      }
    }
    if (canClose && openT >= 2.9) { // 板底「按 [Z] 關閉」, 按鍵輕輕上下彈
      ctx.save(); ctx.globalAlpha *= seg(openT, 2.9, 3.2);
      kline(ctx, ['按', { key: 'z', st: 'hot' }, '關閉'], 640, 570, 22, 'center', 'board', Math.sin(t * TAU / 0.8) * 2);
      ctx.restore();
    }
    ctx.restore();
  }

  // ================= 大地圖 =================
  function drawMapLink(ctx, st) {
    st = obj(st);
    var x1 = num(st.x1, 0), y1 = num(st.y1, 0), x2 = num(st.x2, 0), y2 = num(st.y2, 0), lit = st.lit === true, mx = (x1 + x2) / 2;
    ctx.save();
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.bezierCurveTo(mx, y1, mx, y2, x2, y2);
    if (lit) { ctx.lineWidth = 8; ctx.strokeStyle = 'rgba(255,216,74,0.22)'; ctx.stroke(); ctx.lineWidth = 3.5; ctx.strokeStyle = K.select; ctx.stroke(); }
    else { ctx.setLineDash([8, 7]); ctx.lineWidth = 3; ctx.strokeStyle = '#3f5058'; ctx.stroke(); }
    ctx.restore();
  }
  var CARD_TINT = { forest: '#2f3a24', cliff: '#2c3446', mine: '#3a2a1f', salt: '#3a2846' };
  function gateGlyph(ctx, cx, cy, k, col) { // 斷門剪影(第 8 關卡片)
    ctx.save(); ctx.translate(cx, cy); ctx.scale(k, k); ctx.fillStyle = col;
    poly(ctx, [-30, 30, -30, -18, -24, -26, -18, -16, -14, -24, -14, 30]); ctx.fill();
    poly(ctx, [14, 30, 14, -8, 20, -14, 24, -6, 30, -12, 30, 30]); ctx.fill();
    poly(ctx, [-30, -20, 4, -16, 0, -10, -14, -8]); ctx.fill();
    ctx.restore();
  }
  function drawLevelCard(ctx, st) {
    st = obj(st);
    if (isTouchOn()) { drawLevelCardTouch(ctx, st); return; }
    var x = num(st.x, 0), y = num(st.y, 0), idx = Math.round(clamp(num(st.index, 1), 0, 99)), name = str(st.name, ''), theme = oneOf(st.theme, ['forest', 'cliff', 'mine', 'salt'], 'forest');
    var state = oneOf(st.state, ['sealed', 'buyable', 'open', 'cleared'], 'sealed'), boss = idx === 8 || theme === 'salt';
    var rc = Math.round(clamp(num(st.repairedCount, 0), 0, 3)), scn = Math.round(clamp(num(st.siteCount, 0), 0, 9));
    var live = state === 'open' || state === 'cleared';
    // 木框彩度跟著修好處數回來(map-card B): 灰褐 → 主題色; 第 8 關 / sealed / buyable 照主題色
    var tint = state === 'sealed' ? '#241b14' : (live && scn === 3 ? mix(CARD_GREY, CARD_TINT[theme], rc / 3) : CARD_TINT[theme]);
    ctx.save();
    board(ctx, x, y, 176, 136, tint);
    rr(ctx, x + 1.5, y + 1.5, 173, 133, 8);
    if (state === 'cleared') { ctx.lineWidth = 3; ctx.strokeStyle = K.goodLight; ctx.stroke(); }
    else if (state === 'buyable') { ctx.setLineDash([7, 5]); ctx.lineWidth = 2.5; ctx.strokeStyle = K.select; ctx.stroke(); ctx.setLineDash([]); }
    else if (state === 'open') { ctx.lineWidth = 2; ctx.strokeStyle = boss ? '#e8a8d8' : '#c9b896'; ctx.stroke(); }
    if (boss) { rr(ctx, x + 4.5, y + 4.5, 167, 127, 6); ctx.lineWidth = 1.5; ctx.strokeStyle = '#c47d9c'; ctx.stroke(); gateGlyph(ctx, x + 14, y + 120, 0.22, '#e3c4d2'); gateGlyph(ctx, x + 162, y + 120, 0.22, '#e3c4d2'); }
    ctx.fillStyle = K.edge; ctx.fillRect(x + 7, y + 7, 162, 92);
    if (state === 'open' || state === 'cleared') { ctx.fillStyle = '#10141c'; ctx.fillRect(x + 8, y + 8, 160, 90); }
    else if (boss && state === 'sealed') {
      ctx.fillStyle = lin(ctx, 0, y + 8, 0, y + 98, [0, '#2a1f4e', 1, '#7a5078']); ctx.fillRect(x + 8, y + 8, 160, 90);
      gateGlyph(ctx, x + 88, y + 52, 1.1, '#4e3a68');
      rr(ctx, x + 34, y + 72, 108, 22, 4); ctx.fillStyle = K.parchDim; ctx.fill();
      text(ctx, '還差 ' + Math.round(clamp(num(st.need, 1), 0, 99)) + ' 關', x + 88, y + 83.5, 13, K.ink, 'center', true);
    } else {
      ctx.fillStyle = '#1a1612'; ctx.fillRect(x + 8, y + 8, 160, 90);
      lockIcon(ctx, x + 88, y + 38, 30, state === 'sealed' ? '#6a5e4c' : K.select);
      rr(ctx, x + 16, y + 68, 144, 24, 4); ctx.fillStyle = state === 'sealed' ? K.parchDim : K.parch; ctx.fill();
      costLine(ctx, st.cost, st.stock, x + 88, y + 80, 13, 'center');
    }
    rr(ctx, x + 6, y + 106, 164, 28, 4); ctx.fillStyle = state === 'sealed' ? K.parchDim : K.parch; ctx.fill();
    var inkN = state === 'sealed' ? '#5e5240' : K.ink;
    var hasDev = live && Array.isArray(st.devices);
    // polish 第 5 輪: 通關秒數固定右對齊(右緣卡片內 x 168、中心 y 114, 新手教學箭頭指它), 名稱不推動它。
    // 裝置格因此左移到卡片內 (97,108)、(119,108)(介面原寫 (123,108)/(146,108), 會和秒數重疊; 見 style.md 判讀約定 25)
    // 版面: 第一行 名稱 x+11~x+94 | 裝置格 x+97~x+140(兩行高) | 秒數 x+143~x+168; 第二行 四種產量 x+8~x+94 | 職業小圖示在秒數正下方
    // 裝置格移到卡片左上角破框(見 devSockets), 底下名稱條不再讓位: 名稱 x+11~x+168、四種產量每格 27 寬
    var nmMax = 157, secR = 168, secMax = 60;
    fitText(ctx, idx + ' ' + name, x + 11, y + 113.5, 12, inkN, state === 'cleared' ? Math.max(20, nmMax - secMax - 4) : nmMax);
    if (state === 'cleared') {
      if (st.recordTime != null) fitText(ctx, fmt1(st.recordTime) + 's', x + secR, y + 114, 11, K.ink, secMax, 'right');
      if (st.recordCls != null) clsIcon(ctx, st.recordCls, x + 156, y + 127, 12);
      var rt = mats(st.rates), stp = 27;
      for (var i = 0; i < 4; i++) { var k = KINDS[i]; matIcon(ctx, k, x + 12 + i * stp, y + 126.5, 8, true); fitText(ctx, fmt1(clamp(rt[k], 0, 9999)), x + 17 + i * stp, y + 127, 10, K.ink, stp - 9.5); }
    } else if (state === 'open') text(ctx, '未過關', x + 11, y + 127, 11, K.inkDim, 'left', true);
    else if (state === 'buyable') kline(ctx, [{ t: '可解鎖 ·', col: K.selectDeep }, { key: 'z' }], x + 11, y + 127, 11, 'left', 'parch');
    else text(ctx, boss ? '7 關全過才開放' : '前一關未過', x + 11, y + 127, 11, '#5e5240', 'left', true);
    // 裝置格改在 drawCardOverlay 最後畫(縮圖與選取框之後), 破框的部分才不會被蓋住
    if (state === 'sealed') { rr(ctx, x, y, 176, 136, 8); ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fill(); }
    ctx.restore();
  }
  var CARD_GREY = '#46423d';
  // 字太寬時水平壓縮進 maxW(字級不變, 至少 10px)
  function fitText(ctx, s, x, y, px, col, maxW, align) {
    var w = tw(ctx, s, px, true);
    if (w <= maxW || w <= 0) { text(ctx, s, x, y, px, col, align || 'left', true); return; }
    ctx.save(); ctx.translate(x, y); ctx.scale(maxW / w, 1); text(ctx, s, 0, 0, px, col, align || 'left', true); ctx.restore();
  }
  // 卡片裝置格: 卡片左上角破框 (-7,-9) 與 (17,-9) 各 22×24, 只壓到縮圖左上一小角, 讓底下產量列有空間、縮圖盡量露出;
  // 下方落影讓它浮在框上。null = 深色凹槽 + 虛線框 + 淡色「+」, 有值 = 較亮凹槽 + 裝置小圖示(邊長 17)
  function devSockets(ctx, x, y, devs) {
    for (var j = 0; j < 2; j++) {
      var d = ITEMS.indexOf(devs[j]) >= 0 ? devs[j] : null, sx = x - 7 + j * 24, sy = y - 9, w = 22, h = 24;
      rr(ctx, sx + 1.5, sy + 3, w, h, 3); ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fill();
      rr(ctx, sx, sy, w, h, 3); ctx.fillStyle = d ? '#5a4f44' : '#3a3632'; ctx.fill();
      ctx.lineWidth = 1.5; ctx.strokeStyle = K.edge; ctx.stroke();
      ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(sx + 1.5, sy + 1.5, w - 3, 2);
      if (d) itemIcon(ctx, d, sx + w / 2, sy + h / 2 + 0.5, 17);
      else {
        ctx.save(); ctx.setLineDash([2, 2]); rr(ctx, sx + 4, sy + 4.5, w - 8, h - 8, 2); ctx.lineWidth = 1; ctx.strokeStyle = '#d9c7a0'; ctx.stroke(); ctx.restore();
        ctx.fillStyle = '#d9c7a0'; ctx.fillRect(sx + w / 2 - 3, sy + h / 2 - 0.5, 6, 1.4); ctx.fillRect(sx + w / 2 - 0.7, sy + h / 2 - 3.2, 1.4, 6);
      }
    }
  }
  function selFrame(ctx, x, y, w, h) {
    rr(ctx, x - 4, y - 4, w + 8, h + 8, 11); ctx.lineWidth = 4; ctx.strokeStyle = K.select; ctx.stroke();
    poly(ctx, [x + w / 2 - 8, y - 5, x + w / 2 + 8, y - 5, x + w / 2, y + 4]); ctx.fillStyle = K.select; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = K.edge; ctx.stroke();
  }

  // ---------- 觸控模式的關卡卡片(手機字級下限: 字 21px、小圖示 30px; 電腦版不走這裡) ----------
  // 卡片 160×182: 縮圖 128×72 在 (16,8)(原縮圖 160×90 的 0.8 倍); 名稱條 (5,84) 150×94 三行 —
  // 第 1 行(中心 y+97)名稱 + 通關秒數(右緣 x+152)/ 可解鎖時 A 鍵帽; 第 2 行(y+128)木材、石頭; 第 3 行(y+160)水晶、魔核, 位置固定。
  // 沒有產量的那格畫淡色 0(位置固定比留空好對照); 未通關卡片的狀態字放第 2 行
  var TC = { W: 160, H: 182, TX: 16, TY: 8, TW: 128, TH: 72, K: 0.8, L1: 97, L2: 128, L3: 160 };
  function cardH() { return isTouchOn() ? TC.H : 136; }
  function cardW() { return isTouchOn() ? TC.W : 176; }
  // 縮圖區的「虛擬座標」(原版 x+8, y+8, 160×90)換成觸控版實際位置: 縮圖內的圖形(去色灰幕、鎖頭以外的裝飾)照原版畫再縮放
  function tcThumbXf(ctx, x, y) { ctx.translate(x + TC.TX, y + TC.TY); ctx.scale(TC.K, TC.K); ctx.translate(-(x + 8), -(y + 8)); }
  function tcNum(v) {
    v = clamp(num(v, 0), 0, 1e9);
    if (v >= 1000) return (Math.round(v / 100) / 10) + 'k';
    if (v >= 10) return String(Math.round(v)); // 10 以上取整數: 一格最多 3 位數, 和隔壁那格留得出空隙
    return fmt1(v);
  }
  function tcRate(ctx, kind, v, sx, cy) {
    var zero = !(v > 0);
    ctx.save(); if (zero) ctx.globalAlpha *= 0.35;
    matIcon(ctx, kind, sx + 15, cy, 30, true);
    text(ctx, zero ? '0' : tcNum(v), sx + 32, cy + 0.5, 21, zero ? K.inkDim : K.ink, 'left', true);
    ctx.restore();
  }
  function drawLevelCardTouch(ctx, st) {
    var x = num(st.x, 0), y = num(st.y, 0), idx = Math.round(clamp(num(st.index, 1), 0, 99)), name = str(st.name, ''), theme = oneOf(st.theme, ['forest', 'cliff', 'mine', 'salt'], 'forest');
    var state = oneOf(st.state, ['sealed', 'buyable', 'open', 'cleared'], 'sealed'), boss = idx === 8 || theme === 'salt';
    var rc = Math.round(clamp(num(st.repairedCount, 0), 0, 3)), scn = Math.round(clamp(num(st.siteCount, 0), 0, 9)), live = state === 'open' || state === 'cleared';
    var tint = state === 'sealed' ? '#241b14' : (live && scn === 3 ? mix(CARD_GREY, CARD_TINT[theme], rc / 3) : CARD_TINT[theme]);
    var W = TC.W, H = TC.H, tx = x + TC.TX, ty = y + TC.TY, tW = TC.TW, tH = TC.TH, cx = x + W / 2;
    ctx.save();
    board(ctx, x, y, W, H, tint);
    rr(ctx, x + 1.5, y + 1.5, W - 3, H - 3, 8);
    if (state === 'cleared') { ctx.lineWidth = 3; ctx.strokeStyle = K.goodLight; ctx.stroke(); }
    else if (state === 'buyable') { ctx.setLineDash([7, 5]); ctx.lineWidth = 2.5; ctx.strokeStyle = K.select; ctx.stroke(); ctx.setLineDash([]); }
    else if (state === 'open') { ctx.lineWidth = 2; ctx.strokeStyle = boss ? '#e8a8d8' : '#c9b896'; ctx.stroke(); }
    if (boss) { rr(ctx, x + 4.5, y + 4.5, W - 9, H - 9, 6); ctx.lineWidth = 1.5; ctx.strokeStyle = '#c47d9c'; ctx.stroke(); }
    ctx.fillStyle = K.edge; ctx.fillRect(tx - 1, ty - 1, tW + 2, tH + 2);
    if (live) { ctx.fillStyle = '#10141c'; ctx.fillRect(tx, ty, tW, tH); }
    else if (boss && state === 'sealed') {
      ctx.fillStyle = lin(ctx, 0, ty, 0, ty + tH, [0, '#2a1f4e', 1, '#7a5078']); ctx.fillRect(tx, ty, tW, tH);
      gateGlyph(ctx, cx, ty + 30, 0.8, '#4e3a68');
      var ns = '還差 ' + Math.round(clamp(num(st.need, 1), 0, 99)) + ' 關', nw = tw(ctx, ns, 21, true) + 16;
      rr(ctx, cx - nw / 2, ty + tH - 32, nw, 28, 4); ctx.fillStyle = K.parchDim; ctx.fill();
      text(ctx, ns, cx, ty + tH - 17.5, 21, K.ink, 'center', true);
    } else {
      ctx.fillStyle = '#1a1612'; ctx.fillRect(tx, ty, tW, tH);
      lockIcon(ctx, cx, ty + 20, 26, state === 'sealed' ? '#6a5e4c' : K.select);
      var cm = costLine(ctx, st.cost, st.stock, 0, 0, 21, 'center', null, true), pw = Math.min(W - 6, cm.w + 14);
      rr(ctx, cx - pw / 2, ty + tH - 33, pw, 30, 4); ctx.fillStyle = state === 'sealed' ? K.parchDim : K.parch; ctx.fill();
      costLine(ctx, st.cost, st.stock, cx, ty + tH - 18, 21, 'center');
    }
    rr(ctx, x + 5, y + 84, W - 10, 94, 4); ctx.fillStyle = state === 'sealed' ? K.parchDim : K.parch; ctx.fill();
    var inkN = state === 'sealed' ? '#5e5240' : K.ink, L1 = y + TC.L1, L2 = y + TC.L2, L3 = y + TC.L3;
    var tsec = state === 'cleared' && st.recordTime != null, tkey = state === 'buyable';
    var sec = tsec ? fmt1(st.recordTime) + 's' : '', secW = tsec ? tw(ctx, sec, 21, true) : (tkey ? 30 : 0);
    fitText(ctx, idx + ' ' + name, x + 10, L1, 21, inkN, W - 18 - secW - (secW ? 6 : 0));
    if (tsec) text(ctx, sec, x + W - 8, L1, 21, K.ink, 'right', true);
    if (tkey) keycap(ctx, 'z', x + W - 22, L1, 14, 'hot');
    if (state === 'cleared') {
      var rt = mats(st.rates);
      tcRate(ctx, 'wood', rt.wood, x + 6, L2); tcRate(ctx, 'stone', rt.stone, x + 82, L2);
      tcRate(ctx, 'crystal', rt.crystal, x + 6, L3); tcRate(ctx, 'core', rt.core, x + 82, L3);
    } else if (state === 'open') text(ctx, '未過關', x + 10, L2, 21, K.inkDim, 'left', true);
    else if (state === 'buyable') text(ctx, '可解鎖', x + 10, L2, 21, K.selectDeep, 'left', true);
    else fitText(ctx, boss ? '7 關全過才開放' : '前一關未過', x + 10, L2, 21, '#5e5240', W - 18);
    if (state === 'sealed') { rr(ctx, x, y, W, H, 8); ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fill(); }
    ctx.restore();
  }
  function drawCardOverlayTouch(ctx, st) {
    var x = num(st.x, 0), y = num(st.y, 0), sm2 = num(st.speedMul, 1), i;
    var tx = x + TC.TX, ty = y + TC.TY, tW = TC.TW, tH = TC.TH;
    ctx.save();
    ctx.save(); tcThumbXf(ctx, x, y); repairVeil(ctx, x, y, st.regions); ctx.restore(); // 區域座標由 game.js 照原版縮圖算, 這裡整塊縮放
    if (st.live !== false) { // 鎖住的卡片: 解鎖花費標籤比縮圖寬, 不畫縮圖框(會穿過標籤)
      ctx.lineWidth = 2; ctx.strokeStyle = K.edge; ctx.strokeRect(tx - 1, ty - 1, tW + 2, tH + 2);
      ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(255,215,160,0.35)'; ctx.strokeRect(tx + 0.5, ty + 0.5, tW - 1, tH - 1);
    }
    if (sm2 > 1.001) {
      var lab = '×' + (Math.round(sm2 * 100) / 100), bw = tw(ctx, lab, 21, true) + 32;
      rr(ctx, tx + tW - bw - 2, ty + 2, bw, 28, 4); ctx.fillStyle = '#f0c27a'; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = K.edge; ctx.stroke();
      itemIcon(ctx, 'gear', tx + tW - bw + 12, ty + 16, 22);
      text(ctx, lab, tx + tW - bw + 26, ty + 16.5, 21, K.ink, 'left', true);
    }
    if (st.newArea === true) newAreaChip(ctx, tx + 3, ty + tH - 16, 'left', '新區域', 21);
    if (st.replayP !== null && st.replayP !== undefined && isFinite(Number(st.replayP))) {
      var p = clamp(Number(st.replayP), 0, 1), bx = tx, by = ty + tH + 1;
      ctx.fillStyle = '#0c1016'; ctx.fillRect(bx, by, tW, 4);
      ctx.fillStyle = 'rgba(255,255,255,0.28)'; ctx.fillRect(bx, by, tW * p, 4);
      var marks = arr(st.marks).slice(0, 60);
      for (i = 0; i < marks.length; i++) {
        var m = obj(marks[i]), mp = clamp(num(m.p, 0), 0, 1), kind = oneOf(m.kind, KINDS, 'wood'), passed = p >= mp, fresh = passed && p - mp < 0.03;
        ctx.globalAlpha = passed ? 1 : 0.45; circle(ctx, bx + tW * mp, by + 2, fresh ? 3 : 2); ctx.fillStyle = passed ? PAL[kind] : PAL[kind + 'Dark']; ctx.fill();
        if (fresh) { ctx.lineWidth = 1; ctx.strokeStyle = '#ffffff'; ctx.stroke(); }
      }
      ctx.globalAlpha = 1; ctx.fillStyle = '#ffffff'; ctx.fillRect(bx + tW * p - 1, by - 1, 2, 6);
    }
    if (st.selected === true) selFrame(ctx, x, y, TC.W, TC.H);
    ctx.restore();
  }
  function drawCardOverlay(ctx, st) {
    st = obj(st);
    if (isTouchOn()) { drawCardOverlayTouch(ctx, st); return; }
    var x = num(st.x, 0), y = num(st.y, 0), sm2 = num(st.speedMul, 1), i;
    ctx.save();
    repairVeil(ctx, x, y, st.regions);
    ctx.lineWidth = 2; ctx.strokeStyle = K.edge; ctx.strokeRect(x + 7, y + 7, 162, 92);
    ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(255,215,160,0.35)'; ctx.strokeRect(x + 8.5, y + 8.5, 159, 89);
    if (sm2 > 1.001) {
      var lab = '×' + (Math.round(sm2 * 100) / 100), bw = tw(ctx, lab, 11, true) + 26;
      rr(ctx, x + 165 - bw, y + 11, bw, 17, 4); ctx.fillStyle = '#f0c27a'; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = K.edge; ctx.stroke();
      itemIcon(ctx, 'gear', x + 174 - bw, y + 19.5, 13);
      text(ctx, lab, x + 183 - bw, y + 20, 11, K.ink, 'left', true);
    }
    if (st.newArea === true) newAreaChip(ctx, x + 11, y + 20, 'left', '新區域', 11);
    if (st.replayP !== null && st.replayP !== undefined && isFinite(Number(st.replayP))) {
      var p = clamp(Number(st.replayP), 0, 1), bx = x + 8, by = y + 99;
      ctx.fillStyle = '#0c1016'; ctx.fillRect(bx, by, 160, 4);
      ctx.fillStyle = 'rgba(255,255,255,0.28)'; ctx.fillRect(bx, by, 160 * p, 4);
      var marks = arr(st.marks).slice(0, 60);
      for (i = 0; i < marks.length; i++) {
        var m = obj(marks[i]), mp = clamp(num(m.p, 0), 0, 1), kind = oneOf(m.kind, KINDS, 'wood'), passed = p >= mp, fresh = passed && p - mp < 0.03;
        ctx.globalAlpha = passed ? 1 : 0.45; circle(ctx, bx + 160 * mp, by + 2, fresh ? 3 : 2); ctx.fillStyle = passed ? PAL[kind] : PAL[kind + 'Dark']; ctx.fill();
        if (fresh) { ctx.lineWidth = 1; ctx.strokeStyle = '#ffffff'; ctx.stroke(); }
      }
      ctx.globalAlpha = 1; ctx.fillStyle = '#ffffff'; ctx.fillRect(bx + 160 * p - 1, by - 1, 2, 6);
    }
    if (st.selected === true) selFrame(ctx, x, y, 176, 136);
    if (Array.isArray(st.devices)) devSockets(ctx, x, y, st.devices);
    ctx.restore();
  }
  // 修復灰幕(map-card B「褪色舊照片」): 縮圖 (x+8,y+8,160,90) 內除了已修工程的區域外全部去色 + 霧面灰 + 舊照片斜紋;
  // 未修區域畫灰白虛線框(線在矩形內側), 已修區域保留原色 + 暖白實線框 + 外側淡光暈(≤2px)+ 兩角小星。全部裁在縮圖內。
  function repairVeil(ctx, x, y, regions) {
    var regs = arr(regions).slice(0, 3), i, j, list = [], nDone = 0;
    if (regs.length < 3) return; // 長度 0(sealed / buyable / 第 8 關): 不畫
    for (i = 0; i < regs.length; i++) {
      var g = obj(regs[i]), done = g.repaired === true, rs = arr(g.rects).slice(0, 3), rects = [];
      for (j = 0; j < rs.length; j++) {
        var q = arr(rs[j]), qx = num(q[0], NaN), qy = num(q[1], NaN), qw = num(q[2], NaN), qh = num(q[3], NaN);
        if (!isFinite(qx + qy + qw + qh) || qw <= 0 || qh <= 0) continue;
        var L = clamp(qx, x + 8, x + 168), T = clamp(qy, y + 8, y + 98), R = clamp(qx + qw, x + 8, x + 168), B = clamp(qy + qh, y + 8, y + 98);
        if (R - L >= 1 && B - T >= 1) rects.push([L, T, R - L, B - T]);
      }
      if (done) nDone++;
      list.push({ done: done, rects: rects });
    }
    if (nDone >= 3) return; // 3 處全修: 灰幕整片拿掉
    ctx.save();
    ctx.beginPath(); ctx.rect(x + 8, y + 8, 160, 90); ctx.clip();
    // 灰幕: 縮圖範圍挖掉已修區域(evenodd 對重疊的已修區會算錯, 所以逐塊剪裁取交集)
    ctx.save();
    for (i = 0; i < list.length; i++) if (list[i].done) for (j = 0; j < list[i].rects.length; j++) {
      var a = list[i].rects[j]; ctx.beginPath(); ctx.rect(x - 400, y - 400, 976, 936); ctx.rect(a[0] + a[2], a[1], -a[2], a[3]); ctx.clip('evenodd');
    }
    ctx.globalCompositeOperation = 'saturation'; ctx.fillStyle = '#808080'; ctx.fillRect(x + 8, y + 8, 160, 90); // 去色(只作用在縮圖這塊)
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = 'rgba(132,124,112,0.42)'; ctx.fillRect(x + 8, y + 8, 160, 90);
    ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(40,36,32,0.22)';
    ctx.beginPath(); for (var k = -90; k < 160; k += 6) { ctx.moveTo(x + 8 + k, y + 98); ctx.lineTo(x + 98 + k, y + 8); } ctx.stroke();
    ctx.restore();
    for (i = 0; i < list.length; i++) for (j = 0; j < list[i].rects.length; j++) {
      var r = list[i].rects[j];
      if (list[i].done) {
        ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(255,236,190,0.35)'; ctx.strokeRect(r[0] - 0.5, r[1] - 0.5, r[2] + 1, r[3] + 1);
        ctx.lineWidth = 1.4; ctx.strokeStyle = '#fff4d6'; ctx.strokeRect(r[0] + 0.7, r[1] + 0.7, r[2] - 1.4, r[3] - 1.4);
        ctx.fillStyle = '#fff4d6'; star4(ctx, r[0] + 1.5, r[1] + 1.5, 4); ctx.fill(); star4(ctx, r[0] + r[2] - 1.5, r[1] + r[3] - 1.5, 3); ctx.fill();
      } else {
        ctx.setLineDash([3, 2]); ctx.lineWidth = 1.2; ctx.strokeStyle = 'rgba(230,224,210,0.85)'; ctx.strokeRect(r[0] + 0.6, r[1] + 0.6, r[2] - 1.2, r[3] - 1.2); ctx.setLineDash([]);
      }
    }
    ctx.restore();
  }
  function anvil(ctx, cx, cy, k) {
    ctx.save(); ctx.translate(cx, cy); ctx.scale(k, k); ctx.lineJoin = 'round'; ctx.lineWidth = 2; ctx.strokeStyle = '#120c08';
    poly(ctx, [-30, -10, 22, -10, 34, -4, 14, 2, 10, 10, -10, 10, -14, 2, -30, -2]); ctx.fillStyle = '#5a6070'; ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#8a92a4'; ctx.fillRect(-30, -10, 52, 3);
    rr(ctx, -16, 10, 32, 8, 2); ctx.fillStyle = '#3a3f4c'; ctx.fill(); ctx.stroke();
    ctx.save(); ctx.translate(8, -22); ctx.rotate(-0.6);
    ctx.fillStyle = '#8a5a2a'; ctx.fillRect(-2, -2, 4, 26); rr(ctx, -9, -8, 18, 9, 2); ctx.fillStyle = '#a9b3be'; ctx.fill(); ctx.stroke(); ctx.restore();
    ctx.fillStyle = K.select; star4(ctx, -16, -20, 4); ctx.fill(); star4(ctx, 26, -18, 3); ctx.fill();
    ctx.restore();
  }
  function drawWorkshopCard(ctx, st) {
    st = obj(st);
    var x = num(st.x, 0), y = num(st.y, 0);
    ctx.save();
    board(ctx, x, y, 176, 136, '#33263a');
    ctx.fillStyle = '#1f1626'; ctx.fillRect(x + 8, y + 8, 160, 90);
    ctx.fillStyle = rad(ctx, x + 88, y + 70, 4, 70, [0, 'rgba(255,170,80,0.35)', 1, 'rgba(255,170,80,0)']); ctx.fillRect(x + 8, y + 8, 160, 90);
    anvil(ctx, x + 84, y + 60, 1.25);
    rr(ctx, x + 6, y + 106, 164, 28, 4); ctx.fillStyle = K.parch; ctx.fill();
    text(ctx, '升級所', x + 88, y + 120.5, 14, K.ink, 'center', true);
    if (st.allDone === true) bigCardTag(ctx, x, y, '全解鎖', false);
    else if (st.anyAffordable === true) bangMark(ctx, x + 160, y + 18);
    if (st.selected === true) selFrame(ctx, x, y, 176, 136);
    ctx.restore();
  }
  // 營地建築卡共用: 右上金色「!」(有買得起的)
  function bangMark(ctx, cx, cy) {
    circle(ctx, cx, cy, 10); ctx.fillStyle = K.select; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = K.edge; ctx.stroke();
    text(ctx, '!', cx, cy + 1, 14, K.ink, 'center', true);
  }
  // 營地建築卡共用: 中央斜掛大標籤(約 140×40, −8°, 中心 (x+88, y+56)); gray = 「已售完」灰紅底深字, 否則羊皮紙 + 金邊
  function bigCardTag(ctx, x, y, s, gray) {
    ctx.save(); ctx.translate(x + 88, y + 56); ctx.rotate(-8 * Math.PI / 180);
    ctx.lineWidth = 1.5; ctx.strokeStyle = K.edge; // 吊繩
    ctx.beginPath(); ctx.moveTo(-50, -20); ctx.lineTo(-38, -34); ctx.moveTo(50, -20); ctx.lineTo(38, -34); ctx.stroke();
    rr(ctx, -70 + 2, -20 + 3, 140, 40, 6); ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fill();
    rr(ctx, -70, -20, 140, 40, 6); ctx.fillStyle = gray ? '#a8786e' : K.parch; ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = gray ? '#5a2e28' : K.select; ctx.stroke();
    rr(ctx, -65, -15, 130, 30, 4); ctx.lineWidth = 1; ctx.strokeStyle = gray ? 'rgba(60,20,16,0.5)' : K.selectDeep; ctx.stroke();
    text(ctx, s, 0, 1, 22, gray ? '#2a1410' : K.ink, 'center', true);
    ctx.restore();
  }
  // 商店卡縮圖: 紅白條扇貝遮雨棚的小攤 + 攤上兩座裝置剪影當招牌(不畫貨架、剩餘數或任何商品細節)
  function shopStall(ctx, x, y) {
    ctx.save(); ctx.beginPath(); ctx.rect(x + 8, y + 8, 160, 90); ctx.clip();
    ctx.fillStyle = '#1f1812'; ctx.fillRect(x + 8, y + 8, 160, 90);
    ctx.fillStyle = rad(ctx, x + 88, y + 70, 4, 70, [0, 'rgba(255,190,110,0.30)', 1, 'rgba(255,190,110,0)']); ctx.fillRect(x + 8, y + 8, 160, 90);
    var L = x + 34, R = x + 142, i;
    ctx.fillStyle = '#5a3a1e'; ctx.fillRect(L + 4, y + 40, 5, 52); ctx.fillRect(R - 9, y + 40, 5, 52); // 攤柱
    rr(ctx, L - 4, y + 72, R - L + 8, 18, 3); ctx.fillStyle = '#8a5a2a'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = K.edge; ctx.stroke(); // 櫃台
    ctx.fillStyle = '#6a4220'; ctx.fillRect(L, y + 78, R - L, 2);
    itemIcon(ctx, 'gear', x + 70, y + 60, 22); itemIcon(ctx, 'bagCrystal', x + 104, y + 60, 22); // 攤上兩座裝置當招牌
    var aw = (R - L + 16) / 6; // 遮雨棚: 紅白條 + 扇貝下緣
    for (i = 0; i < 6; i++) {
      var ax = L - 8 + i * aw;
      ctx.beginPath(); ctx.moveTo(ax, y + 22); ctx.lineTo(ax + aw, y + 22); ctx.lineTo(ax + aw, y + 36); ctx.arc(ax + aw / 2, y + 36, aw / 2, 0, Math.PI); ctx.closePath();
      ctx.fillStyle = i % 2 ? K.parch : '#c8463a'; ctx.fill(); ctx.lineWidth = 1; ctx.strokeStyle = K.edge; ctx.stroke();
    }
    poly(ctx, [L - 10, y + 22, R + 10, y + 22, R, y + 14, L, y + 14]); ctx.fillStyle = '#8a2a22'; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = K.edge; ctx.stroke();
    ctx.restore();
  }
  function drawShopCard(ctx, st) {
    st = obj(st);
    var x = num(st.x, 0), y = num(st.y, 0), sold = st.soldOut === true;
    ctx.save();
    board(ctx, x, y, 176, 136, '#3a2a1f');
    shopStall(ctx, x, y);
    if (sold) { ctx.fillStyle = 'rgba(8,6,4,0.55)'; ctx.fillRect(x + 8, y + 8, 160, 90); }
    ctx.lineWidth = 2; ctx.strokeStyle = K.edge; ctx.strokeRect(x + 7, y + 7, 162, 92);
    rr(ctx, x + 6, y + 106, 164, 28, 4); ctx.fillStyle = K.parch; ctx.fill();
    text(ctx, '商店', x + 88, y + 120.5, 14, K.ink, 'center', true);
    if (sold) bigCardTag(ctx, x, y, '已售完', true);
    else if (st.anyAffordable === true) bangMark(ctx, x + 160, y + 18);
    if (st.selected === true) selFrame(ctx, x, y, 176, 136);
    ctx.restore();
  }
  function drawFlyingMaterial(ctx, st) {
    st = obj(st);
    var x = num(st.x, 0), y = num(st.y, 0), kind = oneOf(st.kind, KINDS, 'wood'), dur = Math.max(0.01, num(st.dur, 0.7)), t = clamp(num(st.t, 0), 0, dur);
    var sx = Math.cos(t / dur * TAU * 1.5);
    ctx.save(); ctx.translate(x, y); ctx.scale(Math.max(0.2, Math.abs(sx)), 1);
    matIcon(ctx, kind, 0, 0, 17);
    if (sx < 0) { circle(ctx, 0, 0, 7); ctx.fillStyle = 'rgba(0,0,0,0.12)'; ctx.fill(); }
    ctx.restore();
  }

  // ================= 關卡準備頁(作戰桌) =================
  function siteCard(ctx, s, i, x, y, sel, rowOn, stock) {
    s = obj(s);
    var status = s.status === 'done' ? 'done' : 'open', role = oneOf(s.role, ROLES, 'shortcut'), kind = oneOf(s.kind, ['bridge', 'stairs', 'rubble', 'nestgate'], 'rubble');
    var ty = tag(ctx, x, y, 150, 130, sel ? (rowOn ? 'hot' : 'cold') : null, status === 'done' ? 'done' : 'normal'), mid = x + 75;
    sitePin(ctx, i + 1, x + 16, ty + 16, 10, 13, status === 'done');
    var tch = isTouchOn(); // 觸控模式(字級下限 21px): 用途圖示移到右上角, 文字列拉開
    roleMark(ctx, role, tch ? x + 132 : mid, tch ? ty + 18 : ty + 32, tch ? 0.8 : 1, status === 'done');
    text(ctx, ROLE_NAME[role], mid, tch ? ty + 34 : ty + 58, 13, status === 'done' ? K.inkDim : ROLE_INK[role], 'center', true);
    text(ctx, SITE_KIND_NAME[kind], mid, tch ? ty + 54 : ty + 76, 12, K.inkDim, 'center', true);
    if (status === 'done') {
      ctx.save(); ctx.translate(mid, ty + 106); ctx.rotate(-0.12);
      rr(ctx, -40, -12, 80, 24, 4); ctx.lineWidth = 2.5; ctx.strokeStyle = K.good; ctx.stroke();
      text(ctx, '已完工', 0, 0.5, 14, K.good, 'center', true); ctx.restore();
    } else {
      var c = costLine(ctx, s.cost, stock, mid, tch ? ty + 78 : ty + 96, 13, 'center');
      actKey(ctx, 'z', '修復', mid, tch ? ty + 111 : ty + 116, c.ok ? (sel && rowOn ? 'hot' : 'idle') : 'off', 'center', 11);
    }
  }
  function drawLevelPanel(ctx, st) {
    st = obj(st);
    var idx = Math.round(clamp(num(st.index, 1), 0, 99)), name = str(st.name, ''), theme = oneOf(st.theme, ['forest', 'cliff', 'mine', 'salt'], 'forest');
    var row = Math.round(clamp(num(st.row, 2), 0, 2)), sites = arr(st.sites).slice(0, 3), siteSel = st.siteSel == null ? -1 : Math.round(num(st.siteSel, -1));
    var slots = arr(st.slots), slotSel = Math.round(clamp(num(st.slotSel, 0), 0, 1)), storeCount = Math.round(clamp(num(st.storeCount, 0), 0, 99));
    var stock = st.stock, i;
    ctx.save();
    dimScreen(ctx, 0.6, [60, 96, 640, 360]);
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.rect(700, 96, -640, 360); ctx.clip('evenodd');
    board(ctx, 40, 48, 1200, 640);
    ctx.restore();
    text(ctx, '第 ' + idx + ' 關 ' + name, 60, 72, 22, K.cream, 'left', true, 4, K.edge);
    var tw1 = tw(ctx, '第 ' + idx + ' 關 ' + name, 22, true);
    rr(ctx, 72 + tw1, 62, tw(ctx, THEME_NAME[theme], 12, true) + 16, 20, 4); ctx.fillStyle = theme === 'salt' ? '#c47d9c' : (theme === 'cliff' ? '#7489a7' : (theme === 'mine' ? '#6b4a2b' : '#4f8a3a')); ctx.fill();
    text(ctx, THEME_NAME[theme], 80 + tw1, 72.5, 12, '#ffffff', 'left', true);
    // 預覽框: 只畫外框
    rr(ctx, 56, 92, 648, 368, 6); ctx.lineWidth = 4; ctx.strokeStyle = K.edge; ctx.stroke();
    ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(255,215,160,0.4)'; ctx.strokeRect(59.25, 95.25, 641.5, 361.5);
    // 紀錄區
    var ry = tag(ctx, 60, 468, 640, 120, null, 'normal');
    text(ctx, '目前回放', 76, ry + 20, 13, K.inkDim, 'left', true);
    if (st.recordTime == null) {
      text(ctx, '尚無回放', 380, ry + 64, 20, K.inkDim, 'center', true);
    } else {
      var rdx = isTouchOn() ? 26 : 0; // 觸控模式: 標籤字放大到 21px, 右邊內容往右讓開
      if (st.recordCls != null) clsIcon(ctx, st.recordCls, 160 + rdx, ry + 20, 22);
      text(ctx, (st.recordCls != null ? CLS_NAME[oneOf(st.recordCls, CLS, 'sword')] + '  ' : '') + fmt1(st.recordTime) + ' 秒', 176 + rdx, ry + 21, 18, K.ink, 'left', true);
      ctx.fillStyle = 'rgba(60,40,20,0.25)'; ctx.fillRect(76, ry + 42, 608, 1);
      text(ctx, '每分鐘', 76, ry + 72, 13, K.inkDim, 'left', true);
      ratesRow(ctx, st.rates, 130 + rdx, ry + 72, 122, 15);
      var sp = num(st.speedMul, 1);
      if (sp > 1.001) { itemIcon(ctx, 'gear', 616, ry + 100, 16); text(ctx, '回放 ×' + (Math.round(sp * 100) / 100), 628, ry + 100.5, 12, K.ink, 'left', true); }
    }
    if (st.newArea === true) newAreaChip(ctx, 684, ry + 20, 'right', '修好後還沒跑過', 11);
    // 右側三列(工程 / 裝置格 / 開始挑戰; 商店已搬到大地圖營地)
    groove(ctx, 720, 96, 480, 180, '修復工程', row === 0);
    if (!sites.length) text(ctx, '本關沒有工程', 960, 192, 18, K.labelDim, 'center', true, 3, K.edge);
    else for (i = 0; i < sites.length; i++) siteCard(ctx, sites[i], i, 728 + 158 * i, 128, i === siteSel, row === 0, stock);
    groove(ctx, 720, 286, 480, 120, '裝置格', row === 1);
    for (i = 0; i < 2; i++) {
      var it = slots[i], ox = 728 + 238 * i, sel = i === slotSel, has = ITEMS.indexOf(it) >= 0;
      var y2 = tag(ctx, ox, 310, 230, 88, sel ? (row === 1 ? 'hot' : 'cold') : null, 'normal');
      // polish 第 3 輪: 格內不畫「N 號格」, 1 號 / 2 號只靠左右位置區分
      if (has) {
        itemIcon(ctx, it, ox + 30, y2 + 50, 40);
        text(ctx, ITEM_NAME[it], ox + 56, y2 + 40, 15, K.ink, 'left', true);
        text(ctx, ITEM_FX[it], ox + 56, y2 + 60, 11, K.inkDim, 'left', true);
      } else {
        ctx.save(); ctx.setLineDash([4, 4]); rr(ctx, ox + 12, y2 + 28, 40, 40, 5); ctx.lineWidth = 1.5; ctx.strokeStyle = K.inkDim; ctx.stroke(); ctx.restore();
        text(ctx, '空', ox + 32, y2 + 48, 15, K.inkDim, 'center', true);
      }
      if (sel) {
        var empty = storeCount <= 0 && !has; // 倉庫沒有裝置且這一格是空的: 按 Z 不反應
        if (empty) text(ctx, '倉庫沒有裝置', ox + 222, y2 + 13, 11, K.short, 'right', true);
        else kline(ctx, [{ key: 'z' }, '打開裝置倉庫'], ox + 222, y2 + 13, 11, 'right', 'parch');
      }
    }
    // 開始挑戰列 (720,416) 480×170, 大石鍵置中
    var gy = tag(ctx, 720, 416, 480, 170, row === 2 ? 'hot' : null, 'normal');
    rr(ctx, 720, gy, 14, 170, 6); ctx.fillStyle = K.good; ctx.fill();
    rr(ctx, 817, gy + 59, 300, 64, 10); ctx.fillStyle = '#8f8471'; ctx.fill();
    rr(ctx, 817, gy + 53, 300, 64, 10); ctx.fillStyle = row === 2 ? K.select : '#ece4d2'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = K.edge; ctx.stroke();
    text(ctx, '開始挑戰', 927, gy + 86, 28, K.ink, 'center', true);
    keycap(ctx, 'z', 1067, gy + 85, 22, 'normal'); // 金色石鍵上用深墨按鍵(金面會和鈕融在一起)
    if (st.hintOff !== true) keyRow(ctx, [['↑↓', '換列'], ['←→', '選擇'], ['Z', '確定'], ['X', '關閉']], 60, 674, 13, 'left'); // 準備 1 教學那一步讓位給提示板
    ctx.restore();
  }
  function drawSiteHighlight(ctx, st) {
    st = obj(st);
    var x = num(st.x, 0), y = num(st.y, 0), w = clamp(num(st.w, 40), 4, 1280), h = clamp(num(st.h, 40), 4, 720), on = st.active !== false;
    var pu = 0.5 + 0.5 * Math.sin(nowS() * 6);
    ctx.save();
    ctx.globalAlpha *= on ? 0.75 + 0.25 * pu : 0.45;
    ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(20,12,6,0.9)'; ctx.strokeRect(x + 2.5, y + 2.5, w - 5, h - 5);
    ctx.lineWidth = 3; ctx.strokeStyle = K.select; ctx.strokeRect(x + 2.5, y + 2.5, w - 5, h - 5);
    ctx.setLineDash([6, 6]); ctx.lineDashOffset = -nowS() * 20; ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(20,12,6,0.9)'; ctx.strokeRect(x + 2.5, y + 2.5, w - 5, h - 5); ctx.setLineDash([]);
    var L = Math.min(14, w / 3, h / 3);
    ctx.lineWidth = 5; ctx.strokeStyle = K.select; ctx.lineCap = 'butt';
    ctx.beginPath();
    ctx.moveTo(x + 2.5, y + L); ctx.lineTo(x + 2.5, y + 2.5); ctx.lineTo(x + L, y + 2.5);
    ctx.moveTo(x + w - L, y + 2.5); ctx.lineTo(x + w - 2.5, y + 2.5); ctx.lineTo(x + w - 2.5, y + L);
    ctx.moveTo(x + w - 2.5, y + h - L); ctx.lineTo(x + w - 2.5, y + h - 2.5); ctx.lineTo(x + w - L, y + h - 2.5);
    ctx.moveTo(x + L, y + h - 2.5); ctx.lineTo(x + 2.5, y + h - 2.5); ctx.lineTo(x + 2.5, y + h - L);
    ctx.stroke();
    ctx.restore();
  }

  // ---------- 裝置倉庫 / 商店 / 職業選擇 ----------
  // 裝置倉庫右預覽的石磚牆(主題色調: 1~3 翠林、4~5 高崖、6~7 礦坑、8 鹽原)
  var WALL = {
    forest: { base: '#3d3a2c', mortar: '#24221a', moss: 'rgba(92,191,69,0.35)' },
    cliff: { base: '#4a5064', mortar: '#2a2e3a', moss: 'rgba(232,238,245,0.18)' },
    mine: { base: '#3a302b', mortar: '#231c18', moss: 'rgba(255,170,90,0.10)' },
    salt: { base: '#7a5a6e', mortar: '#4a3446', moss: 'rgba(251,243,236,0.22)' }
  };
  function levelTheme(lv) { return lv <= 3 ? 'forest' : (lv <= 5 ? 'cliff' : (lv <= 7 ? 'mine' : 'salt')); }
  function deviceWall(ctx, x, y, w, h, theme) {
    var c = WALL[theme] || WALL.mine, r, cc;
    ctx.fillStyle = c.base; ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = c.mortar; ctx.lineWidth = 2;
    ctx.beginPath();
    for (r = 0; r * 22 < h; r++) {
      var yy = y + r * 22; ctx.moveTo(x, yy); ctx.lineTo(x + w, yy);
      for (cc = (r % 2) * 20; cc < w; cc += 40) { ctx.moveTo(x + cc, yy); ctx.lineTo(x + cc, Math.min(y + h, yy + 22)); }
    }
    ctx.stroke();
    ctx.fillStyle = c.moss; for (r = 0; r < 6; r++) { ell(ctx, x + 20 + hash(r, 7) * (w - 40), y + 6 + hash(r, 8) * 10, 14, 4); ctx.fill(); }
    ctx.fillStyle = rad(ctx, x + w / 2, y + h / 2 - 4, 10, 110, [0, 'rgba(255,190,110,0.28)', 1, 'rgba(255,170,90,0)']); ctx.fillRect(x, y, w, h);
  }
  function drawDevicePanel(ctx, st) {
    st = obj(st);
    var slotNo = Math.round(clamp(num(st.slotNo, 1), 1, 2)), level = Math.round(clamp(num(st.level, 1), 1, 8));
    var cur = ITEMS.indexOf(st.current) >= 0 ? st.current : null, raw = arr(st.entries).slice(0, 8), ents = [], i;
    for (i = 0; i < raw.length; i++) { var e0 = obj(raw[i]); ents.push({ type: oneOf(e0.type, ITEMS, 'bagWood'), n: Math.round(clamp(num(e0.n, 1), 0, 99)) }); }
    var sel = Math.round(clamp(num(st.sel, 0), 0, ents.length));
    ctx.save();
    dimScreen(ctx, 0.55);
    board(ctx, 240, 120, 800, 480);
    text(ctx, '裝置倉庫 — 裝到 ' + slotNo + ' 號格', 264, 148, 20, K.cream, 'left', true, 4, K.edge);
    // 右上: 這一格目前裝的(讓「拆下」與「換裝」看得出會換掉什麼)
    var cn = cur ? ITEM_NAME[cur] : '空', cw = tw(ctx, cn, 14, true);
    text(ctx, cn, 1016, 148, 14, cur ? K.cream : K.labelDim, 'right', true, 3, K.edge);
    if (cur) itemIcon(ctx, cur, 1016 - cw - 16, 148, 22);
    text(ctx, '目前裝著', 1016 - cw - (cur ? 32 : 8), 148, 12, K.labelDim, 'right', true, 3, K.edge);
    // 左清單: 第 0 列「拆下」, 之後每種一列
    for (i = 0; i <= ents.length; i++) {
      var ly = 169 + 46 * i, isSel = i === sel;
      var yy = tag(ctx, 284, ly, 380, 42, isSel ? 'hot' : null, 'normal'), my = yy + 21;
      if (isSel) { poly(ctx, [268, my - 9, 280, my, 268, my + 9]); ctx.fillStyle = K.select; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = K.edge; ctx.stroke(); }
      if (i === 0) {
        ctx.save(); ctx.setLineDash([3, 3]); rr(ctx, 296, my - 16, 32, 32, 4); ctx.lineWidth = 1.5; ctx.strokeStyle = K.inkDim; ctx.stroke(); ctx.restore();
        ctx.lineWidth = 2.5; ctx.strokeStyle = K.ink; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        ctx.beginPath(); ctx.moveTo(312, my + 9); ctx.lineTo(312, my - 8); ctx.moveTo(306, my - 2); ctx.lineTo(312, my - 8); ctx.lineTo(318, my - 2); ctx.stroke();
        text(ctx, '拆下', 342, my + 0.5, 16, K.ink, 'left', true);
        text(ctx, '清空這一格', 652, my + 0.5, 12, K.inkDim, 'right', true);
      } else {
        var en = ents[i - 1];
        itemIcon(ctx, en.type, 312, my, 34);
        var dt2 = isTouchOn() ? 2 : 0; // 觸控模式: 兩行字都是 21px, 上下再拉開一點
        text(ctx, ITEM_NAME[en.type], 342, my - 8 - dt2, 16, K.ink, 'left', true);
        text(ctx, ITEM_FX[en.type], 342, my + 11 + dt2 - 1, 11, K.inkDim, 'left', true);
        text(ctx, '×' + en.n, 652, my + 0.5, 18, K.ink, 'right', true);
      }
    }
    // 右預覽: 情境框 (684,169) 324×250 + 資訊牌 (684,429) 324×92
    ctx.save(); rr(ctx, 684, 169, 324, 250, 8); ctx.clip(); deviceWall(ctx, 684, 169, 324, 250, levelTheme(level)); ctx.restore();
    rr(ctx, 684, 169, 324, 250, 8); ctx.lineWidth = 3; ctx.strokeStyle = K.edge; ctx.stroke();
    var dy = tag(ctx, 684, 429, 324, 92, null, 'normal');
    if (sel === 0) {
      if (cur) {
        itemIcon(ctx, cur, 846, 294, 150);
        rr(ctx, 771, 219, 150, 150, 8); ctx.fillStyle = 'rgba(150,146,140,0.55)'; ctx.fill();
        ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(846, 330); ctx.lineTo(846, 262); ctx.moveTo(826, 282); ctx.lineTo(846, 262); ctx.lineTo(866, 282); ctx.stroke();
        fitText(ctx, '拆下 ' + ITEM_NAME[cur], 700, dy + 26, 20, K.ink, 292);
        text(ctx, '裝置回到倉庫', 700, dy + 60, 14, K.inkDim, 'left', true);
      } else {
        rr(ctx, 771, 219, 150, 150, 10); ctx.fillStyle = 'rgba(10,8,12,0.55)'; ctx.fill(); // 空的嵌座凹槽
        ctx.save(); ctx.setLineDash([8, 6]); rr(ctx, 779, 227, 134, 134, 8); ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(217,199,160,0.6)'; ctx.stroke(); ctx.restore();
        circle(ctx, 846, 294, 40); ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(217,199,160,0.35)'; ctx.stroke();
        text(ctx, '這一格目前是空的', 700, dy + 34, 18, K.ink, 'left', true);
        text(ctx, '選它 = 不變', 700, dy + 64, 12, K.inkDim, 'left', true);
      }
    } else {
      var se = ents[sel - 1];
      itemIcon(ctx, se.type, 846, 294, 150);
      text(ctx, ITEM_NAME[se.type], 700, dy + 22, 20, K.ink, 'left', true);
      text(ctx, ITEM_CAT[se.type], 992, dy + 22, 12, K.inkDim, 'right', true);
      fitText(ctx, ITEM_FX[se.type], 700, dy + 50, 14, K.ink, 292);
      kline(ctx, ['倉庫裡 ' + se.n + ' 座 · ', { key: 'z' }, '安裝到 ' + slotNo + ' 號格'], 700, dy + 74, 12, 'left', 'parch');
    }
    keyRow(ctx, [['↑↓', '選擇'], ['Z', '安裝'], ['X', '返回']], 684, 568, 13, 'left');
    ctx.restore();
  }
  function drawShopPanel(ctx, st) {
    st = obj(st);
    var entries = arr(st.entries).slice(0, 6), sel = Math.round(clamp(num(st.sel, 0), 0, 5)), stock = mats(st.stock), i;
    ctx.save();
    dimScreen(ctx, 0.55);
    board(ctx, 240, 120, 800, 480);
    text(ctx, '商店', 264, 148, 22, K.cream, 'left', true, 4, K.edge);
    rr(ctx, 860, 134, 156, 28, 5); ctx.fillStyle = K.parch; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = K.edge; ctx.stroke();
    var hdx = isTouchOn() ? 14 : 0; // 觸控模式:「持有」放大到 21px, 圖示與數字往右讓開
    text(ctx, '持有', 870, 148.5, 12, K.inkDim, 'left', true); matIcon(ctx, 'crystal', 912 + hdx, 148, 20); text(ctx, intStr(stock.crystal), 926 + hdx, 149, 17, K.ink, 'left', true);
    for (i = 0; i < 6; i++) {
      var e = obj(entries[i]), y = 180 + 56 * i, type = oneOf(e.type, ITEMS, 'gear'), max = Math.round(clamp(num(e.max, 1), 0, 99)), left = Math.round(clamp(num(e.left, max), 0, 99));
      var sold = left <= 0, isSel = i === sel, has = i < entries.length;
      if (!has) continue;
      var ty = tag(ctx, 272, y, 736, 50, isSel ? 'hot' : null, sold ? 'gray' : 'normal');
      if (isSel) { poly(ctx, [254, ty + 16, 266, ty + 25, 254, ty + 34]); ctx.fillStyle = K.select; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = K.edge; ctx.stroke(); }
      ctx.save(); if (sold) ctx.globalAlpha *= 0.55;
      itemIcon(ctx, type, 300, ty + 25, 40);
      var st2 = isTouchOn() ? 3 : 0; // 觸控模式: 兩行字都是 21px, 上下拉開
      text(ctx, ITEM_NAME[type], 330, ty + 17 - st2, 16, K.ink, 'left', true);
      text(ctx, ITEM_FX[type], 330, ty + 36 + st2, 12, K.inkDim, 'left', true);
      ctx.restore();
      if (sold) {
        ctx.save(); ctx.translate(840, ty + 25); ctx.rotate(-0.08); rr(ctx, -44, -13, 88, 26, 4); ctx.lineWidth = 2.5; ctx.strokeStyle = '#5a5448'; ctx.stroke(); text(ctx, '售完', 0, 0.5, 16, '#5a5448', 'center', true); ctx.restore();
      } else {
        costLine(ctx, e.cost, stock, 700, ty + 25, 15, 'left');
        text(ctx, '剩 ' + left, 992, ty + 25.5, 14, K.ink, 'right', true);
      }
    }
    keyRow(ctx, [['↑↓', '選擇'], ['Z', '購買'], ['X', '返回']], 272, 568, 13, 'left');
    ctx.restore();
  }
  function heroBig(ctx, cls, cx, cy, k, alpha) {
    ctx.save(); ctx.translate(cx, cy); ctx.scale(k, k); if (alpha < 1) ctx.globalAlpha *= alpha;
    heroFig(ctx, cls, 1, {}); ctx.restore();
  }
  function drawClassSelect(ctx, st) {
    st = obj(st);
    var classes = arr(st.classes), sel = Math.round(clamp(num(st.sel, 0), 0, 2)), i;
    ctx.save();
    dimScreen(ctx, 0.55);
    board(ctx, 290, 200, 700, 320);
    text(ctx, '選擇職業', 316, 226, 20, K.cream, 'left', true, 4, K.edge);
    for (i = 0; i < 3; i++) {
      var c = obj(classes[i]), cls = oneOf(c.cls, CLS, CLS[i]), owned = c.owned === true, isSel = i === sel, x = 316 + 224 * i;
      var ty = tag(ctx, x, 250, 200, 220, isSel ? 'hot' : null, owned ? 'normal' : 'dim');
      ell(ctx, x + 100, ty + 112, 40, 7); ctx.fillStyle = 'rgba(60,40,20,0.25)'; ctx.fill();
      heroBig(ctx, cls, x + 100, ty + 67, 2.5, owned ? 1 : 0.35);
      if (!owned) lockIcon(ctx, x + 100, ty + 70, 34, '#4a3e2e');
      var cy0 = isTouchOn() ? -8 : 0, cgap = isTouchOn() ? 22 : 0; // 觸控模式: 字都是 21px, 三行拉開、出發鍵往下
      text(ctx, CLS_NAME[cls], x + 100, ty + 136 + cy0, 20, owned ? K.ink : '#5e5240', 'center', true);
      text(ctx, '特性: ' + CLS_TRAIT[cls], x + 100, cgap ? ty + 128 + cgap : ty + 158, 13, K.inkDim, 'center', true);
      text(ctx, '技能: ' + CLS_SKILL[cls], x + 100, cgap ? ty + 128 + cgap * 2 : ty + 178, 13, K.inkDim, 'center', true);
      if (!owned) text(ctx, '到升級所解鎖', x + 100, cgap ? ty + 204 : ty + 202, 13, '#8a3a1a', 'center', true);
      else if (isSel) actKey(ctx, 'z', '出發', x + 100, cgap ? ty + 204 : ty + 201, 'hot', 'center', 13);
    }
    keyRow(ctx, [['←→', '選擇'], ['Z', '出發'], ['X', '返回']], 316, 498, 13, 'left');
    ctx.restore();
  }

  // ---------- 升級所 ----------
  // 職業卡角色: 錨點在腳底 (cx, footY); mode 'color' 彩色 / 'gray' 灰色剪影(未解鎖)
  function heroCard(ctx, cls, cx, footY, k, mode, pose, poseT) {
    ctx.save(); ctx.translate(cx, footY - 18 * k); ctx.scale(k, k);
    if (mode === 'gray') { // 灰色剪影: 濾鏡去色壓暗(不支援 filter 的瀏覽器退回半透明)
      ctx.globalAlpha *= 0.55;
      try { if ('filter' in ctx) ctx.filter = 'grayscale(1) brightness(0.55) contrast(0.85)'; } catch (e) { /* 沒有濾鏡就只靠半透明 */ }
    }
    heroFig(ctx, cls, 1, { pose: pose || 'idle' });
    if (pose === 'cheer') { var cq = ((poseT || 0) * 4) % 1; ctx.fillStyle = PAL.select; star4(ctx, -9, -13 - cq * 3, 2.5); ctx.fill(); star4(ctx, 9, -12 - ((cq + 0.5) % 1) * 3, 2.2); ctx.fill(); }
    ctx.restore();
  }
  // 鎖(同職業選擇彈窗的鎖); open 0~1 = 鎖環抬起轉開
  function lockOpen(ctx, cx, cy, sz, col, open, rot) {
    var k = sz / 24;
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(rot || 0); ctx.scale(k, k);
    ctx.save();
    if (open) { ctx.translate(6, 1 - 5 * open); ctx.rotate(-0.9 * open); ctx.translate(-6, -1); }
    ctx.lineWidth = 3; ctx.strokeStyle = col; ctx.beginPath(); ctx.arc(0, -3, 6, Math.PI, 0); ctx.lineTo(6, 1); ctx.moveTo(-6, 1); ctx.lineTo(-6, -3); ctx.stroke();
    ctx.restore();
    rr(ctx, -9, 0, 18, 13, 2.5); ctx.fillStyle = col; ctx.fill();
    circle(ctx, 0, 5.5, 2); ctx.fillStyle = '#141a22'; ctx.fill();
    ctx.restore();
  }
  function unlockedStamp(ctx, x, y, k, a) {
    if (a <= 0) return;
    ctx.save(); ctx.translate(x, y); ctx.rotate(-0.1); ctx.scale(k, k); ctx.globalAlpha *= clamp(a, 0, 1);
    rr(ctx, -50, -15, 100, 30, 4); ctx.lineWidth = 2.5; ctx.strokeStyle = K.good; ctx.stroke();
    text(ctx, '已解鎖', 0, 0.5, 16, K.good, 'center', true);
    ctx.restore();
  }
  function eIn3(p) { p = clamp(p, 0, 1); return p * p * p; }
  var STAT_NAME = { speed: '移動速度', hp: '血量', cd: '技能冷卻', atk: '攻擊傷害' };
  var STAT_FX = { speed: ['+0%', '+8%', '+16%', '+24%'], hp: ['3', '4', '5', '6'], cd: ['-0%', '-15%', '-30%', '-45%'], atk: ['+0', '+1', '+2', '+3'] }; // polish 第 3 輪: 四項都 3 階
  var STAT_KEYS = ['speed', 'hp', 'cd', 'atk'], STAT_Y = [262, 352, 442, 532];
  var HERO_K = 2.1; // 職業卡角色倍率; 腳底 = 卡片頂 + 94
  function drawUpgradePage(ctx, st) {
    st = obj(st);
    var row = Math.round(clamp(num(st.row, 0), 0, 4)), recruits = arr(st.recruits), rSel = Math.round(clamp(num(st.recruitSel, 0), 0, 1)), stats = arr(st.stats), stock = st.stock, i;
    var uDur = Math.max(0.01, num(st.unlockDur, 1.3)), uT = clamp(num(st.unlockT, uDur), 0, uDur);
    var uIdx = (st.unlockIdx === 0 || st.unlockIdx === 1) ? st.unlockIdx : null, playing = uIdx !== null && uT < uDur;
    var us = uT / uDur * 1.3; // 換算到 1.3 秒時間軸
    var fx = null;
    ctx.save();
    dimScreen(ctx, 0.6);
    board(ctx, 40, 48, 1200, 640, '#33263a');
    text(ctx, '升級所', 60, 72, 22, K.cream, 'left', true, 4, K.edge);
    groove(ctx, 80, 100, 1120, 150, '解鎖職業', row === 0);
    for (i = 0; i < 2; i++) {
      var rc = obj(recruits[i]), cls = oneOf(rc.cls, ['hunter', 'bomber'], i ? 'bomber' : 'hunter'), owned = rc.owned === true, isSel = i === rSel, x = 100 + 550 * i;
      var fxHere = playing && uIdx === i;
      var cardDone = owned && (!fxHere || us >= 0.65);
      var ty = tag(ctx, x, 124, 530, 116, isSel ? (row === 0 ? 'hot' : 'cold') : null, cardDone ? 'done' : 'normal');
      var hx = x + 54, foot = ty + 94;
      if (fxHere) fx = { cls: cls, x: x, ty: ty, hx: hx, foot: foot };
      else heroCard(ctx, cls, hx, foot, HERO_K, owned ? 'color' : 'gray');
      if (!owned) lockOpen(ctx, hx, ty + 58, 30, '#4a3e2e', 0, 0);
      text(ctx, CLS_NAME[cls], x + 104, ty + 26, 20, owned ? K.ink : '#5e5240', 'left', true);
      text(ctx, '特性: ' + CLS_TRAIT[cls], x + 104, ty + 50, 13, K.inkDim, 'left', true);
      text(ctx, '技能: ' + CLS_SKILL[cls], x + 104, ty + 70, 13, K.inkDim, 'left', true);
      if (owned) { if (!fxHere) unlockedStamp(ctx, x + 440, ty + 58, 1, 1); }
      else { var c = costLine(ctx, rc.cost, stock, x + 104, ty + 96, 15, 'left'); actKey(ctx, 'z', '解鎖', x + 514, ty + 96, c.ok ? (isSel && row === 0 ? 'hot' : 'idle') : 'off', 'right', 13); }
    }
    for (i = 0; i < 4; i++) {
      var s = obj(stats[i]), key = oneOf(s.key, STAT_KEYS, STAT_KEYS[i]), maxLv = Math.round(clamp(num(s.maxLv, STAT_FX[key].length - 1), 1, 9)), lv = Math.round(clamp(num(s.lv, 0), 0, maxLv));
      var y = STAT_Y[i], on = row === i + 1, sfx = STAT_FX[key], full = s.cost == null || lv >= maxLv;
      groove(ctx, 80, y, 1120, 84, null, on);
      var ty2 = tag(ctx, 92, y + 10, 1096, 64, on ? 'hot' : null, 'normal');
      text(ctx, STAT_NAME[key], 112, ty2 + 32, 20, K.ink, 'left', true);
      for (var j = 0; j < maxLv; j++) { rr(ctx, 230 + j * 28, ty2 + 24, 22, 16, 3); ctx.fillStyle = j < lv ? PAL.core : '#cfc2a2'; ctx.fill(); ctx.lineWidth = 1.2; ctx.strokeStyle = K.edge; ctx.stroke(); }
      var cur = STAT_NAME[key] + ' ' + (sfx[lv] || sfx[sfx.length - 1]);
      text(ctx, cur, 360, ty2 + 32, 17, K.ink, 'left', true);
      if (!full) { var cw = tw(ctx, cur, 17, true); text(ctx, '→  ' + (sfx[lv + 1] || ''), 372 + cw, ty2 + 32, 17, K.good, 'left', true); }
      if (full) { ctx.save(); ctx.translate(1110, ty2 + 32); ctx.rotate(-0.08); rr(ctx, -44, -14, 88, 28, 4); ctx.lineWidth = 2.5; ctx.strokeStyle = K.inkDim; ctx.stroke(); text(ctx, '已滿', 0, 0.5, 16, K.inkDim, 'center', true); ctx.restore(); }
      else { var cc = costLine(ctx, s.cost, stock, 760, ty2 + 32, 16, 'left'); actKey(ctx, 'z', '強化', 1172, ty2 + 32, cc.ok ? (on ? 'hot' : 'idle') : 'off', 'right', 14); }
    }
    keyRow(ctx, [['↑↓', '換列'], ['←→', '選擇'], ['Z', '解鎖 / 強化'], ['X', '關閉']], 60, 674, 13, 'left');
    if (fx) unlockFx(ctx, fx, us);
    ctx.restore();
  }
  // 解鎖特效(unlock-fx 方案 B「光柱召喚角色躍出」), 疊在其他列之上、裁在頁面框 (40,48,1200,640) 內; s = 0~1.3 秒
  // 0~0.3 鎖喀一聲彈開飛走 + 金色光柱打下 → 0.3~0.65 顏色從腳往頭灌滿 → 0.65~1.0 角色放大(≤ 約 1.45 倍)跳出卡片歡呼(頭頂 ≥ y 64),
  // 背後職業色放射光(半徑 ≤ 120)+ 金星(≤ 60px)→ 1.0~1.3 落回原位(1.0~1.15 下落、1.15~1.3 壓扁回彈 + 揚塵)、「已解鎖」章從大縮小砸下
  function unlockFx(ctx, f, s) {
    var hx = f.hx, foot = f.foot, k0 = HERO_K, cls = f.cls, i;
    ctx.save(); ctx.beginPath(); ctx.rect(40, 48, 1200, 640); ctx.clip();
    // 光柱: 0~0.3 打下, 0.65~0.95 收掉
    var pg = eOut(seg(s, 0, 0.3)), pf = 1 - seg(s, 0.65, 0.95);
    if (pg > 0 && pf > 0) {
      var pw = 64 * pg, topY = 48, botY = f.ty + 110;
      ctx.save(); ctx.globalAlpha *= 0.85 * pf;
      ctx.fillStyle = lin(ctx, hx - pw, 0, hx + pw, 0, [0, 'rgba(255,216,74,0)', 0.3, 'rgba(255,216,74,0.35)', 0.5, 'rgba(255,252,236,0.85)', 0.7, 'rgba(255,216,74,0.35)', 1, 'rgba(255,216,74,0)']);
      ctx.fillRect(hx - pw, topY, pw * 2, (botY - topY) * pg);
      if (pg > 0.95) { ell(ctx, hx, botY - 4, pw * 0.9, 7); ctx.fillStyle = 'rgba(255,240,180,0.6)'; ctx.fill(); }
      ctx.restore();
    }
    // 鎖: 喀一聲轉開(0~0.12)→ 往上飛、放大、淡出 + 光點(0.12~0.3)
    if (s < 0.3) {
      var lo = seg(s, 0, 0.12), lp = seg(s, 0.12, 0.3);
      ctx.save(); ctx.globalAlpha *= 1 - lp;
      lockOpen(ctx, hx + 10 * lp, f.ty + 58 - 40 * eOut(lp), 30 * (1 + 0.3 * lp), '#4a3e2e', lo, 0.6 * lp);
      ctx.restore();
      if (lp > 0) { ctx.save(); ctx.fillStyle = '#fff3c4'; ctx.globalAlpha *= 1 - lp; for (var m = 0; m < 7; m++) { star4(ctx, hx - 18 + 6 * m + Math.sin(m * 2.1) * 4, f.ty + 54 - (24 + 20 * hash(m, 3)) * lp, 2.6); ctx.fill(); } ctx.restore(); }
    }
    // 角色
    if (s < 0.3) heroCard(ctx, cls, hx, foot, k0, 'gray');
    else if (s < 0.65) { // 灌色: 灰剪影 + 由腳往頭的彩色區 + 白色掃線
      var fp = eOut(seg(s, 0.3, 0.63)), top = foot - 36 * k0 - 2, fy = lerp(foot + 2, top, fp);
      heroCard(ctx, cls, hx, foot, k0, 'gray');
      ctx.save(); ctx.beginPath(); ctx.rect(hx - 50, fy, 100, foot + 4 - fy); ctx.clip(); heroCard(ctx, cls, hx, foot, k0, 'color'); ctx.restore();
      ctx.save(); ctx.globalAlpha *= 0.9; ctx.fillStyle = '#ffffff'; rr(ctx, hx - 30, fy - 2, 60, 4, 2); ctx.fill(); ctx.restore();
    } else {
      // 卡底轉綠的閃白(0.65~0.85)
      var fl = seg(s, 0.65, 0.85);
      if (fl < 1) { ctx.save(); rr(ctx, f.x, f.ty, 530, 116, 6); ctx.fillStyle = 'rgba(255,255,255,' + (0.7 * (1 - fl)).toFixed(3) + ')'; ctx.fill(); ctx.restore(); }
      var jp = seg(s, 0.65, 1.15), lift = 40 * Math.sin(Math.PI * jp), kk = k0 * (1 + 0.45 * Math.sin(Math.PI * jp));
      var land = seg(s, 1.15, 1.3), sq = (s >= 1.15 && s < 1.3) ? Math.sin(land * Math.PI) : 0;
      var hcY = foot - lift - 18 * kk; // 角色中心
      if (s < 1.05) { // 放射光(半徑 ≤ 120)
        var rp = seg(s, 0.67, 1.05);
        ctx.save(); ctx.globalAlpha *= (1 - rp) * 0.85; ctx.translate(hx, hcY); ctx.rotate(s * 1.6);
        for (var r = 0; r < 12; r++) {
          var a = r * TAU / 12, L = lerp(36, 118, eOut(rp));
          poly(ctx, [Math.cos(a - 0.09) * 20, Math.sin(a - 0.09) * 20, Math.cos(a) * L, Math.sin(a) * L, Math.cos(a + 0.09) * 20, Math.sin(a + 0.09) * 20]);
          ctx.fillStyle = r % 2 ? K.select : PAL[cls]; ctx.fill();
        }
        ctx.restore();
      }
      ctx.save(); ctx.translate(hx, foot - lift); ctx.scale(1 + 0.12 * sq, 1 - 0.16 * sq); ctx.translate(-hx, -(foot - lift));
      heroCard(ctx, cls, hx, foot - lift, kk, 'color', s < 1.15 ? 'cheer' : 'idle', s);
      ctx.restore();
      var sp = seg(s, 0.67, 1.1); // 金星(≤ 60px)
      if (sp > 0 && sp < 1) {
        ctx.save(); ctx.globalAlpha *= 1 - eIn3(sp); ctx.fillStyle = K.select;
        for (var q = 0; q < 10; q++) { var b = -Math.PI / 2 + (q - 4.5) * 0.33, R = 60 * eOut(sp); star4(ctx, hx + Math.cos(b) * R * 1.3, hcY + Math.sin(b) * R + 30 * sp * sp, 5.5 - 2.5 * sp); ctx.fill(); }
        ctx.restore();
      }
      if (land > 0 && land < 1) { // 落地揚塵
        ctx.save(); ctx.globalAlpha *= 1 - land; ctx.fillStyle = '#efe3c6';
        for (var d = 0; d < 4; d++) { var side = d < 2 ? -1 : 1, off = (d % 2) * 12; circle(ctx, hx + side * (24 + off + 22 * eOut(land)), foot - 2 - 6 * land - off * 0.3, 6 - 2 * land); ctx.fill(); }
        ctx.restore();
      }
    }
    // 「已解鎖」章: 1.0~1.3 從大縮小砸下
    var stp = seg(s, 1.0, 1.25);
    if (stp > 0) unlockedStamp(ctx, f.x + 440, f.ty + 58, lerp(1.8, 1, eOut(stp)), stp);
    ctx.restore();
  }

  // ---------- 結算 / 失敗 / 暫停 ----------
  // 結算(result-panel 方案 B「對決外框發光」): 畫在 drawClearIris 的全木板之上, 本函式不畫全畫面暗幕
  var RES = { X: 280, Y: 150, W: 720, H: 420, LX: 300, RX: 710, CW: 270, TOP: 214, BOT: 484, SC: 640, ROW0: 264, ROWH: 40 };
  function resColumn(ctx, x, hot) {
    var T = RES.TOP, Hc = RES.BOT - RES.TOP, i;
    if (hot) { // 「這一趟」: 金色外光(欄外 ≤ 10px)+ 亮羊皮紙 + 金框
      for (i = 4; i >= 1; i--) { rr(ctx, x - i * 2.4, T - i * 2.4, RES.CW + i * 4.8, Hc + i * 4.8, 8 + i * 2.4); ctx.lineWidth = 2.6; ctx.strokeStyle = 'rgba(255,216,74,' + (0.45 * (1 - i / 5)).toFixed(3) + ')'; ctx.stroke(); }
      rr(ctx, x, T, RES.CW, Hc, 8); ctx.fillStyle = '#fbf3dc'; ctx.fill();
      rr(ctx, x - 1.5, T - 1.5, RES.CW + 3, Hc + 3, 9); ctx.lineWidth = 4; ctx.strokeStyle = K.select; ctx.stroke();
    } else { // 「目前回放」: 淡羊皮紙 + 淡色虛線框
      rr(ctx, x, T, RES.CW, Hc, 8); ctx.fillStyle = K.parchDim; ctx.fill();
      ctx.save(); ctx.setLineDash([7, 5]); rr(ctx, x + 1.5, T + 1.5, RES.CW - 3, Hc - 3, 7); ctx.lineWidth = 2; ctx.strokeStyle = K.inkDim; ctx.stroke(); ctx.restore();
    }
    for (i = 0; i < 6; i += 2) { ctx.fillStyle = hot ? 'rgba(120,90,40,0.08)' : 'rgba(80,60,30,0.08)'; ctx.fillRect(x + 6, RES.ROW0 + i * RES.ROWH - 18, RES.CW - 12, 36); }
  }
  function resHanger(ctx, x) { // 欄頂中央的金色吊牌「這一趟」(可超出欄上緣 24px)
    var tw0 = 132, tx = x + RES.CW / 2 - tw0 / 2, ty = RES.TOP - 22;
    ctx.beginPath(); ctx.moveTo(tx + 16, ty + 4); ctx.lineTo(x + 26, RES.TOP + 2); ctx.moveTo(tx + tw0 - 16, ty + 4); ctx.lineTo(x + RES.CW - 26, RES.TOP + 2);
    ctx.lineWidth = 2; ctx.strokeStyle = K.selectDeep; ctx.stroke();
    rr(ctx, tx + 2, ty + 3, tw0, 32, 6); ctx.fillStyle = K.selectDeep; ctx.fill();
    rr(ctx, tx, ty, tw0, 32, 6); ctx.fillStyle = K.select; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = K.edge; ctx.stroke();
    text(ctx, '這一趟', x + RES.CW / 2, ty + 16.5, 19, K.ink, 'center', true);
  }
  function resOldHead(ctx, x) { text(ctx, '目前回放', x + RES.CW / 2, RES.TOP + 16, 13, K.inkDim, 'center', true); }
  // 一欄的六列: 職業 / 通關時間 / 四種素材「run 數 · rates/分」; side 'L' 數字靠右(貼脊)、'R' 靠左(貼脊)、'C' 置中單欄
  function resRows(ctx, x, side, d, cmp, hot) {
    var ink = hot ? K.ink : '#5e5442', dim = hot ? K.inkDim : '#857a64', i;
    var ax = side === 'L' ? x + RES.CW - 18 : (side === 'R' ? x + 18 : x + RES.CW - 18), al = side === 'R' ? 'left' : 'right';
    var y0 = RES.ROW0;
    // 職業
    var cn = CLS_NAME[d.cls], cnw = tw(ctx, cn, 16, true);
    var cix = al === 'left' ? ax + 10 : ax - cnw - 14;
    clsIcon(ctx, d.cls, cix, y0, 20);
    text(ctx, cn, al === 'left' ? ax + 24 : ax, y0 + 0.5, 16, ink, al, true);
    // 通關時間
    var tc = cmp ? (d.time < d.oTime ? K.good : (d.time > d.oTime ? dim : ink)) : ink;
    text(ctx, fmt1(d.time) + ' 秒', ax, y0 + RES.ROWH + 0.5, 22, tc, al, true);
    if (side === 'C') { text(ctx, '職業', x + 18, y0 + 0.5, 13, dim, 'left', true); text(ctx, '通關時間', x + 18, y0 + RES.ROWH + 0.5, 13, dim, 'left', true); }
    for (i = 0; i < 4; i++) {
      var k = KINDS[i], y = y0 + (i + 2) * RES.ROWH, rv = Math.round(d.rates[k] * 10) / 10, ov = Math.round(d.oRates[k] * 10) / 10;
      var col = cmp ? (rv > ov ? K.good : (rv < ov ? dim : ink)) : ink;
      var big = '+' + fmt1(rv) + '/分', small = intStr(d.run[k]) + ' 個 · ';
      var bw = tw(ctx, big, 19, true), sw = tw(ctx, small, 12, true);
      if (side === 'C') matIcon(ctx, k, x + 26, y, 20);
      if (al === 'left') { text(ctx, small, ax, y + 1, 12, dim, 'left', true); text(ctx, big, ax + sw, y + 0.5, 19, col, 'left', true); }
      else { text(ctx, big, ax, y + 0.5, 19, col, 'right', true); text(ctx, small, ax - bw, y + 1, 12, dim, 'right', true); }
      if (side === 'C') text(ctx, KIND_NAME[k], x + 40, y + 0.5, 13, dim, 'left', true);
    }
  }
  function spineArrow(ctx, y, dir) { // dir −1 指左(這一趟較好)/ 1 指右(目前回放較好)/ 0 一樣
    if (dir === 0) { text(ctx, '=', RES.SC, y + 0.5, 18, '#8f846e', 'center', true); return; }
    var x = RES.SC + dir * 56;
    poly(ctx, [x + dir * 10, y, x - dir * 4, y - 9, x - dir * 4, y + 9]);
    ctx.fillStyle = K.goodLight; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = K.edge; ctx.stroke();
  }
  function drawResultPanel(ctx, st) {
    st = obj(st);
    var items = arr(st.items).slice(0, 2), i;
    var cmp = st.oldTime !== null && st.oldTime !== undefined && isFinite(Number(st.oldTime));
    var d = { cls: oneOf(st.cls, CLS, 'sword'), time: clamp(num(st.time, 0), 0, 99999), run: mats(st.run), rates: mats(st.rates) };
    var o = cmp ? { cls: oneOf(st.oldCls, CLS, 'sword'), time: clamp(num(st.oldTime, 0), 0, 99999), run: mats(st.oldRun), rates: mats(st.oldRates) } : null;
    d.oTime = o ? o.time : d.time; d.oRates = o ? o.rates : d.rates;
    ctx.save();
    board(ctx, RES.X, RES.Y, RES.W, RES.H, '#2f3322');
    rr(ctx, RES.X + 0.5, RES.Y + 0.5, RES.W - 1, RES.H - 1, 8); ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(255,216,74,0.35)'; ctx.stroke(); // 和底下的全木板分開
    poly(ctx, [560, RES.Y + 10, 720, RES.Y + 10, 708, RES.Y + 25, 720, RES.Y + 40, 560, RES.Y + 40, 572, RES.Y + 25]); ctx.fillStyle = K.good; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = K.edge; ctx.stroke();
    text(ctx, '過關', 640, RES.Y + 25.5, 20, '#ffffff', 'center', true, 3, '#14361f');
    var hotX = cmp ? RES.LX : 505;
    if (cmp) {
      resColumn(ctx, RES.RX, false); resOldHead(ctx, RES.RX);
      resRows(ctx, RES.RX, 'R', { cls: o.cls, time: o.time, run: o.run, rates: o.rates, oTime: d.time, oRates: d.rates }, true, false);
    }
    resColumn(ctx, hotX, true);
    resRows(ctx, hotX, cmp ? 'L' : 'C', d, cmp, true);
    resHanger(ctx, hotX);
    if (cmp) { // 中央脊: 列名 + 綠箭頭指向較好的一邊
      rr(ctx, 576, RES.TOP + 30, 128, RES.BOT - RES.TOP - 40, 8); ctx.fillStyle = 'rgba(0,0,0,0.28)'; ctx.fill();
      text(ctx, '職業', RES.SC, RES.ROW0 + 0.5, 14, K.labelDim, 'center', true, 3, K.edge);
      text(ctx, '通關時間', RES.SC, RES.ROW0 + RES.ROWH + 0.5, 14, K.labelDim, 'center', true, 3, K.edge);
      spineArrow(ctx, RES.ROW0 + RES.ROWH, d.time < o.time ? -1 : (o.time < d.time ? 1 : 0));
      for (i = 0; i < 4; i++) {
        var k = KINDS[i], y = RES.ROW0 + (i + 2) * RES.ROWH, a = Math.round(d.rates[k] * 10) / 10, b = Math.round(o.rates[k] * 10) / 10;
        matIcon(ctx, k, RES.SC - 22, y, 18);
        text(ctx, KIND_NAME[k], RES.SC - 10, y + 0.5, 14, K.labelDim, 'left', true, 3, K.edge);
        spineArrow(ctx, y, a > b ? -1 : (a < b ? 1 : 0));
      }
    }
    for (i = 0; i < items.length; i++) { // 這趟得到的裝置: 欄下方, 一行至多 2 個
      var tp = oneOf(items[i], ITEMS, 'bagWood'), ix = hotX + i * 140;
      itemIcon(ctx, tp, ix + 16, 510, 32);
      fitText(ctx, '獲得 ' + ITEM_NAME[tp], ix + 36, 510.5, 13, tp === 'heart' ? '#e8c8ff' : K.cream, 100);
    }
    if (cmp) keyRow(ctx, [['Z', '採用這一趟', true], ['X', '保留舊的']], 640, 548, 15, 'center');
    else {
      kline(ctx, [{ t: '已存成回放    ', col: K.goodLight }, { key: 'z', st: 'hot' }, '回大地圖'], 640, 548, 15, 'center', 'board');
    }
    ctx.restore();
  }
  function drawFailPanel(ctx) {
    ctx.save();
    board(ctx, 380, 240, 520, 240, '#4a2420');
    text(ctx, '失敗', 640, 292, 32, '#ff8a7a', 'center', true, 5, K.edge);
    text(ctx, '這趟作廢, 素材不入帳', 640, 342, 15, '#e8c8b8', 'center', true, 3, K.edge);
    keyRow(ctx, [['Z', '重來', true], ['X', '回大地圖']], 640, 420, 16, 'center');
    ctx.restore();
  }
  function drawPausePanel(ctx, st) {
    st = obj(st);
    var mode = st.mode === 'level' ? 'level' : 'map', touch = st.touch === true;
    ctx.save();
    dimScreen(ctx, 0.55);
    board(ctx, 380, 220, 520, 280);
    text(ctx, '暫停', 640, 276, 32, K.cream, 'center', true, 5, K.edge);
    if (touch) act(ctx, '繼續', 640, 350, 'hot', 'center', 18);
    else keyRow(ctx, [['Esc', '繼續', true]], 640, 350, 17, 'center');
    if (mode === 'level') keyRow(ctx, [['Z', '重來'], ['X', '回大地圖']], 640, 420, 16, 'center');
    ctx.restore();
  }

  // ================= 死亡動畫(death-anim 方案 B「定格碎裂」) =================
  // 碎片顏色取該職業身上的配色; 形狀照縮圖記號的形狀語言(劍士方塊 / 獵人三角 / 炸彈工圓塊)
  var SHARD_COL = {
    sword: [PAL.sword, PAL.sword, HC.cape, PAL.gold, HC.metal, HC.pants],
    hunter: [PAL.hunter, PAL.hunter, HC.hood, HC.woodC, PAL.hunter, HC.eye],
    bomber: [PAL.bomber, PAL.bomber, PAL.skin, PAL.bomb, PAL.bomber, '#3a3f4c']
  };
  // 裂痕(以「命中點在右側」設計, 依命中方向旋轉): 三條主裂 + 兩條分岔
  var CRACKS = [
    [[13, -4], [6, -6], [1, -12], [-4, -15]],
    [[13, -4], [5, -1], [-2, 2], [-7, 9], [-10, 15]],
    [[13, -4], [8, 4], [3, 10], [4, 16]],
    [[5, -1], [0, -4], [-8, -3]],
    [[1, -12], [6, -16]]
  ];
  function deathCracks(ctx, p, ang) {
    ctx.save();
    ctx.beginPath(); ctx.rect(-14, -18, 28, 36); ctx.clip();
    ctx.rotate(ang);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (var pass = 0; pass < 2; pass++) {
      ctx.lineWidth = pass ? 1.3 : 3; ctx.strokeStyle = pass ? '#ffffff' : 'rgba(20,14,30,0.85)';
      for (var c = 0; c < CRACKS.length; c++) {
        var pts = CRACKS[c], cp = clamp(p * 1.4 - (c >= 3 ? 0.4 : 0), 0, 1), n = (pts.length - 1) * cp;
        if (n <= 0) continue;
        ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
        for (var i = 1; i <= Math.ceil(n); i++) { var f = Math.min(1, n - (i - 1)), a = pts[i - 1], b = pts[i]; ctx.lineTo(a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f); }
        ctx.stroke();
      }
    }
    ctx.restore();
  }
  function drawDeathFx(ctx, st) {
    st = obj(st);
    var x = num(st.x, 640), y = num(st.y, 360), cls = oneOf(st.cls, CLS, 'sword'), f = face(st.facing);
    var dur = Math.max(0.01, num(st.dur, 1.3)), t = clamp(num(st.t, dur), 0, dur), s = t / dur * 1.3; // 換算到 1.3 秒時間軸
    var hx = num(st.hitX, x), hy = num(st.hitY, y), dx = hx - x, dy = hy - y;
    var hitAng = (Math.abs(dx) + Math.abs(dy) < 1) ? Math.PI / 2 : Math.atan2(dy, dx); // 掉出畫面(命中點 = 角色中心): 從腳下裂起
    var away = Math.abs(dx) < 1 ? 0 : (dx > 0 ? -1 : 1); // 碎片往命中反方向噴
    var i;
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.clip(); // 碎片可落到 y 720 以下: 不畫
    // 0~0.15 全畫面壓到約 70% 深色暗幕(角色周圍略淡, 視線收到角色身上)
    var dk = 0.7 * eOut(seg(s, 0, 0.15));
    if (dk > 0) {
      ctx.fillStyle = rad(ctx, x, y, 30, 200, [0, 'rgba(10,6,20,' + (dk * 0.72).toFixed(3) + ')', 1, 'rgba(10,6,20,' + dk.toFixed(3) + ')']);
      ctx.fillRect(0, 0, W, H);
    }
    if (t >= dur) { ctx.restore(); return; } // t = dur: 只剩暗幕
    if (s < 0.7) { // 角色定格(idle、朝 facing), 原亮度 + 微微發白; 0.15~0.7 抖動 ±2 越來越快、裂痕爬滿
      var jp = seg(s, 0.15, 0.7), jit = s < 0.15 ? 0 : 2 * Math.min(1, 0.4 + jp) * Math.sin(s * (40 + 120 * jp));
      ctx.save(); ctx.translate(x + jit, y);
      circle(ctx, 0, 0, 30); ctx.fillStyle = rad(ctx, 0, 0, 4, 30, [0, 'rgba(255,255,255,0.28)', 1, 'rgba(255,255,255,0)']); ctx.fill();
      heroFig(ctx, cls, f, { pose: 'idle' });
      ctx.save(); ctx.globalAlpha *= 0.18 + 0.12 * jp; heroFig(ctx, cls, f, { pose: 'idle', tint: '#ffffff' }); ctx.restore();
      if (s < 0.1) { ctx.save(); ctx.globalAlpha *= 0.7 * (1 - s / 0.1); ctx.fillStyle = '#ffffff'; ctx.fillRect(-13, -17, 26, 34); ctx.restore(); } // 命中閃白
      var ca = hitAng - Math.atan2(-4, 13);
      deathCracks(ctx, seg(s, 0.15, 0.66), ca);
      ctx.restore();
    } else { // 0.7 碎裂: 白色碎裂閃光(半徑 ≤ 40)+ 職業形狀碎片噴出、受重力落地彈一下後淡去
      var u = s - 0.7, cols = SHARD_COL[cls], floor = Math.min(y + 18, 720), G = 620;
      if (u < 0.25) {
        var q = u / 0.25;
        ctx.save(); ctx.globalAlpha *= 1 - q;
        circle(ctx, x, y, 8 + 30 * eOut(q)); ctx.lineWidth = 2.5 * (1 - q) + 0.5; ctx.strokeStyle = '#ffffff'; ctx.stroke();
        circle(ctx, x, y, 22); ctx.fillStyle = rad(ctx, x, y, 0, 22, [0, 'rgba(255,255,255,0.9)', 1, 'rgba(255,255,255,0)']); ctx.fill();
        ctx.restore();
      }
      var fade = 1 - seg(u, 0.32, 0.6);
      if (fade > 0) {
        ctx.save(); ctx.globalAlpha *= fade;
        for (i = 0; i < 14; i++) {
          var c = i % 4, r = Math.floor(i / 4), h1 = hash(i, 1), h2 = hash(i, 2), h3 = hash(i, 3);
          var ox = -10.5 + c * 7, oy = -13.5 + r * 9, sz = 3.2 + h1 * 2.4;
          var side = away !== 0 ? away : (ox < 0 ? -1 : 1);
          var vx = side * (50 + h2 * 110) + ox * 5, vy = -120 - h3 * 150 + oy * 2;
          var x0 = x + ox, y0 = y + oy, fl = floor - sz * 0.7;
          var Aq = G / 2, land = (-vy + Math.sqrt(Math.max(0, vy * vy - 4 * Aq * (y0 - fl)))) / (2 * Aq);
          if (!isFinite(land) || land < 0) land = 0;
          var te = Math.min(u, land), px = x0 + vx * te, py = Math.min(fl, y0 + vy * te + Aq * te * te);
          if (u > land) { var bu = u - land; px += vx * 0.1 * Math.min(1, bu / 0.18); if (bu < 0.18) py -= 7 * (0.6 + 0.4 * h1) * Math.sin(Math.PI * bu / 0.18); } // 落地彈一下 + 滑一小段
          var ddx = px - x, ddy = py - y, dist = Math.sqrt(ddx * ddx + ddy * ddy); // 碎片至多飛離中心 160px
          if (dist > 160 - sz) { px = x + ddx * (160 - sz) / dist; py = y + ddy * (160 - sz) / dist; }
          if (py - sz > 720) continue;
          ctx.save(); ctx.translate(px, py); ctx.rotate(Math.min(u, land) * (h1 - 0.5) * 18);
          ctx.beginPath();
          if (cls === 'sword') ctx.rect(-sz * 0.6, -sz * 0.6, sz * 1.2, sz * 1.2);
          else if (cls === 'hunter') { ctx.moveTo(0, -sz); ctx.lineTo(sz * 0.9, sz * 0.7); ctx.lineTo(-sz * 0.9, sz * 0.7); ctx.closePath(); }
          else ctx.arc(0, 0, sz * 0.7, 0, TAU);
          ctx.fillStyle = cols[i % cols.length]; ctx.fill(); ctx.lineWidth = 0.9; ctx.strokeStyle = '#ffffff'; ctx.stroke();
          ctx.restore();
        }
        ctx.restore();
      }
    }
    ctx.restore();
  }

  // ================= 過關光圈(clear-anim 方案 C「光圈收合」) =================
  // 圓外 = 介面木板(ui 方案 A 的板色 + 板縫); 圓周 = 金色粗邊(寬 8, R = 金邊內緣)+ 8 顆角釘; 畫布座標, 不受 RD 的放大影響
  function irisR(s) {
    var R0 = Math.hypot(W, H) + 40, RH = 130;
    if (s < 0.08) return R0;
    if (s < 0.72) return lerp(R0, RH, eOut(seg(s, 0.08, 0.72))); // 先快後慢
    if (s < 0.86) return RH + 18 * Math.sin(Math.PI * seg(s, 0.72, 0.86)); // 回彈 130 → 148 → 130
    if (s < 1.15) return RH;
    return RH * (1 - eIn3(seg(s, 1.15, 1.38))); // 先慢後快收成 0
  }
  function drawClearIris(ctx, st) {
    st = obj(st);
    var cx = num(st.cx, 640), cy = num(st.cy, 360), dur = Math.max(0.01, num(st.dur, 1.4)), t = clamp(num(st.t, dur), 0, dur), s = t / dur * 1.4;
    var R = t >= dur ? 0 : irisR(s), R0 = Math.hypot(W, H) + 40, i;
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.clip();
    if (R < R0 - 1) {
      ctx.save();
      ctx.beginPath(); ctx.rect(0, 0, W, H);
      if (R > 0.5) { ctx.moveTo(cx + R, cy); ctx.arc(cx, cy, R, 0, TAU, true); }
      ctx.clip('evenodd');
      ctx.fillStyle = K.board; ctx.fillRect(0, 0, W, H);
      for (var yy = 26; yy < H; yy += 26) { ctx.fillStyle = K.seam; ctx.fillRect(0, yy, W, 1.5); ctx.fillStyle = 'rgba(255,220,170,0.05)'; ctx.fillRect(0, yy + 1.5, W, 1); }
      if (R > 0.5) { // 圈外緣往外的淡暗影, 讓圈看起來像挖穿木板
        ctx.fillStyle = rad(ctx, cx, cy, R, R + 48, [0, 'rgba(0,0,0,0.45)', 1, 'rgba(0,0,0,0)']);
        ctx.fillRect(cx - R - 48, cy - R - 48, (R + 48) * 2, (R + 48) * 2);
      }
      ctx.restore();
      if (R > 0.5) { // 金邊(R ~ R+8)+ 外側深邊 + 角釘
        circle(ctx, cx, cy, R + 9.5); ctx.lineWidth = 3; ctx.strokeStyle = K.edge; ctx.stroke();
        circle(ctx, cx, cy, R + 4); ctx.lineWidth = 8; ctx.strokeStyle = K.select; ctx.stroke();
        circle(ctx, cx, cy, R + 1); ctx.lineWidth = 1.5; ctx.strokeStyle = K.selectDeep; ctx.stroke();
        if (s >= 0.72 && s < 1.0) { ctx.save(); ctx.globalAlpha *= 1 - seg(s, 0.72, 1.0); circle(ctx, cx, cy, R + 14); ctx.lineWidth = 10; ctx.strokeStyle = 'rgba(255,216,74,0.45)'; ctx.stroke(); ctx.restore(); }
        if (R < 900) for (i = 0; i < 8; i++) {
          var na = i / 8 * TAU + s * 0.9, nx = cx + Math.cos(na) * (R + 4), ny = cy + Math.sin(na) * (R + 4);
          circle(ctx, nx, ny, 3); ctx.fillStyle = K.nail; ctx.fill(); ctx.lineWidth = 1; ctx.strokeStyle = K.edge; ctx.stroke();
        }
      }
    }
    if (s >= 1.25 && t < dur) { // 收到 0 那一刻: 金星(半徑 ≤ 40), 0.15 秒淡出
      var q = seg(s, 1.25, 1.4), sr = 36 * Math.sin(Math.PI * q);
      if (sr > 0.2) { star4(ctx, cx, cy, sr); ctx.fillStyle = K.select; ctx.fill(); star4(ctx, cx, cy, sr * 0.45); ctx.fillStyle = '#fffbe6'; ctx.fill(); }
    }
    if (s < 0.12) { ctx.fillStyle = 'rgba(255,255,255,' + (0.6 * (1 - s / 0.12)).toFixed(3) + ')'; ctx.fillRect(0, 0, W, H); } // 定格白閃
    ctx.restore();
  }

  // ================= 開始畫面(title 方案 B 關卡之輪; 中央換成倉庫) =================
  // 循環 4 秒: 光點每 4 秒繞一圈、每 0.5 秒掃過一枚窗; 所有週期取 4 秒的因數(標題字呼吸 1.2 秒照規格)
  // polish 第 3 輪: 主視覺縮小約 0.8 倍並上移(中心 (640,340) → (640,300)); 整組動畫含窗光暈與彈跳收在 y 54~552。
  // 規格寫環道半徑 210、窗直徑 72, 但頂端窗 300−210−36 = 54 已貼上限, 再加窗的外框 / 光暈 / 彈跳必超出 → 環道 200、窗直徑 70(見 style.md 判讀約定)
  var TT = { CX: 640, CY: 300, R: 200, WR: 35, N: 8, FLY: 0.85, DOOR: [640, 394], WH: 0.8 };
  var TWK = TT.WR / 44; // 窗內畫面沿用上一版以半徑 44 設計的座標, 整體乘這個倍率
  var TSLOT = ['salt', 'forest', 'forest', 'forest', 'cliff', 'cliff', 'mine', 'mine'];
  var TMAT = { salt: 'core', forest: 'wood', cliff: 'stone', mine: 'crystal' };
  var TCLS = ['sword', 'sword', 'hunter', 'bomber', 'hunter', 'sword', 'bomber', 'hunter'];
  function tSlotPos(i) { var a = -Math.PI / 2 + i * TAU / TT.N; return [TT.CX + Math.cos(a) * TT.R, TT.CY + Math.sin(a) * TT.R]; }
  function tSince(p, i) { return fr(p - i / TT.N) * 4; }
  function titleWindow(ctx, i, p) {
    var th = TSLOT[i], pos = tSlotPos(i), d = tSince(p, i), WR = 44; // 窗內以半徑 44 的座標畫, 下面整體乘 TWK
    var ping = d < 0.5 ? 1 - d / 0.5 : 0, bump = 1 + 0.06 * Math.sin(Math.PI * clamp(d / 0.3, 0, 1));
    ctx.save(); ctx.translate(pos[0], pos[1]); ctx.scale(bump * TWK, bump * TWK);
    // 光暈收窄到窗外 10 單位(畫面上約 8px), 頂端窗的光暈上緣仍 ≥ y 54
    if (ping > 0) { circle(ctx, 0, 0, WR + 10); ctx.fillStyle = rad(ctx, 0, 0, WR, WR + 10, [0, 'rgba(255,214,90,' + (0.7 * ping).toFixed(3) + ')', 1, 'rgba(255,214,90,0)']); ctx.fill(); }
    circle(ctx, 0, 0, WR + 5); ctx.fillStyle = '#161220'; ctx.fill();
    ctx.save(); circle(ctx, 0, 0, WR); ctx.clip();
    var T = THEMES[th];
    ctx.fillStyle = lin(ctx, 0, -WR, 0, WR, [0, th === 'salt' ? '#5e4180' : T.sky0, 1, th === 'salt' ? '#f4c2a2' : T.sky1]); ctx.fillRect(-WR, -WR, WR * 2, WR * 2);
    if (th === 'salt') { // 斷門: 粉紫石柱 + 門縫透光
      var fl = d < 0.4 ? 1 - d / 0.4 : 0;
      ctx.fillStyle = rad(ctx, 0, -2, 2, 30, [0, 'rgba(255,240,220,' + (0.55 + 0.45 * fl).toFixed(3) + ')', 1, 'rgba(255,200,180,0)']); ctx.fillRect(-WR, -WR, WR * 2, WR * 2);
      gateGlyph(ctx, 0, 6, 1.05, '#4e3a68');
      ctx.fillStyle = 'rgba(255,246,220,' + (0.6 + 0.4 * fl).toFixed(3) + ')'; ctx.fillRect(-12, -14, 22, 3); ctx.fillRect(-3, -14, 3, 46);
      ctx.fillStyle = '#fbf3ec'; ctx.fillRect(-WR, 32, WR * 2, 12);
    } else {
      var sc = 0.55, gy = 14;
      ctx.save(); ctx.scale(sc, sc);
      for (var c = -3; c <= 2; c++) {
        drawGround(ctx, { x: (c * 40 + 20), y: gy / sc + 20, theme: th, open: { n: true, e: false, s: false, w: false } });
        drawGround(ctx, { x: (c * 40 + 20), y: gy / sc + 60, theme: th, open: { n: false, e: false, s: false, w: false } });
      }
      ctx.restore();
      var lp = fr(p * 2 + i * 0.13), hk = 0.62, hx = -WR - 14 + (WR * 2 + 28) * lp;
      var ix = 8, mat = TMAT[th];
      if (hx < ix - 4) matIcon(ctx, mat, ix, gy - 10 + Math.sin(p * TAU * 4) * 1.2, 13);
      else if (hx - ix < 22) { var sp = (hx - ix + 4) / 26; ctx.save(); ctx.globalAlpha *= clamp(1 - sp, 0, 1); star4(ctx, ix, gy - 14 - sp * 12, 4 + sp * 6); ctx.fillStyle = '#fff6c0'; ctx.fill(); ctx.restore(); }
      ctx.save(); ctx.translate(hx, gy - 18 * hk); ctx.scale(hk, hk);
      heroFig(ctx, TCLS[i], 1, { pose: 'run', swing: Math.sin(p * TAU * 8 + i) * 3 }); ctx.restore();
    }
    if (ping > 0) { ctx.fillStyle = 'rgba(255,240,180,' + (0.3 * ping).toFixed(3) + ')'; ctx.fillRect(-WR, -WR, WR * 2, WR * 2); }
    ctx.restore();
    circle(ctx, 0, 0, WR - 1.5); ctx.lineWidth = 3.5;
    ctx.strokeStyle = ping > 0 ? 'rgba(255,214,90,' + (0.5 + 0.5 * ping).toFixed(3) + ')' : (th === 'salt' ? '#e8a8d8' : THEMES[th].cap);
    ctx.stroke();
    ctx.restore();
  }
  function warehouse(ctx, p) {
    var CX = 640, BOT = 500, i, bounce = 0;
    for (i = 0; i < TT.N; i++) { var d = tSince(p, i) - TT.FLY; if (d >= 0 && d < 0.25) bounce = Math.max(bounce, Math.sin(Math.PI * d / 0.25)); }
    var s = 1 + 0.04 * bounce;
    // 整棟(含浮島)沿用上一版座標, 以上一版中心 (640,360) 縮 TT.WH 倍後移到 (640,300)
    ctx.save(); ctx.translate(TT.CX, TT.CY); ctx.scale(TT.WH, TT.WH); ctx.translate(-640, -360);
    // 浮島
    ctx.beginPath(); ctx.moveTo(CX - 150, BOT); ctx.quadraticCurveTo(CX - 110, BOT + 56, CX, BOT + 72); ctx.quadraticCurveTo(CX + 110, BOT + 56, CX + 150, BOT); ctx.closePath();
    ctx.fillStyle = lin(ctx, 0, BOT, 0, BOT + 72, [0, '#6b4a34', 1, '#2e1f18']); ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = '#161008'; ctx.stroke();
    ell(ctx, CX, BOT, 150, 15); ctx.fillStyle = '#5cbf45'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = '#161008'; ctx.stroke();
    ell(ctx, CX, BOT - 3, 140, 9); ctx.fillStyle = '#a8e27a'; ctx.fill();
    ctx.save(); ctx.translate(CX, BOT); ctx.scale(s, s); ctx.translate(-CX, -BOT);
    ctx.lineJoin = 'round';
    // 牆
    ctx.fillStyle = lin(ctx, 0, 330, 0, 500, [0, '#a8743e', 1, '#6e4624']); ctx.fillRect(500, 330, 280, 170);
    ctx.strokeStyle = 'rgba(40,22,10,0.55)'; ctx.lineWidth = 2;
    ctx.beginPath(); for (i = 1; i < 14; i++) { ctx.moveTo(500 + i * 20, 332); ctx.lineTo(500 + i * 20, 498); } ctx.stroke();
    ctx.lineWidth = 4; ctx.strokeStyle = '#2a180c'; ctx.strokeRect(500, 330, 280, 170);
    ctx.fillStyle = '#4a2c14'; ctx.fillRect(500, 360, 280, 8); // 橫樑
    // 屋頂
    poly(ctx, [484, 336, 640, 214, 796, 336]); ctx.fillStyle = lin(ctx, 0, 214, 0, 336, [0, '#c8503a', 1, '#7a2a1e']); ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = '#2a0e08'; ctx.stroke();
    ctx.strokeStyle = 'rgba(40,10,6,0.45)'; ctx.lineWidth = 2;
    for (i = 1; i < 6; i++) { var yy = 214 + i * 20; ctx.beginPath(); ctx.moveTo(640 - (yy - 214) * 1.28, yy); ctx.lineTo(640 + (yy - 214) * 1.28, yy); ctx.stroke(); }
    // 閣樓門 + 吊臂
    rr(ctx, 616, 262, 48, 44, 4); ctx.fillStyle = '#2a180c'; ctx.fill(); ctx.fillStyle = 'rgba(255,200,110,0.55)'; ctx.fillRect(622, 268, 36, 32);
    ctx.strokeStyle = '#2a180c'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(640, 258); ctx.lineTo(640, 246); ctx.lineTo(680, 246); ctx.lineTo(680, 266); ctx.stroke();
    // 敞開的大門
    ctx.fillStyle = '#1c0f08'; ctx.fillRect(585, 380, 110, 120);
    ctx.fillStyle = rad(ctx, 640, 470, 6, 90, [0, 'rgba(255,200,110,' + (0.5 + 0.3 * bounce).toFixed(3) + ')', 1, 'rgba(255,170,80,0)']); ctx.fillRect(585, 380, 110, 120);
    poly(ctx, [585, 380, 560, 392, 560, 500, 585, 500]); ctx.fillStyle = '#8a5a2e'; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = '#2a180c'; ctx.stroke();
    poly(ctx, [695, 380, 720, 392, 720, 500, 695, 500]); ctx.fill(); ctx.stroke();
    ctx.lineWidth = 4; ctx.strokeRect(585, 380, 110, 120);
    // 門口素材堆: 一拍長高一點, 斷門閃光時回到原高
    var HEAP = [['wood', -40, 0], ['stone', -14, 2], ['crystal', 12, 2], ['core', 38, 0], ['wood', -27, -14], ['stone', 0, -12], ['crystal', 26, -14],
      ['core', -14, -26], ['wood', 12, -26], ['stone', -1, -38], ['crystal', -30, -3], ['core', 30, -28], ['wood', 0, -50], ['stone', -18, -48]];
    var n = 5 + Math.min(HEAP.length - 5, Math.floor(p * 8) + (tSince(p, Math.floor(p * 8)) > TT.FLY ? 1 : 0));
    ctx.fillStyle = rad(ctx, 640, 480, 4, 70, [0, 'rgba(255,214,90,0.35)', 1, 'rgba(255,214,90,0)']); ctx.fillRect(570, 420, 140, 90);
    for (i = 0; i < n; i++) matIcon(ctx, HEAP[i][0], 640 + HEAP[i][1], 486 + HEAP[i][2], 24);
    ctx.restore();
    ctx.restore();
  }
  function drawTitle(ctx, st) {
    st = obj(st);
    var t = num(st.t, 0), p = fr(t / 4), i;
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.clip();
    ctx.fillStyle = rad(ctx, TT.CX, TT.CY, 40, 760, [0, '#2c3a62', 0.55, '#18203a', 1, '#0c1020']); ctx.fillRect(0, 0, W, H);
    ctx.save(); ctx.translate(TT.CX, TT.CY); ctx.rotate(p * TAU / 12); ctx.fillStyle = 'rgba(255,230,160,0.035)';
    for (i = 0; i < 12; i++) { var a = i * TAU / 12; poly(ctx, [0, 0, Math.cos(a - 0.07) * 900, Math.sin(a - 0.07) * 900, Math.cos(a + 0.07) * 900, Math.sin(a + 0.07) * 900]); ctx.fill(); }
    ctx.restore();
    for (i = 0; i < 70; i++) { var tw2 = 0.5 + 0.5 * Math.sin(p * TAU * (1 + (i % 3)) + i * 2.3); ctx.fillStyle = 'rgba(255,255,255,' + (0.1 + 0.25 * tw2).toFixed(3) + ')'; circle(ctx, hash(i, 4) * W, hash(i, 5) * H, 0.8 + hash(i, 6) * 1.2); ctx.fill(); }
    // 金色環道 + 光點
    circle(ctx, TT.CX, TT.CY, TT.R); ctx.lineWidth = 24; ctx.strokeStyle = '#161220'; ctx.stroke();
    ctx.lineWidth = 19; ctx.strokeStyle = '#2c2438'; ctx.stroke();
    ctx.save(); ctx.beginPath(); ctx.arc(TT.CX, TT.CY, TT.R, -Math.PI / 2, -Math.PI / 2 + TAU); ctx.setLineDash([8, 14]); ctx.lineDashOffset = -p * 22 * 20; ctx.lineWidth = 3.2; ctx.strokeStyle = 'rgba(242,201,76,0.45)'; ctx.stroke(); ctx.restore();
    var ac = -Math.PI / 2 + p * TAU;
    for (i = 0; i < 16; i++) { var a0 = ac - 1.1 * (1 - i / 16), a1 = ac - 1.1 * (1 - (i + 1) / 16); ctx.beginPath(); ctx.arc(TT.CX, TT.CY, TT.R, a0, a1); ctx.lineWidth = 5 + 8 * (i / 16); ctx.strokeStyle = 'rgba(255,214,90,' + (0.06 + 0.5 * (i / 16)).toFixed(3) + ')'; ctx.stroke(); }
    for (i = 0; i < TT.N; i++) titleWindow(ctx, i, p);
    var hx = TT.CX + Math.cos(ac) * TT.R, hy = TT.CY + Math.sin(ac) * TT.R;
    circle(ctx, hx, hy, 24); ctx.fillStyle = rad(ctx, hx, hy, 0, 24, [0, 'rgba(255,248,210,0.95)', 0.35, 'rgba(255,214,90,0.6)', 1, 'rgba(255,214,90,0)']); ctx.fill();
    circle(ctx, hx, hy, 6.5); ctx.fillStyle = '#fffbe8'; ctx.fill();
    warehouse(ctx, p);
    // 素材沿弧線落進倉庫大門
    for (i = 0; i < TT.N; i++) {
      var pos = tSlotPos(i), mat = TMAT[TSLOT[i]];
      for (var j = 0; j < 3; j++) {
        var d = tSince(p, i) - j * 0.06; if (d < 0 || d >= TT.FLY) continue;
        var u = d / TT.FLY, tg = [TT.DOOR[0] + (j - 1) * 18, TT.DOOR[1]], mx = (pos[0] + tg[0]) / 2 + (j - 1) * 32, my = Math.min(pos[1], tg[1]) - 96, v = 1 - u;
        matIcon(ctx, mat, v * v * pos[0] + 2 * v * u * mx + u * u * tg[0], v * v * pos[1] + 2 * v * u * my + u * u * tg[1], 18);
      }
    }
    var s = st.touch === true ? '按 A 開始遊戲' : '按任意按鍵開始遊戲';
    ctx.globalAlpha = 0.775 + 0.225 * Math.cos(t * TAU / 1.2);
    text(ctx, s, 640, 668, 20, '#f2f4f8', 'center', true, 5, 'rgba(8,10,18,0.92)');
    ctx.restore();
  }

  // ================= 結局(ending 方案 B 高崖日出) =================
  var EN = { GY: 520, EDGE: 900, HOR: 486, SUN: 1080, D0: 1.4, D1: 7.0, HK: 2.4, RUN: 2.3, L0: 8.4, LS: 0.22 };
  var EN_HEROES = [{ cls: 'hunter', x: 690, t0: 0.5 }, { cls: 'sword', x: 770, t0: 0.75 }, { cls: 'bomber', x: 845, t0: 1.0 }];
  var EN_CHEER = { sword: 6.4, hunter: 6.9, bomber: 7.4 };
  var EN_PATH = [];
  (function () { for (var i = 0; i <= 40; i++) { var u = i / 40; EN_PATH.push([1250 - 300 * u + Math.sin(u * 9) * 46 * (1 - u * 0.4), 540 + 150 * u]); } })();
  function dawn(t) { return sm(seg(t, EN.D0, EN.D1)); }
  function enHero(h, t) {
    var u = seg(t, h.t0, h.t0 + EN.RUN), x = -40 + (h.x + 40) * eOut(u), running = u > 0 && u < 0.97, jump = 0, cs = t - EN_CHEER[h.cls];
    if (cs > 0 && cs < 0.55) jump = Math.sin(Math.PI * cs / 0.55) * 48;
    var bob = (!running && t > h.t0 + EN.RUN) ? Math.sin((t - h.t0) * 2.4) * 1.5 : 0;
    return { x: x, running: running, legPh: running ? t * 16 : 0, jump: jump, bob: bob };
  }
  function fmtTime(s) {
    s = Math.max(0, Math.floor(clamp(num(s, 0), 0, 359999)));
    var h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), ss = s % 60;
    return (h > 0 ? h + ':' + (m < 10 ? '0' : '') : '') + m + ':' + (ss < 10 ? '0' : '') + ss;
  }
  function drawEnding(ctx, st) {
    st = obj(st);
    var t = clamp(num(st.t, 0), 0, 14), d = dawn(t), totals = mats(st.totals), kills = num(st.kills, 0), i, x;
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.clip();
    // 天空 / 星 / 太陽 / 遠方岩柱
    ctx.fillStyle = (function () { var g = ctx.createLinearGradient(0, 0, 0, EN.HOR + 40); g.addColorStop(0, mix('#0a1028', '#3d63a6', d)); g.addColorStop(0.55, mix('#18204a', '#e8a066', d)); g.addColorStop(1, mix('#2a2c58', '#ffd98a', d)); return g; })();
    ctx.fillRect(0, 0, W, EN.HOR + 40);
    var sa = 1 - seg(t, EN.D0, EN.D0 + 3.5);
    if (sa > 0) for (i = 0; i < 80; i++) { var tw3 = 0.5 + 0.5 * Math.sin(t * 2.2 + i * 1.7); ctx.fillStyle = 'rgba(255,255,255,' + (sa * (0.2 + 0.5 * tw3) * (1 - hash(i, 3) * 0.5)).toFixed(3) + ')'; circle(ctx, hash(i, 1) * W, hash(i, 2) * (EN.HOR - 80), 0.8 + hash(i, 4) * 1.3); ctx.fill(); }
    var sy = 600 - 230 * eOut(seg(t, 1.8, 7.5));
    ctx.fillStyle = rad(ctx, EN.SUN, sy, 20, 420, [0, 'rgba(255,240,190,' + (0.85 * d).toFixed(3) + ')', 0.25, 'rgba(255,200,110,' + (0.4 * d).toFixed(3) + ')', 1, 'rgba(255,170,90,0)']); ctx.fillRect(0, 0, W, EN.HOR + 40);
    if (d > 0.05) { ctx.save(); ctx.translate(EN.SUN, sy); ctx.rotate(t * 0.05); ctx.fillStyle = 'rgba(255,236,170,' + (0.08 * d).toFixed(3) + ')'; for (i = 0; i < 14; i++) { var a = i * TAU / 14; poly(ctx, [0, 0, Math.cos(a - 0.05) * 1100, Math.sin(a - 0.05) * 1100, Math.cos(a + 0.05) * 1100, Math.sin(a + 0.05) * 1100]); ctx.fill(); } ctx.restore(); }
    circle(ctx, EN.SUN, sy, 46); ctx.fillStyle = mix('#c86a4a', '#fff2c8', d); ctx.fill();
    ctx.fillStyle = mix('#141a36', '#8a6a7a', d * 0.8);
    [[60, 300, 46], [170, 360, 30], [980, 330, 40], [1200, 280, 54], [1130, 380, 26]].forEach(function (c) { poly(ctx, [c[0] - c[2] / 2, EN.HOR + 40, c[0] - c[2] / 2 + 4, c[1] + 20, c[0] - c[2] * 0.7, c[1], c[0] + c[2] * 0.7, c[1] - 6, c[0] + c[2] / 2 - 2, c[1] + 22, c[0] + c[2] / 2, EN.HOR + 40]); ctx.fill(); });
    // 雲海 + 山谷
    ctx.fillStyle = mix('#283058', '#ffe0b0', d * 0.9);
    ctx.beginPath(); ctx.moveTo(EN.EDGE - 40, H); for (x = EN.EDGE - 40; x <= W + 40; x += 40) ctx.lineTo(x, EN.HOR + 8 + Math.sin(x * 0.03 + t * 0.4) * 6); ctx.lineTo(W + 40, H); ctx.closePath(); ctx.fill();
    ctx.fillStyle = lin(ctx, 0, EN.HOR + 20, 0, H, [0, mix('#1c2246', '#c7a0a0', d * 0.7), 1, mix('#0e1226', '#4a5a7a', d)]); ctx.fillRect(EN.EDGE - 40, EN.HOR + 26, W - EN.EDGE + 40, H - EN.HOR - 26);
    ctx.fillStyle = mix('#151a34', '#5a6a6a', d * 0.8);
    ctx.beginPath(); ctx.moveTo(EN.EDGE - 40, H); for (x = EN.EDGE - 40; x <= W; x += 20) ctx.lineTo(x, 600 + Math.sin(x * 0.02) * 22 + Math.sin(x * 0.051) * 10); ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
    // 小路與 8 盞關卡燈 → 倉庫
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(EN_PATH[0][0], EN_PATH[0][1]); for (i = 1; i < EN_PATH.length; i++) ctx.lineTo(EN_PATH[i][0], EN_PATH[i][1]);
    ctx.lineWidth = 7; ctx.strokeStyle = mix('#232a48', '#a89070', d); ctx.stroke();
    var pu = seg(t, EN.L0, EN.L0 + EN.LS * 8);
    if (pu > 0) { var nn = Math.round(pu * (EN_PATH.length - 1)); ctx.beginPath(); ctx.moveTo(EN_PATH[0][0], EN_PATH[0][1]); for (i = 1; i <= nn; i++) ctx.lineTo(EN_PATH[i][0], EN_PATH[i][1]); ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(255,214,90,0.85)'; ctx.stroke(); }
    for (var k = 0; k < 8; k++) {
      var lp = EN_PATH[Math.round((k + 0.5) / 8 * (EN_PATH.length - 1) * 0.92)], lt = EN.L0 + k * EN.LS, s2 = t - lt;
      ctx.fillStyle = '#2a2230'; ctx.fillRect(lp[0] - 1.5, lp[1] - 18, 3, 18);
      if (s2 >= 0) { var r = 16 + (s2 < 0.3 ? 12 * (1 - s2 / 0.3) : 2 * Math.sin(t * 3 + k)); circle(ctx, lp[0], lp[1] - 20, r); ctx.fillStyle = rad(ctx, lp[0], lp[1] - 20, 0, r, [0, 'rgba(255,240,180,0.95)', 1, 'rgba(255,200,90,0)']); ctx.fill(); circle(ctx, lp[0], lp[1] - 20, 3.5); ctx.fillStyle = '#fff6d0'; ctx.fill(); }
      else { circle(ctx, lp[0], lp[1] - 20, 3); ctx.fillStyle = '#4a4258'; ctx.fill(); }
    }
    var end = EN_PATH[EN_PATH.length - 1], wt = EN.L0 + EN.LS * 8 + 0.15, wo = seg(t, wt, wt + 0.4), wx = end[0] - 30, wy = end[1] - 8;
    if (wo > 0) { circle(ctx, wx, wy - 20, 80); ctx.fillStyle = rad(ctx, wx, wy - 20, 0, 80, [0, 'rgba(255,214,90,' + (0.6 * wo).toFixed(3) + ')', 1, 'rgba(255,214,90,0)']); ctx.fill(); }
    ctx.lineWidth = 2; ctx.strokeStyle = '#120c08';
    ctx.fillStyle = mix('#3a2a24', '#7a5232', d); ctx.fillRect(wx - 26, wy - 30, 52, 30); ctx.strokeRect(wx - 26, wy - 30, 52, 30);
    poly(ctx, [wx - 32, wy - 28, wx, wy - 52, wx + 32, wy - 28]); ctx.fillStyle = mix('#3a1e1a', '#a84c34', d); ctx.fill(); ctx.stroke();
    ctx.fillStyle = wo > 0 ? 'rgba(255,220,120,' + (0.4 + 0.6 * wo).toFixed(3) + ')' : '#1a120c'; ctx.fillRect(wx - 11, wy - 22, 22, 22);
    ctx.restore();
    // 崖頂
    ctx.beginPath(); ctx.moveTo(-10, EN.GY); ctx.lineTo(EN.EDGE, EN.GY); ctx.lineTo(EN.EDGE + 14, EN.GY + 40); ctx.lineTo(EN.EDGE - 6, EN.GY + 90); ctx.lineTo(EN.EDGE + 8, EN.GY + 150); ctx.lineTo(EN.EDGE - 20, H + 10); ctx.lineTo(-10, H + 10); ctx.closePath();
    ctx.fillStyle = mix('#1e2236', '#6a5a6a', d * 0.85); ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = '#0c0a12'; ctx.stroke();
    ctx.strokeStyle = 'rgba(0,0,0,0.22)'; ctx.lineWidth = 2;
    for (i = 0; i < 9; i++) { ctx.beginPath(); ctx.moveTo(i * 110 - 20, EN.GY + 50 + (i % 3) * 30); ctx.lineTo(i * 110 + 60, EN.GY + 34 + (i % 3) * 30); ctx.stroke(); }
    ctx.fillStyle = mix('#7d8ca5', '#ffe2a8', d * 0.7); ctx.fillRect(-10, EN.GY, EN.EDGE + 10, 10);
    ctx.fillStyle = 'rgba(255,255,255,' + (0.25 + 0.3 * d).toFixed(3) + ')'; ctx.fillRect(-10, EN.GY, EN.EDGE + 10, 2.5);
    // 三人長影 + 本人
    if (d > 0.05) for (i = 0; i < 3; i++) { var hs = enHero(EN_HEROES[i], t), len = 60 + 140 * d; ctx.fillStyle = 'rgba(10,6,20,' + (0.35 * d).toFixed(3) + ')'; poly(ctx, [hs.x - 12, EN.GY + 2, hs.x + 12, EN.GY + 2, hs.x - len + 8, EN.GY + 9, hs.x - len - 16, EN.GY + 9]); ctx.fill(); }
    for (i = 0; i < 3; i++) {
      var h = EN_HEROES[i], s3 = enHero(h, t);
      if (s3.x < -60) continue;
      ctx.save();
      ell(ctx, s3.x, EN.GY + 2, 30 - s3.jump * 0.2, 5); ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fill();
      ctx.translate(s3.x, EN.GY - 18 * EN.HK - s3.jump + s3.bob); ctx.scale(EN.HK, EN.HK);
      heroFig(ctx, h.cls, 1, { swing: Math.sin(s3.legPh) * 3, holdBomb: !(h.cls === 'bomber' && t > EN_CHEER.bomber && t < EN_CHEER.bomber + 1.6) });
      if (d > 0.2) { ctx.fillStyle = 'rgba(255,214,120,' + (0.35 * d).toFixed(3) + ')'; ctx.fillRect(10, -16, 3, 32); }
      ctx.restore();
    }
    // 歡呼特效
    var sw = EN_HEROES[1], hu = EN_HEROES[0], bo = EN_HEROES[2], ca = t - EN_CHEER.sword;
    if (ca > 0.1 && ca < 0.8) { var kk = 1 - Math.abs(ca - 0.3) / 0.5; ctx.save(); ctx.globalAlpha = clamp(kk, 0, 1); star4(ctx, sw.x + 12 * EN.HK, EN.GY - 18 * EN.HK - 19 * EN.HK - enHero(sw, t).jump, 10 + 14 * kk); ctx.fillStyle = '#fff6c0'; ctx.fill(); ctx.restore(); }
    var cb = t - EN_CHEER.hunter, ax = hu.x + 30, ay0 = EN.GY - 60, apex = 150;
    if (cb > 0 && cb < 0.5) { var ay = ay0 - (ay0 - apex) * eOut(cb / 0.5); ctx.strokeStyle = PAL.arrow; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(ax, ay + 26); ctx.lineTo(ax, ay); ctx.stroke(); ctx.fillStyle = '#c9d3df'; poly(ctx, [ax - 4, ay, ax, ay - 8, ax + 4, ay]); ctx.fill(); }
    else if (cb >= 0.5 && cb < 2.4) { var e = cb - 0.5; for (i = 0; i < 16; i++) { var an = i * TAU / 16, spd = 110 + hash(i, 9) * 40, q = eOut(clamp(e / 1.2, 0, 1)); ctx.save(); ctx.globalAlpha = clamp(1 - e / 1.9, 0, 1); star(ctx, ax + Math.cos(an) * spd * q, apex + Math.sin(an) * spd * q + 40 * e * e, 6, 4); ctx.fillStyle = PAL.gold; ctx.fill(); ctx.restore(); } }
    var cc = t - EN_CHEER.bomber, bx0 = bo.x + 12 * EN.HK, by0 = EN.GY - 20 * EN.HK, bxa = bo.x - 40, bya = 200;
    if (cc > 0 && cc < 0.5) { var uu = cc / 0.5, bx = bx0 + (bxa - bx0) * uu, by = by0 + (bya - by0) * eOut(uu); circle(ctx, bx, by, 12); ctx.fillStyle = PAL.bomb; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#ffffff'; ctx.stroke(); star4(ctx, bx + 8, by - 12, 7); ctx.fillStyle = PAL.goal; ctx.fill(); }
    else if (cc >= 0.5 && cc < 3.0) {
      var e2 = cc - 0.5;
      if (e2 < 0.35) { var fl2 = 1 - e2 / 0.35; circle(ctx, bxa, bya, 30 + 60 * (1 - fl2)); ctx.fillStyle = 'rgba(255,170,60,' + (0.8 * fl2).toFixed(3) + ')'; ctx.fill(); }
      for (i = 0; i < 20; i++) { var a2 = i * TAU / 20 + 0.1, sp2 = 150 + hash(i, 5) * 70, r2 = eOut(clamp(e2 / 1.1, 0, 1)); ctx.save(); ctx.globalAlpha = clamp(1.6 - e2 / 1.5, 0, 1); matIcon(ctx, KINDS[i % 4], bxa + Math.cos(a2) * sp2 * r2, bya + Math.sin(a2) * sp2 * r2 + 55 * e2 * e2, 22); ctx.restore(); }
    }
    // 卷軸結算(t ≥ 9.9 展開; 10.4 起為可停留的結算畫面)
    var sa2 = seg(t, 9.9, 10.7);
    if (sa2 > 0) {
      var cx = 440, w = 520, y0 = 34, hFull = 236, hh = hFull * eOut(sa2), cnt = eOut(seg(t, 10.4, 11.4));
      ctx.save(); ctx.beginPath(); ctx.rect(cx - w / 2 - 20, y0, w + 40, hh + 2); ctx.clip();
      rr(ctx, cx - w / 2, y0 + 6, w, hFull, 4); ctx.fillStyle = K.parch; ctx.fill();
      ctx.fillStyle = 'rgba(120,90,40,0.10)'; ctx.fillRect(cx - w / 2, y0 + 6, 14, hFull); ctx.fillRect(cx + w / 2 - 14, y0 + 6, 14, hFull);
      ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(60,40,20,0.5)'; rr(ctx, cx - w / 2, y0 + 6, w, hFull, 4); ctx.stroke();
      text(ctx, '通關時間', cx, y0 + 40, 17, K.inkDim, 'center', true);
      text(ctx, fmtTime(st.totalTime), cx, y0 + 84, 50, K.ink, 'center', true);
      ctx.fillStyle = 'rgba(60,40,20,0.3)'; ctx.fillRect(cx - w / 2 + 40, y0 + 118, w - 80, 1.5);
      text(ctx, '8 關全破', cx - 120, y0 + 142, 18, K.ink, 'center', true);
      text(ctx, '擊倒怪物 ' + grp(kills * cnt), cx + 100, y0 + 142, 18, K.ink, 'center', true);
      for (i = 0; i < 4; i++) { var mx = cx - 196 + i * 102; matIcon(ctx, KINDS[i], mx, y0 + 186, 22); text(ctx, grp(totals[KINDS[i]] * cnt), mx + 15, y0 + 187, 16, K.ink, 'left', true); }
      ctx.restore();
      [y0, y0 + 8 + hh].forEach(function (ry) {
        rr(ctx, cx - w / 2 - 18, ry - 9, w + 36, 18, 9); ctx.fillStyle = '#6b4426'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = K.edge; ctx.stroke();
        circle(ctx, cx - w / 2 - 18, ry, 9); ctx.fillStyle = K.select; ctx.fill(); ctx.stroke(); circle(ctx, cx + w / 2 + 18, ry, 9); ctx.fill(); ctx.stroke();
      });
    }
    if (t >= 10.4) {
      var ph = t < 14 ? t : nowS();
      ctx.save(); ctx.globalAlpha *= 0.775 + 0.225 * Math.cos(ph * TAU / 1.2);
      text(ctx, (window.PVDX && window.PVDX.on) ? '按 A 回到大地圖' : '按任意按鍵回到大地圖', 640, 660, 20, K.cream, 'center', true, 5, K.edge);
      ctx.restore();
    }
    var fi = 1 - seg(t, 0, 0.6);
    if (fi > 0) { ctx.fillStyle = 'rgba(255,250,235,' + fi.toFixed(3) + ')'; ctx.fillRect(0, 0, W, H); }
    ctx.restore();
  }

  // ================= 匯出 =================
  var root = (typeof window !== 'undefined') ? window : (typeof globalThis !== 'undefined' ? globalThis : this);
  root.Art = {
    canvas: { width: VW, height: H },
    palette: PAL,
    themes: THEMES,
    // 字典級小圖示(說明 / 方案頁要重用時呼叫這裡, 不要另抄一份)
    icons: {
      mat: function (ctx, kind, cx, cy, size) { ctx.save(); matIcon(ctx, kind, cx, cy, size); ctx.restore(); },
      item: function (ctx, type, cx, cy, size) { ctx.save(); itemIcon(ctx, type, cx, cy, size); ctx.restore(); },
      cls: function (ctx, cls, cx, cy, size) { ctx.save(); clsIcon(ctx, cls, cx, cy, size); ctx.restore(); },
      key: function (ctx, label, cx, cy, px, hot) { ctx.save(); var w = keycap(ctx, label, cx, cy, px, hot === true || hot === 'hot' ? 'hot' : (hot === 'done' || hot === 'press' ? hot : 'normal')); ctx.restore(); return w; }
    },
    drawTitle: drawTitle,
    drawBackground: drawBackground,
    drawMapBackground: drawMapBackground,
    drawGround: drawGround,
    drawLairBack: drawLairBack,
    drawSpike: drawSpike,
    drawCrackWall: drawCrackWall,
    drawWorksite: drawWorksite,
    drawNestGate: drawNestGate,
    drawSiteSign: drawSiteSign,
    drawFog: drawFog,
    drawTelegraph: drawTelegraph,
    drawPickup: drawPickup,
    drawDropBit: drawDropBit,
    drawChest: drawChest,
    drawGoal: drawGoal,
    drawGoalPrompt: drawGoalPrompt,
    drawPlayer: drawPlayer,
    drawSkillRing: drawSkillRing,
    drawRangeRing: drawRangeRing,
    drawHpBar: drawHpBar,
    drawBoar: drawBoar,
    drawFrog: drawFrog,
    drawShooterBee: drawShooterBee,
    drawThorn: drawThorn,
    drawRam: drawRam,
    drawHawk: drawHawk,
    drawLizard: drawLizard,
    drawRockShot: drawRockShot,
    drawShieldman: drawShieldman,
    drawBeetle: drawBeetle,
    drawBat: drawBat,
    drawBroodmother: drawBroodmother,
    drawColossus: drawColossus,
    drawBossBeam: drawBossBeam,
    drawBossHpBar: drawBossHpBar,
    drawBeeShot: drawBeeShot,
    drawArrow: drawArrow,
    drawBomb: drawBomb,
    drawExplosion: drawExplosion,
    drawShockwave: drawShockwave,
    drawPoof: drawPoof,
    drawPopup: drawPopup,
    drawChainText: drawChainText,
    drawItemIcon: drawItemIcon,
    drawItemNotice: drawItemNotice,
    drawHud: drawHud,
    drawSoundIcon: drawSoundIcon,
    drawTutorial: drawTutorial,
    drawCtrlPanel: drawCtrlPanel,
    drawRespawnFx: drawRespawnFx,
    drawTutSummary: drawTutSummary,
    drawKeyLine: drawKeyLine,
    drawMapLink: drawMapLink,
    drawLevelCard: drawLevelCard,
    drawCardOverlay: drawCardOverlay,
    drawWorkshopCard: drawWorkshopCard,
    drawShopCard: drawShopCard,
    drawFlyingMaterial: drawFlyingMaterial,
    drawLevelPanel: drawLevelPanel,
    drawSiteHighlight: drawSiteHighlight,
    drawDevicePanel: drawDevicePanel,
    drawShopPanel: drawShopPanel,
    drawClassSelect: drawClassSelect,
    drawUpgradePage: drawUpgradePage,
    drawResultPanel: drawResultPanel,
    drawFailPanel: drawFailPanel,
    drawPausePanel: drawPausePanel,
    drawDeathFx: drawDeathFx,
    drawClearIris: drawClearIris,
    drawEnding: drawEnding
  };
})();
