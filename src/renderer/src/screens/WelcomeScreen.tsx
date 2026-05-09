import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence, useMotionValue, useSpring } from 'framer-motion'
import {
  Library,
  LayoutDashboard,
  Settings,
  Moon,
  Sun,
  MonitorSmartphone,
  ArrowRight,
  Check
} from 'lucide-react'
import { useModeStore, type AppMode, type AppTheme } from '../store/useModeStore'
import { useAppStore } from '../store/useAppStore'
import logoSrc from '../assets/logo.png'

const easePremium = [0.22, 1, 0.36, 1] as const

/* ── Background Layer (shared) ── */
function MeshBackground({ opacity = 0.45 }: { opacity?: number }): React.JSX.Element {
  return (
    <div
      className="absolute inset-0 -z-10"
      style={{
        opacity,
        background:
          'radial-gradient(circle at 20% 30%, rgba(59,130,246,0.14), transparent 55%), ' +
          'radial-gradient(circle at 80% 20%, rgba(139,92,246,0.10), transparent 55%), ' +
          'radial-gradient(circle at 50% 80%, rgba(59,130,246,0.08), transparent 55%)'
      }}
    />
  )
}

/* ── Phase 1: Splash & Identity ── */
function IntroPhase({ onNext }: { onNext: () => void }): React.JSX.Element {
  const [progress, setProgress] = useState(0)
  const [ready, setReady] = useState(false)
  const [statusIndex, setStatusIndex] = useState(0)
  const isLoading = useAppStore((s) => s.isLoading)

  useEffect(() => {
    const minDuration = 1500
    const start = Date.now()
    let finished = false

    const interval = setInterval(() => {
      const elapsed = Date.now() - start
      const base = Math.min((elapsed / minDuration) * 100, 100)

      // If loading is already done, jump to 100% smoothly (do not hold user)
      if (!isLoading && !finished) {
        finished = true
        setProgress(100)
        window.setTimeout(() => setReady(true), 180)
        clearInterval(interval)
        return
      }

      // Keep progress advancing but cap before completion while loading
      const capped = Math.min(base, 92)
      setProgress((p) => (p > capped ? p : capped))
    }, 50)

    return () => clearInterval(interval)
  }, [isLoading])

  useEffect(() => {
    if (!isLoading) return
    const t = window.setInterval(() => {
      setStatusIndex((i) => (i + 1) % 4)
    }, 800)
    return () => window.clearInterval(t)
  }, [isLoading])

  const statusMessages = [
    'Memuat database lagu...',
    'Menghubungkan monitor...',
    'Menyiapkan workspace...',
    'Menyinkronkan konfigurasi...'
  ]

  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden px-6">
      <MeshBackground />

      <div className="pointer-events-none absolute inset-x-0 bottom-6 flex items-center justify-between px-6 text-[10px] font-bold tracking-widest text-text-disabled/70">
        <span>Version 3.0.0 “Aurora”</span>
        <span className="uppercase">SION Media</span>
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.92, filter: 'blur(10px)' }}
        animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
        transition={{ duration: 0.9, ease: easePremium }}
        className="flex flex-col items-center text-center"
      >
        {/* Official Logo */}
        <div className="mb-10 flex h-28 w-28 items-center justify-center rounded-[28px] border border-brand-primary/15 bg-brand-primary/[0.07] shadow-[0_0_48px_rgba(59,130,246,0.14)]">
          <img
            src={logoSrc}
            alt="SION Media"
            className="h-16 w-16 object-contain"
            draggable={false}
          />
        </div>

        <h1 className="text-[32px] font-black tracking-tight text-text-primary">SION Media</h1>
        <p className="mt-3 text-sm font-medium tracking-wide text-text-secondary">
          Elevating Worship Experience
        </p>

        {/* Linear Progress Bar */}
        <div className="mt-12 h-[2px] w-56 overflow-hidden rounded-full bg-white/[0.06]">
          <motion.div
            className="h-full bg-brand-primary"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3, ease: 'linear' }}
          />
        </div>
        <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-text-muted">
          {ready ? 'System Ready' : statusMessages[statusIndex]}
        </p>

        {/* Get Started */}
        <AnimatePresence>
          {ready && (
            <MagneticButton onClick={onNext}>
              Get Started
              <ArrowRight size={16} />
            </MagneticButton>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}

/* ── Phase 2: Theme Selection ── */
function ThemePhase({
  value,
  onChange,
  onBack,
  onNext
}: {
  value: AppTheme
  onChange: (t: AppTheme) => void
  onBack: () => void
  onNext: () => void
}): React.JSX.Element {
  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden px-6 py-10">
      <MeshBackground opacity={0.35} />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: easePremium }}
        className="relative z-10 w-full max-w-xl"
      >
        <div className="mb-12 text-center">
          <h2 className="text-[26px] font-black tracking-tight text-text-primary">
            Pilih Tampilan
          </h2>
          <p className="mt-3 text-sm text-text-secondary">
            Personalisasi antarmuka agar sesuai dengan preferensi Anda.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {/* System */}
          <button
            onClick={() => onChange('system')}
            className={`group relative flex flex-col items-center rounded-2xl border p-10 transition-all duration-300 ${
              value === 'system'
                ? 'border-brand-primary/30 bg-[radial-gradient(circle_at_50%_0%,rgba(59,130,246,0.07),transparent_60%),linear-gradient(180deg,rgba(27,32,49,0.62),rgba(13,15,23,0.46))] shadow-[0_0_28px_rgba(59,130,246,0.10)]'
                : 'border-border-subtle bg-bg-surface/30 hover:border-border-default hover:bg-bg-surface/50'
            }`}
          >
            <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/[0.06] bg-white/[0.03]">
              <MonitorSmartphone size={28} className="text-accent" />
            </div>
            <h3 className="mb-2 text-base font-bold text-text-primary">System</h3>
            <p className="text-center text-xs leading-relaxed text-text-muted">
              Ikuti pengaturan tema dari OS.
            </p>
            {value === 'system' && (
              <div className="absolute right-4 top-4 flex h-6 w-6 items-center justify-center rounded-full bg-brand-primary text-white">
                <Check size={14} />
              </div>
            )}
          </button>

          {/* Celestial Dark */}
          <button
            onClick={() => onChange('dark')}
            className={`group relative flex flex-col items-center rounded-2xl border p-10 transition-all duration-300 ${
              value === 'dark'
                ? 'border-brand-primary/30 bg-[radial-gradient(circle_at_50%_0%,rgba(59,130,246,0.08),transparent_60%),linear-gradient(180deg,rgba(27,32,49,0.70),rgba(13,15,23,0.55))] shadow-[0_0_28px_rgba(59,130,246,0.10)]'
                : 'border-border-subtle bg-bg-surface/30 hover:border-border-default hover:bg-bg-surface/50'
            }`}
          >
            <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/[0.06] bg-white/[0.03]">
              <Moon size={28} className="text-brand-primary" />
            </div>
            <h3 className="mb-2 text-base font-bold text-text-primary">Celestial Dark</h3>
            <p className="text-center text-xs leading-relaxed text-text-muted">
              Deep indigo & black. Fokus maksimal untuk operasi malam hari.
            </p>
            {value === 'dark' && (
              <div className="absolute right-4 top-4 flex h-6 w-6 items-center justify-center rounded-full bg-brand-primary text-white">
                <Check size={14} />
              </div>
            )}
          </button>

          {/* Sacred Light */}
          <button
            onClick={() => onChange('light')}
            className={`group relative flex flex-col items-center rounded-2xl border p-10 transition-all duration-300 ${
              value === 'light'
                ? 'border-brand-primary/30 bg-[radial-gradient(circle_at_50%_0%,rgba(59,130,246,0.06),transparent_60%),linear-gradient(180deg,rgba(241,245,249,0.95),rgba(226,232,240,0.90))] shadow-[0_0_28px_rgba(59,130,246,0.08)]'
                : 'border-border-subtle bg-bg-surface/30 hover:border-border-default hover:bg-bg-surface/50'
            }`}
          >
            <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/[0.06] bg-white/[0.03]">
              <Sun size={28} className="text-status-warning" />
            </div>
            <h3 className="mb-2 text-base font-bold text-text-primary">Sacred Light</h3>
            <p className="text-center text-xs leading-relaxed text-text-muted">
              Clean grey & white. Terang dan nyaman untuk penggunaan siang.
            </p>
            {value === 'light' && (
              <div className="absolute right-4 top-4 flex h-6 w-6 items-center justify-center rounded-full bg-brand-primary text-white">
                <Check size={14} />
              </div>
            )}
          </button>
        </div>

        <div className="mt-12 flex justify-center">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="btn-premium h-11 px-8 text-[13px]">
              Kembali
            </button>
            <button
              onClick={onNext}
              className="btn-premium btn-premium-primary h-11 px-10 text-[13px]"
            >
              Lanjutkan
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

