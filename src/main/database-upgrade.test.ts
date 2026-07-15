import Database from 'better-sqlite3'
import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { openDatabaseWithUpgradeSafety } from './database-upgrade'

const tempDirs: string[] = []

function fixture(version: number): { dir: string; path: string } {
  const dir = mkdtempSync(join(tmpdir(), 'sion-upgrade-'))
  tempDirs.push(dir)
  const path = join(dir, 'sion.db')
  const db = new Database(path)
  db.exec(
    'CREATE TABLE user_data (value TEXT NOT NULL); CREATE TABLE schema_migrations (version INTEGER PRIMARY KEY)'
  )
  db.prepare('INSERT INTO user_data (value) VALUES (?)').run('jemaat')
  db.prepare('INSERT INTO schema_migrations (version) VALUES (?)').run(version)
  db.close()
  return { dir, path }
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) rmSync(dir, { recursive: true, force: true })
})

describe('openDatabaseWithUpgradeSafety', () => {
  it('does not create a backup when no migration is pending', () => {
    const { dir, path } = fixture(3)
    const db = openDatabaseWithUpgradeSafety(path, 3, () => undefined)
    db.close()
    expect(readdirSync(dir).filter((name) => name.includes('pre-update'))).toEqual([])
  })

  it('creates a restorable backup before applying a pending migration', () => {
    const { dir, path } = fixture(2)
    const before = readFileSync(path)
    const db = openDatabaseWithUpgradeSafety(path, 3, (connection) => {
      connection.prepare('UPDATE user_data SET value = ?').run('updated')
    })
    db.close()
    const backups = readdirSync(dir).filter((name) => name.includes('pre-update'))
    expect(backups).toHaveLength(1)
    expect(readFileSync(join(dir, backups[0]))).toEqual(before)
  })

  it('restores user data if migration fails', () => {
    const { path } = fixture(2)
    expect(() =>
      openDatabaseWithUpgradeSafety(path, 3, (connection) => {
        connection.prepare('UPDATE user_data SET value = ?').run('corrupt')
        throw new Error('forced migration failure')
      })
    ).toThrow('forced migration failure')

    const restored = new Database(path, { readonly: true })
    expect(restored.prepare('SELECT value FROM user_data').pluck().get()).toBe('jemaat')
    restored.close()
  })

  it('retains only the three newest pre-update backups', () => {
    const { dir, path } = fixture(1)
    for (let target = 2; target <= 5; target += 1) {
      const db = openDatabaseWithUpgradeSafety(path, target, (connection) => {
        connection
          .prepare('INSERT OR IGNORE INTO schema_migrations (version) VALUES (?)')
          .run(target)
      })
      db.close()
    }
    expect(readdirSync(dir).filter((name) => name.includes('pre-update'))).toHaveLength(3)
  })
})
