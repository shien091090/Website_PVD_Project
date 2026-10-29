# 音效 / 音樂素材來源

授權統計: CC0 92 項(Kenney 62 檔 + OpenGameArt 9 檔 + 內嵌 21 段, 內嵌段的來源為 OpenGameArt、BigSoundBank 與本表已登記的 CC0 檔)、CC BY 4.0 8 項(背景音樂 5 檔 + 觀眾歡呼 2 檔 + 卡通馬蹄 1 檔; 馬蹄原錄音是 CC0, 但轉製者的整包頁面標 CC BY 4.0, 保守起見照 CC BY 署名)。另有 1 個程式產生的音效(heat_warn, 無外部素材, 不列)。

打磨第 11 輪異動: 新增 2 段內嵌(enter_pop: OpenGameArt EZduzziteh「pop sounds」的 pop9.wav, CC0; intermission_cheer: 本表已登記的 sfx_cheer.ogg 與 show_end 掌聲重新混音); assets/ 檔案不動。

打磨第 10 輪異動: 無(spec 沒有新音效, 素材全部沿用; 只調整 sound.js 的音樂壓低恢復時機)。

打磨第 9 輪異動: 新增 3 個檔(Kenney 賭場音效包的卡片滑動聲, 給 row_swap、guide_card)與 2 段內嵌(guide_pause: BigSoundBank 音樂盒; guide_finale: OpenGameArt 號角 + 已登記的小鼓、煙火、歡呼混音); 其他檔案不動。

打磨第 8 輪異動: 刪除 sfx_weapon_menu.ogg、sfx_freeze_glass.ogg、sfx_mark_add.ogg 與內嵌段 freeze_all(對應事件 spec 不再用); sfx_cheer.ogg 保留, 改給 confetti_burst 用。新增 15 個檔(Kenney 10 檔、OpenGameArt 5 檔)與 6 段內嵌, 給本輪新增的 13 個事件用; 其他檔案不動。

打磨第 7 輪異動: 新增內嵌段 quest_show、quest_done(Fupi「Win Jingle」, CC0); assets/ 檔案不動。

打磨第 6 輪異動: 無(素材全部沿用)。

打磨第 5 輪異動: 新增 9 個檔(Kenney 7 檔、OpenGameArt 2 檔)與 1 段內嵌(rope_throw), 給本輪新增的 6 個事件用; 既有檔案不動。

打磨第 4 輪異動: 新增內嵌段 clock_tick(bart 的 CC0 時鐘單拍)。keg_fuse 素材不變, 只把播放長度從 0.6 秒改成 0.95 秒。

打磨第 3 輪異動: 拿掉 sfx_upgrade.ogg(個別升級移除)與長鞭普攻的內嵌段 attack_whip(長鞭移除); 新增 sfx_crowd_cheer.mp3、sfx_crowd_frenzy.mp3、sfx_crowd_unrest.ogg 與內嵌段 exit_prompt、crowd_clap。

## 遊戲畫面需要放的署名(CC BY 4.0)

背景音樂(Kevin MacLeod)與觀眾歡呼聲(Gregor Quendel)依授權須署名。建議放在總結算畫面或開始畫面角落(由製作人決定位置):

```
Music: "Waunobe March", "Monster Promenade", "Easy Lemon (60 second)", "Four Beers' Polka", "Happy Boy End Theme"
Kevin MacLeod (incompetech.com)
Licensed under Creative Commons: By Attribution 4.0
https://creativecommons.org/licenses/by/4.0/

Crowd cheering: "Free Crowd Cheering Sounds" by Gregor Quendel (gregorquendel.com)
Licensed under CC BY 4.0 — https://creativecommons.org/licenses/by/4.0/

Hooves: "Horse gallop on different surfaces" by congusbongus (opengameart.org),
adapted from "cartoon horse gallop.wav" by martian (freesound.org, CC0)
Licensed under CC BY 4.0 — https://creativecommons.org/licenses/by/4.0/
```

## 卡通馬蹄(assets/, CC BY 4.0)

