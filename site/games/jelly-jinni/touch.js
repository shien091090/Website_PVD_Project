'use strict';
/* 觸控層 + 網站訊息(PVD計畫網站)。發布階段由 RD 從 game-studio-lab 的 references/touch-template.js 複製, 新加時只改下面的 CONFIG;
   已有舊版觸控層要更新版面時, 照發布任務(prompts/release-game.md)的說明換掉版面段落。
   傳統 script, 在 game.js 之後載入。網站版與打磨版共用同一份。
   - 觸控模式(手機 / 網址帶 ?touch=1):
     鍵盤遊戲 → 畫面上層畫虛擬按鈕, 輸入走遊戲的 inputDown / inputUp(和鍵盤同一條路徑), 鍵帽字換成手機版;
     滑鼠遊戲 → 不畫按鈕, 點擊就等於觸控(需要時把觸控轉成滑鼠事件), 遊戲區拖曳不捲動頁面;
     直拿手機時蓋提示並暫停。手機不放任何聲音按鈕, 交給手機本身的靜音與音量
   - 電腦與手機都有: 收 pvd:pause / pvd:resume 暫停 / 繼續(含音效)、Esc 暫停(CONFIG.escPause)、PVDX.finish() 通知網站玩完一局
   遊戲要掛的鉤子(設計見 game-studio-lab docs/2026-10-31-release-mobile-design.md):
     每幀 `if (!(window.PVDX && PVDX.paused)) update(dt);`, 畫完 `if (window.PVDX) PVDX.draw(ctx);`;
     一局結束 `if (window.PVDX) PVDX.finish();`;
     鍵盤遊戲另有全域 inputDown(k) / inputUp(k) / inputReset(), inputDown 開頭 `if (window.PVDX && PVDX.paused) return;` */
