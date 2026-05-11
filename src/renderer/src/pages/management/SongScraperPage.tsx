import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels'
import { useAppStore } from '../../store/useAppStore'
import { logger } from '../../utils/logger'
import type { Hymnal } from '../../types'
import { ProviderConfigPanel } from '../../components/scraper/ProviderConfigPanel'
import { ActivityStream } from '../../components/scraper/ActivityStream'
import { ProgressPanel } from '../../components/scraper/ProgressPanel'
import { ConflictResolutionPanel } from '../../components/scraper/ConflictResolutionPanel'
import { PreviewInspector } from '../../components/scraper/PreviewInspector'

type ScraperErrorCode =
  | 'PROVIDER_TIMEOUT'
  | 'NETWORK_OFFLINE'
  | 'RATE_LIMITED'
  | 'INVALID_HTML'
  | 'PARSE_FAILED'
  | 'PROVIDER_BROKEN'
  | 'VALIDATION_FAILED'
  | 'INVALID_PAYLOAD'
  | 'IMPORT_CONFLICT_FATAL'
  | 'DB_FAILED'
  | 'ABORTED'
  | 'INTERNAL'

interface ParsedScraperError {
  code: ScraperErrorCode
  message: string
}

function parseScraperError(err: unknown): ParsedScraperError | null {
  const str = err instanceof Error ? err.message : String(err)
  const match = str.match(/^\[SCRAPER:([A-Z_]+)\]\s*(.*)$/)
  if (match) {
    return {
      code: match[1] as ScraperErrorCode,
      message: match[2] || str
    }
  }
  return null
}

function makeScraperError(code: ScraperErrorCode, message: string): ParsedScraperError {
  return { code, message }
}

function setScraperErrorFromUnknown(
  err: unknown,
  fallbackCode: ScraperErrorCode = 'INTERNAL'
): ParsedScraperError {
  const parsed = parseScraperError(err)
  if (parsed) return parsed
  const msg = err instanceof Error ? err.message : String(err)
  return { code: fallbackCode, message: msg }
}

type ScraperLogLevel = 'INFO' | 'WARN' | 'ERROR'

type ScraperPhase = 'FETCH' | 'PARSE' | 'NORMALIZE' | 'DB' | 'FTS'

interface ScraperProviderInfo {
  id: string
  label: string
  defaultBaseUrl: string
  capabilities: {
    supportsNumericRange: boolean
    supportsSlug: boolean
    requiresBrowser: boolean
  }
}

interface ScraperLogLine {
  ts: number
  level: ScraperLogLevel
  phase?: ScraperPhase
  message: string
  providerId?: string
  songNumber?: string
}

interface ScraperSongProgress {
  number: string
  status: 'PENDING' | 'FETCHING' | 'SUCCESS' | 'FAILED' | 'SKIPPED'
  attempts: number
  error?: string
  sourceUrl?: string
  title?: string
}

type ConflictSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

interface ExistingSongSnapshot {
  id: number
  hymnal_id: number
  hymnal_code?: string
  hymnal_name?: string
  hymnal_is_official?: number
  number: string
  title: string
  lyrics_raw: string
}

interface ScraperConflictItem {
  key: string
  type: 'NUMBER_DUPLICATE' | 'TITLE_SIMILAR' | 'LYRICS_IDENTICAL'
  severity: ConflictSeverity
  reason: string
  scraped: ScrapedSongPreview
  existing: ExistingSongSnapshot
  lyricsHashMatch: boolean
  titleSimilarity: number
  lyricsSimilarity?: number
  metadataSimilarity?: number
  structureSimilarity?: number
  confidenceScore?: number
  confidenceLabel?: 'VERY_HIGH_MATCH' | 'HIGH_MATCH' | 'POSSIBLE_MATCH' | 'LOW_MATCH'
  confidenceWhy?: {
    title: number
    lyrics: number
    metadata: number
    structure: number
    weightedTotal: number
    notes: string[]
  }
}

type PerSongResolutionAction = 'skip' | 'overwrite' | 'rename' | 'merge_metadata'

interface ConflictDecision {
  key: string
  action: 'pending' | PerSongResolutionAction
  renameTitle?: string
}

interface ImportSummary {
  taskId: string
  imported: number
  skipped: number
  overwritten: number
  renamed: number
  merged: number
  failed: number
  duplicates: number
  durationMs: number
  generatedAt: string
}

