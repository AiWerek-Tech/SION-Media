import { app } from 'electron'
import { randomBytes } from 'crypto'
import { existsSync, mkdirSync, writeFileSync } from 'fs'
import { networkInterfaces } from 'os'
import { dirname, join } from 'path'
import { spawn, type ChildProcessWithoutNullStreams } from 'child_process'
import { getSettings, updateSetting } from './database'

export type ObsSrtIngestState = 'stopped' | 'starting' | 'waiting' | 'live' | 'error'

export interface ObsSrtIngestConfig {
  autoStart: boolean
  srtPort: number
  hlsPort: number
  webrtcPort: number
  webrtcUdpPort: number
  apiPort: number
  streamPath: string
}

export interface ObsSrtIngestStatus {
  state: ObsSrtIngestState
  available: boolean
  binaryPath: string | null
  config: ObsSrtIngestConfig
  publisherConnected: boolean
  srtConnectionCount: number
  diagnostic: string | null
  startedAt: number | null
  obsUrls: string[]
  hlsUrls: string[]
  webrtcUrls: string[]
  error: string | null
  logTail: string[]
}

export interface ObsLiveClientConfig {
  available: boolean
  state: ObsSrtIngestState
  publisherConnected: boolean
  hlsUrl: string | null
  webrtcUrl: string | null
  whepUrl: string | null
  updatedAt: number
}

const SETTINGS = {
  autoStart: 'obs_srt_ingest_auto_start',
  srtPort: 'obs_srt_ingest_port',
  hlsPort: 'obs_srt_ingest_hls_port',
  webrtcPort: 'obs_srt_ingest_webrtc_port',
  webrtcUdpPort: 'obs_srt_ingest_webrtc_udp_port',
  apiPort: 'obs_srt_ingest_api_port',
  streamPath: 'obs_srt_ingest_stream_path'
} as const

const DEFAULT_CONFIG: Omit<ObsSrtIngestConfig, 'streamPath'> = {
  autoStart: false,
  srtPort: 8890,
  hlsPort: 8888,
  webrtcPort: 8889,
  webrtcUdpPort: 8189,
  apiPort: 9997
}

let processRef: ChildProcessWithoutNullStreams | null = null
let state: ObsSrtIngestState = 'stopped'
let publisherConnected = false
let srtConnectionCount = 0
let diagnostic: string | null = null
let startedAt: number | null = null
let lastError: string | null = null
let pollTimer: NodeJS.Timeout | null = null
const logTail: string[] = []

function normalizePort(value: unknown, fallback: number): number {
  const port = Number(value)
  return Number.isInteger(port) && port >= 1024 && port <= 65535 ? port : fallback
}

function normalizeStreamPath(value: unknown): string {
  const candidate = String(value ?? '')
    .trim()
    .toLowerCase()
  return /^sion-[a-f0-9]{16}$/.test(candidate)
    ? candidate
    : `sion-${randomBytes(8).toString('hex')}`
}

export function normalizeObsSrtIngestConfig(
  input: Partial<ObsSrtIngestConfig>,
  fallbackPath = `sion-${randomBytes(8).toString('hex')}`
): ObsSrtIngestConfig {
  const config: ObsSrtIngestConfig = {
    autoStart: input.autoStart === true,
    srtPort: normalizePort(input.srtPort, DEFAULT_CONFIG.srtPort),
    hlsPort: normalizePort(input.hlsPort, DEFAULT_CONFIG.hlsPort),
    webrtcPort: normalizePort(input.webrtcPort, DEFAULT_CONFIG.webrtcPort),
    webrtcUdpPort: normalizePort(input.webrtcUdpPort, DEFAULT_CONFIG.webrtcUdpPort),
    apiPort: normalizePort(input.apiPort, DEFAULT_CONFIG.apiPort),
    streamPath: normalizeStreamPath(input.streamPath || fallbackPath)
  }
  const ports = [
    config.srtPort,
    config.hlsPort,
    config.webrtcPort,
    config.webrtcUdpPort,
    config.apiPort
  ]
  if (new Set(ports).size !== ports.length) {
    throw new Error('Setiap port OBS Live Input harus berbeda.')
  }
  return config
}

function persistConfig(config: ObsSrtIngestConfig): void {
  updateSetting(SETTINGS.autoStart, config.autoStart ? '1' : '0')
  updateSetting(SETTINGS.srtPort, String(config.srtPort))
  updateSetting(SETTINGS.hlsPort, String(config.hlsPort))
  updateSetting(SETTINGS.webrtcPort, String(config.webrtcPort))
  updateSetting(SETTINGS.webrtcUdpPort, String(config.webrtcUdpPort))
  updateSetting(SETTINGS.apiPort, String(config.apiPort))
  updateSetting(SETTINGS.streamPath, config.streamPath)
}

