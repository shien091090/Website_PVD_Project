# 素材來源與授權

`assets/` 裡每個檔各一列(73 列 = 66 個音效 + 7 首背景音樂; polish 第 2 輪新增 4 個音效, 標「第 2 輪新增」; polish 第 3 輪重做 `shockwave`、剪短 `slash`, 檔數不變, 用的仍是下表既有素材包; polish 第 5 輪新增 10 個教學音效、重做 `tutorial_done`, 標「第 5 輪」, 只多用了一個 Kenney 包 K-CA; polish 第 6 輪新增 `tut_go`, 標「第 6 輪」, 用既有素材包 K-IF、K-MJ)。音效是從下列素材包剪輯、疊層後重新輸出的, 「來源」欄列出用到的原始檔。

## 素材包

| 代號 | 素材包 | 原始頁面 | 作者 | 授權 |
|---|---|---|---|---|
| K-IF | Interface Sounds | https://kenney.nl/assets/interface-sounds | Kenney (kenney.nl) | CC0 1.0 |
| K-IM | Impact Sounds | https://kenney.nl/assets/impact-sounds | Kenney (kenney.nl) | CC0 1.0 |
| K-RPG | RPG Audio | https://kenney.nl/assets/rpg-audio | Kenney (kenney.nl) | CC0 1.0 |
| K-SF | Sci-fi Sounds | https://kenney.nl/assets/sci-fi-sounds | Kenney (kenney.nl) | CC0 1.0 |
| K-MJ | Music Jingles | https://kenney.nl/assets/music-jingles | Kenney (kenney.nl) | CC0 1.0 |
| K-CA | Casino Audio(第 5 輪新用) | https://kenney.nl/assets/casino-audio | Kenney (kenney.nl) | CC0 1.0 |
| R80 | 80 CC0 RPG SFX | https://opengameart.org/content/80-cc0-rpg-sfx | rubberduck | CC0 1.0 |
| TS | Fantasy Sound Effects (Tinysized SFX) | https://opengameart.org/content/fantasy-sound-effects-tinysized-sfx | Vehicle(Jan Schupke) | CC0 1.0 |
| BT | Battle Sound Effects | https://opengameart.org/content/battle-sound-effects | artisticdude(作品頁由 Ogrebane 上傳) | 頁面同時列 CC-BY 3.0 / CC-BY-SA 3.0 / CC0, **選 CC0** |
| KM | 背景音樂(見下表) | incompetech.com | Kevin MacLeod | CC BY 4.0(需署名) |

所有音效共同的處理: 混成單聲道 44.1 kHz、裁掉開頭靜音、統一響度(最響 50 毫秒的 RMS, 數值見 sound.md)、峰值 −1 dBFS(必要時限幅 ≤ 4 dB)、檔頭加 20 毫秒數位靜音、用 lamejs 轉 mp3 96 kbps。下表「剪輯」欄只寫額外的處理。

## 音效(全部 CC0)

