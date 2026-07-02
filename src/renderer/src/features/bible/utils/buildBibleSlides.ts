import type { PlaylistItem, SlideData } from '@renderer/types'

export interface BibleSlideVerse {
  verse: number
  text: string
  book_code?: string
  book_name?: string
  chapter?: number
}

interface BuildBibleSlidesOptions {
  verses: BibleSlideVerse[]
  bookName: string
  chapter: number
  versionShortName?: string
  versionCode?: string
  copyright?: string
  playlistItemId?: number | null
}

/**
 * Creates one projection slide per verse. Long verses remain intact and are
 * fitted by the presentation canvas instead of being split arbitrarily.
 */
export function buildBibleSlidesFromVerses({
  verses,
  bookName,
  chapter,
  versionShortName = '',
  versionCode = '',
  copyright = '',
  playlistItemId = null
}: BuildBibleSlidesOptions): SlideData[] {
  return verses
    .filter((verse) => verse.text.trim().length > 0)
    .map((verse, slideIndex) => {
      const reference = `${bookName} ${chapter}:${verse.verse}`
      const displayReference = versionShortName ? `${reference} · ${versionShortName}` : reference

      return {
        contentType: 'bible',
        songId: null,
        playlistItemId,
        slideIndex,
        text: `[${verse.verse}] ${verse.text.trim()}`,
        sectionLabel: reference,
        bibleReference: displayReference,
        bibleVersionCode: versionCode || undefined,
        bibleCopyright: copyright
      }
    })
}

/** Builds Bible slides from the immutable verse snapshot stored in a playlist. */
export function buildBibleSlidesFromPlaylistItem(item: PlaylistItem): SlideData[] {
  if (!item.bible_text_json) return []

  let verses: BibleSlideVerse[] = []
  try {
    verses = JSON.parse(item.bible_text_json) as BibleSlideVerse[]
  } catch (error) {
    console.error('Failed to parse bible_text_json snapshot:', error)
    return []
  }

  if (!Array.isArray(verses) || verses.length === 0) return []

  return buildBibleSlidesFromVerses({
    verses,
    bookName: item.bible_book_name || verses[0].book_name || '',
    chapter: item.bible_chapter || verses[0].chapter || 0,
    versionShortName: item.bible_version_short_name || item.bible_version_code || '',
    versionCode: item.bible_version_code || '',
    copyright: item.bible_copyright || '',
    playlistItemId: item.id
  })
}
