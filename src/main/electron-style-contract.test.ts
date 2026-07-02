import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, test } from 'vitest'

const css = readFileSync(resolve(process.cwd(), 'src/renderer/src/assets/main.css'), 'utf8')

describe('Electron UI style contract', () => {
  test('keeps the app viewport bounded and uses border-box sizing', () => {
    expect(css).toMatch(/html,\s*body,\s*#root\s*{[^}]*overflow:\s*hidden/s)
    expect(css).toMatch(/\*\s*{[^}]*box-sizing:\s*border-box/s)
  })

  test('keeps interactive controls outside frameless drag regions', () => {
    expect(css).toMatch(
      /button,\s*a,\s*input,\s*select,\s*textarea,[^{]*{[^}]*-webkit-app-region:\s*no-drag/s
    )
  })

  test('allows form text selection and prevents fields from exceeding panels', () => {
    expect(css).toMatch(/input,\s*select,\s*textarea,[^{]*{[^}]*min-width:\s*0/s)
    expect(css).toMatch(/input,\s*select,\s*textarea,[^{]*{[^}]*user-select:\s*text/s)
  })
})
