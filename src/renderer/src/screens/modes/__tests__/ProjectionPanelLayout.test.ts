import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const projectionModeSource = readFileSync(
  resolve(process.cwd(), 'src/renderer/src/screens/modes/ProjectionMode.tsx'),
  'utf8'
)
const localMediaPanelSource = readFileSync(
  resolve(process.cwd(), 'src/renderer/src/components/projection/LocalMediaPanel.tsx'),
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

  it('notifies operators when a PowerPoint Bridge request needs approval', () => {
    expect(projectionModeSource).toContain('notifiedPowerPointRequestIds')
    expect(projectionModeSource).toContain('Permintaan PowerPoint Bridge')
    expect(projectionModeSource).toContain('Buka tab PPT untuk Izinkan atau Tolak')
    expect(projectionModeSource).toContain('pendingPowerPointRequests')
  })

  it('keeps local media classified separately from info/custom slides', () => {
    expect(projectionModeSource).toContain('resolveMediaKind')
    expect(projectionModeSource).toContain("contentType: 'media'")
    expect(localMediaPanelSource).toContain('getMediaKindLabel')
    expect(localMediaPanelSource).toContain('getMediaKindCapability')
    expect(localMediaPanelSource).toContain('Muat media ini ke Preview')
    expect(localMediaPanelSource).toContain('Tekan TAKE untuk menayangkan')
  })
})
