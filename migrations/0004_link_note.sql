-- 連結備註: 只給後台看, 不影響短代碼(同一組參數仍沿用同一條連結)
ALTER TABLE links ADD COLUMN note TEXT NOT NULL DEFAULT '';
