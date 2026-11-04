-- 每一輪自己的候選清單: 票只記「輪次 + 選項代號」, 選項是遊戲或其他東西都一樣;
-- label 存當時的名稱, 遊戲下架後歷史輪次照樣查得到
CREATE TABLE round_options (
  round_id INTEGER NOT NULL,
  option_id TEXT NOT NULL,
  label TEXT NOT NULL,
  sort INTEGER NOT NULL,
  PRIMARY KEY (round_id, option_id)
);
-- 既有的輪次都是第一波這 4 款
INSERT INTO round_options (round_id, option_id, label, sort)
SELECT r.id, o.id, o.label, o.sort FROM rounds r,
  (SELECT 'bubble-tempo' AS id, 'Bubble Tempo' AS label, 0 AS sort
   UNION ALL SELECT 'jelly-jinni', '接力吉尼(Jelly Jinni)', 1
   UNION ALL SELECT 'soul-smith-defense', '魂匠守衛者', 2
   UNION ALL SELECT 'dungeon-zoo', '來馬戲團看一點大場面', 3) o;