function loadConfig(): ObsSrtIngestConfig {
  const settings = getSettings()
  const config = normalizeObsSrtIngestConfig({
    autoStart: settings[SETTINGS.autoStart] === '1',
    srtPort: Number(settings[SETTINGS.srtPort]),
    hlsPort: Number(settings[SETTINGS.hlsPort]),
    webrtcPort: Number(settings[SETTINGS.webrtcPort]),
    webrtcUdpPort: Number(settings[SETTINGS.webrtcUdpPort]),
    apiPort: Number(settings[SETTINGS.apiPort]),
    streamPath: settings[SETTINGS.streamPath]
  })
  const expected: Record<(typeof SETTINGS)[keyof typeof SETTINGS], string> = {
    [SETTINGS.autoStart]: config.autoStart ? '1' : '0',
    [SETTINGS.srtPort]: String(config.srtPort),
    [SETTINGS.hlsPort]: String(config.hlsPort),
    [SETTINGS.webrtcPort]: String(config.webrtcPort),
    [SETTINGS.webrtcUdpPort]: String(config.webrtcUdpPort),
    [SETTINGS.apiPort]: String(config.apiPort),
    [SETTINGS.streamPath]: config.streamPath
  }
  if (Object.entries(expected).some(([key, value]) => settings[key] !== value)) {
    persistConfig(config)
  }
  return config
}

function localIpv4Addresses(): string[] {
  const addresses = ['127.0.0.1']
  for (const entries of Object.values(networkInterfaces())) {
    for (const entry of entries || []) {
      if (entry.family === 'IPv4' && !entry.internal && !entry.address.startsWith('169.254.')) {
        addresses.push(entry.address)
      }
    }
  }
  return [...new Set(addresses)]
}

function resolveBinary(): string | null {
  const name = process.platform === 'win32' ? 'mediamtx.exe' : 'mediamtx'
  const candidates = [
    join(process.resourcesPath, 'mediamtx', name),
    join(app.getAppPath(), 'resources', 'mediamtx', name),
    join(process.cwd(), 'resources', 'mediamtx', name)
  ]
  return candidates.find((candidate) => existsSync(candidate)) ?? null
}

function yamlQuote(value: string): string {
  return `'${value.replace(/'/g, "''")}'`
}

export function buildMediaMtxConfig(config: ObsSrtIngestConfig): string {
  return `# Generated by SION Media. Manual changes are overwritten.
logLevel: info
logDestinations: [stdout]
api: true
apiAddress: 127.0.0.1:${config.apiPort}
metrics: false
pprof: false
playback: false
rtsp: true
rtspAddress: 127.0.0.1:8554
rtspTransports: [tcp]
rtmp: false
hls: true
hlsAddress: :${config.hlsPort}
hlsEncryption: false
hlsAllowOrigins: ['*']
hlsAlwaysRemux: true
hlsVariant: lowLatency
hlsSegmentCount: 7
hlsSegmentDuration: 1s
hlsPartDuration: 200ms
webrtc: true
webrtcAddress: :${config.webrtcPort}
webrtcEncryption: false
webrtcAllowOrigins: ['*']
webrtcLocalUDPAddress: :${config.webrtcUdpPort}
webrtcAdditionalHosts: []
srt: true
srtAddress: :${config.srtPort}
paths:
  ${yamlQuote(config.streamPath)}:
    source: publisher
`
}

function appendLog(value: string): void {
  for (const line of value
    .split(/\r?\n/)
    .map((entry) => entry.trim())
    .filter(Boolean)) {
    logTail.push(line.slice(0, 600))
    if (logTail.length > 20) logTail.shift()
    if (/is publishing to path/i.test(line)) {
      publisherConnected = true
      state = 'live'
      lastError = null
    }
    if (/address already in use|bind:|cannot listen/i.test(line)) {
      lastError = line
      state = 'error'
    }
  }
}

