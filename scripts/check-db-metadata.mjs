import Database from 'better-sqlite3'

const dbPath = 'd:\\my_dev\\SION-Media\\resources\\sion.db'
const db = new Database(dbPath)

const result = db
  .prepare(
    `
  SELECT 
    COUNT(*) as total,
    COUNT(CASE WHEN composer IS NOT NULL AND composer != '' THEN 1 END) as with_composer,
    COUNT(CASE WHEN author IS NOT NULL AND author != '' THEN 1 END) as with_author,
    COUNT(CASE WHEN scripture_reference IS NOT NULL AND scripture_reference != '' THEN 1 END) as with_scripture,
    COUNT(CASE WHEN alternate_title IS NOT NULL AND alternate_title != '' THEN 1 END) as with_alternate_title,
    COUNT(CASE WHEN category IS NOT NULL AND category != '' THEN 1 END) as with_category
  FROM songs
`
  )
  .get()

console.log('Database metadata check:')
console.log(JSON.stringify(result, null, 2))

// Sample a few songs to verify
const sample = db
  .prepare(
    'SELECT number, title, composer, author, scripture_reference, alternate_title, category FROM songs LIMIT 3'
  )
  .all()
console.log('\nSample songs:')
console.log(JSON.stringify(sample, null, 2))

db.close()
