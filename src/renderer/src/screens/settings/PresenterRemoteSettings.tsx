import React, { useEffect, useMemo, useState } from 'react'
import QRCode from 'qrcode'
import {
  Copy,
  ExternalLink,
  Monitor,
  MonitorSmartphone,
  Power,
  Radio,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Smartphone,
  Unplug,
  Users,
  Wifi
} from 'lucide-react'

interface PresenterRemoteSettingsProps {
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void
}

interface PresenterRemoteStatus {
  enabled: boolean
  port: number | null
  token: string | null
  urls: string[]
  roles: Array<{
    role: 'presenter' | 'operator' | 'viewer' | 'stage'
    code: string
    url: string | null
    clientCount: number
  }>
  clients: Array<{
    id: string
    role: 'presenter' | 'operator' | 'viewer' | 'stage'
    connectedAt: number
    lastSeenAt: number
    userAgent: string
    address: string
    displayName: string
    trusted: boolean
  }>
  security: {
    mode: 'rehearsal' | 'service' | 'private'
    exactOutputFps: number
    rolesEnabled: Record<'presenter' | 'operator' | 'viewer' | 'stage', boolean>
  }
  commandLog: Array<{
    id: string
    role: 'presenter' | 'operator' | 'viewer' | 'stage'
    command: string
    timestamp: number
    clientId: string | null
    deviceName: string
    address: string
    ok: boolean
    detail?: string
  }>
  clientCount: number
  lastCommandAt: number | null
}

type ObsSrtStatus = Awaited<ReturnType<typeof window.api.obsSrt.status>>
type ObsSrtIngestStatus = Awaited<ReturnType<typeof window.api.obsSrtIngest.status>>

const emptyStatus: PresenterRemoteStatus = {
  enabled: false,
  port: null,
  token: null,
  urls: [],
  roles: [],
  clients: [],
  security: {
    mode: 'service',
    exactOutputFps: 2,
    rolesEnabled: {
      presenter: true,
      operator: true,
      viewer: true,
      stage: true
    }
  },
  commandLog: [],
  clientCount: 0,
  lastCommandAt: null
}

const roleLabels: Record<PresenterRemoteStatus['roles'][number]['role'], string> = {
  presenter: 'Pemateri',
  operator: 'Operator',
  viewer: 'Live Viewer',
  stage: 'Stage Display'
}

const roleDescriptions: Record<PresenterRemoteStatus['roles'][number]['role'], string> = {
  presenter: 'Kontrol materi sederhana dengan tombol Prev dan Next.',
  operator: 'Kontrol penuh untuk operator jarak jauh.',
  viewer: 'Tampilan live dengan link persisten untuk OBS, jemaat, laptop, atau smart TV.',
  stage: 'Confidence display untuk panggung, singer, dan musisi.'
}

const roleAccent: Record<PresenterRemoteStatus['roles'][number]['role'], string> = {
  presenter: 'sion-link-role-card--presenter',
  operator: 'sion-link-role-card--operator',
  viewer: 'sion-link-role-card--viewer',
  stage: 'sion-link-role-card--stage'
}

