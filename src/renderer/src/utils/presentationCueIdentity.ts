import type { SlideData } from '@renderer/types'

export function isSamePresentationCue(
  cue: SlideData | null | undefined,
  program: SlideData | null | undefined,
  cueBackgroundConfig: string,
  programBackgroundConfig: string
): boolean {
  return Boolean(
    cue &&
    program &&
    cue.songId === program.songId &&
    cue.playlistItemId === program.playlistItemId &&
    cue.slideIndex === program.slideIndex &&
    cue.text === program.text &&
    cue.sectionLabel === program.sectionLabel &&
    cue.pdfPath === program.pdfPath &&
    cueBackgroundConfig === programBackgroundConfig
  )
}
