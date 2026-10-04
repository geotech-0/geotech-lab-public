-- Existing inline workspace rows remain readable until their next successful save.
ALTER TABLE workspaces ADD COLUMN version_id TEXT;
ALTER TABLE workspaces ADD COLUMN chunk_count INTEGER;
CREATE TABLE workspace_chunks (
 user_id TEXT NOT NULL,
 version_id TEXT NOT NULL,
 chunk_index INTEGER NOT NULL CHECK (chunk_index >= 0),
 payload TEXT NOT NULL,
 PRIMARY KEY (user_id, version_id, chunk_index)
);
