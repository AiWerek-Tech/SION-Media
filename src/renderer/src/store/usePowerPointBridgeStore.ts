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
  source: PowerPointBridgeSourceState | null
}

interface PowerPointBridgeStore {
  source: PowerPointBridgeSourceState | null
  autoPreview: boolean
  autoLive: boolean
  setSource: (source: PowerPointBridgeSourceState) => void
  setAutoPreview: (enabled: boolean) => void
  setAutoLive: (enabled: boolean) => void
}

export const usePowerPointBridgeStore = create<PowerPointBridgeStore>((set) => ({
  source: null,
  autoPreview: true,
  autoLive: false,
  setSource: (source) => set({ source }),
  setAutoPreview: (autoPreview) =>
    set((state) => ({ autoPreview, autoLive: autoPreview ? state.autoLive : false })),
  setAutoLive: (autoLive) =>
    set((state) => ({ autoLive, autoPreview: autoLive ? true : state.autoPreview }))
}))
