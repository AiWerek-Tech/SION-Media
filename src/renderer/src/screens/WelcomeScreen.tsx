import { useCallback, useEffect, useState, type ComponentType } from 'react'
import { ArrowRight, BookOpenText, LoaderCircle, MonitorCheck, UserRoundCheck } from 'lucide-react'
import LogoShadow from '@renderer/assets/logo-shadow.svg?react'
import { useModeStore } from '@renderer/store/useModeStore'
import {
  applyEffectiveTheme,
  buildThemeSyncPayload,
  resolveEffectiveTheme,
  watchSystemThemeChanges
} from '@renderer/utils/app-theme'

interface Capability {
  number: string
  title: string
  description: string
  icon: ComponentType<{ size?: number; strokeWidth?: number; className?: string }>
}

const CAPABILITIES: Capability[] = [
  {
    number: '01',
    title: 'Perpustakaan terpusat',
    description:
      'Temukan lagu dan ayat Alkitab dengan cepat, lalu siapkan susunan ibadah tanpa berpindah aplikasi.',
    icon: BookOpenText
  },
  {
    number: '02',
    title: 'Kontrol layar yang aman',
    description:
      'Preview materi sebelum ditampilkan agar operator selalu tahu apa yang sedang dilihat jemaat.',
    icon: MonitorCheck
  },
  {
    number: '03',
    title: 'Fokus pada operator',
    description:
      'Antarmuka yang tenang, navigasi yang jelas, dan kontrol penting yang selalu mudah dijangkau.',
    icon: UserRoundCheck
  }
]

const START_ERROR = 'Pengaturan awal belum dapat disimpan. Silakan coba lagi.'

