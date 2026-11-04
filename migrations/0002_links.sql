-- 社群貼文短連結: 短代碼對應來源參數與導連頁面; 同一組參數只會有一個代碼
CREATE TABLE links (
  code TEXT PRIMARY KEY,
  source TEXT NOT NULL,
  campaign TEXT NOT NULL,
  content TEXT NOT NULL,
  page TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE UNIQUE INDEX links_params ON links (source, campaign, content, page);
