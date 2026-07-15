import React, { Suspense, lazy, useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore } from './store/useAppStore'
import { usePlaylistStore } from './store/usePlaylistStore'
import { useModeStore } from './store/useModeStore'
import { useDisplayStore } from './store/useDisplayStore'
import { useProjectionStore } from './store/useProjectionStore'
import {
  usePowerPointBridgeStore,
  type PowerPointBridgeSourceState
} from './store/usePowerPointBridgeStore'
import { loadPowerPointBridgeSource } from './utils/powerPointBridge'
import { Toast } from './components/Toast'
import { CommandPalette } from './components/CommandPalette'
import { KeyboardCheatSheet } from './components/KeyboardCheatSheet'
import { QuickJumpOverlay } from './components/QuickJumpOverlay'
import { RuntimeInspector } from './components/RuntimeInspector'
import { EmergencyPanel } from './components/projection/EmergencyPanel'
import { TitleBar } from './components/titlebar/TitleBar'
import { ModalRegistry } from './components/modals/ModalRegistry'
import { ErrorBoundary } from './components/ErrorBoundary'
import { useAppBootstrap } from './hooks/useAppBootstrap'
import { useTimerTick } from './hooks/useTimerTick'
import { useGlobalShortcuts } from './hooks/useGlobalShortcuts'
import { useCrashRecovery } from './hooks/useCrashRecovery'
import { useModePreloader } from './startup/useModePreloader'
import { useBootStore } from './startup/bootStore'
import { executeRuntimeCommand } from './utils/runtimeCommandBus'
import {
  attachPresenterRemoteVisualDataUrl,
  getPresenterRemotePdfVisualKey,
  summarizePresenterRemoteSlide
} from './utils/presenterRemoteSnapshot'
import { getCachedPdfPageImage, prefetchAndCachePdfPage } from './utils/pdfUtils'
import { SplashScreen } from './startup/SplashScreen'
import { RendererBootScreen } from './startup/RendererBootScreen'
import { LoadingSkeleton, SkeletonVariant } from './components/design-system/LoadingSkeleton'

const PRESENTER_REMOTE_PDF_RENDER_SCALE = 0.65

