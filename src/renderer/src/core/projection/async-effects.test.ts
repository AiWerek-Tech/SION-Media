/**
 * Async Effects Testing - Core Patterns
 *
 * Tests for essential async effect patterns: cancellation, retry, timeout.
 */

import { describe, it, expect, vi } from 'vitest'
import {
  CancellationToken,
  RetryPolicy,
  TimeoutError,
  withTimeout,
  AsyncOperation
} from './async-effects'

// ============================================================================
// CANCELLATION TOKEN TESTS
// ============================================================================

describe('CancellationToken', () => {
  it('should start uncancelled', () => {
    const token = new CancellationToken()
    expect(token.isCancelled).toBe(false)
  })

  it('should become cancelled after cancel()', () => {
    const token = new CancellationToken()
    token.cancel()
    expect(token.isCancelled).toBe(true)
  })

  it('should call cancel callbacks', () => {
    const token = new CancellationToken()
    const callback = vi.fn()

    token.onCancel(callback)
    token.cancel()

    expect(callback).toHaveBeenCalledTimes(1)
  })

  it('should throw when throwIfCancelled is called on cancelled token', () => {
    const token = new CancellationToken()
    token.cancel()

    expect(() => token.throwIfCancelled()).toThrow('Operation cancelled')
  })
})

// ============================================================================
// RETRY POLICY TESTS
// ============================================================================

describe('RetryPolicy', () => {
  it('should succeed on first attempt', async () => {
    const policy = new RetryPolicy({ maxAttempts: 3, delayMs: 1 })
    const operation = vi.fn().mockResolvedValue('success')

    const result = await policy.execute(operation)

    expect(result).toBe('success')
    expect(operation).toHaveBeenCalledTimes(1)
  })

  it('should retry on failure and succeed', async () => {
    const policy = new RetryPolicy({ maxAttempts: 3, delayMs: 1 })
    const operation = vi.fn().mockRejectedValueOnce(new Error('fail1')).mockResolvedValue('success')

    const result = await policy.execute(operation)

    expect(result).toBe('success')
    expect(operation).toHaveBeenCalledTimes(2)
  })

  it('should fail after max attempts', async () => {
    const policy = new RetryPolicy({ maxAttempts: 2, delayMs: 1 })
    const operation = vi.fn().mockRejectedValue(new Error('persistent failure'))

    await expect(policy.execute(operation)).rejects.toThrow('persistent failure')
    expect(operation).toHaveBeenCalledTimes(2)
  })
})

// ============================================================================
// TIMEOUT TESTS
// ============================================================================

describe('withTimeout', () => {
  it('should resolve when operation completes before timeout', async () => {
    const promise = new Promise((resolve) => setTimeout(() => resolve('success'), 10))
    const result = await withTimeout(promise, 50)

    expect(result).toBe('success')
  })

  it('should reject with TimeoutError when operation times out', async () => {
    const promise = new Promise((resolve) => setTimeout(() => resolve('success'), 50))
    const timeoutPromise = withTimeout(promise, 10)

    await expect(timeoutPromise).rejects.toThrow(TimeoutError)
  })
})

// ============================================================================
// ASYNC OPERATION TESTS
// ============================================================================

describe('AsyncOperation', () => {
  it('should start in idle state', () => {
    const operation = new AsyncOperation()
    expect(operation.currentState).toEqual({ status: 'idle' })
  })

  it('should transition to fulfilled on success', async () => {
    const operation = new AsyncOperation()

    const result = await operation.execute(async () => 'success')

    expect(result).toBe('success')
    expect(operation.currentState).toEqual({ status: 'fulfilled', value: 'success' })
  })

  it('should transition to rejected on failure', async () => {
    const operation = new AsyncOperation()

    const error = new Error('test error')
    await expect(
      operation.execute(async () => {
        throw error
      })
    ).rejects.toThrow(error)

    expect(operation.currentState).toEqual({ status: 'rejected', error })
  })

  it('should cancel operation', async () => {
    const operation = new AsyncOperation()

    const promise = operation.execute(async (token) => {
      await new Promise((resolve) => setTimeout(resolve, 20))
      token.throwIfCancelled()
      return 'success'
    })

    operation.cancel()

    await expect(promise).rejects.toThrow('cancelled')
  })
})
