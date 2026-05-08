/**
 * Media Engine for SION Media
 * Handles preloading of assets to ensure smooth transitions
 */

class MediaEngine {
  private imageCache = new Map<string, HTMLImageElement>()
  private videoCache = new Map<string, HTMLVideoElement>()

  /**
   * Preload an image asset
   */
  preloadImage(url: string): Promise<void> {
    if (this.imageCache.has(url)) return Promise.resolve()

    return new Promise((resolve, reject) => {
      const img = new Image()
      img.src = url.startsWith('http') ? url : `file://${url.replace(/\\/g, '/')}`
      img.onload = () => {
        this.imageCache.set(url, img)
        resolve()
      }
      img.onerror = reject
    })
  }

  /**
   * Preload a video asset
   */
  preloadVideo(url: string): Promise<void> {
    if (this.videoCache.has(url)) return Promise.resolve()

    return new Promise((resolve, reject) => {
      const video = document.createElement('video')
      video.src = url.startsWith('http') ? url : `file://${url.replace(/\\/g, '/')}`
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
      }, 10000)

      video.oncanplaythrough = () => {
        clearTimeout(timeout)
        settleOnce(() => {
          this.videoCache.set(url, video)
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
  }

  /**
   * Clear all caches
   */
  clearCache(): void {
    this.imageCache.clear()
    this.videoCache.clear()
  }
}

export const mediaEngine = new MediaEngine()
