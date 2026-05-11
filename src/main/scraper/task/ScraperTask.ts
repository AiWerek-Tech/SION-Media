import type {
  ScrapedSong,
  ScraperLogLine,
  ScraperProgressPayload,
  ScraperSongProgress,
  ScraperStartRequest
} from '../types'
import { getProviderById } from '../providerRegistry'
import { computeBackoffMs } from './backoff'
import { SimpleQueue } from './queue'
import { importScrapedSongs } from '../dbIngestion'
import { ScraperError } from '../../../shared/errors/scraperErrors'

function clampInt(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.floor(v)))
}

export class ScraperTask {
  readonly taskId: string
  readonly request: ScraperStartRequest
  private abortController = new AbortController()

  private state: ScraperProgressPayload['state'] = 'IDLE'
  private startedAt = 0

  private total = 0
  private processed = 0
  private success = 0
  private failed = 0
  private skipped = 0
  private retries = 0

  private recentLogs: ScraperLogLine[] = []
  private recentSongUpdates: ScraperSongProgress[] = []

  private songs: ScrapedSong[] = []
  private failedNumbers: Set<string> = new Set()

  constructor(taskId: string, request: ScraperStartRequest) {
    this.taskId = taskId
    this.request = {
      ...request,
      concurrency: clampInt(request.concurrency, 1, 12),
      retryCount: clampInt(request.retryCount, 0, 10),
      delayMs: clampInt(request.delayMs, 0, 30_000)
    }
  }

  getSignal(): AbortSignal {
    return this.abortController.signal
  }

  abort(): void {
    if (this.state !== 'RUNNING') return
    this.state = 'ABORTED'
    this.log({ level: 'WARN', message: 'Task aborted by operator' })
    this.abortController.abort()
  }

  getFailedNumbers(): string[] {
    return Array.from(this.failedNumbers)
  }

  getSongs(): ScrapedSong[] {
    return this.songs.slice()
  }

  getStartedAt(): number {
    return this.startedAt
  }

  getSnapshot(): ScraperProgressPayload {
    const durationSec = this.startedAt > 0 ? (Date.now() - this.startedAt) / 1000 : 0
    const songsPerSec = durationSec > 0 ? this.processed / durationSec : 0
    const remaining = Math.max(0, this.total - this.processed)
    const etaSec = songsPerSec > 0 ? Math.ceil(remaining / songsPerSec) : null

    return {
      taskId: this.taskId,
      providerId: this.request.providerId,
      state: this.state,
      total: this.total,
      processed: this.processed,
      success: this.success,
      failed: this.failed,
      skipped: this.skipped,
      retries: this.retries,
      songsPerSec: Number.isFinite(songsPerSec) ? Math.round(songsPerSec * 100) / 100 : 0,
      etaSec,
      recentLogs: this.recentLogs.slice(-200),
      recentSongUpdates: this.recentSongUpdates.slice(-60),
      failedNumbers: this.getFailedNumbers()
    }
  }

  private pushSongUpdate(update: ScraperSongProgress): void {
    this.recentSongUpdates.push(update)
    if (this.recentSongUpdates.length > 200) this.recentSongUpdates.shift()
  }

  log(line: Omit<ScraperLogLine, 'ts'> & { ts?: number }): void {
    this.recentLogs.push({ ts: line.ts ?? Date.now(), ...line })
    if (this.recentLogs.length > 500) this.recentLogs.shift()
  }

  async scrapeOnly(numbers?: string[]): Promise<ScrapedSong[]> {
    await this.scrape(numbers)
    return this.getSongs()
  }

  async run(numbers?: string[]): Promise<{ imported: number; skipped: number; failed: number }> {
    await this.scrape(numbers)

    if (this.getSignal().aborted) {
      return { imported: 0, skipped: this.skipped, failed: this.failed }
    }

    this.log({
      level: 'INFO',
      phase: 'DB',
      message: `Bulk ingest start (${this.songs.length} items)`
    })

    const imported = importScrapedSongs({
      items: this.songs,
      targetHymnalId: this.request.targetHymnalId,
      conflictPolicy: this.request.conflictPolicy,
      perItemPolicy: this.request.perItemPolicy,
      dryRun: false
    })

    this.log({ level: 'INFO', phase: 'FTS', message: 'FTS index rebuild completed' })

    this.state = 'COMPLETED'

    return {
      imported: imported.inserted + imported.updated_overwrite + imported.updated_append,
      skipped: imported.skipped,
      failed: imported.failed
    }
  }

