import React from 'react'

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

export function PreviewInspector(props: {
  providerId: string
  baseUrl: string
  previewBusy: boolean
  previewInput: string
  onPreviewInputChange: (v: string) => void
  onPreview: () => void
  song: ScrapedSongPreview | null
}): React.JSX.Element {
  return (
    <div className="h-full min-h-0 card-modern flex flex-col">
      <div className="card-modern__header">
        <div>
          <div className="card-modern__title">Preview Inspector</div>
          <div className="card-modern__subtitle">Fetch single song without importing</div>
        </div>
      </div>

      <div className="px-5 pb-4">
        <div className="flex items-center gap-2">
          <input
            value={props.previewInput}
            onChange={(e) => props.onPreviewInputChange(e.target.value)}
            placeholder="Number or slug"
            className="input-premium flex-1"
          />
          <button
            onClick={props.onPreview}
            disabled={props.previewBusy || !props.providerId}
            className="btn-premium btn-premium-ghost"
          >
            {props.previewBusy ? 'Loading…' : 'Preview'}
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-auto border-t border-white/5 px-5 pb-5">
        {!props.song ? (
          <div className="empty-state py-10">
            <div className="empty-state__title">No preview loaded</div>
            <div className="empty-state__description">Enter a number/slug then press Preview</div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="rounded bg-bg-base/60 border border-border-subtle p-2">
              <div className="text-sm font-semibold">{props.song.title}</div>
              <div className="text-xs text-text-muted break-words">{props.song.sourceUrl}</div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded bg-bg-base/60 border border-border-subtle p-2">
                <div className="text-text-muted">Song Number</div>
                <div className="font-mono">{props.song.sourceSongNumber}</div>
              </div>
              <div className="rounded bg-bg-base/60 border border-border-subtle p-2">
                <div className="text-text-muted">Hymnal</div>
                <div className="font-mono">{props.song.sourceHymnalCode}</div>
              </div>
              <div className="rounded bg-bg-base/60 border border-border-subtle p-2">
                <div className="text-text-muted">Key</div>
                <div className="font-mono">{props.song.key_note || '—'}</div>
              </div>
              <div className="rounded bg-bg-base/60 border border-border-subtle p-2">
                <div className="text-text-muted">Meter</div>
                <div className="font-mono">{props.song.time_signature || '—'}</div>
              </div>
            </div>

            <div className="rounded bg-bg-base/60 border border-border-subtle p-2">
              <div className="text-xs text-text-muted mb-2">Lyrics Preview</div>
              <pre className="whitespace-pre-wrap font-mono text-xs leading-5">
                {props.song.lyrics_raw}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