| 檔名 | 對應事件 | 來源(素材包 / 原始檔) | 剪輯 |
|---|---|---|---|
| sfx_ui_move.mp3 | ui_move | K-IM impactWood_light_000 | 無 |
| sfx_ui_confirm.mp3 | ui_confirm | K-IM impactWood_heavy_000 + K-IF toggle_001 | 兩層疊加(喀嚓 −6 dB) |
| sfx_ui_back.mp3 | ui_back | K-IF back_002 | 無 |
| sfx_ui_deny.mp3 | ui_deny | K-IF error_007 | 無 |
| sfx_title_start.mp3 | title_start | K-RPG doorOpen_1 + K-MJ jingles_PIZZI10 | 開門聲後 0.25 秒疊上揚撥弦 |
| sfx_unlock_level.mp3 | unlock_level | K-MJ jingles_STEEL10 + K-IM impactPlank_medium_001 | 疊木板一擊(−6 dB) |
| sfx_repair.mp3 | repair | R80 stones_04 + K-IM impactPlank_medium_001、impactPlank_medium_002 | 石塊落定後 0.12 / 0.32 秒兩下釘木板 |
| sfx_fog_clear.mp3 | fog_clear | BT swish_3 + K-IF glass_004 | 風切降速 0.6 倍, 0.1 秒疊亮音 |
| sfx_buy_item.mp3 | buy_item | R80 item_coins_02 + K-IF glass_002 | 疊亮音(−6 dB); 限幅 2.5 dB |
| sfx_equip.mp3 | equip | K-RPG metalLatch | 無 |
| sfx_upgrade.mp3 | upgrade | TS metal-hammer-hit-01 + K-MJ jingles_PIZZI08 | 鐵鎚截 1.2 秒淡出, 0.15 秒疊短上揚撥弦 |
| sfx_coin_land.mp3 | coin_land | TS coinflip-01 | 截 0.3 秒淡出 |
| sfx_jump.mp3 | jump | TS boots-leather-jump-01 | 截 0.4 秒淡出 |
| sfx_land.mp3 | land | K-IM impactSoft_heavy_002 + footstep_concrete_000 | 兩層疊加 |
| sfx_slash.mp3 | slash(第 3 輪剪短) | R80 blade_01 | 截 0.15 秒, 尾端 0.05 秒淡出 |
| sfx_dash.mp3 | dash | BT swish_3 + R80 blade_02 | 風切加速 1.1 倍, 0.04 秒疊刀聲 |
| sfx_arrow.mp3 | arrow | BT Bow.wav | 無 |
| sfx_stealth_on.mp3 | stealth_on | K-IF minimize_004 | 無 |
| sfx_stealth_off.mp3 | stealth_off | K-IF maximize_004 | 無 |
| sfx_bomb_throw.mp3 | bomb_throw | TS tube-plastic-whoosh-01 | 無 |
| sfx_explosion.mp3 | explosion | K-SF explosionCrunch_000 + lowFrequency_explosion_001 | 兩層疊加 |
| sfx_shockwave.mp3 | shockwave(第 3 輪重做) | K-IM impactSoft_heavy_000 + BT swish_3、swish_2 + K-SF lowFrequency_explosion_001 | 悶擊打頭(−2 dB); 風切降速 0.75 倍; 0.06 秒疊第二道風切(降速 0.8 倍, −4 dB); 低頻轟降速 0.85 倍截 0.55 秒淡出(−7 dB) |
| sfx_hit.mp3 | hit | K-IM impactPunch_medium_000 | 無 |
| sfx_hit_block.mp3 | hit_block | K-IM impactPlate_light_002 + impactMetal_light_001 | 兩層疊加 |
| sfx_shield_break.mp3 | shield_break | K-IM impactMetal_heavy_001 + impactWood_heavy_002 + impactGlass_heavy_000 | 三層疊加; 限幅 0.6 dB |
| sfx_drop_collect.mp3 | drop_collect | R80 item_coins_01 | 截 0.3 秒淡出 |
| sfx_pickup.mp3 | pickup | R80 item_gem_01 | 限幅 0.2 dB |
| sfx_chest_open.mp3 | chest_open | R80 lock_02 + K-RPG creak3 + K-IF glass_004 | 開鎖後 0.08 秒吱嘎、0.2 秒亮音 |
| sfx_item_get.mp3 | item_get | K-MJ jingles_SAX10 + jingles_PIZZI10 | 薩克斯上揚句, 墊同旋律撥弦(−8 dB)當起音 |
| sfx_monster_down.mp3 | monster_down | K-IM impactPunch_heavy_000 + TS compressed-air-spray-01 | 重擊後 0.05 秒疊噴氣「噗」(截 0.4 秒) |
| sfx_chain.mp3 | chain | K-IF pluck_001 | 同一撥弦疊兩聲(第二聲升五度、晚 0.07 秒); 限幅 1.9 dB |
| sfx_brood_down.mp3 | brood_down | R80 creature_roar_03 + K-SF lowFrequency_explosion_001 + K-MJ jingles_STEEL10 | 吼叫 + 低頻轟, 0.5 秒接上揚鋼鼓 |
| sfx_windup.mp3 | windup | K-IM impactBell_heavy_002 + R80 creature_monster_01 | 鐘聲取前 0.5 秒**反轉**成漸強; 疊怪物低吼(−8 dB)當立即起音 |
| sfx_bee_shot.mp3 | bee_shot | TS tin-whistle-whoosh-02 | 加速 1.3 倍 |
| sfx_hawk_dive.mp3 | hawk_dive | BT swish_3 + TS tin-whistle-whoosh-01 | 風切降速 0.55 倍、哨音降速 0.8 倍(−6 dB) |
| sfx_rock_drop.mp3 | rock_drop | R80 stones_01 | 限幅 2.1 dB |
| sfx_beetle_fuse.mp3 | beetle_fuse | TS match-light-01 + K-IF tick_002 | 火柴嘶聲截 0.8 秒當引信底, 滴答 7 下越來越密(0 / 0.2 / 0.36 / 0.5 / 0.6 / 0.68 / 0.75 秒); 限幅 3.2 dB |
| sfx_player_hurt.mp3 | player_hurt | K-IM impactPunch_medium_002 + K-IF bong_001 | 「咚」降速 0.8 倍(−4 dB) |
| sfx_skill_ready.mp3 | skill_ready | K-IF glass_001 | 無 |
| sfx_goal_reach.mp3 | goal_reach | K-MJ jingles_PIZZI08 + K-IF glass_002 | 疊亮音(−6 dB) |
| sfx_level_clear.mp3 | level_clear | K-MJ jingles_PIZZI02 + jingles_STEEL02 | 同旋律撥弦 + 鋼鼓兩分軌疊加 |
| sfx_level_fail.mp3 | level_fail | K-MJ jingles_PIZZI14 | 降速 0.95 倍 |
| sfx_tutorial_done.mp3 | tutorial_done(第 5 輪重做) | K-MJ jingles_SAX02 + jingles_PIZZI02 | 薩克斯完整上揚句, 墊同旋律撥弦(−8 dB)當起音 |
| sfx_boss_slam.mp3 | boss_slam | K-IM impactMining_000 + impactSoft_heavy_001 + K-SF lowFrequency_explosion_001 | 低頻轟降速 0.8 倍, 三層疊加 |
| sfx_boss_beam_charge.mp3 | boss_beam_charge | K-SF forceField_000 + K-IM impactBell_heavy_004 | 力場聲降速 0.8 倍並**反轉**成 1.2 秒漸強; 鐘聲降速 0.8 倍(−10 dB)當立即起音 |
| sfx_boss_beam.mp3 | boss_beam | K-SF laserLarge_000 + R80 spell_fire_03 | 雷射降速 0.7 倍, 火焰截 1 秒淡出(−4 dB) |
| sfx_boss_rock.mp3 | boss_rock | K-IM impactSoft_heavy_001 + R80 stones_04 | 兩層疊加 |
| sfx_boss_weak.mp3 | boss_weak | K-MJ jingles_STEEL08 + K-IF glass_004 | 疊亮音(−6 dB) |
| sfx_boss_phase.mp3 | boss_phase | R80 creature_roar_01 + K-SF lowFrequency_explosion_000 | 吼叫降速 0.75 倍, 低頻轟截 1.2 秒淡出 |
| sfx_boss_down.mp3 | boss_down | K-SF explosionCrunch_004 + lowFrequency_explosion_000 + R80 creature_roar_03 + K-MJ jingles_PIZZI02 + jingles_STEEL02 | 爆炸 + 低頻轟 + 降速 0.7 倍的吼叫, 1.3 秒接過關同旋律(撥弦 + 鋼鼓) |
| sfx_pause.mp3 | pause | K-IF toggle_001 | 無 |
| sfx_unlock_class.mp3 | unlock_class(第 2 輪新增) | K-SF forceField_001 + K-IF glass_004 + K-IM impactBell_heavy_000 + K-MJ jingles_SAX10、jingles_PIZZI10、jingles_STEEL10 | 力場聲取前 0.45 秒**反轉**成漸強(−3 dB), 開頭墊亮音(−12 dB); 0.36 秒起薩克斯、0.42 秒起撥弦 / 鋼鼓 / 鐘聲(截 0.9 秒淡出)/ 亮音五層疊加 |
| sfx_iris_close.mp3 | iris_close(第 2 輪新增) | BT swish_3 + K-IF glass_004、glass_002 | 風切加速 1.3 倍截 0.2 秒淡出, 0.13 秒疊兩層亮音 |
| sfx_player_death.mp3 | player_death(第 2 輪新增) | K-IM impactPunch_heavy_002、impactBell_heavy_001 + K-IF bong_001 + K-SF lowFrequency_explosion_001 | 「咚」降速 0.5 倍; 低鐘截 0.66 秒淡出(−7 dB); 低頻轟降速 0.7 倍截 0.62 秒淡出(−6 dB); 四層疊加 |
| sfx_shatter.mp3 | shatter(第 2 輪新增) | K-IM impactGlass_heavy_004、impactGlass_medium_001、impactGlass_heavy_000、impactGlass_light_002、impactGlass_light_004 | 五片玻璃錯開 0 / 0.03 / 0.09 / 0.17 / 0.26 秒, 後三片加速 1.12~1.3 倍、音量遞減 |
| sfx_tut_pop.mp3 | tut_pop(第 5 輪新增) | K-IF drop_002 + maximize_008 | 兩層疊加(「啵」−3 dB 打頭) |
| sfx_tut_type.mp3 | tut_type(第 5 輪新增) | K-IF tick_001 | 無(響度壓到 −30) |
| sfx_tut_go.mp3 | tut_go(第 6 輪新增) | K-MJ jingles_SAX04 + K-IF maximize_006 | 薩克斯兩音上跳句(−3 → +6 半音)原速; 開頭墊上揚掃音(−10 dB)當立即起音 |
| sfx_tut_next.mp3 | tut_next(第 5 輪新增) | K-RPG bookPlace3、bookFlip3 + K-IF click_005 | 三層疊加(翻頁 −4 dB、喀 −10 dB) |
| sfx_tut_panel.mp3 | tut_panel(第 5 輪新增) | K-RPG bookOpen + K-CA card-fan-1 | 紙牌展開聲降速 0.85 倍當羊皮紙沙沙聲, 開頭墊翻開書(−2 dB) |
| sfx_tut_dock.mp3 | tut_dock(第 5 輪新增) | K-RPG bookClose + K-IF click_003 | 疊輕喀(−10 dB) |
| sfx_tut_spot.mp3 | tut_spot(第 5 輪新增) | K-IF switch_005 + K-IM impactSoft_heavy_000 + K-SF forceField_002 | 開關聲只取第一下(0.09 秒); 悶擊「咚」; 力場嗡聲截 0.7 秒淡出(−10 dB)當燈亮的餘韻 |
| sfx_respawn.mp3 | respawn(第 5 輪新增) | K-IF glass_001、scroll_003、maximize_005 + K-IM impactBell_heavy_000、impactGlass_heavy_004、impactGlass_medium_001、impactGlass_heavy_000、impactGlass_light_002、impactGlass_light_004 | 等於 `shatter` 的五片玻璃**反轉**、時間倒排收在 1.38 秒(碎片倒帶); 底下墊反轉低鐘(1.36 秒漸強)、上揚掃音降速 0.45 倍(−4 dB)、捲動棘輪聲由 0.6 倍漸加速到 1.9 倍並由 −12 dB 漸強(−9 dB, 倒帶越轉越快); 開頭墊亮音(−10 dB)立即出聲 |
| sfx_respawn_land.mp3 | respawn_land(第 5 輪新增) | K-IM impactSoft_medium_001、footstep_wood_001 + K-IF glass_002 | 三層疊加(腳步 −4 dB、亮音 −10 dB) |
| sfx_summary_open.mp3 | summary_open(第 5 輪新增) | K-CA card-shove-1 + K-IM impactWood_heavy_001、impactPlank_medium_003 | 推牌聲跳過開頭 0.1 秒、降速 0.7 倍截 0.45 秒淡出(−3 dB)當木板滑下; 0.45 秒疊木頭重擊 + 木板(−3 dB)落定 |
| sfx_summary_card.mp3 | summary_card(第 5 輪新增) | K-CA card-slide-3 + K-IM impactWood_light_002 | 滑牌聲, 0.3 秒疊木頭輕敲(−8 dB)落定 |

