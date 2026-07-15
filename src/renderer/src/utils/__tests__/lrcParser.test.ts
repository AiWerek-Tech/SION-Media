import { describe, expect, test } from 'vitest'
import { parseLrc, stripLrcTimestamps, hasLrcTimestamps } from '../lrcParser'

describe('LRC Parser', () => {
  test('should parse standard LRC format lines', () => {
    const lrc = `
      [00:12.50]Verse 1 line 1
      [01:05]Chorus line 1
      [02:10.050]Bridge line 1
    `
    const parsed = parseLrc(lrc)
    expect(parsed).toHaveLength(3)

    expect(parsed[0].time).toBe(12.5)
    expect(parsed[0].text).toBe('Verse 1 line 1')

    expect(parsed[1].time).toBe(65.0)
    expect(parsed[1].text).toBe('Chorus line 1')

    expect(parsed[2].time).toBe(130.05)
    expect(parsed[2].text).toBe('Bridge line 1')
  })

  test('should parse lines with multiple timestamps', () => {
    const lrc = `
      [00:10][00:20]Repeated line
    `
    const parsed = parseLrc(lrc)
    expect(parsed).toHaveLength(2)

    expect(parsed[0].time).toBe(10.0)
    expect(parsed[0].text).toBe('Repeated line')

    expect(parsed[1].time).toBe(20.0)
    expect(parsed[1].text).toBe('Repeated line')
  })

  test('should sort parsed lines by time ascending', () => {
    const lrc = `
      [01:00]Later line
      [00:10]Earlier line
    `
    const parsed = parseLrc(lrc)
    expect(parsed).toHaveLength(2)
    expect(parsed[0].time).toBe(10.0)
    expect(parsed[0].text).toBe('Earlier line')
    expect(parsed[1].time).toBe(60.0)
    expect(parsed[1].text).toBe('Later line')
  })

  test('should check if LRC timestamps are present', () => {
    expect(hasLrcTimestamps('[00:15.00]Line')).toBe(true)
    expect(hasLrcTimestamps('[Bait 1] Line')).toBe(false)
    expect(hasLrcTimestamps('Line without tags')).toBe(false)
  })

  test('should strip LRC timestamps while keeping section headers', () => {
    const raw = `
      [Bait 1]
      [00:10]Line 1 of bait 1
      [00:15]Line 2 of bait 1
      
      [Chorus]
      [00:25]Chorus line 1
    `
    const stripped = stripLrcTimestamps(raw)
    expect(stripped).toContain('[Bait 1]')
    expect(stripped).toContain('[Chorus]')
    expect(stripped).not.toContain('[00:10]')
    expect(stripped).not.toContain('[00:15]')
    expect(stripped).not.toContain('[00:25]')
    expect(stripped).toContain('Line 1 of bait 1')
  })
})
