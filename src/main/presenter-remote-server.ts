import { randomBytes } from 'crypto'
import { createServer, type Server, type IncomingMessage, type ServerResponse } from 'http'
import { networkInterfaces } from 'os'
import { extname, basename, join } from 'path'
import { createReadStream, mkdirSync, renameSync, statSync, writeFileSync, readdirSync, unlinkSync, existsSync } from 'fs'
import { app } from 'electron'
import { getMainWindow, getProjectionWindow } from './windows'
import { parseSingleByteRange, resolveAuthorizedMediaPath } from './media-security'
import { AuthRateLimiter } from './presenter-remote-security'
import { getSettings, updateSetting } from './database'
import { getObsLiveClientConfig } from './obs-srt-ingest'

const DEFAULT_SION_LINK_PORT = 41732
const SION_LINK_PORT_SETTING = 'sion_link_port'
const SION_LINK_ROLE_CODE_SETTINGS: Record<SionLinkRole, string> = {
  presenter: 'sion_link_presenter_code',
  operator: 'sion_link_operator_code',
  viewer: 'sion_link_viewer_code',
  stage: 'sion_link_stage_code'
}

export type PresenterRemoteCommand =
  | 'NEXT'
  | 'PREV'
  | 'TAKE'
  | 'CLEAR'
  | 'BLACK'
  | 'LOGO'
  | 'FREEZE'
  | 'GOTO'
  | 'TIMER_START'
  | 'TIMER_STOP'
  | 'TIMER_RESET'
export type SionLinkRole = 'presenter' | 'operator' | 'viewer' | 'stage'

export interface SionLinkRoleAccess {
  role: SionLinkRole
  code: string
  url: string | null
  clientCount: number
}

export interface SionLinkClientInfo {
  id: string
  role: SionLinkRole
  connectedAt: number
  lastSeenAt: number
  userAgent: string
  address: string
  displayName: string
  trusted: boolean
}

export type SionLinkSecurityMode = 'rehearsal' | 'service' | 'private'

export interface SionLinkSecurityPolicy {
  mode: SionLinkSecurityMode
  exactOutputFps: number
  rolesEnabled: Record<SionLinkRole, boolean>
}

export interface SionLinkCommandLogEntry {
  id: string
  role: SionLinkRole
  command: string
  timestamp: number
  clientId: string | null
  deviceName: string
  address: string
  ok: boolean
  detail?: string
}

export interface PresenterRemoteSlideSummary {
  text: string
  label?: string | null
  contentType?: 'song' | 'bible' | 'reading' | 'custom'
  bibleReference?: string | null
  stageNotes?: string | null
  stageChord?: string | null
  keyNote?: string | null
  timeSignature?: string | null
  tempo?: string | null
  visualType?: 'image' | 'video' | 'pdf'
  visualPath?: string
  visualDataUrl?: string
  visualUrl?: string
  pageNumber?: number
  canPresenterNavigate?: boolean
}

export interface PresenterRemoteSnapshot {
  projectionState: string
  currentSlide: PresenterRemoteSlideSummary | null
  nextSlide: PresenterRemoteSlideSummary | null
  currentIndex: number
  nextIndex: number | null
  totalSlides?: number
  hasNextSlide: boolean
  flowPosition: number
  isSmartMode: boolean
  timerElapsed?: number
  timerRunning?: boolean
  updatedAt: number
}

export interface PresenterRemoteStatus {
  enabled: boolean
  port: number | null
  token: string | null
  urls: string[]
  roles: SionLinkRoleAccess[]
  clients: SionLinkClientInfo[]
  security: SionLinkSecurityPolicy
  commandLog: SionLinkCommandLogEntry[]
  clientCount: number
  lastCommandAt: number | null
}

export interface PowerPointBridgeRequest {
  id: string
  deviceId: string
  deviceName: string
  deckName: string
  address: string
  status: 'pending' | 'approved' | 'rejected'
  requestedAt: number
  updatedAt: number
}

export interface PowerPointBridgeSource {
  deviceId: string
  deviceName: string
  deckName: string
  title: string
  notes: string
  imagePath: string
  nextImagePath: string | null
  nextTitle: string | null
  slideIndex: number
  totalSlides: number
  updatedAt: number
}

export interface PowerPointBridgeStatus {
  requests: PowerPointBridgeRequest[]
  connectedDevices: Array<{
    deviceId: string
    deviceName: string
    deckName: string
    connectedAt: number
    lastSeenAt: number
  }>
  source: PowerPointBridgeSource | null
}

const COMMANDS = new Set<PresenterRemoteCommand>([
  'NEXT',
  'PREV',
  'TAKE',
  'CLEAR',
  'BLACK',
  'LOGO',
  'FREEZE',
  'GOTO',
  'TIMER_START',
  'TIMER_STOP',
  'TIMER_RESET'
])

const ROLE_COMMANDS: Record<SionLinkRole, Set<PresenterRemoteCommand>> = {
  presenter: new Set(['NEXT', 'PREV']),
  operator: new Set([
    'NEXT',
    'PREV',
    'TAKE',
    'CLEAR',
    'BLACK',
    'LOGO',
    'FREEZE',
    'GOTO',
    'TIMER_START',
    'TIMER_STOP',
    'TIMER_RESET'
  ]),
  viewer: new Set(),
  stage: new Set()
}

const ROLE_PATHS: Record<SionLinkRole, string> = {
  presenter: '/presenter',
  operator: '/operator',
  viewer: '/live',
  stage: '/stage'
}

const MIME_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mov': 'video/quicktime',
  '.mkv': 'video/x-matroska',
  '.pdf': 'application/pdf'
}

let server: Server | null = null
let port: number | null = null
let token: string | null = null
let roleCodes: Record<SionLinkRole, string> = {
  presenter: '',
  operator: '',
  viewer: '',
  stage: ''
}
let lastCommandAt: number | null = null
let latestSnapshot: PresenterRemoteSnapshot = {
  projectionState: 'CLEAR',
  currentSlide: null,
  nextSlide: null,
  currentIndex: -1,
  nextIndex: null,
  hasNextSlide: false,
  flowPosition: -1,
  isSmartMode: false,
  updatedAt: Date.now()
}
let exactFrameDataUrl: string | null = null
let exactFrameUpdatedAt: number | null = null
let exactCaptureTimer: NodeJS.Timeout | null = null
let exactCaptureInFlight = false
let securityPolicy: SionLinkSecurityPolicy = {
  mode: 'service',
  exactOutputFps: 2,
  rolesEnabled: {
    presenter: true,
    operator: true,
    viewer: true,
    stage: true
  }
}

const clients = new Set<ServerResponse>()
const clientRoles = new Map<ServerResponse, SionLinkRole>()
const clientIds = new Map<ServerResponse, string>()
const clientInfo = new Map<string, SionLinkClientInfo>()
const commandLog: SionLinkCommandLogEntry[] = []
const authRateLimiter = new AuthRateLimiter()
const powerPointBridgeRequests = new Map<
  string,
  PowerPointBridgeRequest & { pairingSecret: string }
>()
const powerPointBridgeSessions = new Map<
  string,
  {
    requestId: string
    deviceId: string
    deviceName: string
    deckName: string
    pairingSecret: string
    connectedAt: number
    lastSeenAt: number
  }
>()
const powerPointBridgeCommandQueues = new Map<string, string[]>()
let latestPowerPointBridgeSource: PowerPointBridgeSource | null = null

function getPresentationSourceDir(): string {
  return join(app.getPath('userData'), 'presentation-source')
}

function cleanupOldSlideFiles(safeDeviceId: string, currentFile: string, nextFile?: string | null): void {
  try {
    const sourceDir = getPresentationSourceDir()
    if (!existsSync(sourceDir)) return
    const files = readdirSync(sourceDir)
    const currentBase = basename(currentFile)
    const nextBase = nextFile ? basename(nextFile) : null
    
    for (const file of files) {
      if (file.startsWith(`${safeDeviceId}-current-`) || file.startsWith(`${safeDeviceId}-next-`)) {
        if (file !== currentBase && file !== nextBase && !file.endsWith('.tmp')) {
          try {
            unlinkSync(join(sourceDir, file))
          } catch (e) {
            console.warn(`[PresenterRemote] Failed to delete old slide file ${file}:`, e)
          }
        }
      }
    }
  } catch (error) {
    console.error('[PresenterRemote] Error scanning presentation-source for cleanup:', error)
  }
}

function removeAllSlideFilesForDevice(safeDeviceId: string): void {
  try {
    const sourceDir = getPresentationSourceDir()
    if (!existsSync(sourceDir)) return
    const files = readdirSync(sourceDir)
    for (const file of files) {
      if (file.startsWith(`${safeDeviceId}-current-`) || file.startsWith(`${safeDeviceId}-next-`)) {
        try {
          unlinkSync(join(sourceDir, file))
        } catch (e) {
          console.warn(`[PresenterRemote] Failed to remove slide file ${file} on disconnect:`, e)
        }
      }
    }
  } catch (error) {
    console.error('[PresenterRemote] Error cleaning device slides on disconnect:', error)
  }
}

function prunePowerPointBridgeState(): void {
  const now = Date.now()
  for (const [id, request] of powerPointBridgeRequests) {
    if (request.status !== 'approved' && now - request.updatedAt > 15 * 60_000) {
      powerPointBridgeRequests.delete(id)
    }
  }
  for (const [tokenValue, session] of powerPointBridgeSessions) {
    if (now - session.lastSeenAt > 12 * 60 * 60_000) {
      const safeDeviceId = session.deviceId.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 48) || 'bridge'
      removeAllSlideFilesForDevice(safeDeviceId)
      powerPointBridgeSessions.delete(tokenValue)
    }
  }
}

export function getPowerPointBridgeStatus(): PowerPointBridgeStatus {
  prunePowerPointBridgeState()
  return {
    requests: Array.from(powerPointBridgeRequests.values())
      .map((entry) => {
        const request: Partial<typeof entry> = { ...entry }
        delete request.pairingSecret
        return request as PowerPointBridgeRequest
      })
      .sort((a, b) => b.updatedAt - a.updatedAt),
    connectedDevices: Array.from(powerPointBridgeSessions.values()).map((session) => ({
      deviceId: session.deviceId,
      deviceName: session.deviceName,
      deckName: session.deckName,
      connectedAt: session.connectedAt,
      lastSeenAt: session.lastSeenAt
    })),
    source: latestPowerPointBridgeSource
  }
}

function notifyPowerPointBridgeStatus(): void {
  const mainWindow = getMainWindow()
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('powerpoint-bridge:status', getPowerPointBridgeStatus())
  }
}

export function approvePowerPointBridgeRequest(requestId: string): PowerPointBridgeStatus {
  const request = powerPointBridgeRequests.get(requestId)
  if (!request || request.status !== 'pending')
    throw new Error('Permintaan PowerPoint tidak ditemukan.')
  request.status = 'approved'
  request.updatedAt = Date.now()
  const existing = Array.from(powerPointBridgeSessions.entries()).find(
    ([, session]) => session.deviceId === request.deviceId
  )
  if (existing) powerPointBridgeSessions.delete(existing[0])
  powerPointBridgeSessions.set(randomBytes(32).toString('hex'), {
    requestId: request.id,
    deviceId: request.deviceId,
    deviceName: request.deviceName,
    deckName: request.deckName,
    pairingSecret: request.pairingSecret,
    connectedAt: Date.now(),
    lastSeenAt: Date.now()
  })
  notifyPowerPointBridgeStatus()
  return getPowerPointBridgeStatus()
}

export function rejectPowerPointBridgeRequest(requestId: string): PowerPointBridgeStatus {
  const request = powerPointBridgeRequests.get(requestId)
  if (!request) throw new Error('Permintaan PowerPoint tidak ditemukan.')
  request.status = 'rejected'
  request.updatedAt = Date.now()
  notifyPowerPointBridgeStatus()
  return getPowerPointBridgeStatus()
}

export function disconnectPowerPointBridgeDevice(deviceId: string): PowerPointBridgeStatus {
  for (const [tokenValue, session] of powerPointBridgeSessions) {
    if (session.deviceId === deviceId) {
      const safeDeviceId = session.deviceId.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 48) || 'bridge'
      removeAllSlideFilesForDevice(safeDeviceId)
      powerPointBridgeSessions.delete(tokenValue)
    }
  }
  if (latestPowerPointBridgeSource?.deviceId === deviceId) latestPowerPointBridgeSource = null
  notifyPowerPointBridgeStatus()
  return getPowerPointBridgeStatus()
}

export function sendPowerPointBridgeCommand(deviceId: string, command: 'NEXT' | 'PREV'): void {
  if (!powerPointBridgeCommandQueues.has(deviceId)) {
    powerPointBridgeCommandQueues.set(deviceId, [])
  }
  powerPointBridgeCommandQueues.get(deviceId)!.push(command)
  console.log(`[PresenterRemote] Command ${command} queued for device ${deviceId}`)
}

function createAccessCode(used: Set<string>): string {
  let code = randomBytes(3).toString('hex').toUpperCase()
  while (used.has(code)) code = randomBytes(3).toString('hex').toUpperCase()
  used.add(code)
  return code
}

function getPersistentSionLinkPort(): number {
  const configured = Number(getSettings()[SION_LINK_PORT_SETTING])
  if (Number.isInteger(configured) && configured >= 1024 && configured <= 65535) {
    return configured
  }
  updateSetting(SION_LINK_PORT_SETTING, String(DEFAULT_SION_LINK_PORT))
  return DEFAULT_SION_LINK_PORT
}

