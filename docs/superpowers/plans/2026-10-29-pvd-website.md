# PVD計畫網站 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把定案原型做成可上線的網站：4 款真遊戲、匿名留言、投票（含截止、結果、同票由後台指定）、後台、亮/暗主題 AB 分組與 PostHog 數據。

**Architecture:** `site/` 是不需建置的靜態站（原生 ES modules，hash 路由沿用原型），Cloudflare Pages 直接發布；`functions/api/` 是 Pages Functions，資料放 D1。純邏輯拆成小模組用 `node --test` 測（D1 用 `node:sqlite` 寫的相容層），整站用 `wrangler pages dev` + `playwright-core`（本機 Chrome）跑 e2e。

**Tech Stack:** Node 24、Cloudflare Pages / Pages Functions / D1 / Turnstile / Access、PostHog JS（CDN 片段載入）、wrangler、playwright-core。

**Spec:** `docs/superpowers/specs/2026-10-29-pvd-website-design.md`；畫面依據 `docs/prototype/index.html`；遊戲規範 `docs/遊戲接入規範.md`。

## Global Constraints

- 所有使用者看得到的文字用繁體中文，文案照原型與 spec 逐字（例：「投票已結束，但遊戲仍可以試玩」「留言功能暫時無法使用」「僅支援電腦遊玩」「哪一款遊戲你希望開發者繼續做完?」「M/D(週) HH:mm 截止」）。
- 網站自己的本機儲存鍵一律 `pvd:` 開頭（`pvd:played`、`pvd:av`、`pvd:theme`）。
- 投票期間任何 API 回應都不能含票數；只有 `/api/admin/*` 例外。
- 留言最多 120 字；頻率限制：同訪客 30 秒 1 則、每小時 20 則；同 IP 每小時 60 則。
- 訪客 cookie：`pvd_vid`，`HttpOnly; Secure; SameSite=Lax; Max-Age=31536000; Path=/`。
- 時間一律存 UTC 毫秒；顯示用台灣時間（`Asia/Taipei`）。
- 觸控判斷 `(hover: none) and (pointer: coarse)`；手機版型斷點 `max-width: 720px`。
- 遊戲區：`touch-action: none; overscroll-behavior: contain`，禁止選字與長按選單。
- 不引入前端框架、不需建置；只有 dev 依賴 `wrangler`、`playwright-core`。
- Commit 格式 `[feat] [PVD網站] 內容`（測試相關 `[test]`，文件 `[docs]`），一行標題，結尾附 Co-Authored-By 與 Claude-Session 兩行。

## Review Focus

1. **投票截止那一刻**：前端倒數歸零時要自動向伺服器重抓狀態並切成結果，不能停在 00:00:00；截止後送出的票伺服器要拒絕（409）。→ Task 8 測「截止後投票 409」、Task 9 e2e 測「倒數歸零自動切結果」。
2. **同票 / 零票**：0 票或最高票同票時不能顯示任何勝出卡或票數，只顯示「結果統計中」，直到後台指定。→ Task 8 測 `winnerOf`。
3. **留言 XSS 與奇怪輸入**：`<script>`、純空白、超過 120 字、控制字元。→ Task 5 測。
4. **手機玩到一半轉回直向**：iframe 不能被重新載入（遊戲進度不能丟）。→ Task 3 e2e 測 iframe 同一個 `contentWindow` 物件。
5. **API 失敗**（離線、Turnstile 腳本被擋、500）：留言與投票要顯示錯誤字樣且保留輸入，不可吞掉。→ Task 6、Task 9 e2e 用攔截回 500 測。

---

## 檔案結構

```
package.json, wrangler.toml, .gitignore, .dev.vars.example
migrations/0001_init.sql
site/
  index.html                首頁 + 子頁骨架（自原型拆出）
  css/site.css              原型樣式（去掉原型專用的 da/dc/db2 與 .demo）
  js/config.js              SITE / VIDEO 設定（影片檔名、接播秒數、標題位置、Turnstile/PostHog 公開金鑰）
  js/games.js               4 款遊戲資料（前後端共用）
  js/store.js               pvd: 本機儲存
  js/format.js              倒數拆解、截止日字樣、跳脫
  js/router.js              hash 解析
  js/api.js                 呼叫 /api 的薄包裝 + Turnstile
  js/home.js shell.js play.js comments.js vote.js develop.js gamepage.js theme.js analytics.js main.js
  js/markdown.js            開發頁文字檔解析
  content/develop.md        開發頁內容（使用者自己改）
  media/                    影片
  games/<代號>/              由 tools/sync-games.mjs 複製
  admin/index.html, admin/admin.js
functions/
  api/_middleware.js        訪客 cookie、錯誤包裝
  api/state.js              GET 投票狀態
  api/vote.js               POST 投票
  api/comments.js           GET/POST 留言
  api/admin/_middleware.js  Access 驗證
  api/admin/comments.js locks.js rounds.js winner.js
  lib/http.js visitor.js turnstile.js rounds.js comments.js votes.js access.js
tools/sync-games.mjs, tools/posthog-setup.mjs
test/unit/*.test.js, test/helpers/d1.js, test/e2e/*.test.js, test/e2e/server.js
docs/部署說明.md
```

