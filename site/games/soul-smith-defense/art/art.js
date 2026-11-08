// 魂匠守衛者(打磨第 14 輪) — 美術(Canvas 2D 幾何繪製, 無外部資源)
// 第 14 輪: 不評星(關卡卡片改「已通關」小牌、結算拿掉星星), 新增 drawAllClear(恭喜過關 + 勳章授予演出)。
// 全域物件 window.Art; 每個函式自己 save/restore。
// 第 13 輪: 畫布 1280×720(16:9, 發布加寬上限 1680), 所有函式照設計座標 1024×576 畫(RD 每幀先整體放大 1.25 倍), 不自己乘 1.25。
// 全畫面底 / 壓暗層畫滿 x −160~1184(FX0 ~ FX0+FW), 發布兩側加寬時不斷掉; 內容都在 0~1024。
(function () {
  'use strict';
  var FONT = '"Microsoft JhengHei","PingFang TC","Noto Sans TC","Heiti TC",sans-serif';
  // 畫布寬度依裝置(PVD計畫網站): 電腦 1280; 觸控裝置照螢幕長寬比, 夾在 1280~1680。高固定 720。判斷與 touch.js 一致
  function pickWidth() {
    var w = 1280;
    try {
      var q = /[?&]w=([0-9]+)/.exec(location.search);   // 截圖檢查用
      var mm = function (s) { return !!(window.matchMedia && matchMedia(s).matches); };
      var touch = /[?&]touch=1(&|$)/.test(location.search) || mm('(pointer: coarse)') ||
        (((navigator.maxTouchPoints || 0) > 0 || 'ontouchstart' in window) && !mm('(hover: hover)'));
      if (q) w = +q[1];
      else if (touch) {
        var a = window.screen || {}, sw = a.width || 0, sh = a.height || 0, iw = window.innerWidth || 0, ih = window.innerHeight || 0;
        var r = sw > 0 && sh > 0 ? Math.max(sw, sh) / Math.min(sw, sh) : 0;
        if (iw > ih && ih > 0) r = iw / ih;   // 橫拿時以實際可視區為準(網站框會扣掉瀏海安全區, 比整個螢幕窄; 取螢幕比例會上下留邊)
        if (r > 0) w = 720 * r;
      }
    } catch (e) { /* 取不到就用 1280 */ }
    return Math.round(Math.max(1280, Math.min(1680, w || 1280)) / 2) * 2;
  }
  var VW = pickWidth();
  try { document.documentElement.style.setProperty('--cw', String(VW)); } catch (e) { }
  var PI = Math.PI, TAU = Math.PI * 2;
  // 設計座標: 全畫面寬高、中心; HUD 高 48; 主堡中心
  var W = 1024, H = 576, CX = 512, CY = 288, HUD_H = 48, CASTLE_X = 900, CASTLE_Y = 336;
  // 全畫面層的實際繪製範圍(設計座標 x −160 ~ 1184 = 畫布 1680 寬時的範圍)
  var FX0 = -160, FW = 1344;

  var C = {
    bg: '#2e4733', grass: '#2e4733', grassDark: '#27402c', grid: 'rgba(255,255,255,0.05)',
    path: '#9a8158', pathEdge: '#6a5535', pathLight: '#ad9469',
    ally: '#5b8fe0', allyDark: '#2f4f86', allyRim: '#cfe0ff',
    enemy: '#b23a52', enemyDark: '#3a0d1a', enemyEye: '#ffb347',
    player: '#fff1c9', playerRim: '#ffb020', playerCloak: '#e0902a',
    neutral: '#8d8b84', neutralDark: '#55534e', neutralTag: '#3e3d39', neutralInk: '#d9d6cb',
    stone: '#8d93a3', stoneDark: '#5d6272',
    target: '#ffffff', resonance: '#e3d4ff', gold: '#ffd24a', coin: '#ffcc33',
    hud: '#161b26', panel: '#1d2331', panelLight: '#2a3244', descPanel: '#2b3347', text: '#f2f2f2', textDim: '#a9b0bf',
    valid: '#5fe07a', invalid: '#ff4a4a', cursor: '#ffd24a', hp: '#6ee06e',
    allyShot: '#fff3b0', enemyShot: '#ff4d7a', slowmo: '#9fd4ff',
    ranged: '#f2c94c', melee: '#ef5350', frost: '#8fd8ff', shock: '#d27cff', heal: '#52e39a',
    seek: '#6ad05a', march: '#8f86ff', charge: '#e57ad0',
    combo: '#ffd24a',
    rooted: '#c9a46a', rootedDark: '#5e4426',
    shop: '#ffb84a', shopDeep: '#3b2410', shopZone: '#ffcf70',
    optionCell: '#2f2a22',
    soulLight: '#cfe0ff', swap: '#ff9a4a', stun: '#ffe14a',
    tutorPaper: '#fff4d6', tutorInk: '#2a2016', tutorAccent: '#e0902a', tutorDone: '#2fae4e',
    keyFace: '#ece7da', keyBase: '#3a3f4c', keyInk: '#1e2230', keyPressed: '#8fe6a0'
  };

  var BASIC = ['ranged', 'melee', 'frost', 'shock', 'heal', 'seek', 'march', 'charge'];
  var COMBO = {
    pierce: ['ranged', 'ranged'], iceArrow: ['ranged', 'frost'], whirl: ['melee', 'melee'], frostSmash: ['melee', 'frost'],
    thunderSlash: ['shock', 'melee'], thunderOrb: ['shock', 'ranged'], blink: ['shock', 'seek'],
    healRay: ['heal', 'ranged'], holyPath: ['heal', 'charge'], steadfast: ['march', 'seek']
  };
  // 會共鳴的魂件(conventions.resonantKinds): 攻擊類 + 支援類 12 種
  var RESONANT = { ranged: 1, melee: 1, frost: 1, shock: 1, heal: 1, pierce: 1, iceArrow: 1, whirl: 1, frostSmash: 1, thunderSlash: 1, thunderOrb: 1, healRay: 1 };
  var KITS = { crossbowKit: 'crossbow', pillarKit: 'pillar', soldierKit: 'soldier', golemKit: 'golem' };
  var ENEMY_SIZE = { imp: 32, archer: 32, ice: 32, drummer: 36, thunder: 36, healer: 36, brute: 44, bossFrost: 72, bossThunder: 72 };
  var BOSS = { bossFrost: 1, bossThunder: 1 };
  function isBoss(t) { return typeof t === 'string' && BOSS[t] === 1; }

  // ---------- 小工具 ----------
  function num(v, d) { v = +v; return isFinite(v) ? v : d; }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function bool(v) { return v === true; }
  function str(v) { return typeof v === 'string' ? v : ''; }
  function arr(v) { return Array.isArray(v) ? v : []; }
  function isBasic(k) { return BASIC.indexOf(k) >= 0; }
  function isCombo(k) { return typeof k === 'string' && Object.prototype.hasOwnProperty.call(COMBO, k); }
  function isResonant(k) { return typeof k === 'string' && RESONANT[k] === 1; }
  function enemyType(t) { return typeof t === 'string' && Object.prototype.hasOwnProperty.call(ENEMY_SIZE, t) ? t : 'imp'; }
  // 回傳 0~1 的播放進度, 沒在播回傳 -1
  function prog(age, dur) {
    dur = num(dur, 0); age = num(age, dur);
    if (!(dur > 0) || age < 0 || age >= dur) return -1;
    return age / dur;
  }
  // 地上魂件的「快消失」閃爍節奏: life < 3 時每 0.25 秒切換
  function expireAlpha(life) { return (life < 3 && (Math.floor(Math.max(0, life) * 4) % 2)) ? 0.3 : 1; }
  function now() { return (typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now()) / 1000; }
  function rr(ctx, x, y, w, h, r) {
    r = Math.max(0, Math.min(r, w / 2, h / 2));
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y); ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r); ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h); ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r); ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  }
  // 觸控模式(PVD計畫網站手機版, window.PVDX.on): 手機橫拿時設計區 576 高只剩約 390 CSS px,
  // 字級夾到至少 17(約 11 CSS px)、需要辨識的小圖示至少 24(約 16 CSS px); 電腦版完全不變
  // FZK = 目前整塊放大的倍數(觸控模式彈窗整體放大時設定), 下限照放大後的實際大小算
  var MIN_FS = 17, MIN_ICON = 24, FZK = 1;
  function touchOn() { return !!(window.PVDX && window.PVDX.on); }
  function fz(n) { return touchOn() && n * FZK < MIN_FS ? MIN_FS / FZK : n; }
  // 觸控模式才用 b, 否則 a(版面在觸控模式另給座標 / 尺寸時用)
  function tv(a, b) { return touchOn() ? b : a; }
  function txt(ctx, s, x, y, o) {
    o = o || {};
    ctx.font = (o.weight || 'bold') + ' ' + (o.raw ? (o.size || 14) : fz(o.size || 14)) + 'px ' + FONT;
    ctx.textAlign = o.align || 'center';
    ctx.textBaseline = o.base || 'middle';
    if (o.stroke) {
      ctx.lineJoin = 'round';
      ctx.strokeStyle = o.stroke; ctx.lineWidth = o.sw || 3;
      if (o.maxW) ctx.strokeText(s, x, y, o.maxW); else ctx.strokeText(s, x, y);
    }
    ctx.fillStyle = o.color || C.text;
    if (o.maxW) ctx.fillText(s, x, y, o.maxW); else ctx.fillText(s, x, y);
  }
  function textW(ctx, s, size, weight) {
    ctx.font = (weight || 'bold') + ' ' + fz(size) + 'px ' + FONT;
    return ctx.measureText(s).width;
  }
  // 互動目標外框: 內緣貼齊 size 外邊, 寬 3
  function targetFrame(ctx, x, y, w, h) {
    ctx.save();
    var a = 0.75 + 0.25 * Math.sin(now() * 8);
    ctx.globalAlpha = a;
    ctx.strokeStyle = C.target; ctx.lineWidth = 3; ctx.setLineDash([]);
    rr(ctx, x - w / 2 - 1.5, y - h / 2 - 1.5, w + 3, h + 3, 4);
    ctx.stroke();
    ctx.restore();
  }
  function hpBar(ctx, x, y, w, hp, maxHp) {
    var r = clamp(hp / (maxHp || 1), 0, 1);
    ctx.fillStyle = 'rgba(0,0,0,0.75)'; ctx.fillRect(x - w / 2, y - 2, w, 4);
    ctx.fillStyle = r > 0.5 ? C.hp : r > 0.25 ? '#f0c040' : '#ff5a4a';
    ctx.fillRect(x - w / 2, y - 2, w * r, 4);
  }
  function inGlow(ctx, w, h, r) {
    // 共鳴微光: 畫在框內
    var t = 0.6 + 0.4 * Math.sin(now() * 5);
    ctx.save();
    ctx.globalAlpha = 0.85 * t;
    ctx.strokeStyle = C.resonance; ctx.lineWidth = 2.5;
    rr(ctx, -w / 2 + 1.5, -h / 2 + 1.5, w - 3, h - 3, r);
    ctx.stroke();
    ctx.globalAlpha = 0.18 * t; ctx.fillStyle = C.resonance;
    rr(ctx, -w / 2 + 1.5, -h / 2 + 1.5, w - 3, h - 3, r); ctx.fill();
    ctx.restore();
  }
  function arrowLine(ctx, x1, y1, x2, y2, color, lw) {
    ctx.save();
    ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = lw || 3; ctx.lineCap = 'round';
    var a = Math.atan2(y2 - y1, x2 - x1), hl = 6 + (lw || 3) * 1.5;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2 - Math.cos(a) * hl * 0.6, y2 - Math.sin(a) * hl * 0.6); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - Math.cos(a - 0.5) * hl, y2 - Math.sin(a - 0.5) * hl);
    ctx.lineTo(x2 - Math.cos(a + 0.5) * hl, y2 - Math.sin(a + 0.5) * hl);
    ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  function coinGlyph(ctx, x, y, r) {
    ctx.fillStyle = '#8a5a00'; ctx.beginPath(); ctx.arc(x, y + 1, r, 0, TAU); ctx.fill();
    ctx.fillStyle = C.coin; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#fff2a8'; ctx.lineWidth = Math.max(1, r * 0.22);
    ctx.beginPath(); ctx.arc(x, y, r * 0.6, 0, TAU); ctx.stroke();
  }
  function hexRgb(hex) {
    var m = /^#([0-9a-f]{6})$/i.exec(hex); if (!m) return null;
    var n = parseInt(m[1], 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function darken(hex, f) {
    var c = hexRgb(hex); if (!c) return hex;
    return 'rgb(' + Math.round(c[0] * f) + ',' + Math.round(c[1] * f) + ',' + Math.round(c[2] * f) + ')';
  }
  function lighten(hex, f) {
    var c = hexRgb(hex); if (!c) return hex;
    return 'rgb(' + Math.round(c[0] + (255 - c[0]) * f) + ',' + Math.round(c[1] + (255 - c[1]) * f) + ',' + Math.round(c[2] + (255 - c[2]) * f) + ')';
  }
  function mixHex(a, b, f) {
    var p = hexRgb(a), q = hexRgb(b); if (!p || !q) return a;
    return 'rgb(' + Math.round(p[0] + (q[0] - p[0]) * f) + ',' + Math.round(p[1] + (q[1] - p[1]) * f) + ',' + Math.round(p[2] + (q[2] - p[2]) * f) + ')';
  }
  function rgba(hex, a) {
    var c = hexRgb(hex); if (!c) return hex;
    return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')';
  }
  // 魂件的意象色: 基本 → [色]; 組合 → [材料 A, 材料 B](同材料時 B 取淡色); 其他 → []
  function itemCols(k) {
    if (isBasic(k)) return [C[k]];
    if (!isCombo(k)) return [];
    var pr = COMBO[k];
    return [C[pr[0]], pr[0] === pr[1] ? lighten(C[pr[1]], 0.55) : C[pr[1]]];
  }
  // 共鳴範圍 / 共鳴線 / 虛魂件只認會共鳴的 12 種
  function kindCols(k) { return isResonant(k) ? itemCols(k) : []; }
  function firstKind(kinds) { var a = arr(kinds); return isResonant(a[0]) ? a[0] : null; }
  // 簡易偽亂數(電弧抖動用), 同一組參數同一個值
  function hash(a, b, c) { var v = Math.sin(a * 127.1 + b * 311.7 + c * 74.7) * 43758.5453; return v - Math.floor(v); }
  // 十字(治癒意象): 中心 (x,y), 半臂長 r
  function plusPath(ctx, x, y, r) {
    var t = r * 0.38;
    ctx.beginPath();
    ctx.moveTo(x - t, y - r); ctx.lineTo(x + t, y - r); ctx.lineTo(x + t, y - t); ctx.lineTo(x + r, y - t); ctx.lineTo(x + r, y + t);
    ctx.lineTo(x + t, y + t); ctx.lineTo(x + t, y + r); ctx.lineTo(x - t, y + r); ctx.lineTo(x - t, y + t); ctx.lineTo(x - r, y + t);
    ctx.lineTo(x - r, y - t); ctx.lineTo(x - t, y - t); ctx.closePath();
  }
  // 鋸齒電弧: (x1,y1)→(x2,y2), 偏離中線至多 amp; seed 決定形狀
  function boltPath(ctx, x1, y1, x2, y2, amp, seed) {
    var L = Math.hypot(x2 - x1, y2 - y1), n = Math.max(2, Math.min(12, Math.round(L / 14)));
    var nx = L > 0 ? -(y2 - y1) / L : 0, ny = L > 0 ? (x2 - x1) / L : 0;
    ctx.beginPath(); ctx.moveTo(x1, y1);
    for (var i = 1; i < n; i++) {
      var f = i / n, o = (hash(seed, i, 1) * 2 - 1) * amp;
      ctx.lineTo(x1 + (x2 - x1) * f + nx * o, y1 + (y2 - y1) * f + ny * o);
    }
    ctx.lineTo(x2, y2);
  }

  // ---------- 按鍵圖示(全畫面同一套鍵帽) ----------
  var KEY_NAMES = { left: 1, right: 1, up: 1, down: 1, z: 1, x: 1, space: 1 };
  // key = left|right|up|down|z|x|space; 外接框 = (cx±w/2, cy±h/2); 圓角矩形 + 底部較深的厚邊
  function keyIcon(ctx, key, cx, cy, w, h, pressed) {
    ctx.save();
    var x0 = cx - w / 2, y0 = cy - h / 2, r = Math.min(5, h * 0.22);
    var base = Math.max(2, h * 0.14);
    ctx.fillStyle = C.keyBase; rr(ctx, x0, y0, w, h, r); ctx.fill();
    ctx.fillStyle = pressed ? C.keyPressed : C.keyFace; rr(ctx, x0, y0, w, h - base, r); ctx.fill();
    ctx.strokeStyle = C.keyInk; ctx.lineWidth = 1; rr(ctx, x0 + 0.5, y0 + 0.5, w - 1, h - 1, r); ctx.stroke();
    var gy = cy - base / 2, k = h * 0.27;
    ctx.fillStyle = C.keyInk; ctx.strokeStyle = C.keyInk;
    if (key === 'left' || key === 'right' || key === 'up' || key === 'down') {
      var ang = { right: 0, down: PI / 2, left: PI, up: -PI / 2 }[key];
      ctx.save(); ctx.translate(cx, gy); ctx.rotate(ang);
      ctx.lineWidth = Math.max(1.5, h * 0.11); ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-k, 0); ctx.lineTo(k * 0.3, 0); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(k, 0); ctx.lineTo(k * 0.1, -k * 0.75); ctx.lineTo(k * 0.1, k * 0.75); ctx.closePath(); ctx.fill();
      ctx.restore();
    } else if (key === 'z' || key === 'x' || key === 'm' || key === 'c') {
      txt(ctx, key.toUpperCase(), cx, gy + 0.5, { size: Math.round(h * tv(0.6, 0.7)), color: C.keyInk });
    } else if (key === 'esc') {
      txt(ctx, 'Esc', cx, gy + 0.5, { size: Math.round(h * 0.5), color: C.keyInk, maxW: w - 5 });
    } else if (key === 'space') {
      // raw: 觸控模式這兩字會被觸控層換成購買圖示(字級 × 1.5), 不套字級下限
      txt(ctx, '空白', cx, gy + 0.5, { size: Math.round(h * 0.46), color: C.keyInk, maxW: w - 6, raw: true });
    }
    if (pressed) {
      // 右下角小勾(框內)
      ctx.strokeStyle = C.tutorDone; ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      var bx = x0 + w - 7, by = y0 + h - 9;
      ctx.beginPath(); ctx.moveTo(bx - 3.5, by); ctx.lineTo(bx - 1, by + 2.5); ctx.lineTo(bx + 3.5, by - 2.5); ctx.stroke();
    }
    ctx.restore();
  }
  // 空白鍵寬 2 倍; Esc 寬 = 高 × 32/22(22 高時 32)
  function keyW(k, h) { return k === 'space' ? h * 2 : k === 'esc' ? Math.round(h * 32 / 22) : h; }
  // 帶鍵帽的一行字: 字串裡的 [Z] [X] [C] [M] [Esc] [空白鍵] [←] [→] [↑] [↓] 畫成鍵帽(kh 高), 鍵帽與文字隔 4
  var INLINE_KEYS = { 'Z': 'z', 'X': 'x', 'C': 'c', 'M': 'm', 'Esc': 'esc', '空白鍵': 'space', '空白': 'space', '←': 'left', '→': 'right', '↑': 'up', '↓': 'down' };
  function richParts(s) {
    var parts = [], re = /\[(Z|X|C|M|Esc|空白鍵|空白|←|→|↑|↓)\]/g, last = 0, m;
    while ((m = re.exec(s))) {
      if (m.index > last) parts.push({ t: s.slice(last, m.index) });
      parts.push({ k: INLINE_KEYS[m[1]] });
      last = re.lastIndex;
    }
    if (last < s.length) parts.push({ t: s.slice(last) });
    return parts;
  }
  // 以 (cx, cy) 置中畫一行; 超過 maxW 時整行等比縮小; 回傳實際寬
  function richLine(ctx, s, cx, cy, o) {
    o = o || {};
    var fs = o.size || 16, kh = o.kh || 22, weight = o.weight || 'bold';
    if (touchOn()) kh = Math.max(kh, MIN_ICON / FZK);
    var parts = richParts(str(s)), w = 0, i, ws = [];
    for (i = 0; i < parts.length; i++) {
      var pw = parts[i].k ? keyW(parts[i].k, kh) : textW(ctx, parts[i].t, fs, weight);
      var pad = 0;
      if (parts[i].k) { if (i > 0) pad += 4; if (i < parts.length - 1) pad += 4; }
      ws.push(pw); w += pw + pad;
    }
    var sc = o.maxW && w > o.maxW ? o.maxW / w : 1;
    ctx.save(); ctx.translate(cx, cy); ctx.scale(sc, sc);
    var px = -w / 2;
    for (i = 0; i < parts.length; i++) {
      if (parts[i].k) {
        if (i > 0) px += 4;
        keyIcon(ctx, parts[i].k, px + ws[i] / 2, 0, ws[i], kh, false);
        px += ws[i] + (i < parts.length - 1 ? 4 : 0);
      } else {
        txt(ctx, parts[i].t, px, 0.5, { size: fs, align: 'left', color: o.color || C.text, weight: weight });
        px += ws[i];
      }
    }
    ctx.restore();
    return w * sc;
  }
  // 操作提示列: groups = [{keys:[...], label, alpha}]; 鍵帽與字隔 4、同組鍵帽間隔 4、組間隔 o.gap
  function hintRow(ctx, groups, x, y, o) {
    o = o || {};
    var kh = o.kh || 22, fs = o.size || 13, gap = o.gap || 14, align = o.align || 'center';
    if (touchOn()) kh = Math.max(kh, MIN_ICON / FZK);
    var widths = [], total = 0, i, j;
    for (i = 0; i < groups.length; i++) {
      var g = groups[i], w = 0;
      for (j = 0; j < g.keys.length; j++) w += keyW(g.keys[j], kh) + (j ? 4 : 0);
      if (g.label) w += 4 + textW(ctx, g.label, fs, o.weight || 'normal');
      widths.push(w); total += w + (i ? gap : 0);
    }
    var cx = align === 'left' ? x : align === 'right' ? x - total : x - total / 2;
    ctx.save();
    for (i = 0; i < groups.length; i++) {
      var gg = groups[i];
      ctx.globalAlpha = gg.alpha == null ? 1 : clamp(gg.alpha, 0, 1);
      var px = cx;
      for (j = 0; j < gg.keys.length; j++) {
        var kw = keyW(gg.keys[j], kh);
        keyIcon(ctx, gg.keys[j], px + kw / 2, y, kw, kh, false);
        px += kw + 4;
      }
      if (gg.label) txt(ctx, gg.label, px, y + 0.5, { size: fs, align: 'left', color: gg.color || o.color || C.textDim, weight: o.weight || 'normal', stroke: o.stroke, sw: o.sw });
      cx += widths[i] + gap;
    }
    ctx.restore();
    return total;
  }
  function starPath(ctx, cx, cy, R, r) {
    ctx.beginPath();
    for (var i = 0; i < 10; i++) {
      var a = -PI / 2 + i * PI / 5, rad = i % 2 ? r : R;
      if (i) ctx.lineTo(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad); else ctx.moveTo(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad);
    }
    ctx.closePath();
  }
  // 喇叭圖示, 外接框 size × size(第 13 輪: 只由 drawMuteIcon 使用)
  // 底板用 HUD 深色 0.85 + 淡亮邊: 壓在草地、路面、開始畫面背景上都讀得到(P10), 一看就是 HUD 的一部分
  function speaker(ctx, cx, cy, size, muted) {
    ctx.save(); ctx.translate(cx, cy);
    var u = size / 28;
    ctx.scale(u, u);
    ctx.fillStyle = 'rgba(22,27,38,0.85)'; rr(ctx, -14, -14, 28, 28, 6); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.22)'; ctx.lineWidth = 1 / u; rr(ctx, -13.5, -13.5, 27, 27, 5.5); ctx.stroke();
    ctx.fillStyle = muted ? '#8a909e' : '#e8ecf4';
    ctx.beginPath(); ctx.moveTo(-9, -4); ctx.lineTo(-5, -4); ctx.lineTo(1, -9); ctx.lineTo(1, 9); ctx.lineTo(-5, 4); ctx.lineTo(-9, 4); ctx.closePath(); ctx.fill();
    ctx.lineCap = 'round';
    if (muted) {
      ctx.strokeStyle = '#ff5a5a'; ctx.lineWidth = 2.6;
      ctx.beginPath(); ctx.moveTo(4, -5); ctx.lineTo(11, 5); ctx.moveTo(11, -5); ctx.lineTo(4, 5); ctx.stroke();
    } else {
      ctx.strokeStyle = '#e8ecf4'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(2, 0, 5, -PI / 3.2, PI / 3.2); ctx.stroke();
      ctx.beginPath(); ctx.arc(2, 0, 9.5, -PI / 3.4, PI / 3.4); ctx.stroke();
    }
    ctx.restore();
  }
  // 冰屑(小菱形), 附冰意象共用
  function iceShard(ctx, x, y, a, s) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(a);
    ctx.fillStyle = '#e8f8ff';
    ctx.beginPath(); ctx.moveTo(s, 0); ctx.lineTo(0, -s * 0.55); ctx.lineTo(-s, 0); ctx.lineTo(0, s * 0.55); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = C.frost; ctx.lineWidth = 0.8; ctx.stroke();
    ctx.restore();
  }

  // ---------- 集結旗(同一面旗: 地上 / 手上 / 預覽 / 選單格) ----------
  // (gx, gy) = 旗桿插地點; 縮放 k = 1 時外接框 x −4~+20、y −40~0
  function flagShape(ctx, gx, gy, k, o) {
    o = o || {};
    ctx.save(); ctx.translate(gx, gy); ctx.scale(k, k);
    var cloth = o.cloth || C.ally, dark = o.dark || C.allyDark, rim = o.rim || C.allyRim;
    if (!o.noShadow) { ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.ellipse(1, -1.5, 3.5, 1.5, 0, 0, TAU); ctx.fill(); }
    // 旗桿
    ctx.fillStyle = o.pole || '#5a3a1e'; ctx.fillRect(-1.25, -37, 2.5, 37);
    ctx.fillStyle = o.knob || '#e0c070'; ctx.beginPath(); ctx.arc(0, -38, 2, 0, TAU); ctx.fill();
    // 燕尾旗面, 往右飄
    var cl = function () {
      ctx.beginPath(); ctx.moveTo(1.25, -36.5); ctx.lineTo(19, -35); ctx.lineTo(14.5, -30.5); ctx.lineTo(19, -26); ctx.lineTo(1.25, -25.5); ctx.closePath();
    };
    ctx.fillStyle = cloth; cl(); ctx.fill();
    ctx.strokeStyle = dark; ctx.lineWidth = 1; ctx.lineJoin = 'round'; cl(); ctx.stroke();
    // 我方的魂(菱形徽)
    ctx.fillStyle = rim; ctx.beginPath(); ctx.moveTo(7.5, -34); ctx.lineTo(10.5, -31); ctx.lineTo(7.5, -28); ctx.lineTo(4.5, -31); ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  // ---------- 魂件圖示(全畫面共用一套) ----------
  function glyph(ctx, kind, s, color) {
    // 在 (0,0) 為中心, s = 半寬單位
    ctx.strokeStyle = color; ctx.fillStyle = color;
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.lineWidth = Math.max(1.2, s * 0.2);
    var i, a;
    switch (kind) {
      case 'ranged': // 斜向箭
        ctx.beginPath(); ctx.moveTo(-s * 0.7, s * 0.7); ctx.lineTo(s * 0.55, -s * 0.55); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(s * 0.8, -s * 0.8); ctx.lineTo(s * 0.15, -s * 0.65); ctx.lineTo(s * 0.65, -s * 0.15); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(-s * 0.7, s * 0.7); ctx.lineTo(-s * 0.75, s * 0.3); ctx.moveTo(-s * 0.7, s * 0.7); ctx.lineTo(-s * 0.3, s * 0.75); ctx.stroke();
        break;
      case 'melee': // 直劍
        ctx.beginPath(); ctx.moveTo(0, -s * 0.85); ctx.lineTo(0, s * 0.3); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-s * 0.45, s * 0.3); ctx.lineTo(s * 0.45, s * 0.3); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, s * 0.3); ctx.lineTo(0, s * 0.8); ctx.stroke();
        break;
      case 'frost': // 雪花
        for (i = 0; i < 3; i++) {
          a = i * PI / 3;
          ctx.beginPath(); ctx.moveTo(Math.cos(a) * s * 0.8, Math.sin(a) * s * 0.8); ctx.lineTo(-Math.cos(a) * s * 0.8, -Math.sin(a) * s * 0.8); ctx.stroke();
        }
        ctx.beginPath(); ctx.arc(0, 0, s * 0.18, 0, TAU); ctx.fill();
        break;
      case 'seek': // 眼睛(自動索敵)
        ctx.beginPath(); ctx.moveTo(-s * 0.85, 0); ctx.quadraticCurveTo(0, -s * 0.8, s * 0.85, 0); ctx.quadraticCurveTo(0, s * 0.8, -s * 0.85, 0); ctx.stroke();
        ctx.beginPath(); ctx.arc(0, 0, s * 0.25, 0, TAU); ctx.fill();
        break;
      case 'march': // 城堡剪影(進攻主堡)
        ctx.beginPath();
        ctx.moveTo(-s * 0.7, s * 0.75); ctx.lineTo(-s * 0.7, -s * 0.6); ctx.lineTo(-s * 0.4, -s * 0.6); ctx.lineTo(-s * 0.4, -s * 0.3);
        ctx.lineTo(-s * 0.15, -s * 0.3); ctx.lineTo(-s * 0.15, -s * 0.6); ctx.lineTo(s * 0.15, -s * 0.6); ctx.lineTo(s * 0.15, -s * 0.3);
        ctx.lineTo(s * 0.4, -s * 0.3); ctx.lineTo(s * 0.4, -s * 0.6); ctx.lineTo(s * 0.7, -s * 0.6); ctx.lineTo(s * 0.7, s * 0.75); ctx.closePath();
        ctx.fill();
        break;
      case 'shock': // 閃電(電擊)
        boltGlyph(ctx, 0, 0, s); ctx.fill();
        break;
      case 'heal': // 十字(治癒)
        plusPath(ctx, 0, 0, s * 0.78); ctx.fill();
        break;
      case 'charge': // 牛角頭(衝鋒; 奔牛怪頭上同一對角)
        ctx.beginPath(); ctx.arc(0, s * 0.38, s * 0.3, 0, TAU); ctx.fill();
        ctx.lineWidth = Math.max(1.4, s * 0.24);
        ctx.beginPath(); ctx.moveTo(-s * 0.22, s * 0.22); ctx.quadraticCurveTo(-s * 0.85, s * 0.1, -s * 0.66, -s * 0.78); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(s * 0.22, s * 0.22); ctx.quadraticCurveTo(s * 0.85, s * 0.1, s * 0.66, -s * 0.78); ctx.stroke();
        break;
      case 'thunderSlash': // 劍 + 閃電
        ctx.beginPath(); ctx.moveTo(-s * 0.3, -s * 0.85); ctx.lineTo(-s * 0.3, s * 0.35); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-s * 0.65, s * 0.35); ctx.lineTo(s * 0.05, s * 0.35); ctx.moveTo(-s * 0.3, s * 0.35); ctx.lineTo(-s * 0.3, s * 0.8); ctx.stroke();
        boltGlyph(ctx, s * 0.42, -s * 0.05, s * 0.6); ctx.fill();
        break;
      case 'thunderOrb': // 電球
        ctx.lineWidth = Math.max(1.2, s * 0.17);
        ctx.beginPath(); ctx.arc(0, 0, s * 0.7, 0, TAU); ctx.stroke();
        boltGlyph(ctx, 0, 0, s * 0.55); ctx.fill();
        break;
      case 'blink': // 折線閃現箭
        ctx.lineWidth = Math.max(1.3, s * 0.2);
        ctx.beginPath(); ctx.moveTo(-s * 0.55, s * 0.55); ctx.lineTo(-s * 0.1, s * 0.05); ctx.lineTo(s * 0.12, s * 0.32); ctx.lineTo(s * 0.48, -s * 0.38); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(s * 0.82, -s * 0.82); ctx.lineTo(s * 0.22, -s * 0.6); ctx.lineTo(s * 0.62, -s * 0.2); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.arc(-s * 0.78, s * 0.78, s * 0.12, 0, TAU); ctx.fill();
        break;
      case 'healRay': // 光線 + 十字
        ctx.beginPath(); ctx.moveTo(-s * 0.8, s * 0.8); ctx.lineTo(s * 0.1, -s * 0.1); ctx.stroke();
        plusPath(ctx, s * 0.42, -s * 0.42, s * 0.42); ctx.fill();
        break;
      case 'holyPath': // 彎路 + 十字
        ctx.lineWidth = Math.max(1.4, s * 0.24);
        ctx.beginPath(); ctx.moveTo(-s * 0.7, s * 0.8); ctx.bezierCurveTo(s * 0.5, s * 0.5, -s * 0.5, -s * 0.3, s * 0.15, -s * 0.8); ctx.stroke();
        plusPath(ctx, s * 0.55, s * 0.3, s * 0.3); ctx.fill();
        plusPath(ctx, -s * 0.55, -s * 0.45, s * 0.25); ctx.fill();
        break;
      case 'steadfast': // 山(不動如山)
        ctx.beginPath(); ctx.moveTo(-s * 0.88, s * 0.72); ctx.lineTo(-s * 0.32, -s * 0.38); ctx.lineTo(-s * 0.05, s * 0.02);
        ctx.lineTo(s * 0.3, -s * 0.78); ctx.lineTo(s * 0.88, s * 0.72); ctx.closePath(); ctx.fill();
        break;
      case 'pierce': // 長箭穿過兩點
        ctx.beginPath(); ctx.moveTo(-s * 0.85, 0); ctx.lineTo(s * 0.55, 0); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(s * 0.9, 0); ctx.lineTo(s * 0.45, -s * 0.35); ctx.lineTo(s * 0.45, s * 0.35); ctx.closePath(); ctx.fill();
        ctx.lineWidth = Math.max(1, s * 0.14);
        ctx.beginPath(); ctx.arc(-s * 0.3, 0, s * 0.22, 0, TAU); ctx.stroke();
        ctx.beginPath(); ctx.arc(s * 0.15, 0, s * 0.22, 0, TAU); ctx.stroke();
        break;
      case 'iceArrow': // 箭 + 雪花頭
        ctx.beginPath(); ctx.moveTo(-s * 0.75, s * 0.75); ctx.lineTo(s * 0.2, -s * 0.2); ctx.stroke();
        ctx.save(); ctx.translate(s * 0.42, -s * 0.42); ctx.lineWidth = Math.max(1, s * 0.15);
        for (i = 0; i < 3; i++) { a = i * PI / 3; ctx.beginPath(); ctx.moveTo(Math.cos(a) * s * 0.4, Math.sin(a) * s * 0.4); ctx.lineTo(-Math.cos(a) * s * 0.4, -Math.sin(a) * s * 0.4); ctx.stroke(); }
        ctx.restore();
        break;
      case 'whirl': // 旋風
        ctx.beginPath(); ctx.arc(0, 0, s * 0.62, -PI * 0.15, PI * 1.35); ctx.stroke();
        ctx.beginPath(); ctx.arc(0, 0, s * 0.28, PI * 0.85, PI * 2.35); ctx.stroke();
        a = PI * 1.35;
        ctx.beginPath(); ctx.moveTo(Math.cos(a) * s * 0.62, Math.sin(a) * s * 0.62);
        ctx.lineTo(Math.cos(a) * s * 0.62 + s * 0.38, Math.sin(a) * s * 0.62 - s * 0.05);
        ctx.lineTo(Math.cos(a) * s * 0.62 + s * 0.05, Math.sin(a) * s * 0.62 + s * 0.38); ctx.closePath(); ctx.fill();
        break;
      case 'frostSmash': // 錘 + 雪花
        ctx.beginPath(); ctx.moveTo(-s * 0.55, s * 0.8); ctx.lineTo(s * 0.15, -s * 0.1); ctx.stroke();
        ctx.save(); ctx.translate(s * 0.3, -s * 0.3); ctx.rotate(PI / 4);
        ctx.fillRect(-s * 0.55, -s * 0.25, s * 1.1, s * 0.5); ctx.restore();
        ctx.lineWidth = Math.max(1, s * 0.12);
        ctx.beginPath(); ctx.moveTo(-s * 0.85, -s * 0.2); ctx.lineTo(-s * 0.35, -s * 0.2); ctx.moveTo(-s * 0.6, -s * 0.45); ctx.lineTo(-s * 0.6, s * 0.05); ctx.stroke();
        break;
      case 'shop': // 攤位: 遮雨棚 + 櫃台上一枚金幣
        ctx.lineWidth = Math.max(1, s * 0.14);
        ctx.beginPath(); ctx.moveTo(-s * 0.8, -s * 0.25); ctx.lineTo(-s * 0.62, -s * 0.72); ctx.lineTo(s * 0.62, -s * 0.72); ctx.lineTo(s * 0.8, -s * 0.25); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(-s * 0.6, -s * 0.25); ctx.lineTo(-s * 0.6, s * 0.75); ctx.moveTo(s * 0.6, -s * 0.25); ctx.lineTo(s * 0.6, s * 0.75); ctx.moveTo(-s * 0.75, s * 0.75); ctx.lineTo(s * 0.75, s * 0.75); ctx.stroke();
        ctx.beginPath(); ctx.arc(0, s * 0.28, s * 0.27, 0, TAU); ctx.fill();
        break;
    }
  }
  // 閃電多邊形, 中心 (cx,cy), 半寬單位 s(電擊意象共用)
  function boltGlyph(ctx, cx, cy, s) {
    ctx.beginPath();
    ctx.moveTo(cx + s * 0.22, cy - s * 0.9); ctx.lineTo(cx - s * 0.5, cy + s * 0.12); ctx.lineTo(cx - s * 0.05, cy + s * 0.12);
    ctx.lineTo(cx - s * 0.25, cy + s * 0.9); ctx.lineTo(cx + s * 0.52, cy - s * 0.18); ctx.lineTo(cx + s * 0.06, cy - s * 0.18);
    ctx.lineTo(cx + s * 0.4, cy - s * 0.9); ctx.closePath();
  }
  function octPath(ctx, r) {
    ctx.beginPath();
    for (var i = 0; i < 8; i++) { var a = PI / 8 + i * PI / 4; var px = Math.cos(a) * r, py = Math.sin(a) * r; if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py); }
    ctx.closePath();
  }
  // 物品圖示: 中心 (cx,cy), 邊長 s
  function itemIcon(ctx, item, cx, cy, s, alpha) {
    ctx.save();
    ctx.translate(cx, cy);
    if (alpha != null) ctx.globalAlpha *= alpha;
    var h = s / 2;
    if (isBasic(item)) {
      // 基本魂件: 單色圓角方塊 + 深色線圖示
      var col = C[item];
      ctx.fillStyle = darken(col, 0.55); rr(ctx, -h, -h, s, s, s * 0.22); ctx.fill();
      ctx.fillStyle = col; rr(ctx, -h + 1, -h + 1, s - 2, s - 3, s * 0.2); ctx.fill();
      glyph(ctx, item, h * 0.78, '#1b1d26');
    } else if (isCombo(item)) {
      // 組合魂件: 金邊八角(比基本多一圈外框)+ 斜分兩件材料色
      var cols = itemCols(item);
      var R = h / Math.cos(PI / 8);
      ctx.fillStyle = C.combo; octPath(ctx, R); ctx.fill();
      ctx.save(); octPath(ctx, R - Math.max(1.5, s * 0.1)); ctx.clip();
      ctx.fillStyle = cols[0]; ctx.fillRect(-h, -h, s, s);
      ctx.fillStyle = cols[1]; ctx.beginPath(); ctx.moveTo(h, -h); ctx.lineTo(h, h); ctx.lineTo(-h, h); ctx.closePath(); ctx.fill();
      ctx.restore();
      ctx.strokeStyle = '#7a5a00'; ctx.lineWidth = 1; octPath(ctx, R - 0.5); ctx.stroke();
      glyph(ctx, item, h * 0.72, '#141620');
    } else if (item === 'shop') {
      // 購買: 全場唯一的圓形徽章(深褐底 + 粗金環 + 金色攤位), 和方塊 / 八角都不同形
      ctx.fillStyle = '#6a4210'; ctx.beginPath(); ctx.arc(0, 0, h, 0, TAU); ctx.fill();
      ctx.fillStyle = C.shop; ctx.beginPath(); ctx.arc(0, 0, h - 1, 0, TAU); ctx.fill();
      ctx.fillStyle = C.shopDeep; ctx.beginPath(); ctx.arc(0, 0, h - Math.max(2.5, s * 0.16), 0, TAU); ctx.fill();
      glyph(ctx, 'shop', h * 0.62, C.shop);
    } else if (KITS[item]) {
      // 單位材料: 木箱底 + 單位小圖
      ctx.fillStyle = '#6b4a2a'; rr(ctx, -h, -h, s, s, 3); ctx.fill();
      ctx.fillStyle = '#8a6440'; rr(ctx, -h + 1.5, -h + 1.5, s - 3, s - 3, 2); ctx.fill();
      var u = KITS[item], k = s / ({ crossbow: 56, pillar: 42, soldier: 38, golem: 62 }[u]);
      ctx.save(); ctx.scale(k, k);
      if (u === 'crossbow') crossbowBody(ctx, 0, false);
      else if (u === 'pillar') pillarBody(ctx, null);
      else if (u === 'soldier') soldierBody(ctx, C.ally, C.allyDark, C.allyRim);
      else golemBody(ctx, 'ally');
      ctx.restore();
    } else {
      // 未知物品: 只畫空框, 不冒充任何合法符號
      ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.setLineDash([2, 2]); ctx.lineWidth = 1;
      rr(ctx, -h + 0.5, -h + 0.5, s - 1, s - 1, 3); ctx.stroke();
    }
    ctx.restore();
  }

  // ---------- 單位本體(以 0,0 為中心) ----------
  function crossbowBody(ctx, recoil, moving) {
    // 底座 44x44
    ctx.fillStyle = C.allyDark; rr(ctx, -22, -22, 44, 44, 7); ctx.fill();
    ctx.fillStyle = C.stone; rr(ctx, -19, -19, 38, 38, 5); ctx.fill();
    ctx.fillStyle = C.stoneDark; rr(ctx, -19, 8, 38, 11, 4); ctx.fill();
    ctx.strokeStyle = C.ally; ctx.lineWidth = 2; rr(ctx, -21, -21, 42, 42, 6); ctx.stroke();
    // 弩
    ctx.save(); ctx.translate(0, recoil);
    ctx.fillStyle = '#5a3a1e'; ctx.fillRect(-3, -16, 6, 24);
    ctx.strokeStyle = '#7a4e26'; ctx.lineWidth = 4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-16, -2); ctx.quadraticCurveTo(0, -18, 16, -2); ctx.stroke();
    ctx.strokeStyle = '#e8e2d0'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(-16, -2); ctx.lineTo(0, 4); ctx.lineTo(16, -2); ctx.stroke();
    ctx.fillStyle = C.allyShot; ctx.beginPath(); ctx.moveTo(0, -19); ctx.lineTo(-3, -13); ctx.lineTo(3, -13); ctx.closePath(); ctx.fill();
    ctx.restore();
    if (moving) {
      ctx.fillStyle = '#2b2b2b';
      ctx.beginPath(); ctx.arc(-15, 19, 4, 0, TAU); ctx.arc(15, 19, 4, 0, TAU); ctx.fill();
      ctx.fillStyle = '#bbb'; ctx.beginPath(); ctx.arc(-15, 19, 1.5, 0, TAU); ctx.arc(15, 19, 1.5, 0, TAU); ctx.fill();
    }
  }
  // kind: 身上會共鳴的攻擊類魂件(null = 不亮)
  function pillarBody(ctx, kind, moving) {
    var cols = kindCols(kind), combo = isCombo(kind);
    // 底座
    ctx.fillStyle = C.allyDark; rr(ctx, -16, 9, 32, 9, 3); ctx.fill();
    ctx.fillStyle = '#c9c3b5'; rr(ctx, -14, 10, 28, 6, 2); ctx.fill();
    if (moving) {
      ctx.fillStyle = '#2b2b2b'; ctx.beginPath(); ctx.arc(-11, 15, 3, 0, TAU); ctx.arc(11, 15, 3, 0, TAU); ctx.fill();
      ctx.fillStyle = '#bbb'; ctx.beginPath(); ctx.arc(-11, 15, 1.1, 0, TAU); ctx.arc(11, 15, 1.1, 0, TAU); ctx.fill();
    }
    // 柱身
    ctx.fillStyle = '#d9d2c2';
    ctx.beginPath(); ctx.moveTo(-7, 10); ctx.lineTo(-5, -5); ctx.lineTo(5, -5); ctx.lineTo(7, 10); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#a69f90'; ctx.beginPath(); ctx.moveTo(2, 10); ctx.lineTo(2.5, -5); ctx.lineTo(5, -5); ctx.lineTo(7, 10); ctx.closePath(); ctx.fill();
    // 頂端晶石 + 放射光
    if (cols.length) {
      var t = 0.7 + 0.3 * Math.sin(now() * 4);
      ctx.save(); ctx.globalAlpha = t;
      // 6 道放射光(不朝正上 / 正下), 全部收在 36×36 框內
      var RAY = [0, PI / 4, 3 * PI / 4, PI, 5 * PI / 4, 7 * PI / 4];
      for (var i = 0; i < RAY.length; i++) {
        var a = RAY[i];
        ctx.strokeStyle = cols[i % cols.length]; ctx.lineWidth = 2; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(Math.cos(a) * 9, -11 + Math.sin(a) * 5); ctx.lineTo(Math.cos(a) * 15, -11 + Math.sin(a) * 8.5); ctx.stroke();
      }
      ctx.restore();
    }
    var gem = function () { ctx.beginPath(); ctx.moveTo(0, -17); ctx.lineTo(6, -11); ctx.lineTo(0, -5); ctx.lineTo(-6, -11); ctx.closePath(); };
    if (!cols.length) { ctx.fillStyle = '#6c6f78'; gem(); ctx.fill(); }
    else {
      ctx.save(); gem(); ctx.clip();
      ctx.fillStyle = cols[0]; ctx.fillRect(-6, -17, 12, 12);
      if (cols[1]) { ctx.fillStyle = cols[1]; ctx.fillRect(0, -17, 6, 12); }
      ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.fillRect(-3, -15, 2, 4);
      ctx.restore();
    }
    // 組合魂件: 晶石金框(和組合圖示的金邊同一個詞)
    ctx.strokeStyle = combo ? C.combo : '#1e2230'; ctx.lineWidth = combo ? 1.6 : 1; gem(); ctx.stroke();
  }
  function soldierBody(ctx, body, dark, rim) {
    ctx.fillStyle = dark; rr(ctx, -12, -11, 24, 26, 6); ctx.fill();
    ctx.fillStyle = body; rr(ctx, -11, -10, 22, 24, 5); ctx.fill();
    // 頭盔
    ctx.fillStyle = dark; ctx.beginPath(); ctx.arc(0, -6, 9, PI, 0); ctx.closePath(); ctx.fill();
    ctx.fillStyle = rim; ctx.fillRect(-6, -5, 12, 3);
    // 劍
    ctx.strokeStyle = '#e8eef8'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(13, -9); ctx.lineTo(13, 7); ctx.stroke();
    ctx.strokeStyle = '#7a5a2a'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(10, 7); ctx.lineTo(15, 7); ctx.stroke();
    // 盾
    ctx.fillStyle = rim; ctx.beginPath(); ctx.moveTo(-14, -2); ctx.lineTo(-7, -2); ctx.lineTo(-7, 6); ctx.lineTo(-10.5, 10); ctx.lineTo(-14, 6); ctx.closePath(); ctx.fill();
  }
  function golemBody(ctx, team) {
    var neutral = team !== 'ally';
    var st = neutral ? C.neutral : '#8494ad', dk = neutral ? C.neutralDark : '#4a5672';
    ctx.fillStyle = dk; rr(ctx, -22, -17, 44, 41, 9); ctx.fill();
    ctx.fillStyle = st; rr(ctx, -20, -15, 40, 37, 8); ctx.fill();
    // 手臂
    ctx.fillStyle = dk; rr(ctx, -27, -9, 9, 24, 4); ctx.fill(); rr(ctx, 18, -9, 9, 24, 4); ctx.fill();
    // 頭
    ctx.fillStyle = dk; rr(ctx, -11, -27, 22, 15, 4); ctx.fill();
    ctx.fillStyle = st; rr(ctx, -9.5, -25.5, 19, 12, 3); ctx.fill();
    // 裂紋
    ctx.strokeStyle = dk; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(-12, -4); ctx.lineTo(-4, 2); ctx.lineTo(-8, 12); ctx.moveTo(8, -8); ctx.lineTo(12, 4); ctx.stroke();
    // 眼
    ctx.fillStyle = neutral ? '#3a3936' : '#bfe0ff';
    ctx.fillRect(-6, -21, 4, 3); ctx.fillRect(2, -21, 4, 3);
    if (!neutral) {
      ctx.strokeStyle = C.ally; ctx.lineWidth = 2; rr(ctx, -21, -16, 42, 39, 8.5); ctx.stroke();
      ctx.fillStyle = C.allyRim; ctx.beginPath(); ctx.arc(0, 4, 3.5, 0, TAU); ctx.fill();
    }
  }
  function ghostPath(ctx, w, h) {
    var r = w / 2, top = -h / 2, by = h / 2, n = 3, seg = w / n;
    ctx.beginPath();
    ctx.moveTo(-r, top + r);
    ctx.arc(0, top + r, r, PI, 0);
    ctx.lineTo(r, by);
    for (var i = 0; i < n; i++) {
      var x1 = r - seg * i, x2 = x1 - seg;
      ctx.quadraticCurveTo(x1 - seg / 2, by - 9, x2, by);
    }
    ctx.closePath();
  }
  function leanPose(ctx) { ctx.transform(1, 0, -0.16, 1, 0, 0); ctx.scale(0.86, 0.86); }
  var ENEMY_COL = { imp: '#b23a52', archer: '#963a86', ice: '#5a5aa8', drummer: '#8a4a3a', thunder: '#4b3f9a', healer: '#2f6e5a', brute: '#7e1a30', bossFrost: '#4f55b0', bossThunder: '#3a2466' };
  function enemyBody(ctx, type, S, opt) {
    opt = opt || {};
    var swift = type === 'imp' && opt.swift;
    var body = opt.body || (swift ? '#e88aa0' : ENEMY_COL[type]);
    var hs = S / 2;
    // 疾行怪: 身形瘦一圈(寬 0.84)、體色較淺、頭上綁帶往後飄
    if (swift) { ctx.save(); ctx.scale(0.84, 1); }
    // 奔牛怪: 身體前傾(上半身往右 = 前進方向)
    var lean = type === 'drummer' && !opt.flat && !opt.noLean;
    if (lean) { ctx.save(); leanPose(ctx); }
    ctx.fillStyle = C.enemyDark; ghostPath(ctx, S - 1, S - 1); ctx.fill();
    ctx.fillStyle = body; ghostPath(ctx, S - 4, S - 4); ctx.fill();
    if (opt.tint) { ctx.fillStyle = opt.tint; ghostPath(ctx, S - 4, S - 4); ctx.fill(); }
    // 頭飾
    if (type === 'imp' && !opt.flat) {
      ctx.fillStyle = C.enemyDark;
      ctx.beginPath(); ctx.moveTo(-9, -hs + 6); ctx.lineTo(-12, -hs + 1); ctx.lineTo(-5, -hs + 4); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(9, -hs + 6); ctx.lineTo(12, -hs + 1); ctx.lineTo(5, -hs + 4); ctx.closePath(); ctx.fill();
    } else if (type === 'ice') {
      ctx.fillStyle = C.frost;
      for (var i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(i * 6, -hs + 2); ctx.lineTo(i * 6 + 3, -hs + 8); ctx.lineTo(i * 6 - 3, -hs + 8); ctx.closePath(); ctx.fill(); }
    } else if (type === 'archer' && !opt.flat) {
      ctx.strokeStyle = '#d8b878'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(-hs + 6, 2, 9, -PI / 2.4, PI / 2.4); ctx.stroke();
      ctx.strokeStyle = '#eee'; ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.moveTo(-hs + 6 + Math.cos(PI / 2.4) * 9, 2 - Math.sin(PI / 2.4) * 9); ctx.lineTo(-hs + 6 + Math.cos(PI / 2.4) * 9, 2 + Math.sin(PI / 2.4) * 9); ctx.stroke();
    } else if (type === 'brute' && !opt.flat) {
      ctx.fillStyle = '#4a2a1a'; ctx.save(); ctx.translate(hs - 7, 4); ctx.rotate(0.3); rr(ctx, -3, -12, 6, 20, 3); ctx.fill(); ctx.restore();
    } else if (type === 'drummer') {
      // 一對前彎的牛角(和衝鋒魂件圖示同一對角), 角尖衝鋒洋紅
      for (var hsd = -1; hsd <= 1; hsd += 2) {
        var horn = function () { ctx.beginPath(); ctx.moveTo(hsd * 4, -hs + 9); ctx.quadraticCurveTo(hsd * 14, -hs + 8, hsd * 12, -hs + 1); };
        ctx.lineCap = 'round';
        ctx.strokeStyle = C.enemyDark; ctx.lineWidth = 5; horn(); ctx.stroke();
        ctx.strokeStyle = '#efe2c4'; ctx.lineWidth = 3; horn(); ctx.stroke();
        ctx.fillStyle = C.charge; ctx.beginPath(); ctx.arc(hsd * 12, -hs + 1.8, 1.8, 0, TAU); ctx.fill();
      }
    } else if (type === 'thunder') {
      // 頭頂一道閃電冠 + 胸前鋸齒紋(電擊紫)
      ctx.fillStyle = C.enemyDark; boltGlyph(ctx, 0, -hs + 6, 7); ctx.fill();
      ctx.fillStyle = C.shock; boltGlyph(ctx, 0, -hs + 6, 5.4); ctx.fill();
      ctx.strokeStyle = lighten(C.shock, 0.3); ctx.lineWidth = 1.6; ctx.lineJoin = 'round';
      ctx.beginPath(); ctx.moveTo(-hs * 0.55, hs * 0.38); ctx.lineTo(-hs * 0.2, hs * 0.2); ctx.lineTo(0, hs * 0.42); ctx.lineTo(hs * 0.22, hs * 0.2); ctx.lineTo(hs * 0.55, hs * 0.38); ctx.stroke();
    } else if (type === 'healer') {
      // 額頭白底薄荷綠十字(護士帽), 一眼看出「會補血」
      ctx.fillStyle = C.enemyDark; plusPath(ctx, 0, -hs + 7.5, 6.2); ctx.fill();
      ctx.fillStyle = '#ffffff'; plusPath(ctx, 0, -hs + 7.5, 5); ctx.fill();
      ctx.fillStyle = C.heal; plusPath(ctx, 0, -hs + 7.5, 3.4); ctx.fill();
    }
    // 眼
    var ey = -hs * 0.12, ex = S * 0.17;
    if (opt.dead) {
      ctx.strokeStyle = '#222'; ctx.lineWidth = 1.8;
      for (var s = -1; s <= 1; s += 2) {
        ctx.beginPath(); ctx.moveTo(s * ex - 3, ey - 3); ctx.lineTo(s * ex + 3, ey + 3); ctx.moveTo(s * ex + 3, ey - 3); ctx.lineTo(s * ex - 3, ey + 3); ctx.stroke();
      }
    } else {
      ctx.fillStyle = C.enemyDark;
      ctx.beginPath(); ctx.ellipse(-ex, ey, 4, 4.5, 0, 0, TAU); ctx.ellipse(ex, ey, 4, 4.5, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = C.enemyEye;
      ctx.beginPath(); ctx.arc(-ex, ey, 2.2, 0, TAU); ctx.arc(ex, ey, 2.2, 0, TAU); ctx.fill();
    }
    if (swift) {
      ctx.restore();
      // 額頭綁帶(白)+ 兩條往後(左)飄動的帶尾, 全在 32×32 內
      var fl = Math.sin(now() * 14) * 2;
      ctx.fillStyle = C.enemyDark; ctx.fillRect(-12.5, -hs + 7, 25, 4.6);
      ctx.fillStyle = '#fff4f6'; ctx.fillRect(-12, -hs + 7.6, 24, 3.4);
      ctx.strokeStyle = '#fff4f6'; ctx.lineWidth = 2.2; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-12, -hs + 9); ctx.quadraticCurveTo(-14, -hs + 5 + fl, -15, -hs + 3 + fl); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-12, -hs + 10); ctx.quadraticCurveTo(-14.5, -hs + 11 - fl, -15, -hs + 14 - fl); ctx.stroke();
    }
    if (lean) ctx.restore();
  }

  // ---------- Boss(第 7 輪, 72×72) ----------
  // 共同語言: 一般敵人的「鬼」剪影放大(62 寬, 中心下移 5 讓出頭頂配件)+ 粗暗紅外描 + 橘眼, 加上怒眉、獠牙與王者配件。
  // 兩隻(第 8 輪刪掉蠻角牛王): 霜角巨怪 = 靛藍身 + 冰晶巨角 + 冰甲肩 + 雙冰刃;
  //       雷霆魔王 = 墨紫身 + 金色雷角王冠 + 周身電弧 + 治癒寶珠權杖。全部畫在 ±36 內(中心為原點)。
  function bossSil(ctx, w) { ctx.save(); ctx.translate(0, 5); ghostPath(ctx, w, w); ctx.restore(); }
  function bossLean(ctx, k) { ctx.transform(1, 0, -k, 1, 0, 0); }
  // opt: { tint, mono, dead, roar(0~1 張嘴), eyeGlow(0~1), arcs(bool, 雷霆魔王身邊電弧; 預設 true) }
  function bossBody(ctx, type, opt) {
    opt = opt || {};
    var mono = opt.mono || null;
    function F(c) { return mono || c; }
    var body = F(ENEMY_COL[type] || ENEMY_COL.bossFrost), dk = F(C.enemyDark);
    ctx.save();
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    // ---- 身後的配件(先畫, 讓身體蓋住根部) ----
    if (type === 'bossFrost') {
      // 冰晶巨角: 頭頂兩側往外上斜, 角尖 (±25, −33)
      for (var sd = -1; sd <= 1; sd += 2) {
        ctx.beginPath(); ctx.moveTo(sd * 7, -17); ctx.lineTo(sd * 15, -28); ctx.lineTo(sd * 25, -33); ctx.lineTo(sd * 22, -23); ctx.lineTo(sd * 18, -16); ctx.closePath();
        ctx.fillStyle = dk; ctx.lineWidth = 3; ctx.strokeStyle = dk; ctx.stroke(); ctx.fill();
        ctx.fillStyle = F('#dff6ff'); ctx.fill();
        ctx.strokeStyle = F(C.frost); ctx.lineWidth = 1.2; ctx.stroke();
        if (!mono) { ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(sd * 12, -19); ctx.lineTo(sd * 21, -29.5); ctx.stroke(); }
      }
      // 雙冰刃(兩件近戰): 手在 (±28, 11), 刃尖朝外上到 (±33.5, −14)
      for (var sb = -1; sb <= 1; sb += 2) {
        ctx.beginPath(); ctx.moveTo(sb * 25, 10); ctx.lineTo(sb * 33.5, -14); ctx.lineTo(sb * 32, 12); ctx.closePath();
        ctx.strokeStyle = dk; ctx.lineWidth = 2.5; ctx.stroke();
        ctx.fillStyle = F('#eefcff'); ctx.fill();
        ctx.strokeStyle = F(C.frost); ctx.lineWidth = 1; ctx.stroke();
      }
    } else if (type === 'bossThunder') {
      // 權杖(右手): 杖身 x 27, 頂端治癒寶珠 (27, −20) r 6.5 = 「牠會補血」
      ctx.strokeStyle = dk; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(27, 31); ctx.lineTo(27, -14); ctx.stroke();
      ctx.strokeStyle = F('#b08a4a'); ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(27, 31); ctx.lineTo(27, -14); ctx.stroke();
      ctx.fillStyle = dk; ctx.beginPath(); ctx.arc(27, -20, 8, 0, TAU); ctx.fill();
      ctx.fillStyle = F(C.heal); ctx.beginPath(); ctx.arc(27, -20, 6.5, 0, TAU); ctx.fill();
      if (!mono) {
        ctx.fillStyle = '#ffffff'; plusPath(ctx, 27, -20, 4); ctx.fill();
        ctx.strokeStyle = rgba(C.heal, 0.45 + 0.3 * Math.sin(now() * 4)); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(27, -20, 7.6, 0, TAU); ctx.stroke();
      }
    }
    // ---- 身體 ----
    ctx.fillStyle = dk; bossSil(ctx, 62); ctx.fill();
    ctx.fillStyle = body; bossSil(ctx, 57); ctx.fill();
    if (opt.tint && !mono) { ctx.fillStyle = opt.tint; bossSil(ctx, 57); ctx.fill(); }
    if (!mono) {
      // 腹部亮面(厚重的體積感)
      ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.beginPath(); ctx.ellipse(0, 14, 18, 14, 0, 0, TAU); ctx.fill();
    }
    // ---- 身前的配件 ----
    if (type === 'bossFrost') {
      // 冰甲肩: 兩肩各 3 片冰晶往外上
      for (var sa = -1; sa <= 1; sa += 2) {
        var cx0 = sa * 20, cy0 = -6;
        [[-0.9, 9], [-0.4, 11], [0.15, 8]].forEach(function (q) {
          var a = -PI / 2 + sa * (PI / 2 + q[0]) * 0.75, L = q[1];
          var tx = cx0 + Math.cos(a) * L, ty = cy0 + Math.sin(a) * L;
          var nx = -Math.sin(a) * 3.2, ny = Math.cos(a) * 3.2;
          ctx.beginPath(); ctx.moveTo(cx0 + nx, cy0 + ny); ctx.lineTo(tx, ty); ctx.lineTo(cx0 - nx, cy0 - ny); ctx.closePath();
          ctx.strokeStyle = dk; ctx.lineWidth = 2; ctx.stroke();
          ctx.fillStyle = F('#c4ecff'); ctx.fill();
        });
        ctx.fillStyle = F('#9fdcff'); ctx.beginPath(); ctx.ellipse(cx0, cy0 + 2, 7, 4.5, 0, 0, TAU); ctx.fill();
      }
      // 胸前霜紋
      if (!mono) { ctx.strokeStyle = 'rgba(200,240,255,0.55)'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(-8, 18); ctx.lineTo(-3, 24); ctx.lineTo(0, 19); ctx.lineTo(3, 24); ctx.lineTo(8, 18); ctx.stroke(); }
    } else if (type === 'bossThunder') {
      // 金色王冠 + 三支雷角(電擊紫閃電)
      ctx.fillStyle = dk; boltGlyph(ctx, -12, -25, 7.5); ctx.fill(); boltGlyph(ctx, 12, -25, 7.5); ctx.fill(); boltGlyph(ctx, 0, -26, 9); ctx.fill();
      ctx.fillStyle = F(C.shock); boltGlyph(ctx, -12, -25, 6); ctx.fill(); boltGlyph(ctx, 12, -25, 6); ctx.fill(); boltGlyph(ctx, 0, -26, 7.4); ctx.fill();
      ctx.fillStyle = dk; rr(ctx, -17, -23, 34, 9, 2); ctx.fill();
      ctx.fillStyle = F(C.gold); rr(ctx, -15.5, -21.5, 31, 6, 1.5); ctx.fill();
      if (!mono) { ctx.fillStyle = C.shock; ctx.beginPath(); ctx.arc(0, -18.5, 2, 0, TAU); ctx.fill(); }
      // 胸前鋸齒紋(和電電怪同一個記號)
      ctx.strokeStyle = F(lighten(C.shock, 0.3)); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-17, 18); ctx.lineTo(-8, 12); ctx.lineTo(-2, 20); ctx.lineTo(5, 12); ctx.lineTo(14, 19); ctx.stroke();
      // 左手爪尖的小電火花
      if (!mono) { ctx.fillStyle = '#ffffff'; boltGlyph(ctx, -29, 12, 5); ctx.fill(); }
    }
    // ---- 臉: 怒眉 + 大眼 + 獠牙 ----
    var ex = 11, ey = -4;
    if (opt.dead) {
      ctx.strokeStyle = F('#1a0a10'); ctx.lineWidth = 2.6;
      for (var s2 = -1; s2 <= 1; s2 += 2) { ctx.beginPath(); ctx.moveTo(s2 * ex - 4, ey - 4); ctx.lineTo(s2 * ex + 4, ey + 4); ctx.moveTo(s2 * ex + 4, ey - 4); ctx.lineTo(s2 * ex - 4, ey + 4); ctx.stroke(); }
    } else {
      ctx.fillStyle = dk; ctx.beginPath(); ctx.ellipse(-ex, ey, 6, 5.5, 0, 0, TAU); ctx.ellipse(ex, ey, 6, 5.5, 0, 0, TAU); ctx.fill();
      var eg = clamp(num(opt.eyeGlow, type === 'bossThunder' ? 0.35 : 0), 0, 1);
      if (eg > 0 && !mono) {
        ctx.fillStyle = 'rgba(255,240,150,' + (0.35 * eg) + ')'; ctx.beginPath(); ctx.arc(-ex, ey, 6 + 3 * eg, 0, TAU); ctx.arc(ex, ey, 6 + 3 * eg, 0, TAU); ctx.fill();
      }
      ctx.fillStyle = mono ? mono : (eg > 0.5 ? '#fff6c0' : C.enemyEye);
      ctx.beginPath(); ctx.arc(-ex, ey + 0.5, 3.2, 0, TAU); ctx.arc(ex, ey + 0.5, 3.2, 0, TAU); ctx.fill();
      // 怒眉(往中間壓低)
      ctx.strokeStyle = dk; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(-ex - 7, ey - 9); ctx.lineTo(-ex + 6, ey - 5); ctx.moveTo(ex + 7, ey - 9); ctx.lineTo(ex - 6, ey - 5); ctx.stroke();
    }
    {
      var ro = clamp(num(opt.roar, 0), 0, 1), my = 10;
      ctx.fillStyle = dk; ctx.beginPath(); ctx.ellipse(0, my + 1 + ro * 2, 9 + ro * 2, 2.5 + ro * 5, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = F(type === 'bossFrost' ? '#eefcff' : '#f4ecff');
      ctx.beginPath(); ctx.moveTo(-6, my - 1); ctx.lineTo(-3.5, my + 5 + ro * 2); ctx.lineTo(-1, my - 1); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(6, my - 1); ctx.lineTo(3.5, my + 5 + ro * 2); ctx.lineTo(1, my - 1); ctx.closePath(); ctx.fill();
    }
    // 雷霆魔王身邊的常駐電弧(框內, 半徑 30~34)
    if (type === 'bossThunder' && !mono && opt.arcs !== false && !opt.dead) {
      var seed = Math.floor(now() * 12);
      ctx.strokeStyle = rgba(C.shock, 0.85); ctx.lineWidth = 1.6;
      for (var ai = 0; ai < 2; ai++) {
        var a0 = hash(seed, ai, 3) * TAU, a1 = a0 + 0.7;
        boltPath(ctx, Math.cos(a0) * 31, 4 + Math.sin(a0) * 29, Math.cos(a1) * 31, 4 + Math.sin(a1) * 29, 2.5, seed + ai); ctx.stroke();
      }
    }
    ctx.restore();
  }
  function playerBody(ctx) {
    // 斗篷底
    ctx.fillStyle = C.playerRim; ctx.beginPath(); ctx.arc(0, 1, 14.5, 0, TAU); ctx.fill();
    ctx.fillStyle = C.player; ctx.beginPath(); ctx.arc(0, 1, 12.5, 0, TAU); ctx.fill();
    // 兜帽
    ctx.fillStyle = C.playerCloak; ctx.beginPath(); ctx.arc(0, -3, 9, PI * 1.05, -PI * 0.05); ctx.lineTo(7, -1); ctx.lineTo(-7, -1); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#3a2a1c'; ctx.fillRect(-4.5, -2.5, 3, 3); ctx.fillRect(1.5, -2.5, 3, 3);
    // 鍛錘徽記
    ctx.fillStyle = '#5a3a1e'; ctx.fillRect(-1, 3, 2, 9);
    ctx.fillStyle = '#4a4f5c'; rr(ctx, -5, 3, 10, 4, 1); ctx.fill();
  }
  // 衝鋒: 身後(右)3 條速度線, 從 hs+2 畫到 hs+11(框外 ≤ 12px)
  function speedLines(ctx, hs) {
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 2; ctx.lineCap = 'round';
    for (var i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(hs + 2 + Math.abs(i) * 2, i * hs * 0.45); ctx.lineTo(hs + 11, i * hs * 0.45); ctx.stroke(); }
    ctx.restore();
  }
  // 近戰撲擊(attackKind "melee", attackDuration 0.25): 0~0.08 秒朝 attackAngle 前衝 10px 並沿方向拉長,
  // 0.08~0.25 秒彈回; 回傳 {dx, dy, a, f} 或 null(不是近戰或沒在播)
  function lungeOf(s) {
    if (!s || s.attackKind !== 'melee') return null;
    var d = num(s.attackDuration, 0.25) || 0.25, t = num(s.attackAge, d);
    if (!(t >= 0 && t < d)) return null;
    var hit = Math.min(0.08, d * 0.32), f;
    if (t < hit) { var u = t / hit; f = 1 - (1 - u) * (1 - u); }
    else { var v = (t - hit) / (d - hit); f = 1 - v * v * (3 - 2 * v); }
    var a = num(s.attackAngle, 0);
    return { dx: Math.cos(a) * 10 * f, dy: Math.sin(a) * 10 * f, a: a, f: f };
  }
  // 撲擊姿勢: 平移 + 沿出手方向拉長 12%、側向收 8%(前傾 / 拉長)
  function applyLunge(ctx, L) {
    if (!L) return;
    ctx.translate(L.dx, L.dy);
    ctx.rotate(L.a); ctx.scale(1 + 0.12 * L.f, 1 - 0.08 * L.f); ctx.rotate(-L.a);
  }
  // 撲擊殘影: 原位留一道淡淡的本體輪廓(只在前衝段), 讓「衝出去又回來」讀得出來
  function lungeGhost(ctx, L, bodyFn) {
    if (!L || L.f < 0.25) return;
    ctx.save(); ctx.globalAlpha *= 0.22 * L.f; bodyFn(); ctx.restore();
  }
  function chargePose(ctx) { ctx.translate(-1, 0); ctx.transform(1, 0, -0.12, 1, 0, 0); ctx.scale(0.85, 0.85); }
  // 不動如山(紮根): 框內底部一排岩塊 + 下半圈土色粗框; 和共鳴微光(整圈淡紫)分開
  function rootedMark(ctx, w, h) {
    var hw = w / 2, hh = h / 2;
    ctx.save();
    ctx.strokeStyle = C.rooted; ctx.lineWidth = 3; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-hw + 1.5, 0); ctx.lineTo(-hw + 1.5, hh - 1.5); ctx.lineTo(hw - 1.5, hh - 1.5); ctx.lineTo(hw - 1.5, 0); ctx.stroke();
    var n = w >= 44 ? 5 : 4, rw = (w - 4) / n, rh = Math.max(4, h * 0.16);
    for (var i = 0; i < n; i++) {
      var x0 = -hw + 2 + rw * i, top = hh - rh - (i % 2 ? 1 : 0);
      ctx.fillStyle = C.rootedDark; rr(ctx, x0, top, rw - 0.5, hh - top, 2); ctx.fill();
      ctx.fillStyle = C.rooted; rr(ctx, x0 + 0.8, top + 0.8, rw - 2.1, Math.max(1, hh - top - 2.4), 1.5); ctx.fill();
    }
    ctx.restore();
  }
  // 被治癒中: 框內薄荷綠微光 + 兩個往上飄的小十字
  function healGlow(ctx, w, h, ghost) {
    var t = now(), pulse = 0.6 + 0.4 * Math.sin(t * 6);
    ctx.save();
    ctx.globalAlpha = 0.22 * pulse; ctx.fillStyle = C.heal;
    if (ghost) { ghostPath(ctx, w - 4, h - 4); ctx.fill(); }
    else { rr(ctx, -w / 2 + 2, -h / 2 + 2, w - 4, h - 4, 6); ctx.fill(); }
    for (var i = 0; i < 2; i++) {
      var f = (t * 0.9 + i * 0.5) % 1;
      var px = (i ? 0.26 : -0.24) * w, py = h / 2 - 6 - f * (h - 12);
      ctx.globalAlpha = 0.95 * (1 - f);
      ctx.fillStyle = '#0f3a26'; plusPath(ctx, px, py, 3.6); ctx.fill();
      ctx.fillStyle = '#c8ffe0'; plusPath(ctx, px, py, 2.6); ctx.fill();
    }
    ctx.restore();
  }

  // ---------- 背景 ----------
  var DEFAULT_PATHS = [[[288, 48], [288, 336], [900, 336]]];
  function strokeRoute(ctx, pts) { ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (var i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]); ctx.stroke(); }
  function normPaths(p) {
    var out = [];
    arr(p).slice(0, 3).forEach(function (line) {
      var pts = [];
      arr(line).forEach(function (q) { if (Array.isArray(q) && isFinite(+q[0]) && isFinite(+q[1])) pts.push([+q[0], +q[1]]); });
      if (pts.length >= 2) out.push(pts);
    });
    return out.length ? out : DEFAULT_PATHS;
  }
  // 起點往畫面外延伸(路從畫面外進來): 從左緣進來的延伸到 x −160(第 13 輪, 發布加寬不斷掉), 其他 40; 最後一段水平線收在主堡左緣 x = 844
  function routePts(pts) {
    var a = pts[0], b = pts[1], dx = a[0] - b[0], dy = a[1] - b[1], L = Math.hypot(dx, dy) || 1;
    var ext = (a[0] <= 0 && dx < 0) ? 160 + a[0] : 40;
    var out = [[a[0] + dx / L * ext, a[1] + dy / L * ext]];
    for (var i = 0; i < pts.length; i++) out.push([pts[i][0], pts[i][1]]);
    var n = out.length, last = out[n - 1], prev = out[n - 2], gate = CASTLE_X - 56;
    if (last[1] === prev[1] && last[0] > gate && prev[0] < gate) out[n - 1] = [gate, last[1]];
    return out;
  }
  // 入口: 由畫面邊往內 70 的暗化 + 兩側路標石
  function entryShade(ctx, pts) {
    var a = pts[0], b = pts[1];
    ctx.save(); ctx.translate(a[0], a[1]); ctx.rotate(Math.atan2(b[1] - a[1], b[0] - a[0]));
    var g = ctx.createLinearGradient(-40, 0, 72, 0);
    g.addColorStop(0, 'rgba(12,8,4,0.65)'); g.addColorStop(1, 'rgba(12,8,4,0)');
    ctx.fillStyle = g; ctx.fillRect(-40, -25, 112, 50);
    ctx.fillStyle = '#4c4a42';
    rr(ctx, 76, -40, 12, 10, 3); ctx.fill(); rr(ctx, 76, 30, 12, 10, 3); ctx.fill();
    ctx.restore();
  }
  function grassAndGrid(ctx) {
    ctx.fillStyle = C.grass; ctx.fillRect(FX0, 0, FW, H);
    ctx.fillStyle = C.grassDark;
    for (var i = 0; i < 56; i++) {
      var gx = FX0 + (i * 211) % FW, gy = 58 + (i * 137) % (H - 58);
      ctx.beginPath(); ctx.ellipse(gx, gy, 18, 8, 0, 0, TAU); ctx.fill();
    }
    // 蓋塔格線(第 13 輪): 21 欄 × 11 列, 格線在 x = 48k(0~1008)、y = 48 + 48k; x > 1008 那條 16 寬草地與 x < 0 不畫
    ctx.strokeStyle = C.grid; ctx.lineWidth = 1; ctx.beginPath();
    for (var c = 0; c <= 21; c++) { ctx.moveTo(c * 48 + 0.5, HUD_H); ctx.lineTo(c * 48 + 0.5, HUD_H + 11 * 48); }
    for (var r = 0; r <= 11; r++) { ctx.moveTo(0, HUD_H + r * 48 + 0.5); ctx.lineTo(21 * 48, HUD_H + r * 48 + 0.5); }
    ctx.stroke();
  }
  // 多條路線: 每一層都是不透明色, 先畫完所有路的邊、再畫所有路面 → 重疊處同色、無接縫
  function roads(ctx, paths) {
    var rs = paths.map(routePts);
    ctx.lineJoin = 'round'; ctx.lineCap = 'butt'; ctx.setLineDash([]);
    ctx.strokeStyle = C.pathEdge; ctx.lineWidth = 56; rs.forEach(function (p) { strokeRoute(ctx, p); });
    ctx.strokeStyle = C.path; ctx.lineWidth = 50; rs.forEach(function (p) { strokeRoute(ctx, p); });
    ctx.strokeStyle = C.pathLight; ctx.lineWidth = 20; rs.forEach(function (p) { strokeRoute(ctx, p); });
    paths.forEach(function (p) { entryShade(ctx, p); });
  }
  function drawBackground(ctx, s) {
    s = s || {};
    ctx.save();
    grassAndGrid(ctx);
    roads(ctx, normPaths(s.paths));
    ctx.restore();
  }

  // ---------- 地面層 ----------
  // 購買區: 暖金「長虛線」圈(魂柱範圍是實線 / 細點線, 冰霜圈是冰藍), 外緣 = radius
  function drawShopZone(ctx, s) {
    s = s || {};
    var x = num(s.x, CASTLE_X), y = num(s.y, CASTLE_Y), R = clamp(num(s.radius, 110), 0, 110), on = bool(s.active);
    ctx.save();
    ctx.fillStyle = rgba(C.shopZone, on ? 0.11 : 0.045);
    ctx.beginPath(); ctx.arc(x, y, R, 0, TAU); ctx.fill();
    var lw = on ? 2.5 : 1.5;
    ctx.strokeStyle = rgba(C.shopZone, on ? 0.95 : 0.45); ctx.lineWidth = lw; ctx.setLineDash([12, 7]);
    ctx.beginPath(); ctx.arc(x, y, Math.max(0.5, R - lw / 2), now() * 0.05, now() * 0.05 + TAU); ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }
  // 商店提示: 帶購買的單位正下方, 88×24 半透明底板 + [空白] 鍵帽 + 「商店」(金色呼應購買)
  function drawShopHint(ctx, s) {
    s = s || {};
    var x = num(s.x, CASTLE_X), y = num(s.y, 410);
    ctx.save();
    // 觸控模式: 底板 104×28、鍵帽 48×24(字級下限 17)
    var bw = tv(88, 104), bh = tv(24, 28), kh = tv(22, 24), kw = kh * 2;
    ctx.fillStyle = 'rgba(40,24,6,0.78)'; rr(ctx, x - bw / 2, y - bh / 2, bw, bh, 7); ctx.fill();
    ctx.strokeStyle = rgba(C.shopZone, 0.85); ctx.lineWidth = 1.5; rr(ctx, x - bw / 2 + 0.75, y - bh / 2 + 0.75, bw - 1.5, bh - 1.5, 6.5); ctx.stroke();
    var tw = textW(ctx, '商店', 13), tot = kw + 4 + tw, x0 = x - tot / 2;
    keyIcon(ctx, 'space', x0 + kw / 2, y, kw, kh, false);
    txt(ctx, '商店', x0 + kw + 4, y + 0.5, { size: 13, align: 'left', color: C.shopZone });
    ctx.restore();
  }
  // 聖光軌跡: 全寬 40 的光帶(外緣 = 判定邊界), 每段亮度依兩端 life / maxLife; 亮度分 6 階, 同階相連的段一筆畫完(不在接點疊色)
  function drawHolyTrail(ctx, s) {
    s = s || {};
    var ml = num(s.maxLife, 4) || 4;
    var pts = [];
    arr(s.points).forEach(function (q) {
      if (Array.isArray(q) && isFinite(+q[0]) && isFinite(+q[1])) pts.push([+q[0], +q[1], clamp(num(q[2], 0), 0, ml) / ml]);
    });
    if (pts.length < 2) return;
    ctx.save();
    ctx.lineJoin = 'round'; ctx.lineCap = 'butt';
    var lvl = function (i) { return Math.ceil(((pts[i][2] + pts[i + 1][2]) / 2) * 6); };
    var i = 0, n = pts.length - 1;
    while (i < n) {
      var L = lvl(i), j = i;
      while (j + 1 < n && lvl(j + 1) === L) j++;
      if (L > 0) {
        var a = L / 6;
        var stroke = function (w, col, al) {
          ctx.globalAlpha = al; ctx.strokeStyle = col; ctx.lineWidth = w;
          ctx.beginPath(); ctx.moveTo(pts[i][0], pts[i][1]);
          for (var k = i + 1; k <= j + 1; k++) ctx.lineTo(pts[k][0], pts[k][1]);
          ctx.stroke();
        };
        stroke(40, C.heal, 0.16 * a);
        stroke(14, '#e6fff0', 0.22 * a);
        // 兩端圓頭(只畫往外的半圓, 不和帶身疊色)
        [[i, i + 1], [j + 1, j]].forEach(function (e, ei) {
          var isEnd = ei === 0 ? e[0] === 0 : e[0] === n;
          if (!isEnd) return;
          var p = pts[e[0]], q = pts[e[1]], ang = Math.atan2(p[1] - q[1], p[0] - q[0]);
          ctx.globalAlpha = 0.16 * a; ctx.fillStyle = C.heal;
          ctx.beginPath(); ctx.arc(p[0], p[1], 20, ang - PI / 2, ang + PI / 2); ctx.closePath(); ctx.fill();
        });
      }
      i = j + 1;
    }
    // 沿線的小十字(每 4 點一個, 跟著那一點的亮度)
    for (var k = 0; k < pts.length; k += 4) {
      var pa = pts[k][2]; if (pa <= 0) continue;
      ctx.globalAlpha = 0.55 * pa; ctx.fillStyle = '#e6fff0';
      plusPath(ctx, pts[k][0], pts[k][1] + ((k / 4) % 2 ? 7 : -7), 3); ctx.fill();
    }
    ctx.restore();
  }
  // 治癒領域: 外緣 = radius; 極淡薄荷綠 + 往上飄的小十字。ally = 實線圈; enemy = 虛線圈 + 十字帶敵方暗紅描邊
  function drawHealAura(ctx, s) {
    s = s || {};
    var x = num(s.x, 0), y = num(s.y, 0), R = clamp(num(s.radius, 100), 0, 100);
    var enemy = s.owner === 'enemy';
    ctx.save();
    ctx.fillStyle = rgba(C.heal, enemy ? 0.045 : 0.05);
    ctx.beginPath(); ctx.arc(x, y, R, 0, TAU); ctx.fill();
    ctx.lineWidth = 1.5; ctx.strokeStyle = rgba(C.heal, enemy ? 0.5 : 0.42);
    if (enemy) ctx.setLineDash([4, 6]);
    ctx.beginPath(); ctx.arc(x, y, Math.max(0.5, R - 0.75), 0, TAU); ctx.stroke();
    ctx.setLineDash([]);
    var t = now();
    for (var i = 0; i < 5; i++) {
      var f = (t * 0.35 + i / 5) % 1;
      var a = i * 2.4 + 0.7, d = R * (0.2 + 0.4 * hash(i, 3, 7));
      var px = x + Math.cos(a) * d, py = y + Math.sin(a) * d * 0.6 + R * 0.25 - f * R * 0.5;
      ctx.globalAlpha = 0.6 * Math.sin(f * PI);
      if (enemy) { ctx.fillStyle = C.enemyDark; plusPath(ctx, px, py, 4); ctx.fill(); }
      ctx.fillStyle = enemy ? C.heal : '#d8ffe8'; plusPath(ctx, px, py, 2.8); ctx.fill();
    }
    ctx.restore();
  }
  function drawPillarRange(ctx, s) {
    s = s || {};
    var x = num(s.x, 0), y = num(s.y, 0), R = clamp(num(s.radius, 150), 0, 150);
    var kind = firstKind(s.kinds), cols = kindCols(kind);
    ctx.save();
    if (!cols.length) {
      ctx.strokeStyle = 'rgba(255,255,255,0.22)'; ctx.lineWidth = 1.5; ctx.setLineDash([3, 6]);
      ctx.beginPath(); ctx.arc(x, y, Math.max(0.5, R - 0.75), 0, TAU); ctx.stroke();
    } else if (!isCombo(kind)) {
      // 基本魂件: 單色淡染 + 實線外圈 + 內側細點線
      ctx.fillStyle = cols[0]; ctx.globalAlpha = 0.09;
      ctx.beginPath(); ctx.arc(x, y, R, 0, TAU); ctx.fill();
      ctx.globalAlpha = 0.75; ctx.strokeStyle = cols[0]; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(x, y, Math.max(0.5, R - 1.25), 0, TAU); ctx.stroke();
      ctx.globalAlpha = 0.35; ctx.lineWidth = 1; ctx.setLineDash([2, 6]);
      ctx.beginPath(); ctx.arc(x, y, Math.max(0.5, R - 8), 0, TAU); ctx.stroke();
    } else {
      // 組合魂件(融合色): 12 扇兩色交替淡染 + 雙實線外框(多一圈外框 = 組合)
      var n = 12;
      for (var i = 0; i < n; i++) {
        var a0 = i * TAU / n, a1 = a0 + TAU / n, col = cols[i % 2];
        ctx.fillStyle = col; ctx.globalAlpha = 0.09;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.arc(x, y, R, a0, a1); ctx.closePath(); ctx.fill();
        ctx.globalAlpha = 0.85; ctx.strokeStyle = col; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.arc(x, y, Math.max(0.5, R - 1.25), a0, a1); ctx.stroke();
      }
      ctx.globalAlpha = 0.6; ctx.lineWidth = 1.5; ctx.strokeStyle = cols[0];
      ctx.beginPath(); ctx.arc(x, y, Math.max(0.5, R - 6), 0, TAU); ctx.stroke();
    }
    var p = prog(s.changeAge, num(s.changeDuration, 0.5));
    if (p >= 0) {
      ctx.setLineDash([]);
      ctx.globalAlpha = 1 - p;
      ctx.strokeStyle = cols[0] || '#ffffff'; ctx.lineWidth = 4;
      var rr2 = Math.max(2, (R - 2) * (0.1 + 0.9 * p));
      ctx.beginPath(); ctx.arc(x, y, rr2, 0, TAU); ctx.stroke();
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(x, y, rr2, 0, TAU); ctx.stroke();
    }
    ctx.restore();
  }
  function drawResonanceLine(ctx, s) {
    s = s || {};
    var x1 = num(s.x1, 0), y1 = num(s.y1, 0), x2 = num(s.x2, x1), y2 = num(s.y2, y1);
    var cols = kindCols(s.kind), col = cols[0] || '#ffffff', col2 = cols[1] || null;
    ctx.save();
    ctx.lineCap = 'round';
    if (!bool(s.active)) {
      ctx.globalAlpha = 0.35; ctx.strokeStyle = col; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    } else {
      ctx.globalAlpha = 0.9; ctx.strokeStyle = col; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      if (col2) { ctx.lineCap = 'butt'; ctx.strokeStyle = col2; ctx.setLineDash([6, 6]); ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); ctx.setLineDash([]); ctx.lineCap = 'round'; }
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1; ctx.globalAlpha = 0.8;
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      // 往接收者流動的光點
      var L = Math.hypot(x2 - x1, y2 - y1);
      if (L > 1) {
        var t = now(), step = 26, off = (t * 60) % step;
        ctx.fillStyle = '#ffffff'; ctx.globalAlpha = 1;
        for (var d = off; d < L; d += step) {
          var f = d / L;
          ctx.beginPath(); ctx.arc(x1 + (x2 - x1) * f, y1 + (y2 - y1) * f, 2, 0, TAU); ctx.fill();
        }
      }
    }
    ctx.restore();
  }
  function drawFrostAura(ctx, s) {
    s = s || {};
    var x = num(s.x, 0), y = num(s.y, 0), R = clamp(num(s.radius, 70), 0, 70);
    var enemy = s.owner === 'enemy';
    ctx.save();
    ctx.fillStyle = enemy ? 'rgba(200,60,120,0.10)' : 'rgba(143,216,255,0.12)';
    ctx.beginPath(); ctx.arc(x, y, R, 0, TAU); ctx.fill();
    ctx.lineWidth = 2;
    if (enemy) { ctx.strokeStyle = 'rgba(230,80,140,0.75)'; ctx.setLineDash([6, 5]); }
    else ctx.strokeStyle = 'rgba(160,225,255,0.7)';
    ctx.beginPath(); ctx.arc(x, y, Math.max(0.5, R - 1), 0, TAU); ctx.stroke();
    ctx.setLineDash([]);
    // 雪點(緩慢繞行)
    var t = now() * 0.4;
    ctx.fillStyle = enemy ? 'rgba(255,170,210,0.8)' : 'rgba(220,245,255,0.85)';
    for (var i = 0; i < 6; i++) {
      var a = t + i * TAU / 6, rr3 = R * 0.72;
      ctx.beginPath(); ctx.arc(x + Math.cos(a) * rr3, y + Math.sin(a) * rr3, 1.8, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }
  // 集結旗: (x, y) = 旗桿插地點; 插下時從上方 5px 往下一戳(同時由 0.875 倍長到 1 倍, 頂端不超出 y−40)+ 塵土圈
  function drawRallyFlag(ctx, s) {
    s = s || {};
    var x = num(s.x, 0), y = num(s.y, 0);
    var p = prog(s.plantAge, num(s.plantDuration, 0.3));
    ctx.save();
    if (p >= 0) {
      var e = Math.min(1, p / 0.45), q = 1 - (1 - e) * (1 - e);
      var lift = 5 * (1 - q), k = 1 - 0.125 * (1 - q);
      // 塵土: 落地後(p ≥ 0.3)往外擴的扁圈 + 4 顆塵點
      if (p >= 0.3) {
        var dp = (p - 0.3) / 0.7;
        ctx.globalAlpha = 0.7 * (1 - dp); ctx.strokeStyle = '#d9c39a'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.ellipse(x + 1, y - 1.5, 4 + 7 * dp, 1.5 + 2 * dp, 0, 0, TAU); ctx.stroke();
        ctx.fillStyle = '#e6d3ad';
        for (var i = 0; i < 4; i++) {
          var a = PI + (i + 0.5) * PI / 4, d = 4 + 5 * dp;
          ctx.beginPath(); ctx.arc(x + 1 + Math.cos(a) * d * 1.3, y - 2 + Math.sin(a) * d * 0.45, 1.4, 0, TAU); ctx.fill();
        }
        ctx.globalAlpha = 1;
      }
      flagShape(ctx, x, y - lift, k);
    } else {
      flagShape(ctx, x, y, 1);
    }
    ctx.restore();
  }
  function drawCoin(ctx, s) {
    s = s || {};
    var x = num(s.x, 0), y = num(s.y, 0);
    // 落地過程: 往上抬 14 × sin(π × age / dur), 地上留影子在 (x, y)
    var p = prog(s.spawnAge, num(s.spawnDuration, 0.4));
    var lift = p >= 0 ? 14 * Math.sin(PI * p) : 0;
    ctx.save();
    if (lift > 0.5) {
      var k = 1 - lift / 20;
      ctx.fillStyle = 'rgba(0,0,0,' + (0.35 * k) + ')';
      ctx.beginPath(); ctx.ellipse(x, y + 5, 6 * k, 2 * k, 0, 0, TAU); ctx.fill();
    }
    coinGlyph(ctx, x, y - 0.5 - lift, 7);
    ctx.restore();
  }
  // Boss 倒下(1.2 秒, p = 0~1): 0~0.22 X 眼左右晃; 0.22~0.5 往前傾倒、壓扁貼地(落地一圈塵環);
  // 0.5~1 本體淡出, 同時依意象散開: 霜角 = 冰塊碎片往外飛; 魔王 = 紫電火花 + 短電弧。全部在 72×72 內
  function bossCorpse(ctx, type, x, y, p) {
    ctx.save(); ctx.translate(x, y);
    var shake = p < 0.22 ? Math.sin(p * 90) * 0.07 * (1 - p / 0.22) : 0;
    var fall = clamp((p - 0.22) / 0.28, 0, 1), fe = fall * fall;
    var sy = 1 - 0.55 * fe, alpha = p < 0.5 ? 1 : Math.max(0, 1 - (p - 0.5) / 0.5);
    ctx.save();
    ctx.globalAlpha = 0.95 * alpha * alpha;
    ctx.translate(0, 36); ctx.transform(1, 0, -(shake * 0.5 + 0.06 * fe), 1, 0, 0); ctx.scale(1 - 0.08 * fe, sy); ctx.translate(0, -36);
    bossBody(ctx, type, { dead: true, arcs: false, tint: 'rgba(60,50,70,' + (0.25 + 0.35 * fe) + ')' });
    ctx.restore();
    // 落地塵環
    if (fall > 0.6) {
      var rp = clamp((p - 0.43) / 0.35, 0, 1);
      ctx.globalAlpha = 0.6 * (1 - rp);
      ctx.strokeStyle = type === 'bossFrost' ? '#dff6ff' : type === 'bossThunder' ? lighten(C.shock, 0.2) : '#c8b08a';
      ctx.lineWidth = 2.5; ctx.beginPath(); ctx.ellipse(0, 29.5, 14 + 18 * rp, 3 + 2 * rp, 0, 0, TAU); ctx.stroke();
    }
    var q = clamp((p - 0.45) / 0.55, 0, 1);
    if (q > 0) {
      for (var i = 0; i < 8; i++) {
        var a = -PI * 0.95 + i * (PI * 0.9 / 7) + (hash(i, 7, 1) - 0.5) * 0.3;
        var d = 8 + 22 * q * (0.75 + 0.25 * hash(i, 3, 2));
        var px = Math.cos(a) * d, py = 22 + Math.sin(a) * d * 0.9;
        ctx.globalAlpha = 0.9 * (1 - q);
        if (type === 'bossFrost') iceShard(ctx, px, py, a + q * 3, 4.5);
        else {
          ctx.fillStyle = i % 2 ? '#ffffff' : C.shock; ctx.beginPath(); ctx.arc(px, py, 2.4, 0, TAU); ctx.fill();
          if (i % 3 === 0) { ctx.strokeStyle = rgba(C.shock, 0.9); ctx.lineWidth = 1.5; boltPath(ctx, px * 0.4, py * 0.4 + 10, px, py, 2.5, i * 5 + Math.floor(now() * 20)); ctx.stroke(); }
        }
      }
    }
    ctx.restore();
  }
  function drawCorpse(ctx, s) {
    s = s || {};
    // 倒下消散(0.6 秒): 灰掉的鬼往下塌扁、變淡, 原地冒幾團灰紫煙往上散; 不閃爍、不可互動
    // 和我方潰散(藍白魂光往右飛)分開: 這裡是暗色、原地、往上
    var type = enemyType(s.kind), S = ENEMY_SIZE[type], hs = S / 2;
    var x = num(s.x, 0), y = num(s.y, 0);
    var ml = num(s.maxLife, 0.6) || 0.6, life = clamp(num(s.life, ml), 0, ml);
    if (!(life > 0)) return;
    var p = 1 - life / ml;
    if (isBoss(type)) { bossCorpse(ctx, type, x, y, p); return; }
    ctx.save();
    ctx.translate(x, y);
    // 本體: 塌扁(高 1 → 0.45)、往下沉到貼底、淡出
    var sy = 1 - 0.55 * p;
    ctx.save();
    ctx.globalAlpha = 0.9 * (1 - p) * (1 - p);
    ctx.translate(0, hs * (1 - sy));
    ctx.scale(1, sy);
    enemyBody(ctx, type, S, { body: mixHex(ENEMY_COL[type], '#6b5a66', 0.6), dead: true });
    ctx.restore();
    // 煙: 4 團, 從身體中段往上飄, 越飄越大越淡(全部收在框內)
    for (var i = 0; i < 4; i++) {
      var lp = clamp((p - i * 0.08) / 0.7, 0, 1); if (lp <= 0) continue;
      var r = S * (0.1 + 0.1 * lp);
      var px = (i - 1.5) * S * 0.18, py = hs * 0.2 - (hs * 0.75) * lp;
      py = Math.max(-hs + r, py);
      ctx.globalAlpha = 0.55 * Math.sin(lp * PI);
      ctx.fillStyle = '#5c4f60';
      ctx.beginPath(); ctx.arc(px, py, r, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }
  function drawGroundPart(ctx, s) {
    s = s || {};
    var x = num(s.x, 0), y = num(s.y, 0);
    var perm = bool(s.permanent), frozen = bool(s.frozen);
    var life = num(s.life, 10), maxLife = num(s.maxLife, 10) || 10;
    var p = prog(s.spawnAge, num(s.spawnDuration, 0.6));
    ctx.save();
    // frozen(教學期間計時停住): 照一般外觀畫, 不閃爍、剩餘條不轉紅
    if (!perm && !frozen) ctx.globalAlpha = expireAlpha(life);
    var ox = 0, oy = 0;
    if (p >= 0) {
      // 從主堡方向(右上)彈出落地
      var q = 1 - p;
      ox = 22 * q * q; oy = -22 * Math.sin(p * PI) * (1 - p * 0.3);
      // 落地閃光
      var fa = p > 0.55 ? (1 - p) / 0.45 : p / 0.55;
      ctx.save(); ctx.globalAlpha = 0.8 * fa;
      ctx.fillStyle = '#fff4c0';
      ctx.beginPath(); ctx.arc(x, y, 14 + 10 * p, 0, TAU); ctx.fill();
      ctx.restore();
    }
    if (perm) {
      // 購買: 金色光座 + 緩慢脈動(半徑 ≤ 18, 36×36 內), 不閃爍、沒有剩餘條
      var pu = 0.5 + 0.5 * Math.sin(now() * 1.8);
      var g = ctx.createRadialGradient(x, y + 2, 2, x, y + 2, 17);
      g.addColorStop(0, rgba(C.shop, 0.55 + 0.25 * pu)); g.addColorStop(1, rgba(C.shop, 0));
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y + 1, 17, 0, TAU); ctx.fill();
      ctx.strokeStyle = rgba(C.shopZone, 0.7 + 0.3 * pu); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(x, y + 10, 15, 5, 0, 0, TAU); ctx.stroke();
      ctx.strokeStyle = rgba(C.shopZone, 0.35 + 0.35 * pu); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(x, y, 16.5, 0, TAU); ctx.stroke();
    } else {
      // 影 + 白點線圈(地上的東西 = 可撿)
      ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.ellipse(x, y + 11, 11, 3, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.45)'; ctx.lineWidth = 1; ctx.setLineDash([2, 3]);
      ctx.beginPath(); ctx.arc(x, y, 13.5, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
      // 剩餘時間: 框內底部細條(和屍體同一個詞)
      var r = clamp(life / maxLife, 0, 1);
      ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(x - 11, y + 12, 22, 2);
      ctx.fillStyle = life < 3 && !frozen ? '#ff6a5a' : '#d8d0d8'; ctx.fillRect(x - 11, y + 12, 22 * r, 2);
    }
    var bob = p >= 0 ? 0 : Math.sin(now() * (perm ? 1.8 : 3)) * 1;
    itemIcon(ctx, s.item, x + ox, y + oy - 1 + bob, tv(20, MIN_ICON)); // 觸控模式地上魂件圖示 20 → 24
    ctx.restore();
    if (bool(s.targeted)) targetFrame(ctx, x, y, 28, 28);
  }
  // ---------- 「放這裡」標示(第 8 輪, 第 1 關階段 7 / 14) ----------
  // 教學暖黃那一套: 地面 = 暖黃淡填(只改亮度脈動)+ 深墨底 / 暖黃粗虛線(寬 3, 畫在框內);
  // 牌子 72×24 = 暖黃底 + 深墨框 + 深墨粗字「放這裡」; 往下指的三角(寬 16、長 12, 尖端 (x, y−28))。
  // 牌子與三角依 t 上下彈跳 0~−6px(週期 0.8 秒), 地面不動。全部在 x±36、y−70~+24 內。
  var PH_HI = '#ffd25a';
  function drawPlaceHere(ctx, s) {
    s = s || {};
    var kind = s.kind === 'flag' ? 'flag' : 'crossbow';
    var x = num(s.x, 0), y = num(s.y, 0), t = num(s.t, 0);
    var pulse = 0.5 + 0.5 * Math.sin(t * 3.2);
    ctx.save(); ctx.translate(x, y);
    // (1) 地面標示
    var groundPath = kind === 'flag'
      ? function (ins) { ctx.beginPath(); ctx.arc(0, 0, 24 - ins, 0, TAU); }
      : function (ins) { rr(ctx, -24 + ins, -24 + ins, 48 - 2 * ins, 48 - 2 * ins, 4); };
    ctx.fillStyle = 'rgba(255,210,90,' + (0.16 + 0.16 * pulse) + ')'; groundPath(0); ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(42,32,22,0.6)'; groundPath(1.5); ctx.stroke();
    ctx.setLineDash([7, 5]); ctx.strokeStyle = PH_HI; groundPath(1.5); ctx.stroke(); ctx.setLineDash([]);
    if (kind === 'flag') {
      // 插旗點(= 集結點)的中心小記號
      ctx.fillStyle = C.tutorInk; ctx.beginPath(); ctx.arc(0, 0, 4.5, 0, TAU); ctx.fill();
      ctx.fillStyle = PH_HI; ctx.beginPath(); ctx.arc(0, 0, 2.6, 0, TAU); ctx.fill();
    }
    // (2)(3) 牌子 + 往下指的三角, 一起彈跳
    var bob = -3 - 3 * Math.sin(t * TAU / 0.8);
    ctx.translate(0, bob);
    ctx.fillStyle = C.tutorInk;
    ctx.beginPath(); ctx.moveTo(-8, -40); ctx.lineTo(8, -40); ctx.lineTo(0, -28); ctx.closePath(); ctx.fill();
    ctx.fillStyle = PH_HI;
    ctx.beginPath(); ctx.moveTo(-5, -41); ctx.lineTo(5, -41); ctx.lineTo(0, -31.5); ctx.closePath(); ctx.fill();
    var pw = tv(72, 88); // 觸控模式牌子加寬(字級下限 17)
    ctx.fillStyle = C.tutorInk; rr(ctx, -pw / 2, -64, pw, 24, 6); ctx.fill();
    ctx.fillStyle = PH_HI; rr(ctx, -pw / 2 + 2, -62, pw - 4, 20, 4.5); ctx.fill();
    txt(ctx, '放這裡', 0, -51.5, { size: 15, color: C.tutorInk, maxW: pw - 10 });
    ctx.restore();
  }
  function drawPlacePreview(ctx, s) {
    s = s || {};
    var kind = ({ crossbow: 1, pillar: 1, flag: 1 }[s.kind]) ? s.kind : 'crossbow';
    var x = num(s.x, 0), y = num(s.y, 0), ok = bool(s.valid);
    var col = ok ? C.valid : C.invalid;
    ctx.save();
    if (kind === 'flag') {
      // 旗桿插地點 (x, y+16); 判定框 x−4~x+20、y−24~y+16
      ctx.globalAlpha = 0.6;
      flagShape(ctx, x, y + 16, 1, { cloth: ok ? 'rgba(95,224,122,0.85)' : 'rgba(255,74,74,0.85)', dark: col, rim: '#ffffff', pole: col, knob: col, noShadow: true });
      ctx.globalAlpha = 0.9; ctx.strokeStyle = col; ctx.lineWidth = 1.5; ctx.setLineDash([3, 3]);
      ctx.beginPath(); ctx.ellipse(x + 1, y + 14, 4.5, 1.8, 0, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
      if (!ok) {
        ctx.globalAlpha = 1; ctx.strokeStyle = C.invalid; ctx.lineWidth = 3.5; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(x + 1, y - 13); ctx.lineTo(x + 15, y + 1); ctx.moveTo(x + 15, y - 13); ctx.lineTo(x + 1, y + 1); ctx.stroke();
      }
      ctx.restore();
      return;
    }
    if (kind === 'pillar') {
      ctx.strokeStyle = col; ctx.globalAlpha = 0.8; ctx.lineWidth = 2; ctx.setLineDash([8, 6]);
      ctx.beginPath(); ctx.arc(x, y, 149, 0, TAU); ctx.stroke();
      ctx.setLineDash([]); ctx.globalAlpha = 1;
    }
    var S = 48;
    ctx.translate(x, y);
    ctx.fillStyle = ok ? 'rgba(95,224,122,0.18)' : 'rgba(255,74,74,0.2)';
    rr(ctx, -S / 2, -S / 2, S, S, 4); ctx.fill();
    ctx.strokeStyle = col; ctx.lineWidth = 2; rr(ctx, -S / 2 + 1, -S / 2 + 1, S - 2, S - 2, 4); ctx.stroke();
    ctx.globalAlpha = 0.5;
    if (kind === 'crossbow') crossbowBody(ctx, 0, false);
    else pillarBody(ctx, null);
    ctx.globalAlpha = 1;
    if (!ok) {
      ctx.strokeStyle = C.invalid; ctx.lineWidth = 4; ctx.lineCap = 'round';
      var k = S * 0.3;
      ctx.beginPath(); ctx.moveTo(-k, -k); ctx.lineTo(k, k); ctx.moveTo(k, -k); ctx.lineTo(-k, k); ctx.stroke();
    }
    ctx.restore();
  }

  // ---------- 單位 ----------
  function drawCastle(ctx, s) {
    s = s || {};
    var x = num(s.x, CASTLE_X), y = num(s.y, CASTLE_Y);
    ctx.save();
    var pa = prog(s.attackAge, num(s.attackDuration, 0.15));
    var dy = pa >= 0 ? -3 * Math.sin(pa * PI) : 0;
    ctx.translate(x, y + dy);
    var ph = prog(s.hitAge, num(s.hitDuration, 0.3));
    // 牆
    ctx.fillStyle = C.stoneDark; rr(ctx, -48, -34, 96, 86, 6); ctx.fill();
    ctx.fillStyle = C.stone; rr(ctx, -45, -31, 90, 80, 5); ctx.fill();
    // 塔
    var tower = function (tx) {
      ctx.fillStyle = C.stoneDark; ctx.fillRect(tx - 13, -50, 26, 70);
      ctx.fillStyle = '#a3a9b8'; ctx.fillRect(tx - 11, -48, 22, 66);
      ctx.fillStyle = C.stoneDark;
      for (var i = 0; i < 3; i++) ctx.fillRect(tx - 13 + i * 9.5, -56, 7, 7);
    };
    tower(-38); tower(38);
    // 旗
    ctx.strokeStyle = '#3a3a3a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, -31); ctx.lineTo(0, -54); ctx.stroke();
    ctx.fillStyle = C.ally; ctx.beginPath(); ctx.moveTo(1, -54); ctx.lineTo(18, -49); ctx.lineTo(1, -44); ctx.closePath(); ctx.fill();
    // 牆面石紋
    ctx.strokeStyle = 'rgba(0,0,0,0.15)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(-25, -14); ctx.lineTo(25, -14); ctx.moveTo(-25, 23); ctx.lineTo(25, 23); ctx.stroke();
    // 正面藍色軍旗(本輪上移, 讓出下半部的血量牌)
    ctx.fillStyle = C.allyDark; rr(ctx, -11, -8, 22, 28, 3); ctx.fill();
    ctx.fillStyle = C.ally; ctx.beginPath(); ctx.moveTo(-9, -6); ctx.lineTo(9, -6); ctx.lineTo(9, 16); ctx.lineTo(0, 11); ctx.lineTo(-9, 16); ctx.closePath(); ctx.fill();
    ctx.fillStyle = C.allyRim; ctx.beginPath(); ctx.moveTo(0, -2); ctx.lineTo(4.5, 2.5); ctx.lineTo(0, 7); ctx.lineTo(-4.5, 2.5); ctx.closePath(); ctx.fill();
    // 左側城門: 兵從這裡走出 (844,336)(第 13 輪)
    var door = function () { ctx.beginPath(); ctx.moveTo(-55, 20); ctx.lineTo(-55, -4); ctx.arc(-46.5, -4, 8.5, PI, 0); ctx.lineTo(-38, 20); ctx.closePath(); };
    ctx.fillStyle = C.stoneDark; door(); ctx.fill();
    ctx.save(); door(); ctx.clip();
    ctx.fillStyle = '#5a3a1e'; ctx.fillRect(-54, -12, 14, 32);
    ctx.strokeStyle = '#3a2412'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(-50.5, -12); ctx.lineTo(-50.5, 20); ctx.moveTo(-43.5, -12); ctx.lineTo(-43.5, 20); ctx.moveTo(-54, 6); ctx.lineTo(-40, 6); ctx.stroke();
    ctx.restore();
    ctx.strokeStyle = '#2a2d36'; ctx.lineWidth = 1.5; door(); ctx.stroke();
    // 血量牌: 中心 (0, 38) = 畫面 (900,374), 100×20, 常駐
    var mhp = Math.max(1, Math.floor(num(s.maxHp, 20))), hp = clamp(Math.ceil(num(s.hp, mhp)), 0, mhp);
    var low = hp <= 5;
    var lb = low ? 0.5 + 0.5 * Math.sin(now() * TAU) : 0; // 低血量: 約 1 秒一次的顏色閃爍
    ctx.fillStyle = low ? 'rgba(' + Math.round(90 + 60 * lb) + ',14,18,0.88)' : 'rgba(12,16,26,0.8)';
    // 觸控模式: 牌子加寬到 128(x −64~64), 數字字級下限 17; 愛心左移、生命條縮短讓出數字位置
    var T = touchOn(), pl = T ? -64 : -50, pw = T ? 128 : 100, hx = T ? -52 : -38, bx = T ? -42 : -28, bw = T ? 44 : 48;
    rr(ctx, pl, 28, pw, 20, 6); ctx.fill();
    ctx.strokeStyle = low ? 'rgba(255,' + Math.round(90 + 60 * lb) + ',' + Math.round(90 + 60 * lb) + ',0.95)' : 'rgba(255,255,255,0.3)'; ctx.lineWidth = 1;
    rr(ctx, pl + 0.5, 28.5, pw - 1, 19, 5.5); ctx.stroke();
    // 小愛心 14×14 中心 (−38, 38)
    ctx.fillStyle = '#ff5a6a';
    ctx.beginPath(); ctx.moveTo(hx, 44); ctx.bezierCurveTo(hx - 7.5, 39, hx - 7, 31.5, hx, 34.5); ctx.bezierCurveTo(hx + 7, 31.5, hx + 7.5, 39, hx, 44); ctx.fill();
    // 生命條 x −28~20(畫面 872~920), 高 8
    ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(bx, 34, bw, 8);
    var hr = hp / mhp;
    ctx.fillStyle = low ? (lb > 0.5 ? '#ff6a5a' : '#d83a3a') : hr > 0.5 ? C.hp : '#f0c040';
    ctx.fillRect(bx, 34, bw * hr, 8);
    txt(ctx, hp + '/' + mhp, T ? 60 : 48, 38.5, { size: 12, align: 'right', color: low ? '#ffd0c8' : '#ffffff', maxW: T ? 52 : 25 });
    if (ph >= 0) {
      ctx.globalAlpha = 0.55 * (1 - ph); ctx.fillStyle = '#ff3a3a';
      ctx.fillRect(-56, -56, 107, 108);
      ctx.globalAlpha = 1;
    }
    ctx.restore();
    if (bool(s.targeted)) targetFrame(ctx, x, y, 112, 112);
  }
  // 重生中: 132×36 半透明底板; 左圓盤(中心 x−48, 半徑 15 外緣, 環寬 4)+「重生中」+「×N」
  function drawRespawnQueue(ctx, s) {
    s = s || {};
    var x = num(s.x, 780), y = num(s.y, 282);
    var kind = s.kind === 'golem' ? 'golem' : 'soldier';
    var p = clamp(num(s.progress, 0), 0, 1);
    var n = Math.max(1, Math.floor(num(s.count, 1)));
    ctx.save();
    ctx.fillStyle = 'rgba(12,16,26,0.72)'; rr(ctx, x - 66, y - 18, 132, 36, 9); ctx.fill();
    ctx.strokeStyle = rgba(C.soulLight, 0.45); ctx.lineWidth = 1; rr(ctx, x - 65.5, y - 17.5, 131, 35, 8.5); ctx.stroke();
    var dx = x - 48;
    ctx.fillStyle = '#0b0e16'; ctx.beginPath(); ctx.arc(dx, y, 15, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(207,224,255,0.18)'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(dx, y, 13, 0, TAU); ctx.stroke();
    if (p > 0) {
      ctx.strokeStyle = C.soulLight; ctx.lineCap = 'butt';
      ctx.beginPath(); ctx.arc(dx, y, 13, -PI / 2, -PI / 2 + TAU * p); ctx.stroke();
    }
    // 排頭小圖示(半徑 11 內)
    ctx.save(); ctx.translate(dx, y + 0.5);
    if (kind === 'golem') { ctx.scale(0.36, 0.36); golemBody(ctx, 'ally'); }
    else { ctx.scale(0.62, 0.62); soldierBody(ctx, C.ally, C.allyDark, C.allyRim); }
    ctx.restore();
    txt(ctx, '重生中', x - 28, y + 0.5, { size: 13, align: 'left', color: C.soulLight });
    txt(ctx, '×' + n, x + 60, y + 0.5, { size: 15, align: 'right', color: '#ffffff', maxW: 40 });
    ctx.restore();
  }
  function drawCrossbow(ctx, s) {
    s = s || {};
    var x = num(s.x, 0), y = num(s.y, 0);
    var L = lungeOf(s);
    var pa = L ? -1 : prog(s.attackAge, num(s.attackDuration, 0.15));
    var rooted = bool(s.rooted);
    var charging = !rooted && bool(s.charging), moving = !rooted && (bool(s.moving) || charging);
    ctx.save(); ctx.translate(x, y);
    if (charging) speedLines(ctx, 24);
    lungeGhost(ctx, L, function () { crossbowBody(ctx, 0, false); });
    ctx.save();
    applyLunge(ctx, L);
    ctx.save();
    if (charging) chargePose(ctx);
    crossbowBody(ctx, pa >= 0 ? 3 * Math.sin(pa * PI) : 0, moving);
    ctx.restore();
    if (rooted) rootedMark(ctx, 48, 48);
    if (bool(s.resonating)) inGlow(ctx, 48, 48, 7);
    ctx.restore();
    ctx.restore();
    if (bool(s.targeted)) targetFrame(ctx, x, y, 48, 48);
  }
  function drawPillar(ctx, s) {
    s = s || {};
    var x = num(s.x, 0), y = num(s.y, 0);
    var rooted = bool(s.rooted);
    var charging = !rooted && bool(s.charging), moving = !rooted && (bool(s.moving) || charging);
    ctx.save(); ctx.translate(x, y);
    ctx.save();
    if (charging) { speedLines(ctx, 18); chargePose(ctx); }
    pillarBody(ctx, firstKind(s.kinds), moving);
    ctx.restore();
    if (rooted) rootedMark(ctx, 36, 36);
    ctx.restore();
    if (bool(s.targeted)) targetFrame(ctx, x, y, 36, 36);
  }
  // 歸隊中的魂光拖尾: 身後(右, 主堡方向)錐形淡光, 至多畫到框外 12px
  function soulTrail(ctx, hs) {
    var g = ctx.createLinearGradient(-hs * 0.2, 0, hs + 12, 0);
    g.addColorStop(0, 'rgba(207,224,255,0.55)'); g.addColorStop(1, 'rgba(207,224,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(-hs * 0.2, -hs * 0.65);
    ctx.quadraticCurveTo(hs, -hs * 0.45, hs + 12, 0);
    ctx.quadraticCurveTo(hs, hs * 0.45, -hs * 0.2, hs * 0.65); ctx.closePath(); ctx.fill();
    var t = now();
    ctx.fillStyle = C.soulLight;
    for (var i = 0; i < 3; i++) {
      var f = ((t * 1.6 + i / 3) % 1);
      ctx.globalAlpha = 0.8 * (1 - f);
      ctx.beginPath(); ctx.arc(hs * 0.4 + (hs * 0.6 + 8) * f, (i - 1) * hs * 0.3 * (1 - f), 1.8, 0, TAU); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  function mobile(ctx, s, S, bodyFn) {
    var x = num(s.x, 0), y = num(s.y, 0), hs = S / 2;
    var returning = bool(s.returning);
    ctx.save(); ctx.translate(x, y);
    if (returning) {
      soulTrail(ctx, hs);
      var bobR = bool(s.moving) ? Math.abs(Math.sin(now() * 8)) * -1.5 : 0;
      ctx.save(); ctx.translate(0, bobR);
      ctx.globalAlpha = 0.42; bodyFn(false);
      ctx.globalAlpha = 0.9; ctx.strokeStyle = C.soulLight; ctx.lineWidth = 1.5; ctx.setLineDash([3, 3]);
      rr(ctx, -hs + 1.5, -hs + 2.5, S - 3, S - 4, 6); ctx.stroke(); ctx.setLineDash([]);
      ctx.restore();
    } else {
      var L = lungeOf(s);
      var pa = L ? -1 : prog(s.attackAge, num(s.attackDuration, 0.15));
      var ax = pa >= 0 ? -3 * Math.sin(pa * PI) : 0;
      var rooted = bool(s.rooted);
      var charging = !rooted && bool(s.charging);
      if (charging) speedLines(ctx, hs);
      var bob = bool(s.moving) && !charging && !rooted && !L ? Math.abs(Math.sin(now() * 8)) * -1.5 : 0;
      lungeGhost(ctx, L, function () { bodyFn(false); });
      ctx.save();
      applyLunge(ctx, L);
      ctx.save(); ctx.translate(ax, bob);
      if (charging) chargePose(ctx);
      bodyFn(false);
      var ph = prog(s.hitAge, num(s.hitDuration, 0.2));
      if (ph >= 0) { ctx.globalAlpha = 0.7 * (1 - ph); ctx.fillStyle = '#ffffff'; rr(ctx, -hs + 3, -hs + 3, S - 6, S - 6, 6); ctx.fill(); ctx.globalAlpha = 1; }
      ctx.restore();
      if (rooted) rootedMark(ctx, S, S);
      if (bool(s.healing)) healGlow(ctx, S, S, false);
      if (bool(s.resonating)) inGlow(ctx, S, S, 6);
      ctx.restore();
    }
    ctx.restore();
    var hp = num(s.hp, 1), mh = num(s.maxHp, 1);
    if (!returning && hp < mh) { ctx.save(); hpBar(ctx, x, y - hs - 6, S, hp, mh); ctx.restore(); }
    if (bool(s.targeted)) targetFrame(ctx, x, y, S, S);
  }
  function drawSoldier(ctx, s) {
    s = s || {};
    mobile(ctx, s, 32, function () { soldierBody(ctx, C.ally, C.allyDark, C.allyRim); });
  }
  function drawGolem(ctx, s) {
    s = s || {};
    var team = s.team === 'ally' ? 'ally' : 'neutral';
    var src = s;
    if (team === 'neutral') {
      s = { x: s.x, y: s.y, hp: 1, maxHp: 1, hitAge: s.hitAge, hitDuration: s.hitDuration, attackAge: s.attackAge, attackDuration: s.attackDuration, attackKind: s.attackKind, attackAngle: s.attackAngle, moving: s.moving, charging: false, rooted: false, healing: false, resonating: false, returning: false, targeted: src.targeted };
    }
    mobile(ctx, s, 56, function () { golemBody(ctx, team); });
    if (team === 'neutral') {
      // 「中立」小牌: 中心 (x, y+40), 40×18; 深灰底 + 灰白字(不用我方藍 / 敵方紅)
      var x = num(s.x, 0), y = num(s.y, 0);
      ctx.save();
      ctx.strokeStyle = '#8d8b84'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x - 10, y + 24); ctx.lineTo(x - 10, y + 31); ctx.moveTo(x + 10, y + 24); ctx.lineTo(x + 10, y + 31); ctx.stroke();
      var tw2 = tv(20, 24), th = tv(18, 22); // 觸控模式小牌 48×22(字級下限 17)
      ctx.fillStyle = C.neutralTag; rr(ctx, x - tw2, y + 31, tw2 * 2, th, 4); ctx.fill();
      ctx.strokeStyle = '#9a978d'; ctx.lineWidth = 1; rr(ctx, x - tw2 + 0.5, y + 31.5, tw2 * 2 - 1, th - 1, 3.5); ctx.stroke();
      txt(ctx, '中立', x, y + 31 + th / 2 + 0.5, { size: 12, color: C.neutralInk, maxW: tw2 * 2 - 6 });
      ctx.restore();
    }
  }
  // 潰散: 本體化成魂光往右(主堡方向)飛散; 和敵人死亡(留下灰色屍體)分開
  var BREAK_SEEDS = [[-0.30, -0.10, 0.00], [0.25, 0.15, 0.08], [-0.05, 0.35, 0.04], [0.10, -0.38, 0.12], [-0.40, 0.25, 0.02], [0.35, -0.20, 0.10]];
  function drawUnitBreak(ctx, s) {
    s = s || {};
    var kind = s.kind === 'golem' ? 'golem' : 'soldier';
    var p = prog(s.age, num(s.duration, 0.5)); if (p < 0) return;
    var H = kind === 'golem' ? 60 : 48, S = kind === 'golem' ? 56 : 32;
    var x = num(s.x, 0), y = num(s.y, 0);
    ctx.save(); ctx.translate(x, y);
    if (p < 0.45) {
      var q = p / 0.45;
      ctx.save(); ctx.globalAlpha = 0.7 * (1 - q); ctx.scale(1 - 0.25 * q, 1 - 0.25 * q);
      if (kind === 'golem') golemBody(ctx, 'ally'); else soldierBody(ctx, C.ally, C.allyDark, C.allyRim);
      ctx.restore();
      var gr = S * 0.5 * (0.6 + 0.4 * q);
      var g = ctx.createRadialGradient(0, 0, 0, 0, 0, gr);
      g.addColorStop(0, 'rgba(255,255,255,0.9)'); g.addColorStop(1, 'rgba(207,224,255,0)');
      ctx.globalAlpha = 1 - q; ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, gr, 0, TAU); ctx.fill();
      ctx.globalAlpha = 1;
    }
    var headR = kind === 'golem' ? 4 : 3;
    for (var i = 0; i < BREAK_SEEDS.length; i++) {
      var sd = BREAK_SEEDS[i];
      var lp = clamp((p - sd[2]) / (1 - sd[2]), 0, 1); if (lp <= 0) continue;
      var e = 1 - (1 - lp) * (1 - lp);
      var sx = sd[0] * S, sy = sd[1] * S;
      var hx = sx + (H - headR - 2 - sx) * e, hy = sy * (1 - 0.5 * e) - 8 * e;
      var tail = (kind === 'golem' ? 22 : 16) * Math.min(1, lp * 3);
      var tx = Math.max(-H + 1, hx - tail);
      var a = lp > 0.7 ? (1 - lp) / 0.3 : 1;
      ctx.globalAlpha = a;
      var lg = ctx.createLinearGradient(tx, hy, hx, hy);
      lg.addColorStop(0, 'rgba(207,224,255,0)'); lg.addColorStop(1, 'rgba(207,224,255,0.9)');
      ctx.strokeStyle = lg; ctx.lineWidth = headR * 1.4; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(tx, hy + 3 * e); ctx.lineTo(hx, hy); ctx.stroke();
      ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(hx, hy, headR * (1 - 0.3 * lp), 0, TAU); ctx.fill();
    }
    ctx.restore();
  }
  function drawEnemy(ctx, s) {
    s = s || {};
    var type = enemyType(s.type), S = ENEMY_SIZE[type], hs = S / 2;
    var x = num(s.x, 0), y = num(s.y, 0);
    ctx.save(); ctx.translate(x, y);
    var L = lungeOf(s);
    var pa = L ? -1 : prog(s.attackAge, num(s.attackDuration, 0.15));
    var ax = pa >= 0 ? 3 * Math.sin(pa * PI) : 0;
    var moving = s.moving !== false;
    var bob = moving && !L ? Math.sin(now() * 6 + x * 0.05) * 1.2 : 0;
    var ph = prog(s.hitAge, num(s.hitDuration, 0.2));
    var tint = null;
    if (bool(s.slowed)) tint = 'rgba(150,220,255,0.5)';
    if (isBoss(type)) {
      // Boss: 同一套撲擊 / 受擊白閃 / 減速冰藍 / 治癒 / 暈眩星 / 呆站問號, 位置照 72×72 放大; 不畫身上小血條(血量在 drawBossBar)
      lungeGhost(ctx, L, function () { bossBody(ctx, type, { arcs: false }); });
      // 第 8 輪: Boss 走路只往上晃(腳底已貼齊框底 +36, 往下晃會超框 0.7px)
      ctx.save(); applyLunge(ctx, L); ctx.translate(ax, -Math.abs(bob) * 0.6);
      bossBody(ctx, type, { tint: tint });
      ctx.save();
      if (ph >= 0) { ctx.globalAlpha = 0.75 * (1 - ph); ctx.fillStyle = '#ffffff'; bossSil(ctx, 57); ctx.fill(); ctx.globalAlpha = 1; }
      if (bool(s.slowed)) { ctx.strokeStyle = 'rgba(220,245,255,0.9)'; ctx.lineWidth = 2; bossSil(ctx, 57); ctx.stroke(); }
      ctx.restore();
      if (bool(s.healing)) healGlow(ctx, S, S, true);
      ctx.restore();
      var pstB = prog(s.stunAge, num(s.stunDuration, 1.0));
      if (pstB >= 0) {
        var stB = now() * 6;
        for (var sib = 0; sib < 4; sib++) {
          var saB = stB + sib * TAU / 4, sxB = Math.cos(saB) * 24, syB = -26 + Math.sin(saB) * 4;
          ctx.fillStyle = '#3a2a00'; starPath(ctx, sxB, syB, 6, 2.7); ctx.fill();
          ctx.fillStyle = C.stun; starPath(ctx, sxB, syB, 4.6, 2); ctx.fill();
        }
      } else if (!moving) txt(ctx, '?', 0, -24, { size: 22, color: '#ffe14a', stroke: '#1a0a10', sw: 4 });
      ctx.restore();
      if (bool(s.targeted)) targetFrame(ctx, x, y, S, S);
      return;
    }
    lungeGhost(ctx, L, function () { if (type === 'drummer') leanPose(ctx); enemyBody(ctx, type, S, { noLean: true, swift: type === 'imp' && bool(s.swift) }); });
    ctx.save(); applyLunge(ctx, L); ctx.translate(ax, bob);
    if (type === 'drummer') leanPose(ctx); // 奔牛怪前傾: 本體與受擊 / 減速 / 治癒疊層同一個姿勢
    var swift = type === 'imp' && bool(s.swift);
    if (swift && moving) {
      // 疾行怪: 腳邊往後(左)兩道短速度線 = 「跑得快」(畫在 32×32 內)
      var sl = (now() * 6) % 1;
      ctx.save(); ctx.strokeStyle = 'rgba(255,244,246,' + (0.45 + 0.35 * sl) + ')'; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-15.5, 6); ctx.lineTo(-11.5 - 2 * sl, 6); ctx.moveTo(-15.5, 11); ctx.lineTo(-12.5 - 2 * sl, 11); ctx.stroke();
      ctx.restore();
    }
    enemyBody(ctx, type, S, { tint: tint, noLean: true, swift: swift });
    if (swift) { ctx.save(); ctx.scale(0.84, 1); } // 受擊 / 減速疊層跟著瘦身形
    if (ph >= 0) { ctx.globalAlpha = 0.8 * (1 - ph); ctx.fillStyle = '#ffffff'; ghostPath(ctx, S - 4, S - 4); ctx.fill(); ctx.globalAlpha = 1; }
    if (bool(s.slowed)) {
      ctx.strokeStyle = 'rgba(220,245,255,0.9)'; ctx.lineWidth = 1.5; ghostPath(ctx, S - 4, S - 4); ctx.stroke();
    }
    if (swift) ctx.restore();
    if (bool(s.healing)) healGlow(ctx, S, S, true);
    ctx.restore();
    var pst = prog(s.stunAge, num(s.stunDuration, 1.0));
    if (pst >= 0) {
      // 暈眩: 頭頂 3 顆繞圈的星星(框內上半部), 優先於呆站問號
      var st = now() * 7;
      for (var si = 0; si < 3; si++) {
        var sa = st + si * TAU / 3, sx = Math.cos(sa) * (hs - 7.5), sy = -hs + 7.5 + Math.sin(sa) * 2.5;
        ctx.fillStyle = '#3a2a00'; starPath(ctx, sx, sy, 4.2, 1.9); ctx.fill();
        ctx.fillStyle = C.stun; starPath(ctx, sx, sy, 3.2, 1.4); ctx.fill();
      }
    } else if (!moving) txt(ctx, '?', 0, -hs + 9, { size: 14, color: '#ffe14a', stroke: '#1a0a10', sw: 3 });
    ctx.restore();
    var hp = num(s.hp, 1), mh = num(s.maxHp, 1);
    if (hp < mh) { ctx.save(); hpBar(ctx, x, y - hs - 6, S, hp, mh); ctx.restore(); }
    if (bool(s.targeted)) targetFrame(ctx, x, y, S, S);
  }
  function drawPlayer(ctx, s) {
    s = s || {};
    var x = num(s.x, 0), y = num(s.y, 0);
    ctx.save();
    var stealing = bool(s.stealing), sp = clamp(num(s.stealProgress, 0), 0, 1);
    if (stealing) {
      ctx.strokeStyle = 'rgba(0,0,0,0.55)'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(x, y, 22, 0, TAU); ctx.stroke();
      ctx.strokeStyle = C.gold; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(x, y, 22, -PI / 2, -PI / 2 + TAU * sp); ctx.stroke();
    }
    ctx.translate(x, y);
    // 共鳴出手: 往右前推 3px(框外 ≤ 4px); 近戰(attackKind "melee")改為朝 attackAngle 撲 10px
    var L = lungeOf(s);
    var pa = L ? -1 : prog(s.attackAge, num(s.attackDuration, 0.15));
    var ax = pa >= 0 ? 3 * Math.sin(pa * PI) : 0;
    var bob = bool(s.moving) && !L ? -Math.abs(Math.sin(now() * 10)) * 1.5 : 0;
    lungeGhost(ctx, L, function () { playerBody(ctx); });
    ctx.save(); applyLunge(ctx, L); ctx.translate(ax, bob);
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(0, 13, 10, 2.5, 0, 0, TAU); ctx.fill();
    playerBody(ctx);
    if (pa >= 0 || L) {
      // 出手閃: 身體外緣一圈白光(長在本體上)
      ctx.globalAlpha = 0.8 * (L ? L.f : Math.sin(pa * PI)); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(0, 1, 13.5, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1;
    }
    ctx.restore();
    if (bool(s.resonating)) {
      // 共鳴微光(和箭塔 / 兵同一個淡紫), 圓形, 框內
      var t = 0.6 + 0.4 * Math.sin(now() * 5);
      ctx.save();
      ctx.globalAlpha = 0.85 * t; ctx.strokeStyle = C.resonance; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(0, 0, 14.5, 0, TAU); ctx.stroke();
      ctx.globalAlpha = 0.16 * t; ctx.fillStyle = C.resonance;
      ctx.beginPath(); ctx.arc(0, 0, 14.5, 0, TAU); ctx.fill();
      ctx.restore();
    }
    if (bool(s.holdingFlag)) {
      // 舉著旗幟: 中心 (x+28, y−6) 的 22×34 內; 旗桿頂到 y−23
      flagShape(ctx, 21.2, 11, 0.85, { noShadow: true });
      ctx.fillStyle = C.player; ctx.strokeStyle = C.playerRim; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.arc(21.2, 3, 2.8, 0, TAU); ctx.fill(); ctx.stroke();
    } else {
      // 手上物品: 捧在右側, 圖示中心 (x+28, y), 22×22
      var hi = s.handItem;
      if (typeof hi === 'string' && hi) {
        // 觸控模式: 手上魂件圖示 18 → 24, 底框 22 → 28, 兩隻手跟著外移
        var T = touchOn(), hb = T ? 14 : 11, hd = T ? 10 : 7;
        ctx.fillStyle = 'rgba(255,241,201,0.25)'; rr(ctx, 28 - hb, -hb, hb * 2, hb * 2, 6); ctx.fill();
        itemIcon(ctx, hi, 28, -1, T ? MIN_ICON : 18);
        ctx.fillStyle = C.player; ctx.strokeStyle = C.playerRim; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.arc(28 - hd, hb - 3, 2.8, 0, TAU); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.arc(28 + hd, hb - 3, 2.8, 0, TAU); ctx.fill(); ctx.stroke();
      }
    }
    ctx.restore();
  }

  // ---------- 魂件槽列 ----------
  function slotCell(ctx, cx, cy, size, item) {
    var h = size / 2;
    ctx.fillStyle = 'rgba(16,20,30,0.88)'; rr(ctx, cx - h, cy - h, size, size, 3); ctx.fill();
    if (typeof item === 'string' && item) itemIcon(ctx, item, cx, cy, size - 2);
    else {
      ctx.strokeStyle = 'rgba(220,225,235,0.5)'; ctx.lineWidth = 1; ctx.setLineDash([2, 2]);
      rr(ctx, cx - h + 1.5, cy - h + 1.5, size - 3, size - 3, 2); ctx.stroke(); ctx.setLineDash([]);
    }
  }
  // 虛魂件格 14×14: 半透明 + 虛線框; 組合魂件斜分兩色 + 金色虛線框
  function virtCell(ctx, cx, cy, kind, used) {
    var cols = kindCols(kind), combo = isCombo(kind);
    ctx.save();
    ctx.globalAlpha = used ? 0.9 : 0.45;
    ctx.fillStyle = 'rgba(16,20,30,0.6)'; rr(ctx, cx - 7, cy - 7, 14, 14, 3); ctx.fill();
    if (cols.length) {
      ctx.save(); rr(ctx, cx - 7, cy - 7, 14, 14, 3); ctx.clip();
      ctx.globalAlpha = used ? 0.55 : 0.22; ctx.fillStyle = cols[0]; ctx.fillRect(cx - 7, cy - 7, 14, 14);
      if (combo) { ctx.fillStyle = cols[1]; ctx.beginPath(); ctx.moveTo(cx + 7, cy - 7); ctx.lineTo(cx + 7, cy + 7); ctx.lineTo(cx - 7, cy + 7); ctx.closePath(); ctx.fill(); }
      ctx.restore();
      ctx.globalAlpha = used ? 1 : 0.55;
      ctx.save(); ctx.translate(cx, cy); glyph(ctx, kind, 5, used ? '#ffffff' : cols[0]); ctx.restore();
    }
    ctx.globalAlpha = used ? 1 : 0.6;
    ctx.strokeStyle = combo ? C.combo : used ? '#ffffff' : (cols[0] || '#ffffff'); ctx.lineWidth = 1; ctx.setLineDash([2, 1.5]);
    rr(ctx, cx - 6.5, cy - 6.5, 13, 13, 3); ctx.stroke(); ctx.setLineDash([]);
    ctx.restore();
  }
  function drawSoulSlots(ctx, s) {
    s = s || {};
    var x = num(s.x, 0), y = num(s.y, 0);
    var slots = arr(s.slots).slice(0, 4), L = slots.length;
    var virt = arr(s.virtual);
    // 觸控模式: 魂件格 18 → 24(間距 20 → 26), 虛魂件格 14 → 24(整格放大 24/14, 間距 16 → 26); 格心 x 與 game.js 的 slotCenterX 一致
    var T = touchOn(), hs = T ? 13 : 10, cs = T ? 24 : 18, vk = T ? 24 / 14 : 1, vs = T ? 26 : 16, vh = 7 * vk;
    ctx.save();
    if (L > 0) {
      ctx.fillStyle = 'rgba(0,0,0,0.35)'; rr(ctx, x - L * hs, y - hs, L * hs * 2, hs * 2, 4); ctx.fill();
      for (var i = 0; i < L; i++) slotCell(ctx, x - L * hs + hs + hs * 2 * i, y, cs, slots[i]);
    }
    if (virt.length) {
      var sx = x + L * hs + 6;
      var show = virt.length <= 3 ? virt.length : 2;
      for (var j = 0; j < show; j++) {
        var v = virt[j] || {};
        if (!T) { virtCell(ctx, sx + 7 + 16 * j, y, isResonant(v.kind) ? v.kind : null, bool(v.used)); continue; }
        ctx.save(); ctx.translate(sx + vh + vs * j, y); ctx.scale(vk, vk);
        virtCell(ctx, 0, 0, isResonant(v.kind) ? v.kind : null, bool(v.used));
        ctx.restore();
      }
      if (virt.length > 3 && !T) {
        var cx3 = sx + 7 + 32;
        ctx.globalAlpha = 0.85;
        ctx.fillStyle = 'rgba(16,20,30,0.7)'; rr(ctx, cx3 - 7, y - 7, 14, 14, 3); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 1; ctx.setLineDash([2, 1.5]);
        rr(ctx, cx3 - 6.5, y - 6.5, 13, 13, 3); ctx.stroke(); ctx.setLineDash([]);
        txt(ctx, '+' + (virt.length - 2), cx3, y + 0.5, { size: 9, color: '#ffffff', maxW: 13 });
      } else if (virt.length > 3) {
        var tx3 = sx + vh + vs * 2;
        ctx.save(); ctx.translate(tx3, y); ctx.scale(vk, vk); FZK = vk;
        ctx.globalAlpha = 0.85;
        ctx.fillStyle = 'rgba(16,20,30,0.7)'; rr(ctx, -7, -7, 14, 14, 3); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 1; ctx.setLineDash([2, 1.5]);
        rr(ctx, -6.5, -6.5, 13, 13, 3); ctx.stroke(); ctx.setLineDash([]);
        txt(ctx, '+' + (virt.length - 2), 0, 0.5, { size: 9, color: '#ffffff', maxW: 13 });
        FZK = 1; ctx.restore();
      }
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }

  // ---------- 特效 ----------
  function drawProjectile(ctx, s) {
    s = s || {};
    var x = num(s.x, 0), y = num(s.y, 0), a = num(s.angle, 0);
    var enemy = s.owner === 'enemy', ice = s.kind === 'ice';
    ctx.save(); ctx.translate(x, y);
    if (enemy) {
      ctx.fillStyle = 'rgba(255,77,122,0.35)'; ctx.beginPath(); ctx.arc(0, 0, 5, 0, TAU); ctx.fill();
      ctx.fillStyle = '#5a0a24'; ctx.beginPath(); ctx.arc(0, 0, 3.8, 0, TAU); ctx.fill();
      ctx.fillStyle = ice ? C.frost : C.enemyShot; ctx.beginPath(); ctx.arc(0, 0, 2.2, 0, TAU); ctx.fill();
    } else {
      ctx.rotate(a);
      ctx.lineCap = 'round';
      ctx.strokeStyle = 'rgba(20,20,30,0.7)'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(-3, 0); ctx.lineTo(3, 0); ctx.stroke();
      ctx.strokeStyle = ice ? C.frost : C.allyShot; ctx.lineWidth = 2.2;
      ctx.beginPath(); ctx.moveTo(-3, 0); ctx.lineTo(3, 0); ctx.stroke();
      ctx.fillStyle = ice ? '#ffffff' : C.ranged;
      ctx.beginPath(); ctx.moveTo(5, 0); ctx.lineTo(1, -3.2); ctx.lineTo(1, 3.2); ctx.closePath(); ctx.fill();
      if (ice) {
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(-3, -3); ctx.lineTo(-1, 3); ctx.moveTo(-1, -3); ctx.lineTo(-3, 3); ctx.stroke();
      }
    }
    ctx.restore();
  }
  // 穿透箭光束: 全寬 28 = 判定寬; frost = 冰藍外層 + 淡藍芯 + 沿線冰屑
  function drawPierceBeam(ctx, s) {
    s = s || {};
    var p = prog(s.age, num(s.duration, 0.15)); if (p < 0) return;
    var x1 = num(s.x1, 0), y1 = num(s.y1, 0), x2 = num(s.x2, x1), y2 = num(s.y2, y1);
    var frost = bool(s.frost);
    ctx.save(); ctx.lineCap = 'butt';
    ctx.globalAlpha = (frost ? 0.42 : 0.35) * (1 - p); ctx.strokeStyle = frost ? C.frost : C.ranged; ctx.lineWidth = 28;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    ctx.globalAlpha = 0.9 * (1 - p); ctx.strokeStyle = frost ? '#d8f4ff' : '#fff6c8'; ctx.lineWidth = 8 * (1 - p * 0.5);
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    if (frost) {
      var L = Math.hypot(x2 - x1, y2 - y1);
      if (L > 1) {
        var ux = (x2 - x1) / L, uy = (y2 - y1) / L, ang = Math.atan2(uy, ux);
        ctx.globalAlpha = 1 - p;
        for (var d = 14, k = 0; d < L - 6; d += 22, k++) {
          var o = (k % 2 ? 1 : -1) * (6 + 3 * p);
          iceShard(ctx, x1 + ux * d - uy * o, y1 + uy * d + ux * o, ang + (k % 2 ? 0.6 : -0.6), 4.5);
        }
      }
    }
    ctx.restore();
  }
  function drawAreaHit(ctx, s) {
    s = s || {};
    var p = prog(s.age, num(s.duration, 0.3)); if (p < 0) return;
    var kind = ({ whirl: 1, frostSmash: 1, charge: 1, shockBurst: 1 }[s.kind]) ? s.kind : 'whirl';
    var frost = bool(s.frost) && kind !== 'frostSmash';
    var x = num(s.x, 0), y = num(s.y, 0);
    var R = clamp(num(s.radius, kind === 'charge' ? 30 : 60), 4, 60);
    ctx.save(); ctx.translate(x, y); ctx.lineCap = 'round';
    var fade = 1 - p, i, j, a;
    if (kind === 'whirl') {
      ctx.rotate(p * TAU);
      ctx.globalAlpha = 0.15 * fade; ctx.fillStyle = frost ? C.frost : C.melee; ctx.beginPath(); ctx.arc(0, 0, R, 0, TAU); ctx.fill();
      for (i = 0; i < 3; i++) {
        var a0 = i * TAU / 3;
        ctx.globalAlpha = fade; ctx.strokeStyle = C.melee; ctx.lineWidth = 6;
        ctx.beginPath(); ctx.arc(0, 0, R - 3, a0, a0 + 1.4); ctx.stroke();
        ctx.strokeStyle = frost ? '#d8f4ff' : '#ffffff'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(0, 0, R - 3, a0 + 0.3, a0 + 1.4); ctx.stroke();
        if (frost) {
          // 附冰: 斬擊內側一道冰藍弧 + 弧尾冰屑
          ctx.strokeStyle = C.frost; ctx.lineWidth = 3;
          ctx.beginPath(); ctx.arc(0, 0, R - 11, a0 + 0.2, a0 + 1.2); ctx.stroke();
          iceShard(ctx, Math.cos(a0 + 0.1) * (R - 11), Math.sin(a0 + 0.1) * (R - 11), a0, 4);
        }
      }
    } else if (kind === 'frostSmash') {
      var r = Math.max(2, (R - 2) * (0.25 + 0.75 * p));
      ctx.globalAlpha = 0.25 * fade; ctx.fillStyle = C.frost; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
      ctx.globalAlpha = fade; ctx.strokeStyle = C.frost; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.stroke();
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.stroke();
      ctx.fillStyle = '#e8f8ff';
      for (j = 0; j < 6; j++) {
        a = j * TAU / 6 + 0.3; var d = Math.min(R - 5, r * 0.75);
        ctx.save(); ctx.translate(Math.cos(a) * d, Math.sin(a) * d); ctx.rotate(a);
        ctx.beginPath(); ctx.moveTo(4, 0); ctx.lineTo(0, -2.5); ctx.lineTo(-4, 0); ctx.lineTo(0, 2.5); ctx.closePath(); ctx.fill();
        ctx.restore();
      }
    } else if (kind === 'shockBurst') {
      // 瞬閃落地放電: 白紫閃光 + 往外擴的紫環 + 7 道從中心劈出的鋸齒電弧; 附冰時環內多一圈冰藍 + 冰屑
      var rb = Math.max(4, (R - 3) * (0.3 + 0.7 * p));
      if (p < 0.3) {
        var fq2 = p / 0.3, gr2 = (R - 3) * 0.45 * (1 - 0.4 * fq2);
        var g2 = ctx.createRadialGradient(0, 0, 0, 0, 0, gr2);
        g2.addColorStop(0, 'rgba(255,255,255,0.95)'); g2.addColorStop(1, rgba(C.shock, 0));
        ctx.globalAlpha = 1 - fq2; ctx.fillStyle = g2; ctx.beginPath(); ctx.arc(0, 0, gr2, 0, TAU); ctx.fill();
      }
      ctx.globalAlpha = 0.12 * fade; ctx.fillStyle = frost ? C.frost : C.shock; ctx.beginPath(); ctx.arc(0, 0, rb, 0, TAU); ctx.fill();
      ctx.globalAlpha = fade; ctx.lineJoin = 'round';
      var seed = Math.floor(now() * 30);
      for (i = 0; i < 7; i++) {
        a = i * TAU / 7 + 0.35;
        var ex2 = Math.cos(a) * (rb - 2), ey2 = Math.sin(a) * (rb - 2);
        ctx.strokeStyle = C.shock; ctx.lineWidth = 3; boltPath(ctx, 0, 0, ex2, ey2, 4, seed + i); ctx.stroke();
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.2; boltPath(ctx, 0, 0, ex2, ey2, 4, seed + i); ctx.stroke();
      }
      ctx.strokeStyle = '#2a1040'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(0, 0, Math.max(2, rb - 1), 0, TAU); ctx.stroke();
      ctx.strokeStyle = C.shock; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, Math.max(2, rb - 1), 0, TAU); ctx.stroke();
      if (frost) {
        ctx.strokeStyle = C.frost; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, Math.max(2, rb - 7), 0, TAU); ctx.stroke();
        for (j = 0; j < 4; j++) { var fa2 = j * TAU / 4 + 0.8, fd2 = Math.max(2, rb - 12); iceShard(ctx, Math.cos(fa2) * fd2, Math.sin(fa2) * fd2, fa2, 3.5); }
      }
    } else {
      // 衝鋒撞擊: 0~0.25 實心星爆 + 粗衝擊環; 朝撞退方向噴出的衝擊線; 附冰時星芯與環換冰藍並噴冰屑
      var ang = num(s.angle, 0);
      if (p < 0.25) {
        var fq = p / 0.25, fr = (R - 3) * (0.55 + 0.45 * fq);
        ctx.globalAlpha = 1 - fq;
        ctx.fillStyle = '#ffffff'; starPath(ctx, 0, 0, fr, fr * 0.45); ctx.fill();
        ctx.fillStyle = frost ? C.frost : C.charge; starPath(ctx, 0, 0, fr * 0.55, fr * 0.25); ctx.fill();
      }
      var r2 = Math.max(2, (R - 3) * (0.35 + 0.65 * p));
      ctx.globalAlpha = fade; ctx.strokeStyle = frost ? '#0a2a40' : '#3a0a30'; ctx.lineWidth = 6;
      ctx.beginPath(); ctx.arc(0, 0, r2, 0, TAU); ctx.stroke();
      ctx.strokeStyle = frost ? C.frost : C.charge; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(0, 0, r2, 0, TAU); ctx.stroke();
      ctx.rotate(ang);
      var spreads = [-0.55, -0.27, 0, 0.27, 0.55];
      for (var k = 0; k < spreads.length; k++) {
        var b = spreads[k], len = k === 2 ? 1 : 0.82;
        var d0 = (R - 3) * (0.15 + 0.5 * p), d1 = Math.min(R - 3, (R - 3) * (0.5 + 0.6 * p) * len);
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = k === 2 ? 3.5 : 2.5;
        ctx.beginPath(); ctx.moveTo(Math.cos(b) * d0, Math.sin(b) * d0); ctx.lineTo(Math.cos(b) * d1, Math.sin(b) * d1); ctx.stroke();
      }
      if (frost) {
        for (j = 0; j < 4; j++) {
          var ba = PI + 0.5 + j * (TAU - 1) / 4, bd = Math.min(R - 6, (R - 3) * (0.5 + 0.4 * p));
          iceShard(ctx, Math.cos(ba) * bd, Math.sin(ba) * bd, ba, 3.5);
        }
      }
    }
    ctx.restore();
  }
  // 電擊連鎖: 每段一道鋸齒閃電(偏離中線 ≤ 4 + 線寬一半 2 = 6), 兩端小亮點(直徑 ≤ 10)
  // ally = 紫電 + 白芯 + 白端點; enemy = 敵方粉紅 + 暗紅襯 + 暗紅芯端點
  function drawShockChain(ctx, s) {
    s = s || {};
    var p = prog(s.age, num(s.duration, 0.2)); if (p < 0) return;
    var enemy = s.owner === 'enemy';
    var segs = arr(s.segments).slice(0, 8);
    var seed = Math.floor(now() * 30);
    ctx.save(); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.globalAlpha = 1 - p * 0.85;
    for (var i = 0; i < segs.length; i++) {
      var g = segs[i]; if (!Array.isArray(g)) continue;
      var x1 = num(g[0], NaN), y1 = num(g[1], NaN), x2 = num(g[2], NaN), y2 = num(g[3], NaN);
      if (!isFinite(x1) || !isFinite(y1) || !isFinite(x2) || !isFinite(y2)) continue;
      ctx.strokeStyle = enemy ? '#3a0010' : '#2a1040'; ctx.lineWidth = 4; boltPath(ctx, x1, y1, x2, y2, 4, seed + i * 13); ctx.stroke();
      ctx.strokeStyle = enemy ? C.enemyShot : C.shock; ctx.lineWidth = 2.6; boltPath(ctx, x1, y1, x2, y2, 4, seed + i * 13); ctx.stroke();
      ctx.strokeStyle = enemy ? '#ffd0dc' : '#ffffff'; ctx.lineWidth = 1; boltPath(ctx, x1, y1, x2, y2, 4, seed + i * 13); ctx.stroke();
      [[x1, y1], [x2, y2]].forEach(function (e) {
        ctx.fillStyle = enemy ? C.enemyShot : C.shock; ctx.beginPath(); ctx.arc(e[0], e[1], 4.5, 0, TAU); ctx.fill();
        ctx.fillStyle = enemy ? '#5a0a24' : '#ffffff'; ctx.beginPath(); ctx.arc(e[0], e[1], 2.4, 0, TAU); ctx.fill();
      });
    }
    ctx.restore();
  }
  // 雷電球: 中心 24×24 電球 + 半徑 60(外緣)的淡電場; 放電脈衝時電場只變亮
  function drawThunderOrb(ctx, s) {
    s = s || {};
    var x = num(s.x, 0), y = num(s.y, 0);
    var pp = prog(s.pulseAge, num(s.pulseDuration, 0.15)), pulse = pp >= 0 ? 1 - pp : 0;
    ctx.save(); ctx.translate(x, y);
    ctx.fillStyle = rgba(C.shock, 0.06 + 0.14 * pulse); ctx.beginPath(); ctx.arc(0, 0, 60, 0, TAU); ctx.fill();
    ctx.strokeStyle = rgba(C.shock, 0.45 + 0.5 * pulse); ctx.lineWidth = 1.5 + pulse;
    if (pulse <= 0) ctx.setLineDash([3, 5]);
    ctx.beginPath(); ctx.arc(0, 0, 59, now() * 0.8, now() * 0.8 + TAU); ctx.stroke(); ctx.setLineDash([]);
    // 球體
    var g = ctx.createRadialGradient(-2, -2, 1, 0, 0, 10);
    g.addColorStop(0, '#ffffff'); g.addColorStop(0.45, lighten(C.shock, 0.45)); g.addColorStop(1, C.shock);
    ctx.fillStyle = '#2a1040'; ctx.beginPath(); ctx.arc(0, 0, 10, 0, TAU); ctx.fill();
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 9, 0, TAU); ctx.fill();
    // 表面電弧
    var seed = Math.floor(now() * 20);
    ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.2;
    for (var i = 0; i < 3; i++) {
      var a = hash(seed, i, 5) * TAU;
      boltPath(ctx, Math.cos(a) * 5, Math.sin(a) * 5, Math.cos(a + 0.4) * 10.5, Math.sin(a + 0.4) * 10.5, 1.2, seed + i);
      ctx.stroke();
    }
    ctx.restore();
  }
  // 瞬閃: 起點殘影光(≤ 20 半徑)→ 鋸齒閃電軌跡(全寬 ≤ 12)→ 終點一閃(≤ 20 半徑)
  function drawBlink(ctx, s) {
    s = s || {};
    var p = prog(s.age, num(s.duration, 0.3)); if (p < 0) return;
    var x1 = num(s.x1, 0), y1 = num(s.y1, 0), x2 = num(s.x2, x1), y2 = num(s.y2, y1);
    var fade = 1 - p;
    ctx.save(); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    // 起點殘影: 逐漸散去
    var r1 = 12 + 7 * p;
    var g1 = ctx.createRadialGradient(x1, y1, 0, x1, y1, r1);
    g1.addColorStop(0, rgba(C.shock, 0.7)); g1.addColorStop(1, rgba(C.shock, 0));
    ctx.globalAlpha = fade; ctx.fillStyle = g1; ctx.beginPath(); ctx.arc(x1, y1, r1, 0, TAU); ctx.fill();
    ctx.strokeStyle = rgba(C.shock, 0.8); ctx.lineWidth = 1.5; ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.arc(x1, y1, Math.min(18, 8 + 10 * p), 0, TAU); ctx.stroke(); ctx.setLineDash([]);
    // 軌跡
    var seed = Math.floor(now() * 30);
    ctx.globalAlpha = fade;
    ctx.strokeStyle = '#2a1040'; ctx.lineWidth = 4; boltPath(ctx, x1, y1, x2, y2, 4, seed); ctx.stroke();
    ctx.strokeStyle = C.shock; ctx.lineWidth = 2.6; boltPath(ctx, x1, y1, x2, y2, 4, seed); ctx.stroke();
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.1; boltPath(ctx, x1, y1, x2, y2, 4, seed); ctx.stroke();
    // 終點一閃
    if (p < 0.6) {
      var q = p / 0.6, r2 = 20 * (0.55 + 0.45 * q);
      var g2 = ctx.createRadialGradient(x2, y2, 0, x2, y2, r2);
      g2.addColorStop(0, 'rgba(255,255,255,0.95)'); g2.addColorStop(0.5, rgba(C.shock, 0.6)); g2.addColorStop(1, rgba(C.shock, 0));
      ctx.globalAlpha = 1 - q; ctx.fillStyle = g2; ctx.beginPath(); ctx.arc(x2, y2, r2, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }
  // 治癒光線: 柔和薄荷綠光帶(全寬 ≤ 8) + 流向友軍的小十字; 末端綻開一團光(24×24 內)。和穿透箭(28 寬硬黃光)、共鳴線(細色線)分開
  function drawHealBeam(ctx, s) {
    s = s || {};
    var p = prog(s.age, num(s.duration, 0.3)); if (p < 0) return;
    var x1 = num(s.x1, 0), y1 = num(s.y1, 0), x2 = num(s.x2, x1), y2 = num(s.y2, y1);
    var fade = 1 - p;
    ctx.save(); ctx.lineCap = 'round';
    var L = Math.hypot(x2 - x1, y2 - y1);
    if (L > 1) {
      var ux = (x2 - x1) / L, uy = (y2 - y1) / L;
      // 圓頭不外伸: 線段兩端各縮 4
      var ax = x1 + ux * Math.min(4, L / 2), ay = y1 + uy * Math.min(4, L / 2), bx = x2 - ux * Math.min(4, L / 2), by = y2 - uy * Math.min(4, L / 2);
      ctx.globalAlpha = 0.35 * fade; ctx.strokeStyle = C.heal; ctx.lineWidth = 8;
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
      ctx.globalAlpha = 0.85 * fade; ctx.strokeStyle = '#bfffd8'; ctx.lineWidth = 3.5;
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
      ctx.globalAlpha = fade; ctx.fillStyle = '#ffffff';
      for (var d = (p * 90) % 30 + 8; d < L - 12; d += 30) { plusPath(ctx, x1 + ux * d, y1 + uy * d, 3.2); ctx.fill(); }
    }
    var r = 7 + 5 * Math.min(1, p * 3);
    var g = ctx.createRadialGradient(x2, y2, 0, x2, y2, r);
    g.addColorStop(0, 'rgba(255,255,255,0.95)'); g.addColorStop(1, rgba(C.heal, 0));
    ctx.globalAlpha = fade; ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x2, y2, r, 0, TAU); ctx.fill();
    ctx.fillStyle = '#ffffff'; plusPath(ctx, x2, y2, 4.5); ctx.fill();
    ctx.restore();
  }
  function drawHitSpark(ctx, s) {
    s = s || {};
    var p = prog(s.age, num(s.duration, 0.25)); if (p < 0) return;
    var x = num(s.x, 0), y = num(s.y, 0), frost = bool(s.frost);
    ctx.save(); ctx.translate(x, y); ctx.lineCap = 'round';
    ctx.globalAlpha = 1 - p;
    ctx.strokeStyle = frost ? C.frost : '#fff6c0'; ctx.lineWidth = 2.5;
    for (var i = 0; i < 6; i++) {
      var a = i * TAU / 6 + 0.4, r0 = 3 + 5 * p, r1 = Math.min(11, 6 + 6 * p);
      ctx.beginPath(); ctx.moveTo(Math.cos(a) * r0, Math.sin(a) * r0); ctx.lineTo(Math.cos(a) * r1, Math.sin(a) * r1); ctx.stroke();
    }
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(0, 0, 4 * (1 - p) + 1, 0, TAU); ctx.fill();
    if (frost) {
      // 冰屑: 3 顆小菱形夾在火花之間
      for (var j = 0; j < 3; j++) {
        var b = j * TAU / 3 + 0.4 + PI / 6, d = Math.min(7.5, 4 + 4 * p);
        iceShard(ctx, Math.cos(b) * d, Math.sin(b) * d, b, 3);
      }
    }
    ctx.restore();
  }
  // ---------- 近戰斬擊(取代近戰類命中的火花) ----------
  // 沿二次曲線 P0→P1→P2 從參數 u0 到 u1 畫一條兩端尖、中段寬 maxW 的新月形刀光
  function crescent(ctx, P0, P1, P2, u0, u1, maxW) {
    var n = 14, i, u, top = [], bot = [];
    if (u1 - u0 < 0.01) return false;
    for (i = 0; i <= n; i++) {
      u = u0 + (u1 - u0) * i / n;
      var mu = 1 - u;
      var px = mu * mu * P0[0] + 2 * mu * u * P1[0] + u * u * P2[0];
      var py = mu * mu * P0[1] + 2 * mu * u * P1[1] + u * u * P2[1];
      var tx = 2 * mu * (P1[0] - P0[0]) + 2 * u * (P2[0] - P1[0]);
      var ty = 2 * mu * (P1[1] - P0[1]) + 2 * u * (P2[1] - P1[1]);
      var tl = Math.hypot(tx, ty) || 1, nx = -ty / tl, ny = tx / tl;
      // 寬度: 尾端尖、靠刀頭最寬(刀光由尾往頭變粗)
      var k = (u - u0) / (u1 - u0), w = maxW * Math.sin(PI * (0.15 + 0.7 * k)) * (0.35 + 0.65 * k) / 2;
      top.push([px + nx * w, py + ny * w]); bot.push([px - nx * w, py - ny * w]);
    }
    ctx.beginPath(); ctx.moveTo(top[0][0], top[0][1]);
    for (i = 1; i <= n; i++) ctx.lineTo(top[i][0], top[i][1]);
    for (i = n; i >= 0; i--) ctx.lineTo(bot[i][0], bot[i][1]);
    ctx.closePath();
    return true;
  }
  // ally(64×64): 一道新月形刀光 + 殘影 + 朝 angle 噴的衝擊線; enemy(44×44): 三道暗紅爪痕(形狀與顏色都和我方不同)
  function drawMeleeSlash(ctx, s) {
    s = s || {};
    var d = num(s.duration, 0.25) || 0.25, age = num(s.age, d);
    if (!(age >= 0 && age < d)) return;
    var kind = ({ melee: 1, frostSmash: 1, thunderSlash: 1 }[s.kind]) ? s.kind : 'melee';
    var enemy = s.team === 'enemy';
    var frost = !enemy && bool(s.frost) && kind !== 'frostSmash';
    var shock = !enemy && bool(s.shock) && kind !== 'thunderSlash';
    var R = enemy ? 22 : 32;
    var hitT = Math.min(0.08, d * 0.32);
    var draw = age < hitT ? age / hitT : 1;                       // 劃過進度
    var fade = age < hitT ? 1 : 1 - (age - hitT) / (d - hitT);    // 變細、淡出
    var thick = kind === 'thunderSlash' ? 1.35 : 1;
    ctx.save();
    ctx.translate(num(s.x, 0), num(s.y, 0)); ctx.rotate(num(s.angle, 0));
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    var i, a;
    if (enemy) {
      // 三道平行爪痕, 由上往下斜劃; 暗紅襯 + 敵方粉紅芯
      for (i = 0; i < 3; i++) {
        var off = (i - 1) * 7;
        var P0 = [-8 + off, -15], P1 = [3 + off, -1], P2 = [-2 + off, 15];
        var u1 = clamp(draw * 1.25 - i * 0.12, 0, 1);
        if (u1 <= 0) continue;
        ctx.globalAlpha = fade;
        ctx.fillStyle = '#3a0d1a'; if (crescent(ctx, P0, P1, P2, 0, u1, 7 * (0.5 + 0.5 * fade))) ctx.fill();
        ctx.fillStyle = C.enemyShot; if (crescent(ctx, P0, P1, P2, 0.05, u1, 4 * (0.5 + 0.5 * fade))) ctx.fill();
      }
      // 命中點小暗紅閃
      if (age < hitT * 1.5) {
        ctx.globalAlpha = 1 - age / (hitT * 1.5);
        ctx.fillStyle = '#ffd0dc'; ctx.beginPath(); ctx.arc(2, 0, 4, 0, TAU); ctx.fill();
      }
      ctx.restore();
      return;
    }
    // 我方: 刀光從出手側(−x)那一側的上方劃到下方, 向 +x 鼓出(垂直於出手方向)
    var Q0 = [-R * 0.3, -R * 0.78], Q1 = [R * 0.62, -R * 0.05], Q2 = [-R * 0.18, R * 0.8];
    var outer = kind === 'frostSmash' ? C.frost : kind === 'thunderSlash' ? C.shock : C.gold;
    var ink = kind === 'frostSmash' ? '#0a2a40' : kind === 'thunderSlash' ? '#2a1040' : '#3a2600';
    var W = 15 * thick * (0.45 + 0.55 * fade);
    // 殘影: 往出手方向後退一點、較淡
    ctx.save(); ctx.translate(-6, 0); ctx.globalAlpha = 0.3 * fade;
    ctx.fillStyle = outer; if (crescent(ctx, Q0, Q1, Q2, 0, draw * 0.85, W * 0.8)) ctx.fill();
    ctx.restore();
    ctx.globalAlpha = fade;
    ctx.fillStyle = ink; if (crescent(ctx, Q0, Q1, Q2, 0, draw, W + 3)) ctx.fill();
    ctx.fillStyle = outer; if (crescent(ctx, Q0, Q1, Q2, 0, draw, W)) ctx.fill();
    ctx.fillStyle = '#ffffff'; if (crescent(ctx, Q0, Q1, Q2, 0.08, draw, W * 0.45)) ctx.fill();
    // 雷霆斬: 刀光上纏一道鋸齒電弧
    if (kind === 'thunderSlash' || shock) {
      var seed = Math.floor(now() * 30);
      var e0x = Q0[0] + 3, e0y = Q0[1] + 4, e1x = Q2[0] + 3, e1y = Q2[1] - 4;
      var ex = e0x + (e1x - e0x) * draw, ey = e0y + (e1y - e0y) * draw;
      ctx.translate(R * 0.18, 0);
      ctx.strokeStyle = kind === 'thunderSlash' ? '#ffffff' : C.shock; ctx.lineWidth = kind === 'thunderSlash' ? 2.2 : 1.8;
      boltPath(ctx, e0x, e0y, ex, ey, 4, seed); ctx.stroke();
      if (shock) { ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 0.9; boltPath(ctx, e0x, e0y, ex, ey, 4, seed); ctx.stroke(); }
      ctx.translate(-R * 0.18, 0);
    }
    // 朝 angle(+x)噴 4 條短衝擊線
    if (draw >= 0.6) {
      var q = clamp((age - hitT * 0.6) / (d - hitT * 0.6), 0, 1);
      var spreads = [-0.5, -0.17, 0.17, 0.5];
      ctx.strokeStyle = kind === 'melee' ? '#fff6c0' : '#ffffff';
      for (i = 0; i < spreads.length; i++) {
        a = spreads[i];
        var r0 = R * (0.3 + 0.35 * q), r1 = Math.min(R - 3, R * (0.55 + 0.4 * q) * (i === 1 || i === 2 ? 1 : 0.85));
        ctx.lineWidth = (i === 1 || i === 2 ? 3 : 2.2) * thick * (1 - 0.5 * q);
        ctx.beginPath(); ctx.moveTo(Math.cos(a) * r0, Math.sin(a) * r0); ctx.lineTo(Math.cos(a) * r1, Math.sin(a) * r1); ctx.stroke();
      }
    }
    // 冰霜重擊 / 附冰: 碎冰沿刀光散出
    if (kind === 'frostSmash' || frost) {
      var nS = kind === 'frostSmash' ? 5 : 3;
      for (i = 0; i < nS; i++) {
        var u = (i + 0.5) / nS; if (u > draw) break;
        var mu = 1 - u;
        var px = mu * mu * Q0[0] + 2 * mu * u * Q1[0] + u * u * Q2[0], py = mu * mu * Q0[1] + 2 * mu * u * Q1[1] + u * u * Q2[1];
        var push = 4 + 8 * (1 - fade);
        iceShard(ctx, Math.min(R - 6, px + push), py * (1 + 0.1 * (1 - fade)), (i - 2) * 0.5, kind === 'frostSmash' ? 4 : 3.2);
      }
    }
    ctx.restore();
  }
  function drawStealLink(ctx, s) {
    s = s || {};
    var x1 = num(s.x1, 0), y1 = num(s.y1, 0), x2 = num(s.x2, x1), y2 = num(s.y2, y1);
    var p = clamp(num(s.progress, 0), 0, 1);
    var L = Math.hypot(x2 - x1, y2 - y1); if (L < 1) return;
    var ux = (x2 - x1) / L, uy = (y2 - y1) / L, nx = -uy, ny = ux;
    ctx.save(); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    var seg = 8, amp = 3 + 2 * p, n = Math.max(2, Math.floor(L / seg));
    var path = function () {
      ctx.beginPath(); ctx.moveTo(x1, y1);
      for (var i = 1; i < n; i++) { var d = L * i / n, o = (i % 2 ? amp : -amp); ctx.lineTo(x1 + ux * d + nx * o, y1 + uy * d + ny * o); }
      ctx.lineTo(x2, y2);
    };
    ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineWidth = 4; path(); ctx.stroke();
    ctx.globalAlpha = 0.5 + 0.5 * p; ctx.strokeStyle = C.gold; ctx.lineWidth = 2 + 1.5 * p; path(); ctx.stroke();
    var f = 1 - p;
    ctx.globalAlpha = 1; ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(x1 + (x2 - x1) * f, y1 + (y2 - y1) * f, 3 + 2 * p, 0, TAU); ctx.fill();
    ctx.restore();
  }
  function drawComboName(ctx, s) {
    s = s || {};
    var p = prog(s.age, num(s.duration, 1.5)); if (p < 0) return;
    var x = num(s.x, 0), y = num(s.y, 0), isNew = bool(s.isNew);
    var label = (isNew ? '新組合! ' : '') + str(s.name);
    var W = isNew ? 280 : 200;
    var sc = p < 0.08 ? 1 + 0.2 * (p / 0.08) : p < 0.16 ? 1.2 - 0.2 * ((p - 0.08) / 0.08) : 1;
    var dy = 4 - 11 * p;
    var alpha = p > 0.6 ? 1 - (p - 0.6) / 0.4 : 1;
    var ph = isNew ? 31 : tv(20, 24), fs = isNew ? 18 : 14;
    ctx.save();
    ctx.translate(x, y + dy); ctx.scale(sc, sc);
    ctx.globalAlpha = alpha;
    ctx.font = 'bold ' + fz(fs) + 'px ' + FONT;
    var maxPw = W / 1.2 - 4;
    var pw = Math.min(maxPw, ctx.measureText(label).width + (isNew ? 28 : 20));
    ctx.fillStyle = isNew ? '#3a2a05' : 'rgba(20,18,36,0.88)';
    rr(ctx, -pw / 2, -ph / 2, pw, ph, ph / 2); ctx.fill();
    ctx.strokeStyle = isNew ? C.gold : C.resonance; ctx.lineWidth = isNew ? 2.5 : 1.5;
    rr(ctx, -pw / 2, -ph / 2, pw, ph, ph / 2); ctx.stroke();
    txt(ctx, label, 0, 0.5, { size: fs, color: isNew ? C.gold : '#ffffff', maxW: pw - 12 });
    ctx.restore();
  }
  function drawSpawnWarning(ctx, s) {
    s = s || {};
    var x = num(s.x, 40), y = num(s.y, 144);
    var total = num(s.total, 6) || 6, rem = clamp(num(s.remaining, total), 0, total);
    var sec = Math.max(1, Math.ceil(rem)), frac = rem - (sec - 1);
    ctx.save(); ctx.translate(x, y);
    var blink = 0.65 + 0.35 * Math.sin(now() * 9);
    ctx.globalAlpha = blink;
    ctx.fillStyle = 'rgba(255,60,40,0.35)'; ctx.beginPath(); ctx.arc(0, 0, 31, 0, TAU); ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#4a0c0c'; ctx.beginPath(); ctx.arc(0, 0, 22, 0, TAU); ctx.fill();
    // 這一秒的剩餘環
    ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(0, 0, 26, 0, TAU); ctx.stroke();
    ctx.strokeStyle = '#ff5a3a'; ctx.beginPath(); ctx.arc(0, 0, 26, -PI / 2, -PI / 2 + TAU * clamp(frac, 0, 1)); ctx.stroke();
    ctx.save(); ctx.rotate(num(s.angle, 0));
    ctx.fillStyle = '#2a0000';
    ctx.beginPath(); ctx.moveTo(31.5, 0); ctx.lineTo(21, -9); ctx.lineTo(21, 9); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ffd0a0';
    ctx.beginPath(); ctx.moveTo(30, 0); ctx.lineTo(22.5, -6.5); ctx.lineTo(22.5, 6.5); ctx.closePath(); ctx.fill();
    ctx.restore();
    txt(ctx, String(sec), -1, 1, { size: 20, color: '#ffffff', stroke: '#2a0000', sw: 3 });
    ctx.restore();
  }

  // ---------- HUD / UI ----------
  function goldChip(ctx, x, y, gold) {
    // 觸控模式: 金幣圖示 16 → 24
    var T = touchOn();
    coinGlyph(ctx, x + (T ? 12 : 9), y, T ? 12 : 8);
    txt(ctx, String(gold), x + (T ? 28 : 22), y + 1, { size: 20, align: 'left', color: C.gold, maxW: 90 });
  }
  function heartGlyph(ctx, cx, cy) {
    ctx.fillStyle = '#ff5a6a';
    ctx.beginPath(); ctx.moveTo(cx, cy + 6); ctx.bezierCurveTo(cx - 14, cy - 3, cx - 10, cy - 12, cx, cy - 6); ctx.bezierCurveTo(cx + 10, cy - 12, cx + 14, cy - 3, cx, cy + 6); ctx.fill();
  }
  function drawHud(ctx, s) {
    s = s || {};
    ctx.save();
    // 第 13 輪: 內容 1024×48(設計座標), 垂直置中 y = 24; 底條畫滿 x −160~1184(發布加寬不斷掉)
    ctx.fillStyle = C.hud; ctx.fillRect(FX0, 0, FW, HUD_H);
    ctx.fillStyle = '#2c3446'; ctx.fillRect(FX0, HUD_H - 2, FW, 2);
    // 關卡(x = 16, 到約 316)
    var lv = clamp(Math.floor(num(s.level, 1)), 1, 4);
    txt(ctx, '第 ' + lv + ' 關', 16, 24, { size: 13, align: 'left', color: C.textDim, weight: 'normal' });
    txt(ctx, str(s.levelName), tv(70, 78), 24, { size: 17, align: 'left', color: C.text, maxW: tv(246, 238) });
    // 金幣(左緣 x = 330, 到約 450)
    goldChip(ctx, 330, 24, Math.max(0, Math.floor(num(s.gold, 0))));
    // 主堡生命 → drawCastle 血量牌; 波次 / 倒數 → drawWavePanel; 中間 x 470~710 留給 drawBossBar
    // 第 13 輪: 喇叭移出 HUD → drawMuteIcon(遊玩區右上角), 本函式不再讀 muted
    // 操作提示: 右緣 1008, 鍵帽 22×22(Esc 32×22), 鍵帽與字隔 4、組間隔 14
    // 觸控模式(window.PVDX.on): 手機沒有 C / Esc / M, 只留互動; 圖鑑改由觸控層的圖鑑鈕打開
    var touch = !!(window.PVDX && window.PVDX.on);
    hintRow(ctx, touch ? [{ keys: ['z'], label: '互動' }] : [{ keys: ['z'], label: '互動' }, { keys: ['c'], label: '圖鑑' }, { keys: ['esc'], label: '暫停' }, { keys: ['m'], label: '靜音' }], 1008, 24, { align: 'right', size: 13, gap: 14 });
    ctx.restore();
  }
  // 聲音開關圖示(第 13 輪新函式): 關卡中 (992,74) size 32、開始畫面 (974,40) size 36; 整個圖示畫在 size×size 內
  // muted: 灰喇叭 + 紅叉; 否則白喇叭 + 2 道聲波(顏色 + 形狀兩條通道)
  function drawMuteIcon(ctx, s) {
    s = s || {};
    var size = clamp(num(s.size, 32), 12, 64);
    ctx.save();
    speaker(ctx, num(s.x, 992), num(s.y, 74), size, bool(s.muted));
    ctx.restore();
  }
  // Z 情境提示: 玩家腳下, 本體 96×22
  var BAD_HINT = { '不能蓋': 1, '不能插': 1, '不能裝': 1, '不能搶': 1, '暫不能拔除': 1, '不能拔除': 1 };
  function drawActionHint(ctx, s) {
    s = s || {};
    var label = str(s.label); if (!label) return;
    var x = num(s.x, 0), y = num(s.y, 0), bad = BAD_HINT[label] === 1;
    ctx.save();
    // 觸控模式: 鍵帽 16 → 24、底板高 22 → 30、字級下限 17, 寬度上限放寬到 176(長字不擠)
    var T = touchOn(), kh = T ? 24 : 16;
    var tw = textW(ctx, label, 13);
    var W = Math.min(T ? 176 : 96, Math.max(48, 4 + kh + 4 + tw + 8)), H = T ? 30 : 22;
    var x0 = x - W / 2;
    ctx.fillStyle = bad ? 'rgba(60,12,12,0.66)' : 'rgba(12,16,26,0.6)'; rr(ctx, x0, y - H / 2, W, H, 6); ctx.fill();
    ctx.strokeStyle = bad ? 'rgba(255,110,100,0.8)' : 'rgba(255,255,255,0.22)'; ctx.lineWidth = 1;
    rr(ctx, x0 + 0.5, y - H / 2 + 0.5, W - 1, H - 1, 6); ctx.stroke();
    ctx.globalAlpha = bad ? 0.55 : 1;
    keyIcon(ctx, 'z', x0 + 4 + kh / 2, y, kh, kh, false);
    ctx.globalAlpha = 1;
    txt(ctx, label, x0 + kh + 8, y + 0.5, { size: 13, align: 'left', color: bad ? '#ff9a8a' : '#ffffff', maxW: W - kh - 12 });
    ctx.restore();
  }
  // ---------- 新手教學搬運箭頭(階段 16) ----------
  // 暖黃粗線(6 寬 + 外側 1.5 深墨描邊)+ 18×18 三角頭; 線上奶白虛線段往終點流; 起點一圈暖黃提示環
  function bezPt(P0, P1, P2, u) {
    var mu = 1 - u;
    return [mu * mu * P0[0] + 2 * mu * u * P1[0] + u * u * P2[0], mu * mu * P0[1] + 2 * mu * u * P1[1] + u * u * P2[1]];
  }
  function drawTutorialArrow(ctx, s) {
    s = s || {};
    var P0 = [num(s.fromX, 0), num(s.fromY, 0)], P2 = [num(s.toX, P0[0]), num(s.toY, P0[1] - 60)];
    var P1 = [num(s.ctrlX, (P0[0] + P2[0]) / 2), num(s.ctrlY, Math.min(P0[1], P2[1]) - 60)];
    var fromR = clamp(num(s.fromR, 16), 6, 20), t = num(s.t, 0);
    var ad = num(s.appearDuration, 0.3) || 0.3, aa = num(s.appearAge, ad);
    var grow = (aa >= 0 && aa < ad) ? aa / ad : 1;
    var hi = 'rgb(' + GUIDE_HI[0] + ',' + GUIDE_HI[1] + ',' + GUIDE_HI[2] + ')';
    // 取樣曲線
    var N = 48, pts = [], i;
    for (i = 0; i <= N; i++) pts.push(bezPt(P0, P1, P2, i / N));
    // 線起點: 離開提示環外緣; 線終點: 頭部底邊(距尖端 18)
    var iS = 0, iE = N;
    while (iS < N && Math.hypot(pts[iS][0] - P0[0], pts[iS][1] - P0[1]) < fromR) iS++;
    while (iE > iS && Math.hypot(pts[iE][0] - P2[0], pts[iE][1] - P2[1]) < 18) iE--;
    var iG = Math.floor(N * grow);
    var iLast = Math.min(iE, iG);
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    var path = function () {
      ctx.beginPath(); ctx.moveTo(pts[iS][0], pts[iS][1]);
      for (var k = iS + 1; k <= iLast; k++) ctx.lineTo(pts[k][0], pts[k][1]);
      if (grow >= 1 && iE < N) {
        // 接到頭部底邊中點
        var tx0 = P2[0] - P1[0], ty0 = P2[1] - P1[1], tl0 = Math.hypot(tx0, ty0) || 1;
        ctx.lineTo(P2[0] - tx0 / tl0 * 17, P2[1] - ty0 / tl0 * 17);
      }
    };
    if (iLast > iS) {
      ctx.lineCap = 'butt';
      ctx.strokeStyle = C.tutorInk; ctx.lineWidth = 9; path(); ctx.stroke();
      ctx.strokeStyle = hi; ctx.lineWidth = 6; path(); ctx.stroke();
      // 流動段: 每秒 60px 往終點
      ctx.strokeStyle = C.tutorPaper; ctx.lineWidth = 2.5; ctx.setLineDash([8, 16]); ctx.lineDashOffset = -((t * 60) % 24);
      path(); ctx.stroke(); ctx.setLineDash([]); ctx.lineDashOffset = 0;
    }
    // 頭部: 長 18、底寬 18, 尖端正好在 (toX, toY), 方向 = 終點切線
    if (grow >= 1) {
      var tx = P2[0] - P1[0], ty = P2[1] - P1[1], tl = Math.hypot(tx, ty);
      if (tl < 0.01) { tx = P2[0] - P0[0]; ty = P2[1] - P0[1]; tl = Math.hypot(tx, ty) || 1; }
      var ux = tx / tl, uy = ty / tl, nx = -uy, ny = ux;
      var bx = P2[0] - ux * 18, by = P2[1] - uy * 18;
      var head = function (inset) {
        ctx.beginPath();
        ctx.moveTo(P2[0] - ux * inset * 1.8, P2[1] - uy * inset * 1.8);
        ctx.lineTo(bx + nx * (9 - inset) + ux * inset * 0.5, by + ny * (9 - inset) + uy * inset * 0.5);
        ctx.lineTo(bx - nx * (9 - inset) + ux * inset * 0.5, by - ny * (9 - inset) + uy * inset * 0.5);
        ctx.closePath();
      };
      ctx.fillStyle = C.tutorInk; head(0); ctx.fill();
      ctx.fillStyle = hi; head(1.6); ctx.fill();
      // 中段小魂件圖示 14×14(曲線參數 0.5)
      var it = s.item === 'pierce' || s.item === 'melee' || s.item === 'seek' ? s.item : null;
      if (it) {
        var m = bezPt(P0, P1, P2, 0.5);
        var mh = tv(9, 15), ms = tv(14, MIN_ICON); // 觸控模式小圖示 14 → 24(底框跟著放大)
        ctx.fillStyle = C.tutorInk; rr(ctx, m[0] - mh, m[1] - mh, mh * 2, mh * 2, 4); ctx.fill();
        ctx.fillStyle = C.tutorPaper; rr(ctx, m[0] - mh + 1, m[1] - mh + 1, mh * 2 - 2, mh * 2 - 2, 3.5); ctx.fill();
        itemIcon(ctx, it, m[0], m[1], ms);
      }
    }
    // 起點提示環: 外緣 fromR, 環寬 3(往內), 只改亮度脈動; 出現時 0.6 → 1.0 彈
    var rs = 1;
    if (grow < 1) { var g = grow; rs = g < 0.7 ? 0.6 + 0.5 * (g / 0.7) : 1.1 - 0.1 * ((g - 0.7) / 0.3); }
    var pl = 0.6 + 0.4 * Math.sin(t * 5);
    ctx.save(); ctx.translate(P0[0], P0[1]); ctx.scale(Math.min(1, rs), Math.min(1, rs));
    ctx.strokeStyle = 'rgba(42,32,22,' + (0.5 * pl + 0.2) + ')'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(0, 0, fromR - 3.5, 0, TAU); ctx.stroke();
    ctx.strokeStyle = 'rgba(' + GUIDE_HI[0] + ',' + GUIDE_HI[1] + ',' + GUIDE_HI[2] + ',' + (0.55 + 0.45 * pl) + ')'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(0, 0, fromR - 1.5, 0, TAU); ctx.stroke();
    ctx.restore();
    ctx.restore();
  }
  // ---------- 新手教學泡泡 ----------
  var SIDES = { up: 1, down: 1, left: 1, right: 1 };
  function drawTutorial(ctx, s) {
    s = s || {};
    var bx = num(s.bodyX, CX), by = num(s.bodyY, CY);
    // 第 10 輪: compact = 一行小泡泡 150×34(階段 16 彈窗版), 箭頭長 42、底邊寬 16, 一律朝下指著彈窗格子; large 優先(兩者不會同時為 true)
    var compact = s.compact === true && !bool(s.large);
    var side = compact ? 'up' : s.side === 'none' ? 'none' : SIDES[s.side] === 1 ? s.side : 'up';
    var dTy = compact ? 59 : bool(s.large) ? 70 : 56, dTx = bool(s.large) ? 220 : 170;
    var defTip = { up: [bx, by + dTy], down: [bx, by - dTy], left: [bx + dTx, by], right: [bx - dTx, by], none: [bx, by] }[side];
    var tx = num(s.tipX, defTip[0]), ty = num(s.tipY, defTip[1]);
    var text = str(s.text);
    var keys = arr(s.keys).filter(function (k) { return KEY_NAMES[k] === 1; }).slice(0, 4);
    var pressed = arr(s.pressedKeys);
    // 兩行大泡泡(階段 17 帶 2 項清單、階段 31 帶 [Z] 鍵帽, 都在 (0, +26) 那一列): 本體 400×100, 標籤中心 (−160, −50)
    var large = bool(s.large);
    var hw = large ? 200 : compact ? 75 : 150, hh = large ? 50 : compact ? 17 : 36;
    // 觸控模式: 清單項目整個放大 1.2 倍(魂件 / 單位小圖 20~22 → 24~26), 間距跟著拉開; 一般泡泡帶 3 項清單時本體加寬到 340
    if (touchOn() && !large && !compact && arr(s.checklist).length >= 3) hw = 170;
    var ckItem = function (fn, x, y) {
      if (!touchOn()) { fn(x, y); return; }
      ctx.save(); ctx.translate(x, y); ctx.scale(1.2, 1.2); FZK = 1.2; fn(0, 0); FZK = 1; ctx.restore();
    };
    var abw = compact ? 8 : 10; // 箭頭底邊半寬(compact 細長: 16 寬)
    // checklist: 階段 16 = 3 項 {item, to, done}; 階段 17 = 2 項 {item: kit, to: null, done}; 有值時取代按鍵列
    var checklist = arr(s.checklist).filter(function (c) { return c && typeof c === 'object'; }).slice(0, 3);
    if (checklist.length) keys = [];
    if (compact) { keys = []; checklist = []; } // 一行小泡泡: 不畫按鍵、不畫清單
    var dd = num(s.doneDuration, 0.6) || 0.6, da = num(s.doneAge, dd);
    var dp = (da >= 0 && da < dd) ? da / dd : -1;
    var sc = 1, alpha = 1;
    if (dp >= 0) {
      var e = Math.min(1, dp / 0.3);
      sc = 1 + 0.15 * (1 - (1 - e) * (1 - e));
      alpha = dp < 0.45 ? 1 : 1 - (dp - 0.45) / 0.55;
    }
    ctx.save();
    ctx.globalAlpha = clamp(alpha, 0, 1);
    ctx.translate(bx, by); ctx.scale(sc, sc);
    // 箭頭(本體邊 → 尖端), 底邊寬 20; 上下: 底邊中點 x = 尖端 x(夾在本體寬度內); 左右: 底邊中點 y = 尖端 y
    var ltx0 = tx - bx, lty0 = ty - by;
    var arrowPath = function (inset) {
      ctx.beginPath();
      // 尖端頂點往本體內縮 1.3(框線寬 2.5 的一半), 讓描邊的外緣正好落在 (tipX, tipY), 不超過尖端
      var bcx, bcy;
      if (side === 'up' || side === 'down') { bcx = clamp(ltx0, -hw + abw + 4, hw - abw - 4); bcy = side === 'up' ? hh : -hh; }
      else { bcx = side === 'left' ? hw : -hw; bcy = clamp(lty0, -hh + 12, hh - 12); }
      var dl = Math.hypot(ltx0 - bcx, lty0 - bcy) || 1, k = Math.min(1.3, dl) / dl;
      var ltx = ltx0 - (ltx0 - bcx) * k, lty = lty0 - (lty0 - bcy) * k;
      if (side === 'up' || side === 'down') {
        var edge = side === 'up' ? hh - inset : -hh + inset, lx = bcx;
        ctx.moveTo(lx - abw, edge); ctx.lineTo(ltx, lty); ctx.lineTo(lx + abw, edge);
      } else {
        var ex = side === 'left' ? hw - inset : -hw + inset, ly = bcy;
        ctx.moveTo(ex, ly - 10); ctx.lineTo(ltx, lty); ctx.lineTo(ex, ly + 10);
      }
      ctx.closePath();
    };
    ctx.fillStyle = C.tutorPaper; ctx.strokeStyle = C.tutorInk; ctx.lineWidth = 2.5; ctx.lineJoin = 'round';
    // side "none"(階段 16 場上版): 固定版位、不畫箭頭三角, 指引交給搬運箭頭
    if (side !== 'none') { arrowPath(0); ctx.fill(); ctx.stroke(); }
    // 本體: 淺紙色底 + 深墨框(和全畫面所有深色面板明暗相反)
    rr(ctx, -hw + 1.25, -hh + 1.25, hw * 2 - 2.5, hh * 2 - 2.5, compact ? 9 : 12); ctx.fill(); ctx.stroke();
    if (side !== 'none') { ctx.fillStyle = C.tutorPaper; arrowPath(3); ctx.fill(); } // 蓋掉箭頭與本體交界的框線
    // 原地呼吸的內框(不外擴、不放大); compact 本體只有 34 高, 內框貼近外框、線細一點, 不壓字
    var br = 0.35 + 0.35 * Math.sin(now() * 3.2);
    ctx.globalAlpha = clamp(alpha, 0, 1) * br;
    ctx.strokeStyle = C.tutorAccent; ctx.lineWidth = compact ? 1.5 : 2;
    if (compact) rr(ctx, -hw + 4, -hh + 4, hw * 2 - 8, hh * 2 - 8, 6);
    else rr(ctx, -hw + 6, -hh + 6, hw * 2 - 12, hh * 2 - 12, 9);
    ctx.stroke();
    ctx.globalAlpha = clamp(alpha, 0, 1);
    // 文字 + 按鍵列 / 檢查清單
    var ci;
    if (compact) {
      // 一行字置中(「拔掉這個魂件」/「換掉這個魂件」, 6 字 ≈ 108 寬); 標籤下半蓋進本體到 y −8, 字中心下移 2px 讓字頂不碰標籤
      txt(ctx, text.replace(/\n/g, ''), 0, 2, { size: 18, color: C.tutorInk, maxW: 130 });
    } else if (large) {
      // 兩行: 第一行 (0, −30)、第二行 (0, −6), 約 18px; 清單列 (0, +26), 2 項 104×26 中心 ((k − 0.5) × 120)
      // 第 8 輪: sub 有值(階段 31)= 第二行改畫成灰色小字(和引導卡小字同色, 15px 不加粗); text 只畫在第一行
      var lines = text.split('\n'), sub = str(s.sub);
      if (sub) {
        txt(ctx, lines.join(''), 0, -30, { size: 18, color: C.tutorInk, maxW: 352 });
        txt(ctx, sub, 0, -6, { size: 15, color: '#6a5640', weight: 'normal', maxW: 352 });
      } else if (lines.length === 1) txt(ctx, lines[0], 0, -18, { size: 18, color: C.tutorInk, maxW: 352 });
      else {
        txt(ctx, lines[0], 0, -30, { size: 18, color: C.tutorInk, maxW: 352 });
        txt(ctx, lines.slice(1).join(''), 0, -6, { size: 18, color: C.tutorInk, maxW: 352 });
      }
      for (ci = 0; ci < Math.min(2, checklist.length); ci++) ckItem(function (x, y) { checkItemKit(ctx, x, y, checklist[ci]); }, (ci - 0.5) * tv(120, 136), 26);
    } else {
      var ty0 = keys.length || checklist.length ? -14 : 0;
      var one = text.replace(/\n/g, '');
      txt(ctx, one, 0, ty0, { size: one.length >= 15 ? 16 : 17, color: C.tutorInk, maxW: 280 });
      for (ci = 0; ci < checklist.length; ci++) {
        var cix = (ci - (checklist.length - 1) / 2) * tv(96, 110);
        if (checklist[ci].item === 'crossbowKit' || checklist[ci].item === 'soldierKit') ckItem(function (x, y) { checkItemKit(ctx, x, y, checklist[ci], 88); }, cix, 16);
        else ckItem(function (x, y) { checkItem(ctx, x, y, checklist[ci]); }, cix, 16);
      }
    }
    if (keys.length) {
      var tot = 0, i;
      for (i = 0; i < keys.length; i++) tot += keyW(keys[i], 26) + (i ? 6 : 0);
      var kx = -tot / 2;
      for (i = 0; i < keys.length; i++) {
        var w = keyW(keys[i], 26);
        keyIcon(ctx, keys[i], kx + w / 2, large ? 26 : 16, w, 26, pressed.indexOf(keys[i]) >= 0);
        kx += w + 6;
      }
    }
    // 完成: 紙色罩住內容 + 大綠勾
    if (dp >= 0) {
      var cq = Math.min(1, dp / 0.2);
      ctx.fillStyle = 'rgba(255,244,214,' + (0.75 * cq) + ')'; rr(ctx, -hw + 4, -hh + 4, hw * 2 - 8, hh * 2 - 8, compact ? 6 : 10); ctx.fill();
      // compact 本體只有 34 高: 勾縮成半徑 13(本體內), 筆畫同比例縮
      var ck = compact ? 13 / 24 : 1;
      ctx.save(); ctx.scale(ck, ck);
      ctx.fillStyle = C.tutorDone; ctx.beginPath(); ctx.arc(0, 0, 24 * (0.6 + 0.4 * cq), 0, TAU); ctx.fill();
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.beginPath(); ctx.moveTo(-10, 1); ctx.lineTo(-3, 9); ctx.lineTo(11, -8); ctx.stroke();
      ctx.restore();
    }
    // 「新手任務」標籤: 本體左上角 72×18, 中心 (−110, −36), 一半露在本體上緣外; 琥珀底 + 深墨框字
    ctx.globalAlpha = clamp(alpha, 0, 1);
    // 大泡泡時標籤中心 (−160, −50); 一行小泡泡時 (−35, −17)(本體左緣內縮 4)
    var tgx = large ? -160 : compact ? -35 : -110, tgy = -hh;
    var gw = tv(36, 42), gh = tv(9, 11); // 觸控模式標籤 84×22(字級下限 17)
    if (compact && touchOn()) tgx = -hw + 4 + gw;
    ctx.fillStyle = C.tutorAccent; rr(ctx, tgx - gw, tgy - gh, gw * 2, gh * 2, 5); ctx.fill();
    ctx.strokeStyle = C.tutorInk; ctx.lineWidth = 1.5; rr(ctx, tgx - gw + 0.75, tgy - gh + 0.75, gw * 2 - 1.5, gh * 2 - 1.5, 4.5); ctx.stroke();
    txt(ctx, '新手任務', tgx, tgy + 0.5, { size: 12, color: C.tutorInk, maxW: gw * 2 - 8 });
    ctx.restore();
  }
  // 單位清單一項(階段 17): 中心 (cx, cy), w×26(預設 104): [單位小圖 22×22(和商店品項同一套)] + 打勾位 14×14; 不寫字
  function checkItemKit(ctx, cx, cy, c, w) {
    w = w || 104;
    var done = c.done === true, hw2 = w / 2;
    var kit = (c.item === 'crossbowKit' || c.item === 'soldierKit') ? c.item : '';
    ctx.save();
    ctx.fillStyle = done ? '#d4f2d2' : '#efe2bd'; rr(ctx, cx - hw2, cy - 13, w, 26, 7); ctx.fill();
    ctx.strokeStyle = done ? C.tutorDone : 'rgba(42,32,22,0.35)'; ctx.lineWidth = done ? 2 : 1;
    rr(ctx, cx - hw2 + ctx.lineWidth / 2, cy - 13 + ctx.lineWidth / 2, w - ctx.lineWidth, 26 - ctx.lineWidth, 6.5); ctx.stroke();
    ctx.save(); ctx.globalAlpha *= done ? 1 : 0.55;
    itemIcon(ctx, kit, cx - 14, cy, 22);
    ctx.restore();
    var kx = cx + 16;
    if (done) {
      ctx.fillStyle = C.tutorDone; ctx.beginPath(); ctx.arc(kx, cy, 7, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.beginPath(); ctx.moveTo(kx - 3.5, cy + 0.5); ctx.lineTo(kx - 1, cy + 3); ctx.lineTo(kx + 3.5, cy - 2.5); ctx.stroke();
    } else {
      // 還沒做到: 空的打勾位(虛線圓)
      ctx.strokeStyle = 'rgba(42,32,22,0.45)'; ctx.lineWidth = 1.2; ctx.setLineDash([2, 2]);
      ctx.beginPath(); ctx.arc(kx, cy, 6.4, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
    }
    ctx.restore();
  }
  // 檢查清單一項: 中心 (cx, cy), 88×26: [魂件 20] → [單位 20] (+ 完成勾 14)
  function unitMini(ctx, to, cx, cy) {
    ctx.save(); ctx.translate(cx, cy);
    if (to === 'crossbow') { ctx.scale(20 / 46, 20 / 46); crossbowBody(ctx, 0, false); }
    else if (to === 'soldier') { ctx.scale(0.62, 0.62); ctx.translate(0, -1.5); soldierBody(ctx, C.ally, C.allyDark, C.allyRim); }
    else { ctx.strokeStyle = 'rgba(42,32,22,0.4)'; ctx.setLineDash([2, 2]); ctx.lineWidth = 1; rr(ctx, -9.5, -9.5, 19, 19, 3); ctx.stroke(); }
    ctx.restore();
  }
  function checkItem(ctx, cx, cy, c) {
    var done = c.done === true;
    ctx.save();
    ctx.fillStyle = done ? '#d4f2d2' : '#efe2bd'; rr(ctx, cx - 44, cy - 13, 88, 26, 7); ctx.fill();
    ctx.strokeStyle = done ? C.tutorDone : 'rgba(42,32,22,0.35)'; ctx.lineWidth = done ? 2 : 1;
    rr(ctx, cx - 44 + ctx.lineWidth / 2, cy - 13 + ctx.lineWidth / 2, 88 - ctx.lineWidth, 26 - ctx.lineWidth, 6.5); ctx.stroke();
    ctx.globalAlpha *= done ? 1 : 0.5;
    var it = (c.item === 'pierce' || c.item === 'melee' || c.item === 'seek') ? c.item : null;
    if (it) itemIcon(ctx, it, cx - 30, cy, 20); else itemIcon(ctx, '', cx - 30, cy, 20);
    // 小箭頭 →
    ctx.strokeStyle = C.tutorInk; ctx.fillStyle = C.tutorInk; ctx.lineWidth = 1.8; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(cx - 17, cy); ctx.lineTo(cx - 9, cy); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx - 6, cy); ctx.lineTo(cx - 10, cy - 3.5); ctx.lineTo(cx - 10, cy + 3.5); ctx.closePath(); ctx.fill();
    unitMini(ctx, c.to === 'soldier' || c.to === 'crossbow' ? c.to : null, cx + 6, cy);
    ctx.restore();
    if (done) {
      // 完成勾 14×14, 項目右側
      ctx.save();
      ctx.fillStyle = C.tutorDone; ctx.beginPath(); ctx.arc(cx + 31, cy, 7, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.beginPath(); ctx.moveTo(cx + 27.5, cy + 0.5); ctx.lineTo(cx + 30, cy + 3); ctx.lineTo(cx + 34.5, cy - 2.5); ctx.stroke();
      ctx.restore();
    }
  }
  function slowMoRect(ctx, x, y, w, h, lx, ly, fs) {
    ctx.save();
    ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    ctx.globalCompositeOperation = 'saturation';
    ctx.fillStyle = 'rgba(128,128,128,0.7)'; ctx.fillRect(x, y, w, h);
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = 'rgba(40,90,170,0.18)'; ctx.fillRect(x, y, w, h);
    var g = ctx.createRadialGradient(x + w / 2, y + h / 2, Math.min(w, h) * 0.35, x + w / 2, y + h / 2, Math.max(w, h) * 0.7);
    g.addColorStop(0, 'rgba(0,10,30,0)'); g.addColorStop(1, 'rgba(0,10,30,0.55)');
    ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
    var bw = Math.max(3, Math.min(w, h) * 0.012);
    ctx.strokeStyle = C.slowmo; ctx.globalAlpha = 0.85; ctx.lineWidth = bw;
    ctx.strokeRect(x + bw / 2 + 2, y + bw / 2 + 2, w - bw - 4, h - bw - 4);
    ctx.globalAlpha = 1;
    txt(ctx, '慢動作', lx + fs * 0.5, ly, { size: fs, color: '#dff2ff', stroke: '#0a1a30', sw: Math.max(2, fs * 0.16) });
    ctx.fillStyle = '#dff2ff';
    var gx = lx - fs * 1.4;
    ctx.beginPath(); ctx.moveTo(gx - fs * 0.45, ly - fs * 0.35); ctx.lineTo(gx, ly); ctx.lineTo(gx - fs * 0.45, ly + fs * 0.35); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(gx, ly - fs * 0.35); ctx.lineTo(gx + fs * 0.45, ly); ctx.lineTo(gx, ly + fs * 0.35); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  function drawSlowMo(ctx) {
    ctx.save();
    slowMoRect(ctx, 0, 0, W, H, CX, 80, 26);
    ctx.restore();
  }
  function shakeOff(age, dur) {
    var p = prog(age, dur); if (p < 0) return 0;
    return Math.sin(p * PI * 6) * 6 * (1 - p);
  }
  function cursorFrame(ctx, cx, cy, w, h, r) {
    ctx.save();
    ctx.strokeStyle = C.cursor; ctx.lineWidth = 3;
    rr(ctx, cx - w / 2 - 2.5, cy - h / 2 - 2.5, w + 5, h + 5, r + 1); ctx.stroke();
    ctx.globalAlpha = 0.22 + 0.13 * Math.sin(now() * 8); ctx.fillStyle = C.cursor;
    rr(ctx, cx - w / 2, cy - h / 2, w, h, r); ctx.fill();
    ctx.restore();
  }
  // mode: 'slot'(魂件格)| 'hand'(手上格)
  function popupCell(ctx, cx, cy, item, focused, mode, locked) {
    ctx.save();
    ctx.fillStyle = mode === 'hand' ? '#3a3326' : '#0f131c'; rr(ctx, cx - 20, cy - 20, 40, 40, 5); ctx.fill();
    ctx.strokeStyle = mode === 'hand' ? 'rgba(255,210,120,0.6)' : 'rgba(255,255,255,0.25)'; ctx.lineWidth = 1;
    rr(ctx, cx - 19.5, cy - 19.5, 39, 39, 5); ctx.stroke();
    if (typeof item === 'string' && item) itemIcon(ctx, item, cx, cy, 30);
    else if (mode !== 'hand') {
      ctx.strokeStyle = 'rgba(220,225,235,0.4)'; ctx.setLineDash([3, 3]);
      rr(ctx, cx - 13, cy - 13, 26, 26, 3); ctx.stroke(); ctx.setLineDash([]);
    }
    if (locked) cellLock(ctx, cx, cy, 5);
    if (focused) cursorFrame(ctx, cx, cy, 40, 40, 5);
    ctx.restore();
  }
  // 教學鎖住的格子: 整格壓暗 + 右下角小鎖頭 16×16(格內)
  function cellLock(ctx, cx, cy, r) {
    ctx.fillStyle = 'rgba(6,8,14,0.6)'; rr(ctx, cx - 20, cy - 20, 40, 40, r); ctx.fill();
    ctx.fillStyle = 'rgba(10,12,18,0.9)'; rr(ctx, cx + 3, cy + 3, 16, 16, 4); ctx.fill();
    lockGlyph(ctx, cx + 11, cy + 11.5, 13, '#e6d6b0');
  }
  function hammerGlyph(ctx, cx, cy) {
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(-PI / 4);
    ctx.fillStyle = '#7a4e26'; rr(ctx, -2, -3, 4, 17, 1.5); ctx.fill();
    ctx.fillStyle = '#4a4f5c'; rr(ctx, -9, -11, 18, 9, 2); ctx.fill();
    ctx.fillStyle = '#9aa0ae'; rr(ctx, -8, -10, 16, 3, 1.5); ctx.fill();
    ctx.restore();
    // 碎塊(拆掉)
    ctx.fillStyle = '#9aa0ae';
    ctx.fillRect(cx + 6, cy + 7, 3, 3); ctx.fillRect(cx + 10, cy + 3, 2.5, 2.5); ctx.fillRect(cx - 11, cy + 8, 3, 2.5);
  }
  // 選項格: 暖褐底 + 大圓角 + 實線淡金框(魂件格是深藍黑底、小圓角); 下方一行小字
  function optionCell(ctx, cx, cy, cell, focused) {
    ctx.save();
    ctx.fillStyle = C.optionCell; rr(ctx, cx - 20, cy - 20, 40, 40, 11); ctx.fill();
    ctx.strokeStyle = 'rgba(255,214,150,0.55)'; ctx.lineWidth = 1.5; rr(ctx, cx - 19.25, cy - 19.25, 38.5, 38.5, 10.5); ctx.stroke();
    var label;
    if (cell.type === 'demolish') {
      hammerGlyph(ctx, cx, cy - 1);
      label = '+' + Math.max(0, Math.floor(num(cell.refund, 0))) + ' 金';
    } else {
      flagShape(ctx, cx - 5, cy + 14, 0.7, { noShadow: true });
      label = '移防';
    }
    if (cell.locked) cellLock(ctx, cx, cy, 11);
    if (focused) cursorFrame(ctx, cx, cy, 40, 40, 11);
    txt(ctx, label, cx, -2, { size: 11, color: cell.type === 'demolish' ? C.gold : '#ffd9a0', maxW: 46 });
    ctx.restore();
  }
  function normCell(c) {
    if (c && typeof c === 'object') {
      var lk = c.locked === true;
      if (c.type === 'demolish') return { type: 'demolish', refund: c.refund, locked: lk };
      if (c.type === 'rally') return { type: 'rally', locked: lk };
      return { type: 'slot', item: typeof c.item === 'string' ? c.item : null, locked: lk };
    }
    if (typeof c === 'string') return { type: 'slot', item: c };
    return { type: 'slot', item: null };
  }
  function drawSoulPopup(ctx, s) {
    s = s || {};
    var cells = arr(s.cells).slice(0, 4).map(normCell);
    if (!cells.length) cells = [{ type: 'slot', item: null }];
    var replace = s.mode === 'replace';
    var x = num(s.x, CX) + shakeOff(s.shakeAge, num(s.shakeDuration, 0.25)), y = num(s.y, CY);
    var idx = Math.floor(num(s.index, 0));
    ctx.save(); ctx.translate(x, y);
    // 觸控模式: 整個彈窗以 (x, y) 為中心放大 1.5 倍(字、魂件圖示、鍵帽一起放大到下限以上); game.js 的版位照同一倍數算
    var K = tv(1, 1.5); ctx.scale(K, K); FZK = K;
    // 面板 320×180: menu = 深藍底藍灰細邊; replace = 暗褐底橘粗邊
    ctx.fillStyle = replace ? '#2a2220' : C.panel; rr(ctx, -160, -90, 320, 180, 10); ctx.fill();
    var bw = replace ? 3 : 2;
    ctx.strokeStyle = replace ? C.swap : '#4a5670'; ctx.lineWidth = bw;
    rr(ctx, -160 + bw / 2, -90 + bw / 2, 320 - bw, 180 - bw, 9); ctx.stroke();
    txt(ctx, str(s.title), 0, -70, { size: 15, maxW: 200, color: replace ? '#ffd2b0' : C.text });
    for (var i = 0; i < cells.length; i++) {
      var cx = -120 + 48 * i, c = cells[i];
      if (c.type === 'slot') popupCell(ctx, cx, -30, c.item, i === idx, 'slot', c.locked);
      else optionCell(ctx, cx, -30, c, i === idx);
    }
    // 分隔 x = 70: menu = 細線; replace = 橘色雙向互換箭頭
    if (replace) {
      ctx.strokeStyle = C.swap; ctx.fillStyle = C.swap; ctx.lineWidth = 2; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(64, -35); ctx.lineTo(76, -35); ctx.moveTo(64, -25); ctx.lineTo(76, -25); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(79, -35); ctx.lineTo(74, -39); ctx.lineTo(74, -31); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(61, -25); ctx.lineTo(66, -29); ctx.lineTo(66, -21); ctx.closePath(); ctx.fill();
    } else {
      ctx.strokeStyle = 'rgba(255,255,255,0.2)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(70, -54); ctx.lineTo(70, -6); ctx.stroke();
    }
    txt(ctx, '手上', 116, -58, { size: 11, color: '#ffd28a', weight: 'normal' });
    popupCell(ctx, 116, -30, replace ? s.hand : null, false, 'hand');
    // 說明區 x −148~148、y 10~62(比面板亮一階的底板)
    ctx.fillStyle = replace ? '#3a302a' : C.descPanel; rr(ctx, -148, 10, 296, 52, 6); ctx.fill();
    var desc = s.desc;
    if (desc && typeof desc === 'object') {
      var mats = arr(desc.materials).filter(isBasic).slice(0, 2);
      var alt = mats.length === 2 && isBasic(desc.alt) ? desc.alt : null;
      // 由右往左排: [A] + [B]( / [alt]); 每個圖示 16, 符號寬 8, 間距 4
      var matW = mats.length === 2 ? 16 + 4 + 8 + 4 + 16 + (alt ? 4 + 8 + 4 + 16 : 0) : 0;
      txt(ctx, str(desc.name), -140, 24, { size: 15, align: 'left', color: '#ffffff', maxW: 280 - matW - 8 });
      if (mats.length === 2) {
        var mx = 140 - matW;
        itemIcon(ctx, mats[0], mx + 8, 24, 16); mx += 16 + 4;
        txt(ctx, '+', mx + 4, 24.5, { size: 13, color: C.textDim }); mx += 8 + 4;
        itemIcon(ctx, mats[1], mx + 8, 24, 16); mx += 16;
        if (alt) {
          mx += 4;
          txt(ctx, '/', mx + 4, 24.5, { size: 13, color: C.textDim }); mx += 8 + 4;
          itemIcon(ctx, alt, mx + 8, 24, 16);
        }
      }
      var dt = str(desc.text), dfs = textW(ctx, dt, 15, 'normal') > 280 ? 14 : 15;
      txt(ctx, dt, -140, 48, { size: dfs, align: 'left', color: '#d6dbe6', weight: 'normal', maxW: 280 });
    }
    // 底部 y = 78
    var al = str(s.actionLabel);
    var curLocked = cells[idx] && cells[idx].locked;
    var grey = al === '教學期間不可操作' || al === '教學中不能動' || curLocked;
    if (al) txt(ctx, al, -148, 78, { size: 14, align: 'left', color: grey ? '#8a909e' : C.cursor, maxW: 120 });
    hintRow(ctx, [{ keys: ['z'], label: '確定' }, { keys: ['x'], label: '關閉' }], 148, 78, { align: 'right', size: 12, gap: 12 });
    FZK = 1;
    ctx.restore();
  }
  // 鎖頭: 外接框約 s × s(鎖環頂 cy − 0.45s、鎖身底 cy + 0.5s)
  function lockGlyph(ctx, cx, cy, s, col) {
    col = col || '#9aa0ae';
    ctx.strokeStyle = col; ctx.lineWidth = s * 0.16;
    ctx.beginPath(); ctx.arc(cx, cy - s * 0.15, s * 0.3, PI, 0); ctx.stroke();
    ctx.fillStyle = col; rr(ctx, cx - s * 0.45, cy - s * 0.15, s * 0.9, s * 0.65, s * 0.1); ctx.fill();
    ctx.fillStyle = '#2a2f3a'; ctx.beginPath(); ctx.arc(cx, cy + s * 0.12, s * 0.09, 0, TAU); ctx.fill();
  }
  function shopCell(ctx, cx, cy, it, focused) {
    it = it || {};
    var st = ({ ok: 1, poor: 1, max: 1, locked: 1 }[it.state]) ? it.state : 'ok';
    var locked = st === 'locked';
    ctx.save();
    // locked(教學鎖住): 底更黑、內容 0.22(poor / max 是 0.4), 中央偏上一個 20×20 鎖頭
    ctx.fillStyle = locked ? '#0b0e15' : focused ? '#323c52' : '#151a26'; rr(ctx, cx - 40, cy - 36, 80, 72, 6); ctx.fill();
    if (locked && focused) { ctx.fillStyle = 'rgba(80,90,110,0.35)'; rr(ctx, cx - 40, cy - 36, 80, 72, 6); ctx.fill(); }
    ctx.strokeStyle = locked ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.18)'; ctx.lineWidth = 1; ctx.setLineDash(locked ? [3, 3] : []);
    rr(ctx, cx - 39.5, cy - 35.5, 79, 71, 6); ctx.stroke(); ctx.setLineDash([]);
    ctx.globalAlpha = locked ? 0.22 : (st === 'poor' || st === 'max') ? 0.4 : 1;
    itemIcon(ctx, it.item, cx, cy - 14, 28);
    ctx.globalAlpha = locked ? 0.45 : (st === 'poor' || st === 'max') ? 0.4 : 1;
    txt(ctx, str(it.name), cx, cy + 10, { size: 12, color: C.text, maxW: 74 });
    ctx.globalAlpha = 1;
    if (locked) {
      ctx.fillStyle = 'rgba(10,12,18,0.85)'; ctx.beginPath(); ctx.arc(cx, cy - 14, 14, 0, TAU); ctx.fill();
      lockGlyph(ctx, cx, cy - 14.5, 20, '#e6d6b0');
    }
    // 已有 / 上限(只有魂柱): 格內右上角, 中心 (格 x + 24, −32)
    if (it.count != null && it.cap != null && isFinite(+it.count) && isFinite(+it.cap)) {
      txt(ctx, Math.floor(+it.count) + '/' + Math.floor(+it.cap), cx + 24, cy - 28, { size: 11, color: st === 'max' ? '#ff6a5a' : '#d6dbe6', maxW: 28 });
    }
    var price = Math.floor(num(it.price, 0));
    if (locked) ctx.globalAlpha = 0.45;
    coinGlyph(ctx, cx - 12, cy + 26, 5);
    txt(ctx, String(price), cx - 4, cy + 26.5, { size: 13, align: 'left', color: st === 'poor' ? '#ff6a5a' : st === 'max' || locked ? '#8a909e' : C.gold, maxW: 40 });
    ctx.globalAlpha = 1;
    if (focused) {
      ctx.strokeStyle = C.cursor; ctx.lineWidth = 3; rr(ctx, cx - 42.5, cy - 38.5, 85, 77, 8); ctx.stroke();
    }
    ctx.restore();
  }
  function drawShopPopup(ctx, s) {
    s = s || {};
    var items = arr(s.items).slice(0, 4), cur = Math.floor(num(s.cursorIndex, 0));
    var x = CX + shakeOff(s.shakeAge, num(s.shakeDuration, 0.25)), y = 320; // 第 13 輪: 中心 (512,320)
    ctx.save(); ctx.translate(x, y);
    // 觸控模式: 整個商店以中心放大 1.4 倍(品名、價格、魂柱數量、鍵帽一起放大到下限以上); game.js 的教學泡泡版位照同一倍數算
    var K = tv(1, 1.4); ctx.scale(K, K); FZK = K;
    ctx.fillStyle = C.panel; rr(ctx, -240, -75, 480, 150, 12); ctx.fill();
    ctx.strokeStyle = '#6a5a3a'; ctx.lineWidth = 2; rr(ctx, -239, -74, 478, 148, 11); ctx.stroke();
    txt(ctx, '商店', 0, -58, { size: 15, color: '#ffd28a' });
    // 只列已解鎖的品項(3~4 格), 整排置中: 第 i 格中心 x = (i − (n−1)/2) × 88
    var n = items.length;
    for (var i = 0; i < n; i++) shopCell(ctx, (i - (n - 1) / 2) * 88, -4, items[i], i === cur);
    var msg = str(s.message);
    if (msg) txt(ctx, msg, -228, 58, { size: 13, align: 'left', color: msg === '教學期間不能買' ? '#ffb060' : '#ff7a6a', maxW: 160 });
    hintRow(ctx, [{ keys: ['left', 'right'], label: '選' }, { keys: ['z'], label: '購買' }, { keys: ['x'], label: '關閉' }], 228, 58, { align: 'right', size: 12, gap: 12 });
    FZK = 1;
    ctx.restore();
  }
  // ---------- 結算畫面 ----------
  function button(ctx, cx, cy, w, h, label, focused) {
    ctx.save();
    if (focused) {
      ctx.fillStyle = 'rgba(255,210,74,0.25)'; rr(ctx, cx - w / 2 - 5, cy - h / 2 - 5, w + 10, h + 10, 12); ctx.fill();
    }
    ctx.fillStyle = focused ? C.gold : '#2a3244'; rr(ctx, cx - w / 2, cy - h / 2, w, h, 9); ctx.fill();
    ctx.strokeStyle = focused ? '#fff2b0' : '#4a5670'; ctx.lineWidth = focused ? 3 : 1.5;
    rr(ctx, cx - w / 2 + ctx.lineWidth / 2, cy - h / 2 + ctx.lineWidth / 2, w - ctx.lineWidth, h - ctx.lineWidth, 8); ctx.stroke();
    txt(ctx, label, cx, cy + 1, { size: 20, color: focused ? '#1e1606' : C.text, maxW: w - 16 });
    ctx.restore();
  }
  function drawResult(ctx, s) {
    s = s || {};
    var win = bool(s.win);
    ctx.save();
    // 第 13 輪: 面板 680×440 中心 (512,288)(x 172~852、y 68~508); 半透明底畫滿 x −160~1184
    ctx.fillStyle = 'rgba(8,10,18,0.72)'; ctx.fillRect(FX0, 0, FW, H);
    ctx.fillStyle = C.panel; rr(ctx, CX - 340, 68, 680, 440, 18); ctx.fill();
    ctx.strokeStyle = win ? C.gold : '#ff5a5a'; ctx.lineWidth = 3; rr(ctx, CX - 338.5, 69.5, 677, 437, 17); ctx.stroke();
    // 第 14 輪: 不評星; 第 4 關勝利改由 drawAllClear 畫, 這裡的勝利一律寫「勝利」
    var title = win ? '勝利' : '主堡被攻陷';
    txt(ctx, title, CX, 118, { size: 44, color: win ? C.gold : '#ff6a6a', stroke: '#000', sw: 4 });
    var lv = clamp(Math.floor(num(s.level, 1)), 1, 4);
    txt(ctx, '第 ' + lv + ' 關  ' + str(s.levelName), CX, 163, { size: 20, color: C.textDim, maxW: 600 });
    // 分隔線 y 200(寬 540, 淡金)
    ctx.strokeStyle = win ? 'rgba(255,210,74,0.35)' : 'rgba(255,106,106,0.35)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(CX - 270, 200); ctx.lineTo(CX + 270, 200); ctx.stroke();
    // 數據兩行上移到 250 / 300(補星星的空位), 24px
    var w = Math.max(0, Math.floor(num(s.wave, 0))), tw = Math.max(1, Math.floor(num(s.totalWaves, 4)));
    var hp = Math.max(0, Math.ceil(num(s.castleHp, 0))), mhp = Math.max(1, Math.floor(num(s.castleMaxHp, 20)));
    txt(ctx, '第 ' + w + ' / ' + tw + ' 波     主堡 ' + hp + ' / ' + mhp, CX, 250, { size: 24, maxW: 620 });
    var cc = clamp(Math.floor(num(s.comboCount, 0)), 0, 10);
    txt(ctx, '發現組合 ' + cc + ' / 10', CX, 300, { size: 24, color: '#ffd28a' });
    var opts = arr(s.options).slice(0, 3).map(str);
    if (!opts.length) opts = win ? ['繼續', '重玩'] : ['重來', '關卡預覽'];
    var cur = Math.floor(num(s.cursorIndex, 0));
    var bx0 = CX - ((opts.length - 1) * 190) / 2;
    for (var i = 0; i < opts.length; i++) button(ctx, bx0 + 190 * i, 428, 170, 50, opts[i], i === cur);
    hintRow(ctx, [{ keys: ['left', 'right'], label: '選' }, { keys: ['z'], label: '確定' }], CX, 478, { align: 'center', size: 15, gap: 18 });
    ctx.restore();
  }

  // ---------- 恭喜過關(第 14 輪, 第 4 關勝利) + 勳章授予演出 ----------
  // 全部只看 age(真實秒數): 同一個 age 畫出同一個樣子, 跳過時 age 直接設成 4.4 也能畫出完整結束狀態
  function easeOut(p) { p = clamp(p, 0, 1); return 1 - (1 - p) * (1 - p) * (1 - p); }
  function easeInOut(p) { p = clamp(p, 0, 1); return p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2; }
  var AC_MEDAL_Y0 = 260, AC_MEDAL_Y1 = 74, AC_R0 = 70, AC_R1 = 38.5;
  var AC_CELLS = [[372, 246], [652, 246], [372, 302], [652, 302], [512, 358]];
  var AC_LABELS = ['總遊玩時間', '挑戰次數', '擊倒敵人', '發現組合', '最後一戰主堡'];
  // 四角小十字閃光(中心 x, y, 半臂長 r)
  function sparkle(ctx, x, y, r) {
    var t = r * 0.18;
    ctx.beginPath();
    ctx.moveTo(x, y - r);
    ctx.quadraticCurveTo(x + t, y - t, x + r, y);
    ctx.quadraticCurveTo(x + t, y + t, x, y + r);
    ctx.quadraticCurveTo(x - t, y + t, x - r, y);
    ctx.quadraticCurveTo(x - t, y - t, x, y - r);
    ctx.closePath(); ctx.fill();
  }
  function thousands(n) {
    var s = String(Math.max(0, Math.floor(n)));
    return s.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }
  // 勳章: 中心 (0,0), 半徑 R; face = 水平縮放(負 = 背面); sheen = 反光進度 0~1(−1 不畫); ribbonA = 緞帶不透明度
  function medal(ctx, R, face, sheen, ribbonA) {
    var sx = Math.max(0.04, Math.abs(face)), back = face < 0;
    ctx.save(); ctx.scale(sx, 1);
    if (ribbonA > 0) {
      // 藍(左)、紅(右)兩條緞帶, 從勳章底往外下垂到 y + 1.85R
      ctx.save(); ctx.globalAlpha *= ribbonA;
      var rw = R * 0.42, bot = R * 1.85;
      var rib = [[-1, C.ally, C.allyDark], [1, '#d8433f', '#7e1a22']];
      for (var k = 0; k < 2; k++) {
        var d = rib[k][0];
        ctx.fillStyle = rib[k][2];
        ctx.beginPath();
        ctx.moveTo(d * R * 0.05, R * 0.55); ctx.lineTo(d * (R * 0.05 + rw), R * 0.45);
        ctx.lineTo(d * (R * 0.32 + rw), bot); ctx.lineTo(d * (R * 0.32 + rw * 0.5), bot - R * 0.22); ctx.lineTo(d * R * 0.32, bot);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = rib[k][1];
        ctx.beginPath();
        ctx.moveTo(d * R * 0.1, R * 0.55); ctx.lineTo(d * (R * 0.05 + rw * 0.85), R * 0.47);
        ctx.lineTo(d * (R * 0.32 + rw * 0.85), bot - R * 0.06); ctx.lineTo(d * (R * 0.32 + rw * 0.5), bot - R * 0.28); ctx.lineTo(d * R * 0.37, bot - R * 0.06);
        ctx.closePath(); ctx.fill();
      }
      ctx.restore();
    }
    // 外圈深金 + 內盤
    ctx.fillStyle = back ? '#6a4400' : '#8a5a00'; ctx.beginPath(); ctx.arc(0, 0, R, 0, TAU); ctx.fill();
    if (back) {
      ctx.fillStyle = '#b8862a'; ctx.beginPath(); ctx.arc(0, 0, R * 0.88, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#7a5210'; ctx.lineWidth = Math.max(1, R * 0.03); ctx.beginPath(); ctx.arc(0, 0, R * 0.74, 0, TAU); ctx.stroke();
      ctx.restore();
      return;
    }
    var g = ctx.createLinearGradient(-R * 0.6, -R * 0.8, R * 0.6, R * 0.8);
    g.addColorStop(0, '#fff2a8'); g.addColorStop(0.5, '#ffd24a'); g.addColorStop(1, '#d99a18');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, R * 0.88, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#8a5a00'; ctx.lineWidth = Math.max(1, R * 0.03); ctx.beginPath(); ctx.arc(0, 0, R * 0.74, 0, TAU); ctx.stroke();
    // 中央城堡剪影(城垛)+ 拱門 + 城頂小旗
    var u = R / 70;
    ctx.save(); ctx.scale(u, u);
    ctx.fillStyle = '#7a4e00';
    ctx.fillRect(-30, -6, 60, 34);                      // 城牆
    ctx.fillRect(-36, -22, 18, 50); ctx.fillRect(18, -22, 18, 50);   // 左右塔
    ctx.fillRect(-9, -30, 18, 24);                      // 中塔
    for (var c = 0; c < 3; c++) {                        // 城垛
      ctx.fillRect(-36 + c * 6.5, -28, 4.5, 6); ctx.fillRect(18 + c * 6.5, -28, 4.5, 6);
    }
    ctx.fillRect(-9, -36, 4.5, 6); ctx.fillRect(-2.25, -36, 4.5, 6); ctx.fillRect(4.5, -36, 4.5, 6);
    ctx.fillStyle = '#ffe58a';                          // 拱門(盤面亮金挖出)
    ctx.beginPath(); ctx.moveTo(-8, 28); ctx.lineTo(-8, 14); ctx.arc(0, 14, 8, PI, 0); ctx.lineTo(8, 28); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#7a4e00'; ctx.lineWidth = 2; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, -36); ctx.lineTo(0, -52); ctx.stroke();   // 旗桿
    ctx.fillStyle = '#d8433f';
    ctx.beginPath(); ctx.moveTo(1, -52); ctx.lineTo(15, -47.5); ctx.lineTo(1, -43); ctx.closePath(); ctx.fill();
    ctx.restore();
    // 反光: 一道白色斜帶從左上掃到右下, 裁在內盤內
    if (sheen >= 0 && sheen < 1) {
      ctx.save();
      ctx.beginPath(); ctx.arc(0, 0, R * 0.88, 0, TAU); ctx.clip();
      ctx.rotate(-0.6);
      var bx = -1.5 * R + 3 * R * easeInOut(sheen), bw = R * 0.36;
      var sg = ctx.createLinearGradient(bx - bw, 0, bx + bw, 0);
      sg.addColorStop(0, 'rgba(255,255,255,0)'); sg.addColorStop(0.5, 'rgba(255,255,255,0.75)'); sg.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = sg; ctx.fillRect(bx - bw, -R, bw * 2, R * 2);
      ctx.restore();
    }
    ctx.restore();
  }
  function drawAllClear(ctx, s) {
    s = s || {};
    // age 缺漏時當成結束狀態(看得到完整畫面, 不會卡在全黑)
    var age = Math.max(0, num(s.age, 4.4));
    var st = s.stats && typeof s.stats === 'object' ? s.stats : {};
    ctx.save();
    // 0~0.4 壓暗 0 → 0.75(黑藍), 不受震動影響
    ctx.fillStyle = 'rgba(6,10,26,' + (0.75 * clamp(age / 0.4, 0, 1)) + ')'; ctx.fillRect(FX0, 0, FW, H);
    ctx.save();
    ctx.beginPath(); ctx.rect(FX0, 0, FW, H); ctx.clip();
    // 1.1 落定的震動(9px, 0.3 秒線性衰減)
    if (age >= 1.1 && age < 1.4) {
      var amp = 9 * (1 - (age - 1.1) / 0.3), f = Math.floor(age * 60);
      ctx.translate((hash(f, 1, 7) * 2 - 1) * amp, (hash(f, 2, 7) * 2 - 1) * amp);
    }
    // 勳章位置與大小
    var my = AC_MEDAL_Y0, R = AC_R0, face = 1;
    if (age < 1.1) {
      var e0 = easeOut(age / 1.1);
      R = AC_R0 * (0.25 + 0.75 * e0); face = Math.cos((1 - e0) * 7 * PI);
    } else if (age < 2.25) {
      var m = easeInOut((age - 1.7) / 0.55);
      my = AC_MEDAL_Y0 + (AC_MEDAL_Y1 - AC_MEDAL_Y0) * m; R = AC_R0 * (1 - 0.45 * m);
    } else { my = AC_MEDAL_Y1; R = AC_R1; }
    // 背後金色光芒: 0.6 起 0.5 秒淡入到 0.35, 1.7 起隨勳章上移淡掉, 2.25 消失
    if (age >= 0.6 && age < 2.25) {
      var ra = 0.35 * clamp((age - 0.6) / 0.5, 0, 1) * (age > 1.7 ? 1 - (age - 1.7) / 0.55 : 1);
      if (ra > 0) {
        ctx.save(); ctx.translate(CX, my); ctx.rotate(-0.3 * age);
        ctx.fillStyle = 'rgba(255,210,74,' + ra + ')';
        for (var i = 0; i < 14; i++) {
          var a = i * TAU / 14;
          ctx.beginPath(); ctx.moveTo(0, 0);
          ctx.lineTo(Math.cos(a - 0.07) * 420, Math.sin(a - 0.07) * 420); ctx.lineTo(Math.cos(a + 0.07) * 420, Math.sin(a + 0.07) * 420);
          ctx.closePath(); ctx.fill();
        }
        ctx.restore();
      }
    }
    // 面板: 1.85~2.3 以上緣 y 68 為軸縱向展開(和 drawResult 同一款: 深底 + 3px 金框畫在邊內側)
    if (age >= 1.85) {
      var pq = easeOut((age - 1.85) / 0.45);
      if (pq > 0.001) {
        ctx.save(); ctx.translate(0, 68); ctx.scale(1, pq); ctx.translate(0, -68);
        ctx.fillStyle = C.panel; rr(ctx, CX - 340, 68, 680, 440, 18); ctx.fill();
        ctx.strokeStyle = C.gold; ctx.lineWidth = 3; rr(ctx, CX - 338.5, 69.5, 677, 437, 17); ctx.stroke();
        ctx.restore();
      }
    }
    // 標題 2.25~2.6 淡入, y 160 → 150
    if (age >= 2.25) {
      var tq = clamp((age - 2.25) / 0.35, 0, 1);
      ctx.save(); ctx.globalAlpha = tq;
      ctx.shadowColor = 'rgba(255,210,74,0.8)'; ctx.shadowBlur = 18;
      txt(ctx, '恭喜過關', CX, 160 - 10 * easeOut(tq), { size: 48, color: C.gold, stroke: '#000', sw: 5 });
      ctx.restore();
    }
    // 分隔線 2.45~2.85 從中心往兩邊拉開到 540
    if (age >= 2.45) {
      var hw = 270 * easeOut((age - 2.45) / 0.4);
      ctx.strokeStyle = 'rgba(255,210,74,0.45)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(CX - hw, 200); ctx.lineTo(CX + hw, 200); ctx.stroke();
    }
    // 五格統計: 第 i 格 2.6 + 0.22i 起 0.3 秒淡入上浮 12; 數字 +0.1 起 0.8 秒從 0 跳到最終值
    var playSec = Math.max(0, Math.floor(num(st.playSec, 0)));
    var attempts = Math.max(0, Math.floor(num(st.attempts, 0))), fails = Math.max(0, Math.floor(num(st.fails, 0)));
    var kills = Math.max(0, Math.floor(num(st.kills, 0)));
    var combo = clamp(Math.floor(num(st.comboCount, 0)), 0, 10);
    var chp = Math.max(0, Math.floor(num(st.castleHp, 0))), cmhp = Math.max(1, Math.floor(num(st.castleMaxHp, 20)));
    var finals = [playSec, attempts, kills, combo, chp];
    for (var ci = 0; ci < 5; ci++) {
      var t0 = 2.6 + 0.22 * ci;
      if (age < t0) continue;
      var aq = clamp((age - t0) / 0.3, 0, 1), nq = clamp((age - t0 - 0.1) / 0.8, 0, 1);
      var rolling = nq > 0 && nq < 1;
      var v = nq >= 1 ? finals[ci] : Math.round(finals[ci] * easeOut(nq));
      var vs;
      if (ci === 0) { var ss = v % 60; vs = Math.floor(v / 60) + ' 分 ' + (ss < 10 ? '0' : '') + ss + ' 秒'; }
      else if (ci === 1) vs = v + ' 次(失敗 ' + fails + ')';
      else if (ci === 2) vs = thousands(v);
      else if (ci === 3) vs = v + ' / 10';
      else vs = v + ' / ' + cmhp;
      var cx = AC_CELLS[ci][0], cy = AC_CELLS[ci][1] + 12 * (1 - easeOut(aq));
      ctx.save(); ctx.globalAlpha = aq;
      ctx.fillStyle = 'rgba(255,255,255,0.06)'; rr(ctx, cx - 130, cy - 23, 260, 46, 10); ctx.fill();
      ctx.strokeStyle = 'rgba(255,210,74,0.28)'; ctx.lineWidth = 1; rr(ctx, cx - 129.5, cy - 22.5, 259, 45, 9.5); ctx.stroke();
      txt(ctx, AC_LABELS[ci], cx - 114, cy + 0.5, { size: 18, align: 'left', color: C.textDim, weight: 'normal' });
      // 數值右對齊在格右緣 −16, 寬至多 140(且不碰標籤); 放不下就降字級, 不換行
      var lw = textW(ctx, AC_LABELS[ci], 18, 'normal');
      var maxW = Math.min(140, 228 - lw - 10), fs = 23;
      while (fs > 12 && textW(ctx, vs, fs, 'bold') > maxW) fs--;
      txt(ctx, vs, cx + 114, cy + 0.5, { size: fs, align: 'right', color: rolling ? '#ffffff' : '#ffd28a', maxW: maxW });
      ctx.restore();
    }
    // 按鈕與按鍵提示: 4.0~4.35 淡入、從下方 10px 上浮
    if (age >= 4.0) {
      var bq = clamp((age - 4.0) / 0.35, 0, 1), bdy = 10 * (1 - easeOut(bq));
      var opts = arr(s.options).slice(0, 2).map(str);
      if (opts.length !== 2) opts = ['繼續', '重玩'];
      var cur = Math.floor(num(s.cursorIndex, 0));
      ctx.save(); ctx.globalAlpha = bq;
      button(ctx, 417, 428 + bdy, 170, 50, opts[0], cur === 0);
      button(ctx, 607, 428 + bdy, 170, 50, opts[1], cur === 1);
      hintRow(ctx, [{ keys: ['left', 'right'], label: '選' }, { keys: ['z'], label: '確定' }], CX, 478 + bdy, { align: 'center', size: 15, gap: 18 });
      ctx.restore();
    }
    // 勳章(畫在面板之上); 緞帶 1.7~2.0 淡出
    var ribA = age < 1.7 ? 1 : age < 2.0 ? 1 - (age - 1.7) / 0.3 : 0;
    var sheen = -1;
    if (age >= 1.1 && age < 1.7) sheen = (age - 1.1) / 0.6;
    else if (age >= 2.4) { var sl = (age - 2.4) % 3; if (sl < 0.7) sheen = sl / 0.7; }
    ctx.save(); ctx.translate(CX, my); medal(ctx, R, face, sheen, ribA); ctx.restore();
    // 落定的金色衝擊環: 半徑(中線)70 → 330, 線寬 7 → 1, 0.5 秒
    if (age >= 1.1 && age < 1.6) {
      var wq = (age - 1.1) / 0.5, wr = 70 + 260 * easeOut(wq);
      ctx.strokeStyle = 'rgba(255,214,90,' + (0.9 * (1 - wq)) + ')'; ctx.lineWidth = 7 - 6 * wq;
      ctx.beginPath(); ctx.arc(CX, AC_MEDAL_Y0, wr, 0, TAU); ctx.stroke();
    }
    // 金粉 110 顆: 從勳章周圍 60 處往外炸(速度 120~460, 阻尼 + 微重力, 壽命 0.9~1.7 秒, 越來越小)
    if (age >= 1.1 && age < 2.8) {
      var pt = age - 1.1;
      for (var pi = 0; pi < 110; pi++) {
        var life = 0.9 + 0.8 * hash(pi, 3, 11);
        if (pt >= life) continue;
        var an = hash(pi, 1, 11) * TAU, sp = 120 + 340 * hash(pi, 2, 11), k = 2.4;
        var dist = 60 + sp * (1 - Math.exp(-k * pt)) / k;
        var px = CX + Math.cos(an) * dist, py = AC_MEDAL_Y0 + Math.sin(an) * dist + 0.5 * 150 * pt * pt;
        var ps = (1.6 + 1.8 * hash(pi, 4, 11)) * (1 - pt / life);
        ctx.fillStyle = hash(pi, 5, 11) < 0.35 ? '#fff6d0' : C.gold;
        if (pi % 3 === 0) sparkle(ctx, px, py, ps * 2.2);
        else { ctx.beginPath(); ctx.arc(px, py, ps, 0, TAU); ctx.fill(); }
      }
    }
    // 2.4 起勳章周圍持續冒小閃光(每秒約 5 個, 壽命 0.6~1.1 秒, 橢圓環 水平 44~70 / 垂直 30~56)
    if (age >= 2.4) {
      var jHi = Math.floor((age - 2.4) / 0.2), jLo = Math.max(0, jHi - 6);
      for (var j = jLo; j <= jHi; j++) {
        var sl2 = 0.6 + 0.5 * hash(j, 1, 23), lt = age - (2.4 + 0.2 * j);
        if (lt < 0 || lt >= sl2) continue;
        var sa = hash(j, 2, 23) * TAU, rq = hash(j, 3, 23);
        var sx2 = CX + Math.cos(sa) * (44 + 26 * rq), sy2 = AC_MEDAL_Y1 + Math.sin(sa) * (30 + 26 * rq);
        ctx.save(); ctx.globalAlpha = Math.sin(PI * lt / sl2);
        ctx.fillStyle = '#fff3c0'; sparkle(ctx, sx2, sy2, 3 + 3 * hash(j, 4, 23));
        ctx.restore();
      }
    }
    ctx.restore();
    // 1.1 落定的全畫面白閃(0.6 → 0, 0.3 秒), 不受震動影響
    if (age >= 1.1 && age < 1.4) {
      ctx.fillStyle = 'rgba(255,255,255,' + (0.6 * (1 - (age - 1.1) / 0.3)) + ')'; ctx.fillRect(FX0, 0, FW, H);
    }
    ctx.restore();
  }

  // ---------- 開始畫面(關卡預覽頁) ----------
  // 第 13 輪: 背景用第 4 關三叉路線(1024×576 新版; 主堡 (900,336), 末段畫到 x 1184 讓背景右側不斷)
  var TITLE_PATHS = [
    [[0, 144], [432, 144], [432, 336], [576, 336], [576, 528], [720, 528], [720, 336], [900, 336], [1184, 336]],
    [[0, 336], [576, 336]],
    [[0, 528], [432, 528], [432, 336]]
  ];
  // 第 13 輪: 4 張卡片, 中心 x = 152 + 240i(整排 x 52~972)、y 330; 記號 y 227
  var TITLE_N = 4, TITLE_X0 = 152, TITLE_DX = 240, TITLE_CY = 330, TITLE_TY = 227;
  // 新芽小圖示(教學關卡片), 外接框約 18×21
  function sprout(ctx, cx, cy, a) {
    ctx.save(); ctx.globalAlpha *= a; ctx.translate(cx, cy);
    ctx.fillStyle = '#4a3420'; rr(ctx, -5, 7, 10, 3, 1.5); ctx.fill();
    ctx.strokeStyle = '#3f8a4c'; ctx.lineWidth = 2.4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, 7.5); ctx.quadraticCurveTo(0.8, 2, 0, -2); ctx.stroke();
    ctx.fillStyle = '#7ee08a';
    ctx.beginPath(); ctx.moveTo(0, -1); ctx.quadraticCurveTo(-9, -2, -9, -9); ctx.quadraticCurveTo(-2, -9, 0, -1); ctx.fill();
    ctx.beginPath(); ctx.moveTo(0, -2); ctx.quadraticCurveTo(8, -4, 8, -11); ctx.quadraticCurveTo(1, -10, 0, -2); ctx.fill();
    ctx.restore();
  }
  // 「已通關」金色小牌 110×26(中心 cx, cy): 深金底 + 金框 + 勾 + 三個字(第 14 輪, 取代 3 顆星)
  function clearedBadge(ctx, cx, cy) {
    ctx.save(); ctx.translate(cx, cy);
    ctx.fillStyle = '#3a2a08'; rr(ctx, -55, -13, 110, 26, 13); ctx.fill();
    ctx.strokeStyle = C.gold; ctx.lineWidth = 2; rr(ctx, -54, -12, 108, 24, 12); ctx.stroke();
    // 勾: 圓底 + 深墨勾
    ctx.fillStyle = C.gold; ctx.beginPath(); ctx.arc(-35, 0, 8, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#3a2a08'; ctx.lineWidth = 2.4; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(-39, 0.5); ctx.lineTo(-36, 3.5); ctx.lineTo(-31, -3); ctx.stroke();
    txt(ctx, '已通關', 9, 0.5, { size: 16, color: '#ffe7a0', maxW: 64 });
    ctx.restore();
  }
  // unlockP: 開鎖動畫進度 0~1(沒在播 = −1)
  function levelCard(ctx, i, lv, selected, unlockP) {
    lv = lv || {};
    var unlocked = lv.unlocked === true, tut = lv.tutorial === true;
    var cx = TITLE_X0 + TITLE_DX * i, cy = TITLE_CY;
    var tLock = unlocked && lv.tutorialLocked === true;
    // 第 12 輪: 游標可以停在鎖住的卡(未解鎖 / 教學鎖): 選中外觀(放大 + 金框發光)照畫, 鎖頭與變暗也照畫 = 「選到了但鎖著」
    var openSel = selected && unlocked && !tLock;
    ctx.save(); ctx.translate(cx, cy);
    if (selected) ctx.scale(1.06, 1.06);
    // 教學關 = 綠色系底 + 綠框 + 新芽; 一般關 = 藍灰
    var bgSel = tut ? '#25432f' : '#243247', bgOn = tut ? '#1c3324' : '#1b2433', bgOff = tut ? '#111c15' : '#11151d';
    if (selected) {
      ctx.save(); ctx.shadowColor = 'rgba(255,210,74,0.9)'; ctx.shadowBlur = 16;
      ctx.fillStyle = unlocked ? bgSel : bgOff; rr(ctx, -100, -75, 200, 150, 12); ctx.fill(); ctx.restore();
    }
    ctx.fillStyle = unlocked ? (selected ? bgSel : bgOn) : bgOff; rr(ctx, -100, -75, 200, 150, 12); ctx.fill();
    if (!selected) {
      ctx.strokeStyle = unlocked ? (tut ? '#4f9a5e' : '#4a5670') : (tut ? '#24382a' : '#262b36'); ctx.lineWidth = 2;
      rr(ctx, -99, -74, 198, 148, 11); ctx.stroke();
    }
    txt(ctx, '第 ' + (i + 1) + ' 關', 0, -50, { size: 15, color: unlocked ? (tut ? '#a8d8b0' : C.textDim) : (selected ? '#6a7184' : '#4a5060'), weight: 'normal' });
    var name = str(lv.name);
    if (unlocked) {
      txt(ctx, name, 0, -8, { size: name.length > 5 ? 25 : 30, color: openSel ? '#ffffff' : '#dfe4ee', maxW: 180 });
      // 第 14 輪: 星等拿掉, cleared === true 時卡片下方 (0,+45) 畫「已通關」金色小牌 110×26; false 留空
      if (lv.cleared === true) clearedBadge(ctx, 0, 45);
    } else {
      lockGlyph(ctx, 0, -6, 44, selected ? '#aab1c2' : undefined);
      txt(ctx, name, 0, 44, { size: 15, color: selected ? '#6a7184' : '#4a5060', maxW: 180 });
    }
    // 教學鎖: 新芽讓到左上角, 右上角 (80, −58) 換成教學配色的小鎖頭
    if (tut) sprout(ctx, tLock ? -76 : 76, -52, unlocked ? 1 : 0.4);
    if (tLock) {
      // 整張微暗(比未解鎖亮, 內容照讀得到); 選中時同樣壓暗, 只是外面多了金框
      ctx.fillStyle = 'rgba(6,8,14,0.42)'; rr(ctx, -100, -75, 200, 150, 12); ctx.fill();
      ctx.fillStyle = 'rgba(10,12,18,0.92)'; rr(ctx, 70, -68, 20, 20, 5); ctx.fill();
      ctx.strokeStyle = 'rgba(230,214,176,0.7)'; ctx.lineWidth = 1; rr(ctx, 70.5, -67.5, 19, 19, 4.5); ctx.stroke();
      lockGlyph(ctx, 80, -57.5, 15, '#e6d6b0');
    }
    if (selected) {
      // 金框畫在壓暗之上, 鎖住的卡被選中時框照樣亮
      ctx.strokeStyle = C.gold; ctx.lineWidth = 4; rr(ctx, -98, -73, 196, 146, 11); ctx.stroke();
    }
    if (unlockP >= 0) {
      // 開鎖: 卡片從暗變亮 + 內緣一圈金光; 鎖頭先抖、再碎成 7 片往外飛(不超出卡片外 20px)
      var q = unlockP;
      ctx.fillStyle = 'rgba(6,8,14,' + (0.72 * (1 - q)) + ')'; rr(ctx, -100, -75, 200, 150, 12); ctx.fill();
      ctx.strokeStyle = rgba('#ffe08a', 0.9 * Math.sin(PI * q)); ctx.lineWidth = 4; rr(ctx, -96, -71, 192, 142, 10); ctx.stroke();
      if (q < 0.15) {
        lockGlyph(ctx, Math.sin(q * 160) * 2.5, -6, 44, '#c8cedb');
      } else {
        var e = (q - 0.15) / 0.85, ee = 1 - (1 - e) * (1 - e);
        ctx.save(); ctx.globalAlpha *= 1 - e;
        for (var sh = 0; sh < 7; sh++) {
          var an = -PI / 2 + sh * TAU / 7 + 0.3;
          ctx.save();
          ctx.translate(Math.cos(an) * 90 * ee, -6 + Math.sin(an) * 58 * ee + 28 * e * e);
          ctx.rotate(sh + e * 5);
          ctx.fillStyle = sh % 2 ? '#c8cedb' : '#9aa0ae';
          ctx.beginPath(); ctx.moveTo(-5.5, -4); ctx.lineTo(5, -5); ctx.lineTo(3, 5); ctx.lineTo(-4, 4); ctx.closePath(); ctx.fill();
          ctx.restore();
        }
        ctx.restore();
      }
    }
    ctx.restore();
  }
  // 玩家記號: 魂匠小頭像 40×40(和 drawPlayer 同一個角色); sx / sy 以底邊為軸壓扁
  function tokenAvatar(ctx, x, y, sx, sy) {
    ctx.save(); ctx.translate(x, y + 20); ctx.scale(sx, sy); ctx.translate(0, -20);
    ctx.fillStyle = '#2a1a08'; ctx.beginPath(); ctx.arc(0, 0, 20, 0, TAU); ctx.fill();
    ctx.strokeStyle = C.gold; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, 18.5, 0, TAU); ctx.stroke();
    ctx.save(); ctx.scale(1.12, 1.12); ctx.translate(0, -0.6); playerBody(ctx); ctx.restore();
    ctx.restore();
  }
  function drawTitle(ctx, s) {
    s = s || {};
    var t = num(s.blinkTime, 0);
    ctx.save();
    grassAndGrid(ctx);
    roads(ctx, TITLE_PATHS);
    ctx.fillStyle = 'rgba(8,12,20,0.55)'; ctx.fillRect(FX0, 0, FW, H);
    // 兩側裝飾: 遊戲內的魂柱(合法狀態: 裝著遠攻 / 冰霜); 1.4 倍、貼著標題兩側 x 316 / 708(y 79~129, 不碰記號跳躍頂點 143, 不碰右上聲音圖示 x 956~992)
    ctx.save(); ctx.translate(CX - 196, 104); ctx.scale(1.4, 1.4); pillarBody(ctx, 'ranged'); ctx.restore();
    ctx.save(); ctx.translate(CX + 196, 104); ctx.scale(1.4, 1.4); pillarBody(ctx, 'frost'); ctx.restore();
    var wob = Math.sin(t * 1.6) * 1.5;
    // 大標題 (512,110) 48px(第 13 輪; 字下緣約 134, 在記號跳躍頂點 143 之上)
    txt(ctx, '魂匠守衛者', CX, 110 + wob, { size: 48, color: C.gold, stroke: '#2a1a00', sw: 6 });
    // 卡片之間的小路(卡片蓋在上面, 只在間隔 40 露出)
    var roadW = TITLE_DX * (TITLE_N - 1);
    ctx.fillStyle = C.pathEdge; ctx.fillRect(TITLE_X0, TITLE_CY - 11, roadW, 22);
    ctx.fillStyle = C.path; ctx.fillRect(TITLE_X0, TITLE_CY - 8, roadW, 16);
    ctx.fillStyle = C.pathLight; ctx.fillRect(TITLE_X0, TITLE_CY - 2, roadW, 4);
    var lvls = arr(s.levels);
    var cur = Math.floor(num(s.cursorIndex, 0));
    var ui = Math.floor(num(s.unlockIndex, -1)), ud = num(s.unlockDuration, 0.6) || 0.6, ua = num(s.unlockAge, ud);
    var up = (ui >= 0 && ui < TITLE_N && ua >= 0 && ua < ud) ? ua / ud : -1;
    for (var i = 0; i < TITLE_N; i++) if (i !== cur) levelCard(ctx, i, lvls[i], false, i === ui ? up : -1);
    if (cur >= 0 && cur < TITLE_N) levelCard(ctx, cur, lvls[cur], true, cur === ui ? up : -1);
    // 玩家記號: 靜止中心 (152 + 240 × tokenIndex, 227); 推進時弧線跳(最高點高 60)+ 落地壓扁
    var ti = clamp(Math.floor(num(s.tokenIndex, 0)), 0, TITLE_N - 1), tf = clamp(Math.floor(num(s.tokenFrom, ti)), 0, TITLE_N - 1);
    var td = num(s.tokenDuration, 0.8) || 0.8, ta = num(s.tokenAge, td);
    var tp = (ta >= 0 && ta < td) ? ta / td : -1;
    var tx = TITLE_X0 + TITLE_DX * ti, ty = TITLE_TY, sx = 1, sy = 1;
    if (tp >= 0 && tf !== ti) {
      if (tp < 0.8) {
        var u = tp / 0.8;
        tx = TITLE_X0 + TITLE_DX * (tf + (ti - tf) * u); ty = TITLE_TY - 240 * u * (1 - u);
      } else {
        var w = Math.sin(PI * (tp - 0.8) / 0.2);
        sx = 1 + 0.15 * w; sy = 1 - 0.18 * w;
      }
    } else {
      ty += Math.sin(t * 3) * 1.5;
    }
    tokenAvatar(ctx, tx, ty, sx, sy);
    // 底部提示: [←][→] 選關  [Z] 開始(閃爍)  [M] 靜音
    // 觸控模式不放 [M] 靜音(手機沒有 M, 聲音交給手機本身)
    var hints = [
      { keys: ['left', 'right'], label: '選關' },
      { keys: ['z'], label: '開始', alpha: 0.55 + 0.45 * Math.cos(t * 5), color: '#ffffff' }
    ];
    if (!(window.PVDX && window.PVDX.on)) hints.push({ keys: ['m'], label: '靜音' });
    hintRow(ctx, hints, CX, 530, { align: 'center', size: 20, gap: 32, weight: 'bold', stroke: 'rgba(0,0,0,0.6)', sw: 3 });
    // 第 13 輪: 喇叭拆到 drawMuteIcon((974,40) 由 RD 另外呼叫), 本函式不再讀 muted、右上角不畫東西
    ctx.restore();
  }

  // ---------- 新手教學完成大提示(關卡預覽頁之上) ----------
  var CONFETTI_COLS = ['#ffd24a', '#5b8fe0', '#52e39a', '#ef5350', '#d27cff', '#8fd8ff', '#fff4d6'];
  function drawTutorialClear(ctx, s) {
    s = s || {};
    var age = Math.max(0, num(s.age, 0));
    var cd = num(s.closeDuration, 0.3) || 0.3, ca = num(s.closeAge, cd);
    var fade = bool(s.closing) ? clamp(1 - ca / cd, 0, 1) : 1;
    if (fade <= 0) return;
    ctx.save();
    ctx.globalAlpha = fade;
    ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(FX0, 0, FW, H);
    ctx.save();
    ctx.beginPath(); ctx.rect(FX0, 0, FW, H); ctx.clip();
    // 面板背後的放射光芒, 緩慢轉動(第 13 輪: 中心 (512,288), 光芒長 760 蓋得到 x −160~1184 的四角)
    ctx.save(); ctx.translate(CX, CY); ctx.rotate(age * 0.25);
    ctx.fillStyle = 'rgba(255,210,74,0.12)';
    for (var i = 0; i < 12; i++) {
      var a = i * TAU / 12;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a - 0.09) * 760, Math.sin(a - 0.09) * 760); ctx.lineTo(Math.cos(a + 0.09) * 760, Math.sin(a + 0.09) * 760); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
    // 彩帶紙花: 0~1.0 秒陸續灑出, 每片落 1.1~1.5 秒, 2.5 秒前全部落完
    for (var k = 0; k < 92; k++) { // 第 13 輪: 灑在 x −160~1184, 片數照寬度比例加, 可見區密度不變
      var dl = hash(k, 1, 2) * 1.0, fall = 1.1 + hash(k, 2, 3) * 0.4;
      var lp = (age - dl) / fall; if (lp < 0 || lp >= 1) continue;
      var cx = FX0 + 30 + hash(k, 3, 4) * (FW - 60) + Math.sin(age * 3 + k) * 14, cy = -10 + lp * (H + 20);
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(age * 5 + k);
      ctx.fillStyle = CONFETTI_COLS[k % CONFETTI_COLS.length];
      ctx.fillRect(-4, -2, 8, 4);
      ctx.restore();
    }
    ctx.restore();
    // 面板 680×220: 0~0.4 秒 0.3 → 1.1 → 1.0
    var sc = age < 0.25 ? 0.3 + 0.8 * (age / 0.25) : age < 0.4 ? 1.1 - 0.1 * ((age - 0.25) / 0.15) : 1;
    ctx.save(); ctx.translate(CX, CY); ctx.scale(sc, sc);
    ctx.fillStyle = C.panel; rr(ctx, -340, -110, 680, 220, 18); ctx.fill();
    ctx.strokeStyle = C.gold; ctx.lineWidth = 4; rr(ctx, -338, -108, 676, 216, 16); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,210,74,0.35)'; ctx.lineWidth = 1.5; rr(ctx, -328, -98, 656, 196, 12); ctx.stroke();
    sprout(ctx, -300, -74, 1); sprout(ctx, 300, -74, 1);
    txt(ctx, '恭喜完成新手任務!', 0, -20, { size: 46, color: C.gold, stroke: '#2a1a00', sw: 6, maxW: 600 });
    if (bool(s.ready)) {
      ctx.globalAlpha = fade * (0.55 + 0.45 * Math.cos(age * 5));
      richLine(ctx, '[Z] 繼續', 0, 60, { size: 20, kh: 22, color: '#ffffff' });
    }
    ctx.restore();
    ctx.restore();
  }

  // ---------- 教學種類詢問視窗(第 11 輪新增, 第 12 輪改成示意圖; 關卡預覽頁之上) ----------
  // 紙底面板 840×460 中心 (512,300); 選項卡 340×300, 中心 (322,290) / (702,290)(第 13 輪)
  // 卡內(相對卡片中心): 示意圖 300×170 畫在 y −135~+25 內; 主句 (0, +62) 26px; 小字 (0, +100) 16px
  var CHOICE_OPTS = [
    { cx: 322, vet: false, main: '從來沒有', sub: '讓我從最基礎的教學開始' },
    { cx: 702, vet: true, main: '有', sub: '只給我必要教學即可' }
  ];
  var CHOICE_CY = 290, CHOICE_HW = 170, CHOICE_HH = 150;
  // 示意圖的魂匠: 沿用 drawPlayer 的玩家魂匠(奶白圓身 + 金邊 + 兜帽 + 方眼 + 鍛錘徽記), 放大 3.2 倍, 只換裝備與表情
  // 單位座標: 身體圓心 (0, 1) 半徑 14.5、腳底 y 18.5; 換成卡內座標 = (0, CHOICE_FEET) + 單位 × CHOICE_K(腳底對齊草地)
  var CHOICE_K = 3.2, CHOICE_FEET = 10;
  // 共用: 腳、身體(奶白金邊)、兜帽、眼睛
  function smithFeet(ctx, col, dark) {
    ctx.fillStyle = dark; ctx.beginPath(); ctx.ellipse(-5.5, 16.6, 4.2, 2.4, 0, 0, TAU); ctx.ellipse(5.5, 16.6, 4.2, 2.4, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(-5.5, 16.1, 3.4, 1.7, 0, 0, TAU); ctx.ellipse(5.5, 16.1, 3.4, 1.7, 0, 0, TAU); ctx.fill();
  }
  function smithTorso(ctx) {
    ctx.fillStyle = C.playerRim; ctx.beginPath(); ctx.arc(0, 1, 14.5, 0, TAU); ctx.fill();
    ctx.fillStyle = C.player; ctx.beginPath(); ctx.arc(0, 1, 12.5, 0, TAU); ctx.fill();
  }
  function smithHood(ctx, col) {
    ctx.fillStyle = col; ctx.beginPath(); ctx.arc(0, -3, 9, PI * 1.05, -PI * 0.05); ctx.lineTo(7, -1); ctx.lineTo(-7, -1); ctx.closePath(); ctx.fill();
  }
  function smithEyes(ctx) {
    ctx.fillStyle = '#3a2a1c'; ctx.fillRect(-4.5, -2.5, 3, 3); ctx.fillRect(1.5, -2.5, 3, 3);
  }
  function smithHand(ctx, x, y) {
    ctx.fillStyle = C.player; ctx.strokeStyle = C.playerRim; ctx.lineWidth = 0.9;
    ctx.beginPath(); ctx.arc(x, y, 2.8, 0, TAU); ctx.fill(); ctx.stroke();
  }
  // 身體下半的衣物(剪在身體圓內)
  function smithClothClip(ctx) { ctx.beginPath(); ctx.arc(0, 1, 12.5, 0, TAU); ctx.clip(); }
  // 新手魂匠: 凹鐵鍋頭盔、褪色兜帽、補丁麻布衣 + 草繩腰帶、歪樹枝、鍋蓋盾、八字眉 + 汗滴
  // anim: 0~1 待機週期進度(汗滴從額頭流到下巴); −1 = 不動(停在第一格)
  function noviceSmith(ctx, anim) {
    smithFeet(ctx, '#8a6a44', '#4a3622');
    smithTorso(ctx);
    // 補丁麻布衣(身體下半)+ 兩塊補丁 + 草繩腰帶
    ctx.save(); smithClothClip(ctx);
    ctx.fillStyle = '#c9b48a'; ctx.fillRect(-14, 3, 28, 12);
    ctx.strokeStyle = 'rgba(90,70,40,0.35)'; ctx.lineWidth = 0.5; ctx.beginPath();
    for (var v = -11; v <= 11; v += 2.2) { ctx.moveTo(v, 4); ctx.lineTo(v + 0.6, 14); }
    ctx.stroke();
    ctx.fillStyle = '#8f7c9a'; ctx.fillRect(-8.5, 7.5, 5, 4.2);
    ctx.fillStyle = '#7a9a6a'; ctx.fillRect(3.5, 9.5, 4.4, 3.6);
    ctx.strokeStyle = '#3a2a1c'; ctx.lineWidth = 0.45; ctx.setLineDash([0.9, 0.7]);
    ctx.strokeRect(-8.2, 7.8, 4.4, 3.6); ctx.strokeRect(3.8, 9.8, 3.8, 3.0);
    ctx.setLineDash([]);
    ctx.restore();
    ctx.strokeStyle = '#b8954a'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-12.2, 4); ctx.quadraticCurveTo(0, 5.6, 12.2, 4); ctx.stroke();
    ctx.strokeStyle = '#7a5f2a'; ctx.lineWidth = 0.5; ctx.beginPath();
    for (var r = -10; r <= 10; r += 2.5) { ctx.moveTo(r, 3.9); ctx.lineTo(r + 1.2, 5.4); }
    ctx.stroke();
    ctx.fillStyle = '#b8954a'; ctx.beginPath(); ctx.arc(3, 5.2, 1.3, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#b8954a'; ctx.lineWidth = 0.9; ctx.beginPath(); ctx.moveTo(3, 6); ctx.lineTo(2.2, 9); ctx.moveTo(3.4, 6); ctx.lineTo(4.4, 8.6); ctx.stroke();
    // 褪色兜帽 + 眼睛 + 八字眉(內高外低)
    smithHood(ctx, '#c9a77a');
    smithEyes(ctx);
    ctx.strokeStyle = '#3a2a1c'; ctx.lineWidth = 0.9; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-5.6, -3.6); ctx.lineTo(-2.2, -5.2); ctx.moveTo(2.2, -5.2); ctx.lineTo(5.6, -3.6); ctx.stroke();
    // 倒扣的凹鐵鍋: 鍋身 + 鍋緣 + 凹痕 + 右側把手
    ctx.fillStyle = '#4a4f5c';
    ctx.beginPath(); ctx.moveTo(-9.6, -8.6); ctx.quadraticCurveTo(-9.6, -16.6, -2.5, -17.2); ctx.lineTo(-1.2, -15.4); ctx.lineTo(0.6, -17.3);
    ctx.quadraticCurveTo(9.6, -16.6, 9.6, -8.6); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#6a7080'; ctx.beginPath(); ctx.moveTo(-6.8, -10); ctx.quadraticCurveTo(-6.6, -14.6, -3.2, -15.4); ctx.lineTo(-3.6, -13.6); ctx.quadraticCurveTo(-5.6, -12.8, -5.4, -10); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#353944'; rr(ctx, -11.4, -9.4, 22.8, 2.4, 1.1); ctx.fill();
    ctx.strokeStyle = '#353944'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(10.6, -8.6); ctx.lineTo(16.5, -10.2); ctx.stroke();
    ctx.fillStyle = '#5a3a1e'; rr(ctx, 15, -11.6, 5, 2.6, 1.2); ctx.fill();
    // 汗滴: 臉旁, 選中時沿臉頰流到下巴後消失、再從額頭冒出
    var sp = anim < 0 ? 0 : anim, sa = anim < 0 ? 1 : (sp < 0.8 ? 1 : 1 - (sp - 0.8) / 0.2);
    var sx = 8.6 + 0.8 * sp, sy = -6.5 + 9.5 * sp;
    if (sa > 0) {
      ctx.save(); ctx.globalAlpha *= sa;
      ctx.fillStyle = '#9fdcff'; ctx.strokeStyle = '#3a7aa8'; ctx.lineWidth = 0.5;
      ctx.beginPath(); ctx.moveTo(sx, sy - 2.6); ctx.quadraticCurveTo(sx + 1.7, sy, sx + 1.4, sy + 0.8); ctx.arc(sx, sy + 0.8, 1.4, 0, PI); ctx.quadraticCurveTo(sx - 1.7, sy, sx, sy - 2.6); ctx.fill(); ctx.stroke();
      ctx.restore();
    }
    // 右手(畫面右)歪樹枝 + 一片小葉子
    ctx.strokeStyle = '#6a4a26'; ctx.lineWidth = 1.7; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(13.5, 11); ctx.lineTo(15.6, 4); ctx.lineTo(14.6, -1.5); ctx.lineTo(17.4, -7.5); ctx.lineTo(16.6, -12.5); ctx.stroke();
    ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(14.9, -1); ctx.lineTo(12.2, -4); ctx.stroke();
    ctx.fillStyle = '#7ec060'; ctx.beginPath(); ctx.moveTo(17.2, -8.5); ctx.quadraticCurveTo(22, -10.5, 21.6, -6.2); ctx.quadraticCurveTo(18.8, -5.4, 17.2, -8.5); ctx.fill();
    smithHand(ctx, 15.3, 3.6);
    // 左手鍋蓋盾
    smithHand(ctx, -13.8, 4.6);
    ctx.fillStyle = '#5d6272'; ctx.beginPath(); ctx.arc(-15.6, 4.6, 7, 0, TAU); ctx.fill();
    ctx.fillStyle = '#9aa0ae'; ctx.beginPath(); ctx.arc(-15.6, 4.6, 5.8, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(58,63,76,0.6)'; ctx.lineWidth = 0.6; ctx.beginPath(); ctx.arc(-15.6, 4.6, 3.6, 0, TAU); ctx.stroke();
    ctx.fillStyle = '#3a3f4c'; rr(ctx, -17.3, 3.4, 3.4, 2.4, 1); ctx.fill();
  }
  // 老手魂匠: 鋼盔 + 護鼻 + 藍羽飾、胸甲與肩甲(金邊)、鐵劍、藍鳶形盾(鍛錘徽記)、橘披風、平眉
  // anim: 0~1 待機週期進度(劍尖星光); −1 = 不動
  function veteranSmith(ctx, anim) {
    // 身後橘色披風(下襬波浪)
    ctx.fillStyle = '#b8541e';
    ctx.beginPath(); ctx.moveTo(-11, -5); ctx.lineTo(11, -5); ctx.lineTo(17.5, 15.5);
    ctx.quadraticCurveTo(13, 17.8, 9, 16); ctx.quadraticCurveTo(4.5, 18.4, 0, 16.4); ctx.quadraticCurveTo(-4.5, 18.4, -9, 16); ctx.quadraticCurveTo(-13, 17.8, -17.5, 15.5);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#e8792e';
    ctx.beginPath(); ctx.moveTo(-10, -4); ctx.lineTo(10, -4); ctx.lineTo(16, 14.6); ctx.quadraticCurveTo(8, 16, 0, 15.2); ctx.quadraticCurveTo(-8, 16, -16, 14.6); ctx.closePath(); ctx.fill();
    smithFeet(ctx, '#9aa3b2', '#3a3f4c');
    smithTorso(ctx);
    // 胸甲(身體下半, 鋼色 + 金色滾邊 + 中線)
    ctx.save(); smithClothClip(ctx);
    ctx.fillStyle = '#aeb6c4'; ctx.beginPath(); ctx.moveTo(-14, 1.6); ctx.quadraticCurveTo(0, -0.6, 14, 1.6); ctx.lineTo(14, 15); ctx.lineTo(-14, 15); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#d8dee8'; ctx.beginPath(); ctx.moveTo(-7, 2.6); ctx.quadraticCurveTo(-3, 1.4, -1, 1.4); ctx.lineTo(-1.6, 9); ctx.quadraticCurveTo(-5, 8, -7, 6); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = C.playerRim; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(-14, 1.9); ctx.quadraticCurveTo(0, -0.3, 14, 1.9); ctx.stroke();
    ctx.strokeStyle = 'rgba(58,63,76,0.55)'; ctx.lineWidth = 0.7; ctx.beginPath(); ctx.moveTo(0, 1); ctx.lineTo(0, 14); ctx.moveTo(-12, 9.5); ctx.quadraticCurveTo(0, 11.5, 12, 9.5); ctx.stroke();
    ctx.restore();
    // 肩甲(金邊)
    [-1, 1].forEach(function (d) {
      ctx.fillStyle = '#8d96a6'; ctx.beginPath(); ctx.ellipse(d * 11.2, -0.6, 5.4, 4.2, d * 0.35, PI, 0); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = C.playerRim; ctx.lineWidth = 0.9; ctx.beginPath(); ctx.ellipse(d * 11.2, -0.6, 5.4, 4.2, d * 0.35, PI, 0); ctx.stroke();
    });
    // 兜帽(只露兩側)+ 眼睛 + 平眉
    smithHood(ctx, C.playerCloak);
    smithEyes(ctx);
    ctx.strokeStyle = '#3a2a1c'; ctx.lineWidth = 1; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-5.4, -4.4); ctx.lineTo(-1.4, -4.4); ctx.moveTo(1.4, -4.4); ctx.lineTo(5.4, -4.4); ctx.stroke();
    // 藍羽飾(往後飄)
    ctx.fillStyle = C.allyDark; ctx.beginPath(); ctx.moveTo(-0.6, -14.2); ctx.quadraticCurveTo(-3, -23.5, -11, -22.6); ctx.quadraticCurveTo(-6, -19.4, -2.6, -13.4); ctx.closePath(); ctx.fill();
    ctx.fillStyle = C.ally; ctx.beginPath(); ctx.moveTo(-0.2, -14.4); ctx.quadraticCurveTo(-2.4, -21.8, -9.6, -21.8); ctx.quadraticCurveTo(-5, -18.8, -2.2, -13.8); ctx.closePath(); ctx.fill();
    // 鋼盔(圓頂 + 帽緣 + 護鼻 + 金色頂飾座)
    ctx.fillStyle = '#7d8696'; ctx.beginPath(); ctx.arc(0, -6.6, 9.8, PI, 0); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#b8c0cc'; ctx.beginPath(); ctx.arc(-2.4, -9.6, 4.6, PI * 1.1, PI * 1.7); ctx.lineTo(-2.4, -9.6); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#5d6272'; rr(ctx, -10.8, -7.6, 21.6, 2.4, 1.1); ctx.fill();
    ctx.fillStyle = '#5d6272'; rr(ctx, -0.8, -6, 1.6, 6.2, 0.6); ctx.fill();
    ctx.fillStyle = C.playerRim; rr(ctx, -1.6, -17.6, 3.2, 2.2, 0.8); ctx.fill();
    // 右手鐵劍(護手金、劍刃鋼、劍首)
    var tipX = 18.4, tipY = -21;
    ctx.fillStyle = '#3a3f4c'; ctx.beginPath(); ctx.moveTo(14.2, 1.4); ctx.lineTo(16.4, 1.4); ctx.lineTo(tipX + 0.6, tipY + 3); ctx.lineTo(tipX, tipY); ctx.lineTo(tipX - 1.4, tipY + 2.6); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#e6ecf4'; ctx.beginPath(); ctx.moveTo(14.8, 1.2); ctx.lineTo(15.8, 1.2); ctx.lineTo(tipX + 0.1, tipY + 2.4); ctx.lineTo(tipX - 0.7, tipY + 2.2); ctx.closePath(); ctx.fill();
    ctx.fillStyle = C.playerRim; rr(ctx, 11.4, 1.1, 8, 1.9, 0.8); ctx.fill();
    ctx.fillStyle = '#5a3a1e'; rr(ctx, 14.5, 3, 1.8, 4.4, 0.6); ctx.fill();
    ctx.fillStyle = C.playerRim; ctx.beginPath(); ctx.arc(15.4, 8, 1.2, 0, TAU); ctx.fill();
    smithHand(ctx, 15.4, 4.6);
    // 劍尖星光: 每週期閃一下(十字光芒半徑 ≤ 2.5 單位 = 8px)
    if (anim >= 0) {
      var f = anim < 0.25 ? Math.sin(PI * anim / 0.25) : 0;
      if (f > 0) {
        ctx.save(); ctx.translate(tipX, tipY); ctx.rotate(PI / 4 * f);
        ctx.fillStyle = 'rgba(255,255,255,' + (0.95 * f) + ')';
        var R = 2.5 * f, r = 0.45 * f;
        ctx.beginPath(); ctx.moveTo(0, -R); ctx.lineTo(r, -r); ctx.lineTo(R, 0); ctx.lineTo(r, r); ctx.lineTo(0, R); ctx.lineTo(-r, r); ctx.lineTo(-R, 0); ctx.lineTo(-r, -r); ctx.closePath(); ctx.fill();
        ctx.fillStyle = 'rgba(255,236,160,' + (0.8 * f) + ')'; ctx.beginPath(); ctx.arc(0, 0, 0.7 * f, 0, TAU); ctx.fill();
        ctx.restore();
      }
    }
    // 左手藍色鳶形盾 + 鍛錘徽記
    smithHand(ctx, -13.6, 4.4);
    var kite = function (o) {
      ctx.beginPath(); ctx.moveTo(-22 - o, -3.6 - o); ctx.quadraticCurveTo(-15.4, -6 - o, -8.8 + o, -3.6 - o);
      ctx.quadraticCurveTo(-8.8 + o, 7, -15.4, 15.6 + o * 1.4); ctx.quadraticCurveTo(-22 - o, 7, -22 - o, -3.6 - o); ctx.closePath();
    };
    ctx.fillStyle = C.allyDark; kite(0.9); ctx.fill();
    ctx.fillStyle = C.ally; kite(0); ctx.fill();
    ctx.strokeStyle = C.playerRim; ctx.lineWidth = 0.7; kite(-0.9); ctx.stroke();
    ctx.fillStyle = '#5a3a1e'; ctx.fillRect(-16, 0.6, 1.4, 7.4);
    ctx.fillStyle = '#d8dee8'; rr(ctx, -18.8, -0.4, 7, 3, 0.8); ctx.fill();
  }
  // 示意圖區: 草地(200×30 中心 (0, +8))+ 換裝的魂匠; dim: 沒選中(約 70% 飽和度 + 稍淡、不動)
  function choiceIllus(ctx, vet, anim, dim) {
    ctx.save();
    if (dim) {
      ctx.globalAlpha *= 0.82;
      if ('filter' in ctx) ctx.filter = 'saturate(0.7)';
    }
    ctx.fillStyle = '#5f9a4e'; ctx.beginPath(); ctx.ellipse(0, 8, 100, 15, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#76b25e'; ctx.beginPath(); ctx.ellipse(0, 6, 92, 11, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#4c8240'; ctx.lineWidth = 1.6; ctx.lineCap = 'round'; ctx.beginPath();
    [-78, -64, 58, 72, -40, 44].forEach(function (gx, i) { var gy = 4 + (i % 3) * 3; ctx.moveTo(gx, gy + 3); ctx.lineTo(gx - 2, gy - 3); ctx.moveTo(gx + 3, gy + 3); ctx.lineTo(gx + 4, gy - 2); });
    ctx.stroke();
    ctx.fillStyle = 'rgba(30,50,20,0.35)'; ctx.beginPath(); ctx.ellipse(0, CHOICE_FEET + 1, 40, 6, 0, 0, TAU); ctx.fill();
    ctx.translate(0, CHOICE_FEET - 18.5 * CHOICE_K); ctx.scale(CHOICE_K, CHOICE_K);
    if (vet) veteranSmith(ctx, anim); else noviceSmith(ctx, anim);
    if ('filter' in ctx) ctx.filter = 'none';
    ctx.restore();
  }
  // 一張選項卡; sel: 選中(琥珀底 + 外框發光 + 放大 1.06 + 角色待機動作); fade: 整張透明度; flash: 白色亮度脈衝 0~1; anim: 待機週期進度
  function choiceCard(ctx, o, sel, fade, flash, anim) {
    var cx = o.cx, cy = CHOICE_CY, sc = sel ? 1.06 : 1, hw = CHOICE_HW * sc, hh = CHOICE_HH * sc;
    ctx.save();
    ctx.globalAlpha *= fade;
    if (sel) {
      // 外框發光: 放大後卡片外緣之外 1~8px 的 4 圈漸淡細環(外緣到 8)
      for (var g = 0; g < 4; g++) {
        var d = 1 + 2 * g;
        ctx.strokeStyle = rgba(C.tutorAccent, 0.7 - 0.16 * g); ctx.lineWidth = 2;
        rr(ctx, cx - hw - d, cy - hh - d, 2 * (hw + d), 2 * (hh + d), 14 * sc + d); ctx.stroke();
      }
    }
    ctx.translate(cx, cy); ctx.scale(sc, sc);
    ctx.fillStyle = sel ? '#ffe7b0' : '#fffcf2'; rr(ctx, -CHOICE_HW, -CHOICE_HH, 2 * CHOICE_HW, 2 * CHOICE_HH, 14); ctx.fill();
    // 示意圖區底: 淡天色圓角塊(讓角色從卡底浮出來; 畫在 300×160 內)
    ctx.fillStyle = sel ? 'rgba(255,255,255,0.45)' : 'rgba(232,240,246,0.7)'; rr(ctx, -150, -135, 300, 160, 12); ctx.fill();
    choiceIllus(ctx, o.vet, sel ? anim : -1, !sel);
    ctx.strokeStyle = sel ? C.tutorInk : 'rgba(42,32,22,0.45)'; ctx.lineWidth = sel ? 3 : 2;
    rr(ctx, -CHOICE_HW + ctx.lineWidth / 2, -CHOICE_HH + ctx.lineWidth / 2, 2 * CHOICE_HW - ctx.lineWidth, 2 * CHOICE_HH - ctx.lineWidth, 13); ctx.stroke();
    txt(ctx, o.main, 0, 62, { size: 26, color: C.tutorInk, maxW: 300 });
    txt(ctx, o.sub, 0, 100, { size: 16, color: '#6a5640', weight: 'normal', maxW: 300 });
    if (flash > 0) {
      ctx.fillStyle = 'rgba(255,255,255,' + (0.6 * flash) + ')'; rr(ctx, -CHOICE_HW, -CHOICE_HH, 2 * CHOICE_HW, 2 * CHOICE_HH, 14); ctx.fill();
    }
    ctx.restore();
  }
  function drawTutorialChoice(ctx, s) {
    s = s || {};
    var age = Math.max(0, num(s.age, 1)), od = num(s.openDuration, 0.25) || 0.25;
    var op = clamp(age / od, 0, 1);
    var pd = num(s.pickDuration, 0.35) || 0.35, pa = num(s.pickAge, pd);
    var picked = Math.floor(num(s.picked, -1));
    if (picked !== 0 && picked !== 1) picked = -1;
    var pp = (picked >= 0 && pa >= 0 && pa < pd) ? pa / pd : (picked >= 0 ? 1 : -1);
    var cur = picked >= 0 ? picked : clamp(Math.floor(num(s.cursor, 0)), 0, 1);
    ctx.save();
    ctx.globalAlpha = 1;
    // 壓暗: 0 → 0.55(和 drawTutorialClear 同一種)
    ctx.fillStyle = 'rgba(0,0,0,' + (0.55 * op) + ')'; ctx.fillRect(FX0, 0, FW, H);
    // 面板彈入: 0.9 → 1.03(前 70%)→ 1.0, 以面板中心 (512,300) 為軸
    var sc = op >= 1 ? 1 : op < 0.7 ? 0.9 + 0.13 * (op / 0.7) : 1.03 - 0.03 * ((op - 0.7) / 0.3);
    ctx.translate(CX, 300); ctx.scale(sc, sc); ctx.translate(-CX, -300);
    // 面板 840×460(x 92~932、y 70~530): 教學紙底 + 深墨框 + 琥珀內框(同引導卡; 無金色、無放射光)
    ctx.fillStyle = C.tutorPaper; rr(ctx, CX - 420, 70, 840, 460, 18); ctx.fill();
    ctx.strokeStyle = C.tutorInk; ctx.lineWidth = 3; rr(ctx, CX - 418.5, 71.5, 837, 457, 17); ctx.stroke();
    ctx.strokeStyle = rgba(C.tutorAccent, 0.55); ctx.lineWidth = 2; rr(ctx, CX - 411, 79, 822, 442, 12); ctx.stroke();
    txt(ctx, '你有玩過塔防遊戲嗎?', CX, 104, { size: 30, color: C.tutorInk, maxW: 680 });
    // 待機動作週期 1.2 秒(真實時間 age 驅動); 確定中不再動
    var anim = pp >= 0 ? -1 : (age % 1.2) / 1.2;
    for (var i = 0; i < 2; i++) {
      var sel = i === cur, fade = 1, flash = 0;
      if (pp >= 0) {
        if (i === picked) flash = Math.abs(Math.sin(TAU * pp)) * (pp < 1 ? 1 : 0);
        else fade = 1 - 0.6 * pp;
      }
      choiceCard(ctx, CHOICE_OPTS[i], sel, fade, flash, anim);
    }
    hintRow(ctx, [
      { keys: ['left', 'right'], label: '選擇' },
      { keys: ['z'], label: '確定' },
      { keys: ['x'], label: '返回' }
    ], CX, 500, { align: 'center', size: 16, gap: 24, color: C.tutorInk });
    ctx.restore();
  }

  // ---------- 暫停式引導卡 ----------
  var GUIDE_HI = [255, 210, 90];
  function guideArrow(ctx, a) {
    var tx = num(a.tipX, NaN), ty = num(a.tipY, NaN); if (!isFinite(tx) || !isFinite(ty)) return;
    var rx = num(a.rootX, tx), ry = num(a.rootY, ty + 40);
    var L = Math.hypot(tx - rx, ty - ry); if (L < 1) return;
    var ux = (tx - rx) / L, uy = (ty - ry) / L, nx = -uy, ny = ux;
    var hl = Math.min(16, L), bx = tx - ux * hl, by = ty - uy * hl;
    // 桿寬 8、三角寬 20 長 16, 尖端正好在 tip
    ctx.beginPath();
    ctx.moveTo(rx + nx * 4, ry + ny * 4); ctx.lineTo(bx + nx * 4, by + ny * 4); ctx.lineTo(bx + nx * 10, by + ny * 10);
    ctx.lineTo(tx, ty); ctx.lineTo(bx - nx * 10, by - ny * 10); ctx.lineTo(bx - nx * 4, by - ny * 4); ctx.lineTo(rx - nx * 4, ry - ny * 4);
    ctx.closePath(); ctx.fill();
  }
  function clipOutside(ctx, sp) {
    ctx.beginPath(); ctx.rect(FX0 - 10, -10, FW + 20, H + 20); ctx.moveTo(sp.x + sp.r, sp.y); ctx.arc(sp.x, sp.y, sp.r, 0, TAU); ctx.clip('evenodd');
  }
  function drawGuide(ctx, s) {
    s = s || {};
    var phase = s.phase === 'intro' || s.phase === 'outro' ? s.phase : 'card';
    var pd = num(s.phaseDuration, 0.3) || 0.3, pp = phase === 'card' ? 0 : clamp(num(s.phaseAge, 0) / pd, 0, 1);
    var dimA = phase === 'intro' ? 0.6 * pp : phase === 'outro' ? 0.6 * (1 - pp) : 0.6;
    var fg = phase === 'intro' ? 0 : phase === 'outro' ? 1 - pp : 1;
    var spots = [];
    arr(s.spots).slice(0, 2).forEach(function (q) {
      if (q && isFinite(+q.x) && isFinite(+q.y)) spots.push({ x: +q.x, y: +q.y, r: clamp(num(q.r, 40), 20, 154) });
    });
    var arrows = arr(s.arrows).filter(function (q) { return q && typeof q === 'object'; }).slice(0, spots.length);
    ctx.save();
    if (dimA > 0) {
      // 壓暗 0.6, 聚光燈圓內挖空(傳入 r = 挖空外緣, 柔邊往內)
      ctx.save();
      spots.forEach(function (sp) { clipOutside(ctx, sp); });
      ctx.fillStyle = 'rgba(0,0,0,' + dimA + ')'; ctx.fillRect(FX0, 0, FW, H);
      ctx.restore();
      spots.forEach(function (sp, i) {
        var soft = Math.min(12, sp.r * 0.3);
        ctx.save();
        spots.forEach(function (o, j) { if (j !== i) clipOutside(ctx, o); });
        var g = ctx.createRadialGradient(sp.x, sp.y, sp.r - soft, sp.x, sp.y, sp.r);
        g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,' + dimA + ')');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(sp.x, sp.y, sp.r, 0, TAU); ctx.moveTo(sp.x + sp.r - soft, sp.y); ctx.arc(sp.x, sp.y, sp.r - soft, 0, TAU, true); ctx.fill();
        ctx.restore();
      });
    }
    if (fg > 0) {
      // 聚光燈描邊: 外緣外 2.5px、寬 3, 暖黃, 只改亮度脈動
      var pl = 0.72 + 0.28 * Math.sin(now() * 4);
      var hi = 'rgba(' + GUIDE_HI[0] + ',' + GUIDE_HI[1] + ',' + GUIDE_HI[2] + ',' + (fg * pl) + ')';
      ctx.strokeStyle = hi; ctx.lineWidth = 3;
      spots.forEach(function (sp) { ctx.beginPath(); ctx.arc(sp.x, sp.y, sp.r + 2.5, 0, TAU); ctx.stroke(); });
      ctx.fillStyle = hi;
      arrows.forEach(function (a) { guideArrow(ctx, a); });
    }
    if (phase !== 'intro') {
      var cxc = num(s.cardX, CX), cyc = num(s.cardY, CY) - (phase === 'outro' ? 80 * pp : 0);
      var cdur = num(s.cardDuration, 0.3) || 0.3, cag = num(s.cardAge, cdur);
      var cp = (cag >= 0 && cag < cdur) ? cag / cdur : 1;
      var sc = cp < 0.6 ? 0.6 + 0.45 * (cp / 0.6) : cp < 1 ? 1.05 - 0.05 * ((cp - 0.6) / 0.4) : 1;
      ctx.save(); ctx.globalAlpha = fg; ctx.translate(cxc, cyc); ctx.scale(sc, sc);
      guideCard(ctx, s);
      ctx.restore();
    }
    ctx.restore();
  }
  // 卡片 440×140, 以 (0,0) 為中心: 紙底深字(和新手任務泡泡同一套教學配色, 但更大、沒有箭頭與標籤)
  function guideCard(ctx, s) {
    ctx.fillStyle = C.tutorPaper; rr(ctx, -220, -70, 440, 140, 14); ctx.fill();
    ctx.strokeStyle = C.tutorInk; ctx.lineWidth = 3; rr(ctx, -218.5, -68.5, 437, 137, 13); ctx.stroke();
    ctx.strokeStyle = rgba(C.tutorAccent, 0.55); ctx.lineWidth = 2; rr(ctx, -212, -62, 424, 124, 10); ctx.stroke();
    var lines = str(s.text).split('\n').slice(0, 2), sub = str(s.sub);
    var mc = sub ? -16 : -6, lh = 30;
    for (var i = 0; i < lines.length; i++) {
      richLine(ctx, lines[i], 0, mc + (i - (lines.length - 1) / 2) * lh, { size: 23, kh: 22, color: C.tutorInk, maxW: 400 });
    }
    if (sub) richLine(ctx, sub, 0, 26, { size: 16, kh: 22, color: '#6a5640', weight: 'normal', maxW: 300 });
    // 閱讀進度: [Z] 鍵帽 26×26 中心 (180, 44), 外圈進度環(外緣 20, 環寬 3)
    var rd = num(s.readDuration, 1.5) || 1.5, ra = clamp(num(s.readAge, 0), 0, rd), ready = bool(s.ready);
    ctx.strokeStyle = 'rgba(42,32,22,0.15)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(180, 44, 18.5, 0, TAU); ctx.stroke();
    if (ra > 0) {
      ctx.strokeStyle = ready ? C.tutorDone : C.tutorAccent; ctx.lineCap = 'butt';
      ctx.beginPath(); ctx.arc(180, 44, 18.5, -PI / 2, -PI / 2 + TAU * (ra / rd)); ctx.stroke();
    }
    ctx.save(); ctx.globalAlpha *= ready ? 1 : 0.35;
    keyIcon(ctx, 'z', 180, 44, 26, 26, false);
    txt(ctx, bool(s.last) ? '繼續' : '下一步', 158, 44.5, { size: 15, align: 'right', color: C.tutorInk });
    ctx.restore();
    // 第幾張 / 共幾張: 小圓點直徑 8、間距 14, 中心 y = 54
    var tot = clamp(Math.floor(num(s.total, 1)), 1, 10), idx = Math.floor(num(s.index, 0));
    if (tot >= 2) {
      for (var d = 0; d < tot; d++) {
        var dx = (d - (tot - 1) / 2) * 14;
        ctx.beginPath(); ctx.arc(dx, 54, d === idx ? 4 : 3.25, 0, TAU);
        if (d === idx) { ctx.fillStyle = C.tutorInk; ctx.fill(); }
        else { ctx.strokeStyle = 'rgba(42,32,22,0.55)'; ctx.lineWidth = 1.5; ctx.stroke(); }
      }
    }
  }

  // ---------- 教學擋下提示(玩家腳下) ----------
  function drawTutorialWarn(ctx, s) {
    s = s || {};
    var d = num(s.duration, 1.2) || 1.2, a = num(s.age, d);
    if (!(a >= 0 && a < d)) return;
    var x = num(s.x, CX), y = num(s.y, CY);
    var sc = a < 0.15 ? 1.1 - 0.1 * (a / 0.15) : 1;
    var al = a > d - 0.3 ? (d - a) / 0.3 : 1;
    ctx.save(); ctx.globalAlpha = clamp(al, 0, 1); ctx.translate(x, y); ctx.scale(sc, sc);
    // 教學紙底 + 磚紅框(「不行」的警示色, 不刺眼); 左邊禁止記號
    ctx.fillStyle = C.tutorPaper; rr(ctx, -120, -15, 240, 30, 8); ctx.fill();
    ctx.strokeStyle = '#c8483a'; ctx.lineWidth = 2; rr(ctx, -119, -14, 238, 28, 7); ctx.stroke();
    ctx.fillStyle = '#c8483a'; ctx.beginPath(); ctx.arc(-102, 0, 9, 0, TAU); ctx.fill();
    ctx.fillStyle = '#ffffff'; rr(ctx, -107, -1.8, 10, 3.6, 1.5); ctx.fill();
    txt(ctx, str(s.text), 8, 0.5, { size: 15, color: '#7a1e14', maxW: 196 });
    ctx.restore();
  }

  // ---------- 出怪點「!」標示(第 1 關教學) ----------
  function drawSpawnMark(ctx, s) {
    s = s || {};
    var x = num(s.x, 40), y = num(s.y, 144), t = num(s.t, 0);
    var bob = -3.5 - 3.5 * Math.sin(t * 4.5); // 位移 −7~0
    var pulse = 0.5 + 0.5 * Math.sin(t * 7);
    ctx.save(); ctx.translate(x, y + bob);
    // 外光圈(只改亮度), 外緣 23
    ctx.strokeStyle = 'rgba(255,90,58,' + (0.3 + 0.55 * pulse) + ')'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, -2, 22, 0, TAU); ctx.stroke();
    // 指向路口的尖角(下)
    ctx.fillStyle = '#2a0000'; ctx.beginPath(); ctx.moveTo(-8, 13); ctx.lineTo(8, 13); ctx.lineTo(0, 28); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ff5a3a'; ctx.beginPath(); ctx.moveTo(-6, 12); ctx.lineTo(6, 12); ctx.lineTo(0, 25.5); ctx.closePath(); ctx.fill();
    // 牌身(和出怪預警同一套: 暗紅底 + 紅環 + 奶油色符號)
    ctx.fillStyle = '#2a0000'; ctx.beginPath(); ctx.arc(0, -2, 19, 0, TAU); ctx.fill();
    ctx.fillStyle = mixHex('#ff5a3a', '#ffa070', pulse * 0.6); ctx.beginPath(); ctx.arc(0, -2, 17, 0, TAU); ctx.fill();
    ctx.fillStyle = '#4a0c0c'; ctx.beginPath(); ctx.arc(0, -2, 13.5, 0, TAU); ctx.fill();
    // 「!」: 圓角長條 + 圓點(符號, 不是文字)
    ctx.fillStyle = '#ffd0a0';
    rr(ctx, -2.8, -13.5, 5.6, 13, 2.8); ctx.fill();
    ctx.beginPath(); ctx.arc(0, 4.5, 3, 0, TAU); ctx.fill();
    ctx.restore();
  }

  // ---------- 波次面板(左上角)與波次推進橫幅 ----------
  function drawWavePanel(ctx, s) {
    s = s || {};
    var x = num(s.x, 118), y = num(s.y, 81);
    var tw = Math.max(1, Math.floor(num(s.totalWaves, 3))), w = clamp(Math.floor(num(s.wave, 0)), 0, tw);
    var st = ({ countdown: 1, tutorial: 1, clear: 1, last: 1 }[s.status]) ? s.status : 'countdown';
    var bp = prog(s.bumpAge, num(s.bumpDuration, 0.4));
    ctx.save(); ctx.translate(x, y);
    ctx.fillStyle = 'rgba(14,18,28,0.84)'; rr(ctx, -110, -29, 220, 58, 9); ctx.fill();
    ctx.strokeStyle = 'rgba(255,210,74,0.6)'; ctx.lineWidth = 1.5; rr(ctx, -109.25, -28.25, 218.5, 56.5, 8.5); ctx.stroke();
    if (bp >= 0) { ctx.fillStyle = 'rgba(255,236,170,' + (0.45 * (1 - bp)) + ')'; rr(ctx, -110, -29, 220, 58, 9); ctx.fill(); }
    // 第一行(中心 y −12, 約 22px)
    if (w === 0) {
      txt(ctx, '開戰前', 0, -12, { size: 22, color: C.text });
    } else {
      var a1 = '第 ', a2 = String(w), a3 = ' / ' + tw + ' 波';
      var w1 = textW(ctx, a1, 22), w2 = textW(ctx, a2, 22), w3 = textW(ctx, a3, 22), px = -(w1 + w2 + w3) / 2;
      txt(ctx, a1, px, -12, { size: 22, align: 'left' });
      var ns = 1 + (bp >= 0 ? 0.3 * Math.sin(PI * bp) : 0);
      ctx.save(); ctx.translate(px + w1 + w2 / 2, -12); ctx.scale(ns, ns);
      txt(ctx, a2, 0, 0, { size: 22, color: C.gold });
      ctx.restore();
      txt(ctx, a3, px + w1 + w2, -12, { size: 22, align: 'left' });
    }
    // 第二行(中心 y +10, 約 14px)
    if (st === 'countdown') {
      var nw = Math.max(0, Math.ceil(num(s.nextWaveIn, 0)));
      var warn = nw <= 6, wp = 0.5 + 0.5 * Math.sin(now() * 8);
      var col = warn ? mixHex('#ff7a4a', '#ffd0b0', wp) : '#c8cedb';
      txt(ctx, '下一波 ' + nw + ' 秒', 0, 10, { size: 14, color: col });
      ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(-100, 21, 200, 4);
      ctx.fillStyle = warn ? col : '#9fd4ff'; ctx.fillRect(-100, 21, 200 * clamp(num(s.progress, 0), 0, 1), 4);
    } else if (st === 'tutorial') {
      // 小沙漏 + 「完成新手任務後開始」(教學琥珀)
      var tw2 = textW(ctx, '完成新手任務後開始', 14), gx = -(tw2 + 14) / 2;
      ctx.fillStyle = '#f0b060';
      ctx.beginPath(); ctx.moveTo(gx, 3); ctx.lineTo(gx + 9, 3); ctx.lineTo(gx + 4.5, 10); ctx.lineTo(gx + 9, 17); ctx.lineTo(gx, 17); ctx.lineTo(gx + 4.5, 10); ctx.closePath(); ctx.fill();
      txt(ctx, '完成新手任務後開始', gx + 14, 10, { size: 14, align: 'left', color: '#f0b060' });
    } else if (st === 'clear') {
      // 小劍 +「打倒這波敵人後開始」(一般色; 和沙漏 / 琥珀的教學等待分開)
      var tw3 = textW(ctx, '打倒這波敵人後開始', 14), sx0 = -(tw3 + 16) / 2;
      ctx.save(); ctx.translate(sx0 + 5, 10); ctx.rotate(PI / 4);
      ctx.strokeStyle = '#e8ecf4'; ctx.lineWidth = 2; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(0, -7); ctx.lineTo(0, 3); ctx.stroke();
      ctx.strokeStyle = '#b08a4a'; ctx.beginPath(); ctx.moveTo(-3.5, 3); ctx.lineTo(3.5, 3); ctx.moveTo(0, 3); ctx.lineTo(0, 6.5); ctx.stroke();
      ctx.restore();
      txt(ctx, '打倒這波敵人後開始', sx0 + 16, 10, { size: 14, align: 'left', color: '#dfe4ee' });
    } else {
      txt(ctx, '最後一波!', 0, 10, { size: 15, color: '#ff6a5a' });
    }
    ctx.restore();
  }
  function drawWaveBanner(ctx, s) {
    s = s || {};
    var d = num(s.duration, 1.6) || 1.6, a = num(s.age, d);
    if (!(a >= 0 && a < d)) return;
    var tw = Math.max(1, Math.floor(num(s.totalWaves, 3))), w = Math.max(1, Math.floor(num(s.wave, 1))), last = bool(s.last) || bool(s.boss);
    var t = a * 1.6 / d; // 換算回規格時間軸
    // 第 13 輪: 停在 (512,170), 縮進波次面板 (118,81)
    var cx = CX, cy = 170, sc = 1, al = 1, e = 1;
    if (t < 0.3) { e = 1 - Math.pow(1 - t / 0.3, 3); cx = -280 + (CX + 280) * e; }
    else if (t >= 1.1) { var f = (t - 1.1) / 0.5, fe = f * f; cx = CX + (118 - CX) * fe; cy = 170 + (81 - 170) * fe; sc = 1 - 0.61 * fe; al = 1 - 0.4 * fe; }
    ctx.save(); ctx.globalAlpha = al; ctx.translate(cx, cy); ctx.scale(sc, sc);
    ctx.fillStyle = 'rgba(14,18,28,0.72)'; rr(ctx, -280, -48, 560, 96, 14); ctx.fill();
    ctx.strokeStyle = last ? '#ff5a4a' : C.gold; ctx.lineWidth = 3; rr(ctx, -278.5, -46.5, 557, 93, 13); ctx.stroke();
    if (t >= 0.3 && t < 1.1) {
      // 一道光從左到右掃過(剪在橫幅內)
      ctx.save(); rr(ctx, -280, -48, 560, 96, 14); ctx.clip();
      var sx = -330 + ((t - 0.3) / 0.8) * 660;
      var g = ctx.createLinearGradient(sx - 50, 0, sx + 50, 0);
      g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, 'rgba(255,255,255,0.22)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g; ctx.fillRect(sx - 50, -48, 100, 96);
      ctx.restore();
    }
    if (last && bool(s.boss)) {
      // Boss 關最後一波: 「最後一波!」上移 12, 下方 (0, +28) 一行金字紅描邊「BOSS 來襲」, 兩側紅色角記號(和 Boss 名牌、血條同一個紅)
      txt(ctx, '最後一波!', 0, -12, { size: 42, color: '#ff5a4a', stroke: '#2a0000', sw: 5, maxW: 520 });
      var bw2 = textW(ctx, 'BOSS 來襲', 20);
      txt(ctx, 'BOSS 來襲', 0, 28, { size: 20, color: C.gold, stroke: '#6a0010', sw: 4 });
      ctx.fillStyle = '#ff3a4a';
      for (var bsd = -1; bsd <= 1; bsd += 2) {
        var hx = bsd * (bw2 / 2 + 16);
        ctx.beginPath(); ctx.moveTo(hx - 6, 28); ctx.lineTo(hx, 21); ctx.lineTo(hx + 6, 28); ctx.lineTo(hx, 35); ctx.closePath(); ctx.fill();
      }
    } else if (last) {
      txt(ctx, '最後一波!', 0, 0, { size: 48, color: '#ff5a4a', stroke: '#2a0000', sw: 5, maxW: 520 });
    } else {
      var a1 = '第 ', a3 = ' 波', nNew = String(w), nOld = String(Math.max(0, w - 1));
      var w1 = textW(ctx, a1, 48), w3 = textW(ctx, a3, 48), wn = Math.max(textW(ctx, nNew, 48), textW(ctx, nOld, 48));
      var px = -(w1 + wn + w3) / 2, ty = -4;
      var o = { size: 48, color: C.gold, stroke: '#2a1a00', sw: 5 };
      txt(ctx, a1, px + w1 / 2, ty, o);
      txt(ctx, a3, px + w1 + wn + w3 / 2, ty, o);
      // 數字翻牌: wave−1 往上翻出、wave 從下翻入(剪在數字格內)
      var nx = px + w1 + wn / 2;
      ctx.save(); ctx.beginPath(); ctx.rect(nx - wn / 2 - 6, -38, wn + 12, 66); ctx.clip();
      if (t < 0.3) {
        txt(ctx, nOld, nx, ty - 56 * e, o);
        txt(ctx, nNew, nx, ty + 56 * (1 - e), o);
      } else txt(ctx, nNew, nx, ty, o);
      ctx.restore();
      txt(ctx, '共 ' + tw + ' 波', 262, 32, { size: 16, align: 'right', color: '#c8cedb', weight: 'normal' });
    }
    ctx.restore();
  }

  // ---------- Boss 血條(第 7 輪, HUD 中間 360×40) ----------
  // 深紅黑底 + 紅細邊; 左上紅底白字「BOSS」小標 + 名稱; 右上 hp / maxHp; 下方 348×10 紅色生命條(上緣一條該 Boss 的意象色細線)
  var BOSS_TINT = { bossFrost: '#8fd8ff', bossThunder: '#d27cff' };
  var BOSS_RED = '#ff3a4a';
  function drawBossBar(ctx, s) {
    s = s || {};
    var x = num(s.x, 590), y = num(s.y, 24);
    var type = isBoss(s.type) ? s.type : 'bossFrost';
    var mh = Math.max(1, num(s.maxHp, 1)), hp = clamp(num(s.hp, mh), 0, mh), r = hp / mh;
    var sd = num(s.showDuration, 0.4) || 0.4, sa = clamp(num(s.showAge, sd), 0, sd), sp = sa / sd, se = 1 - (1 - sp) * (1 - sp);
    var al = sp;
    if (bool(s.hiding)) { var hd = num(s.hideDuration, 0.6) || 0.6; al *= 1 - clamp(num(s.hideAge, 0), 0, hd) / hd; }
    if (!(al > 0)) return;
    ctx.save();
    ctx.globalAlpha = al; ctx.translate(x, y); ctx.scale(0.9 + 0.1 * se, 0.9 + 0.1 * se);
    ctx.fillStyle = 'rgba(32,8,14,0.9)'; rr(ctx, -120, -20, 240, 40, 8); ctx.fill();
    ctx.strokeStyle = BOSS_RED; ctx.lineWidth = 1.5; rr(ctx, -119.25, -19.25, 237.5, 37.5, 7.5); ctx.stroke();
    // 第 13 輪: 240×40。「BOSS」小標 40×16 中心 (−98, −9)
    // 觸控模式: 「BOSS」小標加大到 54×20(字級下限 17), 名字往右讓位
    var T = touchOn(), bgw = T ? 54 : 40, nx = T ? -58 : -72;
    ctx.fillStyle = '#c8283a'; rr(ctx, -118, T ? -19 : -17, bgw, T ? 20 : 16, 4); ctx.fill();
    txt(ctx, 'BOSS', -118 + bgw / 2, -8.5, { size: 11, color: '#ffffff' });
    var hs = Math.ceil(hp) + ' / ' + Math.round(mh), hw = textW(ctx, hs, 12);
    txt(ctx, hs, 112, -8.5, { size: 12, align: 'right', color: '#ffd0d4' });
    txt(ctx, str(s.name), nx, -8.5, { size: 15, align: 'left', color: '#ffffff', maxW: Math.max(40, 112 - nx - hw - 8) });
    // 生命條 228×10, 中心 (0, 10)
    ctx.fillStyle = 'rgba(0,0,0,0.65)'; rr(ctx, -114, 5, 228, 10, 3); ctx.fill();
    if (r > 0) {
      ctx.save(); rr(ctx, -114, 5, 228, 10, 3); ctx.clip();
      ctx.fillStyle = '#e0303e'; ctx.fillRect(-114, 5, 228 * r, 10);
      ctx.fillStyle = BOSS_TINT[type]; ctx.fillRect(-114, 5, 228 * r, 2);
      ctx.restore();
    }
    var ph = prog(s.hitAge, num(s.hitDuration, 0.15));
    if (ph >= 0) { ctx.save(); ctx.globalAlpha *= 0.85 * (1 - ph); ctx.fillStyle = '#ffffff'; rr(ctx, -114, 5, 228, 10, 3); ctx.fill(); ctx.restore(); }
    if (bool(s.healing)) {
      // 治癒中: 條上薄荷綠斜紋往右流 + 白綠小十字(治癒意象)
      ctx.save(); rr(ctx, -114, 5, 228, 10, 3); ctx.clip();
      var off = (now() * 40) % 24;
      ctx.fillStyle = rgba(C.heal, 0.5);
      for (var i = -1; i < 11; i++) { var sx = -114 + i * 24 + off; if (sx < -114 || sx + 14 > 114) continue; ctx.beginPath(); ctx.moveTo(sx, 15); ctx.lineTo(sx + 8, 5); ctx.lineTo(sx + 14, 5); ctx.lineTo(sx + 6, 15); ctx.closePath(); ctx.fill(); }
      for (var j = 0; j < 3; j++) { var px = -109 + ((now() * 60 + j * 73) % 218); ctx.fillStyle = '#0f3a26'; plusPath(ctx, px, 10, 4.2); ctx.fill(); ctx.fillStyle = '#c8ffe0'; plusPath(ctx, px, 10, 3); ctx.fill(); }
      ctx.restore();
    }
    ctx.restore();
  }

  // ---------- Boss 出場演出(第 7 輪, 2.9 秒真實時間) ----------
  var BOSS_POS = { bossFrost: [40, 144], bossThunder: [40, 336] }; // 第 13 輪出場點(預設值; RD 傳 x, y)
  function seg(t, a, b) { return clamp((t - a) / (b - a), 0, 1); }
  function eOut(u) { return 1 - (1 - u) * (1 - u); }
  // 全畫面壓暗 a, 在 (x, y) 挖半徑 R 的聚光圈(往內柔化 soft); 圈內另壓 inner(雷霆魔王的烏雲)
  function dimSpot(ctx, x, y, R, soft, a, inner) {
    if (!(a > 0) && !(inner > 0)) return;
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,' + a + ')';
    ctx.beginPath(); ctx.rect(FX0, 0, FW, H); ctx.arc(x, y, R, 0, TAU, true); ctx.fill();
    var g = ctx.createRadialGradient(x, y, R - soft, x, y, R);
    g.addColorStop(0, 'rgba(0,0,0,' + inner + ')'); g.addColorStop(1, 'rgba(0,0,0,' + a + ')');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, R, 0, TAU); ctx.fill();
    ctx.restore();
  }
  function puff(ctx, x, y, r, col, a) {
    if (!(a > 0) || !(r > 0)) return;
    ctx.save(); ctx.globalAlpha *= a; ctx.fillStyle = col;
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.arc(x + r * 0.6, y + r * 0.2, r * 0.7, 0, TAU); ctx.arc(x - r * 0.6, y + r * 0.25, r * 0.65, 0, TAU); ctx.fill();
    ctx.restore();
  }
  function bossFigure(ctx, type, x, y, o) {
    o = o || {};
    ctx.save(); ctx.translate(x + (o.dx || 0), y + (o.dy || 0));
    if (o.scale) ctx.scale(o.scale, o.scale);
    if (o.lean) bossLean(ctx, o.lean);
    bossBody(ctx, type, o);
    ctx.restore();
  }
  function drawBossIntro(ctx, s) {
    s = s || {};
    var type = isBoss(s.type) ? s.type : 'bossFrost';
    var d = num(s.duration, 2.9) || 2.9, age = num(s.age, 0);
    if (!(age >= 0 && age < d)) return;
    var t = age * 2.9 / d; // 換算回規格時間軸
    var def = BOSS_POS[type], x = num(s.x, def[0]), y = num(s.y, def[1]);
    var out = t >= 2.6 ? 1 - seg(t, 2.6, 2.9) : 1;
    var dim = 0.55 * seg(t, 0, 0.3), inner = 0;
    if (type === 'bossThunder') {
      if (t >= 0.3 && t < 1.1) { dim = 0.55 + 0.2 * seg(t, 0.3, 0.6); inner = 0.4 * seg(t, 0.3, 0.6); }
      else if (t >= 1.1) { dim = 0.75 - 0.2 * seg(t, 1.1, 2.6); inner = 0.4 * (1 - seg(t, 1.1, 1.3)); }
    }
    ctx.save();
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    dimSpot(ctx, x, y, 140, 16, dim * out, inner * out);
    var i, k;
    if (type === 'bossFrost') {
      // 地面結霜: 0.3~0.9 半徑 0 → 100, 冰晶放射紋 + 閃爍的小冰星; 留到淡出
      if (t >= 0.3) {
        var fr = 100 * eOut(seg(t, 0.3, 0.9));
        ctx.save(); ctx.globalAlpha = out;
        var g = ctx.createRadialGradient(x, y, 0, x, y, Math.max(1, fr));
        g.addColorStop(0, 'rgba(220,245,255,0.42)'); g.addColorStop(1, 'rgba(180,230,255,0.14)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, fr, 0, TAU); ctx.fill();
        ctx.strokeStyle = 'rgba(235,250,255,0.75)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(x, y, Math.max(0.5, fr - 1), 0, TAU); ctx.stroke();
        ctx.strokeStyle = 'rgba(235,250,255,0.6)'; ctx.lineWidth = 1.2;
        for (i = 0; i < 12; i++) {
          var a = i * TAU / 12 + hash(i, 2, 9) * 0.4, r0 = fr * 0.25, r1 = fr * (0.7 + 0.25 * hash(i, 5, 1));
          ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * r0, y + Math.sin(a) * r0); ctx.lineTo(x + Math.cos(a) * r1, y + Math.sin(a) * r1);
          var bm = (r0 + r1) / 2; ctx.moveTo(x + Math.cos(a) * bm, y + Math.sin(a) * bm); ctx.lineTo(x + Math.cos(a + 0.18) * (bm + fr * 0.12), y + Math.sin(a + 0.18) * (bm + fr * 0.12)); ctx.stroke();
        }
        for (i = 0; i < 9; i++) {
          var sa2 = hash(i, 8, 3) * TAU, sr = fr * (0.2 + 0.7 * hash(i, 4, 6)), tw = 0.5 + 0.5 * Math.sin(now() * 9 + i * 1.7);
          ctx.globalAlpha = out * tw; ctx.fillStyle = '#ffffff'; starPath(ctx, x + Math.cos(sa2) * sr, y + Math.sin(sa2) * sr, 4, 1.2); ctx.fill();
        }
        ctx.restore();
      }
      // 0.9~1.5 冰塊竄出把 Boss 封住(84×100, 中心 (x, y−10)), 裂痕越來越多
      if (t >= 0.9 && t < 1.5) {
        var rise = eOut(seg(t, 0.9, 1.1)), bx = x, by = y - 10;
        ctx.save();
        ctx.beginPath(); ctx.rect(bx - 44, by + 50 - 100 * rise, 88, 100 * rise + 2); ctx.clip();
        bossFigure(ctx, type, x, y, { mono: '#0e1626' });
        var poly = [[-42, -25], [-24, -50], [18, -50], [42, -30], [40, 32], [20, 50], [-26, 50], [-42, 30]];
        ctx.beginPath(); poly.forEach(function (q, n) { if (n) ctx.lineTo(bx + q[0], by + q[1]); else ctx.moveTo(bx + q[0], by + q[1]); }); ctx.closePath();
        ctx.fillStyle = 'rgba(175,228,255,0.74)'; ctx.fill();
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.stroke();
        ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.moveTo(bx - 24, by - 50); ctx.lineTo(bx - 14, by + 50); ctx.moveTo(bx + 18, by - 50); ctx.lineTo(bx + 24, by + 50); ctx.stroke();
        var nc = Math.floor(1 + 9 * seg(t, 1.1, 1.5));
        for (i = 0; i < nc; i++) {
          var ca = hash(i, 1, 4) * TAU, cx = bx + (hash(i, 2, 4) - 0.5) * 30, cy = by + (hash(i, 3, 4) - 0.5) * 40;
          ctx.beginPath(); ctx.moveTo(cx, cy);
          for (k = 1; k <= 3; k++) { ca += (hash(i, k, 5) - 0.5) * 1.2; cx += Math.cos(ca) * 9; cy += Math.sin(ca) * 9; ctx.lineTo(clamp(cx, bx - 40, bx + 40), clamp(cy, by - 48, by + 48)); }
          ctx.strokeStyle = '#2a4a78'; ctx.lineWidth = 2.2; ctx.stroke();
          ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1; ctx.stroke();
        }
        ctx.restore();
      }
      // 1.5 起 Boss 現身; 1.7~1.85 仰頭咆哮放大到 1.15, 1.85~2.0 收回 1.0(age ≥ 2.0 一定是 1.0)
      if (t >= 1.5) {
        var sc = 1, ro = 0;
        if (t >= 1.7 && t < 1.85) { sc = 1 + 0.15 * eOut(seg(t, 1.7, 1.85)); }
        else if (t >= 1.85 && t < 2.0) { sc = 1.15 - 0.15 * seg(t, 1.85, 2.0); }
        ro = (sc - 1) / 0.15;
        bossFigure(ctx, type, x, y, { scale: sc, roar: ro });
      }
      // 1.5~1.9 冰塊炸開: 白閃 + 14 片碎冰往外飛(最遠 130)
      if (t >= 1.5 && t < 1.9) {
        var kb = seg(t, 1.5, 1.75);
        if (t < 1.65) { var fk = seg(t, 1.5, 1.65); ctx.save(); ctx.globalAlpha = 0.75 * (1 - fk); ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(x, y - 10, 30 + 40 * fk, 0, TAU); ctx.fill(); ctx.restore(); }
        ctx.save(); ctx.globalAlpha = 1 - seg(t, 1.65, 1.9);
        for (i = 0; i < 14; i++) {
          var ia = i * TAU / 14 + hash(i, 6, 2) * 0.35, idist = 16 + 98 * eOut(kb) * (0.75 + 0.25 * hash(i, 7, 2));
          iceShard(ctx, x + Math.cos(ia) * idist, y - 10 + Math.sin(ia) * idist, ia + kb * 4, 5 + 3 * hash(i, 9, 2));
        }
        ctx.restore();
      }
      // 1.7~2.6 嘴前白色寒氣(往右上噴, 最遠 60), 2.0 起散去
      if (t >= 1.7) {
        var reach = eOut(seg(t, 1.7, 2.0)), ba = t < 2.0 ? seg(t, 1.7, 1.8) : 1 - seg(t, 2.0, 2.6);
        var mx = x + 6, my2 = y + 14, dir = -0.55;
        for (i = 0; i < 5; i++) {
          var dd = (8 + i * 10) * reach + (t > 2.0 ? (t - 2.0) * 6 : 0);
          puff(ctx, mx + Math.cos(dir) * dd, my2 + Math.sin(dir) * dd - (t > 2.0 ? (t - 2.0) * 8 : 0), (3 + i * 1.6) * (0.5 + 0.5 * reach), '#f2fbff', 0.75 * ba * out);
        }
      }
    } else {
      // 雷霆魔王: 0.6 / 0.85 / 1.1 三道落雷(每道 0.15 秒), 落點各炸一小圈電光(半徑 40)
      var bolts = [[0.6, x - 30, 3], [0.85, x + 30, 3], [1.1, x, 5.5]];
      for (i = 0; i < 3; i++) {
        var T = bolts[i][0], tx = bolts[i][1], bwd = bolts[i][2];
        if (t >= T && t < T + 0.15) {
          var bal = 1 - 0.5 * seg(t, T, T + 0.15), seed = i * 31 + Math.floor(now() * 30);
          ctx.save(); ctx.globalAlpha = bal;
          ctx.strokeStyle = rgba(C.shock, 0.45); ctx.lineWidth = bwd + 8; boltPath(ctx, tx + 18 - i * 12, 0, tx, y, 14, seed); ctx.stroke();
          ctx.strokeStyle = C.shock; ctx.lineWidth = bwd; boltPath(ctx, tx + 18 - i * 12, 0, tx, y, 14, seed); ctx.stroke();
          ctx.strokeStyle = '#ffffff'; ctx.lineWidth = Math.max(1.2, bwd * 0.45); boltPath(ctx, tx + 18 - i * 12, 0, tx, y, 14, seed); ctx.stroke();
          ctx.restore();
        }
        if (t >= T && t < T + 0.3) {
          var er = 40 * eOut(seg(t, T, T + 0.2)), ea = 1 - seg(t, T + 0.1, T + 0.3);
          ctx.save(); ctx.globalAlpha = ea;
          var eg2 = ctx.createRadialGradient(tx, y, 0, tx, y, Math.max(1, er));
          eg2.addColorStop(0, 'rgba(255,255,255,0.95)'); eg2.addColorStop(0.45, rgba(C.shock, 0.7)); eg2.addColorStop(1, rgba(C.shock, 0));
          ctx.fillStyle = eg2; ctx.beginPath(); ctx.arc(tx, y, er, 0, TAU); ctx.fill();
          ctx.restore();
        }
      }
      // 1.1 起 Boss 現身; 1.3~2.0 周身電弧(半徑 ≤ 56)+ 雙眼發光; 2.0~2.6 電弧收進身體
      if (t >= 1.1) {
        var eyeG = t < 1.3 ? 0.6 : t < 2.0 ? 1 : 1 - 0.65 * seg(t, 2.0, 2.6);
        bossFigure(ctx, type, x, y, { eyeGlow: eyeG });
        if (t >= 1.3) {
          var Ra = t < 2.0 ? 48 : 48 - 28 * seg(t, 2.0, 2.6), aa = t < 2.0 ? seg(t, 1.3, 1.4) : 1 - 0.85 * seg(t, 2.0, 2.6);
          var sd3 = Math.floor(now() * 20);
          ctx.save(); ctx.globalAlpha = aa * out;
          for (i = 0; i < 6; i++) {
            var a0 = i * TAU / 6 + now() * 1.5, a1 = a0 + 0.8, rA = i % 2 ? Ra : Ra * 0.82;
            var p0x = x + Math.cos(a0) * rA, p0y = y + Math.sin(a0) * rA, p1x = x + Math.cos(a1) * rA, p1y = y + Math.sin(a1) * rA;
            ctx.strokeStyle = rgba(C.shock, 0.55); ctx.lineWidth = 4.5; boltPath(ctx, p0x, p0y, p1x, p1y, 5, sd3 + i); ctx.stroke();
            ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5; boltPath(ctx, p0x, p0y, p1x, p1y, 5, sd3 + i); ctx.stroke();
          }
          ctx.restore();
        }
      }
      // 1.1~1.3 全畫面白閃(0.6 → 0), 蓋在壓暗與 Boss 之上、名牌之下
      if (t >= 1.1 && t < 1.3) { ctx.fillStyle = 'rgba(255,255,255,' + (0.6 * (1 - seg(t, 1.1, 1.3))) + ')'; ctx.fillRect(FX0, 0, FW, H); }
    }
    // 名牌 520×110: 1.6~2.0 從 (512,300) 滑到 (512,260) 並淡入, 2.0~2.6 停住, 2.6~2.9 淡出(第 13 輪)
    if (t >= 1.6) {
      var pu = seg(t, 1.6, 2.0), py = 300 - 40 * eOut(pu);
      ctx.save(); ctx.globalAlpha = pu * out; ctx.translate(CX, py);
      ctx.fillStyle = 'rgba(22,8,14,0.9)'; rr(ctx, -260, -55, 520, 110, 12); ctx.fill();
      ctx.strokeStyle = BOSS_RED; ctx.lineWidth = 3; rr(ctx, -258.5, -53.5, 517, 107, 11); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,210,74,0.7)'; ctx.lineWidth = 1; rr(ctx, -252, -47, 504, 94, 8); ctx.stroke();
      ctx.strokeStyle = BOSS_RED; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-70, -36); ctx.lineTo(-34, -36); ctx.moveTo(34, -36); ctx.lineTo(70, -36); ctx.stroke();
      txt(ctx, 'BOSS', 0, -36, { size: 16, color: BOSS_RED, stroke: '#2a0008', sw: 3 });
      txt(ctx, str(s.name), 0, -6, { size: 34, color: '#ffffff', stroke: '#2a0008', sw: 5, maxW: 480 });
      var parts = arr(s.parts).slice(0, 4);
      for (k = 0; k < 4; k++) {
        var pcx = -48 + 32 * k;
        ctx.fillStyle = 'rgba(16,20,30,0.9)'; rr(ctx, pcx - 14, 20, 28, 28, 4); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = 1; rr(ctx, pcx - 13.5, 20.5, 27, 27, 4); ctx.stroke();
        if (typeof parts[k] === 'string' && parts[k]) itemIcon(ctx, parts[k], pcx, 34, 24);
      }
      ctx.restore();
    }
    ctx.restore();
  }

  // ---------- 第一次合成演出 ----------
  function drawComboReveal(ctx, s) {
    s = s || {};
    var age = clamp(num(s.age, 1.5), 0, 1.5);
    var cd = num(s.closeDuration, 0.3) || 0.3, ca = num(s.closeAge, cd);
    var fade = bool(s.closing) ? clamp(1 - ca / cd, 0, 1) : 1;
    if (fade <= 0) return;
    var A = isBasic(s.a) ? s.a : '', B = isBasic(s.b) ? s.b : '', R = isCombo(s.result) ? s.result : '';
    ctx.save(); ctx.globalAlpha = fade;
    ctx.fillStyle = 'rgba(0,0,0,' + (0.7 * clamp(age / 0.3, 0, 1)) + ')'; ctx.fillRect(FX0, 0, FW, H);
    // 第 13 輪版位: 撞擊中心 (512,200); 面板停在 (512,400)
    var MX = CX, MY = 200;
    // 0.3~0.9 材料滑入; 0.9~1.05 撞向中央
    if (age >= 0.3 && age < 1.05) {
      var ax, bx, plusA;
      if (age < 0.9) { var e = (age - 0.3) / 0.6, ee = 1 - (1 - e) * (1 - e); ax = MX - 300 + 240 * ee; bx = MX + 300 - 240 * ee; plusA = ee; }
      else { var c = (age - 0.9) / 0.15; ax = MX - 60 + 60 * c * c; bx = MX + 60 - 60 * c * c; plusA = 1 - c; }
      ctx.save(); ctx.globalAlpha *= clamp((age - 0.3) / 0.1, 0, 1);
      itemIcon(ctx, A, ax, MY, 64); itemIcon(ctx, B, bx, MY, 64);
      ctx.globalAlpha *= plusA;
      txt(ctx, '+', MX, MY + 2, { size: 44, color: C.gold, stroke: '#2a1a00', sw: 4 });
      ctx.restore();
    }
    // 閃光: 一圈從中心擴散, 外緣最大 90
    if (age >= 0.9 && age < 1.2) {
      var fr = (age - 0.9) / 0.3, rad = 18 + 69 * fr;
      ctx.save();
      ctx.globalAlpha *= 1 - fr;
      var g = ctx.createRadialGradient(MX, MY, 0, MX, MY, rad);
      g.addColorStop(0, 'rgba(255,255,255,0.9)'); g.addColorStop(1, 'rgba(255,230,150,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(MX, MY, rad, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#fff4c0'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(MX, MY, rad, 0, TAU); ctx.stroke();
      ctx.restore();
    }
    // 組合圖示 96×96, 彈一下 1.0 → 1.25 → 1.0
    if (age >= 1.05) {
      var bt = Math.min(1, (age - 1.05) / 0.15);
      var bsc = bt < 0.5 ? 1 + 0.5 * bt : 1.25 - 0.5 * (bt - 0.5);
      itemIcon(ctx, R, MX, MY, 96 * bsc);
    }
    // 1.2~1.5 說明面板 600×200 從 (672,450) 往上滑到 (672,400) 並淡入
    if (age >= 1.2) {
      var pq = clamp((age - 1.2) / 0.3, 0, 1), pe = 1 - (1 - pq) * (1 - pq);
      ctx.save(); ctx.globalAlpha *= pq; ctx.translate(CX, 450 - 50 * pe);
      ctx.fillStyle = C.panel; rr(ctx, -300, -100, 600, 200, 16); ctx.fill();
      ctx.strokeStyle = C.gold; ctx.lineWidth = 3; rr(ctx, -298.5, -98.5, 597, 197, 15); ctx.stroke();
      txt(ctx, '新組合!', 0, -76, { size: 22, color: C.gold, stroke: '#2a1a00', sw: 3 });
      itemIcon(ctx, R, -230, -6, 56);
      txt(ctx, str(s.name), -190, -24, { size: 26, align: 'left', color: '#ffffff', maxW: 300 });
      txt(ctx, str(s.text), -190, 12, { size: 17, align: 'left', color: '#d6dbe6', weight: 'normal', maxW: 289 });
      itemIcon(ctx, A, 140, -10, 24);
      txt(ctx, '+', 188, -9.5, { size: 18, color: C.textDim });
      itemIcon(ctx, B, 236, -10, 24);
      txt(ctx, str(s.aName), 140, 18, { size: 12, color: '#c8cedb', weight: 'normal', maxW: 52 });
      txt(ctx, str(s.bName), 236, 18, { size: 12, color: '#c8cedb', weight: 'normal', maxW: 52 });
      if (bool(s.ready) && age >= 1.5) {
        ctx.globalAlpha *= 0.55 + 0.45 * Math.cos(now() * 5);
        richLine(ctx, '[Z] 確定', 0, 76, { size: 18, kh: 22, color: '#ffffff' });
      }
      ctx.restore();
    }
    ctx.restore();
  }

  // ---------- 組合圖鑑 ----------
  function codexRow(ctx, cx, cy, e) {
    e = e && typeof e === 'object' ? e : {};
    ctx.save(); ctx.translate(cx, cy);
    if (e.unlocked !== true) {
      // 未解鎖: 整列畫問號, 不透露任何真實圖示 / 名稱 / 效果; 「+」「=」照畫, 整列略暗
      ctx.fillStyle = 'rgba(0,0,0,0.22)'; rr(ctx, -240, -34, 480, 68, 10); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.07)'; ctx.lineWidth = 1; rr(ctx, -239.5, -33.5, 479, 67, 9.5); ctx.stroke();
      codexQ(ctx, -200, -10, 32);
      txt(ctx, '+', -158, -9.5, { size: 18, color: 'rgba(169,176,191,0.6)' });
      codexQ(ctx, -116, -10, 32);
      txt(ctx, '=', -74, -9.5, { size: 18, color: 'rgba(169,176,191,0.6)' });
      codexQ(ctx, -34, -10, 40);
      txt(ctx, '???', -4, -16, { size: 18, align: 'left', color: '#6f7686' });
      ctx.restore();
      return;
    }
    ctx.fillStyle = 'rgba(255,255,255,0.04)'; rr(ctx, -240, -34, 480, 68, 10); ctx.fill();
    var A = isBasic(e.a) ? e.a : '', B = isBasic(e.b) ? e.b : '', R = isCombo(e.result) ? e.result : '';
    itemIcon(ctx, A, -200, -10, 32);
    txt(ctx, str(e.aName), -200, 20, { size: 12, color: C.textDim, weight: 'normal', maxW: 56 });
    txt(ctx, '+', -158, -9.5, { size: 18, color: C.textDim });
    itemIcon(ctx, B, -116, -10, 32);
    txt(ctx, str(e.bName), -116, 20, { size: 12, color: C.textDim, weight: 'normal', maxW: 56 });
    txt(ctx, '=', -74, -9.5, { size: 18, color: C.textDim });
    itemIcon(ctx, R, -34, -10, 40);
    txt(ctx, str(e.name), -4, -16, { size: 18, align: 'left', color: '#ffffff', maxW: 170 });
    txt(ctx, str(e.text), -4, 14, { size: 13, align: 'left', color: '#c8cedb', weight: 'normal', maxW: 232 });
    ctx.restore();
  }
  // 問號格: 中心 (cx, cy), 邊長 sz; 暗底 + 虛線框 + 大問號(和任何魂件圖示的外形都不同: 不是方塊色、不是金八角)
  function codexQ(ctx, cx, cy, sz) {
    var h = sz / 2;
    ctx.save();
    ctx.fillStyle = '#121620'; rr(ctx, cx - h, cy - h, sz, sz, sz * 0.2); ctx.fill();
    ctx.strokeStyle = 'rgba(169,176,191,0.45)'; ctx.lineWidth = 1.2; ctx.setLineDash([3, 2.5]);
    rr(ctx, cx - h + 0.6, cy - h + 0.6, sz - 1.2, sz - 1.2, sz * 0.2); ctx.stroke();
    ctx.setLineDash([]);
    txt(ctx, '?', cx, cy + 1, { size: Math.round(sz * 0.66), color: '#8a91a2' });
    ctx.restore();
  }
  function drawCodex(ctx, s) {
    s = s || {};
    var entries = arr(s.entries);
    var found = clamp(Math.floor(num(s.foundCount, 0)), 0, 10);
    ctx.save();
    // 第 13 輪: 面板 1000×528 中心 (512,302)(x 12~1012、y 38~566); 列 480×68, 中心 x 262 / 762、y 116 + 72i
    ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(FX0, 0, FW, H);
    ctx.fillStyle = C.panel; rr(ctx, CX - 500, 38, 1000, 528, 18); ctx.fill();
    ctx.strokeStyle = '#6a5a3a'; ctx.lineWidth = 2; rr(ctx, CX - 499, 39, 998, 526, 17); ctx.stroke();
    txt(ctx, '組合圖鑑', CX, 70, { size: 28, color: C.gold });
    txt(ctx, '已發現 ' + found + ' / 10', 992, 70, { size: 16, align: 'right', color: '#ffd28a' });
    ctx.strokeStyle = 'rgba(255,255,255,0.1)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(CX + 0.5, 88); ctx.lineTo(CX + 0.5, 514); ctx.stroke();
    for (var i = 0; i < 11; i++) {
      var col = i < 6 ? 0 : 1, row = i < 6 ? i : i - 6;
      codexRow(ctx, col ? 762 : 262, 116 + 72 * row, entries[i]);
    }
    richLine(ctx, (window.PVDX && window.PVDX.on) ? '[X] 關閉' : '[C] 關閉', CX, 542, { size: 16, kh: 22, color: C.textDim, weight: 'normal' });
    ctx.restore();
  }

  // ---------- Esc 暫停 ----------
  function drawPause(ctx) {
    ctx.save();
    // 完全停住: 中性黑壓暗 + 灰框面板(慢動作是冷藍去色 + 冰藍邊框, 兩者不同)
    // 第 13 輪: 面板 360×160 中心 (512,288); 「暫停」(512,263)、「[Esc] 繼續」(512,323); 壓暗畫滿 x −160~1184
    ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(FX0, 0, FW, H);
    ctx.fillStyle = C.panel; rr(ctx, CX - 180, CY - 80, 360, 160, 16); ctx.fill();
    ctx.strokeStyle = '#c8cedb'; ctx.lineWidth = 2; rr(ctx, CX - 179, CY - 79, 358, 158, 15); ctx.stroke();
    ctx.fillStyle = '#e8ecf4'; rr(ctx, CX - 78, CY - 40, 9, 30, 2); ctx.fill(); rr(ctx, CX - 63, CY - 40, 9, 30, 2); ctx.fill();
    txt(ctx, '暫停', CX, CY - 25, { size: 40, color: '#ffffff' });
    richLine(ctx, '[Esc] 繼續', CX, CY + 35, { size: 18, kh: 22, color: C.text });
    ctx.restore();
  }

  window.Art = {
    // 第 13 輪: 設計畫布 1280×720(16:9); 發布時依裝置加寬, 上限 1680(screen-width 規範), 本輪不做加寬
    canvas: { width: VW, height: 720 },
    palette: C,
    drawTitle: drawTitle,
    drawTutorialClear: drawTutorialClear,
    drawTutorialChoice: drawTutorialChoice,
    drawBackground: drawBackground,
    drawShopZone: drawShopZone,
    drawShopHint: drawShopHint,
    drawHolyTrail: drawHolyTrail,
    drawPillarRange: drawPillarRange,
    drawResonanceLine: drawResonanceLine,
    drawCastle: drawCastle,
    drawRespawnQueue: drawRespawnQueue,
    drawCrossbow: drawCrossbow,
    drawPillar: drawPillar,
    drawSoldier: drawSoldier,
    drawGolem: drawGolem,
    drawRallyFlag: drawRallyFlag,
    drawUnitBreak: drawUnitBreak,
    drawEnemy: drawEnemy,
    drawCorpse: drawCorpse,
    drawGroundPart: drawGroundPart,
    drawCoin: drawCoin,
    drawPlayer: drawPlayer,
    drawActionHint: drawActionHint,
    drawPlaceHere: drawPlaceHere,
    drawPlacePreview: drawPlacePreview,
    drawSoulSlots: drawSoulSlots,
    drawFrostAura: drawFrostAura,
    drawHealAura: drawHealAura,
    drawHealBeam: drawHealBeam,
    drawProjectile: drawProjectile,
    drawThunderOrb: drawThunderOrb,
    drawPierceBeam: drawPierceBeam,
    drawAreaHit: drawAreaHit,
    drawMeleeSlash: drawMeleeSlash,
    drawShockChain: drawShockChain,
    drawHitSpark: drawHitSpark,
    drawBlink: drawBlink,
    drawStealLink: drawStealLink,
    drawComboName: drawComboName,
    drawSpawnWarning: drawSpawnWarning,
    drawTutorialWarn: drawTutorialWarn,
    drawSpawnMark: drawSpawnMark,
    drawTutorialArrow: drawTutorialArrow,
    drawTutorial: drawTutorial,
    drawGuide: drawGuide,
    drawHud: drawHud,
    drawWavePanel: drawWavePanel,
    drawWaveBanner: drawWaveBanner,
    drawBossBar: drawBossBar,
    drawMuteIcon: drawMuteIcon,
    drawSlowMo: drawSlowMo,
    drawSoulPopup: drawSoulPopup,
    drawShopPopup: drawShopPopup,
    drawComboReveal: drawComboReveal,
    drawBossIntro: drawBossIntro,
    drawCodex: drawCodex,
    drawPause: drawPause,
    drawResult: drawResult,
    drawAllClear: drawAllClear
  };
})();
