import { render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { DecodedImageBackground } from '../AtmosphereRenderer'

type Deferred = {
  promise: Promise<void>
  resolve: () => void
  reject: (error: Error) => void
}

const createDeferred = (): Deferred => {
  let resolve!: () => void
  let reject!: (error: Error) => void
  const promise = new Promise<void>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

describe('DecodedImageBackground', () => {
  const decodeByBlobUrl = new Map<string, Deferred>()
  const objectUrlBySource = new Map<string, string>()
  let objectUrlCounter = 0

  beforeEach(() => {
    decodeByBlobUrl.clear()
    objectUrlBySource.clear()
    objectUrlCounter = 0

    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => ({
        ok: true,
        blob: async () => ({ sourceUrl: url })
      }))
    )

    vi.stubGlobal(
      'Image',
      class MockImage {
        src = ''
        decode(): Promise<void> {
          const deferred = decodeByBlobUrl.get(this.src)
          return deferred ? deferred.promise : Promise.resolve()
        }
      }
    )

    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: vi.fn((blob: { sourceUrl: string }) => {
        const objectUrl = `blob:sion-frame-${++objectUrlCounter}`
        objectUrlBySource.set(blob.sourceUrl, objectUrl)
        decodeByBlobUrl.set(objectUrl, createDeferred())
        return objectUrl
      })
    })

    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: vi.fn()
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  test('fetches, decodes, and atomically presents the prepared object URL', async () => {
    render(
      <DecodedImageBackground
        path="http://127.0.0.1:3121/api/presentation-frame/current"
        fit="contain"
        transitionDuration={0}
      />
    )

    await waitFor(() => expect(objectUrlBySource.size).toBe(1))
    const objectUrl = objectUrlBySource.get('http://127.0.0.1:3121/api/presentation-frame/current')
    expect(objectUrl).toBeTruthy()

    decodeByBlobUrl.get(objectUrl!)?.resolve()

    await waitFor(() =>
      expect(screen.getByTestId('decoded-image-background')).toHaveAttribute(
        'data-image-url',
        objectUrl
      )
    )
  })

  test('keeps the previous frame visible when the next decode fails', async () => {
    const { rerender } = render(
      <DecodedImageBackground
        path="http://127.0.0.1:3121/api/presentation-frame/first"
        fit="cover"
        transitionDuration={0}
      />
    )

    await waitFor(() =>
      expect(objectUrlBySource.has('http://127.0.0.1:3121/api/presentation-frame/first')).toBe(true)
    )
    const firstObjectUrl = objectUrlBySource.get(
      'http://127.0.0.1:3121/api/presentation-frame/first'
    )!
    decodeByBlobUrl.get(firstObjectUrl)?.resolve()

    await waitFor(() =>
      expect(screen.getByTestId('decoded-image-background')).toHaveAttribute(
        'data-image-url',
        firstObjectUrl
      )
    )

    rerender(
      <DecodedImageBackground
        path="http://127.0.0.1:3121/api/presentation-frame/broken"
        fit="cover"
        transitionDuration={0}
      />
    )

    await waitFor(() =>
      expect(objectUrlBySource.has('http://127.0.0.1:3121/api/presentation-frame/broken')).toBe(
        true
      )
    )
    const brokenObjectUrl = objectUrlBySource.get(
      'http://127.0.0.1:3121/api/presentation-frame/broken'
    )!
    decodeByBlobUrl.get(brokenObjectUrl)?.reject(new Error('decode failed'))

    await waitFor(() =>
      expect(screen.getByTestId('decoded-image-background')).toHaveAttribute(
        'data-image-url',
        firstObjectUrl
      )
    )
  })

  test('rejects a stale decoded frame after a newer frame has been requested', async () => {
    const { rerender } = render(
      <DecodedImageBackground
        path="http://127.0.0.1:3121/api/presentation-frame/stale"
        fit="cover"
        transitionDuration={0}
      />
    )

    await waitFor(() =>
      expect(objectUrlBySource.has('http://127.0.0.1:3121/api/presentation-frame/stale')).toBe(true)
    )
    const staleObjectUrl = objectUrlBySource.get(
      'http://127.0.0.1:3121/api/presentation-frame/stale'
    )!

    rerender(
      <DecodedImageBackground
        path="http://127.0.0.1:3121/api/presentation-frame/latest"
        fit="cover"
        transitionDuration={0}
      />
    )

    await waitFor(() =>
      expect(objectUrlBySource.has('http://127.0.0.1:3121/api/presentation-frame/latest')).toBe(
        true
      )
    )
    const latestObjectUrl = objectUrlBySource.get(
      'http://127.0.0.1:3121/api/presentation-frame/latest'
    )!

    decodeByBlobUrl.get(latestObjectUrl)?.resolve()
    decodeByBlobUrl.get(staleObjectUrl)?.resolve()

    await waitFor(() =>
      expect(screen.getByTestId('decoded-image-background')).toHaveAttribute(
        'data-image-url',
        latestObjectUrl
      )
    )

    expect(URL.revokeObjectURL).toHaveBeenCalledWith(staleObjectUrl)
  })
})