/* ── Phase 3: Mode Selection (Bento Grid) ── */
function ModePhase({
  value,
  onSelect,
  onBack,
  onConfirm
}: {
  value: AppMode
  onSelect: (mode: AppMode) => void
  onBack: () => void
  onConfirm: () => void
}): React.JSX.Element {
  const modes: {
    key: AppMode
    title: string
    desc: string
    icon: React.ReactNode
    glow: string
  }[] = [
    {
      key: 'LIBRARY',
      title: 'Library Mode',
      desc: 'Penggunaan personal, pencarian lirik, dan latihan.',
      icon: <Library size={28} className="text-brand-secondary" />,
      glow: 'rgba(139,92,246,0.18)'
    },
    {
      key: 'PROJECTION',
      title: 'Projection Mode',
      desc: 'Standar ibadah live dengan kontrol dual-monitor.',
      icon: (
        <img src={logoSrc} alt="" className="h-7 w-7 object-contain opacity-80" draggable={false} />
      ),
      glow: 'rgba(59,130,246,0.18)'
    },
    {
      key: 'BROADCAST',
      title: 'Broadcast Mode',
      desc: 'Produksi profesional dengan integrasi NDI/OBS.',
      icon: <LayoutDashboard size={28} className="text-status-warning" />,
      glow: 'rgba(245,158,11,0.18)'
    },
    {
      key: 'MANAGEMENT',
      title: 'Management Mode',
      desc: 'Pengelolaan database lagu dan konfigurasi buku.',
      icon: <Settings size={28} className="text-text-primary" />,
      glow: 'rgba(248,250,252,0.10)'
    }
  ]

  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden px-6 py-10">
      <MeshBackground opacity={0.28} />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: easePremium }}
        className="relative z-10 w-full max-w-4xl"
      >
        <div className="mb-12 text-center">
          <h2 className="text-[26px] font-black tracking-tight text-text-primary">
            Pilih Jalur Kerja
          </h2>
          <p className="mt-3 text-sm text-text-secondary">
            Anda dapat mengubah mode kapan saja melalui Title Bar.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {modes.map((m, i) => (
            <motion.button
              key={m.key}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: i * 0.1, ease: easePremium }}
              onClick={() => onSelect(m.key)}
              className={`group relative flex items-center gap-6 rounded-2xl border p-7 text-left transition-all duration-300 hover:bg-bg-surface/50 ${
                value === m.key
                  ? 'border-brand-primary/30 bg-bg-surface/50'
                  : 'border-border-subtle bg-bg-surface/30 hover:border-border-default'
              }`}
            >
              {/* Icon */}
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.03]">
                {m.icon}
              </div>

              <div className="min-w-0">
                <h3 className="mb-1 text-[15px] font-bold text-text-primary transition-colors group-hover:text-white">
                  {m.title}
                </h3>
                <p className="text-xs leading-relaxed text-text-muted">{m.desc}</p>
              </div>

              {/* Hover glow (subtle) */}
              <div
                className="absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100 pointer-events-none"
                style={{
                  boxShadow: `inset 0 0 0 1px ${m.glow}`
                }}
              />

              {value === m.key && (
                <div className="absolute right-4 top-4 flex h-6 w-6 items-center justify-center rounded-full bg-brand-primary text-white">
                  <Check size={14} />
                </div>
              )}
            </motion.button>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center gap-4">
          <div className="text-center text-[11px] tracking-wide text-text-disabled">
            Rekomendasi: Library Mode untuk orientasi awal. Anda tetap bisa memilih mode lain.
          </div>

          <div className="flex items-center gap-3">
            <button onClick={onBack} className="btn-premium h-11 px-8 text-[13px]">
              Kembali
            </button>
            <button
              onClick={onConfirm}
              className="btn-premium btn-premium-primary h-11 px-10 text-[13px]"
            >
              Mulai SION Media
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

