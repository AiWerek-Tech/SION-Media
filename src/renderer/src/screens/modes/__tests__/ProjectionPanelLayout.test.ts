import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const projectionModeSource = readFileSync(
  resolve(process.cwd(), 'src/renderer/src/screens/modes/ProjectionMode.tsx'),
  'utf8'
)
const mainCssSource = readFileSync(
  resolve(process.cwd(), 'src/renderer/src/assets/main.css'),
  'utf8'
)

describe('Projection utility panel source contract', () => {
  it('keeps Song Info inside an explicit internal scroll viewport', () => {
    expect(projectionModeSource).toContain(
      'projection-song-panel__scroll projection-song-panel__scroll--info'
    )
    expect(projectionModeSource).toContain('projection-song-panel__actions')
    expect(mainCssSource).toMatch(
      /\.projection-song-panel__scroll\s*\{[^}]*overflow-y:\s*auto;[^}]*scrollbar-width:\s*thin;/s
    )
  })

  it('does not expose the unused Notifications panel', () => {
    expect(projectionModeSource).not.toContain("'notifications'")
    expect(projectionModeSource).not.toContain('<NotificationPanel />')
    expect(projectionModeSource).not.toContain('notificationUnread')
  })
})
