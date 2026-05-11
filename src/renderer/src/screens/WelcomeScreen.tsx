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

  const statusTitle = ready ? 'All systems operational' : statusMessages[statusIndex]

  return (
    <div className="drag-area relative flex h-full w-full flex-col items-center justify-center overflow-hidden px-6">
      <MeshBackground />

      <div
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-24"
        style={{
          background:
            'linear-gradient(180deg, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.0) 100%)'
        }}
      />

      <div
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          backgroundImage:
            'radial-gradient(circle at 50% 0%, rgba(255,255,255,0.05), transparent 45%),' +
            'radial-gradient(circle at 0% 100%, rgba(255,255,255,0.03), transparent 40%)'
        }}
      />

      <motion.div
        className="pointer-events-none absolute inset-0 -z-10"
        initial={{ opacity: 0.55 }}
        animate={{ opacity: [0.45, 0.7, 0.45] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          background:
            'radial-gradient(circle at 55% 45%, rgba(59,130,246,0.10), transparent 58%),' +
            'radial-gradient(circle at 45% 55%, rgba(139,92,246,0.08), transparent 62%)'
        }}
      />

      <motion.div
        className="pointer-events-none absolute inset-0 -z-10"
        initial={{ opacity: 0.22 }}
        animate={{ opacity: [0.18, 0.26, 0.18] }}
        transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          background:
            'radial-gradient(700px 320px at 20% 30%, rgba(59,130,246,0.10), transparent 60%),' +
            'radial-gradient(680px 340px at 85% 55%, rgba(139,92,246,0.08), transparent 62%),' +
            'radial-gradient(620px 320px at 55% 85%, rgba(59,130,246,0.06), transparent 60%)',
          filter: 'blur(24px)'
        }}
      />

      <div
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            'radial-gradient(circle at 50% 50%, transparent 45%, rgba(0,0,0,0.55) 100%)'
        }}
      />

      <div
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.035] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/></filter><rect width='100%25' height='100%25' filter='url(%23n)' opacity='0.35'/></svg>\")"
        }}
      />

      {/* Ambient volumetric glow behind logo */}
      <motion.div
        className="pointer-events-none absolute top-[22%] left-1/2 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 0.55, scale: 1 }}
        transition={{ duration: 1.4, ease: easePremium }}
        style={{
          background:
            'radial-gradient(circle at 50% 50%, rgba(59,130,246,0.22), transparent 55%),' +
            'radial-gradient(circle at 50% 50%, rgba(139,92,246,0.12), transparent 68%)',
          filter: 'blur(60px)'
        }}
      />

      {/* Floating content stack - generous gaps between sections */}
      <div className="no-drag-area relative z-10 flex flex-col items-center text-center gap-10">
        {/* Header Group - tight internal spacing */}
        <div className="flex flex-col items-center gap-3">
          {/* Logo with volumetric glow */}
          <motion.div
            className="relative flex h-[96px] w-[96px] items-center justify-center"
            initial={{ opacity: 0, y: 12, scale: 0.92 }}
            animate={{ opacity: 1, y: [0, -4, 0], scale: 1 }}
            transition={{
              opacity: { duration: 0.9, ease: easePremium },
              scale: { duration: 0.9, ease: easePremium },
              y: { duration: 9, repeat: Infinity, ease: 'easeInOut' }
            }}
          >
            <div
              className="pointer-events-none absolute inset-[-24px]"
              style={{
                background:
                  'radial-gradient(circle at 50% 50%, rgba(59,130,246,0.28), transparent 60%),' +
                  'radial-gradient(circle at 50% 50%, rgba(139,92,246,0.14), transparent 72%)',
                filter: 'blur(22px)'
              }}
            />
            <motion.div
              className="pointer-events-none absolute inset-[-44px]"
              animate={{ opacity: [0.35, 0.55, 0.35], scale: [0.98, 1.03, 0.98] }}
              transition={{ duration: 8.5, repeat: Infinity, ease: 'easeInOut' }}
              style={{
                background:
                  'radial-gradient(circle at 50% 50%, rgba(59,130,246,0.16), transparent 58%),' +
                  'radial-gradient(circle at 50% 50%, rgba(139,92,246,0.09), transparent 70%)',
                filter: 'blur(28px)'
              }}
            />
            <img src={logoSrc} alt="SION Media" className="h-16 w-16 object-contain" draggable={false} />
          </motion.div>

          {/* Ambient haze behind title */}
          <motion.div
            className="pointer-events-none absolute -top-4 left-1/2 h-[280px] w-[500px] -translate-x-1/2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.3 }}
            transition={{ duration: 1.6, ease: easePremium }}
            style={{
              background:
                'radial-gradient(circle at 50% 50%, rgba(59,130,246,0.12), transparent 55%),' +
                'radial-gradient(circle at 50% 50%, rgba(139,92,246,0.06), transparent 70%)',
              filter: 'blur(50px)'
            }}
          />

          {/* Title */}
          <motion.h1
            className="text-[56px] font-bold leading-[1.0] tracking-tight text-text-primary"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.12, ease: easePremium }}
          >
            SION Media
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            className="text-[16px] font-normal tracking-wide text-text-secondary/70"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.22, ease: easePremium }}
          >
            Elevating Worship Experience
          </motion.p>
        </div>

        {/* System status - glassmorphism pill */}
        <motion.div
          className="flex items-center gap-3 rounded-full bg-white/[0.04] px-5 py-2.5 backdrop-blur-sm ring-1 ring-white/[0.06]"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.32, ease: easePremium }}
        >
          {/* Pulsing indicator */}
          <span className="relative flex h-2.5 w-2.5">
            {ready && (
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-primary opacity-60" />
            )}
            <span
              className={`relative inline-flex h-2.5 w-2.5 rounded-full ${
                ready
                  ? 'bg-brand-primary shadow-[0_0_10px_rgba(59,130,246,0.55)]'
                  : 'animate-pulse bg-white/[0.50]'
              }`}
            />
          </span>
          <span className="text-[12px] font-medium tracking-wide text-text-secondary/80">
            {ready
              ? 'Engine Online • Library Indexed • Renderer Ready'
              : `${statusTitle}${!ready ? `  •  ${Math.round(progress)}%` : ''}`
            }
          </span>
        </motion.div>

        {/* Progress bar - only during loading */}
        {!ready && (
          <motion.div
            className="h-[3px] w-[200px] overflow-hidden rounded-full bg-white/[0.06]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.38 }}
          >
            <motion.div
              className="h-full bg-[linear-gradient(90deg,rgba(59,130,246,1),rgba(139,92,246,1))]"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.25, ease: 'linear' }}
            />
          </motion.div>
        )}

        {/* CTA - isolated with breathing room */}
        <AnimatePresence>
          {ready && (
            <motion.div
              initial={{ opacity: 0, y: 14, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.5, ease: easePremium }}
            >
              <MagneticButton onClick={onNext}>
                Launch Studio
                <ArrowRight size={16} />
              </MagneticButton>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Version badge - bottom of screen, away from CTA */}
      <motion.div
        className="no-drag-area absolute bottom-6 text-[10px] font-mono uppercase tracking-widest text-text-disabled/35"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.5 }}
      >
        V3.0 AURORA
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
        className="relative z-10 w-full max-w-3xl px-4"
      >
        <div className="mb-16 text-center">
          <h2 className="text-2xl font-bold tracking-tight text-text-primary">
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
            className={`group relative flex flex-col items-center rounded-2xl border p-8 transition-all duration-300 ${
              value === 'system'
                ? 'border-brand-primary/30 bg-[radial-gradient(circle_at_50%_0%,rgba(59,130,246,0.07),transparent_60%),linear-gradient(180deg,rgba(27,32,49,0.62),rgba(13,15,23,0.46))] shadow-[0_0_28px_rgba(59,130,246,0.10)]'
                : 'border-border-subtle bg-bg-surface/30 hover:border-border-default hover:bg-bg-surface/50'
            }`}
          >
            <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.03]">
              <MonitorSmartphone size={24} className="text-accent" />
            </div>
            <h3 className="mb-2 text-sm font-semibold text-text-primary">System</h3>
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
            className={`group relative flex flex-col items-center rounded-2xl border p-8 transition-all duration-300 ${
              value === 'dark'
                ? 'border-brand-primary/30 bg-[radial-gradient(circle_at_50%_0%,rgba(59,130,246,0.08),transparent_60%),linear-gradient(180deg,rgba(27,32,49,0.70),rgba(13,15,23,0.55))] shadow-[0_0_28px_rgba(59,130,246,0.10)]'
                : 'border-border-subtle bg-bg-surface/30 hover:border-border-default hover:bg-bg-surface/50'
            }`}
          >
            <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.03]">
              <Moon size={24} className="text-brand-primary" />
            </div>
            <h3 className="mb-2 text-sm font-semibold text-text-primary">Celestial Dark</h3>
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
            className={`group relative flex flex-col items-center rounded-2xl border p-8 transition-all duration-300 ${
              value === 'light'
                ? 'border-brand-primary/30 bg-[radial-gradient(circle_at_50%_0%,rgba(59,130,246,0.06),transparent_60%),linear-gradient(180deg,rgba(241,245,249,0.95),rgba(226,232,240,0.90))] shadow-[0_0_28px_rgba(59,130,246,0.08)]'
                : 'border-border-subtle bg-bg-surface/30 hover:border-border-default hover:bg-bg-surface/50'
            }`}
          >
            <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.03]">
              <Sun size={24} className="text-status-warning" />
            </div>
            <h3 className="mb-2 text-sm font-semibold text-text-primary">Sacred Light</h3>
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
          <div className="flex items-center gap-4">
            <button onClick={onBack} className="btn-premium h-11 px-10 text-[13px]">
              Kembali
            </button>
            <button
              onClick={onNext}
              className="btn-premium btn-premium-primary h-11 px-12 text-[13px]"
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
      className="group relative inline-flex h-11 items-center justify-center gap-2 rounded-full bg-brand-primary px-8 text-[14px] font-semibold text-white shadow-lg shadow-brand-primary/25 transition-all duration-200 hover:bg-brand-primary-hover hover:shadow-xl hover:shadow-brand-primary/30 hover:-translate-y-0.5"
    >
      {/* Inner highlight */}
      <div className="pointer-events-none absolute inset-0 rounded-[inherit] [background:linear-gradient(180deg,rgba(255,255,255,0.1)_0%,transparent_50%)]" />

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