async function pollPublisher(): Promise<void> {
  if (!processRef) return
  const config = loadConfig()
  try {
    const response = await fetch(
      `http://127.0.0.1:${config.apiPort}/v3/paths/get/${encodeURIComponent(config.streamPath)}`,
      { signal: AbortSignal.timeout(900) }
    )
    if (!response.ok) {
      publisherConnected = false
      if (state !== 'starting') state = 'waiting'
    } else {
      const body = (await response.json()) as { ready?: boolean }
      publisherConnected = body.ready === true
      state = publisherConnected ? 'live' : 'waiting'
      if (publisherConnected) {
        lastError = null
        diagnostic = null
      }
    }
  } catch {
    publisherConnected = false
    if (state !== 'starting' && state !== 'error') state = 'waiting'
  }

  if (publisherConnected) return
  try {
    const [connectionsResponse, pathsResponse] = await Promise.all([
      fetch(`http://127.0.0.1:${config.apiPort}/v3/srtconns/list`, {
        signal: AbortSignal.timeout(900)
      }),
      fetch(`http://127.0.0.1:${config.apiPort}/v3/paths/list`, {
        signal: AbortSignal.timeout(900)
      })
    ])
    const connections = connectionsResponse.ok
      ? (((await connectionsResponse.json()) as { items?: Array<{ remoteAddr?: string }> }).items ??
        [])
      : []
    const paths = pathsResponse.ok
      ? (((await pathsResponse.json()) as { items?: Array<{ name?: string; ready?: boolean }> })
          .items ?? [])
      : []
    srtConnectionCount = connections.length
    const unexpectedPath = paths.find(
      (entry) => entry.ready === true && entry.name && entry.name !== config.streamPath
    )?.name
    if (unexpectedPath) {
      diagnostic = `OBS terhubung tetapi mempublikasikan Stream ID "${unexpectedPath}". Gunakan "${config.streamPath}".`
    } else if (srtConnectionCount > 0) {
      diagnostic =
        'Koneksi SRT dari OBS sudah masuk, tetapi video belum siap. Pastikan encoder H.264, audio AAC, dan Stream Key dikosongkan.'
    } else {
      diagnostic = `Belum ada koneksi SRT yang mencapai port UDP ${config.srtPort}. Periksa IP tujuan dan izin Windows Firewall (Private).`
    }
  } catch {
    srtConnectionCount = 0
    diagnostic = 'Diagnostik koneksi SRT belum tersedia. Coba Refresh beberapa saat lagi.'
  }
}

export function buildObsSrtPublisherUrl(address: string, config: ObsSrtIngestConfig): string {
  return `srt://${address}:${config.srtPort}?mode=caller&streamid=publish:${config.streamPath}&pkt_size=1316&latency=200000`
}

function buildUrls(
  config: ObsSrtIngestConfig
): Pick<ObsSrtIngestStatus, 'obsUrls' | 'hlsUrls' | 'webrtcUrls'> {
  const addresses = localIpv4Addresses()
  return {
    obsUrls: addresses.map((address) => buildObsSrtPublisherUrl(address, config)),
    hlsUrls: addresses.map(
      (address) => `http://${address}:${config.hlsPort}/${config.streamPath}/index.m3u8`
    ),
    webrtcUrls: addresses.map(
      (address) => `http://${address}:${config.webrtcPort}/${config.streamPath}`
    )
  }
}

async function waitForGatewayReady(
  config: ObsSrtIngestConfig,
  child: ChildProcessWithoutNullStreams
): Promise<boolean> {
  const deadline = Date.now() + 5000
  while (Date.now() < deadline && processRef === child && child.exitCode === null) {
    try {
      const response = await fetch(`http://127.0.0.1:${config.apiPort}/v3/config/global/get`, {
        signal: AbortSignal.timeout(500)
      })
      if (response.ok) return true
    } catch {
      // MediaMTX opens its API after all protocol listeners are initialized.
    }
    await new Promise((resolve) => setTimeout(resolve, 150))
  }
  return false
}

export function getObsSrtIngestStatus(): ObsSrtIngestStatus {
  const config = loadConfig()
  const binaryPath = resolveBinary()
  return {
    state,
    available: Boolean(binaryPath),
    binaryPath,
    config,
    publisherConnected,
    srtConnectionCount,
    diagnostic,
    startedAt,
    ...buildUrls(config),
    error: lastError,
    logTail: [...logTail]
  }
}

export function getObsLiveClientConfig(requestHost: string): ObsLiveClientConfig {
  const config = loadConfig()
  const host = requestHost.replace(/^\[/, '').replace(/\]$/, '').split(':')[0] || '127.0.0.1'
  const active = Boolean(processRef)
  return {
    available: active,
    state,
    publisherConnected,
    hlsUrl: active ? `http://${host}:${config.hlsPort}/${config.streamPath}/index.m3u8` : null,
    webrtcUrl: active
      ? `http://${host}:${config.webrtcPort}/${config.streamPath}?controls=false&muted=false&autoplay=true&playsInline=true`
      : null,
    whepUrl: active ? `http://${host}:${config.webrtcPort}/${config.streamPath}/whep` : null,
    updatedAt: Date.now()
  }
}

