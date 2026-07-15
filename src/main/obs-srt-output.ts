import { spawn, spawnSync, type ChildProcessWithoutNullStreams } from 'child_process'
import { existsSync } from 'fs'
import { networkInterfaces } from 'os'
import { delimiter, join } from 'path'
import { app } from 'electron'
import { getSettings, updateSetting } from './database'
import { createProjectionWindow, getProjectionWindow } from './windows'

export interface ObsSrtConfig {
  port: number
  width: 1280 | 1920
  height: 720 | 1080
  fps: 25 | 30
  bitrateMbps: number
  latencyMs: number
  ffmpegPath: string
  audioDevice: string
  audioBitrateKbps: 128 | 160 | 192
  audioDelayMs: number
}

export interface ObsSrtStatus {
  state: 'stopped' | 'starting' | 'listening' | 'error'
  available: boolean
  config: ObsSrtConfig
  encoderPath: string | null
  encoder: string | null
  audioDevices: string[]
  obsUrls: string[]
  framesSent: number
  framesDropped: number
  error: string | null
}

const DEFAULT_CONFIG: ObsSrtConfig = {
  port: 9000,
  width: 1920,
  height: 1080,
  fps: 30,
  bitrateMbps: 10,
  latencyMs: 300,
  ffmpegPath: '',
  audioDevice: '',
  audioBitrateKbps: 160,
  audioDelayMs: 0
}

let processRef: ChildProcessWithoutNullStreams | null = null
let captureTimer: NodeJS.Timeout | null = null
let captureInFlight = false
let acceptingFrames = true
let framesSent = 0
let framesDropped = 0
let lastError: string | null = null
let activeEncoderPath: string | null = null
let activeEncoder: string | null = null
let state: ObsSrtStatus['state'] = 'stopped'
let requestedRunning = false
let restartTimer: NodeJS.Timeout | null = null
let runtimeGeneration = 0
let encoderResolutionCache: {
  key: string
  value: { path: string; encoder: string } | null
} | null = null
const audioDeviceCache = new Map<string, string[]>()

function clampInteger(value: unknown, fallback: number, min: number, max: number): number {
  const parsed = Number(value)
  return Number.isInteger(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback
}

export function normalizeObsSrtConfig(value: Partial<ObsSrtConfig>): ObsSrtConfig {
  const width = Number(value.width) === 1280 ? 1280 : 1920
  return {
    port: clampInteger(value.port, DEFAULT_CONFIG.port, 1024, 65535),
    width,
    height: width === 1280 ? 720 : 1080,
    fps: Number(value.fps) === 25 ? 25 : 30,
    bitrateMbps: clampInteger(value.bitrateMbps, DEFAULT_CONFIG.bitrateMbps, 4, 30),
    latencyMs: clampInteger(value.latencyMs, DEFAULT_CONFIG.latencyMs, 120, 3000),
    ffmpegPath: typeof value.ffmpegPath === 'string' ? value.ffmpegPath.trim() : '',
    audioDevice:
      typeof value.audioDevice === 'string' ? value.audioDevice.trim().slice(0, 256) : '',
    audioBitrateKbps: ([128, 160, 192] as const).includes(value.audioBitrateKbps as 128 | 160 | 192)
      ? (value.audioBitrateKbps as 128 | 160 | 192)
      : DEFAULT_CONFIG.audioBitrateKbps,
    audioDelayMs: clampInteger(value.audioDelayMs, 0, -2000, 2000)
  }
}

function loadConfig(): ObsSrtConfig {
  const settings = getSettings()
  return normalizeObsSrtConfig({
    port: Number(settings.obs_srt_port),
    width: Number(settings.obs_srt_width) as 1280 | 1920,
    fps: Number(settings.obs_srt_fps) as 25 | 30,
    bitrateMbps: Number(settings.obs_srt_bitrate_mbps),
    latencyMs: Number(settings.obs_srt_latency_ms),
    ffmpegPath: settings.obs_srt_ffmpeg_path ?? '',
    audioDevice: settings.obs_srt_audio_device ?? '',
    audioBitrateKbps: Number(settings.obs_srt_audio_bitrate_kbps) as 128 | 160 | 192,
    audioDelayMs: Number(settings.obs_srt_audio_delay_ms)
  })
}

function persistConfig(config: ObsSrtConfig): void {
  updateSetting('obs_srt_port', String(config.port))
  updateSetting('obs_srt_width', String(config.width))
  updateSetting('obs_srt_fps', String(config.fps))
  updateSetting('obs_srt_bitrate_mbps', String(config.bitrateMbps))
  updateSetting('obs_srt_latency_ms', String(config.latencyMs))
  updateSetting('obs_srt_ffmpeg_path', config.ffmpegPath)
  updateSetting('obs_srt_audio_device', config.audioDevice)
  updateSetting('obs_srt_audio_bitrate_kbps', String(config.audioBitrateKbps))
  updateSetting('obs_srt_audio_delay_ms', String(config.audioDelayMs))
}

function listAudioDevices(ffmpegPath: string | null): string[] {
  if (!ffmpegPath || process.platform !== 'win32') return []
  const cached = audioDeviceCache.get(ffmpegPath)
  if (cached) return cached
  const result = spawnSync(
    ffmpegPath,
    ['-hide_banner', '-list_devices', 'true', '-f', 'dshow', '-i', 'dummy'],
    { encoding: 'utf8', windowsHide: true, timeout: 7000 }
  )
  const text = `${result.stdout ?? ''}\n${result.stderr ?? ''}`
  const devices: string[] = []
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/"(.+)"\s+\(audio\)\s*$/)
    if (match?.[1] && !devices.includes(match[1])) devices.push(match[1])
  }
  audioDeviceCache.set(ffmpegPath, devices)
  return devices
}

