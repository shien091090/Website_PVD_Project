# 音訊素材署名

本作 `assets/` 內共 40 個檔案, 每檔一列。音效全部是 CC0(不需署名, 仍列出來源); 背景音樂是 CC BY 4.0, **遊戲畫面上(例: 全破畫面或說明頁最後)必須放署名**, 署名文字見本檔最下方。

`sound.js` 尾端內嵌的資料就是這些檔案(音效以 PCM、音樂以原 mp3 位元組 base64 內嵌), 不另計來源。

## 音效(CC0)

來源皆為: The Essential Retro Video Game Sound Effects Collection [512 sounds] — 作者 Juhani Junkala — 頁面 https://opengameart.org/content/512-sound-effects-8-bit-style — 授權 CC0 1.0(公有領域)

共同處理: 轉單聲道 16-bit 44.1 kHz wav; 去掉尾端靜音; 尾端加 5 毫秒淡出; 響度統一(最大 50 毫秒窗 RMS 拉到 −12 dBFS, 峰值上限 −1 dBFS)。下表「其他調整」只寫額外動作。

| 檔名 | 對應事件 | 原始檔 | 作者 | 授權 | 其他調整 |
|---|---|---|---|---|---|
| sfx_jump.wav | jump | sfx_movement_jump1.wav | Juhani Junkala | CC0 | 無 |
| sfx_land.wav | land、headStand(墊底層) | sfx_movement_jump19_landing.wav | Juhani Junkala | CC0 | 無 |
| sfx_head_stand.wav | headStand | sfx_sounds_interaction14.wav | Juhani Junkala | CC0 | 無 |
| sfx_spawn.wav | spawn | sfx_sounds_powerup3.wav | Juhani Junkala | CC0 | 無 |
| sfx_death.wav | death | sfx_exp_shortest_soft7.wav | Juhani Junkala | CC0 | 無 |
| sfx_whistle.wav | whistle | sfx_sound_refereewhistle.wav | Juhani Junkala | CC0 | 無 |
| sfx_aim_start.wav | aimStart | sfx_sounds_pause3_in.wav | Juhani Junkala | CC0 | 無 |
| sfx_aim_full.wav | aimFull | sfx_coin_single3.wav | Juhani Junkala | CC0 | 無 |
| sfx_hook_whoosh.wav | hookLaunch(咻) | sfx_wpn_sword1.wav | Juhani Junkala | CC0 | 無 |
| sfx_hook_rise.wav | hookLaunch(上揚) | sfx_sounds_powerup5.wav | Juhani Junkala | CC0 | 無 |
| sfx_hook_cancel.wav | hookCancel | sfx_sounds_pause3_out.wav | Juhani Junkala | CC0 | 無 |
| sfx_plate_on.wav | plateOn | sfx_sounds_button11.wav | Juhani Junkala | CC0 | 無 |
| sfx_plate_off.wav | plateOff | sfx_sounds_button12.wav | Juhani Junkala | CC0 | 無 |
| sfx_gate_open.wav | gateOpen | sfx_movement_dooropen2.wav | Juhani Junkala | CC0 | 無 |
| sfx_gate_close.wav | gateClose | sfx_movement_dooropen3.wav | Juhani Junkala | CC0 | 無 |
| sfx_lift_move.wav | liftMove | sfx_sound_mechanicalnoise3.wav | Juhani Junkala | CC0 | 只取前 0.6 秒, 尾端 0.2 秒淡出 |
| sfx_seesaw.wav | seesaw | sfx_sounds_impact8.wav | Juhani Junkala | CC0 | 無 |
| sfx_seesaw_launch.wav | seesawLaunch | sfx_movement_jump19.wav | Juhani Junkala | CC0 | 無 |
| sfx_button_press.wav | buttonPress | sfx_sound_bling.wav | Juhani Junkala | CC0 | 只取前 0.7 秒, 尾端 0.25 秒淡出 |
| sfx_crusher_rise.wav | crusherRise | sfx_sound_mechanicalnoise4.wav | Juhani Junkala | CC0 | 只取前 0.45 秒, 尾端 0.12 秒淡出 |
| sfx_crusher_warn.wav | crusherWarn | sfx_sound_nagger2.wav | Juhani Junkala | CC0 | 無 |
| sfx_crusher_slam.wav | crusherSlam | sfx_exp_short_hard1.wav | Juhani Junkala | CC0 | 無 |
| sfx_crush.wav | crush | sfx_exp_shortest_soft9.wav | Juhani Junkala | CC0 | 無 |
| sfx_level_clear.wav | levelClear | sfx_sounds_fanfare1.wav | Juhani Junkala | CC0 | 無 |
| sfx_level_fail.wav | levelFail | sfx_sounds_negative2.wav | Juhani Junkala | CC0 | 無 |
| sfx_restart.wav | restart | sfx_sounds_falling11.wav | Juhani Junkala | CC0 | 加速 1.5 倍(音高跟著升高), 取前 0.45 秒, 尾端 0.12 秒淡出 |
| sfx_unlock.wav | unlock | sfx_sounds_powerup2.wav | Juhani Junkala | CC0 | 無 |
| sfx_ui_page.wav | uiPage | sfx_menu_move2.wav | Juhani Junkala | CC0 | 無 |
| sfx_time_tick.wav | timeTick(polish-3 新增) | sfx_sounds_Blip1.wav | Juhani Junkala | CC0 | 前 5 毫秒後加指數衰減(時間常數 30 毫秒), 原檔是平坦方波 |
| sfx_hook_denied.wav | hookDenied(polish-3 新增) | sfx_sounds_Blip7.wav | Juhani Junkala | CC0 | 前 5 毫秒後加指數衰減(時間常數 18 毫秒), 原檔是平坦方波 |
| sfx_tutorial_show.wav | tutorialShow(polish-5 新增) | sfx_menu_move3.wav | Juhani Junkala | CC0 | 加速 1.25 倍(音高跟著升高); 前 5 毫秒後加指數衰減(時間常數 25 毫秒), 原檔是平坦方波 |
| sfx_tutorial_key1.wav | tutorialKey(index 0, polish-5 新增) | sfx_coin_single5.wav | Juhani Junkala | CC0 | 放慢為 0.75 倍(音高約 960 Hz) |
| sfx_tutorial_key2.wav | tutorialKey(index 1, polish-5 新增) | sfx_coin_single5.wav | Juhani Junkala | CC0 | 變速為 0.945 倍(比 key1 高大三度, 約 1225 Hz) |
| sfx_tutorial_key3.wav | tutorialKey(index 2, polish-5 新增) | sfx_coin_single5.wav | Juhani Junkala | CC0 | 變速為 1.124 倍(比 key1 高純五度, 約 1425 Hz) |
| sfx_tutorial_done.wav | tutorialDone(琶音, polish-5 新增) | sfx_sounds_powerup10.wav | Juhani Junkala | CC0 | 無 |
| sfx_tutorial_sparkle.wav | tutorialDone(閃亮聲, polish-5 新增) | sfx_coin_double4.wav | Juhani Junkala | CC0 | 無 |

