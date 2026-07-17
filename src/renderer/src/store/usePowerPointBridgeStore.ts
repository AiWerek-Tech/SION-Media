import { create } from 'zustand'

export interface PowerPointBridgeSourceState {
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
  sequence?: number
  frameId?: string
  cacheHit?: boolean
  provider?: string
  platform?: string
  protocolVersion?: number
}

export interface PowerPointBridgeStatusState {
  requests: Array<{
    id: string
    deviceId: string
    deviceName: string
    deckName: string
    address: string
    status: 'pending' | 'approved' | 'rejected'
    requestedAt: number
    updatedAt: number
  }>
  connectedDevices: Array<{
    deviceId: string
    deviceName: string
    deckName: string
    connectedAt: number
    lastSeenAt: number
  }>
  devices?: PowerPointBridgeSourceState[]
  source: PowerPointBridgeSourceState | null
}

interface PowerPointBridgeStore {
  source: PowerPointBridgeSourceState | null
  sourcesByDevice: Record<string, PowerPointBridgeSourceState>
  activeDeviceId: string | null
  autoPreview: boolean
  autoLive: boolean
  followMode: 'MANUAL' | 'FOLLOW_PREVIEW' | 'FOLLOW_LIVE'
  setSource: (source: PowerPointBridgeSourceState) => void
  selectDevice: (deviceId: string) => void
  removeDevice: (deviceId: string) => void
  setFollowMode: (mode: 'MANUAL' | 'FOLLOW_PREVIEW' | 'FOLLOW_LIVE') => void
  setAutoPreview: (enabled: boolean) => void
  setAutoLive: (enabled: boolean) => void
}

export const usePowerPointBridgeStore = create<PowerPointBridgeStore>((set) => ({
  source: null,
  sourcesByDevice: {},
  activeDeviceId: null,
  autoPreview: true,
  autoLive: false,
  followMode: 'FOLLOW_PREVIEW',
  setSource: (source) =>
    set((state) => {
      const sourcesByDevice = { ...state.sourcesByDevice, [source.deviceId]: source }
      const activeDeviceId = state.activeDeviceId ?? source.deviceId
      return {
        sourcesByDevice,
        activeDeviceId,
        source: activeDeviceId === source.deviceId ? source : state.source
      }
    }),
  selectDevice: (deviceId) =>
    set((state) => ({
      activeDeviceId: deviceId,
      source: state.sourcesByDevice[deviceId] ?? state.source
    })),
  removeDevice: (deviceId) =>
    set((state) => {
      const sourcesByDevice = { ...state.sourcesByDevice }
      delete sourcesByDevice[deviceId]
      if (state.activeDeviceId !== deviceId) return { sourcesByDevice }
      const next =
        Object.values(sourcesByDevice).sort((a, b) => b.updatedAt - a.updatedAt)[0] ?? null
      return {
        sourcesByDevice,
        activeDeviceId: next?.deviceId ?? null,
        source: next
      }
    }),
  setFollowMode: (followMode) =>
    set({
      followMode,
      autoPreview: followMode !== 'MANUAL',
      autoLive: followMode === 'FOLLOW_LIVE'
    }),
  setAutoPreview: (autoPreview) =>
    set((state) => ({
      autoPreview,
      autoLive: autoPreview ? state.autoLive : false,
      followMode: autoPreview ? (state.autoLive ? 'FOLLOW_LIVE' : 'FOLLOW_PREVIEW') : 'MANUAL'
    })),
  setAutoLive: (autoLive) =>
    set({
      autoLive,
      autoPreview: autoLive ? true : true,
      followMode: autoLive ? 'FOLLOW_LIVE' : 'FOLLOW_PREVIEW'
    })
}))
