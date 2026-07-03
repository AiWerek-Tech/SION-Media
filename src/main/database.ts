import Database from 'better-sqlite3'
import { join, basename, extname } from 'path'
import { app, nativeImage } from 'electron'
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  renameSync,
  unlinkSync,
  writeFileSync,
  statSync
} from 'fs'
import { randomUUID } from 'crypto'
import { initialSongs } from './seed-data'
import { runMigrations } from './migrations'
import { setRegistryDb } from './services/content-packs/contentPackRegistry'
import { autoRegisterBundledPacks } from './services/content-packs/contentPackManager'

let db: Database.Database

function checkpointWal(mode: 'PASSIVE' | 'FULL' | 'RESTART' | 'TRUNCATE' = 'PASSIVE'): void {
  try {
    db.pragma(`wal_checkpoint(${mode})`)
  } catch {
    // ignore
  }
}

export function getSongForConflictByNumber(
  hymnalId: number,
  number: string
): {
  id: number
  hymnal_id: number
  hymnal_code: string
  hymnal_name: string
  hymnal_is_official: number
  number: string
  title: string
  lyrics_raw: string
  author: string
  composer: string
  key_note: string
  time_signature: string
  category: string
  tags: string
} | null {
  const normalizedNumber = normalizeSongNumber(String(number ?? ''))
  const row = db
    .prepare(
      `SELECT s.id, s.hymnal_id, h.code as hymnal_code, h.name as hymnal_name, h.is_official as hymnal_is_official,
              s.number, s.title, s.lyrics_raw, s.author, s.composer, s.key_note, s.time_signature, s.category, s.tags
       FROM songs s JOIN hymnals h ON s.hymnal_id = h.id
       WHERE s.hymnal_id = ? AND s.number = ?
       LIMIT 1`
    )
    .get(hymnalId, normalizedNumber) as
    | {
        id: number
        hymnal_id: number
        hymnal_code: string
        hymnal_name: string
        hymnal_is_official: number
        number: string
        title: string
        lyrics_raw: string
        author: string
        composer: string
        key_note: string
        time_signature: string
        category: string
        tags: string
      }
    | undefined
  return row ?? null
}

export function findSongsForConflictByTitle(
  hymnalId: number,
  title: string,
  limit: number = 10
): Array<{
  id: number
  hymnal_id: number
  hymnal_code: string
  hymnal_name: string
  hymnal_is_official: number
  number: string
  title: string
  lyrics_raw: string
  author: string
  composer: string
  key_note: string
  time_signature: string
  category: string
  tags: string
}> {
  const t = String(title ?? '').trim()
  if (!t) return []
  const q = `%${t.slice(0, 60)}%`
  const safeLimit = Math.max(1, Math.min(50, Math.floor(limit)))

  return db
    .prepare(
      `SELECT s.id, s.hymnal_id, h.code as hymnal_code, h.name as hymnal_name, h.is_official as hymnal_is_official,
              s.number, s.title, s.lyrics_raw, s.author, s.composer, s.key_note, s.time_signature, s.category, s.tags
       FROM songs s JOIN hymnals h ON s.hymnal_id = h.id
       WHERE s.hymnal_id = ? AND s.title LIKE ?
       ORDER BY CAST(s.number AS INTEGER), s.number
       LIMIT ?`
    )
    .all(hymnalId, q, safeLimit) as Array<{
    id: number
    hymnal_id: number
    hymnal_code: string
    hymnal_name: string
    hymnal_is_official: number
    number: string
    title: string
    lyrics_raw: string
    author: string
    composer: string
    key_note: string
    time_signature: string
    category: string
    tags: string
  }>
}

function normalizeSongNumber(input: string): string {
  const raw = String(input ?? '').trim()
  if (raw === '') return raw
  // Only strip leading zeros for digit-only strings to preserve values like "100A"
  if (/^[0-9]+$/.test(raw)) {
    const trimmed = raw.replace(/^0+/, '')
    return trimmed === '' ? '0' : trimmed
  }
  return raw
}

export function filterAllowedUpdateEntries(
  updates: Record<string, unknown>,
  allowedKeys: ReadonlySet<string>,
  errorMessage: string
): Array<[string, unknown]> {
  const safeEntries = Object.entries(updates).filter(([key]) => allowedKeys.has(key))
  if (safeEntries.length === 0) {
    throw new Error(errorMessage)
  }
  return safeEntries
}

// ============================================================================
// JSON Import Functions
// ============================================================================

export type JsonImportConflictPolicy = 'skip' | 'overwrite' | 'append'

export interface JsonSongImportItem {
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
  time_signature?: string
  tempo?: string | number
  tags?: string
  theme?: string
  scripture_reference?: string
}

export interface ImportSongsFromJsonRequest {
  items: JsonSongImportItem[]
  defaultHymnalId?: number | null
  hymnalIdRemap?: Record<number, number>
  conflictPolicy?: JsonImportConflictPolicy
  perItemPolicy?: Record<string, JsonImportConflictPolicy>
  dryRun?: boolean
}

export interface ImportSongsFromJsonResult {
  total: number
  validated: number
  conflicts: number
  inserted: number
  skipped: number
  updated_overwrite: number
  updated_append: number
  failed: number
  unknownHymnalIds: number[]
  errors: Array<{ index: number; message: string }>
}

function rebuildSongsFts(): void {
  try {
    db.exec(`INSERT INTO songs_fts(songs_fts) VALUES('rebuild');`)
  } catch {
    // ignore (FTS5 might not be available)
  }
}

function getExistingHymnalIdSet(): Set<number> {
  const rows = db.prepare('SELECT id FROM hymnals').all() as Array<{ id: number }>
  return new Set(rows.map((r) => r.id))
}

function resolveHymnalId(
  input: number | undefined,
  defaultHymnalId: number | null | undefined,
  hymnalIdRemap: Record<number, number> | undefined,
  existingHymnalIds: Set<number>
): { hymnalId: number | null; unknownHymnalId: number | null } {
  const base = input ?? defaultHymnalId ?? undefined
  if (base === undefined) return { hymnalId: null, unknownHymnalId: null }

  const remapped = hymnalIdRemap?.[base] ?? base
  if (!existingHymnalIds.has(remapped)) {
    return { hymnalId: null, unknownHymnalId: base }
  }
  return { hymnalId: remapped, unknownHymnalId: null }
}

function buildConflictKey(hymnalId: number, normalizedNumber: string): string {
  return `${hymnalId}:${normalizedNumber}`
}

