import type { SlideData } from '@renderer/types'

export interface PresenterRemoteSlideSummary {
  text: string
  label?: string | null
  contentType?: SlideData['contentType']
  bibleReference?: string | null
  stageNotes?: string | null
  stageChord?: string | null
  keyNote?: string | null
  timeSignature?: string | null
  tempo?: string | null
  visualType?: 'image' | 'video' | 'pdf'
  visualPath?: string
  visualDataUrl?: string
  pageNumber?: number
  mediaKind?: SlideData['mediaKind']
  mediaSourcePath?: string
  canPresenterNavigate?: boolean
}

function cleanText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

export function getPresenterRemotePdfVisualKey(slide: SlideData | null | undefined): string | null {
  const pdfPath = cleanText(slide?.pdfPath)
  if (!slide || !pdfPath) return null
  return `${pdfPath}::${slide.slideIndex + 1}`
}

export function attachPresenterRemoteVisualDataUrl(
  summary: PresenterRemoteSlideSummary | null,
  visualDataUrl: string | undefined
): PresenterRemoteSlideSummary | null {
  if (!summary || !visualDataUrl) return summary
  return {
    ...summary,
    visualType: 'image',
    visualDataUrl
  }
}

function parseBackgroundVisual(
  songBackgroundConfig: string | null | undefined
): Pick<PresenterRemoteSlideSummary, 'visualPath' | 'visualType'> {
  if (!songBackgroundConfig) return {}
  try {
    const config = JSON.parse(songBackgroundConfig) as {
      mode?: unknown
      media?: { path?: unknown }
    }
    const visualPath = cleanText(config.media?.path)
    if (!visualPath) return {}

    if (config.mode === 'video') return { visualType: 'video', visualPath }
    if (config.mode === 'pdf') return { visualType: 'pdf', visualPath }
    if (config.mode === 'image' || config.mode === 'motion') {
      return { visualType: 'image', visualPath }
    }
  } catch {
    return {}
  }
  return {}
}

export function summarizePresenterRemoteSlide(
  slide: SlideData | null | undefined,
  songBackgroundConfig?: string | null,
  stageMeta?: { notes?: string | null; chord?: string | null }
): PresenterRemoteSlideSummary | null {
  if (!slide) return null

  const text = cleanText(slide.text)
  const sectionLabel = cleanText(slide.sectionLabel)
  const bibleReference = cleanText(slide.bibleReference)
  const keyNote = cleanText(slide.keyNote)
  const timeSignature = cleanText(slide.timeSignature)
  const tempo = cleanText(slide.tempo)
  const slideMeta: Pick<
    PresenterRemoteSlideSummary,
    'bibleReference' | 'stageNotes' | 'stageChord' | 'keyNote' | 'timeSignature' | 'tempo'
  > = {}
  if (bibleReference) slideMeta.bibleReference = bibleReference
  if (slide.speakerNotes?.trim()) slideMeta.stageNotes = slide.speakerNotes.trim()
  else if (stageMeta?.notes) slideMeta.stageNotes = stageMeta.notes
  if (stageMeta?.chord) slideMeta.stageChord = stageMeta.chord
  if (keyNote) slideMeta.keyNote = keyNote
  if (timeSignature) slideMeta.timeSignature = timeSignature
  if (tempo) slideMeta.tempo = tempo
  const backgroundVisual = parseBackgroundVisual(songBackgroundConfig)
  const visual =
    slide.visualImagePath && cleanText(slide.visualImagePath)
      ? {
          visualType: 'image' as const,
          visualPath: cleanText(slide.visualImagePath),
          pageNumber: slide.slideIndex + 1
        }
      : slide.pdfPath && cleanText(slide.pdfPath)
        ? {
            visualType: 'pdf' as const,
            visualPath: cleanText(slide.pdfPath),
            pageNumber: slide.slideIndex + 1
          }
        : backgroundVisual.visualType === 'pdf'
          ? {
              ...backgroundVisual,
              pageNumber: slide.slideIndex + 1
            }
          : backgroundVisual
  const canPresenterNavigate =
    (visual.visualType === 'pdf' || slide.mediaKind === 'presentation') &&
    slide.contentType !== 'song' &&
    slide.contentType !== 'bible' &&
    slide.contentType !== 'reading'

  if (text) {
    return {
      text,
      label: sectionLabel || bibleReference || null,
      contentType: slide.contentType,
      mediaKind: slide.mediaKind,
      mediaSourcePath: slide.mediaSourcePath,
      canPresenterNavigate,
      ...slideMeta,
      ...visual
    }
  }

  if (sectionLabel) {
    return {
      text: sectionLabel,
      label: slide.contentType === 'bible' ? bibleReference || 'Alkitab' : 'Media',
      contentType: slide.contentType,
      mediaKind: slide.mediaKind,
      mediaSourcePath: slide.mediaSourcePath,
      canPresenterNavigate,
      ...slideMeta,
      ...visual
    }
  }

  if (bibleReference) {
    return {
      text: bibleReference,
      label: 'Alkitab',
      contentType: slide.contentType,
      mediaKind: slide.mediaKind,
      mediaSourcePath: slide.mediaSourcePath,
      canPresenterNavigate,
      ...slideMeta,
      ...visual
    }
  }

  return null
}
