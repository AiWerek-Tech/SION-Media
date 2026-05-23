import { AnimatePresence, motion } from 'framer-motion'
import { useMemo, useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useBootStore } from './bootStore'
import logoPng from '@renderer/assets/logo.png'

const statusTips = [
  'Loading projection engine...',
  'Initializing GPU acceleration...',
  'Preparing display system...',
  'Loading worship database...',
  'Starting audio system...'
]

export function SplashScreen(): React.JSX.Element | null {
  const phase = useBootStore((state) => state.phase)
  const tasks = useBootStore((state) => state.tasks)
  const [tipIndex, setTipIndex] = useState(0)
  const [mounted, setMounted] = useState(false)

  // Ensure component mounted before using portal
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true)
  }, [])

  // Rotate tips
  useEffect(() => {
    const interval = setInterval(() => {
      setTipIndex((prev) => (prev + 1) % statusTips.length)
    }, 2000)
    return () => clearInterval(interval)
  }, [])

  // Calculate progress percentage
  const progressPercent = useMemo(() => {
    if (tasks.length === 0) return 0
    const completed = tasks.filter((t) => t.status === 'done').length
    return Math.round((completed / tasks.length) * 100)
  }, [tasks])

  // Get the current status message
  const statusMessage = useMemo(() => {
    const runningTask = tasks.find((t) => t.status === 'running')
    if (runningTask) {
      return runningTask.label.toUpperCase()
    }
    return statusTips[tipIndex]
  }, [tasks, tipIndex])

  // Get GPU or primary status
  const gpuStatus = useMemo(() => {
    const gpuTask = tasks.find((t) => t.label.toLowerCase().includes('gpu'))
    if (gpuTask) {
      return gpuTask.status === 'done' ? 'GPU ACTIVE' : 'GPU WARMING'
    }
    return 'GPU ACTIVE'
  }, [tasks])

  return !mounted
    ? null
    : createPortal(
        <AnimatePresence>
          {['native', 'renderer'].includes(phase) && (
            <div
              className="pointer-events-none fixed inset-0 z-[9999] flex items-center justify-center bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900"
              style={{ position: 'fixed', inset: 0 }}
            >
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.35, ease: [0.33, 1, 0.68, 1] }}
                className="absolute inset-0"
              >
                {/* Animated background glow */}
                <div className="absolute inset-0 overflow-hidden">
                  <motion.div
                    animate={{
                      scale: [1, 1.1, 1],
                      opacity: [0.1, 0.15, 0.1]
                    }}
                    transition={{ duration: 4, repeat: Infinity }}
                    className="absolute inset-0 bg-gradient-to-b from-brand-primary/10 via-transparent to-brand-secondary/10"
                  />
                </div>

                <div className="relative flex flex-col items-center justify-center gap-6 px-8">
                  {/* Logo */}
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.1, duration: 0.5, ease: 'easeOut' }}
                    className="flex items-center justify-center"
                  >
                    <div className="relative h-32 w-32">
                      {/* Glow ring */}
                      <motion.div
                        animate={{ opacity: [0.3, 0.6, 0.3] }}
                        transition={{ duration: 3, repeat: Infinity }}
                        className="absolute inset-0 rounded-full bg-gradient-to-b from-brand-primary/20 to-brand-secondary/20 blur-xl"
                      />
                      {/* Logo */}
                      <img
                        src={logoPng}
                        alt="SION Media Logo"
                        className="relative h-full w-full object-contain drop-shadow-2xl"
                      />
                    </div>
                  </motion.div>

                  {/* Title and Tagline */}
                  <motion.div
                    initial={{ y: 10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2, duration: 0.5 }}
                    className="flex flex-col items-center justify-center gap-2 text-center"
                  >
                    <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
                      SION Media
                    </h1>
                    <p className="text-base font-medium text-slate-200 sm:text-lg">
                      Professional worship presentation engine
                    </p>
                  </motion.div>

                  {/* Progress Bar */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.35, duration: 0.4 }}
                    className="w-full max-w-sm space-y-2"
                  >
                    {/* Progress bar container */}
                    <div className="h-2 overflow-hidden rounded-full bg-slate-800 shadow-[0_0_12px_rgba(59,130,246,0.15)]">
                      <motion.div
                        initial={{ x: '-100%' }}
                        animate={{ x: '100%' }}
                        transition={{
                          delay: 0.35,
                          duration: 1.8,
                          repeat: Infinity,
                          repeatType: 'loop'
                        }}
                        className="h-full w-1/3 bg-gradient-to-r from-transparent via-brand-primary to-transparent"
                      />
                    </div>

                    {/* Progress percentage */}
                    <div className="text-center">
                      <span className="text-xs font-semibold text-slate-400">
                        {progressPercent}% Complete
                      </span>
                    </div>
                  </motion.div>

                  {/* Status Container with Badge */}
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5, duration: 0.4 }}
                    className="w-full max-w-sm rounded-lg bg-gradient-to-br from-slate-900/40 via-slate-900/50 to-slate-950/40 backdrop-blur-sm border border-slate-800/50 px-4 py-3 shadow-[0_8px_24px_rgba(0,0,0,0.3)]"
                  >
                    <div className="flex items-center justify-between gap-3">
                      {/* Status text with fade animation */}
                      <motion.div
                        key={statusMessage}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.4 }}
                        className="flex-1"
                      >
                        <p className="text-xs uppercase tracking-widest text-slate-300 font-medium">
                          {statusMessage}
                        </p>
                      </motion.div>

                      {/* GPU Status Badge with Spinner */}
                      <div className="flex items-center gap-2 rounded-full bg-slate-800/40 px-3 py-1.5 border border-emerald-500/20">
                        {/* Spinner */}
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 2.5, repeat: Infinity, ease: 'linear' }}
                          className="flex items-center justify-center"
                        >
                          <div className="h-2 w-2 rounded-full border-1.5 border-slate-600 border-t-emerald-400" />
                        </motion.div>

                        {/* Badge text */}
                        <span className="text-xs font-bold uppercase tracking-widest text-emerald-300">
                          {gpuStatus}
                        </span>
                      </div>
                    </div>
                  </motion.div>

                  {/* Bottom accent */}
                  <motion.div
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ delay: 0.7, duration: 0.6 }}
                    className="h-0.5 w-24 bg-gradient-to-r from-transparent via-brand-primary to-transparent"
                  />
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )
}