function executableCandidates(config: ObsSrtConfig): string[] {
  const names = process.platform === 'win32' ? ['ffmpeg.exe'] : ['ffmpeg']
  const candidates = [
    config.ffmpegPath,
    process.env.FFMPEG_PATH ?? '',
    ...names.map((name) => join(process.resourcesPath, 'ffmpeg', name)),
    ...names.map((name) => join(app.getPath('userData'), 'ffmpeg', name))
  ]
  for (const folder of (process.env.PATH ?? '').split(delimiter)) {
    if (folder) candidates.push(...names.map((name) => join(folder, name)))
  }
  return Array.from(new Set(candidates.filter(Boolean)))
}

function inspectFfmpeg(path: string): { supportsSrt: boolean; encoder: string | null } {
  const protocols = spawnSync(path, ['-hide_banner', '-protocols'], {
    encoding: 'utf8',
    windowsHide: true,
    timeout: 5000
  })
  const protocolText = `${protocols.stdout ?? ''}\n${protocols.stderr ?? ''}`
  if (protocols.error || !/(?:^|\s)srt(?:\s|$)/m.test(protocolText)) {
    return { supportsSrt: false, encoder: null }
  }
  const encoders = spawnSync(path, ['-hide_banner', '-encoders'], {
    encoding: 'utf8',
    windowsHide: true,
    timeout: 5000
  })
  const text = `${encoders.stdout ?? ''}\n${encoders.stderr ?? ''}`
  const preferred = ['libx264', 'h264_mf', 'h264_qsv', 'h264_nvenc', 'h264_amf']
  return {
    supportsSrt: true,
    encoder: preferred.find((name) => new RegExp(`\\b${name}\\b`).test(text)) ?? null
  }
}

function resolveEncoder(config: ObsSrtConfig): { path: string; encoder: string } | null {
  const cacheKey = `${config.ffmpegPath}|${process.env.FFMPEG_PATH ?? ''}|${process.env.PATH ?? ''}`
  if (encoderResolutionCache?.key === cacheKey) return encoderResolutionCache.value
  for (const candidate of executableCandidates(config)) {
    if (!existsSync(candidate)) continue
    const inspection = inspectFfmpeg(candidate)
    if (inspection.supportsSrt && inspection.encoder) {
      const value = { path: candidate, encoder: inspection.encoder }
      encoderResolutionCache = { key: cacheKey, value }
      return value
    }
  }
  encoderResolutionCache = { key: cacheKey, value: null }
  return null
}

function localIpv4Addresses(): string[] {
  const addresses = new Set<string>(['127.0.0.1'])
  for (const entries of Object.values(networkInterfaces())) {
    for (const entry of entries ?? []) {
      if (entry.family === 'IPv4' && !entry.internal) addresses.add(entry.address)
    }
  }
  return Array.from(addresses)
}

function buildObsUrls(config: ObsSrtConfig): string[] {
  return localIpv4Addresses().map(
    (host) =>
      `srt://${host}:${config.port}?mode=caller&transtype=live&pkt_size=1316&latency=${config.latencyMs * 1000}`
  )
}

