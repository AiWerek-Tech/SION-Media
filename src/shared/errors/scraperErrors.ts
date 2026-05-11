export type ScraperErrorCode =
  | 'PROVIDER_TIMEOUT'
  | 'NETWORK_OFFLINE'
  | 'RATE_LIMITED'
  | 'INVALID_HTML'
  | 'PARSE_FAILED'
  | 'PROVIDER_BROKEN'
  | 'VALIDATION_FAILED'
  | 'INVALID_PAYLOAD'
  | 'IMPORT_CONFLICT_FATAL'
  | 'DB_FAILED'
  | 'ABORTED'
  | 'INTERNAL'

export class ScraperError extends Error {
  readonly code: ScraperErrorCode
  readonly retryable: boolean

  constructor(code: ScraperErrorCode, message: string, opts?: { retryable?: boolean }) {
    super(message)
    this.name = 'ScraperError'
    this.code = code
    this.retryable = opts?.retryable ?? false
  }
}

export function isScraperError(err: unknown): err is ScraperError {
  return err instanceof Error && (err as ScraperError).name === 'ScraperError'
}

export function formatScraperErrorMessage(code: ScraperErrorCode, message: string): string {
  // Stable, parseable error format for renderer.
  return `[SCRAPER:${code}] ${String(message ?? '').trim() || 'Error'}`
}
