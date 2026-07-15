/**
 * IPC Health Indicators Module
 * Tracks connection health and telemetry of all internal and external endpoints.
 */

import { ipcMain } from 'electron'
import { getMainWindow } from './windows'
import { getAppWindowRole, requireMainWindowSender } from './ipc-sender-policy'

export type EndpointId =
  | 'MAIN_DASHBOARD'
  | 'PROJECTION_WINDOW'
  | 'STAGE_DISPLAY'
  | 'MIDI_BRIDGE'
  | 'STREAM_DECK'
  | 'REMOTE_APP'

export interface EndpointHealth {
  id: EndpointId
  connected: boolean
  lastSeen: number
  reconnectCount: number
  latencyMs?: number
  lastError?: string
  lastDisconnect?: number
}

class IPCHealthRegistry {
  private endpoints: Map<EndpointId, EndpointHealth> = new Map()
  private heartbeatInterval: NodeJS.Timeout | null = null
  private readonly TIMEOUT_MS = 3000 // Treat as disconnected if no heartbeat for 3s

  constructor() {
    this.initEndpoints()
  }

  private initEndpoints(): void {
    const defaultEndpoints: EndpointId[] = [
      'PROJECTION_WINDOW',
      'STAGE_DISPLAY',
      'MIDI_BRIDGE',
      'STREAM_DECK',
      'REMOTE_APP'
    ]

    defaultEndpoints.forEach((id) => {
      this.endpoints.set(id, {
        id,
        connected: false,
        lastSeen: 0,
        reconnectCount: 0
      })
    })
  }

  public setup(): void {
    // Listen for heartbeats from renderer windows
    ipcMain.on('health:heartbeat', (event, endpointId: EndpointId) => {
      const role = getAppWindowRole(event.sender.id)
      const expectedEndpoint =
        role === 'projection'
          ? 'PROJECTION_WINDOW'
          : role === 'stage'
            ? 'STAGE_DISPLAY'
            : role === 'main'
              ? 'MAIN_DASHBOARD'
              : null
      if (!expectedEndpoint || endpointId !== expectedEndpoint) {
        console.warn('[IPC Health] Rejected spoofed heartbeat', {
          senderId: event.sender.id,
          role,
          endpointId
        })
        return
      }
      this.recordHeartbeat(endpointId)

      // Echo back immediately to allow renderer to calculate latency
      event.sender.send('health:heartbeat-ack', { id: endpointId, timestamp: Date.now() })
    })

    // Start health monitor loop
    this.heartbeatInterval = setInterval(() => this.checkHealth(), 1000)
  }

  public recordHeartbeat(id: EndpointId): void {
    const endpoint = this.endpoints.get(id)
    if (!endpoint) return

    const now = Date.now()
    if (!endpoint.connected) {
      // Reconnection event
      endpoint.reconnectCount += 1
      endpoint.connected = true
      this.broadcastState()
    }
    endpoint.lastSeen = now
  }

  public recordDisconnect(id: EndpointId, reason?: string): void {
    const endpoint = this.endpoints.get(id)
    if (!endpoint || !endpoint.connected) return

    endpoint.connected = false
    endpoint.lastDisconnect = Date.now()
    if (reason) endpoint.lastError = reason

    this.broadcastState()
  }

  private checkHealth(): void {
    const now = Date.now()
    let changed = false

    this.endpoints.forEach((endpoint, id) => {
      // Only check internal windows that we expect a heartbeat from
      // External bridges will manage their own lifecycle later
      if (id === 'PROJECTION_WINDOW' || id === 'STAGE_DISPLAY') {
        if (endpoint.connected && now - endpoint.lastSeen > this.TIMEOUT_MS) {
          endpoint.connected = false
          endpoint.lastDisconnect = now
          endpoint.lastError = 'Heartbeat timeout'
          changed = true
        }
      }
    })

    if (changed) {
      this.broadcastState()
    }
  }

  private broadcastState(): void {
    const state = Array.from(this.endpoints.values())
    const mainWindow = getMainWindow()
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('health:status-update', state)
    }
  }

  public getState(): EndpointHealth[] {
    return Array.from(this.endpoints.values())
  }

  public teardown(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
    }
  }
}

export const healthRegistry = new IPCHealthRegistry()

export function setupIPCHealth(): void {
  healthRegistry.setup()

  // Expose manual fetch for renderer initial load
  ipcMain.handle('health:get-status', (event) => {
    requireMainWindowSender(event, 'health:get-status')
    return healthRegistry.getState()
  })
}