export function getObsSrtStatus(): ObsSrtStatus {
  const config = loadConfig()
  const resolved = processRef ? null : resolveEncoder(config)
  const encoderPath = activeEncoderPath ?? resolved?.path ?? null
  return {
    state,
    available: Boolean(activeEncoderPath || resolved),
    config,
    encoderPath,
    encoder: activeEncoder ?? resolved?.encoder ?? null,
    audioDevices: listAudioDevices(encoderPath),
    obsUrls: buildObsUrls(config),
    framesSent,
    framesDropped,
    error: lastError
  }
}

export function updateObsSrtConfig(value: Partial<ObsSrtConfig>): ObsSrtStatus {
  if (requestedRunning) throw new Error('Hentikan OBS Network Output sebelum mengubah pengaturan.')
  const config = normalizeObsSrtConfig({ ...loadConfig(), ...value })
  persistConfig(config)
  encoderResolutionCache = null
  lastError = null
  return getObsSrtStatus()
}

function encoderArgs(encoder: string): string[] {
  if (encoder === 'libx264') {
    return ['-c:v', encoder, '-preset', 'ultrafast', '-tune', 'zerolatency', '-threads', '0']
  }
  return ['-c:v', encoder]
}

async function captureFrame(config: ObsSrtConfig): Promise<void> {
  if (!processRef || captureInFlight) return
  if (!acceptingFrames) {
    framesDropped += 1
    return
  }
  let projectionWindow = getProjectionWindow()
  if (!projectionWindow || projectionWindow.isDestroyed()) {
    createProjectionWindow()
    projectionWindow = getProjectionWindow()
  }
  if (!projectionWindow || projectionWindow.isDestroyed()) return

  captureInFlight = true
  try {
    projectionWindow.webContents.invalidate()
    const image = await projectionWindow.webContents.capturePage()
    if (image.isEmpty() || !processRef) return
    const bitmap = image
      .resize({ width: config.width, height: config.height, quality: 'best' })
      .toBitmap({ scaleFactor: 1 })
    const expectedBytes = config.width * config.height * 4
    if (bitmap.length !== expectedBytes) {
      framesDropped += 1
      lastError = `Ukuran frame encoder tidak valid (${bitmap.length}/${expectedBytes} byte).`
      return
    }
    acceptingFrames = processRef.stdin.write(bitmap)
    framesSent += 1
  } catch (error) {
    framesDropped += 1
    lastError = error instanceof Error ? error.message : String(error)
  } finally {
    captureInFlight = false
  }
}

export function buildObsSrtOutputArgs(
  config: ObsSrtConfig,
  encoder: string,
  outputUrl = `srt://0.0.0.0:${config.port}?mode=listener&transtype=live&pkt_size=1316&latency=${config.latencyMs * 1000}`
): string[] {
  const audioEnabled = Boolean(config.audioDevice)
  const videoInputArgs = [
    '-hide_banner',
    '-loglevel',
    'warning',
    '-fflags',
    '+genpts+nobuffer',
    '-thread_queue_size',
    '2',
    '-f',
    'rawvideo',
    '-pixel_format',
    'bgra',
    '-video_size',
    `${config.width}x${config.height}`,
    '-framerate',
    String(config.fps),
    '-i',
    'pipe:0'
  ]
  const audioInputArgs = audioEnabled
    ? [
        ...(config.audioDelayMs > 0 ? ['-itsoffset', (config.audioDelayMs / 1000).toFixed(3)] : []),
        '-thread_queue_size',
        '1024',
        '-f',
        'dshow',
        '-i',
        `audio=${config.audioDevice}`
      ]
    : []
  const audioOutputArgs = audioEnabled
    ? [
        '-map',
        '0:v:0',
        '-map',
        '1:a:0',
        ...(config.audioDelayMs < 0
          ? ['-af', `atrim=start=${Math.abs(config.audioDelayMs) / 1000},asetpts=PTS-STARTPTS`]
          : []),
        '-c:a',
        'aac',
        '-b:a',
        `${config.audioBitrateKbps}k`,
        '-ar',
        '48000',
        '-ac',
        '2'
      ]
    : ['-map', '0:v:0', '-an']
  return [
    ...videoInputArgs,
    ...audioInputArgs,
    ...encoderArgs(encoder),
    '-pix_fmt',
    'yuv420p',
    '-g',
    String(config.fps),
    '-keyint_min',
    String(config.fps),
    '-sc_threshold',
    '0',
    '-b:v',
    `${config.bitrateMbps}M`,
    '-maxrate',
    `${config.bitrateMbps}M`,
    '-bufsize',
    `${config.bitrateMbps * 2}M`,
    ...audioOutputArgs,
    '-f',
    'mpegts',
    '-mpegts_flags',
    '+resend_headers+initial_discontinuity',
    '-muxdelay',
    '0',
    '-muxpreload',
    '0',
    '-flush_packets',
    '1',
    outputUrl
  ]
}

