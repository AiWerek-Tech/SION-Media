import { createHash } from 'crypto'
import type { ConflictSeverity, ScrapedSong, ScraperConflictItem } from './types'
import { getSongForConflictByNumber, findSongsForConflictByTitle } from '../database'

function normalizeTitle(input: string): string {
  return String(input ?? '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function tokenSet(s: string): Set<string> {
  const parts = normalizeTitle(s).split(' ').filter(Boolean)
  return new Set(parts)
}

function titleSimilarity(a: string, b: string): number {
  const sa = tokenSet(a)
  const sb = tokenSet(b)
  if (sa.size === 0 || sb.size === 0) return 0
  let inter = 0
  for (const t of sa) if (sb.has(t)) inter++
  const union = new Set([...sa, ...sb]).size
  return union === 0 ? 0 : inter / union
}

function hashLyrics(lyrics: string): string {
  return createHash('sha1')
    .update(String(lyrics ?? ''), 'utf8')
    .digest('hex')
}

function normalizeLyricsForTokens(input: string): string {
  return String(input ?? '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/[^a-z0-9\n\s]/g, ' ')
    .replace(/[\t\r]/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/\s+/g, ' ')
    .trim()
}

function wordSetFromLyrics(lyrics: string): Set<string> {
  const normalized = normalizeLyricsForTokens(lyrics)
  const parts = normalized.split(/\s+/g).filter(Boolean)
  return new Set(parts)
}

function lineSetFromLyrics(lyrics: string): Set<string> {
  const normalized = normalizeLyricsForTokens(lyrics)
  const lines = normalized
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
  return new Set(lines)
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0
  let inter = 0
  for (const t of a) if (b.has(t)) inter++
  const union = new Set([...a, ...b]).size
  return union === 0 ? 0 : inter / union
}

function clamp01(x: number): number {
  if (Number.isNaN(x) || !Number.isFinite(x)) return 0
  return Math.max(0, Math.min(1, x))
}

function computeLyricsSimilarity(a: string, b: string): number {
  const wordJac = jaccard(wordSetFromLyrics(a), wordSetFromLyrics(b))
  const lineJac = jaccard(lineSetFromLyrics(a), lineSetFromLyrics(b))
  // Hybrid: words capture content; lines capture structure & chorus duplication patterns
  return clamp01(0.7 * wordJac + 0.3 * lineJac)
}

function stanzaAndLineCounts(lyrics: string): { stanzas: number; lines: number } {
  const normalized = String(lyrics ?? '').replace(/[\r\t]/g, '')
  const rawLines = normalized.split('\n')
  const lines = rawLines.map((l) => l.trim()).filter((l) => l.length > 0)
  const stanzas = normalized
    .split(/\n\s*\n/g)
    .map((s) => s.trim())
    .filter((s) => s.length > 0).length
  return { stanzas, lines: lines.length }
}

function ratioSimilarity(a: number, b: number): number {
  const max = Math.max(1, a, b)
  return clamp01(1 - Math.abs(a - b) / max)
}

function computeStructureSimilarity(aLyrics: string, bLyrics: string): number {
  const a = stanzaAndLineCounts(aLyrics)
  const b = stanzaAndLineCounts(bLyrics)
  const stanzaSim = ratioSimilarity(a.stanzas, b.stanzas)
  const lineSim = ratioSimilarity(a.lines, b.lines)
  return clamp01(0.5 * stanzaSim + 0.5 * lineSim)
}

function normalizeMeta(input: unknown): string {
  return String(input ?? '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

function computeMetadataSimilarity(params: {
  existing: {
    author?: string
    composer?: string
    key_note?: string
    time_signature?: string
    category?: string
  }
  scraped: {
    author?: string
    composer?: string
    key_note?: string
    time_signature?: string
    category?: string
  }
}): number {
  const fields: Array<{
    name: string
    a: string
    b: string
  }> = [
    {
      name: 'author',
      a: normalizeMeta(params.existing.author),
      b: normalizeMeta(params.scraped.author)
    },
    {
      name: 'composer',
      a: normalizeMeta(params.existing.composer),
      b: normalizeMeta(params.scraped.composer)
    },
    {
      name: 'key_note',
      a: normalizeMeta(params.existing.key_note),
      b: normalizeMeta(params.scraped.key_note)
    },
    {
      name: 'time_signature',
      a: normalizeMeta(params.existing.time_signature),
      b: normalizeMeta(params.scraped.time_signature)
    },
    {
      name: 'category',
      a: normalizeMeta(params.existing.category),
      b: normalizeMeta(params.scraped.category)
    }
  ]

  let considered = 0
  let matched = 0
  for (const f of fields) {
    // Only consider if at least one side has a value
    if (f.a === '' && f.b === '') continue
    considered++
    if (f.a !== '' && f.b !== '' && f.a === f.b) matched++
  }

  if (considered === 0) return 0
  return clamp01(matched / considered)
}

function labelForScore(
  score01: number
): 'VERY_HIGH_MATCH' | 'HIGH_MATCH' | 'POSSIBLE_MATCH' | 'LOW_MATCH' {
  const s = score01 * 100
  if (s >= 90) return 'VERY_HIGH_MATCH'
  if (s >= 75) return 'HIGH_MATCH'
  if (s >= 50) return 'POSSIBLE_MATCH'
  return 'LOW_MATCH'
}

function computeConfidence(params: {
  scraped: ScrapedSong
  existing: {
    title: string
    lyrics_raw: string
    author?: string
    composer?: string
    key_note?: string
    time_signature?: string
    category?: string
  }
  titleSim: number
  lyricsHashMatch: boolean
}): {
  lyricsSim: number
  metadataSim: number
  structureSim: number
  total: number
  label: 'VERY_HIGH_MATCH' | 'HIGH_MATCH' | 'POSSIBLE_MATCH' | 'LOW_MATCH'
  notes: string[]
} {
  const notes: string[] = []

  const lyricsSim = params.lyricsHashMatch
    ? 1
    : computeLyricsSimilarity(params.scraped.lyrics_raw, params.existing.lyrics_raw)
  const metadataSim = computeMetadataSimilarity({
    existing: params.existing,
    scraped: params.scraped
  })
  const structureSim = computeStructureSimilarity(
    params.scraped.lyrics_raw,
    params.existing.lyrics_raw
  )

  const total = clamp01(
    0.25 * clamp01(params.titleSim) +
      0.5 * clamp01(lyricsSim) +
      0.15 * clamp01(metadataSim) +
      0.1 * clamp01(structureSim)
  )

  if (params.lyricsHashMatch) notes.push('Lyrics hash identical')
  if (!params.lyricsHashMatch && lyricsSim >= 0.9) notes.push('High lyrics overlap')
  if (metadataSim < 0.4) notes.push('Metadata differs or missing')
  if (structureSim < 0.6) notes.push('Structure differs (stanza/line count)')

  return { lyricsSim, metadataSim, structureSim, total, label: labelForScore(total), notes }
}

function severityFor(params: {
  hymnalIsOfficial: boolean
  hasNumberDuplicate: boolean
  lyricsHashMatch: boolean
  titleSim: number
}): ConflictSeverity {
  if (params.hymnalIsOfficial && params.hasNumberDuplicate && !params.lyricsHashMatch)
    return 'CRITICAL'
  if (params.hasNumberDuplicate && !params.lyricsHashMatch) return 'HIGH'
  if (params.hasNumberDuplicate && params.lyricsHashMatch) return 'MEDIUM'
  if (params.titleSim >= 0.75) return 'MEDIUM'
  return 'LOW'
}

export function buildConflictKey(hymnalId: number, normalizedNumber: string): string {
  return `${hymnalId}:${normalizedNumber}`
}

export function detectConflicts(params: {
  targetHymnalId: number
  items: ScrapedSong[]
}): ScraperConflictItem[] {
  const out: ScraperConflictItem[] = []

  for (const scraped of params.items) {
    const existing = getSongForConflictByNumber(params.targetHymnalId, scraped.sourceSongNumber)
    if (existing) {
      const sim = titleSimilarity(scraped.title, existing.title)
      const hashA = hashLyrics(scraped.lyrics_raw)
      const hashB = hashLyrics(existing.lyrics_raw)
      const hashMatch = hashA === hashB
      const hymnalIsOfficial = (existing.hymnal_is_official ?? 0) === 1

      const conf = computeConfidence({
        scraped,
        existing,
        titleSim: sim,
        lyricsHashMatch: hashMatch
      })

      out.push({
        key: buildConflictKey(params.targetHymnalId, scraped.sourceSongNumber),
        type: 'NUMBER_DUPLICATE',
        severity: severityFor({
          hymnalIsOfficial,
          hasNumberDuplicate: true,
          lyricsHashMatch: hashMatch,
          titleSim: sim
        }),
        reason: hashMatch
          ? 'Nomor sama dan lyrics identik'
          : 'Nomor sama tetapi lyrics berbeda (berpotensi overwrite corrupt)',
        scraped,
        existing,
        lyricsHashMatch: hashMatch,
        titleSimilarity: sim,
        lyricsSimilarity: conf.lyricsSim,
        metadataSimilarity: conf.metadataSim,
        structureSimilarity: conf.structureSim,
        confidenceScore: conf.total,
        confidenceLabel: conf.label,
        confidenceWhy: {
          title: clamp01(sim),
          lyrics: clamp01(conf.lyricsSim),
          metadata: clamp01(conf.metadataSim),
          structure: clamp01(conf.structureSim),
          weightedTotal: clamp01(conf.total),
          notes: conf.notes
        }
      })
      continue
    }

    const titleCandidates = findSongsForConflictByTitle(params.targetHymnalId, scraped.title)
    for (const ex of titleCandidates) {
      const sim = titleSimilarity(scraped.title, ex.title)
      if (sim < 0.75) continue

      const hashA = hashLyrics(scraped.lyrics_raw)
      const hashB = hashLyrics(ex.lyrics_raw)
      const hashMatch = hashA === hashB
      const hymnalIsOfficial = (ex.hymnal_is_official ?? 0) === 1

      const conf = computeConfidence({
        scraped,
        existing: ex,
        titleSim: sim,
        lyricsHashMatch: hashMatch
      })

      out.push({
        key: buildConflictKey(params.targetHymnalId, scraped.sourceSongNumber),
        type: hashMatch ? 'LYRICS_IDENTICAL' : 'TITLE_SIMILAR',
        severity: severityFor({
          hymnalIsOfficial,
          hasNumberDuplicate: false,
          lyricsHashMatch: hashMatch,
          titleSim: sim
        }),
        reason: hashMatch
          ? 'Lyrics identik dengan lagu lain (nomor berbeda)'
          : `Judul mirip (similarity ${(sim * 100).toFixed(0)}%)`,
        scraped,
        existing: ex,
        lyricsHashMatch: hashMatch,
        titleSimilarity: sim,
        lyricsSimilarity: conf.lyricsSim,
        metadataSimilarity: conf.metadataSim,
        structureSimilarity: conf.structureSim,
        confidenceScore: conf.total,
        confidenceLabel: conf.label,
        confidenceWhy: {
          title: clamp01(sim),
          lyrics: clamp01(conf.lyricsSim),
          metadata: clamp01(conf.metadataSim),
          structure: clamp01(conf.structureSim),
          weightedTotal: clamp01(conf.total),
          notes: conf.notes
        }
      })

      break
    }
  }

  return out
}