  private async scrape(numbers?: string[]): Promise<void> {
    const provider = getProviderById(this.request.providerId)

    if (this.state === 'RUNNING') throw new Error('Task already running')

    this.state = 'RUNNING'
    this.startedAt = Date.now()
    this.songs = []
    this.failedNumbers = new Set()
    this.recentLogs = []
    this.recentSongUpdates = []
    this.total = 0
    this.processed = 0
    this.success = 0
    this.failed = 0
    this.skipped = 0
    this.retries = 0

    try {
      await provider.validate(this.request.baseUrl)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      const baseUrl = this.request.baseUrl ? ` baseUrl=${this.request.baseUrl}` : ''
      // 404/selector changes are treated as provider breakage (non-retryable).
      if (/(\bHTTP\s+404\b|\b404\b)/i.test(msg)) {
        throw new ScraperError(
          'PROVIDER_BROKEN',
          `Provider validation failed for providerId=${provider.id}${baseUrl}: ${msg}`,
          { retryable: false }
        )
      }
      // Common offline/DNS errors from fetch.
      if (/(ENOTFOUND|EAI_AGAIN|ECONNREFUSED|ECONNRESET|ETIMEDOUT|network|failed to fetch)/i.test(msg)) {
        throw new ScraperError(
          'NETWORK_OFFLINE',
          `Provider validation failed for providerId=${provider.id}${baseUrl}: ${msg}`,
          { retryable: true }
        )
      }

      throw new ScraperError(
        'PROVIDER_BROKEN',
        `Provider validation failed for providerId=${provider.id}${baseUrl}: ${msg}`,
        { retryable: false }
      )
    }

    const rangeNumbers: string[] = numbers
      ? numbers
      : Array.from(
          { length: Math.max(0, this.request.endNumber - this.request.startNumber + 1) },
          (_v, idx) => String(this.request.startNumber + idx)
        )

    const queue = new SimpleQueue(rangeNumbers)
    this.total = rangeNumbers.length

    const workers = Array.from({ length: this.request.concurrency }, () =>
      this.workerLoop(queue, provider)
    )

    await Promise.allSettled(workers)
  }

  private async workerLoop(
    queue: SimpleQueue<string>,
    provider: ReturnType<typeof getProviderById>
  ): Promise<void> {
    while (!queue.isEmpty()) {
      if (this.getSignal().aborted) return
      const n = queue.pop()
      if (n === undefined) return

      this.pushSongUpdate({ number: n, status: 'FETCHING', attempts: 0 })

      let attempt = 0
      let lastErr: string | undefined
      while (attempt <= this.request.retryCount) {
        if (this.getSignal().aborted) return

        const started = Date.now()
        try {
          this.log({
            level: 'INFO',
            phase: 'FETCH',
            message: `[FETCH] LS ${n}...`,
            providerId: provider.id,
            songNumber: n
          })

          const song = await this.fetchWithTimeout(() =>
            provider.fetchSong(n, {
              baseUrl: this.request.baseUrl,
              signal: this.getSignal()
            })
          )

          this.log({
            level: 'INFO',
            phase: 'PARSE',
            message: `[PARSE] Success (${Date.now() - started}ms)`,
            providerId: provider.id,
            songNumber: n
          })

          this.songs.push(song)
          this.success++
          this.processed++
          this.pushSongUpdate({
            number: n,
            status: 'SUCCESS',
            attempts: attempt + 1,
            title: song.title,
            sourceUrl: song.sourceUrl
          })

          await this.sleep(this.request.delayMs)
          break
        } catch (err) {
          if (err instanceof DOMException && err.name === 'AbortError') {
            // AbortController abort
            throw new ScraperError('ABORTED', 'Scraper task aborted', { retryable: false })
          }

          const message = err instanceof Error ? err.message : String(err)
          const msg = message.toLowerCase()
          const codePrefix = msg.includes('timeout')
            ? 'PROVIDER_TIMEOUT'
            : msg.includes('429') || msg.includes('rate limit') || msg.includes('too many')
              ? 'RATE_LIMITED'
              : msg.includes('enotfound') ||
                  msg.includes('eai_again') ||
                  msg.includes('econnreset') ||
                  msg.includes('econnrefused') ||
                  msg.includes('net::err_internet_disconnected')
                ? 'NETWORK_OFFLINE'
                : msg.includes('parse') || msg.includes('invalid html')
                  ? 'PARSE_FAILED'
                  : null

          lastErr = codePrefix ? `[${codePrefix}] ${message}` : message

          attempt++

          if (attempt <= this.request.retryCount) {
            this.retries++
            this.log({
              level: 'WARN',
              phase: 'FETCH',
              message: `Retry ${attempt}/${this.request.retryCount} for ${n}: ${lastErr}`,
              providerId: provider.id,
              songNumber: n
            })
            await this.sleep(computeBackoffMs(this.request.delayMs, attempt))
            continue
          }

          this.failed++
          this.processed++
          this.failedNumbers.add(n)
          this.log({
            level: 'ERROR',
            phase: 'PARSE',
            message: `[PARSE] Failed: ${lastErr}`,
            providerId: provider.id,
            songNumber: n
          })
          this.pushSongUpdate({ number: n, status: 'FAILED', attempts: attempt, error: lastErr })
          break
        }
      }
    }
  }

  private async fetchWithTimeout<T>(fn: () => Promise<T>): Promise<T> {
    const TIMEOUT_MS = 30_000
    let timeoutHandle: NodeJS.Timeout | null = null

    try {
      return await Promise.race([
        fn(),
        new Promise<T>((_resolve, reject) => {
          timeoutHandle = setTimeout(() => {
            reject(new Error('Timeout 30s'))
          }, TIMEOUT_MS)
        })
      ])
    } finally {
      if (timeoutHandle) clearTimeout(timeoutHandle)
    }
  }

  private async sleep(ms: number): Promise<void> {
    const d = Math.max(0, ms)
    if (d === 0) return
    await new Promise((resolve) => setTimeout(resolve, d))
  }
}
