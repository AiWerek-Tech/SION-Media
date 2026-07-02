/**
 * Media Engine for SION Media — Hardened LRU Cache
 *
 * Handles preloading of image/video assets with:
 * - LRU eviction based on `lastAccessed` (not just insertion order)
 * - Size estimation for observability
 * - Concurrent load limiting (max 3 simultaneous)
 * - Cache stats via `getStats()` for RuntimeInspector
 *
 * @see phase2-part2-runtime-engine.md §5.4
 */

import { logger } from '@renderer/utils/logger'

// ═══════════════════════════════════════════════════════════════
// Configuration
// ═══════════════════════════════════════════════════════════════
const MAX_CACHE_SIZE = 50
const MAX_CONCURRENT_LOADS = 3
const VIDEO_TIMEOUT_MS = 15000
const IMAGE_TIMEOUT_MS = 5000

// ═══════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════
type LoadState = 'loading' | 'loaded' | 'error'

interface MediaCacheEntry<T> {
  element: T
  url: string
  loadState: LoadState
  sizeEstimate: number // bytes
  lastAccessed: number // Date.now()
  loadedAt: number
}

export interface MediaCacheStats {
  imageCacheSize: number
  videoCacheSize: number
  totalEntries: number
  estimatedMemoryMB: number
  activeLoads: number
  hitCount: number
  missCount: number
}

// ═══════════════════════════════════════════════════════════════
// Engine
// ═══════════════════════════════════════════════════════════════
class MediaEngine {
  private imageCache = new Map<string, MediaCacheEntry<HTMLImageElement>>()
  private videoCache = new Map<string, MediaCacheEntry<HTMLVideoElement>>()
  private activeLoads = 0
  private loadQueue: Array<() => void> = []
  private hitCount = 0
  private missCount = 0

  // ─────────────────────────────────────────────────────────────
  // LRU Eviction — evict entry with oldest `lastAccessed`
  // ─────────────────────────────────────────────────────────────
  private evictLRU<T>(cache: Map<string, MediaCacheEntry<T>>): void {
    if (cache.size < MAX_CACHE_SIZE) return

    let oldestKey: string | null = null
    let oldestTime = Infinity

    for (const [key, entry] of cache) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed
        oldestKey = key
      }
    }

    if (oldestKey) {
      cache.delete(oldestKey)
      logger.info('[MediaEngine] LRU evicted:', oldestKey)
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Concurrent Load Limiter
  // ─────────────────────────────────────────────────────────────
  private async withConcurrencyLimit<T>(fn: () => Promise<T>): Promise<T> {
    if (this.activeLoads >= MAX_CONCURRENT_LOADS) {
      await new Promise<void>((resolve) => this.loadQueue.push(resolve))
    }
    this.activeLoads++
    try {
      return await fn()
    } finally {
      this.activeLoads--
      const next = this.loadQueue.shift()
      if (next) next()
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Image Preload
  // ─────────────────────────────────────────────────────────────
  preloadImage(url: string): Promise<void> {
    const existing = this.imageCache.get(url)
    if (existing && existing.loadState === 'loaded') {
      existing.lastAccessed = Date.now()
      this.hitCount++
      return Promise.resolve()
    }
    this.missCount++

    return this.withConcurrencyLimit(() => {
      return new Promise<void>((resolve, reject) => {
        const img = new Image()
        const src = url.startsWith('http') ? url : `file://${url.replace(/\\/g, '/')}`
        img.src = src

        const timeout = setTimeout(() => {
          img.onload = null
          img.onerror = null
          reject(new Error('Image preload timeout'))
        }, IMAGE_TIMEOUT_MS)

        img.onload = () => {
          clearTimeout(timeout)
          this.evictLRU(this.imageCache)
          const sizeEstimate = img.naturalWidth * img.naturalHeight * 4 // RGBA
          this.imageCache.set(url, {
            element: img,
            url,
            loadState: 'loaded',
            sizeEstimate,
            lastAccessed: Date.now(),
            loadedAt: Date.now()
          })
          resolve()
        }
        img.onerror = () => {
          clearTimeout(timeout)
          reject(new Error('Image preload failed'))
        }
      })
    })
  }

  // ─────────────────────────────────────────────────────────────
  // Video Preload
  // ─────────────────────────────────────────────────────────────
  preloadVideo(url: string): Promise<void> {
    const existing = this.videoCache.get(url)
    if (existing && existing.loadState === 'loaded') {
      existing.lastAccessed = Date.now()
      this.hitCount++
      return Promise.resolve()
    }
    this.missCount++

    return this.withConcurrencyLimit(() => {
      return new Promise<void>((resolve, reject) => {
        const video = document.createElement('video')
        const src = url.startsWith('http') ? url : `file://${url.replace(/\\/g, '/')}`
        video.src = src
        video.preload = 'auto'

        let settled = false
        const settleOnce = (fn: () => void): void => {
          if (settled) return
          settled = true
          video.oncanplaythrough = null
          video.onerror = null
          video.onstalled = null
          fn()
        }

        const timeout = setTimeout(() => {
          settleOnce(() => reject(new Error('Video preload timeout')))
        }, VIDEO_TIMEOUT_MS)

        video.oncanplaythrough = () => {
          clearTimeout(timeout)
          settleOnce(() => {
            this.evictLRU(this.videoCache)
            // Estimate: 30fps * duration * width * height * 3 bytes/pixel / compression
            const sizeEstimate = (video.duration || 10) * 1024 * 512 // rough estimate
            this.videoCache.set(url, {
              element: video,
              url,
              loadState: 'loaded',
              sizeEstimate,
              lastAccessed: Date.now(),
              loadedAt: Date.now()
            })
            resolve()
          })
        }
        video.onerror = () => {
          clearTimeout(timeout)
          settleOnce(() => reject(new Error('Video preload failed')))
        }
        video.onstalled = () => {
          clearTimeout(timeout)
          settleOnce(() => reject(new Error('Video preload stalled')))
        }
      })
    })
  }

  // ─────────────────────────────────────────────────────────────
  // Cache Stats — for RuntimeInspector observability
  // ─────────────────────────────────────────────────────────────
  getStats(): MediaCacheStats {
    let totalBytes = 0
    for (const entry of this.imageCache.values()) totalBytes += entry.sizeEstimate
    for (const entry of this.videoCache.values()) totalBytes += entry.sizeEstimate

    return {
      imageCacheSize: this.imageCache.size,
      videoCacheSize: this.videoCache.size,
      totalEntries: this.imageCache.size + this.videoCache.size,
      estimatedMemoryMB: Math.round((totalBytes / 1024 / 1024) * 100) / 100,
      activeLoads: this.activeLoads,
      hitCount: this.hitCount,
      missCount: this.missCount
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Get cached element (with LRU touch)
  // ─────────────────────────────────────────────────────────────
  getCachedImage(url: string): HTMLImageElement | null {
    const entry = this.imageCache.get(url)
    if (entry && entry.loadState === 'loaded') {
      entry.lastAccessed = Date.now()
      return entry.element
    }
    return null
  }

  getCachedVideo(url: string): HTMLVideoElement | null {
    const entry = this.videoCache.get(url)
    if (entry && entry.loadState === 'loaded') {
      entry.lastAccessed = Date.now()
      return entry.element
    }
    return null
  }

  /**
   * Clear all caches
   */
  clearCache(): void {
    this.imageCache.clear()
    this.videoCache.clear()
    this.hitCount = 0
    this.missCount = 0
    logger.info('[MediaEngine] Cache cleared')
  }
}

export const mediaEngine = new MediaEngine()
