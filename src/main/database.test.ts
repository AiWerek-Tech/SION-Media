import type Database from 'better-sqlite3'
import { describe, expect, it } from 'vitest'
import {
  ensureSongBackgroundConfigColumn,
  filterAllowedUpdateEntries,
  tableHasColumn
} from './database'

describe('filterAllowedUpdateEntries', () => {
  it('keeps only allowed keys', () => {
    const result = filterAllowedUpdateEntries(
      {
        title: 'A',
        content: 'B',
        'title = "x", is_active': 'attack'
      },
      new Set(['title', 'content']),
      'invalid'
    )

    expect(result).toEqual([
      ['title', 'A'],
      ['content', 'B']
    ])
  })

  it('throws when no valid keys exist', () => {
    expect(() =>
      filterAllowedUpdateEntries(
        {
          'DROP TABLE songs': true,
          foo: 'bar'
        },
        new Set(['title']),
        'No valid fields.'
      )
    ).toThrow('No valid fields.')
  })
})

describe('tableHasColumn', () => {
  it('returns false when an older user database is missing an optional column', () => {
    const db = {
      pragma: (sql: string) => {
        expect(sql).toBe("table_info('songs')")
        return [{ name: 'id' }, { name: 'title' }]
      }
    }

    expect(tableHasColumn(db, 'songs', 'song_background_config')).toBe(false)
    expect(tableHasColumn(db, 'songs', 'title')).toBe(true)
  })
})

describe('ensureSongBackgroundConfigColumn', () => {
  it('repairs older user databases that missed the atmosphere migration column', () => {
    const executed: string[] = []
    const db = {
      pragma: () => [{ name: 'id' }, { name: 'title' }],
      exec: (sql: string) => {
        executed.push(sql)
        return db as unknown as Database.Database
      }
    }

    expect(ensureSongBackgroundConfigColumn(db)).toBe(true)
    expect(executed).toEqual([
      "ALTER TABLE songs ADD COLUMN song_background_config TEXT DEFAULT ''"
    ])
  })

  it('does not alter databases that already have the atmosphere column', () => {
    const executed: string[] = []
    const db = {
      pragma: () => [{ name: 'id' }, { name: 'song_background_config' }],
      exec: (sql: string) => {
        executed.push(sql)
        return db as unknown as Database.Database
      }
    }

    expect(ensureSongBackgroundConfigColumn(db)).toBe(false)
    expect(executed).toEqual([])
  })
})