function getPersistentRoleCodes(): Record<SionLinkRole, string> {
  const settings = getSettings()
  const used = new Set<string>()
  const next = {} as Record<SionLinkRole, string>
  for (const role of Object.keys(SION_LINK_ROLE_CODE_SETTINGS) as SionLinkRole[]) {
    const settingKey = SION_LINK_ROLE_CODE_SETTINGS[role]
    const saved = settings[settingKey]?.trim().toUpperCase()
    const code =
      saved && /^[A-F0-9]{6}$/.test(saved) && !used.has(saved) ? saved : createAccessCode(used)
    used.add(code)
    next[role] = code
    if (saved !== code) updateSetting(settingKey, code)
  }
  return next
}

function closeAllClients(): void {
  for (const client of clients) {
    client.end()
  }
  clients.clear()
  clientRoles.clear()
  clientIds.clear()
  clientInfo.clear()
}

function closeClientsByRole(role: SionLinkRole): void {
  for (const [client, clientRole] of Array.from(clientRoles.entries())) {
    if (clientRole !== role) continue
    const clientId = clientIds.get(client)
    client.end()
    clients.delete(client)
    clientRoles.delete(client)
    clientIds.delete(client)
    if (clientId) clientInfo.delete(clientId)
  }
}

function closeClientById(clientId: string): boolean {
  for (const [client, id] of Array.from(clientIds.entries())) {
    if (id !== clientId) continue
    client.end()
    clients.delete(client)
    clientRoles.delete(client)
    clientIds.delete(client)
    clientInfo.delete(clientId)
    return true
  }
  return false
}

function getRequestAddress(req: IncomingMessage): string {
  return req.socket.remoteAddress || ''
}

function sanitizeClientText(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback
  const cleaned = value.trim().replace(/\s+/g, ' ').slice(0, 64)
  return cleaned || fallback
}

function getClientByRequest(
  url: URL,
  payload: Record<string, unknown> = {}
): SionLinkClientInfo | null {
  const clientId =
    typeof payload.clientId === 'string' ? payload.clientId : url.searchParams.get('clientId')
  return clientId ? (clientInfo.get(clientId) ?? null) : null
}

function appendCommandLog(entry: Omit<SionLinkCommandLogEntry, 'id' | 'timestamp'>): void {
  commandLog.unshift({
    id: randomBytes(6).toString('hex'),
    timestamp: Date.now(),
    ...entry
  })
  if (commandLog.length > 120) commandLog.length = 120
}

function getCaptureIntervalMs(): number {
  const fps = Math.max(1, Math.min(5, Math.floor(securityPolicy.exactOutputFps || 2)))
  return Math.round(1000 / fps)
}

function restartExactOutputCapture(): void {
  stopExactOutputCapture()
  startExactOutputCapture()
}

function getLocalHosts(): string[] {
  const hosts = new Set<string>(['127.0.0.1'])
  const nets = networkInterfaces()
  for (const entries of Object.values(nets)) {
    for (const entry of entries ?? []) {
      if (entry.family === 'IPv4' && !entry.internal) {
        hosts.add(entry.address)
      }
    }
  }
  return Array.from(hosts)
}

function buildUrls(): string[] {
  if (!port) return []
  return getLocalHosts().map((host) => `http://${host}:${port}/`)
}

function buildRoleAccess(): SionLinkRoleAccess[] {
  const hosts = port ? getLocalHosts() : []
  return (Object.keys(roleCodes) as SionLinkRole[]).map((role) => {
    const code = roleCodes[role]
    const host = hosts.find((entry) => entry !== '127.0.0.1') || hosts[0]
    const roleClientCount = Array.from(clientRoles.values()).filter(
      (entry) => entry === role
    ).length
    return {
      role,
      code,
      url: port && host && code ? `http://${host}:${port}${ROLE_PATHS[role]}?code=${code}` : null,
      clientCount: roleClientCount
    }
  })
}

export function getPresenterRemoteStatus(): PresenterRemoteStatus {
  return {
    enabled: !!server,
    port,
    token,
    urls: buildUrls(),
    roles: buildRoleAccess(),
    clients: Array.from(clientInfo.values()).sort((a, b) => b.connectedAt - a.connectedAt),
    security: securityPolicy,
    commandLog: commandLog.slice(0, 40),
    clientCount: clients.size,
    lastCommandAt
  }
}

function sendJson(res: ServerResponse, statusCode: number, payload: unknown): void {
  const body = JSON.stringify(payload)
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
    'Cross-Origin-Resource-Policy': 'same-origin'
  })
  res.end(body)
}

function sendHtml(res: ServerResponse, role: SionLinkRole): void {
  const html = getPresenterRemoteHtml(role)
  res.writeHead(200, {
    'Content-Type': 'text/html; charset=utf-8',
    'Content-Length': Buffer.byteLength(html),
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
    'X-Frame-Options': 'SAMEORIGIN',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    'Content-Security-Policy':
      "default-src 'self'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src 'self' data:; media-src 'self' http:; frame-src 'self' http:; connect-src 'self' http:; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'self'"
  })
  res.end(html)
}

function sendConnectHtml(res: ServerResponse): void {
  const html = getSionLinkConnectHtml()
  res.writeHead(200, {
    'Content-Type': 'text/html; charset=utf-8',
    'Content-Length': Buffer.byteLength(html),
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
    'X-Frame-Options': 'SAMEORIGIN',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    'Content-Security-Policy':
      "default-src 'self'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'self'"
  })
  res.end(html)
}

function sendObsBrowserSource(res: ServerResponse, code: string): void {
  const safeCode = JSON.stringify(code)
  const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>SION OBS LAN</title><style>html,body{width:100%;height:100%;margin:0;overflow:hidden;background:transparent}body{display:grid;place-items:center}img{display:block;width:100%;height:100%;object-fit:contain;background:transparent}</style></head><body><img id="frame" alt="SION Program Output"><script>const code=${safeCode};const frame=document.getElementById('frame');let events;let pollBusy=false;function frameUrl(value){const url=new URL(value,location.origin);url.searchParams.set('code',code);return url.toString()}function show(value){if(!value)return;const next=new Image();next.onload=()=>{frame.src=next.src};next.src=value}function connect(){events=new EventSource('/events?code='+encodeURIComponent(code)+'&clientId=obs-browser-source');events.addEventListener('exact-frame',(event)=>{try{const data=JSON.parse(event.data);show(data.dataUrl||frameUrl(data.url))}catch{}});events.onerror=()=>{events.close();setTimeout(connect,1200)}}async function poll(){if(pollBusy)return;pollBusy=true;try{const url='/api/exact-frame?code='+encodeURIComponent(code)+'&v='+Date.now();const response=await fetch(url,{cache:'no-store'});if(response.ok){const blob=await response.blob();const objectUrl=URL.createObjectURL(blob);const next=new Image();next.onload=()=>{frame.src=objectUrl;setTimeout(()=>URL.revokeObjectURL(objectUrl),1000)};next.src=objectUrl}}catch{}finally{pollBusy=false}}connect();void poll();setInterval(()=>void poll(),500);</script></body></html>`
  res.writeHead(200, {
    'Content-Type': 'text/html; charset=utf-8',
    'Content-Length': Buffer.byteLength(html),
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'Content-Security-Policy':
      "default-src 'self'; script-src 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; object-src 'none'"
  })
  res.end(html)
}

function sendManifest(res: ServerResponse): void {
  const body = JSON.stringify({
    name: 'SION Link',
    short_name: 'SION Link',
    description:
      'Remote lokal SION Presenter untuk pemateri, operator, live viewer, dan stage display.',
    id: '/connect',
    start_url: '/connect',
    scope: '/',
    display: 'standalone',
    background_color: '#050811',
    theme_color: '#0f2a56',
    orientation: 'any',
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any maskable'
      }
    ]
  })
  res.writeHead(200, {
    'Content-Type': 'application/manifest+json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff'
  })
  res.end(body)
}

function sendIcon(res: ServerResponse): void {
  const body = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bg" x1="64" y1="32" x2="448" y2="480" gradientUnits="userSpaceOnUse">
      <stop stop-color="#2563eb"/>
      <stop offset="0.52" stop-color="#0f172a"/>
      <stop offset="1" stop-color="#14b8a6"/>
    </linearGradient>
    <linearGradient id="flame" x1="208" y1="104" x2="306" y2="392" gradientUnits="userSpaceOnUse">
      <stop stop-color="#facc15"/>
      <stop offset="0.55" stop-color="#38bdf8"/>
      <stop offset="1" stop-color="#2563eb"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="112" fill="url(#bg)"/>
  <path d="M257 78c-44 56-30 96-79 145-29 29-42 62-42 99 0 74 55 126 120 126 72 0 128-51 128-126 0-56-32-101-74-139 5 34-5 62-31 84 4-68-10-130-22-189Z" fill="url(#flame)"/>
  <path d="M255 226c-21 30-51 54-51 96 0 33 24 57 54 57 34 0 59-24 59-57 0-33-21-57-40-78 1 27-8 47-28 62 4-32 2-56 6-80Z" fill="#f8fafc"/>
</svg>`
  res.writeHead(200, {
    'Content-Type': 'image/svg+xml; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'public, max-age=86400',
    'X-Content-Type-Options': 'nosniff'
  })
  res.end(body)
}

function sendServiceWorker(res: ServerResponse): void {
  const body = `
self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});
self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request));
});
`
  res.writeHead(200, {
    'Content-Type': 'text/javascript; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff'
  })
  res.end(body)
}

function getRoleForCode(code: string | null): SionLinkRole | null {
  if (!code) return null
  for (const [role, roleCode] of Object.entries(roleCodes) as Array<[SionLinkRole, string]>) {
    if (roleCode && roleCode === code) return role
  }
  if (token && code === token) return 'presenter'
  return null
}

function getRoleFromPath(pathname: string): SionLinkRole | null {
  if (pathname === '/presenter') return 'presenter'
  if (pathname === '/operator') return 'operator'
  if (pathname === '/live' || pathname === '/viewer') return 'viewer'
  if (pathname === '/stage') return 'stage'
  return null
}

function getRoleFromRequest(url: URL, bodyCode?: unknown): SionLinkRole | null {
  const candidate =
    typeof bodyCode === 'string'
      ? bodyCode
      : url.searchParams.get('code') || url.searchParams.get('token')
  return getRoleForCode(candidate)
}

function isRoleEnabled(role: SionLinkRole): boolean {
  return securityPolicy.rolesEnabled[role] !== false
}

function sendLocalMedia(req: IncomingMessage, res: ServerResponse, url: URL): void {
  if (!authenticateRequest(req, res, url)) return

  const filePath = resolveAuthorizedMediaPath(url.searchParams.get('path') || '', [
    latestSnapshot.currentSlide?.visualPath,
    latestSnapshot.nextSlide?.visualPath
  ])
  if (!filePath) {
    sendJson(res, 404, { ok: false, error: 'Media not found' })
    return
  }

  const stat = statSync(filePath)
  const fileSize = stat.size
  const contentType = MIME_TYPES[extname(filePath).toLowerCase()] || 'application/octet-stream'
  const rangeHeader = req.headers.range

  if (rangeHeader) {
    const range = parseSingleByteRange(rangeHeader, fileSize)
    if (!range) {
      res.writeHead(416, {
        'Content-Range': `bytes */${fileSize}`,
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff'
      })
      res.end()
      return
    }
    const { start, end } = range
    const chunkSize = end - start + 1
    res.writeHead(206, {
      'Content-Type': contentType,
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Content-Length': String(chunkSize),
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'no-store'
    })
    createReadStream(filePath, { start, end }).pipe(res)
    return
  }

  res.writeHead(200, {
    'Content-Type': contentType,
    'Content-Length': String(fileSize),
    'Accept-Ranges': 'bytes',
    'Cache-Control': 'no-store'
  })
  createReadStream(filePath).pipe(res)
}

function decodeEmbeddedImage(dataUrl: string | undefined): { body: Buffer; type: string } | null {
  if (!dataUrl) return null
  const match = /^data:(image\/(?:jpeg|png|webp));base64,([a-zA-Z0-9+/=]+)$/.exec(dataUrl)
  if (!match) return null
  const body = Buffer.from(match[2], 'base64')
  if (body.length === 0 || body.length > 12 * 1024 * 1024) return null
  return { body, type: match[1] }
}

function sendSlideVisual(req: IncomingMessage, res: ServerResponse, url: URL): void {
  if (!authenticateRequest(req, res, url)) return
  const position = url.searchParams.get('position')
  const slide = position === 'next' ? latestSnapshot.nextSlide : latestSnapshot.currentSlide
  const image = decodeEmbeddedImage(slide?.visualDataUrl)
  if (!image) {
    sendJson(res, 404, { ok: false, error: 'Preview slide belum tersedia' })
    return
  }
  res.writeHead(200, {
    'Content-Type': image.type,
    'Content-Length': String(image.body.length),
    'Cache-Control': 'private, no-store',
    'X-Content-Type-Options': 'nosniff',
    'Cross-Origin-Resource-Policy': 'same-origin'
  })
  res.end(image.body)
}

function sendExactFrame(req: IncomingMessage, res: ServerResponse, url: URL): void {
  const role = authenticateRequest(req, res, url)
  if (!role) return
  if (role !== 'viewer') {
    sendJson(res, 403, { ok: false, error: 'Live Viewer access required' })
    return
  }
  const image = decodeEmbeddedImage(exactFrameDataUrl || undefined)
  if (!image) {
    sendJson(res, 404, { ok: false, error: 'Frame live belum tersedia' })
    return
  }
  res.writeHead(200, {
    'Content-Type': image.type,
    'Content-Length': String(image.body.length),
    'Cache-Control': 'private, no-store',
    'X-Content-Type-Options': 'nosniff',
    'Cross-Origin-Resource-Policy': 'same-origin'
  })
  res.end(image.body)
}

function readJsonBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let body = ''
    req.on('data', (chunk) => {
      body += String(chunk)
      if (body.length > 4096) {
        req.destroy()
        reject(new Error('Request body too large'))
      }
    })
    req.on('end', () => {
      if (!body.trim()) {
        resolve({})
        return
      }
      try {
        resolve(JSON.parse(body))
      } catch (error) {
        reject(error)
      }
    })
    req.on('error', reject)
  })
}

function readPresentationSourceBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    let bytes = 0
    req.on('data', (chunk: Buffer) => {
      bytes += chunk.length
      if (bytes > 24 * 1024 * 1024) {
        reject(new Error('Presentation frames exceed the 24 MB limit'))
        req.destroy()
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => {
      try {
        const parsed = JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed))
          throw new Error('Invalid body')
        resolve(parsed as Record<string, unknown>)
      } catch (error) {
        reject(error)
      }
    })
    req.on('error', reject)
  })
}

function validBridgeIdentity(deviceId: string, pairingSecret: string): boolean {
  return /^[a-zA-Z0-9_-]{8,96}$/.test(deviceId) && /^[a-fA-F0-9]{32,128}$/.test(pairingSecret)
}

async function handlePowerPointBridgeRequest(
  req: IncomingMessage,
  res: ServerResponse
): Promise<void> {
  let payload: Record<string, unknown>
  try {
    const parsed = await readJsonBody(req)
    payload = parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {}
  } catch {
    sendJson(res, 400, { ok: false, error: 'Permintaan PowerPoint tidak valid' })
    return
  }
  const deviceId = String(payload.deviceId ?? '')
  const pairingSecret = String(payload.pairingSecret ?? '')
  if (!validBridgeIdentity(deviceId, pairingSecret)) {
    sendJson(res, 400, { ok: false, error: 'Identitas perangkat tidak valid' })
    return
  }
  const activeSession = Array.from(powerPointBridgeSessions.entries()).find(
    ([, session]) => session.deviceId === deviceId && session.pairingSecret === pairingSecret
  )
  if (activeSession) {
    activeSession[1].lastSeenAt = Date.now()
    sendJson(res, 200, {
      ok: true,
      status: 'approved',
      requestId: activeSession[1].requestId,
      bridgeToken: activeSession[0]
    })
    return
  }
  const existing = Array.from(powerPointBridgeRequests.values()).find(
    (request) => request.deviceId === deviceId && request.pairingSecret === pairingSecret
  )
  const now = Date.now()
  const request = existing ?? {
    id: randomBytes(12).toString('hex'),
    deviceId,
    pairingSecret,
    deviceName: '',
    deckName: '',
    address: getRequestAddress(req),
    status: 'pending' as const,
    requestedAt: now,
    updatedAt: now
  }
  request.deviceName = sanitizeClientText(String(payload.deviceName ?? ''), 'SION Link Desktop')
  request.deckName = sanitizeClientText(String(payload.deckName ?? ''), 'PowerPoint Presentation')
  request.address = getRequestAddress(req)
  request.updatedAt = now
  if (request.status !== 'pending') request.status = 'pending'
  powerPointBridgeRequests.set(request.id, request)
  notifyPowerPointBridgeStatus()
  sendJson(res, 202, { ok: true, status: request.status, requestId: request.id })
}

function handlePowerPointBridgeRequestStatus(res: ServerResponse, url: URL): void {
  const requestId = url.searchParams.get('requestId') ?? ''
  const deviceId = url.searchParams.get('deviceId') ?? ''
  const pairingSecret = url.searchParams.get('pairingSecret') ?? ''
  const request = powerPointBridgeRequests.get(requestId)
  if (
    !request ||
    request.deviceId !== deviceId ||
    request.pairingSecret !== pairingSecret ||
    !validBridgeIdentity(deviceId, pairingSecret)
  ) {
    sendJson(res, 404, { ok: false, error: 'Permintaan tidak ditemukan' })
    return
  }
  if (request.status === 'approved') {
    const session = Array.from(powerPointBridgeSessions.entries()).find(
      ([, candidate]) =>
        candidate.requestId === request.id && candidate.pairingSecret === pairingSecret
    )
    if (session) {
      session[1].lastSeenAt = Date.now()
      const commands = powerPointBridgeCommandQueues.get(deviceId) || []
      if (commands.length > 0) {
        powerPointBridgeCommandQueues.delete(deviceId)
      }
      sendJson(res, 200, {
        ok: true,
        status: 'approved',
        requestId,
        bridgeToken: session[0],
        pendingCommands: commands
      })
      return
    }
    request.status = 'pending'
    request.updatedAt = Date.now()
    notifyPowerPointBridgeStatus()
  }
  sendJson(res, 200, { ok: true, status: request.status, requestId })
}

async function handlePresentationSource(
  req: IncomingMessage,
  res: ServerResponse,
  url: URL
): Promise<void> {
  let payload: Record<string, unknown>
  try {
    payload = await readPresentationSourceBody(req)
  } catch (err) {
    console.error('[PresenterRemote] Bad Request: read presentation body failed:', err)
    sendJson(res, 400, { ok: false, error: 'Payload sumber presentasi tidak valid' })
    return
  }
  const bridgeToken = String(payload.bridgeToken ?? '')
  const bridgeSession = bridgeToken ? powerPointBridgeSessions.get(bridgeToken) : undefined
  if (bridgeToken && !bridgeSession) {
    sendJson(res, 401, { ok: false, error: 'Persetujuan PowerPoint Bridge sudah tidak berlaku' })
    return
  }
  if (!bridgeSession) {
    const role = authenticateRequest(req, res, url, payload.code)
    if (!role) return
    if (role !== 'operator') {
      sendJson(res, 403, { ok: false, error: 'Persetujuan operator diperlukan' })
      return
    }
  }
  const imageDataUrlStr = String(payload.imageDataUrl ?? '')
  let imageType = 'png'
  let base64Data = ''
  if (imageDataUrlStr.startsWith('data:image/png;base64,')) {
    imageType = 'png'
    base64Data = imageDataUrlStr.substring(22)
  } else if (imageDataUrlStr.startsWith('data:image/jpeg;base64,')) {
    imageType = 'jpg'
    base64Data = imageDataUrlStr.substring(23)
  } else {
    console.error('[PresenterRemote] Bad Request: imageDataUrl does not start with valid base64 prefix')
    sendJson(res, 400, { ok: false, error: 'Format gambar tidak valid' })
    return
  }

  const image = Buffer.from(base64Data, 'base64')
  const isPng = imageType === 'png' && image.length >= 8 && image.subarray(0, 8).toString('hex') === '89504e470d0a1a0a'
  const isJpeg = imageType === 'jpg' && image.length >= 3 && image.subarray(0, 3).toString('hex') === 'ffd8ff'
  if (!isPng && !isJpeg) {
    console.error('[PresenterRemote] Bad Request: image buffer validation failed. Length:', image.length, 'Header:', image.subarray(0, 8).toString('hex'))
    sendJson(res, 400, { ok: false, error: 'Data gambar tidak valid' })
    return
  }

  let nextImage: Buffer | null = null
  if (payload.nextImageDataUrl) {
    const nextStr = String(payload.nextImageDataUrl)
    let nextImageType = 'png'
    let nextBase64Data = ''
    if (nextStr.startsWith('data:image/png;base64,')) {
      nextImageType = 'png'
      nextBase64Data = nextStr.substring(22)
    } else if (nextStr.startsWith('data:image/jpeg;base64,')) {
      nextImageType = 'jpg'
      nextBase64Data = nextStr.substring(23)
    } else {
      console.error('[PresenterRemote] Bad Request: nextImageDataUrl does not start with valid base64 prefix')
      sendJson(res, 400, { ok: false, error: 'Format gambar slide berikutnya tidak valid' })
      return
    }
    nextImage = Buffer.from(nextBase64Data, 'base64')
    const isNextPng = nextImageType === 'png' && nextImage.length >= 8 && nextImage.subarray(0, 8).toString('hex') === '89504e470d0a1a0a'
    const isNextJpeg = nextImageType === 'jpg' && nextImage.length >= 3 && nextImage.subarray(0, 3).toString('hex') === 'ffd8ff'
    if (!isNextPng && !isNextJpeg) {
      console.error('[PresenterRemote] Bad Request: nextImage buffer validation failed. Length:', nextImage.length)
      sendJson(res, 400, { ok: false, error: 'Data gambar slide berikutnya tidak valid' })
      return
    }
  }

  const slideIndex = Number(payload.slideIndex)
  const totalSlides = Number(payload.totalSlides)
  if (
    !Number.isInteger(slideIndex) ||
    slideIndex < 0 ||
    !Number.isInteger(totalSlides) ||
    totalSlides < 1
  ) {
    console.error('[PresenterRemote] Bad Request: slide index/total invalid. slideIndex:', payload.slideIndex, 'totalSlides:', payload.totalSlides)
    sendJson(res, 400, { ok: false, error: 'Posisi slide tidak valid' })
    return
  }

  const sourceDir = getPresentationSourceDir()
  const deviceId = bridgeSession?.deviceId ?? 'legacy'
  const safeDeviceId = deviceId.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 48) || 'bridge'
  
  const timestamp = Date.now()
  const ext = imageType === 'jpg' ? 'jpg' : 'png'
  const imagePath = `${sourceDir}\\${safeDeviceId}-current-${timestamp}.${ext}`
  const temporaryPath = `${imagePath}.tmp`
  const nextImagePath = nextImage ? `${sourceDir}\\${safeDeviceId}-next-${timestamp}.${ext}` : null

  try {
    mkdirSync(sourceDir, { recursive: true })
    writeFileSync(temporaryPath, image)
    renameSync(temporaryPath, imagePath)
    if (nextImage && nextImagePath) {
      const nextTemporaryPath = `${nextImagePath}.tmp`
      writeFileSync(nextTemporaryPath, nextImage)
      renameSync(nextTemporaryPath, nextImagePath)
    }
    
    setTimeout(() => {
      cleanupOldSlideFiles(safeDeviceId, imagePath, nextImagePath)
    }, 50)
  } catch (fileError) {
    console.error('[PresenterRemote] Gagal menulis berkas slide PowerPoint:', fileError)
    sendJson(res, 500, { ok: false, error: 'Gagal memproses berkas slide pada server' })
    return
  }

  if (bridgeSession) {
    bridgeSession.lastSeenAt = Date.now()
    bridgeSession.deckName = sanitizeClientText(
      String(payload.deckName ?? bridgeSession.deckName),
      bridgeSession.deckName
    )
  }
  latestPowerPointBridgeSource = {
    deviceId,
    deviceName: bridgeSession?.deviceName ?? 'PowerPoint Bridge',
    deckName: bridgeSession?.deckName ?? 'PowerPoint Presentation',
    title: String(payload.title ?? 'PowerPoint Live').slice(0, 300),
    notes: String(payload.notes ?? '').slice(0, 100_000),
    imagePath,
    nextImagePath,
    nextTitle: payload.nextTitle ? String(payload.nextTitle).slice(0, 300) : null,
    slideIndex,
    totalSlides,
    updatedAt: Date.now()
  }
  const mainWindow = getMainWindow()
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(
      'presenter-remote:command',
      'PRESENTATION_SOURCE',
      latestPowerPointBridgeSource
    )
  }
  notifyPowerPointBridgeStatus()
  sendJson(res, 200, { ok: true, slideIndex, totalSlides })
}

function authenticateRequest(
  req: IncomingMessage,
  res: ServerResponse,
  url: URL,
  bodyToken?: unknown
): SionLinkRole | null {
  const address = getRequestAddress(req) || 'unknown'
  const limit = authRateLimiter.check(address)
  if (!limit.allowed) {
    res.setHeader('Retry-After', String(limit.retryAfterSeconds))
    sendJson(res, 429, { ok: false, error: 'Terlalu banyak percobaan. Coba lagi nanti.' })
    return null
  }

  const role = getRoleFromRequest(url, bodyToken)
  if (!role) {
    const nextLimit = authRateLimiter.recordFailure(address)
    if (!nextLimit.allowed) res.setHeader('Retry-After', String(nextLimit.retryAfterSeconds))
    sendJson(res, nextLimit.allowed ? 401 : 429, {
      ok: false,
      error: nextLimit.allowed ? 'Unauthorized' : 'Terlalu banyak percobaan. Coba lagi nanti.'
    })
    return null
  }

  authRateLimiter.recordSuccess(address)
  return role
}

function writeSse(res: ServerResponse, event: string, payload: unknown): void {
  res.write(`event: ${event}\n`)
  res.write(`data: ${JSON.stringify(payload)}\n\n`)
}

function broadcastSnapshot(): void {
  for (const client of clients) {
    writeSse(client, 'snapshot', getClientSnapshot())
  }
}

function broadcastExactFrame(): void {
  if (!exactFrameDataUrl || !exactFrameUpdatedAt) return
  for (const client of clients) {
    if (clientRoles.get(client) !== 'viewer') continue
    writeSse(client, 'exact-frame', {
      url: `/api/exact-frame?v=${exactFrameUpdatedAt}`,
      updatedAt: exactFrameUpdatedAt
    })
  }
}

function getClientSlide(
  slide: PresenterRemoteSlideSummary | null,
  position: 'current' | 'next'
): PresenterRemoteSlideSummary | null {
  if (!slide?.visualDataUrl) return slide
  const rest = { ...slide }
  delete rest.visualDataUrl
  return {
    ...rest,
    visualUrl: `/api/slide-visual?position=${position}&v=${latestSnapshot.updatedAt}`
  }
}

function getClientSnapshot(): PresenterRemoteSnapshot {
  return {
    ...latestSnapshot,
    currentSlide: getClientSlide(latestSnapshot.currentSlide, 'current'),
    nextSlide: getClientSlide(latestSnapshot.nextSlide, 'next')
  }
}

