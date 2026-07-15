import Database from 'better-sqlite3'
import { existsSync } from 'node:fs'

type BundledSong = {
  hymnal_code: string
  number: string
  title: string
  alternate_title: string
  lyrics_raw: string
  category: string
  language: string
  author: string
  composer: string
  key_note: string
  tempo: string
  tags: string
  theme: string
  scripture_reference: string
}

/** Refreshes only release-owned hymnals and songs from the shipped database. */
export function syncBundledSongs(db: Database.Database, bundledDatabasePath: string): void {
  if (!existsSync(bundledDatabasePath)) return

  db.prepare('ATTACH DATABASE ? AS bundled_release').run(bundledDatabasePath)
  try {
    const sync = db.transaction(() => {
      const hymnals = db
        .prepare(
          `SELECT code, name, language, region, version, publisher, is_official
           FROM bundled_release.hymnals`
        )
        .all() as Array<Record<string, string | number>>

      const findHymnal = db.prepare('SELECT id FROM hymnals WHERE code = ?')
      const insertHymnal = db.prepare(`
        INSERT INTO hymnals (
          code, name, language, region, version, publisher, is_official,
          content_origin, bundled_key
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'bundled', ?)
      `)
      const updateHymnal = db.prepare(`
        UPDATE hymnals SET name = ?, language = ?, region = ?, version = ?,
          publisher = ?, is_official = ?, content_origin = 'bundled', bundled_key = ?
        WHERE id = ?
      `)

      for (const hymnal of hymnals) {
        const key = `hymnal:${hymnal.code}`
        const existing = findHymnal.get(hymnal.code) as { id: number } | undefined
        if (existing) {
          updateHymnal.run(
            hymnal.name,
            hymnal.language,
            hymnal.region,
            hymnal.version,
            hymnal.publisher,
            hymnal.is_official,
            key,
            existing.id
          )
        } else {
          insertHymnal.run(
            hymnal.code,
            hymnal.name,
            hymnal.language,
            hymnal.region,
            hymnal.version,
            hymnal.publisher,
            hymnal.is_official,
            key
          )
        }
      }

      const songs = db
        .prepare(
          `SELECT h.code AS hymnal_code, s.number, s.title, s.alternate_title,
             s.lyrics_raw, s.category, s.language, s.author, s.composer,
             s.key_note, s.tempo, s.tags, s.theme, s.scripture_reference
           FROM bundled_release.songs s
           JOIN bundled_release.hymnals h ON h.id = s.hymnal_id`
        )
        .all() as BundledSong[]

      const findSong = db.prepare('SELECT id FROM songs WHERE bundled_key = ?')
      const hymnalId = db.prepare('SELECT id FROM hymnals WHERE code = ?')
      const updateSong = db.prepare(`
        UPDATE songs SET hymnal_id = ?, number = ?, title = ?, alternate_title = ?,
          lyrics_raw = ?, category = ?, language = ?, author = ?, composer = ?,
          key_note = ?, tempo = ?, tags = ?, theme = ?, scripture_reference = ?,
          content_origin = 'bundled'
        WHERE id = ?
      `)
      const insertSong = db.prepare(`
        INSERT INTO songs (
          hymnal_id, number, title, alternate_title, lyrics_raw, category,
          language, author, composer, key_note, tempo, tags, theme,
          scripture_reference, content_origin, bundled_key
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'bundled', ?)
      `)

      for (const song of songs) {
        const key = `song:${song.hymnal_code}:${song.number}`
        const targetHymnal = hymnalId.get(song.hymnal_code) as { id: number }
        const existing = findSong.get(key) as { id: number } | undefined
        const values = [
          targetHymnal.id,
          song.number,
          song.title,
          song.alternate_title,
          song.lyrics_raw,
          song.category,
          song.language,
          song.author,
          song.composer,
          song.key_note,
          song.tempo,
          song.tags,
          song.theme,
          song.scripture_reference
        ]
        if (existing) updateSong.run(...values, existing.id)
        else insertSong.run(...values, key)
      }
    })

    sync()
  } finally {
    db.exec('DETACH DATABASE bundled_release')
  }
}
