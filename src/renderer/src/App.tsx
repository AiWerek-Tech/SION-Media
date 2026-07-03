import React, { Suspense, lazy, useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore } from './store/useAppStore'
import { usePlaylistStore } from './store/usePlaylistStore'
import { useModeStore } from './store/useModeStore'
import { useDisplayStore } from './store/useDisplayStore'
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
import { SplashScreen } from './startup/SplashScreen'
import { RendererBootScreen } from './startup/RendererBootScreen'
import { LoadingSkeleton, SkeletonVariant } from './components/design-system/LoadingSkeleton'

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
  const { playlistItems, activePlaylist } = usePlaylistStore()
  const { currentMode, isFirstInstall } = useModeStore()
  const phase = useBootStore((s) => s.phase)
  const [showCommandPalette, setShowCommandPalette] = useState(false)
  const [showShortcuts, setShowShortcuts] = useState(false)
  const [showQuickJump, setShowQuickJump] = useState(false)
  const [showRuntimeInspector, setShowRuntimeInspector] = useState(false)
  const [showEmergencyPanel, setShowEmergencyPanel] = useState(false)
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
