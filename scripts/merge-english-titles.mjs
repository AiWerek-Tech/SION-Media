/**
 * Script to clean seed-data.ts:
 * - Keep only Indonesian entries (they already have title_en mapped)
 * - Remove separate English entries (now redundant since title_en is on Indonesian entries)
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const seedFile = path.join(__dirname, '..', 'src', 'main', 'seed-data.ts')
const content = fs.readFileSync(seedFile, 'utf-8')

// Parse all entries
const regex =
  /\{\s*"song_number":\s*"(\d+)"\s*,\s*"title":\s*"([^"]*?)"\s*,\s*"title_en":\s*"([^"]*?)"\s*,\s*"language":\s*"([^"]*?)"\s*\}/g
let match
const allSongs = []
while ((match = regex.exec(content)) !== null) {
  allSongs.push({
    song_number: match[1],
    title: match[2],
    title_en: match[3],
    language: match[4]
  })
}

console.log(`Total entries parsed: ${allSongs.length}`)

// Keep only Indonesian entries
const indonesianSongs = allSongs.filter((s) => s.language === 'Indonesia')
const englishSongs = allSongs.filter((s) => s.language !== 'Indonesia')

console.log(`Indonesian entries: ${indonesianSongs.length}`)
console.log(`English entries (to remove): ${englishSongs.length}`)
console.log(`Indonesian with English subtitle: ${indonesianSongs.filter((s) => s.title_en).length}`)
console.log(
  `Indonesian without English subtitle: ${indonesianSongs.filter((s) => !s.title_en).length}`
)

// Show entries without English title
const noEn = indonesianSongs.filter((s) => !s.title_en)
if (noEn.length > 0) {
  console.log('\nEntries without English title:')
  noEn.forEach((s) => console.log(`  ${s.song_number}: ${s.title}`))
}

// Generate clean seed-data.ts with only Indonesian entries
let output = 'export const initialSongs = [\n'
for (let i = 0; i < indonesianSongs.length; i++) {
  const s = indonesianSongs[i]
  output += '  {\n'
  output += `    "song_number": "${s.song_number}",\n`
  output += `    "title": ${JSON.stringify(s.title)},\n`
  output += `    "title_en": ${JSON.stringify(s.title_en)},\n`
  output += `    "language": "Indonesia"\n`
  output += '  }'
  if (i < indonesianSongs.length - 1) output += ','
  output += '\n'
}
output += ']\n'

fs.writeFileSync(seedFile, output, 'utf-8')
console.log(`\nSeed data cleaned: ${indonesianSongs.length} entries written.`)