| 檔名 | 事件 | 原始頁面(原檔名) | 作者 | 授權 | 剪輯 |
|---|---|---|---|---|---|
| sfx_rush_hooves.mp3 | rush(馬蹄層, 三輪) | https://opengameart.org/content/horse-gallop-on-different-surfaces (archive.zip 內的 clicky.mp3) | congusbongus 轉製; 原錄音 martian「cartoon horse gallop.wav」https://freesound.org/people/martian/sounds/393857/ | 包內 credits.txt 標這個檔的來源為 CC0; 頁面整包標 CC BY 4.0(混 CC0 與 CC BY), 保守起見照 CC BY 4.0 署名 | 無(播放時速度 1.15) |

## 觀眾歡呼聲(assets/, CC BY 4.0)

| 檔名 | 事件 | 原始頁面(原檔名) | 作者 | 授權 | 剪輯 |
|---|---|---|---|---|---|
| sfx_crowd_cheer.mp3 | crowd_cheer(循環) | https://opengameart.org/content/free-crowd-cheering-sounds (Gregor Quendel - Crowd Cheering Sounds - 03 - Strong cheering - I.mp3) | Gregor Quendel | CC BY 4.0 | 取 6.0~14.4 秒(8.4 秒), 依 mp3 音框邊界截斷、未重新編碼; 播放時去頭 0.15 秒、尾段 1.2 秒交叉淡化進開頭做成循環 |
| sfx_crowd_frenzy.mp3 | crowd_frenzy(循環, 主層) | https://opengameart.org/content/free-crowd-cheering-sounds (Gregor Quendel - Crowd Cheering Sounds - 01 - Strong cheering and strong rhythmic cheering.mp3) | Gregor Quendel | CC BY 4.0 | 同上(6.0~14.4 秒) |

## 背景音樂(assets/, CC BY 4.0)

| 檔名 | 事件 | 原始頁面 | 作者 | 授權 | 剪輯 |
|---|---|---|---|---|---|
| music_title.mp3 | 音樂 title | https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1100016 ("Waunobe March") | Kevin MacLeod (incompetech.com) | CC BY 4.0 | 取開頭 70.6 秒(102 BPM × 30 小節), 依 mp3 音框邊界截斷、拿掉 ID3 標籤; 未重新編碼 |
| music_dungeon.mp3 | 音樂 dungeon | https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1100478 ("Monster Promenade") | Kevin MacLeod (incompetech.com) | CC BY 4.0 | 取開頭 73.8 秒(117 BPM × 36 小節), 同上 |
| music_setup.mp3 | 音樂 setup | https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1200077 ("Easy Lemon (60 second)") | Kevin MacLeod (incompetech.com) | CC BY 4.0 | 全曲 62.5 秒, 只拿掉 ID3 標籤 |
| music_show.mp3 | 音樂 show | https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1100225 ("Four Beers' Polka") | Kevin MacLeod (incompetech.com) | CC BY 4.0 | 取開頭 73.6 秒(124 BPM × 38 小節), 同上 |
| music_result.mp3 | 音樂 result | https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1100648 ("Happy Boy End Theme") | Kevin MacLeod (incompetech.com) | CC BY 4.0 | 全曲 53.9 秒, 只拿掉 ID3 標籤 |

授權依據: https://incompetech.com/music/royalty-free/faq.html(Creative Commons: By Attribution 4.0)。

## 短音效(assets/, CC0)

原始頁面是 kenney.nl 的出自 Kenney(頁面標示 CC0), 其餘出自 OpenGameArt(作者欄另列)。檔案為原檔直接複製改名, 未剪輯; 音量、音高(播放速度)與截斷長度在 sound.js 裡調。sound.js 另以 base64 內嵌同一份 ogg 供 Web Audio 解碼。