function splitStageNotesAndChord(notes: string | null | undefined): {
  notes?: string
  chord?: string
} {
  const value = notes?.trim()
  if (!value) return {}
  const chordPattern = /\b([A-G](?:#|b)?(?:m|maj|min|sus|dim|aug|add)?\d*(?:\/[A-G](?:#|b)?)?)\b/
  const lines = value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
  const chordLines = lines.filter((line) => chordPattern.test(line) && line.length <= 80)
  if (chordLines.length > 0) {
    return {
      chord: chordLines.slice(0, 4).join('  '),
      notes: lines.filter((line) => !chordLines.includes(line)).join('\n') || undefined
    }
  }
  return { notes: value }
}

const ProjectionMode = lazy(() =>
  import('./screens/modes/ProjectionMode').then((module) => ({ default: module.ProjectionMode }))
)
const LibraryMode = lazy(() =>
  import('./screens/modes/LibraryModeRedesigned').then((module) => ({
    default: module.LibraryMode
  }))
)
const ManagementMode = lazy(() =>
  import('./screens/modes/ManagementMode').then((module) => ({ default: module.ManagementMode }))
)
const BroadcastMode = lazy(() =>
  import('./screens/modes/BroadcastMode').then((module) => ({ default: module.BroadcastMode }))
)
const WelcomeScreen = lazy(() =>
  import('./screens/WelcomeScreen').then((module) => ({ default: module.WelcomeScreen }))
)
const SongEditorScreen = lazy(() =>
  import('./screens/SongEditorScreen').then((module) => ({ default: module.SongEditorScreen }))
)
const SettingsScreen = lazy(() =>
  import('./screens/SettingsScreen').then((module) => ({ default: module.SettingsScreen }))
)
const ImportExportScreen = lazy(() =>
  import('./screens/ImportExportScreen').then((module) => ({ default: module.ImportExportScreen }))
)

function App(): React.JSX.Element {
  const { currentScreen, setScreen } = useAppStore()
  const isLyricsFullscreen = useDisplayStore((s) => s.isLyricsFullscreen)
  const isBibleFullscreen = useDisplayStore((s) => s.isBibleFullscreen)
  const presenterProjectionState = useProjectionStore((s) => s.projectionState)
  const presenterProgramSlide = useProjectionStore((s) => s.programSlide)
  const presenterProgramSlideIndex = useProjectionStore((s) => s.programSlideIndex)
  const presenterNextSlideData = useProjectionStore((s) => s.nextSlideData)
  const presenterNextSlideIndex = useProjectionStore((s) => s.nextSlideIndex)
  const presenterTotalSlides = useProjectionStore((s) => s.programSlides.length)
  const presenterHasNextSlide = useProjectionStore((s) => s.hasNextSlide)
  const presenterFlowPosition = useProjectionStore((s) => s.flowPosition)
  const presenterIsSmartMode = useProjectionStore((s) => s.isSmartMode)
  const presenterTimerElapsed = useProjectionStore((s) => s.timerElapsed)
  const presenterTimerRunning = useProjectionStore((s) => s.timerRunning)
  const presenterProgramSongBackgroundConfig = useProjectionStore(
    (s) => s.programSongBackgroundConfig
  )
  const { playlistItems, activePlaylist } = usePlaylistStore()
  const { currentMode, isFirstInstall } = useModeStore()
  const phase = useBootStore((s) => s.phase)
  const [showCommandPalette, setShowCommandPalette] = useState(false)
  const [showShortcuts, setShowShortcuts] = useState(false)
  const [showQuickJump, setShowQuickJump] = useState(false)
  const [showRuntimeInspector, setShowRuntimeInspector] = useState(false)
  const [showEmergencyPanel, setShowEmergencyPanel] = useState(false)
  const [presenterPdfVisualCache, setPresenterPdfVisualCache] = useState<Record<string, string>>({})
  const [isStoreHydrated, setIsStoreHydrated] = useState(() => useModeStore.persist.hasHydrated())

  useEffect(() => {
    if (isStoreHydrated) return undefined
    const unsub = useModeStore.persist.onFinishHydration(() => {
      setIsStoreHydrated(true)
    })
    return unsub
  }, [isStoreHydrated])

  const getSkeletonVariant = (): SkeletonVariant => {
    if (currentScreen === 'song-editor') return 'editor'
    if (currentScreen === 'settings') return 'settings'
    if (currentScreen === 'import-export') return 'import-export'

    if (isFirstInstall) return 'welcome'
    if (currentMode === 'PROJECTION') return 'projection'
    if (currentMode === 'LIBRARY') return 'library'
    if (currentMode === 'MANAGEMENT') return 'management'
    if (currentMode === 'BROADCAST') return 'projection'
    return 'default'
  }

  useAppBootstrap()
  useTimerTick()
  useCrashRecovery()
  useModePreloader(currentMode)

  useGlobalShortcuts({
    currentScreen,
    activePlaylistId: activePlaylist?.id ?? null,
    playlistLength: playlistItems.length,
    setScreen,
    setShowCommandPalette,
    setShowShortcuts,
    setShowQuickJump,
    setShowRuntimeInspector,
    setShowEmergencyPanel
  })

  useEffect(() => {
    return window.api.presenterRemote.onCommand((command, payload) => {
      switch (command) {
        case 'PRESENTATION_SOURCE': {
          const source = payload as
            | {
                imagePath?: unknown
                title?: unknown
                notes?: unknown
                slideIndex?: unknown
                totalSlides?: unknown
                autoTake?: unknown
              }
            | undefined
          if (!source || typeof source.imagePath !== 'string' || !source.imagePath) break
          const bridge = usePowerPointBridgeStore.getState()
          const bridgeSource = source as PowerPointBridgeSourceState
          bridge.setSource(bridgeSource)
          if (bridge.autoPreview) loadPowerPointBridgeSource(bridgeSource, bridge.autoLive)
          break
        }
        case 'NEXT':
          executeRuntimeCommand('NAV_NEXT_SLIDE', undefined, 'PRESENTER_REMOTE')
          break
        case 'PREV':
          executeRuntimeCommand('NAV_PREV_SLIDE', undefined, 'PRESENTER_REMOTE')
          break
        case 'TAKE':
          executeRuntimeCommand('PROJ_TAKE_CUE', undefined, 'PRESENTER_REMOTE')
          break
        case 'CLEAR':
          executeRuntimeCommand('PROJ_CLEAR', undefined, 'PRESENTER_REMOTE')
          break
        case 'BLACK':
          executeRuntimeCommand('PROJ_BLACK', undefined, 'PRESENTER_REMOTE')
          break
        case 'FREEZE':
          executeRuntimeCommand('PROJ_FREEZE', undefined, 'PRESENTER_REMOTE')
          break
        case 'LOGO':
          useProjectionStore.getState().toggleLogo()
          break
        case 'GOTO': {
          const slideIndex =
            payload && typeof payload === 'object' && 'slideIndex' in payload
              ? Number((payload as { slideIndex?: unknown }).slideIndex)
              : NaN
          if (Number.isInteger(slideIndex) && slideIndex >= 0) {
            executeRuntimeCommand('NAV_GOTO_SLIDE', { slideIndex }, 'PRESENTER_REMOTE')
          }
          break
        }
        case 'TIMER_START':
          executeRuntimeCommand('TIMER_START', undefined, 'PRESENTER_REMOTE')
          break
        case 'TIMER_STOP':
          executeRuntimeCommand('TIMER_STOP', undefined, 'PRESENTER_REMOTE')
          break
        case 'TIMER_RESET':
          executeRuntimeCommand('TIMER_RESET', undefined, 'PRESENTER_REMOTE')
          break
      }
    })
  }, [])

  useEffect(() => {
    let cancelled = false
    const slides = [presenterProgramSlide, presenterNextSlideData]

    const storeRenderedPage = (key: string, dataUrl: string): void => {
      if (cancelled) return
      setPresenterPdfVisualCache((previous) => {
        if (previous[key] === dataUrl) return previous
        return { ...previous, [key]: dataUrl }
      })
    }

    for (const slide of slides) {
      const key = getPresenterRemotePdfVisualKey(slide)
      const pdfPath = slide?.pdfPath
      if (!key || !pdfPath) continue

      const pageNumber = slide.slideIndex + 1
      const cached = getCachedPdfPageImage(pdfPath, pageNumber, PRESENTER_REMOTE_PDF_RENDER_SCALE)
      if (cached) {
        storeRenderedPage(key, cached)
        continue
      }

      void prefetchAndCachePdfPage(pdfPath, pageNumber, PRESENTER_REMOTE_PDF_RENDER_SCALE).then(
        () => {
          const rendered = getCachedPdfPageImage(
            pdfPath,
            pageNumber,
            PRESENTER_REMOTE_PDF_RENDER_SCALE
          )
          if (rendered) storeRenderedPage(key, rendered)
        }
      )
    }

    return () => {
      cancelled = true
    }
  }, [presenterProgramSlide, presenterNextSlideData])

  useEffect(() => {
    const currentStageMeta = splitStageNotesAndChord(
      playlistItems.find((item) => item.id === presenterProgramSlide?.playlistItemId)?.notes
    )
    const nextStageMeta = splitStageNotesAndChord(
      playlistItems.find((item) => item.id === presenterNextSlideData?.playlistItemId)?.notes
    )
    const currentSlideSummary = summarizePresenterRemoteSlide(
      presenterProgramSlide,
      presenterProgramSongBackgroundConfig,
      currentStageMeta
    )
    const nextSlideSummary = summarizePresenterRemoteSlide(
      presenterNextSlideData,
      presenterProgramSongBackgroundConfig,
      nextStageMeta
    )
    const currentPdfKey = getPresenterRemotePdfVisualKey(presenterProgramSlide)
    const nextPdfKey = getPresenterRemotePdfVisualKey(presenterNextSlideData)

    window.api.presenterRemote.updateSnapshot({
      projectionState: presenterProjectionState,
      currentSlide: attachPresenterRemoteVisualDataUrl(
        currentSlideSummary,
        currentPdfKey ? presenterPdfVisualCache[currentPdfKey] : undefined
      ),
      nextSlide: attachPresenterRemoteVisualDataUrl(
        nextSlideSummary,
        nextPdfKey ? presenterPdfVisualCache[nextPdfKey] : undefined
      ),
      currentIndex: presenterProgramSlideIndex,
      nextIndex: presenterNextSlideIndex,
      totalSlides: presenterTotalSlides,
      hasNextSlide: presenterHasNextSlide,
      flowPosition: presenterFlowPosition,
      isSmartMode: presenterIsSmartMode,
      timerElapsed: presenterTimerElapsed,
      timerRunning: presenterTimerRunning,
      updatedAt: Date.now()
    })
  }, [
    presenterProjectionState,
    presenterProgramSlide,
    presenterProgramSlideIndex,
    presenterTotalSlides,
    presenterNextSlideData,
    presenterNextSlideIndex,
    presenterHasNextSlide,
    presenterFlowPosition,
    presenterIsSmartMode,
    presenterTimerElapsed,
    presenterTimerRunning,
    presenterProgramSongBackgroundConfig,
    playlistItems,
    presenterPdfVisualCache
  ])

  const renderScreen = (): React.JSX.Element | null => {
    if (!isStoreHydrated) return null
    if (currentScreen === 'song-editor') {
      return (
        <ErrorBoundary mode="Song Editor">
          <SongEditorScreen />
        </ErrorBoundary>
      )
    }
    if (currentScreen === 'settings') {
      return (
        <ErrorBoundary mode="Settings">
          <SettingsScreen />
        </ErrorBoundary>
      )
    }
    if (currentScreen === 'import-export') {
      return (
        <ErrorBoundary mode="Import/Export">
          <ImportExportScreen />
        </ErrorBoundary>
      )
    }

    if (isFirstInstall) {
      return <WelcomeScreen />
    }
    if (currentMode === 'PROJECTION') {
      return (
        <ErrorBoundary mode="Projection">
          <ProjectionMode />
        </ErrorBoundary>
      )
    }
    if (currentMode === 'LIBRARY') {
      return (
        <ErrorBoundary mode="Library">
          <LibraryMode />
        </ErrorBoundary>
      )
    }
    if (currentMode === 'MANAGEMENT') {
      return (
        <ErrorBoundary mode="Management">
          <ManagementMode />
        </ErrorBoundary>
      )
    }
    if (currentMode === 'BROADCAST') {
      return (
        <ErrorBoundary mode="Broadcast">
          <BroadcastMode />
        </ErrorBoundary>
      )
    }
    return null
  }

  return (
    <>
      <SplashScreen />
      <div
        className="flex flex-col h-screen w-screen bg-bg-base overflow-hidden"
        role="application"
        aria-label="SION Media"
      >
        <a href="#main-content" className="skip-to-content">
          Skip to content
        </a>
        <div
          id="aria-announcements"
          className="aria-live-region"
          aria-live="polite"
          aria-atomic="true"
        />
        {!isLyricsFullscreen && !isBibleFullscreen && <TitleBar />}
        <div id="main-content" className="flex-1 relative min-h-0" role="main" tabIndex={-1}>
          <Toast />
          <ModalRegistry />
          <CommandPalette
            isOpen={showCommandPalette}
            onClose={() => setShowCommandPalette(false)}
          />
          <KeyboardCheatSheet isOpen={showShortcuts} onClose={() => setShowShortcuts(false)} />
          <QuickJumpOverlay
            isOpen={showQuickJump}
            onClose={() => setShowQuickJump(false)}
            mode="preview"
          />

          <Suspense
            fallback={
              <div className="absolute inset-0 z-10 bg-bg-base overflow-hidden">
                <LoadingSkeleton variant={getSkeletonVariant()} />
              </div>
            }
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={
                  currentScreen !== 'dashboard'
                    ? currentScreen
                    : isFirstInstall
                      ? 'welcome'
                      : currentMode
                }
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                className="absolute inset-0"
              >
                {renderScreen()}
              </motion.div>
            </AnimatePresence>
          </Suspense>

          {!isFirstInstall && phase === 'failed' && <RendererBootScreen />}
        </div>
        <RuntimeInspector
          isOpen={showRuntimeInspector}
          onClose={() => setShowRuntimeInspector(false)}
        />
        <EmergencyPanel isOpen={showEmergencyPanel} onClose={() => setShowEmergencyPanel(false)} />
      </div>
    </>
  )
}

export default App
