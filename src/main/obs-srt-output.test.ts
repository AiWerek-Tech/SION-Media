import { describe, expect, it, vi } from 'vitest'

vi.mock('electron', () => ({
  app: { getPath: () => 'C:\\temp' }
}))

vi.mock('./database', () => ({
  getSettings: () => ({}),
  updateSetting: vi.fn()
}))

vi.mock('./windows', () => ({
  createProjectionWindow: vi.fn(),
  getProjectionWindow: vi.fn()
}))

import { buildObsSrtOutputArgs, normalizeObsSrtConfig } from './obs-srt-output'

describe('OBS SRT output config', () => {
  it('uses a broadcast-safe 1080p30 default', () => {
    expect(normalizeObsSrtConfig({})).toMatchObject({
      port: 9000,
      width: 1920,
      height: 1080,
      fps: 30,
      bitrateMbps: 10,
      latencyMs: 300,
      audioDevice: '',
      audioBitrateKbps: 160,
      audioDelayMs: 0
    })
  })

  it('keeps resolution paired and clamps unsafe network values', () => {
    expect(
      normalizeObsSrtConfig({
        width: 1280,
        height: 1080,
        port: 80,
        bitrateMbps: 100,
        latencyMs: 20,
        audioBitrateKbps: 99 as 128,
        audioDelayMs: 9000
      })
    ).toMatchObject({
      width: 1280,
      height: 720,
      port: 1024,
      bitrateMbps: 30,
      latencyMs: 120,
      audioBitrateKbps: 160,
      audioDelayMs: 2000
    })
  })

  it('builds a low-latency MPEG-TS stream that OBS can join immediately', () => {
    const config = normalizeObsSrtConfig({ width: 1280, fps: 30, audioDevice: '' })
    const args = buildObsSrtOutputArgs(config, 'libx264')
    expect(args).toContain('+resend_headers+initial_discontinuity')
    expect(args).toContain('-flush_packets')
    expect(args).toContain('-sc_threshold')
    expect(args).toContain('30')
    expect(args.at(-1)).toContain('mode=listener&transtype=live&pkt_size=1316')
  })
})