| 檔名 | 事件 | 原始頁面(原檔名) | 作者 | 授權 | 剪輯 |
|---|---|---|---|---|---|
| sfx_ui_move.ogg | ui_move | https://kenney.nl/assets/interface-sounds (tick_002.ogg) | Kenney | CC0 | 無 |
| sfx_ui_confirm.ogg | ui_confirm | https://kenney.nl/assets/interface-sounds (select_002.ogg) | Kenney | CC0 | 無 |
| sfx_ui_cancel.ogg | ui_cancel | https://kenney.nl/assets/interface-sounds (back_002.ogg) | Kenney | CC0 | 無 |
| sfx_ui_denied.ogg | ui_denied | https://kenney.nl/assets/interface-sounds (error_004.ogg) | Kenney | CC0 | 無 |
| sfx_title_start.ogg | title_start | https://kenney.nl/assets/music-jingles (jingles_PIZZI03.ogg) | Kenney | CC0 | 無 |
| sfx_calendar_flip.ogg | calendar_flip | https://kenney.nl/assets/rpg-audio (bookFlip2.ogg) | Kenney | CC0 | 無 |
| sfx_hit_monster.ogg | hit_monster | https://kenney.nl/assets/impact-sounds (impactPunch_medium_000.ogg) | Kenney | CC0 | 無 |
| sfx_monster_weak.ogg | monster_weak | https://kenney.nl/assets/interface-sounds (glass_002.ogg) | Kenney | CC0 | 無 |
| sfx_monster_cast.ogg | monster_cast | https://kenney.nl/assets/sci-fi-sounds (laserSmall_002.ogg) | Kenney | CC0 | 無 |
| sfx_player_hurt.ogg | player_hurt | https://kenney.nl/assets/impact-sounds (impactPunch_heavy_000.ogg) | Kenney | CC0 | 無 |
| sfx_player_hurt_tone.ogg | player_hurt(疊層) | https://kenney.nl/assets/digital-audio (lowDown.ogg) | Kenney | CC0 | 無 |
| sfx_capture_ready.ogg | capture_ready | https://kenney.nl/assets/rpg-audio (beltHandle1.ogg) | Kenney | CC0 | 無 |
| sfx_capture.ogg | capture | https://kenney.nl/assets/music-jingles (jingles_PIZZI10.ogg) | Kenney | CC0 | 無 |
| sfx_lasso_break.ogg | lasso_break | https://kenney.nl/assets/rpg-audio (chop.ogg) | Kenney | CC0 | 無(播放時速度 1.15) |
| sfx_kill.ogg | kill | https://kenney.nl/assets/rpg-audio (handleCoins2.ogg) | Kenney | CC0 | 無 |
| sfx_bush_hide.ogg | bush_hide | https://kenney.nl/assets/impact-sounds (footstep_grass_001.ogg) | Kenney | CC0 | 無 |
| sfx_fruit_drop.ogg | fruit_drop | https://kenney.nl/assets/impact-sounds (impactSoft_medium_001.ogg) | Kenney | CC0 | 無 |
| sfx_keg_fuse.ogg | keg_fuse | https://kenney.nl/assets/sci-fi-sounds (thrusterFire_000.ogg) | Kenney | CC0 | 檔案未剪(原長 5.0 秒); 播放時只放前 0.95 秒並淡出 |
| sfx_keg_blast.ogg | keg_blast | https://kenney.nl/assets/sci-fi-sounds (explosionCrunch_000.ogg) | Kenney | CC0 | 無 |
| sfx_boom_low.ogg | keg_blast、loose(低頻疊層) | https://kenney.nl/assets/sci-fi-sounds (lowFrequency_explosion_001.ogg) | Kenney | CC0 | 無 |
| sfx_wall_crack.ogg | wall_crack、wall_break(疊層) | https://kenney.nl/assets/impact-sounds (impactMining_000.ogg) | Kenney | CC0 | 無 |
| sfx_wall_break.ogg | wall_break | https://kenney.nl/assets/sci-fi-sounds (explosionCrunch_002.ogg) | Kenney | CC0 | 無 |
| sfx_teleport.ogg | teleport | https://kenney.nl/assets/digital-audio (phaseJump1.ogg) | Kenney | CC0 | 無 |
| sfx_heal.ogg | heal | https://kenney.nl/assets/music-jingles (jingles_STEEL09.ogg) | Kenney | CC0 | 無 |
| sfx_dungeon_end.ogg | dungeon_end(時間到 / 見習完成) | https://kenney.nl/assets/music-jingles (jingles_PIZZI04.ogg) | Kenney | CC0 | 無 |
| sfx_dungeon_end_down.ogg | dungeon_end(倒下) | https://kenney.nl/assets/digital-audio (zapThreeToneDown.ogg) | Kenney | CC0 | 無 |
| sfx_show_start.ogg | show_start | https://kenney.nl/assets/music-jingles (jingles_PIZZI07.ogg) | Kenney | CC0 | 無 |
| sfx_perform.ogg | perform | https://kenney.nl/assets/interface-sounds (pluck_001.ogg) | Kenney | CC0 | 無 |
| sfx_ignite.ogg | ignite | https://kenney.nl/assets/digital-audio (phaserUp2.ogg) | Kenney | CC0 | 無 |
| sfx_calm.ogg | calm | https://kenney.nl/assets/digital-audio (phaserDown2.ogg) | Kenney | CC0 | 無 |
| sfx_special.ogg | special | https://kenney.nl/assets/digital-audio (zapTwoTone.ogg) | Kenney | CC0 | 無 |
| sfx_angry_perform.ogg | angry_perform(原 red_perform, 打磨第 2 輪改名, 素材不變) | https://kenney.nl/assets/music-jingles (jingles_HIT00.ogg) | Kenney | CC0 | 無 |
| sfx_chain.ogg | chain | https://kenney.nl/assets/interface-sounds (pluck_002.ogg) | Kenney | CC0 | 無(播放時依段數升調) |
| sfx_cue_fire.ogg | cue_fire | https://kenney.nl/assets/interface-sounds (confirmation_001.ogg) | Kenney | CC0 | 無 |
| sfx_loose.ogg | loose | https://kenney.nl/assets/impact-sounds (impactBell_heavy_001.ogg) | Kenney | CC0 | 無 |
| sfx_crowd_step_1.ogg | crowd_flee | https://kenney.nl/assets/impact-sounds (footstep_concrete_000.ogg) | Kenney | CC0 | 無 |
| sfx_crowd_step_2.ogg | crowd_flee | https://kenney.nl/assets/impact-sounds (footstep_concrete_002.ogg) | Kenney | CC0 | 無 |
| sfx_crowd_step_3.ogg | crowd_flee | https://kenney.nl/assets/impact-sounds (footstep_concrete_004.ogg) | Kenney | CC0 | 無 |
| sfx_coin_tally.ogg | coin_tally | https://kenney.nl/assets/casino-audio (chips-stack-5.ogg) | Kenney | CC0 | 無 |
| sfx_buy.ogg | buy | https://kenney.nl/assets/rpg-audio (handleCoins.ogg) | Kenney | CC0 | 無 |
| sfx_unlock.ogg | unlock | https://kenney.nl/assets/music-jingles (jingles_STEEL04.ogg) | Kenney | CC0 | 無 |
| sfx_tutorial_done.ogg | tutorial_done | https://kenney.nl/assets/interface-sounds (maximize_001.ogg) | Kenney | CC0 | 無 |
| sfx_star.ogg | star | https://kenney.nl/assets/interface-sounds (glass_001.ogg) | Kenney | CC0 | 無(播放時依第幾顆升調) |
| sfx_monster_windup.ogg | monster_windup | https://kenney.nl/assets/digital-audio (highUp.ogg) | Kenney | CC0 | 無(播放時跳過開頭 0.14 秒靜音、速度 1.2) |
| sfx_player_down_hit.ogg | player_down(重擊層) | https://kenney.nl/assets/impact-sounds (impactPunch_heavy_002.ogg) | Kenney | CC0 | 無 |
| sfx_player_down_fall.ogg | player_down(倒地層) | https://kenney.nl/assets/impact-sounds (impactSoft_heavy_003.ogg) | Kenney | CC0 | 無(播放時速度 0.85) |
| sfx_player_down_tone.ogg | player_down(遺憾撥弦層) | https://kenney.nl/assets/music-jingles (jingles_PIZZI05.ogg) | Kenney | CC0 | 無(播放時速度 0.89) |
| sfx_rope_escape_slap.ogg | rope_escape(輕拍層) | https://kenney.nl/assets/impact-sounds (impactGeneric_light_001.ogg) | Kenney | CC0 | 無 |
| sfx_fruit_eat_ding.ogg | fruit_eat(回復小叮層) | https://kenney.nl/assets/interface-sounds (glass_005.ogg) | Kenney | CC0 | 無(播放時速度 1.5 / 2.0 各一聲) |
| sfx_stairs_step_1.ogg | stairs_down、stairs_up(腳步, 第 1、3 步與回音) | https://kenney.nl/assets/impact-sounds (footstep_wood_000.ogg) | Kenney | CC0 | 無(播放時速度下樓 1.0 → 0.82 逐步降低、上樓 0.88 → 1.06 逐步升高) |
| sfx_stairs_step_2.ogg | stairs_down、stairs_up(腳步, 第 2、4 步與回音) | https://kenney.nl/assets/impact-sounds (footstep_wood_002.ogg) | Kenney | CC0 | 同上 |
| sfx_boost_get.ogg | boost_get(鋼鼓上揚句) | https://kenney.nl/assets/music-jingles (jingles_STEEL10.ogg) | Kenney | CC0 | 無(播放時速度 1.26, 升 4 個半音) |
| sfx_boost_ding.ogg | boost_get(尾端玻璃叮) | https://kenney.nl/assets/interface-sounds (glass_006.ogg) | Kenney | CC0 | 無(播放時速度 1.5) |
| sfx_chest_latch.ogg | chest_open(金屬扣「喀」) | https://kenney.nl/assets/rpg-audio (metalLatch.ogg) | Kenney | CC0 | 無 |
| sfx_chest_creak.ogg | chest_open(木頭吱呀) | https://kenney.nl/assets/rpg-audio (creak3.ogg) | Kenney | CC0 | 無(播放時速度 1.1) |
| sfx_sparkle.ogg | chest_open、card_get、gold_get(閃光) | https://kenney.nl/assets/interface-sounds (glass_003.ogg) | Kenney | CC0 | 無(播放時速度 1.5~3.0) |
| sfx_card_get.ogg | card_get(鋼鼓上行跑句) | https://kenney.nl/assets/music-jingles (jingles_STEEL02.ogg) | Kenney | CC0 | 無(播放時速度 1.15) |
| sfx_parade_horn.ogg | parade(小號層) | https://kenney.nl/assets/music-jingles (jingles_SAX15.ogg) | Kenney | CC0 | 無(播放時速度 1.12) |
| sfx_rush_hit.ogg | rush_hit(「碰」) | https://kenney.nl/assets/impact-sounds (impactPunch_medium_001.ogg) | Kenney | CC0 | 無 |
| sfx_row_swap_a.ogg | row_swap(第一聲「刷」) | https://kenney.nl/assets/casino-audio (card-slide-2.ogg) | Kenney | CC0 | 無(播放時跳過開頭 0.045 秒的滑動前奏) |
| sfx_row_swap_b.ogg | row_swap(第二聲「刷」) | https://kenney.nl/assets/casino-audio (card-slide-3.ogg) | Kenney | CC0 | 無(播放時跳過開頭 0.055 秒、速度 1.08) |
| sfx_guide_card.ogg | guide_card | https://kenney.nl/assets/casino-audio (card-slide-4.ogg) | Kenney | CC0 | 無(播放時速度 0.9) |
| sfx_rope_escape_boing.mp3 | rope_escape(彈簧層)、gather(收尾「啵」)、rush_hit(彈開) | https://opengameart.org/node/183321 「Silly Sound Effects」(blung_0.mp3) | EZduzziteh | CC0 | 無(播放時速度 rope_escape 1.1、gather 1.5、rush_hit 0.8) |
| sfx_firecracker_a.ogg | firecracker(劈啪) | https://opengameart.org/content/25-cc0-bang-firework-sfx (25-CC0-bang-sfx.zip 內的 shot_03.ogg) | rubberduck | CC0 | 無(播放時速度 1.7~2.3) |
| sfx_firecracker_b.ogg | firecracker(劈啪) | https://opengameart.org/content/25-cc0-bang-firework-sfx (25-CC0-bang-sfx.zip 內的 shot_01.ogg) | rubberduck | CC0 | 同上 |
| sfx_confetti_bang.ogg | confetti_burst(大砰) | https://opengameart.org/content/25-cc0-bang-firework-sfx (25-CC0-bang-sfx.zip 內的 bang_06.ogg) | rubberduck | CC0 | 無 |
| sfx_confetti_crackle.ogg | confetti_burst(煙火劈啪尾音) | https://opengameart.org/content/25-cc0-bang-firework-sfx (25-CC0-bang-sfx.zip 內的 fw_03.ogg) | rubberduck | CC0 | 無 |
| sfx_gold_splash.ogg | gold_get(金幣撒地「嘩啦」, 打磨第 12 輪新增) | https://opengameart.org/content/coin-splash (coinsplash_0.ogg) | LordTomorrow | CC0(頁面 License 欄與 Copyright/Attribution Notice 皆標 CC0) | 無(原檔直接下載改名; 播放時三層錯開, 速度 1.0 / 1.18 / 0.9) |
| sfx_fruit_eat.ogg | fruit_eat(咬一口) | https://opengameart.org/content/7-eating-crunches (crunch_-_tito.zip 內的 crunch.4.ogg) | StarNinjas(作者說明由其弟 Tito 錄製) | CC0 | 無(播放時跳過開頭 0.118 秒靜音) |
| sfx_intermission.ogg | intermission | https://opengameart.org/content/classic-fanfare-lick (fanfare.ogg) | fvcalderan | CC0 | 無。作者在留言說明是自己用 GarageBand 內建樂器演奏, 非套用現成樂句 |
| sfx_cheer.ogg | confetti_burst(觀眾「耶—」層; 打磨第 8 輪前給 cheer 用) | https://opengameart.org/content/cheers-0 (cheers.ogg) | Nocturnal_Vanguard | CC0 | 無 |
| sfx_crowd_unrest.ogg | crowd_frenzy(循環, 騷動疊層) | https://opengameart.org/content/crowd-shoutingspeaking-ambience (crowd_shouting.ogg) | StarNinjas | CC0 | 只留開頭約 10.2 秒(依 Ogg 頁截斷、最後一頁標結尾並重算檢查碼, 未重新編碼); 播放時去頭 0.6 秒、尾段 1.5 秒交叉淡化進開頭做成循環。作者表示樂見署名但不強制 |