遊戲代號（網址用，定了不改）：`bubble-catcher`（捕泡手）、`slime-tetris`（史萊姆擴張）、`dungeon-zoo`（來馬戲團看一點大場面）、`ghost-echo`（幽影接力）。名稱、介紹、時長、主色先放暫定值，等使用者交素材清單後替換。

---

### Task 1: 專案骨架、資料表與測試用 D1

**Files:**
- Create: `package.json`, `wrangler.toml`, `.gitignore`, `.dev.vars.example`, `migrations/0001_init.sql`, `test/helpers/d1.js`
- Test: `test/unit/schema.test.js`

**Interfaces:**
- Produces: `makeD1(): D1Like` — 用 `node:sqlite` 的 `DatabaseSync(':memory:')` 實作 D1 的 `prepare(sql).bind(...args).first()/all()/run()` 與 `batch(stmts)`，`all()` 回 `{results}`，`run()` 回 `{meta:{changes,last_row_id}}`；建立時自動執行 `migrations/*.sql`。
- Produces 資料表：
  - `rounds(id INTEGER PK, starts_at INTEGER NOT NULL, ends_at INTEGER NOT NULL, winner TEXT)`
  - `votes(round_id INTEGER, vid TEXT, game TEXT, ip_hash TEXT, created_at INTEGER, updated_at INTEGER, PRIMARY KEY(round_id, vid))`
  - `comments(id INTEGER PK, game TEXT, avatar INTEGER, body TEXT, vid TEXT, ip_hash TEXT, created_at INTEGER, deleted INTEGER DEFAULT 0)`，索引 `(game, deleted, created_at)`、`(vid, created_at)`、`(ip_hash, created_at)`
  - `locks(game TEXT PK, locked INTEGER NOT NULL)`

- [ ] **Step 1:** `npm init`，`"type":"module"`；scripts：`test`=`node --test test/unit/`、`e2e`=`node --test --test-concurrency=1 test/e2e/`、`dev`=`wrangler pages dev site --d1 DB --port 8788`、`db:local`=`wrangler d1 migrations apply pvd --local`、`sync-games`=`node tools/sync-games.mjs`。`npm i -D wrangler playwright-core`。
- [ ] **Step 2:** `wrangler.toml`：`name="pvd-project"`、`pages_build_output_dir="site"`、`compatibility_date="2026-10-01"`、`[[d1_databases]] binding="DB" database_name="pvd" database_id="local-placeholder" migrations_dir="migrations"`。`.dev.vars.example`：`TURNSTILE_SECRET=1x0000000000000000000000000000000AA`、`IP_SALT=dev-salt`、`ADMIN_DEV_EMAIL=dev@local`、`ACCESS_TEAM=`、`ACCESS_AUD=`。`.gitignore`：`node_modules/ .wrangler/ .dev.vars`。
- [ ] **Step 3: 寫失敗測試** `schema.test.js`：`makeD1()` 後 `SELECT name FROM sqlite_master WHERE type='table'` 含 `rounds votes comments locks`；同 `(round_id,vid)` 插兩次第二次丟錯。
- [ ] **Step 4:** 跑 `npm test`，預期 FAIL（找不到模組）。
- [ ] **Step 5:** 寫 migration 與 `test/helpers/d1.js`。
- [ ] **Step 6:** `npm test` PASS；`npm run db:local` 成功。
- [ ] **Step 7:** Commit `[feat] [PVD網站] 建立專案骨架與資料表`。

### Task 2: 靜態網站拆檔（首頁、頁首、試玩頁、投票頁畫面、開發頁）

把原型拆成正式檔案，行為與原型一致；資料改從 `games.js`、`config.js` 來；投票/留言此時先用 `games.js` 裡沒有的空資料（留言 0 則、投票未連 API 時顯示倒數與選項但點了只改本機），Task 6、9 再接 API。

**Files:**
- Create: `site/index.html`, `site/css/site.css`, `site/js/{config,games,store,format,router,home,shell,play,vote,develop,markdown,theme,main}.js`, `site/content/develop.md`, `site/media/*`（自 `docs/prototype/media` 複製）
- Test: `test/unit/format.test.js`, `test/unit/router.test.js`, `test/unit/markdown.test.js`

