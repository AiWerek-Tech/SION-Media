import type { WebContents } from 'electron'
import { IPC_SCRAPER } from '../../../shared/ipc-channels'
import { getScraperProviders } from '../providerRegistry'
import type {
  PerSongResolutionDecision,
  ScrapedSong,
  ScraperImportSummary,
  ScraperProgressPayload,
  ScraperProviderInfo,
  ScraperStartRequest
} from '../types'
import { ScraperTask } from './ScraperTask'
import { detectConflicts } from '../conflictEngine'
import { importScrapedSongs } from '../dbIngestion'

function makeTaskId(): string {
  return `scrape_${Date.now()}_${Math.random().toString(16).slice(2)}`
}

type ScraperTaskLike = Pick<
  ScraperTask,
  'request' | 'getSnapshot' | 'getFailedNumbers' | 'abort' | 'run' | 'scrapeOnly'
>

export class ScraperTaskManager {
  private activeTask: ScraperTaskLike | null = null
  private progressTimer: NodeJS.Timeout | null = null
  private lastProgressSnapshot: ScraperProgressPayload | null = null

  constructor(
    private readonly targetWebContentsProvider: () => WebContents | null,
    private readonly createTask: (
      taskId: string,
      request: ScraperStartRequest
    ) => ScraperTaskLike = (taskId, request) => new ScraperTask(taskId, request)
    ,
    private readonly onProgressSnapshot: (snapshot: ScraperProgressPayload) => void = () => {}
  ) {}

  private hasRunningTask(): boolean {
    if (!this.activeTask) return false
    return this.activeTask.getSnapshot().state === 'RUNNING'
  }

  getProviders(): ScraperProviderInfo[] {
    return getScraperProviders().map((p) => p.getInfo())
  }

  async preview(providerId: string, input: string, baseUrl?: string): Promise<ScrapedSong> {
    const provider = getScraperProviders().find((p) => p.id === providerId)
    if (!provider) throw new Error(`Unknown provider: ${providerId}`)
    await provider.validate(baseUrl)
    return await provider.fetchSong(input, { baseUrl })
  }

  getActiveSnapshot(): ScraperProgressPayload | null {
    return this.lastProgressSnapshot
  }

  async dryRun(request: ScraperStartRequest): Promise<{
    taskId: string
    items: ScrapedSong[]
    conflicts: ReturnType<typeof detectConflicts>
  }> {
    const taskId = makeTaskId()
    this.activeTask = this.createTask(taskId, request)
    this.startProgressPump()

    try {
      const items = await this.activeTask.scrapeOnly()
      const conflicts = detectConflicts({ targetHymnalId: request.targetHymnalId, items })
      return { taskId, items, conflicts }
    } finally {
      this.stopProgressPump()
      this.pushProgress()
      this.activeTask = null
    }
  }

