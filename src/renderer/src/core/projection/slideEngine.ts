import type { SlideData, Song, PlaylistItem } from '@renderer/types'
import { buildBibleSlidesFromPlaylistItem } from '../../features/bible/utils/buildBibleSlides'
import { formatLyricChunk, markLyricLineSeparators } from '../../engine/lyricFlow'

interface ParsedSection {
  label: string
  lines: string[]
}

// Global cache to avoid re-generating slides unnecessarily during projection
const slideCache = new Map<string, { hash: string; slides: SlideData[] }>()
let globalSlideConfig: { maxLines: number; maxChars: number } = { maxLines: 4, maxChars: 40 }

/**
 * Set global slide splitting config from app settings.
 * Keeps @core/projection generation consistent with the renderer slide engine.
 */
export function setGlobalSlideConfig(config: { maxLines: number; maxChars: number }): void {
  globalSlideConfig = config
  slideCache.clear()
}

// Generate a simple hash for cache invalidation
function generateHash(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash |= 0 // Convert to 32bit int
  }
  return hash.toString()
}

/**
 * Parse raw lyrics text into structured sections
 */
function parseSections(lyricsRaw: string): ParsedSection[] {
  const sections: ParsedSection[] = []
  let currentLabel = ''
  let currentLines: string[] = []

  const lines = lyricsRaw.split('\n')

  // Regex for bare section headers without brackets:
  // Matches lines like "Bait 1", "Reff", "Verse 2", "Chorus", "Bridge", "Intro", "Ending", etc.
  // Must be the ONLY content on the line (no lyric text after it).
  const bareSectionRegex =
    /^(verse|bait|chorus|korus|reff?|refrain|bridge|intro|ending|outro|tag|pre[- ]?chorus)(\s*\d+)?$/i

  for (const line of lines) {
    const trimmed = line.trim()

    // Check for section markers like [VERSE 1], [CHORUS], [BRIDGE]
    const sectionMatch = trimmed.match(/^\[(.+)\]$/)
    if (sectionMatch) {
      if (currentLines.length > 0) {
        sections.push({ label: currentLabel, lines: currentLines })
      }
      currentLabel = sectionMatch[1]
      currentLines = []
      continue
    }

    // Check for bare section headers (without brackets)
    // e.g., "Bait 1", "Reff", "Verse 2", "Chorus"
    const bareMatch = trimmed.match(bareSectionRegex)
    if (bareMatch) {
      if (currentLines.length > 0) {
        sections.push({ label: currentLabel, lines: currentLines })
      }
      currentLabel = trimmed
      currentLines = []
      continue
    }

    // Skip empty lines between sections
    if (trimmed === '' && currentLines.length === 0) continue

    // Manual slide break
    if (trimmed === '---') {
      if (currentLines.length > 0) {
        sections.push({ label: currentLabel, lines: currentLines })
        currentLines = []
      }
      continue
    }

    currentLines.push(trimmed || '')
  }

  if (currentLines.length > 0) {
    sections.push({ label: currentLabel, lines: currentLines })
  }

  return sections
}

/**
 * Wrap a single line that exceeds MAX_CHARS_PER_LINE into multiple lines
 */
function wrapLine(line: string, maxChars: number): string[] {
  if (line.length <= maxChars) return [line]

  const words = line.split(' ')
  const result: string[] = []
  let current = ''

  for (const word of words) {
    const test = current ? `${current} ${word}` : word
    if (test.length <= maxChars) {
      current = test
    } else {
      if (current) result.push(current)
      current = word
    }
  }
  if (current) result.push(current)

  return result
}

/**
 * Split section lines into slide-sized chunks using smart balancing.
 * E.g., if a section has 5 lines and max is 4, split as 3 + 2 instead of 4 + 1.
 */
function splitIntoSlides(lines: string[], maxLines: number, maxChars: number): string[][] {
  // First, wrap any long lines
  const wrappedLines: string[] = []
  for (const line of markLyricLineSeparators(lines)) {
    if (line === '') {
      wrappedLines.push('')
    } else {
      wrappedLines.push(...wrapLine(line, maxChars))
    }
  }

  // Remove trailing empty lines
  while (wrappedLines.length > 0 && wrappedLines[wrappedLines.length - 1] === '') {
    wrappedLines.pop()
  }

  const chunks: string[][] = []

  // Smart Balancing Algorithm
  let i = 0
  while (i < wrappedLines.length) {
    // If the remaining lines are less than or equal to maxLines, just take them all
    const remaining = wrappedLines.length - i

    if (remaining <= maxLines) {
      chunks.push(wrappedLines.slice(i, i + remaining).filter((l) => l !== ''))
      break
    }

    // If we have to split, try to find a natural break (empty line) within the limit
    let breakIdx = -1
    for (let j = i + 1; j <= i + maxLines; j++) {
      if (wrappedLines[j] === '') {
        breakIdx = j
        break
      }
    }

    if (breakIdx !== -1) {
      chunks.push(wrappedLines.slice(i, breakIdx).filter((l) => l !== ''))
      i = breakIdx + 1 // Skip the empty line
      continue
    }

    // If no natural break, use balancing
    // Example: 5 lines total, max 4. Split into 3 and 2.
    // Example: 6 lines total, max 4. Split into 3 and 3.
    // Example: 7 lines total, max 4. Split into 4 and 3.
    let take = maxLines
    if (remaining > maxLines && remaining < maxLines * 2) {
      take = Math.ceil(remaining / 2)
    }

    chunks.push(wrappedLines.slice(i, i + take).filter((l) => l !== ''))
    i += take
  }

  return chunks
}

