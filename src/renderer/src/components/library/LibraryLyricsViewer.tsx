import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowLeft,
  Copy,
  Expand,
  Minus,
  Music2,
  Pause,
  Play,
  Shrink,
  SkipBack,
  SkipForward,
  Sparkles,
  Search,
  Check,
  Music,
  Plus,
  Grid3X3,
  Clock,
  Save,
  RotateCcw,
  Volume2,
  VolumeX,
  Square,
  X,
  HelpCircle
} from 'lucide-react'
import { TitleBar } from '@renderer/components/titlebar/TitleBar'
import { LibrarySearchPalette } from './LibrarySearchPalette'
import type { Song } from '@renderer/types'
import { useAppStore } from '@renderer/store/useAppStore'
import { useInstrumentStore } from '@renderer/store/useInstrumentStore'
import { stripLrcTimestamps, hasLrcTimestamps } from '@renderer/utils/lrcParser'
import { logger } from '@renderer/utils/logger'
import { DEFAULT_GLOBAL_ATMOSPHERE } from '../../atmosphere/presets'
import type { AtmosphereConfig, MediaAssetRecord } from '../../atmosphere/types'

type LyricsBlock = {
  label: string
  lines: string[]
}

type LyricsPage = {
  label: string
  verseText: string
  chorusText?: string
  order: number
  hasChorus: boolean
}

function normalizeDisplayNumber(input: string | null | undefined): string {
  const raw = String(input ?? '').trim()
  if (raw === '') return '0'
  const trimmed = raw.replace(/^0+/, '')
  return trimmed === '' ? '0' : trimmed
}

function toFileUrl(path?: string): string {
  if (!path) return ''
  if (path.startsWith('http')) return path
  return `file://${path.replace(/\\/g, '/')}`
}

function parseAtmosphereConfig(raw?: string): AtmosphereConfig | null {
  if (!raw) return null
  try {
    return JSON.parse(raw) as AtmosphereConfig
  } catch {
    return null
  }
}

function buildCurrentGlobalAtmosphere(settings: Record<string, string>): AtmosphereConfig {
  return (
    parseAtmosphereConfig(settings.projection_default_atmosphere) || {
      ...DEFAULT_GLOBAL_ATMOSPHERE,
      solidColor: settings.projection_bg_color || DEFAULT_GLOBAL_ATMOSPHERE.solidColor,
      media: settings.projection_bg_image
        ? {
            path: settings.projection_bg_image,
            fit: 'cover',
            loop: true,
            muted: true
          }
        : undefined
    }
  )
}

function parseLyricsBlocks(lyricsRaw: string): LyricsBlock[] {
  const blocks: LyricsBlock[] = []
  let currentLabel = ''
  let currentLines: string[] = []

  const lines = (lyricsRaw || '').replace(/\r\n/g, '\n').split('\n')
  for (const line of lines) {
    const trimmed = line.trim()
    const sectionMatch = trimmed.match(/^\[(.+)\]$/)

    if (sectionMatch) {
      if (currentLines.length > 0) blocks.push({ label: currentLabel, lines: currentLines })
      currentLabel = sectionMatch[1]
      currentLines = []
      continue
    }

    if (trimmed === '---') {
      if (currentLines.length > 0) blocks.push({ label: currentLabel, lines: currentLines })
      currentLines = []
      continue
    }

    currentLines.push(trimmed)
  }

  if (currentLines.length > 0) blocks.push({ label: currentLabel, lines: currentLines })

  return blocks
    .map((block) => {
      const normalized: string[] = []
      for (const line of block.lines) {
        const next = line.trim()
        if (next === '' && normalized[normalized.length - 1] === '') continue
        normalized.push(next)
      }
      while (normalized[0] === '') normalized.shift()
      while (normalized[normalized.length - 1] === '') normalized.pop()
      return { ...block, lines: normalized }
    })
    .filter((block) => block.lines.length > 0)
}

function splitIntoStanzas(lines: string[]): string[] {
  const stanzas: string[] = []
  let current: string[] = []

  for (const line of lines) {
    if (line.trim() === '') {
      if (current.length > 0) {
        stanzas.push(current.join('\n'))
        current = []
      }
      continue
    }
    current.push(line)
  }

  if (current.length > 0) stanzas.push(current.join('\n'))
  return stanzas.filter((item) => item.trim().length > 0)
}

function normalizeSectionLabel(label: string, fallbackOrder: number): string {
  const raw = label.trim()
  if (!raw) return fallbackOrder <= 1 ? 'VERSE' : `VERSE ${fallbackOrder}`

  const lower = raw.toLowerCase()
  if (lower.includes('reff') || lower.includes('chorus') || lower.includes('ref')) return 'CHORUS'
  if (lower.includes('bridge')) return 'BRIDGE'
  if (lower.includes('intro')) return 'INTRO'
  if (lower.includes('outro')) return 'OUTRO'
  if (lower.includes('verse') || lower.includes('bait')) return raw.toUpperCase()
  return raw.toUpperCase()
}

function isChorusLabel(label: string): boolean {
  const lower = label.trim().toLowerCase()
  return lower.includes('reff') || lower.includes('chorus') || lower.includes('ref')
}

function buildLyricsPages(lyricsRaw: string): LyricsPage[] {
  const blocks = parseLyricsBlocks(lyricsRaw)
  if (blocks.length === 0) return []

  const chorusBlocks = blocks.filter((block) => isChorusLabel(block.label))
  const nonChorusBlocks = blocks.filter((block) => !isChorusLabel(block.label))
  const chorusText = chorusBlocks
    .flatMap((block) => splitIntoStanzas(block.lines))
    .filter((item) => item.trim().length > 0)
    .join('\n\n')

  const pages: LyricsPage[] = []
  let order = 0
  const sourceBlocks = nonChorusBlocks.length > 0 ? nonChorusBlocks : blocks

  for (const block of sourceBlocks) {
    const stanzas = splitIntoStanzas(block.lines)
    const sections = stanzas.length > 0 ? stanzas : [block.lines.join('\n')]

    sections.forEach((text, sectionIndex) => {
      order += 1
      pages.push({
        label: normalizeSectionLabel(block.label, sectionIndex + 1),
        verseText: text,
        chorusText: chorusText || undefined,
        order,
        hasChorus: Boolean(chorusText && !isChorusLabel(block.label))
      })
    })
  }

  return pages
}

function buildGradientBackground(config: AtmosphereConfig): string {
  if (config.mode === 'solid') {
    return config.solidColor || '#020617'
  }

  const gradient = config.gradient
  if (!gradient?.stops?.length) {
    return 'linear-gradient(135deg, #020617 0%, #0f172a 45%, #1d4ed8 100%)'
  }

  const stopList = gradient.stops
    .map((stop) => `${stop.color} ${Math.max(0, Math.min(100, stop.position))}%`)
    .join(', ')

  if (gradient.kind === 'radial') {
    return `radial-gradient(circle at 50% 32%, ${stopList})`
  }

  return `linear-gradient(${gradient.angle ?? 135}deg, ${stopList})`
}