export function importSongsFromJson(
  request: ImportSongsFromJsonRequest
): ImportSongsFromJsonResult {
  const items = Array.isArray(request.items) ? request.items : []
  const total = items.length
  const dryRun = request.dryRun === true

  // Guard: coarse payload size check (defense-in-depth; renderer also checks file size)
  try {
    const approxBytes = Buffer.byteLength(JSON.stringify(items), 'utf8')
    const MAX_BYTES = 10 * 1024 * 1024
    if (approxBytes > MAX_BYTES) {
      throw new Error('Payload terlalu besar. Maksimum 10MB.')
    }
  } catch (e) {
    if (e instanceof Error) throw e
    throw new Error('Payload invalid.')
  }

  const result: ImportSongsFromJsonResult = {
    total,
    validated: 0,
    conflicts: 0,
    inserted: 0,
    skipped: 0,
    updated_overwrite: 0,
    updated_append: 0,
    failed: 0,
    unknownHymnalIds: [],
    errors: []
  }

  if (total === 0) return result

  const existingHymnalIds = getExistingHymnalIdSet()
  const conflictPolicy: JsonImportConflictPolicy = request.conflictPolicy ?? 'skip'
  const perItemPolicy = request.perItemPolicy ?? {}
  const hymnalIdRemap = request.hymnalIdRemap
  const defaultHymnalId = request.defaultHymnalId ?? null

  const selectExisting = db.prepare(
    'SELECT id, lyrics_raw FROM songs WHERE hymnal_id = ? AND number = ? LIMIT 1'
  )
  const insertSong = db.prepare(
    `INSERT INTO songs (
      hymnal_id, number, title, alternate_title, lyrics_raw,
      category, language, author, composer, key_note, time_signature, tempo, tags,
      theme, scripture_reference
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
  const updateOverwrite = db.prepare(
    `UPDATE songs SET
      title = ?,
      alternate_title = ?,
      lyrics_raw = ?,
      category = ?,
      language = ?,
      author = ?,
      composer = ?,
      key_note = ?,
      time_signature = ?,
      tempo = ?,
      tags = ?,
      theme = ?,
      scripture_reference = ?,
      updated_at = datetime('now')
    WHERE id = ?`
  )
  const updateAppendLyrics = db.prepare(
    `UPDATE songs SET
      lyrics_raw = ?,
      updated_at = datetime('now')
    WHERE id = ?`
  )

  const unknownHymnals = new Set<number>()

  const process = (): void => {
    for (let index = 0; index < items.length; index++) {
      const item = items[index]

      try {
        const numberRaw = String(item.number ?? '').trim()
        const titleRaw = String(item.title ?? '').trim()
        const lyricsRaw = String(item.lyrics_raw ?? '')

        if (!numberRaw || !titleRaw || !lyricsRaw) {
          throw new Error('Missing required fields: number, title, lyrics_raw')
        }

        const normalizedNumber = normalizeSongNumber(numberRaw)

        const { hymnalId, unknownHymnalId } = resolveHymnalId(
          item.hymnal_id,
          defaultHymnalId,
          hymnalIdRemap,
          existingHymnalIds
        )

        if (unknownHymnalId !== null) {
          unknownHymnals.add(unknownHymnalId)
          throw new Error(`Foreign key violation: hymnal_id ${unknownHymnalId} tidak ditemukan.`)
        }
        if (hymnalId === null) {
          throw new Error('hymnal_id tidak ditemukan dan default hymnal belum dipilih.')
        }

        result.validated++

        const conflictKey = buildConflictKey(hymnalId, normalizedNumber)
        const policy = perItemPolicy[conflictKey] ?? conflictPolicy

        const existing = selectExisting.get(hymnalId, normalizedNumber) as
          | { id: number; lyrics_raw: string }
          | undefined

        if (!existing) {
          if (!dryRun) {
            insertSong.run(
              hymnalId,
              normalizedNumber,
              titleRaw,
              String(item.alternate_title ?? ''),
              lyricsRaw,
              String(item.category ?? ''),
              String(item.language ?? 'Indonesia'),
              String(item.author ?? ''),
              String(item.composer ?? ''),
              String(item.key_note ?? ''),
              String(item.time_signature ?? ''),
              String(item.tempo ?? ''),
              String(item.tags ?? ''),
              String(item.theme ?? ''),
              String(item.scripture_reference ?? '')
            )
          }
          result.inserted++
          continue
        }

        result.conflicts++

        if (policy === 'skip') {
          result.skipped++
          continue
        }

        if (policy === 'overwrite') {
          if (!dryRun) {
            updateOverwrite.run(
              titleRaw,
              String(item.alternate_title ?? ''),
              lyricsRaw,
              String(item.category ?? ''),
              String(item.language ?? 'Indonesia'),
              String(item.author ?? ''),
              String(item.composer ?? ''),
              String(item.key_note ?? ''),
              String(item.time_signature ?? ''),
              String(item.tempo ?? ''),
              String(item.tags ?? ''),
              String(item.theme ?? ''),
              String(item.scripture_reference ?? ''),
              existing.id
            )
          }
          result.updated_overwrite++
          continue
        }

        if (policy === 'append') {
          if (!dryRun) {
            const existingLyrics = String(existing.lyrics_raw ?? '')
            const sep = existingLyrics.trim().length > 0 ? '\n\n' : ''
            const merged = existingLyrics + sep + lyricsRaw
            updateAppendLyrics.run(merged, existing.id)
          }
          result.updated_append++
          continue
        }

        result.skipped++
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        if (result.errors.length < 50) result.errors.push({ index, message })
        result.failed++
      }
    }
  }

  if (dryRun) {
    process()
    result.unknownHymnalIds = Array.from(unknownHymnals)
    try {
      saveAppState(
        'last_json_import_report',
        JSON.stringify({ ...result, dryRun: true, generatedAt: new Date().toISOString() })
      )
    } catch {
      // ignore
    }
    return result
  }

  const tx = db.transaction(() => {
    checkpointWal('FULL')
    process()
    result.unknownHymnalIds = Array.from(unknownHymnals)
    checkpointWal('FULL')
  })

  tx()

  // FTS rebuild is required after bulk operations to guarantee search consistency.
  rebuildSongsFts()

  try {
    saveAppState(
      'last_json_import_report',
      JSON.stringify({ ...result, dryRun: false, generatedAt: new Date().toISOString() })
    )
  } catch {
    // ignore
  }

  return result
}

export function initDatabase(): void {
  const dbPath = join(app.getPath('userData'), 'sion.db')
  const resourcesPath = join(__dirname, '../../resources/sion.db')

  // Copy default database from resources if it doesn't exist
  if (!existsSync(dbPath) && existsSync(resourcesPath)) {
    console.info('Copying default database from resources...')
    try {
      // Ensure userData directory exists
      const userDataDir = app.getPath('userData')
      if (!existsSync(userDataDir)) {
        mkdirSync(userDataDir, { recursive: true })
      }
      copyFileSync(resourcesPath, dbPath)
      console.info('Default database copied successfully')
    } catch (error) {
      console.error('Failed to copy default database:', error)
      // Continue with normal initialization if copy fails
    }
  }

  // Legacy schema detection: check BEFORE opening the main connection so that
  // `db` is assigned exactly once and never reassigned after IPC handlers are
  // registered. This eliminates the race window that existed when we closed and
  // reopened `db` mid-startup on slower machines.
  // INVARIANT: `db` is assigned exactly once in this function.
  let needsLegacyMigration = false
  if (existsSync(dbPath)) {
    try {
      const probe = new Database(dbPath, { readonly: true })
      const hymnalTableExists = probe
        .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='hymnals'")
        .get()
      probe.close()
      if (!hymnalTableExists) {
        needsLegacyMigration = true
      }
    } catch {
      // If probe fails, proceed with normal init — migrations will handle schema
    }
  }

  if (needsLegacyMigration) {
    console.info('Old schema detected. Backing up legacy DB for Multi-Hymnal revamp...')
    try {
      const ts = new Date().toISOString().replace(/[:.]/g, '-')
      const legacyBase = `${dbPath}.legacy-backup-${ts}`
      for (const suffix of ['', '-wal', '-shm']) {
        const from = `${dbPath}${suffix}`
        if (!existsSync(from)) continue
        const to = `${legacyBase}${suffix}`
        try {
          renameSync(from, to)
        } catch (e) {
          console.warn(`Legacy DB backup move failed for ${suffix}; attempting copy+unlink`, e)
          try {
            copyFileSync(from, to)
            unlinkSync(from)
          } catch (e2) {
            console.error(`Legacy DB backup failed for ${suffix}`, e2)
          }
        }
      }
    } catch (e) {
      console.error('Failed to backup legacy database:', e)
    }
  }

  // Single assignment — `db` is set here and never reassigned.
  db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  // Run migrations (non-destructive schema updates)
  runMigrations(db)

  // Inject DB into content pack registry
  setRegistryDb(db)

  // Scan and register any bundled content packs (e.g., Bible)
  try {
    autoRegisterBundledPacks()
  } catch (err) {
    console.error('Failed to auto-register bundled packs:', err)
  }

  // Seed database if empty (only if no songs exist)
  seedDatabase()
}

function seedDatabase(): void {
  const count = db.prepare('SELECT COUNT(*) as c FROM songs').get() as { c: number }
  if (count.c > 0) return // Already seeded or has data

  console.info('Seeding Multi-Hymnal database...')

  // Insert default hymnal: Lagu Sion Edisi Lengkap
  const hymnalResult = db
    .prepare(
      `INSERT OR IGNORE INTO hymnals (code, name, language, region, publisher, is_official)
     VALUES ('LS', 'Lagu Sion Edisi Lengkap', 'Indonesia', 'Indonesia', 'GMAHK', 1)`
    )
    .run()
  const existingHymnal = db.prepare("SELECT id FROM hymnals WHERE code = 'LS'").get() as {
    id: number
  }
  const lsId = hymnalResult.lastInsertRowid || existingHymnal.id

  const insert = db.prepare(`
    INSERT INTO songs (hymnal_id, number, title, alternate_title, language, lyrics_raw)
    VALUES (?, ?, ?, ?, ?, '')
  `)

  const transaction = db.transaction((songs) => {
    for (const song of songs) {
      insert.run(
        lsId,
        normalizeSongNumber(song.song_number),
        song.title,
        song.title_en || '',
        song.language
      )
    }
  })

  transaction(initialSongs)
  console.info(`Seeded ${initialSongs.length} songs under hymnal LS (id=${lsId}).`)
}

export function reseedDatabase(): void {
  console.info('Reseeding Multi-Hymnal database...')
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
        insert.run(
          lsId,
          normalizeSongNumber(song.song_number),
          song.title,
          song.title_en || '',
          song.language
        )
      }
    })()

    // 6. Re-run migrations to recreate FTS table and triggers
    runMigrations(db)

    checkpointWal('TRUNCATE')

    console.info('Reseed complete.')
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
  checkpointWal()
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
  checkpointWal()
  return db.prepare('SELECT * FROM hymnals WHERE id = ?').get(id)
}

export function deleteHymnal(id: number): boolean {
  const result = db.prepare('DELETE FROM hymnals WHERE id = ?').run(id)
  if (result.changes > 0) checkpointWal()
  return result.changes > 0
}

// ========== Song Operations (Multi-Hymnal) ==========

export function checkMultiHymnalIntegrity(hymnalId?: number): {
  generatedAt: string
  totalHymnals: number
  totalSongs: number
  orphanSongs: number
  orphanSample: Array<{ id: number; number: string | null; title: string | null }>
  hymnals: Array<{
    hymnal_id: number
    hymnal_code: string
    hymnal_name: string
    song_count: number
    duplicate_numbers: number
    duplicate_titles: number
    topDupeNumbers: Array<{
      number: string
      count: number
      samples: Array<{ id: number; title: string | null }>
    }>
    topDupeTitles: Array<{
      title: string
      count: number
      samples: Array<{ id: number; number: string | null }>
    }>
  }>
} {
  const generatedAt = new Date().toISOString()

  const totalHymnalsRow = db.prepare('SELECT COUNT(*) as c FROM hymnals').get() as { c: number }
  const totalSongsRow = db
    .prepare(
      hymnalId
        ? 'SELECT COUNT(*) as c FROM songs WHERE hymnal_id = ?'
        : 'SELECT COUNT(*) as c FROM songs'
    )
    .get(hymnalId ?? undefined) as { c: number }

  const orphanSongsRow = db
    .prepare(
      `SELECT COUNT(*) as c
       FROM songs s
       LEFT JOIN hymnals h ON s.hymnal_id = h.id
       WHERE h.id IS NULL ${hymnalId ? 'AND s.hymnal_id = ?' : ''}`
    )
    .get(hymnalId ?? undefined) as { c: number }

  const orphanSample = db
    .prepare(
      `SELECT id, number, title FROM songs
       WHERE hymnal_id NOT IN (SELECT id FROM hymnals) ${hymnalId ? 'AND hymnal_id = ?' : ''}
       LIMIT 10`
    )
    .all(hymnalId ?? undefined) as Array<{
    id: number
    number: string | null
    title: string | null
  }>

  const hymnalsRaw = db
    .prepare(
      `SELECT h.id as hymnal_id, h.code as hymnal_code, h.name as hymnal_name,
              (SELECT COUNT(*) FROM songs s WHERE s.hymnal_id = h.id) as song_count,
              (
                SELECT COUNT(*) FROM (
                  SELECT s.number
                  FROM songs s
                  WHERE s.hymnal_id = h.id AND s.number IS NOT NULL AND TRIM(s.number) <> ''
                  GROUP BY s.number
                  HAVING COUNT(*) > 1
                )
              ) as duplicate_numbers,
              (
                SELECT COUNT(*) FROM (
                  SELECT s.title
                  FROM songs s
                  WHERE s.hymnal_id = h.id AND s.title IS NOT NULL AND TRIM(s.title) <> ''
                  GROUP BY s.title
                  HAVING COUNT(*) > 1
                )
              ) as duplicate_titles
       FROM hymnals h
       ${hymnalId ? 'WHERE h.id = ?' : ''}
       ORDER BY h.is_official DESC, h.code ASC`
    )
    .all(hymnalId ?? undefined) as Array<{
    hymnal_id: number
    hymnal_code: string
    hymnal_name: string
    song_count: number
    duplicate_numbers: number
    duplicate_titles: number
  }>

  const hymnals = hymnalsRaw.map((h) => {
    // Top duplicate numbers with samples
    const dupeNumbers = db
      .prepare(
        `SELECT number, COUNT(*) as cnt
         FROM songs
         WHERE hymnal_id = ? AND number IS NOT NULL AND TRIM(number) <> ''
         GROUP BY number
         HAVING cnt > 1
         ORDER BY cnt DESC
         LIMIT 5`
      )
      .all(h.hymnal_id) as Array<{ number: string; cnt: number }>

    const topDupeNumbers = dupeNumbers.map((dn) => {
      const samples = db
        .prepare(`SELECT id, title FROM songs WHERE hymnal_id = ? AND number = ? LIMIT 3`)
        .all(h.hymnal_id, dn.number) as Array<{ id: number; title: string | null }>
      return { number: dn.number, count: dn.cnt, samples }
    })

    // Top duplicate titles with samples
    const dupeTitles = db
      .prepare(
        `SELECT title, COUNT(*) as cnt
         FROM songs
         WHERE hymnal_id = ? AND title IS NOT NULL AND TRIM(title) <> ''
         GROUP BY title
         HAVING cnt > 1
         ORDER BY cnt DESC
         LIMIT 5`
      )
      .all(h.hymnal_id) as Array<{ title: string; cnt: number }>

    const topDupeTitles = dupeTitles.map((dt) => {
      const samples = db
        .prepare(`SELECT id, number FROM songs WHERE hymnal_id = ? AND title = ? LIMIT 3`)
        .all(h.hymnal_id, dt.title) as Array<{ id: number; number: string | null }>
      return { title: dt.title, count: dt.cnt, samples }
    })

    return { ...h, topDupeNumbers, topDupeTitles }
  })

  return {
    generatedAt,
    totalHymnals: hymnalId ? 1 : totalHymnalsRow.c,
    totalSongs: totalSongsRow.c,
    orphanSongs: orphanSongsRow.c,
    orphanSample,
    hymnals
  }
}

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

export function searchSongs(
  query: string,
  hymnalId?: number,
  options?: { offset?: number; limit?: number }
): unknown[] {
  if (!query.trim()) return getSongs(hymnalId)

  const MAX_QUERY_LENGTH = 80
  const DEFAULT_LIMIT = 120
  const MAX_LIMIT = 500
  const offset = Math.max(0, options?.offset ?? 0)
  const limit = Math.min(MAX_LIMIT, options?.limit ?? DEFAULT_LIMIT)
  const rawQuery = query.slice(0, MAX_QUERY_LENGTH)

  const normalizeQuery = (q: string): string => {
    let out = ''
    for (let i = 0; i < q.length; i++) {
      const code = q.charCodeAt(i)
      out += code < 32 || code === 127 ? ' ' : q[i]
    }
    return out.replace(/\s+/g, ' ').trim()
  }

  const sanitizeFtsTerm = (term: string): string => {
    // Remove characters that can break FTS5 syntax or be used as operators.
    // Keep letters/numbers (Unicode letters are not fully supported here; this is a safe baseline).
    return term
      .replace(/["'`]/g, '')
      .replace(/[*:^()[\]{}!?~+\-=|&<>]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  }

  const isNumericQuery = (q: string): boolean => /^\d{1,6}$/.test(q)

  const normalized = normalizeQuery(rawQuery)
  const numericExact = isNumericQuery(normalized) ? normalized : null

  const buildFtsQuery = (q: string): string | null => {
    const cleaned = normalizeQuery(q)
    if (!cleaned) return null

    const parts = cleaned.split(' ').map(sanitizeFtsTerm).filter(Boolean)
    if (parts.length === 0) return null

    // Use AND across tokens; within a token search across prioritized columns.
    // Prefix search (*) to keep results responsive for partial terms.
    return parts
      .map((t) => {
        const token = t.includes(' ') ? `"${t}"` : t
        const prefix = `${token}*`
        return `(
          number:${prefix}
          OR title:${prefix}
          OR alternate_title:${prefix}
          OR lyrics_raw:${prefix}
          OR tags:${prefix}
          OR category:${prefix}
        )`
      })
      .join(' AND ')
  }

  // Try FTS5 first
  try {
    const ftsQuery = buildFtsQuery(normalized)
    if (!ftsQuery) return getSongs(hymnalId)

    // Ranking:
    // - numericExact (song number) gets priority
    // - bm25 with per-column weights (lower is more important)
    let sql = `SELECT s.*, h.code as hymnal_code, h.name as hymnal_name,
                 CASE WHEN ? IS NOT NULL AND s.number = ? THEN 0 ELSE 1 END AS number_exact_rank,
                 bm25(f, 0.8, 1.0, 1.2, 2.8, 3.2, 3.2) AS fts_rank
               FROM songs s
               JOIN songs_fts f ON s.id = f.rowid
               JOIN hymnals h ON s.hymnal_id = h.id
               WHERE f MATCH ?`
    const params: unknown[] = [numericExact, numericExact, ftsQuery]

    if (hymnalId) {
      sql += ` AND s.hymnal_id = ?`
      params.push(hymnalId)
    }

    sql += ` ORDER BY number_exact_rank ASC, fts_rank ASC, h.code ASC, CAST(s.number AS INTEGER), s.number LIMIT ? OFFSET ?`
    params.push(limit, offset)

    const results = db.prepare(sql).all(...params)
    if (results.length > 0) return results
  } catch {
    // FTS fallback
  }

  // Fallback to LIKE (safe, but slower; keep strict limit)
  const q = `%${normalized}%`
  let sql = `SELECT s.*, h.code as hymnal_code, h.name as hymnal_name
             FROM songs s JOIN hymnals h ON s.hymnal_id = h.id
             WHERE (s.number LIKE ? OR s.title LIKE ? OR s.alternate_title LIKE ? OR s.lyrics_raw LIKE ? OR s.tags LIKE ?)`
  const params: unknown[] = [q, q, q, q, q]

  if (hymnalId) {
    sql += ` AND s.hymnal_id = ?`
    params.push(hymnalId)
  }

  sql += ` ORDER BY h.code, CAST(s.number AS INTEGER), s.number LIMIT ? OFFSET ?`
  params.push(limit, offset)
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
  time_signature?: string
  tempo?: string
  tags?: string
  theme?: string
  scripture_reference?: string
  song_background_config?: string
}): unknown {
  const normalizedSong = {
    ...song,
    number: normalizeSongNumber(song.number)
  }

  // Check for duplicates within the same hymnal
  const duplicate = db
    .prepare('SELECT id FROM songs WHERE hymnal_id = ? AND (number = ? OR title = ?)')
    .get(normalizedSong.hymnal_id, normalizedSong.number, normalizedSong.title)
  if (duplicate) {
    throw new Error('Nomor lagu atau judul sudah ada dalam hymnal ini.')
  }

  const result = db
    .prepare(
      `INSERT INTO songs (
        hymnal_id, number, title, alternate_title, lyrics_raw, category, language, author,
        composer, key_note, time_signature, tempo, tags, theme, scripture_reference,
        song_background_config
      )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      normalizedSong.hymnal_id,
      normalizedSong.number,
      normalizedSong.title,
      normalizedSong.alternate_title || '',
      normalizedSong.lyrics_raw,
      normalizedSong.category || '',
      normalizedSong.language || 'Indonesia',
      normalizedSong.author || '',
      normalizedSong.composer || '',
      normalizedSong.key_note || '',
      normalizedSong.time_signature || '',
      normalizedSong.tempo || '',
      normalizedSong.tags || '',
      normalizedSong.theme || '',
      normalizedSong.scripture_reference || '',
      normalizedSong.song_background_config || ''
    )
  checkpointWal()
  return { id: result.lastInsertRowid, ...normalizedSong }
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
    time_signature?: string
    tempo?: string
    tags?: string
    theme?: string
    scripture_reference?: string
    song_background_config?: string
  }
): unknown {
  const existing = db.prepare('SELECT * FROM songs WHERE id = ?').get(id) as Record<string, unknown>
  if (!existing) return null

  const normalizedNumber =
    song.number !== undefined ? normalizeSongNumber(song.number) : (existing.number as string)

  db.prepare(
    `UPDATE songs SET
      hymnal_id = ?, number = ?, title = ?, alternate_title = ?, lyrics_raw = ?, category = ?,
      language = ?, author = ?, composer = ?, key_note = ?, time_signature = ?, tempo = ?, tags = ?,
      theme = ?, scripture_reference = ?, song_background_config = ?, updated_at = datetime('now')
    WHERE id = ?`
  ).run(
    song.hymnal_id ?? existing.hymnal_id,
    normalizedNumber,
    song.title ?? existing.title,
    song.alternate_title ?? existing.alternate_title,
    song.lyrics_raw ?? existing.lyrics_raw,
    song.category ?? existing.category,
    song.language ?? existing.language,
    song.author ?? existing.author,
    song.composer ?? existing.composer,
    song.key_note ?? existing.key_note,
    song.time_signature ?? existing.time_signature,
    song.tempo ?? existing.tempo,
    song.tags ?? existing.tags,
    song.theme ?? existing.theme,
    song.scripture_reference ?? existing.scripture_reference,
    song.song_background_config ?? existing.song_background_config,
    id
  )
  checkpointWal()
  return db.prepare('SELECT * FROM songs WHERE id = ?').get(id)
}

export function deleteSong(id: number): boolean {
  const result = db.prepare('DELETE FROM songs WHERE id = ?').run(id)
  if (result.changes > 0) checkpointWal()
  return result.changes > 0
}

export function clearLyrics(hymnalId: number, songNumbers: string[]): number {
  const placeholders = songNumbers.map(() => '?').join(',')
  const sql = `UPDATE songs SET lyrics_raw = '', updated_at = datetime('now') WHERE hymnal_id = ? AND number IN (${placeholders})`
  const result = db.prepare(sql).run(hymnalId, ...songNumbers)
  if (result.changes > 0) checkpointWal()
  return result.changes
}

export function bulkAssignSongBackground(payload: {
  songIds: number[]
  songBackgroundConfig: string
  assetId?: string
}): number {
  const songIds = payload.songIds.filter(
    (item): item is number => Number.isInteger(item) && item > 0
  )
  if (songIds.length === 0) return 0

  const updateSongBackground = db.prepare(
    `UPDATE songs
     SET song_background_config = ?, updated_at = datetime('now')
     WHERE id = ?`
  )
  const incrementAssetUsage = payload.assetId
    ? db.prepare(
        `UPDATE media_assets
         SET usage_count = usage_count + ?, updated_at = datetime('now')
         WHERE id = ?`
      )
    : null

  let changed = 0
  const transaction = db.transaction(() => {
    for (const songId of songIds) {
      const result = updateSongBackground.run(payload.songBackgroundConfig, songId)
      changed += result.changes
    }
    if (incrementAssetUsage && changed > 0) {
      incrementAssetUsage.run(changed, payload.assetId)
    }
  })

  transaction()
  if (changed > 0) checkpointWal()
  return changed
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
  checkpointWal()
  return { id: result.lastInsertRowid, ...relation }
}

export function deleteSongRelation(id: number): boolean {
  const result = db.prepare('DELETE FROM song_relations WHERE id = ?').run(id)
  if (result.changes > 0) checkpointWal()
  return result.changes > 0
}

export function toggleFavorite(id: number): unknown {
  db.prepare(
    'UPDATE songs SET is_favorite = CASE WHEN is_favorite = 1 THEN 0 ELSE 1 END WHERE id = ?'
  ).run(id)
  checkpointWal()
  return db.prepare('SELECT * FROM songs WHERE id = ?').get(id)
}

export function getSongNote(songId: number): string {
  const row = db
    .prepare('SELECT note_text FROM song_notes WHERE song_id = ? LIMIT 1')
    .get(songId) as { note_text: string } | undefined
  return row?.note_text ?? ''
}

export function updateSongNote(songId: number, noteText: string): string {
  const existing = db.prepare('SELECT id FROM song_notes WHERE song_id = ? LIMIT 1').get(songId)
  if (existing) {
    db.prepare(
      "UPDATE song_notes SET note_text = ?, updated_at = datetime('now') WHERE song_id = ?"
    ).run(noteText, songId)
  } else {
    db.prepare('INSERT INTO song_notes (song_id, note_text) VALUES (?, ?)').run(songId, noteText)
  }
  checkpointWal()
  return noteText
}

// ========== Bible Notes & Highlights ==========

export function getBibleNote(
  bookCode: string,
  chapter: number,
  verse: number
): { note_text: string; highlight_color: string } {
  const row = db
    .prepare(
      'SELECT note_text, highlight_color FROM bible_notes WHERE book_code = ? AND chapter = ? AND verse = ? LIMIT 1'
    )
    .get(bookCode, chapter, verse) as { note_text: string; highlight_color: string } | undefined
  return { note_text: row?.note_text ?? '', highlight_color: row?.highlight_color ?? '' }
}

export function updateBibleNote(
  bookCode: string,
  chapter: number,
  verse: number,
  noteText: string,
  highlightColor: string
): void {
  const existing = db
    .prepare('SELECT id FROM bible_notes WHERE book_code = ? AND chapter = ? AND verse = ? LIMIT 1')
    .get(bookCode, chapter, verse)

  // If both note and highlight are empty, remove the row entirely
  if (!noteText && !highlightColor) {
    if (existing) {
      db.prepare('DELETE FROM bible_notes WHERE book_code = ? AND chapter = ? AND verse = ?').run(
        bookCode,
        chapter,
        verse
      )
    }
    checkpointWal()
    return
  }

  if (existing) {
    db.prepare(
      "UPDATE bible_notes SET note_text = ?, highlight_color = ?, updated_at = datetime('now') WHERE book_code = ? AND chapter = ? AND verse = ?"
    ).run(noteText, highlightColor, bookCode, chapter, verse)
  } else {
    db.prepare(
      'INSERT INTO bible_notes (book_code, chapter, verse, note_text, highlight_color) VALUES (?, ?, ?, ?, ?)'
    ).run(bookCode, chapter, verse, noteText, highlightColor)
  }
  checkpointWal()
}

export function getBibleNotesForChapter(
  bookCode: string,
  chapter: number
): Array<{ verse: number; note_text: string; highlight_color: string }> {
  return db
    .prepare(
      'SELECT verse, note_text, highlight_color FROM bible_notes WHERE book_code = ? AND chapter = ? ORDER BY verse'
    )
    .all(bookCode, chapter) as Array<{
    verse: number
    note_text: string
    highlight_color: string
  }>
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
  checkpointWal()
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
  checkpointWal()
  return db.prepare('SELECT * FROM playlists WHERE id = ?').get(id)
}

export function deletePlaylist(id: number): boolean {
  db.prepare('DELETE FROM playlist_items WHERE playlist_id = ?').run(id)
  const result = db.prepare('DELETE FROM playlists WHERE id = ?').run(id)
  if (result.changes > 0) checkpointWal()
  return result.changes > 0
}

export function getPlaylistItems(playlistId: number): unknown[] {
  return db
    .prepare(
      `SELECT pi.*,
              COALESCE(s.title, pi.title) AS title,
              s.number, s.alternate_title, s.lyrics_raw, s.category, s.key_note, s.time_signature, s.tempo,
              h.code as hymnal_code, h.name as hymnal_name
       FROM playlist_items pi
       LEFT JOIN songs s ON pi.song_id = s.id
       LEFT JOIN hymnals h ON s.hymnal_id = h.id
       WHERE pi.playlist_id = ?
       ORDER BY pi.sort_order`
    )
    .all(playlistId)
}

export function updatePlaylistItem(
  id: number,
  data: { section_label?: string; title?: string; notes?: string }
): void {
  const existing = db.prepare('SELECT * FROM playlist_items WHERE id = ?').get(id) as Record<
    string,
    unknown
  >
  if (!existing) return

  db.prepare(
    `UPDATE playlist_items
     SET section_label = ?, title = ?, notes = ?
     WHERE id = ?`
  ).run(
    data.section_label !== undefined ? data.section_label : existing.section_label,
    data.title !== undefined ? data.title : existing.title,
    data.notes !== undefined ? data.notes : existing.notes,
    id
  )
  checkpointWal()
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
      "INSERT INTO playlist_items (playlist_id, song_id, sort_order, section_label, item_type) VALUES (?, ?, ?, ?, 'song')"
    )
    .run(item.playlist_id, item.song_id, nextOrder, item.section_label || '')
  checkpointWal()
  return { id: result.lastInsertRowid, ...item, sort_order: nextOrder, item_type: 'song' }
}

export function addBibleToPlaylist(
  playlistId: number,
  bible: {
    bible_version_code: string
    bible_version_short_name: string
    bible_book_code: string
    bible_book_name: string
    bible_chapter: number
    bible_verse_start: number
    bible_verse_end: number
    bible_reference: string
    bible_text_json: string
    bible_copyright?: string
    notes?: string
  }
): unknown {
  const maxOrder = db
    .prepare('SELECT MAX(sort_order) as max_order FROM playlist_items WHERE playlist_id = ?')
    .get(playlistId) as { max_order: number | null }
  const nextOrder = (maxOrder?.max_order ?? -1) + 1

  const result = db
    .prepare(
      `INSERT INTO playlist_items (
        playlist_id, song_id, sort_order, item_type, title, notes,
        bible_version_code, bible_version_short_name, bible_book_code, bible_book_name,
        bible_chapter, bible_verse_start, bible_verse_end, bible_reference,
        bible_text_json, bible_copyright
      ) VALUES (?, NULL, ?, 'bible', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      playlistId,
      nextOrder,
      bible.bible_reference,
      bible.notes || '',
      bible.bible_version_code,
      bible.bible_version_short_name,
      bible.bible_book_code,
      bible.bible_book_name,
      bible.bible_chapter,
      bible.bible_verse_start,
      bible.bible_verse_end,
      bible.bible_reference,
      bible.bible_text_json,
      bible.bible_copyright || ''
    )
  checkpointWal()
  return {
    id: result.lastInsertRowid,
    playlist_id: playlistId,
    song_id: null,
    sort_order: nextOrder,
    section_label: '',
    item_type: 'bible',
    title: bible.bible_reference,
    notes: bible.notes || '',
    bible_version_code: bible.bible_version_code,
    bible_version_short_name: bible.bible_version_short_name,
    bible_book_code: bible.bible_book_code,
    bible_book_name: bible.bible_book_name,
    bible_chapter: bible.bible_chapter,
    bible_verse_start: bible.bible_verse_start,
    bible_verse_end: bible.bible_verse_end,
    bible_reference: bible.bible_reference,
    bible_text_json: bible.bible_text_json,
    bible_copyright: bible.bible_copyright || ''
  }
}

export function addInfoToPlaylist(
  playlistId: number,
  info: { title: string; body: string }
): unknown {
  const maxOrder = db
    .prepare('SELECT MAX(sort_order) as max_order FROM playlist_items WHERE playlist_id = ?')
    .get(playlistId) as { max_order: number | null }
  const nextOrder = (maxOrder?.max_order ?? -1) + 1
  const title = info.title.trim()
  const body = info.body.trim()

  const result = db
    .prepare(
      `INSERT INTO playlist_items (
        playlist_id, song_id, sort_order, section_label, item_type, title, notes
      ) VALUES (?, NULL, ?, '', 'info', ?, ?)`
    )
    .run(playlistId, nextOrder, title, body)
  checkpointWal()

  return {
    id: result.lastInsertRowid,
    playlist_id: playlistId,
    song_id: null,
    sort_order: nextOrder,
    section_label: '',
    item_type: 'info',
    title,
    notes: body
  }
}

export function deletePlaylistItem(id: number): boolean {
  const result = db.prepare('DELETE FROM playlist_items WHERE id = ?').run(id)
  if (result.changes > 0) checkpointWal()
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
  checkpointWal()
}

// ========== Media Assets ==========

type MediaAssetType = 'image' | 'video'

type MediaAssetRow = {
  id: string
  type: MediaAssetType
  name: string
  original_path: string
  local_path: string
  thumbnail_path: string
  category: string
  tags: string
  is_favorite: number
  usage_count: number
  created_at: string
  updated_at: string
}

type MediaCollectionRow = {
  id: string
  name: string
  description: string
  cover_asset_id: string
  created_at: string
  updated_at: string
  asset_count?: number
  cover_thumbnail_path?: string
}

function getMediaLibraryPaths(): {
  rootDir: string
  imageDir: string
  videoDir: string
  thumbnailDir: string
} {
  const rootDir = join(app.getPath('userData'), 'media-library')
  return {
    rootDir,
    imageDir: join(rootDir, 'images'),
    videoDir: join(rootDir, 'videos'),
    thumbnailDir: join(rootDir, 'thumbnails')
  }
}

function ensureMediaLibraryDirs(): ReturnType<typeof getMediaLibraryPaths> {
  const paths = getMediaLibraryPaths()
  for (const dir of [paths.rootDir, paths.imageDir, paths.videoDir, paths.thumbnailDir]) {
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  }
  return paths
}

function normalizeMediaAssetType(filePath: string): MediaAssetType {
  const ext = extname(filePath).toLowerCase()
  if (['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) return 'image'
  if (['.mp4', '.webm'].includes(ext)) return 'video'
  throw new Error(`Unsupported media format: ${ext || 'unknown'}`)
}

function sanitizeMediaName(input: string): string {
  return (
    input
      // eslint-disable-next-line no-control-regex
      .replace(/[<>:"/\\|?*\u0000-\u001F]/g, ' ') // NOSONAR
      .replace(/\s+/g, ' ')
      .trim()
  )
}

function buildVideoPlaceholderThumbnail(name: string): Electron.NativeImage {
  const safeName = sanitizeMediaName(name).slice(0, 42) || 'Video Asset'
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="480" height="270" viewBox="0 0 480 270">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#0f172a"/>
          <stop offset="100%" stop-color="#1e293b"/>
        </linearGradient>
      </defs>
      <rect width="480" height="270" rx="28" fill="url(#bg)"/>
      <circle cx="240" cy="120" r="54" fill="rgba(255,255,255,0.08)"/>
      <polygon points="228,92 228,148 274,120" fill="#f8fafc"/>
      <text x="240" y="198" text-anchor="middle" fill="#e2e8f0" font-family="Inter, Arial, sans-serif" font-size="22" font-weight="700">VIDEO BACKGROUND</text>
      <text x="240" y="228" text-anchor="middle" fill="#94a3b8" font-family="Inter, Arial, sans-serif" font-size="14">${safeName}</text>
    </svg>
  `
  return nativeImage.createFromDataURL(
    `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
  )
}

function writeThumbnail(
  localPath: string,
  thumbnailPath: string,
  type: MediaAssetType,
  name: string
): void {
  let image = nativeImage.createFromPath(localPath)
  if (type === 'video' || image.isEmpty()) {
    image = buildVideoPlaceholderThumbnail(name)
  }
  const thumbnail = image.resize({
    width: 480,
    height: 270,
    quality: 'good'
  })
  writeFileSync(thumbnailPath, thumbnail.toPNG())
}

function getCollectionIdsForAsset(assetId: string): string[] {
  return (
    db
      .prepare(
        'SELECT collection_id FROM media_collection_items WHERE asset_id = ? ORDER BY collection_id ASC'
      )
      .all(assetId) as Array<{ collection_id: string }>
  ).map((row) => row.collection_id)
}

function getAssetIdsForCollection(collectionId: string): string[] {
  return (
    db
      .prepare(
        `SELECT asset_id
         FROM media_collection_items
         WHERE collection_id = ?
         ORDER BY sort_order ASC, created_at ASC`
      )
      .all(collectionId) as Array<{ asset_id: string }>
  ).map((row) => row.asset_id)
}

function getNextCollectionSortOrder(collectionId: string): number {
  const row = db
    .prepare(
      'SELECT COALESCE(MAX(sort_order), -1) as max_sort_order FROM media_collection_items WHERE collection_id = ?'
    )
    .get(collectionId) as { max_sort_order: number } | undefined
  return (row?.max_sort_order ?? -1) + 1
}

function getMediaCollectionById(collectionId: string): unknown {
  const row = db
    .prepare(
      `SELECT mc.*, COUNT(mci.asset_id) as asset_count, cover.thumbnail_path as cover_thumbnail_path
       FROM media_collections mc
       LEFT JOIN media_collection_items mci ON mc.id = mci.collection_id
       LEFT JOIN media_assets cover ON mc.cover_asset_id = cover.id
       WHERE mc.id = ?
       GROUP BY mc.id`
    )
    .get(collectionId) as MediaCollectionRow | undefined
  return row ? mapMediaCollectionRow(row) : null
}

function buildAtmosphereWithoutMedia(config: AtmosphereConfigLike): AtmosphereConfigLike {
  const nextConfig: AtmosphereConfigLike = {
    ...config,
    media: undefined
  }

  if (nextConfig.mode === 'image' || nextConfig.mode === 'video') {
    if (Array.isArray(nextConfig.gradient?.stops) && nextConfig.gradient.stops.length > 0) {
      nextConfig.mode = 'gradient'
    } else if (nextConfig.motion) {
      nextConfig.mode = 'motion'
    } else {
      nextConfig.mode = 'solid'
      nextConfig.solidColor = nextConfig.solidColor || '#090b14'
    }
  }

  return nextConfig
}

type AtmosphereConfigLike = {
  mode?: string
  solidColor?: string
  gradient?: { stops?: unknown[] }
  motion?: unknown
  media?: { assetId?: string; path?: string }
}

function scrubAtmosphereMediaReference(raw: string, assetId: string, localPath: string): string {
  if (!raw) return raw
  try {
    const parsed = JSON.parse(raw) as AtmosphereConfigLike
    const media = parsed.media
    const matchesAsset =
      media?.assetId === assetId || (typeof media?.path === 'string' && media.path === localPath)
    if (!matchesAsset) return raw
    return JSON.stringify(buildAtmosphereWithoutMedia(parsed))
  } catch {
    return raw
  }
}

function mapMediaAssetRow(row: MediaAssetRow): {
  id: string
  type: MediaAssetType
  name: string
  originalPath: string
  localPath: string
  thumbnailPath?: string
  category?: string
  tags?: string[]
  isFavorite?: boolean
  usageCount?: number
  collectionIds?: string[]
  createdAt?: string
  updatedAt?: string
} {
  let tags: string[] = []
  try {
    const parsed = JSON.parse(row.tags) as unknown
    if (Array.isArray(parsed)) {
      tags = parsed.filter((item): item is string => typeof item === 'string')
    }
  } catch {
    tags = []
  }

  return {
    id: row.id,
    type: row.type,
    name: row.name,
    originalPath: row.original_path,
    localPath: row.local_path,
    thumbnailPath: row.thumbnail_path || undefined,
    category: row.category || undefined,
    tags,
    isFavorite: row.is_favorite === 1,
    usageCount: row.usage_count,
    collectionIds: getCollectionIdsForAsset(row.id),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

function mapMediaCollectionRow(row: MediaCollectionRow): {
  id: string
  name: string
  description?: string
  coverAssetId?: string
  coverThumbnailPath?: string
  assetCount: number
  assetIds: string[]
  createdAt?: string
  updatedAt?: string
} {
  return {
    id: row.id,
    name: row.name,
    description: row.description || undefined,
    coverAssetId: row.cover_asset_id || undefined,
    coverThumbnailPath: row.cover_thumbnail_path || undefined,
    assetCount: row.asset_count || 0,
    assetIds: getAssetIdsForCollection(row.id),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

export function getMediaAssets(filters?: {
  type?: MediaAssetType
  search?: string
  favoriteOnly?: boolean
  category?: string
  collectionId?: string
}): unknown[] {
  let sql = 'SELECT * FROM media_assets WHERE 1=1'
  const params: Array<string | number> = []

  if (filters?.type) {
    sql += ' AND type = ?'
    params.push(filters.type)
  }
  if (filters?.favoriteOnly) {
    sql += ' AND is_favorite = 1'
  }
  if (filters?.category) {
    sql += ' AND category = ?'
    params.push(filters.category)
  }
  if (filters?.search) {
    sql += ' AND (name LIKE ? OR category LIKE ? OR tags LIKE ?)'
    const like = `%${filters.search}%`
    params.push(like, like, like)
  }
  if (filters?.collectionId) {
    sql += ' AND id IN (SELECT asset_id FROM media_collection_items WHERE collection_id = ?)'
    params.push(filters.collectionId)
  }

  sql += ' ORDER BY is_favorite DESC, usage_count DESC, updated_at DESC'
  return (db.prepare(sql).all(...params) as MediaAssetRow[]).map(mapMediaAssetRow)
}

export function getMediaCollections(): unknown[] {
  return (
    db
      .prepare(
        `SELECT mc.*,
              COUNT(mci.asset_id) as asset_count,
              cover.thumbnail_path as cover_thumbnail_path
       FROM media_collections mc
       LEFT JOIN media_collection_items mci ON mc.id = mci.collection_id
       LEFT JOIN media_assets cover ON mc.cover_asset_id = cover.id
       GROUP BY mc.id
       ORDER BY mc.updated_at DESC, mc.name ASC`
      )
      .all() as MediaCollectionRow[]
  ).map(mapMediaCollectionRow)
}

export function addMediaCollection(payload: {
  name: string
  description?: string
  assetIds?: string[]
}): unknown {
  const name = String(payload.name || '').trim()
  if (!name) throw new Error('Collection name is required.')

  const id = randomUUID()
  const assetIds = Array.isArray(payload.assetIds)
    ? payload.assetIds.filter(
        (item): item is string => typeof item === 'string' && item.trim().length > 0
      )
    : []
  const coverAssetId = assetIds[0] || ''
  const insertCollection = db.prepare(
    `INSERT INTO media_collections (
      id, name, description, cover_asset_id, created_at, updated_at
    ) VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))`
  )
  const insertItem = db.prepare(
    `INSERT OR IGNORE INTO media_collection_items (collection_id, asset_id, sort_order, created_at)
     VALUES (?, ?, ?, datetime('now'))`
  )

  const transaction = db.transaction(() => {
    insertCollection.run(id, name, String(payload.description || '').trim(), coverAssetId)
    assetIds.forEach((assetId, index) => {
      insertItem.run(id, assetId, index)
    })
  })

  transaction()
  checkpointWal()
  return getMediaCollectionById(id)
}

export function updateMediaCollection(
  id: string,
  updates: { name?: string; description?: string; coverAssetId?: string }
): unknown {
  const existing = db.prepare('SELECT * FROM media_collections WHERE id = ?').get(id) as
    | MediaCollectionRow
    | undefined
  if (!existing) return null

  db.prepare(
    `UPDATE media_collections SET
      name = ?, description = ?, cover_asset_id = ?, updated_at = datetime('now')
     WHERE id = ?`
  ).run(
    updates.name?.trim() || existing.name,
    updates.description?.trim() ?? existing.description,
    updates.coverAssetId === undefined ? existing.cover_asset_id : updates.coverAssetId,
    id
  )
  checkpointWal()
  return getMediaCollectionById(id)
}

export function deleteMediaCollection(id: string): boolean {
  const result = db.prepare('DELETE FROM media_collections WHERE id = ?').run(id)
  if (result.changes > 0) checkpointWal()
  return result.changes > 0
}

export function addAssetsToMediaCollection(collectionId: string, assetIds: string[]): unknown {
  const insertItem = db.prepare(
    `INSERT OR IGNORE INTO media_collection_items (collection_id, asset_id, sort_order, created_at)
     VALUES (?, ?, ?, datetime('now'))`
  )
  const touchCollection = db.prepare(
    `UPDATE media_collections
     SET cover_asset_id = CASE
       WHEN (cover_asset_id IS NULL OR cover_asset_id = '') THEN ?
       ELSE cover_asset_id
     END,
     updated_at = datetime('now')
     WHERE id = ?`
  )
  const safeAssetIds = assetIds.filter((item) => typeof item === 'string' && item.trim().length > 0)
  const transaction = db.transaction(() => {
    let sortOrder = getNextCollectionSortOrder(collectionId)
    for (const assetId of safeAssetIds) {
      insertItem.run(collectionId, assetId, sortOrder)
      sortOrder += 1
    }
    touchCollection.run(safeAssetIds[0] || '', collectionId)
  })
  transaction()
  checkpointWal()
  return getMediaCollectionById(collectionId)
}

export function removeAssetsFromMediaCollection(collectionId: string, assetIds: string[]): unknown {
  const safeAssetIds = assetIds.filter((item) => typeof item === 'string' && item.trim().length > 0)
  const placeholders = safeAssetIds.map(() => '?').join(',')
  if (safeAssetIds.length === 0) return null

  const transaction = db.transaction(() => {
    db.prepare(
      `DELETE FROM media_collection_items
       WHERE collection_id = ? AND asset_id IN (${placeholders})`
    ).run(collectionId, ...safeAssetIds)

    const currentCover = db
      .prepare('SELECT cover_asset_id FROM media_collections WHERE id = ?')
      .get(collectionId) as { cover_asset_id: string } | undefined

    if (currentCover?.cover_asset_id && safeAssetIds.includes(currentCover.cover_asset_id)) {
      const nextCover = db
        .prepare(
          `SELECT asset_id
         FROM media_collection_items
         WHERE collection_id = ?
         ORDER BY created_at ASC
         LIMIT 1`
        )
        .get(collectionId) as { asset_id: string } | undefined
      db.prepare(
        `UPDATE media_collections
         SET cover_asset_id = ?, updated_at = datetime('now')
         WHERE id = ?`
      ).run(nextCover?.asset_id || '', collectionId)
    } else {
      db.prepare(`UPDATE media_collections SET updated_at = datetime('now') WHERE id = ?`).run(
        collectionId
      )
    }
  })

  transaction()
  checkpointWal()
  return getMediaCollectionById(collectionId)
}

export function reorderMediaCollectionItems(collectionId: string, assetIds: string[]): unknown {
  const safeAssetIds = assetIds.filter((item) => typeof item === 'string' && item.trim().length > 0)
  if (safeAssetIds.length === 0) return null

  const updateItem = db.prepare(
    `UPDATE media_collection_items
     SET sort_order = ?
     WHERE collection_id = ? AND asset_id = ?`
  )
  const touchCollection = db.prepare(
    `UPDATE media_collections SET updated_at = datetime('now') WHERE id = ?`
  )

  const transaction = db.transaction(() => {
    safeAssetIds.forEach((assetId, index) => {
      updateItem.run(index, collectionId, assetId)
    })
    touchCollection.run(collectionId)
  })

  transaction()
  checkpointWal()
  return getMediaCollectionById(collectionId)
}

export function bulkUpdateMediaAssets(
  ids: string[],
  updates: { category?: string; tags?: string[]; isFavorite?: boolean }
): number {
  const safeIds = ids.filter((item) => typeof item === 'string' && item.trim().length > 0)
  if (safeIds.length === 0) return 0

  const selectExisting = db
    .prepare('SELECT * FROM media_assets WHERE id = ?')
    .get.bind(db.prepare('SELECT * FROM media_assets WHERE id = ?')) as (
    id: string
  ) => MediaAssetRow | undefined
  const updateStmt = db.prepare(
    `UPDATE media_assets
     SET category = ?, tags = ?, is_favorite = ?, updated_at = datetime('now')
     WHERE id = ?`
  )

  let changed = 0
  const transaction = db.transaction(() => {
    for (const id of safeIds) {
      const existing = selectExisting(id)
      if (!existing) continue
      const result = updateStmt.run(
        updates.category?.trim() ?? existing.category,
        updates.tags ? JSON.stringify(updates.tags) : existing.tags,
        updates.isFavorite === undefined ? existing.is_favorite : updates.isFavorite ? 1 : 0,
        id
      )
      changed += result.changes
    }
  })
  transaction()
  if (changed > 0) checkpointWal()
  return changed
}

function cleanupMediaReferences(assetId: string, localPath: string): void {
  const settingsRow = db
    .prepare('SELECT value FROM settings WHERE key = ?')
    .get('projection_default_atmosphere') as { value: string } | undefined
  if (settingsRow?.value) {
    const nextValue = scrubAtmosphereMediaReference(settingsRow.value, assetId, localPath)
    if (nextValue !== settingsRow.value) {
      db.prepare('UPDATE settings SET value = ? WHERE key = ?').run(
        nextValue,
        'projection_default_atmosphere'
      )
    }
  }

  const legacyBgImage = db
    .prepare('SELECT value FROM settings WHERE key = ?')
    .get('projection_bg_image') as { value: string } | undefined
  if (legacyBgImage?.value === localPath) {
    db.prepare('UPDATE settings SET value = ? WHERE key = ?').run('', 'projection_bg_image')
  }

  const songs = db
    .prepare(
      "SELECT id, song_background_config FROM songs WHERE song_background_config IS NOT NULL AND TRIM(song_background_config) <> ''"
    )
    .all() as Array<{ id: number; song_background_config: string }>
  const updateSongConfig = db.prepare(
    `UPDATE songs SET song_background_config = ?, updated_at = datetime('now') WHERE id = ?`
  )
  for (const song of songs) {
    const nextConfig = scrubAtmosphereMediaReference(
      song.song_background_config,
      assetId,
      localPath
    )
    if (nextConfig !== song.song_background_config) {
      updateSongConfig.run(nextConfig, song.id)
    }
  }

  db.prepare(
    `UPDATE media_collections
     SET cover_asset_id = ''
     WHERE cover_asset_id = ?`
  ).run(assetId)
}

export function importMediaAssets(payload: {
  filePaths: string[]
  category?: string
  tags?: string[]
}): unknown[] {
  if (!Array.isArray(payload.filePaths) || payload.filePaths.length === 0) {
    throw new Error('No media files selected.')
  }

  const dirs = ensureMediaLibraryDirs()
  const selectExisting = db.prepare('SELECT * FROM media_assets WHERE original_path = ? LIMIT 1')
  const insertAsset = db.prepare(`
    INSERT INTO media_assets (
      id, type, name, original_path, local_path, thumbnail_path, category, tags,
      is_favorite, usage_count, metadata_json, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0, '{}', datetime('now'), datetime('now'))
  `)

  const imported: ReturnType<typeof mapMediaAssetRow>[] = []
  const tagsJson = JSON.stringify(payload.tags || [])
  const category = String(payload.category || '').trim()

  const transaction = db.transaction(() => {
    for (const rawPath of payload.filePaths) {
      if (typeof rawPath !== 'string' || !rawPath.trim()) continue
      if (!existsSync(rawPath)) throw new Error(`Media file not found: ${rawPath}`)

      const existing = selectExisting.get(rawPath) as MediaAssetRow | undefined
      if (existing) {
        imported.push(mapMediaAssetRow(existing))
        continue
      }

      const type = normalizeMediaAssetType(rawPath)
      const ext = extname(rawPath).toLowerCase()
      const id = randomUUID()
      const displayName = sanitizeMediaName(basename(rawPath, ext)) || `Asset ${id.slice(0, 8)}`
      const targetDir = type === 'image' ? dirs.imageDir : dirs.videoDir
      const localPath = join(targetDir, `${id}${ext}`)
      const thumbnailPath = join(dirs.thumbnailDir, `${id}.png`)

      copyFileSync(rawPath, localPath)
      writeThumbnail(localPath, thumbnailPath, type, displayName)

      insertAsset.run(id, type, displayName, rawPath, localPath, thumbnailPath, category, tagsJson)

      const inserted = db
        .prepare('SELECT * FROM media_assets WHERE id = ?')
        .get(id) as MediaAssetRow
      imported.push(mapMediaAssetRow(inserted))
    }
  })

  transaction()
  checkpointWal()
  return imported
}

export function updateMediaAsset(
  id: string,
  updates: { name?: string; category?: string; tags?: string[]; isFavorite?: boolean }
): unknown {
  const existing = db.prepare('SELECT * FROM media_assets WHERE id = ?').get(id) as
    | MediaAssetRow
    | undefined
  if (!existing) return null

  db.prepare(
    `UPDATE media_assets SET
      name = ?, category = ?, tags = ?, is_favorite = ?, updated_at = datetime('now')
    WHERE id = ?`
  ).run(
    updates.name?.trim() || existing.name,
    updates.category?.trim() ?? existing.category,
    updates.tags ? JSON.stringify(updates.tags) : existing.tags,
    updates.isFavorite === undefined ? existing.is_favorite : updates.isFavorite ? 1 : 0,
    id
  )
  checkpointWal()
  return mapMediaAssetRow(
    db.prepare('SELECT * FROM media_assets WHERE id = ?').get(id) as MediaAssetRow
  )
}

export function deleteMediaAsset(id: string): boolean {
  const existing = db.prepare('SELECT * FROM media_assets WHERE id = ?').get(id) as
    | MediaAssetRow
    | undefined
  if (!existing) return false

  cleanupMediaReferences(existing.id, existing.local_path)
  const result = db.prepare('DELETE FROM media_assets WHERE id = ?').run(id)
  if (result.changes > 0) {
    for (const filePath of [existing.local_path, existing.thumbnail_path]) {
      if (filePath && existsSync(filePath)) {
        try {
          unlinkSync(filePath)
        } catch {
          // ignore cleanup failures
        }
      }
    }
    checkpointWal()
  }
  return result.changes > 0
}

export function bulkDeleteMediaAssets(ids: string[]): number {
  const safeIds = ids.filter((item) => typeof item === 'string' && item.trim().length > 0)
  let deleted = 0
  for (const id of safeIds) {
    if (deleteMediaAsset(id)) deleted++
  }
  return deleted
}

export function incrementMediaAssetUsage(id: string): void {
  const result = db
    .prepare(
      `UPDATE media_assets SET
        usage_count = usage_count + 1,
        updated_at = datetime('now')
      WHERE id = ?`
    )
    .run(id)
  if (result.changes > 0) checkpointWal()
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
  checkpointWal()
}

// ========== History ==========

export function logSongHistory(songId: number): void {
  db.prepare('INSERT INTO song_history (song_id) VALUES (?)').run(songId)
  checkpointWal()
}

export function getRecentSongs(limit: number = 20, hymnalId?: number): unknown[] {
  const safeLimit = Math.min(200, Math.max(1, Math.trunc(limit)))
  const params: number[] = []
  let sql = `SELECT s.*, h.code as hymnal_code, h.name as hymnal_name, MAX(sh.played_at) as last_played
             FROM songs s
             JOIN song_history sh ON s.id = sh.song_id
             JOIN hymnals h ON s.hymnal_id = h.id`

  if (hymnalId && Number.isInteger(hymnalId)) {
    sql += ' WHERE s.hymnal_id = ?'
    params.push(hymnalId)
  }

  sql += ' GROUP BY s.id ORDER BY last_played DESC LIMIT ?'
  params.push(safeLimit)
  return db.prepare(sql).all(...params)
}

// ========== Crash Recovery (App State) ==========

export function saveAppState(key: string, value: string): void {
  db.prepare(
    `INSERT OR REPLACE INTO app_state (key, value, updated_at) VALUES (?, ?, datetime('now'))`
  ).run(key, value)
  checkpointWal()
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
  checkpointWal()
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

// ========== Bible Operations ==========

export function getBibleTranslations(): unknown[] {
  return db.prepare('SELECT * FROM bible_translations ORDER BY is_default DESC, name').all()
}

export function addBibleTranslation(translation: {
  code: string
  name: string
  language: string
  source?: string
  is_default?: number
}): Database.RunResult {
  const result = db
    .prepare(
      'INSERT INTO bible_translations (code, name, language, source, is_default) VALUES (?, ?, ?, ?, ?)'
    )
    .run(
      translation.code,
      translation.name,
      translation.language,
      translation.source || '',
      translation.is_default || 0
    )
  checkpointWal()
  return result
}

export function deleteBibleTranslation(id: number): Database.RunResult {
  const result = db.prepare('DELETE FROM bible_translations WHERE id = ?').run(id)
  if (result.changes > 0) checkpointWal()
  return result
}

export function getBibleBooks(translationId: number): unknown[] {
  return db
    .prepare('SELECT * FROM bible_books WHERE translation_id = ? ORDER BY book_number')
    .all(translationId)
}

export function addBibleBook(book: {
  translation_id: number
  book_number: number
  short_name: string
  long_name: string
  testament: string
  chapter_count: number
}): Database.RunResult {
  const result = db
    .prepare(
      'INSERT INTO bible_books (translation_id, book_number, short_name, long_name, testament, chapter_count) VALUES (?, ?, ?, ?, ?, ?)'
    )
    .run(
      book.translation_id,
      book.book_number,
      book.short_name,
      book.long_name,
      book.testament,
      book.chapter_count
    )
  checkpointWal()
  return result
}

export function getBibleVerses(translationId: number, bookId: number, chapter: number): unknown[] {
  return db
    .prepare(
      'SELECT * FROM bible_verses WHERE translation_id = ? AND book_id = ? AND chapter = ? ORDER BY verse'
    )
    .all(translationId, bookId, chapter)
}

export function getBibleVerseRange(
  translationId: number,
  bookId: number,
  chapter: number,
  verseStart: number,
  verseEnd: number
): unknown[] {
  return db
    .prepare(
      'SELECT * FROM bible_verses WHERE translation_id = ? AND book_id = ? AND chapter = ? AND verse >= ? AND verse <= ? ORDER BY verse'
    )
    .all(translationId, bookId, chapter, verseStart, verseEnd)
}

export function addBibleVerse(verse: {
  translation_id: number
  book_id: number
  chapter: number
  verse: number
  text: string
}): Database.RunResult {
  const result = db
    .prepare(
      'INSERT OR REPLACE INTO bible_verses (translation_id, book_id, chapter, verse, text) VALUES (?, ?, ?, ?, ?)'
    )
    .run(verse.translation_id, verse.book_id, verse.chapter, verse.verse, verse.text)
  checkpointWal()
  return result
}

export function addBibleVersesBatch(
  verses: Array<{
    translation_id: number
    book_id: number
    chapter: number
    verse: number
    text: string
  }>
): void {
  const insert = db.prepare(
    'INSERT OR REPLACE INTO bible_verses (translation_id, book_id, chapter, verse, text) VALUES (?, ?, ?, ?, ?)'
  )
  const transaction = db.transaction(() => {
    for (const verse of verses) {
      insert.run(verse.translation_id, verse.book_id, verse.chapter, verse.verse, verse.text)
    }
  })
  transaction()
  checkpointWal('TRUNCATE')
}

export function searchBibleVerses(query: string, translationId?: number): unknown[] {
  const searchQuery = query.trim()
  if (!searchQuery) return []

  let sql = `
    SELECT v.*, b.short_name as book_short, b.long_name as book_long, b.testament
    FROM bible_verses v
    JOIN bible_books b ON v.book_id = b.id
    JOIN bible_verses_fts f ON v.id = f.rowid
    WHERE f.text MATCH ?
  `
  const params: (string | number)[] = [searchQuery]

  if (translationId) {
    sql += ' AND v.translation_id = ?'
    params.push(translationId)
  }

  sql += ' ORDER BY b.book_number, v.chapter, v.verse LIMIT 100'

  return db.prepare(sql).all(...params)
}

// ========== Custom Slides Operations ==========

export function getCustomSlides(): unknown[] {
  return db.prepare('SELECT * FROM custom_slides ORDER BY sort_order, created_at DESC').all()
}

export function getSlidesByType(slideType: string): unknown[] {
  return db
    .prepare(
      'SELECT * FROM custom_slides WHERE slide_type = ? ORDER BY sort_order, created_at DESC'
    )
    .all(slideType)
}

export function addCustomSlide(slide: {
  title: string
  content: string
  slide_type?: string
  background_color?: string
  background_image?: string
  text_color?: string
  font_size?: number
  display_duration?: number
  is_active?: number
  sort_order?: number
}): Database.RunResult {
  const result = db
    .prepare(
      `INSERT INTO custom_slides (title, content, slide_type, background_color, background_image, text_color, font_size, display_duration, is_active, sort_order)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      slide.title,
      slide.content,
      slide.slide_type || 'announcement',
      slide.background_color || '#0f0f1a',
      slide.background_image || '',
      slide.text_color || '#ffffff',
      slide.font_size || 48,
      slide.display_duration || 5,
      slide.is_active ?? 1,
      slide.sort_order || 0
    )
  checkpointWal()
  return result
}

export function updateCustomSlide(
  id: number,
  updates: Record<string, unknown>
): Database.RunResult {
  const allowedKeys = new Set([
    'title',
    'content',
    'slide_type',
    'background_color',
    'background_image',
    'text_color',
    'font_size',
    'display_duration',
    'is_active',
    'sort_order'
  ])
  const safeEntries = filterAllowedUpdateEntries(
    updates,
    allowedKeys,
    'No valid fields to update for custom slide.'
  )
  const fields = safeEntries.map(([key]) => `${key} = ?`).join(', ')
  const values = [...safeEntries.map(([, value]) => value), id]
  const result = db
    .prepare(`UPDATE custom_slides SET ${fields}, updated_at = datetime('now') WHERE id = ?`)
    .run(...values)
  if (result.changes > 0) checkpointWal()
  return result
}

export function deleteCustomSlide(id: number): Database.RunResult {
  const result = db.prepare('DELETE FROM custom_slides WHERE id = ?').run(id)
  if (result.changes > 0) checkpointWal()
  return result
}

// ========== Slide Groups Operations ==========

export function getSlideGroups(): unknown[] {
  return db.prepare('SELECT * FROM slide_groups ORDER BY name').all()
}

export function addSlideGroup(group: {
  name: string
  description?: string
  loop_interval?: number
  is_active?: number
}): Database.RunResult {
  const result = db
    .prepare(
      'INSERT INTO slide_groups (name, description, loop_interval, is_active) VALUES (?, ?, ?, ?)'
    )
    .run(group.name, group.description || '', group.loop_interval || 10, group.is_active ?? 1)
  checkpointWal()
  return result
}

export function updateSlideGroup(id: number, updates: Record<string, unknown>): Database.RunResult {
  const allowedKeys = new Set(['name', 'description', 'loop_interval', 'is_active'])
  const safeEntries = filterAllowedUpdateEntries(
    updates,
    allowedKeys,
    'No valid fields to update for slide group.'
  )
  const fields = safeEntries.map(([key]) => `${key} = ?`).join(', ')
  const values = [...safeEntries.map(([, value]) => value), id]
  const result = db.prepare(`UPDATE slide_groups SET ${fields} WHERE id = ?`).run(...values)
  if (result.changes > 0) checkpointWal()
  return result
}

export function deleteSlideGroup(id: number): Database.RunResult {
  const result = db.prepare('DELETE FROM slide_groups WHERE id = ?').run(id)
  if (result.changes > 0) checkpointWal()
  return result
}

export function getGroupSlides(groupId: number): unknown[] {
  return db
    .prepare(
      `SELECT cs.*, sgi.sort_order as group_sort_order
       FROM custom_slides cs
       JOIN slide_group_items sgi ON cs.id = sgi.slide_id
       WHERE sgi.group_id = ?
       ORDER BY sgi.sort_order`
    )
    .all(groupId)
}

export function addSlideToGroup(
  groupId: number,
  slideId: number,
  sortOrder?: number
): Database.RunResult {
  const result = db
    .prepare(
      'INSERT OR IGNORE INTO slide_group_items (group_id, slide_id, sort_order) VALUES (?, ?, ?)'
    )
    .run(groupId, slideId, sortOrder || 0)
  if (result.changes > 0) checkpointWal()
  return result
}

export function removeSlideFromGroup(groupId: number, slideId: number): Database.RunResult {
  const result = db
    .prepare('DELETE FROM slide_group_items WHERE group_id = ? AND slide_id = ?')
    .run(groupId, slideId)
  if (result.changes > 0) checkpointWal()
  return result
}

export function reorderGroupSlides(
  groupId: number,
  items: Array<{ slide_id: number; sort_order: number }>
): void {
  const update = db.prepare(
    'UPDATE slide_group_items SET sort_order = ? WHERE group_id = ? AND slide_id = ?'
  )
  const transaction = db.transaction(() => {
    for (const item of items) {
      update.run(item.sort_order, groupId, item.slide_id)
    }
  })
  transaction()
  checkpointWal()
}

// ============================================================================
// Phase 1 — Enterprise Refactor Functions (additive only)
// @see implementation-master-order-v1.md §3.2 Sequence 1.4
// ============================================================================

/**
 * Lightweight song list query — excludes lyrics_raw for performance.
 * Intended for Library Mode grid/list views where lyrics are not displayed.
 */
export function getSongsSummary(hymnalId?: number): unknown[] {
  if (hymnalId !== undefined) {
    return db
      .prepare(
        `SELECT s.id, s.hymnal_id, h.code as hymnal_code, h.name as hymnal_name,
                s.number, s.title, s.alternate_title, s.category, s.language,
                s.author, s.composer, s.key_note, s.tempo, s.tags, s.theme,
                s.scripture_reference, s.is_favorite, s.song_background_config,
                s.created_at, s.updated_at
         FROM songs s
         JOIN hymnals h ON s.hymnal_id = h.id
         WHERE s.hymnal_id = ?
         ORDER BY CAST(s.number AS INTEGER), s.number`
      )
      .all(hymnalId)
  }

  return db
    .prepare(
      `SELECT s.id, s.hymnal_id, h.code as hymnal_code, h.name as hymnal_name,
              s.number, s.title, s.alternate_title, s.category, s.language,
              s.author, s.composer, s.key_note, s.tempo, s.tags, s.theme,
              s.scripture_reference, s.is_favorite, s.song_background_config,
              s.created_at, s.updated_at
       FROM songs s
       JOIN hymnals h ON s.hymnal_id = h.id
       ORDER BY h.code, CAST(s.number AS INTEGER), s.number`
    )
    .all()
}

/**
 * Duplicate a song by ID. Creates a new song with modified number and title
 * to clearly indicate it's a copy.
 * @returns The newly created song row or null if source not found.
 */
export function duplicateSong(
  songId: number
): { id: number; number: string; title: string } | null {
  const source = db
    .prepare(
      `SELECT hymnal_id, number, title, alternate_title, lyrics_raw, category,
              language, author, composer, key_note, time_signature, tempo,
              tags, theme, scripture_reference, song_background_config
       FROM songs WHERE id = ?`
    )
    .get(songId) as Record<string, unknown> | undefined

  if (!source) return null

  const newNumber = `${source.number}-copy`
  const newTitle = `${source.title} (Salinan)`

  const result = db
    .prepare(
      `INSERT INTO songs (
        hymnal_id, number, title, alternate_title, lyrics_raw, category,
        language, author, composer, key_note, time_signature, tempo,
        tags, theme, scripture_reference, song_background_config
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      source.hymnal_id,
      newNumber,
      newTitle,
      source.alternate_title,
      source.lyrics_raw,
      source.category,
      source.language,
      source.author,
      source.composer,
      source.key_note,
      source.time_signature,
      source.tempo,
      source.tags,
      source.theme,
      source.scripture_reference,
      source.song_background_config
    )

  checkpointWal()

  return {
    id: Number(result.lastInsertRowid),
    number: newNumber,
    title: newTitle
  }
}

/**
 * Get storage statistics for the Management Mode dashboard.
 * Returns actual database size and process memory usage.
 */
export function getStorageStats(): {
  dbSizeBytes: number
  dbSizeMB: string
  memoryMB: string
  songCount: number
  hymnalCount: number
  playlistCount: number
} {
  const dbPath = join(app.getPath('userData'), 'sion.db')

  let dbSizeBytes = 0
  try {
    const stat = statSync(dbPath)
    dbSizeBytes = stat.size
  } catch {
    // ignore — file might not exist yet
  }

  const songCount = (db.prepare('SELECT COUNT(*) as c FROM songs').get() as { c: number }).c
  const hymnalCount = (db.prepare('SELECT COUNT(*) as c FROM hymnals').get() as { c: number }).c
  const playlistCount = (db.prepare('SELECT COUNT(*) as c FROM playlists').get() as { c: number }).c

  const memUsage = process.memoryUsage()

  return {
    dbSizeBytes,
    dbSizeMB: (dbSizeBytes / (1024 * 1024)).toFixed(1),
    memoryMB: (memUsage.heapUsed / (1024 * 1024)).toFixed(1),
    songCount,
    hymnalCount,
    playlistCount
  }
}

/**
 * Auto-backup on startup (if >7 days since last backup)
 */
export function autoBackupIfNeeded(): void {
  const settings = getSettings()
  const lastBackupStr = settings['last_auto_backup']

  const now = Date.now()
  const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000

  if (!lastBackupStr || now - parseInt(lastBackupStr, 10) > SEVEN_DAYS_MS) {
    try {
      createBackup()
      updateSetting('last_auto_backup', now.toString())
      console.info('[Backup] Auto-backup created successfully')
    } catch (err) {
      console.error('[Backup] Failed to create auto-backup:', err)
    }
  }
}
