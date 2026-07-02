import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, test } from 'vitest'

describe('PlaylistPanel modal contract', () => {
  test('uses the shared portal modal instead of a panel-local fixed overlay', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'src/renderer/src/components/PlaylistPanel.tsx'),
      'utf8'
    )

    expect(source).toContain("from '@renderer/components/modals/Modal'")
    expect(source).toContain('<Modal')
    expect(source).not.toContain('className="fixed inset-0 z-[200]')
  })
})