function scheduleObsSrtRestart(
  config: ObsSrtConfig,
  resolved: { path: string; encoder: string },
  generation: number,
  detail: string
): void {
  if (!requestedRunning || generation !== runtimeGeneration) return
  if (restartTimer) clearTimeout(restartTimer)
  state = 'starting'
  lastError = `Koneksi OBS terputus (${detail}). Menunggu sambungan ulang otomatis...`
  restartTimer = setTimeout(() => {
    restartTimer = null
    if (requestedRunning && generation === runtimeGeneration) {
      launchObsSrtProcess(config, resolved, generation)
    }
  }, 700)
}

function launchObsSrtProcess(
  config: ObsSrtConfig,
  resolved: { path: string; encoder: string },
  generation: number
): void {
  if (!requestedRunning || generation !== runtimeGeneration) return
  const outputUrl = `srt://0.0.0.0:${config.port}?mode=listener&transtype=live&pkt_size=1316&latency=${config.latencyMs * 1000}`
  const child = spawn(resolved.path, buildObsSrtOutputArgs(config, resolved.encoder, outputUrl), {
    windowsHide: true
  })
  processRef = child
  acceptingFrames = true
  state = 'listening'
  lastError = null
  let stderrTail = ''

  child.stdin.on('drain', () => {
    acceptingFrames = true
  })
  child.stdin.on('error', (error) => {
    stderrTail = error.message
  })
  child.stderr.on('data', (chunk: Buffer) => {
    const message = chunk.toString().trim()
    if (message) stderrTail = `${stderrTail}\n${message}`.trim().slice(-1200)
  })
  child.once('error', (error) => {
    if (processRef === child) processRef = null
    scheduleObsSrtRestart(config, resolved, generation, error.message)
  })
  child.once('exit', (code, signal) => {
    if (processRef === child) processRef = null
    acceptingFrames = true
    if (!requestedRunning || generation !== runtimeGeneration) return
    scheduleObsSrtRestart(
      config,
      resolved,
      generation,
      stderrTail || `FFmpeg exit ${code ?? signal ?? 'unknown'}`
    )
  })
}

export async function startObsSrtOutput(): Promise<ObsSrtStatus> {
  if (requestedRunning) return getObsSrtStatus()
  const config = loadConfig()
  persistConfig(config)
  const resolved = resolveEncoder(config)
  if (!resolved) {
    state = 'error'
    lastError =
      'FFmpeg dengan dukungan SRT dan encoder H.264 tidak ditemukan. Pilih ffmpeg.exe yang kompatibel.'
    return getObsSrtStatus()
  }

  state = 'starting'
  lastError = null
  framesSent = 0
  framesDropped = 0
  activeEncoderPath = resolved.path
  activeEncoder = resolved.encoder
  const audioEnabled = Boolean(config.audioDevice)
  const detectedAudioDevices = listAudioDevices(resolved.path)
  if (audioEnabled && !detectedAudioDevices.includes(config.audioDevice)) {
    state = 'error'
    lastError = `Perangkat audio "${config.audioDevice}" tidak tersedia. Pilih ulang Audio Source.`
    activeEncoderPath = null
    activeEncoder = null
    return getObsSrtStatus()
  }
  requestedRunning = true
  runtimeGeneration += 1
  const generation = runtimeGeneration
  launchObsSrtProcess(config, resolved, generation)
  captureTimer = setInterval(() => void captureFrame(config), Math.round(1000 / config.fps))
  return getObsSrtStatus()
}

export async function stopObsSrtOutput(): Promise<ObsSrtStatus> {
  requestedRunning = false
  runtimeGeneration += 1
  state = 'stopped'
  lastError = null
  if (restartTimer) clearTimeout(restartTimer)
  restartTimer = null
  if (captureTimer) clearInterval(captureTimer)
  captureTimer = null
  captureInFlight = false
  if (processRef) {
    const child = processRef
    processRef = null
    child.stdin.end()
    child.kill()
  }
  activeEncoderPath = null
  activeEncoder = null
  acceptingFrames = true
  return getObsSrtStatus()
}
