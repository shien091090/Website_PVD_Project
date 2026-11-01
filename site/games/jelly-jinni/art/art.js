// 幽影接力(打磨版) — 美術繪圖模組(全 Canvas 2D 幾何, 無外部資源)
// 契約: 依 interface.json; 每個函式自己 save / restore。沿用 polish-1 的視覺語言(polish-2: 移除鑰匙與鎖, 新增按鈕、尖刺壓板、實心平台、貼物件的鍵帽提示)。
// polish-3: HUD 計時器、幽靈「等它跳」、壓板節奏燈、關卡卡片 final、七關。
// polish-5: 刪說明頁; 新增開始畫面(drawTitle)、新手教學泡泡(drawTutorial); 關卡卡片改開場橫幅(drawLevelBanner); 解鎖頁只留標題 + 大圖示。
(function () {
  'use strict';

  var W = 720, H = 1280, HUD_H = 100;

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
    whistle: '#ffffff',
    hook: '#a6ff4d',
    lift: '#36d6e7',
    liftDim: '#1d7c87',
    gate: '#e05cff',
    gateDim: '#7a3290',
    crusher: '#ff8c1a',
    crusherDark: '#7a3c06',
    crusherBody: '#3a2414',
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
    cueOk: '#2fe08a',
    cueWait: '#ffe640',
    cueLate: '#ff4d4d',
    cueOff: '#3a3f4f'
  };

  var FONT = '"Microsoft JhengHei", "PingFang TC", "Noto Sans TC", sans-serif';

  // ---------- 共用小工具 ----------
  function rr(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
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

  function text(ctx, s, x, y, size, color, align, weight) {
    ctx.save();
    ctx.font = (weight || 'bold') + ' ' + size + 'px ' + FONT;
    ctx.textAlign = align || 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.lineWidth = Math.max(3, size / 6);
    ctx.strokeStyle = 'rgba(8,10,18,0.9)';
    ctx.strokeText(s, x, y);
    ctx.fillStyle = color;
    ctx.fillText(s, x, y);
    ctx.restore();
  }

  function keycap(ctx, label, x, y, size, fill, edge) {
    // x,y 為中心; 回傳寬度。fill / edge 只給教學泡泡的「已按過」用
    size = size || 40;
    ctx.save();
    ctx.font = 'bold ' + Math.round(size * 0.5) + 'px ' + FONT;
    var w = Math.max(size, ctx.measureText(label).width + size * 0.5);
    rr(ctx, x - w / 2, y - size / 2, w, size, 7);
    ctx.fillStyle = fill || '#e9ecf5';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = edge || '#5a6380';
    ctx.stroke();
    ctx.fillStyle = '#1a1f2e';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, x, y + 1);
    ctx.restore();
    return w;
  }

  function arrow(ctx, x1, y1, x2, y2, color, width, head) {
    var a = Math.atan2(y2 - y1, x2 - x1);
    head = head || 16;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(8,10,18,0.85)';
    ctx.lineWidth = width + 5;
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
    ctx.lineWidth = 5;
    ctx.strokeStyle = 'rgba(8,10,18,0.85)';
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.fill();
    ctx.restore();
  }

  function mark(ctx, kind, x, y, r) {
    // kind: 'ok' 白勾 / 'no' 紅叉
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(8,10,18,0.85)';
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = kind === 'ok' ? C.ok : C.danger;
    ctx.stroke();
    ctx.lineWidth = r * 0.28;
    ctx.beginPath();
    if (kind === 'ok') {
      ctx.moveTo(x - r * 0.45, y + r * 0.02);
      ctx.lineTo(x - r * 0.1, y + r * 0.38);
      ctx.lineTo(x + r * 0.5, y - r * 0.35);
    } else {
      ctx.moveTo(x - r * 0.4, y - r * 0.4);
      ctx.lineTo(x + r * 0.4, y + r * 0.4);
      ctx.moveTo(x + r * 0.4, y - r * 0.4);
      ctx.lineTo(x - r * 0.4, y + r * 0.4);
    }
    ctx.stroke();
    ctx.restore();
  }

  function bgFill(ctx) {
    var g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, C.bgTop);
    g.addColorStop(1, C.bg);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }

  // ---------- 壓板 / 按鈕共用的斜紋(壓板色專屬記號) ----------
  function hazardStripes(ctx, x, y, w, h, color, gap) {
    gap = gap || 18;
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
    ctx.fillStyle = color;
    for (var sx = x - h; sx < x + w + h; sx += gap * 2) {
      ctx.beginPath();
      ctx.moveTo(sx, y + h);
      ctx.lineTo(sx + gap, y + h);
      ctx.lineTo(sx + gap + h, y);
      ctx.lineTo(sx + h, y);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  // ---------- 瞄準按鍵提示「[Z] 射出 / [X] 取消」(角色旁, 鍵帽與幽靈旁 Z 同一樣式) ----------
  var HINT_W = 196, HINT_H = 40;
  function aimHint(ctx, cx, cy) {
    var x0 = cx - HINT_W / 2;
    ctx.save();
    rr(ctx, x0, cy - HINT_H / 2, HINT_W, HINT_H, 10);
    ctx.fillStyle = 'rgba(10,14,24,0.9)';
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = C.hook;
    ctx.stroke();
    ctx.restore();
    keycap(ctx, 'Z', x0 + 22, cy, 26);
    text(ctx, '射出', x0 + 58, cy, 18, C.hook);
    text(ctx, '/', x0 + 92, cy, 18, C.textDim);
    keycap(ctx, 'X', x0 + 120, cy, 26);
    text(ctx, '取消', x0 + 158, cy, 18, C.text);
  }


  // ---------- 角色剪影(玩家與幽靈共用, 同一個人) ----------
  // 40 x 56 框內: 身體 (3,1)~(37,46); 腳 y 46~56
  function feet(state, facing) {
    if (state === 'air' || state === 'launch') {
      return [[8, 42, 10, 8], [22, 42, 10, 8]];
    }
    if (state === 'run') {
      return facing > 0 ? [[4, 46, 11, 10], [25, 44, 11, 10]] : [[25, 46, 11, 10], [4, 44, 11, 10]];
    }
    return [[7, 46, 11, 10], [22, 46, 11, 10]];
  }

  function drawFigure(ctx, x, y, facing, state, gen, mode, hookable) {
    // mode: 'player' | 'ghost' | 'gone'(說明頁 / HUD: 消失的更早一代)
    facing = facing < 0 ? -1 : 1;
    var dead = mode === 'player' && state === 'dead';
    var fs = feet(state, facing);
    var i;
    ctx.save();
    ctx.translate(x, y);

    if (mode === 'gone') {
      ctx.setLineDash([5, 5]);
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgba(168,196,255,0.4)';
      rr(ctx, 3, 1, 34, 45, 12);
      ctx.stroke();
      for (i = 0; i < 2; i++) { ctx.strokeRect(fs[i][0], fs[i][1], fs[i][2], fs[i][3]); }
      if (gen) {
        ctx.setLineDash([]);
        ctx.font = 'bold 15px ' + FONT;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = 'rgba(168,196,255,0.5)';
        ctx.fillText(String(gen), 20, 34);
      }
      ctx.restore();
      return;
    }

    var isGhost = mode === 'ghost';
    var body = isGhost ? 'rgba(168,196,255,0.38)' : (dead ? C.playerDead : C.player);

    // 腳
    ctx.fillStyle = isGhost ? 'rgba(168,196,255,0.45)' : (dead ? '#5d6170' : '#3a3550');
    for (i = 0; i < 2; i++) {
      rr(ctx, fs[i][0], fs[i][1], fs[i][2], fs[i][3], 3);
      ctx.fill();
    }

    // 身體
    rr(ctx, 3, 1, 34, 45, 12);
    ctx.fillStyle = body;
    ctx.fill();
    if (isGhost) {
      ctx.setLineDash([6, 4]);
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgba(230,238,255,0.85)';
      ctx.stroke();
      ctx.setLineDash([]);
    } else {
      ctx.lineWidth = 3;
      ctx.strokeStyle = C.outline;
      ctx.stroke();
    }

    // 面罩(朝向)
    var vx = 9 + facing * 4;
    rr(ctx, vx, 11, 22, 11, 5);
    ctx.fillStyle = isGhost ? 'rgba(20,26,45,0.55)' : C.visor;
    ctx.fill();
    if (dead) {
      ctx.strokeStyle = C.danger;
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      var ex = [vx + 6, vx + 16];
      for (i = 0; i < 2; i++) {
        ctx.beginPath();
        ctx.moveTo(ex[i] - 3, 13.5); ctx.lineTo(ex[i] + 3, 19.5);
        ctx.moveTo(ex[i] + 3, 13.5); ctx.lineTo(ex[i] - 3, 19.5);
        ctx.stroke();
      }
    } else {
      ctx.fillStyle = isGhost ? 'rgba(230,238,255,0.9)' : '#ffffff';
      var px = facing > 0 ? vx + 13 : vx + 4;
      ctx.fillRect(px, 14, 4, 5);
      ctx.fillRect(facing > 0 ? px - 7 : px + 7, 14, 4, 5);
    }

    // 代數(胸口小字)
    if (gen) {
      ctx.font = 'bold 15px ' + FONT;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = isGhost ? 'rgba(230,238,255,0.95)' : (dead ? '#3d404b' : '#6b5a3a');
      ctx.fillText(String(gen), 20, 32);
    }

    // 幽靈: 頭頂可站的實線(只有這一條擋人)
    if (isGhost) {
      ctx.fillStyle = C.ghostEdge;
      ctx.fillRect(0, 0, 40, 3);
    }

    // 彈射中: 腳下速度線(框內)
    if (state === 'launch') {
      ctx.strokeStyle = isGhost ? 'rgba(230,238,255,0.8)' : C.hook;
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(10, 51); ctx.lineTo(10, 55);
      ctx.moveTo(20, 50); ctx.lineTo(20, 55);
      ctx.moveTo(30, 51); ctx.lineTo(30, 55);
      ctx.stroke();
    }

    // 玩家瞄準中 / 彈射中: 鉤爪色外框
    if (!isGhost && (state === 'aim' || state === 'launch')) {
      rr(ctx, 3, 1, 34, 45, 12);
      ctx.lineWidth = 3;
      ctx.strokeStyle = C.hook;
      ctx.setLineDash(state === 'launch' ? [6, 4] : []);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // 幽靈可鉤: 框內鉤爪色粗框 + 染色
    if (isGhost && hookable) {
      rr(ctx, 2, 2, 36, 52, 11);
      ctx.fillStyle = 'rgba(166,255,77,0.22)';
      ctx.fill();
      ctx.lineWidth = 4;
      ctx.strokeStyle = C.hook;
      ctx.stroke();
      ctx.fillStyle = C.ghostEdge;
      ctx.fillRect(0, 0, 40, 3);
    }

    ctx.restore();
  }

  // ---------- 鉤爪小圖示(HUD / 說明頁) ----------
  function hookIcon(ctx, cx, cy, filled) {
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 4;
    ctx.strokeStyle = filled ? C.hook : 'rgba(166,255,77,0.28)';
    ctx.beginPath();
    ctx.moveTo(cx, cy - 13);
    ctx.lineTo(cx, cy + 4);
    ctx.moveTo(cx, cy + 4);
    ctx.quadraticCurveTo(cx - 11, cy + 4, cx - 10, cy - 6);
    ctx.moveTo(cx, cy + 4);
    ctx.quadraticCurveTo(cx + 11, cy + 4, cx + 10, cy - 6);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy - 13, 3, 0, Math.PI * 2);
    ctx.fillStyle = filled ? C.hook : 'rgba(166,255,77,0.28)';
    ctx.fill();
    ctx.restore();
  }

  function hookPips(ctx, x, cy, left, max) {
    ctx.save();
    for (var i = 0; i < max; i++) {
      var bx = x + i * 44;
      rr(ctx, bx, cy - 20, 38, 40, 8);
      ctx.fillStyle = i < left ? 'rgba(166,255,77,0.14)' : 'rgba(255,255,255,0.03)';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = i < left ? C.hook : 'rgba(166,255,77,0.25)';
      if (i >= left) ctx.setLineDash([4, 4]);
      ctx.stroke();
      ctx.setLineDash([]);
      hookIcon(ctx, bx + 19, cy + 2, i < left);
    }
    ctx.restore();
    return max * 44;
  }

  function pauseFrame(ctx, x, y, w, h) {
    // 時間暫停: 遊戲區四周冷色霧框 + 四角括號 + 暫停符號
    ctx.save();
    ctx.fillStyle = 'rgba(150,180,255,0.13)';
    var b = 18;
    ctx.fillRect(x, y, w, b);
    ctx.fillRect(x, y + h - b, w, b);
    ctx.fillRect(x, y + b, b, h - 2 * b);
    ctx.fillRect(x + w - b, y + b, b, h - 2 * b);
    ctx.strokeStyle = 'rgba(210,225,255,0.75)';
    ctx.lineWidth = 4;
    var L = 44, m = b + 6;
    var cs = [[x + m, y + m, 1, 1], [x + w - m, y + m, -1, 1], [x + m, y + h - m, 1, -1], [x + w - m, y + h - m, -1, -1]];
    for (var i = 0; i < 4; i++) {
      var c = cs[i];
      ctx.beginPath();
      ctx.moveTo(c[0], c[1] + c[3] * L);
      ctx.lineTo(c[0], c[1]);
      ctx.lineTo(c[0] + c[2] * L, c[1]);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(210,225,255,0.8)';
    ctx.fillRect(x + w - m - 30, y + m + 12, 7, 22);
    ctx.fillRect(x + w - m - 18, y + m + 12, 7, 22);
    ctx.restore();
  }

  function liftRail(ctx, x, yTop, yBottom) {
    // 升降台軌道: 同色低權重虛線, 標出行程
    ctx.save();
    ctx.strokeStyle = 'rgba(54,214,231,0.22)';
    ctx.lineWidth = 3;
    ctx.setLineDash([8, 10]);
    ctx.beginPath();
    ctx.moveTo(x + 8, yTop); ctx.lineTo(x + 8, yBottom + 24);
    ctx.moveTo(x + 112, yTop); ctx.lineTo(x + 112, yBottom + 24);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(54,214,231,0.3)';
    ctx.fillRect(x + 2, yTop - 3, 14, 3);
    ctx.fillRect(x + 104, yTop - 3, 14, 3);
    ctx.restore();
  }

  function speaker(ctx, cx, cy, muted) {
    // 喇叭圖示, 約 34 x 28
    ctx.save();
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(cx - 15, cy - 6);
    ctx.lineTo(cx - 8, cy - 6);
    ctx.lineTo(cx, cy - 13);
    ctx.lineTo(cx, cy + 13);
    ctx.lineTo(cx - 8, cy + 6);
    ctx.lineTo(cx - 15, cy + 6);
    ctx.closePath();
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(8,10,18,0.9)';
    ctx.stroke();
    ctx.fillStyle = muted ? C.textDim : C.text;
    ctx.fill();
    ctx.lineWidth = 3;
    if (!muted) {
      ctx.strokeStyle = C.text;
      ctx.beginPath();
      ctx.arc(cx + 2, cy, 7, -0.9, 0.9);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx + 2, cy, 13, -0.9, 0.9);
      ctx.stroke();
    } else {
      ctx.strokeStyle = 'rgba(8,10,18,0.9)';
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.moveTo(cx - 16, cy + 14); ctx.lineTo(cx + 18, cy - 14);
      ctx.stroke();
      ctx.strokeStyle = C.text;
      ctx.lineWidth = 3.5;
      ctx.stroke();
    }
    ctx.restore();
  }

  // ---------- HUD 計時器(遊戲內與說明頁共用) ----------
  // 版位: x0 ~ x0+146, y 10 ~ 82。數字 = 無條件進位整數秒; 量條 = timeLeft / timeMax, 左端 10 秒段預先染暗紅(警告區)
  var TIMER_W = 146;
  function hudTimer(ctx, x0, timeLeft, timeMax) {
    timeMax = timeMax || 60;
    var tl = Math.max(0, Math.min(timeMax, timeLeft == null ? timeMax : timeLeft));
    var secs = Math.ceil(tl - 1e-9);
    var warn = tl <= 10;
    var col = warn ? C.danger : C.timer;
    // 每秒跳號後的 0.25 秒放大一下(由 timeLeft 小數換算, 不讀時鐘; 瞄準暫停時自然停住)
    var frac = tl - Math.floor(tl);
    var pulse = warn && tl > 0 ? Math.max(0, (frac - 0.75) / 0.25) : 0;
    ctx.save();
    // 時鐘圖示
    var ccx = x0 + 14, ccy = 34;
    ctx.beginPath();
    ctx.arc(ccx, ccy, 11, 0, Math.PI * 2);
    ctx.lineWidth = 5;
    ctx.strokeStyle = 'rgba(8,10,18,0.9)';
    ctx.stroke();
    ctx.lineWidth = 3;
    ctx.strokeStyle = col;
    ctx.stroke();
    ctx.lineCap = 'round';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    var ang = -Math.PI / 2 + (1 - tl / timeMax) * Math.PI * 2;
    ctx.moveTo(ccx, ccy);
    ctx.lineTo(ccx, ccy - 7);
    ctx.moveTo(ccx, ccy);
    ctx.lineTo(ccx + Math.cos(ang) * 6, ccy + Math.sin(ang) * 6);
    ctx.stroke();
    // 數字
    ctx.save();
    ctx.translate(x0 + 34, 36);
    var sc = 1 + 0.22 * pulse;
    ctx.scale(sc, sc);
    text(ctx, String(secs), 0, 0, 36, col, 'left');
    ctx.font = 'bold 36px ' + FONT;
    var nw = ctx.measureText(String(secs)).width;
    ctx.restore();
    text(ctx, '秒', x0 + 34 + nw + 6, 40, 17, warn ? C.danger : C.textDim, 'left');
    // 量條
    var bx = x0, by = 64, bw = TIMER_W, bh = 12;
    rr(ctx, bx - 2, by - 2, bw + 4, bh + 4, 5);
    ctx.fillStyle = 'rgba(8,10,18,0.95)';
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.stroke();
    var wz = bw * 10 / timeMax;
    ctx.fillStyle = 'rgba(255,77,77,0.25)';
    ctx.fillRect(bx, by, wz, bh);
    if (tl > 0) {
      ctx.fillStyle = col;
      ctx.fillRect(bx, by, Math.max(2, bw * tl / timeMax), bh);
      ctx.fillStyle = 'rgba(255,255,255,0.45)';
      ctx.fillRect(bx, by, Math.max(2, bw * tl / timeMax), 3);
    }
    // 警告區分界刻度
    ctx.fillStyle = 'rgba(8,10,18,0.95)';
    ctx.fillRect(bx + wz - 1, by - 2, 2, bh + 4);
    ctx.restore();
  }

  // ---------- 壓板節奏燈(燈座常駐; 四態 = 顏色 + 記號) ----------
  function cueLamp(ctx, cx, cy, cue) {
    var r = 14;
    ctx.save();
    // 燈座(常駐, 讓「這根柱子有燈」一直看得到)
    ctx.beginPath();
    ctx.arc(cx, cy, r + 4, 0, Math.PI * 2);
    ctx.fillStyle = '#0e1220';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = C.crusher;
    ctx.stroke();
    var col = cue === 'ok' ? C.cueOk : cue === 'wait' ? C.cueWait : cue === 'late' ? C.cueLate : C.cueOff;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = col;
    ctx.fill();
    if (cue === 'ok' || cue === 'wait' || cue === 'late') {
      // 亮燈: 外圈光暈(單層) + 記號
      ctx.beginPath();
      ctx.arc(cx, cy, r + 8, 0, Math.PI * 2);
      ctx.lineWidth = 3;
      ctx.strokeStyle = cue === 'ok' ? 'rgba(47,224,138,0.45)' : cue === 'wait' ? 'rgba(255,230,64,0.4)' : 'rgba(255,77,77,0.45)';
      ctx.stroke();
      ctx.strokeStyle = '#0e1220';
      ctx.fillStyle = '#0e1220';
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      if (cue === 'ok') {
        // 打勾
        ctx.moveTo(cx - 7, cy);
        ctx.lineTo(cx - 2, cy + 6);
        ctx.lineTo(cx + 7, cy - 6);
        ctx.stroke();
      } else if (cue === 'late') {
        // 打叉
        ctx.moveTo(cx - 6, cy - 6); ctx.lineTo(cx + 6, cy + 6);
        ctx.moveTo(cx + 6, cy - 6); ctx.lineTo(cx - 6, cy + 6);
        ctx.stroke();
      } else {
        // 沙漏(他還在路上, 等)
        ctx.lineWidth = 2.5;
        ctx.moveTo(cx - 6, cy - 8); ctx.lineTo(cx + 6, cy - 8);
        ctx.lineTo(cx - 5, cy + 8); ctx.lineTo(cx + 5, cy + 8);
        ctx.closePath();
        ctx.moveTo(cx - 6, cy - 8); ctx.lineTo(cx + 6, cy + 8);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx - 4, cy + 8); ctx.lineTo(cx, cy + 3); ctx.lineTo(cx + 4, cy + 8);
        ctx.closePath();
        ctx.fill();
      }
    } else {
      // 不亮: 暗灰 + 一道反光
      ctx.beginPath();
      ctx.arc(cx - 4, cy - 4, 4, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      ctx.fill();
    }
    ctx.restore();
  }

  // ---------- 新手教學泡泡 ----------
  // 淺色底深色字的圓角泡泡 + 指向錨點的尾巴; 鍵帽與遊戲內同一種(Z 加鉤爪色框、C 加綠燈色框)
  var TUT = {
    fill: '#f4f6fb',      // 泡泡底
    edge: '#141420',      // 泡泡外框(深, 壓在任何底色上都讀得到)
    ink: '#1a1f2e',       // 泡泡字
    mark: '#eef1f8',      // 標示框(和泡泡同系的紙白, 不用紅)
    done: '#2fe08a',      // 完成: 閃綠、大勾、已按過的鍵(= 綠燈色「對了 / 成立」)
    doneDark: '#14824d',
    keyOn: '#c9f7de'      // 已按過的鍵帽底
  };
  var TUT_PAD = 16, TUT_BH = 54, TUT_KEY = 32, TUT_GAP = 18, TUT_FONT = 24;
  var tutKeySeen = {};

  function nowMs() {
    return (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
  }
  function clamp01(v) { return Math.max(0, Math.min(1, v || 0)); }
  function easeOutBack(p) {
    var c1 = 1.70158, c3 = c1 + 1;
    return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2);
  }
  function tutKeyLabel(k) {
    return k === 'left' ? '←' : k === 'right' ? '→' : k === 'jump' ? '↑' : String(k);
  }
  function tutKeyWidth(ctx, k) {
    ctx.save();
    ctx.font = 'bold ' + Math.round(TUT_KEY * 0.5) + 'px ' + FONT;
    var w = Math.max(TUT_KEY, ctx.measureText(tutKeyLabel(k)).width + TUT_KEY * 0.5);
    ctx.restore();
    return w;
  }

  function tutKey(ctx, k, cx, cy, pressed, bounce) {
    var w = tutKeyWidth(ctx, k), s = TUT_KEY;
    ctx.save();
    ctx.translate(cx, cy - bounce * 7);
    var sc = 1 + bounce * 0.2;
    ctx.scale(sc, sc);
    // 鍵帽厚度(淺色泡泡上讓鍵帽浮出來)
    rr(ctx, -w / 2, -s / 2 + 4, w, s, 7);
    ctx.fillStyle = pressed ? TUT.doneDark : '#3a4258';
    ctx.fill();
    keycap(ctx, tutKeyLabel(k), 0, 0, s, pressed ? TUT.keyOn : null, pressed ? TUT.doneDark : null);
    // 系統框: Z = 鉤爪色、C = 綠燈色(與遊戲內幽靈旁 Z、節奏燈旁 C 相同)
    if (!pressed && (k === 'Z' || k === 'C')) {
      rr(ctx, -w / 2 - 3, -s / 2 - 3, w + 6, s + 6, 9);
      ctx.lineWidth = 4.5;
      ctx.strokeStyle = TUT.edge;
      ctx.stroke();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = k === 'Z' ? C.hook : C.cueOk;
      ctx.stroke();
    }
    if (pressed) {
      // 右上角小勾勾
      var bx = w / 2 - 2, by = -s / 2 + 1;
      ctx.beginPath();
      ctx.arc(bx, by, 9, 0, Math.PI * 2);
      ctx.fillStyle = TUT.done;
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = TUT.edge;
      ctx.stroke();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = 2.6;
      ctx.strokeStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(bx - 4, by);
      ctx.lineTo(bx - 1, by + 3.5);
      ctx.lineTo(bx + 4.5, by - 3.5);
      ctx.stroke();
    }
    ctx.restore();
  }

  function tutMark(ctx, m, alpha) {
    // 被講到的物件外圍: 脈動的紙白虛線圓角框(深色襯底), 虛線緩慢繞行
    if (!m || !(m.w > 0) || !(m.h > 0) || alpha <= 0) return;
    var t = nowMs() / 1000;
    var p = 0.5 + 0.5 * Math.sin(t * Math.PI * 2 / 0.9);
    var e = 6 + 4 * p;
    ctx.save();
    ctx.globalAlpha = alpha;
    rr(ctx, m.x - e, m.y - e, m.w + 2 * e, m.h + 2 * e, 10);
    ctx.lineWidth = 7;
    ctx.strokeStyle = 'rgba(8,10,18,0.55)';
    ctx.stroke();
    ctx.setLineDash([12, 8]);
    ctx.lineDashOffset = -t * 24;
    ctx.lineWidth = 3.5;
    ctx.globalAlpha = alpha * (0.6 + 0.4 * p);
    ctx.strokeStyle = TUT.mark;
    ctx.stroke();
    ctx.restore();
  }

  function tutBubblePath(ctx, bx, by, bw, bh, tipX, tipY, above) {
    // 外框路徑: 圓角矩形 + 尾巴(底邊或頂邊伸出)
    var r = 14;
    var baseX = Math.max(bx + r + 12, Math.min(bx + bw - r - 12, tipX));
    var hw = 11;
    ctx.beginPath();
    ctx.moveTo(bx + r, by);
    if (!above) { ctx.lineTo(baseX - hw, by); ctx.lineTo(tipX, tipY); ctx.lineTo(baseX + hw, by); }
    ctx.lineTo(bx + bw - r, by);
    ctx.quadraticCurveTo(bx + bw, by, bx + bw, by + r);
    ctx.lineTo(bx + bw, by + bh - r);
    ctx.quadraticCurveTo(bx + bw, by + bh, bx + bw - r, by + bh);
    if (above) { ctx.lineTo(baseX + hw, by + bh); ctx.lineTo(tipX, tipY); ctx.lineTo(baseX - hw, by + bh); }
    ctx.lineTo(bx + r, by + bh);
    ctx.quadraticCurveTo(bx, by + bh, bx, by + bh - r);
    ctx.lineTo(bx, by + r);
    ctx.quadraticCurveTo(bx, by, bx + r, by);
    ctx.closePath();
  }

  function bigCheck(ctx, cx, cy, s) {
    // 完成大勾勾: 綠圓 + 白勾, 深色外框
    if (s <= 0) return;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(s, s);
    ctx.beginPath();
    ctx.arc(0, 0, 25, 0, Math.PI * 2);
    ctx.fillStyle = TUT.done;
    ctx.fill();
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = TUT.edge;
    ctx.stroke();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(-11, 1);
    ctx.lineTo(-3, 9);
    ctx.lineTo(12, -9);
    ctx.stroke();
    ctx.restore();
  }

  function sparkle(ctx, x, y, r, color, alpha) {
    // 小星點: 圓芯 + 四道短光(圓頭), 往外飛散的慶祝, 非地面物件
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.lineCap = 'round';
    ctx.lineWidth = 2.4;
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.moveTo(x - r * 1.6, y); ctx.lineTo(x + r * 1.6, y);
    ctx.moveTo(x, y - r * 1.6); ctx.lineTo(x, y + r * 1.6);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x, y, r * 0.75 + 1.2, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(8,10,18,0.6)';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x, y, r * 0.75, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.restore();
  }

  function downArrowIcon(ctx, cx, cy) {
    // 「跳到他頭上」的向下小箭頭(圓頭線, 泡泡墨色)
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = TUT.ink;
    ctx.beginPath();
    ctx.moveTo(cx, cy - 11); ctx.lineTo(cx, cy + 9);
    ctx.moveTo(cx - 7, cy + 2); ctx.lineTo(cx, cy + 9); ctx.lineTo(cx + 7, cy + 2);
    ctx.stroke();
    ctx.restore();
  }

  // ---------- 開始畫面 / 解鎖頁用的小圖 ----------
  function whistleIcon(ctx) {
    // 哨子(以 0,0 為中心, 約 90 x 50): 吹嘴 + 圓腔 + 出音孔 + 掛環
    ctx.save();
    ctx.lineJoin = 'round';
    function shape() {
      rr(ctx, -46, -20, 54, 18, 5);
      ctx.moveTo(38, 4);
      ctx.arc(14, 4, 24, 0, Math.PI * 2);
    }
    ctx.beginPath(); shape();
    ctx.lineWidth = 8;
    ctx.strokeStyle = C.outline;
    ctx.stroke();
    ctx.beginPath(); shape();
    ctx.fillStyle = C.whistle;
    ctx.fill();
    ctx.fillStyle = '#c9d0e2';
    ctx.beginPath();
    ctx.arc(14, 4, 15, 0.2, Math.PI * 0.95);
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#c9d0e2';
    ctx.stroke();
    ctx.fillStyle = C.outline;
    rr(ctx, -6, -20, 12, 7, 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(34, -18, 7, 0, Math.PI * 2);
    ctx.lineWidth = 4;
    ctx.strokeStyle = C.outline;
    ctx.stroke();
    ctx.lineWidth = 2;
    ctx.strokeStyle = C.whistle;
    ctx.stroke();
    ctx.restore();
  }

  function bottomPrompt(ctx, label1) {
    ctx.save();
    ctx.font = 'bold 30px ' + FONT;
    var tw = ctx.measureText(label1).width;
    ctx.restore();
    ctx.save();
    ctx.font = 'bold 22px ' + FONT;
    var kw = Math.max(44, ctx.measureText('空白鍵').width + 22);
    ctx.restore();
    var total = kw + 16 + tw;
    var x0 = W / 2 - total / 2;
    keycap(ctx, '空白鍵', x0 + kw / 2, 1210, 44);
    text(ctx, label1, x0 + kw + 16, 1210, 30, C.text, 'left');
  }


  // ---------- 關卡卡片的新東西圖示(用遊戲內畫法) ----------
  function introIcon(ctx, A, kind, cx, cy) {
    ctx.save();
    ctx.translate(cx, cy);
    if (kind === 'hook') {
      ctx.scale(1.4, 1.4);
      A.drawPlatform(ctx, { x: -120, y: 80, w: 240, h: 24 });
      // 射出後角色在空中 → 依規則 23 幽靈此刻不可鉤(不畫綠框)
      A.drawGhost(ctx, { x: 20, y: -110, facing: 1, state: 'air', gen: 1, hookable: false, hookAir: true });
      A.drawHook(ctx, { x1: -40, y1: 2, x2: 40, y2: -82 });
      A.drawPlayer(ctx, { x: -60, y: -26, facing: 1, state: 'launch', gen: 2 });
    } else if (kind === 'gate') {
      ctx.scale(1.15, 1.15);
      A.drawPlatform(ctx, { x: -150, y: 110, w: 300, h: 24 });
      A.drawPlate(ctx, { x: -120, y: 98, pressed: false, kind: 'gate' });
      A.drawGate(ctx, { x: 70, y: -110, open: false });
    } else if (kind === 'lift') {
      ctx.scale(1.15, 1.15);
      A.drawPlatform(ctx, { x: -150, y: 110, w: 300, h: 24 });
      A.drawPlate(ctx, { x: -130, y: 98, pressed: false, kind: 'lift' });
      liftRail(ctx, 20, -110, 110);
      A.drawLift(ctx, { x: 20, y: 0, active: true });
    } else if (kind === 'seesaw') {
      ctx.scale(1.4, 1.4);
      A.drawPlatform(ctx, { x: -120, y: 12, w: 240, h: 24 });
      A.drawSeesaw(ctx, { x: -100, y: 0, tilt: 0.81, swing: 0.3 });
    } else if (kind === 'button') {
      // 按鈕(被踩住) + 升起中的尖刺壓板(倒數量條約剩 6 成); 同一個壓板色
      ctx.scale(1.15, 1.15);
      A.drawPlatform(ctx, { x: -190, y: 110, w: 380, h: 50, solid: true });
      A.drawButton(ctx, { x: -175, y: 98, pressed: true });
      A.drawCrusher(ctx, { x: -20, w: 190, top: -160, bottom: 40, hold: 0.6, warn: false, cue: 'none' });
    } else if (kind === 'final') {
      // 綜合關: 翹翹板 + 壓板並排, 中間一個「+」
      ctx.scale(0.95, 0.95);
      A.drawPlatform(ctx, { x: -240, y: 110, w: 480, h: 50, solid: true });
      A.drawSeesaw(ctx, { x: -230, y: 98, tilt: 0.81, swing: 0.3 });
      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineWidth = 12;
      ctx.strokeStyle = 'rgba(8,10,18,0.9)';
      ctx.beginPath();
      ctx.moveTo(-2, 0); ctx.lineTo(-2, 40); ctx.moveTo(-22, 20); ctx.lineTo(18, 20);
      ctx.stroke();
      ctx.lineWidth = 6;
      ctx.strokeStyle = C.text;
      ctx.stroke();
      ctx.restore();
      A.drawCrusher(ctx, { x: 40, w: 190, top: -170, bottom: 30, hold: 0.6, warn: false, cue: 'none' });
    } else {
      // relay: 三個小人(1 號已消失 / 2 號幽靈 / 3 號你)
      ctx.scale(1.5, 1.5);
      A.drawPlatform(ctx, { x: -120, y: 30, w: 240, h: 24 });
      drawFigure(ctx, -100, -26, 1, 'idle', 1, 'gone', false);
      A.drawGhost(ctx, { x: -20, y: -26, facing: 1, state: 'idle', gen: 2, hookable: false });
      A.drawPlayer(ctx, { x: 60, y: -26, facing: 1, state: 'idle', gen: 3 });
    }
    ctx.restore();
  }

  var Art = {
    canvas: { width: W, height: H },
    palette: C,

    drawBackground: function (ctx, s) {
      var level = s && s.level;
      ctx.save();
      bgFill(ctx);
      ctx.strokeStyle = 'rgba(255,255,255,0.03)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (var gx = 0; gx <= W; gx += 60) { ctx.moveTo(gx + 0.5, HUD_H); ctx.lineTo(gx + 0.5, H); }
      for (var gy = HUD_H; gy <= H; gy += 60) { ctx.moveTo(0, gy + 0.5); ctx.lineTo(W, gy + 0.5); }
      ctx.stroke();
      // 坑底的暗紅警示(x 600~720; 第 6 關沒有坑, 不畫)
      if (level !== 6) {
        var pg = ctx.createLinearGradient(0, 1210, 0, H);
        pg.addColorStop(0, 'rgba(255,77,77,0)');
        pg.addColorStop(1, 'rgba(255,77,77,0.22)');
        ctx.fillStyle = pg;
        ctx.fillRect(600, 1210, 120, 70);
      }
      // 升降台軌道: 只有有升降台的關(4)
      if (level === 4) liftRail(ctx, 480, 780, 1200);
      ctx.restore();
    },

    drawPlatform: function (ctx, s) {
      ctx.save();
      var x = s.x, y = s.y, w = s.w, h = s.h;
      // 實心 = 地面材質(地面、實心平台、牆共用一個長相); 沒給 solid 時以厚度判斷(相容舊呼叫)
      var solid = s.solid == null ? h >= 48 : !!s.solid;
      if (solid) {
        ctx.fillStyle = C.ground;
        ctx.fillRect(x, y, w, h);
        ctx.fillStyle = C.groundTop;
        ctx.fillRect(x, y, w, 6);
        ctx.strokeStyle = 'rgba(0,0,0,0.3)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        if (h >= 48) {
          for (var bx = x + 30; bx < x + w; bx += 60) {
            ctx.moveTo(bx, y + 20); ctx.lineTo(Math.min(bx + 18, x + w), y + 20);
            if (bx + 30 < x + w) { ctx.moveTo(bx + 30, y + 46); ctx.lineTo(Math.min(bx + 48, x + w), y + 46); }
          }
        } else {
          // 薄的實心平台: 砌磚接縫 + 平整底緣(沒有單向平台的下緣鋸齒 = 從下面穿不過)
          for (var jx = x + 24; jx < x + w - 4; jx += 40) {
            ctx.moveTo(jx, y + 7); ctx.lineTo(jx, y + h - 4);
          }
        }
        ctx.stroke();
        if (h < 48) {
          ctx.fillStyle = C.groundTop;
          ctx.fillRect(x, y + h - 3, w, 3);
          ctx.fillRect(x, y, 3, h);
          ctx.fillRect(x + w - 3, y, 3, h);
        }
      } else {
        ctx.fillStyle = C.platform;
        ctx.fillRect(x, y, w, h - 6);
        ctx.fillStyle = C.platformTop;
        ctx.fillRect(x, y, w, 5);
        ctx.fillStyle = C.platform;
        ctx.beginPath();
        for (var tx = x; tx < x + w; tx += 12) {
          ctx.moveTo(tx, y + h - 6);
          ctx.lineTo(Math.min(tx + 12, x + w), y + h - 6);
          ctx.lineTo(Math.min(tx + 6, x + w), y + h);
          ctx.closePath();
        }
        ctx.fill();
      }
      ctx.restore();
    },

    drawWall: function (ctx, s) {
      // 實心牆: 用地面的材質(實心 = 地面長相), 直立砌磚; 頂端一道平台色接縫表示「接在平台底下」
      ctx.save();
      var x = s.x, y = s.y, w = s.w || 24, h = s.h || 316;
      ctx.fillStyle = C.wall;
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = C.wallEdge;
      ctx.fillRect(x, y, 3, h);
      ctx.fillRect(x + w - 3, y, 3, h);
      ctx.fillStyle = C.platform;
      ctx.fillRect(x, y, w, 5);
      ctx.strokeStyle = 'rgba(0,0,0,0.35)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      var row = 0;
      for (var by = y + 22; by < y + h - 4; by += 22) {
        ctx.moveTo(x + 3, by); ctx.lineTo(x + w - 3, by);
        var jx = x + (row % 2 ? 8 : 16);
        ctx.moveTo(jx, by - 22 + (row === 0 ? 5 : 0)); ctx.lineTo(jx, by);
        row++;
      }
      ctx.stroke();
      ctx.fillStyle = C.groundTop;
      ctx.fillRect(x, y + h - 4, w, 4);
      ctx.restore();
    },

    drawSpike: function (ctx, s) {
      ctx.save();
      var x = s.x, y = s.y, w = s.w || 60, h = 24;
      ctx.fillStyle = '#5a1a20';
      ctx.fillRect(x, y + h - 5, w, 5);
      var n = Math.max(1, Math.round(w / 12));
      var tw = w / n;
      for (var i = 0; i < n; i++) {
        ctx.beginPath();
        ctx.moveTo(x + i * tw, y + h - 4);
        ctx.lineTo(x + i * tw + tw / 2, y);
        ctx.lineTo(x + (i + 1) * tw, y + h - 4);
        ctx.closePath();
        ctx.fillStyle = C.spike;
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(x + i * tw + tw / 2, y + 1);
        ctx.lineTo(x + i * tw + tw / 2 - 2, y + h - 6);
        ctx.strokeStyle = '#ffb0b0';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
      ctx.restore();
    },

    drawPlate: function (ctx, s) {
      ctx.save();
      var x = s.x, y = s.y, w = 80, h = 12;
      var lift = s.kind !== 'gate';
      var col = lift ? C.lift : C.gate;
      var dim = lift ? C.liftDim : C.gateDim;
      ctx.fillStyle = '#0e1220';
      ctx.fillRect(x, y, w, h);
      if (s.pressed) {
        ctx.fillStyle = col;
        ctx.fillRect(x + 2, y + 7, w - 4, 5);
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.fillRect(x + 2, y + 7, w - 4, 1.5);
        ctx.fillStyle = col;
        ctx.fillRect(x, y, 3, h);
        ctx.fillRect(x + w - 3, y, 3, h);
      } else {
        ctx.fillStyle = dim;
        ctx.fillRect(x + 4, y, w - 8, 9);
        ctx.fillStyle = col;
        ctx.fillRect(x + 4, y, w - 8, 2);
      }
      ctx.fillStyle = s.pressed ? '#0e1220' : col;
      var my = s.pressed ? y + 8 : y + 3;
      var mh = s.pressed ? 3 : 5;
      if (lift) {
        for (var i = -1; i <= 1; i++) {
          var cx = x + 40 + i * 18;
          ctx.beginPath();
          ctx.moveTo(cx - 5, my + mh);
          ctx.lineTo(cx, my);
          ctx.lineTo(cx + 5, my + mh);
          ctx.closePath();
          ctx.fill();
        }
      } else {
        for (var j = -1; j <= 1; j++) {
          ctx.fillRect(x + 40 + j * 18 - 2, my, 4, mh);
        }
      }
      ctx.restore();
    },

    drawLift: function (ctx, s) {
      ctx.save();
      var x = s.x, y = s.y, w = 120, h = 24;
      var on = !!s.active;
      ctx.fillStyle = on ? C.lift : C.liftDim;
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = on ? '#d8fbff' : C.lift;
      ctx.fillRect(x, y, w, 4);
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.fillRect(x, y + h - 4, w, 4);
      ctx.fillStyle = on ? '#0b3a40' : 'rgba(54,214,231,0.35)';
      for (var i = 0; i < 3; i++) {
        var cx = x + 30 + i * 30;
        ctx.beginPath();
        ctx.moveTo(cx - 9, y + 18);
        ctx.lineTo(cx, y + 8);
        ctx.lineTo(cx + 9, y + 18);
        ctx.lineTo(cx + 5, y + 18);
        ctx.lineTo(cx, y + 13);
        ctx.lineTo(cx - 5, y + 18);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    },

    drawGate: function (ctx, s) {
      ctx.save();
      var x = s.x, y = s.y, w = 24, h = 220;
      if (s.open) {
        ctx.strokeStyle = 'rgba(224,92,255,0.45)';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 8]);
        ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
        ctx.setLineDash([]);
        ctx.fillStyle = C.gate;
        ctx.fillRect(x, y, w, 8);
        ctx.fillRect(x, y + h - 8, w, 8);
      } else {
        ctx.fillStyle = C.gate;
        ctx.fillRect(x, y, w, h);
        ctx.fillStyle = C.gateDim;
        for (var sy = y + 14; sy < y + h - 8; sy += 22) {
          ctx.fillRect(x + 3, sy, w - 6, 8);
        }
        ctx.strokeStyle = C.outline;
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
      }
      ctx.restore();
    },

    drawButton: function (ctx, s) {
      // 80 x 12, 嵌在地面上: 圓頂按鈕(與平的開關踏板不同外形) + 底座斜紋(= 壓板的記號); 壓板色
      ctx.save();
      var x = s.x, y = s.y, w = 80, h = 12;
      ctx.fillStyle = '#0e1220';
      ctx.fillRect(x, y + 6, w, 6);
      if (s.pressed) {
        // 被踩住: 圓頂壓扁成亮色薄片, 底座兩側亮起
        rr(ctx, x + 8, y + 7, w - 16, 5, 2);
        ctx.fillStyle = C.crusher;
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.75)';
        ctx.fillRect(x + 12, y + 7, w - 24, 1.5);
        ctx.fillStyle = C.crusher;
        ctx.fillRect(x, y + 6, 4, 6);
        ctx.fillRect(x + w - 4, y + 6, 4, 6);
      } else {
        // 放開: 凸起的圓頂(暗壓板色 + 亮頂弧)
        ctx.beginPath();
        ctx.moveTo(x + 10, y + 9);
        ctx.bezierCurveTo(x + 14, y - 1, x + w - 14, y - 1, x + w - 10, y + 9);
        ctx.closePath();
        ctx.fillStyle = '#c4650f';
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = C.outline;
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x + 22, y + 4);
        ctx.quadraticCurveTo(x + 40, y + 0.5, x + 58, y + 4);
        ctx.strokeStyle = '#ffd2a0';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.stroke();
      }
      // 底座斜紋帶(與壓板同一個記號)
      ctx.fillStyle = C.crusherDark;
      ctx.fillRect(x + 2, y + 9, w - 4, 3);
      hazardStripes(ctx, x + 2, y + 9, w - 4, 3, s.pressed ? C.crusher : 'rgba(255,140,26,0.6)', 5);
      ctx.restore();
    },

    drawCrusher: function (ctx, s) {
      // 尖刺壓板: x~x+w, top~bottom 的實心柱; 底部 20px 是朝下的紅尖刺(含在 bottom 以上)
      ctx.save();
      var x = s.x, w = s.w || 360, top = s.top == null ? HUD_H : s.top, bottom = s.bottom == null ? 360 : s.bottom;
      var hold = Math.max(0, Math.min(1, s.hold || 0));
      var SH = 20, bodyB = bottom - SH;
      // 升起時間: interface 沒傳, 依柱長判斷 — 第 6 關巨柱(約 1100 高)1.7 秒, 第 7 關短柱(約 160 高)1.2 秒
      var rise = (bottom - top) > 600 ? 1.7 : 1.2;
      var rem = hold * rise;
      var flashOn = !!s.warn && hold > 0 && (Math.floor(rem / 0.075) % 2 === 0);
      // 本體: 暗色實心(實心擋路), 兩側壓板色亮邊
      ctx.fillStyle = C.crusherBody;
      ctx.fillRect(x, top, w, bodyB - top);
      ctx.strokeStyle = 'rgba(0,0,0,0.35)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (var py = top + 30; py < bodyB - 30; py += 30) {
        ctx.moveTo(x + 6, py); ctx.lineTo(x + w - 6, py);
      }
      ctx.stroke();
      ctx.fillStyle = flashOn ? C.danger : C.crusher;
      ctx.fillRect(x, top, 5, bodyB - top);
      ctx.fillRect(x + w - 5, top, 5, bodyB - top);
      // 下緣斜紋帶(壓板色記號, 與按鈕底座相同)
      var bandH = 16;
      ctx.fillStyle = C.crusherDark;
      ctx.fillRect(x, bodyB - bandH, w, bandH);
      hazardStripes(ctx, x, bodyB - bandH, w, bandH, flashOn ? C.danger : C.crusher, 14);
      // 倒數量條: 斜紋帶上方。軌道常駐(這根柱子有倒數), 填色隨 hold 從右往左縮
      // 量條右側留給節奏燈(右端)與 C 鍵帽(燈左邊), 三者同一列 = 角色眼睛高度(bottom 往上 38~64)
      var tx = x + 20, tw = Math.max(20, w - 114), th = 14, ty = bodyB - bandH - 8 - th;
      if (ty > top + 4) {
        rr(ctx, tx - 3, ty - 3, tw + 6, th + 6, 6);
        ctx.fillStyle = 'rgba(8,10,18,0.85)';
        ctx.fill();
        // 最後 0.3 秒那一段(左側 0.3 / 升起時間)預先染暗紅: 量條縮進這段 = 快落下了
        var wz = tw * 0.3 / rise;
        ctx.fillStyle = 'rgba(255,77,77,0.22)';
        ctx.fillRect(tx, ty, wz, th);
        if (hold > 0) {
          var fw = Math.max(3, tw * hold);
          ctx.fillStyle = s.warn ? (flashOn ? C.danger : '#ffffff') : '#ffe2b8';
          ctx.fillRect(tx, ty, fw, th);
          ctx.fillStyle = 'rgba(255,255,255,0.6)';
          ctx.fillRect(tx, ty, fw, 3);
        }
        // 每 0.3 秒一格刻度
        ctx.fillStyle = 'rgba(8,10,18,0.9)';
        for (var k = 1; k * 0.3 < rise - 0.05; k++) ctx.fillRect(tx + tw * (k * 0.3) / rise - 1, ty, 2, th);
      }
      // 節奏燈: 右端; ok 時燈左邊一個 C 鍵帽(與 Z / X 同一種鍵帽, 外框用綠燈色)
      var cue = s.cue || 'none';
      var lcx = x + w - 34, lcy = ty + th / 2;
      if (lcy - 18 >= top) {
        cueLamp(ctx, lcx, lcy, cue);
        if (cue === 'ok') {
          keycap(ctx, 'C', lcx - 42, lcy, 26);
          ctx.save();
          rr(ctx, lcx - 42 - 15, lcy - 15, 30, 30, 9);
          ctx.lineWidth = 2.5;
          ctx.strokeStyle = C.cueOk;
          ctx.stroke();
          ctx.restore();
        }
      }
      // 尖刺: 底座條 + 朝下紅三角
      ctx.fillStyle = '#5a1a20';
      ctx.fillRect(x, bodyB, w, 4);
      var n = Math.max(1, Math.round(w / 12)), sw = w / n;
      for (var i = 0; i < n; i++) {
        ctx.beginPath();
        ctx.moveTo(x + i * sw, bodyB + 3);
        ctx.lineTo(x + i * sw + sw / 2, bottom);
        ctx.lineTo(x + (i + 1) * sw, bodyB + 3);
        ctx.closePath();
        ctx.fillStyle = flashOn ? '#ff9a9a' : C.spike;
        ctx.fill();
      }
      // 外框
      ctx.strokeStyle = C.outline;
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 1, top + 1, w - 2, bodyB - top - 1);
      ctx.restore();
    },


    drawSeesaw: function (ctx, s) {
      // 200 x 12: 左 80 落點端(暗、圓頭 ↓) / 中 40 板身與支點 / 右 80 發射端(亮、圓頭 ↑)
      // 擺動演出只用圓弧 / 圓點 / 扁橢圓, 不用尖角、不用紅橘系(H47: 避免被讀成陷阱)
      ctx.save();
      var x = s.x, y = s.y;
      var t = Math.max(0, Math.min(1, s.tilt || 0));
      var sw = Math.max(0, Math.min(1, s.swing || 0));
      // 板子角度: swing > 0 時依 swing 走「翹起 → 略過頭 → 彈回平」; swing = 0 時沿用 tilt
      var eff = t;
      if (sw > 0) {
        if (sw < 0.25) eff = Math.sin(sw / 0.25 * Math.PI / 2);
        else if (sw < 0.75) eff = -0.25 + 1.25 * (0.5 + 0.5 * Math.cos(Math.PI * (sw - 0.25) / 0.5));
        else eff = -0.25 * (0.5 + 0.5 * Math.cos(Math.PI * (sw - 0.75) / 0.25));
        if (sw >= 1) eff = 0;
      }
      var ang = -eff * 12 * Math.PI / 180;
      // 支點(不動)
      ctx.fillStyle = '#1a1f2e';
      ctx.beginPath();
      ctx.moveTo(x + 100, y + 6);
      ctx.lineTo(x + 112, y + 12);
      ctx.lineTo(x + 88, y + 12);
      ctx.closePath();
      ctx.fill();
      ctx.save();
      ctx.translate(x + 100, y + 8);
      ctx.rotate(ang);
      // 板身
      rr(ctx, -100, -6, 200, 10, 3);
      ctx.fillStyle = C.seesaw;
      ctx.fill();
      // 落點端
      rr(ctx, -100, -6, 80, 10, 3);
      ctx.fillStyle = C.seesawLand;
      ctx.fill();
      // 發射端
      rr(ctx, 20, -6, 80, 10, 3);
      ctx.fillStyle = C.seesawLaunch;
      ctx.fill();
      rr(ctx, -100, -6, 200, 10, 3);
      ctx.lineWidth = 2;
      ctx.strokeStyle = C.outline;
      ctx.stroke();
      // 支點樞紐
      ctx.beginPath();
      ctx.arc(0, -1, 3, 0, Math.PI * 2);
      ctx.fillStyle = C.outline;
      ctx.fill();
      // 記號: 兩端各一個圓頭箭頭(箭桿 + 圓角兩翼), 成對: 落點端 ↓(淡), 發射端 ↑(深)
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = 2.6;
      ctx.strokeStyle = 'rgba(238,241,248,0.85)';
      ctx.beginPath();
      ctx.moveTo(-60, -4.2); ctx.lineTo(-60, 2.6);              // 箭桿
      ctx.moveTo(-67, -1); ctx.lineTo(-60, 2.6); ctx.lineTo(-53, -1); // 兩翼
      ctx.stroke();
      ctx.strokeStyle = '#1a1f2e';
      ctx.beginPath();
      ctx.moveTo(60, 2.6); ctx.lineTo(60, -4.2);
      ctx.moveTo(53, -0.6); ctx.lineTo(60, -4.2); ctx.lineTo(67, -0.6);
      ctx.stroke();
      ctx.restore();

      // 擺動中: 發射端上方的扁橢圓氣流圈 + 兩側灰塵圓點(世界座標, 跟著發射端目前位置)
      if (sw > 0 && sw < 1) {
        ctx.save();
        var lcx = x + 100 + 60 * Math.cos(ang);           // 發射端中心
        var ltop = y + 8 + 60 * Math.sin(ang) - 6;        // 發射端頂面
        var k, p, a;
        ctx.lineCap = 'round';
        // 氣流圈: 兩圈, 第二圈晚 0.25 出發; 往上 50px、變大、淡出, swing = 1 時消失
        for (k = 0; k < 2; k++) {
          var d = k * 0.25;
          p = (sw - d) / (1 - d);
          if (p <= 0 || p >= 1) continue;
          var ep = 1 - (1 - p) * (1 - p);
          a = Math.pow(1 - p, 1.3) * (k === 0 ? 0.95 : 0.7);
          var cy = ltop - 8 - 50 * ep;
          var rx = 22 + 22 * ep, ry = 5 + 4 * ep;
          ctx.beginPath();
          ctx.ellipse(lcx, cy, rx, ry, 0, 0, Math.PI * 2);
          ctx.lineWidth = 6 - 2 * p;
          ctx.strokeStyle = 'rgba(8,10,18,' + (a * 0.55) + ')';
          ctx.stroke();
          ctx.lineWidth = 3 - 1.2 * p;
          ctx.strokeStyle = 'rgba(238,241,248,' + a + ')';
          ctx.stroke();
        }
        // 灰塵圓點: 發射端兩側各 3 顆, 往外往上散開並淡出
        p = sw;
        a = Math.pow(1 - p, 1.1) * 0.9;
        for (var side = -1; side <= 1; side += 2) {
          var ox = lcx + side * 40;
          for (k = 0; k < 3; k++) {
            var dx = side * (8 + k * 9) * (0.3 + p);
            var dy = -(6 + k * 7) * p * 2 + 14 * p * p;
            var r = 3.6 - k * 0.5 - 1.2 * p;
            ctx.beginPath();
            ctx.arc(ox + dx, ltop - 2 + dy, Math.max(1, r) + 1.2, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(8,10,18,' + (a * 0.45) + ')';
            ctx.fill();
            ctx.beginPath();
            ctx.arc(ox + dx, ltop - 2 + dy, Math.max(1, r), 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(201,208,226,' + a + ')';
            ctx.fill();
          }
        }
        ctx.restore();
      }
      ctx.restore();
    },

    drawGoal: function (ctx, s) {
      ctx.save();
      var x = s.x, y = s.y;
      ctx.fillStyle = '#6b5a24';
      ctx.fillRect(x + 2, y + 72, 20, 8);
      ctx.fillStyle = '#e8e2c8';
      ctx.fillRect(x + 9, y + 2, 5, 72);
      ctx.beginPath();
      ctx.arc(x + 11.5, y + 4, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(x + 14, y + 6);
      ctx.lineTo(x + 48, y + 14);
      ctx.lineTo(x + 40, y + 24);
      ctx.lineTo(x + 48, y + 36);
      ctx.lineTo(x + 14, y + 40);
      ctx.closePath();
      ctx.fillStyle = C.goal;
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#8a6a10';
      ctx.stroke();
      ctx.fillStyle = '#fff6c8';
      ctx.beginPath();
      for (var i = 0; i < 10; i++) {
        var r = i % 2 ? 3 : 7;
        var a = -Math.PI / 2 + i * Math.PI / 5;
        var px = x + 27 + Math.cos(a) * r, py = y + 23 + Math.sin(a) * r;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    },

    drawGhostPath: function (ctx, s) {
      var segs = (s && s.segments) || [];
      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      for (var k = 0; k < segs.length; k++) {
        var p = segs[k];
        if (!p || p.length < 2) continue;
        ctx.beginPath();
        ctx.moveTo(p[0].x, p[0].y);
        for (var i = 1; i < p.length; i++) ctx.lineTo(p[i].x, p[i].y);
        ctx.strokeStyle = 'rgba(8,10,18,0.55)';
        ctx.lineWidth = 6;
        ctx.stroke();
        ctx.strokeStyle = 'rgba(168,196,255,0.7)';
        ctx.lineWidth = 3;
        ctx.setLineDash([3, 7]);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      var n = 0;
      ctx.fillStyle = 'rgba(168,196,255,0.85)';
      for (var a = 0; a < segs.length; a++) {
        var q = segs[a] || [];
        for (var b = 0; b < q.length; b++) {
          if (n > 0 && n % 60 === 0) {
            ctx.beginPath();
            ctx.arc(q[b].x, q[b].y, 4, 0, Math.PI * 2);
            ctx.fill();
          }
          n++;
        }
      }
      var last = segs.length ? segs[segs.length - 1] : null;
      if (last && last.length) {
        var e = last[last.length - 1];
        ctx.beginPath();
        ctx.arc(e.x, e.y, 6, 0, Math.PI * 2);
        ctx.lineWidth = 2;
        ctx.strokeStyle = 'rgba(168,196,255,0.85)';
        ctx.stroke();
      }
      ctx.restore();
    },

    drawWhistleRing: function (ctx, s) {
      var t = Math.max(0, Math.min(1, s.t || 0));
      var cx = s.cx, cy = s.cy;
      ctx.save();
      ctx.globalAlpha = 1 - t * 0.85;
      ctx.lineWidth = 5;
      ctx.strokeStyle = C.whistle;
      var r1 = 34 + 70 * t;
      ctx.beginPath();
      ctx.arc(cx, cy, r1, 0, Math.PI * 2);
      ctx.stroke();
      if (t > 0.2) {
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(cx, cy, 34 + 70 * (t - 0.2), 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      var ri = r1 + 8, ro = r1 + 26 - 8 * t;
      for (var i = 0; i < 8; i++) {
        var a = i * Math.PI / 4 + Math.PI / 8;
        var ix = cx + Math.cos(a) * ri, iy = cy + Math.sin(a) * ri;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * ro, cy + Math.sin(a) * ro);
        ctx.lineTo(ix, iy);
        ctx.moveTo(ix + Math.cos(a + 0.5) * 7, iy + Math.sin(a + 0.5) * 7);
        ctx.lineTo(ix, iy);
        ctx.lineTo(ix + Math.cos(a - 0.5) * 7, iy + Math.sin(a - 0.5) * 7);
        ctx.stroke();
      }
      ctx.restore();
    },

    drawGhost: function (ctx, s) {
      ctx.save();
      drawFigure(ctx, s.x, s.y, s.facing, s.state, s.gen, 'ghost', !!s.hookable);
      if (s.hookable) {
        // Z 鍵帽: 框外右上角(靠右緣時改左上), 與 drawAim 的鍵帽同一樣式
        var zx = s.x + 40 + 17 + 13 > W ? s.x - 17 : s.x + 40 + 17;
        var zy = Math.max(HUD_H + 15, s.y + 4);
        ctx.save();
        ctx.strokeStyle = C.hook;
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        var ex = zx < s.x ? s.x + 2 : s.x + 38;
        ctx.moveTo(ex, Math.max(zy, s.y + 8));
        ctx.lineTo(zx + (zx < s.x ? 10 : -10), zy);
        ctx.stroke();
        ctx.restore();
        keycap(ctx, 'Z', zx, zy, 26);
        ctx.save();
        rr(ctx, zx - 15, zy - 15, 30, 30, 9);
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = C.hook;
        ctx.stroke();
        ctx.restore();
        if (s.hookAir === false) {
          // 幽靈站在地上: Z 鍵帽正下方小字「↑等它跳」, 往遠離幽靈的方向對齊(不蓋到幽靈身體)
          var right = zx > s.x;
          var tw2 = 66, th2 = 22;
          var bx0 = right ? zx - 15 : zx + 15 - tw2;
          bx0 = Math.max(2, Math.min(W - tw2 - 2, bx0));
          var by0 = zy + 19;
          ctx.save();
          rr(ctx, bx0, by0, tw2, th2, 6);
          ctx.fillStyle = 'rgba(10,14,24,0.88)';
          ctx.fill();
          ctx.lineWidth = 1.5;
          ctx.strokeStyle = 'rgba(166,255,77,0.6)';
          ctx.stroke();
          // 小向上箭頭
          var ax0 = bx0 + 11, ay0 = by0 + th2 / 2;
          ctx.strokeStyle = C.hook;
          ctx.fillStyle = C.hook;
          ctx.lineWidth = 2;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(ax0, ay0 + 6); ctx.lineTo(ax0, ay0 - 2);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(ax0 - 4, ay0 - 1); ctx.lineTo(ax0, ay0 - 7); ctx.lineTo(ax0 + 4, ay0 - 1);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
          text(ctx, '等它跳', bx0 + 40, by0 + th2 / 2 + 1, 14, C.hook);
        }
      }
      ctx.restore();
    },

    drawHook: function (ctx, s) {
      ctx.save();
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(s.x1, s.y1);
      ctx.lineTo(s.x2, s.y2);
      ctx.strokeStyle = 'rgba(8,10,18,0.85)';
      ctx.lineWidth = 7;
      ctx.stroke();
      ctx.strokeStyle = C.hook;
      ctx.lineWidth = 3;
      ctx.stroke();
      var a = Math.atan2(s.y2 - s.y1, s.x2 - s.x1);
      ctx.lineWidth = 3.5;
      for (var i = -1; i <= 1; i++) {
        var b = a + Math.PI + i * 0.7;
        ctx.beginPath();
        ctx.moveTo(s.x2, s.y2);
        ctx.lineTo(s.x2 + Math.cos(b) * 11, s.y2 + Math.sin(b) * 11);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.arc(s.x2, s.y2, 4.5, 0, Math.PI * 2);
      ctx.fillStyle = C.hook;
      ctx.fill();
      ctx.restore();
    },

    drawPlayer: function (ctx, s) {
      ctx.save();
      drawFigure(ctx, s.x, s.y, s.facing, s.state, s.gen, 'player', false);
      ctx.restore();
    },

    drawAim: function (ctx, s) {
      ctx.save();
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(s.px, s.py);
      ctx.lineTo(s.gx, s.gy);
      ctx.strokeStyle = 'rgba(8,10,18,0.7)';
      ctx.lineWidth = 6;
      ctx.stroke();
      ctx.setLineDash([10, 8]);
      ctx.strokeStyle = C.hook;
      ctx.lineWidth = 2.5;
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.arc(s.gx, s.gy, 7, 0, Math.PI * 2);
      ctx.lineWidth = 2.5;
      ctx.stroke();
      var ch = Math.max(0, Math.min(1, s.charge || 0));
      // 角色旁按鍵提示: 預設頭頂上方(避開蓄力環); 會壓到 HUD 或出畫布就放腳下。
      // 箭頭幾乎朝正上方時往側邊讓開, 不蓋住箭頭。提示先畫, 箭頭疊在上面(箭頭是決策本體)
      var hdx = s.ax - s.px, hdy = s.ay - s.py, hl = Math.hypot(hdx, hdy) || 1;
      var hy = s.py - 40 - 8 - HINT_H / 2;
      var below = hy - HINT_H / 2 < HUD_H + 4;
      if (below) hy = s.py + 40 + 8 + HINT_H / 2;
      var hx = s.px;
      var into = below ? (hdy / hl > 0.2) : (hdy / hl < -0.2);
      if (into) {
        var side = Math.abs(hdx) > 4 ? -Math.sign(hdx) : (s.px > W / 2 ? -1 : 1);
        hx = s.px + side * (HINT_W / 2 + 14);
      }
      hx = Math.max(HINT_W / 2 + 4, Math.min(W - HINT_W / 2 - 4, hx));
      if (hy + HINT_H / 2 > H - 4) hy = H - 4 - HINT_H / 2;
      aimHint(ctx, hx, hy);
      ctx.beginPath();
      ctx.arc(s.px, s.py, 40, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(166,255,77,0.18)';
      ctx.lineWidth = 6;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(s.px, s.py, 40, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * ch);
      ctx.strokeStyle = ch >= 1 ? '#ffffff' : C.hook;
      ctx.stroke();
      var len = Math.hypot(s.ax - s.px, s.ay - s.py);
      if (len > 2) arrow(ctx, s.px, s.py, s.ax, s.ay, ch >= 1 ? '#e8ffd0' : C.hook, 7, 24);
      ctx.restore();
    },

    drawHud: function (ctx, s) {
      ctx.save();
      var gen = s.gen || 1, maxGen = s.maxGen || 3, phase = s.phase || 'play';
      ctx.fillStyle = C.hudBg;
      ctx.fillRect(0, 0, W, HUD_H);
      ctx.fillStyle = C.hudLine;
      ctx.fillRect(0, HUD_H - 3, W, 3);

      // 左: 代數 + 三個小人
      text(ctx, '第 ' + gen + ' 代', 16, 28, 26, C.text, 'left');
      text(ctx, '/ ' + maxGen, 112, 30, 20, C.textDim, 'left');
      for (var i = 1; i <= maxGen; i++) {
        var mode = i === gen ? 'player' : (i === gen - 1 ? 'ghost' : (i < gen ? 'gone' : 'future'));
        var fx = 16 + (i - 1) * 34, fy = 52;
        ctx.save();
        ctx.translate(fx, fy);
        ctx.scale(0.55, 0.55);
        if (mode === 'future') {
          rr(ctx, 3, 1, 34, 45, 12);
          ctx.strokeStyle = 'rgba(138,147,173,0.5)';
          ctx.lineWidth = 3;
          ctx.stroke();
        } else {
          drawFigure(ctx, 0, 0, 1, 'idle', null, mode, false);
        }
        ctx.restore();
      }

      // 關卡
      text(ctx, '關卡', 222, 26, 18, C.textDim);
      text(ctx, (s.level || 1) + ' / ' + (s.levelCount || 7), 222, 64, 28, C.text);

      // 鉤爪次數(解鎖後)
      if (s.hookUnlocked) {
        keycap(ctx, 'Z', 312, 24, 26);
        text(ctx, '鉤爪', 348, 25, 18, C.hook);
        hookPips(ctx, 290, 64, s.hookLeft == null ? 2 : s.hookLeft, s.hookMax || 2);
      }

      // 右: 按鍵提示(瞄準提示改由 drawAim 畫在角色旁; 這裡只畫「時間停了」的框)
      if (s.aiming) pauseFrame(ctx, 0, HUD_H, W, H - HUD_H);

      // 剩餘時間(只在 play; 瞄準中照畫, 數字停住)
      if (phase === 'play') hudTimer(ctx, 400, s.timeLeft, s.timeMax || 60);

      // C 吹哨(上) / R 重來(下), 版位固定
      if (s.whistleUnlocked) {
        ctx.save();
        if (s.aiming) ctx.globalAlpha = 0.35; // 瞄準中 C 無效
        keycap(ctx, 'C', 574, 28, 26);
        text(ctx, '吹哨', 610, 28, 18, C.text);
        ctx.restore();
      }
      keycap(ctx, 'R', 574, 72, 26);
      text(ctx, '重來', 610, 72, 18, C.textDim);

      // 靜音
      speaker(ctx, 690, 30, !!s.muted);
      keycap(ctx, 'M', 688, 74, 26);

      if (phase === 'dying' && gen < maxGen) {
        text(ctx, '第 ' + (gen + 1) + ' 代準備出發…', W / 2, 130, 24, C.textDim);
      }

      if (phase === 'win') {
        rr(ctx, 110, 520, 500, 200, 18);
        ctx.fillStyle = 'rgba(10,14,24,0.82)';
        ctx.fill();
        ctx.lineWidth = 4;
        ctx.strokeStyle = C.goal;
        ctx.stroke();
        text(ctx, '過關!', W / 2, 578, 64, C.goal);
        text(ctx, '三代合力回放中', W / 2, 640, 26, C.text);
        text(ctx, '空白鍵 下一關', W / 2, 686, 24, C.textDim);
      } else if (phase === 'lose') {
        ctx.fillStyle = 'rgba(6,8,14,0.78)';
        ctx.fillRect(0, HUD_H, W, H - HUD_H);
        text(ctx, '失敗', W / 2, 560, 72, C.danger);
        text(ctx, '三個人都沒摸到旗子', W / 2, 640, 30, C.text);
        text(ctx, '空白鍵 再試一次', W / 2, 710, 28, C.textDim);
      }
      ctx.restore();
    },

    // ---------- 開始畫面 ----------
    drawTitle: function (ctx, s) {
      s = s || {};
      var t = s.t || 0;
      var A = Art;
      ctx.save();
      bgFill(ctx);
      // 遊戲名: 本體 + 身後一層淡藍「殘影」(只是字的裝飾, 不是遊戲物件)
      text(ctx, '幽影接力', W / 2 + 7, 318, 96, 'rgba(168,196,255,0.28)');
      text(ctx, '幽影接力', W / 2, 310, 96, C.text);

      // 中央小圖: 你(前一刻, 在地上)→ 跳到 1 號幽靈頭上, 一起往上
      ctx.save();
      ctx.translate(W / 2, 600);
      ctx.scale(2.2, 2.2);
      A.drawPlatform(ctx, { x: -130, y: 100, w: 260, h: 40, solid: true });
      var bob = 30 * Math.abs(Math.sin(t * 1.7));
      var gy = 44 - bob;
      // 前一刻的你: 同一個實心小人的淡化殘留(實線深外框, 與幽靈的淡藍虛線不同)
      ctx.save();
      ctx.globalAlpha = 0.42;
      drawFigure(ctx, -100, 44, 1, 'idle', 2, 'player', false);
      ctx.restore();
      // 跳躍弧線(虛線) → 落在幽靈頭頂上的你
      ctx.save();
      ctx.setLineDash([4, 5]);
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.strokeStyle = 'rgba(255,241,208,0.55)';
      ctx.beginPath();
      ctx.moveTo(-70, 40);
      ctx.quadraticCurveTo(-46, gy - 96, 2, gy - 56 + 8);
      ctx.stroke();
      ctx.restore();
      A.drawGhost(ctx, { x: -10, y: gy, facing: 1, state: bob > 1 ? 'air' : 'idle', gen: 1, hookable: false, hookAir: bob > 1 });
      A.drawPlayer(ctx, { x: -10, y: gy - 56, facing: 1, state: 'idle', gen: 2 });
      ctx.restore();

      // 空白鍵 開始(閃爍)
      var blink = 0.35 + 0.65 * (0.5 + 0.5 * Math.cos(t * Math.PI * 2 / 1.2));
      ctx.save();
      ctx.globalAlpha = blink;
      ctx.font = 'bold 26px ' + FONT;
      var kw = Math.max(52, ctx.measureText('空白鍵').width + 26);
      ctx.font = 'bold 36px ' + FONT;
      var tw = ctx.measureText('開始').width;
      var x0 = W / 2 - (kw + 18 + tw) / 2;
      keycap(ctx, '空白鍵', x0 + kw / 2, 1000, 52);
      text(ctx, '開始', x0 + kw + 18, 1000, 36, C.text, 'left');
      ctx.restore();

      // 右下: M 靜音 + 喇叭
      keycap(ctx, 'M', 556, 1222, 34);
      text(ctx, '靜音', 604, 1222, 22, C.textDim);
      speaker(ctx, 672, 1222, !!s.muted);
      ctx.restore();
    },

    // ---------- 新手教學泡泡 ----------
    drawTutorial: function (ctx, s) {
      s = s || {};
      var keys = s.keys || [], pressed = s.pressed || [];
      var pop = s.pop == null ? 1 : clamp01(s.pop);
      var done = clamp01(s.done);
      var above = s.place !== 'below';
      var ax = s.ax || 0, ay = s.ay || 0;
      var stage = s.stage || '';
      var str = s.text || '';
      var i;
      if (done >= 1) return;
      ctx.save();

      // 版面: [文字][小圖示][鍵帽…]
      ctx.font = 'bold ' + TUT_FONT + 'px ' + FONT;
      var tw = str ? ctx.measureText(str).width : 0;
      var iconW = stage === 'head' ? 24 : 0;
      var kws = [], kTot = 0;
      for (i = 0; i < keys.length; i++) { kws.push(tutKeyWidth(ctx, keys[i])); kTot += kws[i] + (i ? 8 : 0); }
      var bw = TUT_PAD * 2 + tw + (iconW ? 8 + iconW : 0) + (keys.length ? (tw ? 14 : 0) + kTot : 0);
      bw = Math.max(bw, 96);
      var bh = TUT_BH;
      var bx = Math.max(12, Math.min(W - 12 - bw, ax - bw / 2));
      var by = above ? ay - TUT_GAP - bh : ay + TUT_GAP;
      var tipY = above ? ay - 4 : ay + 4;
      var tipX = ax;
      var bcx = bx + bw / 2, bcy = by + bh / 2;

      // 整體淡出(完成特效後段)
      var fade = done > 0.55 ? 1 - (done - 0.55) / 0.45 : 1;
      var appear = Math.min(1, pop * 3);

      // 標示框(畫在泡泡下面)
      if (s.mark) tutMark(ctx, s.mark, appear * fade);

      // 縮放: 出現時從尾巴尖端彈出; 完成後段往泡泡中心縮小
      ctx.save();
      ctx.globalAlpha = appear * fade;
      var sc = pop < 1 ? Math.max(0.05, easeOutBack(pop)) : 1;
      ctx.translate(tipX, tipY);
      ctx.scale(sc, sc);
      ctx.translate(-tipX, -tipY);
      if (done > 0.55) {
        var k2 = 1 - 0.55 * (done - 0.55) / 0.45;
        ctx.translate(bcx, bcy);
        ctx.scale(k2, k2);
        ctx.translate(-bcx, -bcy);
      }
      // 泡泡本體
      var flash = done > 0 ? Math.sin(Math.min(1, done / 0.45) * Math.PI) : 0;
      tutBubblePath(ctx, bx, by, bw, bh, tipX, tipY, above);
      ctx.lineJoin = 'round';
      ctx.lineWidth = 6;
      ctx.strokeStyle = TUT.edge;
      ctx.stroke();
      ctx.fillStyle = TUT.fill;
      ctx.fill();
      if (done > 0) {
        ctx.fillStyle = 'rgba(47,224,138,' + (0.55 * Math.max(flash, done > 0.45 ? 0.35 : 0)) + ')';
        ctx.fill();
        ctx.lineWidth = 3;
        ctx.strokeStyle = TUT.done;
        ctx.stroke();
      }
      // 內容
      var cx = bx + TUT_PAD, cy = by + bh / 2;
      if (tw) {
        ctx.fillStyle = TUT.ink;
        ctx.font = 'bold ' + TUT_FONT + 'px ' + FONT;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(str, cx, cy + 1);
        cx += tw;
      }
      if (iconW) { downArrowIcon(ctx, cx + 8 + iconW / 2, cy); cx += 8 + iconW; }
      if (keys.length) {
        cx += tw ? 14 : 0;
        var tNow = nowMs();
        for (i = 0; i < keys.length; i++) {
          var id = stage + '#' + i;
          var on = !!pressed[i];
          var b = 0;
          if (on) {
            if (tutKeySeen[id] == null) tutKeySeen[id] = tNow;
            var el = tNow - tutKeySeen[id];
            if (el < 260) b = Math.sin(Math.PI * el / 260);
          } else {
            delete tutKeySeen[id];
          }
          // 完成時鍵帽依序彈一下(move 三顆; 其他階段的單顆也照做)
          if (done > 0) {
            var d0 = i * 0.1, dp = (done - d0) / 0.2;
            if (dp > 0 && dp < 1) b = Math.max(b, Math.sin(Math.PI * dp));
          }
          tutKey(ctx, keys[i], cx + kws[i] / 2, cy - 1, on, b);
          cx += kws[i] + 8;
        }
      }
      // 完成: 中央彈出大勾勾
      if (done > 0) {
        var cp = Math.min(1, done / 0.25);
        bigCheck(ctx, bcx, bcy, easeOutBack(cp));
      }
      ctx.restore();

      // 完成: 8 顆小星點從泡泡中心往外散開淡出
      if (done > 0.08) {
        var sp = (done - 0.08) / 0.92;
        var e2 = 1 - Math.pow(1 - sp, 2);
        for (i = 0; i < 8; i++) {
          var a = i * Math.PI / 4 + Math.PI / 8;
          var dist = 34 + 96 * e2;
          sparkle(ctx, bcx + Math.cos(a) * dist * 1.35, bcy + Math.sin(a) * dist * 0.8,
            4.5 - 2 * sp, i % 2 ? '#ffffff' : TUT.done, Math.max(0, 1 - sp));
        }
      }
      ctx.restore();
    },

    // ---------- 開場橫幅(不擋操作, 自動消失) ----------
    drawLevelBanner: function (ctx, s) {
      s = s || {};
      var t = clamp01(s.t);
      var a = t < 0.13 ? t / 0.13 : (t > 0.8 ? (1 - t) / 0.2 : 1);
      if (a <= 0) return;
      var A = Art;
      var oy = -16 * (1 - (t < 0.13 ? a : 1));
      var X = 24, Y = 120 + oy, BW = W - 48, BH = 180;
      ctx.save();
      ctx.globalAlpha = a;
      rr(ctx, X, Y, BW, BH, 18);
      ctx.fillStyle = 'rgba(10,14,24,0.72)';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgba(255,255,255,0.16)';
      ctx.stroke();
      // 左: 新東西小圖(遊戲內畫法)
      var IX = X + 14, IY = Y + 12, IW = 220, IH = BH - 24;
      rr(ctx, IX, IY, IW, IH, 12);
      ctx.fillStyle = 'rgba(255,255,255,0.04)';
      ctx.fill();
      ctx.save();
      rr(ctx, IX, IY, IW, IH, 12);
      ctx.clip();
      ctx.translate(IX + IW / 2, IY + IH / 2);
      ctx.scale(0.4, 0.4);
      introIcon(ctx, A, s.newThing || 'relay', 0, 0);
      ctx.restore();
      // 右: 第幾關 + 關名
      var TX = IX + IW + 26;
      text(ctx, '第 ' + (s.level || 1) + ' 關 / 共 ' + (s.levelCount || 7) + ' 關', TX, Y + 54, 24, C.textDim, 'left');
      text(ctx, s.title || '', TX, Y + 116, 54, C.text, 'left');
      ctx.restore();
    },

    drawUnlockPage: function (ctx, s) {
      s = s || {};
      var A = Art;
      var hook = s.ability !== 'whistle';
      ctx.save();
      bgFill(ctx);
      text(ctx, '解鎖', W / 2, 200, 34, C.textDim);
      text(ctx, hook ? '鉤爪' : '起跑哨', W / 2, 290, 80, hook ? C.hook : C.whistle);
      var PX = 60, PY = 400, PW = 600, PH = 600;
      rr(ctx, PX, PY, PW, PH, 24);
      ctx.fillStyle = 'rgba(8,12,22,0.55)';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgba(255,255,255,0.1)';
      ctx.stroke();
      ctx.save();
      rr(ctx, PX, PY, PW, PH, 24);
      ctx.clip();
      if (hook) {
        // 角色射出、鉤住半空中的幽靈, 鉤索拉直(射出後在空中 → 幽靈不畫可鉤框)
        ctx.translate(W / 2, PY + PH / 2);
        ctx.scale(2.1, 2.1);
        A.drawPlatform(ctx, { x: -140, y: 112, w: 280, h: 24 });
        A.drawGhost(ctx, { x: 40, y: -122, facing: 1, state: 'air', gen: 1, hookable: false, hookAir: true });
        A.drawHook(ctx, { x1: -50, y1: 6, x2: 60, y2: -94 });
        A.drawPlayer(ctx, { x: -70, y: -22, facing: 1, state: 'launch', gen: 2 });
      } else {
        // 哨子 + 一圈哨音波紋
        ctx.translate(W / 2, PY + PH / 2);
        ctx.scale(2.2, 2.2);
        A.drawWhistleRing(ctx, { cx: 0, cy: 0, t: 0.35 });
        whistleIcon(ctx);
      }
      ctx.restore();
      bottomPrompt(ctx, '繼續');
      ctx.restore();
    },

    drawEnding: function (ctx) {
      var A = Art;
      ctx.save();
      bgFill(ctx);
      // 靜態彩紙(金 / 白 / 淡藍), 只在上半
      var conf = [[90, 420, C.goal], [170, 480, C.ghost], [260, 400, '#ffffff'], [480, 430, C.goal], [560, 390, C.ghost], [640, 470, '#ffffff'],
        [130, 560, '#ffffff'], [600, 560, C.goal], [330, 520, C.ghost], [410, 470, '#ffffff']];
      for (var i = 0; i < conf.length; i++) {
        ctx.save();
        ctx.translate(conf[i][0], conf[i][1]);
        ctx.rotate(i * 0.7);
        ctx.fillStyle = conf[i][2];
        ctx.fillRect(-6, -3, 12, 6);
        ctx.restore();
      }
      text(ctx, '全部通關!', W / 2, 280, 76, C.goal);
      text(ctx, '三個人, 七關, 一起走到了', W / 2, 360, 28, C.text);
      A.drawPlatform(ctx, { x: 120, y: 820, w: 480, h: 24 });
      A.drawGoal(ctx, { x: 520, y: 740 });
      ctx.save();
      ctx.translate(360, 760);
      ctx.scale(1.6, 1.6);
      drawFigure(ctx, -110, -60, 1, 'air', 1, 'player', false);
      drawFigure(ctx, -40, -80, 1, 'air', 2, 'player', false);
      drawFigure(ctx, 30, -60, -1, 'air', 3, 'player', false);
      ctx.restore();
      bottomPrompt(ctx, '從第 1 關再玩');
      ctx.restore();
    }
  };

  window.Art = Art;
})();