**Interfaces:**
- `games.js`：`export const GAMES = [{ code, name, time, mobile:boolean, bg, fg, intro, icon:null|string, letter }]`，`export const GAME_CODES`，`export const byCode(code)`。
- `config.js`：`export const VIDEO = { light:{ landscape:{src:'media/pvd-light.mp4', start:0.8, titleTop:435}, portrait:null }, dark:{ landscape:{src:'media/pvd-dark.mp4', start:0.8, titleTop:435}, portrait:null } }`；`export const SITE = { turnstileSiteKey:'1x00000000000000000000BB', posthogKey:'', posthogHost:'https://us.i.posthog.com', themeToggle:true }`。
- `store.js`：`get(key, dflt)`、`set(key, val)`，實際鍵 `'pvd:' + key`，全包 try/catch。
- `format.js`：`splitCountdown(ms) -> {d,h,m,s}`（負數歸零）、`deadlineLabel(utcMs) -> '11/8(日) 20:00 截止'`（台灣時間）、`esc(str)`。
- `router.js`：`parse(hash) -> {page:'home'|'play'|'vote'|'develop'|'game', arg:string|null}`；未知頁或未知遊戲代號的 `game` → `home`。
- `markdown.js`：`parseDevelop(text) -> { meta:{更新日期,標題,工作室,工作室英文,工作室簡介,LOGO,連結:[{label,url}]}, sections:[{title, html}] }`；支援 `---` front matter（`鍵: 值`；`連結:` 下一行起 `- 名稱 | 網址`）、`## 標題` 分段、空行分段落、單行換行轉 `<br>`、`**粗體**`、`[字](網址)`（只允許 http/https）；其他一律跳脫。
- `theme.js`：`applyTheme('light'|'dark')`（切 `:root.dark.db` 與影片來源）。Task 10 再補分組邏輯。

- [ ] **Step 1: 寫失敗測試**
  - `format.test.js`：`splitCountdown(((3*24+14)*60+22)*60000+9000)` → `{d:3,h:14,m:22,s:9}`；`splitCountdown(-5)` → 全 0；`deadlineLabel(Date.UTC(2026,10,8,12,0))` → `'11/8(日) 20:00 截止'`；`esc('<a "x">&')` → `'&lt;a &quot;x&quot;&gt;&amp;'`。
  - `router.test.js`：`parse('#game/slime-tetris')` → `{page:'game',arg:'slime-tetris'}`；`parse('#game/nope')` → `{page:'home',arg:null}`；`parse('')` → home；`parse('#play/dungeon-zoo')` → play + arg。
  - `markdown.test.js`：front matter 讀出 `更新日期`、兩個連結；`## 目前開發狀況` 成為 section；`**11 月：**` → `<b>`；`<script>` 被跳脫；`[x](javascript:alert(1))` 不產生連結。
- [ ] **Step 2:** `npm test` FAIL。
- [ ] **Step 3:** 實作上述模組；`site.css` 取原型 `<style>` 全文，刪除 `.da/.dc/.db2/--dimf` 與 `.demo` 規則，保留 `.thm`（`SITE.themeToggle` 為 true 才插入切換鈕）。`index.html` 取原型 HTML（Noto Sans TC 字型連結照舊），文字介紹區保留原型示意文案與「示意文案・正式版待提供」標籤。`home.js` 搬原型首頁腳本，影片來源、`START`、標題 top 改讀 `VIDEO`（有 `portrait` 且直排時直接播直版，不做翻回橫排動畫）。`develop.js` fetch `content/develop.md` → `parseDevelop` → 照原型 4a 結構渲染（LOGO 為空時顯示原型的虛線框）。`develop.md` 先放原型示意內容。
- [ ] **Step 4:** `npm test` PASS。
- [ ] **Step 5: 目視驗證**：`npm run dev`，用 Chrome headless 截 1280×800 與 390×844 的 `#`、`#play`、`#vote`、`#develop`，亮暗各一，與 `docs/prototype/index.html` 同尺寸截圖逐張比對，除資料文字外版面一致。
- [ ] **Step 6:** Commit `[feat] [PVD網站] 將定案原型拆成正式網站檔案`。

### Task 3: 遊戲接入與遊玩頁

**Files:**
- Create: `tools/sync-games.mjs`, `site/js/gamepage.js`, `site/games/<代號>/`（由腳本產生並 commit）, `test/e2e/server.js`, `test/e2e/game.test.js`
- Modify: `site/index.html`（遊玩頁佔位畫面換成 iframe 容器）、`site/js/main.js`

