import React from 'react'
import logoPng from '@renderer/assets/logo.png'

interface SplashScreenProps {
  isLoading: boolean
}

export function SplashScreen({ isLoading }: SplashScreenProps): React.JSX.Element {
  return (
    <section className="relative h-screen w-screen overflow-hidden bg-[#050714] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.18),transparent_25%),radial-gradient(circle_at_bottom_right,_rgba(139,92,246,0.16),transparent_18%)]" />

      <div className="pointer-events-none absolute inset-0 opacity-60">
        <div className="absolute -left-28 top-1/4 h-80 w-80 rounded-full bg-brand-primary/15 blur-3xl" />
        <div className="absolute right-0 top-1/3 h-72 w-72 rounded-full bg-brand-secondary/10 blur-3xl" />
        <div className="absolute left-1/2 top-2/3 h-64 w-64 rounded-full bg-white/5 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto flex h-full max-w-5xl flex-col items-center justify-center px-6 py-10 sm:px-10">
        <div className="flex w-full max-w-2xl flex-col items-center gap-8 rounded-[32px] border border-white/10 bg-white/5 p-8 shadow-[0_32px_120px_rgba(0,0,0,0.35)] backdrop-blur-xl sm:p-10">
          <div className="relative flex h-28 w-28 items-center justify-center rounded-[32px] bg-gradient-to-br from-brand-primary to-brand-secondary shadow-[0_0_40px_rgba(59,130,246,0.25)]">
            <div className="absolute inset-0 rounded-[32px] bg-white/5 blur-xl" />
            <div className="relative flex h-full w-full items-center justify-center rounded-[32px] border border-white/10 bg-black/20 p-6">
              <img
                src={logoPng}
                className="relative z-10 h-full w-full max-h-[72px] max-w-[72px] object-contain"
                alt="SION Media Logo"
              />
            </div>
          </div>

          <div className="text-center">
            <h1 className="text-4xl font-black tracking-tight text-white sm:text-5xl">
              SION{' '}
              <span className="bg-gradient-to-r from-brand-primary to-brand-secondary bg-clip-text text-transparent">
                Media
              </span>
            </h1>
            <p className="mt-3 text-sm font-semibold uppercase tracking-[0.35em] text-white/60 sm:text-base">
              Worship Multimedia Platform
            </p>
          </div>

          <div className="w-full space-y-5">
            <div className="rounded-full bg-white/5 p-0.5 shadow-inner shadow-black/30">
              <div className="flex h-4 overflow-hidden rounded-full bg-slate-900">
                <div
                  className={`h-full rounded-full bg-gradient-to-r from-brand-primary to-brand-secondary transition-all duration-800 ease-out ${
                    isLoading ? 'w-[72%]' : 'w-full'
                  }`}
                  style={{ minWidth: '16px' }}
                />
              </div>
            </div>

            <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-between sm:text-left">
              <div>
                <p className="text-xs uppercase tracking-[0.4em] text-white/60">Status</p>
                <p className="mt-1 text-sm font-semibold text-white">
                  {isLoading ? 'Loading engine and resources…' : 'Ready to launch'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div
                  className={`h-2 w-2 rounded-full ${
                    isLoading ? 'bg-brand-primary animate-pulse' : 'bg-emerald-400'
                  }`}
                />
                <span className="text-xs uppercase tracking-[0.35em] text-white/50">
                  {isLoading ? 'Starting' : 'System Ready'}
                </span>
              </div>
            </div>
          </div>

          <p className="text-[11px] uppercase tracking-[0.45em] text-white/30">
            v3.0.0 AURORA • © 2024 SION Presenter Team
          </p>
        </div>
      </div>
    </section>
  )
}