export function updateObsSrtIngestConfig(
  patch: Partial<ObsSrtIngestConfig> & { resetStreamKey?: boolean }
): ObsSrtIngestStatus {
  if (processRef && obsSrtIngestPatchRequiresRestart(patch)) {
    throw new Error('Hentikan OBS Live Input sebelum mengubah port atau Stream ID.')
  }
  const current = loadConfig()
  const config = normalizeObsSrtIngestConfig({
    ...current,
    ...patch,
    streamPath: patch.resetStreamKey ? `sion-${randomBytes(8).toString('hex')}` : current.streamPath
  })
  persistConfig(config)
  lastError = null
  return getObsSrtIngestStatus()
}

/** Persist only the launch preference without restarting the active gateway. */
export function setObsSrtIngestAutoStart(autoStart: boolean): ObsSrtIngestStatus {
  updateSetting(SETTINGS.autoStart, autoStart ? '1' : '0')
  lastError = null
  return getObsSrtIngestStatus()
}

export function obsSrtIngestPatchRequiresRestart(
  patch: Partial<ObsSrtIngestConfig> & { resetStreamKey?: boolean }
): boolean {
  return Boolean(
    patch.resetStreamKey ||
    patch.srtPort !== undefined ||
    patch.hlsPort !== undefined ||
    patch.webrtcPort !== undefined ||
    patch.webrtcUdpPort !== undefined ||
    patch.apiPort !== undefined ||
    patch.streamPath !== undefined
  )
}

export async function startObsSrtIngest(): Promise<ObsSrtIngestStatus> {
  if (processRef) return getObsSrtIngestStatus()
  const binaryPath = resolveBinary()
  if (!binaryPath) {
    state = 'error'
    lastError = 'Media gateway bawaan tidak ditemukan. Instal ulang SION Media.'
    return getObsSrtIngestStatus()
  }
  const config = loadConfig()
  const configPath = join(app.getPath('userData'), 'stream-gateway', 'mediamtx.yml')
  mkdirSync(dirname(configPath), { recursive: true })
  writeFileSync(configPath, buildMediaMtxConfig(config), 'utf8')
  state = 'starting'
  publisherConnected = false
  srtConnectionCount = 0
  diagnostic = null
  startedAt = Date.now()
  lastError = null
  logTail.length = 0

  processRef = spawn(binaryPath, [configPath], { windowsHide: true })
  const child = processRef
  child.stdout.on('data', (chunk: Buffer) => appendLog(chunk.toString()))
  child.stderr.on('data', (chunk: Buffer) => appendLog(chunk.toString()))
  child.once('error', (error) => {
    lastError = error.message
    state = 'error'
    if (processRef === child) processRef = null
    if (pollTimer) clearInterval(pollTimer)
    pollTimer = null
  })
  child.once('exit', (code) => {
    if (processRef !== child) return
    processRef = null
    publisherConnected = false
    startedAt = null
    if (pollTimer) clearInterval(pollTimer)
    pollTimer = null
    if (state !== 'stopped') {
      state = 'error'
      if (!lastError) lastError = `Media gateway berhenti dengan kode ${code ?? 'unknown'}.`
    }
  })
  pollTimer = setInterval(() => void pollPublisher(), 500)
  const ready = await waitForGatewayReady(config, child)
  if (!ready && processRef === child) {
    lastError =
      logTail.at(-1) ??
      `Media gateway tidak membuka listener SRT ${config.srtPort}. Periksa konflik port atau Windows Firewall.`
    state = 'error'
    processRef = null
    if (pollTimer) clearInterval(pollTimer)
    pollTimer = null
    child.kill()
  } else if (processRef === child && state === 'starting') {
    state = 'waiting'
  }
  return getObsSrtIngestStatus()
}

export async function stopObsSrtIngest(): Promise<ObsSrtIngestStatus> {
  state = 'stopped'
  publisherConnected = false
  srtConnectionCount = 0
  diagnostic = null
  startedAt = null
  lastError = null
  if (pollTimer) clearInterval(pollTimer)
  pollTimer = null
  if (processRef) {
    const child = processRef
    processRef = null
    child.kill()
  }
  return getObsSrtIngestStatus()
}

export async function startObsSrtIngestIfConfigured(): Promise<void> {
  if (loadConfig().autoStart) await startObsSrtIngest()
}