export function WelcomeScreen(): React.JSX.Element {
  const finishOnboarding = useModeStore((state) => state.finishOnboarding)
  const [isStarting, setIsStarting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const syncSystemTheme = (): void => {
      applyEffectiveTheme(resolveEffectiveTheme('system'))
      window.api.appTheme?.setMode(buildThemeSyncPayload('system'))
    }

    syncSystemTheme()
    return watchSystemThemeChanges(syncSystemTheme)
  }, [])

  const handleStart = useCallback(async (): Promise<void> => {
    if (isStarting) return

    setIsStarting(true)
    setError(null)

    try {
      await window.api.settings?.update('app_theme_mode', 'system')
      await window.api.appTheme?.setMode(buildThemeSyncPayload('system'))
      finishOnboarding({ theme: 'system', mode: 'LIBRARY' })
    } catch (startError) {
      console.error('Failed to complete first-install setup:', startError)
      setError(START_ERROR)
    } finally {
      setIsStarting(false)
    }
  }, [finishOnboarding, isStarting])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key !== 'Enter' || event.repeat || isStarting) return
      event.preventDefault()
      void handleStart()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleStart, isStarting])

  return (
    <main className="relative h-full min-h-0 w-full overflow-hidden bg-bg-base text-text-primary">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at 14% 14%, rgba(49, 117, 246, 0.18), transparent 34%), radial-gradient(circle at 42% 86%, rgba(61, 203, 255, 0.07), transparent 32%)'
        }}
      />

      <div className="relative grid h-full min-h-0 grid-cols-[minmax(0,1.08fr)_minmax(390px,0.92fr)] max-[980px]:grid-cols-1 max-[980px]:overflow-y-auto">
        <section
          data-testid="welcome-editorial-hero"
          className="welcome-editorial__hero relative flex min-h-0 flex-col justify-center max-[980px]:min-h-[620px]"
        >
          <div className="no-drag-area">
            <div className="welcome-editorial__brandmark flex h-16 w-16 items-center justify-center rounded-[18px] border border-brand-primary/30 bg-brand-primary/10 shadow-[0_20px_56px_rgba(37,99,235,0.18)]">
              <LogoShadow className="h-9 w-9" />
            </div>

            <p className="welcome-editorial__eyebrow text-[10px] font-extrabold uppercase tracking-[0.18em] text-accent">
              Ruang kerja presentasi ibadah
            </p>

            <h1 className="welcome-editorial__title max-w-3xl font-black tracking-[-0.055em] text-text-primary">
              Siap melayani.
              <br />{' '}
              <span className="bg-gradient-to-r from-brand-primary to-accent bg-clip-text text-transparent">
                Tanpa kerumitan.
              </span>
            </h1>

            <p className="welcome-editorial__summary max-w-xl text-[clamp(0.875rem,1.1vw,1.05rem)] leading-7 text-text-secondary">
              Kelola lagu, Alkitab, dan layar jemaat dalam satu ruang kerja yang tenang, cepat, dan
              dapat diandalkan.
            </p>

            <div className="welcome-editorial__actions flex flex-col items-start gap-3">
              <button
                type="button"
                autoFocus
                disabled={isStarting}
                aria-busy={isStarting}
                onClick={() => void handleStart()}
                className="welcome-editorial__primary group inline-flex min-h-12 min-w-52 items-center justify-between gap-5 rounded-xl bg-gradient-to-br from-brand-primary to-blue-700 text-[13px] font-bold text-white shadow-[0_16px_40px_rgba(37,99,235,0.28)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_20px_48px_rgba(37,99,235,0.36)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg-base disabled:cursor-wait disabled:opacity-70 disabled:hover:translate-y-0"
              >
                <span>{isStarting ? 'Menyiapkan ruang kerja…' : 'Masuk ke SION Media'}</span>
                {isStarting ? (
                  <LoaderCircle size={17} className="animate-spin" aria-hidden="true" />
                ) : (
                  <ArrowRight
                    size={17}
                    aria-hidden="true"
                    className="transition-transform duration-200 group-hover:translate-x-1"
                  />
                )}
              </button>

              {error ? (
                <p role="alert" className="max-w-md text-xs leading-5 text-status-danger">
                  {error}
                </p>
              ) : null}
            </div>
          </div>

          <div className="welcome-editorial__footnote absolute flex items-center gap-2 text-[10px] text-text-disabled max-[980px]:static">
            <span className="h-1.5 w-1.5 rounded-full bg-accent shadow-[0_0_12px_rgba(56,189,248,0.9)]" />
            <span>Tema mengikuti sistem · Mode awal Perpustakaan</span>
          </div>
        </section>

        <aside
          data-testid="welcome-editorial-rail"
          aria-labelledby="welcome-capabilities-title"
          className="welcome-editorial__rail no-drag-area flex min-h-0 flex-col justify-center border-l border-border-subtle bg-bg-surface/35 backdrop-blur-sm max-[980px]:border-l-0 max-[980px]:border-t"
        >
          <div className="welcome-editorial__rail-header">
            <p className="text-[9px] font-extrabold uppercase tracking-[0.16em] text-text-muted">
              Dibangun untuk alur ibadah nyata
            </p>
            <h2
              id="welcome-capabilities-title"
              className="welcome-editorial__rail-title text-[clamp(1.35rem,2vw,1.75rem)] font-bold tracking-[-0.035em] text-text-primary"
            >
              Satu tempat untuk seluruh persiapan.
            </h2>
          </div>

          <div className="border-y border-border-subtle">
            {CAPABILITIES.map(({ number, title, description, icon: Icon }) => (
              <article
                key={number}
                className="welcome-editorial__capability grid grid-cols-[2.75rem_minmax(0,1fr)] gap-4 border-b border-border-subtle last:border-b-0"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-border-default bg-bg-elevated text-accent">
                  <Icon size={18} strokeWidth={1.8} aria-hidden="true" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[9px] font-bold text-brand-primary">
                      {number}
                    </span>
                    <h3 className="text-[13px] font-bold text-text-primary">{title}</h3>
                  </div>
                  <p className="mt-1.5 max-w-sm text-[11px] leading-[1.6] text-text-muted">
                    {description}
                  </p>
                </div>
              </article>
            ))}
          </div>

          <div className="welcome-editorial__status flex items-center justify-between text-[9px] uppercase tracking-[0.12em] text-text-disabled">
            <span>Siap digunakan</span>
            <span>Enter untuk mulai</span>
          </div>
        </aside>
      </div>
    </main>
  )
}
