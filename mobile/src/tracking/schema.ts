export const TRACKING_SCHEMA = `CREATE TABLE IF NOT EXISTS tracking_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS tracking_events (seq INTEGER PRIMARY KEY AUTOINCREMENT, owner TEXT NOT NULL, event_id TEXT NOT NULL,
    session_id TEXT NOT NULL, payload TEXT NOT NULL, synced INTEGER NOT NULL DEFAULT 0, stored_at INTEGER NOT NULL, UNIQUE(owner,event_id));
  CREATE INDEX IF NOT EXISTS tracking_pending ON tracking_events(owner,synced,seq);`;
