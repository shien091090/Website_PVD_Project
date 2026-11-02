// 接力吉尼(Jelly Jinni)(打磨版) — 美術繪圖模組(全 Canvas 2D 幾何, 無外部資源)
// 契約: 依 interface.json; 每個函式自己 save / restore。
// polish-7: 直式 720×1280 → 橫式 1280×720, 全部物件尺寸 × 0.5; 新增 drawSoundIcon、drawPauseMenu;
//           空白鍵取代 C、Esc 取代 R; 教學泡泡加 tail / finishing; 翹翹板加 swinging; 壓板燈位置由遊戲端給(lx, ly, keySide)。
//           視覺語言(色票、剪影、鍵帽、量條、泡泡)沿用 polish-1~6。
// polish-8: 鏡頭拉近。世界層函式(drawBackground ~ drawAim)照「世界座標」畫(世界 853⅓ × 480, RD 先 scale 1.5);
//           畫面層函式(drawTutorial、drawHud、drawLevelBanner、drawPauseMenu、drawSoundIcon、整頁畫面)照 1280 × 720 畫。
//           HUD 70 → 48; 天花板 32、地面頂 456(世界); 世界層的鍵帽 / 字 / 燈縮成世界單位。
// polish-9: 收成五關。刪 drawButton、drawCrusher、drawWhistleRing(與節奏燈、哨子圖示); 靜音圖示不用紅(壓暗 + ×);
//           教學泡泡依 avoid 避開聲音圖示; 所有東西只畫設計區 0~1280(世界 0~853⅓), 不往兩側延伸。
(function () {
  'use strict';

  // ---------- 設計座標常數(全畫面類函式只引用這些) ----------
  var W = 1280, H = 720, HUD_H = 48;   // 畫面座標; 整面的東西一律畫 0~1280
  var CX = W / 2;
  var GAME_NAME = '接力吉尼(Jelly Jinni)';

  // ---------- 畫面寬度依裝置(電腦 1280; 觸控裝置照可視區長寬比, 夾 1280~1680; 設計區 1280 由 game.js 置中) ----------
  function pickWidth() {
    var w = 1280;
    try {
      var q = /[?&]w=([0-9]+)/.exec(location.search);
      var mm = function (s) { return !!(window.matchMedia && matchMedia(s).matches); };
      var touch = /[?&]touch=1(&|$)/.test(location.search) || mm('(pointer: coarse)') ||
        (((navigator.maxTouchPoints || 0) > 0 || 'ontouchstart' in window) && !mm('(hover: hover)'));
      if (q) w = +q[1];
      else if (touch) {
        var a = window.screen || {}, sw = a.width || 0, sh = a.height || 0, iw = window.innerWidth || 0, ih = window.innerHeight || 0;
        var r = sw > 0 && sh > 0 ? Math.max(sw, sh) / Math.min(sw, sh) : 0;
        if (iw > ih && ih > 0) r = iw / ih;
        if (r > 0) w = 720 * r;
      }
    } catch (e) { /* 取不到就用 1280 */ }
    return Math.round(Math.max(1280, Math.min(1680, w || 1280)) / 2) * 2;
  }
  var VW = pickWidth();
  try { document.documentElement.style.setProperty('--cw', String(VW)); } catch (e) { /* 略過 */ }

  // 觸控模式(window.PVDX.on, touch.js 在 art.js 之後才載入, 所以每次畫的時候才查): 字與小圖示放大到手機可讀
  var TOUCH_FS = 21, TOUCH_ICON = 30;
  function touchOn() { return !!(window.PVDX && PVDX.on); }
  // 世界座標(世界層函式只引用這些)
  var WS = 1.5;                    // RD 的放大倍率(美術不自己乘, 只用來換算範圍)
  var WW = 853.3333, WH = 480, CEIL = 32, GROUND = 456;
  var WK = 0.67;                   // 世界層鍵帽的線寬 / 外框比例(放大後 ≈ 畫面層鍵帽)

  var C = {
    bg: '#121826',
    bgTop: '#1b2440',
    hudBg: '#0a0e18',
    hudLine: '#2a3350',
    ground: '#2b3042',
    groundTop: '#7c849c',
    platform: '#4b5470',
    platformTop: '#b3bdd8',
    wall: '#2b3042',
    wallEdge: '#7c849c',
    player: '#fff1d0',
    playerDead: '#8a8f9e',
    outline: '#141420',
    visor: '#1d2233',
    ghost: '#a8c4ff',
    ghostEdge: '#e6eeff',
    path: '#a8c4ff',
    hook: '#a6ff4d',
    lift: '#36d6e7',
    liftDim: '#1d7c87',
    gate: '#e05cff',
    gateDim: '#7a3290',
    seesaw: '#8a93ad',
    seesawLand: '#4b5470',
    seesawLaunch: '#eef1f8',
    seesawDust: '#c9d0e2',
    spike: '#ff4d4d',
    goal: '#ffd23f',
    text: '#eef1f8',
    textDim: '#8a93ad',
    danger: '#ff4d4d',
    ok: '#ffffff',
    timer: '#dfe6f5',
    muted: '#5d6478',
    mutedMark: '#d6dbe8'
  };

  var FONT = '"Microsoft JhengHei", "PingFang TC", "Noto Sans TC", sans-serif';
  var STROKE = 'rgba(8,10,18,0.9)';

  // 開始畫面 / 全破畫面底部的音樂署名(照抄 spec)
  var CREDITS = [
    '"Monkeys Spinning Monkeys", "Easy Lemon", "Fluffing a Duck", "Life of Riley"',
    'Kevin MacLeod (incompetech.com)',
    'Licensed under Creative Commons: By Attribution 4.0 License',
    'http://creativecommons.org/licenses/by/4.0/'
  ];

  // 關卡的坑範圍(世界 x; 背景坑底警示用; null 右端 = 到世界右緣)
  var PITS = { 1: [400, 480], 2: [560, null], 3: [560, null], 4: [560, null], 5: [400, null] };

  // ---------- 共用小工具 ----------
  function num(v, d) { return (typeof v === 'number' && isFinite(v)) ? v : d; }
  // 長度類欄位: 夾在 0~4000, 壞值不會讓迴圈跑到天荒地老
  function len(v, d) { return Math.max(0, Math.min(4000, num(v, d))); }
  function clamp01(v) { v = num(v, 0); return Math.max(0, Math.min(1, v)); }
  function oneOf(v, list, d) { return list.indexOf(v) >= 0 ? v : d; }
  function nowMs() {
    return (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
  }
  function easeOutBack(p) {
    var c1 = 1.70158, c3 = c1 + 1;
    return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2);
  }

  function rr(ctx, x, y, w, h, r) {
    r = Math.max(0, Math.min(r, w / 2, h / 2));
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  // 帶深色描邊的文字(遊戲世界與 HUD 共用)
  // sw: 描邊線寬(省略 = 畫面層預設; 世界層小字傳約 2.2, 露在字外約 1.1 世界單位)
  function text(ctx, s, x, y, size, color, align, weight, sw) {
    // 觸控模式: 畫面層的字(沒傳 sw)至少 21 px; 世界層小字(有傳 sw)由呼叫端整組放大
    if (sw === undefined && touchOn() && size < TOUCH_FS) size = TOUCH_FS;
    ctx.save();
    ctx.font = (weight || 'bold') + ' ' + size + 'px ' + FONT;
    ctx.textAlign = align || 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.lineWidth = sw || Math.max(2.5, size / 6);
    ctx.strokeStyle = STROKE;
    ctx.strokeText(s, x, y);
    ctx.fillStyle = color;
    ctx.fillText(s, x, y);
    ctx.restore();
  }
  function measure(ctx, s, size, weight) {
    ctx.save();
    ctx.font = (weight || 'bold') + ' ' + size + 'px ' + FONT;
    var w = ctx.measureText(s).width;
    ctx.restore();
    return w;
  }
  function textW(ctx, s, size, weight) {
    if (touchOn() && size < TOUCH_FS) size = TOUCH_FS;
    return measure(ctx, s, size, weight);
  }

  // 鍵帽: (x, y) 為中心, h 為高; 回傳寬度。o: { fs 字級, minW, fill, edge, frame 系統框色, k 線寬比例(世界層傳 WK) }
  // 觸控模式: 畫面層鍵帽(沒傳 k)高至少 30、字至少 20; 世界層鍵帽由呼叫端整組放大
  function capH(h, o) { return (touchOn() && !o.k && h < TOUCH_ICON) ? TOUCH_ICON : h; }
  function capFs(h, o) {
    var fs = o.fs || Math.max(11, Math.round(h * 0.6));
    if (touchOn() && !o.k && fs < 20) fs = 20;
    return fs;
  }
  function keycapW(ctx, label, h, o) {
    o = o || {};
    h = capH(h, o);
    return Math.max(h, o.minW || 0, measure(ctx, label, capFs(h, o)) + h * 0.55);
  }
  function keycap(ctx, label, x, y, h, o) {
    o = o || {};
    var k = o.k || 1;
    var w = keycapW(ctx, label, h, o);
    h = capH(h, o);
    var fs = capFs(h, o);
    ctx.save();
    rr(ctx, x - w / 2, y - h / 2, w, h, Math.max(3 * k, h * 0.24));
    ctx.fillStyle = o.fill || '#e9ecf5';
    ctx.fill();
    ctx.lineWidth = Math.max(1.2 * k, h / 14);
    ctx.strokeStyle = o.edge || '#5a6380';
    ctx.stroke();
    if (o.frame) {
      var fo = 2 * k;
      rr(ctx, x - w / 2 - fo, y - h / 2 - fo, w + 2 * fo, h + 2 * fo, Math.max(4 * k, h * 0.3));
      ctx.lineWidth = 3 * k;
      ctx.strokeStyle = STROKE;
      ctx.stroke();
      ctx.lineWidth = 1.6 * k;
      ctx.strokeStyle = o.frame;
      ctx.stroke();
    }
    ctx.fillStyle = '#1a1f2e';
    ctx.font = 'bold ' + fs + 'px ' + FONT;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, x, y + 0.5);
    ctx.restore();
    return w;
  }

  function arrow(ctx, x1, y1, x2, y2, color, width, head, edge) {
    var a = Math.atan2(y2 - y1, x2 - x1);
    head = head || 10;
    edge = edge || 3;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(8,10,18,0.85)';
    ctx.lineWidth = width + edge;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2 - Math.cos(a) * head * 0.6, y2 - Math.sin(a) * head * 0.6);
    ctx.stroke();
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - Math.cos(a - 0.45) * head, y2 - Math.sin(a - 0.45) * head);
    ctx.lineTo(x2 - Math.cos(a + 0.45) * head, y2 - Math.sin(a + 0.45) * head);
    ctx.closePath();
    ctx.lineWidth = edge;
    ctx.strokeStyle = 'rgba(8,10,18,0.85)';
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.fill();
    ctx.restore();
  }

  function bgFill(ctx) {
    var g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, C.bgTop);
    g.addColorStop(1, C.bg);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }

  // 「空白 XXX」/ 「空白 開始」這類底部提示(鍵帽 + 字), 置中於 cx
  function keyPrompt(ctx, label, cx, cy, kh, fs) {
    var kw = keycapW(ctx, '空白', kh, { minW: kh * 1.9 });
    var tw = textW(ctx, label, fs);
    var x0 = cx - (kw + 10 + tw) / 2;
    keycap(ctx, '空白', x0 + kw / 2, cy, kh, { minW: kh * 1.9 });
    text(ctx, label, x0 + kw + 10, cy, fs, C.text, 'left');
  }

  function credits(ctx) {
    ctx.save();
    ctx.font = 'normal 11px ' + FONT;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(138,147,173,0.85)';
    for (var i = 0; i < CREDITS.length; i++) ctx.fillText(CREDITS[i], CX, 650 + i * 15);
    ctx.restore();
  }

  // ---------- 世界層鍵帽(Z、X、空白; 約 11 高, 字 7.5, 與 drawGhost 的 Z 同一種) ----------
  var WKEY_H = 11, WKEY_FS = 7.5;
  function wKeyOpts(frame, minW) { return { fs: WKEY_FS, k: WK, frame: frame, minW: minW || 0 }; }

  // ---------- 瞄準按鍵提示「[Z] 射出 / [X] 取消」(世界座標) ----------
  var HINT_W = 82, HINT_H = 17;
  // K: 放大倍率(觸控模式 1.9, 讓字 ≥ 14 世界單位 = 21 px); 以 (cx, cy) 為中心整組放大
  function aimHint(ctx, cx, cy, K) {
    K = K || 1;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(K, K);
    ctx.translate(-cx, -cy);
    aimHint0(ctx, cx, cy);
    ctx.restore();
  }
  function aimHint0(ctx, cx, cy) {
    var x0 = cx - HINT_W / 2;
    ctx.save();
    rr(ctx, x0, cy - HINT_H / 2, HINT_W, HINT_H, 4);
    ctx.fillStyle = 'rgba(10,14,24,0.9)';
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = C.hook;
    ctx.stroke();
    ctx.restore();
    keycap(ctx, 'Z', x0 + 9.5, cy, WKEY_H, wKeyOpts());
    text(ctx, '射出', x0 + 27, cy, 8, C.hook, 'center', 'bold', 2);
    text(ctx, '/', x0 + 40.5, cy, 8, C.textDim, 'center', 'bold', 2);
    keycap(ctx, 'X', x0 + 52, cy, WKEY_H, wKeyOpts());
    text(ctx, '取消', x0 + 69.5, cy, 8, C.text, 'center', 'bold', 2);
  }

  // ---------- 角色剪影(玩家與幽靈共用, 同一個人), 20 × 28 框內 ----------
  // 身體 (1.5, 0.5)~(18.5, 23); 腳 y 21~28
  function feet(state, facing) {
    if (state === 'air' || state === 'launch') return [[4, 21, 5, 4], [11, 21, 5, 4]];
    if (state === 'run') {
      return facing > 0 ? [[2, 23, 5.5, 5], [12.5, 22, 5.5, 5]] : [[12.5, 23, 5.5, 5], [2, 22, 5.5, 5]];
    }
    return [[3.5, 23, 5.5, 5], [11, 23, 5.5, 5]];
  }

  function chestNumber(ctx, gen, fill) {
    ctx.font = 'bold ' + (touchOn() ? 14 : 10) + 'px ' + FONT;   // 世界單位 10(≥ 7.5), 放大後 15 px; 觸控模式 14(21 px)
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 2.4;                       // 約 1.2 世界單位深色描邊露在字外
    ctx.strokeStyle = 'rgba(10,12,22,0.95)';
    ctx.strokeText(String(gen), 10, 16.5);
    ctx.fillStyle = fill;
    ctx.fillText(String(gen), 10, 16.5);
  }

  // mode: 'player' | 'ghost' | 'gone'(HUD / 圖示: 已消失的更早一代); ghostA: 幽靈身體不透明度(預設 0.38)
  function drawFigure(ctx, x, y, facing, state, gen, mode, hookable, ghostA) {
    facing = facing < 0 ? -1 : 1;
    state = oneOf(state, ['idle', 'run', 'air', 'aim', 'launch', 'dead'], 'idle');
    var dead = mode === 'player' && state === 'dead';
    var fs = feet(state, facing);
    var i;
    ctx.save();
    ctx.translate(x, y);

    if (mode === 'gone') {
      ctx.setLineDash([2.5, 2.5]);
      ctx.lineWidth = 1.2;
      ctx.strokeStyle = 'rgba(168,196,255,0.4)';
      rr(ctx, 1.5, 0.5, 17, 22.5, 6);
      ctx.stroke();
      for (i = 0; i < 2; i++) ctx.strokeRect(fs[i][0], fs[i][1], fs[i][2], fs[i][3] - 0.5);
      ctx.restore();
      return;
    }

    var isGhost = mode === 'ghost';
    var gA = num(ghostA, 0.38);
    var body = isGhost ? 'rgba(168,196,255,' + gA + ')' : (dead ? C.playerDead : C.player);

    // 腳
    ctx.fillStyle = isGhost ? 'rgba(168,196,255,' + Math.min(1, gA + 0.07) + ')' : (dead ? '#5d6170' : '#3a3550');
    for (i = 0; i < 2; i++) { rr(ctx, fs[i][0], fs[i][1], fs[i][2], fs[i][3], 1.5); ctx.fill(); }

    // 身體
    rr(ctx, 1.5, 0.5, 17, 22.5, 6);
    ctx.fillStyle = body;
    ctx.fill();
    if (isGhost) {
      ctx.setLineDash([3, 2]);
      ctx.lineWidth = 1.2;
      ctx.strokeStyle = 'rgba(230,238,255,0.85)';
      ctx.stroke();
      ctx.setLineDash([]);
    } else {
      ctx.lineWidth = 1.6;
      ctx.strokeStyle = C.outline;
      ctx.stroke();
    }

    // 面罩(朝向)
    var vx = 4.5 + facing * 2;
    rr(ctx, vx, 5.5, 11, 5.5, 2.5);
    ctx.fillStyle = isGhost ? 'rgba(20,26,45,0.55)' : C.visor;
    ctx.fill();
    if (dead) {
      ctx.strokeStyle = C.danger;
      ctx.lineWidth = 1.3;
      ctx.lineCap = 'round';
      var ex = [vx + 3, vx + 8];
      for (i = 0; i < 2; i++) {
        ctx.beginPath();
        ctx.moveTo(ex[i] - 1.5, 6.8); ctx.lineTo(ex[i] + 1.5, 9.8);
        ctx.moveTo(ex[i] + 1.5, 6.8); ctx.lineTo(ex[i] - 1.5, 9.8);
        ctx.stroke();
      }
    } else {
      ctx.fillStyle = isGhost ? 'rgba(230,238,255,0.9)' : '#ffffff';
      var px = facing > 0 ? vx + 6.5 : vx + 2;
      ctx.fillRect(px, 7, 2, 2.5);
      ctx.fillRect(facing > 0 ? px - 3.5 : px + 3.5, 7, 2, 2.5);
    }

    // 胸口代數(11 px, 深色描邊; 幽靈的數字不透明)
    if (gen) chestNumber(ctx, gen, isGhost ? '#ffffff' : (dead ? '#c8ccd6' : '#ffffff'));

    // 幽靈: 頭頂可站的實線(只有這一條擋人)
    if (isGhost) { ctx.fillStyle = C.ghostEdge; ctx.fillRect(0, 0, 20, 2); }

    // 彈射中: 腳下速度線(框內)
    if (state === 'launch') {
      ctx.strokeStyle = isGhost ? 'rgba(230,238,255,0.8)' : C.hook;
      ctx.lineWidth = 1.3;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(5, 26); ctx.lineTo(5, 27.3);
      ctx.moveTo(10, 25.5); ctx.lineTo(10, 27.3);
      ctx.moveTo(15, 26); ctx.lineTo(15, 27.3);
      ctx.stroke();
    }

    // 玩家瞄準中 / 彈射中: 鉤爪色外框
    if (!isGhost && (state === 'aim' || state === 'launch')) {
      rr(ctx, 1.5, 0.5, 17, 22.5, 6);
      ctx.lineWidth = 1.8;
      ctx.strokeStyle = C.hook;
      ctx.setLineDash(state === 'launch' ? [3, 2] : []);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // 幽靈可鉤: 框內淡染 + 框外綠框(線寬 1.5, 內緣貼幽靈框外 1.5)
    if (isGhost && hookable) {
      rr(ctx, 1, 1, 18, 26, 5);
      ctx.fillStyle = 'rgba(166,255,77,0.22)';
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = C.hook;
      ctx.strokeRect(-2.25, -2.25, 24.5, 32.5);
      ctx.fillStyle = C.ghostEdge;
      ctx.fillRect(0, 0, 20, 2);
    }
    ctx.restore();
  }

  // ---------- 鉤爪小圖示(HUD) ----------
  function hookIcon(ctx, cx, cy, filled) {
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 2.2;
    var col = filled ? C.hook : 'rgba(166,255,77,0.28)';
    ctx.strokeStyle = col;
    ctx.beginPath();
    ctx.moveTo(cx, cy - 7); ctx.lineTo(cx, cy + 2);
    ctx.moveTo(cx, cy + 2); ctx.quadraticCurveTo(cx - 6, cy + 2, cx - 5.5, cy - 3);
    ctx.moveTo(cx, cy + 2); ctx.quadraticCurveTo(cx + 6, cy + 2, cx + 5.5, cy - 3);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy - 7, 1.8, 0, Math.PI * 2);
    ctx.fillStyle = col;
    ctx.fill();
    ctx.restore();
  }

  function pauseFrame(ctx, x, y, w, h) {
    // 時間暫停: 遊戲區四周冷色霧框 + 四角括號(括號離邊 4 px: 右上括號在 x 1254~1277、y 51~75,
    // 橫線在聲音圖示 1228~1268 × 56~96 上方、直線在它右邊, 不碰圖示)
    ctx.save();
    ctx.fillStyle = 'rgba(150,180,255,0.13)';
    var b = 6;
    ctx.fillRect(x, y, w, b);
    ctx.fillRect(x, y + h - b, w, b);
    ctx.fillRect(x, y + b, b, h - 2 * b);
    ctx.fillRect(x + w - b, y + b, b, h - 2 * b);
    ctx.strokeStyle = 'rgba(210,225,255,0.75)';
    ctx.lineWidth = 2;
    var L = 22, m = 4;
    var cs = [[x + m, y + m, 1, 1], [x + w - m, y + m, -1, 1], [x + m, y + h - m, 1, -1], [x + w - m, y + h - m, -1, -1]];
    for (var i = 0; i < 4; i++) {
      var c = cs[i];
      ctx.beginPath();
      ctx.moveTo(c[0], c[1] + c[3] * L);
      ctx.lineTo(c[0], c[1]);
      ctx.lineTo(c[0] + c[2] * L, c[1]);
      ctx.stroke();
    }
    ctx.restore();
  }

  function liftRail(ctx, x, yTop, yBottom) {
    // 升降台軌道: 同色低權重虛線, 標出行程(x 為升降台左緣, 寬 60)
    ctx.save();
    ctx.strokeStyle = 'rgba(54,214,231,0.22)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 5]);
    ctx.beginPath();
    ctx.moveTo(x + 4, yTop); ctx.lineTo(x + 4, yBottom + 12);
    ctx.moveTo(x + 56, yTop); ctx.lineTo(x + 56, yBottom + 12);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(54,214,231,0.3)';
    ctx.fillRect(x + 1, yTop - 1.5, 7, 1.5);
    ctx.fillRect(x + 52, yTop - 1.5, 7, 1.5);
    ctx.restore();
  }

  function speaker(ctx, cx, cy, muted) {
    // 喇叭圖示, 約 22 × 18
    ctx.save();
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(cx - 10, cy - 4);
    ctx.lineTo(cx - 5, cy - 4);
    ctx.lineTo(cx, cy - 8.5);
    ctx.lineTo(cx, cy + 8.5);
    ctx.lineTo(cx - 5, cy + 4);
    ctx.lineTo(cx - 10, cy + 4);
    ctx.closePath();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = STROKE;
    ctx.stroke();
    ctx.fillStyle = muted ? C.muted : C.text;
    ctx.fill();
    ctx.lineWidth = 1.8;
    if (!muted) {
      // 開聲: 喇叭 + 兩道音波弧線
      ctx.strokeStyle = C.text;
      ctx.beginPath(); ctx.arc(cx + 1, cy, 4.5, -0.9, 0.9); ctx.stroke();
      ctx.beginPath(); ctx.arc(cx + 1, cy, 8.5, -0.9, 0.9); ctx.stroke();
    } else {
      // 靜音: 喇叭壓暗、音波消失, 右側一個淺灰「×」(不用紅 / 橘: 紅是尖刺、坑、警告的保留色)
      var mx = cx + 6, my = cy, d = 3.6;
      ctx.beginPath();
      ctx.moveTo(mx - d, my - d); ctx.lineTo(mx + d, my + d);
      ctx.moveTo(mx + d, my - d); ctx.lineTo(mx - d, my + d);
      ctx.strokeStyle = STROKE;
      ctx.lineWidth = 4.2;
      ctx.stroke();
      ctx.strokeStyle = C.mutedMark;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    ctx.restore();
  }

  // ---------- HUD 計時器 ----------
  // 版位(單行, 中線 y = HUD_LY): x0 ~ x0+TIMER_W。[時鐘][秒數 24 px][秒][量條 120 × 8]
  // 數字 = 無條件進位整數秒; 量條左端 10 秒段預先染暗紅(警告區); 量條起點固定, 不隨位數跳動
  var TIMER_W = 200, HUD_LY = 24;
  function hudTimer(ctx, x0, timeLeft, timeMax) {
    timeMax = num(timeMax, 60) > 0 ? num(timeMax, 60) : 60;
    var tl = Math.max(0, Math.min(timeMax, num(timeLeft, timeMax)));
    var secs = Math.ceil(tl - 1e-9);
    var warn = tl <= 10;
    var col = warn ? C.danger : C.timer;
    var frac = tl - Math.floor(tl);
    var pulse = warn && tl > 0 ? Math.max(0, (frac - 0.75) / 0.25) : 0;
    ctx.save();
    // 時鐘圖示
    var TT = touchOn(), cr = TT ? 11 : 8, off = TT ? 34 : 24;   // 觸控模式: 時鐘圖示放大、數字右移、量條縮短
    var ccx = x0 + (TT ? 14 : 10), ccy = HUD_LY;
    ctx.beginPath();
    ctx.arc(ccx, ccy, cr, 0, Math.PI * 2);
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = STROKE;
    ctx.stroke();
    ctx.lineWidth = 2;
    ctx.strokeStyle = col;
    ctx.stroke();
    ctx.lineCap = 'round';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    var ang = -Math.PI / 2 + (1 - tl / timeMax) * Math.PI * 2;
    ctx.moveTo(ccx, ccy); ctx.lineTo(ccx, ccy - cr * 0.62);
    ctx.moveTo(ccx, ccy); ctx.lineTo(ccx + Math.cos(ang) * cr * 0.56, ccy + Math.sin(ang) * cr * 0.56);
    ctx.stroke();
    // 數字
    ctx.save();
    ctx.translate(x0 + off, HUD_LY + 1);
    var sc = 1 + 0.15 * pulse;
    ctx.scale(sc, sc);
    text(ctx, String(secs), 0, 0, 24, col, 'left');
    ctx.restore();
    var nw = textW(ctx, String(secs), 24);
    text(ctx, '秒', x0 + off + nw + 4, HUD_LY + 3, 13, warn ? C.danger : C.textDim, 'left');
    // 量條
    var bw = TT ? 84 : 120, bh = 8, bx = x0 + TIMER_W - bw, by = HUD_LY - bh / 2 + 1;
    rr(ctx, bx - 1.5, by - 1.5, bw + 3, bh + 3, 3);
    ctx.fillStyle = 'rgba(8,10,18,0.95)';
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.stroke();
    var wz = bw * 10 / timeMax;
    ctx.fillStyle = 'rgba(255,77,77,0.25)';
    ctx.fillRect(bx, by, wz, bh);
    if (tl > 0) {
      ctx.fillStyle = col;
      ctx.fillRect(bx, by, Math.max(1.5, bw * tl / timeMax), bh);
      ctx.fillStyle = 'rgba(255,255,255,0.45)';
      ctx.fillRect(bx, by, Math.max(1.5, bw * tl / timeMax), 2);
    }
    ctx.fillStyle = 'rgba(8,10,18,0.95)';
    ctx.fillRect(bx + wz - 1, by - 1.5, 2, bh + 3);
    ctx.restore();
  }

  // ---------- 新手教學泡泡 ----------
  var TUT = {
    fill: '#f4f6fb',      // 泡泡底
    edge: '#141420',      // 泡泡外框
    ink: '#1a1f2e',       // 泡泡字
    mark: '#eef1f8',      // 標示框(紙白, 不用紅)
    done: '#2fe08a',      // 完成: 閃綠、大勾、已按過的鍵(= 綠燈色「對了 / 成立」)
    doneDark: '#14824d',
    keyOn: '#c9f7de'      // 已按過的鍵帽底
  };
  var TUT_PAD = 14, TUT_BH = 52, TUT_KEY = 26, TUT_KEY_FS = 14, TUT_FONT = 16, TUT_MAXW = 300;
  // 觸控模式: 泡泡字 21、鍵帽 30(drawTutorial 開頭呼叫 tutLayout 依模式設定)
  function tutLayout() {
    var T = touchOn();
    TUT_FONT = T ? 21 : 16; TUT_KEY = T ? 30 : 26; TUT_KEY_FS = T ? 20 : 14; TUT_MAXW = T ? 340 : 300;
  }
  var TUT_KEYS = ['left', 'right', 'jump', 'Z', 'esc'];
  var tutKeySeen = {};

  function tutKeyLabel(k) {
    return k === 'left' ? '←' : k === 'right' ? '→' : k === 'jump' ? '↑' : k === 'esc' ? 'Esc' : 'Z';
  }
  function tutKeyOpts(k) {
    return { fs: TUT_KEY_FS, minW: 0 };
  }
  function tutKeyWidth(ctx, k) { return keycapW(ctx, tutKeyLabel(k), TUT_KEY, tutKeyOpts(k)); }

  function tutKey(ctx, k, cx, cy, pressed, bounce) {
    var w = tutKeyWidth(ctx, k), s = TUT_KEY;
    ctx.save();
    ctx.translate(cx, cy - bounce * 4);
    var sc = 1 + bounce * 0.15;
    ctx.scale(sc, sc);
    // 鍵帽厚度
    rr(ctx, -w / 2, -s / 2 + 3, w, s, 6);
    ctx.fillStyle = pressed ? TUT.doneDark : '#3a4258';
    ctx.fill();
    var o = tutKeyOpts(k);
    if (pressed) { o.fill = TUT.keyOn; o.edge = TUT.doneDark; }
    else if (k === 'Z') o.frame = C.hook;             // 與幽靈旁 Z 同
    keycap(ctx, tutKeyLabel(k), 0, 0, s, o);
    if (pressed) {
      var bx = w / 2 - 1, by = -s / 2 + 1;
      ctx.beginPath();
      ctx.arc(bx, by, 6.5, 0, Math.PI * 2);
      ctx.fillStyle = TUT.done;
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = TUT.edge;
      ctx.stroke();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = 1.8;
      ctx.strokeStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(bx - 3, by); ctx.lineTo(bx - 0.8, by + 2.5); ctx.lineTo(bx + 3.2, by - 2.5);
      ctx.stroke();
    }
    ctx.restore();
  }

  function tutMark(ctx, m, alpha) {
    // 被講到的物件外圍: 脈動的紙白虛線圓角框(深色襯底); 框已含外擴, 脈動再外擴 0~4 px
    if (!m || !(num(m.w, 0) > 0) || !(num(m.h, 0) > 0) || alpha <= 0) return;
    var mx = num(m.x, 0), my = num(m.y, 0);
    var t = nowMs() / 1000;
    var p = 0.5 + 0.5 * Math.sin(t * Math.PI * 2 / 0.9);
    var e = 4 * p;
    ctx.save();
    ctx.globalAlpha = alpha;
    rr(ctx, mx - e, my - e, m.w + 2 * e, m.h + 2 * e, 6);
    ctx.lineWidth = 4.5;
    ctx.strokeStyle = 'rgba(8,10,18,0.55)';
    ctx.stroke();
    ctx.setLineDash([8, 5]);
    ctx.lineDashOffset = -t * 16;
    ctx.lineWidth = 2.2;
    ctx.globalAlpha = alpha * (0.6 + 0.4 * p);
    ctx.strokeStyle = TUT.mark;
    ctx.stroke();
    ctx.restore();
  }

  function tutBubblePath(ctx, bx, by, bw, bh, tipX, tipY, place) {
    // 圓角矩形 + 細三角尾巴(長尾巴只拉長, 不加粗)。尾巴從哪一邊伸出:
    // above → 底邊、below → 頂邊、left(泡泡在錨點左)→ 右邊、right(泡泡在錨點右)→ 左邊
    var r = 12, hw = 7;
    var baseX = Math.max(bx + r + hw, Math.min(bx + bw - r - hw, tipX));
    var baseY = Math.max(by + r + hw, Math.min(by + bh - r - hw, tipY));
    ctx.beginPath();
    ctx.moveTo(bx + r, by);
    if (place === 'below') { ctx.lineTo(baseX - hw, by); ctx.lineTo(tipX, tipY); ctx.lineTo(baseX + hw, by); }
    ctx.lineTo(bx + bw - r, by);
    ctx.quadraticCurveTo(bx + bw, by, bx + bw, by + r);
    if (place === 'left') { ctx.lineTo(bx + bw, baseY - hw); ctx.lineTo(tipX, tipY); ctx.lineTo(bx + bw, baseY + hw); }
    ctx.lineTo(bx + bw, by + bh - r);
    ctx.quadraticCurveTo(bx + bw, by + bh, bx + bw - r, by + bh);
    if (place === 'above') { ctx.lineTo(baseX + hw, by + bh); ctx.lineTo(tipX, tipY); ctx.lineTo(baseX - hw, by + bh); }
    ctx.lineTo(bx + r, by + bh);
    ctx.quadraticCurveTo(bx, by + bh, bx, by + bh - r);
    if (place === 'right') { ctx.lineTo(bx, baseY + hw); ctx.lineTo(tipX, tipY); ctx.lineTo(bx, baseY - hw); }
    ctx.lineTo(bx, by + r);
    ctx.quadraticCurveTo(bx, by, bx + r, by);
    ctx.closePath();
  }

  function bigCheck(ctx, cx, cy, s) {
    if (s <= 0) return;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(s, s);
    ctx.beginPath();
    ctx.arc(0, 0, 18, 0, Math.PI * 2);
    ctx.fillStyle = TUT.done;
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = TUT.edge;
    ctx.stroke();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 4.5;
    ctx.strokeStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(-8, 1); ctx.lineTo(-2, 7); ctx.lineTo(9, -7);
    ctx.stroke();
    ctx.restore();
  }

  function sparkle(ctx, x, y, r, color, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.lineCap = 'round';
    ctx.lineWidth = 1.6;
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.moveTo(x - r * 1.6, y); ctx.lineTo(x + r * 1.6, y);
    ctx.moveTo(x, y - r * 1.6); ctx.lineTo(x, y + r * 1.6);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x, y, r * 0.75 + 1, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(8,10,18,0.6)';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x, y, r * 0.75, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.restore();
  }

  function downArrowIcon(ctx, cx, cy) {
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = TUT.ink;
    ctx.beginPath();
    ctx.moveTo(cx, cy - 8); ctx.lineTo(cx, cy + 7);
    ctx.moveTo(cx - 5, cy + 2); ctx.lineTo(cx, cy + 7); ctx.lineTo(cx + 5, cy + 2);
    ctx.stroke();
    ctx.restore();
  }

  // ---------- 開場橫幅的新東西圖示(遊戲內畫法; 以 0,0 為中心, 約 ±56 × ±40) ----------
  var NEW_THINGS = ['relay', 'hook', 'gate', 'lift', 'seesaw'];
  function introIcon(ctx, A, kind, cx, cy) {
    kind = oneOf(kind, NEW_THINGS, 'relay');
    ctx.save();
    ctx.translate(cx, cy);
    if (kind === 'hook') {
      ctx.scale(1.1, 1.1);
      A.drawPlatform(ctx, { x: -55, y: 28, w: 110, h: 12, solid: false });
      // 射出後角色在空中 → 依規則 23 幽靈此刻不可鉤(不畫綠框)
      A.drawGhost(ctx, { x: 12, y: -40, facing: 1, state: 'air', gen: 1, hookable: false, hookAir: true });
      A.drawHook(ctx, { x1: -18, y1: 2, x2: 22, y2: -26 });
      A.drawPlayer(ctx, { x: -28, y: -12, facing: 1, state: 'launch', gen: 2 });
    } else if (kind === 'gate') {
      ctx.scale(0.62, 0.62);
      A.drawPlatform(ctx, { x: -80, y: 48, w: 160, h: 12, solid: false });
      A.drawPlate(ctx, { x: -62, y: 42, pressed: false, kind: 'gate' });
      A.drawGate(ctx, { x: 30, y: -66, open: false });
    } else if (kind === 'lift') {
      A.drawPlatform(ctx, { x: -56, y: 30, w: 112, h: 12, solid: false });
      A.drawPlate(ctx, { x: -50, y: 24, pressed: true, kind: 'lift' });
      liftRail(ctx, 0, -34, 30);
      A.drawLift(ctx, { x: 0, y: -4, active: true });
    } else if (kind === 'seesaw') {
      ctx.scale(1.05, 1.05);
      A.drawPlatform(ctx, { x: -58, y: 12, w: 116, h: 24, solid: true });
      A.drawSeesaw(ctx, { x: -50, y: 6, tilt: 0.81, swing: 0.3, swinging: true });
    } else {
      // relay: 三個小人(1 號已消失 / 2 號幽靈 / 3 號你)
      ctx.scale(1.15, 1.15);
      A.drawPlatform(ctx, { x: -50, y: 14, w: 100, h: 12, solid: false });
      drawFigure(ctx, -44, -14, 1, 'idle', 1, 'gone', false);
      A.drawGhost(ctx, { x: -10, y: -14, facing: 1, state: 'idle', gen: 2, hookable: false, hookAir: true });
      A.drawPlayer(ctx, { x: 24, y: -14, facing: 1, state: 'idle', gen: 3 });
    }
    ctx.restore();
  }

  var Art = {
    canvas: { width: VW, height: H },
    palette: C,

    drawBackground: function (ctx, s) {
      s = s || {};
      var level = s.level;
      // 世界層: 世界座標。只畫世界 0 ~ 853⅓(= 畫面 0~1280), 不往兩側延伸
      var x0 = 0, x1 = WW;
      ctx.save();
      var g = ctx.createLinearGradient(0, 0, 0, WH);
      g.addColorStop(0, C.bgTop);
      g.addColorStop(1, C.bg);
      ctx.fillStyle = g;
      ctx.fillRect(x0, 0, x1 - x0, WH);
      ctx.strokeStyle = 'rgba(255,255,255,0.03)';
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      for (var gx = Math.ceil(x0 / 32) * 32; gx < x1; gx += 32) { ctx.moveTo(gx, CEIL); ctx.lineTo(gx, WH); }
      for (var gy = CEIL; gy <= WH; gy += 32) { ctx.moveTo(x0, gy); ctx.lineTo(x1, gy); }
      ctx.stroke();
      // 坑底暗紅警示(世界 y 440~480; 各關坑的範圍不同; 第 6 關沒有坑, 不畫; 地面由 drawPlatform 蓋在上面)
      var pit = PITS[level];
      if (pit) {
        var pl = pit[0], pr = pit[1] == null ? x1 : pit[1];
        var pg = ctx.createLinearGradient(0, GROUND - 16, 0, WH);
        pg.addColorStop(0, 'rgba(255,77,77,0)');
        pg.addColorStop(1, 'rgba(255,77,77,0.24)');
        ctx.fillStyle = pg;
        ctx.fillRect(pl, GROUND - 16, pr - pl, WH - GROUND + 16);
      }
      // 升降台軌道: 只有第 4 關(升降台 x 500, 頂面 241~456)
      if (level === 4) liftRail(ctx, 500, 241, GROUND);
      ctx.restore();
    },

    drawPlatform: function (ctx, s) {
      s = s || {};
      ctx.save();
      var x = num(s.x, 0), y = num(s.y, 0), w = len(s.w, 0), h = len(s.h, 12);
      var solid = s.solid == null ? h >= 24 : s.solid === true;
      var bx, jx;
      if (solid) {
        ctx.fillStyle = C.ground;
        ctx.fillRect(x, y, w, h);
        ctx.fillStyle = C.groundTop;
        ctx.fillRect(x, y, w, 3);
        ctx.strokeStyle = 'rgba(0,0,0,0.3)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        if (h >= 24) {
          for (bx = x + 15; bx < x + w; bx += 30) {
            ctx.moveTo(bx, y + 10); ctx.lineTo(Math.min(bx + 9, x + w), y + 10);
            if (bx + 15 < x + w && h >= 26) { ctx.moveTo(bx + 15, y + 23); ctx.lineTo(Math.min(bx + 24, x + w), y + 23); }
          }
        } else {
          // 薄的實心平台: 砌磚接縫 + 平整底緣 + 兩側亮邊(沒有單向平台的下緣鋸齒 = 從下面穿不過)
          for (jx = x + 12; jx < x + w - 2; jx += 20) { ctx.moveTo(jx, y + 3.5); ctx.lineTo(jx, y + h - 2); }
        }
        ctx.stroke();
        if (h < 24) {
          ctx.fillStyle = C.groundTop;
          ctx.fillRect(x, y + h - 1.5, w, 1.5);
          ctx.fillRect(x, y, 1.5, h);
          ctx.fillRect(x + w - 1.5, y, 1.5, h);
        }
      } else {
        ctx.fillStyle = C.platform;
        ctx.fillRect(x, y, w, h - 3);
        ctx.fillStyle = C.platformTop;
        ctx.fillRect(x, y, w, 2.5);
        ctx.fillStyle = C.platform;
        ctx.beginPath();
        for (var tx = x; tx < x + w; tx += 6) {
          ctx.moveTo(tx, y + h - 3);
          ctx.lineTo(Math.min(tx + 6, x + w), y + h - 3);
          ctx.lineTo(Math.min(tx + 3, x + w), y + h);
          ctx.closePath();
        }
        ctx.fill();
      }
      ctx.restore();
    },

    drawWall: function (ctx, s) {
      s = s || {};
      ctx.save();
      var x = num(s.x, 0), y = num(s.y, 0), w = len(s.w, 12), h = len(s.h, 322);
      ctx.fillStyle = C.wall;
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = C.wallEdge;
      ctx.fillRect(x, y, 1.5, h);
      ctx.fillRect(x + w - 1.5, y, 1.5, h);
      ctx.fillStyle = C.platform;
      ctx.fillRect(x, y, w, 2.5);
      ctx.strokeStyle = 'rgba(0,0,0,0.35)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      var row = 0;
      for (var by = y + 11; by < y + h - 2; by += 11) {
        ctx.moveTo(x + 1.5, by); ctx.lineTo(x + w - 1.5, by);
        var jx = x + (row % 2 ? w / 3 : w * 2 / 3);
        ctx.moveTo(jx, by - 11 + (row === 0 ? 2.5 : 0)); ctx.lineTo(jx, by);
        row++;
      }
      ctx.stroke();
      ctx.fillStyle = C.groundTop;
      ctx.fillRect(x, y + h - 2, w, 2);
      ctx.restore();
    },

    drawSpike: function (ctx, s) {
      s = s || {};
      ctx.save();
      var x = num(s.x, 0), y = num(s.y, 0), w = Math.max(1, len(s.w, 30)), h = 12;
      ctx.fillStyle = '#5a1a20';
      ctx.fillRect(x, y + h - 2.5, w, 2.5);
      var n = Math.max(1, Math.round(w / 6));
      var tw = w / n;
      for (var i = 0; i < n; i++) {
        ctx.beginPath();
        ctx.moveTo(x + i * tw, y + h - 2);
        ctx.lineTo(x + i * tw + tw / 2, y);
        ctx.lineTo(x + (i + 1) * tw, y + h - 2);
        ctx.closePath();
        ctx.fillStyle = C.spike;
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(x + i * tw + tw / 2, y + 1);
        ctx.lineTo(x + i * tw + tw / 2 - 1, y + h - 3);
        ctx.strokeStyle = '#ffb0b0';
        ctx.lineWidth = 0.8;
        ctx.stroke();
      }
      ctx.restore();
    },

    drawPlate: function (ctx, s) {
      s = s || {};
      ctx.save();
      var x = num(s.x, 0), y = num(s.y, 0), w = 40, h = 6;
      var lift = s.kind !== 'gate';               // 表外值畫成升降台開關
      var col = lift ? C.lift : C.gate;
      var dim = lift ? C.liftDim : C.gateDim;
      var on = s.pressed === true;
      ctx.fillStyle = '#0e1220';
      ctx.fillRect(x, y, w, h);
      if (on) {
        ctx.fillStyle = col;
        ctx.fillRect(x + 1, y + 3.5, w - 2, 2.5);
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.fillRect(x + 1, y + 3.5, w - 2, 0.8);
        ctx.fillStyle = col;
        ctx.fillRect(x, y, 1.5, h);
        ctx.fillRect(x + w - 1.5, y, 1.5, h);
      } else {
        ctx.fillStyle = dim;
        ctx.fillRect(x + 2, y, w - 4, 4.5);
        ctx.fillStyle = col;
        ctx.fillRect(x + 2, y, w - 4, 1);
      }
      ctx.fillStyle = on ? '#0e1220' : col;
      var my = on ? y + 4 : y + 1.5;
      var mh = on ? 1.5 : 2.5;
      var i;
      if (lift) {
        for (i = -1; i <= 1; i++) {
          var cx = x + 20 + i * 9;
          ctx.beginPath();
          ctx.moveTo(cx - 2.5, my + mh); ctx.lineTo(cx, my); ctx.lineTo(cx + 2.5, my + mh);
          ctx.closePath();
          ctx.fill();
        }
      } else {
        for (i = -1; i <= 1; i++) ctx.fillRect(x + 20 + i * 9 - 1, my, 2, mh);
      }
      ctx.restore();
    },

    drawLift: function (ctx, s) {
      s = s || {};
      ctx.save();
      var x = num(s.x, 0), y = num(s.y, GROUND), w = 60, h = 12;
      var on = s.active === true;
      ctx.fillStyle = on ? C.lift : C.liftDim;
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = on ? '#d8fbff' : C.lift;
      ctx.fillRect(x, y, w, 2);
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.fillRect(x, y + h - 2, w, 2);
      ctx.fillStyle = on ? '#0b3a40' : 'rgba(54,214,231,0.35)';
      for (var i = 0; i < 3; i++) {
        var cx = x + 15 + i * 15;
        ctx.beginPath();
        ctx.moveTo(cx - 4.5, y + 9);
        ctx.lineTo(cx, y + 4);
        ctx.lineTo(cx + 4.5, y + 9);
        ctx.lineTo(cx + 2.5, y + 9);
        ctx.lineTo(cx, y + 6.5);
        ctx.lineTo(cx - 2.5, y + 9);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    },

    drawGate: function (ctx, s) {
      s = s || {};
      ctx.save();
      var x = num(s.x, 0), y = num(s.y, 0), w = 12, h = 114;
      if (s.open === true) {
        ctx.strokeStyle = 'rgba(224,92,255,0.45)';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 4]);
        ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
        ctx.setLineDash([]);
        ctx.fillStyle = C.gate;
        ctx.fillRect(x, y, w, 4);
        ctx.fillRect(x, y + h - 4, w, 4);
      } else {
        ctx.fillStyle = C.gate;
        ctx.fillRect(x, y, w, h);
        ctx.fillStyle = C.gateDim;
        for (var sy = y + 7; sy < y + h - 4; sy += 11) ctx.fillRect(x + 1.5, sy, w - 3, 4);
        ctx.strokeStyle = C.outline;
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
      }
      ctx.restore();
    },

    drawSeesaw: function (ctx, s) {
      // 100 × 6: 左 40 落點端(暗、圓頭 ↓) / 中 20 板身與支點 / 右 40 發射端(亮、圓頭 ↑)
      // 擺動演出只用圓弧 / 圓點 / 扁橢圓, 不用尖角、不用紅橘系(H47)
      s = s || {};
      ctx.save();
      var x = num(s.x, 0), y = num(s.y, 0);
      var t = clamp01(s.tilt);
      var swinging = s.swinging === true;
      var sw = swinging ? clamp01(s.swing) : 1;
      // 板子角度: 擺動中依 swing 走「翹起 → 略過頭 → 彈回平」; 沒擺動時沿用 tilt
      var eff = t;
      if (swinging && sw < 1) {
        if (sw < 0.25) eff = Math.sin(sw / 0.25 * Math.PI / 2);
        else if (sw < 0.75) eff = -0.25 + 1.25 * (0.5 + 0.5 * Math.cos(Math.PI * (sw - 0.25) / 0.5));
        else eff = -0.25 * (0.5 + 0.5 * Math.cos(Math.PI * (sw - 0.75) / 0.25));
      } else if (swinging) {
        eff = 0;
      }
      var ang = -eff * 12 * Math.PI / 180;
      // 支點
      ctx.fillStyle = '#1a1f2e';
      ctx.beginPath();
      ctx.moveTo(x + 50, y + 3); ctx.lineTo(x + 56, y + 6); ctx.lineTo(x + 44, y + 6);
      ctx.closePath();
      ctx.fill();
      ctx.save();
      ctx.translate(x + 50, y + 3);
      ctx.rotate(ang);
      rr(ctx, -50, -3, 100, 5, 1.5);
      ctx.fillStyle = C.seesaw;
      ctx.fill();
      rr(ctx, -50, -3, 40, 5, 1.5);
      ctx.fillStyle = C.seesawLand;
      ctx.fill();
      rr(ctx, 10, -3, 40, 5, 1.5);
      ctx.fillStyle = C.seesawLaunch;
      ctx.fill();
      rr(ctx, -50, -3, 100, 5, 1.5);
      ctx.lineWidth = 1.2;
      ctx.strokeStyle = C.outline;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, -0.5, 1.5, 0, Math.PI * 2);
      ctx.fillStyle = C.outline;
      ctx.fill();
      // 記號: 落點端 ↓(淡) / 發射端 ↑(深), 圓頭箭桿 + 兩翼
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = 1.4;
      ctx.strokeStyle = 'rgba(238,241,248,0.85)';
      ctx.beginPath();
      ctx.moveTo(-30, -2.1); ctx.lineTo(-30, 1.3);
      ctx.moveTo(-33.5, -0.5); ctx.lineTo(-30, 1.3); ctx.lineTo(-26.5, -0.5);
      ctx.stroke();
      ctx.strokeStyle = '#1a1f2e';
      ctx.beginPath();
      ctx.moveTo(30, 1.3); ctx.lineTo(30, -2.1);
      ctx.moveTo(26.5, -0.3); ctx.lineTo(30, -2.1); ctx.lineTo(33.5, -0.3);
      ctx.stroke();
      ctx.restore();

      // 擺動中: 發射端上方扁橢圓氣流圈 + 兩側灰塵圓點(往上約 30 px、左右各約 20 px)
      if (swinging && sw < 1) {
        ctx.save();
        var lcx = x + 50 + 30 * Math.cos(ang);
        var ltop = y + 3 + 30 * Math.sin(ang) - 3;
        var k, p, a;
        for (k = 0; k < 2; k++) {
          var d = k * 0.25;
          p = (sw - d) / (1 - d);
          if (p <= 0 || p >= 1) continue;
          var ep = 1 - (1 - p) * (1 - p);
          a = Math.pow(1 - p, 1.3) * (k === 0 ? 0.95 : 0.7);
          var cy = ltop - 4 - 24 * ep;
          ctx.beginPath();
          ctx.ellipse(lcx, cy, 11 + 10 * ep, 2.5 + 2 * ep, 0, 0, Math.PI * 2);
          ctx.lineWidth = 3.2 - p;
          ctx.strokeStyle = 'rgba(8,10,18,' + (a * 0.55) + ')';
          ctx.stroke();
          ctx.lineWidth = 1.6 - 0.6 * p;
          ctx.strokeStyle = 'rgba(238,241,248,' + a + ')';
          ctx.stroke();
        }
        p = sw;
        a = Math.pow(1 - p, 1.1) * 0.9;
        for (var side = -1; side <= 1; side += 2) {
          var ox = lcx + side * 20;
          for (k = 0; k < 3; k++) {
            var dx = side * (4 + k * 4.5) * (0.3 + p);
            var dy = -(3 + k * 3.5) * p * 2 + 7 * p * p;
            var r = Math.max(0.6, 1.8 - k * 0.25 - 0.6 * p);
            ctx.beginPath();
            ctx.arc(ox + dx, ltop - 1 + dy, r + 0.7, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(8,10,18,' + (a * 0.45) + ')';
            ctx.fill();
            ctx.beginPath();
            ctx.arc(ox + dx, ltop - 1 + dy, r, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(201,208,226,' + a + ')';
            ctx.fill();
          }
        }
        ctx.restore();
      }
      ctx.restore();
    },

    drawGoal: function (ctx, s) {
      s = s || {};
      ctx.save();
      var x = num(s.x, 0), y = num(s.y, 0);
      ctx.fillStyle = '#6b5a24';
      ctx.fillRect(x + 1, y + 36, 10, 4);
      ctx.fillStyle = '#e8e2c8';
      ctx.fillRect(x + 4.5, y + 1, 2.5, 36);
      ctx.beginPath();
      ctx.arc(x + 5.75, y + 2, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(x + 7, y + 3);
      ctx.lineTo(x + 23.5, y + 7);
      ctx.lineTo(x + 19.5, y + 12);
      ctx.lineTo(x + 23.5, y + 18);
      ctx.lineTo(x + 7, y + 20);
      ctx.closePath();
      ctx.fillStyle = C.goal;
      ctx.fill();
      ctx.lineWidth = 1;
      ctx.strokeStyle = '#8a6a10';
      ctx.stroke();
      ctx.fillStyle = '#fff6c8';
      ctx.beginPath();
      for (var i = 0; i < 10; i++) {
        var r = i % 2 ? 1.5 : 3.5;
        var a = -Math.PI / 2 + i * Math.PI / 5;
        var px = x + 13.5 + Math.cos(a) * r, py = y + 11.5 + Math.sin(a) * r;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    },

    drawGhostPath: function (ctx, s) {
      var segs = (s && Array.isArray(s.segments)) ? s.segments : [];
      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      var k, i;
      for (k = 0; k < segs.length; k++) {
        var p = segs[k];
        if (!Array.isArray(p) || p.length < 2) continue;
        ctx.beginPath();
        ctx.moveTo(p[0].x, p[0].y);
        for (i = 1; i < p.length; i++) ctx.lineTo(p[i].x, p[i].y);
        ctx.strokeStyle = 'rgba(8,10,18,0.55)';
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.strokeStyle = 'rgba(168,196,255,0.7)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([1.5, 4]);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      var n = 0;
      ctx.fillStyle = 'rgba(168,196,255,0.85)';
      for (k = 0; k < segs.length; k++) {
        var q = Array.isArray(segs[k]) ? segs[k] : [];
        for (i = 0; i < q.length; i++) {
          if (n > 0 && n % 60 === 0) {         // 每 1 秒一顆大一點的點
            ctx.beginPath();
            ctx.arc(q[i].x, q[i].y, 2, 0, Math.PI * 2);
            ctx.fill();
          }
          n++;
        }
      }
      var last = segs.length ? segs[segs.length - 1] : null;
      if (Array.isArray(last) && last.length) {
        var e = last[last.length - 1];
        ctx.beginPath();
        ctx.arc(e.x, e.y, 3.5, 0, Math.PI * 2);
        ctx.lineWidth = 1.2;
        ctx.strokeStyle = 'rgba(168,196,255,0.85)';
        ctx.stroke();
      }
      ctx.restore();
    },

    drawGhost: function (ctx, s) {
      s = s || {};
      var x = num(s.x, 0), y = num(s.y, 0);
      var hookable = s.hookable === true;
      ctx.save();
      drawFigure(ctx, x, y, s.facing, s.state, s.gen, 'ghost', hookable);
      if (hookable) {
        // Z 鍵帽(世界 11 × 11): 綠框外右上角, 底緣在幽靈頂上 2(0~4 內); 靠世界右緣時改左上
        // 頂緣不壓進 HUD(世界 y < 32)時才照規則放; 幽靈貼天花板時往下夾
        var air = s.hookAir !== false;
        var tw2 = 37, th2 = 10.5;                 // 「↑等它跳」小牌
        var HK = touchOn() ? 1.9 : 1;             // 觸控模式整組放大(鍵帽 ≥ 20 世界單位、字 ≥ 14)
        var right = x + 24 + (air ? 14 * HK : tw2 * HK) <= WW - 2;
        var zx = right ? x + 25.5 + 5.5 * HK : x - 5.5 - 5.5 * HK;
        var zy = Math.max(CEIL + 5.5 * HK + 2, y - 7.5);
        keycap(ctx, 'Z', zx, zy, WKEY_H * HK, { fs: WKEY_FS * HK, k: WK, frame: C.hook });
        if (!air) {
          // 幽靈站在地上: Z 鍵帽正下方小字「↑等它跳」, 往遠離幽靈的方向對齊
          var bx0 = right ? zx - 6.5 * HK : zx + 6.5 * HK - tw2 * HK;
          bx0 = Math.max(2, Math.min(WW - tw2 * HK - 2, bx0));
          var by0 = zy + 5.5 * HK + 2;
          ctx.save();
          ctx.translate(bx0, by0);
          ctx.scale(HK, HK);
          bx0 = 0; by0 = 0;
          rr(ctx, bx0, by0, tw2, th2, 2.5);
          ctx.fillStyle = 'rgba(10,14,24,0.88)';
          ctx.fill();
          ctx.lineWidth = 0.7;
          ctx.strokeStyle = 'rgba(166,255,77,0.6)';
          ctx.stroke();
          var ax0 = bx0 + 4.5, ay0 = by0 + th2 / 2;
          ctx.strokeStyle = C.hook;
          ctx.fillStyle = C.hook;
          ctx.lineWidth = 0.9;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(ax0, ay0 + 3); ctx.lineTo(ax0, ay0 - 0.5);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(ax0 - 2, ay0 - 0.3); ctx.lineTo(ax0, ay0 - 3.3); ctx.lineTo(ax0 + 2, ay0 - 0.3);
          ctx.closePath();
          ctx.fill();
          text(ctx, '等它跳', bx0 + 21, by0 + th2 / 2 + 0.3, 7.5, C.hook, 'center', 'bold', 1.8);
          ctx.restore();
        }
      }
      ctx.restore();
    },

    drawHook: function (ctx, s) {
      s = s || {};
      var x1 = num(s.x1, 0), y1 = num(s.y1, 0), x2 = num(s.x2, 0), y2 = num(s.y2, 0);
      ctx.save();
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.strokeStyle = 'rgba(8,10,18,0.85)';
      ctx.lineWidth = 3.2;
      ctx.stroke();
      ctx.strokeStyle = C.hook;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      var a = Math.atan2(y2 - y1, x2 - x1);
      ctx.lineWidth = 1.5;
      for (var i = -1; i <= 1; i++) {
        var b = a + Math.PI + i * 0.7;
        ctx.beginPath();
        ctx.moveTo(x2, y2);
        ctx.lineTo(x2 + Math.cos(b) * 5, y2 + Math.sin(b) * 5);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.arc(x2, y2, 2, 0, Math.PI * 2);
      ctx.fillStyle = C.hook;
      ctx.fill();
      ctx.restore();
    },

    drawPlayer: function (ctx, s) {
      s = s || {};
      ctx.save();
      drawFigure(ctx, num(s.x, 0), num(s.y, 0), s.facing, s.state, s.gen, 'player', false);
      ctx.restore();
    },

    drawAim: function (ctx, s) {
      s = s || {};
      var px = num(s.px, 0), py = num(s.py, 0), gx = num(s.gx, px), gy = num(s.gy, py);
      var ax = num(s.ax, px), ay = num(s.ay, py);
      // 世界座標。蓄力環 r 20(角色 20 × 28 外一圈)
      var R = 20;
      ctx.save();
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(gx, gy);
      ctx.strokeStyle = 'rgba(8,10,18,0.7)';
      ctx.lineWidth = 2.6;
      ctx.stroke();
      ctx.setLineDash([4, 3.5]);
      ctx.strokeStyle = C.hook;
      ctx.lineWidth = 1.1;
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.arc(gx, gy, 3, 0, Math.PI * 2);
      ctx.stroke();
      var ch = clamp01(s.charge);
      // 角色旁按鍵提示: 預設頭頂上方(在蓄力環外); 頂緣 < 37(壓到 HUD)就放腳下;
      // 箭頭朝向提示時往側邊讓開; 左右夾在世界內(邊距 8)
      var hdx = ax - px, hdy = ay - py, hl = Math.hypot(hdx, hdy) || 1;
      var HK = touchOn() ? 1.9 : 1, hw = HINT_W * HK, hh = HINT_H * HK;   // 觸控模式整組放大
      var hy = py - R - 3 - hh / 2;
      var below = hy - hh / 2 < CEIL + 5;
      if (below) hy = py + R + 3 + hh / 2;
      var hx = px;
      var into = below ? (hdy / hl > 0.2) : (hdy / hl < -0.2);
      if (into) {
        var side = Math.abs(hdx) > 2 ? -Math.sign(hdx) : (px > WW / 2 ? -1 : 1);
        hx = px + side * (hw / 2 + 6);
      }
      hx = Math.max(8 + hw / 2, Math.min(WW - 8 - hw / 2, hx));
      if (hy + hh / 2 > WH - 2) hy = WH - 2 - hh / 2;
      aimHint(ctx, hx, hy, HK);
      ctx.beginPath();
      ctx.arc(px, py, R, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(166,255,77,0.18)';
      ctx.lineWidth = 2.6;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(px, py, R, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * ch);
      ctx.strokeStyle = ch >= 1 ? '#ffffff' : C.hook;
      ctx.stroke();
      if (Math.hypot(ax - px, ay - py) > 2) arrow(ctx, px, py, ax, ay, ch >= 1 ? '#e8ffd0' : C.hook, 2.8, 9, 2);
      ctx.restore();
    },

    drawHud: function (ctx, s) {
      s = s || {};
      var maxGen = Math.max(1, Math.round(num(s.maxGen, 3)));
      var gen = Math.max(1, Math.min(maxGen, Math.round(num(s.gen, 1))));
      var phase = oneOf(s.phase, ['play', 'dying', 'win', 'lose'], 'play');
      var level = Math.round(num(s.level, 1)), levelCount = Math.round(num(s.levelCount, 5));
      var i, x;
      ctx.save();
      ctx.fillStyle = C.hudBg;
      ctx.fillRect(0, 0, W, HUD_H);
      ctx.fillStyle = C.hudLine;
      ctx.fillRect(0, HUD_H - 2, W, 2);

      // 左塊: 第 L / N 關 | 第 g 代 + maxGen 個小圓點
      var ly = HUD_LY;
      var s1 = '第 ' + level + ' / ' + levelCount + ' 關';
      text(ctx, s1, 12, ly, 18, C.text, 'left');
      x = 12 + textW(ctx, s1, 18) + 22;
      ctx.fillStyle = C.hudLine;
      ctx.fillRect(x - 12, ly - 12, 2, 24);
      var s2 = '第 ' + gen + ' 代';
      text(ctx, s2, x, ly, 18, C.text, 'left');
      x += textW(ctx, s2, 18) + 12;
      var dotR = touchOn() ? 8 : 5.5, dotStep = touchOn() ? 22 : 16;   // 觸控模式小圓點放大
      for (i = 1; i <= maxGen; i++) {
        var dcx = x + dotR + 0.5 + (i - 1) * dotStep;
        ctx.beginPath();
        ctx.arc(dcx, ly, dotR, 0, Math.PI * 2);
        if (i === gen) {                         // 現在的你: 奶白實心
          ctx.fillStyle = C.player; ctx.fill();
          ctx.lineWidth = 1.5; ctx.strokeStyle = C.outline; ctx.stroke();
        } else if (i === gen - 1) {              // 場上的幽靈: 淡藍半透明 + 虛線
          ctx.fillStyle = 'rgba(168,196,255,0.45)'; ctx.fill();
          ctx.setLineDash([2, 1.5]); ctx.lineWidth = 1.2; ctx.strokeStyle = C.ghostEdge; ctx.stroke(); ctx.setLineDash([]);
        } else if (i < gen) {                    // 已消失的更早一代
          ctx.setLineDash([1.5, 2]); ctx.lineWidth = 1.2; ctx.strokeStyle = 'rgba(168,196,255,0.35)'; ctx.stroke(); ctx.setLineDash([]);
        } else {                                 // 還沒出場
          ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(138,147,173,0.55)'; ctx.stroke();
        }
      }

      // 中塊: 剩餘時間(只在 play; 瞄準中照畫, 數字停住)
      if (phase === 'play') hudTimer(ctx, CX - TIMER_W / 2, s.timeLeft, s.timeMax);

      // 右塊(貼右緣 12, 靠右): [Z 鉤爪 ▢▢]
      var xr = W - 12;
      if (s.hookUnlocked === true) {
        var hm = Math.max(0, Math.min(6, Math.round(num(s.hookMax, 2))));
        var hl = Math.max(0, Math.min(hm, Math.round(num(s.hookLeft, hm))));
        var pw = 22, ph = 30, pg = 4;
        var x0 = xr - (hm * pw + (hm - 1) * pg);
        for (i = 0; i < hm; i++) {
          var bx = x0 + i * (pw + pg);
          rr(ctx, bx, ly - ph / 2, pw, ph, 5);
          ctx.fillStyle = i < hl ? 'rgba(166,255,77,0.14)' : 'rgba(255,255,255,0.03)';
          ctx.fill();
          ctx.lineWidth = 1.2;
          ctx.strokeStyle = i < hl ? C.hook : 'rgba(166,255,77,0.25)';
          if (i >= hl) ctx.setLineDash([2.5, 2.5]);
          ctx.stroke();
          ctx.setLineDash([]);
          hookIcon(ctx, bx + pw / 2, ly + 2, i < hl);
        }
        text(ctx, '鉤爪', x0 - 6, ly, 14, C.hook, 'right');
        var w2 = textW(ctx, '鉤爪', 14);
        keycap(ctx, 'Z', x0 - 6 - w2 - 5 - 9, ly, 18, { frame: C.hook });
      }

      // 瞄準暫停: 遊戲區霧框 + 四角括號(不畫字)
      if (s.aiming === true) pauseFrame(ctx, 0, HUD_H, W, H - HUD_H);

      if (phase === 'dying' && gen < maxGen) {
        text(ctx, '第 ' + (gen + 1) + ' 代準備出發…', CX, HUD_H + 22, 16, C.textDim);
      }

      if (phase === 'win') {
        // 過關面板放在 HUD 中塊(計時器不畫的位置, x 430~850, y 3~45): 新世界地面帶只剩 36 px,
        // 遊玩區又整片是回放中的三代, 只有 HUD 這一條保證不蓋到任何人
        var PXw = 430, PWw = 420;
        rr(ctx, PXw, 3, PWw, 42, 10);
        ctx.fillStyle = 'rgba(30,26,10,0.96)';
        ctx.fill();
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = C.goal;
        ctx.stroke();
        var sW = '過關!', wW = textW(ctx, sW, 26);
        var sA = '三代合力回放中', wA = textW(ctx, sA, 13);
        var nextS = level >= levelCount ? '繼續' : '下一關';   // 最後一關過關後是全破畫面
        var kwN = keycapW(ctx, '空白', 20, { minW: 38 }), wN = textW(ctx, nextS, 16);
        var tot = wW + 18 + wA + 16 + kwN + 6 + wN, xx = PXw + PWw / 2 - tot / 2;
        text(ctx, sW, xx, ly, 26, C.goal, 'left');
        xx += wW + 18;
        text(ctx, sA, xx, ly + 1, 13, C.textDim, 'left');
        xx += wA + 16;
        keycap(ctx, '空白', xx + kwN / 2, ly, 20, { minW: 38 });
        text(ctx, nextS, xx + kwN + 6, ly, 16, C.text, 'left');
      } else if (phase === 'lose') {
        ctx.fillStyle = 'rgba(6,8,14,0.78)';
        ctx.fillRect(0, HUD_H, W, H - HUD_H);
        text(ctx, '失敗', CX, 320, 64, C.danger);
        text(ctx, '三個人都沒摸到旗子', CX, 392, 22, C.text);
        keyPrompt(ctx, '再試一次', CX, 450, 26, 22);
      }
      ctx.restore();
    },

    // ---------- 聲音開關圖示(40 × 40) ----------
    drawSoundIcon: function (ctx, s) {
      s = s || {};
      var x = num(s.x, W - 52), y = num(s.y, 12);
      var muted = s.muted === true;
      ctx.save();
      rr(ctx, x + 0.75, y + 0.75, 38.5, 38.5, 8);
      ctx.fillStyle = 'rgba(10,14,24,0.82)';
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = muted ? 'rgba(138,147,173,0.3)' : 'rgba(255,255,255,0.22)';
      ctx.stroke();
      speaker(ctx, x + 22, y + 15, muted);
      keycap(ctx, 'M', x + 11, y + 30, 15, { fs: 11 });
      ctx.restore();
    },

    // ---------- 暫停選單 ----------
    drawPauseMenu: function (ctx, s) {
      s = s || {};
      var sel = s.sel === 1 ? 1 : 0;
      ctx.save();
      ctx.fillStyle = 'rgba(6,8,14,0.66)';
      ctx.fillRect(0, 0, W, H);
      var PX = 460, PY = 240, PW = 360, PH = 240;
      rr(ctx, PX + 1, PY + 1, PW - 2, PH - 2, 16);
      ctx.fillStyle = 'rgba(14,18,32,0.97)';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgba(255,255,255,0.18)';
      ctx.stroke();
      text(ctx, '暫停', CX, PY + 36, 26, C.text);
      var items = ['繼續', '重來'];
      for (var i = 0; i < 2; i++) {
        var iy = PY + 96 + i * 50;
        if (i === sel) {
          rr(ctx, PX + 70, iy - 19, PW - 140, 38, 10);
          ctx.fillStyle = 'rgba(255,255,255,0.12)';
          ctx.fill();
          ctx.lineWidth = 2;
          ctx.strokeStyle = C.text;
          ctx.stroke();
          // 指示箭頭(圓頭三角)
          ctx.save();
          ctx.lineJoin = 'round';
          ctx.beginPath();
          ctx.moveTo(PX + 86, iy - 8); ctx.lineTo(PX + 99, iy); ctx.lineTo(PX + 86, iy + 8);
          ctx.closePath();
          ctx.lineWidth = 3;
          ctx.strokeStyle = STROKE;
          ctx.stroke();
          ctx.fillStyle = C.text;
          ctx.fill();
          ctx.restore();
        }
        text(ctx, items[i], CX, iy, 22, i === sel ? C.text : C.textDim);
      }
      // 底部提示: [↑][↓] 選擇  [空白] 確定  [Esc] 繼續
      var by = PY + PH - 30, kh = 18;
      var parts = [['k', '↑'], ['k', '↓'], ['t', '選擇'], ['k', '空白'], ['t', '確定'], ['k', 'Esc'], ['t', '繼續']];
      if (touchOn()) parts = parts.slice(0, 5);   // 手機沒有 Esc 鍵(選單鍵在右上角), 不畫這組提示
      var ws = [], tot = 0, j;
      for (j = 0; j < parts.length; j++) {
        ws[j] = parts[j][0] === 'k' ? keycapW(ctx, parts[j][1], kh, { minW: parts[j][1] === '空白' ? 34 : 0 }) : textW(ctx, parts[j][1], 13);
        var gap = j === 0 ? 0 : (parts[j][0] === 't' ? 5 : (parts[j - 1][0] === 'k' ? 3 : 14));
        tot += ws[j] + gap;
      }
      var xx = CX - tot / 2;
      for (j = 0; j < parts.length; j++) {
        var g2 = j === 0 ? 0 : (parts[j][0] === 't' ? 5 : (parts[j - 1][0] === 'k' ? 3 : 14));
        xx += g2;
        if (parts[j][0] === 'k') keycap(ctx, parts[j][1], xx + ws[j] / 2, by, kh, { minW: parts[j][1] === '空白' ? 34 : 0 });
        else text(ctx, parts[j][1], xx, by, 13, C.textDim, 'left');
        xx += ws[j];
      }
      ctx.restore();
    },

    // ---------- 開始畫面 ----------
    drawTitle: function (ctx, s) {
      s = s || {};
      var t = Math.max(0, num(s.t, 0));
      var A = Art;
      ctx.save();
      bgFill(ctx);
      // 遊戲名(y 約 130~210): 本體 + 身後一層淡藍殘影(字的裝飾)
      // 名稱較長: 單行, 字級依寬度縮到放得下(最大 72)
      var nfs = 72;
      while (nfs > 40 && textW(ctx, GAME_NAME, nfs) > 1100) nfs -= 4;
      text(ctx, GAME_NAME, CX + 6, 176, nfs, 'rgba(168,196,255,0.28)');
      text(ctx, GAME_NAME, CX, 170, nfs, C.text);

      // 中央小圖: 前一刻的你(1 號幽靈, 身體不透明度 62%)跳起, 現在的你(2 號)站在它頭上一起往上
      ctx.save();
      ctx.translate(CX, 372);
      ctx.scale(3, 3);
      A.drawPlatform(ctx, { x: -60, y: 28, w: 120, h: 12, solid: true });
      var bob = 14 * Math.abs(Math.sin(t * 1.7));
      var gy = -bob;
      // 地上的影子: 告訴玩家兩個人一起離地
      ctx.beginPath();
      ctx.ellipse(0, 28, 9 - bob * 0.25, 1.6, 0, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fill();
      drawFigure(ctx, -10, gy, 1, bob > 0.5 ? 'air' : 'idle', 1, 'ghost', false, 0.62);
      A.drawPlayer(ctx, { x: -10, y: gy - 28, facing: 1, state: 'idle', gen: 2 });
      ctx.restore();

      // 空白 開始(閃爍)
      var blink = 0.35 + 0.65 * (0.5 + 0.5 * Math.cos(t * Math.PI * 2 / 1.2));
      ctx.save();
      ctx.globalAlpha = blink;
      keyPrompt(ctx, '開始', CX, 524, 32, 28);
      ctx.restore();

      credits(ctx);
      ctx.restore();
    },

    // ---------- 新手教學泡泡 ----------
    drawTutorial: function (ctx, s) {
      s = s || {};
      tutLayout();
      var keys = [], pressed = [];
      var rawK = Array.isArray(s.keys) ? s.keys : [], rawP = Array.isArray(s.pressed) ? s.pressed : [];
      var i;
      for (i = 0; i < rawK.length && keys.length < 3; i++) {
        if (TUT_KEYS.indexOf(rawK[i]) >= 0) { keys.push(rawK[i]); pressed.push(rawP[i] === true); }
      }
      var pop = s.pop == null ? 1 : clamp01(s.pop);
      var finishing = s.finishing === true;
      var done = finishing ? clamp01(s.done) : 0;
      var place = oneOf(s.place, ['above', 'below', 'left', 'right'], 'above');
      var ax = num(s.ax, 0), ay = num(s.ay, 0);
      var tail = Math.max(6, num(s.tail, 16));
      var stage = typeof s.stage === 'string' ? s.stage : '';
      var str = typeof s.text === 'string' ? s.text : '';
      if (finishing && done >= 1) return;
      ctx.save();

      // 版面: [文字][(head)小箭頭][鍵帽…]
      var iconW = stage === 'head' ? 14 : 0;
      var kws = [], kTot = 0;
      for (i = 0; i < keys.length; i++) { kws.push(tutKeyWidth(ctx, keys[i])); kTot += kws[i] + (i ? 6 : 0); }
      var rest = TUT_PAD * 2 + (iconW ? 6 + iconW : 0) + (keys.length ? 10 + kTot : 0);
      var tw = str ? textW(ctx, str, TUT_FONT) : 0;
      var twMax = TUT_MAXW - rest;
      if (tw > twMax) tw = Math.max(20, twMax);
      var bw = Math.max(80, Math.min(TUT_MAXW, rest + tw - (str ? 0 : (keys.length ? 10 : 0))));
      var bh = TUT_BH;
      var bx, by;
      // 左右放(只有 hookFire): 夾邊會讓泡泡蓋到角色時改放另一側, 錨點跟著換到角色另一邊(角色畫面寬 30)
      if (place === 'left' && ax - tail - bw < 12) { place = 'right'; ax += 30; }
      else if (place === 'right' && ax + tail + bw > W - 12) { place = 'left'; ax -= 30; }
      if (place === 'left' || place === 'right') {
        bx = place === 'left' ? ax - tail - bw : ax + tail;
        by = ay - bh / 2;
      } else {
        bx = ax - bw / 2;
        by = place === 'above' ? ay - tail - bh : ay + tail;
      }
      bx = Math.max(12, Math.min(W - 12 - bw, bx));
      by = Math.max(56, Math.min(708 - bh, by));
      // 避開聲音開關圖示(avoid, 畫面座標): 泡泡本體排好、夾進畫布後若和 avoid 重疊才推開;
      // above / below → 水平往左推到右緣 = avoid.x − 6; left / right → 往下推到頂緣 = avoid 下緣 + 6。
      // 尾巴尖端仍在 (ax, ay), 根部由 tutBubblePath 夾在近端邊上、離泡泡角 ≥ 12(可以斜)
      var av = s.avoid;
      if (av && typeof av === 'object') {
        var avx = num(av.x, 0), avy = num(av.y, 0), avw = len(av.w, 0), avh = len(av.h, 0);
        if (avw > 0 && avh > 0 && bx < avx + avw && bx + bw > avx && by < avy + avh && by + bh > avy) {
          if (place === 'left' || place === 'right') by = Math.min(708 - bh, avy + avh + 6);
          else bx = Math.max(12, avx - 6 - bw);
        }
      }
      // 觸控模式另避開方向鍵(avoid2, 畫面座標): 重疊時整個泡泡往右推到方向鍵右緣 + 6, 尾巴尖端不動
      var av2 = s.avoid2;
      if (av2 && typeof av2 === 'object') {
        var a2x = num(av2.x, 0), a2y = num(av2.y, 0), a2w = len(av2.w, 0), a2h = len(av2.h, 0);
        if (a2w > 0 && a2h > 0 && bx < a2x + a2w && bx + bw > a2x && by < a2y + a2h && by + bh > a2y) {
          bx = Math.min(W - 12 - bw, a2x + a2w + 6);
        }
      }
      var bcx = bx + bw / 2, bcy = by + bh / 2;

      var fade = done > 0.55 ? 1 - (done - 0.55) / 0.45 : 1;
      var appear = finishing ? 1 : Math.min(1, pop * 3);

      if (s.mark) tutMark(ctx, s.mark, appear * fade);

      ctx.save();
      ctx.globalAlpha = appear * fade;
      // 出現: 從尾巴尖端彈出(easeOutBack, 最大約 1.10 倍); 完成後段往泡泡中心縮到 45%
      var sc = (!finishing && pop < 1) ? Math.max(0.05, easeOutBack(pop)) : 1;
      ctx.translate(ax, ay);
      ctx.scale(sc, sc);
      ctx.translate(-ax, -ay);
      if (done > 0.55) {
        var k2 = 1 - 0.55 * (done - 0.55) / 0.45;
        ctx.translate(bcx, bcy);
        ctx.scale(k2, k2);
        ctx.translate(-bcx, -bcy);
      }
      var flash = done > 0 ? Math.sin(Math.min(1, done / 0.45) * Math.PI) : 0;
      tutBubblePath(ctx, bx, by, bw, bh, ax, ay, place);
      ctx.lineJoin = 'round';
      ctx.lineWidth = 3.5;
      ctx.strokeStyle = TUT.edge;
      ctx.stroke();
      ctx.fillStyle = TUT.fill;
      ctx.fill();
      if (finishing) {
        ctx.fillStyle = 'rgba(47,224,138,' + (0.55 * Math.max(flash, done > 0.45 ? 0.35 : 0)) + ')';
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = TUT.done;
        ctx.stroke();
      }
      // 內容
      var cx = bx + TUT_PAD, cy = by + bh / 2;
      if (str) {
        ctx.fillStyle = TUT.ink;
        ctx.font = 'bold ' + TUT_FONT + 'px ' + FONT;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(str, cx, cy + 0.5, tw);
        cx += tw;
      }
      if (iconW) { downArrowIcon(ctx, cx + 6 + iconW / 2, cy); cx += 6 + iconW; }
      if (keys.length) {
        cx += str ? 10 : 0;
        var tNow = nowMs();
        for (i = 0; i < keys.length; i++) {
          var id = stage + '#' + i;
          var on = pressed[i];
          var b = 0;
          if (on) {
            if (tutKeySeen[id] == null) tutKeySeen[id] = tNow;
            var el = tNow - tutKeySeen[id];
            if (el < 260) b = Math.sin(Math.PI * el / 260);
          } else {
            delete tutKeySeen[id];
          }
          if (finishing) {                       // 完成時鍵帽依序彈一下
            var dp = (done - i * 0.1) / 0.2;
            if (dp > 0 && dp < 1) b = Math.max(b, Math.sin(Math.PI * dp));
          }
          tutKey(ctx, keys[i], cx + kws[i] / 2, cy - 1, on, b);
          cx += kws[i] + 6;
        }
      }
      if (finishing) bigCheck(ctx, bcx, bcy, easeOutBack(Math.min(1, done / 0.25)));
      ctx.restore();

      // 完成: 8 顆小星點從泡泡中心往外散開到泡泡外 40 px 並淡出
      if (finishing && done > 0.08) {
        var sp = (done - 0.08) / 0.92;
        var e2 = 1 - Math.pow(1 - sp, 2);
        var rx = (bw / 2) * (0.3 + 0.7 * e2) + 36 * e2, ry = (bh / 2) * (0.3 + 0.7 * e2) + 36 * e2;
        for (i = 0; i < 8; i++) {
          var a = i * Math.PI / 4 + Math.PI / 8;
          sparkle(ctx, bcx + Math.cos(a) * rx, bcy + Math.sin(a) * ry, 3 - 1.3 * sp, i % 2 ? '#ffffff' : TUT.done, Math.max(0, 1 - sp));
        }
      }
      ctx.restore();
    },

    // ---------- 開場橫幅(480 × 100, 只改透明度) ----------
    drawLevelBanner: function (ctx, s) {
      s = s || {};
      var t = clamp01(s.t);
      var a = t < 0.13 ? t / 0.13 : (t > 0.8 ? (1 - t) / 0.2 : 1);
      if (a <= 0) return;
      var A = Art;
      var X = num(s.x, 400), Y = num(s.y, 100), BW = 480, BH = 100;
      ctx.save();
      ctx.globalAlpha = a;
      rr(ctx, X + 1, Y + 1, BW - 2, BH - 2, 14);
      ctx.fillStyle = 'rgba(10,14,24,0.72)';
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = 'rgba(255,255,255,0.16)';
      ctx.stroke();
      // 左: 新東西小圖(遊戲內畫法)
      var IX = X + 8, IY = Y + 8, IW = 124, IH = BH - 16;
      rr(ctx, IX, IY, IW, IH, 10);
      ctx.fillStyle = 'rgba(255,255,255,0.04)';
      ctx.fill();
      ctx.save();
      rr(ctx, IX, IY, IW, IH, 10);
      ctx.clip();
      introIcon(ctx, A, s.newThing, IX + IW / 2, IY + IH / 2);
      ctx.restore();
      // 右: 第幾關 + 關名
      var TX = IX + IW + 18;
      text(ctx, '第 ' + Math.round(num(s.level, 1)) + ' / ' + Math.round(num(s.levelCount, 5)) + ' 關', TX, Y + 30, 18, C.textDim, 'left');
      var title = typeof s.title === 'string' ? s.title : '';
      var maxTW = X + BW - 14 - TX;
      var fs = 34;
      while (fs > 20 && textW(ctx, title, fs) > maxTW) fs -= 2;
      text(ctx, title, TX, Y + 66, fs, C.text, 'left');
      ctx.restore();
    },

    drawUnlockPage: function (ctx, s) {
      s = s || {};
      var A = Art;
      // ability 本輪只有 'hook'; 表外值一樣畫鉤爪
      ctx.save();
      bgFill(ctx);
      text(ctx, '解鎖', CX, 104, 26, C.textDim);
      text(ctx, '鉤爪', CX, 168, 60, C.hook);
      var PX = 400, PY = 222, PW = 480, PH = 390;
      rr(ctx, PX, PY, PW, PH, 18);
      ctx.fillStyle = 'rgba(8,12,22,0.55)';
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = 'rgba(255,255,255,0.1)';
      ctx.stroke();
      ctx.save();
      rr(ctx, PX, PY, PW, PH, 18);
      ctx.clip();
      ctx.translate(CX, PY + PH / 2);
      {
        // 角色射出、鉤住半空中的幽靈, 鉤索拉直(射出後在空中 → 幽靈不畫可鉤框)
        ctx.scale(3.2, 3.2);
        A.drawPlatform(ctx, { x: -56, y: 36, w: 112, h: 12, solid: false });
        A.drawGhost(ctx, { x: 14, y: -46, facing: 1, state: 'air', gen: 1, hookable: false, hookAir: true });
        A.drawHook(ctx, { x1: -20, y1: 2, x2: 24, y2: -32 });
        A.drawPlayer(ctx, { x: -30, y: -12, facing: 1, state: 'launch', gen: 2 });
      }
      ctx.restore();
      keyPrompt(ctx, '繼續', CX, 664, 28, 24);
      ctx.restore();
    },

    drawEnding: function (ctx) {
      var A = Art;
      ctx.save();
      bgFill(ctx);
      // 靜態彩紙(金 / 白 / 淡藍)
      var conf = [[300, 250, C.goal], [380, 300, C.ghost], [460, 236, '#ffffff'], [820, 246, C.goal], [900, 296, C.ghost], [980, 240, '#ffffff'],
        [340, 380, '#ffffff'], [940, 390, C.goal], [250, 330, C.ghost], [1030, 330, '#ffffff'], [560, 228, C.ghost], [720, 222, C.goal]];
      for (var i = 0; i < conf.length; i++) {
        ctx.save();
        ctx.translate(conf[i][0], conf[i][1]);
        ctx.rotate(i * 0.7);
        ctx.fillStyle = conf[i][2];
        ctx.fillRect(-5, -2.5, 10, 5);
        ctx.restore();
      }
      text(ctx, '全部通關!', CX, 120, 60, C.goal);
      text(ctx, '你和前兩代的自己, 一起走到了', CX, 182, 20, C.text);
      // 慶祝圖: 1、2 號幽靈(遊戲內幽靈畫法)+ 實心的你(3 號), 一起跳起來, 旁邊是終點旗
      ctx.save();
      ctx.translate(CX, 318);
      ctx.scale(2.6, 2.6);
      A.drawPlatform(ctx, { x: -80, y: 40, w: 160, h: 12, solid: false });
      A.drawGoal(ctx, { x: 50, y: 0 });
      A.drawGhost(ctx, { x: -70, y: 6, facing: 1, state: 'air', gen: 1, hookable: false, hookAir: true });
      A.drawGhost(ctx, { x: -42, y: -2, facing: 1, state: 'air', gen: 2, hookable: false, hookAir: true });
      A.drawPlayer(ctx, { x: -10, y: 2, facing: 1, state: 'air', gen: 3 });
      ctx.restore();
      keyPrompt(ctx, '從第 1 關再玩', CX, 580, 28, 24);
      credits(ctx);
      ctx.restore();
    }
  };

  window.Art = Art;
})();
