import { describe, expect, it } from 'vitest'
import { filterAllowedUpdateEntries } from './database'

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
