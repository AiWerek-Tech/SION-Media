import { mkdtempSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { afterEach, describe, expect, it } from 'vitest'
import { parseSingleByteRange, resolveAuthorizedMediaPath } from './media-security'

const tempDirs: string[] = []

afterEach(() => {
  for (const dir of tempDirs.splice(0)) rmSync(dir, { recursive: true, force: true })
})

describe('parseSingleByteRange', () => {
  it('accepts bounded, open-ended, and suffix ranges', () => {
    expect(parseSingleByteRange('bytes=2-5', 10)).toEqual({ start: 2, end: 5 })
    expect(parseSingleByteRange('bytes=7-', 10)).toEqual({ start: 7, end: 9 })
    expect(parseSingleByteRange('bytes=-3', 10)).toEqual({ start: 7, end: 9 })
  })

  it('rejects malformed and unsatisfiable ranges', () => {
    expect(parseSingleByteRange('bytes=10-', 10)).toBeNull()
    expect(parseSingleByteRange('bytes=7-2', 10)).toBeNull()
    expect(parseSingleByteRange('bytes=0-1,4-5', 10)).toBeNull()
    expect(parseSingleByteRange('items=0-1', 10)).toBeNull()
  })
})

describe('resolveAuthorizedMediaPath', () => {
  it('allows only a regular file explicitly published in the live snapshot', () => {
    const dir = mkdtempSync(join(tmpdir(), 'sion-media-security-'))
    tempDirs.push(dir)
    const published = join(dir, 'published.png')
    const secret = join(dir, 'secret.txt')
    writeFileSync(published, 'image')
    writeFileSync(secret, 'secret')

    expect(resolveAuthorizedMediaPath(published, [published])).toBeTruthy()
    expect(resolveAuthorizedMediaPath(secret, [published])).toBeNull()
    expect(resolveAuthorizedMediaPath(dir, [dir])).toBeNull()
  })
})
