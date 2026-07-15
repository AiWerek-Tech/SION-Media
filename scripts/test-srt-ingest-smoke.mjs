/* eslint-disable @typescript-eslint/explicit-function-return-type */
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const ffmpeg = join(root, 'resources', 'ffmpeg', 'ffmpeg.exe')
const mediamtx = join(root, 'resources', 'mediamtx', 'mediamtx.exe')
const ports = { srt: 28890, hls: 28888, webrtc: 28889, webrtcUdp: 28189, api: 29997 }
const pathName = 'sion-smoke-test'

function wait(ms) {
  return new Promise((resolveWait) => setTimeout(resolveWait, ms))
}

async function waitFor(url, validate, timeoutMs = 12_000) {
  const deadline = Date.now() + timeoutMs
  let lastError
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(1200) })
      if (response.ok) {
        const body = await response.text()
        if (validate(body)) return body
      }
    } catch (error) {
      lastError = error
    }
    await wait(250)
  }
  throw lastError || new Error(`Timed out waiting for ${url}`)
}

async function main() {
  if (process.platform !== 'win32') return console.log('[SRT smoke] Skipped outside Windows.')
  if (!existsSync(ffmpeg) || !existsSync(mediamtx)) {
    throw new Error('Run npm run prepare:streaming before the SRT smoke test.')
  }
  const workDir = join(tmpdir(), `sion-srt-smoke-${process.pid}-${Date.now()}`)
  const configPath = join(workDir, 'mediamtx.yml')
  await mkdir(workDir, { recursive: true })
  await writeFile(
    configPath,
    `logLevel: warn
api: true
apiAddress: 127.0.0.1:${ports.api}
rtsp: false
rtmp: false
hls: true
hlsAddress: 127.0.0.1:${ports.hls}
hlsAlwaysRemux: true
hlsVariant: lowLatency
webrtc: true
webrtcAddress: 127.0.0.1:${ports.webrtc}
webrtcLocalUDPAddress: 127.0.0.1:${ports.webrtcUdp}
srt: true
srtAddress: 127.0.0.1:${ports.srt}
paths:
  ${pathName}:
    source: publisher
`,
    'utf8'
  )

  const gateway = spawn(mediamtx, [configPath], { windowsHide: true })
  let gatewayLog = ''
  gateway.stdout.on('data', (chunk) => (gatewayLog += chunk.toString()))
  gateway.stderr.on('data', (chunk) => (gatewayLog += chunk.toString()))
  let publisher
  try {
    await wait(700)
    publisher = spawn(
      ffmpeg,
      [
        '-hide_banner',
        '-loglevel',
        'error',
        '-re',
        '-f',
        'lavfi',
        '-i',
        'testsrc=size=640x360:rate=25',
        '-f',
        'lavfi',
        '-i',
        'sine=frequency=880:sample_rate=48000',
        '-c:v',
        'libx264',
        '-preset',
        'ultrafast',
        '-tune',
        'zerolatency',
        '-pix_fmt',
        'yuv420p',
        '-g',
        '50',
        '-c:a',
        'aac',
        '-b:a',
        '128k',
        '-ar',
        '48000',
        '-ac',
        '2',
        '-f',
        'mpegts',
        `srt://127.0.0.1:${ports.srt}?mode=caller&streamid=publish:${pathName}&pkt_size=1316&latency=200000`
      ],
      { windowsHide: true }
    )
    let publisherLog = ''
    publisher.stderr.on('data', (chunk) => (publisherLog += chunk.toString()))
    publisher.once('exit', (code) => {
      if (code && code !== 0) console.error(`[SRT smoke] Publisher exited ${code}: ${publisherLog}`)
    })

    await waitFor(
      `http://127.0.0.1:${ports.api}/v3/paths/get/${pathName}`,
      (body) => JSON.parse(body).ready === true
    )
    await waitFor(`http://127.0.0.1:${ports.hls}/${pathName}/index.m3u8`, (body) =>
      body.includes('#EXTM3U')
    )
    await waitFor(`http://127.0.0.1:${ports.webrtc}/${pathName}`, (body) =>
      body.toLowerCase().includes('<html')
    )
    console.log(
      '[SRT smoke] PASS: SRT H.264/AAC ingest, HLS audio/video, API and WebRTC endpoint are ready.'
    )
  } catch (error) {
    throw new Error(`${error instanceof Error ? error.message : String(error)}\n${gatewayLog}`)
  } finally {
    publisher?.kill()
    gateway.kill()
    await rm(workDir, { recursive: true, force: true })
  }
}

main().catch((error) => {
  console.error(`[SRT smoke] FAIL: ${error instanceof Error ? error.message : String(error)}`)
  process.exitCode = 1
})
