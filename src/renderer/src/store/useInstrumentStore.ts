import { create } from 'zustand'
import { logger } from '@renderer/utils/logger'
import { LrcLine } from '../utils/lrcParser'

interface InstrumentState {
  instrumentsMap: Record<string, string>
  isPlaying: boolean
  currentTime: number
  duration: number
  monitorVolume: number
  monitorMuted: boolean
  autoAdvanceEnabled: boolean
  activeLrcLines: LrcLine[]

  setPlaying: (playing: boolean) => void
  setTimeUpdate: (currentTime: number, duration: number) => void
  setMonitorVolume: (vol: number) => void
  setMonitorMuted: (muted: boolean) => void
  setInstrumentsMap: (map: Record<string, string>) => void
  scanFolder: (folderPath: string) => Promise<number>
  setAutoAdvanceEnabled: (val: boolean) => void
  setActiveLrcLines: (lines: LrcLine[]) => void
}

export const useInstrumentStore = create<InstrumentState>((set) => ({
  instrumentsMap: {},
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  monitorVolume: 70,
  monitorMuted: false,
  autoAdvanceEnabled: true,
  activeLrcLines: [],

  setPlaying: (playing) => set({ isPlaying: playing }),
  setTimeUpdate: (currentTime, duration) => set({ currentTime, duration }),
  setMonitorVolume: (vol) => set({ monitorVolume: vol }),
  setMonitorMuted: (muted) => set({ monitorMuted: muted }),
  setInstrumentsMap: (instrumentsMap) => set({ instrumentsMap }),
  setAutoAdvanceEnabled: (val) => set({ autoAdvanceEnabled: val }),
  setActiveLrcLines: (lines) => set({ activeLrcLines: lines }),

  scanFolder: async (folderPath: string) => {
    if (!folderPath) {
      set({ instrumentsMap: {} })
      return 0
    }
    try {
      const items = await window.api.file.scanInstruments(folderPath)
      const map: Record<string, string> = {}
      for (const item of items) {
        const key = `${item.hymnalCode.toUpperCase()}-${item.number}`
        map[key] = item.filePath
      }
      set({ instrumentsMap: map })
      return items.length
    } catch (err) {
      logger.error('Failed to scan instrument folder:', err)
      set({ instrumentsMap: {} })
      return 0
    }
  }
}))
