import { useEffect } from 'react'
import { useAppStore } from '../store/useAppStore'
import { usePlaylistStore } from '../store/usePlaylistStore'
import { logger } from '../utils/logger'
import {
  onRuntimeCommandRejected,
  registerCommandMetadata,
  subscribeToRuntimeEvents
} from '../utils/runtimeCommandBus'
import { registerCommandHandlers, registerCommandValidators } from '../utils/runtimeCommandHandlers'
import { initHealthMonitor } from '../store/useHealthStore'

export function useAppBootstrap(): void {
  const loadSongs = useAppStore((s) => s.loadSongs)
  const loadPlaylists = usePlaylistStore((s) => s.loadPlaylists)
  const setDisplayCount = useAppStore((s) => s.setDisplayCount)
  const setLoading = useAppStore((s) => s.setLoading)
  const showToast = useAppStore((s) => s.showToast)

  useEffect(() => {
    let isMounted = true
    let unsubscribeDisplay: (() => void) | undefined
    let unsubscribeRuntimeEvents: (() => void) | undefined
    let unsubscribeRejections: (() => void) | undefined
    let unsubscribeHealth: (() => void) | undefined

    async function init(): Promise<void> {
      try {
        registerCommandHandlers()
        registerCommandValidators()
        registerCommandMetadata()

        unsubscribeHealth = initHealthMonitor()

        unsubscribeRuntimeEvents = subscribeToRuntimeEvents((evt) => {
          const ts = new Date(evt.timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
          })
          const duration = typeof evt.durationMs === 'number' ? `${evt.durationMs}ms` : ''
          const error = evt.error ? ` | ${evt.error}` : ''
          logger.info(
            `[Runtime] ${ts} [${evt.command.source}] ${evt.command.type} -> ${evt.status} ${duration}${error}`
          )
        })

        unsubscribeRejections = onRuntimeCommandRejected((evt) => {
          if (evt.command.source !== 'KEYBOARD' && evt.command.source !== 'QUICK_JUMP') return
          if (evt.status === 'BLOCKED') showToast(`Perintah ditolak: ${evt.error}`, 'info')
          else if (evt.status === 'ERROR') showToast(`Gagal: ${evt.error}`, 'error')
        })

        await loadSongs()
        await loadPlaylists()
        if (!isMounted) return

        const displays = await window.api.display.getAll()
        if (!isMounted) return
        setDisplayCount(displays.length)

        unsubscribeDisplay = window.api.display.onDisplayChanged((count: number) => {
          const prevCount = useAppStore.getState().displayCount
          setDisplayCount(count)
          if (count > prevCount) showToast('Monitor terhubung', 'success')
          else if (count < prevCount) showToast('Monitor terputus', 'error')
        })
      } catch (err) {
        logger.error('Init error:', err)
      } finally {
        setLoading(false)
      }
    }

    void init()

    return () => {
      isMounted = false
      unsubscribeDisplay?.()
      unsubscribeRuntimeEvents?.()
      unsubscribeRejections?.()
      unsubscribeHealth?.()
    }
  }, [loadPlaylists, loadSongs, setDisplayCount, setLoading, showToast])
}
