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
  Grid3X3
} from 'lucide-react'
import { TitleBar } from '@renderer/components/titlebar/TitleBar'
import { LibrarySearchPalette } from './LibrarySearchPalette'
import type { Song } from '@renderer/types'
import { useAppStore } from '@renderer/store/useAppStore'
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

${song.lyrics_raw}

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
    if (!showChords) return text

    return text.split('\n').map((line, i) => {
      // Basic parser for [G] style chords
      if (line.includes('[') && line.includes(']')) {
        const parts = line.split(/(\[[^\]]+\])/g)
        return (
          <div
            key={i}
            className="flex flex-wrap items-baseline justify-center gap-x-1.5 min-h-[1.2em]"
          >
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
      return <div key={i}>{line}</div>
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
        <div className="flex items-center gap-4 rounded-[24px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(15,23,42,0.85),rgba(8,14,28,0.75))] px-4 py-3 shadow-[0_24px_60px_rgba(0,0,0,0.4)] backdrop-blur-2xl">
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

      {/* Quick Jump Search Palette */}
      <LibrarySearchPalette
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelectSong={handleSearchJump}
      />
    </div>
  )
}
