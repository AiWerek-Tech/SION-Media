import React, { useMemo } from 'react'
import { X } from 'lucide-react'
import type { Song } from '../../types'

function formatLyrics(raw: string): string {
  return raw
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export function LibraryLyricsPane({
  song,
  onClose
}: {
  song: Song
  onClose: () => void
}): React.JSX.Element {
  const lyrics = useMemo(() => formatLyrics(song.lyrics_raw || ''), [song.lyrics_raw])

  return (
    <div className="h-full flex flex-col border-l border-border-default/40 surface-1">
      <div className="h-[54px] min-h-[54px] flex items-center justify-between px-4 border-b border-border-default/30 surface-2">
        <div className="min-w-0">
          <div className="text-[11px] text-text-muted font-medium">Lirik</div>
          <div className="text-[13px] font-semibold text-text-primary truncate">
            {song.number ? `${song.number} · ` : ''}
            {song.title}
          </div>
        </div>
        <button
          onClick={onClose}
          className="h-9 w-9 rounded-xl bg-surface-0/60 border border-border-default/30 text-text-muted hover:text-text-primary hover:bg-surface-2/60 transition-all flex items-center justify-center"
          aria-label="Tutup lirik"
          title="Tutup"
        >
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin px-4 py-4">
        {lyrics ? (
          <pre className="whitespace-pre-wrap font-sans text-[13px] leading-6 text-text-primary m-0">
            {lyrics}
          </pre>
        ) : (
          <div className="text-[12px] text-text-muted">Lirik kosong.</div>
        )}
      </div>
    </div>
  )
}
