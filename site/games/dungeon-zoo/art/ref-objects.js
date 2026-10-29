// 參考用, 不被 index.html 載入。打磨第 1 輪從 deepen-5 A、C 款美術抽出的地下城互動物件畫法, 給美術移植到 art.js 時參考。
// 輔助函式(S、num、pick、ratio、circle、star、heartPath、PAL、obj、n、shadow、DUNGEONS、P、TAU)是原款 art.js 的, 移植時改用本款 art.js 的同類函式。

// ===== deepen-5 game-a: 爆炸桶 drawKeg、回復泉 drawFountain =====
  function drawKeg(ctx, st) {
    st = S(st);
    var x = num(st.x, 0), y = num(st.y, 0);
    var mode = pick(st.mode, ['ok', 'fuse', 'gone'], 'ok');
    var p = ratio(st.fuseT, num(st.fuseDur, 0.6));
    ctx.save();
    if (mode === 'gone') {
      // 焦痕 + 碎木 (平面, 不立體, 不像桶)
      ctx.beginPath(); ctx.ellipse(x, y + 6, 24, 15, 0, 0, Math.PI * 2); ctx.fillStyle = 'rgba(20,12,10,0.55)'; ctx.fill();
      ctx.strokeStyle = '#6a4424'; ctx.lineWidth = 3; ctx.lineCap = 'round';
      var bits = [[-16, 0, 0.4], [10, 10, -0.7], [14, -6, 1.2], [-6, 14, 2.0]];
      for (var b = 0; b < bits.length; b++) {
        ctx.beginPath(); ctx.moveTo(x + bits[b][0] - Math.cos(bits[b][2]) * 5, y + bits[b][1] - Math.sin(bits[b][2]) * 5);
        ctx.lineTo(x + bits[b][0] + Math.cos(bits[b][2]) * 5, y + bits[b][1] + Math.sin(bits[b][2]) * 5); ctx.stroke();
      }
      ctx.restore(); return;
    }
    var shake = mode === 'fuse' ? Math.sin(p * 60) * (0.5 + p) : 0;
    ctx.translate(shake, 0);
    // 影子
    ctx.beginPath(); ctx.ellipse(x, y + 18, 20, 6, 0, 0, Math.PI * 2); ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fill();
    // 桶身 (寬 44 = 判定直徑)
    ctx.beginPath();
    ctx.moveTo(x - 18, y - 20);
    ctx.quadraticCurveTo(x - 23, y, x - 18, y + 20);
    ctx.lineTo(x + 18, y + 20);
    ctx.quadraticCurveTo(x + 23, y, x + 18, y - 20);
    ctx.closePath();
    ctx.fillStyle = mode === 'fuse' ? (Math.floor(p * 8) % 2 ? '#ff4a3d' : '#a8552a') : '#a8552a';
    ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = PAL.outline; ctx.stroke();
    ctx.fillStyle = '#3a3a44';
    ctx.fillRect(x - 21, y - 12, 42, 5); ctx.fillRect(x - 21, y + 7, 42, 5);
    // 危險記號: 黑底白火焰
    circle(ctx, x, y - 1, 7); ctx.fillStyle = PAL.outline; ctx.fill();
    ctx.beginPath(); ctx.moveTo(x - 3, y + 3); ctx.quadraticCurveTo(x - 4, y - 2, x, y - 6); ctx.quadraticCurveTo(x + 4, y - 2, x + 3, y + 3); ctx.closePath(); ctx.fillStyle = '#ffb340'; ctx.fill();
    // 引信
    var fuseLen = mode === 'fuse' ? 5 * (1 - p) : 5;
    ctx.strokeStyle = '#e8d2a0'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x + 4, y - 20); ctx.lineTo(x + 4 + fuseLen * 0.5, y - 20 - fuseLen); ctx.stroke();
    if (mode === 'fuse') {
      var sx = x + 4 + fuseLen * 0.5, sy = y - 20 - fuseLen;
      star(ctx, sx, sy, 4 + p * 1.5, 6, 0.4); ctx.fillStyle = '#ffe14d'; ctx.fill();
      // 越接近爆炸, 外圈紅光越飽滿 (框內)
      ctx.lineWidth = 2 + p * 2; ctx.strokeStyle = 'rgba(255,74,61,' + (0.35 + p * 0.6).toFixed(2) + ')';
      circle(ctx, x, y, 23 + p * 3); ctx.stroke();
    }
    ctx.restore();
  }

  function drawFountain(ctx, st) {
    st = S(st);
    var x = num(st.x, 0), y = num(st.y, 0);
    var full = st.full !== false;
    ctx.save();
    ctx.beginPath(); ctx.ellipse(x, y + 4, 27, 20, 0, 0, Math.PI * 2);
    ctx.fillStyle = full ? '#b9b2c8' : '#8a8478'; ctx.fill();
    ctx.lineWidth = 2.5; ctx.strokeStyle = PAL.outline; ctx.stroke();
    ctx.beginPath(); ctx.ellipse(x, y + 4, 20, 14, 0, 0, Math.PI * 2);
    ctx.fillStyle = full ? '#4fd6ff' : '#5a4a38'; ctx.fill();
    if (full) {
      ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(x - 4, y + 2, 8, 3, 0, Math.PI, Math.PI * 2); ctx.stroke();
      // 噴水 + 小愛心
      ctx.strokeStyle = '#bff3ff'; ctx.lineWidth = 3; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x, y + 2); ctx.quadraticCurveTo(x, y - 18, x - 10, y - 12); ctx.moveTo(x, y + 2); ctx.quadraticCurveTo(x, y - 18, x + 10, y - 12); ctx.stroke();
      heartPath(ctx, x, y - 20, 6); ctx.fillStyle = PAL.heart; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = PAL.outline; ctx.stroke();
    } else {
      ctx.strokeStyle = '#2e2418'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(x - 12, y); ctx.lineTo(x - 3, y + 6); ctx.lineTo(x + 4, y + 1); ctx.lineTo(x + 12, y + 8); ctx.moveTo(x - 3, y + 6); ctx.lineTo(x - 5, y + 13); ctx.stroke();
    }
    ctx.restore();
  }