**Interfaces:**
- `tools/sync-games.mjs`：來源對照表 `{ 'bubble-catcher':'E:/Project/Game/WebGame_BubbleCatcher/game', 'slime-tetris':'E:/Project/Game/WebGame_SlimeTetris/game', 'dungeon-zoo':'E:/Project/Game/WebGame_DungeonZoo/polish/game/game', 'ghost-echo':'E:/Project/Game/WebGame_GhostEchoV2/polish/game/game' }`；先清空目標再整個複製；任一檔案 > 25MB 就失敗退出並列出檔名。可帶參數只同步一款。
- `gamepage.js`：`enterGame(code)`、`leaveGame() -> seconds|null`；送 `{type:'pvd:pause'}` / `{type:'pvd:resume'}` 給 iframe（`targetOrigin = location.origin`）；接收同源 `pvd:finish` 時呼叫 `onFinish(code)` 回呼（Task 10 接數據）。
- `test/e2e/server.js`：`startServer() -> {url, stop()}`，以 `wrangler pages dev site --port 0 --d1 DB --persist-to <暫存資料夾>` 啟動並先套 migration；`openBrowser(opts) -> {browser, page}`，`playwright-core` 用 `C:/Program Files/Google/Chrome/Application/chrome.exe`。

行為：進入 `#game/<代號>` → 記 `pvd:played`；電腦或手機橫拿時才設 iframe `src="/games/<代號>/index.html"`；手機直拿只顯示轉向提示，iframe 不建立；已載入後轉回直向 → 隱藏遊戲區（不移除 iframe）並送 pause，轉橫送 resume；分頁隱藏/顯示同理；離開遊玩頁移除 iframe。

- [ ] **Step 1:** 寫 `sync-games.mjs`，跑 `npm run sync-games`，確認 4 個資料夾都有 `index.html`。
- [ ] **Step 2: 寫失敗 e2e**（`game.test.js`）：
  - 1280×800 開 `#game/slime-tetris` → iframe `src` 結尾 `/games/slime-tetris/index.html`，iframe 內 `document.title` 含「史萊姆擴張」；`localStorage['pvd:played']` 含 `slime-tetris`。
  - 手機橫向 844×390（`hasTouch`、`isMobile`）載入後取 `iframe.contentWindow` 的標記（在 iframe 內設 `window.__mark=1`），切到 390×844 再切回 844×390，`__mark` 仍為 1（沒重新載入）。
  - 手機直向 390×844 直接開 → 沒有 iframe，看得到「把手機轉成橫向」。
  - 按「‹ 返回」→ hash 為 `#play/slime-tetris`。
- [ ] **Step 3:** 跑 `npm run e2e` FAIL。
- [ ] **Step 4:** 實作 `gamepage.js` 與 server 輔助。
- [ ] **Step 5:** `npm run e2e` PASS。
- [ ] **Step 6:** Commit `[feat] [PVD網站] 1.接入4款遊戲 2.完成遊玩頁轉向與暫停`。

### Task 4: API 共用層（訪客 cookie、IP 雜湊、Turnstile、回應格式）

**Files:**
- Create: `functions/lib/{http,visitor,turnstile}.js`, `functions/api/_middleware.js`
- Test: `test/unit/visitor.test.js`, `test/unit/turnstile.test.js`

**Interfaces:**
- `http.js`：`json(data, status=200, headers={})`、`fail(status, code, message)` → `{error:{code,message}}`；`readJson(request, maxBytes=4096)`（超過或格式錯 → 丟 `HttpError(400,'bad_json')`）；`class HttpError`。
- `visitor.js`：`getVisitor(request) -> {vid, isNew}`（cookie 缺或格式不符 `/^[A-Za-z0-9_-]{22}$/` 就新產生 16 bytes base64url）；`visitorCookie(vid) -> string`；`ipHash(request, salt) -> Promise<string>`（`CF-Connecting-IP`，SHA-256 hex 前 32 字）。
- `turnstile.js`：`verifyTurnstile(token, ip, secret, fetchFn=fetch) -> Promise<boolean>`（POST `https://challenges.cloudflare.com/turnstile/v0/siteverify`，token 空直接 false）。
- `_middleware.js`：把 `vid`、`ipHash` 放進 `context.data`；新訪客在回應加 `Set-Cookie`；攔 `HttpError` 轉 `fail`，其他錯誤回 500 `server_error`；所有 `/api` 回應加 `Cache-Control: no-store`。

- [ ] **Step 1: 寫失敗測試**：無 cookie → `isNew:true` 且 vid 22 字；合法 cookie 沿用；`visitorCookie` 含 `HttpOnly`、`Secure`、`SameSite=Lax`、`Max-Age=31536000`、`Path=/`；`ipHash` 同 IP 同鹽相同、不同鹽不同；`verifyTurnstile` 用假 fetch：`{success:true}` → true、`{success:false}` → false、空 token 不呼叫 fetch 回 false。
- [ ] **Step 2:** FAIL → **Step 3:** 實作 → **Step 4:** PASS。
- [ ] **Step 5:** Commit `[feat] [PVD網站] 建立API共用層與訪客識別`。

### Task 5: 留言 API 與鎖留言

**Files:**
- Create: `functions/lib/comments.js`, `functions/api/comments.js`
- Test: `test/unit/comments.test.js`

