export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS puzzles (
  id TEXT PRIMARY KEY,
  game_id TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'daily',
  scheduled_date TEXT,
  language TEXT NOT NULL DEFAULT 'en',
  category TEXT NOT NULL,
  answer TEXT NOT NULL,
  aliases TEXT NOT NULL DEFAULT '[]',
  clues TEXT NOT NULL DEFAULT '[]',
  explanation TEXT NOT NULL DEFAULT '',
  difficulty INTEGER NOT NULL DEFAULT 3,
  source_notes TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft',
  attempts_allowed INTEGER NOT NULL DEFAULT 5,
  hints_allowed INTEGER NOT NULL DEFAULT 1,
  author TEXT NOT NULL DEFAULT '',
  reviewer TEXT,
  ambiguity_checked_at TEXT,
  correction_note TEXT,
  revision INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  published_at TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_puzzles_official_daily
  ON puzzles (game_id, scheduled_date)
  WHERE kind = 'daily' AND status IN ('scheduled', 'published');

CREATE INDEX IF NOT EXISTS idx_puzzles_kind_status ON puzzles (kind, status);
CREATE INDEX IF NOT EXISTS idx_puzzles_scheduled ON puzzles (scheduled_date);

CREATE TABLE IF NOT EXISTS puzzle_revisions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  puzzle_id TEXT NOT NULL REFERENCES puzzles (id) ON DELETE CASCADE,
  revision INTEGER NOT NULL,
  snapshot TEXT NOT NULL,
  changed_by TEXT NOT NULL DEFAULT '',
  note TEXT NOT NULL DEFAULT '',
  changed_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_revisions_puzzle ON puzzle_revisions (puzzle_id, revision);

CREATE TABLE IF NOT EXISTS reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  puzzle_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  message TEXT NOT NULL DEFAULT '',
  state TEXT NOT NULL DEFAULT 'new',
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_reports_puzzle ON reports (puzzle_id, state);

CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  puzzle_id TEXT,
  session_id TEXT,
  props TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_events_name ON events (name, created_at);

-- Authoritative attempt accounting for a round. One row per browser session and
-- puzzle. It holds no guess text, so it can enforce the attempt limit and the
-- one-official-result rule without holding what a player typed.
CREATE TABLE IF NOT EXISTS rounds (
  session_id TEXT NOT NULL,
  puzzle_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'playing',
  attempts_used INTEGER NOT NULL DEFAULT 0,
  incorrect_guesses INTEGER NOT NULL DEFAULT 0,
  hints_used INTEGER NOT NULL DEFAULT 0,
  clues_revealed INTEGER NOT NULL DEFAULT 1,
  outcome TEXT,
  finished_at INTEGER,
  score INTEGER,
  started_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (session_id, puzzle_id)
);

CREATE INDEX IF NOT EXISTS idx_rounds_puzzle ON rounds (puzzle_id, status);

-- Duplicate-guess detection keyed on a hash of the normalized guess, so the raw
-- text a player typed is never stored.
CREATE TABLE IF NOT EXISTS round_guesses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL,
  puzzle_id TEXT NOT NULL,
  guess_hash TEXT NOT NULL,
  correct INTEGER NOT NULL DEFAULT 0,
  at INTEGER NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_round_guess_unique
  ON round_guesses (session_id, puzzle_id, guess_hash);
`;
