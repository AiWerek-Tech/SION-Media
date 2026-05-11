import React, { useMemo, useCallback, useState } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { ConflictDiffViewer } from './ConflictDiffViewer'

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

type ResolutionAction = 'pending' | 'skip' | 'overwrite' | 'rename' | 'merge_metadata'

interface ConflictDecision {
  key: string
  action: ResolutionAction
  renameTitle?: string
}

function sevColor(sev: ConflictSeverity): string {
  if (sev === 'CRITICAL') return 'text-red-300'
  if (sev === 'HIGH') return 'text-orange-300'
  if (sev === 'MEDIUM') return 'text-yellow-300'
  return 'text-green-300'
}

function sevBg(sev: ConflictSeverity): string {
  if (sev === 'CRITICAL') return 'bg-red-900/40'
  if (sev === 'HIGH') return 'bg-orange-900/40'
  if (sev === 'MEDIUM') return 'bg-yellow-900/40'
  return 'bg-green-900/40'
}

function typeLabel(t: ScraperConflictItem['type']): string {
  if (t === 'NUMBER_DUPLICATE') return 'NUMBER'
  if (t === 'TITLE_SIMILAR') return 'TITLE'
  return 'LYRICS'
}

function scoreLabelText(label?: ScraperConflictItem['confidenceLabel']): string {
  if (label === 'VERY_HIGH_MATCH') return 'VERY HIGH'
  if (label === 'HIGH_MATCH') return 'HIGH'
  if (label === 'POSSIBLE_MATCH') return 'POSSIBLE'
  if (label === 'LOW_MATCH') return 'LOW'
  return '—'
}

function scoreColor(label?: ScraperConflictItem['confidenceLabel']): string {
  if (label === 'VERY_HIGH_MATCH') return 'bg-emerald-600/70 text-emerald-50'
  if (label === 'HIGH_MATCH') return 'bg-green-600/60 text-green-50'
  if (label === 'POSSIBLE_MATCH') return 'bg-yellow-700/60 text-yellow-50'
  if (label === 'LOW_MATCH') return 'bg-red-700/60 text-red-50'
  return 'bg-bg-base text-text-muted'
}

