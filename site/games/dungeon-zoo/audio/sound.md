# 音效說明(RD 只需讀這份)

## 聲音風格

輕快的卡通馬戲團: 撥弦(pizzicato)/ 鋼鼓短樂句當成就音, 木頭、布料、軟撞擊當動作音, 少量電子音只用在「魔法 / 怪事」(傳送、惹生氣、冷靜、特殊效果)與「警示」(heat_warn)。spec 指定音色的事件例外: 見習過場用馬戲團小號、觀眾聲與大彩炮的「哇」用真人群眾錄音、出口用門鈴「叮咚」; 打磨第 8 輪的表演卡音照 spec 用寫實音(雨聲、蹄聲、低吼、爆竹、煙火)但都短、都壓在 cue_fire 之下。

## 接法

- `index.html` 以 `<script src="audio/sound.js"></script>` 載入(放在 game.js 之前)。全域物件 `window.Sound`, 不是 module
- **開始畫面按 Z 的那一下**呼叫 `Sound.init()`(重複呼叫無害), 接著 `Sound.play('title_start')`
- init 之前的 `play` 一律靜默丟棄、不報錯; init 之前的 `playMusic` / `setCrowd` 會**記住最後一個**, init 時才開始播(所以開始畫面一出現就可以呼叫 `playMusic('title')`)
- 未知事件名、未知曲名、未知熱度段: 靜默忽略(未知熱度段視同安靜)
- `setMuted(bool)` 同時關音樂、音效與觀眾聲; `isMuted()` 給「聲音 開 / 關」按鈕顯示用
- 事件名照 interface.json(底線小寫), 不是小駝峰; 這是 interface.json 已定死的名稱, 這裡沿用

### 契約外的兩個介面(打磨第 3 輪新增, 沿用不變)

| 介面 | 用途 | 何時呼叫 |
|---|---|---|
| `Sound.setCrowd(tier)` | 表演場的循環觀眾聲。`tier`: `'quiet'` / `'clap'` / `'cheer'` / `'frenzy'`(直接傳 spec 的熱度段名; `''` 或 `'quiet'` = 沒有觀眾聲) | 開演時依開演熱度段呼叫一次, 之後熱度**換段**時呼叫(每幀呼叫同一段也無害, 不會重頭)。換段自動 0.4 秒交叉淡入淡出; 傳 `''` / `'quiet'` 時 0.3 秒淡出 |
| `Sound.setMusicDuck(bool)` | 出口詢問框、拿到卡過場、暫停式引導開著時背景音樂壓到一半 | 詢問框 / 過場跳出時 `true`、關掉時 `false`。**大多數情況不接也可以**: `play('exit_prompt')`、`play('card_get')`、`play('guide_pause')` 會自動壓低; `ui_confirm` / `ui_cancel` / `dungeon_end` 會自動恢復, 保險起見地下城裡的 `attack` / `skill` / `rope_throw` / `stairs_down` / `stairs_up` / `player_hurt` 與表演場的 `perform` / `cue_fire` / `chain` / `clock_tick` 等也會恢復; 換曲也會恢復。打磨第 9 輪起鐘塔 2 層出口是普通出口(照常播 exit_prompt), **這個介面已沒有必須接的情況**, 保留給 RD 自行使用。打磨第 10 輪: 商店買卡過場「收下」不播音效(spec), 由 card_get 壓低的音樂會在收下後的**下一個選單音**(`ui_move` / `ui_denied` / `buy` / `ui_confirm` / `ui_cancel`)自動恢復; 想讓收下那一刻就恢復, 可在收下時呼叫 `setMusicDuck(false)`(可選) |

- **倒下自動停音樂**(打磨第 5 輪): `play('player_down')` 會順手做一次 `stopMusic()`(0.15 秒淡出), 讓倒下聲單獨響完。RD 照 spec 自己再呼叫 `stopMusic()` 也無害; 結算畫面照常 `playMusic('result')`

- **暫停式引導**(打磨第 9 輪): RD **不用接任何新介面**, 照 spec 呼叫音效即可:
  - `play('guide_pause')` 一響 → 背景音樂 0.2 秒內壓到一半, 表演場的觀眾聲 0.3 秒淡出暫停
  - 引導期間熱度段照常 `setCrowd(...)` 也沒關係: 只記住最新的段, 不出聲
  - 最後一張按 Z 的 `play('ui_confirm')` → 背景音樂恢復, 觀眾聲 0.4 秒淡入**當下熱度段**
  - 保險: 萬一結束引導時沒播 ui_confirm, 遊戲恢復後的第一個動作或表演音效(attack、skill、rope_throw、perform、cue_fire、chain、clock_tick 等)也會恢復; `stopMusic()` 或換到另一首曲子也會解除
- interface.json 的 `crowd_clap` / `crowd_cheer` / `crowd_frenzy` 也可以用 `play('crowd_clap')` 呼叫, 效果等同 `setCrowd('clap')`(不是一次性音效, 會一直循環到換段或停掉)
- 觀眾聲**自動收掉**的時機(RD 不呼叫也會停): `play('loose')`、`play('show_end')`、`stopMusic()`、`playMusic(表演以外的曲子)`。所以失控、時間到收場、離開表演場都不用另外 `setCrowd('')`; 要明確寫也無害

## 事件表

相對音量 0~1(已寫在 sound.js 裡, RD 不用傳)。「間隔」= 同一事件在這段時間內重複呼叫只響一次, RD 可以放心每幀呼叫。除觀眾聲三個外全部不循環。

