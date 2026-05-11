import * as cheerio from 'cheerio'
import { BaseScraperProvider } from './BaseScraperProvider'
import type {
  ProviderCapabilities,
  ScrapedSong,
  ProviderTransportConfig,
  ProviderNormalizationConfig,
  ProviderSelectors
} from '../types'
import { normalizeLyrics } from '../lyricsNormalizer'

function firstNonEmpty(...vals: Array<string | undefined | null>): string {
  for (const v of vals) {
    const s = String(v ?? '').trim()
    if (s) return s
  }
  return ''
}

export class LaguSionProvider extends BaseScraperProvider {
  readonly id = 'lagu_sion_play'
  readonly label = 'play.lagusion.org (LS — slug)'
  readonly defaultBaseUrl = 'https://play.lagusion.org'
  readonly version = '1.0.0'

  getCapabilities(): ProviderCapabilities {
    return {
      supportsNumericRange: false,
      supportsSlug: true,
      requiresBrowser: false,
      supportsMetadata: false,
      supportsPreview: true
    }
  }

  getTransport(): ProviderTransportConfig {
    return {
      mode: 'HTTP',
      concurrency: 3,
      timeoutMs: 20000,
      retryLimit: 3,
      delayMs: 200
    }
  }

  getNormalization(): ProviderNormalizationConfig {
    return {
      stanzaStrategy: 'DOUBLE_BREAK',
      trimWhitespace: true,
      unicodeNormalize: true,
      removeEmptyStanzas: true
    }
  }

  getSelectors(): ProviderSelectors {
    return {
      title: 'h1, .song-title, title',
      lyrics: '.lyrics, pre, [data-testid="lyrics"], article',
      author: undefined,
      composer: undefined,
      keyNote: undefined,
      category: undefined,
      tags: undefined
    }
  }

  async validate(baseUrl?: string): Promise<boolean> {
    const base = String(baseUrl ?? this.defaultBaseUrl).replace(/\/$/, '')
    const url = `${base}/play/song/LS--Edisi-Baru/` // no slug; just a basic reachability test
    const res = await fetch(url, { method: 'GET' })
    // Some sites may 404 this path without slug; treat non-network errors as still reachable.
    if (res.status >= 500) throw new Error(`Provider validate failed: HTTP ${res.status}`)
    return true
  }

  async fetchSong(
    input: string,
    opts?: { baseUrl?: string; signal?: AbortSignal }
  ): Promise<ScrapedSong> {
    const slug = String(input ?? '').trim()
    if (!slug) throw new Error('Slug is required')

    const base = String(opts?.baseUrl ?? this.defaultBaseUrl).replace(/\/$/, '')
    const url = `${base}/play/song/LS--Edisi-Baru/${encodeURIComponent(slug)}`

    const res = await fetch(url, { method: 'GET', signal: opts?.signal })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)

    const html = await res.text()
    const $ = cheerio.load(html)

    const title = firstNonEmpty(
      $('h1').first().text(),
      $('.song-title').first().text(),
      $('title')
        .text()
        .replace(/\s*\|.*$/, '')
    )

    const lyrics = firstNonEmpty(
      $('.lyrics').first().text(),
      $('pre').first().text(),
      $('[data-testid="lyrics"]').text(),
      $('article').first().text()
    )

    if (!title) throw new Error('Selector missing: title')
    if (!lyrics.trim()) throw new Error('Empty lyrics')

    return {
      providerId: this.id,
      sourceUrl: url,
      sourceHymnalCode: 'LS',
      sourceSongNumber: slug,
      title,
      lyrics_raw: normalizeLyrics(lyrics)
    }
  }
}
