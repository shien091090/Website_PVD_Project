-- 開發頁內容: 每次從後台發布存一版(JSON), 最新一版就是線上內容; 退回舊版 = 把舊版複製成新的一版
CREATE TABLE develop_versions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  content TEXT NOT NULL,
  published_at INTEGER NOT NULL,
  published_by TEXT NOT NULL DEFAULT ''
);
