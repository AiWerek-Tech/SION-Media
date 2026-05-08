import Database from 'better-sqlite3'
import { join } from 'path'
import { app } from 'electron'
import { copyFileSync, existsSync, mkdirSync, unlinkSync } from 'fs'
import { initialSongs } from './seed-data'

let db: Database.Database

export function initDatabase(): void {
  const dbPath = join(app.getPath('userData'), 'sion.db')

  // PHASE 1: Audit Check - if old schema exists (no hymnals table), perform a wipe-out
  const tempDb = new Database(dbPath)
  const hymnalTableExists = tempDb
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='hymnals'")
    .get()
  tempDb.close()

  if (!hymnalTableExists) {
    console.log('Old schema detected. Performing mandatory wipe-out for Multi-Hymnal revamp...')
    try {
      for (const suffix of ['', '-wal', '-shm']) {
        const filePath = `${dbPath}${suffix}`
        if (existsSync(filePath)) unlinkSync(filePath)
      }
    } catch (e) {
      console.error('Failed to wipe out old database:', e)
    }
  }

  db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  createTables()
  setupFTS()
  seedDatabase()
}

function createTables(): void {
  db.exec(`
    -- Multi-Hymnal: Koleksi Buku Lagu
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

    -- Multi-Hymnal: Master Data Lagu (relasi ke hymnals)
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

    -- Song Relation System (Linked Songs lintas buku/bahasa)
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
  `)

  // Default settings
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

// FTS5 Full-Text Search setup for Multi-Hymnal
function setupFTS(): void {
  // App state table for crash recovery
  db.exec(`
    CREATE TABLE IF NOT EXISTS app_state (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT DEFAULT (datetime('now'))
    );
  `)

  // Slide themes table
  db.exec(`
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

  // FTS5 virtual table for full-text search (Multi-Hymnal)
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

    // Populate FTS from existing songs (only if empty)
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
    console.warn('FTS5 setup note:', err)
  }
}

function seedDatabase(): void {
  const count = db.prepare('SELECT COUNT(*) as c FROM songs').get() as { c: number }
  if (count.c > 0) return // Already seeded or has data

  console.log('Seeding Multi-Hymnal database...')

  // Insert default hymnal: Lagu Sion Edisi Lengkap
  const hymnalResult = db
    .prepare(
      `INSERT OR IGNORE INTO hymnals (code, name, language, region, publisher, is_official)
     VALUES ('LS', 'Lagu Sion Edisi Lengkap', 'Indonesia', 'Indonesia', 'GMAHK', 1)`
    )
    .run()
  const hymnalId =
    hymnalResult.lastInsertRowid ||
    (db.prepare("SELECT id FROM hymnals WHERE code = 'LS'").get() as { id: number })
  const lsId = typeof hymnalId === 'number' ? hymnalId : (hymnalId as { id: number }).id

  const insert = db.prepare(`
    INSERT INTO songs (hymnal_id, number, title, alternate_title, language, lyrics_raw)
    VALUES (?, ?, ?, ?, ?, '')
  `)

  const transaction = db.transaction((songs) => {
    for (const song of songs) {
      insert.run(lsId, song.song_number, song.title, song.title_en || '', song.language)
    }
  })

  transaction(initialSongs)
  console.log(`Seeded ${initialSongs.length} songs under hymnal LS (id=${lsId}).`)
}

export function reseedDatabase(): void {
  console.log('Reseeding Multi-Hymnal database...')
  try {
    // 1. Drop FTS table and triggers to avoid conflicts
    db.exec(`
      DROP TABLE IF EXISTS songs_fts;
      DROP TRIGGER IF EXISTS songs_ai;
      DROP TRIGGER IF EXISTS songs_ad;
      DROP TRIGGER IF EXISTS songs_au;
    `)

    db.transaction(() => {
      // 2. Clear all song-related data
      db.prepare('DELETE FROM song_history').run()
      db.prepare('DELETE FROM playlist_items').run()
      db.prepare('DELETE FROM song_relations').run()
      db.prepare('DELETE FROM songs').run()
      db.prepare('DELETE FROM hymnals').run()
      db.prepare('DELETE FROM playlists').run()
      db.prepare('DELETE FROM app_state').run()

      // 3. Reset sequences
      try {
        db.prepare(
          'DELETE FROM sqlite_sequence WHERE name IN ("songs","hymnals","playlists","playlist_items","song_relations","song_history")'
        ).run()
      } catch (e) {
        console.warn('Could not reset sequence:', e)
      }

      // 4. Re-insert default hymnal
      const hymnalResult = db
        .prepare(
          `INSERT INTO hymnals (code, name, language, region, publisher, is_official)
         VALUES ('LS', 'Lagu Sion Edisi Lengkap', 'Indonesia', 'Indonesia', 'GMAHK', 1)`
        )
        .run()
      const lsId = hymnalResult.lastInsertRowid

      // 5. Insert initial songs under LS
      const insert = db.prepare(`
        INSERT INTO songs (hymnal_id, number, title, alternate_title, language, lyrics_raw, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, '', datetime('now'), datetime('now'))
      `)

      for (const song of initialSongs) {
        insert.run(lsId, song.song_number, song.title, song.title_en || '', song.language)
      }
    })()

    // 6. Re-create FTS table and triggers
    setupFTS()

    console.log('Reseed complete.')
  } catch (err) {
    console.error('Reseed error:', err)
    throw err
  }
}

// ========== Hymnal Operations ==========

export function getHymnals(): unknown[] {
  return db.prepare('SELECT * FROM hymnals ORDER BY is_official DESC, name').all()
}

export function addHymnal(hymnal: {
  code: string
  name: string
  language?: string
  region?: string
  version?: string
  publisher?: string
  is_official?: number
}): unknown {
  const result = db
    .prepare(
      `INSERT INTO hymnals (code, name, language, region, version, publisher, is_official)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      hymnal.code,
      hymnal.name,
      hymnal.language || 'Indonesia',
      hymnal.region || '',
      hymnal.version || '',
      hymnal.publisher || '',
      hymnal.is_official ?? 0
    )
  return { id: result.lastInsertRowid, ...hymnal }
}

export function updateHymnal(
  id: number,
  hymnal: {
    code?: string
    name?: string
    language?: string
    region?: string
    version?: string
    publisher?: string
    is_official?: number
  }
): unknown {
  const existing = db.prepare('SELECT * FROM hymnals WHERE id = ?').get(id) as Record<
    string,
    unknown
  >
  if (!existing) return null
  db.prepare(
    `UPDATE hymnals SET code=?, name=?, language=?, region=?, version=?, publisher=?, is_official=?, updated_at=datetime('now') WHERE id=?`
  ).run(
    hymnal.code ?? existing.code,
    hymnal.name ?? existing.name,
    hymnal.language ?? existing.language,
    hymnal.region ?? existing.region,
    hymnal.version ?? existing.version,
    hymnal.publisher ?? existing.publisher,
    hymnal.is_official ?? existing.is_official,
    id
  )
  return db.prepare('SELECT * FROM hymnals WHERE id = ?').get(id)
}

export function deleteHymnal(id: number): boolean {
  const result = db.prepare('DELETE FROM hymnals WHERE id = ?').run(id)
  return result.changes > 0
}

// ========== Song Operations (Multi-Hymnal) ==========

export function getSongs(hymnalId?: number): unknown[] {
  if (hymnalId) {
    return db
      .prepare(
        `SELECT s.*, h.code as hymnal_code, h.name as hymnal_name
       FROM songs s JOIN hymnals h ON s.hymnal_id = h.id
       WHERE s.hymnal_id = ?
       ORDER BY CAST(s.number AS INTEGER), s.number`
      )
      .all(hymnalId)
  }
  return db
    .prepare(
      `SELECT s.*, h.code as hymnal_code, h.name as hymnal_name
     FROM songs s JOIN hymnals h ON s.hymnal_id = h.id
     ORDER BY h.code, CAST(s.number AS INTEGER), s.number`
    )
    .all()
}

export function searchSongs(query: string, hymnalId?: number): unknown[] {
  if (!query.trim()) return getSongs(hymnalId)

  // Try FTS5 first
  try {
    const ftsQuery = query
      .trim()
      .split(/\s+/)
      .map((term) => `"${term}"*`)
      .join(' ')

    let sql = `SELECT s.*, h.code as hymnal_code, h.name as hymnal_name
               FROM songs s
               JOIN songs_fts f ON s.id = f.rowid
               JOIN hymnals h ON s.hymnal_id = h.id
               WHERE songs_fts MATCH ?`
    const params: unknown[] = [ftsQuery]

    if (hymnalId) {
      sql += ` AND s.hymnal_id = ?`
      params.push(hymnalId)
    }

    sql += ` ORDER BY rank LIMIT 100`

    const results = db.prepare(sql).all(...params)
    if (results.length > 0) return results
  } catch {
    // FTS fallback
  }

  // Fallback to LIKE
  const q = `%${query}%`
  let sql = `SELECT s.*, h.code as hymnal_code, h.name as hymnal_name
             FROM songs s JOIN hymnals h ON s.hymnal_id = h.id
             WHERE (s.number LIKE ? OR s.title LIKE ? OR s.alternate_title LIKE ? OR s.lyrics_raw LIKE ? OR s.tags LIKE ?)`
  const params: unknown[] = [q, q, q, q, q]

  if (hymnalId) {
    sql += ` AND s.hymnal_id = ?`
    params.push(hymnalId)
  }

  sql += ` ORDER BY h.code, CAST(s.number AS INTEGER), s.number`
  return db.prepare(sql).all(...params)
}

export function addSong(song: {
  hymnal_id: number
  number: string
  title: string
  alternate_title?: string
  lyrics_raw: string
  category?: string
  language?: string
  author?: string
  composer?: string
  key_note?: string
  tempo?: string
  tags?: string
  theme?: string
  scripture_reference?: string
}): unknown {
  // Check for duplicates within the same hymnal
  const duplicate = db
    .prepare('SELECT id FROM songs WHERE hymnal_id = ? AND (number = ? OR title = ?)')
    .get(song.hymnal_id, song.number, song.title)
  if (duplicate) {
    throw new Error('Nomor lagu atau judul sudah ada dalam hymnal ini.')
  }

  const result = db
    .prepare(
      `INSERT INTO songs (hymnal_id, number, title, alternate_title, lyrics_raw, category, language, author, composer, key_note, tempo, tags, theme, scripture_reference)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      song.hymnal_id,
      song.number,
      song.title,
      song.alternate_title || '',
      song.lyrics_raw,
      song.category || '',
      song.language || 'Indonesia',
      song.author || '',
      song.composer || '',
      song.key_note || '',
      song.tempo || '',
      song.tags || '',
      song.theme || '',
      song.scripture_reference || ''
    )
  return { id: result.lastInsertRowid, ...song }
}

export function updateSong(
  id: number,
  song: {
    hymnal_id?: number
    number?: string
    title?: string
    alternate_title?: string
    lyrics_raw?: string
    category?: string
    language?: string
    author?: string
    composer?: string
    key_note?: string
    tempo?: string
    tags?: string
    theme?: string
    scripture_reference?: string
  }
): unknown {
  const existing = db.prepare('SELECT * FROM songs WHERE id = ?').get(id) as Record<string, unknown>
  if (!existing) return null

  db.prepare(
    `UPDATE songs SET
      hymnal_id = ?, number = ?, title = ?, alternate_title = ?, lyrics_raw = ?, category = ?,
      language = ?, author = ?, composer = ?, key_note = ?, tempo = ?, tags = ?,
      theme = ?, scripture_reference = ?, updated_at = datetime('now')
    WHERE id = ?`
  ).run(
    song.hymnal_id ?? existing.hymnal_id,
    song.number ?? existing.number,
    song.title ?? existing.title,
    song.alternate_title ?? existing.alternate_title,
    song.lyrics_raw ?? existing.lyrics_raw,
    song.category ?? existing.category,
    song.language ?? existing.language,
    song.author ?? existing.author,
    song.composer ?? existing.composer,
    song.key_note ?? existing.key_note,
    song.tempo ?? existing.tempo,
    song.tags ?? existing.tags,
    song.theme ?? existing.theme,
    song.scripture_reference ?? existing.scripture_reference,
    id
  )
  return db.prepare('SELECT * FROM songs WHERE id = ?').get(id)
}

export function deleteSong(id: number): boolean {
  const result = db.prepare('DELETE FROM songs WHERE id = ?').run(id)
  return result.changes > 0
}

// ========== Song Relation Operations ==========

export function getSongRelations(songId: number): unknown[] {
  return db
    .prepare(
      `SELECT sr.*, s.number, s.title, h.code as hymnal_code
       FROM song_relations sr
       JOIN songs s ON sr.target_song_id = s.id
       JOIN hymnals h ON s.hymnal_id = h.id
       WHERE sr.source_song_id = ?`
    )
    .all(songId)
}

export function addSongRelation(relation: {
  source_song_id: number
  target_song_id: number
  relation_type?: string
}): unknown {
  const result = db
    .prepare(
      'INSERT INTO song_relations (source_song_id, target_song_id, relation_type) VALUES (?, ?, ?)'
    )
    .run(relation.source_song_id, relation.target_song_id, relation.relation_type || 'translation')
  return { id: result.lastInsertRowid, ...relation }
}

export function deleteSongRelation(id: number): boolean {
  const result = db.prepare('DELETE FROM song_relations WHERE id = ?').run(id)
  return result.changes > 0
}

export function toggleFavorite(id: number): unknown {
  db.prepare(
    'UPDATE songs SET is_favorite = CASE WHEN is_favorite = 1 THEN 0 ELSE 1 END WHERE id = ?'
  ).run(id)
  return db.prepare('SELECT * FROM songs WHERE id = ?').get(id)
}

// ========== Playlist Operations ==========

export function getPlaylists(): unknown[] {
  return db.prepare('SELECT * FROM playlists ORDER BY created_at DESC').all()
}

export function addPlaylist(playlist: {
  name: string
  service_date?: string
  description?: string
}): unknown {
  const result = db
    .prepare('INSERT INTO playlists (name, service_date, description) VALUES (?, ?, ?)')
    .run(playlist.name, playlist.service_date || '', playlist.description || '')
  return { id: result.lastInsertRowid, ...playlist }
}

export function updatePlaylist(
  id: number,
  playlist: { name?: string; service_date?: string; description?: string }
): unknown {
  const existing = db.prepare('SELECT * FROM playlists WHERE id = ?').get(id) as Record<
    string,
    unknown
  >
  if (!existing) return null

  db.prepare(
    `UPDATE playlists SET name = ?, service_date = ?, description = ?, updated_at = datetime('now') WHERE id = ?`
  ).run(
    playlist.name ?? existing.name,
    playlist.service_date ?? existing.service_date,
    playlist.description ?? existing.description,
    id
  )
  return db.prepare('SELECT * FROM playlists WHERE id = ?').get(id)
}

export function deletePlaylist(id: number): boolean {
  db.prepare('DELETE FROM playlist_items WHERE playlist_id = ?').run(id)
  const result = db.prepare('DELETE FROM playlists WHERE id = ?').run(id)
  return result.changes > 0
}

export function getPlaylistItems(playlistId: number): unknown[] {
  return db
    .prepare(
      `SELECT pi.*, s.number, s.title, s.alternate_title, s.lyrics_raw, s.category, s.key_note, s.tempo,
              h.code as hymnal_code, h.name as hymnal_name
       FROM playlist_items pi
       JOIN songs s ON pi.song_id = s.id
       JOIN hymnals h ON s.hymnal_id = h.id
       WHERE pi.playlist_id = ?
       ORDER BY pi.sort_order`
    )
    .all(playlistId)
}

export function updatePlaylistItem(id: number, data: { section_label?: string }): void {
  const existing = db.prepare('SELECT * FROM playlist_items WHERE id = ?').get(id) as Record<
    string,
    unknown
  >
  if (!existing) return

  db.prepare('UPDATE playlist_items SET section_label = ? WHERE id = ?').run(
    data.section_label ?? existing.section_label,
    id
  )
}

export function addPlaylistItem(item: {
  playlist_id: number
  song_id: number
  section_label?: string
}): unknown {
  const maxOrder = db
    .prepare('SELECT MAX(sort_order) as max_order FROM playlist_items WHERE playlist_id = ?')
    .get(item.playlist_id) as { max_order: number | null }
  const nextOrder = (maxOrder?.max_order ?? -1) + 1

  const result = db
    .prepare(
      'INSERT INTO playlist_items (playlist_id, song_id, sort_order, section_label) VALUES (?, ?, ?, ?)'
    )
    .run(item.playlist_id, item.song_id, nextOrder, item.section_label || '')
  return { id: result.lastInsertRowid, ...item, sort_order: nextOrder }
}

export function deletePlaylistItem(id: number): boolean {
  const result = db.prepare('DELETE FROM playlist_items WHERE id = ?').run(id)
  return result.changes > 0
}

export function reorderPlaylistItems(items: { id: number; sort_order: number }[]): void {
  const stmt = db.prepare('UPDATE playlist_items SET sort_order = ? WHERE id = ?')
  const transaction = db.transaction(() => {
    for (const item of items) {
      stmt.run(item.sort_order, item.id)
    }
  })
  transaction()
}

// ========== Settings ==========

export function getSettings(): Record<string, string> {
  const rows = db.prepare('SELECT key, value FROM settings').all() as {
    key: string
    value: string
  }[]
  const result: Record<string, string> = {}
  for (const row of rows) result[row.key] = row.value
  return result
}

export function updateSetting(key: string, value: string): void {
  db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, value)
}

// ========== History ==========

export function logSongHistory(songId: number): void {
  db.prepare('INSERT INTO song_history (song_id) VALUES (?)').run(songId)
}

export function getRecentSongs(limit: number = 20): unknown[] {
  return db
    .prepare(
      `SELECT s.*, h.code as hymnal_code, h.name as hymnal_name, MAX(sh.played_at) as last_played
       FROM songs s
       JOIN song_history sh ON s.id = sh.song_id
       JOIN hymnals h ON s.hymnal_id = h.id
       GROUP BY s.id ORDER BY last_played DESC LIMIT ?`
    )
    .all(limit)
}

// ========== Crash Recovery (App State) ==========

export function saveAppState(key: string, value: string): void {
  db.prepare(
    `INSERT OR REPLACE INTO app_state (key, value, updated_at) VALUES (?, ?, datetime('now'))`
  ).run(key, value)
}

export function getAppState(key: string): string | null {
  const row = db.prepare('SELECT value FROM app_state WHERE key = ?').get(key) as
    | { value: string }
    | undefined
  return row?.value ?? null
}

export function getAllAppState(): Record<string, string> {
  const rows = db.prepare('SELECT key, value FROM app_state').all() as {
    key: string
    value: string
  }[]
  const result: Record<string, string> = {}
  for (const row of rows) result[row.key] = row.value
  return result
}

export function clearAppState(): void {
  db.exec('DELETE FROM app_state')
}

export function saveSessionState(state: {
  playlistId?: number
  songId?: number
  slideIndex?: number
  projectionState?: string
}): void {
  const transaction = db.transaction(() => {
    if (state.playlistId !== undefined)
      saveAppState('session_playlist_id', String(state.playlistId))
    if (state.songId !== undefined) saveAppState('session_song_id', String(state.songId))
    if (state.slideIndex !== undefined)
      saveAppState('session_slide_index', String(state.slideIndex))
    if (state.projectionState !== undefined)
      saveAppState('session_projection_state', state.projectionState)
    saveAppState('session_timestamp', new Date().toISOString())
    saveAppState('session_clean_exit', '0')
  })
  transaction()
}

export function markCleanExit(): void {
  saveAppState('session_clean_exit', '1')
}

export function getRecoveryState(): {
  needsRecovery: boolean
  playlistId?: number
  songId?: number
  slideIndex?: number
  projectionState?: string
} {
  const cleanExit = getAppState('session_clean_exit')
  if (cleanExit === '1' || cleanExit === null) {
    return { needsRecovery: false }
  }

  const playlistId = getAppState('session_playlist_id')
  const songId = getAppState('session_song_id')

  if (!playlistId && !songId) return { needsRecovery: false }

  return {
    needsRecovery: true,
    playlistId: playlistId ? parseInt(playlistId) : undefined,
    songId: songId ? parseInt(songId) : undefined,
    slideIndex: parseInt(getAppState('session_slide_index') || '0'),
    projectionState: getAppState('session_projection_state') || 'CLEAR'
  }
}

// ========== Backup & Restore ==========

export function createBackup(customPath?: string): string {
  const dbPath = join(app.getPath('userData'), 'sion.db')
  const backupDir = join(app.getPath('userData'), 'backups')

  try {
    mkdirSync(backupDir, { recursive: true })
  } catch {
    /* ignore */
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const defaultBackupPath = join(backupDir, `sion_backup_${timestamp}.db`)
  const targetPath = customPath || defaultBackupPath

  db.pragma('wal_checkpoint(TRUNCATE)')
  copyFileSync(dbPath, targetPath)
  return targetPath
}

export function restoreBackup(backupPath: string): boolean {
  const dbPath = join(app.getPath('userData'), 'sion.db')
  try {
    db.close()
    for (const suffix of ['', '-wal', '-shm']) {
      const filePath = `${dbPath}${suffix}`
      if (existsSync(filePath)) unlinkSync(filePath)
    }
    copyFileSync(backupPath, dbPath)
    initDatabase()
    return true
  } catch (error) {
    console.error('Restore failed:', error)
    try {
      initDatabase()
    } catch {
      /* ignore */
    }
    throw error
  }
}
