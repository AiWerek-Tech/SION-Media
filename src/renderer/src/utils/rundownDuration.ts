import type { PlaylistItem } from '@renderer/types'
import { generateSlidesForPlaylistItem } from '@renderer/engine/slideEngine'
import { parseMediaPlaylistDescriptor } from '../../../shared/media-playlist'
import { classifyLocalMediaPath, resolveMediaKind } from '../../../shared/media-kind'

export interface RundownItemTiming {
  item: PlaylistItem
  index: number
  title: string
  slideCount: number
  estimatedSeconds: number
}

export interface RundownTimingSummary {
  rundownItemCount: number
  rundownTotalSeconds: number
  rundownElapsedSeconds: number
  rundownRemainingSeconds: number
  rundownProgressPercent: number
  currentRundownItemIndex: number
  currentRundownItemTitle: string
  currentRundownItemEstimatedSeconds: number
  currentRundownItemRemainingSeconds: number
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

export function getRundownItemTitle(item: PlaylistItem): string {
  if (item.item_type === 'song') {
    const number = item.number?.trim()
    const title = item.title?.trim() || 'Lagu'
    return number ? `${number} · ${title}` : title
  }
  if (item.item_type === 'bible') return item.bible_reference || item.title || 'Pembacaan Alkitab'
  if (item.item_type === 'info') return item.title || 'Info'
  if (item.item_type === 'media') return item.title || 'Media'
  return item.title || 'Item Rundown'
}

export function estimateRundownItemSeconds(item: PlaylistItem, slideCount: number): number {
  const safeSlideCount = Math.max(1, slideCount)
  if (item.item_type === 'song') return clamp(safeSlideCount * 42, 180, 420)
  if (item.item_type === 'bible') return clamp(50 + safeSlideCount * 20, 60, 240)
  if (item.item_type === 'info') return clamp(35 + safeSlideCount * 15, 45, 180)
  if (item.item_type === 'media') {
    const descriptor = parseMediaPlaylistDescriptor(item.notes)
    const mediaKind = resolveMediaKind({
      path: descriptor.path,
      hasPresentationPackage: Boolean(descriptor.presentation?.slides.length)
    })
    if (mediaKind === 'video' || classifyLocalMediaPath(descriptor.path) === 'video') {
      return clamp(safeSlideCount * 60, 180, 600)
    }
    if (mediaKind === 'pdf' || mediaKind === 'presentation') {
      return clamp(safeSlideCount * 25, 60, 900)
    }
    return 60
  }
  return clamp(safeSlideCount * 35, 60, 300)
}

export function getRundownItemTiming(items: PlaylistItem[]): RundownItemTiming[] {
  return items.map((item, index) => {
    const slideCount = Math.max(1, generateSlidesForPlaylistItem(item).length)
    return {
      item,
      index,
      title: getRundownItemTitle(item),
      slideCount,
      estimatedSeconds: estimateRundownItemSeconds(item, slideCount)
    }
  })
}

export function buildRundownTimingSummary(input: {
  items: PlaylistItem[]
  currentPlaylistItemId?: number | null
  currentSlideIndex?: number
  timerElapsedSeconds?: number
}): RundownTimingSummary {
  const timings = getRundownItemTiming(input.items)
  const totalSeconds = timings.reduce((sum, item) => sum + item.estimatedSeconds, 0)
  const currentIndex = Math.max(
    -1,
    timings.findIndex((timing) => timing.item.id === input.currentPlaylistItemId)
  )
  const currentTiming = currentIndex >= 0 ? timings[currentIndex] : null
  const elapsedBeforeCurrent =
    currentIndex > 0
      ? timings.slice(0, currentIndex).reduce((sum, item) => sum + item.estimatedSeconds, 0)
      : 0
  const slideProgress =
    currentTiming && input.currentSlideIndex !== undefined
      ? clamp((input.currentSlideIndex + 1) / currentTiming.slideCount, 0, 1)
      : 0
  const scheduledElapsed = currentTiming
    ? elapsedBeforeCurrent + currentTiming.estimatedSeconds * slideProgress
    : 0
  const timerElapsed = Math.max(0, Math.floor(input.timerElapsedSeconds || 0))
  const elapsedSeconds = totalSeconds > 0 ? clamp(timerElapsed || scheduledElapsed, 0, totalSeconds) : 0
  const currentElapsed = currentTiming ? clamp(elapsedSeconds - elapsedBeforeCurrent, 0, currentTiming.estimatedSeconds) : 0

  return {
    rundownItemCount: timings.length,
    rundownTotalSeconds: Math.round(totalSeconds),
    rundownElapsedSeconds: Math.round(elapsedSeconds),
    rundownRemainingSeconds: Math.max(0, Math.round(totalSeconds - elapsedSeconds)),
    rundownProgressPercent:
      totalSeconds > 0 ? Math.round((elapsedSeconds / totalSeconds) * 1000) / 10 : 0,
    currentRundownItemIndex: currentIndex,
    currentRundownItemTitle: currentTiming?.title || '',
    currentRundownItemEstimatedSeconds: currentTiming?.estimatedSeconds || 0,
    currentRundownItemRemainingSeconds: currentTiming
      ? Math.max(0, Math.round(currentTiming.estimatedSeconds - currentElapsed))
      : 0
  }
}

export function formatRundownDuration(seconds: number): string {
  const safeSeconds = Math.max(0, Math.round(seconds))
  const hours = Math.floor(safeSeconds / 3600)
  const minutes = Math.floor((safeSeconds % 3600) / 60)
  const remainingSeconds = safeSeconds % 60
  const pad = (value: number): string => String(value).padStart(2, '0')
  if (hours > 0) return `${hours}:${pad(minutes)}:${pad(remainingSeconds)}`
  return `${pad(minutes)}:${pad(remainingSeconds)}`
}
