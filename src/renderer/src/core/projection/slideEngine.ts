import type { SlideData, Song, PlaylistItem } from '@renderer/types'
import { usePlaylistStore } from '../../store/usePlaylistStore'
import { buildBibleSlidesFromPlaylistItem } from '../../features/bible/utils/buildBibleSlides'
import { expandLyricLines, formatLyricChunk, markLyricLineSeparators } from '../../engine/lyricFlow'
import { parseMediaPlaylistDescriptor } from '../../../../shared/media-playlist'

interface ParsedSection {
  label: string
  lines: string[]
  lineIndices: number[]
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
  let currentIndices: number[] = []

  const lines = lyricsRaw.split('\n')

  // Regex for bare section headers without brackets:
  // Matches lines like "Bait 1", "Reff", "Verse 2", "Chorus", "Bridge", "Intro", "Ending", etc.
  // Must be the ONLY content on the line (no lyric text after it).
  const bareSectionRegex =
    /^(verse|bait|chorus|korus|reff?|refrain|bridge|intro|ending|outro|tag|pre[- ]?chorus)(\s*\d+)?$/i

  for (let idx = 0; idx < lines.length; idx++) {
    const line = lines[idx]
    const trimmed = line.trim()

    // Check for section markers like [VERSE 1], [CHORUS], [BRIDGE]
    const sectionMatch = trimmed.match(/^\[(.+)\]$/)
    if (sectionMatch) {
      if (currentLines.length > 0) {
        sections.push({ label: currentLabel, lines: currentLines, lineIndices: currentIndices })
      }
      currentLabel = sectionMatch[1]
      currentLines = []
      currentIndices = []
      continue
    }

    // Check for bare section headers (without brackets)
    // e.g., "Bait 1", "Reff", "Verse 2", "Chorus"
    const bareMatch = trimmed.match(bareSectionRegex)
    if (bareMatch) {
      if (currentLines.length > 0) {
        sections.push({ label: currentLabel, lines: currentLines, lineIndices: currentIndices })
      }
      currentLabel = trimmed
      currentLines = []
      currentIndices = []
      continue
    }

    // Skip empty lines between sections
    if (trimmed === '' && currentLines.length === 0) continue

    // Manual slide break
    if (trimmed === '---') {
      if (currentLines.length > 0) {
        sections.push({ label: currentLabel, lines: currentLines, lineIndices: currentIndices })
        currentLines = []
        currentIndices = []
      }
      continue
    }

    currentLines.push(trimmed || '')
    currentIndices.push(idx)
  }

