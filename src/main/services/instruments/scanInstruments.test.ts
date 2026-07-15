import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { afterEach, describe, expect, it } from 'vitest'
import { parseInstrumentFilename, scanInstrumentFolder } from './scanInstruments'

const tempDirs: string[] = []

afterEach(() => {
  for (const dir of tempDirs.splice(0)) rmSync(dir, { recursive: true, force: true })
})

describe('instrument scanner', () => {
  it('parses supported hymnal filename variants', () => {
    expect(parseInstrumentFilename('KJ 001.mp3')).toEqual({ hymnalCode: 'KJ', number: 1 })
    expect(parseInstrumentFilename('12-NyanyikanlahKidungBaru.wav')).toEqual({
      hymnalCode: 'NKB',
      number: 12
    })
    expect(parseInstrumentFilename('notes.txt')).toBeNull()
  })

  it('streams regular files and ignores nested directories', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'sion-instruments-'))
    tempDirs.push(dir)
    writeFileSync(join(dir, 'KJ 2.mp3'), 'audio')
    writeFileSync(join(dir, 'ignore.txt'), 'text')
    mkdirSync(join(dir, 'KJ 3.mp3'))

    await expect(scanInstrumentFolder(dir)).resolves.toEqual([
      { hymnalCode: 'KJ', number: 2, filePath: join(dir, 'KJ 2.mp3') }
    ])
  })
})
