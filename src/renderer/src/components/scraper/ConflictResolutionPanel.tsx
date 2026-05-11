import React, { useMemo, useState, useCallback, useEffect } from 'react'
import { ConflictDecisionTable } from './ConflictDecisionTable'

interface SaveDialogResult {
  canceled: boolean
  filePath?: string
}

type ConflictSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

type ResolutionAction = 'pending' | 'skip' | 'overwrite' | 'rename' | 'merge_metadata'

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

interface ScrapedSongPreview {
  providerId: string
  sourceUrl: string
  sourceHymnalCode: string
  sourceSongNumber: string
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
  confidenceScore?: number
}

interface ConflictDecision {
  key: string
  action: ResolutionAction
  renameTitle?: string
}

// Versioned persistence schema for review session state
interface PersistedReviewStateV1 {
  version: 1
  taskId: string
  providerId: string
  targetHymnalId: number | null
  decisions: Record<string, ConflictDecision>
  sortMode: string
  filterMode: string
  hideResolved: boolean
  updatedAt: string
}

const SESSION_MAX_AGE_HOURS = 72

function migratePersistedState(raw: unknown): PersistedReviewStateV1 | null {
  if (!raw || typeof raw !== 'object') return null
  const state = raw as Record<string, unknown>

  switch (state.version) {
    case 1:
      return raw as PersistedReviewStateV1
    default:
      return null
  }
}

