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
    expect(server).toContain("url.pathname === '/api/presentation-bridge/ws'")
    expect(server).toContain('approvePowerPointBridgeRequest')
    expect(server).toContain("const bridgeToken = String(req.headers['x-sion-bridge-token']")
    expect(server).toContain('powerPointBridgeSessions.get(bridgeToken)')
  })

  it('publishes binary frames through memory-first state without sender-controlled auto-live', () => {
    expect(server).toContain('powerPointBridgeFrameStore.set')
    expect(server).toContain('sendPresentationFrame')
    expect(server).toContain('isValidJpeg(bytes)')
    expect(server).toContain(
      "notes: String(message.notes ?? source?.notes ?? '').slice(0, 100_000)"
    )
    expect(server).not.toContain('autoTake: payload.autoTake')
    expect(app).toContain('updateLivePowerPointBridgeFrame(bridgeSource)')
    expect(app).not.toContain('loadPowerPointBridgeSource(bridgeSource, true)')
  })

  it('keeps preview and live decisions in the SION Media operator panel', () => {
    expect(panel).toContain('approvePowerPointRequest')
    expect(panel).toContain('rejectPowerPointRequest')
    expect(panel).toContain('Muat ke Preview')
    expect(panel).toContain('Tayangkan')
    expect(panel).toContain('Ikuti Live setelah TAKE')
  })
})
