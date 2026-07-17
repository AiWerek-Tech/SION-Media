import { beforeEach, describe, expect, test } from 'vitest'
import {
  usePowerPointBridgeStore,
  type PowerPointBridgeSourceState
} from '../usePowerPointBridgeStore'

function makeSource(deviceId: string, slideIndex: number): PowerPointBridgeSourceState {
  return {
    deviceId,
    deviceName: deviceId === 'device-a' ? 'Laptop A' : 'Laptop B',
    deckName: `${deviceId}.pptx`,
    title: `Slide ${slideIndex + 1}`,
    notes: '',
    imagePath: `http://127.0.0.1:41732/api/presentation-frame/${deviceId}-${slideIndex}`,
    nextImagePath: null,
    nextTitle: null,
    slideIndex,
    totalSlides: 12,
    updatedAt: 1784162000000 + slideIndex
  }
}

describe('usePowerPointBridgeStore multi-device ownership', () => {
  beforeEach(() => {
    usePowerPointBridgeStore.setState({
      source: null,
      sourcesByDevice: {},
      activeDeviceId: null,
      autoPreview: true,
      autoLive: false,
      followMode: 'FOLLOW_PREVIEW'
    })
  })

  test('keeps first device as active when another device sends frames', () => {
    const store = usePowerPointBridgeStore.getState()
    const deviceA = makeSource('device-a', 0)
    const deviceB = makeSource('device-b', 4)

    store.setSource(deviceA)
    usePowerPointBridgeStore.getState().setSource(deviceB)

    const state = usePowerPointBridgeStore.getState()
    expect(state.activeDeviceId).toBe('device-a')
    expect(state.source?.deviceId).toBe('device-a')
    expect(state.sourcesByDevice['device-b'].slideIndex).toBe(4)
  })

  test('switches active source only after operator selects another device', () => {
    const store = usePowerPointBridgeStore.getState()
    store.setSource(makeSource('device-a', 1))
    usePowerPointBridgeStore.getState().setSource(makeSource('device-b', 5))

    usePowerPointBridgeStore.getState().selectDevice('device-b')

    const state = usePowerPointBridgeStore.getState()
    expect(state.activeDeviceId).toBe('device-b')
    expect(state.source?.deviceId).toBe('device-b')
    expect(state.source?.slideIndex).toBe(5)
  })

  test('disconnecting active device falls back to the newest remaining device', () => {
    const store = usePowerPointBridgeStore.getState()
    store.setSource(makeSource('device-a', 2))
    usePowerPointBridgeStore.getState().setSource(makeSource('device-b', 7))
    usePowerPointBridgeStore.getState().selectDevice('device-b')

    usePowerPointBridgeStore.getState().removeDevice('device-b')

    const state = usePowerPointBridgeStore.getState()
    expect(state.activeDeviceId).toBe('device-a')
    expect(state.source?.deviceId).toBe('device-a')
    expect(state.sourcesByDevice['device-b']).toBeUndefined()
  })
})