| 事件名 | spec 音效清單 | 何時呼叫 | opts | 素材 | 相對音量 | 間隔 |
|---|---|---|---|---|---|---|
| ui_move | ui_move | 任何選單游標移動(含場所卡、格子、列、分頁、面板行、出口詢問框換選項、選武器畫面換武器、出發準備畫面) | — | sfx_ui_move.ogg | 0.45 | 0.03 秒 |
| ui_confirm | ui_confirm | 選單按 Z 確定: 進入場所 / 地下城、上台、填格、**選武器出發**、見習過場按 Z 繼續、面板確定、下一步、開演前的確定、結算按 Z 繼續、出口選「離開」、**拿到卡過場按 Z 收下**(會順便恢復背景音樂音量) | — | sfx_ui_confirm.ogg | 0.6 | 0.03 |
| ui_cancel | ui_cancel | 按 X 返回 / 關閉面板 / 清空格子 / **刪列** / 讓魔物下台; 按「返回上一步」「回上一頁」; **出口選「留下」(Z 或 X)** | — | sfx_ui_cancel.ogg | 0.5 | 0.03 |
| ui_denied | ui_denied | 買不起、未開放、鎖住的列(含「列只能從上往下排」擋下的)、**重複暗號**、暗號還沒選就按表演卡格、見習上台數不對、**繩子用完還按空白鍵** | — | sfx_ui_denied.ogg | 0.55 | 0.08 |
| title_start | title_start | 開始畫面按 Z(緊接在 init 之後) | — | sfx_title_start.ogg | 0.7 | — |
| calendar_flip | calendar_flip | 日曆過場開始(翻頁動畫 0~0.6 秒那段的起點) | — | sfx_calendar_flip.ogg | 0.7 | 0.2 |
| intermission | intermission | **進場過場**(上一輪的見習過場, 打磨第 11 輪起每天都播)畫面出現的那一刻(只呼叫一次; 按 Z 離開時不用呼叫, 照常播 ui_confirm) | — | sfx_intermission.ogg(小號 fanfare, 2.9 秒) | 0.7 | 0.5 |
| enter_pop | enter_pop(打磨第 11 輪新增) | 進場過場裡**每隻魔物**走到帳篷門、開始進門的那一刻(t_k = 1.75 + 0.25k, k ≥ 1; 馴獸師進門不呼叫)。玩家提早按 Z 後, 還沒到時間的不要再呼叫 | `index`(可省略): 第幾隻, 從 1 起。**不傳也可以**: 0.6 秒內連著呼叫會自動一聲比一聲高, 隔超過 0.6 秒從第 1 隻重數 | 內嵌 PCM(泡泡「啵」, 0.085 秒, 1 毫秒內出聲)。沿大調音階往上(do re mi fa sol la si do), 第 8 隻起停在高八度 | 0.3 | 0.08 |
| intermission_cheer | intermission_cheer(打磨第 11 輪新增) | 進場過場**全員進門**那一刻(allInT = 2.05 + 0.25n; 一隻都沒抓到、只有馴獸師進門時也呼叫, 在 2.05 秒)。一次; 提早按 Z 時沒到時間就不要呼叫 | — | 內嵌 PCM: 觀眾「耶—」+ 一點掌聲(掌聲先墊著 4 毫秒內出聲, 「耶—」約 0.15 秒起來; 整段低通 5 kHz, 像從帳篷裡傳出), 1.05 秒, 0.75 秒起淡出, 跟 0.8 秒的進門特效對齊 | 0.4 | 0.5 |
| attack | attack | Z 普攻揮出的那一刻(不論有沒有打中) | `weapon`: `'club'`/`'sword'`/`'spear'`, 省略或其他值當 club | 內嵌 PCM(三種武器各一個揮動聲) | 0.5~0.6 | 0.04 |
| skill | skill | X 武器技發動的那一刻 | `weapon`: 同上(影響音高) | 內嵌 PCM(較重的揮動聲, 放慢) | 0.8 | 0.08 |
| hit_monster | hit_monster | 馴獸師的普攻 / 武器技打中魔物(每次命中) | — | sfx_hit_monster.ogg | 0.6 | 0.04 |
| monster_weak | monster_weak | 魔物血量剛掉進殘血(每隻只在進入的那一刻一次) | — | sfx_monster_weak.ogg | 0.65 | 0.1 |
| monster_windup | monster_windup(本輪新增) | 地下城魔物**開始前搖**的那一刻; 冰柱企鵝在預警開始時呼叫(本輪 spec 把企鵝從 monster_cast 移到這裡)。同一幀多隻只呼叫一次即可(呼叫多次也只會響一聲) | — | sfx_monster_windup.ogg(短促上揚的「咻↑」, 剪掉開頭 0.14 秒靜音、加速 1.2 倍, 約 0.33 秒) | 0.07(素材本身很響; 量得實際響度約比 monster_cast 低 3~4 dB) | 0.1 |
| monster_cast | monster_cast | 地下城魔物放出技能: **前搖結束**、技能真正打出去的那一刻 | — | sfx_monster_cast.ogg | 0.4 | 0.08 |
| player_hurt | player_hurt | 馴獸師扣心(任何來源: 技能、傷害地形、爆炸)。最後一顆心被扣掉時照常呼叫, 再接 player_down | — | sfx_player_hurt.ogg + sfx_player_hurt_tone.ogg 疊層 | 0.9 + 0.5 | 0.15 |
| player_down | player_down(本輪新增) | 心歸零、倒下動畫開始的那一刻(一次)。會自動停掉背景音樂(見上方) | — | sfx_player_down_hit.ogg(重擊)→ 0.15 秒後 sfx_player_down_fall.ogg(倒地悶響, 放慢)→ 0.35 秒後 sfx_player_down_tone.ogg(下降的撥弦兩音, 遺憾); 全長約 0.95 秒。0.2 秒內剛響過 player_hurt 時自動省掉重擊層 | 0.9 + 0.85 + 0.6 | 0.5 |
| rope_throw | rope_throw | **按空白鍵**拋出捕捉繩的那一刻(按鍵當下; 繩子用完時改播 ui_denied) | — | 內嵌 PCM(輕的揮動聲, 0.12 秒, 11 毫秒到峰值一成); 播放時加速 1.1~1.2 倍, 比普攻輕快 | 0.45 | 0.06 |
| rope_escape | rope_escape(本輪新增) | 繩子打中**沒虛弱**的魔物、被掙脫彈開的那一刻 | — | sfx_rope_escape_slap.ogg(輕拍「啪」)+ sfx_rope_escape_boing.mp3(卡通彈簧「啵嚶」) | 0.4 + 1.0 | 0.1 |
| capture_ready | capture_ready(本輪改用途) | 繩子**套上虛弱的魔物**、繩子收緊的那一刻 | — | sfx_capture_ready.ogg(皮帶扣「喀啦」, 沿用) | 0.8 | 0.1 |
| capture | capture | 繞圈完成、收服成功。**見習草地收服第 3 隻那一刻不要呼叫**(改播 quest_done; 第 1、2 隻照常) | — | sfx_capture.ogg | 0.75 | 0.1 |
| quest_show | quest_show(打磨第 7 輪新增) | 見習草地任務卡「任務: 收服 3 隻火柴猴」跳出的那一刻(一次; 背景音樂 dungeon 已在播, 疊在上面即可)。任務卡縮成任務列時不用另外呼叫 | — | 內嵌 PCM(Win Jingle 的前兩個和弦, 原速, 銅管 + 鋼鼓, 1.0 秒; 6 毫秒內出聲) | 0.65 | 0.5 |
| quest_done | quest_done(打磨第 7 輪新增) | 見習草地收服第 3 隻、任務列轉綠打勾的那一刻(一次; 取代這一刻的 capture 與教學第 7 階段的 tutorial_done)。1.0 秒定格結束、結算出現時照常呼叫 `dungeon_end` | — | 內嵌 PCM(同一段 Win Jingle 完整樂句, 加速 2 倍, 銅管 + 鋼鼓 + 撥弦; 約 1.05 秒在主和弦收尾, 檔長 1.14 秒含淡出) | 1.2(量得約比 capture 響 3 dB) | 0.5 |
| lasso_break | lasso_break | 套索斷掉(timeout / distance / hit 都是) | — | sfx_lasso_break.ogg | 0.8 | 0.1 |
| kill | kill | 魔物被打倒(任何方式) | — | sfx_kill.ogg | 0.7 | 0.06 |
| bush_hide | bush_hide | 馴獸師進入草叢格(從非草叢走進草叢的那一刻) | — | sfx_bush_hide.ogg | 0.7 | 0.2 |
| fruit_drop | fruit_drop | 果子被打落(本輪果子不再吸引魔物; 聲音不變) | — | sfx_fruit_drop.ogg | 0.8 | 0.1 |
| fruit_eat | fruit_eat(本輪新增) | 馴獸師吃到果子、回 1 心的那一刻 | — | sfx_fruit_eat.ogg(咬一口的脆響, 剪掉開頭 0.118 秒靜音)+ sfx_fruit_eat_ding.ogg 兩聲上揚的小「叮」(0.12 / 0.21 秒) | 0.8 + 0.22 × 2 | 0.15 |
| keg_fuse | keg_fuse | 爆炸桶被點燃、引信開始(聲音自己在 0.95 秒收掉, 趕在 1.0 秒爆炸前結束; 本輪由 0.6 拉長) | — | sfx_keg_fuse.ogg(只放前 0.95 秒, 最後 0.06 秒淡出) | 0.45 | 0.1 |
| keg_blast | keg_blast | 爆炸桶爆炸(含連鎖引爆的每一個) | — | sfx_keg_blast.ogg + sfx_boom_low.ogg 疊層 | 0.85 + 0.8 | 0.05 |
| wall_crack | wall_crack | 裂牆被打、裂痕 +1(第 1、2 下) | — | sfx_wall_crack.ogg | 0.7 | 0.06 |
| wall_break | wall_break | 裂牆第 3 下碎掉(只呼叫這個, 不要同時呼叫 wall_crack) | — | sfx_wall_break.ogg + sfx_wall_crack.ogg 疊層 | 0.6 + 0.5 | 0.1 |
| teleport | teleport | 傳送陣把馴獸師傳走的那一刻 | — | sfx_teleport.ogg | 0.55 | 0.1 |
| heal | heal | 回復泉補滿心 | — | sfx_heal.ogg | 0.6 | 0.2 |
| exit_prompt | exit_prompt | 碰到出口、詢問框跳出的那一刻(只呼叫一次; 選項移動播 ui_move, 選完播 ui_confirm / ui_cancel)。會自動把背景音樂壓到一半。打磨第 9 輪起所有出口(含鐘塔 2 層)都照常呼叫 | — | 內嵌 PCM(門鈴「叮咚」C5 → A4, 0.93 秒) | 0.5 | 0.5 |
| stairs_down | stairs_down(打磨第 8 輪新增) | 走到**往下**的樓梯、下樓轉場開始的那一刻(一次)。背景音樂不中斷 | — | sfx_stairs_step_1 / 2.ogg 交替四步, 一步比一步低(速度 1.0 → 0.82), 每步 0.09 秒後跟一聲小回音; 約 0.8 秒, 在 1.0 秒轉場內收尾 | 0.6 → 0.45(回音 0.18 → 0.12) | 0.8 |
| stairs_up | stairs_up(打磨第 12 輪新增) | 走到**往上**的樓梯、回上一層的轉場開始的那一刻(一次; 只播這個, 不要同時呼叫 stairs_down)。背景音樂不中斷 | — | 跟 stairs_down **同一組**木頭腳步(sfx_stairs_step_1 / 2.ogg)交替四步, 音階反過來: 一步比一步高(速度 0.88 → 1.06)、一步比一步大一點, 每步 0.09 秒後跟一聲小回音; 約 0.8 秒, 在 1.0 秒轉場內收尾 | 0.48 → 0.6(回音 0.14 → 0.17) | 0.8 |
| boost_get | boost_get(打磨第 8 輪新增) | 碰到強化石碑、永久強化生效的那一刻。**只播這個**: 心 +1 的回血特效不另播 heal | — | sfx_boost_get.ogg(鋼鼓上揚短句, 升 4 個半音, 約 0.72 秒)+ 0.5 秒後 sfx_boost_ding.ogg(玻璃「叮」, 升高) | 0.6 + 0.3 | 0.3 |
| chest_open | chest_open(打磨第 8 輪新增) | 碰到寶箱、開蓋動畫開始的那一刻(**鑰匙寶箱與金幣寶箱都播**) | — | sfx_chest_latch.ogg(金屬扣「喀」)+ 0.05 秒後 sfx_chest_creak.ogg(木頭吱呀)+ 0.22 秒後 sfx_sparkle.ogg(閃光); 約 0.4 秒, 0.3 秒後接 card_get 時已收尾 | 0.7 + 0.5 + 0.3 | 0.3 |
| gold_get | gold_get(打磨第 12 輪新增) | **金幣寶箱**開蓋、金幣噴出的那一刻: 碰到寶箱播 chest_open, **0.3 秒後**呼叫這個(一次)。飄字「金幣 +N」不另配音, HUD 金幣跳動**不要**呼叫 coin_tally; 背景音樂不壓低(本事件不會壓) | — | sfx_gold_splash.ogg(一把金幣撒在地上的「嘩啦」)三層: 原速 + 0.12 秒後高一點、輕一點 + 0.27 秒後慢一點的一小撮; 再加 0.1 / 0.3 秒兩聲很輕的高音小「叮」(sfx_sparkle.ogg, 與 chest_open 同一個閃光); 約 0.6 秒, 21 毫秒內出聲 | 0.6 + 0.4 + 0.24(叮 0.15 / 0.12)。量得比 coin_tally 響約 10 dB、比 card_get 小約 11 dB、比 chest_open 小約 3 dB | 0.3 |
| card_get | card_get(打磨第 8 輪新增) | 「拿到卡」過場開始的那一刻(一次): 地下城開鑰匙寶箱 0.3 秒後, 或**商店買暗號 / 表演卡**按 Z 播 `buy` 0.3 秒後(打磨第 10 輪)。會自動把背景音樂壓到一半; 收下按 Z 不播音效(spec), 之後下一個選單音或地下城動作自動恢復(見 setMusicDuck) | — | sfx_card_get.ogg(鋼鼓上行跑句, 加速 1.15 倍, 約 1.2 秒)+ 0.62 / 0.76 / 0.90 秒各一聲 sfx_sparkle.ogg(越來越高, 對齊 0.6~1.2 秒的卡片發光) | 1.1 + 0.25 / 0.22 / 0.2 | 0.5 |
| firecracker | firecracker(打磨第 8 輪新增) | 爆竹刺蝟的爆竹爆炸(地下城與表演場都用)。同一幀多顆只呼叫一次(多呼叫也會被間隔擋掉) | — | sfx_firecracker_a / b.ogg 交替五聲, 每聲加速 1.7~2.3 倍、間隔 0.05~0.09 秒, 約 0.45 秒的「劈哩啪啦」 | 0.25~0.35(量得比 keg_blast 小約 15 dB) | 0.1 |
| dungeon_end | dungeon_end | 地下城結束(時間到 / 倒下 / 提早收工 / 見習完成), 進地下城結算的那一刻。**倒下時改在結算畫面出現時才呼叫**(倒下那一刻已播 player_down, spec) | `reason`: `'time'`/`'down'`/`'exit'`/`'tutorial'`; `down` 換成下降的遺憾音, `exit` 同 time | sfx_dungeon_end.ogg; reason down 用 sfx_dungeon_end_down.ogg | 0.7 / 0.5 | 0.3 |
| show_start | show_start | 開演(布置第 2 步按「開演」進表演場) | — | sfx_show_start.ogg | 0.75 | 0.3 |
| perform | perform | 表演場魔物放技能; 同一幀多隻只呼叫一次 | — | sfx_perform.ogg(每次音高微亂) | 0.22 | 0.07 |
| ignite | ignite | 惹生氣型技能打中別隻 | — | sfx_ignite.ogg(上揚) | 0.3 | 0.06 |
| calm | calm | 冷靜型技能打中別隻 | — | sfx_calm.ogg(下降) | 0.3 | 0.06 |
| special | special | 特殊效果打中(標靶 / 凍住 / 變走) | — | sfx_special.ogg | 0.35 | 0.08 |
| angry_perform | angry_perform | 魔物在生氣時表演(滿意度 ×2) | — | sfx_angry_perform.ogg | 0.45 | 0.1 |
| chain | chain | 連鎖段數 ≥ 2 的那次表演 | `chain`: 目前段數(整數 ≥ 2); 每升一段升兩個半音, 第 14 段起封頂 | sfx_chain.ogg | 0.45 | 0.04 |
| cue_fire | cue_fire | 暗號成立、表演卡發動(任何表演卡都呼叫; 有自己發動音的卡再疊上下面幾個) | — | sfx_cue_fire.ogg | 0.6 | 0.1 |
| parade | parade(打磨第 8 輪新增) | 表演卡「繞場」發動, 與 cue_fire 同一幀呼叫 | — | 內嵌 PCM 小鼓「噠 噠噠 噠」(0 / 0.11 / 0.17 / 0.28 秒)+ 0.22 秒後 sfx_parade_horn.ogg(上揚的薩克斯短句當小號, 加速 1.12 倍); 約 0.95 秒 | 小鼓 0.42 / 0.3 + 0.8 | 0.3 |
| scatter | scatter(打磨第 8 輪新增) | 表演卡「散場」發動, 與 cue_fire 同一幀呼叫 | — | 內嵌 PCM(空氣揮動的下降段「呼—」, 0.85 秒) | 0.45 | 0.3 |
| gather | gather(打磨第 8 輪新增) | 表演卡「聚集」發動, 與 cue_fire 同一幀呼叫 | — | 內嵌 PCM(空氣揮動的上升段「咻—」, 0.45 秒)+ 0.42 秒後一聲高的「啵」(sfx_rope_escape_boing.mp3 加速 1.5 倍) | 0.5 + 0.6 | 0.3 |
| rush | rush(打磨第 8 輪新增) | 表演卡「衝撞」發動, 與 cue_fire 同一幀呼叫 | — | 內嵌 PCM 低吼(巨人吼叫放慢 0.8 倍, 0.92 秒)+ sfx_rush_hooves.mp3(卡通馬蹄)在 0.08 / 0.37 / 0.66 秒各一輪、一輪比一輪大; 約 1.05 秒 | 0.5 + 0.45 / 0.5 / 0.55 | 0.3 |
| rush_hit | rush_hit(打磨第 8 輪新增) | 衝撞撞到一隻、那隻被彈開的那一刻; 同一幀多隻只呼叫一次 | — | sfx_rush_hit.ogg(拳擊「碰」)+ sfx_rope_escape_boing.mp3 放慢 0.8 倍(比 rope_escape 低沉, 聽得出不同) | 0.5 + 1.0 | 0.08 |
| rain | rain(打磨第 8 輪新增) | 表演卡「下雨」發動, 與 cue_fire 同一幀呼叫 | — | 內嵌 PCM(雨聲 1.6 秒, 1.15 秒起淡出, 約 1.5 秒聽得到) | 0.45 | 0.5 |
| confetti_charge | confetti_charge(打磨第 8 輪新增) | 表演卡「大彩炮」發動、投射物開始被收過去的那一刻(與 cue_fire 同一幀呼叫) | — | 內嵌 PCM: 吸入「咻—」0.6 秒接蓄力上升音 1.0 秒(電流蓄能聲加速 1.6 倍、越來越響), 共 1.55 秒 | 0.45 | 0.5 |
| confetti_burst | confetti_burst(打磨第 8 輪新增) | 大彩炮爆出彩帶的那一刻(蓄力結束; 飄字不另配音)。會先收掉還沒放完的 confetti_charge | — | sfx_confetti_bang.ogg(大砰)+ 0.08 秒後 sfx_confetti_crackle.ogg(煙火劈啪尾音, 當彩帶撒落)+ 0.1 秒後 sfx_cheer.ogg(觀眾一聲「耶—」) | 1.0 + 0.5 + 0.7 | 0.5 |
| crowd_clap | crowd_clap(新, 循環) | 熱度在掌聲段(≥ 50%)。用 `setCrowd('clap')`(或 `play('crowd_clap')`) | — | 內嵌 PCM(稀疏掌聲, 6 秒無縫循環, 約每秒 10 拍) | 0.35 | — |
| crowd_cheer | crowd_cheer(循環) | 熱度在**喝采**段(≥ 75; 段名改了, 代號不變)。用 `setCrowd('cheer')` | — | sfx_crowd_cheer.mp3(全場歡呼, 執行時做成約 7 秒循環) | 0.16 | — |
| crowd_frenzy | crowd_frenzy(循環) | 熱度在沸騰段(本輪改成 ≥ 85)。用 `setCrowd('frenzy')` | — | sfx_crowd_frenzy.mp3(更猛的歡呼 + 齊聲吶喊)+ sfx_crowd_unrest.ogg(群眾叫嚷騷動)疊層 | 0.2 + 0.12 | — |
| heat_warn | heat_warn(新) | 熱度**剛進**沸騰段的那一刻(一次; 同一幀照常 `setCrowd('frenzy')`) | — | 內嵌 PCM, **程式產生**(880 / 660 Hz 高低交替兩次的短警報, 0.56 秒) | 0.26 | 1.0 |
| loose | loose | 失控的那一刻(全場平均熱度 ≥ 92%; 同一刻請 `stopMusic()`; 觀眾聲自動 0.3 秒淡出)。跟「剛進沸騰」同一幀時只呼叫 loose, 不要呼叫 heat_warn | — | sfx_loose.ogg + sfx_boom_low.ogg 疊層 | 0.9 + 0.7 | 0.5 |
| crowd_flee | crowd_flee | 觀眾開始逃走(失控後, 可與 loose 同一刻) | — | sfx_crowd_step_1~3.ogg 錯開排成約 1.2 秒的一陣腳步 | 0.25~0.4 | 0.5 |
| clock_tick | clock_tick(本輪新增) | 表演時鐘最後 5 秒, 每跨過一個整數秒呼叫一次(剩 5、4、3、2、1 秒各一聲; 跟時鐘「彈一下」同一幀)。失控後時鐘停住, 不要再呼叫 | — | 內嵌 PCM(真實時鐘的「喀」, 0.135 秒, 2 毫秒內出聲) | 0.4 | 0.3 |
| show_end | show_end | 表演時間到、正常收場(失控收場不要呼叫; 觀眾聲自動 0.3 秒淡出) | — | 內嵌 PCM(掌聲 3 秒) | 0.6 | 0.5 |
| coin_tally | coin_tally | 結算畫面數字每跳一次(可每幀呼叫, 間隔會自動擋)。見習表演結算金幣那行不跳數字, 只在名聲跳動時呼叫(打磨第 12 輪 spec); 地下城開金幣寶箱的 HUD 跳動**不呼叫** | — | sfx_coin_tally.ogg | 0.4 | 0.06 |
| buy | buy | 商店購買 / 裝備成功(武器、暗號、表演卡都播; 買暗號 / 表演卡時 0.3 秒後另接 card_get, 買武器只播 buy) | — | sfx_buy.ogg | 0.7 | 0.1 |
| unlock | unlock | 出發準備畫面冒出「第 2 座地下城開放」「商店上架新東西」提示的那一刻(打磨第 9 輪: 開鑰匙寶箱那一刻**不播** unlock, 只播 chest_open → card_get; 下一次出發準備冒提示時才播) | — | sfx_unlock.ogg | 0.65 | 0.3 |
| tutorial_done | tutorial_done | 教學階段完成(播完成特效的那一刻)。**收服第 3 隻火柴猴時教學第 7 階段的完成不要呼叫**(那一刻只播 quest_done) | — | sfx_tutorial_done.ogg | 0.5 | 0.2 |
| star | star | 總結算每顆星亮起 | `index`: 第幾顆, 從 0 起算; 一顆比一顆高 | sfx_star.ogg | 0.7 | 0.05 |
| row_swap | row_swap(打磨第 9 輪新增) | 排節目單時兩列暗號互換、或選「上移」「下移」整列對調成功的那一刻。**只播這個, 不另播 ui_confirm**(spec)。上移到頂 / 下移到底這類沒換成的, 照舊播 ui_denied | — | sfx_row_swap_a.ogg(卡片滑動「刷」)→ 0.11 秒後 sfx_row_swap_b.ogg(另一張「刷」, 略高); 兩層都跳過開頭的滑動前奏, 15 毫秒內出聲, 約 0.3 秒 | 0.55 + 0.45 | 0.08 |
| guide_pause | guide_pause(打磨第 9 輪新增) | 暫停式引導開始、畫面暫停的那一刻(一次; 大暫停符號彈出時)。**會自動把背景音樂壓到一半、表演場的觀眾聲暫停**(見下方「暫停式引導」) | — | 內嵌 PCM(音樂盒一個「叮」, 接著像磁帶減速一樣音高一路往下沉、停住; 0.62 秒, 2 毫秒內出聲) | 0.4 | 0.5 |
| guide_card | guide_card(打磨第 9 輪新增) | 每張引導卡開始彈入的那一刻(第 1 張在暫停 0.8 秒後; 之後每按 Z 換卡一次)。**最後一張大卡不要呼叫**(改播 guide_finale); 按 Z 本身不另播音效; 未滿 3 秒按 Z 不反應也不播 | — | sfx_guide_card.ogg(一張卡片輕輕滑入, 放慢 0.9 倍; 先有一點滑動聲, 約 0.1 秒時「嗒」一下落定) | 0.4 | 0.2 |
| guide_finale | guide_finale(打磨第 9 輪新增) | 最後一張大卡出現的那一刻(一次; 盛大特效 2.5 秒同時開始)。萬一同一刻也呼叫了 guide_card, guide_card 會被收掉 | — | 內嵌 PCM 一段混好的 2.5 秒: 號角樂句(含鈸)+ 小鼓滾奏(由小漸大)+ 三發煙火(起音對準 0.2 / 0.9 / 1.6 秒)+ 0.3 秒起觀眾歡呼; 2.2~2.5 秒淡出 | 1.1 | 1.0 |

