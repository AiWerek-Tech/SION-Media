/**
 * Async Effect Foundation
 *
 * Patterns for handling asynchronous operations in projection system:
 * - Cancellation tokens
 * - Retry logic
 * - Timeout handling
 * - Pending state management
 * - Effect composition
 */

import { logger } from '@renderer/utils/logger'

// ============================================================================
// CANCELLATION TOKENS
// ============================================================================

export class CancellationToken {
  private cancelled = false
  private cancelCallbacks: (() => void)[] = []

  get isCancelled(): boolean {
    return this.cancelled
  }

  cancel(): void {
    if (this.cancelled) return

    this.cancelled = true
    this.cancelCallbacks.forEach((callback) => {
      try {
        callback()
      } catch (error) {
        logger.error('[CancellationToken] Cancel callback failed:', error)
      }
    })
    this.cancelCallbacks = []
  }

  onCancel(callback: () => void): void {
    if (this.cancelled) {
      callback()
      return
    }
    this.cancelCallbacks.push(callback)
  }

  throwIfCancelled(): void {
    if (this.cancelled) {
      throw new Error('Operation cancelled')
    }
  }
}

export class CancellationTokenSource {
  readonly token = new CancellationToken()

  cancel(): void {
    this.token.cancel()
  }
}

// ============================================================================
// RETRY LOGIC
// ============================================================================

export interface RetryOptions {
  maxAttempts: number
  delayMs: number
  backoffMultiplier?: number
  shouldRetry?: (error: Error) => boolean
}

export class RetryPolicy {
  constructor(private options: RetryOptions) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    let lastError: Error
    let delay = this.options.delayMs

    for (let attempt = 1; attempt <= this.options.maxAttempts; attempt++) {
      try {
        return await operation()
      } catch (error) {
        lastError = error as Error

        if (attempt === this.options.maxAttempts) {
          break
        }

        if (this.options.shouldRetry && !this.options.shouldRetry(lastError)) {
          break
        }

        logger.warn(
          `[RetryPolicy] Attempt ${attempt} failed, retrying in ${delay}ms:`,
          lastError.message
        )
        await this.delay(delay)
        delay *= this.options.backoffMultiplier ?? 2
      }
    }

    throw lastError!
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}

// ============================================================================
// TIMEOUT HANDLING
// ============================================================================

export class TimeoutError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'TimeoutError'
  }
}

export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  cancellationToken?: CancellationToken
): Promise<T> {
  return new Promise((resolve, reject) => {
    const cleanup = (): void => {
      clearTimeout(timeoutId)
      cancellationToken?.cancel()
    }

    const timeoutId = window.setTimeout(() => {
      cleanup()
      reject(new TimeoutError(`Operation timed out after ${timeoutMs}ms`))
    }, timeoutMs)

    const handleResolve = (value: T): void => {
      cleanup()
      resolve(value)
    }

    const handleReject = (error: Error): void => {
      cleanup()
      reject(error)
    }

    promise.then(handleResolve, handleReject)

    cancellationToken?.onCancel(() => {
      cleanup()
      reject(new Error('Operation cancelled'))
    })
  })
}

// ============================================================================
// PENDING STATE MANAGEMENT
// ============================================================================

export type PendingState<T = unknown> =
  | { status: 'idle' }
  | { status: 'pending' }
  | { status: 'fulfilled'; value: T }
  | { status: 'rejected'; error: Error }

export class AsyncOperation<T = unknown> {
  private state: PendingState<T> = { status: 'idle' }
  private cancellationTokenSource?: CancellationTokenSource

  get currentState(): PendingState<T> {
    return this.state
  }

  async execute(
    operation: (token: CancellationToken) => Promise<T>,
    options: {
      timeoutMs?: number
      retryOptions?: RetryOptions
    } = {}
  ): Promise<T> {
    if (this.state.status === 'pending') {
      throw new Error('Operation already in progress')
    }

    this.cancellationTokenSource = new CancellationTokenSource()
    this.state = { status: 'pending' }

    try {
      let promise = operation(this.cancellationTokenSource.token)

      if (options.timeoutMs) {
        promise = withTimeout(promise, options.timeoutMs, this.cancellationTokenSource.token)
      }

      if (options.retryOptions) {
        const retryPolicy = new RetryPolicy(options.retryOptions)
        promise = retryPolicy.execute(() => promise)
      }

      const result = await promise
      this.state = { status: 'fulfilled', value: result }
      return result
    } catch (error) {
      this.state = { status: 'rejected', error: error as Error }
      throw error
    }
  }