## 背景音樂(全部 CC BY 4.0, 遊戲內需署名)

| 檔名 | 對應曲名 | 原曲 | 原始頁面 | 作者 | 授權 | 剪輯 |
|---|---|---|---|---|---|---|
| music_title.mp3 | title | Village Consort | https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1700007 | Kevin MacLeod | CC BY 4.0 | 裁頭尾靜音、統一響度、結尾 1.5 秒淡出、重編 112 kbps |
| music_map.mp3 | map | Carefree | https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1400037 | Kevin MacLeod | CC BY 4.0 | 同上, 112 kbps |
| music_forest.mp3 | forest | Thatched Villagers | https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1100720 | Kevin MacLeod | CC BY 4.0 | 同上, 96 kbps |
| music_cliff.mp3 | cliff | Celtic Impulse | https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1100297 | Kevin MacLeod | CC BY 4.0 | 同上, 112 kbps |
| music_mine.mp3 | mine | Achaidh Cheide | https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1100340 | Kevin MacLeod | CC BY 4.0 | 同上, 112 kbps |
| music_boss.mp3 | boss | Black Vortex | https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1300037 | Kevin MacLeod | CC BY 4.0 | 同上, 112 kbps |
| music_ending.mp3 | ending | Eternal Hope | https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1100238 | Kevin MacLeod | CC BY 4.0 | 同上, 80 kbps |

### 署名文字(照 incompetech 格式, 放進遊戲的署名畫面或說明)

```
"Village Consort" Kevin MacLeod (incompetech.com)
"Carefree" Kevin MacLeod (incompetech.com)
"Thatched Villagers" Kevin MacLeod (incompetech.com)
"Celtic Impulse" Kevin MacLeod (incompetech.com)
"Achaidh Cheide" Kevin MacLeod (incompetech.com)
"Black Vortex" Kevin MacLeod (incompetech.com)
"Eternal Hope" Kevin MacLeod (incompetech.com)
Licensed under Creative Commons: By Attribution 4.0 License
http://creativecommons.org/licenses/by/4.0/
```

音效素材全部 CC0, 不需署名(仍列在上表供查)。
