/**
 * Database Migration System
 * Non-destructive schema migrations with version tracking
 */

import Database from 'better-sqlite3'

export interface Migration {
  version: number
  name: string
  up: (db: Database.Database) => void
}

/**
 * All migrations in order. Each migration should be idempotent where possible.
 * Add new migrations at the end with incrementing version numbers.
 */
export const migrations: Migration[] = [
  {
    version: 1,
    name: 'initial_schema',
    up: (db) => {
      // Initial tables - these use IF NOT EXISTS for safety
      db.exec(`
        CREATE TABLE IF NOT EXISTS hymnals (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          code TEXT NOT NULL UNIQUE,
          name TEXT NOT NULL,
          language TEXT DEFAULT 'Indonesia',
          region TEXT DEFAULT '',
          version TEXT DEFAULT '',
          publisher TEXT DEFAULT '',
          is_official INTEGER DEFAULT 1,
          created_at TEXT DEFAULT (datetime('now')),
          updated_at TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS songs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          hymnal_id INTEGER NOT NULL,
          number TEXT NOT NULL,
          title TEXT NOT NULL,
          alternate_title TEXT NOT NULL DEFAULT '',
          lyrics_raw TEXT NOT NULL DEFAULT '',
          category TEXT DEFAULT '',
          language TEXT DEFAULT 'Indonesia',
          author TEXT DEFAULT '',
          composer TEXT DEFAULT '',
          key_note TEXT DEFAULT '',
          tempo TEXT DEFAULT '',
          tags TEXT DEFAULT '',
          theme TEXT DEFAULT '',
          scripture_reference TEXT DEFAULT '',
          is_favorite INTEGER DEFAULT 0,
          created_at TEXT DEFAULT (datetime('now')),
          updated_at TEXT DEFAULT (datetime('now')),
          FOREIGN KEY (hymnal_id) REFERENCES hymnals(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS song_relations (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          source_song_id INTEGER NOT NULL,
          target_song_id INTEGER NOT NULL,
          relation_type TEXT DEFAULT 'translation',
          FOREIGN KEY (source_song_id) REFERENCES songs(id) ON DELETE CASCADE,
          FOREIGN KEY (target_song_id) REFERENCES songs(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS playlists (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          service_date TEXT DEFAULT '',
          description TEXT DEFAULT '',
          created_at TEXT DEFAULT (datetime('now')),
          updated_at TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS playlist_items (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          playlist_id INTEGER NOT NULL,
          song_id INTEGER NOT NULL,
          sort_order INTEGER NOT NULL DEFAULT 0,
          section_label TEXT DEFAULT '',
          FOREIGN KEY (playlist_id) REFERENCES playlists(id) ON DELETE CASCADE,
          FOREIGN KEY (song_id) REFERENCES songs(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS settings (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS song_history (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          song_id INTEGER NOT NULL,
          played_at TEXT DEFAULT (datetime('now')),
          FOREIGN KEY (song_id) REFERENCES songs(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS app_state (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL,
          updated_at TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS slide_themes (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          font_family TEXT DEFAULT 'Inter',
          font_size INTEGER DEFAULT 48,
          bg_color TEXT DEFAULT '#0f0f1a',
          bg_image TEXT DEFAULT '',
          text_color TEXT DEFAULT '#ffffff',
          animation TEXT DEFAULT 'dissolve'
        );
      `)
    }
  },
  {
    version: 2,
    name: 'fts5_search',
    up: (db) => {
      try {
        db.exec(`
          CREATE VIRTUAL TABLE IF NOT EXISTS songs_fts USING fts5(
            number,
            title,
            alternate_title,
            lyrics_raw,
            tags,
            category,
            content='songs',
            content_rowid='id',
            tokenize='unicode61 remove_diacritics 2'
          );
        `)

        // Populate FTS from existing songs
        const ftsCount = db.prepare('SELECT COUNT(*) as c FROM songs_fts').get() as { c: number }
        const songsCount = db.prepare('SELECT COUNT(*) as c FROM songs').get() as { c: number }

        if (ftsCount.c === 0 && songsCount.c > 0) {
          db.exec(`
            INSERT INTO songs_fts(rowid, number, title, alternate_title, lyrics_raw, tags, category)
            SELECT id, number, title, alternate_title, lyrics_raw, tags, category FROM songs;
          `)
        }

        // Create triggers to keep FTS in sync
        db.exec(`
          CREATE TRIGGER IF NOT EXISTS songs_ai AFTER INSERT ON songs BEGIN
            INSERT INTO songs_fts(rowid, number, title, alternate_title, lyrics_raw, tags, category)
            VALUES (new.id, new.number, new.title, new.alternate_title, new.lyrics_raw, new.tags, new.category);
          END;
        `)
        db.exec(`
          CREATE TRIGGER IF NOT EXISTS songs_ad AFTER DELETE ON songs BEGIN
            INSERT INTO songs_fts(songs_fts, rowid, number, title, alternate_title, lyrics_raw, tags, category)
            VALUES ('delete', old.id, old.number, old.title, old.alternate_title, old.lyrics_raw, old.tags, old.category);
          END;
        `)
        db.exec(`
          CREATE TRIGGER IF NOT EXISTS songs_au AFTER UPDATE ON songs BEGIN
            INSERT INTO songs_fts(songs_fts, rowid, number, title, alternate_title, lyrics_raw, tags, category)
            VALUES ('delete', old.id, old.number, old.title, old.alternate_title, old.lyrics_raw, old.tags, old.category);
            INSERT INTO songs_fts(rowid, number, title, alternate_title, lyrics_raw, tags, category)
            VALUES (new.id, new.number, new.title, new.alternate_title, new.lyrics_raw, new.tags, new.category);
          END;
        `)
      } catch (err) {
        console.warn('FTS5 migration note:', err)
      }
    }
  },
  {
    version: 3,
    name: 'default_settings',
    up: (db) => {
      const defaults = [
        ['projection_font_family', 'Inter'],
        ['projection_font_size', '48'],
        ['projection_text_color', '#ffffff'],
        ['projection_text_shadow', '1'],
        ['projection_bg_color', '#0f0f1a'],
        ['projection_bg_image', ''],
        ['projection_bg_opacity', '0.7'],
        ['projection_text_align', 'center'],
        ['projection_max_lines', '4'],
        ['projection_max_chars', '40'],
        ['projection_logo', ''],
        ['projection_logo_position', 'bottom-right'],
        ['projection_logo_opacity', '0.5'],
        ['transition_type', 'dissolve'],
        ['transition_duration', '0.5']
      ]

      const insertSetting = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)')
      for (const [key, value] of defaults) {
        insertSetting.run(key, value)
      }
    }
  },
  {
    version: 4,
    name: 'bible_schema',
    up: (db) => {
      // Bible translations (e.g., Indonesian TB, English NIV)
      db.exec(`
        CREATE TABLE IF NOT EXISTS bible_translations (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          code TEXT NOT NULL UNIQUE,
          name TEXT NOT NULL,
          language TEXT NOT NULL,
          source TEXT DEFAULT '',
          is_default INTEGER DEFAULT 0,
          created_at TEXT DEFAULT (datetime('now'))
        );
      `)

      // Bible books
      db.exec(`
        CREATE TABLE IF NOT EXISTS bible_books (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          translation_id INTEGER NOT NULL,
          book_number INTEGER NOT NULL,
          short_name TEXT NOT NULL,
          long_name TEXT NOT NULL,
          testament TEXT NOT NULL DEFAULT 'OT',
          chapter_count INTEGER NOT NULL DEFAULT 1,
          FOREIGN KEY (translation_id) REFERENCES bible_translations(id) ON DELETE CASCADE,
          UNIQUE(translation_id, book_number)
        );
      `)

      // Bible verses
      db.exec(`
        CREATE TABLE IF NOT EXISTS bible_verses (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          translation_id INTEGER NOT NULL,
          book_id INTEGER NOT NULL,
          chapter INTEGER NOT NULL,
          verse INTEGER NOT NULL,
          text TEXT NOT NULL,
          FOREIGN KEY (translation_id) REFERENCES bible_translations(id) ON DELETE CASCADE,
          FOREIGN KEY (book_id) REFERENCES bible_books(id) ON DELETE CASCADE,
          UNIQUE(translation_id, book_id, chapter, verse)
        );
      `)

      // FTS for Bible search
      try {
        db.exec(`
          CREATE VIRTUAL TABLE IF NOT EXISTS bible_verses_fts USING fts5(
            text,
            content='bible_verses',
            content_rowid='id',
            tokenize='unicode61 remove_diacritics 2'
          );
        `)

        // Triggers to keep FTS in sync
        db.exec(`
          CREATE TRIGGER IF NOT EXISTS bible_verses_ai AFTER INSERT ON bible_verses BEGIN
            INSERT INTO bible_verses_fts(rowid, text) VALUES (new.id, new.text);
          END;
        `)
        db.exec(`
          CREATE TRIGGER IF NOT EXISTS bible_verses_ad AFTER DELETE ON bible_verses BEGIN
            INSERT INTO bible_verses_fts(bible_verses_fts, rowid, text) VALUES ('delete', old.id, old.text);
          END;
        `)
        db.exec(`
          CREATE TRIGGER IF NOT EXISTS bible_verses_au AFTER UPDATE ON bible_verses BEGIN
            INSERT INTO bible_verses_fts(bible_verses_fts, rowid, text) VALUES ('delete', old.id, old.text);
            INSERT INTO bible_verses_fts(rowid, text) VALUES (new.id, new.text);
          END;
        `)
      } catch (err) {
        console.warn('Bible FTS5 migration note:', err)
      }
    }
  },
  {
    version: 5,
    name: 'custom_slides_schema',
    up: (db) => {
      // Custom slides (announcements, liturgy, etc.)
      db.exec(`
        CREATE TABLE IF NOT EXISTS custom_slides (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL,
          content TEXT NOT NULL DEFAULT '',
          slide_type TEXT NOT NULL DEFAULT 'announcement',
          background_color TEXT DEFAULT '#0f0f1a',
          background_image TEXT DEFAULT '',
          text_color TEXT DEFAULT '#ffffff',
          font_size INTEGER DEFAULT 48,
          display_duration INTEGER DEFAULT 5,
          is_active INTEGER DEFAULT 1,
          sort_order INTEGER DEFAULT 0,
          created_at TEXT DEFAULT (datetime('now')),
          updated_at TEXT DEFAULT (datetime('now'))
        );
      `)

      // Slide groups for organizing announcement loops
      db.exec(`
        CREATE TABLE IF NOT EXISTS slide_groups (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          description TEXT DEFAULT '',
          loop_interval INTEGER DEFAULT 10,
          is_active INTEGER DEFAULT 1,
          created_at TEXT DEFAULT (datetime('now'))
        );
      `)

      // Junction table for slides in groups
      db.exec(`
        CREATE TABLE IF NOT EXISTS slide_group_items (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          group_id INTEGER NOT NULL,
          slide_id INTEGER NOT NULL,
          sort_order INTEGER DEFAULT 0,
          FOREIGN KEY (group_id) REFERENCES slide_groups(id) ON DELETE CASCADE,
          FOREIGN KEY (slide_id) REFERENCES custom_slides(id) ON DELETE CASCADE,
          UNIQUE(group_id, slide_id)
        );
      `)
    }
  },
  {
    version: 6,
    name: 'multi_hymnal_indexes',
    up: (db) => {
      // Browsing/sorting within hymnal
      db.exec(`
        CREATE INDEX IF NOT EXISTS idx_songs_hymnal_number ON songs(hymnal_id, number);
        CREATE INDEX IF NOT EXISTS idx_songs_hymnal_title ON songs(hymnal_id, title);
        CREATE INDEX IF NOT EXISTS idx_song_history_song_id ON song_history(song_id);
      `)

      // Global sorting / filtering
      db.exec(`CREATE INDEX IF NOT EXISTS idx_songs_number ON songs(number);`)
      db.exec(`CREATE INDEX IF NOT EXISTS idx_songs_title ON songs(title);`)
      db.exec(`CREATE INDEX IF NOT EXISTS idx_songs_hymnal_id ON songs(hymnal_id);`)
    }
  },
  {
    version: 7,
    name: 'songs_time_signature',
    up: (db) => {
      const columns = db.prepare("PRAGMA table_info('songs')").all() as Array<{ name: string }>
      const hasTimeSignature = columns.some((c) => c.name === 'time_signature')
      if (!hasTimeSignature) {
        db.exec("ALTER TABLE songs ADD COLUMN time_signature TEXT DEFAULT ''")
      }
    }
  },
  {
    version: 8,
    name: 'default_app_theme_mode_setting',
    up: (db) => {
      const insertSetting = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)')
      insertSetting.run('app_theme_mode', 'system')
    }
  },
  {
    version: 9,
    name: 'normalize_song_numbers_remove_leading_zeros',
    up: (db) => {
      db.exec(`
        UPDATE songs
        SET number = CASE
          WHEN LTRIM(number, '0') = '' THEN '0'
          ELSE LTRIM(number, '0')
        END
        WHERE number LIKE '0%';
      `)

      try {
        db.exec(`INSERT INTO songs_fts(songs_fts) VALUES('rebuild');`)
      } catch {
        // ignore (FTS5 might not be available in some environments)
      }
    }
  },
  {
    version: 10,
    name: 'scraper_import_audit_tables',
    up: (db) => {
      // Main audit log for scraper imports
      db.exec(`
        CREATE TABLE IF NOT EXISTS scraper_import_audit (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          task_id TEXT NOT NULL,
          timestamp TEXT DEFAULT (datetime('now')),
          provider_id TEXT NOT NULL,
          target_hymnal_id INTEGER NOT NULL,
          range_start TEXT,
          range_end TEXT,
          imported_count INTEGER DEFAULT 0,
          skipped_count INTEGER DEFAULT 0,
          overwritten_count INTEGER DEFAULT 0,
          renamed_count INTEGER DEFAULT 0,
          merged_count INTEGER DEFAULT 0,
          failed_count INTEGER DEFAULT 0,
          critical_conflicts INTEGER DEFAULT 0,
          duration_ms INTEGER DEFAULT 0,
          report_json TEXT
        );
      `)

      // Per-song decisions within an import
      db.exec(`
        CREATE TABLE IF NOT EXISTS scraper_import_audit_items (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          audit_id INTEGER NOT NULL,
          song_number TEXT NOT NULL,
          song_title TEXT,
          action TEXT NOT NULL,
          conflict_type TEXT,
          conflict_severity TEXT,
          old_data TEXT,
          new_data TEXT,
          timestamp TEXT DEFAULT (datetime('now')),
          FOREIGN KEY (audit_id) REFERENCES scraper_import_audit(id) ON DELETE CASCADE
        );
      `)

      // Indexes for efficient querying
      db.exec(`CREATE INDEX IF NOT EXISTS idx_scraper_audit_task ON scraper_import_audit(task_id)`)
      db.exec(
        `CREATE INDEX IF NOT EXISTS idx_scraper_audit_timestamp ON scraper_import_audit(timestamp)`
      )
      db.exec(
        `CREATE INDEX IF NOT EXISTS idx_scraper_audit_hymnal ON scraper_import_audit(target_hymnal_id)`
      )
      db.exec(
        `CREATE INDEX IF NOT EXISTS idx_scraper_audit_items_audit ON scraper_import_audit_items(audit_id)`
      )
    }
  }
]

