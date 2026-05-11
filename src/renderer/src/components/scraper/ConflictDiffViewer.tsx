import React, { useMemo } from 'react'

interface Props {
  existingTitle: string
  existingLyrics: string
  incomingTitle: string
  incomingLyrics: string
  onClose: () => void
}

function DiffLine(props: {
  existing: string
  incoming: string
  lineNum: number
}): React.JSX.Element {
  const isDifferent = props.existing !== props.incoming

  return (
    <div className={`flex gap-4 font-mono text-[11px] ${isDifferent ? 'bg-yellow-900/20' : ''}`}>
      <div className="w-8 text-right text-text-muted shrink-0">{props.lineNum}</div>
      <div className="flex-1 whitespace-pre-wrap break-words px-1">
        {props.existing || <span className="text-text-muted">—</span>}
      </div>
      <div className="w-px bg-border-subtle" />
      <div className="flex-1 whitespace-pre-wrap break-words px-1">
        {props.incoming || <span className="text-text-muted">—</span>}
      </div>
    </div>
  )
}

export function ConflictDiffViewer(props: Props): React.JSX.Element {
  const existingLines = useMemo(() => props.existingLyrics.split('\n'), [props.existingLyrics])
  const incomingLines = useMemo(() => props.incomingLyrics.split('\n'), [props.incomingLyrics])

  const maxLines = Math.max(existingLines.length, incomingLines.length)

  const stats = useMemo(() => {
    let identical = 0
    let different = 0
    const minLen = Math.min(existingLines.length, incomingLines.length)

    for (let i = 0; i < minLen; i++) {
      if (existingLines[i] === incomingLines[i]) identical++
      else different++
    }

    different += Math.abs(existingLines.length - incomingLines.length)

    return { identical, different, total: maxLines }
  }, [existingLines, incomingLines, maxLines])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="w-[90vw] max-w-5xl max-h-[85vh] rounded-lg border border-border-subtle bg-bg-elevated flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle">
          <div className="text-sm font-semibold">Lyrics Comparison</div>
          <button onClick={props.onClose} className="btn-premium btn-premium-ghost text-xs">
            Close
          </button>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 px-4 py-2 text-xs border-b border-border-subtle bg-black/20">
          <span className="text-text-muted">Lines: {stats.total}</span>
          <span className="text-green-300">Identical: {stats.identical}</span>
          <span className="text-yellow-300">Different: {stats.different}</span>
          <span className="text-text-muted ml-auto">
            Similarity: {Math.round((stats.identical / Math.max(1, stats.total)) * 100)}%
          </span>
        </div>

        {/* Column Headers */}
        <div className="flex gap-4 px-4 py-2 text-xs font-semibold border-b border-border-subtle bg-black/10">
          <div className="w-8 shrink-0" />
          <div className="flex-1 text-orange-300">EXISTING: {props.existingTitle}</div>
          <div className="w-px bg-border-subtle" />
          <div className="flex-1 text-blue-300">INCOMING: {props.incomingTitle}</div>
        </div>

        {/* Diff Content */}
        <div className="flex-1 overflow-auto">
          {Array.from({ length: maxLines }).map((_, i) => (
            <DiffLine
              key={i}
              lineNum={i + 1}
              existing={existingLines[i] ?? ''}
              incoming={incomingLines[i] ?? ''}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
