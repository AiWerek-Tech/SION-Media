import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const mainCss = readFileSync(resolve(process.cwd(), 'src/renderer/src/assets/main.css'), 'utf8')

function rule(selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return mainCss.match(new RegExp(`${escaped}\\s*\\{([^}]*)\\}`))?.[1] ?? ''
}

describe('Bible workspace layout contract', () => {
  it('prevents verse actions from creating horizontal scroll and clipping text', () => {
    expect(rule('.bible-verse-list')).toMatch(/overflow-x\s*:\s*hidden/)
    expect(rule('.bible-verse-card')).toMatch(/overflow\s*:\s*hidden/)
    expect(rule('.bible-verse-card')).toMatch(/flex-shrink\s*:\s*0/)
    expect(rule('.bible-verse-card')).toMatch(/min-width\s*:\s*0/)
    expect(rule('.bible-verse-card')).toMatch(/max-width\s*:\s*100%/)
    expect(rule('.bible-verse-card__text')).toMatch(/overflow-wrap\s*:\s*anywhere/)
    expect(rule('.bible-center')).toMatch(/width\s*:\s*0/)
    expect(rule('.bible-center')).toMatch(/overflow\s*:\s*hidden/)
    expect(rule('.bible-verse-card__body')).toMatch(/width\s*:\s*0/)
    expect(rule('.bible-verse-card__body')).toMatch(/max-width\s*:\s*100%/)
    expect(rule('.bible-chapter-rail__scroll')).toMatch(/flex\s*:\s*1/)
    expect(rule('.bible-chapter-rail__scroll')).toMatch(/min-width\s*:\s*0/)
  })

  it('has desktop breakpoints for sidebar and inspector widths', () => {
    expect(mainCss).toContain('@media (max-width: 1440px)')
    expect(mainCss).toContain('@media (max-width: 1180px)')
    expect(mainCss).toMatch(/\.bible-sidebar\s*\{[^}]*width\s*:\s*clamp\(/s)
    expect(mainCss).toMatch(
      /\.library-pro-content\.is-bible-workspace\s*\{[^}]*grid-template-columns\s*:[^;]*clamp\(/s
    )
    expect(rule('.bible-inspector__tabs button')).toMatch(/white-space\s*:\s*nowrap/)
  })

  it('keeps the fullscreen toolbar clear of native window controls', () => {
    const toolbarRule = rule('.bible-reader__toolbar')
    expect(toolbarRule).toMatch(/display\s*:\s*grid/)
    expect(toolbarRule).toMatch(/padding\s*:[^;]*168px/)
    expect(toolbarRule).not.toContain('titlebar-area-width')
    expect(rule('.bible-reader__settings-panel')).toMatch(/position\s*:\s*absolute/)
  })
})
