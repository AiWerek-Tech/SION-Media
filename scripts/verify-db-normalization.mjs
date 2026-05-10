#!/usr/bin/env node
/* eslint-disable @typescript-eslint/explicit-function-return-type */
/**
 * Verification script for song number normalization (Migration v9)
 * Run: node scripts/verify-db-normalization.mjs
 */

import initSqlJs from 'sql.js'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'

// On Windows, Electron userData is at %APPDATA%\<app-name>
// On macOS, it's at ~/Library/Application Support/<app-name>
// On Linux, it's at ~/.config/<app-name>
const isWindows = process.platform === 'win32'
const appName = 'sion-media'

let dbPath
if (isWindows) {
  const appData = process.env.APPDATA || join(homedir(), 'AppData', 'Roaming')
  dbPath = join(appData, appName, 'sion.db')
} else if (process.platform === 'darwin') {
  dbPath = join(homedir(), 'Library', 'Application Support', appName, 'sion.db')
} else {
  dbPath = join(homedir(), '.config', appName, 'sion.db')
}

console.log('Database path:', dbPath)
console.log('---')

if (!existsSync(dbPath)) {
  console.error('❌ Database file not found')
  console.error('Make sure the app has been run at least once to create the database.')
  process.exit(1)
}

try {
  const SQL = await initSqlJs()
  const fileBuffer = readFileSync(dbPath)
  const db = new SQL.Database(fileBuffer)

  // Helper to run queries
  /** @type {(sql: string, params?: unknown[]) => Record<string, unknown>[]} */
  const query = (sql, params = []) => {
    const stmt = db.prepare(sql)
    stmt.bind(params)
    const results = []
    while (stmt.step()) {
      results.push(stmt.getAsObject())
    }
    stmt.free()
    return results
  }

  /** @type {(sql: string, params?: unknown[]) => Record<string, unknown> | null} */
  const queryOne = (sql, params = []) => {
    const results = query(sql, params)
    return results[0] || null
  }

  // 1. Check migration version
  const tables = query("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
  console.log('Tables in database:', tables.map((t) => t.name).join(', '))
  console.log('---')

  const migrationsTableExists = tables.some((t) => t.name === 'schema_migrations')
  if (migrationsTableExists) {
    const migration = queryOne(
      'SELECT version, name FROM schema_migrations ORDER BY version DESC LIMIT 1'
    )
    console.log('Latest migration:', migration)
  } else {
    console.log('⚠️  No schema_migrations table found - database is from older version')
  }
  console.log('---')

  // 2. Check for songs with leading zeros
  const leadingZeros = query(`
    SELECT id, number, title 
    FROM songs 
    WHERE number LIKE '0%' 
    LIMIT 10
  `)

  if (leadingZeros.length > 0) {
    console.log('⚠️  Found songs with leading zeros:')
    for (const s of leadingZeros) {
      console.log(`  id=${s.id}, number="${s.number}", title="${s.title}"`)
    }
    console.log(`  ... (showing first 10)`)
  } else {
    console.log('✅ No songs with leading zeros found')
  }
  console.log('---')

  // 3. Sample song numbers
  const samples = query(`
    SELECT number, title 
    FROM songs 
    ORDER BY CAST(number AS INTEGER) ASC 
    LIMIT 20
  `)

  console.log('Sample song numbers (first 20 by numeric order):')
  for (const s of samples) {
    console.log(`  ${String(s.number).padStart(4)} | ${s.title}`)
  }
  console.log('---')

  // 4. Total count
  const total = queryOne('SELECT COUNT(*) as count FROM songs')
  console.log('Total songs:', total.count)

  db.close()
  console.log('\n✅ Verification complete')
} catch (err) {
  console.error('Error:', err.message)
  process.exit(1)
}