// ... (rest of the code remains the same)
/**
 * Create the schema_migrations table if it doesn't exist
 */
export function ensureMigrationsTable(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT DEFAULT (datetime('now'))
    );
  `)
}

/**
 * Get the current schema version from the database
 */
export function getCurrentVersion(db: Database.Database): number {
  const row = db.prepare('SELECT MAX(version) as version FROM schema_migrations').get() as
    | { version: number | null }
    | undefined
  return row?.version ?? 0
}

/**
 * Check if a specific migration has been applied
 */
export function isMigrationApplied(db: Database.Database, version: number): boolean {
  const row = db.prepare('SELECT 1 FROM schema_migrations WHERE version = ?').get(version)
  return !!row
}

/**
 * Record a migration as applied
 */
export function recordMigration(db: Database.Database, version: number, name: string): void {
  db.prepare('INSERT OR IGNORE INTO schema_migrations (version, name) VALUES (?, ?)').run(
    version,
    name
  )
}

/**
 * Run all pending migrations in a transaction
 * Returns the number of migrations applied
 */
export function runMigrations(db: Database.Database): number {
  ensureMigrationsTable(db)
  const currentVersion = getCurrentVersion(db)

  const pendingMigrations = migrations.filter((m) => m.version > currentVersion)

  if (pendingMigrations.length === 0) {
    console.log('Database schema is up to date (version ' + currentVersion + ')')
    return 0
  }

  console.log(
    `Running ${pendingMigrations.length} pending migration(s) (from version ${currentVersion} to version ${migrations[migrations.length - 1].version})...`
  )

  const transaction = db.transaction(() => {
    for (const migration of pendingMigrations) {
      try {
        console.log(`Applying migration ${migration.version}: ${migration.name}...`)
        migration.up(db)
        recordMigration(db, migration.version, migration.name)
        console.log(`Migration ${migration.version} applied successfully.`)
      } catch (err) {
        console.error(`Migration ${migration.version} failed:`, err)
        throw err
      }
    }
  })

  transaction()

  return pendingMigrations.length
}

/**
 * Get list of applied migrations
 */
export function getAppliedMigrations(db: Database.Database): Array<{
  version: number
  name: string
  applied_at: string
}> {
  return db
    .prepare('SELECT version, name, applied_at FROM schema_migrations ORDER BY version')
    .all() as Array<{
    version: number
    name: string
    applied_at: string
  }>
}
