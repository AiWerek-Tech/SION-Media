import { useProjectionStore } from '@renderer/store/useProjectionStore'
import type { PowerPointBridgeSourceState } from '@renderer/store/usePowerPointBridgeStore'
import type { SlideData } from '@renderer/types'
import { executeRuntimeCommand } from '@renderer/utils/runtimeCommandBus'

function buildPowerPointBridgeProjection(source: PowerPointBridgeSourceState): {
  slides: SlideData[]
  meta: { hymnalCode: string; hymnalName: string; songBackgroundConfig: string }
} {
  const slideNumber = Math.max(1, source.slideIndex + 1)
  return {
    slides: [
      {
        contentType: 'custom',
        songId: null,
        slideIndex: source.slideIndex,
        text: '',
        sectionLabel: `${source.title || 'PowerPoint Live'} · ${slideNumber}/${source.totalSlides}`,
        speakerNotes: source.notes
      }
    ],
    meta: {
      hymnalCode: 'PPT LIVE',
      hymnalName: source.deckName || source.title || 'PowerPoint Live',
      songBackgroundConfig: JSON.stringify({
        mode: 'image',
        media: { path: source.imagePath },
        opacity: 100,
        blur: 0
      })
    }
  }
}

export function loadPowerPointBridgeSource(
  source: PowerPointBridgeSourceState,
  takeLive = false
): void {
  const { slides, meta } = buildPowerPointBridgeProjection(source)
  useProjectionStore.getState().setSlides(slides, meta)
  if (takeLive) executeRuntimeCommand('PROJ_TAKE_CUE', undefined, 'PRESENTER_REMOTE')
}

export function updateLivePowerPointBridgeFrame(source: PowerPointBridgeSourceState): void {
  const { slides, meta } = buildPowerPointBridgeProjection(source)
  useProjectionStore.getState().updateLiveExternalSourceFrame(slides, meta)
}