export function ConflictDecisionTable(props: {
  conflicts: ScraperConflictItem[]
  decisions: Record<string, ConflictDecision>
  onDecisionsChange: (decisions: Record<string, ConflictDecision>) => void
  defaultAction: ResolutionAction
  onCriticalConfirm?: (key: string, action: 'overwrite') => void
  sortMode?:
    | 'SEVERITY_THEN_CONFIDENCE_ASC'
    | 'SEVERITY_ONLY'
    | 'LOWEST_CONFIDENCE_FIRST'
    | 'HIGHEST_CONFIDENCE_FIRST'
}): React.JSX.Element {
  const [expandedKey, setExpandedKey] = useState<string | null>(null)
  const [diffViewerConflict, setDiffViewerConflict] = useState<ScraperConflictItem | null>(null)
  const [criticalConfirmKey, setCriticalConfirmKey] = useState<string | null>(null)
  const [criticalConfirmInput, setCriticalConfirmInput] = useState('')

  const sortedConflicts = useMemo(() => {
    const order: Record<ConflictSeverity, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 }
    const mode = props.sortMode ?? 'SEVERITY_THEN_CONFIDENCE_ASC'

    const scoreOf = (c: ScraperConflictItem): number => {
      if (typeof c.confidenceScore === 'number') return c.confidenceScore
      return -1
    }

    return [...props.conflicts].sort((a, b) => {
      if (mode === 'SEVERITY_ONLY') {
        return order[a.severity] - order[b.severity]
      }

      if (mode === 'LOWEST_CONFIDENCE_FIRST') {
        const sa = scoreOf(a)
        const sb = scoreOf(b)
        if (sa !== sb) return sa - sb
        return order[a.severity] - order[b.severity]
      }

      if (mode === 'HIGHEST_CONFIDENCE_FIRST') {
        const sa = scoreOf(a)
        const sb = scoreOf(b)
        if (sa !== sb) return sb - sa
        return order[a.severity] - order[b.severity]
      }

      // Default: Severity first, then lowest confidence first within same severity
      const sev = order[a.severity] - order[b.severity]
      if (sev !== 0) return sev
      const sa = scoreOf(a)
      const sb = scoreOf(b)
      if (sa !== sb) return sa - sb
      return a.key.localeCompare(b.key)
    })
  }, [props.conflicts, props.sortMode])

  const parentRef = React.useRef<HTMLDivElement>(null)

  // eslint-disable-next-line react-hooks/incompatible-library
  const rowVirtualizer = useVirtualizer({
    count: sortedConflicts.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 72,
    overscan: 8
  })

  const handleActionChange = useCallback(
    (key: string, action: ResolutionAction) => {
      const conflict = props.conflicts.find((c) => c.key === key)

      // CRITICAL protection: require confirmation for official hymnal overwrite
      if (
        action === 'overwrite' &&
        conflict?.severity === 'CRITICAL' &&
        conflict?.existing.hymnal_is_official === 1
      ) {
        setCriticalConfirmKey(key)
        setCriticalConfirmInput('')
        return
      }

      const current = props.decisions[key]
      props.onDecisionsChange({
        ...props.decisions,
        [key]: {
          key,
          action,
          renameTitle: current?.renameTitle
        }
      })
    },
    [props]
  )

  const handleCriticalConfirm = useCallback(() => {
    if (criticalConfirmInput === 'OVERWRITE OFFICIAL' && criticalConfirmKey) {
      const current = props.decisions[criticalConfirmKey]
      props.onDecisionsChange({
        ...props.decisions,
        [criticalConfirmKey]: {
          key: criticalConfirmKey,
          action: 'overwrite',
          renameTitle: current?.renameTitle
        }
      })
      setCriticalConfirmKey(null)
      setCriticalConfirmInput('')
      props.onCriticalConfirm?.(criticalConfirmKey, 'overwrite')
    }
  }, [criticalConfirmInput, criticalConfirmKey, props])

  const handleCriticalCancel = useCallback(() => {
    setCriticalConfirmKey(null)
    setCriticalConfirmInput('')
  }, [])

  const handleRenameTitleChange = useCallback(
    (key: string, title: string) => {
      const current = props.decisions[key]
      props.onDecisionsChange({
        ...props.decisions,
        [key]: {
          key,
          action: current?.action ?? 'rename',
          renameTitle: title
        }
      })
    },
    [props]
  )

  const toggleExpand = useCallback((key: string) => {
    setExpandedKey((prev) => (prev === key ? null : key))
  }, [])

  const stats = useMemo(() => {
    let pending = 0
    let skip = 0
    let overwrite = 0
    let rename = 0
    let merge = 0

    for (const c of props.conflicts) {
      const d = props.decisions[c.key]
      const action = d?.action ?? props.defaultAction
      if (action === 'pending') pending++
      else if (action === 'skip') skip++
      else if (action === 'overwrite') overwrite++
      else if (action === 'rename') rename++
      else if (action === 'merge_metadata') merge++
    }

    return { pending, skip, overwrite, rename, merge, total: props.conflicts.length }
  }, [props.conflicts, props.decisions, props.defaultAction])

  if (props.conflicts.length === 0) {
    return (
      <div className="rounded bg-bg-base/60 border border-border-subtle p-3 text-xs text-text-muted">
        Tidak ada konflik terdeteksi.
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs">
        <div className="text-text-muted">Conflicts: {stats.total}</div>
        <div className="flex items-center gap-3 font-mono">
          {stats.pending > 0 && <span className="text-text-muted">Pending: {stats.pending}</span>}
          {stats.skip > 0 && <span className="text-text-muted">Skip: {stats.skip}</span>}
          {stats.overwrite > 0 && (
            <span className="text-orange-300">Overwrite: {stats.overwrite}</span>
          )}
          {stats.rename > 0 && <span className="text-blue-300">Rename: {stats.rename}</span>}
          {stats.merge > 0 && <span className="text-green-300">Merge: {stats.merge}</span>}
        </div>
      </div>

      <div
        ref={parentRef}
        className="h-64 overflow-auto rounded border border-border-subtle bg-black/20"
      >
        <div
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative'
          }}
        >
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const c = sortedConflicts[virtualRow.index]
            const decision = props.decisions[c.key]
            const action = decision?.action ?? props.defaultAction
            const isExpanded = expandedKey === c.key
            const isCritical = c.severity === 'CRITICAL'

            return (
              <div
                key={c.key}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`
                }}
                className={`px-2 py-1 border-b border-border-subtle/50 ${sevBg(c.severity)}`}
              >
                <div className="flex items-center gap-2 h-full">
                  <div className={`w-16 text-[10px] font-mono ${sevColor(c.severity)}`}>
                    {c.severity}
                  </div>

                  <div className="w-14 text-[10px] font-mono text-text-muted">
                    {typeLabel(c.type)}
                  </div>

                  <div
                    className={`w-20 text-[10px] font-mono px-2 py-0.5 rounded ${scoreColor(
                      c.confidenceLabel
                    )}`}
                    title={
                      typeof c.confidenceScore === 'number'
                        ? `Confidence: ${Math.round(c.confidenceScore * 100)}%`
                        : 'Confidence: —'
                    }
                  >
                    {typeof c.confidenceScore === 'number'
                      ? `${Math.round(c.confidenceScore * 100)}%`
                      : '—'}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="text-xs truncate">
                      <span className="text-text-muted">#{c.scraped.sourceSongNumber}</span>{' '}
                      {c.scraped.title}
                    </div>
                    {isExpanded && (
                      <div className="mt-1 text-[10px] text-text-muted space-y-1">
                        <div>
                          <span className="text-text-muted">Scraped:</span> {c.scraped.title}
                        </div>
                        <div>
                          <span className="text-text-muted">Existing:</span> {c.existing.title}
                        </div>
                        <div>{c.reason}</div>
                        {c.lyricsHashMatch && (
                          <div className="text-yellow-300">Lyrics identical</div>
                        )}
                        {c.titleSimilarity > 0 && (
                          <div className="text-text-muted">
                            Title similarity: {Math.round(c.titleSimilarity * 100)}%
                          </div>
                        )}
                        {typeof c.confidenceScore === 'number' && (
                          <div className="text-text-muted">
                            Confidence: {Math.round(c.confidenceScore * 100)}% (
                            {scoreLabelText(c.confidenceLabel)})
                          </div>
                        )}
                        {c.confidenceWhy && (
                          <div className="mt-1 rounded border border-border-subtle bg-black/20 p-2">
                            <div className="text-[10px] font-semibold text-text-base">
                              Why this score?
                            </div>
                            <div className="mt-1 space-y-0.5">
                              <div>Title: {Math.round(c.confidenceWhy.title * 100)}%</div>
                              <div>Lyrics: {Math.round(c.confidenceWhy.lyrics * 100)}%</div>
                              <div>Metadata: {Math.round(c.confidenceWhy.metadata * 100)}%</div>
                              <div>Structure: {Math.round(c.confidenceWhy.structure * 100)}%</div>
                              <div className="text-text-muted">
                                Overall: {Math.round(c.confidenceWhy.weightedTotal * 100)}%
                              </div>
                              {c.confidenceWhy.notes.length > 0 && (
                                <div className="mt-1 text-text-muted">
                                  {c.confidenceWhy.notes.map((n, idx) => (
                                    <div key={idx}>• {n}</div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => toggleExpand(c.key)}
                    className="px-1 py-0.5 text-[10px] text-text-muted hover:text-text-base"
                  >
                    {isExpanded ? '▲' : '▼'}
                  </button>

                  <button
                    onClick={() => setDiffViewerConflict(c)}
                    className="btn-premium btn-premium-ghost text-[10px] px-2 py-0.5"
                    title="Compare lyrics"
                  >
                    Diff
                  </button>

                  <select
                    value={action}
                    onChange={(e) => handleActionChange(c.key, e.target.value as ResolutionAction)}
                    className={`input-premium text-[10px] px-2 py-1 ${
                      isCritical && action === 'overwrite' ? 'text-red-300 border-red-500/50' : ''
                    }`}
                  >
                    <option value="pending">—</option>
                    <option value="skip">Skip</option>
                    <option
                      value="overwrite"
                      disabled={isCritical && c.existing.hymnal_is_official === 1}
                    >
                      {isCritical && c.existing.hymnal_is_official === 1
                        ? 'Overwrite ⚠️'
                        : 'Overwrite'}
                    </option>
                    <option value="rename">Rename</option>
                    <option value="merge_metadata">Merge</option>
                  </select>

                  {action === 'rename' && (
                    <input
                      type="text"
                      value={decision?.renameTitle ?? c.scraped.title}
                      onChange={(e) => handleRenameTitleChange(c.key, e.target.value)}
                      placeholder="New title"
                      className="input-premium w-32 text-[10px] px-2 py-1"
                    />
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {stats.pending > 0 && (
        <div className="text-[10px] text-yellow-300">
          ⚠️ {stats.pending} conflict(s) belum diputuskan. Gunakan default action saat import.
        </div>
      )}

      {/* CRITICAL Confirmation Modal */}
      {criticalConfirmKey && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="w-96 rounded-lg border border-red-500/50 bg-bg-elevated p-4">
            <div className="text-red-300 text-sm font-semibold mb-2">
              ⚠️ CRITICAL: Overwrite Official Hymnal
            </div>
            <div className="text-xs text-text-muted mb-3">
              You are about to overwrite a song from an <strong>official hymnal</strong>. This
              action affects canonical worship data.
            </div>
            <div className="text-xs text-text-muted mb-3">
              Type{' '}
              <code className="px-1 py-0.5 rounded bg-red-900/40 text-red-200">
                OVERWRITE OFFICIAL
              </code>{' '}
              to confirm:
            </div>
            <input
              type="text"
              value={criticalConfirmInput}
              onChange={(e) => setCriticalConfirmInput(e.target.value)}
              placeholder="OVERWRITE OFFICIAL"
              className="input-premium w-full mb-3"
            />
            <div className="flex gap-2">
              <button
                onClick={handleCriticalCancel}
                className="btn-premium btn-premium-ghost flex-1"
              >
                Cancel
              </button>
              <button
                onClick={handleCriticalConfirm}
                disabled={criticalConfirmInput !== 'OVERWRITE OFFICIAL'}
                className="btn-premium btn-premium-danger flex-1"
              >
                Confirm Overwrite
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Diff Viewer Modal */}
      {diffViewerConflict && (
        <ConflictDiffViewer
          existingTitle={diffViewerConflict.existing.title}
          existingLyrics={diffViewerConflict.existing.lyrics_raw}
          incomingTitle={diffViewerConflict.scraped.title}
          incomingLyrics={diffViewerConflict.scraped.lyrics_raw}
          onClose={() => setDiffViewerConflict(null)}
        />
      )}
    </div>
  )
}
