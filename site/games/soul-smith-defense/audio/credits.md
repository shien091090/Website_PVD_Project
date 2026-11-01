# 音效與音樂來源

所有音效檔都是從下列素材加工而成(共同加工: 轉單聲道 44.1 kHz、剪掉頭尾靜音、統一響度、檔頭加 20 毫秒靜音、以 96 kbps mp3 重新編碼)。表中「剪輯」欄只寫共同加工以外的處理。

素材來源頁:

| 代號 | 素材包 | 頁面 | 作者 | 授權 |
|---|---|---|---|---|
| K-UI | Interface Sounds | https://kenney.nl/assets/interface-sounds | Kenney (kenney.nl) | CC0 |
| K-IMP | Impact Sounds | https://kenney.nl/assets/impact-sounds | Kenney (kenney.nl) | CC0 |
| K-RPG | RPG Audio | https://kenney.nl/assets/rpg-audio | Kenney (kenney.nl) | CC0 |
| K-JIN | Music Jingles | https://kenney.nl/assets/music-jingles | Kenney (kenney.nl) | CC0 |
| K-CAS | Casino Audio | https://kenney.nl/assets/casino-audio | Kenney (kenney.nl) | CC0 |
| AD-RPG | RPG Sound Pack | https://opengameart.org/content/rpg-sound-pack | artisticdude | CC0 |
| AD-BAT | Battle Sound Effects | https://opengameart.org/content/battle-sound-effects | artisticdude | 頁面同列 CC-BY 3.0 / CC-BY-SA 3.0 / GPL / CC0, 選 CC0 |
| RD-80 | 80 CC0 RPG SFX | https://opengameart.org/content/80-cc0-rpg-sfx | rubberduck | CC0 |
| EG-HORN | War Horns | https://opengameart.org/content/war-horns | Eldritch Grim | CC0(作者表示署名可有可無) |
| BSB-TOM | Bass Tom #1(BigSoundBank 編號 2338) | https://bigsoundbank.com/bass-tom-1-s2338.html | Joseph Sardin (bigsoundbank.com) | CC0 |
| FX-EL | Electricity Game Sound Pack | https://opengameart.org/node/150369 | faxcorp | CC0 |
| SM-CURE | Cure Magic | https://opengameart.org/content/cure-magic | Someoneman | CC0 |
| BSB-STR | Electric strike #1(BigSoundBank 編號 3442) | https://bigsoundbank.com/electric-strike-1-s3442.html | Joseph Sardin (bigsoundbank.com) | CC0 |
| BSB-THU | Thunder #2(BigSoundBank 編號 3113) | https://bigsoundbank.com/thunder-2-s3113.html | Joseph Sardin & Axeline T. (bigsoundbank.com) | CC0 |
| FU-WIN | Win Jingle | https://opengameart.org/content/win-jingle | Fupi | CC0 |
| KM | incompetech 曲庫 | https://incompetech.com/music/royalty-free/ | Kevin MacLeod | CC BY 4.0 |
| BSB-ICE | Cracking ice #1 / #2 / #3(編號 2205 / 2206 / 2207) | https://bigsoundbank.com/cracking-ice-1-s2205.html 、https://bigsoundbank.com/cracking-ice-2-s2206.html 、https://bigsoundbank.com/cracking-ice-3-s2207.html | Joseph Sardin (bigsoundbank.com) | CC0 |
| BSB-GLS | Glass burst(編號 0148) | https://bigsoundbank.com/glass-burst-s0148.html | Joseph Sardin (bigsoundbank.com) | CC0 |
| BSB-MIR | Mirror explodes(編號 0387) | https://bigsoundbank.com/mirror-explodes-s0387.html | Joseph Sardin (bigsoundbank.com) | CC0 |
| BSB-BODY | Body fall #2(編號 2453) | https://bigsoundbank.com/body-fall-2-s2453.html | Joseph Sardin (bigsoundbank.com) | CC0 |
| BSB-THN | Thunder(2718)、#6(3179)、#7(3180)、#11(3184) | https://bigsoundbank.com/thunder-s2718.html 、https://bigsoundbank.com/thunder-6-s3179.html 、https://bigsoundbank.com/thunder-7-s3180.html 、https://bigsoundbank.com/thunder-11-s3184.html | Joseph Sardin (bigsoundbank.com) | CC0 |
| LT-COIN | Coin Splash | https://opengameart.org/content/coin-splash | LordTomorrow | CC0 |