/* ── Magnetic Button Component ── */
function MagneticButton({
  children,
  onClick
}: {
  children: React.ReactNode
  onClick: () => void
}): React.JSX.Element {
  const ref = useRef<HTMLButtonElement>(null)
  const x = useMotionValue(0)
  const y = useMotionValue(0)

  const springConfig = { damping: 15, stiffness: 150 }
  const springX = useSpring(x, springConfig)
  const springY = useSpring(y, springConfig)

  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>): void => {
    if (!ref.current) return
    const rect = ref.current.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2
    x.set(e.clientX - centerX)
    y.set(e.clientY - centerY)
  }

  const handleMouseLeave = (): void => {
    x.set(0)
    y.set(0)
  }

  return (
    <motion.button
      ref={ref}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: easePremium }}
      onClick={onClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ x: springX, y: springY }}
      className="btn-premium btn-premium-primary group relative mt-12 h-11 px-10 text-[13px]"
    >
      {/* Outer glow */}
      <div
        className="pointer-events-none absolute inset-[-6px] rounded-[inherit] opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background: 'radial-gradient(circle at 50% 50%, rgba(59,130,246,0.30), transparent 65%)',
          filter: 'blur(10px)'
        }}
      />
      <span className="relative z-10 flex items-center gap-2">{children}</span>
    </motion.button>
  )
}