export function LibraryLyricsViewer({
  song,
  onClose,
  onNextSong,
  onPrevSong
}: {
  song: Song
  onClose: () => void
  onNextSong?: () => void
  onPrevSong?: () => void
}): React.JSX.Element {
  const pages = useMemo(() => buildLyricsPages(song.lyrics_raw || ''), [song.lyrics_raw])
  const [index, setIndex] = useState(0)
  const [fontSize, setFontSize] = useState(() => {
    const saved = localStorage.getItem('sion:lyric-font-size')
    if (saved) {
      const parsed = parseInt(saved, 10)
      return isNaN(parsed) ? 38 : parsed
    }
    return 38
  })
  const [autoScroll, setAutoScroll] = useState(false)
  const [settings, setSettings] = useState<Record<string, string>>({})
  const [mediaAssets, setMediaAssets] = useState<MediaAssetRecord[]>([])
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_isMaximizedLocal, setIsMaximizedLocal] = useState(false) // value unused; setter used in effect
  const [isUiVisible, setIsUiVisible] = useState(false)
  const [isWindowControlsVisible, setIsWindowControlsVisible] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [showChords, setShowChords] = useState(false)
  const [copyFeedback, setCopyFeedback] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const requestRef = useRef<number | undefined>(undefined)
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Local backing track audio player
  const { instrumentsMap } = useInstrumentStore()

  const instrumentPath = useMemo(() => {
    const code = (song.hymnal_code || '').toUpperCase()
    const num = song.number
    const primaryKey = `${code}-${num}`
    if (instrumentsMap[primaryKey]) {
      return instrumentsMap[primaryKey]
    }
    if (code === 'LS') return instrumentsMap[`LSEL-${num}`] || ''
    if (code === 'LSEL') return instrumentsMap[`LS-${num}`] || ''
    return ''
  }, [song, instrumentsMap])

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(70)
  const [muted, setMuted] = useState(false)

  const normalizedUrl = instrumentPath ? `local-media:///${instrumentPath.replace(/\\/g, '/')}` : ''

  // LRC Sync Mode states
  const [isSyncMode, setIsSyncMode] = useState(false)
  const [syncLines, setSyncLines] = useState<{ text: string; time?: number }[]>([])
  const [activeSyncIndex, setActiveSyncIndex] = useState(0)

  // Sync volume & mute to native audio
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume / 100
      audioRef.current.muted = muted
    }
  }, [volume, muted, instrumentPath])

  // Stop playback when unmounting or path changes
  useEffect(() => {
    const audio = audioRef.current
    return () => {
      if (audio) {
        audio.pause()
      }
      setIsPlaying(false)
    }
  }, [instrumentPath])

  const handlePlayPause = async (): Promise<void> => {
    const audio = audioRef.current
    if (!audio) return
    if (isPlaying) {
      audio.pause()
      setIsPlaying(false)
    } else {
      try {
        await audio.play()
        setIsPlaying(true)
      } catch (err) {
        console.error('Audio play failed:', err)
      }
    }
  }

  const handleStop = (): void => {
    const audio = audioRef.current
    if (!audio) return
    audio.pause()
    audio.currentTime = 0
    setIsPlaying(false)
  }

  const formatTime = (time: number): string => {
    if (isNaN(time)) return '00:00'
    const mins = Math.floor(time / 60)
    const secs = Math.floor(time % 60)
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }

  // Load sync lines from song.lyrics_raw when isSyncMode becomes active
  useEffect(() => {
    if (isSyncMode && song.lyrics_raw) {
      void Promise.resolve().then(() => {
        const rawLines = song.lyrics_raw.split('\n')
        const parsed = rawLines.map((line) => {
          const match = line.trim().match(/^\[(\d+):(\d+)(?:\.(\d+))?\]/)
          let time: number | undefined = undefined
          let cleanText = line
          if (match) {
            const min = parseInt(match[1], 10)
            const sec = parseInt(match[2], 10)
            const ms = match[3] || '0'
            time = min * 60 + sec + parseFloat('0.' + ms)
            cleanText = line.replace(/^\[\d+:\d+(?:\.\d+)?\]/, '')
          }
          return { text: cleanText, time }
        })
        setSyncLines(parsed)
        const firstUnstamped = parsed.findIndex(
          (line) =>
            line.time === undefined && line.text.trim() !== '' && !line.text.trim().startsWith('[')
        )
        setActiveSyncIndex(firstUnstamped !== -1 ? firstUnstamped : 0)
      })
    }
  }, [isSyncMode, song.lyrics_raw])

  // Tap stamp with Space or Enter in sync mode
  useEffect(() => {
    if (!isSyncMode) return

    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault()
        e.stopPropagation()

        if (activeSyncIndex >= 0 && activeSyncIndex < syncLines.length) {
          const updated = [...syncLines]
          updated[activeSyncIndex].time = currentTime
          setSyncLines(updated)

          // Find next stampable line
          let nextIdx = activeSyncIndex + 1
          while (
            nextIdx < updated.length &&
            (updated[nextIdx].text.trim() === '' ||
              (updated[nextIdx].text.trim().startsWith('[') &&
                updated[nextIdx].text.trim().endsWith(']')))
          ) {
            nextIdx++
          }
          if (nextIdx < updated.length) {
            setActiveSyncIndex(nextIdx)
          }
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isSyncMode, activeSyncIndex, syncLines, currentTime])

  const formatLrcTag = (time: number): string => {
    const mins = Math.floor(time / 60)
    const secs = Math.floor(time % 60)
    const ms = Math.floor((time % 1) * 100)
    return `[${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(ms).padStart(2, '0')}]`
  }

  const handleSaveLrc = async (): Promise<void> => {
    try {
      const updatedLyricsRaw = syncLines
        .map((l) => (l.time !== undefined ? `${formatLrcTag(l.time)}${l.text}` : l.text))
        .join('\n')

      await window.api.songs.update(song.id, { lyrics_raw: updatedLyricsRaw })

      if (instrumentPath && window.api.file?.writeLrc) {
        await window.api.file.writeLrc(instrumentPath, updatedLyricsRaw)
      }

      // Update local state in store instantly
      const updatedSong = { ...song, lyrics_raw: updatedLyricsRaw }
      useAppStore.getState().setSelectedSong(updatedSong)
      await useAppStore.getState().loadSongs()

      setIsSyncMode(false)
      logger.info('LRC timestamps sync saved successfully.')
    } catch (err) {
      console.error('Failed to save LRC timestamps sync:', err)
    }
  }

  const setLyricsFullscreen = useAppStore((state) => state.setLyricsFullscreen)
  const setMaximized = useAppStore((state) => state.setMaximized)

  useEffect(() => {
    localStorage.setItem('sion:lyric-font-size', String(fontSize))
  }, [fontSize])

  const handleCopyLyrics = useCallback(() => {
    if (!song.lyrics_raw) return
    const text = `${song.title.toUpperCase()}
${song.alternate_title || song.title_en || ''}
Buku: ${song.hymnal_name || song.hymnal_code || 'Lagu Sion'}
Key: ${song.key_note || '-'}, Tempo: ${song.tempo || '-'}, Birama: ${song.time_signature || '-'}

${stripLrcTimestamps(song.lyrics_raw)}

Copyright SION Media Enterprise`.trim()

    navigator.clipboard.writeText(text)
    setCopyFeedback(true)
    setTimeout(() => setCopyFeedback(false), 2000)
  }, [song])

  const handleSearchJump = (newSong: Song): void => {
    // We rely on the parent updating selectedSong in store/state
    const { setSelectedSong } = useAppStore.getState()
    setSelectedSong(newSong)
    setIndex(0) // Reset to first slide of new song
    setIsSearchOpen(false)
  }

  const handleZoom = (delta: number): void => {
    setFontSize((prev) => Math.max(14, Math.min(120, prev + delta)))
  }

  const renderLyrics = (text: string, isChorus = false): React.ReactNode => {
    const rawLines = text.split('\n')

    // Parse inline timestamps
    const timestampRegex = /^\[(\d+):(\d+)(?:\.(\d+))?\]/
    const parsedLines = rawLines.map((line) => {
      const trimmed = line.trim()
      const match = trimmed.match(timestampRegex)
      let time: number | undefined = undefined
      let cleanText = line
      if (match) {
        const min = parseInt(match[1], 10)
        const sec = parseInt(match[2], 10)
        const msPart = match[3] || '0'
        const fraction = parseFloat('0.' + msPart)
        time = min * 60 + sec + fraction
        cleanText = line.replace(timestampRegex, '')
      }
      return { time, text: cleanText }
    })

    // Find active line index based on current audio playback time
    let activeLineIdx = -1
    if (isPlaying && hasLrcTimestamps(text)) {
      for (let k = 0; k < parsedLines.length; k++) {
        const currentLine = parsedLines[k]
        if (currentLine.time !== undefined && currentTime >= currentLine.time) {
          let nextTime: number | undefined = undefined
          for (let nextK = k + 1; nextK < parsedLines.length; nextK++) {
            if (parsedLines[nextK].time !== undefined) {
              nextTime = parsedLines[nextK].time
              break
            }
          }
          if (nextTime === undefined || currentTime < nextTime) {
            activeLineIdx = k
          }
        }
      }
    }

    return parsedLines.map((parsed, i) => {
      const isActive = i === activeLineIdx
      const lineText = parsed.text

      let contentNode: React.ReactNode = lineText
      if (showChords && lineText.includes('[') && lineText.includes(']')) {
        const parts = lineText.split(/(\[[^\]]+\])/g)
        contentNode = (
          <div className="flex flex-wrap items-baseline justify-center gap-x-1.5 min-h-[1.2em]">
            {parts.map((part, j) => {
              if (part.startsWith('[') && part.endsWith(']')) {
                const chord = part.slice(1, -1)
                return (
                  <span
                    key={j}
                    className="text-brand-primary font-bold bg-brand-primary/10 px-1 rounded"
                    style={{
                      fontSize: `${Math.max(14, Math.round((isChorus ? adaptiveFontSize * 0.74 : adaptiveFontSize) * 0.4))}px`,
                      lineHeight: 1,
                      transform: 'translateY(-0.1em)'
                    }}
                  >
                    {chord}
                  </span>
                )
              }
              return <span key={j}>{part}</span>
            })}
          </div>
        )
      }

      return (
        <motion.div
          key={i}
          className="transition-all duration-300 origin-center"
          animate={{
            opacity: activeLineIdx === -1 ? 1 : isActive ? 1 : 0.35,
            scale: isActive ? 1.03 : 1.0
          }}
          style={{
            textShadow: isActive ? '0 0 20px rgba(255,255,255,0.45)' : undefined,
            fontWeight: isActive ? '900' : '700'
          }}
        >
          {contentNode}
        </motion.div>
      )
    })
  }

  useEffect(() => {
    const handleFullscreenChange = (): void => {
      setIsFullscreen(document.fullscreenElement !== null)
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  const handleToggleFullscreen = (): void => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        logger.error('Failed to enter fullscreen:', err)
      })
    } else {
      document.exitFullscreen().catch((err) => {
        logger.error('Failed to exit fullscreen:', err)
      })
    }
  }

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0
  }, [index])

  useEffect(() => {
    const animateScroll = (): void => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop += 1
      }
      requestRef.current = requestAnimationFrame(animateScroll)
    }

    if (autoScroll && scrollRef.current) {
      requestRef.current = requestAnimationFrame(animateScroll)
    } else if (requestRef.current) {
      cancelAnimationFrame(requestRef.current)
    }

    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current)
      }
    }
  }, [autoScroll])

  useEffect(() => {
    let isMounted = true

    Promise.all([window.api.settings.getAll(), window.api.media.getAll()])
      .then(([nextSettings, assets]) => {
        if (!isMounted) return
        setSettings(nextSettings)
        setMediaAssets(assets as MediaAssetRecord[])
      })
      .catch((err) => {
        if (!isMounted) return
        logger.error('Failed to load fullscreen lyric environment:', err)
      })

    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    const backButton = document.querySelector('[data-lyrics-back]') as HTMLElement | null
    backButton?.focus()

    window.api.window
      .isMaximized()
      .then((value) => {
        setIsMaximizedLocal(value)
        setMaximized(value)
      })
      .catch((err) => logger.error('Failed to sync maximize state:', err))

    const unsubscribe = window.api.window.onMaximizedChanged((value) => {
      setIsMaximizedLocal(value)
      setMaximized(value)
    })

    // Auto-hide UI system
    const handleMouseMove = (event: MouseEvent): void => {
      const container = containerRef.current
      if (!container) return

      const rect = container.getBoundingClientRect()
      const y = event.clientY - rect.top

      setIsUiVisible(true)

      setIsWindowControlsVisible((prev) => {
        // Trigger if mouse is at the very top edge (< 5px), keep open if mouse stays on it (< 55px)
        const threshold = prev ? 55 : 5
        const next = y < threshold

        if (idleTimerRef.current) {
          clearTimeout(idleTimerRef.current)
        }

        // If title bar is NOT hovered, start the idle timer to hide the UI (including TopBar)
        if (!next) {
          idleTimerRef.current = setTimeout(() => {
            setIsUiVisible(false)
          }, 2500)
        }

        return next
      })
    }

    const handleMouseDown = (event: MouseEvent): void => {
      // Don't hide if clicking on interactive elements or the search palette
      const target = event.target as HTMLElement
      if (target.closest('button, input, [role="button"], .modal-overlay')) {
        return
      }

      setIsUiVisible(false)
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current)
      }
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mousedown', handleMouseDown)

    return () => {
      document.body.style.overflow = ''
      unsubscribe?.()
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mousedown', handleMouseDown)
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current)
      }
      if (document.fullscreenElement) {
        document.exitFullscreen().catch((err) => {
          logger.error('Failed to exit fullscreen on unmount:', err)
        })
      }
    }
  }, [setMaximized])

  const close = useCallback(() => {
    setLyricsFullscreen(false)
    onClose()
  }, [onClose, setLyricsFullscreen])

  const goPrev = useCallback(() => {
    setIndex((current) => Math.max(0, current - 1))
  }, [])

  const goNext = useCallback(() => {
    setIndex((current) => Math.min(Math.max(0, pages.length - 1), current + 1))
  }, [pages.length])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.code === 'Escape') {
        event.preventDefault()
        close()
        return
      }

      if (event.code === 'Space') {
        event.preventDefault()
        setAutoScroll((current) => !current)
        return
      }

      if (event.code === 'ArrowRight' || event.code === 'ArrowDown' || event.code === 'PageDown') {
        event.preventDefault()
        goNext()
        return
      }

      if (event.code === 'ArrowLeft' || event.code === 'ArrowUp' || event.code === 'PageUp') {
        event.preventDefault()
        goPrev()
        return
      }

      if (event.code === 'Home') {
        event.preventDefault()
        setIndex(0)
        return
      }

      if (event.code === 'End') {
        event.preventDefault()
        setIndex(Math.max(0, pages.length - 1))
        return
      }

      if (event.code === 'Equal' || event.code === 'NumpadAdd') {
        event.preventDefault()
        setFontSize((current) => Math.min(current + 2, 72))
        return
      }

      if (event.code === 'Minus' || event.code === 'NumpadSubtract') {
        event.preventDefault()
        setFontSize((current) => Math.max(current - 2, 26))
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [close, goNext, goPrev, pages.length])

  const total = Math.max(1, pages.length)
  const currentPage = pages[index] || {
    label: 'LYRICS',
    verseText: song.lyrics_raw || '',
    chorusText: undefined,
    order: 1,
    hasChorus: false
  }
  const globalAtmosphere = useMemo(() => buildCurrentGlobalAtmosphere(settings), [settings])
  const songAtmosphere = useMemo(
    () => parseAtmosphereConfig(song.song_background_config),
    [song.song_background_config]
  )

  const activeAtmosphere = useMemo(() => {
    const config = songAtmosphere || globalAtmosphere
    const source = songAtmosphere ? 'song' : 'global'
    const asset =
      mediaAssets.find((item) => item.id === config.media?.assetId) ||
      mediaAssets.find((item) => item.localPath === config.media?.path) ||
      null
    const mediaPath = config.media?.path || asset?.localPath || ''
    return {
      source,
      config,
      asset,
      mediaPath
    }
  }, [globalAtmosphere, mediaAssets, songAtmosphere])

  const overlayDim = activeAtmosphere.config.overlay?.dim ?? 0.58
  const overlayGlow = activeAtmosphere.config.overlay?.glow ?? 0.12
  const textShieldOpacity = activeAtmosphere.config.overlay?.textShieldOpacity ?? 0.22
  const blurBehindLyrics = activeAtmosphere.config.readability?.blurBehindLyrics !== false
  const contrastBoost = activeAtmosphere.config.readability?.contrastBoost ?? 0.18
  const displayNumber = normalizeDisplayNumber(song.number)
  const verseLineCount = currentPage.verseText.split('\n').filter(Boolean).length
  const chorusLineCount = (currentPage.chorusText || '').split('\n').filter(Boolean).length
  const lyricLineCount = verseLineCount + chorusLineCount
  const adaptiveFontSize = Math.max(
    36,
    Math.min(
      92,
      Math.round(fontSize * (currentPage.hasChorus ? 1.25 : 1.55) - lyricLineCount * 1.1)
    )
  )
  const readableTextShadow = `0 12px 40px rgba(1, 6, 18, ${Math.min(0.78, 0.44 + contrastBoost)}), 0 2px 10px rgba(3, 7, 18, 0.42)`
  const mediaUrl = toFileUrl(activeAtmosphere.mediaPath)

  return (
    <div ref={containerRef} className="absolute inset-0 overflow-hidden bg-[#020617] text-white">
      <div className="absolute inset-0">
        <div
          className="absolute inset-0"
          style={{
            background: buildGradientBackground(activeAtmosphere.config)
          }}
        />

        {activeAtmosphere.config.mode === 'video' && mediaUrl ? (
          <video
            className="absolute inset-0 h-full w-full object-cover opacity-50"
            src={mediaUrl}
            autoPlay
            muted
            loop
            playsInline
          />
        ) : null}

        {activeAtmosphere.config.mode === 'image' && mediaUrl ? (
          <div
            className="absolute inset-0 bg-cover bg-center opacity-55"
            style={{ backgroundImage: `url("${mediaUrl}")` }}
          />
        ) : null}

        <motion.div
          className="absolute -left-[12%] top-[-20%] h-[72vh] w-[56vw] rounded-full blur-[130px]"
          style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.35), transparent 72%)' }}
          animate={{ x: [0, 90, -40, 0], y: [0, 35, 55, 0], scale: [1, 1.12, 0.96, 1] }}
          transition={{ duration: 24, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute bottom-[-18%] right-[-12%] h-[62vh] w-[50vw] rounded-full blur-[140px]"
          style={{ background: 'radial-gradient(circle, rgba(168,85,247,0.32), transparent 72%)' }}
          animate={{ x: [0, -80, 30, 0], y: [0, -35, -20, 0], scale: [1, 1.15, 1.02, 1] }}
          transition={{ duration: 28, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute left-[15%] bottom-[10%] h-[48vh] w-[42vw] rounded-full blur-[120px]"
          style={{ background: 'radial-gradient(circle, rgba(236,72,153,0.28), transparent 70%)' }}
          animate={{ x: [0, 50, -25, 0], y: [0, -40, 20, 0], scale: [1, 1.08, 0.94, 1] }}
          transition={{ duration: 32, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute inset-0 opacity-[0.14]"
          style={{
            backgroundImage:
              'radial-gradient(circle at 15% 25%, rgba(255,255,255,0.92) 0 1px, transparent 1.8px), radial-gradient(circle at 75% 15%, rgba(255,255,255,0.78) 0 1px, transparent 1.9px), radial-gradient(circle at 35% 85%, rgba(255,255,255,0.72) 0 1px, transparent 2px), radial-gradient(circle at 88% 58%, rgba(255,255,255,0.68) 0 1px, transparent 1.8px)'
          }}
          animate={{ opacity: [0.06, 0.14, 0.1, 0.06] }}
          transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
        />
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(180deg, rgba(2,6,23,${0.3 + overlayDim * 0.2}) 0%, rgba(2,6,23,${0.48 + overlayDim * 0.3}) 48%, rgba(2,6,23,${0.82 + overlayDim * 0.2}) 100%)`
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background: `radial-gradient(circle at 50% 44%, rgba(255,255,255,${0.03 + overlayGlow * 0.18}) 0%, transparent 30%), radial-gradient(circle at 50% 100%, rgba(8,15,35,0.15) 0%, rgba(2,6,23,0.74) 62%)`
          }}
        />
        <div className="absolute inset-x-0 bottom-0 h-[26vh] bg-[linear-gradient(180deg,transparent,rgba(1,4,14,0.5)_18%,rgba(1,4,14,0.92))]" />
        <div className="absolute inset-x-0 bottom-0 h-[18vh] opacity-70 [clip-path:polygon(0_100%,0_72%,7%_78%,14%_64%,25%_76%,36%_58%,47%_70%,58%_56%,70%_76%,82%_60%,92%_78%,100%_68%,100%_100%)] bg-[linear-gradient(180deg,rgba(10,15,30,0.72),rgba(2,6,20,0.96))]" />
      </div>

      <div className="absolute inset-0 pointer-events-none">
        <div
          className={`absolute left-1/2 top-1/2 h-[52vh] w-[74vw] -translate-x-1/2 -translate-y-1/2 rounded-[48px] ${
            blurBehindLyrics ? 'backdrop-blur-[18px]' : ''
          }`}
          style={{
            background: `radial-gradient(circle at 50% 50%, rgba(5,10,26,${textShieldOpacity + contrastBoost * 0.4}) 0%, rgba(5,10,26,${textShieldOpacity * 0.72}) 42%, transparent 74%)`
          }}
        />
      </div>

      {/* Title Bar (Library Mode) - Shows on hover at top edge */}
      <motion.div
        className="absolute inset-x-0 top-0 z-[100]"
        initial={{ opacity: 0, y: -48 }}
        animate={{ opacity: isWindowControlsVisible ? 1 : 0, y: isWindowControlsVisible ? 0 : -48 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        style={{ pointerEvents: isWindowControlsVisible ? 'auto' : 'none' }}
      >
        <TitleBar />
      </motion.div>

      {/* Top Bar (Lyric Display) - Always visible */}
      <motion.div
        className="absolute inset-x-0 top-0 z-40"
        initial={{ y: 0 }}
        animate={{ y: isWindowControlsVisible ? 48 : 0 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="mx-auto flex h-[76px] max-w-[1800px] items-center justify-between px-6 lg:px-8 border-b border-white/[0.08] bg-[linear-gradient(180deg,rgba(8,14,28,0.92),rgba(6,10,22,0.82))] shadow-[0_12px_40px_rgba(0,0,0,0.4)] backdrop-blur-2xl">
          {/* Left: Back Button & Song Info */}
          <div className="flex flex-1 min-w-0 items-center gap-5">
            <button
              onClick={close}
              className="group shrink-0 inline-flex h-11 w-11 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04] text-white/80 transition-all hover:border-white/[0.18] hover:bg-white/[0.1] hover:text-white hover:shadow-[0_0_20px_rgba(255,255,255,0.06)]"
              title="Kembali ke Library (Esc)"
            >
              <ArrowLeft size={20} className="transition-transform group-hover:-translate-x-0.5" />
            </button>

            <div className="h-8 w-px bg-white/10 shrink-0" />

            <div className="flex items-center gap-3.5 min-w-0">
              <div className="flex h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-blue-400/25 bg-blue-500/15 px-3 text-[18px] font-black text-blue-300 shadow-[0_0_16px_rgba(59,130,246,0.15)] shrink-0">
                {displayNumber}
              </div>

              <div className="flex flex-col justify-center min-w-0">
                <h1 className="truncate text-[20px] font-black tracking-[-0.02em] text-white/94 leading-none">
                  {song.title}
                </h1>
                <div className="mt-1 text-[13px] font-medium text-slate-300/60 truncate leading-none">
                  {song.alternate_title || song.title_en || song.hymnal_name || 'Lagu Sion'}
                </div>
              </div>
            </div>
          </div>

          {/* Right: Metadata */}
          <div
            className="flex shrink-0 justify-end items-center gap-6 ml-6"
            style={{ paddingRight: isFullscreen ? '0px' : '160px' }}
          >
            <div className="flex flex-col items-start justify-center shrink-0">
              <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400/80">
                Key
              </div>
              <div className="text-[13px] font-black text-white/94 mt-0.5">
                {song.key_note || '-'}
              </div>
            </div>
            <div className="flex flex-col items-start justify-center shrink-0">
              <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400/80">
                Tempo
              </div>
              <div className="text-[13px] font-black text-white/94 mt-0.5">
                {song.tempo
                  ? /\d/.test(song.tempo) && !song.tempo.toLowerCase().includes('bpm')
                    ? `${song.tempo} BPM`
                    : song.tempo
                  : '-'}
              </div>
            </div>
            <div className="flex flex-col items-start justify-center shrink-0 hidden sm:flex">
              <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400/80">
                Birama
              </div>
              <div className="text-[13px] font-black text-white/94 mt-0.5">
                {song.time_signature || '-'}
              </div>
            </div>
            <div className="flex flex-col items-start justify-center shrink-0 hidden md:flex">
              <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400/80">
                Kategori
              </div>
              <div className="text-[13px] font-black text-white/94 mt-0.5 truncate max-w-[100px]">
                {song.category || '-'}
              </div>
            </div>

            <div className="h-6 w-px bg-white/10 mx-6 hidden lg:block" />
            <button
              onClick={handleToggleFullscreen}
              className="ml-2 inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.04] text-white/70 transition-all hover:bg-white/[0.1] hover:text-white hover:shadow-[0_0_15px_rgba(255,255,255,0.08)]"
              title={isFullscreen ? 'Keluar Fullscreen' : 'Layar Penuh'}
            >
              {isFullscreen ? <Shrink size={16} /> : <Expand size={16} />}
            </button>
          </div>

          {/* Dynamic Progress Bar */}
          <div
            className="absolute bottom-0 left-0 h-[2px] bg-brand-primary transition-all duration-300 shadow-[0_0_8px_rgba(var(--brand-primary-rgb),0.5)]"
            style={{ width: `${((index + 1) / total) * 100}%` }}
          />
        </div>
      </motion.div>

      {/* Floating Left Sidebar - Operational Controls (Auto Hide on Idle) */}
      <motion.div
        className="absolute left-8 top-1/2 z-40 -translate-y-1/2"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: isUiVisible ? 1 : 0, x: isUiVisible ? 0 : -20 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        style={{ pointerEvents: isUiVisible ? 'auto' : 'none' }}
      >
        <div className="flex flex-col items-center gap-5 rounded-[28px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(15,23,42,0.85),rgba(8,14,28,0.75))] p-3 shadow-[24px_0_60px_rgba(0,0,0,0.4)] backdrop-blur-2xl">
          {/* Quick Search Controls */}
          <div className="flex flex-col gap-2">
            <button
              onClick={() => setIsSearchOpen(true)}
              className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-white/[0.04] text-white/70 transition-all hover:bg-white/[0.1] hover:text-white hover:shadow-[0_0_15px_rgba(255,255,255,0.08)]"
              title="Cari Judul/Lirik"
            >
              <Search size={18} />
            </button>
            <button
              onClick={() => setIsSearchOpen(true)}
              className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-white/[0.04] text-white/70 transition-all hover:bg-white/[0.1] hover:text-white hover:shadow-[0_0_15px_rgba(255,255,255,0.08)]"
              title="Cari Nomor Lagu"
            >
              <Grid3X3 size={18} />
            </button>
          </div>

          <div className="h-px w-8 bg-white/[0.08]" />

          {/* Action Buttons */}
          <div className="flex flex-col gap-2">
            <button
              onClick={handleCopyLyrics}
              className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-white/[0.04] text-white/70 transition-all hover:bg-white/[0.1] hover:text-white"
              title="Salin Lirik Lengkap"
            >
              {copyFeedback ? <Check size={18} className="text-green-400" /> : <Copy size={18} />}
            </button>
            <button
              onClick={() => setShowChords(!showChords)}
              className={`flex h-11 w-11 items-center justify-center rounded-[14px] transition-all ${
                showChords
                  ? 'bg-brand-primary text-white shadow-[0_0_20px_rgba(var(--brand-primary-rgb),0.4)]'
                  : 'bg-white/[0.04] text-white/70 hover:bg-white/[0.1] hover:text-white'
              }`}
              title="Mode Musik (Chord)"
            >
              <Music size={18} />
            </button>
            {instrumentPath && (
              <button
                onClick={() => setIsSyncMode(!isSyncMode)}
                className={`flex h-11 w-11 items-center justify-center rounded-[14px] transition-all ${
                  isSyncMode
                    ? 'bg-brand-primary text-white shadow-[0_0_20px_rgba(var(--brand-primary-rgb),0.4)] animate-pulse'
                    : 'bg-white/[0.04] text-white/70 hover:bg-white/[0.1] hover:text-white'
                }`}
                title="LRC Timestamp Sync Tool"
              >
                <Clock size={18} />
              </button>
            )}
          </div>

          <div className="h-px w-8 bg-white/[0.08]" />

          {/* Vertical Zoom Controls */}
          <div className="flex flex-col items-center gap-1">
            <button
              onClick={() => handleZoom(2)}
              className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-all"
              title="Perbesar Lirik"
            >
              <Plus size={16} />
            </button>
            <div className="flex flex-col items-center justify-center py-1">
              <span className="text-[11px] font-black font-mono text-white/40 leading-none">
                {fontSize}
              </span>
              <span className="text-[8px] font-bold text-white/20 uppercase tracking-tighter mt-0.5">
                SIZE
              </span>
            </div>
            <button
              onClick={() => handleZoom(-2)}
              className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-all"
              title="Perkecil Lirik"
            >
              <Minus size={16} />
            </button>
          </div>
        </div>
      </motion.div>

      {/* Bottom Footer Bar - Song Navigation (Auto Hide on Idle) */}
      <motion.div
        className="absolute bottom-8 left-1/2 z-40 -translate-x-1/2"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: isUiVisible ? 1 : 0, y: isUiVisible ? 0 : 20 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        style={{ pointerEvents: isUiVisible ? 'auto' : 'none' }}
      >
        <div className="flex items-center gap-4 rounded-[24px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(15,23,42,0.92),rgba(8,14,28,0.82))] px-4 py-3 shadow-[0_24px_60px_rgba(0,0,0,0.45)] backdrop-blur-2xl">
          <button
            onClick={onPrevSong}
            disabled={!onPrevSong}
            className="group flex h-12 w-12 items-center justify-center rounded-[14px] border border-white/[0.04] bg-white/[0.02] text-white/60 transition-all hover:border-white/[0.1] hover:bg-white/[0.06] hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
            title="Lagu Sebelumnya"
          >
            <SkipBack size={20} className="transition-transform group-hover:-translate-x-0.5" />
          </button>

          <div className="h-8 w-px bg-white/[0.06]" />

          <button
            onClick={() => setAutoScroll((current) => !current)}
            className={`group flex h-14 w-14 items-center justify-center rounded-full border transition-all ${
              autoScroll
                ? 'border-blue-400/30 bg-blue-500/20 text-blue-100 shadow-[0_0_24px_rgba(59,130,246,0.25)] scale-105'
                : 'border-white/[0.08] bg-white/[0.04] text-white/80 hover:border-white/[0.15] hover:bg-white/[0.08] hover:text-white hover:scale-105'
            }`}
            title="Auto Scroll (Play/Pause)"
          >
            {autoScroll ? (
              <Pause size={24} className="fill-current" />
            ) : (
              <Play size={24} className="fill-current ml-1" />
            )}
          </button>

          <div className="h-8 w-px bg-white/[0.06]" />

          <button
            onClick={onNextSong}
            disabled={!onNextSong}
            className="group flex h-12 w-12 items-center justify-center rounded-[14px] border border-white/[0.04] bg-white/[0.02] text-white/60 transition-all hover:border-white/[0.1] hover:bg-white/[0.06] hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
            title="Lagu Selanjutnya"
          >
            <SkipForward size={20} className="transition-transform group-hover:translate-x-0.5" />
          </button>

          {instrumentPath && (
            <>
              <div className="h-8 w-px bg-white/[0.06]" />

              <div className="flex items-center gap-2 pl-2">
                <button
                  onClick={handlePlayPause}
                  className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                    isPlaying
                      ? 'bg-brand-primary text-white'
                      : 'bg-white/10 text-white/80 hover:bg-white/20 hover:text-white'
                  }`}
                  title={isPlaying ? 'Pause Backing Track' : 'Play Backing Track'}
                >
                  {isPlaying ? (
                    <Pause size={14} fill="currentColor" />
                  ) : (
                    <Play size={14} fill="currentColor" className="ml-0.5" />
                  )}
                </button>
                <button
                  onClick={handleStop}
                  className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/15 text-white/60 hover:text-white flex items-center justify-center transition-all"
                  title="Stop Backing Track"
                >
                  <Square size={10} fill="currentColor" />
                </button>

                <span className="text-[10px] text-white/40 font-mono select-none px-1">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </span>

                <input
                  type="range"
                  min={0}
                  max={duration || 100}
                  value={currentTime}
                  onChange={(e) => {
                    const val = Number(e.target.value)
                    if (audioRef.current) audioRef.current.currentTime = val
                  }}
                  className="w-24 h-1 rounded-lg appearance-none bg-white/10 accent-brand-primary outline-none cursor-pointer"
                />

                <div className="flex items-center gap-1.5 bg-white/5 rounded-lg px-2 h-8">
                  <button
                    onClick={() => setMuted(!muted)}
                    className="text-white/60 hover:text-white transition-colors"
                  >
                    {muted ? <VolumeX size={12} /> : <Volume2 size={12} />}
                  </button>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={muted ? 0 : volume}
                    onChange={(e) => {
                      const val = Number(e.target.value)
                      setVolume(val)
                      if (muted && val > 0) setMuted(false)
                    }}
                    className="w-10 h-0.5 accent-brand-primary outline-none cursor-pointer"
                  />
                </div>
              </div>
            </>
          )}
        </div>
      </motion.div>

      <motion.div
        className="absolute right-6 top-1/2 z-20 -translate-y-1/2"
        initial={{ opacity: 0, x: 12 }}
        animate={{ opacity: isUiVisible ? 1 : 0.3, x: isUiVisible ? 0 : 12 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="flex flex-col items-center gap-3">
          {Array.from({ length: total }).map((_, itemIndex) => {
            const active = itemIndex === index
            return (
              <button
                key={itemIndex}
                onClick={() => setIndex(itemIndex)}
                className="group relative flex items-center gap-2"
                aria-label={`Slide ${itemIndex + 1}`}
                title={`${pages[itemIndex]?.label || 'SLIDE'} ${itemIndex + 1}`}
              >
                <motion.span
                  className={`block rounded-full transition-all ${
                    active
                      ? 'h-2.5 w-2.5 bg-blue-300 shadow-[0_0_0_6px_rgba(99,102,241,0.12),0_0_18px_rgba(96,165,250,0.45)]'
                      : 'h-1.5 w-1.5 bg-white/20 group-hover:bg-white/40'
                  }`}
                  animate={{
                    scale: active ? [1, 1.15, 1] : 1,
                    opacity: active ? 1 : 0.5
                  }}
                  transition={{
                    duration: active ? 2 : 0.2,
                    repeat: active ? Infinity : 0,
                    ease: 'easeInOut'
                  }}
                />
                <span
                  className={`text-[10px] font-semibold transition-all ${
                    active ? 'text-white/90' : 'text-white/40 group-hover:text-white/60'
                  }`}
                >
                  {itemIndex + 1}/{total}
                </span>
              </button>
            )
          })}
        </div>
      </motion.div>

      <div className="absolute inset-0 z-10 flex items-center justify-center px-[8vw] py-[13vh]">
        <div className="w-full max-w-[1200px]">
          {currentPage.verseText.trim() ? (
            <AnimatePresence mode="wait">
              <motion.div
                key={`${currentPage.order}-${currentPage.label}`}
                initial={{ opacity: 0, y: 20, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -16, scale: 0.98 }}
                transition={{ duration: 0.36, ease: [0.22, 1, 0.36, 1] }}
                className="text-center"
              >
                <div
                  ref={scrollRef}
                  className="mx-auto max-h-[68vh] overflow-y-auto px-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                >
                  <div className="mx-auto flex max-w-[1100px] flex-col items-center gap-10">
                    <div className="w-full text-center">
                      <motion.div
                        className="mb-8 inline-flex items-center gap-2 rounded-full border border-violet-400/16 bg-violet-500/8 px-4 py-2 text-[10px] font-black uppercase tracking-[0.28em] text-violet-100/88 shadow-[0_0_20px_rgba(139,92,246,0.2)]"
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                      >
                        <Sparkles size={11} />
                        {currentPage.label} • {index + 1}/{total}
                      </motion.div>

                      <motion.div
                        className="whitespace-pre-line font-black tracking-[-0.035em] text-[#fffaf6]"
                        style={{
                          fontSize: `${adaptiveFontSize}px`,
                          lineHeight: 1.18,
                          textShadow: readableTextShadow,
                          letterSpacing: '-0.02em'
                        }}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.15, duration: 0.44, ease: [0.22, 1, 0.36, 1] }}
                      >
                        {renderLyrics(currentPage.verseText)}
                      </motion.div>
                    </div>

                    {currentPage.hasChorus && currentPage.chorusText ? (
                      <motion.div
                        className="w-full max-w-[1100px] rounded-[36px] border border-white/[0.06] bg-[linear-gradient(180deg,rgba(10,18,36,0.52),rgba(7,12,25,0.40))] px-9 py-8 shadow-[0_28px_90px_rgba(0,0,0,0.32)] backdrop-blur-[18px]"
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                      >
                        <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-blue-300/14 bg-blue-500/8 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.26em] text-blue-100/84 shadow-[0_0_16px_rgba(59,130,246,0.16)]">
                          <Music2 size={11} />
                          REFF / CHORUS
                        </div>
                        <div
                          className="whitespace-pre-line font-black tracking-[-0.03em] text-[#f8fbff]"
                          style={{
                            fontSize: `${Math.max(28, Math.round(adaptiveFontSize * 0.74))}px`,
                            lineHeight: 1.2,
                            textShadow: readableTextShadow,
                            letterSpacing: '-0.015em'
                          }}
                        >
                          {renderLyrics(currentPage.chorusText, true)}
                        </div>
                      </motion.div>
                    ) : null}
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          ) : (
            <div className="mx-auto max-w-[640px] rounded-[36px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(8,14,28,0.78),rgba(6,10,22,0.60))] p-9 text-center shadow-[0_36px_110px_rgba(0,0,0,0.38)] backdrop-blur-2xl">
              <div className="text-[11px] font-black uppercase tracking-[0.26em] text-blue-100/52">
                Lyric Canvas
              </div>
              <div className="mt-4 text-[26px] font-black tracking-[-0.025em] text-white/90">
                Lirik belum tersedia
              </div>
              <div className="mt-3 text-sm leading-6 text-slate-300/70">
                Isi lirik lagu melalui Song Editor agar fullscreen lyric viewer dapat menampilkan
                stanza secara immersive.
              </div>
            </div>
          )}
        </div>
      </div>

      {/* LRC Sync Tool Side Panel Overlay */}
      {isSyncMode && (
        <div className="absolute top-12 bottom-0 right-0 w-[420px] bg-[linear-gradient(180deg,rgba(15,23,42,0.96),rgba(8,14,28,0.98))] border-l border-white/[0.08] z-[60] flex flex-col p-6 shadow-[-12px_0_40px_rgba(0,0,0,0.6)] backdrop-blur-3xl animate-in slide-in-from-right duration-300 rounded-l-3xl">
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
            <div className="flex items-center gap-3">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500 animate-pulse"></span>
              </span>
              <h3 className="font-extrabold text-[12px] uppercase tracking-[0.2em] text-white/90">
                LRC Sync Station
              </h3>
            </div>
            <button
              onClick={() => setIsSyncMode(false)}
              className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/[0.04] text-white/60 hover:bg-white/[0.08] hover:text-white transition-all border border-white/[0.04] active:scale-95"
              title="Tutup Panel"
            >
              <X size={15} />
            </button>
          </div>

          {/* Guide Card */}
          <div className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-gradient-to-br from-white/[0.03] to-transparent p-4 my-4 shadow-inner">
            <div className="flex items-start gap-3">
              <HelpCircle size={15} className="text-blue-400 mt-0.5 shrink-0" />
              <div className="text-[11px] text-slate-300/80 leading-relaxed">
                <span className="font-bold text-white block mb-1 text-[12px]">
                  Panduan Sinkronisasi:
                </span>
                1. Putar lagu pengiring pada pemutar di bawah.
                <br />
                2. Ketuk{' '}
                <kbd className="bg-white/10 border border-white/10 px-1.5 py-0.5 rounded text-[10px] text-white font-mono shadow-sm mx-0.5">
                  Space
                </kbd>{' '}
                atau klik <strong className="text-blue-400">TAP</strong> tepat saat baris lirik
                mulai dinyanyikan.
                <br />
                3. Klik <strong className="text-white">Simpan Sinkronisasi</strong> jika selesai.
              </div>
            </div>
          </div>

          {/* Timeline Lyric List */}
          <div className="flex-1 overflow-y-auto space-y-3 pr-1.5 select-none relative [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/10 hover:[&::-webkit-scrollbar-thumb]:bg-white/20 [&::-webkit-scrollbar-track]:bg-transparent">
            {/* Vertical timeline line */}
            <div className="absolute left-[22px] top-3 bottom-3 w-[2px] bg-white/[0.04] pointer-events-none" />

            {syncLines.map((line, idx) => {
              const isSection = line.text.trim().startsWith('[') && line.text.trim().endsWith(']')
              const isEmpty = line.text.trim() === ''
              const isActive = idx === activeSyncIndex

              if (isEmpty) return <div key={idx} className="h-1.5" />

              if (isSection) {
                return (
                  <div key={idx} className="pt-4 pb-2 first:pt-1">
                    <div className="flex items-center gap-2 pl-4">
                      <span className="text-[9px] font-black uppercase tracking-[0.2em] text-violet-350 bg-violet-500/10 border border-violet-500/20 px-2.5 py-0.5 rounded-md">
                        {line.text.slice(1, -1)}
                      </span>
                      <div className="flex-1 h-px border-t border-dashed border-white/[0.06]" />
                    </div>
                  </div>
                )
              }

              return (
                <div
                  key={idx}
                  onClick={() => setActiveSyncIndex(idx)}
                  className={`relative flex items-center justify-between p-3.5 pl-10 rounded-2xl transition-all border cursor-pointer group/item ${
                    isActive
                      ? 'bg-gradient-to-r from-blue-500/10 to-transparent border-blue-500/35 text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_8px_24px_rgba(59,130,246,0.12)]'
                      : 'bg-white/[0.01] border-white/[0.03] text-white/50 hover:bg-white/[0.03] hover:text-white/85'
                  }`}
                >
                  {/* Timeline dot */}
                  <div className="absolute left-[22px] top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center z-10">
                    {isActive ? (
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.8)]"></span>
                      </span>
                    ) : (
                      <div
                        className={`h-1.5 w-1.5 rounded-full transition-all ${line.time !== undefined ? 'bg-blue-500/60' : 'bg-white/20 group-hover/item:bg-white/40'}`}
                      />
                    )}
                  </div>

                  <div className="flex-1 min-w-0 pr-3">
                    <p className={`text-xs truncate ${isActive ? 'font-bold' : 'font-medium'}`}>
                      {line.text}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {line.time !== undefined && (
                      <span className="inline-flex items-center gap-1 text-[9px] font-black font-mono bg-blue-500/15 border border-blue-400/20 text-blue-300 px-2.5 py-0.5 rounded-full shadow-[0_0_12px_rgba(59,130,246,0.15)]">
                        <Clock size={8} />
                        {formatTime(line.time)}
                      </span>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        const updated = [...syncLines]
                        updated[idx].time = currentTime
                        setSyncLines(updated)
                        // Auto advance
                        let nextIdx = idx + 1
                        while (
                          nextIdx < updated.length &&
                          (updated[nextIdx].text.trim() === '' ||
                            (updated[nextIdx].text.trim().startsWith('[') &&
                              updated[nextIdx].text.trim().endsWith(']')))
                        ) {
                          nextIdx++
                        }
                        if (nextIdx < updated.length) setActiveSyncIndex(nextIdx)
                      }}
                      className={`h-7 px-3 rounded-lg text-[10px] font-extrabold uppercase tracking-wider transition-all scale-100 active:scale-95 ${
                        isActive
                          ? 'bg-blue-500 hover:bg-blue-600 text-white shadow-[0_0_16px_rgba(59,130,246,0.4)] border border-blue-400/30'
                          : 'bg-white/5 text-white/40 hover:bg-white/10 hover:text-white border border-white/[0.04]'
                      }`}
                    >
                      TAP
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-white/[0.08] flex items-center justify-between gap-3 mt-4 bg-slate-900/40 backdrop-blur-md -mx-6 -mb-6 p-4 rounded-b-3xl">
            <button
              onClick={() => {
                const reset = syncLines.map((l) => ({ ...l, time: undefined }))
                setSyncLines(reset)
                setActiveSyncIndex(0)
              }}
              className="h-10 px-4 rounded-xl bg-white/[0.03] border border-white/[0.08] hover:bg-white/[0.06] text-white/70 hover:text-white text-xs font-bold transition-all flex items-center gap-1.5 active:scale-95 shrink-0"
              title="Reset semua stempel waktu"
            >
              <RotateCcw size={12} />
              Reset
            </button>

            <button
              onClick={handleSaveLrc}
              className="flex-1 h-10 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(79,70,229,0.35)] active:scale-[0.98] border border-white/10"
            >
              <Save size={12} />
              Simpan Sinkronisasi
            </button>
          </div>
        </div>
      )}

      {/* Hidden local audio node */}
      {normalizedUrl && (
        <audio
          ref={audioRef}
          src={normalizedUrl}
          onTimeUpdate={() => {
            if (audioRef.current) {
              setCurrentTime(audioRef.current.currentTime)
              setDuration(audioRef.current.duration || 0)
            }
          }}
          onEnded={() => setIsPlaying(false)}
        />
      )}

      {/* Quick Jump Search Palette */}
      <LibrarySearchPalette
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelectSong={handleSearchJump}
      />
    </div>
  )
}