// ===== deepen-5 game-a: 爆炸特效 drawBlast =====
  function drawBlast(ctx, st) {
    st = S(st);
    var x = num(st.x, 0), y = num(st.y, 0), R = Math.max(1, num(st.radius, 130));
    var p = ratio(st.t, num(st.dur, 0.3));
    ctx.save();
    var a = 1 - p;
    circle(ctx, x, y, R); ctx.globalAlpha = 0.5 * a + 0.1; ctx.fillStyle = PAL.danger; ctx.fill();
    circle(ctx, x, y, R * (0.35 + 0.5 * p)); ctx.globalAlpha = 0.8 * a; ctx.fillStyle = '#ffe14d'; ctx.fill();
    ctx.globalAlpha = a; ctx.lineWidth = 4; ctx.strokeStyle = '#ffffff'; circle(ctx, x, y, R - 2); ctx.stroke();
    ctx.lineWidth = 3; ctx.strokeStyle = '#ffe14d';
    for (var i = 0; i < 10; i++) {
      var ang = i * Math.PI / 5 + 0.3;
      ctx.beginPath(); ctx.moveTo(x + Math.cos(ang) * R * (0.4 + 0.3 * p), y + Math.sin(ang) * R * (0.4 + 0.3 * p)); ctx.lineTo(x + Math.cos(ang) * R * (0.6 + 0.35 * p), y + Math.sin(ang) * R * (0.6 + 0.35 * p)); ctx.stroke();
    }
    ctx.restore();
  }

// ===== deepen-5 game-c: drawTile 的草叢分支(kind bush; L,T = 格子左上角, D = 該地下城調色盤) =====
  function drawBushTileRef(ctx, L, T, D) {
    {
      // 草叢: 葉叢鋪滿格, 邊緣葉尖, 讀成「能鑽進去」
      ctx.fillStyle = D.bush2; ctx.fillRect(L, T, 60, 60);
      for (let i = 0; i < 9; i++) {
        const bx = L + 10 + (i % 3) * 20, by = T + 10 + Math.floor(i / 3) * 20;
        ctx.fillStyle = D.bush;
        ctx.beginPath(); ctx.moveTo(bx - 9, by + 8); ctx.lineTo(bx - 5, by - 9); ctx.lineTo(bx, by + 2); ctx.lineTo(bx + 4, by - 10); ctx.lineTo(bx + 9, by + 8); ctx.closePath(); ctx.fill();
      }
      ctx.strokeStyle = 'rgba(200,255,190,0.35)'; ctx.lineWidth = 1.5;
      ctx.strokeRect(L + 1, T + 1, 58, 58);
    }
  }