  cancel(): void {
    this.cancellationTokenSource?.cancel()
    if (this.state.status === 'pending') {
      this.state = { status: 'rejected', error: new Error('Operation cancelled') }
    }
  }

  reset(): void {
    this.cancel()
    this.state = { status: 'idle' }
  }
}

// ============================================================================
// EFFECT COMPOSITION
// ============================================================================

export interface AsyncEffect<T = unknown> {
  id: string
  execute: (token: CancellationToken) => Promise<T>
  options?: {
    timeoutMs?: number
    retryOptions?: RetryOptions
  }
}

export class EffectExecutor {
  private activeOperations = new Map<string, AsyncOperation>()

  async executeEffect<T>(effect: AsyncEffect<T>): Promise<T> {
    // Cancel any existing operation with same ID
    this.cancelEffect(effect.id)

    const operation = new AsyncOperation<T>()
    this.activeOperations.set(effect.id, operation)

    try {
      const result = await operation.execute(effect.execute, effect.options ?? {})
      return result
    } finally {
      this.activeOperations.delete(effect.id)
    }
  }

  cancelEffect(id: string): void {
    const operation = this.activeOperations.get(id)
    if (operation) {
      operation.cancel()
      this.activeOperations.delete(id)
    }
  }

  cancelAll(): void {
    for (const operation of this.activeOperations.values()) {
      operation.cancel()
    }
    this.activeOperations.clear()
  }

  getEffectState<T>(id: string): PendingState<T> | undefined {
    return this.activeOperations.get(id)?.currentState as PendingState<T> | undefined
  }
}

// ============================================================================
// PROJECTION-SPECIFIC ASYNC PATTERNS
// ============================================================================

export interface MediaLoadEffect extends AsyncEffect<HTMLImageElement | HTMLVideoElement> {
  type: 'media-load'
  url: string
  mediaType: 'image' | 'video'
}

export interface SlideTransitionEffect extends AsyncEffect<void> {
  type: 'slide-transition'
  fromSlideIndex: number
  toSlideIndex: number
  transitionType: 'fade' | 'slide' | 'instant'
}

export interface OutputSyncEffect extends AsyncEffect<void> {
  type: 'output-sync'
  targetOutputs: string[]
  syncData: unknown
}

// Projection-specific effect executor
export class ProjectionEffectExecutor extends EffectExecutor {
  async loadMedia(
    url: string,
    mediaType: 'image' | 'video'
  ): Promise<HTMLImageElement | HTMLVideoElement> {
    const effect: MediaLoadEffect = {
      id: `media-load-${url}`,
      type: 'media-load',
      url,
      mediaType,
      execute: async (token) => {
        token.throwIfCancelled()

        return new Promise((resolve, reject) => {
          let element: HTMLImageElement | HTMLVideoElement

          if (mediaType === 'image') {
            element = new Image()
          } else {
            element = document.createElement('video')
          }

          element.onload = () => resolve(element)
          element.onerror = () => reject(new Error(`Failed to load ${mediaType}: ${url}`))

          element.src = url

          token.onCancel(() => {
            element.src = '' // Cancel loading
            reject(new Error('Media load cancelled'))
          })
        })
      },
      options: {
        timeoutMs: 10000, // 10 second timeout
        retryOptions: {
          maxAttempts: 3,
          delayMs: 1000,
          shouldRetry: (error) => !error.message.includes('cancelled')
        }
      }
    }

    return this.executeEffect(effect)
  }

  async transitionSlides(
    fromIndex: number,
    toIndex: number,
    transitionType: 'fade' | 'slide' | 'instant' = 'fade'
  ): Promise<void> {
    const effect: SlideTransitionEffect = {
      id: `slide-transition-${fromIndex}-${toIndex}`,
      type: 'slide-transition',
      fromSlideIndex: fromIndex,
      toSlideIndex: toIndex,
      transitionType,
      execute: async (token) => {
        token.throwIfCancelled()

        // Simulate transition timing
        const duration = transitionType === 'instant' ? 0 : 400
        await new Promise((resolve) => setTimeout(resolve, duration))

        token.throwIfCancelled()
      }
    }

    return this.executeEffect(effect)
  }
}

// ============================================================================
// EXPORTS (INDIVIDUAL EXPORTS ABOVE)
// ============================================================================

// All exports are done individually above