## 內嵌於 sound.js 的音效(無獨立檔, CC0)

原檔是 WAV, 本機沒有可用的 ogg / mp3 編碼器, 所以剪輯後轉成 16-bit 單聲道 22.05 kHz PCM, 以 base64 內嵌在 sound.js(沒有 Web Audio 時包成 WAV data URI 播放)。

| 內嵌鍵 | 事件 | 原始頁面(原檔名) | 作者 | 授權 | 剪輯 |
|---|---|---|---|---|---|
| attack_club | attack(weapon: club) | https://opengameart.org/content/swishes-sound-pack (swish-2.wav) | artisticdude | CC0 | 去頭尾靜音、混成單聲道、降取樣 22.05 kHz、峰值正規化 −1 dBFS |
| attack_sword | attack(weapon: sword) | https://opengameart.org/content/swishes-sound-pack (swish-13.wav) | artisticdude | CC0 | 同上 |
| attack_spear | attack(weapon: spear) | https://opengameart.org/content/swishes-sound-pack (swish-11.wav) | artisticdude | CC0 | 同上 |
| skill | skill | https://opengameart.org/content/swishes-sound-pack (swish-7.wav) | artisticdude | CC0 | 同上 |
| show_end | show_end | https://opengameart.org/content/applause-in-a-large-hall-or-church (applause-clapping-church-crowd-immersive.wav) | eXpl0it3r | CC0 | 取全曲最響的 3 秒(4.6~7.6 秒), 淡入 0.03 秒、淡出 0.9 秒, 單聲道 22.05 kHz, 峰值正規化 −1 dBFS |
| exit_prompt | exit_prompt | https://opengameart.org/content/doorbell (doorbell.wav) | frosty ham | CC0 | 混成單聲道、48 kHz 降為 22.05 kHz、剪掉尾端 −50 dB 以下、淡出 0.15 秒、峰值正規化 −1 dBFS(0.93 秒, C5 → A4 兩音) |
| crowd_clap | crowd_clap(循環) | https://opengameart.org/content/applause-in-a-large-hall-or-church (applause-clapping-church-crowd-immersive.wav) | eXpl0it3r | CC0 | 從掌聲漸弱的尾段(33.0~36.8 秒)切出 16 個單拍, 以 5 人各自節奏、拍一陣停一下的方式重新散佈成 6 秒首尾相接的循環(約每秒 10 拍), 單聲道 22.05 kHz, 峰值正規化 −3 dBFS |
| rope_throw | rope_throw | https://opengameart.org/content/swishes-sound-pack (swish-6.wav) | artisticdude | CC0 | 剪掉開頭 15 毫秒、混成單聲道、44.1 kHz 降為 22.05 kHz、尾端淡出 15 毫秒、峰值正規化 −1 dBFS(0.12 秒) |
| clock_tick | clock_tick | https://opengameart.org/content/ticking-clock (ticks.zip 內的 ticking clock - tick1.wav) | bart | CC0 | 剪掉開頭 32 毫秒靜音、取 0.135 秒、淡入 1 毫秒、淡出 20 毫秒, 混成單聲道 44.1 kHz 16-bit, 峰值正規化 −1 dBFS。作者表示樂見署名但不強制 |
| quest_show | quest_show | https://opengameart.org/content/win-jingle (winjingle.zip 內的 WinBrass.wav、WinSteelDrums.wav) | Fupi | CC0 | 取兩軌開頭 0~1.0 秒(前兩個和弦), 銅管 1.0 + 鋼鼓 0.35 混成單聲道、44.1 kHz 降為 22.05 kHz, 淡入 2 毫秒、0.86~1.0 秒淡出, 峰值正規化 −1 dBFS(1.0 秒) |
| quest_done | quest_done | https://opengameart.org/content/win-jingle (winjingle.zip 內的 WinBrass.wav、WinSteelDrums.wav、WinPizzicato.wav) | Fupi | CC0 | 取三軌 0~2.4 秒(整段樂句), 銅管 1.0 + 鋼鼓 0.35 + 撥弦 0.5 混成單聲道, 以視窗化 sinc 重新取樣加速 2 倍(音高升八度)並輸出 22.05 kHz, 淡入 2 毫秒、1.04~1.14 秒淡出, 峰值正規化 −1 dBFS(1.14 秒) |