// ===== deepen-5 game-c: 果樹 drawFruitTree、果子 drawFruit =====
  function drawFruitTree(ctx, state) {
    const s = obj(state);
    const x = n(s.x), y = n(s.y);
    const D = DUNGEONS[pick(s.dungeon, DUNGEONS, 'candy')];
    ctx.save();
    shadow(ctx, x, y + 22, 24, 6, 0.3);
    ctx.fillStyle = '#6a4024'; ctx.fillRect(x - 5, y + 4, 10, 22);
    ctx.lineWidth = 2; ctx.strokeStyle = P.outline; ctx.strokeRect(x - 5, y + 4, 10, 22);
    // 樹冠(比密林亮、圓, 一眼分開「牆」與「能打的樹」)
    ctx.fillStyle = P.tree;
    circle(ctx, x - 12, y - 4, 14); ctx.fill(); circle(ctx, x + 12, y - 4, 14); ctx.fill(); circle(ctx, x, y - 13, 15); ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = P.outline;
    ctx.beginPath(); ctx.arc(x - 12, y - 4, 14, 1.6, 4.3); ctx.stroke();
    ctx.beginPath(); ctx.arc(x + 12, y - 4, 14, -1.2, 1.55); ctx.stroke();
    ctx.beginPath(); ctx.arc(x, y - 13, 15, 3.6, 5.85); ctx.stroke();
    ctx.fillStyle = D.wall2; ctx.globalAlpha = 0.5;
    circle(ctx, x - 16, y - 12, 3); ctx.fill(); circle(ctx, x + 14, y - 2, 3); ctx.fill();
    ctx.globalAlpha = 1;
    if (s.hasFruit === true) {
      // 光圈 + 大果: 「打得落」
      ctx.strokeStyle = 'rgba(255,240,200,0.9)'; ctx.lineWidth = 2; ctx.setLineDash([3, 3]);
      circle(ctx, x, y - 6, 14); ctx.stroke(); ctx.setLineDash([]);
      fruitShape(ctx, x, y - 4, 9);
    } else {
      // 只剩小綠芽
      ctx.fillStyle = '#9ae07a'; circle(ctx, x, y - 6, 3.5); ctx.fill();
      ctx.lineWidth = 1.5; ctx.strokeStyle = '#2f6a2a'; ctx.stroke();
    }
    ctx.restore();
  }

  function drawFruit(ctx, state) {
    const s = obj(state);
    const x = n(s.x), y = n(s.y);
    const eating = s.eating === true;
    const p = eating ? ratio(s.eatT, n(s.eatDur, 3) || 3) : 0;
    ctx.save();
    shadow(ctx, x, y + 11, 11, 3, 0.35);
    const r = 11 * (1 - p * 0.7);
    fruitShape(ctx, x, y + 1, Math.max(2, r));
    if (eating) {
      // 咬痕
      ctx.fillStyle = DUNGEONS[pick(s.dungeon, DUNGEONS, 'candy')].floor;
      circle(ctx, x + r * 0.9, y + 1 - r * 0.2, r * 0.45); ctx.fill();
      circle(ctx, x + r * 0.7, y + 1 + r * 0.45, r * 0.35); ctx.fill();
      // 剩餘量環
      ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(x, y, 14, -Math.PI / 2, -Math.PI / 2 + TAU * (1 - p)); ctx.stroke();
    }
    ctx.restore();
  }

// ===== deepen-5 game-c: fruitShape 輔助 =====
  function fruitShape(ctx, x, y, r) {
    circle(ctx, x, y, r); ctx.fillStyle = P.fruit; ctx.fill();
    ctx.lineWidth = Math.max(1.5, r * 0.18); ctx.strokeStyle = '#5a1040'; ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.55)'; circle(ctx, x - r * 0.35, y - r * 0.35, r * 0.25); ctx.fill();
    ctx.fillStyle = '#5ad06a';
    ctx.beginPath(); ctx.ellipse(x + r * 0.35, y - r * 1.0, r * 0.45, r * 0.22, -0.5, 0, TAU); ctx.fill();
  }
  // P.fruit 原值見 deepen-5 game-c 調色盤; 移植時自訂果子色即可

// ===== deepen-5 game-c: drawTamer 躲草叢(hidden)的畫法 =====
// 整隻 alpha 壓到 0.5 以下, 再在腳邊蓋幾片草葉, 玩家仍看得到自己的位置