- 打磨第 9 輪新增 4 個事件(row_swap、guide_pause、guide_card、guide_finale), **全部用現成素材**, 沒有程式產生; 其他事件、素材、音量、opts 全部沿用第 8 輪
- 打磨第 8 輪拿掉 `weapon_menu`(C 鍵與換武器視窗刪除)、`freeze_all`、`cheer`(兩張表演卡刪除)、`mark_add`(標記隱性化, 不讓玩家聽出有標記); 呼叫了也只是靜默忽略。cheer 原本的「耶—」錄音改給 confetti_burst 當觀眾層用。更早已拿掉 `upgrade`
- heat_warn 為什麼程式產生: 找過 OpenGameArt 兩個 CC0 警報(Frenchyboy「Alarm」是 2 秒持續上掃的刺耳警報, 不夠短促; yd「Short alarm」標籤寫自爆倒數, 調性太重), 要求只是「短促、像警報、不刺耳」, 兩音交替的柔和方波最容易保證這幾點
- 打磨第 8 輪新增的 13 個事件**全部用現成素材**, 沒有程式產生

## 背景音樂

`Sound.playMusic(曲名)`: 循環播放; 換到另一首時舊的淡出、新的淡入 0.5 秒; 呼叫正在播的同一首不會重頭。`Sound.stopMusic()`: 0.15 秒內停掉(給失控用)。

