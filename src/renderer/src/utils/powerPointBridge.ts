import { useProjectionStore } from '@renderer/store/useProjectionStore'
import type { PowerPointBridgeSourceState } from '@renderer/store/usePowerPointBridgeStore'
import { executeRuntimeCommand } from '@renderer/utils/runtimeCommandBus'

export function loadPowerPointBridgeSource(
  source: PowerPointBridgeSourceState,
  takeLive = false
): void {
  const slideNumber = Math.max(1, source.slideIndex + 1)
  useProjectionStore.getState().setSlides(
    [
      {
        contentType: 'custom',
        songId: null,
        slideIndex: source.slideIndex,
        text: '',
        sectionLabel: `${source.title || 'PowerPoint Live'} · ${slideNumber}/${source.totalSlides}`,
        speakerNotes: source.notes
      }
    ],
    {
      hymnalCode: 'PPT LIVE',
      hymnalName: source.deckName || source.title || 'PowerPoint Live',
      songBackgroundConfig: JSON.stringify({
        mode: 'image',
        media: { path: source.imagePath },
        opacity: 100,
        blur: 0
      })
    }
  )
  if (takeLive) executeRuntimeCommand('PROJ_TAKE_CUE', undefined, 'PRESENTER_REMOTE')
}
