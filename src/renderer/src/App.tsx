import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore } from './store/useAppStore'
import { usePlaylistStore } from './store/usePlaylistStore'
import { SplashScreen } from './screens/SplashScreen'
import { SongEditorScreen } from './screens/SongEditorScreen'
import { SettingsScreen } from './screens/SettingsScreen'
import { ImportExportScreen } from './screens/ImportExportScreen'
import { BibleScreen } from './screens/BibleScreen'
import { ProjectionMode } from './screens/modes/ProjectionMode'
import { LibraryMode } from './screens/modes/LibraryModeRedesigned'
import { ManagementMode } from './screens/modes/ManagementMode'
import { BroadcastMode } from './screens/modes/BroadcastMode'
import { WelcomeScreen } from './screens/WelcomeScreen'
import { useModeStore } from './store/useModeStore'
import { Toast } from './components/Toast'
import { CommandPalette } from './components/CommandPalette'
import { KeyboardCheatSheet } from './components/KeyboardCheatSheet'
import { QuickJumpOverlay } from './components/QuickJumpOverlay'
import { RuntimeInspector } from './components/RuntimeInspector'
import { TitleBar } from './components/titlebar/TitleBar'
import { useAppBootstrap } from './hooks/useAppBootstrap'
import { useGlobalShortcuts } from './hooks/useGlobalShortcuts'
import { useCrashRecovery } from './hooks/useCrashRecovery'

function App(): React.JSX.Element {
  const { isLoading, currentScreen, setScreen } = useAppStore()
  const isLyricsFullscreen = useAppStore((s) => s.isLyricsFullscreen)
  const { playlistItems, activePlaylist } = usePlaylistStore()
  const { currentMode, isFirstInstall } = useModeStore()
  const [splashDone, setSplashDone] = useState(false)
  const [showCommandPalette, setShowCommandPalette] = useState(false)
  const [showShortcuts, setShowShortcuts] = useState(false)
  const [showQuickJump, setShowQuickJump] = useState(false)
  const [showRuntimeInspector, setShowRuntimeInspector] = useState(false)

  useAppBootstrap()
  useCrashRecovery()

  useEffect(() => {
    if (isFirstInstall) {
      // Onboarding handles its own splash in Phase 1 (IntroPhase)
      const timer = setTimeout(() => setSplashDone(true), 0)
      return (): void => {
        clearTimeout(timer)
      }
    }
    if (!isLoading) {
      const timer = setTimeout(() => setSplashDone(true), 800)
      return (): void => {
        clearTimeout(timer)
      }
    }
    return undefined
  }, [isLoading, isFirstInstall])

  useGlobalShortcuts({
    currentScreen,
    activePlaylistId: activePlaylist?.id ?? null,
    playlistLength: playlistItems.length,
    setScreen,
    setShowCommandPalette,
    setShowShortcuts,
    setShowQuickJump,
    setShowRuntimeInspector
  })

  if (!splashDone) {
    return <SplashScreen isLoading={isLoading} />
  }

  return (
    <div className="flex flex-col h-screen w-screen bg-bg-base overflow-hidden">
      {!isLyricsFullscreen && <TitleBar />}
      <div className="flex-1 relative min-h-0">
        <Toast />
        <CommandPalette isOpen={showCommandPalette} onClose={() => setShowCommandPalette(false)} />
        <KeyboardCheatSheet isOpen={showShortcuts} onClose={() => setShowShortcuts(false)} />
        <QuickJumpOverlay
          isOpen={showQuickJump}
          onClose={() => setShowQuickJump(false)}
          mode="preview"
        />
        <AnimatePresence mode="wait">
          {currentScreen === 'song-editor' ? (
            <motion.div
              key="song-editor"
              initial={{ opacity: 0, scale: 1.05 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-0 z-50"
            >
              <SongEditorScreen />
            </motion.div>
          ) : currentScreen === 'settings' ? (
            <motion.div
              key="settings"
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 100 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-0 z-50"
            >
              <SettingsScreen />
            </motion.div>
          ) : currentScreen === 'import-export' ? (
            <motion.div
              key="import-export"
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-0 bg-bg-base z-50"
            >
              <ImportExportScreen />
            </motion.div>
          ) : currentScreen === 'bible' ? (
            <motion.div
              key="bible"
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 100 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-0 z-50"
            >
              <BibleScreen />
            </motion.div>
          ) : isFirstInstall ? (
            <motion.div
              key="welcome"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, y: -40 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-0 z-50 bg-bg-base"
            >
              <WelcomeScreen />
            </motion.div>
          ) : currentMode === 'PROJECTION' ? (
            <motion.div
              key="projection"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="absolute inset-0"
            >
              <ProjectionMode />
            </motion.div>
          ) : currentMode === 'LIBRARY' ? (
            <motion.div
              key="library"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="absolute inset-0"
            >
              <LibraryMode />
            </motion.div>
          ) : currentMode === 'MANAGEMENT' ? (
            <motion.div
              key="management"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="absolute inset-0"
            >
              <ManagementMode />
            </motion.div>
          ) : currentMode === 'BROADCAST' ? (
            <motion.div
              key="broadcast"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="absolute inset-0"
            >
              <BroadcastMode />
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
      <RuntimeInspector
        isOpen={showRuntimeInspector}
        onClose={() => setShowRuntimeInspector(false)}
      />
    </div>
  )
}

export default App