## 檔案清單(每列一個 assets/ 內的檔)

| 檔名 | 對應事件 | 原始素材(代號 / 原檔名) | 作者 | 授權 | 剪輯 |
|---|---|---|---|---|---|
| sfx_ui_move.mp3 | ui_move | K-UI / tick_002.ogg | Kenney | CC0 | 無 |
| sfx_ui_confirm.mp3 | ui_confirm | K-UI / confirmation_001.ogg | Kenney | CC0 | 無 |
| sfx_ui_invalid.mp3 | ui_invalid | K-UI / error_004.ogg | Kenney | CC0 | 無 |
| sfx_popup_open.mp3 | popup_open | K-UI / minimize_006.ogg | Kenney | CC0 | 無(量得音高 551→279 Hz 下滑) |
| sfx_popup_close.mp3 | popup_close | K-UI / maximize_006.ogg | Kenney | CC0 | 無(量得音高 261→596 Hz 上揚) |
| sfx_take_part.mp3 | take_part | RD-80 / item_gem_01.ogg | rubberduck | CC0 | 無 |
| sfx_install_part.mp3 | install_part | K-RPG / metalLatch.ogg + K-IMP / impactMetal_medium_001.ogg | Kenney | CC0 | 兩層疊合(金屬撞擊 −8 dB) |
| sfx_swap_part.mp3 | swap_part | RD-80 / item_gem_03.ogg + item_gem_01.ogg | rubberduck | CC0 | 第二聲升高 1.12 倍、延後 0.09 秒 |
| sfx_drop_part.mp3 | drop_part | RD-80 / item_stone_04.ogg | rubberduck | CC0 | 無 |
| sfx_fuse.mp3 | fuse | K-IMP / impactMetal_light_003.ogg + RD-80 / spell_02.ogg + K-UI / maximize_008.ogg | Kenney、rubberduck | CC0 | 三層疊合: 金屬敲擊降速 0.9 倍; 法術聲 −2 dB、延後 0.04 秒; 上揚音 −6 dB、延後 0.22 秒 |
| sfx_ground_expire.mp3 | ground_expire | K-RPG / cloth2.ogg + RD-80 / item_gem_02.ogg | Kenney、rubberduck | CC0 | 布料聲升速 1.25 倍; 寶石聲降速 0.75 倍、−9 dB、延後 0.03 秒 |
| sfx_purchase.mp3 | purchase | RD-80 / item_coins_02.ogg | rubberduck | CC0 | 無 |
| sfx_place_unit.mp3 | place_unit | K-IMP / impactWood_heavy_000.ogg + impactSoft_heavy_001.ogg | Kenney | CC0 | 兩層疊合(悶擊 −4 dB) |
| sfx_flag_plant.mp3 | flag_plant | K-IMP / impactWood_medium_000.ogg + impactSoft_medium_001.ogg + K-RPG / cloth1.ogg | Kenney | CC0 | 三層疊合: 悶擊 −4 dB; 布料聲 −5 dB、延後 0.08 秒、截 0.4 秒 |
| sfx_demolish.mp3 | demolish | K-IMP / impactPlank_medium_001.ogg + RD-80 / stones_03.ogg + item_coins_01.ogg | Kenney、rubberduck | CC0 | 三層疊合: 木板聲截 0.5 秒; 碎石 −3 dB、延後 0.04 秒、截 0.8 秒; 錢幣 −7 dB、延後 0.45 秒 |
| sfx_home_refund.mp3 | home_refund | K-RPG / handleCoins.ogg + dropLeather.ogg | Kenney | CC0 | 錢幣聲截 0.6 秒; 皮袋聲 −3 dB、延後 0.42 秒 |
| sfx_coin_pickup.mp3 | coin_pickup | AD-RPG / inventory/coin3.wav | artisticdude | CC0 | 無 |
| sfx_steal_start.mp3 | steal_start | RD-80 / chain_02.ogg | rubberduck | CC0 | 無 |
| sfx_steal_done.mp3 | steal_done | AD-RPG / battle/sword-unsheathe.wav + RD-80 / item_gem_01.ogg | artisticdude、rubberduck | CC0 | 兩層疊合(寶石聲 −6 dB、延後 0.08 秒) |
| sfx_steal_cancel.mp3 | steal_cancel | AD-RPG / inventory/cloth-heavy.wav | artisticdude | CC0 | 降速 0.8 倍(音高變低) |
| sfx_combo.mp3 | combo | K-JIN / jingles_STEEL08.ogg | Kenney | CC0 | 截前 0.65 秒、尾端淡出 0.2 秒 |
| sfx_combo_new.mp3 | combo_new | K-JIN / jingles_STEEL02.ogg + K-UI / glass_001.ogg | Kenney | CC0 | 兩層疊合(玻璃聲 −6 dB) |
| sfx_arrow_shot.mp3 | arrow_shot | AD-BAT / Bow.wav | artisticdude | CC0 | 截前 0.3 秒 |
| sfx_pierce_shot.mp3 | pierce_shot | AD-BAT / Bow.wav + RD-80 / spell_02.ogg | artisticdude、rubberduck | CC0 | 弓聲降速 0.85 倍; 法術聲升速 1.2 倍、−5 dB |
| sfx_melee_hit.mp3 | melee_hit | K-IMP / impactPunch_medium_000.ogg | Kenney | CC0 | 截前 0.3 秒 |
| sfx_whirl.mp3 | whirl | AD-BAT / swish_3.wav | artisticdude | CC0 | 無 |
| sfx_charge_hit.mp3 | charge_hit | K-IMP / impactPunch_heavy_000.ogg + impactPlank_medium_001.ogg | Kenney | CC0 | 兩層疊合(木板聲 −4 dB), 各截 0.4~0.45 秒 |
| sfx_shock_zap.mp3 | shock_zap | FX-EL / groundhit.wav + BSB-STR / 3442.wav(BWF 原檔 `https://bigsoundbank.com/UPLOAD/bwf-en/3442.wav`) | faxcorp、Joseph Sardin | CC0 | 兩層疊合: 門鎖電嗡 −8 dB、截 0.15 秒 |
| sfx_thunder_slash.mp3 | thunder_slash | K-IMP / impactPunch_heavy_002.ogg + FX-EL / groundhit.wav + BSB-THU / 3113.wav(BWF 原檔 `https://bigsoundbank.com/UPLOAD/bwf-en/3113.wav`) | Kenney、faxcorp、Joseph Sardin & Axeline T. | CC0 | 三層疊合: 重拳截 0.4 秒; 放電 −3 dB; 雷聲取原檔 2.19~3.14 秒(最陡的一次起音)、−2 dB、延後 0.03 秒、尾端淡出 0.45 秒 |
| sfx_thunder_orb.mp3 | thunder_orb | FX-EL / charge.wav + groundhit.wav + AD-BAT / swish_4.wav | faxcorp、artisticdude | CC0 | 三層疊合: 電嗡取原檔 0.5~0.82 秒、由 −12 dB 漸強到 0 dB; 風聲降速 0.85 倍、−4 dB、延後 0.26 秒; 放電 −6 dB、延後 0.27 秒 |
| sfx_blink.mp3 | blink | FX-EL / teleport.wav + AD-BAT / swish_2.wav | faxcorp、artisticdude | CC0 | 瞬移聲升速 1.1 倍; 風聲升速 1.15 倍、−7 dB |
| sfx_heal_ray.mp3 | heal_ray | SM-CURE / Cure3.wav | Someoneman | CC0 | 截前 0.8 秒、尾端淡出 0.25 秒 |
| sfx_enemy_shot.mp3 | enemy_shot | AD-BAT / Bow.wav | artisticdude | CC0 | 降速 0.7 倍(較低沉), 截 0.4 秒 |
| sfx_enemy_die.mp3 | enemy_die | AD-RPG / NPC/shade/shade1.wav + RD-80 / item_gem_02.ogg | artisticdude、rubberduck | CC0 | 鬼聲截 0.45 秒; 寶石聲 −8 dB、延後 0.05 秒 |
| sfx_unit_down.mp3 | unit_down | K-JIN / jingles_PIZZI00.ogg | Kenney | CC0 | 無 |
| sfx_unit_return.mp3 | unit_return | K-JIN / jingles_PIZZI08.ogg | Kenney | CC0 | 無 |
| sfx_recruit.mp3 | recruit | K-JIN / jingles_STEEL10.ogg + K-IMP / impactWood_heavy_002.ogg | Kenney | CC0 | 兩層疊合(木擊 −6 dB) |
| sfx_wave_warning.mp3 | wave_warning | K-IMP / impactBell_heavy_001.ogg | Kenney | CC0 | 無 |
| sfx_wave_start.mp3 | wave_start | BSB-TOM / 2338.wav(BWF 原檔 `https://bigsoundbank.com/UPLOAD/bwf-en/2338.wav`)+ EG-HORN / war_horns.mp3 | Joseph Sardin、Eldritch Grim | CC0 | 大鼓同一擊用三次(降速 0.7 / 0.7 / 0.62 倍, 間隔 0.3 秒); 號角取原曲 15.0~16.95 秒一段、+2 dB、延後 0.62 秒、尾端淡出 0.35 秒 |
| sfx_castle_hit.mp3 | castle_hit | K-RPG / doorClose_1.ogg + K-IMP / impactPunch_heavy_001.ogg | Kenney | CC0 | 兩層疊合(重擊 −3 dB) |
| sfx_tutorial_done.mp3 | tutorial_done | K-JIN / jingles_PIZZI16.ogg | Kenney | CC0 | 無 |
| sfx_quest_new.mp3 | quest_new | K-UI / glass_004.ogg | Kenney | CC0 | 截前 0.5 秒、尾端淡出 0.25 秒 |
| sfx_guide_pause.mp3 | guide_pause | K-IMP / impactSoft_medium_000.ogg + K-JIN / jingles_STEEL14.ogg | Kenney | CC0 | 兩層疊合: 悶擊 −3 dB; 鋼鼓樂句前 0.08 秒原速、之後 0.52 秒內速度由 1 降到 0.3(磁帶減速, 音高跟著往下), 尾端淡出 0.18 秒 |
| sfx_guide_card.mp3 | guide_card | K-CAS / card-slide-2.ogg | Kenney | CC0 | 跳過開頭 0.055 秒、截 0.28 秒、尾端淡出 0.12 秒 |
| sfx_combo_reveal.mp3 | combo_reveal | K-IMP / impactBell_heavy_000.ogg + impactPlate_heavy_000.ogg + impactMetal_heavy_000.ogg + impactPunch_heavy_000.ogg + impactGlass_heavy_000.ogg + K-JIN / jingles_STEEL02.ogg + K-UI / glass_001.ogg + RD-80 / spell_02.ogg | Kenney、rubberduck | CC0 | 八層疊合: 鐘(取前 0.9 秒)、金屬盤、法術聲三層反轉成蓄力、尾端對齊 0.9 秒; 0.9 秒放重金屬 + 重拳(−3 dB, 截 0.4 秒)+ 玻璃(−7 dB); 鋼鼓樂句取前 0.66 秒、−2 dB、0.92 秒起; 玻璃閃 −8 dB |
| sfx_pause_on.mp3 | pause_on | K-UI / close_001.ogg | Kenney | CC0 | 無 |
| sfx_pause_off.mp3 | pause_off | K-UI / open_001.ogg | Kenney | CC0 | 無 |
| sfx_codex_open.mp3 | codex_open | K-RPG / bookOpen.ogg + bookPlace1.ogg + bookFlip2.ogg | Kenney | CC0 | 三層疊合: 書落桌聲跳過開頭 0.04 秒、截 0.15 秒、−8 dB; 翻頁聲延後 0.04 秒 |
| sfx_codex_close.mp3 | codex_close | K-RPG / bookClose.ogg | Kenney | CC0 | 跳過開頭 0.055 秒 |
| sfx_level_advance.mp3 | level_advance | AD-BAT / swish_2.wav + K-UI / pluck_001.ogg + pluck_002.ogg + K-IMP / footstep_wood_001.ogg | artisticdude、Kenney | CC0 | 四層疊合: 風聲跳過開頭 0.05 秒、升速 1.25 倍、−8 dB; 第一聲撥弦 −2 dB; 第二聲撥弦延後 0.11 秒; 腳步聲延後 0.24 秒、−9 dB、截 0.12 秒 |
| sfx_level_unlock.mp3 | level_unlock | RD-80 / lock_02.ogg + misc_02.ogg + K-IMP / impactGlass_heavy_002.ogg + impactGlass_medium_001.ogg | rubberduck、Kenney | CC0 | 四層疊合: 鎖聲跳過開頭 0.04 秒、截 0.12 秒; 玻璃碎裂 −2 dB、延後 0.04 秒; 玻璃餘韻 −7 dB、延後 0.07 秒; 鈴聲 −9 dB、延後 0.12 秒 |
| sfx_tutorial_clear.mp3 | tutorial_clear | FU-WIN / WinSteelDrums.wav + WinPizzicato.wav + WinVibraphone.wav | Fupi | CC0 | 三個分軌自行混音(撥弦 −3 dB、鐵琴 −4 dB), 升四度(加速 1.335 倍), 截前 2 秒、淡出 0.45 秒 |
| sfx_level_win.mp3 | level_win | FU-WIN / WinSteelDrums.wav + WinBrass.wav + WinPizzicato.wav + WinStrings.wav | Fupi | CC0 | 四個分軌自行混音(撥弦、弦樂 −3 dB), 截前 3 秒、淡出 0.5 秒 |
| sfx_level_lose.mp3 | level_lose | K-JIN / jingles_PIZZI01.ogg + jingles_SAX03.ogg | Kenney | CC0 | 兩層疊合(薩克斯 −6 dB) |
| sfx_star.mp3 | star | AD-RPG / inventory/metal-ringing.wav | artisticdude | CC0 | 無(播放時依第幾顆星升高音高) |
| sfx_boss_intro_frost.mp3 | boss_intro_frost | BSB-ICE / 2205.wav + 2206.wav + 2207.wav + BSB-GLS / 0148.wav + BSB-MIR / 0387.wav(BWF 原檔 `https://bigsoundbank.com/UPLOAD/bwf-en/<編號>.wav`)+ BSB-TOM / 2338.wav + K-IMP / impactPunch_heavy_000.ogg + RD-80 / creature_roar_03.ogg + AD-RPG / NPC/giant/giant2.wav | Joseph Sardin、Kenney、rubberduck、artisticdude | CC0 | 九層依時間軸疊合(不裁開頭): 冰裂 #1 取 0.20 秒起 1.22 秒、放在 0.30 秒、由 −12 dB 漸強到 0 dB; 冰裂 #3 / #2 放在 0.70 / 0.95 秒、各截 0.55 秒、漸強, −6 / −3 dB; 1.50 秒放玻璃爆裂(截 1 秒)+ 鏡子碎裂(−5 dB)+ 通鼓降速 0.55 倍(−1 dB)+ 重拳(−4 dB); 1.66 秒放怪物吼聲降速 0.8 倍(−2 dB)+ 巨人吼聲降速 0.72 倍(−10 dB); 整體截 2.75 秒、尾端淡出 0.25 秒 |
| sfx_boss_intro_thunder.mp3 | boss_intro_thunder | BSB-THN / 3184.wav + 3179.wav + 3180.wav + 2718.wav + BSB-THU / 3113.wav(BWF 原檔同上)+ FX-EL / groundhit.wav + deathboom.wav + charge.wav + snaploop.wav + BSB-TOM / 2338.wav | Joseph Sardin(& Axeline T.)、faxcorp | CC0 | 十二層依時間軸疊合(不裁開頭): 雷聲 #11 取 1.2 秒起 0.6 秒當遠雷(0.1 秒起、−4 dB); 0.60 秒雷聲 #6(取 0.385 秒起 0.4 秒、−6 dB)+ 放電(−6 dB); 0.85 秒雷聲 #7(取 0.02 秒起、+3 dB)+ 放電(−1 dB); 1.10 秒雷聲(2718, 取 0.305 秒起 1.5 秒)+ 雷聲 #2(取 2.21 秒起 0.5 秒、−3 dB)+ 放電(−2 dB)+ 爆炸(取 0.39 秒起 0.9 秒、−2 dB)+ 通鼓降速 0.5 倍; 1.3 秒起電嗡(取 0.5 秒起 1.3 秒、−12 dB)+ 電流劈啪(取 0.3 秒起 1.2 秒、−10 dB); 整體截 2.8 秒、尾端淡出 0.3 秒 |
| sfx_boss_die.mp3 | boss_die | K-IMP / impactPunch_heavy_001.ogg + RD-80 / creature_die_01.ogg + BSB-BODY / 2453.wav(BWF 原檔同上)+ BSB-TOM / 2338.wav + LT-COIN / coinsplash_0.ogg + K-JIN / jingles_STEEL15.ogg | Kenney、rubberduck、Joseph Sardin、LordTomorrow | CC0 | 八層疊合: 重拳(−3 dB、截 0.3 秒); 怪物死亡聲降速 0.78 倍、截 0.85 秒; 0.30 秒倒地聲(取 0.43 秒起、降速 0.75 倍)+ 0.34 秒通鼓降速 0.5 倍(−1 dB); 金幣嘩啦同一檔疊三層(0.50 / 0.62 / 0.77 秒、速度 1.0 / 1.18 / 0.9、−3 / −5 / −7 dB); 0.52 秒上揚鋼鼓短句截 0.68 秒(−2 dB); 整體截 1.3 秒、尾端淡出 0.15 秒 |
| music_title.mp3 | 背景音樂 title | KM / Village Consort.mp3(https://incompetech.com/music/royalty-free/mp3-royaltyfree/Village%20Consort.mp3) | Kevin MacLeod | CC BY 4.0 | 整首, 由 320 kbps 重新編碼為 96 kbps 立體聲(壓到 3 MB 內) |
| music_battle.mp3 | 背景音樂 battle | KM / Heroic Age.mp3(https://incompetech.com/music/royalty-free/mp3-royaltyfree/Heroic%20Age.mp3) | Kevin MacLeod | CC BY 4.0 | 整首, 由 320 kbps 重新編碼為 128 kbps 立體聲(壓到 3 MB 內) |
| music_boss.mp3 | 背景音樂 boss | KM / Burnt Spirit.mp3(https://incompetech.com/music/royalty-free/mp3-royaltyfree/Burnt%20Spirit.mp3) | Kevin MacLeod | CC BY 4.0 | 整首, 重新編碼為 128 kbps 立體聲(1.84 MB) |

## 需要在遊戲中顯示的署名(CC BY 4.0)

```
"Village Consort" Kevin MacLeod (incompetech.com)
Licensed under Creative Commons: By Attribution 4.0 License
http://creativecommons.org/licenses/by/4.0/

"Heroic Age" Kevin MacLeod (incompetech.com)
Licensed under Creative Commons: By Attribution 4.0 License
http://creativecommons.org/licenses/by/4.0/

"Burnt Spirit" Kevin MacLeod (incompetech.com)
Licensed under Creative Commons: By Attribution 4.0 License
http://creativecommons.org/licenses/by/4.0/
```

CC0 素材不需署名, 上表僅供追溯。
