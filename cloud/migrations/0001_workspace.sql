CREATE TABLE IF NOT EXISTS workspaces (
 user_id TEXT PRIMARY KEY NOT NULL,
 revision INTEGER NOT NULL CHECK (revision >= 1),
 records TEXT NOT NULL CHECK (json_valid(records)),
 updated_at TEXT NOT NULL
);
