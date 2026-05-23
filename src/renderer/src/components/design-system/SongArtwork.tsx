/**
 * SongArtwork — Foundation §2.2.4
 *
 * Reusable visual identifier for songs across all views.
 * Gradient background (blue→violet) with flare overlay, hymnal code, and song number.
 *
 * Variants: sm (32px), md (48px), lg (80px), xl (146px)
 */
import React from 'react'

type SongArtworkSize = 'sm' | 'md' | 'lg' | 'xl'

interface SongArtworkProps {
  /** Song number to display */
  number: string | number | null | undefined
  /** Hymnal code (e.g. "LS", "PKJ") */
  hymnalCode?: string
  /** Size variant */
  size?: SongArtworkSize
  /** Additional CSS class */
  className?: string
}

const SIZE_MAP: Record<SongArtworkSize, { className: string }> = {
  sm: { className: '' },
  md: { className: 'song-artwork--md' },
  lg: { className: 'song-artwork--lg' },
  xl: { className: 'song-artwork--xl' }
}

function normalizeNumber(input: string | number | null | undefined): string {
  const raw = String(input ?? '').trim()
  if (raw === '') return '—'
  const trimmed = raw.replace(/^0+/, '')
  return trimmed === '' ? '0' : trimmed
}

export function SongArtwork({
  number,
  hymnalCode = 'LS',
  size = 'md',
  className = ''
}: SongArtworkProps): React.JSX.Element {
  const sizeConfig = SIZE_MAP[size]

  return (
    <div className={`song-artwork ${sizeConfig.className} ${className}`.trim()} aria-hidden="true">
      <div className="song-artwork__flare" />
      <span className="song-artwork__hymnal">{hymnalCode}</span>
      <strong className="song-artwork__number">{normalizeNumber(number)}</strong>
    </div>
  )
}
