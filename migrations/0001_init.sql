CREATE TABLE rounds (
  id INTEGER PRIMARY KEY,
  starts_at INTEGER NOT NULL,
  ends_at INTEGER NOT NULL,
  winner TEXT
);

CREATE TABLE votes (
  round_id INTEGER NOT NULL,
  vid TEXT NOT NULL,
  game TEXT NOT NULL,
  ip_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (round_id, vid)
);
CREATE INDEX votes_ip ON votes (round_id, ip_hash, created_at);

CREATE TABLE comments (
  id INTEGER PRIMARY KEY,
  game TEXT NOT NULL,
  avatar INTEGER NOT NULL,
  body TEXT NOT NULL,
  vid TEXT NOT NULL,
  ip_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  deleted INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX comments_game ON comments (game, deleted, created_at);
CREATE INDEX comments_vid ON comments (vid, created_at);
CREATE INDEX comments_ip ON comments (ip_hash, created_at);

CREATE TABLE locks (
  game TEXT PRIMARY KEY,
  locked INTEGER NOT NULL
);
