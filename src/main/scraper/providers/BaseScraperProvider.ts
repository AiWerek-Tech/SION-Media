import type {
  ProviderCapabilities,
  ScrapedSong,
  ScraperProviderInfo,
  ProviderTransportConfig,
  ProviderNormalizationConfig,
  ProviderSelectors,
  ProviderValidationDiagnostics,
  SelectorValidationResult,
  ProviderHealthStatus
} from '../types'

export abstract class BaseScraperProvider {
  abstract readonly id: string
  abstract readonly label: string
  abstract readonly defaultBaseUrl: string
  abstract readonly version: string

  abstract getCapabilities(): ProviderCapabilities
  abstract getTransport(): ProviderTransportConfig
  abstract getNormalization(): ProviderNormalizationConfig
  abstract getSelectors(): ProviderSelectors

  /**
   * Validate provider health and selector stability.
   * Must throw on fatal validation error.
   */
  abstract validate(baseUrl?: string): Promise<boolean>

  /**
   * Fetch a single song by provider input. For numeric-range providers, input is the song number.
   * For slug-based providers, the UI may pass a slug (string) in place of number.
   */
  abstract fetchSong(
    input: string,
    opts?: { baseUrl?: string; signal?: AbortSignal }
  ): Promise<ScrapedSong>

  /**
   * Run comprehensive selector validation with diagnostics.
   * Returns detailed results for each selector.
   */
  async validateWithDiagnostics(baseUrl?: string): Promise<ProviderValidationDiagnostics> {
    const start = Date.now()
    const selectorResults: SelectorValidationResult[] = []
    const warnings: string[] = []
    const errors: string[] = []
    let htmlSize = 0

    try {
      const url = `${String(baseUrl ?? this.defaultBaseUrl).replace(/\/$/, '')}/LS/1`
      const res = await fetch(url, { method: 'GET' })
      const html = await res.text()
      htmlSize = html.length

      // Use cheerio for selector testing
      const cheerio = await import('cheerio')
      const $ = cheerio.load(html)
      const selectors = this.getSelectors()

      // Test each selector
      for (const [name, selector] of Object.entries(selectors)) {
        if (!selector) continue

        try {
          const elements = $(selector)
          const found = elements.length
          const sample = found > 0 ? elements.first().text().slice(0, 100) : undefined

          selectorResults.push({
            selector: name,
            status: found > 0 ? 'OK' : 'MISSING',
            found,
            sample
          })

          if (found === 0) {
            warnings.push(`Selector '${name}' (${selector}) found 0 elements`)
          }
        } catch (err) {
          selectorResults.push({
            selector: name,
            status: 'ERROR',
            found: 0,
            error: err instanceof Error ? err.message : String(err)
          })
          errors.push(`Selector '${name}' error: ${err}`)
        }
      }
    } catch (err) {
      errors.push(`Fetch failed: ${err instanceof Error ? err.message : String(err)}`)
    }

    const fetchLatencyMs = Date.now() - start
    const okCount = selectorResults.filter((r) => r.status === 'OK').length
    const totalSelectors = selectorResults.length

    let overallStatus: ProviderHealthStatus = 'UNKNOWN'
    if (errors.length > 0) {
      overallStatus = 'BROKEN'
    } else if (warnings.length > 0 || okCount < totalSelectors) {
      overallStatus = 'DEGRADED'
    } else if (okCount === totalSelectors) {
      overallStatus = 'OK'
    }

    return {
      providerId: this.id,
      timestamp: new Date().toISOString(),
      overallStatus,
      selectorResults,
      fetchLatencyMs,
      htmlSize,
      warnings,
      errors
    }
  }

  getInfo(): ScraperProviderInfo {
    return {
      id: this.id,
      label: this.label,
      defaultBaseUrl: this.defaultBaseUrl,
      capabilities: this.getCapabilities()
    }
  }
}
