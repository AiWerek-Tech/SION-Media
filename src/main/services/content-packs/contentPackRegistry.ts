/**
 * Content Pack Registry
 *
 * Reads and writes content pack metadata to the main SION Media database.
 * The registry stores pack locations and metadata — NOT the actual content.
 * Actual content (verses, hymnal songs, etc.) lives in external SQLite files.
 */

import Database from 'better-sqlite3'
import type { ContentPackRecord, ContentPackType } from '@shared/types'

let _db: Database.Database | null = null

/**
 * Inject the main database instance.
 * Called once from initDatabase() in database.ts.
 */
export function setRegistryDb(db: Database.Database): void {
  _db = db
}

function getDb(): Database.Database {
  if (!_db) throw new Error('[ContentPackRegistry] Database not initialized')
  return _db
}

// ============================================================================
// Queries
// ============================================================================

export function listPacks(packType?: ContentPackType): ContentPackRecord[] {
  const db = getDb()
  if (packType) {
    return db
      .prepare('SELECT * FROM content_packs WHERE pack_type = ? ORDER BY is_default DESC, name ASC')
      .all(packType) as ContentPackRecord[]
  }
  return db
    .prepare('SELECT * FROM content_packs ORDER BY pack_type, is_default DESC, name ASC')
    .all() as ContentPackRecord[]
}

export function getPackByPackId(packId: string): ContentPackRecord | null {
  const db = getDb()
  const row = db.prepare('SELECT * FROM content_packs WHERE pack_id = ?').get(packId)
  return (row as ContentPackRecord) ?? null
}

export function getDefaultPack(packType: ContentPackType): ContentPackRecord | null {
  const db = getDb()
  const row = db
    .prepare('SELECT * FROM content_packs WHERE pack_type = ? AND is_default = 1 LIMIT 1')
    .get(packType)
  if (row) return row as ContentPackRecord

  // Fallback: first active pack of this type
  const fallback = db
    .prepare('SELECT * FROM content_packs WHERE pack_type = ? AND is_active = 1 LIMIT 1')
    .get(packType)
  return (fallback as ContentPackRecord) ?? null
}

export function getPackByVersionCode(
  versionCode: string,
  packType: ContentPackType = 'bible'
): ContentPackRecord | null {
  const db = getDb()
  const row = db
    .prepare('SELECT * FROM content_packs WHERE version_code = ? AND pack_type = ? LIMIT 1')
    .get(versionCode, packType)
  return (row as ContentPackRecord) ?? null
}

// ============================================================================
// Mutations
// ============================================================================

export interface RegisterPackPayload {
  pack_id: string
  pack_type: ContentPackType
  version_code: string
  name: string
  short_name: string
  language: string
  publisher: string
  copyright: string
  license_status: string
  source_type: string
  source_base_url: string
  installed_path: string
  sqlite_filename: string
  manifest_filename: string
  books_filename: string
  import_report_filename: string
  validation_ok: boolean
  fts5_created: boolean
  books_count: number
  chapters_count: number
  verses_count: number
}

export function registerPack(payload: RegisterPackPayload): ContentPackRecord {
  const db = getDb()

  // Check if this is the first pack of this type → make it default automatically
  const existingCount = (
    db
      .prepare('SELECT COUNT(*) as c FROM content_packs WHERE pack_type = ?')
      .get(payload.pack_type) as { c: number }
  ).c
  const isDefault = existingCount === 0 ? 1 : 0

  const stmt = db.prepare(`
    INSERT INTO content_packs (
      pack_id, pack_type, version_code, name, short_name, language,
      publisher, copyright, license_status, source_type, source_base_url,
      installed_path, sqlite_filename, manifest_filename, books_filename,
      import_report_filename, is_active, is_default, is_offline_available,
      validation_ok, fts5_created, books_count, chapters_count, verses_count
    ) VALUES (
      ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, 1, ?, 1,
      ?, ?, ?, ?, ?
    )
    ON CONFLICT(pack_id) DO UPDATE SET
      installed_path = excluded.installed_path,
      validation_ok = excluded.validation_ok,
      fts5_created = excluded.fts5_created,
      books_count = excluded.books_count,
      chapters_count = excluded.chapters_count,
      verses_count = excluded.verses_count,
      updated_at = datetime('now')
  `)

  stmt.run(
    payload.pack_id,
    payload.pack_type,
    payload.version_code,
    payload.name,
    payload.short_name,
    payload.language,
    payload.publisher,
    payload.copyright,
    payload.license_status,
    payload.source_type,
    payload.source_base_url,
    payload.installed_path,
    payload.sqlite_filename,
    payload.manifest_filename,
    payload.books_filename,
    payload.import_report_filename,
    isDefault,
    payload.validation_ok ? 1 : 0,
    payload.fts5_created ? 1 : 0,
    payload.books_count,
    payload.chapters_count,
    payload.verses_count
  )

  const inserted = getPackByPackId(payload.pack_id)
  if (!inserted)
    throw new Error(`[ContentPackRegistry] Failed to retrieve registered pack: ${payload.pack_id}`)
  return inserted
}

export function setDefaultPack(packId: string): void {
  const db = getDb()
  const pack = getPackByPackId(packId)
  if (!pack) throw new Error(`Pack not found: ${packId}`)

  // Unset all defaults for this pack type, then set the new default
  const tx = db.transaction(() => {
    db.prepare('UPDATE content_packs SET is_default = 0 WHERE pack_type = ?').run(pack.pack_type)
    db.prepare(
      "UPDATE content_packs SET is_default = 1, updated_at = datetime('now') WHERE pack_id = ?"
    ).run(packId)
  })
  tx()
}

export function removePack(packId: string): boolean {
  const db = getDb()
  const result = db.prepare('DELETE FROM content_packs WHERE pack_id = ?').run(packId)
  return result.changes > 0
}
