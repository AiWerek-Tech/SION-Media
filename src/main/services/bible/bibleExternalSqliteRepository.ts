/**
 * Bible External SQLite Repository
 *
 * Opens and queries external SQLite Bible pack files.
 * Connections are cached per pack and opened read-only.
 * Never writes to the external SQLite files.
 *
 * External SQLite schema (from tb_lai_1974.sqlite):
 *   - bible_books(book_code, osis_id, name, url_name, testament, book_order, chapters_count)
 *   - bible_verses(book_code, chapter, verse, text)
 *   - bible_verses_fts(text) — FTS5 virtual table
 */

import Database from 'better-sqlite3'
import { join } from 'path'
import { existsSync } from 'fs'
import type {
  BibleExternalBook,
  BibleExternalVerse,
  BibleSearchResult,
  BibleVersionInfo
} from '@shared/types'
import { getPackByVersionCode, listPacks } from '../content-packs/contentPackRegistry'

// ============================================================================
// Connection Cache
// ============================================================================

const connectionCache = new Map<string, Database.Database>()

function getConnection(installedPath: string, sqliteFilename: string): Database.Database {
  const cacheKey = `${installedPath}::${sqliteFilename}`

  if (connectionCache.has(cacheKey)) {
    return connectionCache.get(cacheKey)!
  }

  const sqlitePath = join(installedPath, sqliteFilename)
  if (!existsSync(sqlitePath)) {
    throw new Error(`Bible pack SQLite file not found: ${sqlitePath}`)
  }

  const conn = new Database(sqlitePath, {
    readonly: true,
    fileMustExist: true
  })

  // Performance pragmas for read-only queries
  conn.pragma('journal_mode = WAL')
  conn.pragma('cache_size = -8000') // 8MB cache
  conn.pragma('temp_store = MEMORY')

  connectionCache.set(cacheKey, conn)
  console.info(`[BibleRepo] Opened connection: ${sqlitePath}`)

  return conn
}

function getConnectionForVersion(versionCode: string): Database.Database {
  const pack = getPackByVersionCode(versionCode, 'bible')
  if (!pack) {
    throw new Error(`Bible pack not found for version: ${versionCode}`)
  }
  if (!pack.is_active) {
    throw new Error(`Bible pack is not active: ${versionCode}`)
  }
  return getConnection(pack.installed_path, pack.sqlite_filename)
}

/**
 * Close all cached external connections. Call on app shutdown.
 */
export function closeAllBibleConnections(): void {
  for (const [key, conn] of connectionCache.entries()) {
    try {
      conn.close()
      console.info(`[BibleRepo] Closed connection: ${key}`)
    } catch (err) {
      console.error(`[BibleRepo] Error closing connection ${key}:`, err)
    }
  }
  connectionCache.clear()
}

/**
 * Close a specific pack's connection (e.g., after removing the pack).
 */
export function closeBibleConnection(installedPath: string, sqliteFilename: string): void {
  const cacheKey = `${installedPath}::${sqliteFilename}`
  const conn = connectionCache.get(cacheKey)
  if (conn) {
    try {
      conn.close()
    } catch {
      /* ignore */
    }
    connectionCache.delete(cacheKey)
  }
}

// ============================================================================
// Query Functions
// ============================================================================

/**
 * List all installed Bible versions from the registry.
 */
export function getBibleVersions(): BibleVersionInfo[] {
  const packs = listPacks('bible')
  return packs.map((pack) => ({
    versionCode: pack.version_code,
    name: pack.name,
    shortName: pack.short_name,
    language: pack.language,
    publisher: pack.publisher,
    copyright: pack.copyright,
    booksCount: pack.books_count,
    chaptersCount: pack.chapters_count,
    versesCount: pack.verses_count,
    fts5Created: pack.fts5_created === 1,
    isDefault: pack.is_default === 1,
    packId: pack.pack_id
  }))
}

/**
 * Get all books for a version.
 */
export function getBibleBooks(versionCode: string): BibleExternalBook[] {
  const db = getConnectionForVersion(versionCode)
  return db
    .prepare(
      'SELECT book_code as code, osis_id, name, testament, book_order as "order", chapters_count as chapters FROM bible_books ORDER BY book_order ASC'
    )
    .all() as BibleExternalBook[]
}

/**
 * Get all verses for a chapter.
 */
