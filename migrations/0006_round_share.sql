-- 每一輪的分享圖(存在 R2 的位置); 空字串 = 用整站預設的分享圖
ALTER TABLE rounds ADD COLUMN share_image TEXT NOT NULL DEFAULT '';