  async importFromDryRun(params: {
    taskId: string
    request: ScraperStartRequest
    items: ScrapedSong[]
    decisions: Record<string, PerSongResolutionDecision>
    defaultAction: 'skip' | 'overwrite' | 'rename' | 'merge_metadata'
  }): Promise<ScraperImportSummary> {
    const startedAt = Date.now()

    // Create audit record
    const {
      createScraperAudit,
      completeScraperAudit,
      addScraperAuditItem,
      getSongForConflictByNumber
    } = await import('../../database')

    const auditId = createScraperAudit({
      taskId: params.taskId,
      providerId: params.request.providerId,
      targetHymnalId: params.request.targetHymnalId,
      rangeStart: String(params.request.startNumber),
      rangeEnd: String(params.request.endNumber)
    })

    const toImport: ScrapedSong[] = []
    let skipped = 0
    let overwritten = 0
    let renamed = 0
    let merged = 0
    let criticalConflicts = 0

    const conflicts = detectConflicts({
      targetHymnalId: params.request.targetHymnalId,
      items: params.items
    })

    const conflictMap = new Map(conflicts.map((c) => [c.key, c]))
    criticalConflicts = conflicts.filter((c) => c.severity === 'CRITICAL').length

    for (const s of params.items) {
      const key = `${params.request.targetHymnalId}:${String(s.sourceSongNumber ?? '').trim()}`
      const decision = params.decisions[key]
      const action = decision?.action ?? params.defaultAction
      const conflict = conflictMap.get(key)

      // Log each item decision to audit
      const existingSong =
        conflict?.existing ??
        getSongForConflictByNumber(params.request.targetHymnalId, String(s.sourceSongNumber ?? ''))

      addScraperAuditItem({
        auditId,
        songNumber: String(s.sourceSongNumber ?? ''),
        songTitle: s.title,
        action,
        conflictType: conflict?.type,
        conflictSeverity: conflict?.severity,
        oldData: existingSong
          ? JSON.stringify({ title: existingSong.title, lyrics_raw: existingSong.lyrics_raw })
          : undefined,
        newData: JSON.stringify({ title: s.title, lyrics_raw: s.lyrics_raw })
      })

      if (action === 'skip') {
        skipped++
        continue
      }

      if (action === 'rename') {
        renamed++
        toImport.push({ ...s, title: String(decision?.renameTitle ?? s.title) })
        continue
      }

      if (action === 'merge_metadata') {
        merged++
        // Apply intelligent merge between existing and incoming
        const { applyMergeToScrapedSong } = await import('../mergeMetadata')
        const mergedSong = applyMergeToScrapedSong(
          s,
          {
            title: existingSong?.title,
            lyrics_raw: existingSong?.lyrics_raw,
            author: existingSong?.author,
            composer: existingSong?.composer,
            key_note: existingSong?.key_note,
            time_signature: existingSong?.time_signature,
            category: existingSong?.category,
            tags: existingSong?.tags
          },
          'MERGE_SMART'
        )
        toImport.push(mergedSong)
        continue
      }

      if (action === 'overwrite') {
        overwritten++
        toImport.push(s)
        continue
      }

      skipped++
    }

    const res = importScrapedSongs({
      items: toImport,
      targetHymnalId: params.request.targetHymnalId,
      conflictPolicy: params.request.conflictPolicy,
      perItemPolicy: params.request.perItemPolicy,
      dryRun: false
    })

    const imported = res.inserted + res.updated_overwrite + res.updated_append
    const durationMs = Date.now() - startedAt

    // Complete audit record
    const summary: ScraperImportSummary = {
      taskId: params.taskId,
      imported,
      skipped,
      overwritten,
      renamed,
      merged,
      failed: res.failed,
      duplicates: conflicts.length,
      durationMs,
      generatedAt: new Date().toISOString()
    }

    completeScraperAudit({
      taskId: params.taskId,
      imported,
      skipped,
      overwritten,
      renamed,
      merged,
      failed: res.failed,
      criticalConflicts,
      durationMs,
      reportJson: JSON.stringify(summary)
    })

    return summary
  }

  start(request: ScraperStartRequest): { taskId: string } {
    if (this.hasRunningTask()) {
      throw new Error('A scraper task is already running')
    }

    const taskId = makeTaskId()
    this.activeTask = this.createTask(taskId, request)

    this.startProgressPump()

    void this.activeTask.run().finally(() => {
      this.stopProgressPump()
      this.pushProgress()
      this.activeTask = null
    })

    return { taskId }
  }

  startForNumbers(request: ScraperStartRequest, numbers: string[]): { taskId: string } {
    if (this.hasRunningTask()) {
      throw new Error('A scraper task is already running')
    }

    const safeNumbers = (numbers || []).map((n) => String(n)).filter((n) => n.trim().length > 0)
    if (safeNumbers.length === 0) {
      throw new Error('No numbers to resume')
    }

    const taskId = makeTaskId()
    this.activeTask = this.createTask(taskId, request)
    this.startProgressPump()

    void this.activeTask.run(safeNumbers).finally(() => {
      this.stopProgressPump()
      this.pushProgress()
      this.activeTask = null
    })

    return { taskId }
  }

  abort(): boolean {
    if (!this.activeTask) return false
    this.activeTask.abort()
    this.pushProgress()
    return true
  }

  retryFailed(): { restarted: boolean; taskId?: string } {
    if (!this.activeTask || this.hasRunningTask()) return { restarted: false }

    const failed = this.activeTask.getFailedNumbers()
    if (failed.length === 0) return { restarted: false }

    const req = this.activeTask.request
    const taskId = makeTaskId()
    this.activeTask = this.createTask(taskId, req)

    this.startProgressPump()

    void this.activeTask.run(failed).finally(() => {
      this.stopProgressPump()
      this.pushProgress()
      this.activeTask = null
    })

    return { restarted: true, taskId }
  }

  private startProgressPump(): void {
    this.stopProgressPump()
    this.progressTimer = setInterval(() => this.pushProgress(), 150)
  }

  private stopProgressPump(): void {
    if (this.progressTimer) {
      clearInterval(this.progressTimer)
      this.progressTimer = null
    }
  }

  private pushProgress(): void {
    const wc = this.targetWebContentsProvider()
    if (!wc) return

    const snapshot = this.activeTask ? this.activeTask.getSnapshot() : null
    if (!snapshot) return

    this.lastProgressSnapshot = snapshot
    try {
      this.onProgressSnapshot(snapshot)
    } catch {
      // ignore
    }
    wc.send(IPC_SCRAPER.PROGRESS, snapshot)
  }
}
