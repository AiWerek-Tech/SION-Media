import { z } from 'zod'

export const ScraperConflictPolicySchema = z.enum(['skip', 'overwrite', 'ask'])

export const ScraperProviderHealthSchema = z.enum(['OK', 'DEGRADED', 'BROKEN', 'UNKNOWN'])

export const ScraperImportActionSchema = z.enum(['skip', 'overwrite', 'rename', 'merge_metadata'])

export const ScraperStartPayloadSchema = z
  .object({
    providerId: z.string().min(1),
    baseUrl: z.string().min(1).optional(),
    targetHymnalId: z.number().finite(),
    startNumber: z.number().finite(),
    endNumber: z.number().finite(),
    concurrency: z.number().finite(),
    retryCount: z.number().finite(),
    delayMs: z.number().finite(),
    conflictPolicy: ScraperConflictPolicySchema,
    perItemPolicy: z.record(z.string(), z.enum(['skip', 'overwrite', 'append'])).optional()
  })
  .superRefine((v, ctx) => {
    if (v.startNumber < 0 || v.endNumber < v.startNumber) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Invalid scraper range.' })
      return
    }
    if (v.endNumber - v.startNumber + 1 > 5000) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Scraper range too large. Maximum 5000 items.'
      })
    }
  })

export const ScrapedSongSchema = z.object({
  providerId: z.string(),
  sourceUrl: z.string(),
  sourceHymnalCode: z.string(),
  sourceSongNumber: z.string(),
  title: z.string(),
  lyrics_raw: z.string(),
  key_note: z.string().optional(),
  time_signature: z.string().optional(),
  author: z.string().optional(),
  composer: z.string().optional(),
  category: z.string().optional(),
  tags: z.string().optional()
})

export const ScraperConflictItemSchema = z.object({
  key: z.string(),
  type: z.enum(['NUMBER_DUPLICATE', 'TITLE_SIMILAR', 'LYRICS_IDENTICAL']),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  reason: z.string(),
  scraped: ScrapedSongSchema,
  existing: z.object({
    id: z.number(),
    hymnal_id: z.number(),
    hymnal_code: z.string().optional(),
    hymnal_name: z.string().optional(),
    hymnal_is_official: z.number().optional(),
    number: z.string(),
    title: z.string(),
    lyrics_raw: z.string(),
    author: z.string().optional(),
    composer: z.string().optional(),
    key_note: z.string().optional(),
    time_signature: z.string().optional(),
    category: z.string().optional(),
    tags: z.string().optional()
  }),
  lyricsHashMatch: z.boolean(),
  titleSimilarity: z.number(),
  lyricsSimilarity: z.number().optional(),
  metadataSimilarity: z.number().optional(),
  structureSimilarity: z.number().optional(),
  confidenceScore: z.number().optional(),
  confidenceLabel: z
    .enum(['VERY_HIGH_MATCH', 'HIGH_MATCH', 'POSSIBLE_MATCH', 'LOW_MATCH'])
    .optional(),
  confidenceWhy: z
    .object({
      title: z.number(),
      lyrics: z.number(),
      metadata: z.number(),
      structure: z.number(),
      weightedTotal: z.number(),
      notes: z.array(z.string())
    })
    .optional()
})

export const ScraperDryRunResultSchema = z.object({
  taskId: z.string().min(1),
  items: z.array(ScrapedSongSchema),
  conflicts: z.array(ScraperConflictItemSchema)
})

export const ScraperImportFromDryRunSchema = z.object({
  taskId: z.string().min(1),
  request: ScraperStartPayloadSchema,
  items: z.array(ScrapedSongSchema),
  decisions: z.record(
    z.string(),
    z.object({
      action: ScraperImportActionSchema,
      renameTitle: z.string().optional()
    })
  ),
  defaultAction: ScraperImportActionSchema
})

export const ScraperSavedDryRunStateSchema = z.object({
  savedAt: z.string(),
  taskId: z.string(),
  request: ScraperStartPayloadSchema,
  items: z.array(ScrapedSongSchema),
  conflicts: z.array(ScraperConflictItemSchema)
})

export const ScraperSavedRunningTaskStateSchema = z.object({
  savedAt: z.string(),
  taskId: z.string(),
  request: ScraperStartPayloadSchema,
  failedNumbers: z.array(z.string()),
  processed: z.number().finite(),
  total: z.number().finite(),
  success: z.number().finite(),
  failed: z.number().finite(),
  skipped: z.number().finite(),
  retries: z.number().finite(),
  state: z.enum(['IDLE', 'RUNNING', 'COMPLETED', 'ABORTED'])
})

export type ScraperStartPayload = z.infer<typeof ScraperStartPayloadSchema>
export type ScraperDryRunResult = z.infer<typeof ScraperDryRunResultSchema>
export type ScraperSavedDryRunState = z.infer<typeof ScraperSavedDryRunStateSchema>
export type ScraperSavedRunningTaskState = z.infer<typeof ScraperSavedRunningTaskStateSchema>