**Interfaces:**
- `lib/comments.js`：
  - `cleanBody(text) -> string|null`：去頭尾空白、移除控制字元（保留一般換行以外的都去掉，換行轉空白）、空字串回 null、超過 120 字（以 `[...str].length` 計）回 null。
  - `listComments(db, game, limit=200) -> [{id, avatar, body, createdAt}]`（新到舊，排除已刪）。
  - `countComments(db, game) -> number`。
  - `isLocked(db, game) -> boolean`、`lockedGames(db) -> string[]`。
  - `checkRate(db, vid, ipHash, now) -> null | 'too_fast' | 'hour_limit' | 'ip_limit'`（30 秒內 ≥1、1 小時內 ≥20、同 IP 1 小時 ≥60）。
  - `addComment(db, {game, avatar, body, vid, ipHash, now}) -> {id, avatar, body, createdAt}`。
- `GET /api/comments?game=<代號>` → `{game, locked, count, comments}`；代號不存在 → 404 `unknown_game`。
- `POST /api/comments` body `{game, avatar:0-7, body, token}` → 201 `{comment}`；錯誤碼：`unknown_game`(404)、`locked`(403)、`bad_body`(400)、`bad_avatar`(400)、`turnstile`(403)、`too_fast`/`hour_limit`/`ip_limit`(429)。檢查順序：遊戲 → 鎖 → 內容 → 頻率 → Turnstile。

- [ ] **Step 1: 寫失敗測試**（`makeD1` + 直接呼叫 handler `onRequestGet/onRequestPost`，Turnstile 用注入的假驗證）：
  - 正常送出後 GET 看得到，新的排最前面，`count` 正確。
  - `body:'<script>x</script>'` 存入原字串（前端負責跳脫），回應不加工。
  - `'   '` → 400 `bad_body`；121 字 → 400；120 個中文字 → 201。
  - 同訪客 10 秒內第二則 → 429 `too_fast`；同訪客已 20 則（間隔 > 30 秒）→ 429 `hour_limit`。
  - `locks` 設 `slime-tetris` 鎖 → POST 403 `locked`，GET `locked:true` 且既有留言照常回傳。
  - 已刪除的留言不出現在 GET，也不算進 `count`。
- [ ] **Step 2:** FAIL → **Step 3:** 實作（handler 從 `context.env.TURNSTILE_SECRET` 驗；測試以 `context.data.verify` 注入假函式，正式路徑預設用 `verifyTurnstile`）→ **Step 4:** PASS。
- [ ] **Step 5:** Commit `[feat] [PVD網站] 完成留言API與鎖留言`。

### Task 6: 前端留言板接 API

**Files:**
- Create: `site/js/api.js`, `site/js/comments.js`
- Modify: `site/js/play.js`
- Test: `test/e2e/comments.test.js`

**Interfaces:**
- `api.js`：`getJSON(path)`、`postJSON(path, body)`（非 2xx 丟 `ApiError{status, code}`）；`turnstileToken() -> Promise<string>`（載入 `https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit`，隱形模式 `execution:'execute'`、`appearance:'interaction-only'`，每次取完 `reset`；腳本載不到 8 秒逾時丟 `ApiError{code:'turnstile'}`）。
- `comments.js`：`loadComments(code) -> {locked,count,comments}`（每款快取，切回來重抓）、`renderBoard(container, code)`、`submit(form)`。錯誤字樣：`too_fast`→「留言太快了，請等 30 秒再試」、`hour_limit`→「這一小時留言次數已達上限」、`ip_limit`→同上、`locked`→直接重畫成「留言功能暫時無法使用」、`turnstile`→「驗證沒有通過，請再試一次」、其他→「送出失敗，請稍後再試」。錯誤時保留輸入框文字，提示顯示在表單下方一行（`role="alert"`）。送出中按鈕停用。

- [ ] **Step 1: 寫失敗 e2e**：電腦版選 `slime-tetris` → 送「好玩」→ 留言區第一則是「好玩」、則數 +1；另開新瀏覽器 context 看得到；連送第二則 → 看到「留言太快了」且輸入框仍是原字；直接在 D1 鎖 `dungeon-zoo` → 選它看到「留言功能暫時無法使用」、沒有輸入框；攔截 `/api/comments` POST 回 500 → 看到「送出失敗，請稍後再試」且文字保留；手機版抽屜內送出同樣成功；留言 `<img src=x onerror=alert(1)>` 以純文字顯示。
- [ ] **Step 2:** FAIL → **Step 3:** 實作 → **Step 4:** PASS。
- [ ] **Step 5:** Commit `[feat] [PVD網站] 留言板串接API`。

### Task 7: 後台（Access 驗證、留言管理、鎖留言、UTM 連結產生）

