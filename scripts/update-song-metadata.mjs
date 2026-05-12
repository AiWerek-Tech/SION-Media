import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import Database from 'better-sqlite3'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Paths
const metadataFile = path.join(
  __dirname,
  '..',
  '.docs',
  '07-song-scraper',
  'songs_full_metadata.json'
)

// Get database path from command line argument or use resources database
const customDbPath = process.argv[2]
let dbPath

if (customDbPath) {
  dbPath = customDbPath
} else {
  // Default to resources database
  dbPath = path.join(__dirname, '..', 'resources', 'sion.db')
}

console.log('Database path:', dbPath)
console.log('Metadata file:', metadataFile)

// Check if database exists
if (!fs.existsSync(dbPath)) {
  console.error(`Database not found at: ${dbPath}`)
  console.error('Please specify the database path as an argument:')
  console.error('  node scripts/update-song-metadata.mjs /path/to/sion.db')
  process.exit(1)
}

// Read metadata JSON
const metadata = JSON.parse(fs.readFileSync(metadataFile, 'utf8'))
console.log(`Loaded ${metadata.length} songs from metadata file`)

// Open database
const db = new Database(dbPath)
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

// Get the LS hymnal ID (Lagu Sion Edisi Lengkap)
const hymnalRow = db.prepare("SELECT id FROM hymnals WHERE code = 'LS'").get()
const hymnalId = hymnalRow ? hymnalRow.id : null

if (!hymnalId) {
  console.error('LS hymnal not found in database!')
  process.exit(1)
}

console.log(`Using hymnal ID: ${hymnalId}`)

// Prepare update statement
const updateSong = db.prepare(`
  UPDATE songs SET
    alternate_title = ?,
    composer = ?,
    author = ?,
    key_note = ?,
    time_signature = ?,
    scripture_reference = ?,
    category = ?,
    updated_at = datetime('now')
  WHERE hymnal_id = ? AND number = ?
`)

// Statistics
let updated = 0
let notFound = 0
let skipped = 0

// Process each song from metadata
const transaction = db.transaction(() => {
  for (const meta of metadata) {
    const number = meta.number.toString().trim()

    // Normalize number (remove leading zeros for digit-only strings)
    let normalizedNumber = number
    if (/^[0-9]+$/.test(number)) {
      normalizedNumber = number.replace(/^0+/, '')
      if (normalizedNumber === '') normalizedNumber = '0'
    }

    // Check if song exists in database
    const existing = db
      .prepare('SELECT id FROM songs WHERE hymnal_id = ? AND number = ?')
      .get(hymnalId, normalizedNumber)

    if (!existing) {
      notFound++
      console.log(`Song #${normalizedNumber} not found in database`)
      continue
    }

    // Map JSON fields to database fields
    const alternateTitle = meta.english_title || ''
    const composer = meta.composer || ''
    const author = meta.arranger || '' // arranger maps to author
    const keyNote = meta.key_signature || ''
    const timeSignature = meta.time_signature || ''
    const scriptureReference = meta.bible_verse || ''
    const category = meta.album || ''

    // Update the song
    try {
      updateSong.run(
        alternateTitle,
        composer,
        author,
        keyNote,
        timeSignature,
        scriptureReference,
        category,
        hymnalId,
        normalizedNumber
      )

      updated++
    } catch (error) {
      console.error(`Error updating song #${meta.number}:`, error)
    }
  }
})

// Execute transaction
transaction()

// Rebuild FTS if it exists
try {
  db.exec(`INSERT INTO songs_fts(songs_fts) VALUES('rebuild');`)
  console.log('FTS index rebuilt')
} catch {
  console.log('FTS rebuild skipped (may not be available)')
}

// Close database
db.close()

console.log('\n=== Summary ===')
console.log(`Total songs in metadata: ${metadata.length}`)
console.log(`Updated: ${updated}`)
console.log(`Not found in database: ${notFound}`)
console.log(`Skipped: ${skipped}`)
