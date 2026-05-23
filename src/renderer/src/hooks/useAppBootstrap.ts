import { useEffect } from 'react'
import { useAppStore } from '@renderer/store/useAppStore'
import { usePlaylistStore } from '@renderer/store/usePlaylistStore'
import { useBootStore } from '@renderer/startup/bootStore'
import { logger } from '@renderer/utils/logger'
import { setGlobalSlideConfig as setRendererGlobalSlideConfig } from '@renderer/engine/slideEngine'
import {
  onRuntimeCommandRejected,
  registerCommandMetadata,
  subscribeToRuntimeEvents
} from '@renderer/utils/runtimeCommandBus'
import {
  registerCommandHandlers,
  registerCommandValidators
} from '@renderer/utils/runtimeCommandHandlers'
import { initHealthMonitor } from '@renderer/store/useHealthStore'
import { UpdateService } from '@renderer/services/update-service'
import {
  initializeProjectionAdapter,
  setGlobalSlideConfig as setCoreGlobalSlideConfig
} from '@core/projection'

export function useAppBootstrap(): void {
  const loadSongs = useAppStore((s) => s.loadSongs)
  const loadPlaylists = usePlaylistStore((s) => s.loadPlaylists)
  const setDisplayCount = useAppStore((s) => s.setDisplayCount)
  const setLoading = useAppStore((s) => s.setLoading)
  const showToast = useAppStore((s) => s.showToast)

  const registerTask = useBootStore((s) => s.registerTask)
  const startTask = useBootStore((s) => s.startTask)
  const completeTask = useBootStore((s) => s.completeTask)
  const failTask = useBootStore((s) => s.failTask)
  const setPhase = useBootStore((s) => s.setPhase)
  const setBootStartAt = useBootStore((s) => s.setBootStartAt)
  const recordMetric = useBootStore((s) => s.recordMetric)
  const addTraceStep = useBootStore((s) => s.addTraceStep)
  const persistBootTrace = useBootStore((s) => s.persistBootTrace)
  const resetBootTrace = useBootStore((s) => s.resetBootTrace)
  const safeMode = useBootStore((s) => s.safeMode)
  const setSafeMode = useBootStore((s) => s.setSafeMode)

  useEffect(() => {
    let isMounted = true
    let unsubscribeDisplay: (() => void) | undefined
    let unsubscribeRuntimeEvents: (() => void) | undefined
    let unsubscribeRejections: (() => void) | undefined
    let unsubscribeHealth: (() => void) | undefined
    let backgroundHandle: number | null = null

    const scheduleIdle = (callback: () => void): number => {
      const globalWindow = window as unknown as {
        requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number
        cancelIdleCallback?: (handle: number) => void
      }

      if (typeof globalWindow.requestIdleCallback === 'function') {
        return globalWindow.requestIdleCallback(callback, { timeout: 1000 })
      }
      return window.setTimeout(callback, 100)
    }

    const cancelIdle = (handle: number): void => {
      const globalWindow = window as unknown as {
        cancelIdleCallback?: (handle: number) => void
      }

      if (typeof globalWindow.cancelIdleCallback === 'function') {
        globalWindow.cancelIdleCallback(handle)
      } else {
        window.clearTimeout(handle)
      }
    }

    const runTask = async (
      id: string,
      label: string,
      priority: 'critical' | 'optional' | 'background',
      handler: () => Promise<void>,
      timeoutMs = priority === 'critical' ? 12000 : priority === 'optional' ? 10000 : 8000
    ): Promise<void> => {
      registerTask({ id, label, priority })
      addTraceStep(`TASK_START_${id}`, `${label} started`, priority, 'started')
      startTask(id)
      let timeoutHandle: number | null = null

      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutHandle = window.setTimeout(() => {
          reject(new Error(`Boot task timed out after ${timeoutMs}ms`))
        }, timeoutMs)
      })

      try {
        await Promise.race([handler(), timeoutPromise])
        completeTask(id)
        addTraceStep(`TASK_DONE_${id}`, `${label} completed`, priority, 'completed')
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err)
        failTask(id, errorMessage)
        addTraceStep(
          `TASK_FAILED_${id}`,
          `${label} failed`,
          priority === 'critical' ? 'failed' : priority,
          'failed',
          errorMessage
        )
        logger.error(`[Boot] Task failed: ${id}`, err)
        if (priority === 'critical') {
          setPhase('failed')
          setSafeMode(true)
          persistBootTrace()
          showToast(`Booting critical service failed: ${label}`, 'error')
        }
      } finally {
        if (timeoutHandle !== null) {
          window.clearTimeout(timeoutHandle)
        }
      }
    }

    async function init(): Promise<void> {
      resetBootTrace()
      const startTime = performance.now()
      setBootStartAt(startTime)
      setPhase('renderer')
      addTraceStep('BOOTSTRAP_BEGIN', 'Bootstrap started', 'renderer', 'started')
      const nativeSafeMode =
        typeof window.api.app.isSafeMode === 'function' ? await window.api.app.isSafeMode() : false
      const activeSafeMode = safeMode || nativeSafeMode
      if (activeSafeMode) {
        setSafeMode(true)
        addTraceStep('SAFE_MODE', 'Safe mode enabled for this startup', 'bootstrap', 'started')
        showToast('Safe mode active: reduced startup workload enabled.', 'info')
      }
      recordMetric('coldStartMs', 0)

      try {
        const criticalBootstrap = async (): Promise<void> => {
          setPhase('critical')
          addTraceStep('CRITICAL_BOOT', 'Critical systems initializing', 'critical', 'started')
          await runTask('ipc', 'Initializing runtime engine', 'critical', async () => {
            registerCommandHandlers()
            registerCommandValidators()
            registerCommandMetadata()
            // FIX ARCH-CRITICAL: initialize projection adapter so all UI commands
            // (PROJ_TAKE_CUE, PROJ_BLACK, NAV_NEXT_SLIDE, etc.) have registered
            // handlers in the utils/runtimeCommandBus used by executeRuntimeCommand.
            initializeProjectionAdapter()
          })

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

          await runTask('theme', 'Restoring theme & workspace', 'critical', async () => {
            const settings = await window.api.settings.getAll()
            const maxLines = parseInt(settings['projection_max_lines'] || '4', 10)
            const maxChars = parseInt(settings['projection_max_chars'] || '40', 10)
            if (!isNaN(maxLines) && !isNaN(maxChars)) {
              setRendererGlobalSlideConfig({ maxLines, maxChars })
              setCoreGlobalSlideConfig({ maxLines, maxChars })
              logger.info('[Bootstrap] Slide config loaded:', { maxLines, maxChars })
            }
          })

          await runTask('display', 'Detecting connected displays', 'critical', async () => {
            const displays = await window.api.display.getAll()
            if (!isMounted) return
            setDisplayCount(displays.length)
            unsubscribeDisplay = window.api.display.onDisplayChanged((count: number) => {
              const prevCount = useAppStore.getState().displayCount
              setDisplayCount(count)
              if (count > prevCount) showToast('Monitor terhubung', 'success')
              else if (count < prevCount) showToast('Monitor terputus', 'error')
            })
          })
        }

        await criticalBootstrap()
        addTraceStep('CRITICAL_BOOT', 'Critical systems initialized', 'critical', 'completed')

        addTraceStep('RENDERER_INITIALIZED', 'Runtime engine initialized', 'renderer', 'completed')
        const shellStart = performance.now()
        setPhase('shell')
        addTraceStep('SHELL_READY', 'Shell frame ready', 'shell', 'completed')
        setLoading(false)
        recordMetric('rendererBootMs', Math.round(shellStart - startTime))
        recordMetric('criticalBootMs', Math.round(shellStart - startTime))
        recordMetric('shellReadyMs', Math.round(shellStart - startTime))
        window.requestAnimationFrame(() => {
          recordMetric('firstInteractiveMs', Math.round(performance.now() - startTime))
          addTraceStep('FIRST_INTERACTIVE', 'First interactive frame', 'shell', 'completed')
        })

        const optionalStart = performance.now()
        setPhase('optional')
        addTraceStep('OPTIONAL_BOOT', 'Optional systems warming up', 'optional', 'started')
        if (activeSafeMode) {
          addTraceStep(
            'OPTIONAL_REDUCED',
            'Reduced optional boot due to safe mode',
            'optional',
            'started'
          )
        }

        const optionalTasks = [
          runTask('playlists', 'Loading playlists', 'optional', async () => {
            await loadPlaylists()
          }),
          runTask('songs', 'Loading song library', 'optional', async () => {
            await loadSongs()
          })
        ]

        if (!activeSafeMode) {
          optionalTasks.push(
            runTask(
              'hymnals',
              'Loading hymnals',
              'optional',
              async () => {
                await useAppStore.getState().loadHymnals()
              },
              12000
            )
          )
        }

        void Promise.all(optionalTasks).then(() => {
          recordMetric('optionalBootMs', Math.round(performance.now() - optionalStart))
        })

        backgroundHandle = scheduleIdle(async () => {
          setPhase('background')
          addTraceStep('BACKGROUND_BOOT', 'Background services warming', 'background', 'started')
          const backgroundTasks = [
            runTask(
              'update',
              'Checking for updates',
              'background',
              async () => {
                const currentVersion = await window.api.window.getVersion()
                const update = await UpdateService.checkForUpdate(currentVersion)
                if (update.hasUpdate) {
                  showToast(
                    `Pembaruan v${update.latestVersion} tersedia! Silakan cek menu Tentang.`,
                    'info'
                  )
                }
              },
              7000
            ),
            runTask(
              'bible',
              'Warming Bible engine',
              'background',
              async () => {
                await window.api.bible.getTranslations()
              },
              7000
            ),
            runTask(
              'media',
              'Indexing media assets',
              'background',
              async () => {
                await window.api.media.getCollections()
              },
              7000
            ),
            runTask(
              'storage',
              'Collecting storage metrics',
              'background',
              async () => {
                await window.api.system.getStorageStats()
              },
              7000
            )
          ]

          await Promise.all(backgroundTasks)
          const readyAt = performance.now()
          recordMetric('readyMs', Math.round(readyAt - startTime))
          addTraceStep('READY', 'Application ready', 'ready', 'completed')
          setPhase('ready')
          persistBootTrace()
        })
      } catch (err) {
        setSafeMode(true)
        addTraceStep(
          'BOOT_FAILED',
          'Bootstrap failed',
          'failed',
          'failed',
          err instanceof Error ? err.message : String(err)
        )
        setPhase('failed')
        persistBootTrace()
        logger.error('Bootstrap error:', err)
      }
    }

    void init()

    return () => {
      isMounted = false
      unsubscribeDisplay?.()
      unsubscribeRuntimeEvents?.()
      unsubscribeRejections?.()
      unsubscribeHealth?.()
      if (backgroundHandle !== null) cancelIdle(backgroundHandle)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadPlaylists, loadSongs, setDisplayCount, setLoading, setSafeMode, showToast])
}
