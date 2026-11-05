/* 接力吉尼(Jelly Jinni) 打磨版第 10 輪 — 16:9 橫式 1280×720, 五關; 邏輯 + 嵌入式新手教學 + 暫停選單 + 呼叫 Art / Sound; 觸控模式放大 1.4 倍跟隨鏡頭 */
(function () {
  'use strict';

  // ===== 常數 =====
  var DT = 1 / 60;
  var G = 1200, JUMP_V = 450, WALK = 200;
  var PW = 20, PH = 28;
  var SPAWN = { x: 30, y: 428 };
  var HOOK_RANGE = 110, HOOK_AIR = 850, HOOK_GND = 400, CHARGE_T = 1;
  var LAUNCH_T = 0.3, ROPE_T = 0.15, LIFT_SPD = 100, SEESAW_V = 950, SEESAW_T = 0.3;
  var DEATH_T = 0.6, REC_MAX = 3600, ROUTE_N = 300;
  var LEVEL_COUNT = 5, MAX_GEN = 3, HOOK_MAX = 2;
  var CEILING = 32, TIME_WARN_F = 600, TICK_S = 5;
  var GROUND_Y = 456, GROUND_H = 24;
  var LIFT_TOP = 241, LIFT_W = 60, GATE_W = 12, GATE_H = 114, BTN_W = 40, BTN_H = 6, GOAL_W = 24, GOAL_H = 40, PLT_H = 12, SPIKE_H = 12;
  var SS_W = 100, SS_LAND_W = 40, SS_LAUNCH_X = 60;
  var CW = (window.Art && Art.canvas && Art.canvas.width) || 1280;
  var CH = (window.Art && Art.canvas && Art.canvas.height) || 720;
  // 設計區 1280 × 720 置中: 畫面寬(CW)大於 1280 只發生在觸控裝置, 兩側由 touch.js 塗黑
  var OX = (CW - 1280) / 2;
  // 世界 853⅓ × 480, 放大 1.5 倍; 畫面座標 = 世界座標 × ZOOM
  var ZOOM = 1.5, WW = 1280 / 1.5, WH = 480;
  var SND_ICON_PLAY = { x: 1228, y: 56 }, SND_ICON_MENU = { x: 1228, y: 12 };

  var BANNER_T = 1.5, TUT_FX_T = 0.8, TUT_GAP = 0.4, TUT_POP_T = 0.25;
  // (本輪沒有需要的佔位圖形)

  // ===== 觸控模式(window.PVDX && PVDX.on): 放大 1.4 倍、跟隨鏡頭 =====
  var TK = 1.4, ZT = 2.1, WORLD_W = 853.3333, HUD_T = 67.2;
  var CAM_FX = 0.15, CAM_FY = 0.08, CAM_TY = 205.71;
  // 右上選單鍵(touch.js LAYOUT.menu: 圓心 (CW - 40, 92)、點擊半徑 44)的避讓框 = 圓心 ± 50; touch.js 若搬動選單鍵, 要同步這個常數
  var TOUCH_MENU = { x: CW - 90, y: 42, w: 100, h: 100 };
  var PAUSE_HIT = { resume: [530, 304, 220, 56], restart: [530, 368, 220, 56] };
  function isTouch() { return !!(window.PVDX && window.PVDX.on); }

  // ===== 關卡資料 =====
  function P_(x, y, w, solid) { return { x: x, y: y, w: w, h: PLT_H, solid: !!solid }; }
  var LEVELS = [
    null,
    { // 1
      title: '踩著上去', hint: '一個人到不了, 先死一次', newThing: 'relay', banner: [60, 70],
      platforms: [P_(100, 351, 320), P_(280, 246, 574)], spikes: [], walls: [],
      grounds: [{ x: 0, w: 400 }, { x: 480, w: 374 }],
      goal: { x: 780, y: 206 }
    },
    { // 2
      title: '一鉤飛天', hint: '鉤住跳起來的幽靈', newThing: 'hook', banner: [60, 70],
      platforms: [P_(200, 241, 400), P_(440, 146, 414)], spikes: [{ x: 0, y: 444, w: 16 }], walls: [],
      grounds: [{ x: 0, w: 560 }],
      goal: { x: 780, y: 106 }
    },
    { // 3
      title: '守門的人', hint: '有人踩住, 同色的門才會開', newThing: 'gate', banner: [60, 70],
      platforms: [P_(0, 241, 560), P_(160, 146, 694)], spikes: [{ x: 0, y: 444, w: 16 }, { x: 0, y: 229, w: 20 }],
      walls: [{ x: 600, y: 158, w: 12, h: 322 }], grounds: [{ x: 0, w: 560 }],
      plateGate: { x: 50, y: 235 }, gate: { x: 600, y: 32, delay: 0.6 },
      goal: { x: 780, y: 106 }
    },
    { // 4
      title: '升降接力', hint: '電梯也要有人踩住', newThing: 'lift', banner: [60, 70],
      platforms: [P_(0, 241, 500), P_(160, 146, 694)], spikes: [{ x: 0, y: 444, w: 16 }, { x: 0, y: 229, w: 20 }],
      walls: [{ x: 600, y: 158, w: 12, h: 322 }], grounds: [{ x: 0, w: 560 }],
      plateLift: { x: 70, y: 450 }, lift: { x: 500 },
      plateGate: { x: 50, y: 235 }, gate: { x: 600, y: 32, delay: 0.3 },
      goal: { x: 780, y: 106 }
    },
    { // 5
      title: '翹翹板', hint: '落在板子一頭, 另一頭會彈起', newThing: 'seesaw', banner: [380, 70],
      platforms: [P_(160, 146, 280), P_(630, 146, 224)], spikes: [{ x: 0, y: 444, w: 16 }], walls: [],
      grounds: [{ x: 0, w: 400 }],
      seesaws: [{ x: 140, y: 450 }],
      goal: { x: 780, y: 106 }
    }
  ];

  // ===== 全域狀態 =====
  var S = {
    screen: 'title',     // title | play | unlock | ending
    titleT: 0, banner: -1,
    level: 1,
    unlockAbility: null,
    shown: { hook: false },
    muted: false,
    // 關內
    phase: 'play',       // play | dying | win | lose
    gen: 1, recs: [], rec: null, ghost: null, gf: 0,
    W: null, P: null, aiming: false, charge: 0, aimFullDone: false,
    hookLeft: HOOK_MAX, hooksUsed: 0, minFeetY: 0,
    tickCeil: 99, timeWarned: false,
    dyingT: 0, replay: null,
    camX: 0, camY: 0, arrowStart: null,
    // 暫停選單
    paused: false, pauseSel: 0, quietF: 0, spawnSilent: false
  };
  var cmd = { z: false, x: false, jump: false };
  var keys = { left: false, right: false, jump: false };
  var jumpDown = { ArrowUp: false };
  var firstInput = false;
  var curMusic = null;

  function clearJump() { jumpDown.ArrowUp = false; keys.jump = false; cmd.jump = false; }
  function nowMs() { return (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now(); }

  // ===== 聲音(Sound 不存在也能玩) =====
  function snd(name, arg) {
    try { if (window.Sound && Sound.play) Sound.play(name, arg); } catch (e) { console.error(e); }
  }
  function music(name) {
    if (curMusic === name) return;
    curMusic = name;
    try { if (window.Sound && Sound.playMusic) Sound.playMusic(name); } catch (e) { console.error(e); }
  }


  // ===== 工具 =====
  function ov(a0, a1, b0, b1) { return a0 < b1 - 0.001 && a1 > b0 + 0.001; }
  function rectOv(ax, ay, aw, ah, bx, by, bw, bh) { return ov(ax, ax + aw, bx, bx + bw) && ov(ay, ay + ah, by, by + bh); }
  function hookUnlocked(lv) { return lv >= 2; }
  function timeLeftF() { return Math.max(0, REC_MAX - (S.rec ? S.rec.length : 0)); }   // 剩餘幀數

  // ===== 世界(機關狀態) =====
  function newWorld(lv) {
    var L = LEVELS[lv];
    return {
      lv: lv, L: L,
      grounds: L.grounds.map(function (g) { return { x: g.x, y: GROUND_Y, w: g.w, h: GROUND_H, solid: true }; }),
      liftY: GROUND_Y, liftDir: 0, liftActive: false,
      gateOpen: false, gateT: 0,
      seesaws: (L.seesaws || []).map(function (s) { return { x: s.x, y: s.y, age: -1, tilt: 0 }; }),
      plateGate: false, plateLift: false
    };
  }
  function resetWorldForGen(W) {
    W.liftY = GROUND_Y; W.liftDir = 0; W.liftActive = false;
    W.gateOpen = false; W.gateT = 0;
    W.plateGate = false; W.plateLift = false;
    W.seesaws.forEach(function (s) { s.age = -1; s.tilt = 0; });
  }
  // 實心物(地面、牆、關著的門、實心平台); 壓板另外處理
  function solidsOf(W) {
    var L = W.L, a = W.grounds.slice();
    L.platforms.forEach(function (p) { if (p.solid) a.push(p); });
    L.walls.forEach(function (w) { a.push(w); });
    if (L.gate && !W.gateOpen) a.push({ x: L.gate.x, y: L.gate.y, w: GATE_W, h: GATE_H });
    return a;
  }
  // 升降台: 回傳位移
  function updateLift(W, dt, pressed) {
    if (!W.L.lift) return 0;
    var old = W.liftY, dir = 0;
    W.liftActive = pressed;
    if (pressed && W.liftY > LIFT_TOP) { W.liftY = Math.max(LIFT_TOP, W.liftY - LIFT_SPD * dt); dir = -1; }
    else if (!pressed && W.liftY < GROUND_Y) { W.liftY = Math.min(GROUND_Y, W.liftY + LIFT_SPD * dt); dir = 1; }
    if (dir !== 0 && dir !== W.liftDir) {
      snd('liftMove', { dir: dir < 0 ? 'up' : 'down' });
      if (dir < 0 && W === S.W && S.screen === 'play') tEvent('lift');
    }
    W.liftDir = dir;
    return W.liftY - old;
  }
  function updateGate(W, dt, pressed, playerRect) {
    var L = W.L; if (!L.gate) return;
    if (pressed) {
      if (!W.gateOpen) {
        W.gateOpen = true; snd('gateOpen');
        if (W === S.W && S.screen === 'play') tEvent('gate');
      }
      W.gateT = 0;
    } else if (W.gateOpen) {
      W.gateT += dt;
      if (W.gateT >= L.gate.delay) {
        var blocked = playerRect && rectOv(playerRect.x, playerRect.y, PW, PH, L.gate.x, L.gate.y, GATE_W, GATE_H);
        if (!blocked) { W.gateOpen = false; W.gateT = 0; snd('gateClose'); }
      }
    }
  }
  function updateSeesaws(W, dt) {
    W.seesaws.forEach(function (s) {
      if (s.age >= 0) {
        s.age += dt;
        if (s.age >= SEESAW_T) { s.age = -1; s.tilt = 0; }
        else s.tilt = Math.sin(Math.PI * s.age / SEESAW_T);
      }
    });
  }
  function triggerSeesaw(W, i) {
    W.seesaws[i].age = 0; W.seesaws[i].tilt = 0;
    snd('seesaw');
  }
  // 實體: {x, y, g(著地)}
  function platePressed(plate, ents) {
    if (!plate) return false;
    var plane = plate.y + BTN_H;
    for (var i = 0; i < ents.length; i++) {
      var e = ents[i];
      if (e.g && Math.abs(e.y + PH - plane) < 0.5 && ov(e.x, e.x + PW, plate.x, plate.x + BTN_W)) return true;
    }
    return false;
  }
  // 翹翹板落點端觸發判斷: 回傳 index 或 -1
  function seesawLandIndex(W, e) {
    for (var i = 0; i < W.seesaws.length; i++) {
      var s = W.seesaws[i];
      if (Math.abs(e.y + PH - (s.y + BTN_H)) < 0.5 && ov(e.x, e.x + PW, s.x, s.x + SS_LAND_W)) return i;
    }
    return -1;
  }

  // ===== 關卡流程 =====
  function setScreen(sc) {
    S.screen = sc;
    S.paused = false;
    cmd.z = cmd.x = false;
    clearJump();
  }
  function startLevel(cause) {
    var first = (cause === 'first');
    setScreen('play');
    S.phase = 'play';
    S.banner = first ? 0 : -1;
    S.quietF = 0;
    S.recs = [];
    S.W = newWorld(S.level);
    S.gen = 1;
    S.replay = null;
    music('play');
    startGen(1);
  }
  function startGen(g) {
    var W = S.W;
    resetWorldForGen(W);
    S.gen = g; S.phase = 'play';
    S.P = { x: SPAWN.x, y: SPAWN.y, vx: 0, vy: 0, facing: 1, state: 'idle', grounded: true, src: 'ground',
            launchT: 0, ropeT: 0, rope: null, dead: false };
    S.aiming = false; S.charge = 0; S.aimFullDone = false;
    S.hookLeft = HOOK_MAX; S.hooksUsed = 0; S.minFeetY = SPAWN.y + PH;
    S.rec = []; S.recs[g - 1] = S.rec;
    S.ghost = g >= 2 ? S.recs[g - 2] : null;
    S.gf = 0;
    S.tickCeil = 99; S.timeWarned = false;
    cmd.z = cmd.x = false;
    clearJump();
    evalPlates(true);
    pushRec();
    camSnap();   // 每代出生直接對準
    if (S.spawnSilent) S.spawnSilent = false; else snd('spawn');
  }
  function ghostRec() { return S.ghost ? S.ghost[S.gf] : null; }
  function pushRec() {
    var P = S.P;
    S.rec.push({ x: P.x, y: P.y, f: P.facing, s: P.state === 'aim' ? 'idle' : P.state, g: P.grounded,
      h: P.ropeT > 0 && P.rope ? P.rope : null, gf: S.ghost ? S.gf : -1 });
    if (P.y + PH < S.minFeetY) S.minFeetY = P.y + PH;
  }
  function gen_end(cause) {
    tHideCond(cause === 'win' ? 'levelEnd' : 'genEnd');
  }
  function die(cause) {
    var P = S.P;
    P.state = 'dead'; P.dead = true;
    gen_end(cause);
    tOnDeath(cause);
    snd('death');
    S.phase = 'dying'; S.dyingT = DEATH_T;
  }
  // 暫停選單「重來」(整關重來的唯一入口); 呼叫時選單已關閉
  function doRestart() {
    tEvent('R');
    if (S.phase === 'play' && S.P && !S.P.dead) gen_end('restart');
    snd('restart');
    S.aiming = false;
    S.spawnSilent = true;   // 重來只播 restart, 不播 spawn
    startLevel('restart');
  }
  function openPause() {
    if (S.screen !== 'play' || S.phase !== 'play' || S.paused) return;
    S.paused = true; S.pauseSel = 0;
    cmd.z = cmd.x = false; cmd.jump = false;
    snd('pauseOpen');
    if (S.aiming) snd('aimCharge', { stop: true });
  }
  function closePause(choice, via) {
    if (!S.paused) return;
    S.paused = false;
    cmd.z = cmd.x = false; cmd.jump = false;
    if (choice === 'restart') doRestart();
    else {
      snd('pauseClose');
      if (S.aiming && S.charge < 1) snd('aimCharge', { charge: S.charge });
    }
  }
  function win() {
    gen_end('win');
    S.phase = 'win';
    snd('levelClear');
    // 批次尾端: gen_end → 教學收尾 → 通知網站單關通關
    tOnWin();
    if (window.PVDX) PVDX.levelClear(S.level);
    S.banner = -1;
    var recs = S.recs.slice(0, S.gen);
    S.replay = { recs: recs, G: S.gen, f: 0, prev: [], W: newWorld(S.level), L: recs[S.gen - 1].length };
    music('replay');
    S.aiming = false;
    camSnap();
  }

  // ===== 觸控鏡頭(狀態每步更新; 電腦版不使用) =====
  // 鏡頭左右可以超出關卡邊界, 讓角色走到關卡兩端時不會躲在左下 ◀ ▶ / 右下跳躍鍵後面(超出的部分畫成邊界磚牆, 見繪製段)
  // 左: touch.js 左右兩鍵右緣約 338 + 留白 → 角色至少在畫面 x 300 外; 右: 跳躍鍵左緣約 CW − 202 → 約 230
  var CAM_PAD_L = 300 / ZT, CAM_PAD_R = 230 / ZT;
  function camMax() { return { x: Math.max(0, WORLD_W - CW / ZT), y: Math.max(0, WH - CH / ZT) }; }
  function camFocus() {
    if (S.screen !== 'play') return null;
    if (S.phase === 'win' && S.replay) {
      var R = S.replay, rec = R.recs[R.G - 1], r = rec[Math.min(R.f, rec.length - 1)];
      return { x: r.x + PW / 2, y: r.y + PH / 2 };
    }
    if ((S.phase === 'play' || S.phase === 'dying') && S.P) return { x: S.P.x + PW / 2, y: S.P.y + PH / 2 };
    return null;
  }
  function camTarget() {
    var f = camFocus(); if (!f) return null;
    var m = camMax();
    return { x: Math.max(-CAM_PAD_L, Math.min(m.x + CAM_PAD_R, f.x - CW / ZT / 2)), y: Math.max(0, Math.min(m.y, f.y - CAM_TY)) };
  }
  function camSnap() { var t = camTarget(); if (t) { S.camX = t.x; S.camY = t.y; } }
  function camFollow() {
    var t = camTarget(); if (!t) return;
    S.camX = Math.abs(t.x - S.camX) < 0.05 ? t.x : S.camX + (t.x - S.camX) * CAM_FX;
    S.camY = Math.abs(t.y - S.camY) < 0.05 ? t.y : S.camY + (t.y - S.camY) * CAM_FY;
  }

  // ===== 每幀更新 =====
  function evalPlates(silent) {
    var W = S.W, L = W.L, ents = [];
    if (S.P && !S.P.dead) ents.push({ x: S.P.x, y: S.P.y, g: S.P.grounded });
    var gr = ghostRec();
    if (gr) ents.push({ x: gr.x, y: gr.y, g: gr.g });
    var pg = platePressed(L.plateGate, ents), pl = platePressed(L.plateLift, ents);
    if (!silent) {
      if (pg !== W.plateGate) snd(pg ? 'plateOn' : 'plateOff');
      if (pl !== W.plateLift) snd(pl ? 'plateOn' : 'plateOff');
    }
    W.plateGate = pg; W.plateLift = pl;
  }
  // 幽靈在範圍內且還有次數(不看角色著地與否)
  function ghostInHookRange() {
    if (!hookUnlocked(S.level) || !S.ghost || S.hookLeft <= 0) return false;
    var gr = ghostRec(), P = S.P;
    var dx = (gr.x + PW / 2) - (P.x + PW / 2), dy = (gr.y + PH / 2) - (P.y + PH / 2);
    return Math.sqrt(dx * dx + dy * dy) <= HOOK_RANGE;
  }
  // 可鉤: 角色著地、且不是站在這隻幽靈頭上
  function hookableNow() {
    var P = S.P;
    return ghostInHookRange() && P.grounded && P.src !== 'ghost';
  }

  function step() {
    if (S.screen !== 'play' || S.paused) return;
    if (S.banner >= 0) { S.banner += DT; S.quietF = 0; if (S.banner >= BANNER_T) S.banner = -1; }
    else S.quietF++;
    tTick();
    stepInner();
    if (S.screen === 'play') { tUpdate(); if (!S.aiming) camFollow(); }   // 瞄準時間停住, 鏡頭也停
  }
  function stepInner() {
    var W = S.W, P = S.P, L = W.L;

    if (S.phase === 'win') { stepReplay(); return; }
    if (S.phase === 'lose') { return; }
    if (S.phase === 'dying') {
      S.dyingT -= DT;
      if (S.dyingT <= 0) {
        if (S.gen < MAX_GEN) startGen(S.gen + 1);
        else { S.phase = 'lose'; snd('levelFail'); }
      }
      cmd.z = cmd.x = false; cmd.jump = false;
      return;
    }

    // --- 瞄準中(時間暫停: 只有 Z X 有作用) ---
    if (S.aiming) {
      var zz = cmd.z, xx = cmd.x; cmd.z = cmd.x = false;
      if (zz) { launchHook(); }
      else if (xx) { cancelAim(); return; }
      else {
        if (S.charge < 1) {
          S.charge = Math.min(1, S.charge + DT / CHARGE_T);
          if (S.charge >= 1 && !S.aimFullDone) { S.aimFullDone = true; snd('aimFull'); }
          else if (S.charge < 1) snd('aimCharge', { charge: S.charge });
        }
        return;
      }
    } else {
      // --- 一般指令 ---
      if (cmd.z) {
        cmd.z = false;
        if (hookableNow()) {
          S.aiming = true; S.charge = 0; S.aimFullDone = false; P.state = 'aim';
          snd('aimStart'); snd('aimCharge', { charge: 0 });
          tEvent('hookAim');
          cmd.x = false;
          return;
        } else if (ghostInHookRange()) {
          snd('hookDenied');
        }
      }
      cmd.x = false;
    }

    // --- 幽靈前進 ---
    var gOldY = null, gDx = 0, gNewY = null, disc = false;
    if (S.ghost) {
      if (S.rec.length > 0) {
        var old = ghostRec();
        S.gf++;
        if (S.gf >= S.ghost.length) { S.gf = 0; disc = true; }
        var nw = ghostRec();
        gOldY = disc ? nw.y : old.y; gDx = nw.x - old.x; gNewY = nw.y;
        // 翹翹板落點端(幽靈): 只算正常前進的相鄰兩幀
        if (!disc && !old.g && nw.g) {
          var si = seesawLandIndex(W, nw);
          if (si >= 0) { seesawTrigger(si); }
        }
      }
    }

    // --- 機關 ---
    // 升降台搭乘判定: 在升降台移動之前, 包含升降台與地面齊平時
    var onLift = false;
    if (L.lift && P.grounded) {
      onLift = Math.abs(P.y + PH - W.liftY) <= 0.5 && ov(P.x, P.x + PW, L.lift.x, L.lift.x + LIFT_W);
    }
    if (L.lift) updateLift(W, DT, W.plateLift);
    updateGate(W, DT, W.plateGate, P);
    updateSeesaws(W, DT);

    // --- 搭乘 ---
    var carried = false, noGhostLand = false;
    if (onLift) { P.y = W.liftY - PH; }
    else if (P.grounded && P.src === 'ghost' && S.ghost) {
      if (disc) { P.grounded = false; P.src = null; P.vy = 0; }
      else if (gNewY !== null) {
        var oldTop13 = P.y;
        P.x += gDx; P.y = gNewY - PH; carried = true;
        // 規則 13a: 被帶著往上時頭頂碰到天花板或實心平台底面 → 停在那裡、離開幽靈、進入空中
        if (P.y < oldTop13) {
          var hitY = null;
          if (P.y < CEILING) hitY = CEILING;
          var solC = solidsOf(W);
          for (var q13 = 0; q13 < solC.length; q13++) {
            var sq = solC[q13], sb = sq.y + sq.h;
            if (ov(P.x, P.x + PW, sq.x, sq.x + sq.w) && oldTop13 >= sb - 0.01 && P.y < sb) { if (hitY === null || sb > hitY) hitY = sb; }
          }
          if (hitY !== null) {
            P.y = hitY; P.vy = 0; P.grounded = false; P.src = null; carried = false; noGhostLand = true;
          }
        }
      }
    }
    if (disc && P.src === 'ghost' && P.grounded) { P.grounded = false; P.src = null; P.vy = 0; }

    // --- 玩家水平 ---
    var dirx = (keys.left ? -1 : 0) + (keys.right ? 1 : 0);
    if (P.launchT > 0) { P.launchT -= DT; if (P.launchT <= 0) { P.launchT = 0; } }
    if (P.launchT <= 0) { P.vx = dirx * WALK; if (dirx !== 0) P.facing = dirx; }
    else if (P.vx !== 0) P.facing = P.vx > 0 ? 1 : -1;

    // 跳躍
    if ((keys.jump || cmd.jump) && P.grounded) {
      P.vy = -JUMP_V; P.grounded = false; P.src = null; snd('jump');
    }
    cmd.jump = false;

    // 水平移動 + 實心碰撞
    var sol = solidsOf(W);
    var oldPx = P.x;
    P.x += P.vx * DT;
    if (P.x < 0) { P.x = 0; P.vx = 0; }
    if (P.x > WW - PW) { P.x = WW - PW; P.vx = 0; }
    for (var si2 = 0; si2 < sol.length; si2++) {
      var s = sol[si2];
      if (rectOv(P.x, P.y, PW, PH, s.x, s.y, s.w, s.h)) {
        if (P.vx > 0) P.x = s.x - PW; else if (P.vx < 0) P.x = s.x + s.w;
        else P.x = (P.x + PW / 2 < s.x + s.w / 2) ? s.x - PW : s.x + s.w;
        P.vx = 0;
      }
    }

    // 垂直移動
    var wasG = P.grounded;
    var oldFeet = P.y + PH, oldTop = P.y;
    var newY = P.y + P.vy * DT + 0.5 * G * DT * DT;
    P.vy += G * DT;
    var newFeet = newY + PH;
    P.grounded = false; P.src = null;
    if (P.vy >= 0) {
      var best = null;
      var consider = function (top, x0, x1, src, prevTop) {
        if (!ov(P.x, P.x + PW, x0, x1)) return;
        var chk = (prevTop === undefined) ? top : prevTop;
        if (oldFeet <= chk + 0.01 && newFeet >= top) { if (!best || top < best.top) best = { top: top, src: src }; }
      };
      W.grounds.forEach(function (g0) { consider(g0.y, g0.x, g0.x + g0.w, 'ground'); });
      L.platforms.forEach(function (p) { consider(p.y, p.x, p.x + p.w, 'plat'); });
      if (L.lift) consider(W.liftY, L.lift.x, L.lift.x + LIFT_W, 'lift');
      L.walls.forEach(function (w) { consider(w.y, w.x, w.x + w.w, 'plat'); });
      if (L.gate && !W.gateOpen) consider(L.gate.y, L.gate.x, L.gate.x + GATE_W, 'plat');
      // 幽靈頭頂: 必須是從上方落下(上一幀腳底 ≤ 上一幀頭頂); 正被載著的角色已貼齊頭頂, 視為持續站著
      if (S.ghost && !noGhostLand) { var gg = ghostRec(); consider(gg.y, gg.x, gg.x + PW, 'ghost', carried ? gg.y : (gOldY === null ? gg.y : gOldY)); }
      if (best) { P.y = best.top - PH; P.vy = 0; P.grounded = true; P.src = best.src; }
      else P.y = newY;
    } else {
      // 上升: 頭頂撞實心底(含實心平台)
      var ny = newY;
      for (var k = 0; k < sol.length; k++) {
        var q = sol[k], bot = q.y + q.h;
        if (ov(P.x, P.x + PW, q.x, q.x + q.w) && oldTop >= bot - 0.01 && ny < bot) { ny = bot; P.vy = 0; }
      }
      P.y = ny;
    }
    // 天花板: 頭頂到 y 32 停住, 往上速度歸零
    if (P.y < CEILING) { P.y = CEILING; if (P.vy < 0) P.vy = 0; }
    if (P.grounded && !wasG) {
      if (P.src === 'ghost') { snd('headStand'); tEvent('head'); } else snd('land');
      var li = seesawLandIndex(W, { x: P.x, y: P.y });
      if (li >= 0 && P.src !== 'lift') { seesawTrigger(li); tEvent('seesaw'); }
    }

    // --- 鉤索顯示 ---
    if (P.ropeT > 0) {
      var gr = ghostRec();
      if (gr) P.rope = { x1: P.x + PW / 2, y1: P.y + PH / 2, x2: gr.x + PW / 2, y2: gr.y + PH / 2 };
      P.ropeT -= DT;
      if (P.ropeT <= 0) { P.ropeT = 0; P.rope = null; }
    }

    // --- 狀態 ---
    if (P.launchT > 0) P.state = 'launch';
    else if (!P.grounded) P.state = 'air';
    else if (dirx !== 0) P.state = 'run';
    else P.state = 'idle';

    // --- 開關 ---
    evalPlates(false);

    // --- 錄製 ---
    pushRec();

    // --- 剩餘時間: 剩 10 秒埋點、剩 5~1 秒每秒一聲 ---
    var remF = timeLeftF();
    if (!S.timeWarned && remF <= TIME_WARN_F) {
      S.timeWarned = true;
    }
    var tc = Math.ceil(remF / 60);
    if (tc !== S.tickCeil) {
      S.tickCeil = tc;
      if (tc >= 1 && tc <= TICK_S) snd('timeTick', { left: tc });
    }

    // --- 結束條件(批次尾端判一次) ---
    var cause = null, won = false;
    if (rectOv(P.x, P.y, PW, PH, L.goal.x, L.goal.y, GOAL_W, GOAL_H)) won = true;
    else {
      if (P.y >= WH) cause = 'pit';
      for (var sp = 0; !cause && sp < L.spikes.length; sp++) {
        var sk = L.spikes[sp];
        if (rectOv(P.x, P.y, PW, PH, sk.x, sk.y, sk.w, SPIKE_H)) cause = 'spike';
      }
      if (!cause && S.rec.length >= REC_MAX) cause = 'timeout';
    }
    if (won) win();
    else if (cause) die(cause);
  }

  function seesawTrigger(i) {
    var W = S.W, P = S.P, s = W.seesaws[i];
    triggerSeesaw(W, i);
    // 著地站在發射端的玩家被彈起
    if (P && !P.dead && P.grounded && Math.abs(P.y + PH - (s.y + BTN_H)) < 0.5 && ov(P.x, P.x + PW, s.x + SS_LAUNCH_X, s.x + SS_W)) {
      P.vy = -SEESAW_V; P.vx = 0; P.launchT = 0; P.grounded = false; P.src = null;
      snd('seesawLaunch');
    }
  }

  function aimInfo() {
    var P = S.P, gr = ghostRec();
    var px = P.x + PW / 2, py = P.y + PH / 2, gx = gr.x + PW / 2, gy = gr.y + PH / 2;
    var dx = gx - px, dy = gy - py, d = Math.sqrt(dx * dx + dy * dy);
    if (d < 1e-6) { dx = 0; dy = -1; d = 1; }
    dx /= d; dy /= d;
    var air = !gr.g;
    var v = (air ? HOOK_AIR : HOOK_GND) * (0.3 + 0.7 * S.charge);
    return { px: px, py: py, gx: gx, gy: gy, dx: dx, dy: dy, v: v, air: air,
             ax: px + dx * v * 0.3, ay: py + dy * v * 0.3 };
  }
  function cancelAim() {
    var ai = aimInfo(), P = S.P;
    S.aiming = false; snd('hookCancel');
    P.state = P.grounded ? 'idle' : 'air';
  }
  function launchHook() {
    var ai = aimInfo(), P = S.P;
    S.aiming = false; snd('hookLaunch');
    tEvent('hookFire');
    S.hookLeft--; S.hooksUsed++;
    P.vx = ai.dx * ai.v; P.vy = ai.dy * ai.v;
    P.grounded = false; P.src = null;
    P.launchT = LAUNCH_T; P.ropeT = ROPE_T;
    P.rope = { x1: ai.px, y1: ai.py, x2: ai.gx, y2: ai.gy };
    P.state = 'launch';
  }

  // ===== 過關回放 =====
  function replayIdx(R, f) {
    var idx = new Array(R.G + 1), cur = f;
    for (var g = R.G; g >= 1; g--) {
      idx[g] = cur;
      var r = R.recs[g - 1][Math.min(cur, R.recs[g - 1].length - 1)];
      cur = r.gf >= 0 ? r.gf : 0;
    }
    return idx;
  }
  function stepReplay() {
    var R = S.replay, W = R.W, L = W.L;
    R.f++;
    if (R.f >= R.L) { R.f = 0; resetWorldForGen(W); R.prev = []; camSnap(); }
    var idx = replayIdx(R, R.f), ents = [];
    for (var g = 1; g <= R.G; g++) {
      var rec = R.recs[g - 1], i = Math.min(idx[g], rec.length - 1), r = rec[i];
      ents.push({ x: r.x, y: r.y, g: r.g });
      var pv = R.prev[g];
      if (pv !== undefined && i === pv + 1 && i > 0) {
        var pr = rec[i - 1];
        if (!pr.g && r.g) { var si = seesawLandIndex(W, r); if (si >= 0) triggerSeesaw(W, si); }
      }
      R.prev[g] = i;
    }
    var pg = platePressed(L.plateGate, ents), pl = platePressed(L.plateLift, ents);
    updateLift(W, DT, pl);
    updateGate(W, DT, pg, null);
    updateSeesaws(W, DT);
    W.plateGate = pg; W.plateLift = pl;
  }

  // ===== 繪製 =====
  function drawWorld(ctx, W) {
    var L = W.L;
    Art.drawBackground(ctx, { level: W.lv });
    W.grounds.forEach(function (g0) { Art.drawPlatform(ctx, { x: g0.x, y: g0.y, w: g0.w, h: g0.h, solid: true }); });
    L.platforms.forEach(function (p) { Art.drawPlatform(ctx, { x: p.x, y: p.y, w: p.w, h: p.h, solid: !!p.solid }); });
    L.walls.forEach(function (w) { Art.drawWall(ctx, { x: w.x, y: w.y, w: w.w, h: w.h }); });
    L.spikes.forEach(function (s) { Art.drawSpike(ctx, { x: s.x, y: s.y, w: s.w }); });
    W.seesaws.forEach(function (s) {
      var sw = s.age >= 0;
      Art.drawSeesaw(ctx, { x: s.x, y: s.y, tilt: s.tilt, swing: sw ? Math.min(1, s.age / SEESAW_T) : 1, swinging: sw });
    });
    if (L.plateLift) Art.drawPlate(ctx, { x: L.plateLift.x, y: L.plateLift.y, pressed: W.plateLift, kind: 'lift' });
    if (L.plateGate) Art.drawPlate(ctx, { x: L.plateGate.x, y: L.plateGate.y, pressed: W.plateGate, kind: 'gate' });
    if (L.lift) Art.drawLift(ctx, { x: L.lift.x, y: W.liftY, active: W.liftActive || W.plateLift });
    if (L.gate) Art.drawGate(ctx, { x: L.gate.x, y: L.gate.y, open: W.gateOpen });
    Art.drawGoal(ctx, { x: L.goal.x, y: L.goal.y });
  }
  function hudState(phase) {
    var lv = S.level;
    return { level: lv, levelCount: LEVEL_COUNT, gen: S.gen, maxGen: MAX_GEN, phase: phase,
      hookUnlocked: hookUnlocked(lv), hookLeft: S.hookLeft, hookMax: HOOK_MAX,
      aiming: S.aiming,
      timeLeft: timeLeftF() / 60, timeMax: REC_MAX / 60 };
  }
  function routeSegments() {
    var gh = S.ghost, n = gh.length, total = Math.min(ROUTE_N, n), a = S.gf, segs = [];
    var end1 = Math.min(a + total, n), s1 = [];
    for (var i = a; i < end1; i++) s1.push({ x: gh[i].x + PW / 2, y: gh[i].y + PH / 2 });
    segs.push(s1);
    var rem = total - (end1 - a);
    if (rem > 0) {
      var s2 = [];
      for (var j = 0; j < rem; j++) s2.push({ x: gh[j].x + PW / 2, y: gh[j].y + PH / 2 });
      segs.push(s2);
    }
    return segs;
  }
  // 世界層: 電腦版放大 1.5 倍; 觸控模式放大 2.1 倍並依鏡頭平移。座標都是世界座標
  function worldBegin(ctx) {
    ctx.save();
    if (isTouch()) { ctx.scale(ZT, ZT); ctx.translate(-S.camX, -S.camY); }
    else ctx.scale(ZOOM, ZOOM);
  }
  // HUD: 觸控模式在 scale(1.4) 下畫, 傳 HUD 單位的可見寬高
  function drawHudFor(ctx, hs) {
    if (isTouch()) {
      ctx.save(); ctx.scale(TK, TK);
      try { hs.w = CW / TK; hs.h = CH / TK; Art.drawHud(ctx, hs); } finally { ctx.restore(); }
    } else { hs.w = 1280; hs.h = 720; Art.drawHud(ctx, hs); }
  }
  // 終點旗方向箭頭(只在觸控模式、phase play / dying, 旗子完全在遊玩區外)
  function drawGoalArrowFor(ctx) {
    var show = false;
    if (isTouch() && S.W && (S.phase === 'play' || S.phase === 'dying')) {
      var g = S.W.L.goal, fx = (g.x - S.camX) * ZT, fy = (g.y - S.camY) * ZT, fw = GOAL_W * ZT, fh = GOAL_H * ZT;
      if (fx + fw <= 0 || fx >= CW || fy + fh <= HUD_T || fy >= CH) {
        show = true;
        var cx = CW / 2, cy = (HUD_T + CH) / 2, dx = fx + fw / 2 - cx, dy = fy + fh / 2 - cy;
        var tx = dx > 0 ? (CW - 40 - cx) / dx : (dx < 0 ? (40 - cx) / dx : Infinity);
        var ty = dy > 0 ? (680 - cy) / dy : (dy < 0 ? (107.2 - cy) / dy : Infinity);
        var tt = Math.min(tx, ty), ax = cx + dx * tt, ay = cy + dy * tt;
        var M = TOUCH_MENU;
        if (ax >= M.x && ax <= M.x + M.w && ay >= M.y && ay <= M.y + M.h) ay = M.y + M.h + 24;
        if (S.arrowStart === null) S.arrowStart = nowMs();
        Art.drawGoalArrow(ctx, { x: ax, y: ay, angle: Math.atan2(dy, dx), t: (nowMs() - S.arrowStart) / 1000 });
      }
    }
    if (!show) S.arrowStart = null;
  }
  function drawPauseFor(ctx) {
    if (isTouch()) {
      ctx.save(); ctx.translate(CW / 2, 360); ctx.scale(TK, TK); ctx.translate(-640, -360);
      try { Art.drawPauseMenu(ctx, { sel: S.pauseSel, touch: true, vx: 640 - CW / (2 * TK), vy: 360 - 360 / TK, vw: CW / TK, vh: CH / TK }); }
      finally { ctx.restore(); }
    } else Art.drawPauseMenu(ctx, { sel: S.pauseSel, touch: false, vx: 0, vy: 0, vw: 1280, vh: 720 });
  }
  function drawBannerFor(ctx) {
    var BL = LEVELS[S.level];
    var bs = { x: BL.banner[0], y: BL.banner[1], level: S.level, levelCount: LEVEL_COUNT, title: BL.title, newThing: BL.newThing, t: Math.min(1, S.banner / BANNER_T) };
    if (isTouch()) {
      ctx.save(); ctx.translate(24, 80); ctx.scale(TK, TK);
      try { bs.x = 0; bs.y = 0; Art.drawLevelBanner(ctx, bs); } finally { ctx.restore(); }
    } else Art.drawLevelBanner(ctx, bs);
  }
  // 觸控模式鏡頭超出關卡的兩側(角色走到關卡兩端時讓出按鈕位置): 畫成整排磚牆, 看起來是關卡的邊界牆, 不是黑塊
  function drawEdgeWalls(ctx) {
    edgeWall(ctx, -CAM_PAD_L - 8, CAM_PAD_L + 8);
    edgeWall(ctx, WORLD_W, CAM_PAD_R + 8);
  }
  // 一整面磚牆: 用美術的牆面畫底與上下緣, 再補整面交錯的磚縫(美術的牆只畫兩條縱縫, 寬牆會變成大方塊)
  function edgeWall(ctx, x, w) {
    Art.drawWall(ctx, { x: x, y: 0, w: w, h: WH });
    ctx.save(); ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 1; ctx.beginPath();
    for (var by = 11, row = 0; by < WH - 2; by += 11, row++) {
      for (var jx = x + (row % 2 ? 12 : 24); jx < x + w - 2; jx += 24) { ctx.moveTo(jx, by - 11); ctx.lineTo(jx, by); }
    }
    ctx.stroke(); ctx.restore();
  }
  function drawPlay(ctx) {
    var W = S.W, P = S.P;
    worldBegin(ctx);
    try { drawPlayWorld(ctx, W, P); if (isTouch()) drawEdgeWalls(ctx); } finally { ctx.restore(); }
    // 畫面層
    var ts = S.paused ? null : tDrawState();   // 暫停選單打開時教學泡泡暫藏
    if (ts) Art.drawTutorial(ctx, ts);
    drawGoalArrowFor(ctx);
    drawHudFor(ctx, hudState(S.phase));
    if (S.banner >= 0 && S.phase !== 'win' && S.phase !== 'lose') drawBannerFor(ctx);
    if (S.paused) drawPauseFor(ctx);
  }
  function drawPlayWorld(ctx, W, P) {
    drawWorld(ctx, W);
    if (S.ghost && S.phase !== 'lose') {
      Art.drawGhostPath(ctx, { segments: routeSegments() });
    }
    if (S.ghost) {
      var gr = ghostRec();
      Art.drawGhost(ctx, { x: gr.x, y: gr.y, facing: gr.f, state: gr.s, gen: S.gen - 1,
        hookable: S.phase === 'play' && (S.aiming || hookableNow()), hookAir: !gr.g });
      if (gr.h) Art.drawHook(ctx, gr.h);
    }
    if (P.rope && P.ropeT > 0) Art.drawHook(ctx, P.rope);
    Art.drawPlayer(ctx, { x: P.x, y: P.y, facing: P.facing, state: P.state, gen: S.gen });
    if (S.aiming) {
      var ai = aimInfo();
      Art.drawAim(ctx, { px: ai.px, py: ai.py, gx: ai.gx, gy: ai.gy, ax: ai.ax, ay: ai.ay, charge: S.charge, topY: isTouch() ? S.camY + 37 : 37 });
    }
  }
  function drawSoundIconFor(ctx) {
    if (window.PVDX && PVDX.on) return;   // 觸控模式不畫
    var pos = (S.screen === 'play' && !S.paused) ? SND_ICON_PLAY : SND_ICON_MENU;
    Art.drawSoundIcon(ctx, { x: pos.x, y: pos.y, muted: S.muted });
  }
  function drawReplay(ctx) {
    var R = S.replay, W = R.W;
    worldBegin(ctx);
    try { drawReplayWorld(ctx, R, W); } finally { ctx.restore(); }
    var hs = hudState('win'); hs.aiming = false; hs.gen = R.G;
    drawHudFor(ctx, hs);
  }
  function drawReplayWorld(ctx, R, W) {
    drawWorld(ctx, W);
    var idx = replayIdx(R, R.f), items = [];
    for (var g = R.G; g >= 1; g--) {
      var rec = R.recs[g - 1], r = rec[Math.min(idx[g], rec.length - 1)];
      items.push({ g: g, r: r });
    }
    items.sort(function (a, b) { return a.g - b.g; });
    items.forEach(function (it) {
      Art.drawGhost(ctx, { x: it.r.x, y: it.r.y, facing: it.r.f, state: it.r.s, gen: it.g, hookable: false, hookAir: false });
      if (it.r.h) Art.drawHook(ctx, it.r.h);
    });
  }

  // ===== 新手教學(狀態機; 畫面交給 Art.drawTutorial) =====
  var T = {
    st: {}, cur: null, popT: 0, fx: null, block: 0,
    mk: { left: false, right: false, up: false }
  };
  var T_MAIN = ['move', 'die', 'head', 'hookAim', 'hookFire', 'gate', 'lift', 'seesaw'];
  var T_COND = ['stuck'];
  var T_LEVEL = { move: 1, die: 1, head: 1, gate: 3, lift: 4, seesaw: 5 };
  var T_PRE = { die: 'move', head: 'die', hookFire: 'hookAim' };
  // 避開聲音開關圖示: 圖示 (1228, 56, 40, 40) 外擴 6; 觸控模式改避開右上選單鍵(TOUCH_MENU, 畫布座標)
  var TUT_AVOID = { x: 1222, y: 50, w: 52, h: 52 };
  // 觸控模式左下 ◀ ▶ 兩鍵的外接框(畫布座標), 教學泡泡要避開; 數字照 touch.js 的 LAYOUT.left / right(圓心 (110, CH − 112)、(270, CH − 112), 半徑 68)
  function touchDpadBox() {
    var r = 68, cy = CH - 112;
    return { x: 110 - r, y: cy - r, w: 270 - 110 + r * 2, h: r * 2 };
  }
  // 世界座標 → 傳給美術的座標(電腦版 × 1.5; 觸控模式 (世界 − 鏡頭) × 2.1, 畫布座標)
  function w2sx(x) { return isTouch() ? (x - S.camX) * ZT : x * ZOOM; }
  function w2sy(y) { return isTouch() ? (y - S.camY) * ZT : y * ZOOM; }
  T_MAIN.concat(T_COND).forEach(function (id) { T.st[id] = { done: false, skipped: false, live: false, count: 0 }; });

  // 錨點(世界座標): { x, y, tail(畫面 px), place(可省略), alt(上方放不下時改下方用的錨點) }
  // 傳給 Art 前由 tDrawState 換成畫面座標(× ZOOM)
  var TUT_TOP = 56;   // 泡泡上緣下限(畫面座標, HUD 下方)
  function aPlayerHead() { var P = S.P; return P ? { x: P.x + PW / 2, y: P.y - 4, tail: 16, alt: { x: P.x + PW / 2, y: P.y + 32 } } : null; }
  function aGhostHead(tail) { return function () { var g = S.ghost ? ghostRec() : null; return g ? { x: g.x + PW / 2, y: g.y - 4, tail: tail, alt: { x: g.x + PW / 2, y: g.y + 32 } } : null; }; }
  function aPlate(key) { return function () { var p = S.W && S.W.L[key]; return p ? { x: p.x + BTN_W / 2, y: p.y, tail: 48 } : null; }; }
  function aSeesawLand() { var s = S.W.L.seesaws[0]; return { x: s.x + SS_LAND_W / 2, y: s.y + BTN_H, tail: 48 }; }
  function aSeesawLaunch() { var s = S.W.L.seesaws[0]; return { x: s.x + SS_LAUNCH_X + SS_LAND_W / 2, y: s.y + BTN_H, tail: 48 }; }
  // 第 5 階段: 泡泡在角色側邊(幽靈的另一側)。泡泡寬以 220 畫面 px 估算, 夾邊會蓋到角色就改放另一側
  function aHookFireSide() {
    var P = S.P, gr = S.ghost ? ghostRec() : null; if (!P) return null;
    var ghostRight = gr ? (gr.x + PW / 2 >= P.x + PW / 2) : false;
    var sc = isTouch() ? TK : 1, maxX = isTouch() ? CW - 12 : 1268;
    var place = ghostRight ? 'left' : 'right', EST = 220 * sc;
    if (place === 'left' && w2sx(P.x) - 16 * sc - EST < 12) place = 'right';
    else if (place === 'right' && w2sx(P.x + PW) + 16 * sc + EST > maxX) place = 'left';
    return place === 'left' ? { x: P.x, y: P.y + 14, tail: 16, place: 'left' } : { x: P.x + PW, y: P.y + 14, tail: 16, place: 'right' };
  }
  // 標示框: 世界框 × 1.5 後四邊各外擴 6(畫面座標), 上緣不高於 48(HUD 下緣)
  // 觸控模式: (世界框 − 鏡頭) × 2.1 後外擴 8.4, 上緣不高於 67.2
  function markBox(wx, wy, ww, wh) {
    var z = isTouch() ? ZT : ZOOM, e = isTouch() ? 8.4 : 6, top = isTouch() ? HUD_T : 48;
    var x = w2sx(wx) - e, y = w2sy(wy) - e, w = ww * z + 2 * e, h = wh * z + 2 * e;
    if (y < top) { h = Math.max(0, h - (top - y)); y = top; }
    return { x: x, y: y, w: w, h: h };
  }
  var TD = {
    move: { text: '走、跳', keys: ['left', 'right', 'jump'], anchor: aPlayerHead },
    die: { text: '到不了旗子? 先死一次', keys: [], anchor: function () { return { x: 440, y: 456, tail: 48 }; },
      mark: function () { var g = S.W.L.goal; return markBox(g.x, g.y, GOAL_W, GOAL_H); } },
    head: { text: '跳到他頭上', keys: [], anchor: aGhostHead(16) },
    hookAim: { text: '他跳起時 按 Z', keys: ['Z'], anchor: aGhostHead(56) },
    hookFire: { text: '蓄滿 再按 Z', keys: ['Z'], anchor: aHookFireSide },
    gate: { text: '有人踩著, 門就開', keys: [], anchor: aPlate('plateGate'),
      mark: function () { var g = S.W.L.gate; return markBox(g.x, g.y, GATE_W, GATE_H); } },
    lift: { text: '踩住開關, 電梯會升', keys: [], anchor: aPlate('plateLift'),
      mark: function () { var L = S.W.L; return markBox(L.lift.x, S.W.liftY, LIFT_W, 12); } },
    seesaw: { text: '跳到這頭, 另一頭彈起', keys: [],
      anchor: aSeesawLand, fxAnchor: aSeesawLaunch,
      mark: function () { var s = S.W.L.seesaws[0]; return markBox(s.x + SS_LAUNCH_X, s.y, SS_LAND_W, BTN_H); } },
    stuck: { text: '卡住了? 整關重來', keys: ['esc'], anchor: aPlayerHead }
  };
  var T_AUTO = { gate: 1, lift: 1, seesaw: 1 };   // 泡泡出現前就做到 → auto 完成
  // 主線階段的出現時機: 開場橫幅消失後 0.3 秒(沒橫幅: 出生後 0.5 秒)
  function tIntro() { return S.banner < 0 && S.quietF >= 18 && !!S.rec && S.rec.length >= 30; }

  function tOpen(id) { var s = T.st[id]; return !s.done && !s.skipped; }
  function tLevelOk(id) {
    if (id === 'hookAim' || id === 'hookFire') return S.level >= 2;
    return T_LEVEL[id] === S.level;
  }
  // 出現條件(主線階段: 之前出現過就不再要求時間條件)
  function tElig(id) {
    var st = T.st[id], L = S.level, rl = S.rec ? S.rec.length : 0, W = S.W;
    switch (id) {
      case 'move': return L === 1 && S.gen === 1 && tIntro();
      case 'die': return L === 1 && S.gen === 1 && T.st.move.done;
      case 'head': return L === 1 && T.st.die.done && !!S.ghost;
      case 'hookAim': return L >= 2 && !!S.ghost && S.hookLeft > 0;
      case 'hookFire': return S.aiming && T.st.hookAim.done;
      case 'gate': return L === 3 && (st.live || tIntro());
      case 'lift': return L === 4 && (st.live || tIntro());
      case 'seesaw': return L === 5 && (st.live || tIntro());
      case 'stuck': return S.timeWarned;
    }
    return false;
  }
  function tWant() {
    if (S.screen !== 'play' || S.phase !== 'play' || !S.P || S.P.dead || T.fx || S.paused) return null;
    if (S.banner >= 0) return null;   // 開場橫幅還在: 任何泡泡都等它消失
    if (S.aiming) return (tOpen('hookFire') && tElig('hookFire') && T.block <= 0) ? 'hookFire' : null;
    var i, id;
    for (i = 0; i < T_COND.length; i++) { id = T_COND[i]; if (tOpen(id) && tElig(id)) return id; }
    if (T.block > 0) return null;
    for (i = 0; i < T_MAIN.length; i++) { id = T_MAIN[i]; if (tOpen(id) && tElig(id)) return id; }
    return null;
  }
  function tTick() {
    if (T.block > 0) T.block -= DT;
    if (T.fx) { T.fx.t += DT; if (T.fx.t >= TUT_FX_T) T.fx = null; }
    T.popT += DT;
  }
  function tUpdate() {
    var want = tWant();
    if (want !== T.cur) {
      T.cur = want; T.popT = 0;
      if (want) {
        var st = T.st[want];
        if (!st.live) {
          st.live = true; st.count++;
          snd('tutorialShow');
        }
      }
    }
  }
  function tComplete(id, silent, auto) {
    var st = T.st[id]; if (st.done) return;
    st.done = true;
    var P = S.P;
    if (T.cur === id) T.cur = null;
    if (!silent) {
      var d = TD[id];
      T.fx = { id: id, t: 0, last: null, fxAnchor: d.fxAnchor || d.anchor };
      T.block = TUT_FX_T + TUT_GAP;
      snd('tutorialDone');
    }
  }
  // 遊戲事件 → 教學階段完成(條件式 'R' = 暫停選單選「重來」, 只有泡泡正在顯示時才算)
  function tEvent(ev) {
    if (S.screen !== 'play') return;
    if (ev === 'R') {
      if (T.cur === 'stuck' && T.st.stuck.live) tComplete('stuck', false);
      return;
    }
    if (!tOpen(ev) || !tLevelOk(ev)) return;
    var pre = T_PRE[ev];
    if (pre && !T.st[pre].done) return;
    if (ev === 'hookFire' && !T.st.hookAim.done) return;
    tComplete(ev, T.cur !== ev, !!T_AUTO[ev] && T.st[ev].count === 0);
  }
  function tKey(k) {
    if (T.cur !== 'move' || S.screen !== 'play' || S.phase !== 'play' || S.aiming) return;
    if (T.mk[k]) return;
    T.mk[k] = true;
    var n = (T.mk.left ? 1 : 0) + (T.mk.right ? 1 : 0) + (T.mk.up ? 1 : 0);
    snd('tutorialKey', { n: n });
    if (n >= 3) tComplete('move', false);
  }
  function tHideCond(reason) {
    for (var i = 0; i < T_COND.length; i++) {
      var id = T_COND[i], st = T.st[id];
      if (st.live && !st.done) {
        st.live = false;
        if (T.cur === id) T.cur = null;
      }
    }
  }
  function tSkip(id) {
    var st = T.st[id]; if (!tOpen(id)) return;
    st.skipped = true;
    if (T.cur === id) T.cur = null;
  }
  function tOnDeath(cause) {
    if (S.level === 1 && S.gen === 1 && !T.st.die.done && !T.st.die.skipped) {
      if (!T.st.move.done) { tSkip('move'); tComplete('die', true, true); }
      else tComplete('die', T.cur !== 'die');
    }
  }
  function tOnWin() {
    T_MAIN.forEach(function (id) { if (T_LEVEL[id] === S.level) tSkip(id); });
    T.fx = null; T.cur = null;
  }
  function tAnchor(def, useFx) {
    try {
      var f = useFx ? def.fxAnchor : def.anchor;
      return f ? f() : null;
    } catch (e) { console.error(e); return null; }
  }
  function tDrawState() {
    var id, d, a, fx = null, done = 0, pop = 1, pressed;
    if (T.fx && (S.phase === 'play' || S.phase === 'dying')) {
      fx = T.fx; id = fx.id; d = TD[id];
      a = tAnchor({ anchor: fx.fxAnchor }, false) || fx.last;
      if (a) fx.last = a;
      done = Math.max(0.001, Math.min(1, fx.t / TUT_FX_T));
      pressed = id === 'move' ? [true, true, true] : d.keys.map(function () { return false; });
    } else if (T.cur && S.phase === 'play') {
      id = T.cur; d = TD[id];
      a = tAnchor(d, false);
      pop = Math.min(1, T.popT / TUT_POP_T);
      pressed = id === 'move' ? [T.mk.left, T.mk.right, T.mk.up] : d.keys.map(function () { return false; });
    } else return null;
    if (!a) return null;
    var mark = null;
    if (d.mark) { try { mark = d.mark(); } catch (e) { console.error(e); mark = null; } }
    // 世界錨點 → 畫面座標; above 放不下(泡泡頂緣 < 56, 壓到 HUD)就改 below, 錨點改腳底中點
    // 觸控模式: 全部是畫布座標, 錨點 = (世界 − 鏡頭) × 2.1, tail × 1.4, 泡泡 scale 1.4
    var touch = isTouch(), sc = touch ? TK : 1;
    var bounds = touch ? { x: 12, y: 75.2, w: CW - 24, h: 632.8 } : { x: 12, y: 56, w: 1256, h: 652 };
    var tail = a.tail * sc;
    var place = a.place || 'above', ax = w2sx(a.x), ay = w2sy(a.y);
    if (place === 'above' && ay - tail - 52 * sc < bounds.y) {
      place = 'below';
      if (a.alt) { ax = w2sx(a.alt.x); ay = w2sy(a.alt.y); }
    }
    // 觸控模式: 提到按鍵的字換成按鈕名; 手機沒有 Esc, 「卡住了」改指向選單鍵
    var tx = d.text, tk = d.keys.slice(), av = TUT_AVOID, av2 = null;
    if (touch) {
      tx = tx.replace(' 按 Z', ' 按');   // 後面的鍵帽在手機上畫成勾爪圖示
      if (id === 'hookFire') { tx = '蓄滿 再按「發射」'; tk = []; }
      if (id === 'stuck') { tx = '卡住了? 點選單重來'; tk = []; }
      av = TOUCH_MENU;
      av2 = touchDpadBox();
    }
    return { stage: id, text: tx, keys: tk, pressed: pressed.slice(0, tk.length), ax: ax, ay: ay, place: place, tail: tail,
      pop: pop, finishing: !!fx, done: fx ? done : 0, mark: mark,
      avoid: { x: av.x, y: av.y, w: av.w, h: av.h }, avoid2: av2, scale: sc, bounds: bounds };
  }

  function render(ctx) {
    ctx.clearRect(0, 0, CW, CH);
    ctx.save();
    // 設計區置中, 座標維持 1280 設計值; 觸控模式的遊玩畫面用滿整張畫布, 不平移
    if (!(isTouch() && S.screen === 'play')) ctx.translate(OX, 0);
    var vr = { vx: -OX, vy: 0, vw: CW, vh: 720 };   // 可見範圍(電腦版 OX = 0 → 0, 0, 1280, 720)
    try {
      if (S.screen === 'title') Art.drawTitle(ctx, { t: S.titleT, vx: vr.vx, vy: vr.vy, vw: vr.vw, vh: vr.vh });
      else if (S.screen === 'unlock') Art.drawUnlockPage(ctx, { ability: S.unlockAbility, vx: vr.vx, vy: vr.vy, vw: vr.vw, vh: vr.vh });
      else if (S.screen === 'ending') Art.drawEnding(ctx, { vx: vr.vx, vy: vr.vy, vw: vr.vw, vh: vr.vh });
      else if (S.screen === 'play') {
        if (S.phase === 'win' && S.replay) drawReplay(ctx); else drawPlay(ctx);
      }
      drawSoundIconFor(ctx);
    } finally { ctx.restore(); }
  }

  // ===== 輸入(只有鍵盤) =====
  function onSpace() {
    if (S.screen === 'title') {
      snd('uiPage');
      S.level = 1; startLevel('first');
    } else if (S.screen === 'unlock') {
      snd('uiPage');
      S.level++; startLevel('first');
    } else if (S.screen === 'ending') {
      snd('uiPage');
      S.level = 1; startLevel('first');
    } else if (S.screen === 'play') {
      if (S.phase === 'win') {
        var lv = S.level;
        if (lv === 1 && !S.shown.hook) { S.shown.hook = true; showUnlock('hook'); }
        else if (lv === LEVEL_COUNT) {
          snd('uiPage');
          setScreen('ending'); music('ending');
          if (window.PVDX) PVDX.gameClear();
        } else { snd('uiPage'); S.level++; startLevel('first'); }
      } else if (S.phase === 'lose') {
        snd('uiPage');
        startLevel('retry');
      }
    }
  }
  function showUnlock(ab) {
    S.unlockAbility = ab;
    setScreen('unlock'); music('title');
    snd('unlock');
  }
  function toggleMute() {
    S.muted = !S.muted;
    try {
      if (window.Sound) {
        if (Sound.setMuted) Sound.setMuted(S.muted);
        else if (Sound.toggleMute) Sound.toggleMute();
        else if (Sound.mute) Sound.mute(S.muted);
      }
    } catch (e) { console.error(e); }
  }
  // 鍵盤與觸控共用同一條輸入路徑: 鍵名 left / right / up / down / space / z / x / esc / m
  var CODE2NAME = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down', Space: 'space', KeyZ: 'z', KeyX: 'x', KeyM: 'm', Escape: 'esc' };
  function refreshJump() { keys.jump = jumpDown.ArrowUp; if (keys.jump) cmd.jump = true; }
  function inputDown(k) {
    if (window.PVDX && PVDX.paused) return;
    if (!firstInput) {
      firstInput = true;
      try { if (window.Sound && Sound.init) Sound.init(); } catch (er) { console.error(er); }
    }
    if (k === 'm') { toggleMute(); return; }
    // --- 暫停選單: 只有 Esc / ↑ ↓ / 空白 / M 有作用 ---
    if (S.paused) {
      if (k === 'esc') closePause('resume', 'key');
      else if (k === 'up') { if (S.pauseSel > 0) { S.pauseSel = 0; snd('menuMove'); } }
      else if (k === 'down') { if (S.pauseSel < 1) { S.pauseSel = 1; snd('menuMove'); } }
      else if (k === 'space') closePause(S.pauseSel === 0 ? 'resume' : 'restart', 'key');
      return;
    }
    if (k === 'esc') { openPause(); return; }   // 只有遊玩中(含瞄準)有效
    if (k === 'space') {
      // 遊玩中空白鍵沒有作用; 其他畫面: 確認 / 繼續
      if (!(S.screen === 'play' && (S.phase === 'play' || S.phase === 'dying'))) onSpace();
      return;
    }
    if (k === 'up') { if (S.screen === 'play' && S.phase === 'play' && !S.aiming) { jumpDown.ArrowUp = true; refreshJump(); tKey('up'); } return; }
    if (k === 'left') {
      keys.left = true; tKey('left');
      return;
    }
    if (k === 'right') {
      keys.right = true; tKey('right');
      return;
    }
    if (S.screen !== 'play') return;
    if (k === 'z') { if (S.phase === 'play') cmd.z = true; }
    else if (k === 'x') { if (S.phase === 'play') cmd.x = true; }
  }
  function inputUp(k) {
    if (k === 'left') keys.left = false;
    else if (k === 'right') keys.right = false;
    else if (k === 'up') { jumpDown.ArrowUp = false; refreshJump(); }
  }
  function inputReset() { keys.left = keys.right = false; jumpDown.ArrowUp = false; keys.jump = false; }
  window.inputDown = inputDown; window.inputUp = inputUp; window.inputReset = inputReset;
  // 觸控層(touch.js)依目前畫面決定要顯示哪些按鈕、暫停時還原靜音用
  // hookable: 此刻按 Z(觸控的 A 鈕)會進入瞄準
  window.jjState = function () {
    var hk = false;
    try { hk = S.screen === 'play' && S.phase === 'play' && !S.paused && !S.aiming && hookUnlocked(S.level) && !!S.P && !!S.ghost && hookableNow(); } catch (e) { hk = false; }
    return { screen: S.screen, phase: S.phase, paused: S.paused, aiming: S.aiming, charge: S.aiming ? S.charge : 0, level: S.level, muted: S.muted, hookable: !!hk };
  };
  // 觸控模式、暫停選單開著時, 直接點選項(規則 43f); 電腦版不收 pointer
  function onPointerDown(e) {
    if (!isTouch() || !S.paused || (window.PVDX && PVDX.paused)) return;
    var r = canvas.getBoundingClientRect();
    if (!(r.width > 0) || !(r.height > 0)) return;
    if (e.cancelable) e.preventDefault();
    var cx = (e.clientX - r.left) * CW / r.width, cy = (e.clientY - r.top) * CH / r.height;
    var mx = (cx - CW / 2) / TK + 640, my = (cy - 360) / TK + 360;
    function inR(a) { return mx >= a[0] && mx <= a[0] + a[2] && my >= a[1] && my <= a[1] + a[3]; }
    if (!firstInput) { firstInput = true; try { if (window.Sound && Sound.init) Sound.init(); } catch (er) { console.error(er); } }
    if (inR(PAUSE_HIT.resume)) { S.pauseSel = 0; closePause('resume', 'tap'); }
    else if (inR(PAUSE_HIT.restart)) { S.pauseSel = 1; closePause('restart', 'tap'); }
  }
  function onKeyDown(e) {
    var n = CODE2NAME[e.code];
    if (!n) return;
    e.preventDefault();
    if (e.repeat) return;
    inputDown(n);
  }
  function onKeyUp(e) {
    var n = CODE2NAME[e.code];
    if (!n) return;
    e.preventDefault();
    inputUp(n);
  }

  // ===== 啟動 =====
  var canvas, ctx;
  function resize() {
    // 以容器(視窗 / iframe)寬高算最大等比尺寸, 置中靠 body 的 flex; 多出的留黑邊
    var cw = window.innerWidth || document.documentElement.clientWidth, ch = window.innerHeight || document.documentElement.clientHeight;
    var s = Math.min(cw / CW, ch / CH);
    if (!(s > 0)) s = 1;
    var dpr = window.devicePixelRatio || 1;
    canvas.style.width = Math.floor(CW * s) + 'px';
    canvas.style.height = Math.floor(CH * s) + 'px';
    canvas.width = Math.round(CW * s * dpr);
    canvas.height = Math.round(CH * s * dpr);
    ctx.setTransform(canvas.width / CW, 0, 0, canvas.height / CH, 0, 0);
  }
  var last = 0, acc = 0, booted = false;
  function frame(ts) {
    requestAnimationFrame(frame);
    try {
      // touch.js 在 game.js 之後載入, 開網頁當下讀不到 PVDX; 觸控專用監聽延到第一個畫格
      if (!booted) {
        booted = true;
        if (isTouch()) canvas.addEventListener('pointerdown', onPointerDown);
      }
      var dt = last ? (ts - last) / 1000 : DT;
      last = ts;
      if (dt > 1 / 30) dt = 1 / 30;
      if (dt < 0) dt = 0;
      if (!(window.PVDX && PVDX.paused)) {
        if (S.screen === 'title') S.titleT += dt;
        acc += dt;
        var n = 0;
        while (acc >= DT && n < 4) { step(); acc -= DT; n++; }
        if (n === 4) acc = 0;
      }
      render(ctx);
      if (window.PVDX) PVDX.draw(ctx);
    } catch (e) { console.error(e); }
  }
  function boot() {
    canvas = document.getElementById('c');
    ctx = canvas.getContext('2d');
    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('orientationchange', resize);
    window.addEventListener('keydown', function (e) { onKeyDown(e); });
    window.addEventListener('keyup', function (e) { onKeyUp(e); });
    window.addEventListener('blur', inputReset);
    music('title');
    requestAnimationFrame(frame);
  }
  if (typeof document !== 'undefined' && document.getElementById) boot();
})();
