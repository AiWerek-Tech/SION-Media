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

function normalizeAlkitabBaseUrl(raw: string): string {
  const trimmed = String(raw ?? '').trim()
  if (!trimmed) return ''
  // Accept users pasting full song URLs like https://alkitab.app/LS/1
  // and normalize to origin base: https://alkitab.app
  return trimmed.replace(/\/LS(\/.*)?$/i, '').replace(/\/+$/, '')
}

function extractLyricsFromBaitHtml($: cheerio.CheerioAPI): string {
  const parts: string[] = []
  const baitList = $('div.bait').toArray()
  for (const baitEl of baitList) {
    const bait = $(baitEl)
    const classAttr = (bait.attr('class') ?? '').toLowerCase()
    const isChorus = classAttr.includes('reff')
    const lines: string[] = []
    const barisList = bait.find('div.baris').toArray()
    for (const barisEl of barisList) {
      const line = $(barisEl).text().replace(/\r/g, '').trim()
      if (line) lines.push(line)
    }
    if (lines.length === 0) continue
    const tag = isChorus ? '[CHORUS]' : '[VERSE]'
    parts.push([tag, ...lines].join('\n'))
  }
  return parts.join('\n\n')
}

export class AlkitabAppProvider extends BaseScraperProvider {
  readonly id = 'alkitab_app_ls'
  readonly label = 'Alkitab.app (LS)'
  readonly defaultBaseUrl = 'https://alkitab.app'
  readonly version = '1.0.0'

  getCapabilities(): ProviderCapabilities {
    return {
      supportsNumericRange: true,
      supportsSlug: false,
      requiresBrowser: false,
      supportsMetadata: false,
      supportsPreview: true
    }
  }

  getTransport(): ProviderTransportConfig {
    return {
      mode: 'HTTP',
      concurrency: 5,
      timeoutMs: 15000,
      retryLimit: 3,
      delayMs: 100
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
      title: '.judul, h1, .song-title, title',
      lyrics: '.lirik, .lyrics, pre, article',
      author: undefined,
      composer: undefined,
      keyNote: undefined,
      category: undefined,
      tags: undefined
    }
  }

  async validate(baseUrl?: string): Promise<boolean> {
    const base = normalizeAlkitabBaseUrl(String(baseUrl ?? this.defaultBaseUrl))
    const url = `${base}/LS/1`
    const res = await fetch(url, { method: 'GET' })
    if (!res.ok) throw new Error(`Provider validate failed (${url}): HTTP ${res.status}`)
    const html = await res.text()
    if (!html || html.length < 200) throw new Error(`Provider validate failed (${url}): empty HTML`)
    return true
  }

  async fetchSong(
    input: string,
    opts?: { baseUrl?: string; signal?: AbortSignal }
  ): Promise<ScrapedSong> {
    const number = String(input ?? '').trim()
    if (!number) throw new Error('Song number is required')

    const base = normalizeAlkitabBaseUrl(String(opts?.baseUrl ?? this.defaultBaseUrl))
    const url = `${base}/LS/${encodeURIComponent(number)}`

    const res = await fetch(url, { method: 'GET', signal: opts?.signal })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)

    const html = await res.text()
    // eslint-disable-next-line no-console
    console.error('[AlkitabAppProvider] fetchSong', { number, url, htmlLength: html.length })
    const $ = cheerio.load(html)

    const title = firstNonEmpty(
      $('.judul').first().text(),
      $('h1').first().text(),
      $('.song-title').first().text(),
      $('title')
        .text()
        .replace(/\s*\|.*$/, '')
    )

    const lyricsLirik = $('.lirik').first().text()
    const lyricsLyrics = $('.lyrics').first().text()
    const lyricsPre = $('pre').first().text()
    const lyricsArticle = $('article').first().text()
    const lyrics = firstNonEmpty(lyricsLirik, lyricsLyrics, lyricsPre, lyricsArticle)
    // eslint-disable-next-line no-console
    console.error('[AlkitabAppProvider] selector results', {
      number,
      titleLen: title.length,
      lirikLen: lyricsLirik.length,
      lyricsLen: lyricsLyrics.length,
      preLen: lyricsPre.length,
      articleLen: lyricsArticle.length,
      chosenLyricsLen: lyrics.length
    })

    if (!title) throw new Error('Selector missing: title')
    const lyricsRaw = lyrics.trim() ? lyrics : extractLyricsFromBaitHtml($)
    if (!lyricsRaw.trim()) throw new Error('Empty lyrics')

    const normalizedLyrics = normalizeLyrics(lyricsRaw)

    return {
      providerId: this.id,
      sourceUrl: url,
      sourceHymnalCode: 'LS',
      sourceSongNumber: number,
      title,
      lyrics_raw: normalizedLyrics
    }
  }
}