**Files:**
- Create: `functions/lib/access.js`, `functions/api/admin/{_middleware,comments,locks}.js`, `site/admin/index.html`, `site/admin/admin.js`
- Test: `test/unit/access.test.js`, `test/unit/admin.test.js`

**Interfaces:**
- `access.js`：`verifyAccess(request, env, fetchFn=fetch) -> Promise<string|null>`（回 email）：讀 `Cf-Access-Jwt-Assertion`，RS256 驗簽（金鑰取 `https://<ACCESS_TEAM>.cloudflareaccess.com/cdn-cgi/access/certs`，以 `kid` 對應，模組內快取 10 分鐘），檢查 `aud` 含 `ACCESS_AUD`、`exp` 未過；`env.ADMIN_DEV_EMAIL` 有值且請求來自 `localhost`/`127.0.0.1` 時直接回該值。
- 後台 middleware：驗不過 → 401 `unauthorized`。
- `GET /api/admin/comments?game=` → 含已刪除的全部留言（帶 `deleted`）；`DELETE /api/admin/comments?id=` → 軟刪除。
- `GET /api/admin/locks` → `{<代號>:boolean}`；`PUT /api/admin/locks` body `{game, locked}`。
- 後台頁（`/admin/`）：分頁籤「留言」「投票」「連結產生」。留言：選遊戲、列表、刪除鈕（確認用頁內兩段式按鈕，不用 `confirm()`）、鎖留言開關。連結產生：輸入平台、活動、貼文代號 → 產生 `https://<目前網域>/?utm_source=..&utm_campaign=..&utm_content=..` 與複製鈕，值自動轉小寫、空白換 `-`。投票分頁在 Task 8 補。

- [ ] **Step 1: 寫失敗測試**：用 `crypto.subtle.generateKey` 產 RSA 金鑰自簽 JWT，假 fetch 回 JWKS：正確 → 回 email；`aud` 不對、過期、簽章被改 → null；`ADMIN_DEV_EMAIL` + localhost → 回 dev email、同設定但網域非 localhost → 走 JWT 驗證。admin handler：刪除後公開 GET 看不到、後台 GET 看得到且 `deleted:1`；PUT 鎖後公開 POST 403。
- [ ] **Step 2:** FAIL → **Step 3:** 實作 → **Step 4:** PASS。
- [ ] **Step 5:** 本機開 `/admin/` 手動走一次：刪除、鎖、連結產生。
- [ ] **Step 6:** Commit `[feat] [PVD網站] 1.完成後台登入驗證 2.完成留言管理與鎖留言 3.新增UTM連結產生`。

### Task 8: 投票 API、輪次與同票指定

**Files:**
- Create: `functions/lib/{rounds,votes}.js`, `functions/api/{state,vote}.js`, `functions/api/admin/{rounds,winner}.js`
- Modify: `site/admin/admin.js`, `site/admin/index.html`（投票分頁）
- Test: `test/unit/votes.test.js`

**Interfaces:**
- `rounds.js`：`currentRound(db, now) -> round|null`（`starts_at <= now` 中最新的一輪）、`nextRound(db, now) -> round|null`（`starts_at > now` 最早的）、`phaseOf(round, now) -> 'none'|'live'|'ended'`。
- `votes.js`：`castVote(db, {round, vid, ipHash, game, now}) -> {changed:boolean}`（upsert；新票時同 IP 該輪 1 小時內新票 ≥30 → 丟 `HttpError(429,'ip_limit')`）；`tally(db, roundId) -> {counts:{<代號>:n}, total}`（4 款都要有鍵，0 也列）；`winnerOf(counts, adminWinner) -> code|null`（`adminWinner` 有值就用它；否則唯一最高票；同票或總數 0 → null）；`myVote(db, roundId, vid) -> code|null`。
- `GET /api/state` → `{ now, phase, round:{id,startsAt,endsAt}|null, next:{startsAt}|null, myVote, locks:[代號], results }`；`results` 只在 `phase==='ended'` 時有值：`winner` 為 null 時 `{pending:true}`（**不含票數**），否則 `{pending:false, winner, counts, total}`。
- `POST /api/vote` body `{game, token}` → `{myVote, changed}`；錯誤：`no_round`(409)、`ended`(409)、`unknown_game`(404)、`turnstile`(403)、`ip_limit`(429)。
- 後台：`GET /api/admin/rounds` → 所有輪次含 `tally` 與 `tie:boolean`；`POST /api/admin/rounds` `{startsAt, endsAt}` 新增；`PUT /api/admin/rounds` `{id, startsAt, endsAt}` 修改（`endsAt > startsAt`，否則 400）；`PUT /api/admin/winner` `{roundId, game}`（只允許已結束且同票的輪次，否則 409 `not_tie`）。
- 後台投票分頁：輪次清單（起訖用 `datetime-local` 以台灣時間輸入/顯示）、各款票數、同票時出現「指定勝出」下拉。