/* ── Main Welcome Screen ── */
export function WelcomeScreen(): React.JSX.Element {
  const [phase, setPhase] = useState<1 | 2 | 3>(1)
  const [selectedTheme, setSelectedTheme] = useState<AppTheme>('system')
  const [selectedMode, setSelectedMode] = useState<AppMode>('LIBRARY')
  const finishOnboarding = useModeStore((s) => s.finishOnboarding)

  const handleFinish = (): void => {
    finishOnboarding({ theme: selectedTheme, mode: selectedMode })
  }

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-bg-base text-text-primary">
      <AnimatePresence mode="wait">
        {phase === 1 && (
          <motion.div
            key="intro"
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: -30 }}
            transition={{ duration: 0.5, ease: easePremium }}
          >
            <IntroPhase onNext={() => setPhase(2)} />
          </motion.div>
        )}

        {phase === 2 && (
          <motion.div
            key="theme"
            className="absolute inset-0"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -30 }}
            transition={{ duration: 0.5, ease: easePremium }}
          >
            <ThemePhase
              value={selectedTheme}
              onChange={setSelectedTheme}
              onBack={() => setPhase(1)}
              onNext={() => setPhase(3)}
            />
          </motion.div>
        )}

        {phase === 3 && (
          <motion.div
            key="mode"
            className="absolute inset-0"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -40 }}
            transition={{ duration: 0.5, ease: easePremium }}
          >
            <ModePhase
              value={selectedMode}
              onSelect={setSelectedMode}
              onBack={() => setPhase(2)}
              onConfirm={handleFinish}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
