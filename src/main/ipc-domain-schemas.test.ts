import { describe, expect, it } from 'vitest'
import {
  bibleBookSchema,
  bibleVersesBatchSchema,
  customSlideCreateSchema,
  hymnalCreateSchema,
  mediaBulkUpdateSchema,
  mediaImportSchema,
  parsePositiveId,
  playlistCreateSchema,
  songCreateSchema,
  songJsonImportSchema,
  songRelationSchema,
  songSearchSchema,
  songUpdateSchema
} from './ipc-domain-schemas'

describe('IPC CRUD domain schemas', () => {
  it('accepts representative UI song payloads and strips unknown fields', () => {
    const song = songCreateSchema.parse({
      hymnal_id: 1,
      number: '12',
      title: 'Kasih Setia-Mu',
      lyrics_raw: '[Verse 1]\nLirik',
      language: 'Indonesia',
      rendererOnly: true
    })
    expect(song.title).toBe('Kasih Setia-Mu')
    expect(song).not.toHaveProperty('rendererOnly')
  })

  it('rejects missing relationships, invalid IDs, and self-relations', () => {
    expect(() => parsePositiveId(0)).toThrow()
    expect(() => songRelationSchema.parse({ source_song_id: 2, target_song_id: 2 })).toThrow(
      /itself/i
    )
    expect(() => songCreateSchema.parse({ title: 'Incomplete' })).toThrow()
  })

  it('rejects empty updates and oversized domain text', () => {
    expect(() => songUpdateSchema.parse({})).toThrow(/at least one/i)
    expect(() => playlistCreateSchema.parse({ name: 'x'.repeat(201) })).toThrow()
    expect(() =>
      customSlideCreateSchema.parse({ title: 'Notice', content: 'x'.repeat(200_001) })
    ).toThrow()
  })

  it('normalizes required labels and validates binary flags', () => {
    expect(hymnalCreateSchema.parse({ code: ' KJ ', name: ' Kidung Jemaat ' })).toMatchObject({
      code: 'KJ',
      name: 'Kidung Jemaat'
    })
    expect(() => hymnalCreateSchema.parse({ code: 'KJ', name: 'Kidung', is_official: 2 })).toThrow()
  })

  it('validates media batches atomically instead of dropping invalid entries', () => {
    expect(
      mediaImportSchema.parse({
        filePaths: ['D:/media/one.mp4', 'D:/media/two.png'],
        tags: ['worship', 'service']
      }).filePaths
    ).toHaveLength(2)
    expect(() => mediaImportSchema.parse({ filePaths: ['D:/media/one.mp4', 42] })).toThrow()
    expect(() =>
      mediaBulkUpdateSchema.parse({ ids: ['asset-1', 'asset-1'], isFavorite: true })
    ).toThrow(/unique/i)
  })

  it('bounds Bible batch writes and validates canonical book metadata', () => {
    expect(
      bibleVersesBatchSchema.parse([
        { translation_id: 1, book_id: 1, chapter: 1, verse: 1, text: 'Pada mulanya' }
      ])
    ).toHaveLength(1)
    expect(() => bibleVersesBatchSchema.parse([])).toThrow()
    expect(() =>
      bibleBookSchema.parse({
        translation_id: 1,
        book_number: 1,
        short_name: 'Kej',
        long_name: 'Kejadian',
        testament: 'UNKNOWN',
        chapter_count: 50
      })
    ).toThrow()
  })

  it('bounds song imports and search pagination without coercing invalid values', () => {
    expect(
      songJsonImportSchema.parse({
        items: [{ hymnal_id: 1, number: '1', title: 'Song', lyrics_raw: 'Lyrics' }],
        conflictPolicy: 'skip',
        dryRun: true
      }).items
    ).toHaveLength(1)
    expect(() =>
      songJsonImportSchema.parse({ items: [{ number: '1', tempo: Number.POSITIVE_INFINITY }] })
    ).toThrow()
    expect(() => songSearchSchema.parse({ query: 'song', options: { limit: 501 } })).toThrow()
    expect(songSearchSchema.parse({ query: 'song', options: { offset: 0, limit: 100 } })).toEqual({
      query: 'song',
      options: { offset: 0, limit: 100 }
    })
  })
})