- [ ] **Step 1: 寫失敗測試**：
  - 進行中：`GET /api/state` 回應 JSON 字串化後不含 `counts`、`total`；投 A 再改投 B → `changed:true`，`tally` 只有 B 1 票。
  - 截止後 POST → 409 `ended`；沒有任何輪次 → `phase:'none'`、POST 409 `no_round`。
  - 結束且 0 票 → `results:{pending:true}`；2:2 同票 → `pending:true`；後台指定後 → `pending:false, winner` 為指定款且帶票數。
  - `PUT /api/admin/winner` 對非同票輪 → 409 `not_tie`。
  - 第一輪結束、第二輪開始時間在未來 → `phase:'ended'`、`results` 為第一輪、`next.startsAt` 為第二輪；時間到第二輪開始 → `phase:'live'`、`myVote:null`。
  - 同 IP 第 31 個新訪客投票 → 429。
- [ ] **Step 2:** FAIL → **Step 3:** 實作 → **Step 4:** PASS。
- [ ] **Step 5:** Commit `[feat] [PVD網站] 1.完成投票API與輪次 2.後台新增投票管理與同票指定`。

### Task 9: 投票頁與全站結束狀態接 API

**Files:**
- Modify: `site/js/vote.js`, `site/js/main.js`, `site/js/shell.js`, `site/js/play.js`
- Test: `test/e2e/vote.test.js`

**Interfaces:**
- `vote.js`：`loadState()`（存 `offset = state.now - Date.now()`；`phase==='ended'` 時 `document.body.classList.add('vend')`）；倒數以 `Date.now()+offset` 計，歸零時重抓 `loadState()`（失敗每 5 秒重試）；進入投票頁、分頁回到前景時也重抓。
- 進行中：截止字樣 `deadlineLabel(round.endsAt)`；點選即送 `POST /api/vote`，成功後以伺服器回的 `myVote` 打勾；失敗還原原本的勾並顯示一行錯誤（`role="alert"`）：`ended`→重抓狀態切結果、`turnstile`→「驗證沒有通過，請再試一次」、其他→「投票失敗，請稍後再試」。
- 結束且 `pending`：左右兩欄改成一張卡「結果統計中」+ 小字「勝出遊戲將由工作室公布」。結束且有勝出：照原型勝出卡 + 名次長條。
- `phase:'none'`：只顯示「投票尚未開放」。
- 「玩過了」讀 `pvd:played`。

- [ ] **Step 1: 寫失敗 e2e**：用 D1 建一輪「現在 −1 分 ~ 現在 +6 秒」：看到倒數與截止字樣；投 `slime-tetris` 打勾，重新整理仍是它；改投 `ghost-echo` 成功；等倒數歸零後 ≤3 秒內自動切成結果、勝出卡為「幽影接力」（唯一一票）；另建一輪已結束且 0 票 → 看到「結果統計中」；建一輪已結束且 `slime-tetris` 3 票、其他 1 票 → 看到勝出卡「史萊姆擴張」與 4 條長條；V 頁籤出現「End」、試玩頁出現「投票已結束，但遊戲仍可以試玩」；攔截 `/api/vote` 回 500 → 勾選還原且出現「投票失敗，請稍後再試」；手機 390×844 倒數橫排截圖目視檢查。
- [ ] **Step 2:** FAIL → **Step 3:** 實作 → **Step 4:** PASS。
- [ ] **Step 5:** Commit `[feat] [PVD網站] 投票頁串接API與全站投票結束狀態`。

### Task 10: 主題分組與 PostHog 數據

**Files:**
- Create: `site/js/analytics.js`, `test/unit/theme.test.js`, `test/unit/engage.test.js`
- Modify: `site/js/theme.js`, `site/js/main.js`, `site/js/{home,play,gamepage,vote,comments}.js`（插事件）, `site/index.html`（首屏前的主題內嵌小腳本）

