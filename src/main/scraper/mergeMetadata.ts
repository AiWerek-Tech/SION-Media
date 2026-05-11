import type { MergeStrategy, SongMetadata } from './types'

/**
 * Merge metadata from existing and incoming songs based on strategy
 *
 * Strategies:
 * - MERGE_PREFER_EXISTING: Keep existing values, only fill empty from incoming
 * - MERGE_PREFER_INCOMING: Use incoming values, keep existing only if incoming empty
 * - MERGE_FILL_EMPTY: Only fill empty fields, never overwrite non-empty
 * - MERGE_SMART: Intelligent merge - preserve non-empty, combine tags, prefer longer lyrics
 */

const METADATA_FIELDS: (keyof SongMetadata)[] = [
  'author',
  'composer',
  'key_note',
  'time_signature',
  'category',
  'tags',
  'tempo'
]

function isEmpty(value: string | undefined | null): boolean {
  return value === undefined || value === null || value.trim() === ''
}

function combineTags(existingTags: string | undefined, incomingTags: string | undefined): string {
  const existingSet = new Set(
    (existingTags ?? '')
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0)
  )
  const incomingList = (incomingTags ?? '')
    .split(',')
    .map((t) => t.trim())
    .filter((t) => t.length > 0)

  for (const tag of incomingList) {
    existingSet.add(tag)
  }

  return Array.from(existingSet).join(', ')
}

function pickLongerLyrics(
  existing: string | undefined,
  incoming: string | undefined
): string | undefined {
  if (isEmpty(existing)) return incoming
  if (isEmpty(incoming)) return existing

  const existingLen = (existing ?? '').length
  const incomingLen = (incoming ?? '').length

  // Prefer incoming if significantly longer (>20% more content)
  if (incomingLen > existingLen * 1.2) {
    return incoming
  }

  return existing
}

export function mergeMetadata(
  existing: SongMetadata,
  incoming: SongMetadata,
  strategy: MergeStrategy = 'MERGE_SMART'
): SongMetadata {
  const result: SongMetadata = {}

  switch (strategy) {
    case 'MERGE_PREFER_EXISTING':
      // Keep existing, fill empty from incoming
      for (const field of METADATA_FIELDS) {
        if (field === 'tags') {
          result.tags = !isEmpty(existing.tags) ? existing.tags : incoming.tags
        } else {
          result[field] = !isEmpty(existing[field]) ? existing[field] : incoming[field]
        }
      }
      result.lyrics_raw = !isEmpty(existing.lyrics_raw) ? existing.lyrics_raw : incoming.lyrics_raw
      result.title = existing.title // Always keep existing title
      break

    case 'MERGE_PREFER_INCOMING':
      // Use incoming, keep existing only if incoming empty
      for (const field of METADATA_FIELDS) {
        if (field === 'tags') {
          result.tags = !isEmpty(incoming.tags) ? incoming.tags : existing.tags
        } else {
          result[field] = !isEmpty(incoming[field]) ? incoming[field] : existing[field]
        }
      }
      result.lyrics_raw = !isEmpty(incoming.lyrics_raw) ? incoming.lyrics_raw : existing.lyrics_raw
      result.title = !isEmpty(incoming.title) ? incoming.title : existing.title
      break

    case 'MERGE_FILL_EMPTY':
      // Only fill empty fields, never overwrite
      for (const field of METADATA_FIELDS) {
        result[field] = !isEmpty(existing[field]) ? existing[field] : incoming[field]
      }
      result.lyrics_raw = !isEmpty(existing.lyrics_raw) ? existing.lyrics_raw : incoming.lyrics_raw
      result.title = existing.title
      break

    case 'MERGE_SMART':
    default:
      // Intelligent merge
      for (const field of METADATA_FIELDS) {
        if (field === 'tags') {
          // Combine tags from both sources
          result.tags = combineTags(existing.tags, incoming.tags)
        } else {
          // Prefer non-empty values, with existing taking priority
          result[field] = !isEmpty(existing[field]) ? existing[field] : incoming[field]
        }
      }

      // For lyrics, prefer longer content (likely more complete)
      result.lyrics_raw = pickLongerLyrics(existing.lyrics_raw, incoming.lyrics_raw)

      // Keep existing title (titles should not change in merge)
      result.title = existing.title
      break
  }

  return result
}

/**
 * Apply merge result to a scraped song, preserving its identity fields
 */
export function applyMergeToScrapedSong(
  scraped: {
    providerId: string
    sourceUrl: string
    sourceHymnalCode: string
    sourceSongNumber: string
    title: string
    lyrics_raw: string
    author?: string
    composer?: string
    key_note?: string
    time_signature?: string
    category?: string
    tags?: string
  },
  existing: SongMetadata,
  strategy: MergeStrategy = 'MERGE_SMART'
): {
  providerId: string
  sourceUrl: string
  sourceHymnalCode: string
  sourceSongNumber: string
  title: string
  lyrics_raw: string
  author?: string
  composer?: string
  key_note?: string
  time_signature?: string
  category?: string
  tags?: string
} {
  const incoming: SongMetadata = {
    title: scraped.title,
    lyrics_raw: scraped.lyrics_raw,
    author: scraped.author,
    composer: scraped.composer,
    key_note: scraped.key_note,
    time_signature: scraped.time_signature,
    category: scraped.category,
    tags: scraped.tags
  }

  const merged = mergeMetadata(existing, incoming, strategy)

  return {
    providerId: scraped.providerId,
    sourceUrl: scraped.sourceUrl,
    sourceHymnalCode: scraped.sourceHymnalCode,
    sourceSongNumber: scraped.sourceSongNumber,
    title: merged.title ?? scraped.title,
    lyrics_raw: merged.lyrics_raw ?? scraped.lyrics_raw,
    author: merged.author,
    composer: merged.composer,
    key_note: merged.key_note,
    time_signature: merged.time_signature,
    category: merged.category,
    tags: merged.tags
  }
}