export function getBibleChapter(
  versionCode: string,
  bookCode: string,
  chapter: number
): BibleExternalVerse[] {
  const db = getConnectionForVersion(versionCode)

  // Get book name for result enrichment
  const bookRow = db
    .prepare('SELECT name FROM bible_books WHERE book_code = ? LIMIT 1')
    .get(bookCode) as { name: string } | undefined

  const bookName = bookRow?.name ?? bookCode

  const rows = db
    .prepare(
      'SELECT book_code, chapter, verse, text FROM bible_verses WHERE book_code = ? AND chapter = ? ORDER BY verse ASC'
    )
    .all(bookCode, chapter) as Array<{
    book_code: string
    chapter: number
    verse: number
    text: string
  }>

  return rows.map((r) => ({
    book_code: r.book_code,
    book_name: bookName,
    chapter: r.chapter,
    verse: r.verse,
    text: r.text
  }))
}

/**
 * Get a range of verses.
 */
export function getBibleVerseRange(
  versionCode: string,
  bookCode: string,
  chapter: number,
  verseStart: number,
  verseEnd: number
): BibleExternalVerse[] {
  const db = getConnectionForVersion(versionCode)

  const bookRow = db
    .prepare('SELECT name FROM bible_books WHERE book_code = ? LIMIT 1')
    .get(bookCode) as { name: string } | undefined

  const bookName = bookRow?.name ?? bookCode

  const rows = db
    .prepare(
      `SELECT book_code, chapter, verse, text
       FROM bible_verses
       WHERE book_code = ? AND chapter = ? AND verse >= ? AND verse <= ?
       ORDER BY verse ASC`
    )
    .all(bookCode, chapter, verseStart, verseEnd) as Array<{
    book_code: string
    chapter: number
    verse: number
    text: string
  }>

  return rows.map((r) => ({
    book_code: r.book_code,
    book_name: bookName,
    chapter: r.chapter,
    verse: r.verse,
    text: r.text
  }))
}

/**
 * Full-text search across all verses using FTS5.
 * Returns up to 50 results with highlighted snippet.
 */
export function searchBibleVerses(
  versionCode: string,
  query: string,
  limit: number = 50
): BibleSearchResult[] {
  if (!query || query.trim().length < 2) return []

  const db = getConnectionForVersion(versionCode)
  const safeLimit = Math.min(200, Math.max(1, limit))

  // Check if FTS5 table exists
  const ftsExists = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='bible_verses_fts'")
    .get()

  let rows: Array<{
    book_code: string
    chapter: number
    verse: number
    text: string
    snippet: string
  }>

  if (ftsExists) {
    // Use FTS5 with snippet (column index 3 is text)
    rows = db
      .prepare(
        `SELECT bv.book_code, bv.chapter, bv.verse, bv.text,
                snippet(bible_verses_fts, 3, '<mark>', '</mark>', '...', 32) as snippet
         FROM bible_verses_fts
         JOIN bible_verses bv ON bv.rowid = bible_verses_fts.rowid
         WHERE bible_verses_fts MATCH ?
         ORDER BY rank
         LIMIT ?`
      )
      .all(`"${query.replace(/"/g, '')}"`, safeLimit) as typeof rows
  } else {
    // Fallback: LIKE search
    const likeQuery = `%${query}%`
    rows = db
      .prepare(
        `SELECT book_code, chapter, verse, text, text as snippet
         FROM bible_verses
         WHERE text LIKE ?
         ORDER BY book_code, chapter, verse
         LIMIT ?`
      )
      .all(likeQuery, safeLimit) as typeof rows
  }

  // Enrich with book names in bulk
  const bookCodes = [...new Set(rows.map((r) => r.book_code))]
  const bookNames: Record<string, string> = {}
  for (const code of bookCodes) {
    const bookRow = db
      .prepare('SELECT name FROM bible_books WHERE book_code = ? LIMIT 1')
      .get(code) as { name: string } | undefined
    bookNames[code] = bookRow?.name ?? code
  }

  return rows.map((r) => ({
    book_code: r.book_code,
    book_name: bookNames[r.book_code] ?? r.book_code,
    chapter: r.chapter,
    verse: r.verse,
    text: r.text,
    snippet: r.snippet
  }))
}

/**
 * Get pack info for a version code.
 */
export function getBiblePackInfo(versionCode: string): BibleVersionInfo | null {
  const pack = getPackByVersionCode(versionCode, 'bible')
  if (!pack) return null
  return {
    versionCode: pack.version_code,
    name: pack.name,
    shortName: pack.short_name,
    language: pack.language,
    publisher: pack.publisher,
    copyright: pack.copyright,
    booksCount: pack.books_count,
    chaptersCount: pack.chapters_count,
    versesCount: pack.verses_count,
    fts5Created: pack.fts5_created === 1,
    isDefault: pack.is_default === 1,
    packId: pack.pack_id
  }
}
