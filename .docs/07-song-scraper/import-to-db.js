/* eslint-disable @typescript-eslint/no-require-imports */
const Database = require('better-sqlite3')
const path = require('path')
const fs = require('fs')
const os = require('os')

// Path to database - use Electron userData path
// For Windows: %APPDATA%/sion-media/sion.db
// For macOS: ~/Library/Application Support/sion-media/sion.db
// For Linux: ~/.config/sion-media/sion.db
let dbPath
if (os.platform() === 'win32') {
  dbPath = path.join(process.env.APPDATA, 'sion-media', 'sion.db')
} else if (os.platform() === 'darwin') {
  dbPath = path.join(os.homedir(), 'Library', 'Application Support', 'sion-media', 'sion.db')
} else {
  dbPath = path.join(os.homedir(), '.config', 'sion-media', 'sion.db')
}

const jsonPath = path.join(__dirname, 'songs-import-501-525.json')

console.log('Database path:', dbPath)
console.log('JSON path:', jsonPath)

// Open database
const db = new Database(dbPath)

// Check available hymnals
const hymnals = db.prepare('SELECT id, code, name FROM hymnals').all()
console.log('Available hymnals:', hymnals)

// Check if songs already exist (songs 501-525)
const existingSongs = db
  .prepare(
    'SELECT id, hymnal_id, number, title FROM songs WHERE hymnal_id = 9 AND CAST(number AS INTEGER) BETWEEN 501 AND 525'
  )
  .all()
console.log('Existing songs count:', existingSongs.length)

// Read JSON file
const jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'))

console.log(`Updating ${jsonData.length} songs from ${jsonPath}...`)

// Simple update script - update lyrics by ID directly
const updateLyrics = db.prepare(
  `UPDATE songs SET
    lyrics_raw = ?,
    updated_at = datetime('now')
  WHERE id = ?`
)

// Map song numbers to IDs from existingSongs
const songIdMap = {}
for (const song of existingSongs) {
  songIdMap[song.number] = song.id
}

const tx = db.transaction(() => {
  let updated = 0
  for (const item of jsonData) {
    try {
      const songId = songIdMap[String(item.number)]
      if (songId) {
        const newLyrics = String(item.lyrics_raw ?? '')

        console.log(`\nSong ${item.number}: ${item.title}`)
        console.log(`Song ID: ${songId}`)
        console.log(`New lyrics length: ${newLyrics.length}`)
        console.log(`New lyrics preview: ${newLyrics.substring(0, 100)}`)

        const result = updateLyrics.run(newLyrics, songId)
        updated += result.changes
        console.log(`Changes: ${result.changes}`)
      } else {
        console.log(`Song ${item.number} not found in database`)
      }
    } catch (error) {
      console.error(`Error updating song ${item.number}:`, error.message)
    }
  }
  return updated
})

const updatedCount = tx()

console.log('\nUpdate Result:')
console.log(`Total songs updated: ${updatedCount}`)

// Close database
db.close()

console.log('\nUpdate complete!')
