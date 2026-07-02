import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, test } from 'vitest'

const root = process.cwd()
const packageJson = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8')) as {
  version: string
}
const packageLock = JSON.parse(readFileSync(resolve(root, 'package-lock.json'), 'utf8')) as {
  version: string
  packages: Record<string, { version?: string }>
}
const changelog = readFileSync(resolve(root, 'CHANGELOG.md'), 'utf8')

describe('production release metadata', () => {
  test('keeps beta.2 version synchronized across package metadata', () => {
    expect(packageJson.version).toBe('1.0.0-beta.2')
    expect(packageLock.version).toBe(packageJson.version)
    expect(packageLock.packages['']?.version).toBe(packageJson.version)
  })

  test('includes release notes for the packaged version', () => {
    expect(changelog).toContain(`## ${packageJson.version} - 2026-07-02`)
  })
})