function checkSessionStale(updatedAt: string): boolean {
  try {
    const age = Date.now() - new Date(updatedAt).getTime()
    const maxAge = SESSION_MAX_AGE_HOURS * 60 * 60 * 1000
    return age > maxAge
  } catch {
    return true
  }
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

function sevColor(sev: ConflictSeverity): string {
  if (sev === 'CRITICAL') return 'text-red-200'
  if (sev === 'HIGH') return 'text-orange-200'
  if (sev === 'MEDIUM') return 'text-yellow-200'
  return 'text-green-200'
}

export function ConflictResolutionPanel(props: {
  policy: 'skip' | 'overwrite' | 'ask'
  perItemPolicy: Record<string, 'skip' | 'overwrite' | 'append'>
  failedNumbers: string[]
  conflicts: ScraperConflictItem[]
  providerId: string
  targetHymnalId: number | null
  taskId: string | null
  onPerItemPolicyChange: (v: Record<string, 'skip' | 'overwrite' | 'append'>) => void
  canImport: boolean
  onImport: (decisions: Record<string, ConflictDecision>) => void
  importSummary: ImportSummary | null
}): React.JSX.Element {
  const restoredSnapshot = useMemo(() => {
    if (!props.taskId) return null
    try {
      const raw = localStorage.getItem(`scraper_review_state_${props.taskId}`)
      if (!raw) return null
      const parsed = JSON.parse(raw)
      const migrated = migratePersistedState(parsed)
      if (!migrated || migrated.taskId !== props.taskId) return null
      return migrated
    } catch {
      return null
    }
  }, [props.taskId])

  // Persist decisions per taskId to localStorage for pause/resume
  const [restoredState] = useState<PersistedReviewStateV1 | null>(restoredSnapshot)
  const [isStaleSession] = useState<boolean>(
    restoredSnapshot ? checkSessionStale(restoredSnapshot.updatedAt) : false
  )

  const [decisions, setDecisions] = useState<Record<string, ConflictDecision>>(() => {
    return restoredSnapshot?.decisions ?? {}
  })

  const hint = useMemo(() => {
    if (props.policy === 'skip') return 'Existing songs will be skipped.'
    if (props.policy === 'overwrite') return 'Existing songs will be overwritten.'
    return 'Resolve duplicates per-song (policy map).'
  }, [props.policy])

  const defaultAction = useMemo(() => {
    if (props.policy === 'skip') return 'skip'
    if (props.policy === 'overwrite') return 'overwrite'
    return 'pending'
  }, [props.policy])

  type SortMode =
    | 'SEVERITY_THEN_CONFIDENCE_ASC'
    | 'SEVERITY_ONLY'
    | 'LOWEST_CONFIDENCE_FIRST'
    | 'HIGHEST_CONFIDENCE_FIRST'

  const [sortMode, setSortMode] = useState<SortMode>(() => {
    try {
      const raw = localStorage.getItem('scraper_conflict_sort_mode')
      if (
        raw === 'SEVERITY_THEN_CONFIDENCE_ASC' ||
        raw === 'SEVERITY_ONLY' ||
        raw === 'LOWEST_CONFIDENCE_FIRST' ||
        raw === 'HIGHEST_CONFIDENCE_FIRST'
      ) {
        return raw
      }
    } catch {
      // ignore
    }
    return 'SEVERITY_THEN_CONFIDENCE_ASC'
  })

  type ReviewFilterMode = 'ALL' | 'PENDING' | 'DECIDED' | 'CRITICAL_ONLY'

  const [reviewFilterMode, setReviewFilterMode] = useState<ReviewFilterMode>(() => {
    try {
      const filterRaw = localStorage.getItem('scraper_conflict_filter_mode')
      if (
        filterRaw === 'ALL' ||
        filterRaw === 'PENDING' ||
        filterRaw === 'DECIDED' ||
        filterRaw === 'CRITICAL_ONLY'
      ) {
        return filterRaw
      }
    } catch {
      // ignore
    }
    return 'ALL'
  })
  const [hideResolved, setHideResolved] = useState<boolean>(() => {
    try {
      const hideRaw = localStorage.getItem('scraper_conflict_hide_resolved')
      if (hideRaw === 'true' || hideRaw === 'false') {
        return hideRaw === 'true'
      }
    } catch {
      // ignore
    }
    return false
  })

  const handleSortModeChange = useCallback((next: SortMode) => {
    setSortMode(next)
    try {
      localStorage.setItem('scraper_conflict_sort_mode', next)
    } catch {
      // ignore
    }
  }, [])

  const handleReviewFilterModeChange = useCallback((next: ReviewFilterMode) => {
    setReviewFilterMode(next)
    try {
      localStorage.setItem('scraper_conflict_filter_mode', next)
    } catch {
      // ignore
    }
  }, [])

  const handleHideResolvedChange = useCallback((next: boolean) => {
    setHideResolved(next)
    try {
      localStorage.setItem('scraper_conflict_hide_resolved', String(next))
    } catch {
      // ignore
    }
  }, [])

  // Persist decisions to localStorage whenever they change
  useEffect(() => {
    if (!props.taskId) return
    try {
      const state: PersistedReviewStateV1 = {
        version: 1,
        taskId: props.taskId,
        providerId: props.providerId,
        targetHymnalId: props.targetHymnalId,
        decisions,
        sortMode,
        filterMode: reviewFilterMode,
        hideResolved,
        updatedAt: new Date().toISOString()
      }
      localStorage.setItem(`scraper_review_state_${props.taskId}`, JSON.stringify(state))
    } catch {
      // ignore
    }
  }, [
    props.taskId,
    props.providerId,
    props.targetHymnalId,
    decisions,
    sortMode,
    reviewFilterMode,
    hideResolved
  ])

  // Clear persisted decisions after successful import
  useEffect(() => {
    if (props.importSummary && props.taskId) {
      try {
        localStorage.removeItem(`scraper_review_state_${props.taskId}`)
      } catch {
        // ignore
      }
    }
  }, [props.importSummary, props.taskId])

  // Track if decisions were restored from localStorage
  const hasRestoredDecisions = restoredState !== null && Object.keys(decisions).length > 0

  const decisionsStats = useMemo(() => {
    let pending = 0
    let decided = 0
    let skip = 0
    let overwrite = 0
    let rename = 0
    let merge = 0
    let critical = 0

    for (const c of props.conflicts) {
      if (c.severity === 'CRITICAL') critical++

      const action = decisions[c.key]?.action ?? 'pending'
      if (action === 'pending') pending++
      else {
        decided++
        if (action === 'skip') skip++
        else if (action === 'overwrite') overwrite++
        else if (action === 'rename') rename++
        else if (action === 'merge_metadata') merge++
      }
    }

    return {
      pending,
      decided,
      skip,
      overwrite,
      rename,
      merge,
      critical,
      total: props.conflicts.length
    }
  }, [props.conflicts, decisions])

  // Bulk action types
  type BulkActionType =
    | 'skip_low_confidence'
    | 'overwrite_empty_lyrics'
    | 'merge_identical_lyrics'
    | 'approve_high_confidence'

  const [lastBulkAction, setLastBulkAction] = useState<Record<string, ConflictDecision> | null>(
    null
  )

  // Compute bulk action preview counts
  const bulkActionCounts = useMemo(() => {
    let skipLowConfidence = 0
    let overwriteEmptyLyrics = 0
    let mergeIdenticalLyrics = 0
    let approveHighConfidence = 0

    for (const c of props.conflicts) {
      const currentAction = decisions[c.key]?.action ?? 'pending'
      if (currentAction !== 'pending') continue // Skip already decided

      // Skip LOW confidence (< 0.5)
      if (c.confidenceScore !== undefined && c.confidenceScore < 0.5) {
        skipLowConfidence++
      }

      // Overwrite empty lyrics targets
      if (!c.existing.lyrics_raw || c.existing.lyrics_raw.trim() === '') {
        if (c.scraped.lyrics_raw && c.scraped.lyrics_raw.trim() !== '') {
          overwriteEmptyLyrics++
        }
      }

      // Merge metadata for identical lyrics
      if (c.lyricsHashMatch) {
        mergeIdenticalLyrics++
      }

      // Approve HIGH confidence (>= 0.9)
      if (c.confidenceScore !== undefined && c.confidenceScore >= 0.9) {
        approveHighConfidence++
      }
    }

    return { skipLowConfidence, overwriteEmptyLyrics, mergeIdenticalLyrics, approveHighConfidence }
  }, [props.conflicts, decisions])

  // Apply bulk action (only modifies decisions, does not execute)
  const applyBulkAction = useCallback(
    (actionType: BulkActionType): void => {
      const newDecisions: Record<string, ConflictDecision> = { ...decisions }
      const affectedKeys: string[] = []

      for (const c of props.conflicts) {
        const currentAction = decisions[c.key]?.action ?? 'pending'
        if (currentAction !== 'pending') continue // Skip already decided

        let shouldApply = false
        let action: ResolutionAction = 'skip'

        switch (actionType) {
          case 'skip_low_confidence':
            if (c.confidenceScore !== undefined && c.confidenceScore < 0.5) {
              shouldApply = true
              action = 'skip'
            }
            break
          case 'overwrite_empty_lyrics':
            if (
              (!c.existing.lyrics_raw || c.existing.lyrics_raw.trim() === '') &&
              c.scraped.lyrics_raw &&
              c.scraped.lyrics_raw.trim() !== ''
            ) {
              shouldApply = true
              action = 'overwrite'
            }
            break
          case 'merge_identical_lyrics':
            if (c.lyricsHashMatch) {
              shouldApply = true
              action = 'merge_metadata'
            }
            break
          case 'approve_high_confidence':
            if (c.confidenceScore !== undefined && c.confidenceScore >= 0.9) {
              shouldApply = true
              action = 'overwrite'
            }
            break
        }

        if (shouldApply) {
          newDecisions[c.key] = { key: c.key, action }
          affectedKeys.push(c.key)
        }
      }

      if (affectedKeys.length > 0) {
        setLastBulkAction(decisions) // Save for undo
        setDecisions(newDecisions)
      }
    },
    [props.conflicts, decisions]
  )

  // Undo last bulk action
  const undoLastBulkAction = useCallback((): void => {
    if (lastBulkAction) {
      setDecisions(lastBulkAction)
      setLastBulkAction(null)
    }
  }, [lastBulkAction])

  const filteredConflicts = useMemo(() => {
    return (props.conflicts || []).filter((c) => {
      const action = decisions[c.key]?.action ?? 'pending'
      const isResolved = action !== 'pending'
      const isCritical = c.severity === 'CRITICAL'

      if (hideResolved && isResolved) return false

      if (reviewFilterMode === 'PENDING') return !isResolved
      if (reviewFilterMode === 'DECIDED') return isResolved
      if (reviewFilterMode === 'CRITICAL_ONLY') return isCritical

      return true
    })
  }, [props.conflicts, decisions, hideResolved, reviewFilterMode])

  const handleImport = useCallback(() => {
    props.onImport(decisions)
  }, [props, decisions])

  const handleExportReport = useCallback(async () => {
    if (!props.importSummary) return

    try {
      const result = (await window.api.file.showSaveDialog({
        title: 'Export Import Report',
        defaultPath: `scraper-report-${props.importSummary.taskId}.json`,
        filters: [{ name: 'JSON', extensions: ['json'] }]
      })) as SaveDialogResult

      if (result.canceled || !result.filePath) return

      const report = {
        summary: props.importSummary,
        conflicts: props.conflicts.map((c) => ({
          key: c.key,
          type: c.type,
          severity: c.severity,
          reason: c.reason,
          scraped: {
            number: c.scraped.sourceSongNumber,
            title: c.scraped.title,
            url: c.scraped.sourceUrl
          },
          existing: {
            id: c.existing.id,
            number: c.existing.number,
            title: c.existing.title,
            hymnal: c.existing.hymnal_code
          },
          decision: decisions[c.key]?.action ?? 'pending'
        })),
        generatedAt: new Date().toISOString()
      }

      await window.api.file.writeJson(result.filePath, report)
    } catch (err) {
      console.error('Export report failed:', err)
    }
  }, [props.importSummary, props.conflicts, decisions])

  return (
    <div className="h-full min-h-0 card-modern flex flex-col">
      <div className="card-modern__header">
        <div>
          <div className="card-modern__title">Conflict Resolution</div>
          <div className="card-modern__subtitle">{hint}</div>
        </div>
      </div>

      <div className="px-5 pb-5 space-y-3 overflow-auto">
        <div className="rounded bg-bg-base/60 border border-border-subtle p-2 text-xs">
          <div className="text-text-muted">Duplicate Detection Signals</div>
          <div className="mt-1">
            - hymnal_code (target)
            <br />- normalized number
            <br />- title (secondary)
          </div>
        </div>

        <div className="rounded bg-bg-base/60 border border-border-subtle p-2 text-xs">
          <div className="text-text-muted">Dry Run Conflict Report</div>
          <div className="mt-1">Conflicts: {props.conflicts?.length ?? 0}</div>
          <div className="mt-2 space-y-2">
            {(props.conflicts || []).slice(0, 30).map((c) => (
              <div
                key={`${c.key}:${c.type}`}
                className="rounded border border-border-subtle bg-black/20 p-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className={`text-xs font-mono ${sevColor(c.severity)}`}>{c.severity}</div>
                  <div className="text-xs text-text-muted font-mono truncate">{c.type}</div>
                </div>
                <div className="text-xs mt-1 text-text-muted">{c.reason}</div>
                <div className="text-xs mt-1">
                  <span className="text-text-muted">Scraped:</span> {c.scraped.title}
                </div>
                <div className="text-xs mt-1">
                  <span className="text-text-muted">Existing:</span> {c.existing.title}
                </div>
              </div>
            ))}
            {(props.conflicts || []).length > 30 && (
              <div className="text-xs text-text-muted">Showing first 30 conflicts…</div>
            )}
          </div>
        </div>

        {props.policy === 'ask' && props.conflicts.length > 0 ? (
          <div className="space-y-2">
            {/* Bulk Actions Section */}
            <div className="rounded border border-border-subtle bg-bg-base/60 px-2 py-2">
              <div className="flex items-center justify-between gap-2">
                <div className="text-xs text-text-muted font-semibold">Bulk Actions</div>
                <div className="flex items-center gap-2">
                  <select
                    onChange={(e) => {
                      const action = e.target.value as BulkActionType
                      if (action) applyBulkAction(action)
                      e.target.value = ''
                    }}
                    className="input-premium text-[10px] px-2 py-1"
                    defaultValue=""
                  >
                    <option value="" disabled>
                      Select action...
                    </option>
                    <option value="overwrite_empty_lyrics">
                      Overwrite Empty Lyrics ({bulkActionCounts.overwriteEmptyLyrics})
                    </option>
                    <option value="merge_identical_lyrics">
                      Merge Identical Lyrics ({bulkActionCounts.mergeIdenticalLyrics})
                    </option>
                    <option value="skip_low_confidence">
                      Skip LOW Confidence ({bulkActionCounts.skipLowConfidence})
                    </option>
                    <option value="approve_high_confidence">
                      Approve HIGH Confidence ({bulkActionCounts.approveHighConfidence})
                    </option>
                  </select>
                  {lastBulkAction && (
                    <button
                      onClick={undoLastBulkAction}
                      className="btn-premium btn-premium-danger text-[10px] px-2 py-1"
                    >
                      Undo Bulk
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Sticky Review Toolbar */}
            <div className="sticky top-0 z-10 rounded border border-border-subtle bg-bg-elevated/90 backdrop-blur px-2 py-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="text-xs text-text-muted">Per-song Resolution</div>
                  {hasRestoredDecisions && (
                    <div className="flex items-center gap-1">
                      <div className="text-[10px] text-blue-300 bg-blue-900/30 px-1.5 py-0.5 rounded">
                        Session restored
                      </div>
                      {isStaleSession && (
                        <div
                          className="text-[10px] text-yellow-300 bg-yellow-900/30 px-1.5 py-0.5 rounded"
                          title="Session may be outdated due to database or provider changes"
                        >
                          ⚠ May be outdated
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <div className="text-[10px] text-text-muted">Filter:</div>
                    <select
                      value={reviewFilterMode}
                      onChange={(e) =>
                        handleReviewFilterModeChange(e.target.value as ReviewFilterMode)
                      }
                      className="input-premium text-[10px] px-2 py-1"
                    >
                      <option value="ALL">All</option>
                      <option value="PENDING">Pending</option>
                      <option value="DECIDED">Decided</option>
                      <option value="CRITICAL_ONLY">Critical Only</option>
                    </select>
                  </div>

                  <label className="flex items-center gap-2 text-[10px] text-text-muted select-none">
                    <input
                      type="checkbox"
                      checked={hideResolved}
                      onChange={(e) => handleHideResolvedChange(e.target.checked)}
                    />
                    Hide Resolved
                  </label>

                  <div className="flex items-center gap-2">
                    <div className="text-[10px] text-text-muted">Sort:</div>
                    <select
                      value={sortMode}
                      onChange={(e) => handleSortModeChange(e.target.value as SortMode)}
                      className="input-premium text-[10px] px-2 py-1"
                    >
                      <option value="SEVERITY_THEN_CONFIDENCE_ASC">
                        Severity + Lowest Confidence
                      </option>
                      <option value="SEVERITY_ONLY">Severity Only</option>
                      <option value="LOWEST_CONFIDENCE_FIRST">Lowest Confidence First</option>
                      <option value="HIGHEST_CONFIDENCE_FIRST">Highest Confidence First</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-3 text-[10px] font-mono">
                <div className="text-text-muted">Total: {decisionsStats.total}</div>
                <div className="text-yellow-300">Pending: {decisionsStats.pending}</div>
                <div className="text-text-muted">Decided: {decisionsStats.decided}</div>
                {decisionsStats.skip > 0 && (
                  <div className="text-text-muted">Skip: {decisionsStats.skip}</div>
                )}
                {decisionsStats.overwrite > 0 && (
                  <div className="text-orange-300">Overwrite: {decisionsStats.overwrite}</div>
                )}
                {decisionsStats.rename > 0 && (
                  <div className="text-blue-300">Rename: {decisionsStats.rename}</div>
                )}
                {decisionsStats.merge > 0 && (
                  <div className="text-green-300">Merge: {decisionsStats.merge}</div>
                )}
                {decisionsStats.critical > 0 && (
                  <div className="text-red-300">Critical: {decisionsStats.critical}</div>
                )}
                <div className="text-text-muted ml-auto">Showing: {filteredConflicts.length}</div>
              </div>
            </div>
            <ConflictDecisionTable
              conflicts={filteredConflicts}
              decisions={decisions}
              onDecisionsChange={setDecisions}
              defaultAction={defaultAction}
              sortMode={sortMode}
            />
          </div>
        ) : props.policy === 'ask' ? (
          <div className="text-xs text-text-muted">
            Per-song resolution enabled (no conflicts to resolve)
          </div>
        ) : (
          <div className="text-xs text-text-muted">Per-song map disabled (global strategy)</div>
        )}

        <div className="rounded bg-bg-base/60 border border-border-subtle p-2 text-xs">
          <div className="text-text-muted">Failed Songs</div>
          <div className="mt-1 font-mono break-words">
            {(props.failedNumbers || []).slice(0, 80).join(', ') || '—'}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleImport}
            disabled={!props.canImport}
            className="btn-premium btn-premium-primary flex-1"
          >
            Import to SQLite
          </button>
        </div>

        {props.importSummary && (
          <div className="rounded bg-bg-base/60 border border-border-subtle p-2 text-xs">
            <div className="flex items-center justify-between">
              <div className="text-text-muted">Import Summary</div>
              <button
                onClick={handleExportReport}
                className="btn-premium btn-premium-ghost text-[10px] px-2 py-1"
              >
                Export Report
              </button>
            </div>
            <div className="mt-2 font-mono">
              Imported: {props.importSummary.imported}
              <br />
              Skipped: {props.importSummary.skipped}
              <br />
              Overwritten: {props.importSummary.overwritten}
              <br />
              Failed: {props.importSummary.failed}
              <br />
              Duplicates: {props.importSummary.duplicates}
              <br />
              Duration: {Math.round(props.importSummary.durationMs / 1000)}s
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
