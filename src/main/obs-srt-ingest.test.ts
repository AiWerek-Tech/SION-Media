import { describe, expect, it } from 'vitest'
import {
  buildMediaMtxConfig,
  buildObsSrtPublisherUrl,
  normalizeObsSrtIngestConfig,
  obsSrtIngestPatchRequiresRestart
} from './obs-srt-ingest'

describe('OBS SRT ingest configuration', () => {
  it('normalizes the gateway contract with a persistent stream path', () => {
    const config = normalizeObsSrtIngestConfig(
      {
        autoStart: true,
        srtPort: 8890,
        hlsPort: 8888,
        webrtcPort: 8889,
        webrtcUdpPort: 8189,
        apiPort: 9997,
        streamPath: 'sion-0123456789abcdef'
      },
      'sion-fedcba9876543210'
    )
    expect(config.streamPath).toBe('sion-0123456789abcdef')
    expect(config.autoStart).toBe(true)
  })

  it('rejects colliding listener ports', () => {
    expect(() => normalizeObsSrtIngestConfig({ srtPort: 8890, hlsPort: 8890 })).toThrow(
      /harus berbeda/i
    )
  })

  it('generates SRT ingest, low-latency HLS, WebRTC and local-only API', () => {
    const config = normalizeObsSrtIngestConfig({ streamPath: 'sion-0123456789abcdef' })
    const yaml = buildMediaMtxConfig(config)
    expect(yaml).toContain('srtAddress: :8890')
    expect(yaml).toContain('hlsVariant: lowLatency')
    expect(yaml).toContain('webrtcAddress: :8889')
    expect(yaml).toContain('apiAddress: 127.0.0.1:9997')
    expect(yaml).toContain("'sion-0123456789abcdef':")
    expect(yaml).toContain('rtmp: false')
  })

  it('generates an explicit OBS caller URL with the persistent MediaMTX stream ID', () => {
    const config = normalizeObsSrtIngestConfig({ streamPath: 'sion-0123456789abcdef' })
    expect(buildObsSrtPublisherUrl('192.168.1.60', config)).toBe(
      'srt://192.168.1.60:8890?mode=caller&streamid=publish:sion-0123456789abcdef&pkt_size=1316&latency=200000'
    )
  })

  it('allows auto-start changes while requiring a restart for listener changes', () => {
    expect(obsSrtIngestPatchRequiresRestart({ autoStart: true })).toBe(false)
    expect(obsSrtIngestPatchRequiresRestart({ srtPort: 8891 })).toBe(true)
    expect(obsSrtIngestPatchRequiresRestart({ resetStreamKey: true })).toBe(true)
  })
})
