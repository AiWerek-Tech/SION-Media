import { beforeEach, describe, expect, test, vi } from 'vitest'
import type { PowerPointBridgeSourceState } from '@renderer/store/usePowerPointBridgeStore'

const setSlides = vi.fn()
const updateLiveExternalSourceFrame = vi.fn()
const executeRuntimeCommand = vi.fn()

vi.mock('@renderer/store/useProjectionStore', () => ({
  useProjectionStore: {
    getState: () => ({
      setSlides,
      updateLiveExternalSourceFrame
    })
  }
}))

vi.mock('@renderer/utils/runtimeCommandBus', () => ({
  executeRuntimeCommand
}))

describe('PowerPoint bridge live update behavior', () => {
  beforeEach(() => {
    setSlides.mockClear()
    updateLiveExternalSourceFrame.mockClear()
    executeRuntimeCommand.mockClear()
  })

  const source: PowerPointBridgeSourceState = {
    deviceId: 'device-a',
    deviceName: 'Laptop Worship',
    imagePath: 'http://127.0.0.1:3121/api/presentation-frame/current',
    nextImagePath: 'http://127.0.0.1:3121/api/presentation-frame/next',
    title: 'Slide 1',
    nextTitle: 'Slide 2',
    notes: 'Speaker notes',
    deckName: 'Service.pptx',
    slideIndex: 0,
    totalSlides: 10,
    updatedAt: 1784162000000
  }

  test('performs TAKE only for the first explicit live load', async () => {
    const { loadPowerPointBridgeSource } = await import('../powerPointBridge')

    loadPowerPointBridgeSource(source, true)

    expect(setSlides).toHaveBeenCalledTimes(1)
    expect(executeRuntimeCommand).toHaveBeenCalledTimes(1)
    expect(executeRuntimeCommand).toHaveBeenCalledWith(
      'PROJ_TAKE_CUE',
      undefined,
      'PRESENTER_REMOTE'
    )
  })

  test('updates an active live frame without repeated TAKE', async () => {
    const { updateLivePowerPointBridgeFrame } = await import('../powerPointBridge')

    updateLivePowerPointBridgeFrame(source)

    expect(updateLiveExternalSourceFrame).toHaveBeenCalledTimes(1)
    expect(executeRuntimeCommand).not.toHaveBeenCalled()
  })
})
