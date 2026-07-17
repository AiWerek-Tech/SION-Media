import React, { useCallback, useEffect, useState } from 'react'
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Copy,
  Laptop,
  MonitorPlay,
  PanelTopOpen,
  PlugZap,
  Radio,
  RadioTower,
  Settings,
  ShieldCheck,
  Unplug,
  Wifi,
  X
} from 'lucide-react'
import {
  usePowerPointBridgeStore,
  type PowerPointBridgeSourceState,
  type PowerPointBridgeStatusState
} from '@renderer/store/usePowerPointBridgeStore'
import { useProjectionStore } from '@renderer/store/useProjectionStore'
import { loadPowerPointBridgeSource } from '@renderer/utils/powerPointBridge'
import { toLocalMediaUrl } from '@renderer/utils/localMediaUrl'

type QualityTone = 'excellent' | 'good' | 'warning' | 'offline'

export function PowerPointBridgePanel(): React.JSX.Element {
  const [status, setStatus] = useState<PowerPointBridgeStatusState | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [diagnosticsOpen, setDiagnosticsOpen] = useState(false)
  const [now, setNow] = useState(() => Date.now())
  const source = usePowerPointBridgeStore((state) => state.source)
  const sourcesByDevice = usePowerPointBridgeStore((state) => state.sourcesByDevice)
  const activeDeviceId = usePowerPointBridgeStore((state) => state.activeDeviceId)
  const selectDevice = usePowerPointBridgeStore((state) => state.selectDevice)
  const removeDevice = usePowerPointBridgeStore((state) => state.removeDevice)
  const followMode = usePowerPointBridgeStore((state) => state.followMode)
  const setFollowMode = usePowerPointBridgeStore((state) => state.setFollowMode)
  const programCode = useProjectionStore((state) => state.programSongMeta?.hymnalCode)

  const refresh = useCallback(async () => {
    setStatus(await window.api.presenterRemote.powerPointStatus())
  }, [])

  useEffect(() => {
    const initialTimer = window.setTimeout(() => void refresh(), 0)
    const unsubscribe = window.api.presenterRemote.onPowerPointStatus(setStatus)
    const timer = window.setInterval(() => void refresh(), 3000)
    const clockTimer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => {
      unsubscribe()
      window.clearTimeout(initialTimer)
      window.clearInterval(timer)
      window.clearInterval(clockTimer)
    }
  }, [refresh])

  const perform = async (
    key: string,
    action: () => Promise<PowerPointBridgeStatusState>
  ): Promise<void> => {
    setBusy(key)
    try {
      setStatus(await action())
    } finally {
      setBusy(null)
    }
  }

  const statusDevices = status?.devices ?? []
  const devicesById = new Map<string, PowerPointBridgeSourceState>()
  for (const device of statusDevices) devicesById.set(device.deviceId, device)
  for (const device of Object.values(sourcesByDevice)) devicesById.set(device.deviceId, device)
  const deviceSources = Array.from(devicesById.values()).sort((a, b) => b.updatedAt - a.updatedAt)
  const effectiveSource =
    source ??
    deviceSources.find((device) => device.deviceId === activeDeviceId) ??
    (status?.source as PowerPointBridgeSourceState | null) ??
    null
  const pending = status?.requests.filter((request) => request.status === 'pending') ?? []
  const connectedCount = status?.connectedDevices.length ?? 0
  const lastSeenAt = effectiveSource
    ? (status?.connectedDevices.find((device) => device.deviceId === effectiveSource.deviceId)
        ?.lastSeenAt ?? effectiveSource.updatedAt)
    : null
  const ageMs = lastSeenAt ? now - lastSeenAt : null
  const quality = getConnectionQuality(connectedCount, ageMs)
  const isLivePowerPoint = programCode === 'PPT LIVE'

  const diagnosticsPayload = {
    activeDeviceId,
    connectedCount,
    followMode,
    quality: quality.label,
    source: effectiveSource
      ? {
          deviceId: effectiveSource.deviceId,
          deviceName: effectiveSource.deviceName,
          provider: effectiveSource.provider,
          platform: effectiveSource.platform,
          protocolVersion: effectiveSource.protocolVersion,
          sequence: effectiveSource.sequence,
          cacheHit: effectiveSource.cacheHit,
          updatedAt: effectiveSource.updatedAt
        }
      : null
  }

  const exportDiagnostics = (): void => {
    const blob = new Blob([JSON.stringify(diagnosticsPayload, null, 2)], {
      type: 'application/json'
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `sion-presentation-bridge-diagnostics-${Date.now()}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-2 overflow-y-auto p-2.5 text-slate-100">
      <section className="rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900/95 to-slate-950/95 p-3 shadow-2xl shadow-black/20">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[13px] font-bold">
              <MonitorPlay size={17} className="text-indigo-300" /> PowerPoint Bridge
            </div>
            <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-slate-400">
              Terima presentasi pemateri, pilih sumber aktif, lalu kendalikan Preview dan Live.
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            <StatusPill tone={quality.tone} label={quality.label} />
            <span className="max-w-36 truncate text-[10px] text-slate-500">
              {effectiveSource?.deviceName || 'Belum ada perangkat'}
            </span>
          </div>
        </div>
        {isLivePowerPoint && (
          <div className="mt-2 rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-[11px] text-rose-100">
            <strong>LIVE - PowerPoint.</strong>{' '}
            {followMode === 'FOLLOW_LIVE'
              ? 'Program mengikuti perubahan pemateri secara real-time.'
              : 'PowerPoint sedang menjadi sumber Program.'}
          </div>
        )}
      </section>

      {pending.map((request) => (
        <section
          key={request.id}
          className="rounded-2xl border border-amber-300/30 bg-amber-300/10 p-3 shadow-lg shadow-black/10"
        >
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-amber-300/15 p-2 text-amber-200">
              <PlugZap size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-bold">Permintaan akses presentasi</div>
              <p className="mt-1 text-[11px] leading-relaxed text-slate-300">
                Perangkat ini ingin mengirim presentasi PowerPoint ke SION Media.
              </p>
              <div className="mt-2 grid gap-0.5 text-[11px] text-slate-400">
                <span className="truncate">Perangkat: {request.deviceName}</span>
                <span className="truncate">Alamat: {request.address}</span>
                <span className="truncate">Deck: {request.deckName || 'Belum diketahui'}</span>
              </div>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              disabled={busy !== null}
              onClick={() =>
                void perform(request.id, () =>
                  window.api.presenterRemote.approvePowerPointRequest(request.id)
                )
              }
              className="flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-3 py-2 text-xs font-bold text-white shadow-lg shadow-emerald-950/30 transition hover:bg-emerald-400 disabled:opacity-50"
            >
              <Check size={14} /> Izinkan
            </button>
            <button
              disabled={busy !== null}
              onClick={() =>
                void perform(request.id, () =>
                  window.api.presenterRemote.rejectPowerPointRequest(request.id)
                )
              }
              className="flex items-center justify-center gap-2 rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-xs font-bold text-rose-100 transition hover:bg-rose-500/20 disabled:opacity-50"
            >
              <X size={14} /> Tolak
            </button>
          </div>
        </section>
      ))}

      {deviceSources.length > 0 ? (
        <section className="rounded-2xl border border-white/10 bg-white/[0.035] p-2.5">
          <div className="mb-2 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
              <RadioTower size={14} /> Perangkat Presentasi
            </div>
            <span className="text-[10px] text-slate-500">{deviceSources.length} tersambung</span>
          </div>
          <div className="space-y-2">
            {deviceSources.map((device) => (
              <DeviceCard
                key={device.deviceId}
                device={device}
                active={device.deviceId === activeDeviceId}
                onSelect={() => selectDevice(device.deviceId)}
              />
            ))}
          </div>
        </section>
      ) : (
        <BridgeEmptyState />
      )}

      <div className="grid gap-2">
        <PresentationMonitor
          label="CURRENT / PRESENTATION SOURCE"
          source={effectiveSource}
          imagePath={effectiveSource?.imagePath ?? null}
          title={effectiveSource?.title || 'Belum ada slide dari pemateri'}
          dominant
        />
        <PresentationMonitor
          label="NEXT"
          source={effectiveSource}
          imagePath={effectiveSource?.nextImagePath ?? null}
          title={effectiveSource?.nextTitle || 'Slide berikutnya belum tersedia'}
        />
      </div>

      {effectiveSource?.notes && (
        <section className="rounded-2xl border border-white/10 bg-white/[0.035] p-2.5">
          <div className="mb-1 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">
            <PanelTopOpen size={13} /> Catatan pemateri
          </div>
          <p className="max-h-28 overflow-y-auto whitespace-pre-wrap text-xs leading-relaxed text-slate-300">
            {effectiveSource.notes}
          </p>
        </section>
      )}

      <section className="rounded-2xl border border-white/10 bg-white/[0.035] p-2.5">
        <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Mode sinkronisasi
        </div>
        <div className="grid grid-cols-3 gap-1 rounded-xl border border-white/10 bg-black/20 p-1">
          <FollowModeCard
            active={followMode === 'MANUAL'}
            title="Manual"
            description="Operator kontrol Preview dan Live."
            onClick={() => setFollowMode('MANUAL')}
          />
          <FollowModeCard
            active={followMode === 'FOLLOW_PREVIEW'}
            title="Follow Preview"
            description="Preview mengikuti PowerPoint."
            onClick={() => setFollowMode('FOLLOW_PREVIEW')}
          />
          <FollowModeCard
            active={followMode === 'FOLLOW_LIVE'}
            title="Follow Live"
            description="Program ikut setelah TAKE."
            onClick={() => setFollowMode('FOLLOW_LIVE')}
            warning
          />
        </div>
      </section>

      <div className="grid grid-cols-2 gap-2">
        <button
          disabled={!effectiveSource || busy !== null}
          onClick={() =>
            effectiveSource &&
            void window.api.presenterRemote.sendPowerPointCommand(effectiveSource.deviceId, 'PREV')
          }
          className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-bold text-slate-200 transition hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-45"
        >
          <ChevronLeft size={14} /> Sebelumnya
        </button>
        <button
          disabled={!effectiveSource || busy !== null}
          onClick={() =>
            effectiveSource &&
            void window.api.presenterRemote.sendPowerPointCommand(effectiveSource.deviceId, 'NEXT')
          }
          className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-bold text-slate-200 transition hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-45"
        >
          Berikutnya <ChevronRight size={14} />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          disabled={!effectiveSource}
          onClick={() => effectiveSource && loadPowerPointBridgeSource(effectiveSource, false)}
          className="flex items-center justify-center gap-2 rounded-xl border border-blue-400/30 bg-blue-500/10 px-3 py-2.5 text-xs font-bold text-blue-100 transition hover:bg-blue-500/20 disabled:cursor-not-allowed disabled:opacity-45"
        >
          <Laptop size={14} /> Load to Preview
        </button>
        <button
          disabled={!effectiveSource}
          onClick={() => effectiveSource && loadPowerPointBridgeSource(effectiveSource, true)}
          className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-3 py-2.5 text-xs font-bold text-white shadow-lg shadow-blue-950/30 transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-45"
        >
          <Radio size={14} /> TAKE
        </button>
      </div>

      {(status?.connectedDevices ?? []).map((device) => (
        <button
          key={device.deviceId}
          onClick={() => {
            removeDevice(device.deviceId)
            void perform(device.deviceId, () =>
              window.api.presenterRemote.disconnectPowerPointDevice(device.deviceId)
            )
          }}
          className="flex items-center justify-center gap-2 rounded-xl border border-white/10 px-3 py-2.5 text-xs font-bold text-slate-400 transition hover:bg-white/[0.05] hover:text-white"
        >
          <Unplug size={13} /> Putuskan {device.deviceName}
        </button>
      ))}

      <button
        onClick={() => setDiagnosticsOpen((open) => !open)}
        className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.025] px-3 py-2.5 text-xs font-bold text-slate-300 transition hover:bg-white/[0.06]"
      >
        <Settings size={14} /> {diagnosticsOpen ? 'Tutup Diagnostik' : 'Buka Diagnostik'}
      </button>

      {diagnosticsOpen && (
        <section className="rounded-2xl border border-white/10 bg-slate-950/70 p-3 text-xs">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="font-bold text-slate-200">Diagnostics</div>
            <div className="flex items-center gap-2">
              <button
                onClick={() =>
                  void navigator.clipboard?.writeText(JSON.stringify(diagnosticsPayload, null, 2))
                }
                className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-2 py-1 text-[11px] text-slate-300 hover:bg-white/[0.06]"
              >
                <Copy size={12} /> Salin
              </button>
              <button
                onClick={exportDiagnostics}
                className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-2 py-1 text-[11px] text-slate-300 hover:bg-white/[0.06]"
              >
                Ekspor
              </button>
            </div>
          </div>
          <div className="grid gap-2 text-slate-400">
            <DiagnosticRow
              label="Active device"
              value={effectiveSource?.deviceName || 'Tidak ada'}
            />
            <DiagnosticRow
              label="Provider"
              value={effectiveSource?.provider || 'microsoft-powerpoint'}
            />
            <DiagnosticRow label="Platform" value={effectiveSource?.platform || 'windows'} />
            <DiagnosticRow label="Protocol" value={String(effectiveSource?.protocolVersion ?? 1)} />
            <DiagnosticRow label="Sequence" value={String(effectiveSource?.sequence ?? '-')} />
            <DiagnosticRow
              label="Cache"
              value={effectiveSource?.cacheHit ? 'Hit' : 'Miss/Unknown'}
            />
            <DiagnosticRow
              label="Last seen"
              value={ageMs === null ? '-' : `${Math.round(ageMs / 1000)} detik lalu`}
            />
          </div>
        </section>
      )}
    </div>
  )
}

function getConnectionQuality(
  connectedCount: number,
  ageMs: number | null
): { label: string; tone: QualityTone } {
  if (connectedCount === 0) return { label: 'Terputus', tone: 'offline' }
  if (ageMs !== null && ageMs > 15_000) return { label: 'Tidak Stabil', tone: 'warning' }
  if (ageMs !== null && ageMs > 5_000) return { label: 'Baik', tone: 'good' }
  return { label: 'Sangat Baik', tone: 'excellent' }
}

function StatusPill({ tone, label }: { tone: QualityTone; label: string }): React.JSX.Element {
  const toneClass =
    tone === 'excellent'
      ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-100'
      : tone === 'good'
        ? 'border-blue-400/30 bg-blue-500/10 text-blue-100'
        : tone === 'warning'
          ? 'border-amber-400/30 bg-amber-500/10 text-amber-100'
          : 'border-slate-500/30 bg-slate-500/10 text-slate-300'
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold ${toneClass}`}
    >
      <Wifi size={12} /> {label}
    </span>
  )
}

function BridgeEmptyState(): React.JSX.Element {
  return (
    <section className="rounded-2xl border border-dashed border-white/15 bg-white/[0.02] p-4 text-center">
      <MonitorPlay className="mx-auto mb-2 text-slate-500" size={24} />
      <div className="text-[13px] font-bold text-slate-300">Belum ada slide dari pemateri</div>
      <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
        Setujui perangkat dari SION Link, lalu pastikan Slide Show PowerPoint sedang berjalan.
      </p>
    </section>
  )
}

function DeviceCard({
  device,
  active,
  onSelect
}: {
  device: PowerPointBridgeSourceState
  active: boolean
  onSelect: () => void
}): React.JSX.Element {
  return (
    <div
      className={`rounded-xl border p-2.5 transition ${
        active ? 'border-emerald-400/35 bg-emerald-500/10' : 'border-white/10 bg-black/10'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[13px] font-semibold">
            {active ? (
              <ShieldCheck size={15} className="text-emerald-300" />
            ) : (
              <Laptop size={15} className="text-slate-400" />
            )}
            <span className="truncate">{device.deviceName}</span>
          </div>
          <div className="mt-1 truncate text-[11px] text-slate-400">
            {device.deckName || 'Presentation'} - Slide {device.slideIndex + 1}/{device.totalSlides}
          </div>
        </div>
        <span
          className={`rounded-full px-2 py-1 text-[10px] font-bold ${
            active ? 'bg-emerald-400/15 text-emerald-100' : 'bg-white/5 text-slate-400'
          }`}
        >
          {active ? 'Sumber Aktif' : 'Standby'}
        </span>
      </div>
      {!active && (
        <button
          onClick={onSelect}
          className="mt-3 w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-bold text-slate-200 transition hover:bg-white/[0.08]"
        >
          Jadikan Sumber Aktif
        </button>
      )}
    </div>
  )
}

function PresentationMonitor({
  label,
  source,
  imagePath,
  title,
  dominant = false
}: {
  label: string
  source: PowerPointBridgeSourceState | null
  imagePath: string | null
  title: string
  dominant?: boolean
}): React.JSX.Element {
  const slideLabel = source ? `${source.slideIndex + 1}/${source.totalSlides}` : '-'
  return (
    <section className="overflow-hidden rounded-2xl border border-white/10 bg-black/30">
      <div className="flex items-center justify-between gap-2 border-b border-white/10 px-3 py-1.5">
        <span className="min-w-0 truncate text-[10px] font-bold uppercase tracking-wider text-slate-500">
          {label}
        </span>
        <span className="shrink-0 text-[10px] font-bold text-slate-400">Slide {slideLabel}</span>
      </div>
      <div
        className={`grid aspect-video place-items-center bg-black ${dominant ? '' : 'opacity-95'}`}
      >
        {imagePath ? (
          <DecodedBridgeImage
            src={toLocalMediaUrl(imagePath)}
            alt={label}
            className="h-full w-full object-contain"
          />
        ) : (
          <div className="grid place-items-center gap-1.5 px-4 text-center text-[11px] text-slate-500">
            <AlertTriangle size={18} />
            <span>{title}</span>
          </div>
        )}
      </div>
      <div className="flex items-center justify-between gap-3 border-t border-white/10 px-3 py-1.5">
        <span className="min-w-0 truncate text-[11px] font-semibold text-slate-200">{title}</span>
        {source?.cacheHit && (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-400/10 px-2 py-1 text-[10px] font-bold text-emerald-200">
            <CheckCircle2 size={11} /> Cache
          </span>
        )}
      </div>
    </section>
  )
}

function FollowModeCard({
  active,
  title,
  description,
  onClick,
  warning = false
}: {
  active: boolean
  title: string
  description: string
  onClick: () => void
  warning?: boolean
}): React.JSX.Element {
  return (
    <button
      onClick={onClick}
      title={description}
      className={`min-h-12 rounded-lg border px-2 py-2 text-center transition ${
        active
          ? warning
            ? 'border-amber-400/35 bg-amber-500/10'
            : 'border-blue-400/35 bg-blue-500/10'
          : 'border-transparent bg-transparent hover:bg-white/[0.05]'
      }`}
    >
      <div className="flex items-center justify-center gap-1.5">
        <span className="text-[11px] font-bold text-slate-100">{title}</span>
        {active && (
          <CheckCircle2 size={12} className={warning ? 'text-amber-200' : 'text-blue-200'} />
        )}
      </div>
      <p className="mt-0.5 line-clamp-1 text-[9px] leading-relaxed text-slate-400">{description}</p>
    </button>
  )
}

function DiagnosticRow({ label, value }: { label: string; value: string }): React.JSX.Element {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg bg-white/[0.03] px-3 py-2">
      <span>{label}</span>
      <span className="min-w-0 truncate text-right font-mono text-slate-200">{value}</span>
    </div>
  )
}

function DecodedBridgeImage({
  src,
  alt,
  className
}: {
  src: string
  alt: string
  className: string
}): React.JSX.Element {
  const [readySrc, setReadySrc] = useState<string | null>(null)
  const [decodeFailed, setDecodeFailed] = useState(false)
  const objectUrlRef = React.useRef<string | null>(null)
  const requestIdRef = React.useRef(0)

  useEffect(() => {
    const requestId = ++requestIdRef.current
    let cancelled = false
    let nextObjectUrl: string | null = null
    let retryTimer: number | null = null

    async function loadFrame(attempt = 0): Promise<void> {
      try {
        setDecodeFailed(false)
        const response = await fetch(src, { cache: 'no-store' })
        if (!response.ok) throw new Error(`Frame request failed: ${response.status}`)
        const blob = await response.blob()
        if (!blob.type.startsWith('image/')) throw new Error(`Invalid frame type: ${blob.type}`)
        nextObjectUrl = URL.createObjectURL(blob)
        const image = new Image()
        image.src = nextObjectUrl
        if (typeof image.decode === 'function') {
          await image.decode()
        } else {
          await new Promise<void>((resolve, reject) => {
            image.onload = () => resolve()
            image.onerror = () => reject(new Error('Frame image failed to load'))
          })
        }
        if (cancelled || requestId !== requestIdRef.current || !nextObjectUrl) return
        const previousObjectUrl = objectUrlRef.current
        objectUrlRef.current = nextObjectUrl
        setReadySrc(nextObjectUrl)
        nextObjectUrl = null
        if (previousObjectUrl) URL.revokeObjectURL(previousObjectUrl)
      } catch {
        if (!cancelled && requestId === requestIdRef.current) {
          setDecodeFailed(true)
          if (attempt < 8) {
            retryTimer = window.setTimeout(() => void loadFrame(attempt + 1), 180 + attempt * 160)
          }
        }
      }
    }

    void loadFrame()

    return () => {
      cancelled = true
      if (retryTimer !== null) window.clearTimeout(retryTimer)
      if (nextObjectUrl) URL.revokeObjectURL(nextObjectUrl)
    }
  }, [src])

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
    }
  }, [])

  if (!readySrc) {
    return (
      <div className="grid h-full w-full place-items-center px-4 text-center text-[11px] text-slate-500">
        {decodeFailed ? 'Frame belum siap. Menunggu kiriman berikutnya.' : 'Menyiapkan frame...'}
      </div>
    )
  }

  return <img src={readySrc} alt={alt} className={className} />
}
