import { readFileSync } from 'fs'
import { join } from 'path'
import { describe, expect, it } from 'vitest'

describe('PowerPoint Bridge operator approval contract', () => {
  const server = readFileSync(join(process.cwd(), 'src/main/presenter-remote-server.ts'), 'utf8')
  const panel = readFileSync(
    join(process.cwd(), 'src/renderer/src/components/projection/PowerPointBridgePanel.tsx'),
    'utf8'
  )
  const app = readFileSync(join(process.cwd(), 'src/renderer/src/App.tsx'), 'utf8')

  it('requires an approved device token before accepting native bridge frames', () => {
    expect(server).toContain("url.pathname === '/api/powerpoint-bridge/request'")
    expect(server).toContain('approvePowerPointBridgeRequest')
    expect(server).toContain('const bridgeToken = String(payload.bridgeToken')
    expect(server).toContain('powerPointBridgeSessions.get(bridgeToken)')
  })

  it('publishes current, next and speaker-note data without sender-controlled auto-live', () => {
    expect(server).toContain('payload.nextImageDataUrl')
    expect(server).toContain('nextImagePath')
    expect(server).toContain("notes: String(payload.notes ?? '').slice(0, 100_000)")
    expect(server).not.toContain('autoTake: payload.autoTake')
    expect(app).toContain(
      'if (bridge.autoPreview) loadPowerPointBridgeSource(bridgeSource, bridge.autoLive)'
    )
  })

  it('keeps preview and live decisions in the SION Media operator panel', () => {
    expect(panel).toContain('approvePowerPointRequest')
    expect(panel).toContain('rejectPowerPointRequest')
    expect(panel).toContain('Muat ke Preview')
    expect(panel).toContain('Tayangkan')
    expect(panel).toContain('Ikuti perubahan langsung ke Live')
  })
})
