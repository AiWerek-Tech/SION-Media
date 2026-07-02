import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useMemo } from 'react'
import { createPortal } from 'react-dom'
import logoPng from '@renderer/assets/logo.png'
import { useBootStore } from './bootStore'

const VISIBLE_PHASES = new Set(['native', 'renderer', 'critical', 'shell', 'optional'])

const BOOT_STATUS_LABELS: Record<string, string> = {
  theme: 'Memulihkan tema dan ruang kerja',
  display: 'Mendeteksi layar yang terhubung',
  playlists: 'Memuat daftar putar',
  songs: 'Memuat perpustakaan lagu',
  hymnals: 'Memuat buku nyanyian'
}

export function SplashScreen(): React.JSX.Element | null {
  const phase = useBootStore((state) => state.phase)
  const tasks = useBootStore((state) => state.tasks)
  const shouldReduceMotion = useReducedMotion()

  const progressPercent = useMemo(() => {
    if (tasks.length === 0) return 0
    const totalProgress = tasks.reduce((sum, task) => sum + task.progress, 0)
    return Math.round(totalProgress / tasks.length)
  }, [tasks])

  const statusMessage = useMemo(() => {
    const activeTask = tasks.find((task) => task.status === 'running')
    if (!activeTask) return 'Menyiapkan ruang kerja'
    return BOOT_STATUS_LABELS[activeTask.id] ?? activeTask.label
  }, [tasks])

  return createPortal(
    <AnimatePresence>
      {VISIBLE_PHASES.has(phase) ? (
        <motion.div
          key="boot-splash"
          initial={false}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: shouldReduceMotion ? 0 : 0.28, ease: [0.22, 1, 0.36, 1] }}
          className="boot-splash pointer-events-none fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden"
          aria-label="SION Media sedang dimulai"
        >
          <motion.div
            aria-hidden="true"
            className="boot-splash__ambient absolute"
            animate={
              shouldReduceMotion
                ? { opacity: 0.12, scale: 1 }
                : { opacity: [0.1, 0.16, 0.1], scale: [1, 1.08, 1] }
            }
            transition={
              shouldReduceMotion
                ? { duration: 0 }
                : { duration: 4.5, repeat: Infinity, ease: 'easeInOut' }
            }
          />

          <div className="boot-splash__content relative flex flex-col items-center text-center">
            <motion.div
              initial={false}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: shouldReduceMotion ? 0 : 0.42, ease: [0.22, 1, 0.36, 1] }}
              className="boot-splash__brand flex items-center justify-center"
            >
              <img src={logoPng} alt="Logo SION Media" className="h-14 w-14 object-contain" />
            </motion.div>

            <h1 className="boot-splash__wordmark font-extrabold tracking-[-0.045em] text-text-primary">
              SION <span className="text-accent">Media</span>
            </h1>
            <p className="boot-splash__tagline font-semibold uppercase text-text-muted">
              Worship Presentation System
            </p>

            <div className="boot-splash__progress-block w-full">
              <div
                role="progressbar"
                aria-label="Progres startup"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={progressPercent}
                className="boot-splash__track overflow-hidden"
              >
                <motion.div
                  className="boot-splash__bar h-full"
                  initial={false}
                  animate={{ width: `${progressPercent}%` }}
                  transition={{ duration: shouldReduceMotion ? 0 : 0.35, ease: 'easeOut' }}
                />
              </div>

              <div className="boot-splash__status flex items-center justify-between">
                <span aria-live="polite">{statusMessage}</span>
                <span>{progressPercent}%</span>
              </div>
            </div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body
  )
}