interface ScraperProgressPayload {
  taskId: string
  providerId: string
  state: 'RUNNING' | 'ABORTED' | 'COMPLETED' | 'IDLE'
  total: number
  processed: number
  success: number
  failed: number
  skipped: number
  retries: number
  songsPerSec: number
  etaSec: number | null
  recentLogs: ScraperLogLine[]
  recentSongUpdates: ScraperSongProgress[]
  failedNumbers: string[]
}

interface ScrapedSongPreview {
  providerId: string
  sourceUrl: string
  sourceHymnalCode: string
  sourceSongNumber: string
  title: string
  lyrics_raw: string
  key_note?: string
  time_signature?: string
  author?: string
  composer?: string
  category?: string
  tags?: string
}

export function SongScraperPage(): React.JSX.Element {
  const { setScreen, hymnals, loadHymnals, selectedHymnalId } = useAppStore()

  const [providers, setProviders] = useState<ScraperProviderInfo[]>([])
  const [providerId, setProviderId] = useState<string>('')
  const [baseUrl, setBaseUrl] = useState<string>('')

  const [targetHymnalId, setTargetHymnalId] = useState<number | null>(selectedHymnalId ?? null)

  const [startNumber, setStartNumber] = useState<number>(1)
  const [endNumber, setEndNumber] = useState<number>(10)
  const [concurrency, setConcurrency] = useState<number>(3)
  const [retryCount, setRetryCount] = useState<number>(3)
  const [delayMs, setDelayMs] = useState<number>(250)

  const [conflictPolicy, setConflictPolicy] = useState<'skip' | 'overwrite' | 'ask'>('skip')
  const [perItemPolicy, setPerItemPolicy] = useState<
    Record<string, 'skip' | 'overwrite' | 'append'>
  >({})

  const [progress, setProgress] = useState<ScraperProgressPayload | null>(null)
  const [consoleLines, setConsoleLines] = useState<ScraperLogLine[]>([])
  const [songRows, setSongRows] = useState<Map<string, ScraperSongProgress>>(new Map())

  const [dryRunTaskId, setDryRunTaskId] = useState<string | null>(null)
  const [dryRunItems, setDryRunItems] = useState<ScrapedSongPreview[]>([])
  const [dryRunConflicts, setDryRunConflicts] = useState<ScraperConflictItem[]>([])
  const [importSummary, setImportSummary] = useState<ImportSummary | null>(null)

  const [previewBusy, setPreviewBusy] = useState(false)
  const [previewInput, setPreviewInput] = useState<string>('')
  const [previewSong, setPreviewSong] = useState<ScrapedSongPreview | null>(null)
  const [lastError, setLastError] = useState<ParsedScraperError | null>(null)
  const [savedRunningTask, setSavedRunningTask] = useState<{
    savedAt: string
    taskId: string
    request: {
      providerId: string
      baseUrl?: string
      targetHymnalId: number
      startNumber: number
      endNumber: number
      concurrency: number
      retryCount: number
      delayMs: number
      conflictPolicy: 'skip' | 'overwrite' | 'ask'
      perItemPolicy?: Record<string, 'skip' | 'overwrite' | 'append'>
    }
    failedNumbers: string[]
    state: 'IDLE' | 'RUNNING' | 'COMPLETED' | 'ABORTED'
  } | null>(null)

  const unsubRef = useRef<null | (() => void)>(null)
  const didInitRef = useRef(false)

  const didRestoreSavedDryRunRef = useRef(false)

  const hymnalsById = useMemo(() => {
    const m = new Map<number, Hymnal>()
    for (const h of hymnals) m.set(h.id, h)
    return m
  }, [hymnals])

  const isRunning = progress?.state === 'RUNNING'

  const loadProviders = useCallback(async (): Promise<void> => {
    try {
      const list = (await window.api.scraper.getProviders()) as ScraperProviderInfo[]
      setProviders(list)
      if (!providerId && list[0]) {
        setProviderId(list[0].id)
        setBaseUrl(list[0].defaultBaseUrl)
      }
    } catch (err) {
      logger.error('Failed to load scraper providers:', err)
      setLastError(makeScraperError('INTERNAL', 'Gagal memuat provider scraper'))
    }
  }, [providerId])

  useEffect(() => {
    if (didInitRef.current) return
    didInitRef.current = true
    setTimeout(() => {
      void loadHymnals()
      void loadProviders()

      // Attempt to restore saved dry-run state after crashes / reloads.
      void (async () => {
        if (didRestoreSavedDryRunRef.current) return
        didRestoreSavedDryRunRef.current = true
        try {
          const saved = (await window.api.scraper.getSavedDryRunState()) as {
            savedAt: string
            taskId: string
            request: {
              providerId: string
              baseUrl?: string
              targetHymnalId: number
              startNumber: number
              endNumber: number
              concurrency: number
              retryCount: number
              delayMs: number
              conflictPolicy: 'skip' | 'overwrite' | 'ask'
              perItemPolicy?: Record<string, 'skip' | 'overwrite' | 'append'>
            }
            items: ScrapedSongPreview[]
            conflicts: ScraperConflictItem[]
          } | null

          if (!saved) return

          setProviderId(saved.request.providerId)
          setBaseUrl(saved.request.baseUrl ?? '')
          setTargetHymnalId(saved.request.targetHymnalId)
          setStartNumber(saved.request.startNumber)
          setEndNumber(saved.request.endNumber)
          setConcurrency(saved.request.concurrency)
          setRetryCount(saved.request.retryCount)
          setDelayMs(saved.request.delayMs)
          setConflictPolicy(saved.request.conflictPolicy)
          setPerItemPolicy(saved.request.perItemPolicy ?? {})

          setDryRunTaskId(saved.taskId)
          setDryRunItems(saved.items || [])
          setDryRunConflicts(saved.conflicts || [])
        } catch (err) {
          logger.warn('Failed to restore saved dry run state:', err)
        }
      })()

      // Detect saved running task state and show confirmation dialog instead of auto-resume.
      void (async () => {
        try {
          const saved = (await window.api.scraper.getSavedRunningTaskState()) as
            | {
                savedAt: string
                taskId: string
                request: {
                  providerId: string
                  baseUrl?: string
                  targetHymnalId: number
                  startNumber: number
                  endNumber: number
                  concurrency: number
                  retryCount: number
                  delayMs: number
                  conflictPolicy: 'skip' | 'overwrite' | 'ask'
                  perItemPolicy?: Record<string, 'skip' | 'overwrite' | 'append'>
                }
                failedNumbers: string[]
                state: 'IDLE' | 'RUNNING' | 'COMPLETED' | 'ABORTED'
              }
            | null

          if (!saved) return
          if (saved.state !== 'RUNNING') return
          if (!saved.failedNumbers || saved.failedNumbers.length === 0) return

          // Store for confirmation dialog; don't auto-resume.
          setSavedRunningTask(saved)
        } catch (err) {
          logger.warn('Failed to check saved running task state:', err)
        }
      })()
    }, 0)
  }, [loadHymnals, loadProviders])

  const handleResumeSavedTask = useCallback(async (): Promise<void> => {
    if (!savedRunningTask) return
    const saved = savedRunningTask

    setProviderId(saved.request.providerId)
    setBaseUrl(saved.request.baseUrl ?? '')
    setTargetHymnalId(saved.request.targetHymnalId)
    setStartNumber(saved.request.startNumber)
    setEndNumber(saved.request.endNumber)
    setConcurrency(saved.request.concurrency)
    setRetryCount(saved.request.retryCount)
    setDelayMs(saved.request.delayMs)
    setConflictPolicy(saved.request.conflictPolicy)
    setPerItemPolicy(saved.request.perItemPolicy ?? {})

    setSavedRunningTask(null)

    try {
      await window.api.scraper.resumeFailed({
        request: saved.request,
        failedNumbers: saved.failedNumbers
      })
      await window.api.scraper.clearSavedRunningTaskState()
    } catch (err) {
      logger.error('Failed to resume saved task:', err)
      setLastError(setScraperErrorFromUnknown(err))
    }
  }, [savedRunningTask])

  const handleDismissSavedTask = useCallback(async (): Promise<void> => {
    setSavedRunningTask(null)
    try {
      await window.api.scraper.clearSavedRunningTaskState()
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    unsubRef.current?.()
    unsubRef.current = window.api.scraper.onProgress((payload) => {
      const p = payload as ScraperProgressPayload
      setProgress(p)

      setConsoleLines((prev) => {
        const merged = [...prev, ...(p.recentLogs || [])]
        return merged.length > 2000 ? merged.slice(-2000) : merged
      })

      setSongRows((prev) => {
        const next = new Map(prev)
        for (const u of p.recentSongUpdates || []) {
          next.set(u.number, u)
        }
        return next
      })
    })

    return () => {
      unsubRef.current?.()
      unsubRef.current = null
    }
  }, [])

  const handleProviderIdChange = useCallback(
    (nextProviderId: string): void => {
      setProviderId(nextProviderId)
      const p = providers.find((x) => x.id === nextProviderId)
      if (p) setBaseUrl(p.defaultBaseUrl)
    },
    [providers]
  )

  const handleBack = useCallback((): void => {
    setScreen('dashboard')
  }, [setScreen])

  const handleStart = useCallback(async (): Promise<void> => {
    setLastError(null)

    if (!providerId) {
      setLastError(makeScraperError('INVALID_PAYLOAD', 'Provider wajib dipilih'))
      return
    }
    if (!targetHymnalId) {
      setLastError(makeScraperError('INVALID_PAYLOAD', 'Target hymnal wajib dipilih'))
      return
    }
    if (endNumber < startNumber) {
      setLastError(makeScraperError('INVALID_PAYLOAD', 'End Number harus lebih besar atau sama dengan Start Number'))
      return
    }

    setConsoleLines([])
    setSongRows(new Map())
    setProgress(null)
    setDryRunTaskId(null)
    setDryRunItems([])
    setDryRunConflicts([])
    setImportSummary(null)

    setSavedRunningTask(null)

    try {
      // Clear any previously saved dry-run state (we're starting a new one).
      await window.api.scraper.clearSavedDryRunState()
    } catch {
      // ignore
    }

    try {
      const res = (await window.api.scraper.dryRun({
        providerId,
        baseUrl,
        targetHymnalId,
        startNumber,
        endNumber,
        concurrency,
        retryCount,
        delayMs,
        conflictPolicy,
        perItemPolicy
      })) as { taskId: string; items: ScrapedSongPreview[]; conflicts: ScraperConflictItem[] }
      setDryRunTaskId(res.taskId)
      setDryRunItems(res.items || [])
      setDryRunConflicts(res.conflicts || [])
    } catch (err) {
      logger.error('Scraper start failed:', err)
      setLastError(setScraperErrorFromUnknown(err))
    }
  }, [
    providerId,
    baseUrl,
    targetHymnalId,
    startNumber,
    endNumber,
    concurrency,
    retryCount,
    delayMs,
    conflictPolicy,
    perItemPolicy
  ])

  const handleImport = useCallback(
    async (decisions: Record<string, ConflictDecision>): Promise<void> => {
      setLastError(null)
      if (!dryRunTaskId) {
        setLastError(makeScraperError('VALIDATION_FAILED', 'Dry run belum dijalankan'))
        return
      }
      if (!targetHymnalId) return

      try {
        // Convert decisions to backend format
        const backendDecisions: Record<
          string,
          { action: 'skip' | 'overwrite' | 'rename' | 'merge_metadata'; renameTitle?: string }
        > = {}
        for (const [key, decision] of Object.entries(decisions)) {
          if (decision.action !== 'pending') {
            backendDecisions[key] = {
              action: decision.action,
              renameTitle: decision.renameTitle
            }
          }
        }

        const summary = (await window.api.scraper.importFromDryRun({
          taskId: dryRunTaskId,
          request: {
            providerId,
            baseUrl,
            targetHymnalId,
            startNumber,
            endNumber,
            concurrency,
            retryCount,
            delayMs,
            conflictPolicy,
            perItemPolicy
          },
          items: dryRunItems,
          decisions: backendDecisions,
          defaultAction: conflictPolicy === 'overwrite' ? 'overwrite' : 'skip'
        })) as ImportSummary
        setImportSummary(summary)
      } catch (err) {
        logger.error('Import failed:', err)
        setLastError(setScraperErrorFromUnknown(err, 'IMPORT_CONFLICT_FATAL'))
      }
    },
    [
      dryRunTaskId,
      providerId,
      baseUrl,
      targetHymnalId,
      startNumber,
      endNumber,
      concurrency,
      retryCount,
      delayMs,
      conflictPolicy,
      perItemPolicy,
      dryRunItems
    ]
  )

  const handleAbort = useCallback(async (): Promise<void> => {
    try {
      await window.api.scraper.abort()
    } catch (err) {
      logger.error('Abort failed:', err)
      setLastError(setScraperErrorFromUnknown(err, 'ABORTED'))
    }
  }, [])

  const handleRetryFailed = useCallback(async (): Promise<void> => {
    try {
      await window.api.scraper.retryFailed()
    } catch (err) {
      logger.error('Retry failed songs failed:', err)
      setLastError(setScraperErrorFromUnknown(err))
    }
  }, [])

  const handlePreview = useCallback(async (): Promise<void> => {
    setLastError(null)
    if (!providerId) return

    setPreviewBusy(true)
    try {
      const song = (await window.api.scraper.preview({
        providerId,
        input: previewInput,
        baseUrl
      })) as ScrapedSongPreview
      setPreviewSong(song)
    } catch (err) {
      logger.error('Preview failed:', err)
      setPreviewSong(null)
      setLastError(setScraperErrorFromUnknown(err))
    } finally {
      setPreviewBusy(false)
    }
  }, [providerId, previewInput, baseUrl])

  const songRowList = useMemo(() => {
    const arr = Array.from(songRows.values())
    arr.sort((a, b) => {
      const ai = parseInt(a.number, 10)
      const bi = parseInt(b.number, 10)
      if (Number.isFinite(ai) && Number.isFinite(bi)) return ai - bi
      return a.number.localeCompare(b.number)
    })
    return arr
  }, [songRows])

  const targetHymnalLabel = targetHymnalId ? hymnalsById.get(targetHymnalId)?.code : undefined

  const stateBadgeVariant = useMemo(() => {
    const s = progress?.state
    if (s === 'COMPLETED') return 'status-badge--ok'
    if (s === 'ABORTED') return 'status-badge--broken'
    if (s === 'RUNNING') return 'status-badge--warning'
    return 'status-badge--unknown'
  }, [progress?.state])

  const conflictCount = dryRunConflicts.length
  const queueRemaining = Math.max(0, (progress?.total ?? 0) - (progress?.processed ?? 0))

  return (
    <div className="h-full w-full bg-bg-base text-text-primary flex flex-col min-h-0">
      {/* Command Header */}
      <div className="command-header">
        <div className="command-header__left">
          <span className={`status-badge ${stateBadgeVariant}`}>
            <span className="status-badge__dot"></span>
            {progress?.state ?? 'IDLE'}
          </span>
          <span className="text-label">Provider: {providerId || '—'}</span>
          <span className="text-label">Target: {targetHymnalLabel || '—'}</span>
          <span className="text-label">Queue: {queueRemaining}</span>
        </div>
        <div className="command-header__right">
          <div className="command-stat">
            <span className="command-stat__value">{progress?.processed ?? 0}</span>
            <span className="command-stat__label">Done</span>
          </div>
          <div className="command-stat">
            <span className="command-stat__value text-emerald-400">{progress?.success ?? 0}</span>
            <span className="command-stat__label">Success</span>
          </div>
          <div className="command-stat">
            <span className="command-stat__value text-rose-400">{progress?.failed ?? 0}</span>
            <span className="command-stat__label">Failed</span>
          </div>
          <div className="command-stat">
            <span className="command-stat__value text-amber-400">{conflictCount}</span>
            <span className="command-stat__label">Conflicts</span>
          </div>
          <div className="command-stat">
            <span className="command-stat__value text-cyan-300">
              {(progress?.songsPerSec ?? 0).toFixed(1)}
            </span>
            <span className="command-stat__label">Rate/s</span>
          </div>
          <div className="command-stat">
            <span className="command-stat__value">
              {progress?.etaSec == null ? '—' : `${Math.max(0, Math.round(progress.etaSec))}s`}
            </span>
            <span className="command-stat__label">ETA</span>
          </div>
          <button onClick={handleBack} className="btn-premium btn-premium-ghost btn-premium-icon">
            ←
          </button>
        </div>
      </div>

      {lastError && (
        <div className="card-modern card-modern--danger mx-4 mt-2">
          <div className="flex items-start gap-2">
            <span className="px-1.5 py-0.5 text-xs font-mono bg-rose-500/20 text-rose-300 rounded">
              {lastError.code}
            </span>
            <span className="text-sm text-rose-300">{lastError.message}</span>
          </div>
        </div>
      )}

      {/* Resume Task Confirmation Modal */}
      {savedRunningTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="card-modern w-full max-w-md mx-4">
            <div className="card-modern__header">
              <h3 className="text-lg font-semibold">Resume Previous Task?</h3>
            </div>
            <div className="card-modern__body space-y-3">
              <p className="text-sm text-slate-300">
                A previous scraper task was interrupted. Would you like to resume scraping the failed numbers?
              </p>
              <div className="text-sm bg-slate-800/50 rounded p-3 space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-400">Provider:</span>
                  <span className="font-medium">{savedRunningTask.request.providerId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Range:</span>
                  <span className="font-medium">{savedRunningTask.request.startNumber} - {savedRunningTask.request.endNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Failed Numbers:</span>
                  <span className="font-medium text-amber-400">{savedRunningTask.failedNumbers?.length ?? 0}</span>
                </div>
                {savedRunningTask.savedAt && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Saved:</span>
                    <span className="font-medium">{new Date(savedRunningTask.savedAt).toLocaleString()}</span>
                  </div>
                )}
              </div>
            </div>
            <div className="card-modern__footer flex justify-end gap-2">
              <button
                onClick={handleDismissSavedTask}
                className="btn btn--ghost"
              >
                Dismiss
              </button>
              <button
                onClick={handleResumeSavedTask}
                className="btn btn--primary"
              >
                Resume
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 min-h-0">
        <PanelGroup direction="horizontal" className="h-full">
          <Panel defaultSize={28} minSize={22} className="min-h-0">
            <div className="h-full min-h-0 p-4">
              <ProviderConfigPanel
                providers={providers}
                providerId={providerId}
                baseUrl={baseUrl}
                hymnals={hymnals}
                targetHymnalId={targetHymnalId}
                startNumber={startNumber}
                endNumber={endNumber}
                concurrency={concurrency}
                retryCount={retryCount}
                delayMs={delayMs}
                conflictPolicy={conflictPolicy}
                disabled={isRunning}
                onProviderIdChange={handleProviderIdChange}
                onBaseUrlChange={setBaseUrl}
                onTargetHymnalIdChange={setTargetHymnalId}
                onStartNumberChange={setStartNumber}
                onEndNumberChange={setEndNumber}
                onConcurrencyChange={setConcurrency}
                onRetryCountChange={setRetryCount}
                onDelayMsChange={setDelayMs}
                onConflictPolicyChange={setConflictPolicy}
                onStart={handleStart}
                onAbort={handleAbort}
                onRetryFailed={handleRetryFailed}
                canRetryFailed={(progress?.failedNumbers?.length ?? 0) > 0 && !isRunning}
              />
            </div>
          </Panel>

          <PanelResizeHandle className="w-1 bg-border-subtle hover:bg-border-strong" />

          <Panel defaultSize={44} minSize={30} className="min-h-0">
            <PanelGroup direction="vertical" className="h-full">
              <Panel defaultSize={55} minSize={35} className="min-h-0">
                <div className="h-full min-h-0 p-4">
                  <ActivityStream lines={consoleLines} />
                </div>
              </Panel>

              <PanelResizeHandle className="h-1 bg-border-subtle hover:bg-border-strong" />

              <Panel defaultSize={45} minSize={25} className="min-h-0">
                <div className="h-full min-h-0 p-4">
                  <ProgressPanel
                    progress={progress}
                    rows={songRowList}
                    hasConflicts={dryRunConflicts.length > 0}
                  />
                </div>
              </Panel>
            </PanelGroup>
          </Panel>

          <PanelResizeHandle className="w-1 bg-border-subtle hover:bg-border-strong" />

          <Panel defaultSize={28} minSize={22} className="min-h-0">
            <PanelGroup direction="vertical" className="h-full">
              <Panel defaultSize={45} minSize={30} className="min-h-0">
                <div className="h-full min-h-0 p-4">
                  <ConflictResolutionPanel
                    policy={conflictPolicy}
                    perItemPolicy={perItemPolicy}
                    failedNumbers={progress?.failedNumbers ?? []}
                    conflicts={dryRunConflicts}
                    providerId={providerId}
                    targetHymnalId={targetHymnalId}
                    taskId={dryRunTaskId}
                    onPerItemPolicyChange={setPerItemPolicy}
                    canImport={!!dryRunTaskId && !isRunning}
                    onImport={handleImport}
                    importSummary={importSummary}
                  />
                </div>
              </Panel>

              <PanelResizeHandle className="h-1 bg-border-subtle hover:bg-border-strong" />

              <Panel defaultSize={55} minSize={30} className="min-h-0">
                <div className="h-full min-h-0 p-3">
                  <PreviewInspector
                    providerId={providerId}
                    baseUrl={baseUrl}
                    previewBusy={previewBusy}
                    previewInput={previewInput}
                    onPreviewInputChange={setPreviewInput}
                    onPreview={handlePreview}
                    song={previewSong}
                  />
                </div>
              </Panel>
            </PanelGroup>
          </Panel>
        </PanelGroup>
      </div>
    </div>
  )
}
