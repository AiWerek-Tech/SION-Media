import { describe, expect, it, vi } from 'vitest'
import type { WebContents } from 'electron'
import type { ScraperProgressPayload, ScraperStartRequest } from '../types'
import { ScraperTaskManager } from './ScraperTaskManager'

type TaskState = ScraperProgressPayload['state']

function makeRequest(): ScraperStartRequest {
  return {
    providerId: 'lagu_sion_play',
    targetHymnalId: 1,
    startNumber: 1,
    endNumber: 1,
    concurrency: 1,
    retryCount: 0,
    delayMs: 0,
    conflictPolicy: 'skip'
  }
}

class FakeTask {
  request: ScraperStartRequest
  private state: TaskState = 'IDLE'
  private failedNumbers: string[] = []
  private runDeferred: {
    promise: Promise<{ imported: number; skipped: number; failed: number }>
    resolve: () => void
  } | null = null

  constructor(request: ScraperStartRequest) {
    this.request = request
  }

  setState(state: TaskState): void {
    this.state = state
  }

  setFailedNumbers(nums: string[]): void {
    this.failedNumbers = nums
  }

  getSnapshot(): ScraperProgressPayload {
    return {
      taskId: 'fake',
      providerId: this.request.providerId,
      state: this.state,
      total: 0,
      processed: 0,
      success: 0,
      failed: 0,
      skipped: 0,
      retries: 0,
      songsPerSec: 0,
      etaSec: null,
      recentLogs: [],
      recentSongUpdates: [],
      failedNumbers: this.failedNumbers
    }
  }

  getFailedNumbers(): string[] {
    return this.failedNumbers
  }

  abort(): void {
    this.state = 'ABORTED'
  }

  async scrapeOnly(): Promise<never[]> {
    this.state = 'COMPLETED'
    return []
  }

  async run(): Promise<{ imported: number; skipped: number; failed: number }> {
    if (!this.runDeferred) {
      let resolveFn: (() => void) | null = null
      const promise = new Promise<{ imported: number; skipped: number; failed: number }>(
        (resolve) => {
          resolveFn = () => {
            this.state = 'COMPLETED'
            resolve({ imported: 0, skipped: 0, failed: 0 })
          }
        }
      )
      this.runDeferred = { promise, resolve: resolveFn! }
    }
    return await this.runDeferred.promise
  }

  resolveRun(): void {
    this.runDeferred?.resolve()
  }
}

function tick(): Promise<void> {
  return new Promise((r) => setTimeout(r, 0))
}

describe('ScraperTaskManager lifecycle', () => {
  it('allows start -> complete -> start again', async () => {
    const send = vi.fn()
    const wc = { send } as unknown as WebContents

    const tasks: FakeTask[] = []
    const mgr = new ScraperTaskManager(
      () => wc,
      (_taskId, request) => {
        const t = new FakeTask(request)
        t.setState('RUNNING')
        tasks.push(t)
        return t
      }
    )

    mgr.start(makeRequest())
    await tick()

    // complete first run and let manager cleanup
    tasks[0]?.resolveRun()
    await tick()

    // should be able to start again after completion cleanup
    mgr.start(makeRequest())
    await tick()

    expect(tasks.length).toBe(2)
    expect(send).toHaveBeenCalled()
  })

  it('abort() returns true when task exists', async () => {
    const wc = { send: vi.fn() } as unknown as WebContents

    let taskRef!: FakeTask
    const mgr = new ScraperTaskManager(
      () => wc,
      (_taskId, request) => {
        const t = new FakeTask(request)
        t.setState('RUNNING')
        taskRef = t
        return t
      }
    )

    mgr.start(makeRequest())
    await tick()

    expect(mgr.abort()).toBe(true)
    expect(taskRef.getSnapshot().state).toBe('ABORTED')
  })

  it('retryFailed() restarts only when not running and there are failed items', async () => {
    const wc = { send: vi.fn() } as unknown as WebContents

    let first = true
    let firstTask!: FakeTask
    const mgr = new ScraperTaskManager(
      () => wc,
      (_taskId, request) => {
        const t = new FakeTask(request)
        if (first) {
          first = false
          t.setState('RUNNING')
          t.setFailedNumbers(['12', '15'])
          firstTask = t
        } else {
          t.setState('RUNNING')
        }
        return t
      }
    )

    mgr.start(makeRequest())
    await tick()

    // Simulate task stopped (but still present) with failures
    firstTask.setState('COMPLETED')

    const res = mgr.retryFailed()
    expect(res.restarted).toBe(true)
  })

  it('dryRun clears active task in finally', async () => {
    const wc = { send: vi.fn() } as unknown as WebContents
    const mgr = new ScraperTaskManager(
      () => wc,
      (_taskId, request) => new FakeTask(request)
    )

    await mgr.dryRun(makeRequest())

    // if not cleared, this would throw due to hasRunningTask potentially misbehaving in future changes
    expect(() => mgr.start(makeRequest())).not.toThrow()
  })
})
