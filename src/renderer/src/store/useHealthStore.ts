import { create } from 'zustand'

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

interface HealthStore {
  endpoints: Map<EndpointId, EndpointHealth>
  initialized: boolean
  setEndpoints: (endpoints: EndpointHealth[]) => void
}

export const useHealthStore = create<HealthStore>((set) => ({
  endpoints: new Map(),
  initialized: false,
  setEndpoints: (endpoints) =>
    set(() => {
      const newMap = new Map<EndpointId, EndpointHealth>()
      endpoints.forEach((ep) => newMap.set(ep.id, ep))
      return { endpoints: newMap, initialized: true }
    })
}))

// Start the health monitoring logic
export function initHealthMonitor(): () => void {
  // Initial fetch
  window.api.health?.getStatus().then((status) => {
    useHealthStore.getState().setEndpoints(status as EndpointHealth[])
  })

  // Listen for updates from main process
  const unsubscribeUpdate = window.api.health?.onStatusUpdate((status) => {
    useHealthStore.getState().setEndpoints(status as EndpointHealth[])
  })

  // Start sending heartbeat for MAIN_DASHBOARD
  const interval = setInterval(() => {
    window.api.health?.sendHeartbeat('MAIN_DASHBOARD')
  }, 1000)

  // Listen for ack to calculate latency (optional)
  const unsubscribeAck = window.api.health?.onHeartbeatAck(() => {
    // We could calculate latency here if we stored the send time
  })

  return () => {
    if (unsubscribeUpdate) unsubscribeUpdate()
    if (unsubscribeAck) unsubscribeAck()
    clearInterval(interval)
  }
}
