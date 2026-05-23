import React from 'react'
import {
  ArrowRight,
  LayoutDashboard,
  MonitorPlay,
  Radio,
  Settings,
  ShieldAlert
} from 'lucide-react'
import { useModeStore } from '../../store/useModeStore'
import { useAppStore } from '../../store/useAppStore'

const roadmapItems = [
  'Preview/Program routing untuk OBS dan vMix',
  'Output NDI atau alpha key setelah modul stabil',
  'Preset lower-third dan overlay streaming',
  'Monitoring multi-output untuk operator broadcast'
]

export function BroadcastMode(): React.JSX.Element {
  const setMode = useModeStore((s) => s.setMode)
  const setScreen = useAppStore((s) => s.setScreen)

  return (
    <div className="h-full w-full bg-bg-base text-text-primary flex items-center justify-center p-8">
      <section className="w-full max-w-4xl rounded-2xl border border-status-warning/20 bg-bg-surface/80 p-8 shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl border border-status-warning/25 bg-status-warning/10">
            <LayoutDashboard size={40} className="text-status-warning" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="inline-flex items-center gap-2 rounded-full border border-status-warning/25 bg-status-warning/10 px-3 py-1 text-[12px] font-bold uppercase tracking-[0.12em] text-status-warning">
              <Radio size={14} className="animate-pulse" />
              Beta roadmap
            </div>
            <h2 className="mt-4 text-[28px] font-black leading-tight text-text-primary">
              Broadcast Mode belum menjadi jalur produksi utama
            </h2>
            <p className="mt-4 max-w-2xl text-[14px] leading-relaxed text-text-secondary">
              Untuk ibadah live hari ini, gunakan Projection Mode sebagai workflow resmi. Broadcast
              Mode ditampilkan sebagai ruang persiapan fitur streaming agar operator tidak keliru
              menganggap modul ini sudah setara dengan switcher produksi penuh.
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {roadmapItems.map((item) => (
                <div
                  key={item}
                  className="flex items-start gap-3 rounded-xl border border-white/[0.06] bg-white/[0.03] p-3 text-[13px] leading-relaxed text-text-secondary"
                >
                  <ShieldAlert size={15} className="mt-0.5 shrink-0 text-status-warning" />
                  <span>{item}</span>
                </div>
              ))}
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => setMode('PROJECTION')}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-brand-primary px-5 text-[14px] font-bold text-white transition hover:bg-brand-primary-hover"
              >
                <MonitorPlay size={17} />
                Buka Projection Mode
                <ArrowRight size={16} />
              </button>
              <button
                type="button"
                onClick={() => setScreen('settings')}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-border-default bg-bg-elevated px-5 text-[14px] font-bold text-text-primary transition hover:border-border-strong hover:bg-bg-elevated-hover"
              >
                <Settings size={17} />
                Cek pengaturan output
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
