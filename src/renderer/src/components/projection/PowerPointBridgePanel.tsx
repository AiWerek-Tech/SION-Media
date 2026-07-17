import React, { useCallback, useEffect, useState } from 'react'
import {
  Check,
  Laptop,
  MonitorPlay,
  PlugZap,
  Radio,
  Unplug,
  X,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import {
  usePowerPointBridgeStore,
  type PowerPointBridgeSourceState,
  type PowerPointBridgeStatusState
} from '@renderer/store/usePowerPointBridgeStore'
import { loadPowerPointBridgeSource } from '@renderer/utils/powerPointBridge'
import { toLocalMediaUrl } from '@renderer/utils/localMediaUrl'

export function PowerPointBridgePanel(): React.JSX.Element {
  const [status, setStatus] = useState<PowerPointBridgeStatusState | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const source = usePowerPointBridgeStore((state) => state.source)
  const followMode = usePowerPointBridgeStore((state) => state.followMode)
  const setFollowMode = usePowerPointBridgeStore((state) => state.setFollowMode)

  const refresh = useCallback(async () => {
    setStatus(await window.api.presenterRemote.powerPointStatus())
  }, [])

  useEffect(() => {
    const initialTimer = window.setTimeout(() => void refresh(), 0)
    const unsubscribe = window.api.presenterRemote.onPowerPointStatus(setStatus)
    const timer = window.setInterval(() => void refresh(), 3000)
    return () => {
      unsubscribe()
      window.clearTimeout(initialTimer)
      window.clearInterval(timer)
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

  const effectiveSource = source ?? (status?.source as PowerPointBridgeSourceState | null) ?? null
  const pending = status?.requests.filter((request) => request.status === 'pending') ?? []

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-y-auto p-3 text-slate-100">
      <div className="rounded-xl border border-indigo-400/20 bg-indigo-500/10 p-3">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <MonitorPlay size={16} /> PowerPoint Bridge
        </div>
        <p className="mt-1 text-xs leading-relaxed text-slate-400">
          Pemateri mengirim slide dan catatan. Operator tetap menentukan kapan materi masuk Preview
          atau Live.
        </p>
      </div>

      {pending.map((request) => (
        <div key={request.id} className="rounded-xl border border-amber-400/30 bg-amber-400/10 p-3">
          <div className="flex items-start gap-2">
            <PlugZap className="mt-0.5 text-amber-300" size={16} />
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold">Permintaan akses baru</div>
              <div className="truncate text-xs text-slate-300">
                {request.deviceName} · {request.address}
              </div>
              <div className="truncate text-xs text-slate-500">{request.deckName}</div>
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
              className="flex items-center justify-center gap-1 rounded-lg bg-emerald-500 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
            >
              <Check size={14} /> Setujui
            </button>
            <button
              disabled={busy !== null}
              onClick={() =>
                void perform(request.id, () =>
                  window.api.presenterRemote.rejectPowerPointRequest(request.id)
                )
              }
              className="flex items-center justify-center gap-1 rounded-lg border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-200 disabled:opacity-50"
            >
              <X size={14} /> Tolak
            </button>
          </div>
        </div>
      ))}

      {effectiveSource ? (
        <>
          <div className="overflow-hidden rounded-xl border border-white/10 bg-black/30">
            <DecodedBridgeImage
              src={toLocalMediaUrl(effectiveSource.imagePath)}
              alt="Slide PowerPoint saat ini"
              className="aspect-video w-full object-contain"
            />
            <div className="flex items-center justify-between gap-2 border-t border-white/10 px-3 py-2 text-xs">
              <span className="truncate font-medium">{effectiveSource.title}</span>
              <span className="shrink-0 text-slate-400">
                {effectiveSource.slideIndex + 1}/{effectiveSource.totalSlides}
              </span>
            </div>
          </div>
          {effectiveSource.nextImagePath && (
            <div>
              <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Slide berikutnya
              </div>
              <DecodedBridgeImage
                src={toLocalMediaUrl(effectiveSource.nextImagePath)}
                alt="Slide PowerPoint berikutnya"
                className="aspect-video w-full rounded-lg border border-white/10 bg-black object-contain"
              />
            </div>
          )}
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
            <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Catatan pemateri
            </div>
            <p className="max-h-28 overflow-y-auto whitespace-pre-wrap text-xs leading-relaxed text-slate-300">
              {effectiveSource.notes || 'Tidak ada catatan pada slide ini.'}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() =>
                void window.api.presenterRemote.sendPowerPointCommand(
                  effectiveSource.deviceId,
                  'PREV'
                )
              }
              className="flex items-center justify-center gap-1 rounded-lg border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] px-3 py-2 text-xs font-semibold text-slate-200 transition-colors"
            >
              <ChevronLeft size={14} /> Slide Sebelumnya
            </button>
            <button
              onClick={() =>
                void window.api.presenterRemote.sendPowerPointCommand(
                  effectiveSource.deviceId,
                  'NEXT'
                )
              }
              className="flex items-center justify-center gap-1 rounded-lg border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] px-3 py-2 text-xs font-semibold text-slate-200 transition-colors"
            >
              Slide Berikutnya <ChevronRight size={14} />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => loadPowerPointBridgeSource(effectiveSource, false)}
              className="flex items-center justify-center gap-1 rounded-lg border border-blue-400/30 bg-blue-500/10 px-3 py-2.5 text-xs font-semibold text-blue-100"
            >
              <Laptop size={14} /> Muat ke Preview
            </button>
            <button
              onClick={() => loadPowerPointBridgeSource(effectiveSource, true)}
              className="flex items-center justify-center gap-1 rounded-lg bg-blue-600 px-3 py-2.5 text-xs font-semibold text-white"
            >
              <Radio size={14} /> Tayangkan
            </button>
          </div>
        </>
      ) : (
        <div className="rounded-xl border border-dashed border-white/15 p-6 text-center text-xs text-slate-500">
          Belum ada slide PowerPoint yang diterima.
        </div>
      )}

      <label className="flex items-center justify-between gap-3 rounded-lg border border-white/10 px-3 py-2 text-xs">
        <span>Mode sinkronisasi</span>
        <select
          value={followMode}
          onChange={(event) =>
            setFollowMode(event.target.value as 'MANUAL' | 'FOLLOW_PREVIEW' | 'FOLLOW_LIVE')
          }
          className="rounded border border-white/10 bg-slate-900 px-2 py-1 text-xs text-slate-100"
        >
          <option value="MANUAL">Manual</option>
          <option value="FOLLOW_PREVIEW">Ikuti Preview</option>
          <option value="FOLLOW_LIVE">Ikuti Live setelah TAKE</option>
        </select>
      </label>
      {(status?.connectedDevices ?? []).map((device) => (
        <button
          key={device.deviceId}
          onClick={() =>
            void perform(device.deviceId, () =>
              window.api.presenterRemote.disconnectPowerPointDevice(device.deviceId)
            )
          }
          className="flex items-center justify-center gap-1 rounded-lg border border-white/10 px-3 py-2 text-xs text-slate-400 hover:text-white"
        >
          <Unplug size={13} /> Putuskan {device.deviceName}
        </button>
      ))}
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
  const [readySrc, setReadySrc] = useState(src)
  useEffect(() => {
    let cancelled = false
    const image = new Image()
    image.src = src
    image
      .decode()
      .then(() => {
        if (!cancelled) setReadySrc(src)
      })
      .catch(() => {
        // Keep last good frame instead of blanking the operator view.
      })
    return () => {
      cancelled = true
    }
  }, [src])
  return <img src={readySrc} alt={alt} className={className} />
}
