'use strict';
/* 觸控層 + 網站暫停 / 繼續(傳統 script, 載入順序: art.js → sound.js → game.js → touch.js)。
   這個檔打磨版與網站版共用同一份內容。
   - 觸控模式(手機 / ?touch=1): 在畫布上層畫虛擬按鈕, 輸入走 game.js 的 inputDown / inputUp(和鍵盤同一條路徑);
     鍵帽 Z / X / [空白] 改畫成 A / B / 繩索圖案; 直拿時蓋提示並暫停。
   - 電腦與手機都有: 收 pvd:pause / pvd:resume 暫停 / 繼續(含音效)。
   遊戲在 game.js 的 frame() 只掛兩個鉤子: 暫停時跳過 update、每幀 render 後呼叫 PVDX.draw(ctx)。 */
(function () {
  var CWd = typeof CW === 'number' ? CW : 1680, CHt = typeof CH === 'number' ? CH : 720;

  // ───────── 是不是觸控模式 ─────────
  var forced = /[?&]touch=1(&|$)/.test(location.search);
  var coarse = false, hover = false;
  try { coarse = !!(window.matchMedia && matchMedia('(pointer: coarse)').matches); } catch (e) { /* 略過 */ }
  try { hover = !!(window.matchMedia && matchMedia('(hover: hover)').matches); } catch (e) { /* 略過 */ }
  var hasTouch = (navigator.maxTouchPoints > 0) || ('ontouchstart' in window);
  var ON = forced || coarse || (hasTouch && !hover);

  var PVDX = { on: ON, paused: false, draw: function () { } };
  window.PVDX = PVDX;

  // ───────── 佔位圖形(style.md 沒有虛擬按鈕 / 繩索鍵帽圖案 / 暫停畫面, 集中在這裡) ─────────
  var Placeholder = {
    // 按鈕放大: 方向鍵外圈直徑 336(約畫面高度一半), A / B / 繩索以右緣 1680 為基準; 半透明, 會蓋進畫面邊緣一些
    // 圓弧方向鍵: 中心 (x, y), 外圈半徑 Ro、內圈半徑 Ri, 四段之間留 gap 寬的細縫; 可按範圍半徑 R(比外圈大, 手指偏出去也算)
    dpad: { x: 192, y: 538, Ro: 168, Ri: 58, gap: 8, R: 190, dead: 26 },
    a: { x: 1580, y: 604, r: 80, hit: 96 },
    b: { x: 1418, y: 652, r: 62, hit: 76 },
    rope: { x: 1598, y: 428, r: 54, hit: 66 },
    // 哪些按鈕要顯示(同時決定能不能按): 開場日曆 2 秒自動翻頁、表演中玩家不操作 → 整組不畫(避免蓋到「共 4 天」與觀眾席 / 節目單);
    // 暫停式引導只接受 A → 只畫 A(其餘會蓋到引導卡)
    visible: function () {
      var sc = typeof scene !== 'undefined' ? scene : '', guide = (typeof GD !== 'undefined' && !!GD);
      if (sc === 'calendar') return { dpad: false, a: false, b: false, rope: false };
      if (guide) return { dpad: false, a: true, b: false, rope: false };
      if (sc === 'show') return { dpad: false, a: false, b: false, rope: false };
      // 繩索只在地下城有用, 其他畫面不畫
      return { dpad: true, a: true, b: true, rope: sc === 'dungeon' };
    },
    drawBtnBody: function (ctx, lit) {
      ctx.fillStyle = lit ? 'rgba(255,210,74,0.85)' : 'rgba(26,32,48,0.5)';
      ctx.fill();
      ctx.lineWidth = 3; ctx.strokeStyle = lit ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.55)';
      ctx.stroke();
    },
    drawArrow: function (ctx, x, y, rot, s, lit) {
      ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
      ctx.beginPath(); ctx.moveTo(0, -9); ctx.lineTo(8, 1.5); ctx.lineTo(3, 1.5); ctx.lineTo(3, 9); ctx.lineTo(-3, 9); ctx.lineTo(-3, 1.5); ctx.lineTo(-8, 1.5); ctx.closePath();
      ctx.fillStyle = lit ? '#1a2030' : 'rgba(255,255,255,0.88)'; ctx.fill();
      ctx.restore();
    },
    rr: function (ctx, x, y, w, h, r) {
      ctx.beginPath();
      ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.arcTo(x + w, y, x + w, y + r, r);
      ctx.lineTo(x + w, y + h - r); ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
      ctx.lineTo(x + r, y + h); ctx.arcTo(x, y + h, x, y + h - r, r);
      ctx.lineTo(x, y + r); ctx.arcTo(x, y, x + r, y, r); ctx.closePath();
    },
    // 繩索圖案(圓形繩圈 + 一條垂下的繩尾 + 結); 給按鈕與鍵帽共用。color = 線色, s = 圖案大小(繩圈半徑的 2 倍左右)
    drawRopeIcon: function (ctx, x, y, s, color) {
      ctx.save();
      ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.lineWidth = Math.max(1.6, s * 0.16);
      var cx = x - s * 0.22, r = s * 0.36;
      ctx.beginPath(); ctx.arc(cx, y, r, 0, Math.PI * 2); ctx.stroke();            // 繩圈
      ctx.beginPath(); ctx.arc(cx, y, r * 0.5, 0.4, Math.PI * 1.6); ctx.stroke();   // 內圈(盤起來的感覺)
      ctx.beginPath(); ctx.moveTo(cx + r, y); ctx.quadraticCurveTo(x + s * 0.62, y - s * 0.28, x + s * 0.72, y + s * 0.12); ctx.stroke();   // 繩尾
      ctx.beginPath(); ctx.arc(x + s * 0.72, y + s * 0.12, Math.max(1.4, s * 0.09), 0, Math.PI * 2); ctx.fill();   // 繩結
      ctx.restore();
    },
    drawButtons: function (ctx, held) {
      var d = this.dpad, k, h = d.size / 2, vis = this.visible(), i;
      ctx.save();
      if (vis.dpad) {
        // 圓弧方向鍵: 一圈切成上右下左四段, 段與段之間留固定寬度的細縫
        var dirs = [['up', -Math.PI / 2], ['right', 0], ['down', Math.PI / 2], ['left', Math.PI]], q = Math.PI / 4;
        for (i = 0; i < dirs.length; i++) {
          k = dirs[i]; var c = k[1], lit = !!held[k[0]], go = d.gap / 2 / d.Ro, gi = d.gap / 2 / d.Ri;
          ctx.beginPath(); ctx.arc(d.x, d.y, d.Ro, c - q + go, c + q - go); ctx.arc(d.x, d.y, d.Ri, c + q - gi, c - q + gi, true); ctx.closePath();
          this.drawBtnBody(ctx, lit);
          var mr = (d.Ro + d.Ri) / 2 + 4;
          this.drawArrow(ctx, d.x + Math.cos(c) * mr, d.y + Math.sin(c) * mr, c + Math.PI / 2, 2.4, lit);
        }
        ctx.beginPath(); ctx.arc(d.x, d.y, d.Ri - d.gap, 0, Math.PI * 2); ctx.fillStyle = 'rgba(26,32,48,0.3)'; ctx.fill();
      }
      // A / B
      var big = [['z', this.a, 'A', 64, vis.a], ['x', this.b, 'B', 50, vis.b]];
      for (i = 0; i < big.length; i++) {
        if (!big[i][4]) continue;
        var b = big[i][1], lit2 = !!held[big[i][0]];
        ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); this.drawBtnBody(ctx, lit2);
        ctx.font = 'bold ' + big[i][3] + 'px "Microsoft JhengHei","PingFang TC","Noto Sans TC",sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillStyle = lit2 ? '#1a2030' : 'rgba(255,255,255,0.9)';
        ctx.fillText(big[i][2], b.x, b.y + 2);
      }
      // 繩索
      if (vis.rope) {
        var r = this.rope, lit3 = !!held.space;
        ctx.beginPath(); ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2); this.drawBtnBody(ctx, lit3);
        this.drawRopeIcon(ctx, r.x, r.y, r.r * 1.15, lit3 ? '#1a2030' : 'rgba(255,255,255,0.9)');
      }
      ctx.restore();
    },
  };
  PVDX.Placeholder = Placeholder;

  // ───────── 暫停(網站訊息 + 直拿) ─────────
  var sitePause = false, needTap = false, portrait = false, audioHeld = false, ov = null, ovKey = '';
  function ensureOverlay() {
    if (ov) return;
    ov = document.createElement('div');
    ov.style.cssText = 'position:fixed;left:0;top:0;right:0;bottom:0;display:none;align-items:center;justify-content:center;flex-direction:column;' +
      'background:rgba(8,10,16,0.9);color:#fff;z-index:99;text-align:center;font-family:"Microsoft JhengHei","PingFang TC","Noto Sans TC",sans-serif;' +
      'user-select:none;-webkit-user-select:none;padding:20px;box-sizing:border-box;';
    document.body.appendChild(ov);
  }
  function showOverlay(big, small) {
    ensureOverlay();
    var key = big + '|' + small;
    if (key !== ovKey) {
      ovKey = key;
      ov.innerHTML = '';
      var a = document.createElement('div'); a.style.cssText = 'font-size:26px;font-weight:bold;line-height:1.5;'; a.textContent = big;
      ov.appendChild(a);
      if (small) { var b = document.createElement('div'); b.style.cssText = 'font-size:16px;color:#9aa6bd;margin-top:8px;'; b.textContent = small; ov.appendChild(b); }
    }
    ov.style.display = 'flex';
  }
  function hideOverlay() { if (ov) { ov.style.display = 'none'; ovKey = ''; } }

  function setAudioHold(b) {
    if (b === audioHeld) return;
    audioHeld = b;
    try {
      if (typeof Sound === 'undefined' || !Sound.setMuted) return;
      // 暫停 = 整個聲音層靜音(不動遊戲自己的靜音設定); 繼續時還原成遊戲目前的靜音狀態
      Sound.setMuted(b ? true : !!Snd.muted);
    } catch (e) { console.error(e); }
  }
  function applyPause() {
    var p = sitePause || needTap || portrait;
    if (p && !PVDX.paused) {
      releaseAll();               // 暫停那一刻放開所有按住的鍵(含鍵盤)
      if (typeof inputReset === 'function') inputReset();
    }
    PVDX.paused = p;
    setAudioHold(p);
    if (!p) hideOverlay();
    else if (portrait) showOverlay('請把手機轉成橫向', '轉成橫向後遊戲會繼續');
    else if (needTap) showOverlay('點擊或按任意鍵繼續', '');
    else showOverlay('遊戲暫停中', '');
  }

  window.addEventListener('message', function (e) {
    if (e.origin !== location.origin) return;
    var d = e.data;
    if (!d || typeof d !== 'object') return;
    if (d.type === 'pvd:pause') { sitePause = true; needTap = false; applyPause(); }
    else if (d.type === 'pvd:resume') { if (sitePause) { sitePause = false; needTap = true; applyPause(); } }
  });
  // 等「點擊或按任意鍵繼續」: 這一下只拿來解除暫停, 不傳給遊戲
  function tapResume(e) {
    if (!needTap || sitePause) return false;
    needTap = false; applyPause();
    try { if (typeof Snd !== 'undefined') Snd.init(); if (typeof Sound !== 'undefined' && Sound.init) Sound.init(); } catch (err) { /* 略過 */ }
    return true;
  }
  window.addEventListener('keydown', function (e) {
    if (!PVDX.paused) return;
    e.preventDefault(); e.stopImmediatePropagation();
    tapResume(e);
  }, true);
  window.addEventListener('keyup', function (e) { if (PVDX.paused) e.stopImmediatePropagation(); }, true);
  window.addEventListener('mousedown', function (e) { if (needTap) tapResume(e); }, true);

  // ───────── 觸控模式 ─────────
  var held = {}, cur = {}, touches = {};   // held: 目前要按住的鍵; cur: 已經送進遊戲的; touches: id → {x, y}(邏輯座標)
  function releaseAll() {
    var k;
    for (k in cur) { if (cur[k] && typeof inputUp === 'function') inputUp(k); }
    cur = {}; held = {}; touches = {};
  }
  PVDX.held = held;

  if (!ON) return;

  // 觸控模式的頁面設定: 固定視窗、不捲動 / 縮放 / 選取
  (function () {
    var meta = document.querySelector('meta[name=viewport]');
    if (!meta) { meta = document.createElement('meta'); meta.name = 'viewport'; document.head.appendChild(meta); }
    meta.setAttribute('content', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover');
    var st = document.createElement('style');
    st.textContent = 'html,body{position:fixed;left:0;top:0;width:100%;height:100%;touch-action:none;overscroll-behavior:none;' +
      '-webkit-user-select:none;user-select:none;-webkit-touch-callout:none;-webkit-tap-highlight-color:transparent;}' +
      'canvas{touch-action:none;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none;}';
    document.head.appendChild(st);
    document.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    document.addEventListener('selectstart', function (e) { e.preventDefault(); });
  })();

  var cv = document.getElementById('c');
  function toLogical(t) {
    var r = cv.getBoundingClientRect();
    return { x: (t.clientX - r.left) * CWd / (r.width || 1), y: (t.clientY - r.top) * CHt / (r.height || 1) };
  }
  // 一根手指對應到哪些鍵(方向鍵 4 向; 地下城裡斜角區域同時按兩個方向, 方便走斜線)
  function keysAt(p, out) {
    var vis = Placeholder.visible(), d = Placeholder.dpad, dx = p.x - d.x, dy = p.y - d.y, dd = Math.hypot(dx, dy);
    if (vis.dpad && dd <= d.R && dd >= d.dead) {
      var ax = Math.abs(dx), ay = Math.abs(dy), diag = (typeof scene !== 'undefined' && scene === 'dungeon');
      var ratio = ax > 0 ? ay / ax : 99;
      if (diag && ratio > 0.58 && ratio < 1.73) { out[dx < 0 ? 'left' : 'right'] = true; out[dy < 0 ? 'up' : 'down'] = true; }
      else if (ax >= ay) out[dx < 0 ? 'left' : 'right'] = true;
      else out[dy < 0 ? 'up' : 'down'] = true;
      return;
    }
    var btns = [['z', Placeholder.a, vis.a], ['x', Placeholder.b, vis.b], ['space', Placeholder.rope, vis.rope]], best = null, bd = 1e9;
    for (var i = 0; i < btns.length; i++) {
      if (!btns[i][2]) continue;
      var b = btns[i][1], dist2 = Math.hypot(p.x - b.x, p.y - b.y);
      if (dist2 <= b.hit && dist2 < bd) { bd = dist2; best = btns[i][0]; }
    }
    if (best) out[best] = true;
  }
  function recompute() {
    var want = {}, id;
    if (!PVDX.paused) for (id in touches) keysAt(touches[id], want);
    var all = ['up', 'down', 'left', 'right', 'z', 'x', 'space'], i, k;
    for (i = 0; i < all.length; i++) {
      k = all[i];
      if (want[k] && !cur[k]) { cur[k] = true; inputDown(k); }
      else if (!want[k] && cur[k]) { cur[k] = false; inputUp(k); }
    }
    held = want; PVDX.held = held;
  }
  function onTouch(e) {
    e.preventDefault();
    var list = e.changedTouches, i, t;
    if (e.type === 'touchstart') {
      if (!PVDX.paused) { try { Snd.init(); } catch (err) { /* 略過 */ } }
    }
    for (i = 0; i < list.length; i++) {
      t = list[i];
      if (e.type === 'touchend' || e.type === 'touchcancel') delete touches[t.identifier];
      else touches[t.identifier] = toLogical(t);
    }
    if (e.type === 'touchend') {
      // iOS 要在 touchend 才能解鎖聲音
      try { if (typeof Sound !== 'undefined' && Sound.init && Snd.ready) Sound.init(); } catch (err) { /* 略過 */ }
      if (needTap) tapResume(e);
    }
    recompute();
  }
  var opt = { passive: false };
  window.addEventListener('touchstart', onTouch, opt);
  window.addEventListener('touchmove', onTouch, opt);
  window.addEventListener('touchend', onTouch, opt);
  window.addEventListener('touchcancel', onTouch, opt);
  window.addEventListener('blur', function () { releaseAll(); });

  // ───────── 直拿提示 ─────────
  function checkOrient() {
    var p = window.innerHeight > window.innerWidth;
    if (p !== portrait) { portrait = p; applyPause(); }
  }
  window.addEventListener('resize', checkOrient);
  window.addEventListener('orientationchange', function () { setTimeout(checkOrient, 100); });
  checkOrient();

  // ───────── 鍵帽換成手機版: Z → A、X → B、空白 → 繩索圖案(art.js 的鍵帽只用 fillText 畫字, 在這裡攔) ─────────
  var proto = window.CanvasRenderingContext2D && CanvasRenderingContext2D.prototype;
  if (proto && proto.fillText) {
    var origFill = proto.fillText;
    proto.fillText = function (str, x, y, mw) {
      if (str === 'Z') str = 'A';
      else if (str === 'X') str = 'B';
      else if (str === '空白') {
        var m = /([0-9.]+)px/.exec(this.font), size = m ? parseFloat(m[1]) : 16;
        Placeholder.drawRopeIcon(this, x, y, size * 1.5, this.fillStyle);
        return;
      }
      return mw === undefined ? origFill.call(this, str, x, y) : origFill.call(this, str, x, y, mw);
    };
  }

  // ───────── 每幀畫在遊戲畫面上層 ─────────
  PVDX.draw = function (ctx) {
    checkOrient();
    for (var id in touches) { recompute(); break; }   // 場景換了(按鈕顯示變了)而手指還按著: 重新判定
    ctx.save();
    Placeholder.drawButtons(ctx, held);
    ctx.restore();
  };
})();