| 曲名 | spec 用在哪 | 何時呼叫 | 素材 | 長度 | 相對音量 |
|---|---|---|---|---|---|
| title | 開始畫面、日曆過場、出發準備 | 進開始畫面、日曆過場、出發準備畫面時 | music_title.mp3(Waunobe March 截段) | 70.6 秒 | 0.40 |
| dungeon | 選武器、地下城(含見習草地) | 進選武器畫面時(之後進地下城同一首不會重頭); 出口詢問框、拿到卡過場、暫停式引導開著時自動壓到一半(見上方 setMusicDuck 與暫停式引導); 下樓不中斷; 倒下時 play('player_down') 自動停掉 | music_dungeon.mp3(Monster Promenade 截段) | 73.8 秒 | 0.30(壓低時 0.15) |
| setup | 進場過場(每天)、布置第 1、2 步、商店 | 進進場過場、布置第 1 步、商店時; 商店的拿到卡過場時自動壓到一半(card_get), 收下後下一個選單音恢復 | music_setup.mp3(Easy Lemon 60 秒版) | 62.5 秒 | 0.35 |
| show | 表演場 | 開演進表演場時; 失控那一刻呼叫 `stopMusic()`; 暫停式引導時自動壓到一半(guide_pause → ui_confirm) | music_show.mp3(Four Beers' Polka 截段) | 73.6 秒 | 0.30 |
| result | 地下城結算、表演結算、總結算 | 進任一結算畫面時 | music_result.mp3(Happy Boy End Theme) | 53.9 秒 | 0.40 |

- 循環方式: 曲尾最後 1 秒與曲頭交叉淡化接回, 不是無縫剪接; 聽得出一次「段落重來」屬正常
- 背景音樂與觀眾歡呼聲需要在遊戲畫面上署名(CC BY 4.0), 署名文字見 credits.md

## 同時觸發的處理

| 同一刻可能一起發生 | 處理 |
|---|---|
| 表演場 perform / ignite / calm / special / angry_perform / chain 大量重疊 | 各自有最短間隔與同時聲部上限(perform 4、chain 3、angry_perform 2), 不會疊成噪音牆。perform 音量最低, 讓 chain(依段數升調)與 angry_perform 浮在上面 |
| 觀眾聲(crowd_*)與上面那批表演音效 | 觀眾聲是底層: 音量壓在 0.12~0.35 且是連續的群眾聲, 表演音效是短促的撥弦 / 電子音, 頻段與質感錯開。同時最多一種觀眾聲, 換段 0.4 秒交叉淡化 |
| confetti_burst 的「耶—」+ crowd_cheer / crowd_frenzy(底層) | 兩者可以同時響。觀眾一聲是一次性的, 浮在循環底層上面 |
| heat_warn + setCrowd('frenzy') | 同一幀呼叫即可。heat_warn 是高低兩音的電子警報, 沸騰觀眾聲在底下, 音色不同。heat_warn 間隔 1 秒, 熱度在門檻上下抖動也不會連響 |
| loose + heat_warn 同一幀 | spec: 只播 loose。RD 照 spec 不呼叫 heat_warn; 萬一呼叫了, heat_warn 本身會響(它不是低優先音), 請照 spec 擋 |
| loose 與表演音效(含本輪表演卡音、爆竹) | loose 一響, 表演音效(perform / ignite / calm / special / angry_perform / chain / parade / scatter / gather / rush / rush_hit / rain / confetti_charge / firecracker)立刻 0.05 秒淡掉、之後 1.5 秒內不再出聲; 觀眾聲 0.3 秒淡出。crowd_flee、cue_fire、confetti_burst 不受影響 |
| clock_tick + 表演音效 + 觀眾聲 | 最後 5 秒滴答時表演音效照常響。滴答是 0.135 秒的木頭「喀」, 跟撥弦(perform / chain)、電子音(ignite / calm / special)、群眾聲的質感都不同, 音量 0.4 低於 chain、angry_perform 的主旋律感; 只在整數秒出現、間隔 1 秒, 規律性本身就是辨識點。不屬於表演低優先音, 不會被 loose 壓掉(失控後 RD 本來就不會再呼叫) |
| clock_tick(剩 1 秒)接 show_end | 最後一聲滴答 1 秒後時間到, show_end 的掌聲接上; 滴答 0.135 秒早已結束, 不重疊 |
| show_end + 觀眾聲 | 觀眾聲 0.3 秒淡出, show_end 的收場掌聲接上 |
| cue_fire + parade / scatter / gather / rush / rain / confetti_charge | 同一幀一起呼叫(spec: cue_fire 照播再疊上)。cue_fire 是 0.3 秒、0 毫秒起音的確認音; 各卡的音量刻意比 cue_fire 小 5~8 dB(量最響 50 毫秒響度換算), 而且多半是漸強或延後進來(小號 0.22 秒、馬蹄 0.08 秒、吸入聲 27 毫秒才到峰值一成), 讓「等到了」先被聽見, 再聽出是哪張卡 |
| 魔術箱 / 炸藥桶發動 | 沒有自己的發動音(spec): 魔術箱照舊 cue_fire + special; 炸藥桶 cue_fire, 落地 keg_fuse、爆炸 keg_blast(同一幀多個只呼叫一次, 呼叫多次也會被間隔與聲部上限擋) |
| confetti_charge → confetti_burst | 先後接著: 蓄力音 1.55 秒, 爆開在 1.6 秒; confetti_burst 會先收掉還在響的 confetti_charge, 不重疊。爆開是大獎: 量得比 cue_fire 還響一點, 再疊觀眾「耶—」 |
| rush → rush_hit(多隻) | rush 的低吼與馬蹄約 1.05 秒; 撞到時 rush_hit 疊上去。rush_hit 間隔 0.08 秒、同時最多 2 聲, 連撞好幾隻也只是幾聲「碰啵嚶」 |
| firecracker 同一幀多顆 / 連續爆 | 間隔 0.1 秒、同時最多 2 組, 不會疊成一片噪音; 每組 0.45 秒的「劈哩啪啦」 |
| firecracker + keg_blast(地下城) | 兩個都會響; 爆竹量得比 keg_blast 小約 15 dB, 高頻、短促, 爆炸桶是低沉的轟, 一聽就分得出 |
| exit_prompt + 背景音樂 | 門鈴響的同時 dungeon 音樂 0.2 秒內降到一半, 門鈴浮在上面; 選完(ui_confirm / ui_cancel)恢復 |
| 開鑰匙寶箱: chest_open → 0.3 秒後 card_get(打磨第 9 輪) | 同一般寶箱; 第 2 座在過場開始時開放, 但這一刻不播 unlock(spec)。鐘塔 2 層出口已是普通出口, 照常 exit_prompt |
| chest_open → card_get | spec: 開箱瞬間 chest_open, 0.3 秒後過場開始才 card_get。chest_open 約 0.4 秒, 最後 0.1 秒是很輕的閃光尾巴, 實際不搶 card_get 的開頭 |
| card_get + 背景音樂 | 鋼鼓跑句響的同時背景音樂降到一半(地下城是 dungeon、商店是 setup)。收下按 Z 不播音效(spec), 地下城一有動作(普攻、武器技、拋繩、下樓、扣心)就自動恢復; 商店是收下後的下一個選單音(移游標、再買、買不起、確定、返回)恢復, 離開商店換曲也會恢復。只有 card_get 壓低時移游標才會恢復, 出口詢問框開著時移游標不會把音樂放大 |
| 商店買暗號 / 表演卡: buy → 0.3 秒後 card_get(打磨第 10 輪) | spec: 前後接著、不重疊, 同開寶箱的節奏。buy 是短促的交易音, card_get 是鋼鼓跑句加閃光, 音色不同, 先後聽得出「付錢 → 拿到」; 第一次買卡的提示行不另配音 |
| card_get 與 quest_done 的辨識 | 不同樂器、不同旋律: quest_done 是銅管 + 鋼鼓 + 撥弦的勝利句(見習草地限定); card_get 是鋼鼓上行跑句 + 三聲越來越高的閃光, 長 1.2 秒、比 quest_done 長, 層數更多 |
| boost_get + 心 +1 回血特效 | spec: 只播 boost_get, 不另播 heal。兩者都是鋼鼓, 但 boost_get 是上揚句、升了 4 個半音、尾端多一聲玻璃叮, heal 是原調短句 |
| stairs_down / stairs_up + 背景音樂 | 音樂不中斷(spec)。腳步四步 0.8 秒, 轉場 1.0 秒內收尾 |
| stairs_down 與 stairs_up 的辨識(打磨第 12 輪) | spec: 往下只播 stairs_down、往上只播 stairs_up。同一組木頭腳步, 靠走向分: 下樓一步比一步低、一步比一步輕(走遠); 上樓一步比一步高、一步比一步大一點(走回來)。兩者不會同時出現(換層有 1.0 秒轉場, 間隔各 0.8 秒) |
| 開金幣寶箱: chest_open → 0.3 秒後 gold_get(打磨第 12 輪) | spec: 前後接著。chest_open 約 0.33 秒有聲, gold_get 在 0.3 秒進來, 最多疊到閃光尾巴幾十毫秒。飄字不配音; HUD 金幣跳動不呼叫 coin_tally; 背景音樂不壓低(gold_get 不在壓低清單裡), 戰鬥照常, 普攻、打擊等聲音照常疊在上面 |
| gold_get 與 coin_tally / kill / buy / card_get 的辨識 | coin_tally 是籌碼的單響「喀」、kill 是手抓錢幣的輕碰、buy 是錢袋聲, 都短而輕; gold_get 是一把金幣撒地的「嘩啦」連三下加兩聲小叮, 比 coin_tally 響約 10 dB、比 kill 響。card_get 是鋼鼓跑句 1.2 秒、比 gold_get 大約 11 dB 且會壓低音樂, 一聽就分得出「拿到卡(大事)」與「撿到錢(小驚喜)」 |
| monster_windup + monster_cast(不同隻) | 兩個都會響。windup 是乾淨的上揚電子短音、cast 是雷射雜訊, 音色不同; windup 響度刻意低 3~4 dB, 同時聲部上限 2, 很多隻同時前搖也只是一兩聲 |
| player_hurt(最後一顆心)+ player_down 同一幀 | 兩個都照呼叫。player_down 偵測到 0.2 秒內剛響過 player_hurt, 自動省掉自己的重擊層, 只接倒地悶響與下降撥弦, 不會疊兩記拳擊聲 |
| player_down + 背景音樂 + keg_blast / kill | 背景音樂 0.15 秒淡出(自動); 同一刻的爆炸或擊倒照常響, 倒地悶響在 0.15 秒後、撥弦在 0.35 秒後, 錯開不擠在同一點 |
| rope_throw → rope_escape / capture_ready | 先後發生, 不重疊: 丟出是 0.12 秒的揮動聲, 打中後才是「啪 + 啵嚶」(還不行)或皮帶扣「喀啦」(套住了), 兩種結果音色截然不同 |
| fruit_eat + heal | 理論上不同時。fruit_eat 是咬一口 + 兩聲很小的叮, heal 是鋼鼓樂句, 一輕一重 |
| intermission + playMusic('setup') | 同一刻呼叫即可; 音樂淡入 0.5 秒, 小號先出頭 |
| 進場過場: intermission → enter_pop × n → intermission_cheer(打磨第 11 輪) | spec: 出現時 intermission(小號 2.9 秒, 實際有聲到約 2.4 秒); 第一聲 enter_pop 在 2.0 秒, 跟小號尾巴疊著播, 之後每 0.25 秒一聲; intermission_cheer 在 allInT(最後一聲 enter_pop 的 0.3 秒後)。三者都照時間各自呼叫, 不互相壓。「啵」是 0.085 秒的高音泡泡聲(760 Hz 起、一聲比一聲高), 跟小號的長音、群眾聲的質感都不同; 每聲只佔 0.25 秒間隔的三分之一, 連著播是「啵、啵、啵」不會黏成一片。歡呼在最後一聲「啵」收尾 0.2 秒後才進來, 前後接著不重疊 |
| 進場過場提早按 Z | spec: 只播 ui_confirm, 還沒到時間的 enter_pop / intermission_cheer 由 RD 不再呼叫; 已經在響的讓它播完(本模組不會主動收掉, 「啵」最長 0.085 秒、歡呼 1.05 秒) |
| intermission_cheer 與 crowd_cheer / confetti_burst 的「耶—」 | 歡呼層跟 confetti_burst 是同一份「耶—」錄音、掌聲層跟 show_end 同一份掌聲, 刻意讓「帳篷裡的觀眾」在過場與表演場是同一群人; 但過場這一聲做了低通(悶一點、像隔著帳篷), 而且只出現在進場過場, 不會跟表演場的聲音同時響 |
| loose + crowd_flee + stopMusic | 三個可以同一幀呼叫; 腳步聲自帶錯開, 不會跟鐘聲擠在同一點 |
| quest_done(收服第 3 隻)+ capture + tutorial_done | spec: 這一刻只播 quest_done。RD 照 spec 不呼叫另外兩個即可; 萬一同一刻多呼叫了也沒關係: quest_done 之後 0.3 秒內的 capture / tutorial_done 自動丟掉, 早 0.1 秒內先響的 capture / tutorial_done 會被 quest_done 立刻收掉 |
| quest_done → dungeon_end | 不重疊: quest_done 約 1.05 秒收尾, dungeon_end 在 1.0 秒定格後、結算出現時才呼叫; 最多重疊 0.05 秒淡出尾巴 |
| quest_show + 背景音樂 dungeon | quest_show 疊在音樂上(spec), 不壓低音樂; 音樂音量 0.30、quest_show 0.65, 銅管和弦應浮在上面(兩者實際響度比待試玩) |
| quest_show 與 quest_done 的辨識 | 同一段旋律的頭與完整版: 任務卡只放前兩個和弦、原速、停在未解決的和弦上(「任務來了」); 任務完成是整句、加速一倍、多一層撥弦、收在主和弦(「做到了」)。兩者相隔至少數十秒, 不會同時出現 |
| tutorial_done 撞上 capture / cue_fire / unlock / show_start | 那幾個剛響過(0.2 秒內)時, tutorial_done 自動延後 0.5 秒, 讓主事件先講完 |
| hit_monster + kill + monster_weak | 都會響; kill 是錢幣聲、monster_weak 是高音叮, 跟打擊聲頻段錯開 |
| keg_blast + kill + player_hurt | 都會響; 爆炸桶連鎖時 keg_blast 同時最多 3 聲 |
| capture_ready 之後很快 capture | 不同素材, 都響 |
| coin_tally 每幀呼叫 | 間隔 0.06 秒自動擋, 大約每秒 16 下 |
| guide_pause + 同一幀剛好有其他音效 | spec: 照常疊著播, 不另壓。guide_pause 是音樂盒的高音「叮」再往下沉, 跟打擊、撥弦、群眾聲的質感都不同 |
| guide_pause → 0.8 秒後 guide_card | 不重疊: 叮聲 0.62 秒已收尾 |
| guide_card(換卡)與 row_swap 的辨識 | 同一家的卡片聲, 但兩者不會同時出現(一個在引導、一個在排節目單)。row_swap 是兩聲快的「刷、刷」、略升高; guide_card 只有一聲、放慢、較輕 |
| guide_finale + 背景音樂(已壓一半) | 號角與煙火浮在壓低的音樂上; 量得 guide_finale 最響 50 毫秒約 −9.3 dB(含音量), 比 quest_done(約 −11 dB)響, 是整個教學裡最大的一聲 |
| guide_finale 與 card_get / quest_done 的辨識 | 三個都是「好事」, 但 guide_finale 長 2.5 秒、有鼓與煙火與觀眾, 另兩個 1 秒左右、只有旋律樂器; 號角是另一段旋律(不是 quest_done 那段 Win Jingle) |
| guide_finale → 按 Z 的 ui_confirm | 大卡 3 秒後才接受 Z, guide_finale 2.5 秒已結束, 不重疊; ui_confirm 同時把音樂與觀眾聲恢復 |
| row_swap + ui_confirm | spec: 互換 / 上下移只播 row_swap。RD 照 spec 不呼叫 ui_confirm 即可(同時呼叫兩個都會響) |

## 理念或經驗落實

- 打磨第 12 輪: 既有事件的素材、音量、opts 全部沿用, 沒有刪任何素材檔。只新增 stairs_up、gold_get, **都用現成素材, 沒有程式產生**:
  - 照「成對事件取同一個素材、前後呼應」: stairs_up 不另找素材, 直接用 stairs_down 那組 Kenney 木頭腳步, 把音高走向與音量走向都反過來(spec「同材質、音階反過來」)。量得兩者最響 50 毫秒響度幾乎一樣(−17.4 / −17.2 dB), 有聲長度 0.83 / 0.78 秒, 都在 1.0 秒轉場內
  - gold_get 是新素材: OpenGameArt 上 LordTomorrow 的 CC0「Coin Splash」(一把金幣打在地上, 0.33 秒、21 毫秒到峰值一成)。另比過 BigSoundBank 的 CC0 錢幣錄音(12 筆, 多是單枚錢幣掉進杯子或在桌上旋轉 12~20 秒, 或 45 枚慢慢倒進陶罐 43 秒), 都不是「一把噴出來」。spec 要約 0.6 秒, 單檔只有 0.33 秒, 所以同一個檔錯開疊三層(變速 1.0 / 1.18 / 0.9, 聽起來是三把不同的錢)拉到約 0.6 秒, 再加兩聲很輕的閃光小叮, 跟 chest_open 的閃光同一個素材, 讓「開箱 → 噴錢」聽起來是同一件事
  - 照「量最響 50 毫秒響度來設相對音量」: spec 要「比 coin_tally 更響、比 card_get 小很多」, 用 Node 照 sound.js 的層疊與變速模擬混音後量: gold_get −21.4 dB、coin_tally −31.4、card_get −10.1、chest_open −18.0。實際輕重與辨識度待試玩確認
  - 授權: 新素材 1 個 CC0(LordTomorrow Coin Splash), 新增 assets/ 檔 1 個(sfx_gold_splash.ogg, 11 KB 原檔直接下載改名, 同一份 base64 內嵌於 sound.js)

- 打磨第 11 輪: 既有事件的素材、音量、opts 全部沿用(intermission 只是改成每天呼叫, 聲音不變)。只新增 enter_pop、intermission_cheer, **都用現成素材, 沒有程式產生**:
  - enter_pop 是新素材: OpenGameArt 上 EZduzziteh 的 CC0「pop sounds」(跟 rope_escape / gather / rush_hit 用的卡通「啵嚶」同一位作者, 同一種卡通質感)。另比過 cogitollc 的 CC0「pop sounds」10 個 ogg, 解出來峰值超過 0 dB(削波、偏硬), 不用。挑 pop9: 有清楚音高(約 760 Hz)、0.085 秒、1 毫秒內出聲。spec 寫「約 0.15 秒」, 選短一點是因為每 0.25 秒一聲, 短的才不會黏在一起
  - 照「成對 / 成串事件取同一個素材、前後呼應」: 進門的「啵」一聲比一聲高(大調音階往上數), 越多隻越往上爬, 對應 spec「越多聲越有抓了好多的成就感」; 9 隻以上停在高八度, 不會高到刺耳
  - intermission_cheer 不另找新素材: 用本作已登記的觀眾「耶—」(confetti_burst 用的那份)+ 收場掌聲(show_end 那份)重新混成 1.05 秒, 讓過場裡的觀眾跟表演場是同一群人; 整段低通 5 kHz 做出「從帳篷裡傳出」的距離感
  - 照「即時回饋 / 對齊畫面的音要立即出聲, 刻意漸強的要有立即出聲的層墊著」: 「耶—」原錄音 0.18 秒才到峰值一成, 掌聲層從 0 秒就在(4 毫秒到峰值一成), 對準全員進門特效的第一幀
  - 照「量最響 50 毫秒響度來設相對音量」: 小號(intermission)含音量約 −19.0 dB; 歡呼設 0.4 → 約 −18.3 dB, 跟小號差不多、是這段過場的收尾高點; 「啵」設 0.3 → 約 −19.8 dB, 單聲短、略低於小號, 連發十聲也不會壓過背景音樂與小號。實際輕重與辨識度待試玩確認
  - 授權: 新素材 1 個 CC0(EZduzziteh pop9.wav), 以 PCM 內嵌, 沒有新增 assets/ 檔案

- 打磨第 10 輪: spec 寫明沒有新音效, 所有事件、素材、音量、opts 全部沿用第 9 輪, 沒有增刪素材檔。唯一調整: 拿到卡過場改在商店也會出現、而且收下不播音效, 原本「收下時 ui_confirm 恢復音樂」的假設不成立, 所以讓 card_get 造成的壓低在下一個選單音自動恢復(只限 card_get, 不影響出口詢問框與暫停式引導)。事件表與同時觸發照 spec 補上商店買卡的 buy → card_get

- 打磨第 9 輪: 既有事件的素材、音量、opts 全部沿用; 只新增 row_swap、guide_pause、guide_card、guide_finale, 維持「木頭布料紙當動作、樂句當成就」: 換列與引導卡是動作 → Kenney 卡片滑動聲(跟 coin_tally 同一個 Kenney 賭場素材包); 引導收尾是全教學最大的成就 → 號角 + 小鼓(跟繞場同一顆小鼓)+ 煙火(跟大彩炮同一個煙火包)+ 觀眾「耶—」(跟大彩炮同一份錄音), 都是本作已出現過的聲音家族
- 照「按鍵直接回饋的音要在 0.03 秒內出聲」: row_swap 是按 Z 的直接回饋, 卡片滑動素材到峰值一成要 60~70 毫秒(前面是滑動前奏), 用播放起點跳過開頭 45 / 55 毫秒, 剩 15 毫秒; 原檔不改。guide_card 跟著 0.3 秒的彈入動畫, 保留滑動前奏當「滑進來」
- 照「量最響 50 毫秒響度來設相對音量」: guide_finale 設在 quest_done 之上約 2 dB(spec 要最盛大); 混音時另外量了三發煙火「起爆後 60 毫秒對起爆前」的響度差(各 +6~+8 dB), 確認煙火從號角裡浮出來, 第一版用較輕的煙火只有 +0.6 dB, 換掉。實際輕重待試玩
- 照「成對事件取同一個素材」的精神: 換列兩聲取同一包的兩種滑動; 引導卡與換列同一家族但一聲一快、一聲兩快, 可分辨
- guide_pause 照 spec 的「音樂盒停下 / 磁帶減速」: 從 CC0 音樂盒錄音取一小段, 用變速重新取樣讓速度從 1.0 一路降到 0.2(音高也跟著往下沉, 量得 1297 → 596 Hz), 不是程式合成
- 授權: 新素材全部 CC0(Kenney 卡片聲、BigSoundBank 音樂盒、Spring Spring 號角; 小鼓、煙火、觀眾歡呼沿用已登記的 CC0 素材)

- 打磨第 8 輪: 既有事件的素材、音量、opts 全部沿用, 拿掉 spec 不再用的 4 個事件與 3 個專屬素材檔。新增 13 個事件, 維持「鋼鼓當成就、木頭布料當動作」: 石碑、拿到卡是成就 → 跟 heal / unlock 同一套 Kenney 鋼鼓短句(boost_get 用上揚句升調, 比 heal 亮; card_get 用上行跑句加閃光, 比 quest_done 長、層數多); 下樓、開箱是動作 → 木頭腳步、金屬扣與木頭吱呀。表演卡音照 spec 寫實(雨、蹄、吼、煙火), 都短、都比 cue_fire 小
- 照「成對事件取同一個素材、前後呼應」: 散場與聚集取同一段空氣揮動循環的下降段與上升段, 一出一進; 大彩炮的吸入也用同一個上升段, 跟聚集是同一種「吸過來」
- 照「量最響 50 毫秒響度來設相對音量」: spec 寫「比 keg_blast 小很多」的爆竹, 換算後每聲約 −28 dB, keg_blast 疊層約 −7 dB; 表演卡音都設在 cue_fire(約 −10.7 dB)之下 5~8 dB。實際輕重待試玩確認
- 照「按鍵直接回饋的音要在 0.03 秒內出聲」: 本輪新音都不是按鍵回饋, 但仍量了到峰值一成的時間(腳步 0 毫秒、金屬扣 42 毫秒、爆竹 9 毫秒、大砰 12 毫秒、雨 13 毫秒); 刻意漸強的吸入聲(27 毫秒)由同一幀的 cue_fire 墊住立即出聲
- 照「解得開就不必只挑 WAV」: 用暫存資料夾裡上一輪抓的 WASM 解碼器直接量 ogg / mp3 的長度、包絡與音高走向來挑(例: 從 34 首 Kenney 鋼鼓 / 薩克斯短句挑「一路上揚」的兩首給石碑與遊行小號, 從 6 段煙火挑尾段有持續劈啪的那段當彩帶撒落); 要剪段、混音、變速的(雨、吸入、蓄力、小鼓、低吼)以帶抗混疊的重新取樣處理後內嵌 PCM
- 授權: 新素材全部 CC0。馬蹄聲的素材包混了 CC0 與 CC BY 4.0, 照包內的署名檔只挑標 CC0 的那個檔(卡通馬蹄)。電流蓄能聲頁面同時列 CC BY 3.0 與 CC0, 選 CC0。bart 的 Whoosh 1 / 2 是 GPL / CC BY-SA, 不收

- 打磨第 7 輪: 既有事件的素材、音量、opts 全部沿用; 只新增 quest_show、quest_done。風格照「撥弦 / 鋼鼓 / 銅管當成就音」: 從 OpenGameArt 的 CC0「Win Jingle」(作者 Fupi, 同一段旋律附十幾種樂器的 WAV)取銅管、鋼鼓、撥弦三軌自己混, 跟 capture(Kenney 撥弦)、heal(鋼鼓)、intermission(小號)同一家族。也比過 Kenney 音樂短樂句包的撥弦 / 鋼鼓 / 薩克斯 50 首(上揚的多是全音階跑動, 不像勝利收尾; 薩克斯音色太悶, 起音 40~90 毫秒)與 cynicmusic 的 CC0 勝利號角(11.8 秒太長)
- 照「先挑 WAV」: Win Jingle 有 WAV 原檔, 所以能在 Node 裡直接量起音、包絡、和弦位置, 剪輯後以 PCM 內嵌(兩段合計約 125 KB base64)。spec 要「約 1 秒」, 原句 2.1 秒, 任務完成用帶抗混疊的重新取樣加速 2 倍(不是硬剪, 保留整句的起承轉合); 任務卡只取前兩個和弦, 原速
- 相對音量照量出來的響度換算: 最響 50 毫秒響度 quest_done −12.6 dB、capture −11.6 dB(×0.75 後 −14.1), spec 要「比 capture 更大」, 音量設 1.2 → −11.0, 大約大 3 dB; quest_show 設 0.65 → −13.8, 跟 capture 差不多、比 quest_done 小。實際聽感待試玩
- 同時觸發的讓位寫在 sound.js 裡(收服第 3 隻只留 quest_done), RD 多呼叫也不會三聲疊在一起

- 打磨第 6 輪: spec 寫明音效與音樂沒有增刪、沒有改用途, 所有事件、素材、音量、opts 全部沿用第 5 輪, 只在 ui_denied 補註見習表演改成 3 隻。重新跑過語法檢查與冒煙測試(有 / 沒有 Web Audio 兩種情況, init 前呼叫、每個事件、每個 opts、未知名稱、靜音切換), credits 與 assets/ 對帳 64 = 64

- 按鍵直接回饋的音(ui_move / ui_confirm / ui_cancel / attack / skill)要在 0.03 秒內出聲: 沿用上一版(介面音選最短的、揮動聲剪掉開頭靜音後以 PCM 內嵌)。本輪新的 exit_prompt 雖不是按鍵回饋, 也量過: 門鈴 0.1 毫秒就到峰值一成, heat_warn 0.5 毫秒
- 背景音樂找現成整首截段、不自己合成, 每首循環 54~74 秒; 觀眾聲同理不用合成, 用真人群眾錄音, 循環長度 6~8 秒(群眾聲本身沒有旋律, 短循環較不易聽出重複), 並在每次換段時從隨機位置起播
- 授權: 觀眾歡呼為 CC BY 4.0, 署名照 incompetech 的格式寫進 credits.md, 並提醒製作人遊戲畫面要放署名
- 短音效以 base64 內嵌、頁面載入時用 OfflineAudioContext 先解碼, 第一次按鍵就有現成 buffer 可播; 觀眾聲的 mp3 / ogg 同樣內嵌, 解碼後在執行時把尾段交叉淡化進開頭做成無縫循環(本機沒有解碼器, 無法離線處理)
- 本機只有 Node 可用(Python、PowerShell、tar 都被權限擋): 照經驗優先挑 WAV(門鈴、掌聲)以便量起音、音高與長度; mp3 不重新編碼、依音框邊界截段, 並用音框側資訊的增益值粗估整首音量起伏, 挑平穩段落; ogg 依頁截短。mp3 / ogg 素材的實際響度量不到, 觀眾聲與表演音效的輕重比例待試玩確認
- 沿用上一版所有素材與音量; 只動了規格有改的: player_hurt 加重(spec 改成 3 顆心「要更有警覺感」)、拿掉 upgrade 與長鞭
- 打磨第 5 輪: 既有事件的素材與音量全部沿用(只有 ui_denied、ui_move、capture_ready、fruit_drop、dungeon_end 的呼叫時機照 spec 補註)。新增 6 個事件, 素材都從同一批來源找(Kenney 4 個素材包 + OpenGameArt 3 位作者), 維持「撥弦當情緒、布料木頭當動作、電子音只給警示」的分工: 前搖預告是警示 → 電子上揚音; 倒下的遺憾 → 跟 dungeon_end 同一套撥弦樂句; 換武器、丟繩是動作 → 布料與揮動聲(揮動聲跟普攻同一個素材包)
- 本輪終於能量 ogg / mp3: 在暫存資料夾用 Node 從 npm registry 抓純 WASM 的解碼器(不需 npm 指令), 每個候選都量了長度、峰值、最響 50 毫秒的響度、到峰值一成的時間與音高走向。按鍵直接回饋的兩個新音照「0.03 秒內出聲」: weapon_menu 原素材 31 毫秒才到峰值一成, 用播放起點剪掉開頭 25 毫秒; rope_throw 剪頭後內嵌 PCM, 11 毫秒。非按鍵回饋但開頭有靜音的(monster_windup 0.14 秒、fruit_eat 0.118 秒)也同樣從播放起點跳過, 原檔不改
- 相對音量用量出來的響度換算, 不是憑感覺: 例如 monster_windup 素材本身比 monster_cast 響 11 dB, spec 要它「比 cast 輕」, 所以音量設 0.07; weapon_menu 素材小聲 15 dB, 增益拉到 2.5 才跟 ui_confirm 相近。實際聽感仍待試玩
- 打磨第 4 輪: 其他事件的素材與音量全部沿用, 只做兩處。(1) 新增 clock_tick: 照「先挑 WAV」與「量出到峰值一成的時間」兩條挑素材, 比過 OpenGameArt 兩個 CC0 時鐘包, 選雜訊底 −61 dB、峰值前只有 5 毫秒起音的單拍; 剪掉開頭 32 毫秒靜音後內嵌, 2 毫秒內出聲, 跟時鐘彈跳同一幀。另一包是作者自稱爛麥克風錄的(雜訊底 −47 dB、峰值 −22 dB), 不用。(2) keg_fuse 跟著 spec 的引信 1.0 秒, 從播 0.6 秒改成 0.95 秒, 收尾淡出在爆炸前結束