**Interfaces:**
- `theme.js`：`pickTheme({stored, forced, flag, rand}) -> {theme, source}`：優先序 `forced`（網址 `?theme=light|dark`，僅供測試，`source:'forced'`）→ `stored` → `flag`（PostHog 旗標 `theme-ab` 的 `light|dark`）→ `rand<0.5?'light':'dark'`（`source:'random'`）。`index.html` `<head>` 內嵌一段同步小腳本：有 `pvd:theme` 就立刻加上 class；沒有就先加 `class="pvd-wait"`（`body{visibility:hidden}`），`main.js` 等 PostHog 旗標最多 1500 ms 後決定、存檔、移除 `pvd-wait`。`SITE.posthogKey` 空時直接隨機。決定後：`posthog.register({theme})` 與 `$set` person property `theme`。
- `analytics.js`：`initAnalytics()`（`SITE.posthogKey` 空 → 所有函式變成空操作）、`track(event, props)`、`trackPage(page)`（hash 路由手動送 `$pageview`）。PostHog 設定 `capture_pageview:false`、`persistence:'localStorage+cookie'`、`autocapture:false`。
- `Engage` 類別（同檔匯出，純邏輯可測）：`new Engage(now)`、`visible(now)`、`hidden(now) -> {fgMs, totalFgMs, interacted}`、`interact()`；分頁隱藏時送 `engaged` 事件（`transport:'sendBeacon'`），屬性 `{fg_ms, total_fg_ms, interacted, page}`。
- 事件名（spec §4.10）：`video_play`、`video_complete`、`play_page_view`、`game_detail_open{game}`、`game_start{game}`、`game_leave{game,seconds}`、`game_finish{game}`、`vote_cast{game,changed}`、`comment_post{game}`、`engaged{...}`。第一次點擊任何連結或按鈕呼叫 `interact()`。
- 此任務完成時 `SITE.themeToggle` 改為 false（切換鈕只在 `?theme=` 測試網址下出現）。

- [ ] **Step 1: 寫失敗測試**：`pickTheme` 四種優先序各一；`rand:0.49`→light、`0.5`→dark；`Engage`：可見 10 秒 → 隱藏回 `fgMs:10000`；再可見 5 秒隱藏 → `fgMs:5000, totalFgMs:15000`；重複呼叫 `hidden` 不重算；`interact()` 後 `interacted:true`。
- [ ] **Step 2:** FAIL → **Step 3:** 實作 → **Step 4:** PASS。
- [ ] **Step 5: e2e 補一條**：攔截 `**/i.posthog.com/**` 收集請求，設定測試用 `posthogKey`，開 `/?utm_source=threads&utm_content=p1#play` → 收到 `$pageview` 含 `utm_source`；點一款 → `game_detail_open`；首次訪問 1.5 秒內頁面可見且 `<html>` 帶主題 class；重新整理主題不變。
- [ ] **Step 6:** Commit `[feat] [PVD網站] 1.主題AB分組 2.串接PostHog事件與停留時間`。

### Task 11: 部署說明與一鍵設定腳本

**Files:**
- Create: `docs/部署說明.md`, `tools/posthog-setup.mjs`, `tools/cf-setup.mjs`

**Interfaces:**
- `tools/cf-setup.mjs`（讀環境變數 `CLOUDFLARE_API_TOKEN`、`CLOUDFLARE_ACCOUNT_ID`）：建立 D1 `pvd` 並把 `database_id` 寫回 `wrangler.toml`、套 migration、建立 Pages 專案 `pvd-project`（連 GitHub 需使用者在網頁授權，腳本印出步驟）、建立 Turnstile widget 並印出 site key / 設 secret、設定 `IP_SALT`（隨機）、`ACCESS_TEAM`、`ACCESS_AUD`。
- `tools/posthog-setup.mjs`（讀 `POSTHOG_PERSONAL_KEY`、`POSTHOG_PROJECT_ID`、`POSTHOG_HOST`）：建立旗標 `theme-ab`（light/dark 各 50%）、兩條漏斗（`$pageview → game_start → vote_cast`、`$pageview → game_start → comment_post`，期限 7 天，依 `utm_source` 分組）、來源×裝置表、主題比較（`engaged.total_fg_ms` 每人最大值的平均、`< 10000` 且 `interacted=false` 的人數比例、`< 30000` 同理），全部放進儀表板「PVD計畫」。
- `docs/部署說明.md`：使用者要做的事（申請帳號、建 API token 需要哪些權限、Access 綁 email、GitHub 授權）逐步清單；我用腳本做的事；換影片、換遊戲（`npm run sync-games`）、改開發頁、設定投票輪次、用連結產生器的方法；各階段測試清單（照 spec §7 表格）。

- [ ] **Step 1:** 寫兩支腳本，`--dry-run` 只印出將送出的請求；跑 dry-run 確認請求內容與上面一致。
- [ ] **Step 2:** 寫 `docs/部署說明.md`。
- [ ] **Step 3:** Commit `[docs] [PVD網站] 1.新增部署說明 2.新增Cloudflare與PostHog設定腳本`。

### Task 12: 全站驗收

- [ ] **Step 1:** `npm test` 與 `npm run e2e` 全過。
- [ ] **Step 2:** Chrome headless 截圖：1280×800、390×844、844×390 × 亮/暗 × 首頁/試玩/投票（進行中、結束、統計中）/開發/遊玩頁，逐張目視；與原型對照差異列清單並修正。
- [ ] **Step 3:** 對照 spec 每一節打勾，未完成的（需要帳號才能做的部署、儀表板實際建立）列入回報。
- [ ] **Step 4:** Commit 修正（如有）。