## 背景音樂(CC BY 4.0)

| 檔名 | 對應曲名 | 原曲 | 原始頁面 | 作者 | 授權 | 剪輯 |
|---|---|---|---|---|---|---|
| music_title.mp3 | title | Monkeys Spinning Monkeys | https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1400011 | Kevin MacLeod (incompetech.com) | CC BY 4.0 | 只取開頭 53.55 秒(以 mp3 音框為單位截斷, 未重新編碼); 循環段 32 小節 |
| music_play.mp3 | play | Easy Lemon | https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1200076 | Kevin MacLeod (incompetech.com) | CC BY 4.0 | 只取開頭 70.45 秒(同上); 循環段 24 小節 |
| music_replay.mp3 | replay | Fluffing a Duck | https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1100768 | Kevin MacLeod (incompetech.com) | CC BY 4.0 | 整首, 只去掉檔頭標籤 |
| music_ending.mp3 | ending | Life of Riley | https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1400054 | Kevin MacLeod (incompetech.com) | CC BY 4.0 | 只取開頭 56.71 秒(同上); 循環段 24 小節 |

下載來源: `https://incompetech.com/music/royalty-free/mp3-royaltyfree/<曲名>.mp3`; 授權說明: https://incompetech.com/music/royalty-free/licenses/

### 遊戲內要放的署名文字(照抄)

```
"Monkeys Spinning Monkeys", "Easy Lemon", "Fluffing a Duck", "Life of Riley"
Kevin MacLeod (incompetech.com)
Licensed under Creative Commons: By Attribution 4.0 License
http://creativecommons.org/licenses/by/4.0/
```

音效: Juhani Junkala, "The Essential Retro Video Game Sound Effects Collection"(CC0, 署名非必要)
