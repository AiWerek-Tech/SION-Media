export interface PresentationPlaylistSlide {
  index: number
  title: string
  notes: string
}

export interface MediaPlaylistDescriptor {
  version: 1
  kind: 'media'
  path: string
  presentation?: {
    slides: PresentationPlaylistSlide[]
  }
}

export function serializeMediaPlaylistDescriptor(input: {
  path: string
  presentation?: { slides: PresentationPlaylistSlide[] }
}): string {
  return JSON.stringify({ version: 1, kind: 'media', ...input } satisfies MediaPlaylistDescriptor)
}

export function parseMediaPlaylistDescriptor(
  raw: string | null | undefined
): MediaPlaylistDescriptor {
  const fallback = String(raw ?? '').trim()
  if (!fallback.startsWith('{')) return { version: 1, kind: 'media', path: fallback }
  try {
    const parsed = JSON.parse(fallback) as Partial<MediaPlaylistDescriptor>
    if (parsed.version !== 1 || parsed.kind !== 'media' || typeof parsed.path !== 'string') {
      return { version: 1, kind: 'media', path: fallback }
    }
    const slides = Array.isArray(parsed.presentation?.slides)
      ? parsed.presentation.slides
          .filter(
            (slide) =>
              slide &&
              Number.isInteger(slide.index) &&
              typeof slide.title === 'string' &&
              typeof slide.notes === 'string'
          )
          .map((slide) => ({ index: slide.index, title: slide.title, notes: slide.notes }))
      : undefined
    return {
      version: 1,
      kind: 'media',
      path: parsed.path,
      ...(slides ? { presentation: { slides } } : {})
    }
  } catch {
    return { version: 1, kind: 'media', path: fallback }
  }
}
