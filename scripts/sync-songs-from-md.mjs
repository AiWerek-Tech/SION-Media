import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const mdFile = path.join(__dirname, '..', '.docs', 'Daftar-Lagu-Sion.md')
const seedFile = path.join(__dirname, '..', 'src', 'main', 'seed-data.ts')

const mdContent = fs.readFileSync(mdFile, 'utf-8')

// 1. Extract Table 1: Indonesian Titles
const idTableRegex = /\| (\d{3})\s+\| (.*?)\s+\|/g
const idSongs = {}
let match
while ((match = idTableRegex.exec(mdContent)) !== null) {
  const num = match[1].padStart(3, '0')
  idSongs[num] = match[2].trim()
}

// 2. Extract Table 2: English Titles
const enTableRegex = /\| (.*?)\s+\| (\d{1,3})\s+\|/g
const enSongs = {}
while ((match = enTableRegex.exec(mdContent)) !== null) {
  const num = match[2].padStart(3, '0')
  enSongs[num] = match[1].trim()
}

// 3. Combine
const combined = []
// We know there are 525 songs based on the MD content
for (let i = 1; i <= 525; i++) {
  const num = i.toString().padStart(3, '0')
  const title = idSongs[num] || ''
  const titleEn = enSongs[num] || ''

  if (title || titleEn) {
    combined.push({
      song_number: num,
      title: title,
      title_en: titleEn,
      language: 'Indonesia'
    })
  }
}

// 4. Update seed-data.ts
const output = `export const initialSongs = ${JSON.stringify(combined, null, 2)}
`
fs.writeFileSync(seedFile, output, 'utf-8')

console.log(`Successfully synced ${combined.length} songs from MD to seed-data.ts`)