| parade_snare | parade(小鼓, 四擊) | https://opengameart.org/content/an-interesting-snare-drum-sound (best_snare.wav) | Spring Spring | CC0 | 去掉開頭靜音、取 0.25 秒、0.08 秒淡出, 混成單聲道、48 kHz 降為 22.05 kHz, 峰值正規化 −1 dBFS |
| scatter | scatter | https://opengameart.org/content/air-whoosh (whoosh2.wav) | pyranostudios | CC0 | 取循環中一次下降段 1.10~1.95 秒, 淡入 10 毫秒、淡出 0.25 秒, 單聲道 22.05 kHz, 峰值正規化 −1 dBFS(0.85 秒) |
| gather | gather | https://opengameart.org/content/air-whoosh (whoosh2.wav) | pyranostudios | CC0 | 取上升段 0.80~1.32 秒, 重新取樣加速 1.15 倍, 淡入 20 毫秒、淡出 40 毫秒, 單聲道 22.05 kHz, 峰值正規化 −1 dBFS(0.45 秒) |
| rush_growl | rush(低吼層) | https://opengameart.org/content/rpg-sound-pack (rpg_sound_pack.zip 內的 NPC/giant/giant2.wav) | artisticdude | CC0 | 取開頭 0.75 秒、重新取樣放慢 0.8 倍(音高降低)、去開頭靜音、淡出 0.12 秒, 單聲道 22.05 kHz, 峰值正規化 −1 dBFS(0.92 秒) |
| rain | rain | https://opengameart.org/content/rain-loopable (Rain OGG.zip 內的 2.ogg) | Ylmir | CC0 | 取 5.0~6.6 秒, 淡入 0.06 秒、淡出 0.45 秒, 混成單聲道、44.1 kHz 降為 22.05 kHz, 峰值正規化 −1 dBFS(1.6 秒) |
| confetti_charge | confetti_charge | https://opengameart.org/content/air-whoosh (whoosh2.wav)+ https://opengameart.org/content/overloading-sound (overloading.wav) | pyranostudios + jwiese | 兩者 CC0(overloading 頁面同時列 CC BY 3.0 與 CC0, 選 CC0) | 吸入: whoosh2 的上升段 0.80~1.40 秒; 蓄力: overloading 的 0.4~2.0 秒重新取樣加速 1.6 倍(1.0 秒, 音高一路上升), 音量 0.45 → 1 漸強; 兩段 60 毫秒等功率交叉淡化接起, 單聲道 22.05 kHz, 峰值正規化 −1 dBFS(1.54 秒) |
| guide_pause | guide_pause | https://bigsoundbank.com/plush-music-box-2-s0416.html (「Plush music box #2」, 0416.wav) | Joseph Sardin(BigSoundBank) | CC0(頁面標「CC0 (public domain): Free and royalty-free」, 免登入下載) | 取 10.966 秒起的一個音與其後兩三個音, 以視窗化 sinc 變速重新取樣: 前 0.1 秒原速, 之後速度從 1.0 降到 0.2(音高跟著下沉, 像磁帶減速), 輸出 0.62 秒; 0.42~0.62 秒淡出, 單聲道 22.05 kHz, 峰值正規化 −1 dBFS |
| guide_finale | guide_finale | 號角: https://opengameart.org/content/just-a-random-fanfare (fanfare.ogg); 小鼓: https://opengameart.org/content/an-interesting-snare-drum-sound (best_snare.wav); 煙火: https://opengameart.org/content/25-cc0-bang-firework-sfx (25-CC0-bang-sfx.zip 內的 fw_06.ogg、bang_09.ogg、bang_07.ogg); 歡呼: 本表的 sfx_cheer.ogg(https://opengameart.org/content/cheers-0) | 號角 Spring Spring(Julie Damsgaard, 註明「Produced by Julie Damsgaard/Spring Spring/Spring Enterprises」); 小鼓 Spring Spring; 煙火 rubberduck; 歡呼 Nocturnal_Vanguard | 全部 CC0 | 號角取第一句 0~2.4 秒(2.1~2.38 秒淡出); 小鼓單擊取 0.14 秒、每秒 28 擊輕重交替排成 0~1.95 秒由小漸大的滾奏; 三發煙火的起音對準 0.2 / 0.9 / 1.6 秒; 歡呼從 0.3 秒起; 四層混成單聲道 32 kHz、2.2~2.5 秒淡出、峰值正規化 −1 dBFS(2.5 秒) |
| enter_pop | enter_pop | https://opengameart.org/content/pop-sounds-0 (pop9.wav) | EZduzziteh | CC0 | 從到峰值一成前 1 毫秒起剪(去掉開頭 3.7 毫秒)、剪掉尾端峰值 0.3% 以下、尾端淡出 5 毫秒, 混成單聲道 44.1 kHz 16-bit, 峰值正規化 −1 dBFS(0.085 秒); 播放時依第幾隻升調 |
| intermission_cheer | intermission_cheer | 歡呼: 本表的 sfx_cheer.ogg(https://opengameart.org/content/cheers-0); 掌聲: 本表內嵌段 show_end 的來源(https://opengameart.org/content/applause-in-a-large-hall-or-church, applause-clapping-church-crowd-immersive.wav) | 歡呼 Nocturnal_Vanguard; 掌聲 eXpl0it3r | 兩者 CC0 | 歡呼跳過開頭 0.12 秒、48 kHz 以視窗化 sinc 降為 22.05 kHz、延後 0.02 秒; 掌聲取 show_end 內嵌段 0.35 秒起、比歡呼低約 7 dB; 兩層相加後二階低通 5 kHz、0.75~1.05 秒淡出, 單聲道 22.05 kHz, 峰值正規化 −1 dBFS(1.05 秒) |

## 核對

assets/ 共 80 個檔 = 背景音樂 5 列 + 觀眾歡呼 2 列 + 卡通馬蹄 1 列 + 短音效 72 列(打磨第 12 輪新增 sfx_gold_splash.ogg); 另 21 段內嵌於 sound.js(heat_warn 為程式產生, 不在此表)。沒有未登記的檔。
