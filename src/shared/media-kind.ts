export type LocalMediaKind = 'image' | 'video' | 'pdf' | 'presentation' | 'unknown'

const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'])
const VIDEO_EXTENSIONS = new Set(['.mp4', '.webm', '.mov', '.mkv', '.avi', '.ogg'])
const PDF_EXTENSIONS = new Set(['.pdf'])
const PRESENTATION_EXTENSIONS = new Set(['.ppt', '.pptx'])

function getExtension(path: string): string {
  const cleanPath = path.split(/[?#]/)[0]?.trim().toLowerCase() || ''
  const match = cleanPath.match(/(\.[a-z0-9]+)$/)
  return match?.[1] || ''
}

export function classifyLocalMediaPath(path: string): LocalMediaKind {
  const extension = getExtension(path)
  if (IMAGE_EXTENSIONS.has(extension)) return 'image'
  if (VIDEO_EXTENSIONS.has(extension)) return 'video'
  if (PDF_EXTENSIONS.has(extension)) return 'pdf'
  if (PRESENTATION_EXTENSIONS.has(extension)) return 'presentation'
  return 'unknown'
}

export function resolveMediaKind(input: {
  path: string
  hasPresentationPackage?: boolean
}): LocalMediaKind {
  if (input.hasPresentationPackage) return 'presentation'
  return classifyLocalMediaPath(input.path)
}

export function getProjectionMediaMode(kind: LocalMediaKind): 'image' | 'video' | 'pdf' {
  if (kind === 'video') return 'video'
  if (kind === 'pdf' || kind === 'presentation') return 'pdf'
  return 'image'
}

export function isPagedMediaKind(kind: LocalMediaKind): boolean {
  return kind === 'pdf' || kind === 'presentation'
}

export function getMediaKindLabel(kind: LocalMediaKind): string {
  switch (kind) {
    case 'image':
      return 'Gambar'
    case 'video':
      return 'Video'
    case 'pdf':
      return 'PDF'
    case 'presentation':
      return 'PPT Lokal'
    default:
      return 'Media'
  }
}

export function getMediaKindCapability(kind: LocalMediaKind): string {
  switch (kind) {
    case 'image':
      return 'Gambar statis'
    case 'video':
      return 'Video dengan audio'
    case 'pdf':
      return 'Multi-halaman'
    case 'presentation':
      return 'Slide + catatan'
    default:
      return 'Media lokal'
  }
}
