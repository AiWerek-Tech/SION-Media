import Database from 'better-sqlite3'
import { copyFileSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { getCurrentVersion, migrations, runMigrations } from './migrations'
import { syncBundledSongs } from './bundled-content-upgrade'

const dirs: string[] = []

function makeDatabase(path: string): Database.Database {
  const db = new Database(path)
  migrations[0].up(db)
  return db
}

afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true })
})

describe('bundled content ownership', () => {
  it('upgrades the shipped v20 database and refreshes its bundled songs', () => {
    const dir = mkdtempSync(join(tmpdir(), 'sion-release-upgrade-'))
    dirs.push(dir)
    const userPath = join(dir, 'user.db')
    const releasePath = join(process.cwd(), 'resources', 'sion.db')
    copyFileSync(releasePath, userPath)

    const user = new Database(userPath)
    expect(getCurrentVersion(user)).toBe(20)
    runMigrations(user)
    syncBundledSongs(user, releasePath)

    expect(getCurrentVersion(user)).toBe(21)
    expect(
      user.prepare("SELECT COUNT(*) FROM songs WHERE content_origin = 'bundled'").pluck().get()
    ).toBe(525)
    user.close()
  })

  it('corrects bundled songs while preserving user rows, preferences, and playlist references', () => {
    const dir = mkdtempSync(join(tmpdir(), 'sion-bundled-'))
    dirs.push(dir)
    const userPath = join(dir, 'user.db')
    const releasePath = join(dir, 'release.db')
    const user = makeDatabase(userPath)
    const release = makeDatabase(releasePath)

    const userLs = user
      .prepare("INSERT INTO hymnals (code, name) VALUES ('LS', 'Lama')")
      .run().lastInsertRowid
    const oldSong = user
      .prepare(
        "INSERT INTO songs (hymnal_id, number, title, lyrics_raw, is_favorite) VALUES (?, '001', 'Judul Lama', 'Lirik Lama', 1)"
      )
      .run(userLs).lastInsertRowid
    const customHymnal = user
      .prepare("INSERT INTO hymnals (code, name, is_official) VALUES ('USER', 'Buatan Saya', 0)")
      .run().lastInsertRowid
    user
      .prepare(
        "INSERT INTO songs (hymnal_id, number, title, lyrics_raw) VALUES (?, 'A1', 'Lagu Saya', 'Tetap')"
      )
      .run(customHymnal)
    const playlist = user
      .prepare("INSERT INTO playlists (name) VALUES ('Sabat')")
      .run().lastInsertRowid
    user
      .prepare('INSERT INTO playlist_items (playlist_id, song_id) VALUES (?, ?)')
      .run(playlist, oldSong)

    const releaseLs = release
      .prepare("INSERT INTO hymnals (code, name) VALUES ('LS', 'Lagu Sion Terbaru')")
      .run().lastInsertRowid
    release
      .prepare(
        "INSERT INTO songs (hymnal_id, number, title, lyrics_raw) VALUES (?, '001', 'Judul Benar', 'Lirik Benar')"
      )
      .run(releaseLs)

    migrations.at(-1)!.up(user)
    syncBundledSongs(user, releasePath)

    expect(
      user
        .prepare(
          "SELECT title, lyrics_raw, is_favorite FROM songs WHERE bundled_key = 'song:LS:001'"
        )
        .get()
    ).toEqual({
      title: 'Judul Benar',
      lyrics_raw: 'Lirik Benar',
      is_favorite: 1
    })
    expect(
      user
        .prepare("SELECT title, lyrics_raw, content_origin FROM songs WHERE title = 'Lagu Saya'")
        .get()
    ).toEqual({
      title: 'Lagu Saya',
      lyrics_raw: 'Tetap',
      content_origin: 'user'
    })
    expect(
      user.prepare('SELECT song_id FROM playlist_items WHERE playlist_id = ?').pluck().get(playlist)
    ).toBe(oldSong)
    user.close()
    release.close()
  })
})