  if (currentLines.length > 0) {
    sections.push({ label: currentLabel, lines: currentLines, lineIndices: currentIndices })
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
 * Split section lines into slides without breaking a semantic lyric line.
 */
function splitIntoSlides(
  lines: string[],
  lineIndices: number[],
  maxLines: number,
  maxChars: number
): { chunk: string[]; indices: number[] }[] {
  const expandedLines: string[] = []
  const expandedIndices: number[] = []
  lines.forEach((line, index) => {
    const segments = expandLyricLines([line])
    segments.forEach((segment) => {
      expandedLines.push(segment)
      expandedIndices.push(lineIndices[index])
    })
  })
  const separatorLines = markLyricLineSeparators(expandedLines)
  const chunks: { chunk: string[]; indices: number[] }[] = []
  let currentChunk: string[] = []
  let currentIndices: number[] = []

  const flush = (): void => {
    if (currentChunk.length > 0) {
      chunks.push({ chunk: currentChunk, indices: currentIndices })
    }
    currentChunk = []
    currentIndices = []
  }

  separatorLines.forEach((semanticLine, index) => {
    if (!semanticLine) {
      flush()
      return
    }

    const parts = wrapLine(semanticLine, maxChars)
    if (currentChunk.length > 0 && currentChunk.length + parts.length > maxLines) flush()
    currentChunk.push(...parts)
    currentIndices.push(...parts.map(() => expandedIndices[index]))
  })
  flush()

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

  // Pre-process raw lyrics to extract inline timestamps
  const rawLines = lyricsRaw.split('\n')
  const cleanLines: string[] = []
  const lineTimes: (number | undefined)[] = []
  const timestampRegex = /\[(\d+):(\d+)(?:\.(\d+))?\]/

  for (const line of rawLines) {
    const trimmed = line.trim()
    const match = trimmed.match(timestampRegex)
    if (match) {
      const min = parseInt(match[1], 10)
      const sec = parseInt(match[2], 10)
      const msPart = match[3] || '0'
      const fraction = parseFloat('0.' + msPart)
      const time = min * 60 + sec + fraction

      const clean = line.replace(timestampRegex, '')
      cleanLines.push(clean)
      lineTimes.push(time)
    } else {
      cleanLines.push(line)
      lineTimes.push(undefined)
    }
  }

  const cleanLyrics = cleanLines.join('\n')
  const sections = parseSections(cleanLyrics)
  const allSlides: SlideData[] = []
  let slideIndex = 0

  for (const [sectionId, section] of sections.entries()) {
    const slideChunks = splitIntoSlides(section.lines, section.lineIndices, maxLines, maxChars)

    for (const chunkData of slideChunks) {
      const chunk = chunkData.chunk
      if (chunk.length === 0) continue // Skip empty chunks

      // Find first valid timestamp in this slide chunk
      let startTime: number | undefined = undefined
      for (const origIdx of chunkData.indices) {
        if (lineTimes[origIdx] !== undefined) {
          startTime = lineTimes[origIdx]
          break
        }
      }

      allSlides.push({
        contentType: 'song',
        songId,
        slideIndex,
        text: formatLyricChunk(chunk),
        sectionLabel: section.label,
        sectionId,
        keyNote: meta?.keyNote,
        timeSignature: meta?.timeSignature,
        tempo: meta?.tempo,
        startTime
      })
      slideIndex++
    }
  }

  // Post-process to calculate endTime for each slide
  for (let i = 0; i < allSlides.length; i++) {
    const current = allSlides[i]
    if (current.startTime !== undefined) {
      let nextStartTime: number | undefined = undefined
      for (let j = i + 1; j < allSlides.length; j++) {
        if (allSlides[j].startTime !== undefined) {
          nextStartTime = allSlides[j].startTime
          break
        }
      }
      if (nextStartTime !== undefined) {
        current.endTime = nextStartTime
      }
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
  if (item.item_type === 'media') {
    const descriptor = parseMediaPlaylistDescriptor(item.notes)
    const path = descriptor.path
    const isPdf = path.toLowerCase().endsWith('.pdf')
    if (isPdf) {
      const pageCounts = usePlaylistStore.getState().pdfPageCounts || {}
      const cachedCount = pageCounts[path]
      if (cachedCount !== undefined) {
        return Array.from({ length: cachedCount }).map((_, idx) => {
          const slideImagePath = descriptor.presentation?.slides[idx]?.imagePath
          return {
            contentType: 'custom',
            songId: null,
            playlistItemId: item.id,
            slideIndex: idx,
            text: '',
            sectionLabel: descriptor.presentation?.slides[idx]?.title || `Halaman ${idx + 1}`,
            speakerNotes: descriptor.presentation?.slides[idx]?.notes || '',
            pdfPath: slideImagePath ? undefined : path,
            visualImagePath: slideImagePath
          }
        })
      } else {
        // Trigger background fetch
        setTimeout(() => {
          usePlaylistStore.getState().fetchPdfPageCount(path).catch(console.error)
        }, 0)
      }
    }
    return [
      {
        contentType: 'custom',
        songId: null,
        playlistItemId: item.id,
        slideIndex: 0,
        text: '',
        sectionLabel: item.title || 'Media',
        pdfPath: isPdf ? path : undefined
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
