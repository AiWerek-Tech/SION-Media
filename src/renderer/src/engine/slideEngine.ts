import type { SlideData, Song, PlaylistItem } from '@renderer/types'
import { usePlaylistStore } from '../store/usePlaylistStore'
import { buildBibleSlidesFromPlaylistItem } from '../features/bible/utils/buildBibleSlides'
import { expandLyricLines, formatLyricChunk, markLyricLineSeparators } from './lyricFlow'
import { parseMediaPlaylistDescriptor } from '../../../shared/media-playlist'
import {
  getProjectionMediaMode,
  isPagedMediaKind,
  resolveMediaKind
} from '../../../shared/media-kind'

interface ParsedSection {
  label: string
  lines: string[]
}

// Global cache to avoid re-generating slides unnecessarily during projection
const slideCache = new Map<string, { hash: string; slides: SlideData[] }>()

// Phase 4: Global slide config — loaded from settings on bootstrap, backward compatible
// @ts-ignore - Variable is used in generateSlidesForSong, but TypeScript doesn't recognize it through nullish coalescing
let _globalSlideConfig: { maxLines: number; maxChars: number } = { maxLines: 4, maxChars: 40 }

/**
 * Set global slide config from settings (called by useAppBootstrap).
 * Clears cache so next generation uses new config.
 */
export function setGlobalSlideConfig(config: { maxLines: number; maxChars: number }): void {
  _globalSlideConfig = config
  slideCache.clear() // invalidate cache when config changes
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
 * Split section lines into slides without breaking a semantic lyric line.
 */
function splitIntoSlides(lines: string[], maxLines: number, maxChars: number): string[][] {
  const semanticLines = markLyricLineSeparators(expandLyricLines(lines))
  const chunks: string[][] = []
  let currentChunk: string[] = []

  const flush = (): void => {
    if (currentChunk.length > 0) chunks.push(currentChunk)
    currentChunk = []
  }

  for (const semanticLine of semanticLines) {
    if (!semanticLine) {
      flush()
      continue
    }

    const wrappedSemanticLine = wrapLine(semanticLine, maxChars)
    if (currentChunk.length > 0 && currentChunk.length + wrappedSemanticLine.length > maxLines) {
      flush()
    }
    // A single singable line may exceed maxLines. Keep it intact on one slide;
    // the canvas can fit the text, while splitting it would break congregational flow.
    currentChunk.push(...wrappedSemanticLine)
  }
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
 * Helper: generate slides with metadata automatically extracted from Song object.
 * Uses global slide config from settings as default (Phase 4).
 * Explicit config param still overrides global config.
 */
export function generateSlidesForSong(
  song: Song,
  config?: { maxLines?: number; maxChars?: number }
): SlideData[] {
  const effectiveConfig = {
    maxLines: config?.maxLines ?? _globalSlideConfig.maxLines,
    maxChars: config?.maxChars ?? _globalSlideConfig.maxChars
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
    const mediaKind = resolveMediaKind({
      path,
      hasPresentationPackage: Boolean(descriptor.presentation?.slides.length)
    })
    const projectionMode = getProjectionMediaMode(mediaKind)
    if (isPagedMediaKind(mediaKind)) {
      const pageCounts = usePlaylistStore.getState().pdfPageCounts || {}
      const cachedCount = pageCounts[path]
      if (cachedCount !== undefined) {
        return Array.from({ length: cachedCount }).map((_, idx) => {
          const slideImagePath = descriptor.presentation?.slides[idx]?.imagePath
          return {
            contentType: 'media',
            songId: null,
            playlistItemId: item.id,
            slideIndex: idx,
            text: '',
            sectionLabel: descriptor.presentation?.slides[idx]?.title || `Halaman ${idx + 1}`,
            speakerNotes: descriptor.presentation?.slides[idx]?.notes || '',
            pdfPath: slideImagePath ? undefined : path,
            visualImagePath: slideImagePath,
            mediaKind,
            mediaSourcePath: path,
            mediaPageNumber: idx + 1
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
        contentType: 'media',
        songId: null,
        playlistItemId: item.id,
        slideIndex: 0,
        text: '',
        sectionLabel: item.title || 'Media',
        pdfPath: projectionMode === 'pdf' ? path : undefined,
        visualImagePath: projectionMode === 'image' ? path : undefined,
        mediaKind,
        mediaSourcePath: path,
        mediaPageNumber: projectionMode === 'pdf' ? 1 : undefined
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