async function captureExactOutputFrame(): Promise<void> {
  const hasViewer = Array.from(clientRoles.values()).some((role) => role === 'viewer')
  if (!hasViewer || exactCaptureInFlight) return

  const projectionWindow = getProjectionWindow()
  if (!projectionWindow || projectionWindow.isDestroyed()) return

  exactCaptureInFlight = true
  try {
    projectionWindow.webContents.invalidate()
    const image = await projectionWindow.webContents.capturePage()
    if (image.isEmpty()) return
    const jpeg = image.toJPEG(72)
    exactFrameDataUrl = `data:image/jpeg;base64,${jpeg.toString('base64')}`
    exactFrameUpdatedAt = Date.now()
    broadcastExactFrame()
  } catch (error) {
    console.warn('[PresenterRemote] Exact output capture failed:', error)
  } finally {
    exactCaptureInFlight = false
  }
}

function startExactOutputCapture(): void {
  if (exactCaptureTimer) return
  exactCaptureTimer = setInterval(() => {
    void captureExactOutputFrame()
  }, getCaptureIntervalMs())
}

function stopExactOutputCapture(): void {
  if (exactCaptureTimer) {
    clearInterval(exactCaptureTimer)
    exactCaptureTimer = null
  }
  exactCaptureInFlight = false
  exactFrameDataUrl = null
  exactFrameUpdatedAt = null
}

function handleEvents(req: IncomingMessage, res: ServerResponse, url: URL): void {
  const role = authenticateRequest(req, res, url)
  if (!role) return
  if (!isRoleEnabled(role)) {
    sendJson(res, 403, { ok: false, error: 'Role SION Link sedang dinonaktifkan' })
    return
  }

  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-store',
    Connection: 'keep-alive',
    'X-Content-Type-Options': 'nosniff',
    'Cross-Origin-Resource-Policy': 'same-origin'
  })
  clients.add(res)
  clientRoles.set(res, role)
  const requestedClientId = url.searchParams.get('clientId')
  const clientId =
    requestedClientId && /^[a-zA-Z0-9_-]{8,64}$/.test(requestedClientId)
      ? requestedClientId
      : randomBytes(8).toString('hex')
  const now = Date.now()
  const displayName = sanitizeClientText(url.searchParams.get('deviceName'), role)
  const trusted = url.searchParams.get('trusted') === '1'
  clientIds.set(res, clientId)
  clientInfo.set(clientId, {
    id: clientId,
    role,
    connectedAt: now,
    lastSeenAt: now,
    userAgent: req.headers['user-agent'] || 'Unknown device',
    address: getRequestAddress(req),
    displayName,
    trusted
  })
  writeSse(res, 'snapshot', getClientSnapshot())
  if (role === 'viewer' && exactFrameDataUrl && exactFrameUpdatedAt) {
    writeSse(res, 'exact-frame', {
      url: `/api/exact-frame?v=${exactFrameUpdatedAt}`,
      updatedAt: exactFrameUpdatedAt
    })
  }

  req.on('close', () => {
    const disconnectedClientId = clientIds.get(res)
    clients.delete(res)
    clientRoles.delete(res)
    clientIds.delete(res)
    if (disconnectedClientId) clientInfo.delete(disconnectedClientId)
  })
}

async function handleCommand(req: IncomingMessage, res: ServerResponse, url: URL): Promise<void> {
  let body: unknown
  try {
    body = await readJsonBody(req)
  } catch {
    sendJson(res, 400, { ok: false, error: 'Invalid JSON payload' })
    return
  }

  const payload = body && typeof body === 'object' ? (body as Record<string, unknown>) : {}
  const role = authenticateRequest(req, res, url, payload.code || payload.token)
  if (!role) return
  if (!isRoleEnabled(role)) {
    sendJson(res, 403, { ok: false, error: 'Role SION Link sedang dinonaktifkan' })
    return
  }
  const requestClient = getClientByRequest(url, payload)

  const command = typeof payload.command === 'string' ? payload.command.toUpperCase() : ''
  if (!COMMANDS.has(command as PresenterRemoteCommand)) {
    appendCommandLog({
      role,
      command: command || 'UNKNOWN',
      clientId: requestClient?.id ?? null,
      deviceName: requestClient?.displayName ?? role,
      address: requestClient?.address ?? '',
      ok: false,
      detail: 'Unsupported command'
    })
    sendJson(res, 400, { ok: false, error: 'Unsupported command' })
    return
  }

  if (!ROLE_COMMANDS[role].has(command as PresenterRemoteCommand)) {
    appendCommandLog({
      role,
      command: command as PresenterRemoteCommand,
      clientId: requestClient?.id ?? null,
      deviceName: requestClient?.displayName ?? role,
      address: requestClient?.address ?? '',
      ok: false,
      detail: 'Command not allowed'
    })
    sendJson(res, 403, { ok: false, error: 'Command not allowed for this role' })
    return
  }

  if (
    role === 'presenter' &&
    (command === 'NEXT' || command === 'PREV') &&
    latestSnapshot.currentSlide?.canPresenterNavigate !== true
  ) {
    appendCommandLog({
      role,
      command: command as PresenterRemoteCommand,
      clientId: requestClient?.id ?? null,
      deviceName: requestClient?.displayName ?? role,
      address: requestClient?.address ?? '',
      ok: false,
      detail: 'Presenter navigation locked'
    })
    sendJson(res, 403, {
      ok: false,
      error: 'Pemateri hanya dapat navigasi materi PDF/PPT yang sedang live'
    })
    return
  }

  const commandPayload: Record<string, unknown> = {}
  if (command === 'GOTO') {
    const slideIndex = Number(payload.slideIndex)
    const totalSlides = latestSnapshot.totalSlides ?? 0
    if (!Number.isInteger(slideIndex) || slideIndex < 0) {
      sendJson(res, 400, { ok: false, error: 'Nomor slide tidak valid' })
      return
    }
    if (totalSlides > 0 && slideIndex >= totalSlides) {
      sendJson(res, 400, { ok: false, error: 'Nomor slide di luar rundown' })
      return
    }
    commandPayload.slideIndex = slideIndex
  }

  lastCommandAt = Date.now()
  const mainWindow = getMainWindow()
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('presenter-remote:command', command, commandPayload)
  }
  appendCommandLog({
    role,
    command: command as PresenterRemoteCommand,
    clientId: requestClient?.id ?? null,
    deviceName: requestClient?.displayName ?? role,
    address: requestClient?.address ?? '',
    ok: true
  })
  sendJson(res, 200, { ok: true, command, payload: commandPayload })
}

async function handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`)

  if (req.method === 'OPTIONS') {
    sendJson(res, 403, { ok: false, error: 'Cross-origin requests are not allowed' })
    return
  }

  if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/connect')) {
    const role = getRoleFromRequest(url)
    if (role) {
      sendHtml(res, role)
      return
    }
    sendConnectHtml(res)
    return
  }

  if (req.method === 'GET' && url.pathname === '/manifest.webmanifest') {
    sendManifest(res)
    return
  }

  if (req.method === 'GET' && url.pathname === '/api/discovery') {
    sendJson(res, 200, {
      ok: true,
      service: 'sion-media',
      name: 'SION Media',
      version: app.getVersion(),
      port,
      capabilities: [
        'presenter',
        'operator',
        'viewer',
        'stage',
        'presentation-source',
        'powerpoint-bridge-approval',
        'obs-srt',
        'obs-srt-ingest',
        'obs-live-webrtc',
        'obs-live-hls',
        'obs-browser-source'
      ]
    })
    return
  }

  if (req.method === 'GET' && (url.pathname === '/favicon.svg' || url.pathname === '/icon.svg')) {
    sendIcon(res)
    return
  }

  if (req.method === 'GET' && url.pathname === '/sw.js') {
    sendServiceWorker(res)
    return
  }

  if (req.method === 'GET' && url.pathname === '/obs') {
    const role = getRoleFromRequest(url)
    if (!role || !isRoleEnabled(role)) {
      sendJson(res, 401, { ok: false, error: 'Kode akses OBS tidak valid' })
      return
    }
    sendObsBrowserSource(res, url.searchParams.get('code') || url.searchParams.get('token') || '')
    return
  }

  const pageRole = getRoleFromPath(url.pathname)
  if (req.method === 'GET' && pageRole) {
    sendHtml(res, pageRole)
    return
  }

  if (req.method === 'GET' && url.pathname === '/api/session') {
    const role = authenticateRequest(req, res, url)
    if (!role) return
    if (!isRoleEnabled(role)) {
      sendJson(res, 403, { ok: false, error: 'Role SION Link sedang dinonaktifkan' })
      return
    }
    sendJson(res, 200, {
      ok: true,
      role,
      path: ROLE_PATHS[role],
      label: {
        presenter: 'Pemateri',
        operator: 'Operator',
        viewer: 'Live Viewer',
        stage: 'Stage Display'
      }[role]
    })
    return
  }

  if (req.method === 'GET' && url.pathname === '/api/obs-live') {
    const role = authenticateRequest(req, res, url)
    if (!role) return
    if (!isRoleEnabled(role)) {
      sendJson(res, 403, { ok: false, error: 'Role SION Link sedang dinonaktifkan' })
      return
    }
    const requestHost = (req.headers.host || '127.0.0.1').replace(/:\d+$/, '')
    sendJson(res, 200, { ok: true, role, ...getObsLiveClientConfig(requestHost) })
    return
  }

  if (req.method === 'GET' && url.pathname === '/api/slide-visual') {
    sendSlideVisual(req, res, url)
    return
  }

  if (req.method === 'GET' && url.pathname === '/api/exact-frame') {
    sendExactFrame(req, res, url)
    return
  }

  if (req.method === 'GET' && url.pathname === '/api/status') {
    const role = authenticateRequest(req, res, url)
    if (!role) return
    if (role !== 'operator') {
      sendJson(res, 403, { ok: false, error: 'Operator access required' })
      return
    }
    sendJson(res, 200, { ok: true, snapshot: getClientSnapshot() })
    return
  }

  if (req.method === 'GET' && url.pathname === '/media') {
    sendLocalMedia(req, res, url)
    return
  }

  if (req.method === 'GET' && url.pathname === '/events') {
    handleEvents(req, res, url)
    return
  }

  if (req.method === 'POST' && url.pathname === '/api/command') {
    await handleCommand(req, res, url)
    return
  }

  if (req.method === 'POST' && url.pathname === '/api/powerpoint-bridge/request') {
    await handlePowerPointBridgeRequest(req, res)
    return
  }

  if (req.method === 'GET' && url.pathname === '/api/powerpoint-bridge/request') {
    handlePowerPointBridgeRequestStatus(res, url)
    return
  }

  if (req.method === 'POST' && url.pathname === '/api/presentation-source') {
    await handlePresentationSource(req, res, url)
    return
  }

  sendJson(res, 404, { ok: false, error: 'Not found' })
}

export async function startPresenterRemoteServer(): Promise<PresenterRemoteStatus> {
  if (server) return getPresenterRemoteStatus()

  try {
    const sourceDir = getPresentationSourceDir()
    if (existsSync(sourceDir)) {
      const files = readdirSync(sourceDir)
      for (const file of files) {
        try {
          unlinkSync(join(sourceDir, file))
        } catch (e) {
          console.warn('[PresenterRemote] Gagal membersihkan berkas lama saat startup:', file, e)
        }
      }
    }
  } catch (err) {
    console.error('[PresenterRemote] Gagal menscan direktori slide untuk pembersihan startup:', err)
  }

  roleCodes = getPersistentRoleCodes()
  token = roleCodes.presenter
  server = createServer((req, res) => {
    void handleRequest(req, res).catch((error) => {
      console.error('[PresenterRemote] Request failed:', error)
      if (!res.headersSent) {
        sendJson(res, 500, { ok: false, error: 'Internal server error' })
      } else {
        res.end()
      }
    })
  })

  const persistentPort = getPersistentSionLinkPort()
  try {
    await new Promise<void>((resolve, reject) => {
      server?.once('error', reject)
      server?.listen(persistentPort, '0.0.0.0', () => {
        const address = server?.address()
        port = typeof address === 'object' && address ? address.port : null
        server?.off('error', reject)
        resolve()
      })
    })
  } catch (error) {
    server = null
    port = null
    throw new Error(
      `Port tetap SION Link ${persistentPort} tidak dapat digunakan. Tutup aplikasi lain yang memakai port tersebut.`,
      { cause: error }
    )
  }

  console.info('[PresenterRemote] Started', getPresenterRemoteStatus())
  startExactOutputCapture()
  return getPresenterRemoteStatus()
}

export async function stopPresenterRemoteServer(): Promise<PresenterRemoteStatus> {
  stopExactOutputCapture()
  closeAllClients()

  for (const session of powerPointBridgeSessions.values()) {
    const safeDeviceId = session.deviceId.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 48) || 'bridge'
    removeAllSlideFilesForDevice(safeDeviceId)
  }

  if (server) {
    await new Promise<void>((resolve) => {
      server?.close(() => resolve())
    })
  }

  server = null
  port = null
  token = null
  roleCodes = {
    presenter: '',
    operator: '',
    viewer: '',
    stage: ''
  }
  lastCommandAt = null
  authRateLimiter.clear()
  powerPointBridgeRequests.clear()
  powerPointBridgeSessions.clear()
  latestPowerPointBridgeSource = null
  notifyPowerPointBridgeStatus()
  return getPresenterRemoteStatus()
}

export function regeneratePresenterRemoteCodes(): PresenterRemoteStatus {
  if (!server) return getPresenterRemoteStatus()
  closeAllClients()
  const used = new Set<string>()
  roleCodes = (Object.keys(SION_LINK_ROLE_CODE_SETTINGS) as SionLinkRole[]).reduce(
    (next, role) => {
      const code = createAccessCode(used)
      next[role] = code
      updateSetting(SION_LINK_ROLE_CODE_SETTINGS[role], code)
      return next
    },
    {} as Record<SionLinkRole, string>
  )
  token = roleCodes.presenter
  return getPresenterRemoteStatus()
}

export function regeneratePresenterRemoteCode(role: SionLinkRole): PresenterRemoteStatus {
  if (!server) return getPresenterRemoteStatus()
  if (!roleCodes[role]) return getPresenterRemoteStatus()
  closeClientsByRole(role)
  const usedCodes = new Set(
    (Object.entries(roleCodes) as Array<[SionLinkRole, string]>)
      .filter(([entryRole]) => entryRole !== role)
      .map(([, code]) => code)
  )
  let nextCode = randomBytes(3).toString('hex').toUpperCase()
  while (usedCodes.has(nextCode)) {
    nextCode = randomBytes(3).toString('hex').toUpperCase()
  }
  roleCodes = {
    ...roleCodes,
    [role]: nextCode
  }
  updateSetting(SION_LINK_ROLE_CODE_SETTINGS[role], nextCode)
  if (role === 'presenter') token = roleCodes.presenter
  return getPresenterRemoteStatus()
}

export function disconnectPresenterRemoteClients(): PresenterRemoteStatus {
  closeAllClients()
  return getPresenterRemoteStatus()
}

export function disconnectPresenterRemoteClient(clientId: string): PresenterRemoteStatus {
  if (clientId) closeClientById(clientId)
  return getPresenterRemoteStatus()
}

export function updatePresenterRemoteSecurityPolicy(
  nextPolicy: Partial<SionLinkSecurityPolicy>
): PresenterRemoteStatus {
  const nextMode =
    nextPolicy.mode === 'rehearsal' ||
    nextPolicy.mode === 'service' ||
    nextPolicy.mode === 'private'
      ? nextPolicy.mode
      : securityPolicy.mode
  securityPolicy = {
    ...securityPolicy,
    ...nextPolicy,
    mode: nextMode,
    exactOutputFps:
      nextPolicy.exactOutputFps === undefined
        ? securityPolicy.exactOutputFps
        : Math.max(1, Math.min(5, Math.floor(nextPolicy.exactOutputFps))),
    rolesEnabled: {
      ...securityPolicy.rolesEnabled,
      ...(nextPolicy.rolesEnabled ?? {})
    }
  }
  restartExactOutputCapture()
  for (const [client, role] of Array.from(clientRoles.entries())) {
    if (!isRoleEnabled(role)) {
      const clientId = clientIds.get(client)
      client.end()
      clients.delete(client)
      clientRoles.delete(client)
      clientIds.delete(client)
      if (clientId) clientInfo.delete(clientId)
    }
  }
  return getPresenterRemoteStatus()
}

export function clearPresenterRemoteCommandLog(): PresenterRemoteStatus {
  commandLog.length = 0
  return getPresenterRemoteStatus()
}

export function updatePresenterRemoteSnapshot(snapshot: PresenterRemoteSnapshot): void {
  latestSnapshot = {
    ...snapshot,
    updatedAt: Date.now()
  }
  broadcastSnapshot()
}

function getPresenterRemoteHtml(role: SionLinkRole): string {
  const roleTitle: Record<SionLinkRole, string> = {
    presenter: 'SION Link Pemateri',
    operator: 'SION Link Operator',
    viewer: 'SION Live Viewer',
    stage: 'SION Stage Display'
  }
  const roleSubtitle: Record<SionLinkRole, string> = {
    presenter: 'Kontrol materi dengan Prev dan Next',
    operator: 'Kontrol penuh layar live',
    viewer: 'Layar live khusus penonton',
    stage: 'Confidence display panggung'
  }
  const nextPanelLabel = role === 'stage' ? 'Layar Berikutnya' : 'Layar Lanjutan'
  const controlsHtml: Record<SionLinkRole, string> = {
    presenter: `
          <button data-presenter-nav="true" data-command="PREV" onclick="sendCommand('PREV')">← Sebelumnya</button>
          <button data-presenter-nav="true" data-command="NEXT" class="primary" onclick="sendCommand('NEXT')">Berikutnya →</button>
          <div id="presenterLock" class="control-note">Kontrol aktif hanya saat materi PDF/PPT sedang live.</div>`,
    operator: `
          <button data-command="PREV" onclick="sendCommand('PREV')">← Sebelumnya</button>
          <button data-command="NEXT" class="primary" onclick="sendCommand('NEXT')">Berikutnya →</button>
          <button data-command="TAKE" class="small primary-soft" onclick="sendCommand('TAKE')">Tayangkan</button>
          <button data-command="CLEAR" class="small" onclick="sendCommand('CLEAR')">Clear</button>
          <button data-command="BLACK" class="small danger" onclick="sendCommand('BLACK')">Black</button>
          <button data-command="LOGO" class="small" onclick="sendCommand('LOGO')">Logo</button>
          <button data-command="FREEZE" class="small" onclick="sendCommand('FREEZE')">Freeze</button>
          <div class="operator-advanced">
            <div class="advanced-card">
              <div class="advanced-title">Quick Jump</div>
              <div class="jump-row">
                <input id="jumpInput" type="number" min="1" inputmode="numeric" placeholder="Slide" />
                <button data-command="GOTO" class="small primary-soft" onclick="goToSlide()">Buka</button>
              </div>
              <div id="jumpHint" class="advanced-hint">Masukkan nomor slide rundown.</div>
            </div>
            <div class="advanced-card">
              <div class="advanced-title">Timer</div>
              <div class="timer-face" id="timerFace">00:00</div>
              <div class="timer-buttons">
                <button data-command="TIMER_START" class="small" onclick="sendCommand('TIMER_START')">Mulai</button>
                <button data-command="TIMER_STOP" class="small" onclick="sendCommand('TIMER_STOP')">Jeda</button>
                <button data-command="TIMER_RESET" class="small" onclick="sendCommand('TIMER_RESET')">Ulang</button>
              </div>
            </div>
          </div>`,
    viewer: '',
    stage: ''
  }
  return `<!doctype html>