(function () {
  // ───────── 每款遊戲要改的設定 ─────────
  // 本作版面(使用者定): 左下只有 ◀ ▶ 兩鍵; 右下最右是「共用格」(遊玩中跳躍 / 瞄準中取消 / 選單畫面確認), 上方是勾爪(瞄準中變「發射」);
  // 右上選單鍵; 暫停選單打開時不顯示任何虛擬鍵(遊戲自己收點擊「繼續 / 重來」)。圖示下方加小字
  var CONFIG = {
    mode: 'keys',
    mouseEvents: false,
    // 遊戲自己有 Esc 暫停選單
    escPause: false,
    // 遊戲裡畫的鍵帽字 → 觸控模式改畫同一套圖示(教學泡泡、幽靈旁提示、開始提示和按鈕長得一樣)
    keycaps: { '↑': 'jump', 'Z': 'hook', 'X': 'cancel', '空白': 'ok', 'Esc': 'menu' },
    // 每幀呼叫: 各按鈕顯示與否, slot 是共用格此刻送的鍵(null = 不顯示)
    visible: function () {
      var g = window.jjState ? window.jjState() : null, none = { lr: false, hook: false, slot: null, menu: false };
      if (!g) return none;
      if (g.screen === 'play') {
        if (g.paused) return none;                                                     // 暫停選單: 直接點選項
        if (g.phase === 'play') {
          if (g.aiming) return { lr: false, hook: 'fire', slot: 'x', menu: true };    // 瞄準中: 發射 / 取消
          return { lr: true, hook: g.level >= 2 ? (g.hookable ? 'on' : 'dim') : false, slot: 'up', menu: true };
        }
        if (g.phase === 'dying') return { lr: true, hook: false, slot: null, menu: false }; // 死亡演出 0.6 秒: 只留左右
        return { lr: false, hook: false, slot: 'space', menu: false };                // 過關 / 失敗: 確認
      }
      return { lr: false, hook: false, slot: 'space', menu: false };                  // 開始、全破: 確認
    },
    // 暫停時整個聲音靜音, 繼續時還原成遊戲自己的靜音設定
    setAudioPaused: function (paused) {
      if (!window.Sound || !Sound.setMuted) return;
      var gm = window.jjState ? !!window.jjState().muted : false;
      Sound.setMuted(paused ? true : gm);
    },
    initAudio: function () { if (window.Sound && Sound.init) Sound.init(); },
  };
  var SLOT_ICON = { up: ['jump', '跳躍'], x: ['cancel', '取消'], space: ['ok', '確認'] };

  // ───────── 圖示(中心 x, y; s = 圖示大小, 約為按鈕直徑的一半) ─────────
  var FONT = '"Microsoft JhengHei","PingFang TC","Noto Sans TC",sans-serif';
  function drawIcon(ctx, name, x, y, s, color) {
    var k = s / 52;   // 圖示原稿 ±26
    ctx.save(); ctx.translate(x, y); ctx.scale(k, k);
    ctx.fillStyle = color; ctx.strokeStyle = color; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    function poly(pts) { ctx.beginPath(); ctx.moveTo(pts[0], pts[1]); for (var i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]); ctx.closePath(); ctx.fill(); }
    function ln(w, a) { ctx.lineWidth = w; ctx.beginPath(); a(); ctx.stroke(); }
    if (name === 'left') poly([14, -22, -18, 0, 14, 22]);
    else if (name === 'right') poly([-14, -22, 18, 0, -14, 22]);
    else if (name === 'jump') {
      ln(9, function () { ctx.moveTo(-20, 4); ctx.lineTo(0, -20); ctx.lineTo(20, 4); });
      ln(7, function () { ctx.moveTo(-24, 22); ctx.quadraticCurveTo(0, 10, 24, 22); });
    } else if (name === 'hook') {
      ln(5, function () { ctx.arc(0, -22, 6, 0, Math.PI * 2); });
      ln(7, function () { ctx.moveTo(0, -16); ctx.lineTo(0, 14); });
      ln(7, function () { ctx.moveTo(0, 14); ctx.quadraticCurveTo(-20, 16, -20, -4); ctx.moveTo(0, 14); ctx.quadraticCurveTo(20, 16, 20, -4); });
      ln(6, function () { ctx.moveTo(-20, -4); ctx.lineTo(-26, 2); ctx.moveTo(20, -4); ctx.lineTo(26, 2); });
    } else if (name === 'cancel') ln(9, function () { ctx.moveTo(-17, -17); ctx.lineTo(17, 17); ctx.moveTo(17, -17); ctx.lineTo(-17, 17); });
    else if (name === 'ok') { ctx.lineWidth = 4; poly([-13, -20, 19, 0, -13, 20]); ctx.stroke(); }
    else if (name === 'menu') ln(5, function () { ctx.moveTo(-16, -10); ctx.lineTo(16, -10); ctx.moveTo(-16, 0); ctx.lineTo(16, 0); ctx.moveTo(-16, 10); ctx.lineTo(16, 10); });
    ctx.restore();
  }

  // ───────── 版面: 觸控模式遊戲畫滿整張畫布(1280~1680 寬), 按鈕疊在畫面上, 靠左右下角 ─────────
  var CW = (window.Art && Art.canvas && Art.canvas.width) || 1280, CH = (window.Art && Art.canvas && Art.canvas.height) || 720;
  var OX = (CW - 1280) / 2;
  var LAYOUT = {
    left: { x: 110, y: CH - 112, r: 68 },
    right: { x: 270, y: CH - 112, r: 68 },
    // 共用格(最右下, 最大顆)與上方勾爪
    slot: { x: CW - 120, y: CH - 112, r: 82, hit: 100 },
    hook: { x: CW - 120, y: CH - 112 - 196, r: 66, hit: 84 },
    // 選單鍵: 設計區右上角(設計座標 (1240, 92)); game.js 的 TOUCH_MENU 照這個位置避讓
    menu: { x: OX + 1240, y: 92, r: 30, hit: 44 },
  };
  // 左右兩鍵的可按範圍: 左下一整塊, 以兩鍵中線分左右(手指在兩鍵間滑動會直接換方向)
  var LR_BOX = { x0: 0, x1: LAYOUT.right.x + LAYOUT.right.r + 40, y0: LAYOUT.left.y - LAYOUT.left.r - 40, mid: (LAYOUT.left.x + LAYOUT.right.x) / 2 };

  // ───────── 是不是觸控模式 ─────────
  var forced = /[?&]touch=1(&|$)/.test(location.search);
  var coarse = false, hover = false;
  try { coarse = !!(window.matchMedia && matchMedia('(pointer: coarse)').matches); } catch (e) { /* 略過 */ }
  try { hover = !!(window.matchMedia && matchMedia('(hover: hover)').matches); } catch (e) { /* 略過 */ }
  var hasTouch = (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0) || ('ontouchstart' in window);
  var ON = CONFIG.mode !== 'none' && (forced || coarse || (hasTouch && !hover));
  var KEYS = CONFIG.mode === 'keys';

  var PVDX = { on: ON, paused: false, held: {}, draw: function () { }, finish: function () { } };
  window.PVDX = PVDX;
  function call(fn, arg) { try { fn(arg); } catch (e) { console.error(e); } }

  // ───────── 虛擬按鈕的畫法 ─────────
  var Pad = {
    body: function (ctx, lit) {
      ctx.fillStyle = lit ? 'rgba(255,210,74,0.88)' : 'rgba(26,32,48,0.55)'; ctx.fill();
      ctx.lineWidth = 3; ctx.strokeStyle = lit ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.6)'; ctx.stroke();
    },
    button: function (ctx, b, icon, label, lit, dim, ring) {
      ctx.save();
      if (dim) ctx.globalAlpha = 0.4;
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); this.body(ctx, lit);
      if (ring) {
        var t = (Date.now() % 900) / 900;
        ctx.beginPath(); ctx.arc(b.x, b.y, b.r + 9, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (0.25 + 0.75 * t));
        ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.strokeStyle = '#ffd24a'; ctx.stroke();
      }
      var fg = lit ? '#1a2030' : 'rgba(255,255,255,0.92)';
      drawIcon(ctx, icon, b.x, b.y - (label ? b.r * 0.16 : 0), b.r * (label ? 0.85 : 1), fg);
      if (label) {
        ctx.font = 'bold ' + Math.round(b.r * 0.3) + 'px ' + FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = fg;
        origFill.call(ctx, label, b.x, b.y + b.r * 0.5);
      }
      ctx.restore();
    },
    draw: function (ctx, held, vis) {
      var L = LAYOUT;
      if (vis.lr) { this.button(ctx, L.left, 'left', null, !!held.left); this.button(ctx, L.right, 'right', null, !!held.right); }
      if (vis.hook) this.button(ctx, L.hook, 'hook', vis.hook === 'fire' ? '發射' : '勾爪', vis.hook === 'fire' || !!held.z, vis.hook === 'dim' && !held.z, vis.hook === 'fire');
      if (vis.slot) { var si = SLOT_ICON[vis.slot]; this.button(ctx, L.slot, si[0], si[1], !!held[vis.slot]); }
      if (vis.menu) this.button(ctx, L.menu, 'menu', null, !!held.esc);
    },
  };
  var proto = window.CanvasRenderingContext2D && CanvasRenderingContext2D.prototype;
  var origFill = proto && proto.fillText;

  // ───────── 暫停(網站訊息、直拿、Esc) ─────────
  var sitePause = false, needTap = false, portrait = false, keyPause = false, audioHeld = false, ov = null, ovKey = '';
  function showOverlay(big, small) {
    if (!ov) {
      ov = document.createElement('div');
      ov.style.cssText = 'position:fixed;left:0;top:0;right:0;bottom:0;display:none;align-items:center;justify-content:center;flex-direction:column;' +
        'background:rgba(8,10,16,0.9);color:#fff;z-index:99;text-align:center;font-family:"Microsoft JhengHei","PingFang TC","Noto Sans TC",sans-serif;' +
        'user-select:none;-webkit-user-select:none;padding:20px;box-sizing:border-box;';
      document.body.appendChild(ov);
    }
    var key = big + '|' + small;
    if (key !== ovKey) {
      ovKey = key; ov.innerHTML = '';
      var a = document.createElement('div'); a.style.cssText = 'font-size:26px;font-weight:bold;line-height:1.5;'; a.textContent = big; ov.appendChild(a);
      if (small) { var b = document.createElement('div'); b.style.cssText = 'font-size:16px;color:#9aa6bd;margin-top:8px;'; b.textContent = small; ov.appendChild(b); }
    }
    ov.style.display = 'flex';
  }
  function hideOverlay() { if (ov) { ov.style.display = 'none'; ovKey = ''; } }
  function applyPause() {
    var p = sitePause || needTap || portrait || keyPause;
    if (p && !PVDX.paused) {
      releaseAll();   // 暫停那一刻放開所有按住的鍵(含鍵盤)
      if (KEYS && typeof inputReset === 'function') call(inputReset);
    }
    PVDX.paused = p;
    if (p !== audioHeld) { audioHeld = p; call(CONFIG.setAudioPaused, p); }
    if (!p) hideOverlay();
    else if (portrait) showOverlay('請把手機轉成橫向', '轉成橫向後遊戲會繼續');
    else if (needTap) showOverlay(ON ? '點一下繼續' : '點擊或按任意鍵繼續', '');
    else if (keyPause) showOverlay('遊戲暫停中', '按 Esc 繼續');
    else showOverlay('遊戲暫停中', '');
  }
  window.addEventListener('message', function (e) {
    if (e.origin !== location.origin) return;
    var d = e.data;
    if (!d || typeof d !== 'object') return;
    if (d.type === 'pvd:pause') { sitePause = true; needTap = false; applyPause(); }
    else if (d.type === 'pvd:resume') { if (sitePause) { sitePause = false; needTap = true; applyPause(); } }
  });
  // 等「點一下繼續」: 這一下只拿來解除暫停, 不傳給遊戲
  function tapResume() {
    if (!needTap || sitePause) return false;
    needTap = false; applyPause();
    call(CONFIG.initAudio);
    return true;
  }
  window.addEventListener('keydown', function (e) {
    var esc = CONFIG.escPause && (e.key === 'Escape' || e.key === 'Esc' || e.code === 'Escape');
    if (esc) {
      e.preventDefault(); e.stopImmediatePropagation();
      if (e.repeat || sitePause || portrait) return;
      if (!tapResume()) { keyPause = !keyPause; applyPause(); }
      return;
    }
    if (!PVDX.paused) return;
    e.preventDefault(); e.stopImmediatePropagation();
    tapResume();
  }, true);
  window.addEventListener('keyup', function (e) { if (PVDX.paused) e.stopImmediatePropagation(); }, true);
  // 暫停中滑鼠 / 觸控事件不進遊戲(捕獲階段在遊戲自己的監聽之前); 等點一下繼續時, 按下那一下用來解除暫停
  ['mousedown', 'mouseup', 'mousemove', 'click', 'pointerdown', 'pointerup', 'pointermove', 'wheel'].forEach(function (t) {
    window.addEventListener(t, function (e) {
      if (!PVDX.paused) return;
      e.stopImmediatePropagation();
      if (t === 'mousedown' || t === 'pointerdown') tapResume();
    }, true);
  });

  // 玩完一局: 通知上層網站(不在 iframe 裡就不送)
  PVDX.finish = function () {
    try { if (window.parent && window.parent !== window) window.parent.postMessage({ type: 'pvd:finish' }, location.origin); } catch (e) { /* 本機 file:// 開啟時略過 */ }
  };

  // ───────── 觸控模式 ─────────
  var held = {}, cur = {}, touches = {};   // held: 目前要按住的鍵; cur: 已經送進遊戲的; touches: id → {x, y}(邏輯座標)
  function releaseAll() {
    var k;
    if (KEYS) for (k in cur) { if (cur[k] && typeof inputUp === 'function') call(inputUp, k); }
    cur = {}; held = {}; touches = {}; PVDX.held = held; mouseId = null;
  }

  if (!ON) return;

  // 頁面設定: 固定視窗、不捲動 / 縮放 / 選取
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

  var cv = document.querySelector('canvas');
  function toLogical(t) {
    var r = cv.getBoundingClientRect();
    return { x: (t.clientX - r.left) * CW / (r.width || 1), y: (t.clientY - r.top) * CH / (r.height || 1) };
  }
  // 一根手指對應到哪些鍵
  // 左右: 依手指目前位置判定(可以滑著換方向); 其他按鈕: 按下那一刻綁定按鈕與當時的鍵, 放開前只認它
  // (共用格換了用途時, 按住的手指不會接著觸發新的鍵, 例: 按住跳躍時進入瞄準, 不會變成「取消」)
  function keysAt(p, out, vis) {
    if (!p.btn) {
      if (vis.lr && p.x <= LR_BOX.x1 && p.y >= LR_BOX.y0 && p.x >= LR_BOX.x0) { out[p.x < LR_BOX.mid ? 'left' : 'right'] = true; return; }
      var cand = [['hook', vis.hook ? 'z' : null], ['slot', vis.slot], ['menu', vis.menu ? 'esc' : null]], bd = 1e9;
      cand.forEach(function (c) {
        if (!c[1]) return;
        var b = LAYOUT[c[0]], d = Math.hypot(p.x - b.x, p.y - b.y);
        if (d <= b.hit && d < bd) { bd = d; p.btn = c[0]; p.key = c[1]; }
      });
      if (!p.btn) return;   // 按在空白處: 先不綁定(手指之後滑進左右區仍可走)
    }
    var now = p.btn === 'hook' ? (vis.hook ? 'z' : null) : p.btn === 'slot' ? vis.slot : (vis.menu ? 'esc' : null);
    var bb = LAYOUT[p.btn];
    if (now === p.key && Math.hypot(p.x - bb.x, p.y - bb.y) <= bb.hit + 30) out[p.key] = true;
  }
  function recompute() {
    var want = {}, id, k, vis = CONFIG.visible();
    if (!PVDX.paused) for (id in touches) keysAt(touches[id], want, vis);
    for (k in want) if (!cur[k]) { cur[k] = true; call(inputDown, k); }
    for (k in cur) if (cur[k] && !want[k]) { cur[k] = false; call(inputUp, k); }
    held = want; PVDX.held = held;
  }
  // 滑鼠遊戲: 第一根手指當成滑鼠
  var mouseId = null;
  function fireMouse(type, t) {
    if (!CONFIG.mouseEvents) return;
    var ev = new MouseEvent(type, { bubbles: true, cancelable: true, view: window, clientX: t.clientX, clientY: t.clientY, screenX: t.screenX, screenY: t.screenY, button: 0, buttons: type === 'mouseup' || type === 'click' ? 0 : 1 });
    (document.elementFromPoint(t.clientX, t.clientY) || cv).dispatchEvent(ev);
  }
  function onTouch(e) {
    e.preventDefault();
    var list = e.changedTouches, i, t, end = e.type === 'touchend' || e.type === 'touchcancel';
    if (e.type === 'touchstart' && !PVDX.paused) call(CONFIG.initAudio);
    if (e.type === 'touchend') { call(CONFIG.initAudio); if (needTap) { tapResume(); return; } }
    if (PVDX.paused) return;
    for (i = 0; i < list.length; i++) {
      t = list[i];
      if (KEYS) { if (end) delete touches[t.identifier]; else { var o = touches[t.identifier], q = toLogical(t); if (o) { o.x = q.x; o.y = q.y; } else touches[t.identifier] = q; } continue; }
      if (e.type === 'touchstart' && mouseId === null) { mouseId = t.identifier; fireMouse('mousemove', t); fireMouse('mousedown', t); }
      else if (t.identifier === mouseId) {
        if (e.type === 'touchmove') fireMouse('mousemove', t);
        else if (end) { mouseId = null; fireMouse('mouseup', t); if (e.type === 'touchend') fireMouse('click', t); }
      }
    }
    if (KEYS) recompute();
  }
  var opt = { passive: false };
  ['touchstart', 'touchmove', 'touchend', 'touchcancel'].forEach(function (t) { window.addEventListener(t, onTouch, opt); });
  window.addEventListener('blur', function () { releaseAll(); mouseId = null; });

  // 直拿提示
  function checkOrient() {
    var p = window.innerHeight > window.innerWidth;
    if (p !== portrait) { portrait = p; applyPause(); }
  }
  window.addEventListener('resize', checkOrient);
  window.addEventListener('orientationchange', function () { setTimeout(checkOrient, 100); });
  checkOrient();

  // 鍵帽換成手機版: 遊戲裡用 fillText 畫的鍵帽字照 CONFIG.keycaps 改畫成按鈕上的同一套圖示
  if (KEYS && proto && origFill) {
    proto.fillText = function (str, x, y, mw) {
      var to = Object.prototype.hasOwnProperty.call(CONFIG.keycaps, str) ? CONFIG.keycaps[str] : null;
      if (to) {
        var m = /([0-9.]+)px/.exec(this.font), size = m ? parseFloat(m[1]) : 16, ctx = this, dy = 0;
        if (this.textBaseline === 'alphabetic') dy = -size * 0.36;
        call(function () { drawIcon(ctx, to, x, y + dy, size * 1.15, ctx.fillStyle); });
        return;
      }
      return mw === undefined ? origFill.call(this, str, x, y) : origFill.call(this, str, x, y, mw);
    };
  }

  // 每幀畫在遊戲畫面上層
  PVDX.draw = function (ctx) {
    checkOrient();
    // 本作觸控模式遊戲畫滿整張畫布(跟隨鏡頭), 兩側不塗黑
    if (!KEYS) return;
    for (var id in touches) { recompute(); break; }   // 場景換了(按鈕顯示變了)而手指還按著: 重新判定
    Pad.draw(ctx, held, CONFIG.visible());
  };
})();