export function PresenterRemoteSettings({
  showToast
}: PresenterRemoteSettingsProps): React.JSX.Element {
  const [status, setStatus] = useState<PresenterRemoteStatus>(emptyStatus)
  const [isBusy, setIsBusy] = useState(false)
  const [qrCodes, setQrCodes] = useState<Record<string, string>>({})
  const [qrErrors, setQrErrors] = useState<Record<string, boolean>>({})
  const [srtStatus, setSrtStatus] = useState<ObsSrtStatus | null>(null)
  const [ingestStatus, setIngestStatus] = useState<ObsSrtIngestStatus | null>(null)
  const [workspaceView, setWorkspaceView] = useState<
    'overview' | 'remote' | 'broadcast' | 'security'
  >('overview')
  const isSrtOutputActive = srtStatus?.state === 'listening' || srtStatus?.state === 'starting'

  const primaryUrl = useMemo(() => {
    return status.urls.find((url) => !url.includes('127.0.0.1')) ?? status.urls[0] ?? ''
  }, [status.urls])
  const obsBrowserSourceUrl = useMemo(() => {
    const viewerUrl = status.roles.find((entry) => entry.role === 'viewer')?.url
    return viewerUrl ? viewerUrl.replace(/\/live(?=\?)/, '/obs') : ''
  }, [status.roles])
  const primaryIngestUrl = useMemo(() => {
    return (
      ingestStatus?.obsUrls.find((url) => !url.includes('127.0.0.1')) ??
      ingestStatus?.obsUrls[0] ??
      ''
    )
  }, [ingestStatus])

  const loadStatus = async (): Promise<void> => {
    const [nextStatus, nextSrtStatus, nextIngestStatus] = await Promise.all([
      window.api.presenterRemote.status(),
      window.api.obsSrt.status(),
      window.api.obsSrtIngest.status()
    ])
    setStatus(nextStatus)
    setSrtStatus(nextSrtStatus)
    setIngestStatus(nextIngestStatus)
  }

  const handleIngestToggle = async (): Promise<void> => {
    if (!ingestStatus) return
    setIsBusy(true)
    try {
      const next =
        ingestStatus.state === 'stopped' || ingestStatus.state === 'error'
          ? await window.api.obsSrtIngest.start()
          : await window.api.obsSrtIngest.stop()
      setIngestStatus(next)
      showToast(
        next.state === 'waiting' || next.state === 'live'
          ? 'OBS Live Input siap menerima stream'
          : next.state === 'error'
            ? next.error || 'OBS Live Input gagal dijalankan'
            : 'OBS Live Input dihentikan',
        next.state === 'error' ? 'error' : 'success'
      )
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Gagal mengubah OBS Live Input', 'error')
    } finally {
      setIsBusy(false)
    }
  }

  const handleIngestConfig = async (
    patch: Parameters<typeof window.api.obsSrtIngest.updateConfig>[0]
  ): Promise<void> => {
    try {
      setIngestStatus(await window.api.obsSrtIngest.updateConfig(patch))
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Konfigurasi input tidak valid', 'error')
    }
  }

  const handleIngestAutoStart = async (autoStart: boolean): Promise<void> => {
    try {
      const next = await window.api.obsSrtIngest.setAutoStart(autoStart)
      setIngestStatus(next)
      showToast(
        autoStart
          ? 'OBS Live Input akan aktif saat aplikasi dibuka'
          : 'OBS Live Input menggunakan mode manual',
        'success'
      )
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Gagal menyimpan mulai otomatis', 'error')
      await loadStatus().catch(() => undefined)
    }
  }

  const handleSrtToggle = async (): Promise<void> => {
    if (!srtStatus) return
    setIsBusy(true)
    try {
      const next = isSrtOutputActive
        ? await window.api.obsSrt.stop()
        : await window.api.obsSrt.start()
      setSrtStatus(next)
      if (next.state === 'error') showToast(next.error || 'SRT gagal dijalankan', 'error')
      else
        showToast(
          next.state === 'listening' || next.state === 'starting'
            ? 'OBS Network Output aktif dan menunggu OBS'
            : 'SRT dihentikan',
          'success'
        )
    } catch {
      showToast('Gagal mengubah status OBS Network Output', 'error')
    } finally {
      setIsBusy(false)
    }
  }

  const handleSrtConfig = async (
    patch: Partial<NonNullable<ObsSrtStatus>['config']>
  ): Promise<void> => {
    try {
      setSrtStatus(await window.api.obsSrt.updateConfig(patch))
    } catch {
      showToast('Hentikan SRT sebelum mengubah pengaturan', 'error')
    }
  }

  const handleSelectFfmpeg = async (): Promise<void> => {
    const result = await window.api.file.showOpenDialog({
      title: 'Pilih FFmpeg dengan dukungan SRT',
      properties: ['openFile'],
      filters: [{ name: 'FFmpeg', extensions: ['exe'] }]
    })
    const path = result.filePaths[0]
    if (path) await handleSrtConfig({ ffmpegPath: path })
  }

  useEffect(() => {
    void Promise.resolve().then(loadStatus)
    const timer = window.setInterval(() => {
      void loadStatus()
    }, 3000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    let cancelled = false
    const urls = [
      ['portal', primaryUrl] as const,
      ...status.roles
        .filter((entry) => entry.url)
        .map((entry) => [entry.role, entry.url ?? ''] as const)
    ].filter(([, url]) => Boolean(url))

    if (urls.length === 0) {
      void Promise.resolve().then(() => {
        if (!cancelled) {
          setQrCodes({})
          setQrErrors({})
        }
      })
      return () => {
        cancelled = true
      }
    }

    void Promise.allSettled(
      urls.map(async ([key, url]) => {
        const dataUrl = await QRCode.toDataURL(url, {
          margin: 1,
          width: 220,
          color: {
            dark: '#0f172a',
            light: '#f8fafc'
          }
        })
        return [key, dataUrl] as const
      })
    ).then((results) => {
      if (cancelled) return
      const nextQrCodes: Record<string, string> = {}
      const nextQrErrors: Record<string, boolean> = {}
      results.forEach((result, index) => {
        const key = urls[index]?.[0]
        if (!key) return
        if (result.status === 'fulfilled') {
          nextQrCodes[key] = result.value[1]
        } else {
          nextQrErrors[key] = true
        }
      })
      setQrCodes(nextQrCodes)
      setQrErrors(nextQrErrors)
    })

    return () => {
      cancelled = true
    }
  }, [primaryUrl, status.roles])

  const handleStart = async (): Promise<void> => {
    setIsBusy(true)
    try {
      const nextStatus = await window.api.presenterRemote.start()
      setStatus(nextStatus)
      showToast('SION Link aktif', 'success')
    } catch {
      showToast('Gagal mengaktifkan SION Link', 'error')
    } finally {
      setIsBusy(false)
    }
  }

  const handleStop = async (): Promise<void> => {
    setIsBusy(true)
    try {
      const nextStatus = await window.api.presenterRemote.stop()
      setStatus(nextStatus)
      showToast('SION Link dimatikan', 'info')
    } catch {
      showToast('Gagal mematikan SION Link', 'error')
    } finally {
      setIsBusy(false)
    }
  }

  const handleRegenerateCodes = async (): Promise<void> => {
    if (!status.enabled) return
    setIsBusy(true)
    try {
      const nextStatus = await window.api.presenterRemote.regenerateCodes()
      setStatus(nextStatus)
      showToast('Kode sesi Operator, Pemateri, dan Stage dibuat ulang. Link Live tetap.', 'success')
    } catch {
      showToast('Gagal membuat ulang kode SION Link', 'error')
    } finally {
      setIsBusy(false)
    }
  }

  const handleRegenerateRoleCode = async (
    role: PresenterRemoteStatus['roles'][number]['role']
  ): Promise<void> => {
    if (!status.enabled) return
    setIsBusy(true)
    try {
      const nextStatus = await window.api.presenterRemote.regenerateCode(role)
      setStatus(nextStatus)
      showToast(`Kode ${roleLabels[role]} dibuat ulang`, 'success')
    } catch {
      showToast(`Gagal membuat ulang kode ${roleLabels[role]}`, 'error')
    } finally {
      setIsBusy(false)
    }
  }

  const handleDisconnectClients = async (): Promise<void> => {
    if (!status.enabled) return
    setIsBusy(true)
    try {
      const nextStatus = await window.api.presenterRemote.disconnectClients()
      setStatus(nextStatus)
      showToast('Semua perangkat SION Link diputuskan', 'info')
    } catch {
      showToast('Gagal memutuskan perangkat SION Link', 'error')
    } finally {
      setIsBusy(false)
    }
  }

  const handleDisconnectClient = async (clientId: string): Promise<void> => {
    if (!status.enabled) return
    setIsBusy(true)
    try {
      const nextStatus = await window.api.presenterRemote.disconnectClient(clientId)
      setStatus(nextStatus)
      showToast('Perangkat diputuskan', 'info')
    } catch {
      showToast('Gagal memutuskan perangkat', 'error')
    } finally {
      setIsBusy(false)
    }
  }

  const handleSecurityUpdate = async (
    patch: Partial<PresenterRemoteStatus['security']>
  ): Promise<void> => {
    setIsBusy(true)
    try {
      const nextStatus = await window.api.presenterRemote.updateSecurityPolicy(patch)
      setStatus(nextStatus)
      showToast('Security policy SION Link diperbarui', 'success')
    } catch {
      showToast('Gagal memperbarui security policy', 'error')
    } finally {
      setIsBusy(false)
    }
  }

  const handleRoleEnabledChange = async (
    role: PresenterRemoteStatus['roles'][number]['role'],
    enabled: boolean
  ): Promise<void> => {
    await handleSecurityUpdate({
      rolesEnabled: {
        ...status.security.rolesEnabled,
        [role]: enabled
      }
    })
  }

  const handleClearCommandLog = async (): Promise<void> => {
    setIsBusy(true)
    try {
      const nextStatus = await window.api.presenterRemote.clearCommandLog()
      setStatus(nextStatus)
      showToast('Command log dibersihkan', 'info')
    } catch {
      showToast('Gagal membersihkan command log', 'error')
    } finally {
      setIsBusy(false)
    }
  }

  const handleCopy = async (value: string, label: string): Promise<void> => {
    try {
      await navigator.clipboard.writeText(value)
      showToast(`${label} disalin`, 'success')
    } catch {
      showToast(`Gagal menyalin ${label.toLowerCase()}`, 'error')
    }
  }

  const handleCopyIngestUrl = async (): Promise<void> => {
    if (!ingestStatus || isBusy) return
    setIsBusy(true)
    try {
      let next = ingestStatus
      if (next.state === 'stopped' || next.state === 'error') {
        next = await window.api.obsSrtIngest.start()
        setIngestStatus(next)
      }
      if (next.state === 'error') {
        showToast(next.error || 'Media gateway SRT gagal diaktifkan', 'error')
        return
      }
      if (next.state !== 'waiting' && next.state !== 'live') {
        showToast('Tunggu hingga media gateway siap, lalu coba lagi', 'info')
        return
      }
      const url =
        next.obsUrls.find((entry) => !entry.includes('127.0.0.1')) ?? next.obsUrls[0] ?? ''
      if (!url) {
        showToast('Alamat jaringan OBS belum tersedia', 'error')
        return
      }
      await navigator.clipboard.writeText(url)
      showToast('Gateway aktif dan URL OBS Live Input disalin', 'success')
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Gagal menyiapkan URL OBS', 'error')
    } finally {
      setIsBusy(false)
    }
  }

  const handleOpen = async (url = primaryUrl): Promise<void> => {
    if (!url) return
    await window.api.system.openExternal(url)
  }

  const handleDownloadQr = (dataUrl: string | undefined, fileName: string): void => {
    if (!dataUrl) {
      showToast('QR belum tersedia', 'error')
      return
    }
    const anchor = document.createElement('a')
    anchor.href = dataUrl
    anchor.download = fileName
    anchor.style.display = 'none'
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
  }

  const renderQr = (key: string, label: string, large = false): React.JSX.Element => {
    const dataUrl = qrCodes[key]
    const failed = qrErrors[key]
    return (
      <div
        className={`sion-link-qr ${large ? 'sion-link-qr--large' : ''} ${failed ? 'is-error' : ''}`}
        aria-label={`QR ${label}`}
      >
        {dataUrl ? (
          <img src={dataUrl} alt={`QR ${label}`} />
        ) : (
          <div className="sion-link-qr__fallback">{failed ? 'QR gagal' : 'QR'}</div>
        )}
      </div>
    )
  }

  return (
    <div className="sp-root sion-link-settings" data-sion-view={workspaceView}>
      <div className="sp-page-header">
        <div>
          <h2 className="sp-page-title">SION Link</h2>
          <p className="sp-page-subtitle">
            Remote lokal untuk pemateri, operator, live viewer, dan stage display melalui WiFi.
          </p>
        </div>
        <div className="sp-page-header__actions">
          <button className="sp-btn sp-btn--ghost" onClick={loadStatus}>
            <RefreshCw size={14} />
            Refresh
          </button>
          <button
            className="sp-btn sp-btn--ghost"
            onClick={handleDisconnectClients}
            disabled={!status.enabled || isBusy || status.clientCount === 0}
          >
            <Unplug size={14} />
            Disconnect
          </button>
          <button
            className="sp-btn sp-btn--ghost"
            onClick={handleRegenerateCodes}
            disabled={!status.enabled || isBusy}
          >
            <RotateCcw size={14} />
            Regenerate Kode Sesi
          </button>
          <button
            className={`sp-btn ${status.enabled ? 'sp-btn--danger' : 'sp-btn--primary'}`}
            onClick={status.enabled ? handleStop : handleStart}
            disabled={isBusy}
          >
            <Power size={14} />
            {status.enabled ? 'Matikan SION Link' : 'Aktifkan SION Link'}
          </button>
        </div>
      </div>

      <section className="sp-section">
        <div className="sion-link-hero">
          <div className="sion-link-hero__main">
            <div className="sion-link-hero__icon">
              <MonitorSmartphone size={28} />
            </div>
            <div>
              <div className="sion-link-hero__title">Akses Perangkat via WiFi Lokal</div>
              <p className="sion-link-hero__desc">
                Aktifkan server lokal, lalu bagikan kode sesuai peran. Internet tidak diperlukan,
                tetapi semua perangkat harus berada di jaringan yang sama.
              </p>
            </div>
          </div>
          <div className={`sp-badge ${status.enabled ? 'sp-badge--emerald' : 'sp-badge--rose'}`}>
            {status.enabled ? 'Aktif' : 'Nonaktif'}
          </div>
        </div>
      </section>

      <nav className="sion-link-workspace-tabs" aria-label="Area pengaturan SION Link">
        {(
          [
            ['overview', 'Ringkasan Live', 'Viewer & portal'],
            ['remote', 'Akses Remote', 'Operator & pemateri'],
            ['broadcast', 'OBS / SRT', 'Network output'],
            ['security', 'Keamanan', 'Policy & perangkat']
          ] as const
        ).map(([view, label, detail]) => (
          <button
            key={view}
            type="button"
            className={workspaceView === view ? 'is-active' : ''}
            onClick={() => setWorkspaceView(view)}
          >
            <strong>{label}</strong>
            <span>{detail}</span>
          </button>
        ))}
      </nav>

      {ingestStatus && (
        <section className="sp-section sion-link-view sion-link-view--broadcast">
          <div className="sp-section-header">
            <div className="sp-section-eyebrow">
              <Radio size={13} /> OBS Live Input · SRT
            </div>
            <p className="sp-section-desc">
              Terima video dan audio OBS, lalu distribusikan otomatis ke SION Link Desktop dan
              Mobile melalui WebRTC dan HLS.
            </p>
          </div>
          <div className="sp-action-card sp-action-card--blue">
            <div className="sp-action-card__body">
              <div className="sp-action-card__title">
                {ingestStatus.state === 'live'
                  ? 'OBS terhubung · LIVE'
                  : ingestStatus.state === 'waiting'
                    ? ingestStatus.srtConnectionCount > 0
                      ? 'OBS tersambung · menunggu media valid'
                      : 'Siap · menunggu OBS'
                    : ingestStatus.state === 'starting'
                      ? 'Menyiapkan media gateway…'
                      : ingestStatus.state === 'error'
                        ? 'Gateway bermasalah'
                        : 'OBS Live Input nonaktif'}
              </div>
              <p className="sp-action-card__desc">
                Media gateway: {ingestStatus.available ? 'tersedia' : 'tidak ditemukan'} · SRT{' '}
                {ingestStatus.config.srtPort} · HLS {ingestStatus.config.hlsPort} · WebRTC{' '}
                {ingestStatus.config.webrtcPort}
              </p>
              {ingestStatus.obsUrls[0] && (
                <div className="sion-link-url-row">
                  <code className="sion-link-url">{primaryIngestUrl}</code>
                  <button
                    className="sp-btn sp-btn--ghost"
                    disabled={isBusy || !ingestStatus.available}
                    onClick={() => void handleCopyIngestUrl()}
                  >
                    <Copy size={14} />
                    {ingestStatus.state === 'stopped' || ingestStatus.state === 'error'
                      ? 'Aktifkan & Salin'
                      : 'Salin URL OBS'}
                  </button>
                </div>
              )}
              <div className="sp-notice sp-notice--subtle">
                <p>
                  <strong>
                    {ingestStatus.state === 'waiting' || ingestStatus.state === 'live'
                      ? 'Gateway siap · lanjutkan di OBS'
                      : 'Aktifkan penerima sebelum Start Streaming di OBS'}
                  </strong>
                  <br />
                  Settings → Stream → Service: Custom. Tempel URL di atas pada Server, kosongkan
                  Stream Key, gunakan video H.264 dan audio AAC 48 kHz. Saat Windows Firewall
                  meminta izin, pilih jaringan Private dan tekan Allow access.
                  <br />
                  <strong>Catatan:</strong> gunakan URL terbaru setelah PC berpindah Wi-Fi/LAN;
                  alamat IP lama tidak akan terhubung.
                </p>
              </div>
              <div className="sion-link-policy-controls">
                <label>
                  Port SRT
                  <input
                    type="number"
                    min={1024}
                    max={65535}
                    value={ingestStatus.config.srtPort}
                    disabled={ingestStatus.state !== 'stopped' && ingestStatus.state !== 'error'}
                    onChange={(event) =>
                      setIngestStatus({
                        ...ingestStatus,
                        config: { ...ingestStatus.config, srtPort: Number(event.target.value) }
                      })
                    }
                    onBlur={(event) =>
                      void handleIngestConfig({ srtPort: Number(event.target.value) })
                    }
                  />
                </label>
                <label>
                  Mulai otomatis
                  <select
                    value={ingestStatus.config.autoStart ? '1' : '0'}
                    onChange={(event) => void handleIngestAutoStart(event.target.value === '1')}
                  >
                    <option value="1">Aktif saat aplikasi dibuka</option>
                    <option value="0">Manual</option>
                  </select>
                </label>
              </div>
              <div className="sion-link-url-row">
                <code className="sion-link-url">Stream ID: {ingestStatus.config.streamPath}</code>
                <button
                  className="sp-btn sp-btn--ghost"
                  disabled={ingestStatus.state !== 'stopped' && ingestStatus.state !== 'error'}
                  onClick={() => void handleIngestConfig({ resetStreamKey: true })}
                >
                  <RotateCcw size={14} /> Reset Stream ID
                </button>
              </div>
              {ingestStatus.error && <p className="sion-link-muted">{ingestStatus.error}</p>}
              {ingestStatus.diagnostic && ingestStatus.state === 'waiting' && (
                <div className="sp-notice sp-notice--subtle">
                  <p>
                    <strong>Diagnostik koneksi</strong>
                    <br />
                    {ingestStatus.diagnostic}
                  </p>
                </div>
              )}
              {ingestStatus.error && ingestStatus.logTail.length > 0 && (
                <div className="sp-notice sp-notice--subtle">
                  <p>
                    <strong>Diagnostik gateway</strong>
                    <br />
                    {ingestStatus.logTail.slice(-3).join(' · ')}
                  </p>
                </div>
              )}
            </div>
            <button
              className={`sp-btn ${ingestStatus.state !== 'stopped' && ingestStatus.state !== 'error' ? 'sp-btn--danger' : 'sp-btn--primary'}`}
              disabled={isBusy || (!ingestStatus.available && ingestStatus.state === 'stopped')}
              onClick={() => void handleIngestToggle()}
            >
              <Power size={14} />
              {ingestStatus.state !== 'stopped' && ingestStatus.state !== 'error'
                ? 'Hentikan Input'
                : 'Aktifkan Penerima'}
            </button>
          </div>
        </section>
      )}

      {srtStatus && (
        <section className="sp-section sion-link-view sion-link-view--broadcast">
          <div className="sp-section-header">
            <div className="sp-section-eyebrow">
              <Monitor size={13} /> OBS Network Output · SRT
            </div>
            <p className="sp-section-desc">
              Kirim Program Output 1080p melalui LAN langsung ke Media Source OBS tanpa plugin.
            </p>
          </div>
          <div className="sp-action-card sp-action-card--blue">
            <div className="sp-action-card__body">
              <div className="sp-action-card__title">
                {srtStatus.state === 'listening'
                  ? 'Aktif · menunggu / terhubung ke OBS'
                  : srtStatus.state === 'starting'
                    ? 'Menyambungkan ulang secara otomatis...'
                    : 'SRT tidak aktif'}
              </div>
              <p className="sp-action-card__desc">
                Encoder: {srtStatus.encoder ?? 'belum ditemukan'} · Frame terkirim{' '}
                {srtStatus.framesSent.toLocaleString()} · Drop{' '}
                {srtStatus.framesDropped.toLocaleString()}
              </p>
              {srtStatus.obsUrls[0] && (
                <div className="sion-link-url-row">
                  <code className="sion-link-url">
                    {srtStatus.obsUrls.find((url) => !url.includes('127.0.0.1')) ??
                      srtStatus.obsUrls[0]}
                  </code>
                  <button
                    className="sp-btn sp-btn--ghost"
                    onClick={() =>
                      handleCopy(
                        srtStatus.obsUrls.find((url) => !url.includes('127.0.0.1')) ??
                          srtStatus.obsUrls[0],
                        'URL SRT OBS'
                      )
                    }
                  >
                    <Copy size={14} /> Salin untuk OBS
                  </button>
                </div>
              )}
              {obsBrowserSourceUrl && (
                <div className="sp-notice sp-notice--subtle">
                  <p>
                    <strong>OBS Live LAN (Browser Source)</strong>
                    <br />
                    Alternatif tanpa FFmpeg untuk kebutuhan preview, lower-third, atau jaringan
                    ringan. Gunakan SRT untuk program 25/30 FPS dan audio.
                  </p>
                  <div className="sion-link-url-row">
                    <code className="sion-link-url">{obsBrowserSourceUrl}</code>
                    <button
                      className="sp-btn sp-btn--ghost"
                      onClick={() => handleCopy(obsBrowserSourceUrl, 'URL OBS Live LAN')}
                    >
                      <Copy size={14} /> Salin Browser Source
                    </button>
                  </div>
                </div>
              )}
              <div className="sion-link-policy-controls">
                <label>
                  Resolusi
                  <select
                    value={srtStatus.config.width}
                    disabled={isSrtOutputActive}
                    onChange={(event) =>
                      void handleSrtConfig({ width: Number(event.target.value) as 1280 | 1920 })
                    }
                  >
                    <option value={1920}>1920 × 1080</option>
                    <option value={1280}>1280 × 720</option>
                  </select>
                </label>
                <label>
                  Port
                  <input
                    key={`srt-port-${srtStatus.config.port}`}
                    type="number"
                    min={1024}
                    max={65535}
                    defaultValue={srtStatus.config.port}
                    disabled={isSrtOutputActive}
                    onBlur={(event) => void handleSrtConfig({ port: Number(event.target.value) })}
                  />
                </label>
                <label>
                  Bitrate (Mbps)
                  <input
                    key={`srt-bitrate-${srtStatus.config.bitrateMbps}`}
                    type="number"
                    min={4}
                    max={30}
                    defaultValue={srtStatus.config.bitrateMbps}
                    disabled={isSrtOutputActive}
                    onBlur={(event) =>
                      void handleSrtConfig({ bitrateMbps: Number(event.target.value) })
                    }
                  />
                </label>
                <label>
                  Audio Source
                  <select
                    value={srtStatus.config.audioDevice}
                    disabled={isSrtOutputActive}
                    onChange={(event) => void handleSrtConfig({ audioDevice: event.target.value })}
                  >
                    <option value="">Tanpa Audio</option>
                    {srtStatus.audioDevices.map((device) => (
                      <option key={device} value={device}>
                        {device}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Audio AAC
                  <select
                    value={srtStatus.config.audioBitrateKbps}
                    disabled={isSrtOutputActive}
                    onChange={(event) =>
                      void handleSrtConfig({
                        audioBitrateKbps: Number(event.target.value) as 128 | 160 | 192
                      })
                    }
                  >
                    <option value={128}>128 kbps</option>
                    <option value={160}>160 kbps</option>
                    <option value={192}>192 kbps</option>
                  </select>
                </label>
                <label>
                  Audio Delay (ms)
                  <input
                    key={`srt-audio-delay-${srtStatus.config.audioDelayMs}`}
                    type="number"
                    min={-2000}
                    max={2000}
                    step={10}
                    defaultValue={srtStatus.config.audioDelayMs}
                    disabled={isSrtOutputActive}
                    onBlur={(event) =>
                      void handleSrtConfig({ audioDelayMs: Number(event.target.value) })
                    }
                  />
                </label>
              </div>
              {srtStatus.audioDevices.length === 0 && srtStatus.available && (
                <p className="sion-link-muted">
                  Tidak ada input audio DirectShow yang terdeteksi. Sambungkan mixer USB atau
                  virtual audio cable, lalu tekan Refresh.
                </p>
              )}
              {!srtStatus.available && (
                <div className="sp-notice sp-notice--subtle">
                  <p>
                    FFmpeg dengan protokol SRT belum ditemukan. Pilih ffmpeg.exe yang mendukung SRT
                    dan encoder H.264.
                  </p>
                  <button
                    className="sp-btn sp-btn--ghost"
                    onClick={() => void handleSelectFfmpeg()}
                  >
                    Pilih FFmpeg
                  </button>
                </div>
              )}
              {srtStatus.error && <p className="sion-link-muted">{srtStatus.error}</p>}
              <ol className="sion-link-steps">
                <li>Hubungkan kedua PC ke LAN kabel yang sama.</li>
                <li>Tekan Start SRT, lalu salin URL yang ditampilkan.</li>
                <li>Di OBS pilih Sources → Media Source dan nonaktifkan Local File.</li>
                <li>Tempel URL pada Input dan isi Input Format dengan mpegts.</li>
              </ol>
            </div>
            <button
              className={`sp-btn ${isSrtOutputActive ? 'sp-btn--danger' : 'sp-btn--primary'}`}
              onClick={() => void handleSrtToggle()}
              disabled={isBusy || (!srtStatus.available && !isSrtOutputActive)}
            >
              <Power size={14} />
              {isSrtOutputActive ? 'Stop SRT' : 'Start SRT'}
            </button>
          </div>
        </section>
      )}

      <div className="sion-link-layout">
        <section className="sp-section">
          <div className="sp-metric-grid sp-metric-grid--3 sion-link-view sion-link-view--overview">
            <div
              className={`sp-metric-card sp-metric-card--emerald ${status.enabled ? 'is-active' : ''}`}
            >
              <div className="sp-metric-card__icon">
                <Wifi size={16} />
              </div>
              <div className="sp-metric-card__value">{status.enabled ? 'Aktif' : 'Mati'}</div>
              <div className="sp-metric-card__label">Status Server</div>
            </div>
            <div className="sp-metric-card sp-metric-card--blue">
              <div className="sp-metric-card__icon">
                <Monitor size={16} />
              </div>
              <div className="sp-metric-card__value">{status.port ?? '-'}</div>
              <div className="sp-metric-card__label">Port Lokal</div>
            </div>
            <div className="sp-metric-card sp-metric-card--violet">
              <div className="sp-metric-card__icon">
                <Users size={16} />
              </div>
              <div className="sp-metric-card__value">{status.clientCount}</div>
              <div className="sp-metric-card__label">Perangkat Online</div>
            </div>
          </div>

          <div className="sp-action-card sp-action-card--blue sion-link-view sion-link-view--overview">
            <div className="sp-action-card__icon">
              <Smartphone size={20} />
            </div>
            <div className="sp-action-card__body">
              <div className="sp-action-card__title">Portal SION Link</div>
              <p className="sp-action-card__desc">
                Buka alamat ini dari HP, tablet, laptop, atau smart TV pada WiFi yang sama.
              </p>
            </div>
            {primaryUrl ? (
              <div className="sion-link-portal-share">
                {renderQr('portal', 'Portal SION Link', true)}
                <div className="sion-link-portal-share__body">
                  <div className="sion-link-url-row">
                    <code className="sion-link-url">{primaryUrl}</code>
                    <button
                      className="sp-btn sp-btn--ghost"
                      onClick={() => handleCopy(primaryUrl, 'Alamat portal SION Link')}
                    >
                      <Copy size={14} />
                      Salin
                    </button>
                    <button className="sp-btn sp-btn--ghost" onClick={() => handleOpen(primaryUrl)}>
                      <ExternalLink size={14} />
                      Buka
                    </button>
                  </div>
                  <div className="sion-link-qr-actions">
                    <button
                      className="sp-btn sp-btn--ghost"
                      onClick={() => handleDownloadQr(qrCodes.portal, 'sion-link-portal-qr.png')}
                    >
                      Download QR
                    </button>
                  </div>
                  <p className="sion-link-qr-hint">
                    Scan QR ini untuk masuk ke portal. Role tetap ditentukan oleh kode akses.
                  </p>
                </div>
              </div>
            ) : (
              <div className="sp-empty-state sion-link-empty">
                <Wifi size={28} />
                <strong>SION Link belum aktif</strong>
                <p>Aktifkan server untuk membuat alamat portal dan kode akses.</p>
              </div>
            )}
          </div>

          {status.roles.length > 0 && (
            <section className="sp-section sion-link-view sion-link-view--remote">
              <div className="sp-section-header">
                <div className="sp-section-eyebrow">
                  <ShieldCheck size={13} />
                  Kode Peran
                </div>
                <p className="sp-section-desc">
                  Kode menentukan hak akses perangkat. Bagikan kode operator hanya ke petugas yang
                  dipercaya.
                </p>
              </div>
              <div className="sion-link-role-grid">
                {status.roles.map((entry) => (
                  <div key={entry.role} className={`sion-link-role-card ${roleAccent[entry.role]}`}>
                    <div className="sion-link-role-card__header">
                      <div>
                        <div className="sion-link-role-card__title">
                          {roleLabels[entry.role]}
                          {status.security.rolesEnabled[entry.role] === false && (
                            <span className="sion-link-role-status">Nonaktif</span>
                          )}
                        </div>
                        <p className="sion-link-role-card__desc">{roleDescriptions[entry.role]}</p>
                      </div>
                      <div className="sion-link-role-card__clients">
                        <Users size={13} />
                        {entry.clientCount}
                      </div>
                    </div>
                    <button
                      className="sion-link-code"
                      onClick={() => handleCopy(entry.code, `Kode ${roleLabels[entry.role]}`)}
                    >
                      {entry.code || '-'}
                    </button>
                    {entry.url && (
                      <div className="sion-link-role-card__qr">
                        {renderQr(entry.role, roleLabels[entry.role])}
                        <div>
                          <strong>Scan langsung</strong>
                          <span>
                            {status.security.rolesEnabled[entry.role] === false
                              ? 'Role sedang nonaktif. Aktifkan sebelum dibagikan.'
                              : `Masuk ke ${roleLabels[entry.role]} dengan kode ini.`}
                          </span>
                        </div>
                      </div>
                    )}
                    {entry.url && (
                      <div className="sion-link-role-card__actions">
                        <button
                          className="sp-btn sp-btn--ghost"
                          onClick={() =>
                            handleCopy(entry.url ?? '', `Link ${roleLabels[entry.role]}`)
                          }
                        >
                          <Copy size={14} />
                          Salin Link
                        </button>
                        <button
                          className="sp-btn sp-btn--ghost"
                          onClick={() => handleOpen(entry.url ?? '')}
                        >
                          <ExternalLink size={14} />
                          Buka
                        </button>
                        <button
                          className="sp-btn sp-btn--ghost"
                          onClick={() =>
                            handleDownloadQr(qrCodes[entry.role], `sion-link-${entry.role}-qr.png`)
                          }
                        >
                          QR
                        </button>
                        <button
                          className="sp-btn sp-btn--ghost"
                          onClick={() => handleRegenerateRoleCode(entry.role)}
                          disabled={isBusy}
                        >
                          <RotateCcw size={14} />
                          Kode Baru
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {status.clients.length > 0 && (
            <section className="sp-section sion-link-view sion-link-view--remote">
              <div className="sp-section-header">
                <div className="sp-section-eyebrow">
                  <Users size={13} />
                  Perangkat Online
                </div>
                <p className="sp-section-desc">
                  Putuskan perangkat tertentu tanpa mengganggu perangkat lain yang sedang dipakai.
                </p>
              </div>
              <div className="sion-link-client-list">
                {status.clients.map((client) => (
                  <div key={client.id} className="sion-link-client-card">
                    <div className="sion-link-client-card__main">
                      <div className="sion-link-client-card__title">
                        {client.displayName || roleLabels[client.role]}
                        <span>{roleLabels[client.role]}</span>
                        <span>{client.address || 'Local device'}</span>
                        {client.trusted && <span className="sion-link-trust-badge">Trusted</span>}
                      </div>
                      <p>{client.userAgent || 'Unknown browser'}</p>
                    </div>
                    <button
                      className="sp-btn sp-btn--ghost"
                      onClick={() => handleDisconnectClient(client.id)}
                      disabled={isBusy}
                    >
                      <Unplug size={14} />
                      Putuskan
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}
        </section>

        <aside className="sion-link-sidebar">
          <div className="sp-notice sp-notice--subtle sion-link-view sion-link-view--remote">
            <div className="sp-notice__icon">
              <ShieldCheck size={15} />
            </div>
            <p>
              Pemateri hanya dapat memakai Prev/Next saat materi PDF/PPT sedang live. Lagu, Alkitab,
              info, dan media umum tetap dikendalikan operator.
            </p>
          </div>

          <div className="sion-link-side-card sion-link-view sion-link-view--remote">
            <div className="sion-link-side-card__title">Cara Pakai</div>
            <ol className="sion-link-steps">
              <li>Aktifkan SION Link.</li>
              <li>Buka portal utama dari perangkat lain pada WiFi yang sama.</li>
              <li>Masukkan kode sesuai role perangkat.</li>
              <li>Gunakan Logout untuk berpindah kode atau role.</li>
            </ol>
          </div>

          <div className="sion-link-side-card sion-link-view sion-link-view--security">
            <div className="sion-link-side-card__title">Security Policy</div>
            <div className="sion-link-policy-controls">
              <label>
                Mode
                <select
                  value={status.security.mode}
                  onChange={(event) =>
                    handleSecurityUpdate({
                      mode: event.target.value as PresenterRemoteStatus['security']['mode']
                    })
                  }
                  disabled={isBusy}
                >
                  <option value="rehearsal">Latihan</option>
                  <option value="service">Ibadah</option>
                  <option value="private">Private</option>
                </select>
              </label>
              <label>
                Exact Output FPS
                <select
                  value={status.security.exactOutputFps}
                  onChange={(event) =>
                    handleSecurityUpdate({ exactOutputFps: Number(event.target.value) })
                  }
                  disabled={isBusy}
                >
                  <option value={1}>1 FPS</option>
                  <option value={2}>2 FPS</option>
                  <option value={3}>3 FPS</option>
                  <option value={5}>5 FPS</option>
                </select>
              </label>
              <div className="sion-link-role-toggles">
                {Object.entries(roleLabels).map(([role, label]) => (
                  <label key={role} className="sion-link-role-toggle">
                    <input
                      type="checkbox"
                      checked={
                        status.security.rolesEnabled[
                          role as PresenterRemoteStatus['roles'][number]['role']
                        ] !== false
                      }
                      onChange={(event) =>
                        handleRoleEnabledChange(
                          role as PresenterRemoteStatus['roles'][number]['role'],
                          event.target.checked
                        )
                      }
                      disabled={isBusy}
                    />
                    {label}
                  </label>
                ))}
              </div>
            </div>
          </div>

          {status.urls.length > 0 && (
            <div className="sion-link-side-card sion-link-view sion-link-view--security">
              <div className="sion-link-side-card__title">Alamat Jaringan</div>
              <div className="sion-link-network-list">
                {status.urls.map((url) => (
                  <button
                    key={url}
                    className="sion-link-network-url"
                    onClick={() => handleCopy(url, 'Alamat jaringan')}
                  >
                    {url}
                  </button>
                ))}
              </div>
            </div>
          )}

          {status.token && (
            <div className="sion-link-side-card sion-link-side-card--warning sion-link-view sion-link-view--security">
              <div className="sion-link-side-card__title">Token Legacy</div>
              <button
                className="sion-link-network-url"
                onClick={() => handleCopy(status.token ?? '', 'Token remote')}
              >
                {status.token}
              </button>
            </div>
          )}

          <div className="sion-link-side-card sion-link-view sion-link-view--remote">
            <div className="sion-link-side-card__title sion-link-side-card__title-row">
              Command Log
              <button className="sp-btn sp-btn--ghost" onClick={handleClearCommandLog}>
                Clear
              </button>
            </div>
            {status.commandLog.length > 0 ? (
              <div className="sion-link-command-log">
                {status.commandLog.slice(0, 8).map((entry) => (
                  <div key={entry.id} className="sion-link-command-log__item">
                    <strong>{entry.command}</strong>
                    <span>
                      {roleLabels[entry.role]} · {entry.deviceName || entry.address || 'Device'}
                    </span>
                    {!entry.ok && <em>{entry.detail || 'Ditolak'}</em>}
                  </div>
                ))}
              </div>
            ) : (
              <p className="sion-link-muted">Belum ada command remote.</p>
            )}
          </div>
        </aside>
      </div>
    </div>
  )
}
