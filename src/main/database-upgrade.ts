import Database from 'better-sqlite3'
import { copyFileSync, existsSync, readdirSync, rmSync, statSync } from 'node:fs'
import { basename, dirname, join } from 'node:path'

const BACKUP_MARKER = '.pre-update-'
const DEFAULT_BACKUP_RETENTION = 3

function readSchemaVersion(db: Database.Database): number {
  const table = db
    .prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'schema_migrations'")
    .get()
  if (!table) return 0
  const row = db.prepare('SELECT MAX(version) AS version FROM schema_migrations').get() as {
    version: number | null
  }
  return row.version ?? 0
}

function pruneBackups(databasePath: string, retention: number): void {
  const directory = dirname(databasePath)
  const prefix = `${basename(databasePath)}${BACKUP_MARKER}`
  const backups = readdirSync(directory)
    .filter((name) => name.startsWith(prefix))
    .map((name) => ({ name, modified: statSync(join(directory, name)).mtimeMs }))
    .sort((a, b) => b.modified - a.modified)

  for (const backup of backups.slice(retention)) {
    rmSync(join(directory, backup.name), { force: true })
  }
}

/**
 * Opens the user database and applies migrations behind a restorable backup.
 * A backup is created only when the on-disk schema is older than the release.
 */
export function openDatabaseWithUpgradeSafety(
  databasePath: string,
  targetVersion: number,
  migrate: (db: Database.Database) => void,
  retention = DEFAULT_BACKUP_RETENTION
): Database.Database {
  let currentVersion = 0
  if (existsSync(databasePath)) {
    const probe = new Database(databasePath)
    probe.pragma('wal_checkpoint(TRUNCATE)')
    currentVersion = readSchemaVersion(probe)
    probe.close()
  }

  const needsUpgrade = currentVersion < targetVersion
  const backupPath = needsUpgrade
    ? `${databasePath}${BACKUP_MARKER}${Date.now()}-v${currentVersion}`
    : null

  if (backupPath && existsSync(databasePath)) copyFileSync(databasePath, backupPath)

  const db = new Database(databasePath)
  try {
    migrate(db)
    if (backupPath) pruneBackups(databasePath, retention)
    return db
  } catch (error) {
    db.close()
    if (backupPath && existsSync(backupPath)) {
      rmSync(`${databasePath}-wal`, { force: true })
      rmSync(`${databasePath}-shm`, { force: true })
      copyFileSync(backupPath, databasePath)
    }
    throw error
  }
}