/**
 * Main function: convert raw lyrics to SlideData array
 */
export function generateSlides(
  songId: number,
  lyricsRaw: string,
  config?: { maxLines?: number; maxChars?: number },
  meta?: { keyNote?: string; timeSignature?: string; tempo?: string }
): SlideData[] {
  if (!lyricsRaw.trim()) return []

  const maxLines = config?.maxLines || 4
  const maxChars = config?.maxChars || 40

  // Check Cache
  const metaHash = meta
    ? generateHash(`${meta.keyNote || ''}_${meta.timeSignature || ''}_${meta.tempo || ''}`)
    : '0'
  const cacheKey = `${songId}_${maxLines}_${maxChars}_${metaHash}`
  const hash = generateHash(lyricsRaw)
  const cached = slideCache.get(cacheKey)

  if (cached && cached.hash === hash) {
    return cached.slides
  }

  const sections = parseSections(lyricsRaw)
  const allSlides: SlideData[] = []
  let slideIndex = 0

  for (const [sectionId, section] of sections.entries()) {
    const slideChunks = splitIntoSlides(section.lines, maxLines, maxChars)

    for (const chunk of slideChunks) {
      if (chunk.length === 0) continue // Skip empty chunks
      allSlides.push({
        contentType: 'song',
        songId,
        slideIndex,
        text: formatLyricChunk(chunk),
        sectionLabel: section.label,
        sectionId,
        keyNote: meta?.keyNote,
        timeSignature: meta?.timeSignature,
        tempo: meta?.tempo
      })
      slideIndex++
    }
  }

  // Update Cache
  slideCache.set(cacheKey, { hash, slides: allSlides })

  return allSlides
}

/**
 * Helper: generate slides with metadata automatically extracted from Song object
 */
export function generateSlidesForSong(
  song: Song,
  config?: { maxLines?: number; maxChars?: number }
): SlideData[] {
  const effectiveConfig = {
    maxLines: config?.maxLines ?? globalSlideConfig.maxLines,
    maxChars: config?.maxChars ?? globalSlideConfig.maxChars
  }

  const slides = generateSlides(song.id, song.lyrics_raw || '', effectiveConfig, {
    keyNote: song.key_note || undefined,
    timeSignature: song.time_signature || undefined,
    tempo: song.tempo || undefined
  })
  return slides.map((slide) => ({
    ...slide,
    contentType: 'song',
    playlistItemId: null
  }))
}

/**
 * Helper: generate slides with metadata from PlaylistItem
 */
export function generateSlidesForPlaylistItem(
  item: PlaylistItem,
  config?: { maxLines?: number; maxChars?: number }
): SlideData[] {
  if (item.item_type === 'bible') {
    return buildBibleSlidesFromPlaylistItem(item)
  }
  if (item.item_type === 'info') {
    const title = item.title?.trim() || ''
    const body = item.notes?.trim() || ''
    return [
      {
        contentType: 'custom',
        songId: null,
        playlistItemId: item.id,
        slideIndex: 0,
        text: body || title,
        sectionLabel: body ? title : ''
      }
    ]
  }
  const slides = generateSlides(item.song_id!, item.lyrics_raw || '', config, {
    keyNote: item.key_note || undefined,
    timeSignature: item.time_signature || undefined,
    tempo: item.tempo || undefined
  })
  return slides.map((slide) => ({
    ...slide,
    contentType: 'song',
    playlistItemId: item.id
  }))
}

/**
 * Auto-format raw lyrics: normalize whitespace, detect verse/chorus markers
 */
export function autoFormatLyrics(raw: string): string {
  const formatted = raw
    // Normalize line endings
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    // Remove excessive blank lines (max 2)
    .replace(/\n{3,}/g, '\n\n')
    // Trim trailing whitespace on each line
    .split('\n')
    .map((l) => l.trimEnd())
    .join('\n')
    // Trim start/end
    .trim()

  return formatted
}