<html lang="id">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover" />
  <title>${roleTitle[role]}</title>
  <link rel="manifest" href="/manifest.webmanifest" />
  <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
  <link rel="apple-touch-icon" href="/icon.svg" />
  <meta name="theme-color" content="#0f2a56" />
  <style>
    :root { color-scheme: dark; font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #050811; color: #f8fafc; }
    * { box-sizing: border-box; }
    html { min-height: 100%; background: #050811; -webkit-text-size-adjust: 100%; }
    body { margin: 0; min-height: 100vh; min-height: 100dvh; background: radial-gradient(circle at 20% 0%, rgba(37, 99, 235, .28) 0, transparent 34%), #050811; overscroll-behavior: none; }
    main { width: min(100%, 520px); min-height: 100vh; min-height: 100dvh; margin: 0 auto; padding: max(12px, env(safe-area-inset-top)) 12px max(12px, env(safe-area-inset-bottom)); display: flex; flex-direction: column; gap: 10px; }
    header { display: flex; align-items: center; justify-content: space-between; gap: 12px; min-height: 34px; padding: 0 2px; }
    .title-block { min-width: 0; }
    .role-identity { display: flex; align-items: center; gap: 8px; min-width: 0; }
    .role-mark { width: 30px; height: 30px; display: grid; place-items: center; flex: 0 0 auto; border-radius: 10px; border: 1px solid rgba(96,165,250,.25); background: linear-gradient(145deg, rgba(37,99,235,.28), rgba(15,23,42,.76)); color: #bfdbfe; font-size: 12px; font-weight: 950; box-shadow: inset 0 1px 0 rgba(255,255,255,.07); }
    h1 { margin: 0; font-size: 13px; letter-spacing: .09em; text-transform: uppercase; }
    .subtitle { margin-top: 3px; color: #7f91aa; font-size: 10px; font-weight: 800; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .header-right { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
    .status { display:flex; align-items:center; gap:7px; padding: 7px 10px; border: 1px solid rgba(52, 211, 153, .24); border-radius: 999px; color: #a7f3d0; background: rgba(6, 78, 59, .24); font-size: 11px; font-weight: 800; white-space: nowrap; }
    .status::before { content:''; width:7px; height:7px; border-radius:999px; background:currentColor; box-shadow:0 0 0 4px rgba(52,211,153,.1); }
    .top-action { appearance: none; min-height: 34px; width: auto; padding: 0 10px; border-radius: 999px; border: 1px solid rgba(148, 163, 184, .16); background: rgba(15, 23, 42, .68); color: #cbd5e1; font-size: 11px; font-weight: 900; box-shadow: none; }
    .top-action:hover { border-color: rgba(96, 165, 250, .34); color: #f8fafc; }
    .top-action.is-hidden { display: none; }
    .stage-stack { display: flex; flex-direction: column; gap: 10px; flex: 1 1 auto; min-height: 0; }
    .control-rail { display: flex; flex-direction: column; gap: 10px; }
    .role-viewer .control-rail { display: none; }
    .role-viewer .panel.current { height: 100%; }
    .role-stage .controls, .role-viewer .controls { display: none; }
    .role-viewer main { width: min(100%, 980px); }
    .role-viewer .panel.current { padding: 10px; }
    .role-viewer .label, .role-viewer .meta { display: none; }
    .role-viewer .visual-label { display: none; }
    .role-stage .panel.current { flex: 1 1 62%; }
    .role-stage .panel.next { flex: 1 1 38%; width: 100%; }
    .panel { border: 1px solid rgba(148, 163, 184, .16); background: linear-gradient(180deg, rgba(15, 23, 42, .92), rgba(9, 14, 26, .94)); border-radius: 20px; padding: 9px; box-shadow: 0 18px 50px rgba(0,0,0,.28); overflow: hidden; }
    .panel.current { flex: 1 1 auto; min-height: 0; }
    .panel.next { width: 92%; margin: 0 auto; flex: 0 0 auto; min-height: 0; opacity: .95; }
    .label { color: #9fb2d0; font-size: 9px; text-transform: uppercase; letter-spacing: .13em; font-weight: 900; margin: 0 2px 7px; }
    .slide { white-space: pre-wrap; min-height: 158px; display: grid; place-items: center; text-align: center; font-size: clamp(22px, 7vw, 34px); line-height: 1.12; font-weight: 900; padding: 12px; }
    .visual { position: relative; display: none; width: 100%; aspect-ratio: 16 / 9; min-height: 0; overflow: hidden; border-radius: 14px; background: #020617; border: 1px solid rgba(148, 163, 184, .14); }
    .visual.is-visible { display: block; }
    .visual img, .visual video, .visual iframe { width: 100%; height: 100%; border: 0; object-fit: contain; background: #000; display: block; }
    .exact-frame { display: none; width: 100%; aspect-ratio: 16 / 9; overflow: hidden; border-radius: 14px; background: #000; border: 1px solid rgba(148, 163, 184, .14); }
    .exact-frame.is-visible { display: block; }
    .exact-frame img { width: 100%; height: 100%; object-fit: contain; display: block; background: #000; }
    .exact-frame iframe { width: 100%; height: 100%; min-height: inherit; border: 0; display: block; background: #000; }
    .visual-label { position: absolute; left: 8px; bottom: 8px; max-width: calc(100% - 16px); padding: 5px 8px; border-radius: 999px; background: rgba(2, 6, 23, .78); color: #dbeafe; font-size: 10px; font-weight: 900; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .current .visual.is-visible { max-height: calc(100dvh - 338px); }
    .next .visual { border-radius: 11px; }
    .next .slide { min-height: 84px; font-size: clamp(16px, 5vw, 22px); color: #dbeafe; }
    .meta { display: flex; justify-content: space-between; gap: 8px; color: #8ea0b8; font-size: 11px; padding: 7px 2px 0; }
    .controls { position: sticky; bottom: max(8px, env(safe-area-inset-bottom)); display: grid; grid-template-columns: 1fr 1.18fr; gap: 9px; padding: 10px; margin-top: 0; border: 1px solid rgba(148, 163, 184, .14); border-radius: 24px; background: rgba(4, 8, 18, .9); box-shadow: 0 -18px 50px rgba(0,0,0,.34); backdrop-filter: blur(18px); -webkit-backdrop-filter: blur(18px); }
    button { appearance: none; -webkit-tap-highlight-color: transparent; user-select: none; border: 1px solid rgba(148, 163, 184, .18); background: linear-gradient(180deg, #182235, #111827); color: #f8fafc; border-radius: 18px; min-height: 58px; font-size: 17px; font-weight: 900; box-shadow: inset 0 1px 0 rgba(255,255,255,.06), 0 10px 24px rgba(0,0,0,.18); touch-action: manipulation; }
    button:active { transform: translateY(1px) scale(.985); filter: brightness(1.08); }
    .primary { background: linear-gradient(180deg, #3b82f6, #2563eb); border-color: rgba(147, 197, 253, .58); }
    .danger { background: linear-gradient(180deg, #171717, #0b0b0b); border-color: rgba(245, 158, 11, .8); color: #fbbf24; }
    button.is-active { border-color: rgba(52, 211, 153, .6); color: #a7f3d0; box-shadow: inset 0 1px 0 rgba(255,255,255,.08), 0 0 0 1px rgba(52,211,153,.14), 0 14px 30px rgba(16,185,129,.16); }
    button.is-busy { opacity: .72; pointer-events: none; }
    .small { min-height: 46px; font-size: 13px; border-radius: 15px; }
    .primary-soft { background: linear-gradient(180deg, rgba(37,99,235,.34), rgba(30,64,175,.26)); border-color: rgba(96,165,250,.36); color: #dbeafe; }
    .control-note { grid-column: 1 / -1; min-height: 34px; display: flex; align-items: center; justify-content: center; border: 1px solid rgba(245, 158, 11, .18); border-radius: 14px; background: rgba(245, 158, 11, .08); color: #fcd34d; font-size: 11px; font-weight: 800; text-align: center; padding: 7px 10px; }
    .operator-advanced { grid-column: 1 / -1; display: grid; grid-template-columns: 1fr; gap: 9px; }
    .advanced-card, .stage-insights { border: 1px solid rgba(148, 163, 184, .14); border-radius: 18px; background: rgba(2, 6, 23, .36); padding: 11px; }
    .advanced-title, .stage-insights__title { color: #bfd3ee; font-size: 10px; letter-spacing: .12em; text-transform: uppercase; font-weight: 950; margin-bottom: 8px; }
    .jump-row { display: grid; grid-template-columns: minmax(0, 1fr) 92px; gap: 8px; }
    .jump-row input { min-width: 0; height: 46px; border: 1px solid rgba(148, 163, 184, .18); border-radius: 14px; background: rgba(15, 23, 42, .8); color: #f8fafc; font-size: 18px; font-weight: 900; text-align: center; outline: none; }
    .advanced-hint { margin-top: 7px; color: #7f91aa; font-size: 10px; font-weight: 800; }
    .timer-face { height: 42px; display: grid; place-items: center; border-radius: 14px; background: rgba(15, 23, 42, .86); color: #dbeafe; font-family: ui-monospace, SFMono-Regular, Consolas, monospace; font-size: 21px; font-weight: 950; letter-spacing: .08em; }
    .timer-buttons { display: grid; grid-template-columns: repeat(3, 1fr); gap: 7px; margin-top: 8px; }
    button.is-confirming { border-color: rgba(251, 191, 36, .82); color: #fde68a; box-shadow: 0 0 0 2px rgba(251, 191, 36, .14), inset 0 1px 0 rgba(255,255,255,.08); }
    .stage-insights { display: none; margin-top: 0; }
    .role-stage .stage-insights { display: block; }
    .stage-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
    .stage-stat { min-width: 0; border: 1px solid rgba(148, 163, 184, .12); border-radius: 14px; background: rgba(15, 23, 42, .62); padding: 9px; }
    .stage-stat__label { color: #7f91aa; font-size: 9px; text-transform: uppercase; letter-spacing: .11em; font-weight: 900; }
    .stage-stat__value { margin-top: 4px; color: #f8fafc; font-size: 13px; line-height: 1.3; font-weight: 900; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .stage-stat--wide { grid-column: 1 / -1; }
    button:disabled { opacity: .42; cursor: not-allowed; transform: none !important; filter: none !important; }
    .footer { color: #70819c; text-align: center; font-size: 10px; line-height: 1.35; padding: 0 10px 2px; }
    .role-viewer .footer { display: none; }
    .fullscreen-exit { position: fixed; z-index: 40; top: max(12px, env(safe-area-inset-top)); right: max(12px, env(safe-area-inset-right)); display: none; width: 36px; height: 36px; padding: 0; border-radius: 8px; background: rgba(0,0,0,.5); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); border: 1px solid rgba(255,255,255,.08); opacity: 0; transition: opacity .3s ease, background .15s ease; pointer-events: none; }
    .fullscreen-exit svg { width: 18px; height: 18px; color: rgba(255,255,255,.7); pointer-events: none; }
    .fullscreen-exit:hover { background: rgba(255,255,255,.12); }
    .fullscreen-exit:hover svg { color: #fff; }
    body.is-fullscreen { background: #000; overflow: hidden; }
    body.is-fullscreen .fullscreen-exit { display: inline-flex; align-items: center; justify-content: center; }
    body.is-fullscreen .fullscreen-exit.is-shown { opacity: 1; pointer-events: auto; }
    body.is-fullscreen header, body.is-fullscreen .footer { display: none; }
    body.is-fullscreen main { width: 100%; max-width: none; height: 100dvh; min-height: 0; padding: 8px; gap: 8px; }
    body.is-fullscreen .stage-stack { flex: 1 1 auto; min-height: 0; gap: 8px; }
    body.is-fullscreen .panel { border-radius: 14px; padding: 8px; }
    body.role-viewer.is-fullscreen main { padding: 0; }
    body.role-viewer.is-fullscreen .stage-stack { height: 100dvh; gap: 0; }
    body.role-viewer.is-fullscreen .panel { border: 0; border-radius: 0; padding: 0; box-shadow: none; background: #000; }
    body.role-viewer.is-fullscreen .visual, body.role-viewer.is-fullscreen .visual img, body.role-viewer.is-fullscreen .visual video, body.role-viewer.is-fullscreen .visual iframe { border-radius: 0; border: 0; height: 100dvh; max-height: none; }
    body.role-viewer.is-fullscreen .exact-frame, body.role-viewer.is-fullscreen .exact-frame img { border-radius: 0; border: 0; height: 100dvh; max-height: none; }
    body.role-viewer.is-fullscreen .slide { height: 100dvh; min-height: 0; font-size: clamp(34px, 8vw, 110px); }
    body.role-presenter.is-fullscreen .current .visual.is-visible, body.role-operator.is-fullscreen .current .visual.is-visible { max-height: calc(100dvh - 210px); }
    body.role-presenter.is-fullscreen .stage-stack, body.role-operator.is-fullscreen .stage-stack { padding-bottom: 116px; }
    body.role-presenter.is-fullscreen .controls, body.role-operator.is-fullscreen .controls { position: fixed; left: max(8px, env(safe-area-inset-left)); right: max(8px, env(safe-area-inset-right)); bottom: max(8px, env(safe-area-inset-bottom)); z-index: 35; }
    body.role-stage.is-fullscreen .stage-stack { display: grid; grid-template-columns: minmax(0, 1.35fr) minmax(280px, .75fr); }
    body.role-stage.is-fullscreen .panel { height: 100%; }
    @media (max-width: 430px) {
      main { width: 100%; padding-inline: 10px; }
      .panel.next { width: 94%; }
      button { min-height: 56px; }
      .small { min-height: 44px; }
    }
    @media (max-height: 740px) and (orientation: portrait) {
      main { gap: 8px; }
      .panel { padding: 8px; border-radius: 16px; }
      .slide { min-height: 132px; }
      .next .slide { min-height: 74px; }
      .current .visual.is-visible { max-height: calc(100dvh - 300px); }
      button { min-height: 50px; }
      .small { min-height: 40px; }
    }
    @media (min-width: 760px) {
      main { width: min(100%, 920px); padding-inline: 18px; }
      .panel.next { width: 84%; }
      .controls { width: 84%; margin-inline: auto; }
    }
    @media (min-width: 1180px) {
      main { width: min(100%, 1120px); }
      .panel.next, .controls { width: 78%; }
    }
    @media (orientation: landscape) and (max-height: 560px) {
      body { overflow: hidden; }
      main { width: 100%; max-width: none; height: 100dvh; min-height: 0; padding: max(8px, env(safe-area-inset-top)) max(10px, env(safe-area-inset-right)) max(8px, env(safe-area-inset-bottom)) max(10px, env(safe-area-inset-left)); display: grid; grid-template-columns: minmax(0, 1fr) minmax(250px, 34vw); grid-template-rows: 32px minmax(0, 1fr) auto; gap: 8px; }
      header { grid-column: 1 / -1; min-height: 30px; padding: 0 2px; }
      h1 { font-size: 12px; }
      .subtitle { display: none; }
      .status { padding: 6px 9px; font-size: 10px; }
      .top-action { min-height: 30px; padding-inline: 9px; font-size: 10px; }
      .stage-stack { grid-column: 1 / -1; grid-row: 2; display: grid; grid-template-columns: minmax(0, 1fr) minmax(250px, 34vw); gap: 8px; min-height: 0; }
      .control-rail { grid-column: 2; display: contents; }
      .role-viewer .stage-stack { grid-template-columns: minmax(0, 1fr); }
      .role-viewer .control-rail { display: none; }
      .role-viewer .panel.current { grid-column: 1 / -1; }
      .role-viewer .current .visual.is-visible { max-height: calc(100dvh - 62px); }
      .role-viewer .slide { height: calc(100dvh - 78px); font-size: clamp(24px, 5.4vw, 46px); }
      .role-stage .stage-stack { grid-template-columns: minmax(0, 1.25fr) minmax(260px, .75fr); }
      .panel { padding: 7px; border-radius: 16px; min-height: 0; }
      .panel.current { grid-column: 1; height: 100%; }
      .panel.next { grid-column: 2; width: 100%; height: 100%; margin: 0; }
      .label { font-size: 8px; margin-bottom: 5px; }
      .visual { border-radius: 11px; }
      .current .visual.is-visible, .next .visual.is-visible { max-height: calc(100dvh - 90px); }
      .slide { min-height: 0; height: calc(100dvh - 118px); font-size: clamp(20px, 4vw, 32px); }
      .next .slide { min-height: 0; height: calc(100dvh - 118px); font-size: clamp(15px, 2.4vw, 22px); }
      .meta { padding-top: 5px; font-size: 10px; }
      .controls { grid-column: 1 / -1; grid-row: 3; position: static; width: 100%; display: grid; grid-template-columns: 1.05fr 1.25fr repeat(5, .82fr); gap: 8px; padding: 8px; border-radius: 18px; }
      button, .small { min-height: 46px; border-radius: 14px; font-size: 14px; }
      .primary { font-size: 16px; }
      .footer { display: none; }
      body.role-stage.is-fullscreen .stage-stack { grid-template-columns: minmax(0, 1.25fr) minmax(240px, .75fr); }
    }
    @media (min-width: 1024px) and (min-height: 620px) {
      body { overflow: hidden; background: radial-gradient(circle at 18% 0%, rgba(37, 99, 235, .32) 0, transparent 30%), radial-gradient(circle at 92% 16%, rgba(16, 185, 129, .08) 0, transparent 28%), #050811; }
      main { width: 100%; max-width: 1680px; height: 100vh; height: 100dvh; min-height: 0; padding: 22px 28px 18px; display: grid; grid-template-columns: minmax(0, 1fr) minmax(340px, 28vw); grid-template-rows: 38px minmax(0, 1fr) 18px; gap: 16px; }
      header { grid-column: 1 / -1; min-height: 38px; padding: 0; }
      h1 { font-size: 15px; letter-spacing: .12em; }
      .subtitle { font-size: 11px; }
      .status { padding: 8px 14px; font-size: 12px; box-shadow: 0 0 0 1px rgba(52, 211, 153, .08), 0 12px 28px rgba(16, 185, 129, .12); }
      .top-action { min-height: 36px; padding-inline: 12px; }
      .stage-stack { grid-column: 1 / -1; grid-row: 2; display: grid; grid-template-columns: minmax(0, 1fr) minmax(340px, 28vw); gap: 16px; min-height: 0; }
      .control-rail { grid-column: 2; display: grid; grid-template-rows: minmax(0, 1fr) auto; gap: 16px; min-height: 0; }
      .role-viewer .stage-stack { grid-template-columns: minmax(0, 1fr); }
      .role-viewer .control-rail { display: none; }
      .role-viewer .panel.current { grid-column: 1 / -1; }
      .role-viewer .current .visual.is-visible { height: calc(100dvh - 108px); }
      .role-viewer .slide { height: calc(100dvh - 108px); font-size: clamp(46px, 6vw, 96px); }
      .role-stage .stage-stack { grid-template-columns: minmax(0, 1.35fr) minmax(420px, .75fr); }
      .role-stage .current .slide { font-size: clamp(40px, 4.7vw, 78px); }
      .role-stage .next .slide { font-size: clamp(28px, 2.4vw, 42px); }
      .panel { border-radius: 22px; padding: 12px; background: linear-gradient(180deg, rgba(15, 23, 42, .92), rgba(6, 10, 21, .96)); box-shadow: 0 22px 70px rgba(0,0,0,.3), inset 0 1px 0 rgba(255,255,255,.04); }
      .panel.current { grid-column: 1; height: 100%; min-height: 0; }
      .panel.next { grid-column: auto; width: 100%; height: 100%; margin: 0; }
      .label { font-size: 10px; margin: 0 4px 10px; color: #a9b8d0; }
      .visual { border-radius: 16px; }
      .current .visual.is-visible { height: calc(100dvh - 156px); max-height: none; }
      .next .visual.is-visible { max-height: calc(100dvh - 330px); }
      .slide { min-height: 0; height: calc(100dvh - 156px); font-size: clamp(32px, 4vw, 72px); }
      .next .slide { min-height: 0; height: calc(100dvh - 330px); font-size: clamp(22px, 2vw, 36px); }
      .visual-label { left: 12px; bottom: 12px; padding: 6px 10px; font-size: 11px; }
      .meta { padding: 10px 4px 0; font-size: 12px; }
      .controls { position: static; width: 100%; margin: 0; grid-template-columns: 1fr 1fr; gap: 10px; padding: 12px; border-radius: 22px; background: linear-gradient(180deg, rgba(15, 23, 42, .9), rgba(5, 8, 17, .95)); box-shadow: 0 24px 60px rgba(0,0,0,.28), inset 0 1px 0 rgba(255,255,255,.05); }
      button { min-height: 64px; border-radius: 17px; font-size: 18px; cursor: pointer; }
      .small { min-height: 52px; font-size: 14px; }
      .primary { font-size: 20px; }
      .footer { grid-column: 1 / -1; grid-row: 3; align-self: end; padding: 0; font-size: 10px; opacity: .72; }
      body.is-fullscreen main { grid-template-rows: minmax(0, 1fr); }
      body.is-fullscreen .stage-stack { grid-row: 1; }
      body.role-presenter.is-fullscreen .stage-stack, body.role-operator.is-fullscreen .stage-stack { grid-template-columns: minmax(0, 1fr) minmax(340px, 30vw); }
      body.role-presenter.is-fullscreen .controls, body.role-operator.is-fullscreen .controls { width: min(820px, calc(100vw - 16px)); margin-inline: auto; }
    }
    @media (min-width: 1360px) and (min-height: 740px) {
      main { padding: 26px 34px 20px; grid-template-columns: minmax(0, 1fr) 430px; }
      .stage-stack { grid-template-columns: minmax(0, 1fr) 430px; }
      .role-viewer .stage-stack { grid-template-columns: minmax(0, 1fr); }
      .role-stage .stage-stack { grid-template-columns: minmax(0, 1.35fr) 520px; }
      .current .visual.is-visible, .slide { height: calc(100dvh - 168px); }
      .next .visual.is-visible, .next .slide { height: auto; max-height: calc(100dvh - 360px); }
      button { min-height: 68px; }
      .small { min-height: 54px; }
    }
  </style>
</head>
<body class="role-${role}">
  <main>
    <header>
      <div class="role-identity">
        <div class="role-mark">${role === 'presenter' ? 'P' : role === 'operator' ? 'O' : role === 'viewer' ? 'L' : 'S'}</div>
        <div class="title-block">
          <h1>${roleTitle[role]}</h1>
          <div class="subtitle">${roleSubtitle[role]}</div>
        </div>
      </div>
      <div class="header-right">
        <button id="installButton" class="top-action is-hidden" type="button" onclick="installPwa()">Pasang</button>
        <button class="top-action" type="button" onclick="toggleFullscreen()">Layar Penuh</button>
        <button class="top-action" type="button" onclick="logout()">Keluar</button>
        <div id="connection" class="status">Menyambung</div>
      </div>
    </header>
    <section class="stage-stack">
      <section class="panel current">
        <div class="label">Layar Saat Ini</div>
        <div id="exactFrame" class="exact-frame"></div>
        <div id="currentVisual" class="visual"></div>
        <div id="current" class="slide">Belum ada slide live</div>
        <div class="meta"><span id="state">CLEAR</span><span id="currentIndex">-</span></div>
      </section>
      <section class="control-rail">
        <section class="panel next">
          <div class="label">${nextPanelLabel}</div>
          <div id="nextVisual" class="visual"></div>
          <div id="next" class="slide">Tidak ada slide berikutnya</div>
          <div class="meta"><span id="mode">Mode normal</span><span id="nextIndex">-</span></div>
        </section>
        ${
          role === 'stage'
            ? `<section class="stage-insights">
          <div class="stage-insights__title">Info Panggung</div>
          <div class="stage-grid">
            <div class="stage-stat"><div class="stage-stat__label">Timer</div><div id="timerFace" class="stage-stat__value">00:00</div></div>
            <div class="stage-stat"><div class="stage-stat__label">Status</div><div id="stageStatus" class="stage-stat__value">CLEAR</div></div>
            <div class="stage-stat"><div class="stage-stat__label">Konten</div><div id="stageContent" class="stage-stat__value">-</div></div>
            <div class="stage-stat"><div class="stage-stat__label">Posisi</div><div id="stagePosition" class="stage-stat__value">-</div></div>
            <div class="stage-stat"><div class="stage-stat__label">Nada</div><div id="stageKey" class="stage-stat__value">-</div></div>
            <div class="stage-stat"><div class="stage-stat__label">Tempo</div><div id="stageTempo" class="stage-stat__value">-</div></div>
            <div class="stage-stat"><div class="stage-stat__label">Birama</div><div id="stageTimeSignature" class="stage-stat__value">-</div></div>
            <div class="stage-stat"><div class="stage-stat__label">Referensi</div><div id="stageReference" class="stage-stat__value">-</div></div>
            <div class="stage-stat stage-stat--wide"><div class="stage-stat__label">Notes</div><div id="stageNotes" class="stage-stat__value">-</div></div>
            <div class="stage-stat stage-stat--wide"><div class="stage-stat__label">Chord</div><div id="stageChord" class="stage-stat__value">-</div></div>
          </div>
        </section>`
            : ''
        }
        <section class="controls">
${controlsHtml[role]}
        </section>
      </section>
    </section>
    <div class="footer">SION Media harus tetap terbuka di laptop operator. HP dan laptop harus berada di jaringan yang sama.</div>
  </main>
  <button class="fullscreen-exit" type="button" onclick="toggleFullscreen()" title="Keluar Fullscreen (Esc)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3v3a2 2 0 01-2 2H3m18 0h-3a2 2 0 01-2-2V3m0 18v-3a2 2 0 012-2h3M3 16h3a2 2 0 012 2v3"/></svg></button>
  <script>
    const params = new URLSearchParams(location.search);
    const code = params.get('code') || params.get('token') || '';
    const role = '${role}';
    const connection = document.getElementById('connection');
    const installButton = document.getElementById('installButton');
    const presenterNavButtons = Array.from(document.querySelectorAll('[data-presenter-nav="true"]'));
    const presenterLock = document.getElementById('presenterLock');
    const clientId = getClientId();
    const deviceName = getDeviceName();
    const trustedDevice = localStorage.getItem('sion-link-trusted-device') === '1';
    let deferredInstallPrompt = null;
    let latestSnapshot = null;
    let pendingRiskCommand = null;
    let pendingRiskTimer = null;
    let obsLiveActive = false;
    let obsLiveUrl = '';
    function getClientId() {
      const key = 'sion-link-client-id';
      const existing = localStorage.getItem(key);
      if (existing && /^[a-zA-Z0-9_-]{8,64}$/.test(existing)) return existing;
      const next = Math.random().toString(36).slice(2) + Date.now().toString(36);
      localStorage.setItem(key, next);
      return next;
    }
    function getDeviceName() {
      const key = 'sion-link-device-name';
      const existing = localStorage.getItem(key);
      if (existing && existing.trim()) return existing.trim().slice(0, 64);
      const fallback = navigator.platform || 'SION Link Device';
      localStorage.setItem(key, fallback);
      localStorage.setItem('sion-link-trusted-device', '1');
      return fallback;
    }
    function slideText(slide, fallback) {
      return slide && slide.text ? slide.text : fallback;
    }
    function formatTimer(seconds) {
      const safeSeconds = Math.max(0, Number(seconds) || 0);
      const hours = Math.floor(safeSeconds / 3600);
      const minutes = Math.floor((safeSeconds % 3600) / 60);
      const remainingSeconds = Math.floor(safeSeconds % 60);
      const pad = (value) => String(value).padStart(2, '0');
      return hours > 0
        ? hours + ':' + pad(minutes) + ':' + pad(remainingSeconds)
        : pad(minutes) + ':' + pad(remainingSeconds);
    }
    function contentLabel(slide) {
      if (!slide) return '-';
      if (slide.visualType === 'pdf') return 'Materi PDF/PPT';
      if (slide.visualType === 'video') return 'Video';
      if (slide.visualType === 'image') return 'Gambar';
      if (slide.contentType === 'song') return 'Lagu';
      if (slide.contentType === 'bible') return 'Alkitab';
      if (slide.contentType === 'reading') return 'Bacaan';
      return 'Slide';
    }
    function authenticatedUrl(value) {
      if (!value) return '';
      const target = new URL(value, location.origin);
      target.searchParams.set('code', code);
      return target.toString();
    }
    function mediaUrl(slide) {
      if (!slide) return '';
      if (slide.visualUrl) return authenticatedUrl(slide.visualUrl);
      if (!slide.visualPath) return '';
      const base = '/media?code=' + encodeURIComponent(code) + '&path=' + encodeURIComponent(slide.visualPath);
      if (slide.visualType === 'pdf') {
        return base + '#page=' + encodeURIComponent(slide.pageNumber || 1) + '&toolbar=0&navpanes=0&scrollbar=0';
      }
      return base;
    }
    function renderVisual(containerId, textId, slide) {
      const container = document.getElementById(containerId);
      const textNode = document.getElementById(textId);
      container.innerHTML = '';
      container.classList.remove('is-visible');
      textNode.style.display = '';
      if (!slide || (!slide.visualDataUrl && !slide.visualUrl && (!slide.visualPath || !slide.visualType))) return;

      const src = slide.visualDataUrl || mediaUrl(slide);
      let media;
      if (slide.visualDataUrl) {
        media = document.createElement('img');
        media.src = src;
        media.alt = slide.text || 'Media';
      } else if (slide.visualType === 'video') {
        media = document.createElement('video');
        media.src = src;
        media.muted = true;
        media.autoplay = true;
        media.loop = true;
        media.playsInline = true;
      } else if (slide.visualType === 'pdf') {
        media = document.createElement('iframe');
        media.src = src;
        media.title = slide.text || 'PDF';
      } else {
        media = document.createElement('img');
        media.src = src;
        media.alt = slide.text || 'Media';
      }
      const label = document.createElement('div');
      label.className = 'visual-label';
      label.textContent = slide.text || slide.label || 'Media';
      container.appendChild(media);
      container.appendChild(label);
      container.classList.add('is-visible');
      textNode.style.display = 'none';
    }
    function render(snapshot) {
      latestSnapshot = snapshot;
      document.getElementById('current').textContent = slideText(snapshot.currentSlide, 'Belum ada slide live');
      document.getElementById('next').textContent = slideText(snapshot.nextSlide, 'Tidak ada slide berikutnya');
      renderVisual('currentVisual', 'current', snapshot.currentSlide);
      renderVisual('nextVisual', 'next', snapshot.nextSlide);
      document.getElementById('state').textContent = snapshot.projectionState || 'CLEAR';
      document.getElementById('currentIndex').textContent = snapshot.currentIndex >= 0 ? '#' + (snapshot.currentIndex + 1) : '-';
      document.getElementById('nextIndex').textContent = snapshot.nextIndex !== null && snapshot.nextIndex >= 0 ? '#' + (snapshot.nextIndex + 1) : '-';
      document.getElementById('mode').textContent = snapshot.isSmartMode ? 'Smart worship flow' : 'Mode normal';
      updateTimer(snapshot);
      updateStageInsights(snapshot);
      updatePresenterControls(snapshot);
      updateOperatorControls(snapshot);
      const exactNode = document.getElementById('exactFrame');
      const currentVisual = document.getElementById('currentVisual');
      const currentText = document.getElementById('current');
      if (exactNode && exactNode.classList.contains('is-visible')) {
        if (currentVisual) currentVisual.classList.remove('is-visible');
        if (currentText) currentText.style.display = 'none';
      }
    }
    function renderExactFrame(frame) {
      if (role !== 'viewer') return;
      if (obsLiveActive) return;
      if (!frame || (!frame.dataUrl && !frame.url)) return;
      const exactNode = document.getElementById('exactFrame');
      const currentVisual = document.getElementById('currentVisual');
      const currentText = document.getElementById('current');
      if (!exactNode) return;
      exactNode.innerHTML = '';
      const image = document.createElement('img');
      image.src = frame.dataUrl || authenticatedUrl(frame.url);
      image.alt = 'Layar live';
      exactNode.appendChild(image);
      exactNode.classList.add('is-visible');
      if (currentVisual) currentVisual.classList.remove('is-visible');
      if (currentText) currentText.style.display = 'none';
    }
    async function refreshObsLive() {
      if (role !== 'viewer' || !code) return;
      try {
        const response = await fetch('/api/obs-live?code=' + encodeURIComponent(code), { cache: 'no-store' });
        if (!response.ok) return;
        const live = await response.json();
        const exactNode = document.getElementById('exactFrame');
        const currentVisual = document.getElementById('currentVisual');
        const currentText = document.getElementById('current');
        const hlsPlayerUrl = live.hlsUrl
          ? live.hlsUrl.replace(/\\/index\\.m3u8$/, '') + '?controls=false&muted=false&autoplay=true&playsInline=true'
          : '';
        const playerUrl = live.webrtcUrl || hlsPlayerUrl || '';
        if (live.publisherConnected && playerUrl) {
          if (!obsLiveActive || obsLiveUrl !== playerUrl) {
            exactNode.innerHTML = '';
            const frame = document.createElement('iframe');
            frame.src = playerUrl;
            frame.title = 'OBS Live Input';
            frame.allow = 'autoplay; fullscreen; picture-in-picture';
            exactNode.appendChild(frame);
            obsLiveUrl = playerUrl;
          }
          obsLiveActive = true;
          exactNode.classList.add('is-visible');
          if (currentVisual) currentVisual.classList.remove('is-visible');
          if (currentText) currentText.style.display = 'none';
          connection.textContent = 'OBS LIVE';
        } else if (obsLiveActive) {
          obsLiveActive = false;
          obsLiveUrl = '';
          exactNode.innerHTML = '';
          exactNode.classList.remove('is-visible');
          if (latestSnapshot) render(latestSnapshot);
        }
      } catch {}
    }
    function updateTimer(snapshot) {
      for (const node of Array.from(document.querySelectorAll('#timerFace'))) {
        node.textContent = formatTimer(snapshot.timerElapsed || 0);
        node.classList.toggle('is-running', snapshot.timerRunning === true);
      }
    }
    function updateStageInsights(snapshot) {
      if (role !== 'stage') return;
      const current = snapshot.currentSlide || null;
      const setText = (id, value) => {
        const node = document.getElementById(id);
        if (node) node.textContent = value || '-';
      };
      setText('stageStatus', snapshot.projectionState || 'CLEAR');
      setText('stageContent', contentLabel(current));
      setText('stagePosition', snapshot.currentIndex >= 0 ? (snapshot.currentIndex + 1) + ' / ' + (snapshot.totalSlides || '-') : '-');
      setText('stageKey', current && current.keyNote);
      setText('stageTempo', current && current.tempo);
      setText('stageTimeSignature', current && current.timeSignature);
      setText('stageReference', current && (current.bibleReference || current.label));
      setText('stageNotes', current && current.stageNotes);
      setText('stageChord', current && current.stageChord);
    }
    function updatePresenterControls(snapshot) {
      if (role !== 'presenter') return;
      const allowed = snapshot.currentSlide && snapshot.currentSlide.canPresenterNavigate === true;
      for (const button of presenterNavButtons) {
        button.disabled = !allowed;
      }
      if (presenterLock) {
        presenterLock.style.display = allowed ? 'none' : 'flex';
        presenterLock.textContent = allowed
          ? ''
          : 'Pemateri hanya dapat navigasi saat materi PDF/PPT sedang live.';
      }
    }
    let fsHideTimer = null;
    const fsExitBtn = document.querySelector('.fullscreen-exit');
    function showFsButton() {
      if (!fsExitBtn || !document.body.classList.contains('is-fullscreen')) return;
      fsExitBtn.classList.add('is-shown');
      clearTimeout(fsHideTimer);
      fsHideTimer = setTimeout(() => { fsExitBtn.classList.remove('is-shown'); }, 2000);
    }
    document.addEventListener('mousemove', (e) => {
      if (!document.body.classList.contains('is-fullscreen')) return;
      if (e.clientX > window.innerWidth - 120 && e.clientY < 80) showFsButton();
    });
    document.addEventListener('fullscreenchange', () => {
      if (!document.fullscreenElement) {
        document.body.classList.remove('is-fullscreen');
        if (fsExitBtn) fsExitBtn.classList.remove('is-shown');
      }
    });
    async function toggleFullscreen() {
      try {
        if (!document.fullscreenElement) {
          await document.documentElement.requestFullscreen();
          document.body.classList.add('is-fullscreen');
          showFsButton();
        } else {
          await document.exitFullscreen();
          document.body.classList.remove('is-fullscreen');
        }
      } catch {
        document.body.classList.toggle('is-fullscreen');
      }
    }
    function updateOperatorControls(snapshot) {
      if (role !== 'operator') return;
      const state = snapshot.projectionState || 'CLEAR';
      const activeMap = {
        BLACK: state === 'BLACK',
        FREEZE: state === 'FREEZE',
        LOGO: state === 'LOGO',
        CLEAR: state === 'CLEAR'
      };
      for (const [command, active] of Object.entries(activeMap)) {
        const button = document.querySelector('[data-command="' + command + '"]');
        if (button) button.classList.toggle('is-active', active);
      }
      const freezeButton = document.querySelector('[data-command="FREEZE"]');
      if (freezeButton) freezeButton.disabled = state === 'CLEAR' || state === 'LOGO' || state === 'BLACK';
      const jumpHint = document.getElementById('jumpHint');
      if (jumpHint) {
        jumpHint.textContent = snapshot.totalSlides
          ? 'Rundown tersedia: 1-' + snapshot.totalSlides
          : 'Rundown belum tersedia.';
      }
    }
    function isInstalledPwa() {
      return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
    }
    function updateInstallButton() {
      if (!installButton) return;
      installButton.classList.toggle('is-hidden', isInstalledPwa());
    }
    async function installPwa() {
      if (!deferredInstallPrompt) {
        connection.textContent = 'Gunakan menu browser > Install app';
        return;
      }
      deferredInstallPrompt.prompt();
      await deferredInstallPrompt.userChoice.catch(() => null);
      deferredInstallPrompt = null;
      updateInstallButton();
    }
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => null);
    }
    window.addEventListener('beforeinstallprompt', (event) => {
      event.preventDefault();
      deferredInstallPrompt = event;
      updateInstallButton();
    });
    window.addEventListener('appinstalled', () => {
      deferredInstallPrompt = null;
      updateInstallButton();
    });
    window.matchMedia('(display-mode: standalone)').addEventListener?.('change', updateInstallButton);
    function logout() {
      location.replace('/connect');
    }
    function needsRiskConfirm(command) {
      return command === 'BLACK' || command === 'CLEAR';
    }
    function confirmRiskCommand(command) {
      if (!needsRiskConfirm(command)) return true;
      const button = document.querySelector('[data-command="' + command + '"]');
      if (pendingRiskCommand !== command) {
        pendingRiskCommand = command;
        if (pendingRiskTimer) window.clearTimeout(pendingRiskTimer);
        pendingRiskTimer = window.setTimeout(() => {
          if (button) button.classList.remove('is-confirming');
          pendingRiskCommand = null;
        }, 2400);
        if (button) button.classList.add('is-confirming');
        connection.textContent = 'Tekan ' + command + ' sekali lagi untuk konfirmasi';
        return false;
      }
      if (pendingRiskTimer) window.clearTimeout(pendingRiskTimer);
      pendingRiskCommand = null;
      if (button) button.classList.remove('is-confirming');
      return true;
    }
    async function goToSlide() {
      const input = document.getElementById('jumpInput');
      const slideNumber = Number(input && input.value);
      if (!Number.isInteger(slideNumber) || slideNumber < 1) {
        connection.textContent = 'Nomor slide tidak valid';
        return;
      }
      await sendCommand('GOTO', { slideIndex: slideNumber - 1 });
    }
    async function sendCommand(command, payload = {}) {
      const button = document.querySelector('[data-command="' + command + '"]');
      if (button && button.disabled) return;
      if (!confirmRiskCommand(command)) return;
      connection.textContent = 'Mengirim ' + command;
      if (button) button.classList.add('is-busy');
      try {
        const res = await fetch('/api/command?code=' + encodeURIComponent(code), {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ code, command, clientId, ...payload })
        });
        if (!res.ok) {
          let message = 'HTTP ' + res.status;
          try {
            const data = await res.json();
            if (data && data.error) message = data.error;
          } catch {}
          throw new Error(message);
        }
        connection.textContent = 'Terhubung';
        if (latestSnapshot) updateOperatorControls(latestSnapshot);
      } catch (error) {
        connection.textContent = error instanceof Error ? error.message : 'Gagal kirim';
      } finally {
        if (button) button.classList.remove('is-busy');
      }
    }
    document.addEventListener('fullscreenchange', () => {
      document.body.classList.toggle('is-fullscreen', !!document.fullscreenElement);
    });
    updateInstallButton();
    if (!code) {
      connection.textContent = 'Kode hilang';
    } else {
      const events = new EventSource('/events?code=' + encodeURIComponent(code) + '&clientId=' + encodeURIComponent(clientId) + '&deviceName=' + encodeURIComponent(deviceName) + '&trusted=' + (trustedDevice ? '1' : '0'));
      events.addEventListener('open', () => { connection.textContent = 'Terhubung'; });
      events.addEventListener('error', () => { connection.textContent = 'Terputus'; });
      events.addEventListener('snapshot', (event) => render(JSON.parse(event.data)));
      events.addEventListener('exact-frame', (event) => renderExactFrame(JSON.parse(event.data)));
      void refreshObsLive();
      window.setInterval(() => void refreshObsLive(), 750);
    }
  </script>
</body>
</html>`
}

function getSionLinkConnectHtml(): string {
  return `<!doctype html>
<html lang="id">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover" />
  <title>SION Link</title>
  <link rel="manifest" href="/manifest.webmanifest" />
  <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
  <link rel="apple-touch-icon" href="/icon.svg" />
  <meta name="theme-color" content="#0f2a56" />
  <style>
    :root { color-scheme: dark; font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #050811; color: #f8fafc; }
    * { box-sizing: border-box; }
    html, body { min-height: 100%; }
    body { margin: 0; min-height: 100vh; min-height: 100dvh; display: grid; place-items: center; background: radial-gradient(circle at 18% 0%, rgba(37, 99, 235, .34) 0, transparent 34%), radial-gradient(circle at 82% 20%, rgba(16, 185, 129, .16) 0, transparent 30%), #050811; padding: max(16px, env(safe-area-inset-top)) max(14px, env(safe-area-inset-right)) max(16px, env(safe-area-inset-bottom)) max(14px, env(safe-area-inset-left)); }
    main { width: min(100%, 430px); border: 1px solid rgba(148, 163, 184, .16); border-radius: 28px; background: linear-gradient(180deg, rgba(15, 23, 42, .92), rgba(5, 8, 17, .96)); box-shadow: 0 26px 80px rgba(0,0,0,.36), inset 0 1px 0 rgba(255,255,255,.05); padding: 22px; }
    .brand { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 28px; }
    h1 { margin: 0; font-size: 22px; letter-spacing: .02em; }
    .pill { padding: 7px 10px; border-radius: 999px; background: rgba(37, 99, 235, .14); border: 1px solid rgba(96, 165, 250, .2); color: #bfdbfe; font-size: 11px; font-weight: 900; }
    .install { width: auto; min-height: 34px; margin: 0; padding: 0 11px; border-radius: 999px; border-color: rgba(52, 211, 153, .22); background: rgba(6, 78, 59, .2); color: #a7f3d0; font-size: 11px; box-shadow: none; }
    .install.is-hidden { display: none; }
    label { display: block; color: #9fb2d0; font-size: 11px; text-transform: uppercase; letter-spacing: .12em; font-weight: 900; margin-bottom: 8px; }
    input { width: 100%; height: 62px; border: 1px solid rgba(148, 163, 184, .18); border-radius: 18px; outline: none; background: rgba(2, 6, 23, .72); color: #f8fafc; font-size: 26px; font-weight: 900; text-align: center; letter-spacing: .12em; text-transform: uppercase; box-shadow: inset 0 1px 0 rgba(255,255,255,.04); }
    input.device-name { height: 48px; margin-bottom: 12px; font-size: 15px; letter-spacing: 0; text-transform: none; }
    input:focus { border-color: rgba(96, 165, 250, .72); box-shadow: 0 0 0 4px rgba(37, 99, 235, .16), inset 0 1px 0 rgba(255,255,255,.04); }
    button { width: 100%; min-height: 58px; margin-top: 14px; border: 1px solid rgba(147, 197, 253, .42); border-radius: 18px; background: linear-gradient(180deg, #3b82f6, #2563eb); color: white; font-size: 17px; font-weight: 950; box-shadow: 0 18px 38px rgba(37, 99, 235, .28), inset 0 1px 0 rgba(255,255,255,.16); }
    button:active { transform: translateY(1px) scale(.99); }
    .hint { margin: 14px 0 0; color: #7f91aa; font-size: 12px; line-height: 1.5; text-align: center; }
    .status { min-height: 18px; margin-top: 12px; color: #a7f3d0; font-size: 12px; text-align: center; font-weight: 800; }
    .status.error { color: #fecaca; }
    @media (min-width: 900px) {
      main { width: 460px; padding: 26px; }
    }
  </style>
</head>
<body>
  <main>
    <div class="brand">
      <h1>SION Link</h1>
      <div style="display:flex;align-items:center;gap:8px">
        <button id="installButton" class="install is-hidden" type="button">Install</button>
        <div class="pill">Local WiFi</div>
      </div>
    </div>
    <form id="connectForm">
      <label for="code">Kode akses</label>
      <input id="deviceName" class="device-name" name="deviceName" autocomplete="nickname" maxlength="64" placeholder="Nama perangkat" spellcheck="false" />
      <input id="code" name="code" inputmode="text" autocomplete="one-time-code" maxlength="8" placeholder="ABC123" spellcheck="false" />
      <button type="submit">Masuk</button>
      <p class="hint">Masukkan kode dari operator. Kode akan membuka mode Pemateri, Operator, Live Viewer, atau Stage Display.</p>
      <div id="status" class="status"></div>
    </form>
  </main>
  <script>
    const form = document.getElementById('connectForm');
    const input = document.getElementById('code');
    const deviceNameInput = document.getElementById('deviceName');
    const status = document.getElementById('status');
    const installButton = document.getElementById('installButton');
    let deferredInstallPrompt = null;
    function isInstalledPwa() {
      return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
    }
    function updateInstallButton() {
      installButton.classList.toggle('is-hidden', isInstalledPwa());
    }
    async function installPwa() {
      if (!deferredInstallPrompt) {
        status.textContent = 'Jika prompt install tidak muncul, gunakan menu browser > Install app / Tambahkan ke layar utama.';
        status.className = 'status';
        return;
      }
      deferredInstallPrompt.prompt();
      await deferredInstallPrompt.userChoice.catch(() => null);
      deferredInstallPrompt = null;
      updateInstallButton();
    }
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => null);
    }
    window.addEventListener('beforeinstallprompt', (event) => {
      event.preventDefault();
      deferredInstallPrompt = event;
      updateInstallButton();
    });
    window.addEventListener('appinstalled', () => {
      deferredInstallPrompt = null;
      updateInstallButton();
    });
    installButton.addEventListener('click', installPwa);
    updateInstallButton();
    deviceNameInput.value = localStorage.getItem('sion-link-device-name') || navigator.platform || '';
    input.focus();
    input.addEventListener('input', () => {
      input.value = input.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    });
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const code = input.value.trim().toUpperCase();
      if (!code) {
        status.textContent = 'Masukkan kode terlebih dahulu';
        status.className = 'status error';
        return;
      }
      status.textContent = 'Menghubungkan...';
      status.className = 'status';
      try {
        const res = await fetch('/api/session?code=' + encodeURIComponent(code));
        const data = await res.json();
        if (!res.ok || !data.ok) throw new Error(data.error || 'Kode tidak valid');
        const deviceName = deviceNameInput.value.trim() || navigator.platform || 'SION Link Device';
        localStorage.setItem('sion-link-device-name', deviceName);
        localStorage.setItem('sion-link-trusted-device', '1');
        location.href = data.path + '?code=' + encodeURIComponent(code);
      } catch (error) {
        status.textContent = 'Kode tidak valid atau SION Link belum aktif';
        status.className = 'status error';
      }
    });
  </script>
</body>
</html>`
}
