export type ScraperLogLevel = 'INFO' | 'WARN' | 'ERROR'

export type ScraperPhase = 'FETCH' | 'PARSE' | 'NORMALIZE' | 'DB' | 'FTS'

export interface ProviderCapabilities {
  supportsNumericRange: boolean
  supportsSlug: boolean
  requiresBrowser: boolean
  supportsMetadata: boolean
  supportsPreview: boolean
}

// Provider health status
export type ProviderHealthStatus = 'OK' | 'DEGRADED' | 'BROKEN' | 'UNKNOWN'

// Selector validation result
export interface SelectorValidationResult {
  selector: string
  status: 'OK' | 'MISSING' | 'EMPTY' | 'ERROR'
  found: number
  sample?: string
  error?: string
}

// Provider validation diagnostics
export interface ProviderValidationDiagnostics {
  providerId: string
  timestamp: string
  overallStatus: ProviderHealthStatus
  selectorResults: SelectorValidationResult[]
  fetchLatencyMs: number
  htmlSize: number
  warnings: string[]
  errors: string[]
}

// Provider transport configuration
export interface ProviderTransportConfig {
  mode: 'HTTP' | 'PLAYWRIGHT'
  concurrency: number
  timeoutMs: number
  retryLimit: number
  delayMs: number
}

// Provider normalization strategy
export interface ProviderNormalizationConfig {
  stanzaStrategy: 'DOUBLE_BREAK' | 'SINGLE_BREAK' | 'XML_TAGS'
  trimWhitespace: boolean
  unicodeNormalize: boolean
  removeEmptyStanzas: boolean
}

// Provider selector definitions
export interface ProviderSelectors {
  title: string
  lyrics: string
  author?: string
  composer?: string
  keyNote?: string
  category?: string
  tags?: string
}

// Extended provider definition with health and configuration
export interface ScraperProviderDefinition {
  id: string
  name: string
  version: string
  capabilities: ProviderCapabilities
  transport: ProviderTransportConfig
  selectors: ProviderSelectors
  normalization: ProviderNormalizationConfig
  health: {
    status: ProviderHealthStatus
    lastValidatedAt?: string
    lastFailureReason?: string
    consecutiveFailures: number
    diagnostics?: ProviderValidationDiagnostics
  }
}

export interface ScrapedSong {
  providerId: string
  sourceUrl: string
  sourceHymnalCode: string
  sourceSongNumber: string
  title: string
  lyrics_raw: string
  key_note?: string
  time_signature?: string
  author?: string
  composer?: string
  category?: string
  tags?: string
}

export type ConflictSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

export type ConflictType = 'NUMBER_DUPLICATE' | 'TITLE_SIMILAR' | 'LYRICS_IDENTICAL'

export interface ExistingSongSnapshot {
  id: number
  hymnal_id: number
  hymnal_code?: string
  hymnal_name?: string
  hymnal_is_official?: number
  number: string
  title: string
  lyrics_raw: string
  author?: string
  composer?: string
  key_note?: string
  time_signature?: string
  category?: string
  tags?: string
}

export interface ScraperConflictItem {
  key: string
  type: ConflictType
  severity: ConflictSeverity
  reason: string
  scraped: ScrapedSong
  existing: ExistingSongSnapshot
  lyricsHashMatch: boolean
  titleSimilarity: number
  lyricsSimilarity?: number
  metadataSimilarity?: number
  structureSimilarity?: number
  confidenceScore?: number
  confidenceLabel?: 'VERY_HIGH_MATCH' | 'HIGH_MATCH' | 'POSSIBLE_MATCH' | 'LOW_MATCH'
  confidenceWhy?: {
    title: number
    lyrics: number
    metadata: number
    structure: number
    weightedTotal: number
    notes: string[]
  }
}

export type PerSongResolutionAction = 'skip' | 'overwrite' | 'rename' | 'merge_metadata'

export interface PerSongResolutionDecision {
  action: PerSongResolutionAction
  renameTitle?: string
}

export interface ScraperDryRunReport {
  taskId: string
  providerId: string
  targetHymnalId: number
  totalScraped: number
  conflicts: ScraperConflictItem[]
  generatedAt: string
}

export interface ScraperImportRequest {
  taskId: string
  providerId: string
  targetHymnalId: number
  items: ScrapedSong[]
  decisions: Record<string, PerSongResolutionDecision>
  defaultAction: PerSongResolutionAction
}

export interface ScraperImportSummary {
  taskId: string
  imported: number
  skipped: number
  overwritten: number
  renamed: number
  merged: number
  failed: number
  duplicates: number
  durationMs: number
  generatedAt: string
}

export interface ScraperProviderInfo {
  id: string
  label: string
  defaultBaseUrl: string
  capabilities: ProviderCapabilities
}

export interface ScraperLogLine {
  ts: number
  level: ScraperLogLevel
  phase?: ScraperPhase
  message: string
  providerId?: string
  songNumber?: string
}

export type ScraperConflictPolicy = 'skip' | 'overwrite' | 'ask'

// Merge Metadata Strategy
export type MergeStrategy =
  | 'MERGE_PREFER_EXISTING' // Keep existing values, only fill empty from incoming
  | 'MERGE_PREFER_INCOMING' // Use incoming values, keep existing only if incoming empty
  | 'MERGE_FILL_EMPTY' // Only fill empty fields, never overwrite
  | 'MERGE_SMART' // Intelligent merge: preserve non-empty, combine tags, prefer longer lyrics

export interface MergeMetadataOptions {
  strategy: MergeStrategy
  fields?: ('author' | 'composer' | 'key_note' | 'time_signature' | 'category' | 'tags' | 'tempo')[]
}

export interface SongMetadata {
  title?: string
  author?: string
  composer?: string
  key_note?: string
  time_signature?: string
  category?: string
  tags?: string
  tempo?: string
  lyrics_raw?: string
}

export interface ScraperStartRequest {
  providerId: string
  baseUrl?: string
  targetHymnalId: number
  startNumber: number
  endNumber: number
  concurrency: number
  retryCount: number
  delayMs: number
  conflictPolicy: ScraperConflictPolicy
  perItemPolicy?: Record<string, 'skip' | 'overwrite' | 'append'>
}

export interface ScraperSongProgress {
  number: string
  status: 'PENDING' | 'FETCHING' | 'SUCCESS' | 'FAILED' | 'SKIPPED'
  attempts: number
  error?: string
  sourceUrl?: string
  title?: string
}

export interface ScraperProgressPayload {
  taskId: string
  providerId: string
  state: 'RUNNING' | 'ABORTED' | 'COMPLETED' | 'IDLE'
  total: number
  processed: number
  success: number
  failed: number
  skipped: number
  retries: number
  songsPerSec: number
  etaSec: number | null
  recentLogs: ScraperLogLine[]
  recentSongUpdates: ScraperSongProgress[]
  failedNumbers: string[]
}
